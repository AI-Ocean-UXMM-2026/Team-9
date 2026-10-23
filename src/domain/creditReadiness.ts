import type { AppData } from './types';
import { findPossibleDuplicates } from './analysis';

export type BankId = 'abank' | 'yoma' | 'mcb';
export type CreditRequirementId =
  | 'identity'
  | 'business'
  | 'tax'
  | 'financial'
  | 'statements'
  | 'photos'
  | 'vouchers';
interface Requirement {
  id: CreditRequirementId;
  title: string;
  detail: string;
  match?: 'financial' | 'vouchers';
}
export interface BankChecklist {
  id: BankId;
  name: string;
  product: string;
  abbreviation: string;
  historyMonths: number;
  summary: string;
  source?: string;
  sourceNote: string;
  requirements: readonly Requirement[];
}

export const bankChecklists: readonly BankChecklist[] = [
  {
    id: 'abank',
    name: 'A Bank',
    product: 'Business loan preparation',
    abbreviation: 'A',
    historyMonths: 12,
    summary: 'Cash-flow summary from your recorded income and expenses',
    sourceNote:
      'Team draft checklist. Confirm the exact loan product, history period and required documents with A Bank.',
    requirements: [
      {
        id: 'identity',
        title: 'Personal KYC',
        detail: 'NRC and household registration copies.',
      },
      {
        id: 'business',
        title: 'Business status',
        detail: 'Valid business licence or MSME agency recommendation.',
      },
      {
        id: 'tax',
        title: 'Tax & business history',
        detail: 'Tax payment / clearance evidence and business history.',
      },
      {
        id: 'financial',
        title: 'Financial statements',
        detail:
          'One to three years, as requested by the branch. The app prepares a supporting cash-flow summary.',
        match: 'financial',
      },
      {
        id: 'statements',
        title: 'Bank statements',
        detail:
          'The team draft lists six months for CB accounts, one year for other banks. Confirm with A Bank.',
      },
      {
        id: 'photos',
        title: 'Applicant & business photos',
        detail:
          'Applicant ID photo, business photos and collateral photos where required.',
      },
    ],
  },
  {
    id: 'yoma',
    name: 'Yoma Bank',
    product: 'Business loan preparation',
    abbreviation: 'Y',
    historyMonths: 12,
    summary: 'Digital sales & purchase records summary',
    source: 'https://www.yomabank.com/en/business/business-loan/',
    sourceNote:
      'Six preparation groups based on Yoma Bank’s published Business Loan list. Product-specific and additional requirements must be confirmed with the branch.',
    requirements: [
      {
        id: 'identity',
        title: 'Borrower identity',
        detail:
          'Original NRC, family registration, ward recommendation and one ID photo; include co-borrower documents if applicable.',
      },
      {
        id: 'business',
        title: 'Business documents',
        detail:
          'Business registration / licence, plus BOD resolution or meeting minutes where applicable.',
      },
      {
        id: 'tax',
        title: 'Revenue tax receipts',
        detail: 'Prepare the tax receipts requested for your business.',
      },
      {
        id: 'financial',
        title: 'Financial statements',
        detail:
          'Prepare financial statements. Confirm whether the selected product requires an audit.',
        match: 'financial',
      },
      {
        id: 'statements',
        title: 'Bank statements',
        detail: 'Bank-issued statements for the last year.',
      },
      {
        id: 'vouchers',
        title: 'Sales & purchase vouchers',
        detail:
          'Vouchers and summaries for the last year. Reviewed receipt records contribute to the supporting summary.',
        match: 'vouchers',
      },
    ],
  },
  {
    id: 'mcb',
    name: 'MCB Bank',
    product: 'MSME / SME preparation',
    abbreviation: 'M',
    historyMonths: 36,
    summary: 'Business-owner income & cash-flow summary',
    source: 'https://mcb.com.mm/loans-sme-solutions/',
    sourceNote:
      'Team checklist cross-checked against MCB’s published loan document lists. Lists vary between products; confirm the selected MSME loan with the branch.',
    requirements: [
      {
        id: 'identity',
        title: 'Personal KYC',
        detail: 'NRC, household list and ward recommendation.',
      },
      {
        id: 'business',
        title: 'Business licence / DICA',
        detail:
          'Valid business licence or DICA registration, with applicable company documents.',
      },
      {
        id: 'tax',
        title: 'Tax documents',
        detail:
          'Profit / income tax receipts for the last three years, as applicable.',
      },
      {
        id: 'financial',
        title: 'Profit & loss / balance sheet',
        detail:
          'Financial statements for the last three years. App records provide a supporting summary, without an audit or certification.',
        match: 'financial',
      },
      {
        id: 'statements',
        title: 'Bank statements',
        detail:
          'Current bank statements for the last year, subject to the selected product.',
      },
      {
        id: 'photos',
        title: 'Business & shop photos',
        detail:
          'Front, back and inside views; prepare collateral and applicant photos if requested.',
      },
    ],
  },
];

export const creditChecklistKey = (bank: BankId, item: CreditRequirementId) =>
  `credit:${bank}:${item}` as const;

const firstMonth = (today: string, offset: number) => {
  const [year, month] = today.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1))
    .toISOString()
    .slice(0, 10);
};

export function buildCreditReadiness(
  data: AppData,
  bank: BankChecklist,
  today: string,
) {
  const startDate = firstMonth(today, -11);
  const historyStart = firstMonth(today, 1 - bank.historyMonths);
  const settled = data.transactions.filter(
    (item) =>
      item.cashStatus === 'settled' &&
      item.confirmationStatus !== 'unconfirmed' &&
      item.date <= today,
  );
  const history = settled.filter((item) => item.date >= historyStart);
  const recent = settled.filter((item) => item.date >= startDate);
  const reviewedImage = (item: AppData['transactions'][number]) =>
    (item.source === 'receipt_image' || item.source === 'screenshot') &&
    item.ocrReviewStatus === 'reviewed';
  const coveredMonths = new Set(history.map((item) => item.date.slice(0, 7)))
    .size;
  const voucherMonths = new Set(
    recent.filter(reviewedImage).map((item) => item.date.slice(0, 7)),
  ).size;
  const rows = bank.requirements.map((requirement) => {
    const declared = Boolean(
      data.checklist[creditChecklistKey(bank.id, requirement.id)],
    );
    const coverage =
      requirement.match === 'financial'
        ? coveredMonths / bank.historyMonths
        : requirement.match === 'vouchers'
          ? voucherMonths / 12
          : 0;
    const supporting = !declared && coverage >= 1;
    return {
      ...requirement,
      declared,
      supporting,
      completion: declared ? 1 : Math.min(1, coverage),
      complete: declared || supporting,
    };
  });
  const monthly = Array.from({ length: 12 }, (_, index) => {
    const month = firstMonth(today, index - 11).slice(0, 7);
    const records = recent.filter((item) => item.date.startsWith(month));
    return {
      month,
      count: records.length,
      income: records
        .filter((item) => item.type === 'income')
        .reduce((sum, item) => sum + item.amount, 0),
      expenses: records
        .filter((item) => item.type === 'expense')
        .reduce((sum, item) => sum + item.amount, 0),
    };
  });
  const income = monthly.reduce((sum, row) => sum + row.income, 0);
  const expenses = monthly.reduce((sum, row) => sum + row.expenses, 0);
  return {
    bank,
    today,
    startDate,
    historyStart,
    rows,
    monthly,
    percent: Math.round(
      (rows.reduce((sum, row) => sum + row.completion, 0) / rows.length) * 100,
    ),
    completed: rows.filter((row) => row.complete).length,
    coveredMonths,
    voucherMonths,
    recentMonths: monthly.filter((row) => row.count > 0).length,
    income,
    expenses,
    net: income - expenses,
    recordCount: recent.length,
    reviewedImageCount: recent.filter(reviewedImage).length,
    manualCount: recent.filter((item) => item.source === 'manual').length,
    recurringCount: recent.filter((item) => item.source === 'recurring').length,
    pendingCount: data.transactions.filter(
      (item) =>
        item.cashStatus === 'pending' &&
        item.date >= startDate &&
        item.date <= today,
    ).length,
    unconfirmedCount: data.transactions.filter(
      (item) =>
        item.confirmationStatus === 'unconfirmed' &&
        item.date >= startDate &&
        item.date <= today,
    ).length,
    duplicateCount: findPossibleDuplicates(data).filter(
      (pair) => pair.first.date >= startDate || pair.second.date >= startDate,
    ).length,
    firstRecord: recent.map((item) => item.date).sort()[0] ?? null,
    lastRecord:
      recent
        .map((item) => item.date)
        .sort()
        .at(-1) ?? null,
  };
}
export type CreditReadiness = ReturnType<typeof buildCreditReadiness>;
