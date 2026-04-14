// field-labels.ts is pure data — no side-effects, no external deps.
// These tests guard against:
//   - a key being deleted or renamed (would break humanizeFieldName in
//     form-handler.ts and validateFields in index.ts)
//   - a label being set to an empty string (would produce bad error messages)
//   - required fields in index.ts lacking a FIELD_LABELS entry (would fall
//     back to the raw hyphenated key in error messages shown to users)

import { describe, it, expect } from 'vitest';
import { FIELD_LABELS } from '../scripts/field-labels';

//Every Field Required in index.ts must have a label
//IF a new form type or field is added to REQUIRED_FIELDS, it must be added here too
const REQUIRED_FIELDS_FROM_INDEX = [
  // home-contact
  'first-name',
  'last-name',
  'email',
  'subject',
  'message',
  // referral (Extra fields beyond home-contact)
  'referral-type',
  'phone',
  'address',
  'city',
  'suburb',
  'area-code',
  'referral-source',
  // training
  'contact-name',
  'contact-phone',
  'training-hours',
  'start-date',
  'end-date',
] as const;

describe('FIELD_LABELS', () => {
  it('exports a plain object', () => {
    expect(FIELD_LABELS).toBeDefined();
    expect(typeof FIELD_LABELS).toBe('object');
    expect(FIELD_LABELS).not.toBeNull();
  });

  (it('has at least one entry'),
    () => {
      expect(Object.keys(FIELD_LABELS).length).toBeGreaterThan(0);
    });
});

describe('every label value', () => {
  it('is a non-empty string', () => {
    for (const [key, value] of Object.entries(FIELD_LABELS)) {
      expect(typeof value, `FIELD_LABELS["${key}"] should be a string`).toBe(
        'string',
      );
      expect(
        value.trim().length,
        `FIELD_LABELS["${key}"] should not be empty or whitespace-only`,
      ).toBeGreaterThan(0);
    }
  });
});

describe('snapshot of known field -> label mappings', () => {
  //These are the exact user-facing strings. If a label is intentionally
  //changed, update the snapshot here and confirm the new wording reads
  //well in the error message "Please enter <label>".
  const knownMappings: [string, string][] = [
    ['first-name', 'your first name'],
    ['last-name', 'your last name'],
    ['email', 'your email address'],
    ['phone', 'your phone number'],
    ['contact-phone', 'a contact phone number'],
    ['contact-name', 'a contact name'],
    ['subject', 'a subject'],
    ['message', 'a message'],
    ['referral-type', 'a referral type'],
    ['address', 'an address'],
    ['city', 'a city'],
    ['suburb', 'a suburb'],
    ['area-code', 'an area code'],
    ['referral-source', 'who is making this referral'],
    ['services', 'at least one service'],
    ['training-hours', 'training duration'],
    ['start-date', 'a start date'],
    ['end-date', 'an end date'],
    ['other-topic-details', 'other details'],
    ['identified-name', 'identified name'],
  ];

  for (const [field, expectedLabel] of knownMappings) {
    it(`maps "${field}" -> "${expectedLabel}" `, () => {
      expect(FIELD_LABELS[field]).toBe(expectedLabel);
    });
  }
});

describe('coverage of REQUIRED_FIELDS from index.ts', () => {
  //Every field that can appear in a validation error must have a label
  //so users get a friendly message instead of the raw hyphenated key.
  for (const field of REQUIRED_FIELDS_FROM_INDEX) {
    it(`has an entry for required field "${field}"`, () => {
      expect(FIELD_LABELS[field]).toBeDefined();
    });
  }
});
