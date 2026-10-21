import type { AppData } from './types';

export const readinessDocumentIds = [
  'income_records',
  'expense_receipts',
  'account_statements',
  'business_registration',
  'identity_document',
] as const;

export type ReadinessDocumentId = (typeof readinessDocumentIds)[number];

export type RecordCheckId =
  | 'opening_balance'
  | 'income_records'
  | 'expense_records'
  | 'categorized_records';

export function buildRecordChecks(data: AppData) {
  const categorizedCount = data.transactions.filter(
    (transaction) => transaction.categoryId !== null,
  ).length;
  return [
    { id: 'opening_balance' as const, complete: data.openingBalance !== null },
    {
      id: 'income_records' as const,
      complete: data.transactions.some(
        (transaction) => transaction.type === 'income',
      ),
    },
    {
      id: 'expense_records' as const,
      complete: data.transactions.some(
        (transaction) => transaction.type === 'expense',
      ),
    },
    {
      id: 'categorized_records' as const,
      complete:
        data.transactions.length > 0 &&
        categorizedCount === data.transactions.length,
      values: {
        categorized: categorizedCount,
        total: data.transactions.length,
      },
    },
  ];
}

const categoryKeywords: Record<string, readonly string[]> = {
  'client-income': ['client', 'freelance', 'project', 'consulting', 'service'],
  sales: ['sale', 'sales', 'order', 'customer', 'product'],
  'other-income': ['refund', 'interest', 'bonus'],
  supplies: ['supply', 'supplies', 'packaging', 'stationery'],
  inventory: ['stock', 'inventory', 'wholesale', 'goods'],
  transport: ['taxi', 'bus', 'fuel', 'delivery', 'transport'],
  utilities: ['electricity', 'internet', 'phone bill', 'water bill', 'utility'],
  rent: ['rent', 'lease'],
  marketing: ['ads', 'advertising', 'promotion', 'marketing'],
  food: ['meal', 'lunch', 'dinner', 'food'],
};

/** Suggest a matching existing category; callers must ask the user to apply it. */
export function suggestCategory(
  description: string,
  type: 'income' | 'expense',
  categories: AppData['categories'],
): string | null {
  const normalized = description.toLocaleLowerCase().trim();
  if (!normalized) return null;
  const matches = categories
    .filter((category) => category.type === type || category.type === 'both')
    .map((category) => ({
      categoryId: category.id,
      keyword: (categoryKeywords[category.id] ?? []).find((keyword) =>
        normalized.includes(keyword),
      ),
    }))
    .filter((match) => match.keyword)
    .sort((a, b) => b.keyword!.length - a.keyword!.length);
  return matches[0]?.categoryId ?? null;
}
