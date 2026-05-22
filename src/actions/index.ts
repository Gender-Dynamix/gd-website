import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { TURNSTILE_SECRET_KEY } from 'astro:env/server';
import { FIELD_LABELS } from '../scripts/field-labels';
import { appendFormSubmission, type FormType } from '../utils/google-sheets';

const REQUIRED_FIELDS: Record<FormType, string[]> = {
  'home-contact': ['first-name', 'last-name', 'email', 'subject', 'message'],
  'general-inquiry': ['first-name', 'last-name', 'email', 'subject', 'message'],
  referral: [
    'referral-type',
    'first-name',
    'last-name',
    'email',
    'phone',
    'address',
    'city',
    'suburb',
    'area-code',
    'referral-source',
  ],
  training: [
    'contact-name',
    'email',
    'contact-phone',
    'org-name',
    'org-type',
    'location',
    'attendee-count',
    'training-reason',
    'training-hours',
    'start-date',
    'end-date',
  ],
};

const VALID_FORM_TYPES = new Set<string>(Object.keys(REQUIRED_FIELDS));

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Accepts DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YYYY; separator must be consistent throughout
const DOB_PATTERN = /^(\d{2})([\/\-\.])(\d{2})\2(\d{4})$/;

function isValidDate(day: number, month: number, year: number): boolean {
  const date = new Date(year, month - 1, day);
  const today = new Date();
  // Math.sign avoids < > operators which Astro's language server misreads as JSX.
  // sign of (today - date): 1 or 0 means not future, -1 means future.
  const isNotFuture = Math.sign(today.getTime() - date.getTime()) !== -1;
  // year - 1900 will be 0 or positive for valid years; Math.max clamps negatives.
  const isValidYear = Math.max(year - 1900, 0) === year - 1900;
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    isValidYear &&
    isNotFuture
  );
}

function validateFields(
  formType: FormType,
  fields: Record<string, string>,
): string[] {
  const errors: string[] = [];
  const requiredFields = REQUIRED_FIELDS[formType];

  for (const field of requiredFields) {
    if (!fields[field]?.trim()) {
      const friendlyName = FIELD_LABELS[field] || field;
      errors.push(`Please enter ${friendlyName}`);
    }
  }

  if (fields['email'] && !EMAIL_PATTERN.test(fields['email'])) {
    errors.push('Please enter a valid email address');
  }

  if (formType === 'referral') {
    const dobValue = fields['date-of-birth']?.trim();
    const match = dobValue?.match(DOB_PATTERN);
    if (!match) {
      errors.push('Please enter date of birth in DD/MM/YYYY format');
    } else {
      const [, dd, , mm, yyyy] = match;
      if (!isValidDate(Number(dd), Number(mm), Number(yyyy))) {
        errors.push('Please enter a valid date of birth');
      }
    }
  }

  return errors;
}

async function verifyTurnstile(
  token: string,
  remoteIp: string,
): Promise<boolean> {
  const body = new URLSearchParams();
  body.append('secret', TURNSTILE_SECRET_KEY);
  body.append('response', token);
  body.append('remoteip', remoteIp);

  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    },
  );

  const result = (await response.json()) as { success: boolean };
  return result.success;
}

export const server = {
  submitForm: defineAction({
    accept: 'form',
    input: z
      .object({
        'form-type': z.string(),
        'cf-turnstile-response': z.string().optional(),
      })
      .passthrough(),
    handler: async (input, context) => {
      const fields: Record<string, string> = {};
      for (const [key, value] of Object.entries(input)) {
        fields[key] = String(value);
      }

      // Honeypot check — if filled, silently succeed
      if (fields['website']) {
        return { success: true };
      }

      const formType = fields['form-type'];
      if (!VALID_FORM_TYPES.has(formType)) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'Invalid form type',
        });
      }

      // Verify Turnstile
      const turnstileToken = fields['cf-turnstile-response'] || '';
      if (!turnstileToken) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'Please complete the verification challenge',
        });
      }

      const clientIp = context.clientAddress || '';
      const turnstileValid = await verifyTurnstile(turnstileToken, clientIp);
      if (!turnstileValid) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'Verification failed. Please try again.',
        });
      }

      // Validate required fields
      const validationErrors = validateFields(formType as FormType, fields);
      if (validationErrors.length > 0) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: validationErrors.join('\n'),
        });
      }

      // Submit to Google Sheets
      try {
        await appendFormSubmission(formType as FormType, fields);
      } catch (error) {
        console.error('Google Sheets submission failed:', error);
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            'We could not save your submission at this time. Please try again later.',
        });
      }

      return { success: true };
    },
  }),
};
