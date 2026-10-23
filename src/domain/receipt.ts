import { MMK_MAX } from './types';

export interface ReceiptFields {
  amount: number | null;
  date: string;
  type: 'income' | 'expense' | '';
  cashStatus: 'settled' | 'pending' | '';
  description: string;
  rawText: string;
  warnings: string[];
}

const normalizeDigits = (value: string) =>
  value.replace(/[၀-၉]/g, (digit) => String(digit.charCodeAt(0) - 0x1040));

function validDate(year: number, month: number, day: number) {
  if (year < 1900 || year > 2200) return '';
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    : '';
}

function readDate(text: string) {
  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const named = text.match(
    /\b(\d{1,2})[\s./-]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s,./-]+(20\d{2})\b/i,
  );
  if (named) {
    const month =
      [
        'jan',
        'feb',
        'mar',
        'apr',
        'may',
        'jun',
        'jul',
        'aug',
        'sep',
        'oct',
        'nov',
        'dec',
      ].indexOf(named[2].slice(0, 3).toLowerCase()) + 1;
    return validDate(Number(named[3]), month, Number(named[1]));
  }
  const numeric = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b/);
  if (!numeric) return '';
  const a = Number(numeric[1]);
  const b = Number(numeric[2]);
  // Ambiguous dates stay blank for the user to review.
  return a > 12
    ? validDate(Number(numeric[3]), b, a)
    : b > 12
      ? validDate(Number(numeric[3]), a, b)
      : a === b
        ? validDate(Number(numeric[3]), a, b)
        : '';
}

export function parseReceiptText(
  rawText: string,
  confidence: number,
): ReceiptFields {
  const text = normalizeDigits(rawText);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const warnings: string[] = [];
  const foreignCurrency = /\b(?:USD|THB|SGD|EUR|GBP|CNY|INR)\b|[$€£฿]/i.test(
    text,
  );
  const mmk = /\b(?:MMK|kyats?|Ks)\b|ကျပ်/i.test(text);
  const totals = new Map<number, number>();
  for (const [index, line] of lines.entries()) {
    if (
      /\b(?:sub\s*total|tax|change|cash tendered|balance brought|total items|total quantity|total discount)\b/i.test(
        line,
      )
    )
      continue;
    const strong =
      /\b(?:grand\s*total|total\s*(?:amount|paid|due)|amount\s*(?:paid|due|transferred|received)|net\s*(?:total|amount))\b|စုစုပေါင်း|ကျသင့်ငွေ/i.test(
        line,
      );
    const total =
      strong ||
      /\btotal\b|^(?:transaction\s+|transfer\s+|payment\s+)?amount\b/i.test(
        line,
      );
    if (!total) continue;
    const content = /\d/.test(line)
      ? line
      : `${line} ${lines[index + 1] ?? ''}`;
    const numbers =
      content.match(/\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?/g) ??
      [];
    const last = numbers.at(-1);
    const amount = Number(last?.replaceAll(',', ''));
    if (Number.isSafeInteger(amount) && amount > 0 && amount <= MMK_MAX)
      totals.set(amount, Math.max(totals.get(amount) ?? 0, strong ? 2 : 1));
  }
  const best = Math.max(0, ...totals.values());
  const candidates = [...totals]
    .filter(([, weight]) => weight === best)
    .map(([amount]) => amount);
  const amount =
    candidates.length === 1 && mmk && !foreignCurrency ? candidates[0] : null;
  const date = readDate(text);
  const incoming =
    /\b(?:payment received|money received|received from|incoming transfer)\b/i.test(
      text,
    );
  const outgoing =
    /\b(?:receipt|purchase|payment sent|paid to|outgoing transfer)\b/i.test(
      text,
    );
  const pending = /\b(?:unpaid|pending|payment due|not paid)\b/i.test(text);
  const settled =
    !pending &&
    /\b(?:paid|successful|completed|payment received|payment sent)\b/i.test(
      text,
    );
  if (!text.trim()) warnings.push('noText');
  if (confidence < 75) warnings.push('lowConfidence');
  if (foreignCurrency || !mmk) warnings.push('currency');
  if (amount === null) warnings.push('amount');
  if (!date) warnings.push('date');
  if (!settled && !pending) warnings.push('status');
  return {
    amount,
    date,
    type:
      incoming && !outgoing ? 'income' : outgoing && !incoming ? 'expense' : '',
    cashStatus: pending ? 'pending' : settled ? 'settled' : '',
    description: (
      lines.find((line) => /[A-Za-z\u1000-\u109f]/.test(line)) ?? ''
    ).slice(0, 200),
    rawText: rawText.slice(0, 16000),
    warnings,
  };
}
