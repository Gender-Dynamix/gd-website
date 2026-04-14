// src/tests/__mocks__/astro-actions.ts
//
// Astro's defineAction wraps a handler with schema validation and error
// normalisation.  For unit tests we want to call the handler directly with
// plain objects, so we strip all of that away:
//   - defineAction returns an object whose handler property IS the raw handler
//   - ActionError is a plain Error subclass with a `code` property so tests
//     can assert on both the message and the status code

import { handle } from '@astrojs/cloudflare/handler';

export class ActionError extends Error {
  code: string;
  constructor({ code, message }: { code: string; message: string }) {
    super(message);
    this.name = 'ActionError';
    this.code = code;
  }
}

export function defineAction<T>({
  handler,
}: {
  accept?: string;
  input?: unknown;
  handler: T;
}): { handler: T } {
  return { handler };
}
