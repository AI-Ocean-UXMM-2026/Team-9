import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { calculateRecordedAvailableBalance } from '../domain/availableBalance';
import { BUSINESS_TIME_ZONE, type Transaction } from '../domain/types';
import { systemClock } from '../services/clock';
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
function businessNowInput() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
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
function rangoonInstant(value: string) {
  return new Date(`${value}:00+06:30`).toISOString();
}
function businessDate(instant: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant));
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`;
}

export function DashboardPage() {
  const { t } = useTranslation();
  const data = useDemoStore((state) => state.data);
  const result = useMemo(
    () =>
      calculateRecordedAvailableBalance(data.openingBalance, data.transactions),
    [data],
  );
  const settledIncome = data.transactions
    .filter((item) => item.cashStatus === 'settled' && item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0);
  const settledExpense = data.transactions
    .filter((item) => item.cashStatus === 'settled' && item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);
  return (
    <>
      <section className="mb-8 max-w-3xl">
        <p className="mb-3 text-xs font-bold tracking-[.18em] text-accent">
          {t('prototype')}
        </p>
        <h1
          tabIndex={-1}
          className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl"
        >
          {t('dashboard.title')}
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
          {t('dashboard.description')}
        </p>
      </section>
      {!data.openingBalance ? (
        <section className="mb-6 rounded-3xl border border-[#cdddcf] bg-white p-6 sm:p-8">
          <h2 className="text-xl font-semibold">{t('opening.title')}</h2>
          <p className="mt-2 max-w-2xl text-muted">{t('opening.intro')}</p>
          <div className="mt-5">
            <OpeningBalanceForm />
          </div>
        </section>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-3xl bg-ink p-6 text-white sm:p-8">
              <p className="text-sm text-white/75">{t('balance.available')}</p>
              <p className="mt-3 text-3xl font-semibold">
                {money(result.amount)}{' '}
                <span className="text-base font-medium">MMK</span>
              </p>
              <p className="mt-3 text-sm text-white/75">
                {t('balance.asOf', {
                  date: businessDate(data.openingBalance.referenceAt),
                })}
              </p>
            </article>
            <article className="rounded-3xl border border-[#dce4dc] bg-white p-6 sm:p-8">
              <p className="text-sm text-muted">{t('balance.netMovement')}</p>
              <p className="mt-3 text-3xl font-semibold">
                {money(settledIncome - settledExpense)}{' '}
                <span className="text-base font-medium">MMK</span>
              </p>
              <p className="mt-3 text-sm text-muted">{t('balance.allTime')}</p>
            </article>
          </div>
          {result.unclassifiedOpeningDayIds.length ? (
            <p
              className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950"
              role="status"
            >
              {t('balance.reviewOpeningDay', {
                count: result.unclassifiedOpeningDayIds.length,
              })}{' '}
              <Link className="font-semibold underline" to="/transactions">
                {t('transactions.nav')}
              </Link>
            </p>
          ) : null}
          <section className="mt-7 rounded-3xl border border-[#dce4dc] bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {t('dashboard.recent')}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {t('dashboard.recentHelp')}
                </p>
              </div>
              <Link
                className="rounded-xl bg-accent px-4 py-3 font-semibold text-white"
                to="/transactions"
              >
                {t('transactions.open')}
              </Link>
            </div>
            {data.transactions.length ? (
              <ul className="mt-5 divide-y divide-[#e4e9e2]">
                {[...data.transactions]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 5)
                  .map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between gap-3 py-4"
                    >
                      <div>
                        <p className="font-medium">
                          {item.description ||
                            t(`category.${item.categoryId ?? 'uncategorized'}`)}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {item.date} · {t(`transaction.${item.type}`)} ·{' '}
                          {t(`transaction.${item.cashStatus}`)}
                        </p>
                      </div>
                      <strong
                        className={item.type === 'income' ? 'text-accent' : ''}
                      >
                        {item.type === 'expense' ? '−' : '+'}
                        {money(item.amount)} MMK
                      </strong>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-5 text-muted">{t('dashboard.empty')}</p>
            )}
          </section>
        </>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          className="rounded-2xl border border-[#dce4dc] bg-[#eef2e9] p-5 font-semibold"
          to="/transactions"
        >
          {t('transactions.nav')} →
        </Link>
        <Link
          className="rounded-2xl border border-[#dce4dc] bg-[#eef2e9] p-5 font-semibold"
          to="/settings"
        >
          {t('settings.nav')} →
        </Link>
      </div>
    </>
  );
}

export function OpeningBalanceForm() {
  const { t } = useTranslation();
  const existing = useDemoStore((state) => state.data.openingBalance);
  const save = useDemoStore((state) => state.setOpeningBalance);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [amount, setAmount] = useState(String(existing?.amount ?? ''));
  const [referenceAt, setReferenceAt] = useState(
    existing
      ? `${businessDate(existing.referenceAt)}T${new Intl.DateTimeFormat('en-GB', { timeZone: BUSINESS_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(existing.referenceAt))}`
      : businessNowInput(),
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (!/^\d+$/.test(amount) || Number(amount) > 1_000_000_000_000) {
      setError(t('form.amountError'));
      return;
    }
    if (
      !referenceAt ||
      new Date(rangoonInstant(referenceAt)) > systemClock.now()
    ) {
      setError(t('opening.futureError'));
      return;
    }
    save({
      amount: Number(amount),
      referenceAt: rangoonInstant(referenceAt),
      timeZone: BUSINESS_TIME_ZONE,
    });
    setSaved(true);
  }
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium">
        {t('opening.amount')}
        <input
          className="min-h-12 rounded-xl border border-[#bccbc0] px-4"
          type="number"
          min="0"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        {t('opening.referenceAt')}
        <input
          className="min-h-12 rounded-xl border border-[#bccbc0] px-4"
          type="datetime-local"
          value={referenceAt}
          onChange={(e) => setReferenceAt(e.target.value)}
          required
        />
        <span className="font-normal text-muted">{t('opening.timezone')}</span>
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
  return (
    <>
      <section className="mb-8">
        <p className="mb-3 text-xs font-bold tracking-[.18em] text-accent">
          {t('prototype')}
        </p>
        <h1 tabIndex={-1} className="text-3xl font-semibold sm:text-5xl">
          {t('settings.title')}
        </h1>
        <p className="mt-4 text-lg text-muted">{t('settings.description')}</p>
      </section>
      <section className="rounded-3xl border border-[#dce4dc] bg-white p-6 sm:p-8">
        <h2 className="mb-2 text-xl font-semibold">{t('opening.title')}</h2>
        <p className="mb-5 text-sm text-muted">{t('opening.intro')}</p>
        <OpeningBalanceForm />
      </section>
      <p className="mt-5 text-sm text-muted">{t('settings.carryForward')}</p>
    </>
  );
}

export function TransactionsPage() {
  const { t } = useTranslation();
  const data = useDemoStore((state) => state.data);
  const save = useDemoStore((state) => state.saveTransaction);
  const remove = useDemoStore((state) => state.deleteTransaction);
  const restore = useDemoStore((state) => state.restoreTransaction);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [undo, setUndo] = useState<Transaction | null>(null);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(systemClock.today());
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
    ? businessDate(data.openingBalance.referenceAt)
    : '';
  const showOpeningChoice = Boolean(
    data.openingBalance && date === openingDay && !editing?.occurredAt,
  );
  const categories = data.categories.filter(
    (category) => category.type === type || category.type === 'both',
  );
  const filtered = data.transactions
    .filter(
      (item) =>
        (filter === 'all' ||
          item.type === filter ||
          item.cashStatus === filter) &&
        `${item.description ?? ''} ${item.date} ${item.categoryId ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  function reset() {
    setEditing(null);
    setType('expense');
    setAmount('');
    setDate(systemClock.today());
    setDueDate('');
    setDescription('');
    setCategoryId('');
    setCashStatus('settled');
    setOpeningDayDisposition('');
    setConfirmationStatus('not_applicable');
    setError('');
  }
  function edit(item: Transaction) {
    setEditing(item);
    setType(item.type);
    setAmount(String(item.amount));
    setDate(item.date);
    setDueDate(item.dueDate ?? '');
    setDescription(item.description ?? '');
    setCategoryId(item.categoryId ?? '');
    setCashStatus(item.cashStatus);
    setOpeningDayDisposition(item.openingDayDisposition ?? '');
    setConfirmationStatus(item.confirmationStatus);
    setError('');
    document
      .getElementById('transaction-form')
      ?.scrollIntoView({ behavior: 'smooth' });
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!data.openingBalance) {
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
    if (cashStatus === 'settled' && date > systemClock.today()) {
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
      ...(cashStatus === 'pending' ? { dueDate } : {}),
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
        cashStatus === 'pending' ? 'not_applicable' : confirmationStatus,
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
  return (
    <>
      <section className="mb-7">
        <p className="mb-3 text-xs font-bold tracking-[.18em] text-accent">
          {t('prototype')}
        </p>
        <h1 tabIndex={-1} className="text-3xl font-semibold sm:text-5xl">
          {t('transactions.title')}
        </h1>
        <p className="mt-4 text-lg text-muted">
          {t('transactions.description')}
        </p>
      </section>
      {!data.openingBalance ? (
        <p className="mb-5 rounded-xl bg-amber-50 p-4 text-amber-950">
          {t('transactions.openingRequired')}{' '}
          <Link className="font-semibold underline" to="/settings">
            {t('settings.nav')}
          </Link>
        </p>
      ) : null}
      <section
        id="transaction-form"
        className="scroll-mt-5 rounded-3xl border border-[#dce4dc] bg-white p-5 sm:p-7"
      >
        <h2 className="text-xl font-semibold">
          {editing ? t('transactions.edit') : t('transactions.add')}
        </h2>
        <p className="mt-1 text-sm text-muted">{t('transactions.editHelp')}</p>
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium">
            {t('transaction.type')}
            <select
              className="min-h-12 rounded-xl border border-[#bccbc0] px-3"
              value={type}
              onChange={(e) => {
                setType(e.target.value as 'income' | 'expense');
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
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            {t('transaction.date')}
            <input
              className="min-h-12 rounded-xl border border-[#bccbc0] px-4"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            {t('transaction.status')}
            <select
              className="min-h-12 rounded-xl border border-[#bccbc0] px-3"
              value={cashStatus}
              onChange={(e) =>
                setCashStatus(e.target.value as 'settled' | 'pending')
              }
            >
              <option value="settled">{t('transaction.settled')}</option>
              <option value="pending">{t('transaction.pending')}</option>
            </select>
          </label>
          {editing?.paymentOccurrenceId && cashStatus === 'settled' ? (
            <label className="grid gap-2 text-sm font-medium">
              {t('transaction.confirmation')}
              <select
                className="min-h-12 rounded-xl border border-[#bccbc0] px-3"
                value={confirmationStatus}
                onChange={(e) =>
                  setConfirmationStatus(
                    e.target.value as 'unconfirmed' | 'confirmed',
                  )
                }
              >
                <option value="unconfirmed">
                  {t('transaction.unconfirmed')}
                </option>
                <option value="confirmed">{t('transaction.confirmed')}</option>
              </select>
            </label>
          ) : null}
          {cashStatus === 'pending' ? (
            <label className="grid gap-2 text-sm font-medium">
              {t('transaction.dueDate')}
              <input
                className="min-h-12 rounded-xl border border-[#bccbc0] px-4"
                type="date"
                min={date}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </label>
          ) : null}
          <label className="grid gap-2 text-sm font-medium">
            {t('transaction.category')}
            <select
              className="min-h-12 rounded-xl border border-[#bccbc0] px-3"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">{t('transaction.uncategorized')}</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {t(`category.${item.id}`)}
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
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {showOpeningChoice ? (
            <fieldset className="grid gap-2 sm:col-span-2">
              <legend className="text-sm font-semibold">
                {t('transactions.openingDayPrompt')}
              </legend>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name="opening-day"
                  value="already_in_opening"
                  checked={openingDayDisposition === 'already_in_opening'}
                  onChange={(e) => setOpeningDayDisposition(e.target.value)}
                />
                {t('transactions.alreadyIncluded')}
              </label>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name="opening-day"
                  value="after_reference"
                  checked={openingDayDisposition === 'after_reference'}
                  onChange={(e) => setOpeningDayDisposition(e.target.value)}
                />
                {t('transactions.afterReference')}
              </label>
            </fieldset>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-red-800 sm:col-span-2">
              {error}
            </p>
          ) : null}
          <div className="flex gap-3 sm:col-span-2">
            <button
              disabled={!data.openingBalance}
              className="min-h-12 rounded-xl bg-accent px-5 font-semibold text-white disabled:opacity-50"
            >
              {editing
                ? t('transactions.saveCorrection')
                : t('transactions.save')}
            </button>
            {editing ? (
              <button
                type="button"
                className="min-h-12 rounded-xl border px-4"
                onClick={reset}
              >
                {t('form.cancel')}
              </button>
            ) : null}
          </div>
        </form>
      </section>
      <section className="mt-7 rounded-3xl border border-[#dce4dc] bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="grid flex-1 gap-1 text-sm font-medium">
            {t('transactions.search')}
            <input
              className="min-h-11 rounded-xl border border-[#bccbc0] px-3"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            {t('transactions.filter')}
            <select
              className="min-h-11 rounded-xl border border-[#bccbc0] px-3"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
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
          <ul className="mt-4 divide-y divide-[#e4e9e2]">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {item.description ||
                      t(`category.${item.categoryId ?? 'uncategorized'}`)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {item.date} · {t(`transaction.${item.type}`)} ·{' '}
                    {t(`transaction.${item.cashStatus}`)}
                    {item.dueDate
                      ? ` · ${t('transaction.dueDate')}: ${item.dueDate}`
                      : ''}
                  </p>
                  <p className="text-sm text-muted">{money(item.amount)} MMK</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="min-h-11 rounded-lg border px-3 text-sm font-medium"
                    onClick={() => edit(item)}
                  >
                    {t('form.edit')}
                  </button>
                  <button
                    className="min-h-11 rounded-lg border px-3 text-sm font-medium text-red-800"
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
