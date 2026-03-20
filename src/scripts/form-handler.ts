import { actions, isInputError } from 'astro:actions';
import { FIELD_LABELS } from './field-labels';

function humanizeFieldName(fieldName: string): string {
  return (
    FIELD_LABELS[fieldName] ||
    fieldName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
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

    // Transform technical errors into friendly messages
    let friendlyError = error;

    // Handle "field is required" errors
    const requiredMatch = error.match(/^([a-z-]+) is required$/i);
    if (requiredMatch) {
      const fieldName = humanizeFieldName(requiredMatch[1]);
      friendlyError = `Please enter ${fieldName.toLowerCase()}`;
    }

    // Handle email validation
    if (error.includes('valid email')) {
      friendlyError = 'Please enter a valid email address';
    }

    listItem.textContent = friendlyError;
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

  const otherCheckbox = form.querySelector('#item-other') as HTMLInputElement;
  const otherDetails = form.querySelector(
    '[name="other-topic-details"]',
  ) as HTMLInputElement;

  if (otherCheckbox?.checked && !otherDetails?.value.trim()) {
    if (feedbackElement) {
      showFeedback(
        feedbackElement,
        "Please specify your requirements in the 'Other' field.",
        false,
      );
      if (otherDetails) otherDetails.focus();
      return;
    }
  }

  const servicesError = form.querySelector('#rf-services-error');
  const serviceCheckboxes = form.querySelectorAll('input[name="services"]');
  const isAnyServiceChecked =
    form.querySelectorAll('input[name="services"]:checked').length > 0;

  if (servicesError) {
    if (!isAnyServiceChecked) {
      if (feedbackElement) {
        showFeedback(
          feedbackElement,
          "Please select at least one service you're interested in",
          false,
        );
      }
      servicesError.classList.add('is-visible');
      serviceCheckboxes.forEach((cb) =>
        cb.setAttribute('aria-invalid', 'true'),
      );

      if (submitButton) setSubmitState(submitButton, false, originalButtonText);
      return;
    } else {
      servicesError.classList.remove('is-visible');
      serviceCheckboxes.forEach((cb) => cb.removeAttribute('aria-invalid'));
    }
  }

  if (submitButton) {
    setSubmitState(submitButton, true, originalButtonText);
  }

  try {
    const formData = new FormData(form);

    // Consolidate multi-value checkbox fields into comma-separated strings
    // so they survive zod's passthrough (which flattens duplicate keys)
    const multiValueFields = ['services', 'training-topics'];
    for (const fieldName of multiValueFields) {
      const values = formData.getAll(fieldName);
      if (values.length > 0) {
        formData.delete(fieldName);
        formData.set(fieldName, values.join(', '));
      }
    }

    const { error } = await actions.submitForm(formData);

    if (!error) {
      replaceFormWithSuccess(form);
    } else if (feedbackElement) {
      if (isInputError(error)) {
        const fieldErrors = Object.values(error.fields)
          .flat()
          .filter((message): message is string => message !== undefined);
        showFieldErrors(feedbackElement, fieldErrors);
      } else {
        const errorMessages = error.message.split('\n').filter(Boolean);
        if (errorMessages.length > 1) {
          showFieldErrors(feedbackElement, errorMessages);
        } else {
          showFeedback(
            feedbackElement,
            error.message || 'Something went wrong. Please try again.',
            false,
          );
        }
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
