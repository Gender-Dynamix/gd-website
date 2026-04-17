// Astro's real defineAction returns a complex branded type that includes
// framework-level wrappers — it intentionally does NOT expose a `.handler`
// property on the returned value in its public types.
//
// For tests we need to call the raw handler directly.  The solution is to:
//   1. Define our own explicit return type that includes `.handler`
//   2. Use `as unknown as OurType` in the test file to bypass the inference
//      that TS would otherwise pull from astro's installed node_modules types.
//
// ActionError is a plain Error subclass with a `code` property so tests
// can assert on both the message and the status code.

export class ActionError extends Error {
  code: string;
  constructor({ code, message }: { code: string; message: string }) {
    super(message);
    this.name = 'ActionError';
    this.code = code;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineAction<THandler extends (...args: any[]) => any>({
  handler,
}: {
  accept?: string;
  input?: unknown;
  handler: THandler;
}): { handler: THandler } {
  return { handler };
}
