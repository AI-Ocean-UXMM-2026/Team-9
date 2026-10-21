import {
  buildCashFlowForecast,
  summarizeOutstanding,
  summarizePeriod,
} from './reporting';
import {
  appDataSchema,
  type AppData,
  type DuplicateReview,
  type Transaction,
} from './types';

export interface DuplicateCandidate {
  first: Transaction;
  second: Transaction;
  fingerprint: string;
}

const normalizedDescription = (transaction: Transaction) =>
  (transaction.description ?? '')
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ');

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, '0');
}

function versionKey(transaction: Transaction): string {
  return JSON.stringify([
    transaction.type,
    transaction.amount,
    transaction.currency,
    transaction.date,
    transaction.dueDate ?? '',
    transaction.categoryId ?? '',
    normalizedDescription(transaction),
    transaction.counterpartyId ?? '',
    transaction.cashStatus,
    transaction.updatedAt,
  ]);
}

function reviewPairKey(review: DuplicateReview): string {
  return [review.firstTransactionId, review.secondTransactionId]
    .sort()
    .join('|');
}

export function duplicateReviewId(
  firstId: string,
  secondId: string,
  fingerprint: string,
): string {
  return `duplicate-${hash(`${[firstId, secondId].sort().join('|')}|${fingerprint}`)}`;
}

/** Finds exact, well-supported pairs and suppresses only the reviewed record versions. */
export function findPossibleDuplicates(input: AppData): DuplicateCandidate[] {
  const data = appDataSchema.parse(input);
  const groups = new Map<string, Transaction[]>();
  for (const transaction of data.transactions) {
    if (transaction.paymentOccurrenceId) continue;
    const description = normalizedDescription(transaction);
    if (!description && !transaction.counterpartyId) continue;
    const base = [
      transaction.type,
      transaction.amount,
      transaction.currency,
      transaction.date,
      transaction.categoryId ?? '',
      transaction.cashStatus,
    ].join('|');
    const signatures = new Set([
      ...(description ? [`${base}|description:${description}`] : []),
      ...(transaction.counterpartyId
        ? [`${base}|counterparty:${transaction.counterpartyId}`]
        : []),
    ]);
    for (const signature of signatures) {
      const group = groups.get(signature) ?? [];
      group.push(transaction);
      groups.set(signature, group);
    }
  }

  const reviewed = new Set(
    data.duplicateReviews.map(
      (review) => `${reviewPairKey(review)}|${review.fingerprint}`,
    ),
  );
  const seenPairs = new Set<string>();
  const candidates: DuplicateCandidate[] = [];
  let inspectedPairs = 0;
  for (const group of groups.values()) {
    for (
      let left = 0;
      left < group.length - 1 &&
      candidates.length < 100 &&
      inspectedPairs < 10_000;
      left += 1
    ) {
      for (
        let right = left + 1;
        right < group.length &&
        candidates.length < 100 &&
        inspectedPairs < 10_000;
        right += 1
      ) {
        const first = group[left];
        const second = group[right];
        if (first.id === second.id) continue;
        const firstDescription = normalizedDescription(first);
        const secondDescription = normalizedDescription(second);
        if (
          firstDescription &&
          secondDescription &&
          firstDescription !== secondDescription
        )
          continue;
        const [low, high] = [first, second].sort((a, b) =>
          a.id.localeCompare(b.id),
        );
        const pair = `${low.id}|${high.id}`;
        if (seenPairs.has(pair)) continue;
        seenPairs.add(pair);
        inspectedPairs += 1;
        const fingerprint = hash(`${versionKey(low)}\n${versionKey(high)}`);
        if (!reviewed.has(`${pair}|${fingerprint}`)) {
          candidates.push({ first: low, second: high, fingerprint });
        }
      }
    }
    if (candidates.length >= 100 || inspectedPairs >= 10_000) break;
  }
  return candidates;
}

export type InsightEvidence = Pick<
  Transaction,
  'id' | 'date' | 'amount' | 'description'
> & { dueDate?: string; descriptionKey?: 'openingBalanceRecord' };
export interface RuleInsight {
  id: string;
  severity: 'info' | 'attention';
  titleKey: string;
  observedKey: string;
  values: Record<string, string | number>;
  interpretationKey: string;
  evidence: InsightEvidence[];
}

const evidenceFor = (transactions: readonly Transaction[]): InsightEvidence[] =>
  transactions
    .slice(0, 5)
    .map(({ id, date, amount, description, dueDate }) => ({
      id,
      date,
      amount,
      description: description ?? '',
      ...(dueDate ? { dueDate } : {}),
    }));

const forecastEvidence = (data: AppData): InsightEvidence[] => {
  const opening = data.openingBalance
    ? [
        {
          id: 'opening-balance',
          date: data.openingBalance.referenceAt.slice(0, 10),
          amount: data.openingBalance.amount,
          description: '',
          descriptionKey: 'openingBalanceRecord' as const,
        },
      ]
    : [];
  const pending = data.transactions
    .filter((item) => item.cashStatus === 'pending' && item.dueDate)
    .map((item) => ({
      id: item.id,
      date: item.date,
      dueDate: item.dueDate,
      amount: item.amount,
      description: item.description ?? '',
    }));
  const scheduled = data.paymentOccurrences.flatMap((occurrence) => {
    if (occurrence.status !== 'scheduled') return [];
    const rule = data.scheduleRules.find(
      (item) => item.id === occurrence.ruleId,
    );
    return !rule?.active
      ? []
      : [
          {
            id: occurrence.id,
            date: occurrence.originalDueDate,
            dueDate: occurrence.originalDueDate,
            amount: rule.amount,
            description: rule.description ?? '',
          },
        ];
  });
  return [...opening, ...pending, ...scheduled].slice(0, 5);
};

/** Rule-based signals expose their recorded evidence and avoid unsupported predictions. */
export function buildRuleInsights(
  input: AppData,
  today: string,
): RuleInsight[] {
  const data = appDataSchema.parse(input);
  const insights: RuleInsight[] = [];
  const outstanding = summarizeOutstanding(data, today);
  const overdue = [...outstanding.receivables, ...outstanding.payables].filter(
    (item) => item.overdue,
  );
  if (overdue.length) {
    insights.push({
      id: 'overdue',
      severity: 'attention',
      titleKey: 'overdueTitle',
      observedKey: 'overdueObserved',
      values: {
        count: overdue.length,
        amount: overdue.reduce((sum, item) => sum + item.transaction.amount, 0),
      },
      interpretationKey: 'overdueInterpretation',
      evidence: evidenceFor(overdue.map((item) => item.transaction)),
    });
  }
  const upcoming = [...outstanding.receivables, ...outstanding.payables].filter(
    (item) => !item.overdue && item.dueDate <= addDays(today, 7),
  );
  if (upcoming.length) {
    insights.push({
      id: 'upcoming',
      severity: 'info',
      titleKey: 'upcomingTitle',
      observedKey: 'upcomingObserved',
      values: {
        count: upcoming.length,
        amount: upcoming.reduce(
          (sum, item) => sum + item.transaction.amount,
          0,
        ),
      },
      interpretationKey: 'upcomingInterpretation',
      evidence: evidenceFor(upcoming.map((item) => item.transaction)),
    });
  }

  const currentRange = { startDate: `${today.slice(0, 7)}-01`, endDate: today };
  const previousMonthDate = new Date(`${today.slice(0, 7)}-01T00:00:00.000Z`);
  previousMonthDate.setUTCMonth(previousMonthDate.getUTCMonth() - 1);
  const previousMonth = previousMonthDate.toISOString().slice(0, 7);
  const currentExpenses = data.transactions.filter(
    (item) =>
      item.cashStatus === 'settled' &&
      item.type === 'expense' &&
      item.date >= currentRange.startDate &&
      item.date <= today,
  );
  const previousExpenses = data.transactions.filter(
    (item) =>
      item.cashStatus === 'settled' &&
      item.type === 'expense' &&
      item.date.startsWith(previousMonth),
  );
  const currentTotal = currentExpenses.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const previousTotal = previousExpenses.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const historicalByCategory = new Map<string, number[]>();
  for (const item of data.transactions) {
    if (
      item.cashStatus !== 'settled' ||
      item.type !== 'expense' ||
      !item.categoryId ||
      item.date >= currentRange.startDate
    )
      continue;
    const values = historicalByCategory.get(item.categoryId) ?? [];
    values.push(item.amount);
    historicalByCategory.set(item.categoryId, values);
  }
  const medians = new Map<string, number>();
  for (const [categoryId, values] of historicalByCategory) {
    if (values.length < 5) continue;
    values.sort((a, b) => a - b);
    const middle = Math.floor(values.length / 2);
    medians.set(
      categoryId,
      values.length % 2
        ? values[middle]
        : (values[middle - 1] + values[middle]) / 2,
    );
  }
  const unusual = currentExpenses.flatMap((transaction) => {
    const median = transaction.categoryId
      ? medians.get(transaction.categoryId)
      : undefined;
    return median !== undefined && transaction.amount > median * 2
      ? [{ transaction, median }]
      : [];
  });
  if (unusual.length) {
    const item = unusual.sort(
      (a, b) => b.transaction.amount - a.transaction.amount,
    )[0];
    insights.push({
      id: 'unusual-expense',
      severity: 'attention',
      titleKey: 'unusualTitle',
      observedKey: 'unusualObserved',
      values: { amount: item.transaction.amount, median: item.median },
      interpretationKey: 'unusualInterpretation',
      evidence: evidenceFor([item.transaction]),
    });
  }
  if (
    currentExpenses.length >= 3 &&
    previousExpenses.length >= 3 &&
    previousTotal > 0 &&
    currentTotal >= previousTotal * 1.5
  ) {
    insights.push({
      id: 'spending-spike',
      severity: 'attention',
      titleKey: 'spendingSpikeTitle',
      observedKey: 'spendingSpikeObserved',
      values: { current: currentTotal, previous: previousTotal },
      interpretationKey: 'spendingSpikeInterpretation',
      evidence: evidenceFor(currentExpenses),
    });
  }

  const categorized = new Map<string, Transaction[]>();
  for (const transaction of currentExpenses) {
    const category = transaction.categoryId ?? 'uncategorized';
    const group = categorized.get(category) ?? [];
    group.push(transaction);
    categorized.set(category, group);
  }
  const largestCategory = [...categorized.entries()].sort(
    (a, b) =>
      b[1].reduce((sum, item) => sum + item.amount, 0) -
      a[1].reduce((sum, item) => sum + item.amount, 0),
  )[0];
  if (currentExpenses.length >= 3 && largestCategory) {
    const categoryTotal = largestCategory[1].reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    if (categoryTotal / currentTotal >= 0.5) {
      insights.push({
        id: 'concentration',
        severity: 'info',
        titleKey: 'concentrationTitle',
        observedKey: 'concentrationObserved',
        values: {
          category: largestCategory[0],
          amount: categoryTotal,
          percent: Math.round((categoryTotal / currentTotal) * 100),
        },
        interpretationKey: 'concentrationInterpretation',
        evidence: evidenceFor(largestCategory[1]),
      });
    }
  }

  const uncategorized = data.transactions.filter(
    (item) => item.cashStatus === 'settled' && !item.categoryId,
  );
  if (uncategorized.length) {
    insights.push({
      id: 'incomplete-records',
      severity: 'info',
      titleKey: 'incompleteTitle',
      observedKey: 'incompleteObserved',
      values: { count: uncategorized.length },
      interpretationKey: 'incompleteInterpretation',
      evidence: evidenceFor(uncategorized),
    });
  }

  const duplicates = findPossibleDuplicates(data);
  if (duplicates.length) {
    insights.push({
      id: 'possible-duplicates',
      severity: 'attention',
      titleKey: 'duplicatesTitle',
      observedKey: 'duplicatesObserved',
      values: { count: duplicates.length },
      interpretationKey: 'duplicatesInterpretation',
      evidence: [],
    });
  }

  if (data.openingBalance) {
    const forecast = buildCashFlowForecast(data, today);
    if (forecast.base.shortfall || forecast.lateInflows.shortfall) {
      insights.push({
        id: 'cash-shortfall',
        severity: 'attention',
        titleKey: 'shortfallTitle',
        observedKey: 'shortfallObserved',
        values: {
          base: forecast.base.shortfall,
          delayed: forecast.lateInflows.shortfall,
        },
        interpretationKey: 'shortfallInterpretation',
        evidence: forecastEvidence(data),
      });
    }
  }
  return insights;
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export interface ChatAnswer {
  supported: boolean;
  messageKey: string;
  values: Record<string, string | number>;
  evidence: InsightEvidence[];
}

const unsupportedAnswer = (): ChatAnswer => ({
  supported: false,
  messageKey: 'chat.unsupportedAnswer',
  values: {},
  evidence: [],
});

/** Answers a small, explicit set of questions from current records; unsupported requests are declined. */
export function answerRecordedQuestion(
  input: AppData,
  today: string,
  question: string,
): ChatAnswer {
  const data = appDataSchema.parse(input);
  const query = question.trim().toLocaleLowerCase();
  if (!query) return unsupportedAnswer();
  if (
    /loan|credit score|approval|legal|tax advice|financial advice|invest/.test(
      query,
    )
  )
    return unsupportedAnswer();
  if (/document|checklist|missing document/.test(query)) {
    const completed = Object.values(data.checklist).filter(Boolean).length;
    const total = Object.keys(data.checklist).length;
    return {
      supported: true,
      messageKey: 'chat.documentsAnswer',
      values: { completed, total },
      evidence: forecastEvidence(data),
    };
  }
  if (/overdue|late payment/.test(query)) {
    const items = [
      ...summarizeOutstanding(data, today).receivables,
      ...summarizeOutstanding(data, today).payables,
    ].filter((item) => item.overdue);
    return {
      supported: true,
      messageKey: 'chat.overdueAnswer',
      values: {
        count: items.length,
        amount: items.reduce((sum, item) => sum + item.transaction.amount, 0),
      },
      evidence: evidenceFor(items.map((item) => item.transaction)),
    };
  }
  if (/owe|outstanding|owed/.test(query)) {
    const result = summarizeOutstanding(data, today);
    return {
      supported: true,
      messageKey: 'chat.outstandingAnswer',
      values: {
        receivable: result.receivableTotal,
        payable: result.payableTotal,
      },
      evidence: evidenceFor(
        [...result.receivables, ...result.payables].map(
          (item) => item.transaction,
        ),
      ),
    };
  }
  if (/forecast|shortfall|cash flow/.test(query)) {
    if (!data.openingBalance)
      return {
        supported: true,
        messageKey: 'chat.forecastMissingOpening',
        values: {},
        evidence: [],
      };
    const result = buildCashFlowForecast(data, today);
    return {
      supported: true,
      messageKey: 'chat.forecastAnswer',
      values: {
        minimum: result.base.minimumBalance ?? 0,
        delayedShortfall: result.lateInflows.shortfall,
      },
      evidence: forecastEvidence(data),
    };
  }
  const period = summarizePeriod(data.transactions, {
    startDate: `${today.slice(0, 7)}-01`,
    endDate: today,
  });
  if (/top expense|largest expense|biggest expense/.test(query)) {
    const top = data.transactions
      .filter(
        (item) =>
          item.cashStatus === 'settled' &&
          item.type === 'expense' &&
          item.date >= `${today.slice(0, 7)}-01` &&
          item.date <= today,
      )
      .sort((a, b) => b.amount - a.amount)[0];
    return top
      ? {
          supported: true,
          messageKey: 'chat.topExpenseAnswer',
          values: { amount: top.amount },
          evidence: evidenceFor([top]),
        }
      : {
          supported: true,
          messageKey: 'chat.noTransactionsAnswer',
          values: {},
          evidence: [],
        };
  }
  if (/category/.test(query)) {
    const byCategory = new Map<string, number>();
    for (const item of data.transactions.filter(
      (transaction) =>
        transaction.cashStatus === 'settled' &&
        transaction.type === 'expense' &&
        transaction.date >= `${today.slice(0, 7)}-01` &&
        transaction.date <= today,
    )) {
      const category = item.categoryId ?? 'uncategorized';
      byCategory.set(category, (byCategory.get(category) ?? 0) + item.amount);
    }
    const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    return top
      ? {
          supported: true,
          messageKey: 'chat.categoryAnswer',
          values: { category: top[0], amount: top[1] },
          evidence: evidenceFor(
            data.transactions.filter(
              (item) =>
                item.cashStatus === 'settled' &&
                item.type === 'expense' &&
                (item.categoryId ?? 'uncategorized') === top[0] &&
                item.date >= `${today.slice(0, 7)}-01` &&
                item.date <= today,
            ),
          ),
        }
      : {
          supported: true,
          messageKey: 'chat.noTransactionsAnswer',
          values: {},
          evidence: [],
        };
  }
  if (/income|expense|spend|cash movement|total/.test(query)) {
    return {
      supported: true,
      messageKey: 'chat.periodAnswer',
      values: {
        income: period.income,
        expenses: period.expenses,
        net: period.net,
      },
      evidence: evidenceFor(
        data.transactions.filter(
          (item) =>
            item.cashStatus === 'settled' &&
            item.date >= period.startDate &&
            item.date <= period.endDate,
        ),
      ),
    };
  }
  return unsupportedAnswer();
}
