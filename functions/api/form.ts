interface Env {
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  FORM_RECIPIENT_EMAIL: string;
  FORM_SENDER_EMAIL: string;
}

interface FormSubmission {
  formType: string;
  fields: Record<string, string>;
}

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseBody(contentType: string, body: string): Record<string, string> {
  if (contentType.includes('application/json')) {
    return JSON.parse(body);
  }

  const fields: Record<string, string> = {};
  const params = new URLSearchParams(body);
  for (const [key, value] of params.entries()) {
    if (fields[key]) {
      fields[key] += `, ${value}`;
    } else {
      fields[key] = value;
    }
  }
  return fields;
}

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
  secretKey: string,
  remoteIp: string,
): Promise<boolean> {
  const formData = new URLSearchParams();
  formData.append('secret', secretKey);
  formData.append('response', token);
  formData.append('remoteip', remoteIp);

  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    },
  );

  const result = (await response.json()) as { success: boolean };
  return result.success;
}

async function sendEmail(
  env: Env,
  subject: string,
  body: string,
): Promise<boolean> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FORM_SENDER_EMAIL,
      to: [env.FORM_RECIPIENT_EMAIL],
      subject,
      text: body,
    }),
  });

  return response.ok;
}

function htmlResponse(message: string, isSuccess: boolean): Response {
  const color = isSuccess ? '#4a7c59' : '#c0392b';
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${isSuccess ? 'Success' : 'Error'}</title></head>
<body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5">
<div style="text-align:center;padding:2rem;max-width:480px">
<h1 style="color:${color}">${isSuccess ? 'Thank you!' : 'Something went wrong'}</h1>
<p>${message}</p>
<a href="javascript:history.back()" style="color:#6b4c91">Go back</a>
</div>
</body>
</html>`,
    {
      status: isSuccess ? 200 : 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    },
  );
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const contentType = request.headers.get('content-type') || '';
  const isJsonRequest = contentType.includes('application/json');
  const clientIp = request.headers.get('cf-connecting-ip') || '';

  try {
    const bodyText = await request.text();
    const fields = parseBody(contentType, bodyText);

    // Honeypot check — if filled, silently succeed
    if (fields['website']?.trim()) {
      if (isJsonRequest) {
        return Response.json({ success: true });
      }
      return htmlResponse('Your message has been sent successfully.', true);
    }

    const formType = fields['form-type'] as FormType;
    if (!formType || !REQUIRED_FIELDS[formType]) {
      const errorMessage = 'Invalid form type';
      if (isJsonRequest) {
        return Response.json(
          { success: false, errors: [errorMessage] },
          { status: 400 },
        );
      }
      return htmlResponse(errorMessage, false);
    }

    // Verify Turnstile
    const turnstileToken = fields['cf-turnstile-response'] || '';
    if (!turnstileToken) {
      const errorMessage = 'Please complete the verification challenge';
      if (isJsonRequest) {
        return Response.json(
          { success: false, errors: [errorMessage] },
          { status: 400 },
        );
      }
      return htmlResponse(errorMessage, false);
    }

    const turnstileValid = await verifyTurnstile(
      turnstileToken,
      env.TURNSTILE_SECRET_KEY,
      clientIp,
    );
    if (!turnstileValid) {
      const errorMessage = 'Verification failed. Please try again.';
      if (isJsonRequest) {
        return Response.json(
          { success: false, errors: [errorMessage] },
          { status: 400 },
        );
      }
      return htmlResponse(errorMessage, false);
    }

    // Validate required fields
    const validationErrors = validateFields(formType, fields);
    if (validationErrors.length > 0) {
      if (isJsonRequest) {
        return Response.json(
          { success: false, errors: validationErrors },
          { status: 400 },
        );
      }
      return htmlResponse(
        `Please fix the following: ${validationErrors.join(', ')}`,
        false,
      );
    }

    // Build and send email
    const subject = buildEmailSubject(formType, fields);
    const emailBody = buildEmailBody(formType, fields);
    const emailSent = await sendEmail(env, subject, emailBody);

    if (!emailSent) {
      const errorMessage =
        'We could not send your message at this time. Please try again later.';
      if (isJsonRequest) {
        return Response.json(
          { success: false, errors: [errorMessage] },
          { status: 500 },
        );
      }
      return htmlResponse(errorMessage, false);
    }

    if (isJsonRequest) {
      return Response.json({ success: true });
    }
    return htmlResponse(
      'Your message has been sent successfully. We will get back to you soon.',
      true,
    );
  } catch {
    const errorMessage = 'An unexpected error occurred. Please try again.';
    if (isJsonRequest) {
      return Response.json(
        { success: false, errors: [errorMessage] },
        { status: 500 },
      );
    }
    return htmlResponse(errorMessage, false);
  }
};
