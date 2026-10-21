import { describe, expect, it } from 'vitest';
import {
  buildRecordChecks,
  readinessDocumentIds,
  suggestCategory,
} from './readiness';
import { emptyAppData } from './types';

describe('record readiness', () => {
  it('reports explicit record checks without assigning a score', () => {
    const checks = buildRecordChecks(emptyAppData());
    expect(checks.map(({ id, complete }) => [id, complete])).toEqual([
      ['opening_balance', false],
      ['income_records', false],
      ['expense_records', false],
      ['categorized_records', false],
    ]);
  });

  it('uses the existing document checklist keys', () => {
    expect(readinessDocumentIds).toHaveLength(5);
  });
});

describe('category suggestions', () => {
  const categories = emptyAppData().categories;

  it('suggests the strongest matching category for the selected transaction type', () => {
    expect(suggestCategory('Taxi delivery fuel', 'expense', categories)).toBe(
      'transport',
    );
    expect(suggestCategory('Client project', 'income', categories)).toBe(
      'client-income',
    );
  });

  it('does not suggest a category of the wrong type or for unmatched text', () => {
    expect(suggestCategory('Rent', 'income', categories)).toBeNull();
    expect(
      suggestCategory('miscellaneous note', 'expense', categories),
    ).toBeNull();
    expect(suggestCategory('', 'expense', categories)).toBeNull();
  });
});
