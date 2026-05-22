// src/tests/field-labels.test.ts

import { describe, it, expect } from 'vitest';
import { FIELD_LABELS } from '../scripts/field-labels';

const REQUIRED_FIELDS_FROM_INDEX = [
  'first-name',
  'last-name',
  'email',
  'subject',
  'message',
  'referral-type',
  'phone',
  'address',
  'city',
  'suburb',
  'area-code',
  'referral-source',
  'contact-name',
  'contact-phone',
  'org-name',
  'org-type',
  'location',
  'attendee-count',
  'training-reason',
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

  it('has at least one entry', () => {
    expect(Object.keys(FIELD_LABELS).length).toBeGreaterThan(0);
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

  describe('snapshot of known field → label mappings', () => {
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
      // referral-source = who is making the referral (you, GP, family member etc.)
      ['referral-source', 'who is making this referral'],
      ['services', 'at least one service'],
      ['org-name', 'an organisation name'],
      ['org-type', 'a type of organisation'],
      ['org-type-other', 'your organisation type'],
      ['location', 'a preferred training location'],
      ['attendee-count', 'the expected number of attendees'],
      ['confidence-level', 'a staff confidence level'],
      ['prior-knowledge', 'prior knowledge details'],
      ['training-reason', 'a reason for seeking training'],
      ['training-hours', 'training duration'],
      ['start-date', 'a start date'],
      ['end-date', 'an end date'],
      ['other-topic-details', 'other details'],
      ['identified-name', 'identified name'],
      ['date-of-birth', 'a date of birth'],
    ];

    for (const [field, expectedLabel] of knownMappings) {
      it(`maps "${field}" → "${expectedLabel}"`, () => {
        expect(FIELD_LABELS[field]).toBe(expectedLabel);
      });
    }
  });

  describe('coverage of REQUIRED_FIELDS from index.ts', () => {
    for (const field of REQUIRED_FIELDS_FROM_INDEX) {
      it(`has an entry for required field "${field}"`, () => {
        expect(FIELD_LABELS[field]).toBeDefined();
      });
    }
  });
});
