import {
  appDataSchema,
  emptyAppData,
  occurrenceIdFor,
  type AppData,
  type Transaction,
} from '../domain/types';
import { processSchedules } from '../domain/scheduleLifecycle';
import { fixedClock } from '../services/clock';

export const DEMO_INSTANT = '2026-10-23T12:00:00+06:30';
export const DEMO_DATE = '2026-10-23';
/** The pitch dataset: 199 confirmed records, four pending payments, ten schedules. */
export function createSampleData(): AppData {
  const data = emptyAppData();
  data.openingBalance = {
    amount: 1_000_000,
    referenceAt: '2025-01-01T00:00:00+06:30',
    timeZone: 'Asia/Rangoon',
  };
  const monthly: [string, Transaction['type'], number, number, string][] = [
    ['client-income', 'income', 800000, 1, 'Monthly client retainer'],
    ['rent', 'expense', 200000, 5, 'Shop rent'],
    ['utilities', 'expense', 40000, 10, 'Electricity and internet'],
    ['other-income', 'income', 120000, 12, 'Equipment rental income'],
    ['marketing', 'expense', 70000, 15, 'Monthly social media advertising'],
    ['other-expense', 'expense', 25000, 18, 'Business subscriptions'],
    ['food', 'expense', 90000, 20, 'Monthly meals budget'],
    ['transport', 'expense', 35000, 22, 'Delivery and travel costs'],
  ];
  const base = (
    id: string,
    categoryId: string,
    type: Transaction['type'],
    amount: number,
    date: string,
    description: string,
  ): Transaction => ({
    id,
    categoryId,
    type,
    amount,
    date,
    description,
    currency: 'MMK',
    counterpartyId: null,
    cashStatus: 'settled',
    confirmationStatus: 'confirmed',
    source: 'manual',
    ocrReviewStatus: 'not_applicable',
    ...(date === '2025-01-01'
      ? { openingDayDisposition: 'after_reference' as const }
      : {}),
    createdAt: `${date}T12:00:00+06:30`,
    updatedAt: `${date}T12:00:00+06:30`,
  });
  monthly.forEach(([category, type, amount, day, description]) => {
    const ruleId = `demo-monthly-${category}`;
    data.scheduleRules.push({
      id: ruleId,
      type,
      amount,
      categoryId: category,
      counterpartyId: null,
      description,
      active: true,
      schedule: {
        kind: 'monthly',
        startDate: `2025-01-${String(day).padStart(2, '0')}`,
        dayOfMonth: day,
      },
      createdAt: '2025-01-01T00:00:00+06:30',
      updatedAt: DEMO_INSTANT,
    });
    for (let m = 0; m < 22; m++) {
      const date = `${2025 + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const occurrenceId = occurrenceIdFor(ruleId, date);
      const transaction = {
        ...base(
          `demo-paid-${category}-${date}`,
          category,
          type,
          amount,
          date,
          description,
        ),
        source: 'recurring' as const,
        paymentOccurrenceId: occurrenceId,
        dueDate: date,
      };
      data.transactions.push(transaction);
      data.paymentOccurrences.push({
        id: occurrenceId,
        ruleId,
        originalDueDate: date,
        status: 'confirmed_paid',
        paymentTransactionId: transaction.id,
        paymentDate: date,
        paymentAmount: amount,
        history: [{ action: 'confirmed', at: transaction.createdAt }],
      });
    }
  });
  const once: [string, string, number, string][] = [
    ['2025-01-11', 'sales', 250000, 'New Year online orders'],
    ['2025-02-14', 'inventory', 350000, 'Initial stock purchase'],
    ['2025-03-09', 'sales', 320000, 'Weekend market sales'],
    ['2025-04-18', 'client-income', 150000, 'One-time website project'],
    ['2025-05-24', 'sales', 280000, 'Online product orders'],
    ['2025-06-17', 'supplies', 120000, 'Packaging and stationery'],
    ['2025-07-08', 'sales', 450000, 'Midyear promotion'],
    ['2025-08-23', 'other-expense', 180000, 'Equipment repair'],
    ['2025-09-19', 'sales', 390000, 'Wholesale order'],
    ['2025-11-27', 'sales', 520000, 'Festival sales'],
    ['2025-12-20', 'marketing', 150000, 'Holiday advertising campaign'],
    ['2026-01-14', 'sales', 600000, 'New Year campaign'],
    ['2026-02-07', 'inventory', 450000, 'Stock replenishment'],
    ['2026-03-11', 'sales', 480000, 'Online store sales'],
    ['2026-04-16', 'transport', 80000, 'Special delivery shipment'],
    ['2026-05-26', 'sales', 650000, 'Bulk customer order'],
    ['2026-06-11', 'rent', 100000, 'One-time market booth rental'],
    ['2026-07-16', 'sales', 720000, 'Summer promotion'],
    ['2026-08-09', 'other-income', 200000, 'Supplier refund'],
    ['2026-08-24', 'food', 60000, 'Team lunch'],
    ['2026-09-13', 'sales', 800000, 'Seasonal orders'],
    ['2026-10-19', 'sales', 900000, 'Latest customer orders'],
    ['2026-10-21', 'supplies', 140000, 'Packaging materials'],
  ];
  once.forEach(([date, category, amount, note], i) =>
    data.transactions.push(
      base(
        `demo-once-${i}`,
        category,
        data.categories.find((c) => c.id === category)!
          .type as Transaction['type'],
        amount,
        date,
        note,
      ),
    ),
  );
  const pending: [string, string, number, string, string][] = [
    [
      '2026-10-21',
      'client-income',
      300000,
      '2026-10-26',
      'Outstanding project payment',
    ],
    ['2026-10-22', 'sales', 180000, '2026-10-30', 'Customer invoice'],
    ['2026-10-20', 'inventory', 250000, '2026-10-28', 'Supplier payment'],
    [
      '2026-10-23',
      'other-expense',
      85000,
      '2026-11-02',
      'Equipment maintenance invoice',
    ],
  ];
  pending.forEach(([date, category, amount, dueDate, note], i) =>
    data.transactions.push({
      ...base(
        `demo-pending-${i}`,
        category,
        data.categories.find((c) => c.id === category)!
          .type as Transaction['type'],
        amount,
        date,
        note,
      ),
      dueDate,
      cashStatus: 'pending',
      confirmationStatus: 'not_applicable',
    }),
  );
  [
    ['2026-11-03', 'sales', 350000, 'Expected wholesale payment'],
    ['2026-11-05', 'other-expense', 450000, 'Planned equipment servicing'],
  ].forEach(([date, category, amount, note], i) =>
    data.scheduleRules.push({
      id: `demo-future-${i}`,
      categoryId: String(category),
      type: category === 'sales' ? 'income' : 'expense',
      amount: Number(amount),
      description: String(note),
      counterpartyId: null,
      schedule: { kind: 'one_time', dueDate: String(date) },
      active: true,
      createdAt: DEMO_INSTANT,
      updatedAt: DEMO_INSTANT,
    }),
  );
  data.categoryBudgets = [
    { categoryId: 'food', amount: 100000 },
    { categoryId: 'marketing', amount: 80000 },
    { categoryId: 'transport', amount: 50000 },
  ];
  data.creditProfile = {
    bankId: 'yoma',
    applicantName: 'Demo business owner',
    businessName: 'Sample online shop',
  };
  return appDataSchema.parse(processSchedules(data, fixedClock(DEMO_INSTANT)));
}
