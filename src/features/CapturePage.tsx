import { AppSelect } from '../components/AppSelect';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { CategorySuggestion } from '../components/CategorySuggestion';
import { AnimatedDisclosure } from '../components/Motion';
import type { ReceiptFields } from '../domain/receipt';
import type { Transaction } from '../domain/types';
import { clockForTimeZone, systemClock } from '../services/clock';
import { dateInTimeZone } from '../services/timeZone';
import { useDemoStore } from '../store/demoStore';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `capture-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function CapturePage() {
  const { t } = useTranslation();
  const data = useDemoStore((state) => state.data);
  const timeZone = useDemoStore((state) => state.timeZone);
  const today = clockForTimeZone(timeZone).today();
  const save = useDemoStore((state) => state.saveTransaction);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const previewUrlRef = useRef<string | null>(null);
  const [extraction, setExtraction] = useState<'ocr' | 'manual' | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [language, setLanguage] = useState<'eng' | 'eng+mya'>('eng+mya');
  const [progress, setProgress] = useState({ phase: 'loading', progress: 0 });
  const [detected, setDetected] = useState<ReceiptFields | null>(null);
  const [type, setType] = useState<'income' | 'expense' | ''>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [cashStatus, setCashStatus] = useState<'settled' | 'pending' | ''>(
    'settled',
  );
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [openingDayDisposition, setOpeningDayDisposition] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(
    () => () => {
      requestRef.current?.abort();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const categories = data.categories.filter(
    (category) => category.type === type || category.type === 'both',
  );
  const openingDay = data.openingBalance
    ? dateInTimeZone(
        data.openingBalance.referenceAt,
        data.openingBalance.timeZone,
      )
    : '';
  const showOpeningChoice = Boolean(
    data.openingBalance && date === openingDay && cashStatus === 'settled',
  );

  function selectFile(candidate: File | undefined) {
    cancelExtraction();
    setDetected(null);
    setError('');
    setSaved(false);
    setExtraction(null);
    setReviewed(false);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl('');
    setFile(null);
    if (!candidate) return;
    if (!SUPPORTED_IMAGE_TYPES.includes(candidate.type)) {
      setError(t('capture.fileTypeError'));
      return;
    }
    if (candidate.size === 0) {
      setError(t('capture.emptyFileError'));
      return;
    }
    if (candidate.size > MAX_IMAGE_BYTES) {
      setError(t('capture.fileSizeError'));
      return;
    }
    const url = URL.createObjectURL(candidate);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setFile(candidate);
  }

  function cancelExtraction() {
    requestRef.current?.abort();
    requestRef.current = null;
    setExtracting(false);
  }

  async function extract() {
    if (!file || extracting) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setError('');
    setSaved(false);
    setExtraction(null);
    setDetected(null);
    setExtracting(true);
    setProgress({ phase: 'loading', progress: 0 });
    try {
      const { extractReceiptLocally } = await import('../services/ocr');
      if (controller.signal.aborted) return;
      const result = await extractReceiptLocally(
        file,
        language,
        controller.signal,
        setProgress,
      );
      if (requestRef.current !== controller || controller.signal.aborted)
        return;
      setDetected(result);
      setExtraction('ocr');
      setType(result.type);
      setAmount(result.amount === null ? '' : String(result.amount));
      setDate(result.date);
      setCashStatus(result.cashStatus);
      setDueDate('');
      setCategoryId('');
      setDescription(result.description);
      setOpeningDayDisposition('');
      setReviewed(false);
    } catch {
      if (!controller.signal.aborted && requestRef.current === controller)
        setError(t('capture.ocrError'));
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setExtracting(false);
      }
    }
  }

  function enterManually() {
    cancelExtraction();
    setDetected(null);
    setExtraction('manual');
    setType('expense');
    setAmount('');
    setDate(today);
    setCashStatus('settled');
    setDueDate('');
    setCategoryId('');
    setDescription('');
    setOpeningDayDisposition('');
    setReviewed(false);
    setError('');
    setSaved(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (!data.openingBalance) {
      setError(t('transactions.openingRequired'));
      return;
    }
    if (!extraction) {
      setError(t('capture.chooseReviewMode'));
      return;
    }
    if (!type || !cashStatus || !date) {
      setError(t('capture.missingFields'));
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
    if (!reviewed) {
      setError(t('capture.reviewRequired'));
      return;
    }

    const now = systemClock.now().toISOString();
    const transaction: Transaction = {
      id: newId(),
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
      counterpartyId: null,
      cashStatus,
      confirmationStatus: 'not_applicable',
      source: file ? 'receipt_image' : 'manual',
      ocrReviewStatus: file ? 'reviewed' : 'not_applicable',
      createdAt: now,
      updatedAt: now,
    };
    save(transaction);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl('');
    setFile(null);
    setExtraction(null);
    setDetected(null);
    setAmount('');
    setDate(today);
    setCashStatus('settled');
    setDueDate('');
    setCategoryId('');
    setDescription('');
    setOpeningDayDisposition('');
    setReviewed(false);
    setSaved(true);
  }

  return (
    <>
      <header className="page-heading">
        <h1 tabIndex={-1}>{t('capture.title')}</h1>
      </header>

      {!data.openingBalance ? (
        <p className="mb-5 rounded-xl bg-amber-50 p-4 text-amber-950">
          {t('transactions.openingRequired')}{' '}
          <Link className="font-semibold underline" to="/">
            {t('dashboard.nav')}
          </Link>
        </p>
      ) : null}

      <section className="rounded-3xl border border-[#dce4dc] bg-white p-5 sm:p-7">
        <p className="text-sm text-muted">{t('capture.privacy')}</p>
        <label className="capture-upload-control mt-5">
          <Plus size={20} strokeWidth={2.2} aria-hidden="true" />
          <span>{t('capture.upload')}</span>
          <input
            aria-label={t('capture.upload')}
            className="capture-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              selectFile(event.currentTarget.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
        </label>
        {file ? (
          <div className="mt-4 rounded-2xl bg-canvas p-4">
            <p className="font-medium">{file.name}</p>
            <p className="mt-1 text-sm text-muted">
              {(file.size / 1024).toFixed(1)} KB · {file.type}
            </p>
            {previewUrl ? (
              <img
                className="mt-4 max-h-80 max-w-full rounded-xl object-contain"
                src={previewUrl}
                alt={t('capture.previewAlt')}
              />
            ) : null}
          </div>
        ) : null}
        <label className="mt-5 grid max-w-sm gap-2 text-sm font-medium">
          {t('capture.language')}
          <AppSelect
            className="min-h-12 rounded-xl border border-[#bccbc0] bg-white px-3"
            value={language}
            disabled={extracting}
            onValueChange={(value) =>
              setLanguage(value as typeof language)
            }
          >
            <option value="eng+mya">English + Burmese</option>
            <option value="eng">English</option>
          </AppSelect>
        </label>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!file || extracting}
            className="min-h-11 rounded-xl bg-accent px-4 font-semibold text-white disabled:opacity-50"
            onClick={() => void extract()}
          >
            {t(extracting ? 'capture.extracting' : 'capture.extract')}
          </button>
          {extracting ? (
            <button
              type="button"
              className="pill-button"
              onClick={cancelExtraction}
            >
              {t('capture.cancelExtraction')}
            </button>
          ) : null}
          {file ? (
            <button
              type="button"
              className="min-h-11 rounded-xl border border-[#bccbc0] px-4 font-semibold"
              onClick={enterManually}
            >
              {t('capture.manualFallback')}
            </button>
          ) : null}
        </div>
        {extracting ? (
          <div className="mt-4" role="status" aria-live="polite">
            <p className="text-sm text-muted">
              {t(`capture.${progress.phase}`)}
              {progress.phase === 'reading'
                ? ` ${Math.round(progress.progress * 100)}%`
                : ''}
            </p>
            {progress.phase === 'reading' ? (
              <progress
                className="mt-2 h-2 w-full accent-[#0866e8]"
                max={1}
                value={progress.progress}
                aria-label={t('capture.reading')}
              />
            ) : null}
          </div>
        ) : null}
        {extraction ? (
          <p className="mt-4 rounded-xl bg-[#edf3ec] p-4 text-sm" role="status">
            {t(
              extraction === 'ocr'
                ? 'capture.ocrNotice'
                : 'capture.manualNotice',
            )}
          </p>
        ) : null}
      </section>

      {detected ? (
        <div className="mt-4">
          {detected.warnings.length ? (
            <ul
              className="mb-4 grid gap-1 rounded-xl bg-amber-50 p-4 text-sm text-amber-950"
              role="status"
            >
              {detected.warnings.map((warning) => (
                <li key={warning}>{t(`capture.warnings.${warning}`)}</li>
              ))}
            </ul>
          ) : null}
          <AnimatedDisclosure title={t('capture.detectedText')}>
            <pre className="whitespace-pre-wrap break-words p-4 text-sm">
              {detected.rawText || t('capture.warnings.noText')}
            </pre>
          </AnimatedDisclosure>
        </div>
      ) : null}

      {extraction ? (
        <section className="mt-6 rounded-3xl border border-[#dce4dc] bg-white p-5 sm:p-7">
          <h2 className="text-xl font-semibold">{t('capture.reviewTitle')}</h2>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-medium">
              {t('transaction.type')}
              <AppSelect
                className="min-h-12 rounded-xl border border-[#bccbc0] px-3"
                value={type}
                required
                onValueChange={(value) => {
                  setType(value as 'income' | 'expense' | '');
                  setCategoryId('');
                  setReviewed(false);
                }}
              >
                <option value="" disabled>
                  {t('capture.chooseType')}
                </option>
                <option value="expense">{t('transaction.expense')}</option>
                <option value="income">{t('transaction.income')}</option>
              </AppSelect>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {t('transaction.amount')}
              <input
                className="min-h-12 rounded-xl border border-[#bccbc0] px-4"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setReviewed(false);
                }}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {t('transaction.date')}
              <input
                className="min-h-12 rounded-xl border border-[#bccbc0] px-4"
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setReviewed(false);
                }}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {t('transaction.status')}
              <AppSelect
                className="min-h-12 rounded-xl border border-[#bccbc0] px-3"
                value={cashStatus}
                required
                onValueChange={(value) => {
                  setCashStatus(value as 'settled' | 'pending');
                  setReviewed(false);
                }}
              >
                <option value="" disabled>
                  {t('capture.chooseStatus')}
                </option>
                <option value="settled">{t('transaction.settled')}</option>
                <option value="pending">{t('transaction.pending')}</option>
              </AppSelect>
            </label>
            {cashStatus === 'pending' ? (
              <label className="grid gap-2 text-sm font-medium">
                {t('transaction.dueDate')}
                <input
                  className="min-h-12 rounded-xl border border-[#bccbc0] px-4"
                  type="date"
                  min={date}
                  value={dueDate}
                  onChange={(event) => {
                    setDueDate(event.target.value);
                    setReviewed(false);
                  }}
                  required
                />
              </label>
            ) : null}
            <label className="grid gap-2 text-sm font-medium">
              {t('transaction.category')}
              <AppSelect
                className="min-h-12 rounded-xl border border-[#bccbc0] px-3"
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value);
                  setReviewed(false);
                }}
              >
                <option value="">{t('transaction.uncategorized')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {t(`category.${category.id}`)}
                  </option>
                ))}
              </AppSelect>
            </label>
            <div>
              {type ? (
                <CategorySuggestion
                  description={description}
                  type={type}
                  categories={categories}
                  selectedCategoryId={categoryId}
                  onApply={(suggestion) => {
                    setCategoryId(suggestion);
                    setReviewed(false);
                  }}
                />
              ) : null}
            </div>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              {t('transaction.description')}
              <input
                className="min-h-12 rounded-xl border border-[#bccbc0] px-4"
                maxLength={200}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setReviewed(false);
                }}
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
                    name="capture-opening-day"
                    value="already_in_opening"
                    checked={openingDayDisposition === 'already_in_opening'}
                    onChange={(event) => {
                      setOpeningDayDisposition(event.target.value);
                      setReviewed(false);
                    }}
                  />
                  {t('transactions.alreadyIncluded')}
                </label>
                <label className="flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name="capture-opening-day"
                    value="after_reference"
                    checked={openingDayDisposition === 'after_reference'}
                    onChange={(event) => {
                      setOpeningDayDisposition(event.target.value);
                      setReviewed(false);
                    }}
                  />
                  {t('transactions.afterReference')}
                </label>
              </fieldset>
            ) : null}
            <label className="flex min-h-11 items-start gap-3 sm:col-span-2">
              <input
                className="mt-1 size-4"
                type="checkbox"
                checked={reviewed}
                onChange={(event) => setReviewed(event.target.checked)}
              />
              <span>{t('capture.confirmReview')}</span>
            </label>
            {error ? (
              <p className="text-sm text-red-800 sm:col-span-2" role="alert">
                {error}
              </p>
            ) : null}
            <div className="sm:col-span-2">
              <button
                disabled={!data.openingBalance}
                className="min-h-12 rounded-xl bg-accent px-5 font-semibold text-white disabled:opacity-50"
              >
                {t('capture.saveReviewed')}
              </button>
            </div>
          </form>
        </section>
      ) : null}
      {saved ? (
        <p
          className="mt-4 rounded-xl bg-[#edf3ec] p-4 text-sm text-accent"
          role="status"
        >
          {t('capture.saved')}
        </p>
      ) : null}
      {error && !extraction ? (
        <p className="mt-4 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
