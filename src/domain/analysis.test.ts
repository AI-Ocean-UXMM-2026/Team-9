import { describe, expect, it } from 'vitest';
import {
  answerRecordedQuestion,
  buildRuleInsights,
  findPossibleDuplicates,
} from './analysis';
import { appDataSchema, emptyAppData, type Transaction } from './types';

const transaction = (
  overrides: Partial<Transaction> & Pick<Transaction, 'id'>,
): Transaction => ({
  type: 'expense',
  amount: 20_000,
  currency: 'MMK',
  date: '2026-10-10',
  categoryId: 'supplies',
  counterpartyId: null,
  cashStatus: 'settled',
  confirmationStatus: 'not_applicable',
  source: 'manual',
  ocrReviewStatus: 'not_applicable',
  createdAt: '2026-10-10T00:00:00Z',
  updatedAt: '2026-10-10T00:00:00Z',
  ...overrides,
});

describe('rule-based analysis', () => {
  it('finds strong duplicate matches, remembers Keep both, and reopens changed versions', () => {
    const first = transaction({ id: 'manual-1', description: 'Shop supplies' });
    const second = transaction({
      id: 'receipt-1',
      source: 'receipt_image',
      ocrReviewStatus: 'reviewed',
      description: ' shop   supplies ',
    });
    const data = { ...emptyAppData(), transactions: [first, second] };
    const [candidate] = findPossibleDuplicates(data);
    expect(candidate).toBeDefined();
    const reviewed = {
      ...data,
      duplicateReviews: [
        {
          id: 'review-1',
          firstTransactionId: candidate.first.id,
          secondTransactionId: candidate.second.id,
          fingerprint: candidate.fingerprint,
          resolution: 'keep_both' as const,
          reviewedAt: '2026-10-21T00:00:00Z',
        },
      ],
    };
    expect(findPossibleDuplicates(reviewed)).toEqual([]);
    expect(
      findPossibleDuplicates({
        ...reviewed,
        transactions: reviewed.transactions.map((item) =>
          item.id === 'receipt-1'
            ? { ...item, updatedAt: '2026-10-22T00:00:00Z' }
            : item,
        ),
      }),
    ).toHaveLength(1);
  });

  it('validates a persisted duplicate-removed outcome after the selected record is deleted', () => {
    const retained = transaction({
      id: 'keep',
      description: 'Market supplies',
    });
    expect(
      appDataSchema.parse({
        ...emptyAppData(),
        transactions: [retained],
        duplicateReviews: [
          {
            id: 'review-removed',
            firstTransactionId: 'keep',
            secondTransactionId: 'removed',
            fingerprint: 'f00ba123',
            resolution: 'duplicate_removed',
            redundantTransactionId: 'removed',
            reviewedAt: '2026-10-21T00:00:00Z',
          },
        ],
      }).duplicateReviews,
    ).toHaveLength(1);
  });

  it('reports overdue obligations with transaction evidence', () => {
    const data = {
      ...emptyAppData(),
      transactions: [
        transaction({
          id: 'late-bill',
          date: '2026-10-12',
          cashStatus: 'pending',
          dueDate: '2026-10-20',
          description: 'Power bill',
        }),
      ],
    };
    const signals = buildRuleInsights(data, '2026-10-21');
    expect(signals[0]).toMatchObject({
      id: 'overdue',
      values: { count: 1, amount: 20_000 },
    });
    expect(signals[0].evidence[0]).toMatchObject({
      id: 'late-bill',
      date: '2026-10-12',
    });
  });

  it('requires enough records before reporting spending patterns', () => {
    const previous = [5_000, 6_000, 7_000, 8_000, 9_000].map((amount, index) =>
      transaction({
        id: `history-${index}`,
        amount,
        date: `2026-08-${String(index + 1).padStart(2, '0')}`,
      }),
    );
    const priorMonth = [1_000, 1_000, 1_000].map((amount, index) =>
      transaction({
        id: `previous-${index}`,
        amount,
        date: `2026-09-${String(index + 1).padStart(2, '0')}`,
      }),
    );
    const current = [2_000, 2_000, 15_000].map((amount, index) =>
      transaction({
        id: `current-${index}`,
        amount,
        date: `2026-10-${String(index + 2).padStart(2, '0')}`,
      }),
    );
    const signals = buildRuleInsights(
      {
        ...emptyAppData(),
        transactions: [...previous, ...priorMonth, ...current],
      },
      '2026-10-21',
    );
    expect(signals.map((signal) => signal.id)).toContain('unusual-expense');
    expect(signals.map((signal) => signal.id)).toContain('spending-spike');
    expect(signals.map((signal) => signal.id)).toContain('concentration');
  });

  it('answers supported questions from current records and declines advice requests', () => {
    const data = {
      ...emptyAppData(),
      transactions: [
        transaction({
          id: 'expense-1',
          amount: 45_000,
          date: '2026-10-14',
          description: 'Market stock',
        }),
      ],
    };
    const answer = answerRecordedQuestion(
      data,
      '2026-10-21',
      'What is my top expense this month?',
    );
    expect(answer).toMatchObject({
      supported: true,
      messageKey: 'chat.topExpenseAnswer',
      values: { amount: 45_000 },
    });
    expect(answer.evidence[0].id).toBe('expense-1');
    expect(
      answerRecordedQuestion(
        data,
        '2026-10-21',
        'What documents are available?',
      ),
    ).toMatchObject({
      supported: true,
      messageKey: 'chat.documentsAnswer',
      values: { completed: 0, total: 5 },
    });
    expect(
      answerRecordedQuestion(data, '2026-10-21', 'Will I get a loan?')
        .supported,
    ).toBe(false);
  });
});
