interface FormResponse {
  success: boolean;
  errors?: string[];
}

function getFormFields(form: HTMLFormElement): Record<string, string> {
  const formData = new FormData(form);
  const fields: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value !== 'string') continue;
    if (fields[key]) {
      fields[key] += `, ${value}`;
    } else {
      fields[key] = value;
    }
  }

  return fields;
}

function showFeedback(
  feedbackElement: HTMLElement,
  message: string,
  isSuccess: boolean,
): void {
  feedbackElement.innerHTML = '';
  const messageElement = document.createElement('div');
  messageElement.className = isSuccess ? 'form-success' : 'form-error';
  messageElement.textContent = message;
  feedbackElement.appendChild(messageElement);
}

function showFieldErrors(feedbackElement: HTMLElement, errors: string[]): void {
  feedbackElement.innerHTML = '';
  const errorList = document.createElement('ul');
  errorList.className = 'form-error-list';

  for (const error of errors) {
    const listItem = document.createElement('li');
    listItem.textContent = error;
    errorList.appendChild(listItem);
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'form-error';
  wrapper.appendChild(errorList);
  feedbackElement.appendChild(wrapper);
}

function setSubmitState(
  button: HTMLButtonElement,
  isLoading: boolean,
  originalText: string,
): void {
  button.disabled = isLoading;
  button.textContent = isLoading ? 'Sending...' : originalText;
}

function replaceFormWithSuccess(form: HTMLFormElement): void {
  const successContainer = document.createElement('div');
  successContainer.className = 'form-submission-success';
  successContainer.innerHTML = `
    <div class="success-icon"><i class="fas fa-check-circle"></i></div>
    <h3>Thank you!</h3>
    <p>Your message has been sent successfully. We will get back to you soon.</p>
  `;
  form.replaceWith(successContainer);
}

async function handleFormSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const feedbackElement = form
    .closest('.form-card-container, .contact-content, .form-content')
    ?.querySelector('.form-feedback') as HTMLElement | null;
  const submitButton = form.querySelector(
    '[type="submit"]',
  ) as HTMLButtonElement;
  const originalButtonText = submitButton?.textContent || 'Send';

  if (feedbackElement) {
    feedbackElement.innerHTML = '';
  }

  if (submitButton) {
    setSubmitState(submitButton, true, originalButtonText);
  }

  try {
    const fields = getFormFields(form);

    const response = await fetch('/api/form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });

    const result: FormResponse = await response.json();

    if (result.success) {
      replaceFormWithSuccess(form);
    } else if (feedbackElement) {
      if (result.errors && result.errors.length > 0) {
        showFieldErrors(feedbackElement, result.errors);
      } else {
        showFeedback(
          feedbackElement,
          'Something went wrong. Please try again.',
          false,
        );
      }
      feedbackElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } catch {
    if (feedbackElement) {
      showFeedback(
        feedbackElement,
        'Could not send your message. Please check your connection and try again.',
        false,
      );
    }
  } finally {
    if (submitButton && document.body.contains(submitButton)) {
      setSubmitState(submitButton, false, originalButtonText);
    }
  }
}

function initFormHandlers(): void {
  const forms = document.querySelectorAll<HTMLFormElement>(
    'form[data-form-type]',
  );

  for (const form of forms) {
    form.addEventListener('submit', handleFormSubmit);
  }
}

document.addEventListener('DOMContentLoaded', initFormHandlers);
