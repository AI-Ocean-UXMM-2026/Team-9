import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarClock,
  CalendarDays,
  CircleAlert,
  CircleMinus,
  Plus,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { CategorySuggestion } from '../components/CategorySuggestion';
import { ActivityCategoryIcon } from '../components/ActivityCategoryIcon';
import { ActivityStatusIcon } from '../components/ActivityStatusIcon';
import { calculateRecordedAvailableBalance } from '../domain/availableBalance';
import {
  getReportingRange,
  summarizeMonthlyMovement,
  summarizeOutstanding,
  summarizePeriod,
  buildCashFlowForecast,
  type ReportingPeriod,
} from '../domain/reporting';
import type { Transaction } from '../domain/types';
import { clockForTimeZone, systemClock } from '../services/clock';
import { dateInTimeZone, dateTimeInputInTimeZone, dateTimeInputToInstant } from '../services/timeZone';
import { useDemoStore } from '../store/demoStore';

const money = (amount: number | null) =>
  amount === null
    ? '—'
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
        amount,
      );
const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `txn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function businessNowInput(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(systemClock.now());
  const val = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '00';
  return `${val('year')}-${val('month')}-${val('day')}T${val('hour')}:${val('minute')}`;
}
function businessDate(instant: string, timeZone: string) {
  return dateInTimeZone(instant, timeZone);
}

export function DashboardPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const data = useDemoStore((state) => state.data);
  const timeZone = useDemoStore((state) => state.timeZone);
  const [period, setPeriod] = useState<ReportingPeriod>('this_month');
  const today = clockForTimeZone(timeZone).today();
  const range = getReportingRange(period, today);
  const { startDate, endDate } = range;
  const result = useMemo(
    () =>
      calculateRecordedAvailableBalance(data.openingBalance, data.transactions),
    [data],
  );
  const summary = useMemo(
    () => summarizePeriod(data.transactions, { startDate, endDate }),
    [data.transactions, startDate, endDate],
  );
  const monthlyMovement = useMemo(
    () => summarizeMonthlyMovement(data.transactions, today),
    [data.transactions, today],
  );
  const outstanding = useMemo(
    () => summarizeOutstanding(data, today),
    [data, today],
  );
  const forecast = useMemo(
    () => buildCashFlowForecast(data, today),
    [data, today],
  );
  const unconfirmedCount = data.paymentOccurrences.filter(
    (occurrence) => occurrence.status === 'assumed_unconfirmed',
  ).length;
  const upcomingItems = [
    ...data.paymentOccurrences
      .filter((occurrence) => occurrence.status === 'scheduled' && occurrence.originalDueDate >= today)
      .flatMap((occurrence) => {
        const rule = data.scheduleRules.find((item) => item.id === occurrence.ruleId);
        return rule ? [{ id: occurrence.id, date: occurrence.originalDueDate, amount: rule.amount, categoryId: rule.categoryId }] : [];
      }),
    ...data.transactions
      .filter((transaction) => transaction.cashStatus === 'pending' && transaction.dueDate && transaction.dueDate >= today)
      .map((transaction) => ({ id: transaction.id, date: transaction.dueDate ?? transaction.date, amount: transaction.amount, categoryId: transaction.categoryId })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  useEffect(() => {
    if (location.hash === '#opening-balance') {
      window.requestAnimationFrame(() => document.getElementById('opening-balance')?.scrollIntoView({ block: 'start' }));
    }
  }, [location.hash]);
  if (!data.openingBalance) {
    return (
      <div className="first-run-balance">
        <header className="page-heading">
          <h1 tabIndex={-1}>{t('dashboard.nav')}</h1>
        </header>
        <section className="first-run-balance-card surface-card" id="opening-balance">
          <span className="icon-circle icon-circle-blue"><WalletCards size={21} aria-hidden="true" /></span>
          <h2>{t('opening.firstRunTitle')}</h2>
          <OpeningBalanceForm key={timeZone} />
        </section>
      </div>
    );
  }
  return (
    <div className="dashboard-page">
      <header className="page-heading">
        <h1 tabIndex={-1}>{t('dashboard.nav')}</h1>
      </header>

      <section
        className="balance-card surface-card"
        id="opening-balance"
        aria-label={t('balance.available')}
      >
        <div className="balance-card-top">
          <div className="balance-card-label">
            <span className="icon-circle icon-circle-blue">
              <WalletCards size={20} />
            </span>
            <div>
              <p className="card-kicker">{t('balance.available')}</p>
            </div>
          </div>
        </div>
        <p className="balance-amount">
          {money(result.amount)} <span>MMK</span>
        </p>
        <p className="balance-asof">
          {t('balance.asOf', {
            date: businessDate(data.openingBalance.referenceAt, data.openingBalance.timeZone),
          })}
        </p>
      </section>

      {result.unclassifiedOpeningDayIds.length ? (
        <div className="attention-card" role="status">
          <CircleAlert size={20} aria-hidden="true" />
          <p>
            {t('balance.reviewOpeningDay', {
              count: result.unclassifiedOpeningDayIds.length,
            })}
          </p>
          <Link to="/transactions">
            {t('transactions.nav')}
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : null}
      {unconfirmedCount > 0 ? (
        <div className="attention-card attention-card-amber" role="status">
          <CircleAlert size={20} aria-hidden="true" />
          <p>
            {t('balance.unconfirmedDisclosure', { count: unconfirmedCount })}
          </p>
          <Link to="/payments/schedule">
            {t('payments.nav')}
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : null}

      <section className="home-upcoming surface-card">
        <div className="section-heading-row home-upcoming-heading">
          <div>
            <h2>{t('dashboard.nextPayments')}</h2>
          </div>
          <Link className="text-link" to="/payments/schedule">
            {t('dashboard.allPayments')} <ArrowRight size={15} />
          </Link>
        </div>
        {upcomingItems.length ? (
          <ul className="upcoming-list">
            {upcomingItems.map((item) => {
              return (
                <li key={item.id}>
                  <span className="upcoming-date">{item.date}</span>
                  <span className="upcoming-category">
                    <span className="upcoming-category-icon">
                      <ActivityCategoryIcon categoryId={item.categoryId} />
                    </span>
                    <span className="upcoming-description">
                      {t(`category.${item.categoryId ?? 'uncategorized'}`)}
                    </span>
                  </span>
                  <strong>{money(item.amount)} <small>MMK</small></strong>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="home-upcoming-empty">{t('dashboard.noUpcoming')}</p>
        )}
      </section>

      <section className="summary-grid" aria-label={t('dashboard.outstanding')}>
        <Link to="/payments/owed-to-me" className="summary-card summary-card-tone-income surface-card">
          <div className="summary-card-icon summary-icon-positive">
            <ArrowDown size={19} />
          </div>
          <div className="summary-card-heading">
            <span>{t('owed.receivableTotal')}</span>
            <ArrowRight size={16} />
          </div>
          <p className="summary-amount">
            {money(outstanding.receivableTotal)} <small>MMK</small>
          </p>
        </Link>
        <Link to="/payments/i-owe" className="summary-card summary-card-tone-expense surface-card">
          <div className="summary-card-icon summary-icon-negative">
            <ArrowUp size={19} />
          </div>
          <div className="summary-card-heading">
            <span>{t('owed.payableTotal')}</span>
            <ArrowRight size={16} />
          </div>
          <p className="summary-amount">
            {money(outstanding.payableTotal)} <small>MMK</small>
          </p>
        </Link>
        <Link
          to="/insights"
          className={`summary-card surface-card${forecast.base.shortfall || forecast.lateInflows.shortfall ? ' summary-card-alert' : ''}`}
        >
          <div className="summary-card-icon summary-icon-forecast">
            <CalendarClock size={19} />
          </div>
          <div className="summary-card-heading">
            <span>{t('forecast.dailyTitle')}</span>
            <ArrowRight size={16} />
          </div>
          <p className="summary-amount">
            {money(forecast.lateInflows.minimumBalance)} <small>MMK</small>
          </p>
          <span className="summary-note">
            {forecast.lateInflows.shortfall
              ? t('forecast.shortfall', {
                  amount: money(forecast.lateInflows.shortfall),
                })
              : t('forecast.lowPoint')}
          </span>
        </Link>
      </section>

      {(forecast.base.shortfall > 0 || forecast.lateInflows.shortfall > 0) && (
        <Link className="forecast-warning" to="/insights">
          <span className="warning-icon">
            <CircleAlert size={20} />
          </span>
          <span className="warning-copy">
            <strong>
              {t('forecast.shortfall', {
                amount: money(
                  Math.max(
                    forecast.base.shortfall,
                    forecast.lateInflows.shortfall,
                  ),
                ),
              })}
            </strong>
            <small>{t('forecast.disclaimer')}</small>
          </span>
          <ArrowRight className="warning-arrow" size={18} />
        </Link>
      )}

      <section className="recent-card surface-card">
        <div className="section-heading-row">
          <div>
            <h2>{t('dashboard.recent')}</h2>
          </div>
          <Link className="text-link" to="/transactions">
            {t('transactions.open')}
            <ArrowRight size={16} />
          </Link>
        </div>
        {data.transactions.length ? (
          <ul className="transaction-list">
            {[...data.transactions]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((item) => (
                <li key={item.id}>
                  <span
                    className={`transaction-type-icon ${item.type === 'income' ? 'transaction-income' : 'transaction-expense'}`}
                  >
                    {item.type === 'income' ? (
                      <TrendingUp size={18} />
                    ) : (
                      <TrendingDown size={18} />
                    )}
                  </span>
                  <div className="transaction-description">
                    <p>
                      {item.description ||
                        t(`category.${item.categoryId ?? 'uncategorized'}`)}
                    </p>
                    <span>
                      {item.date} · {t(`transaction.${item.type}`)} ·{' '}
                      {t(`transaction.${item.cashStatus}`)}
                    </span>
                  </div>
                  <strong
                    className={
                      item.type === 'income' ? 'transaction-amount-income' : ''
                    }
                  >
                    {item.type === 'expense' ? '−' : '+'}
                    {money(item.amount)} <small>MMK</small>
                  </strong>
                </li>
              ))}
          </ul>
        ) : (
          <div className="empty-transactions">
            <span>
              <ReceiptText size={22} />
            </span>
            <p>{t('dashboard.empty')}</p>
            <Link
              className="pill-button pill-button-primary"
              to="/transactions/new"
            >
              <Plus size={17} />
              {t('transactions.add')}
            </Link>
          </div>
        )}
      </section>

      <section className="movement-details surface-card" aria-labelledby="cash-movement-heading">
        <div className="movement-heading">
          <span>
            <span className="summary-card-icon summary-icon-forecast">
              <TrendingUp size={19} />
            </span>
            <span>
              <strong id="cash-movement-heading">{t('dashboard.periodSummary')}</strong>
            </span>
          </span>
        </div>
        <div className="movement-content">
          <div className="movement-toolbar">
            <p>
              {range.startDate} – {range.endDate}
            </p>
            <label>
              {t('dashboard.reportingPeriod')}
              <select
                className="field-control"
                value={period}
                onChange={(event) =>
                  setPeriod(event.target.value as ReportingPeriod)
                }
              >
                <option value="this_month">{t('dashboard.thisMonth')}</option>
                <option value="last_month">{t('dashboard.lastMonth')}</option>
                <option value="last_30_days">
                  {t('dashboard.last30Days')}
                </option>
              </select>
            </label>
          </div>
          <div className="movement-metrics">
            <MetricCard
              label={t('dashboard.periodIncome')}
              value={summary.income}
            />
            <MetricCard
              label={t('dashboard.periodExpenses')}
              value={summary.expenses}
            />
            <MetricCard label={t('balance.netMovement')} value={summary.net} />
          </div>
          <p className="movement-note">
            {t('dashboard.settledOnly', { count: summary.transactionCount })}
          </p>
          <MovementChart key={period} values={monthlyMovement.slice(-4)} />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl bg-canvas p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">
        {money(value)} <span className="text-sm font-medium">MMK</span>
      </p>
    </article>
  );
}

function MovementChart({
  values,
}: {
  values: ReturnType<typeof summarizeMonthlyMovement>;
}) {
  const { t } = useTranslation();
  const max = Math.max(
    1,
    ...values.flatMap((item) => [item.income, item.expenses]),
  );
  const monthLabel = (month: string) =>
    new Intl.DateTimeFormat('en', { month: 'short' }).format(
      new Date(`${month}-01T12:00:00Z`),
    );
  return (
    <div className="movement-chart mt-4">
      <svg
        className="movement-chart-svg h-48 w-full"
        viewBox="0 0 600 190"
        role="img"
        aria-label={t('dashboard.monthlyChartAccessible')}
      >
        <line x1="20" y1="150" x2="580" y2="150" stroke="#cdddcf" />
        {values.map((item, index) => {
          const plotLeft = 90;
          const plotRight = 510;
          const center = values.length > 1
            ? plotLeft + (index / (values.length - 1)) * (plotRight - plotLeft)
            : 300;
          const incomeHeight = (item.income / max) * 118;
          const expenseHeight = (item.expenses / max) * 118;
          return (
            <g key={item.month}>
              <rect
                className="movement-chart-bar movement-chart-bar-income"
                x={center - 20}
                y={150 - incomeHeight}
                width="22"
                height={incomeHeight}
                rx="5"
                fill="#0866e8"
                style={{ animationDelay: `${index * 85}ms` }}
              />
              <rect
                className="movement-chart-bar movement-chart-bar-expense"
                x={center + 5}
                y={150 - expenseHeight}
                width="22"
                height={expenseHeight}
                rx="5"
                fill="#c77b35"
                style={{ animationDelay: `${index * 85 + 45}ms` }}
              />
              <text
                x={center + 3}
                y="174"
                textAnchor="middle"
                fill="#52635a"
                fontSize="12"
              >
                {monthLabel(item.month)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex gap-5 text-sm text-muted" aria-hidden="true">
        <span>
          <i className="mr-2 inline-block size-3 rounded-sm bg-accent" />
          {t('dashboard.periodIncome')}
        </span>
        <span>
          <i className="mr-2 inline-block size-3 rounded-sm bg-[#c77b35]" />
          {t('dashboard.periodExpenses')}
        </span>
      </div>
    </div>
  );
}

export function OpeningBalanceForm() {
  const { t } = useTranslation();
  const existing = useDemoStore((state) => state.data.openingBalance);
  const save = useDemoStore((state) => state.setOpeningBalance);
  const timeZone = useDemoStore((state) => state.timeZone);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [amount, setAmount] = useState(String(existing?.amount ?? ''));
  const [referenceAt, setReferenceAt] = useState(
    existing
      ? dateTimeInputInTimeZone(existing.referenceAt, timeZone)
      : businessNowInput(timeZone),
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (!/^\d+$/.test(amount) || Number(amount) > 1_000_000_000_000) {
      setError(t('form.amountError'));
      return;
    }
    let referenceInstant: string;
    try {
      referenceInstant = dateTimeInputToInstant(referenceAt, timeZone);
    } catch {
      setError(t('opening.invalidLocalTime'));
      return;
    }
    if (!referenceAt || referenceInstant > systemClock.now().toISOString()) {
      setError(t('opening.futureError'));
      return;
    }
    save({
      amount: Number(amount),
      referenceAt: referenceInstant,
      timeZone,
    });
    setSaved(true);
  }
  return (
    <form onSubmit={submit} className="opening-balance-form grid gap-4 sm:grid-cols-2">
      <label className="opening-field grid gap-2 text-sm font-medium">
        {t('opening.amount')}
        <input
          className="field-control min-h-12 rounded-xl border border-[#bccbc0] px-4"
          type="number"
          min="0"
          step="1"
          placeholder={t('opening.amountPlaceholder')}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </label>
      <label className="opening-field grid gap-2 text-sm font-medium">
        {t('opening.referenceAt')}
        <input
          className="field-control min-h-12 rounded-xl border border-[#bccbc0] px-4"
          type="datetime-local"
          aria-label={t('opening.referenceAt')}
          value={referenceAt}
          onChange={(e) => setReferenceAt(e.target.value)}
          required
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-800 sm:col-span-2">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-accent sm:col-span-2">
          {t('opening.saved')}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button className="min-h-12 rounded-xl bg-accent px-5 font-semibold text-white">
          {existing ? t('opening.update') : t('opening.save')}
        </button>
      </div>
    </form>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const timeZone = useDemoStore((state) => state.timeZone);
  const setTimeZone = useDemoStore((state) => state.setTimeZone);
  const intlWithZones = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[];
  };
  const availableTimeZones = [...new Set([
    timeZone,
    ...(intlWithZones.supportedValuesOf?.('timeZone') ?? []),
  ])];
  return (
    <>
      <header className="page-heading">
        <h1 tabIndex={-1}>{t('settings.title')}</h1>
      </header>
      <section className="surface-card settings-panel">
        <label className="grid max-w-xl gap-2 text-sm font-medium">
          {t('settings.timeZone')}
          <select
            className="field-control"
            value={timeZone}
            onChange={(event) => {
              setTimeZone(event.target.value);
              useDemoStore.getState().processDueSchedules();
            }}
          >
            {availableTimeZones.map((zone) => (
              <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>
            ))}
          </select>
        </label>
      </section>
    </>
  );
}

export function BudgetPage() {
  const { t } = useTranslation();
  const data = useDemoStore((state) => state.data);
  const timeZone = useDemoStore((state) => state.timeZone);
  const today = clockForTimeZone(timeZone).today();
  const setMonthlyBudget = useDemoStore((state) => state.setMonthlyBudget);
  const setCategoryBudget = useDemoStore((state) => state.setCategoryBudget);
  const expenseCategories = data.categories.filter((category) => category.type === 'expense' || category.type === 'both');
  const [editingMonthly, setEditingMonthly] = useState(false);
  const [monthlyAmount, setMonthlyAmount] = useState(data.monthlyBudget === null ? '' : String(data.monthlyBudget));
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryAmount, setCategoryAmount] = useState('');
  const [error, setError] = useState('');
  const monthlySpending = new Map<string, number>();
  let totalMonthlySpending = 0;
  for (const transaction of data.transactions) {
    if (transaction.type !== 'expense' || transaction.cashStatus !== 'settled' || transaction.date.slice(0, 7) !== today.slice(0, 7)) continue;
    totalMonthlySpending += transaction.amount;
    if (transaction.categoryId) monthlySpending.set(transaction.categoryId, (monthlySpending.get(transaction.categoryId) ?? 0) + transaction.amount);
  }
  const categoryBudgetMap = new Map(data.categoryBudgets.map((budget) => [budget.categoryId, budget.amount]));
  const totalCategoryLimits = data.categoryBudgets.reduce((total, budget) => total + budget.amount, 0);
  function saveMonthly(event: FormEvent) {
    event.preventDefault();
    if (monthlyAmount && (!/^\d+$/.test(monthlyAmount) || Number(monthlyAmount) > 1_000_000_000_000)) {
      setError(t('form.amountError'));
      return;
    }
    setError('');
    setMonthlyBudget(monthlyAmount ? Number(monthlyAmount) : null);
    setEditingMonthly(false);
  }
  function openCategoryEditor(categoryId: string) {
    setEditingCategory(categoryId);
    setCategoryAmount(categoryBudgetMap.has(categoryId) ? String(categoryBudgetMap.get(categoryId)) : '');
    setError('');
  }
  function saveCategory(event: FormEvent) {
    event.preventDefault();
    if (!editingCategory || !/^\d+$/.test(categoryAmount) || Number(categoryAmount) <= 0 || Number(categoryAmount) > 1_000_000_000_000) {
      setError(t('form.amountError'));
      return;
    }
    setCategoryBudget(editingCategory, Number(categoryAmount));
    setEditingCategory(null);
    setCategoryAmount('');
    setError('');
  }
  return (
    <div className="budget-page">
      <header className="page-heading"><h1 tabIndex={-1}>{t('budget.title')}</h1></header>
      <section className="budget-total-card surface-card">
        <span className="budget-total-icon"><WalletCards size={22} aria-hidden="true" /></span>
        <div className="budget-total-copy">
          <h2>{t('budget.monthlyTotal')}</h2>
          {editingMonthly ? (
            <form className="budget-inline-form" onSubmit={saveMonthly}>
              <label className="sr-only" htmlFor="monthly-budget-amount">{t('budget.monthlyTotal')}</label>
              <input id="monthly-budget-amount" type="number" min="0" step="1" inputMode="numeric" placeholder="0" value={monthlyAmount} onChange={(event) => setMonthlyAmount(event.target.value)} autoFocus />
              <span>MMK</span>
              <button type="submit" className="budget-save-button">{t('budget.save')}</button>
              <button type="button" className="budget-cancel-button" onClick={() => { setEditingMonthly(false); setMonthlyAmount(data.monthlyBudget === null ? '' : String(data.monthlyBudget)); setError(''); }}>{t('budget.cancel')}</button>
            </form>
          ) : (
            <p className="budget-total-amount">{data.monthlyBudget === null ? t('budget.notSet') : `${money(data.monthlyBudget)} MMK`}</p>
          )}
          <p className="budget-total-note">{t('budget.totalCategoryLimits', { amount: money(totalCategoryLimits), spent: money(totalMonthlySpending) })}</p>
        </div>
        {!editingMonthly ? <button type="button" className="budget-edit-button" onClick={() => { setMonthlyAmount(data.monthlyBudget === null ? '' : String(data.monthlyBudget)); setEditingMonthly(true); }}>{t(data.monthlyBudget === null ? 'budget.setLimit' : 'form.edit')}</button> : null}
      </section>
      {error ? <p className="budget-error" role="alert">{error}</p> : null}
      <section className="budget-category-section">
        <div className="budget-section-heading"><h2>{t('budget.categoryLimits')}</h2><p>{t('budget.categoryHelp')}</p></div>
        <ul className="budget-category-list">
          {expenseCategories.map((category) => {
            const limit = categoryBudgetMap.get(category.id);
            const spent = monthlySpending.get(category.id) ?? 0;
            const progress = limit ? Math.min(100, Math.round(spent / limit * 100)) : 0;
            const categoryLabel = t(`category.${category.id}`);
            return (
              <li className="budget-category-card" key={category.id}>
                {limit && editingCategory !== category.id ? <button type="button" className="budget-remove-button" aria-label={t('budget.remove', { category: categoryLabel })} onClick={() => setCategoryBudget(category.id, null)}><CircleMinus size={19} aria-hidden="true" /></button> : null}
                <span className="budget-category-icon"><WalletCards size={19} aria-hidden="true" /></span>
                <div className="budget-category-main">
                  <strong>{categoryLabel}</strong>
                  {editingCategory === category.id ? (
                    <form className="budget-inline-form budget-category-form" onSubmit={saveCategory}>
                      <label className="sr-only" htmlFor={`budget-${category.id}`}>{t('budget.limitFor', { category: categoryLabel })}</label>
                      <input id={`budget-${category.id}`} type="number" min="1" step="1" inputMode="numeric" placeholder="0" value={categoryAmount} onChange={(event) => setCategoryAmount(event.target.value)} autoFocus />
                      <span>MMK / {t('budget.month')}</span>
                      <button type="submit" className="budget-save-button">{t('budget.save')}</button>
                      <button type="button" className="budget-cancel-button" onClick={() => { setEditingCategory(null); setError(''); }}>{t('budget.cancel')}</button>
                    </form>
                  ) : limit ? (
                    <>
                      <span className="budget-spending">{t('budget.spentOf', { spent: money(spent), limit: money(limit) })} MMK</span>
                      <span className={`budget-progress-track${spent > limit ? ' budget-progress-over' : ''}`} role="progressbar" aria-label={t('budget.progressLabel', { category: categoryLabel })} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(spent, limit)}><span style={{ width: `${progress}%` }} /></span>
                    </>
                  ) : <span className="budget-unset-label">{t('budget.notSet')}</span>}
                </div>
                {editingCategory !== category.id ? (
                  <div className="budget-row-actions">
                    <button type="button" className="budget-edit-button" onClick={() => openCategoryEditor(category.id)}>{t(limit ? 'form.edit' : 'budget.setLimit')}</button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export function SchedulesPage() {
  const { t } = useTranslation();
  const data = useDemoStore((state) => state.data);
  const timeZone = useDemoStore((state) => state.timeZone);
  const today = clockForTimeZone(timeZone).today();
  const createSchedule = useDemoStore((state) => state.createScheduleRule);
  const cancelSchedule = useDemoStore((state) => state.cancelScheduleRule);
  const confirmPayment = useDemoStore((state) => state.confirmOccurrencePayment);
  const markUnpaid = useDemoStore((state) => state.markOccurrenceUnpaid);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [repeat, setRepeat] = useState<'one_time' | 'monthly'>('one_time');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(today);
  const [dayOfMonth, setDayOfMonth] = useState(
    String(Number(today.slice(-2))),
  );
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const categories = data.categories.filter(
    (category) => category.type === type || category.type === 'both',
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (
      !/^\d+$/.test(amount) ||
      Number(amount) <= 0 ||
      Number(amount) > 1_000_000_000_000
    ) {
      setError(t('form.amountError'));
      return;
    }
    const now = systemClock.now().toISOString();
    try {
      createSchedule({
        id: uid(),
        type,
        amount: Number(amount),
        categoryId: categoryId || null,
        description: description.trim() || undefined,
        counterpartyId: null,
        schedule:
          repeat === 'one_time'
            ? { kind: 'one_time', dueDate }
            : {
                kind: 'monthly',
                startDate: dueDate,
                dayOfMonth: Number(dayOfMonth),
                ...(endDate ? { endDate } : {}),
              },
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      setAmount('');
      setDescription('');
      setCategoryId('');
      setDueDate(today);
      setDayOfMonth(String(Number(today.slice(-2))));
      setEndDate('');
      setShowScheduleForm(false);
    } catch {
      setError(t('schedules.saveError'));
    }
  }
  const rules = data.scheduleRules;
  const rows = rules.reduce<
    Array<{
      rule: (typeof rules)[number];
      occurrence: (typeof data.paymentOccurrences)[number] | null;
    }>
  >((all, rule) => {
    const occurrences = data.paymentOccurrences
      .filter((item) => item.ruleId === rule.id)
      .sort((a, b) => a.originalDueDate.localeCompare(b.originalDueDate));
    all.push(
      ...(occurrences.length
        ? occurrences.map((occurrence) => ({ rule, occurrence }))
        : [{ rule, occurrence: null }]),
    );
    return all;
  }, []).sort((a, b) => {
    const dueDateA = a.occurrence?.originalDueDate ??
      (a.rule.schedule.kind === 'one_time'
        ? a.rule.schedule.dueDate
        : a.rule.schedule.startDate);
    const dueDateB = b.occurrence?.originalDueDate ??
      (b.rule.schedule.kind === 'one_time'
        ? b.rule.schedule.dueDate
        : b.rule.schedule.startDate);
    return dueDateA.localeCompare(dueDateB);
  });
  return (
    <div className="payments-schedule-page">
      <header className="page-heading">
        <h1 tabIndex={-1}>{t('payments.title')}</h1>
        <nav className="section-tabs" aria-label={t('payments.nav')}>
          <Link className="section-tab section-tab-active" aria-current="page" to="/payments/schedule">{t('payments.schedule')}</Link>
          <Link className="section-tab" to="/payments/owed-to-me">{t('payments.owedToMe')}</Link>
          <Link className="section-tab" to="/payments/i-owe">{t('payments.iOwe')}</Link>
        </nav>
      </header>
      <div className="section-toolbar">
        <div>
          <h2>{t('schedules.list')}</h2>
          <p>{t('schedules.scope')}</p>
        </div>
        <button className="action-button" type="button" aria-expanded={showScheduleForm} aria-controls="schedule-form-panel" onClick={() => setShowScheduleForm(!showScheduleForm)}>
          <Plus size={18} aria-hidden="true" />{t('schedules.add')}
        </button>
      </div>
      <section id="schedule-form-panel" className={`schedule-form-panel surface-card${showScheduleForm ? ' schedule-form-panel-open' : ''}`} hidden={!showScheduleForm}>
        <h2 className="text-xl font-semibold">{t('schedules.add')}</h2>
        <p className="mt-1 text-sm text-muted">{t('schedules.addHelp')}</p>
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium">
            {t('schedules.repeat')}
            <select
              className="min-h-12 rounded-xl border border-[#bccbc0] px-3"
              value={repeat}
              onChange={(event) =>
                setRepeat(event.target.value as 'one_time' | 'monthly')
              }
            >
              <option value="one_time">{t('schedules.oneTime')}</option>
              <option value="monthly">{t('schedules.monthly')}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            {t('transaction.type')}
            <select
              className="min-h-12 rounded-xl border border-[#bccbc0] px-3"
              value={type}
              onChange={(event) => {
                setType(event.target.value as 'income' | 'expense');
                setCategoryId('');
              }}
            >
              <option value="expense">{t('transaction.expense')}</option>
              <option value="income">{t('transaction.income')}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            {t('transaction.amount')}
            <input
              className="min-h-12 rounded-xl border border-[#bccbc0] px-4"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            {repeat === 'one_time'
              ? t('transaction.dueDate')
              : t('schedules.startDate')}
            <input
              className="min-h-12 rounded-xl border border-[#bccbc0] px-4"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              required
            />
          </label>
          {repeat === 'monthly' ? (
            <>
              <label className="grid gap-2 text-sm font-medium">
                {t('schedules.dayOfMonth')}
                <input
                  aria-label={t('schedules.dayOfMonth')}
                  className="min-h-12 rounded-xl border border-[#bccbc0] px-4"
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(event) => setDayOfMonth(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                {t('schedules.endDate')}
                <input
                  className="min-h-12 rounded-xl border border-[#bccbc0] px-4"
                  type="date"
                  min={dueDate}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>
            </>
          ) : null}
          <label className="grid gap-2 text-sm font-medium">
            {t('transaction.category')}
            <select
              className="min-h-12 rounded-xl border border-[#bccbc0] px-3"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">{t('transaction.uncategorized')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {t(`category.${category.id}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium sm:col-span-2">
            {t('transaction.description')}
            <input
              className="min-h-12 rounded-xl border border-[#bccbc0] px-4"
              maxLength={200}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          {error ? (
            <p className="text-sm text-red-800 sm:col-span-2" role="alert">
              {error}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <button className="min-h-12 rounded-xl bg-accent px-5 font-semibold text-white">
              {t('schedules.save')}
            </button>
          </div>
        </form>
      </section>
      <section className="surface-card schedule-list-panel" aria-label={t('schedules.list')}>
        {rows.length ? (
          <ul className="mt-4 divide-y divide-[#e4e9e2]">
            {rows.map(({ rule, occurrence }) => {
              const due =
                occurrence?.originalDueDate ??
                (rule.schedule.kind === 'one_time'
                  ? rule.schedule.dueDate
                  : rule.schedule.startDate);
              const firstScheduledDate = data.paymentOccurrences
                .filter(
                  (item) =>
                    item.ruleId === rule.id && item.status === 'scheduled',
                )
                .map((item) => item.originalDueDate)
                .sort()[0];
              const canCancel =
                rule.active &&
                occurrence?.status === 'scheduled' &&
                (rule.schedule.kind === 'one_time' ||
                  occurrence.originalDueDate === firstScheduledDate);
              const statusKey = occurrence?.status ?? (rule.active ? 'scheduled' : 'canceled');
              return (
                <li
                  key={occurrence?.id ?? rule.id}
                  className="schedule-row-item flex flex-wrap items-center justify-between gap-4 py-5"
                >
                  <div className="schedule-row-main">
                    <div className="schedule-category-heading">
                      <span className="schedule-category-icon">
                        <ActivityCategoryIcon categoryId={rule.categoryId} />
                      </span>
                      <p className="schedule-category-name">
                        {t(`category.${rule.categoryId ?? 'uncategorized'}`)}
                      </p>
                    </div>
                    {rule.description && rule.description !== t(`category.${rule.categoryId ?? 'uncategorized'}`) ? (
                      <p className="schedule-row-description">{rule.description}</p>
                    ) : null}
                    <div className="schedule-row-meta">
                      <span>
                        {due}
                        {rule.schedule.kind === 'monthly' ? ` · ${t('schedules.monthly')}` : ''}
                      </span>
                      {statusKey === 'scheduled' || statusKey === 'assumed_unconfirmed' ? (
                        <ActivityStatusIcon status="pending" label={t(`scheduleStatus.${statusKey}`)} />
                      ) : statusKey === 'confirmed_paid' ? (
                        <ActivityStatusIcon status="settled" label={t(`scheduleStatus.${statusKey}`)} />
                      ) : (
                        <span className="schedule-row-status-text">
                          {t(`scheduleStatus.${statusKey}`)}
                        </span>
                      )}
                    </div>
                    {occurrence && occurrence.status !== 'scheduled' ? (
                      <p className="text-sm text-muted">
                        {t('schedules.paymentDate')}: {occurrence.paymentDate}
                      </p>
                    ) : null}
                  </div>
                  <div className="schedule-row-actions">
                    <strong className={`schedule-row-amount schedule-row-amount-${rule.type}`}>
                      {rule.type === 'income' ? '+' : '−'}{money(rule.amount)} MMK
                    </strong>
                    {occurrence?.status === 'assumed_unconfirmed' ? (
                      <button
                        className="min-h-11 rounded-lg border px-3 text-sm font-medium"
                        onClick={() => confirmPayment(occurrence.id)}
                      >
                        {t('schedules.confirm')}
                      </button>
                    ) : null}
                    {occurrence && occurrence.status !== 'scheduled' ? (
                      <Link
                        className="min-h-11 rounded-lg border px-3 py-2 text-sm font-medium"
                        to={`/transactions?edit=${encodeURIComponent(occurrence.paymentTransactionId)}`}
                      >
                        {t('schedules.correct')}
                      </Link>
                    ) : null}
                    {occurrence &&
                    (occurrence.status === 'assumed_unconfirmed' ||
                      occurrence.status === 'confirmed_paid') ? (
                      <button
                        className="min-h-11 rounded-lg border px-3 text-sm font-medium"
                        onClick={() => {
                          if (window.confirm(t('schedules.confirmUnpaid')))
                            markUnpaid(occurrence.id);
                        }}
                      >
                        {t('schedules.markUnpaid')}
                      </button>
                    ) : null}
                    {canCancel ? (
                      <button
                        className="schedule-cancel-button"
                        onClick={() => {
                          if (window.confirm(t('schedules.confirmCancel')))
                            cancelSchedule(rule.id);
                        }}
                      >
                        {t('schedules.cancel')}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-muted">{t('schedules.empty')}</p>
        )}
      </section>
    </div>
  );
}

export function TransactionsPage() {
  const { t } = useTranslation();
  const data = useDemoStore((state) => state.data);
  const timeZone = useDemoStore((state) => state.timeZone);
  const today = clockForTimeZone(timeZone).today();
  const save = useDemoStore((state) => state.saveTransaction);
  const remove = useDemoStore((state) => state.deleteTransaction);
  const restore = useDemoStore((state) => state.restoreTransaction);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | 'custom'>('all');
  const [filterMonth, setFilterMonth] = useState(today.slice(0, 7));
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [error, setError] = useState('');
  const [undo, setUndo] = useState<Transaction | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isComposer = location.pathname === '/transactions/new';
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const amountLength = amount.replace(/\D/g, '').length;
  const [date, setDate] = useState(today);
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cashStatus, setCashStatus] = useState<'settled' | 'pending'>(
    'settled',
  );
  const [openingDayDisposition, setOpeningDayDisposition] = useState('');
  const [confirmationStatus, setConfirmationStatus] = useState<
    'not_applicable' | 'unconfirmed' | 'confirmed'
  >('not_applicable');
  const openingDay = data.openingBalance
    ? businessDate(data.openingBalance.referenceAt, data.openingBalance.timeZone)
    : '';
  const showOpeningChoice = Boolean(
    data.openingBalance && date === openingDay && cashStatus === 'settled' && !editing?.occurredAt,
  );
  const categories = data.categories.filter(
    (category) => category.type === type || category.type === 'both',
  );
  useEffect(() => {
    if (location.hash === '#transaction-form') {
      navigate('/transactions/new', { replace: true });
    }
  }, [location.hash, navigate]);
  const filtered = data.transactions
    .filter(
      (item) =>
        (filter === 'all' ||
          item.type === filter ||
          item.cashStatus === filter) &&
        (dateFilter === 'all' ||
          (dateFilter === 'month' && item.date.slice(0, 7) === filterMonth) ||
          (dateFilter === 'custom' && (!rangeStart || item.date >= rangeStart) && (!rangeEnd || item.date <= rangeEnd))),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  function reset() {
    setEditing(null);
    setType('expense');
    setAmount('');
    setDate(today);
    setDueDate('');
    setDescription('');
    setCategoryId('');
    setCashStatus('settled');
    setOpeningDayDisposition('');
    setConfirmationStatus('not_applicable');
    setError('');
    navigate('/transactions');
  }
  const loadEdit = useCallback(
    (item: Transaction) => {
      setEditing(item);
      setType(item.type);
      setAmount(String(item.amount));
      setDate(item.date);
      setDueDate(
        item.paymentOccurrenceId
          ? (data.paymentOccurrences.find(
              (occurrence) => occurrence.id === item.paymentOccurrenceId,
            )?.originalDueDate ??
              item.dueDate ??
              '')
          : (item.dueDate ?? ''),
      );
      setDescription(item.description ?? '');
      setCategoryId(item.categoryId ?? '');
      setCashStatus(item.cashStatus);
      setOpeningDayDisposition(item.openingDayDisposition ?? '');
      setConfirmationStatus(item.confirmationStatus);
      setError('');
    },
    [data.paymentOccurrences],
  );
  const edit = useCallback((item: Transaction) => {
    navigate(`/transactions/new?edit=${encodeURIComponent(item.id)}`);
  }, [navigate]);
  useEffect(() => {
    const id = searchParams.get('edit');
    if (!id) return undefined;
    const item = id
      ? data.transactions.find((transaction) => transaction.id === id)
      : undefined;
    if (!item) return undefined;
    if (!isComposer) {
      navigate(`/transactions/new?edit=${encodeURIComponent(id)}`, { replace: true });
      return undefined;
    }
    loadEdit(item);
    setSearchParams({}, { replace: true });
    return undefined;
  }, [data.transactions, isComposer, loadEdit, navigate, searchParams, setSearchParams]);
  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!data.openingBalance && !editing?.paymentOccurrenceId) {
      setError(t('transactions.openingRequired'));
      return;
    }
    if (
      !/^\d+$/.test(amount) ||
      Number(amount) <= 0 ||
      Number(amount) > 1_000_000_000_000
    ) {
      setError(t('form.amountError'));
      return;
    }
    if (cashStatus === 'settled' && date > today) {
      setError(t('transactions.futureSettled'));
      return;
    }
    if (cashStatus === 'pending' && (!dueDate || dueDate < date)) {
      setError(t('transactions.dueDateError'));
      return;
    }
    if (showOpeningChoice && !openingDayDisposition) {
      setError(t('transactions.openingDayError'));
      return;
    }
    const timestamp = systemClock.now().toISOString();
    save({
      id: editing?.id ?? uid(),
      type,
      amount: Number(amount),
      currency: 'MMK',
      date,
      ...(cashStatus === 'pending' || editing?.paymentOccurrenceId
        ? { dueDate: dueDate || editing?.dueDate || date }
        : {}),
      ...(openingDayDisposition
        ? {
            openingDayDisposition: openingDayDisposition as
              'already_in_opening' | 'after_reference',
          }
        : {}),
      categoryId: categoryId || null,
      description: description.trim() || undefined,
      counterpartyId: editing?.counterpartyId ?? null,
      cashStatus,
      confirmationStatus:
        cashStatus === 'pending'
          ? 'not_applicable'
          : editing?.paymentOccurrenceId &&
              confirmationStatus === 'not_applicable'
            ? 'unconfirmed'
            : confirmationStatus,
      source: editing?.source ?? 'manual',
      ocrReviewStatus: editing?.ocrReviewStatus ?? 'not_applicable',
      ...(editing?.paymentOccurrenceId
        ? { paymentOccurrenceId: editing.paymentOccurrenceId }
        : {}),
      createdAt: editing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
    reset();
  }
  if (isComposer) {
    return (
      <section className="transaction-composer-page">
        <header className="transaction-composer-header">
          <button type="button" className="composer-close" aria-label={t('form.cancel')} onClick={reset}>
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <h1 tabIndex={-1}>{editing ? t('transactions.edit') : t('transactions.add')}</h1>
        </header>
        {editing?.paymentOccurrenceId ? <p className="linked-edit-help">{t('transactions.linkedEditHelp')}</p> : null}
        {!data.openingBalance && !editing?.paymentOccurrenceId ? (
          <div className="composer-opening-required" role="alert">
            <span>{t('transactions.openingRequired')}</span>
            <Link to="/">{t('dashboard.nav')}</Link>
          </div>
        ) : null}
        <form className="transaction-composer" onSubmit={submit}>
          <div className="transaction-type-toggle" role="group" aria-label={t('transaction.type')}>
            <button
              type="button"
              className={`transaction-type-option${type === 'income' ? ' is-selected is-income' : ''}`}
              aria-pressed={type === 'income'}
              onClick={() => { setType('income'); setCategoryId(''); }}
            >
              <ArrowDown size={19} aria-hidden="true" />{t('transaction.income')}
            </button>
            <button
              type="button"
              className={`transaction-type-option${type === 'expense' ? ' is-selected is-expense' : ''}`}
              aria-pressed={type === 'expense'}
              onClick={() => { setType('expense'); setCategoryId(''); }}
            >
              <ArrowUp size={19} aria-hidden="true" />{t('transaction.expense')}
            </button>
          </div>

          <label className={`composer-amount-field${type === 'income' ? ' amount-income' : ' amount-expense'}${amountLength > 8 ? ' composer-amount-extra-long' : amountLength > 5 ? ' composer-amount-long' : ''}`}>
            <span className="sr-only">{t('transaction.amount')}</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              required
            />
            <span className="composer-currency">MMK</span>
          </label>

          <div className={`composer-primary-fields${cashStatus === 'pending' ? ' composer-fields-pending' : ''}`}>
            <label className="composer-field">
              <span><CalendarDays size={16} aria-hidden="true" />{t('transaction.date')}</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            {cashStatus === 'pending' ? (
              <label className="composer-field composer-due-date">
                <span><CalendarClock size={16} aria-hidden="true" />{t('transaction.dueDate')}</span>
                <input type="date" min={date} value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </label>
            ) : null}
            <fieldset className="composer-field composer-status-field">
              <legend>{t('transaction.status')}</legend>
              <div className="composer-status-toggle">
                <button type="button" aria-pressed={cashStatus === 'settled'} className={cashStatus === 'settled' ? 'is-selected' : ''} onClick={() => setCashStatus('settled')}>
                  {t('transaction.settled')}
                </button>
                <button type="button" aria-pressed={cashStatus === 'pending'} className={cashStatus === 'pending' ? 'is-selected' : ''} onClick={() => setCashStatus('pending')}>
                  {t('transaction.pending')}
                </button>
              </div>
            </fieldset>
          </div>

          {editing?.paymentOccurrenceId && cashStatus === 'settled' ? (
            <label className="composer-field composer-confirmation">
              <span>{t('transaction.confirmation')}</span>
              <select
                value={confirmationStatus === 'not_applicable' ? 'unconfirmed' : confirmationStatus}
                onChange={(e) => setConfirmationStatus(e.target.value as 'unconfirmed' | 'confirmed')}
              >
                <option value="unconfirmed">{t('transaction.unconfirmed')}</option>
                <option value="confirmed">{t('transaction.confirmed')}</option>
              </select>
            </label>
          ) : null}

          {showOpeningChoice ? (
            <fieldset className="opening-day-choice">
              <legend className="sr-only">{t('transactions.openingDayPrompt')}</legend>
              <p className="opening-day-question">{t('transactions.openingDayPrompt')}</p>
              <label>
                <input type="radio" name="opening-day" value="already_in_opening" checked={openingDayDisposition === 'already_in_opening'} onChange={(e) => setOpeningDayDisposition(e.target.value)} />
                {t('transactions.alreadyIncluded')}
              </label>
              <label>
                <input type="radio" name="opening-day" value="after_reference" checked={openingDayDisposition === 'after_reference'} onChange={(e) => setOpeningDayDisposition(e.target.value)} />
                {t('transactions.afterReference')}
              </label>
            </fieldset>
          ) : null}

          <fieldset className="composer-category-section">
            <legend>{t('transaction.category')}</legend>
            <div className="composer-category-list">
              <button type="button" aria-pressed={!categoryId} className={!categoryId ? 'is-selected' : ''} onClick={() => setCategoryId('')}>
                {t('transaction.uncategorized')}
              </button>
              {categories.map((item) => (
                <button key={item.id} type="button" aria-pressed={categoryId === item.id} className={categoryId === item.id ? 'is-selected' : ''} onClick={() => setCategoryId(item.id)}>
                  {t(`category.${item.id}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="composer-note-field">
            <span className="sr-only">{t('transaction.description')}</span>
            <input maxLength={200} placeholder={t('transaction.addNote')} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <CategorySuggestion description={description} type={type} categories={categories} selectedCategoryId={categoryId} onApply={setCategoryId} />

          {error ? <p role="alert" className="composer-error">{error}</p> : null}
          <div className="composer-footer">
            <button disabled={!data.openingBalance && !editing?.paymentOccurrenceId} className="composer-submit">
              {editing ? t('transactions.saveCorrection') : t('transactions.save')}
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <>
      <header className="page-heading">
        <h1 tabIndex={-1}>{t('transactions.title')}</h1>
      </header>
      {!data.openingBalance ? (
        <p className="mb-5 rounded-xl bg-amber-50 p-4 text-amber-950">
          {t('transactions.openingRequired')}{' '}
          <Link className="font-semibold underline" to="/">{t('dashboard.nav')}</Link>
        </p>
      ) : null}
      <section className="surface-card activity-list-panel">
        <div className="activity-filter-bar" role="group" aria-label={t('transactions.filter')}>
          <label className="activity-period-filter">
            <CalendarDays size={17} aria-hidden="true" />
            <span className="sr-only">{t('transactions.dateRange')}</span>
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as 'all' | 'month' | 'custom')}>
              <option value="all">{t('transactions.allDates')}</option>
              <option value="month">{t('transactions.specificMonth')}</option>
              <option value="custom">{t('transactions.customRange')}</option>
            </select>
          </label>
          {dateFilter === 'month' ? <label className="activity-date-input"><span className="sr-only">{t('transactions.specificMonth')}</span><input type="month" value={filterMonth} onChange={(event) => setFilterMonth(event.target.value)} /></label> : null}
          {dateFilter === 'custom' ? (
            <div className="activity-custom-range">
              <label><span className="sr-only">{t('transactions.fromDate')}</span><input type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} /></label>
              <span aria-hidden="true">–</span>
              <label><span className="sr-only">{t('transactions.toDate')}</span><input type="date" min={rangeStart || undefined} value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} /></label>
            </div>
          ) : null}
          <label className="activity-type-filter">
            <span className="sr-only">{t('transactions.filter')}</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">{t('transactions.all')}</option>
              <option value="income">{t('transaction.income')}</option>
              <option value="expense">{t('transaction.expense')}</option>
              <option value="pending">{t('transaction.pending')}</option>
            </select>
          </label>
        </div>
        {undo ? (
          <div
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#edf3ec] p-4"
            role="status"
          >
            <span>{t('transactions.deleted')}</span>
            <button
              className="font-semibold underline"
              onClick={() => {
                restore(undo);
                setUndo(null);
              }}
            >
              {t('transactions.undo')}
            </button>
          </div>
        ) : null}
        {filtered.length ? (
          <ul className="activity-record-list">
            {filtered.map((item) => (
              <li key={item.id} className="activity-record-item">
                <span className="activity-category-icon" aria-hidden="true">
                  <ActivityCategoryIcon categoryId={item.categoryId} />
                </span>
                <div className="activity-record-copy">
                  <p className="activity-category-name">
                    {t(`category.${item.categoryId ?? 'uncategorized'}`)}
                  </p>
                  <div className="activity-record-meta">
                    <time dateTime={item.date}>{item.date}</time>
                    <ActivityStatusIcon
                      status={item.cashStatus}
                      label={t(`transaction.${item.cashStatus}`)}
                    />
                    {item.dueDate ? (
                      <span className="activity-record-due">
                        {t('transaction.dueDate')}: {item.dueDate}
                      </span>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="activity-record-description">{item.description}</p>
                  ) : null}
                </div>
                <div className="activity-record-actions">
                  <strong className={`activity-record-amount activity-record-amount-${item.type}`}>
                    {item.type === 'income' ? '+' : '−'}{money(item.amount)} <small>MMK</small>
                  </strong>
                  <button
                    className="activity-edit-button"
                    onClick={() => edit(item)}
                  >
                    {t('form.edit')}
                  </button>
                  <button
                    className="activity-delete-button"
                    onClick={() => {
                      if (window.confirm(t('transactions.confirmDelete'))) {
                        try {
                          setUndo(remove(item.id));
                        } catch {
                          setError(t('transactions.linkedDeleteError'));
                        }
                      }
                    }}
                  >
                    {t('form.delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-muted">{t('transactions.empty')}</p>
        )}
      </section>
    </>
  );
}
