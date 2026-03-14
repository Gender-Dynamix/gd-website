import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import {
  RESEND_API_KEY,
  TURNSTILE_SECRET_KEY,
  FORM_RECIPIENT_EMAIL,
  FORM_SENDER_EMAIL,
} from 'astro:env/server';

type FormType = 'home-contact' | 'general-inquiry' | 'referral' | 'training';

const REQUIRED_FIELDS: Record<FormType, string[]> = {
  'home-contact': ['first-name', 'last-name', 'email', 'subject', 'message'],
  'general-inquiry': ['first-name', 'last-name', 'email', 'subject', 'message'],
  referral: [
    'referral-type',
    'first-name',
    'last-name',
    'preferred-name',
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
      errors.push(`${field} is required`);
    }
  }

  if (fields['email'] && !EMAIL_PATTERN.test(fields['email'])) {
    errors.push('Please enter a valid email address');
  }

  return errors;
}

function buildEmailSubject(
  formType: FormType,
  fields: Record<string, string>,
): string {
  switch (formType) {
    case 'home-contact':
      return `Website Contact: ${fields['subject'] || 'No subject'}`;
    case 'general-inquiry':
      return `General Inquiry: ${fields['subject'] || 'No subject'}`;
    case 'referral':
      return `New Referral: ${fields['preferred-name'] || 'Unknown'} (${fields['referral-type'] || 'Unknown'})`;
    case 'training':
      return `Training Inquiry: ${fields['contact-name'] || 'Unknown'}`;
  }
}

function buildEmailBody(
  formType: FormType,
  fields: Record<string, string>,
): string {
  const lines: string[] = [];
  lines.push(`Form: ${formType}`);
  lines.push(`Submitted: ${new Date().toISOString()}`);
  lines.push('---');
  lines.push('');

  const skipFields = ['form-type', 'website', 'cf-turnstile-response'];

  for (const [key, value] of Object.entries(fields)) {
    if (skipFields.includes(key) || !value.trim()) continue;
    const label = key
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    lines.push(`${label}: ${value}`);
  }

  return lines.join('\n');
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

async function sendEmail(subject: string, body: string): Promise<boolean> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FORM_SENDER_EMAIL,
      to: [FORM_RECIPIENT_EMAIL],
      subject,
      text: body,
    }),
  });

  return response.ok;
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

      // Build and send email
      const subject = buildEmailSubject(formType as FormType, fields);
      const emailBody = buildEmailBody(formType as FormType, fields);
      const emailSent = await sendEmail(subject, emailBody);

      if (!emailSent) {
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            'We could not send your message at this time. Please try again later.',
        });
      }

      return { success: true };
    },
  }),
};
