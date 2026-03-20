import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { TURNSTILE_SECRET_KEY } from 'astro:env/server';
import { FIELD_LABELS } from '../scripts/field-labels';
import { appendFormSubmission } from '../utils/google-sheets';

type FormType = 'home-contact' | 'general-inquiry' | 'referral' | 'training';

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
    'training-hours',
    'start-date',
    'end-date',
  ],
};

const VALID_FORM_TYPES = new Set<string>(Object.keys(REQUIRED_FIELDS));

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      if (fields['website']?.trim()) {
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

      // Join multi-value checkbox fields into comma-separated strings
      const multiValueFields = ['services', 'training-topics'];
      for (const fieldName of multiValueFields) {
        if (fields[fieldName]) {
          fields[fieldName] = String(fields[fieldName])
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
            .join(', ');
        }
      }

      // Submit to Google Sheets
      try {
        await appendFormSubmission(formType as FormType, fields);
      } catch {
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
