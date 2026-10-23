import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ActivityCategoryIcon } from '../components/ActivityCategoryIcon';
import { ActivityStatusIcon } from '../components/ActivityStatusIcon';
import { AnimatedDisclosure } from '../components/Motion';
import {
  buildRuleInsights,
  duplicateReviewId,
  findPossibleDuplicates,
} from '../domain/analysis';
import {
  buildCashFlowForecast,
  summarizeOutstanding,
  type CashFlowForecast,
} from '../domain/reporting';
import { clockForTimeZone, systemClock } from '../services/clock';
import { useDemoStore } from '../store/demoStore';
import type { DuplicateReview } from '../domain/types';

const money = (amount: number | null) =>
  amount === null
    ? '—'
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
        amount,
      );

function translationValues(
  values: Record<string, string | number>,
  t: TFunction,
): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      key === 'category' && typeof value === 'string'
        ? t(`category.${value}`)
        : typeof value === 'number' &&
            !['count', 'percent', 'completed', 'total'].includes(key)
          ? money(value)
          : value,
    ]),
  );
}

export function OwedPage({ kind }: { kind: 'to-me' | 'i-owe' }) {
  const { t } = useTranslation();
  const data = useDemoStore((state) => state.data);
  const timeZone = useDemoStore((state) => state.timeZone);
  const today = clockForTimeZone(timeZone).today();
  const summary = summarizeOutstanding(data, today);
  return (
    <>
      <SummaryCard
        title={
          kind === 'to-me' ? t('owed.receivableTotal') : t('owed.payableTotal')
        }
        amount={
          kind === 'to-me' ? summary.receivableTotal : summary.payableTotal
        }
        tone={kind === 'to-me' ? 'income' : 'expense'}
      />
      {summary.unconfirmedPaidCount > 0 ? (
        <p
          className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950"
          role="status"
        >
          {t('balance.unconfirmedDisclosure', {
            count: summary.unconfirmedPaidCount,
          })}{' '}
          {t('owed.assumptionsExcluded')}
        </p>
      ) : null}
      {kind === 'to-me' ? (
        <OutstandingList
          tone="income"
          title={t('owed.receivables')}
          empty={t('owed.noReceivables')}
          items={summary.receivables}
          overdueLabel={t('owed.overdue')}
          updateLabel={t('owed.updatePayment')}
        />
      ) : (
        <OutstandingList
          tone="expense"
          title={t('owed.payables')}
          empty={t('owed.noPayables')}
          items={summary.payables}
          overdueLabel={t('owed.overdue')}
          updateLabel={t('owed.updatePayment')}
        />
      )}
    </>
  );
}

function SummaryCard({
  title,
  amount,
  tone,
}: {
  title: string;
  amount: number;
  tone: 'income' | 'expense';
}) {
  return (
    <article className={`owed-total-card owed-total-card-${tone}`}>
      <p className="owed-total-label">{title}</p>
      <p className="owed-total-amount">
        {tone === 'income' ? '+' : '−'}
        {money(amount)} <span>MMK</span>
      </p>
    </article>
  );
}

function OutstandingList({
  tone,
  title,
  empty,
  items,
  overdueLabel,
  updateLabel,
}: {
  tone: 'income' | 'expense';
  title: string;
  empty: string;
  items: ReturnType<typeof summarizeOutstanding>['receivables'];
  overdueLabel: string;
  updateLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <section className="mt-6 rounded-3xl border border-[#dce4dc] bg-white p-5 sm:p-7">
      <h2 className="text-xl font-semibold">{title}</h2>
      {items.length ? (
        <ul className="owed-record-list">
          {items.map(({ transaction, dueDate, overdue }) => {
            const categoryName = t(
              `category.${transaction.categoryId ?? 'uncategorized'}`,
            );
            return (
              <li
                key={transaction.id}
                className={`owed-record-card owed-record-card-${tone}`}
              >
                <div className="owed-record-heading">
                  <span className="owed-category-icon">
                    <ActivityCategoryIcon categoryId={transaction.categoryId} />
                  </span>
                  <div className="owed-record-copy">
                    <p className="owed-record-description">{categoryName}</p>
                    {transaction.description &&
                    transaction.description !== categoryName ? (
                      <p className="owed-record-note">
                        {transaction.description}
                      </p>
                    ) : null}
                    <div className="owed-record-meta">
                      <span>
                        {t('owed.recordedOn', { date: transaction.date })} ·{' '}
                        {t('owed.dueOn', { date: dueDate })}
                      </span>
                      {overdue ? (
                        <span className="owed-record-status owed-record-status-overdue">
                          {overdueLabel}
                        </span>
                      ) : (
                        <ActivityStatusIcon
                          status="pending"
                          label={t('owed.upcoming')}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="owed-record-actions">
                  <strong
                    className={`owed-record-amount owed-record-amount-${tone}`}
                  >
                    {tone === 'income' ? '+' : '−'}
                    {money(transaction.amount)} MMK
                  </strong>
                  <Link
                    className="owed-update-button"
                    to={`/transactions?edit=${encodeURIComponent(transaction.id)}`}
                  >
                    {updateLabel}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-muted">{empty}</p>
      )}
    </section>
  );
}

export function ForecastPage() {
  const { t } = useTranslation();
  const data = useDemoStore((state) => state.data);
  const timeZone = useDemoStore((state) => state.timeZone);
  const today = clockForTimeZone(timeZone).today();
  const forecast = buildCashFlowForecast(data, today);
  return (
    <>
      <header className="page-heading">
        <h1 tabIndex={-1}>{t('insights.title')}</h1>
      </header>
      {!data.openingBalance ? (
        <p className="rounded-xl bg-amber-50 p-4 text-amber-950">
          {t('forecast.openingRequired')}{' '}
          <Link className="font-semibold underline" to="/">
            {t('dashboard.nav')}
          </Link>
        </p>
      ) : (
        <>
          <p className="mb-5 rounded-xl bg-[#edf3ec] p-4 text-sm text-muted">
            {t('forecast.disclaimer')}
          </p>
          <div className="forecast-results">
            <ForecastChart forecast={forecast} />
            <div className="grid gap-4 sm:grid-cols-2">
              <ForecastSummaryCard
                title={t('forecast.baseCase')}
                minimum={forecast.base.minimumBalance}
                date={forecast.base.minimumBalanceDate}
                shortfall={forecast.base.shortfall}
                shortfallLabel={t('forecast.noShortfall')}
                lowLabel={t('forecast.lowPoint')}
              />
              <ForecastSummaryCard
                title={t('forecast.lateCase')}
                minimum={forecast.lateInflows.minimumBalance}
                date={forecast.lateInflows.minimumBalanceDate}
                shortfall={forecast.lateInflows.shortfall}
                shortfallLabel={t('forecast.noShortfall')}
                lowLabel={t('forecast.lowPoint')}
              />
            </div>
          </div>
        </>
      )}
      <RuleInsightsPanel />
      <DuplicateReviewPanel />
    </>
  );
}

function ForecastChart({ forecast }: { forecast: CashFlowForecast }) {
  const { t } = useTranslation();
  const width = 820;
  const height = 320;
  const plot = { left: 82, right: 20, top: 22, bottom: 46 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const series = forecast.base.days.map((day, index) => ({
    date: day.date,
    expected: day.closingBalance,
    delayed: forecast.lateInflows.days[index]?.closingBalance ?? null,
  }));
  const values = series
    .flatMap((point) => [point.expected, point.delayed])
    .filter((value): value is number => value !== null);
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const spread = rawMax - rawMin;
  const padding =
    spread === 0 ? Math.max(1, Math.abs(rawMax) * 0.12) : spread * 0.12;
  const min = rawMin - padding;
  const max = rawMax + padding;
  const x = (index: number) =>
    plot.left +
    (series.length <= 1 ? 0 : index / (series.length - 1)) * plotWidth;
  const y = (value: number) =>
    plot.top + ((max - value) / (max - min)) * plotHeight;
  const makePath = (key: 'expected' | 'delayed') => {
    let hasPrevious = false;
    return series
      .map((point, index) => {
        const value = point[key];
        if (value === null) {
          hasPrevious = false;
          return '';
        }
        const command = hasPrevious ? 'L' : 'M';
        hasPrevious = true;
        return `${command} ${x(index)} ${y(value)}`;
      })
      .filter(Boolean)
      .join(' ');
  };
  const ticks = Array.from(
    { length: 5 },
    (_, index) => max - (index / 4) * (max - min),
  );
  const labelIndexes = [
    ...new Set([
      0,
      Math.floor((series.length - 1) / 3),
      Math.floor(((series.length - 1) * 2) / 3),
      series.length - 1,
    ]),
  ];
  const compactAmount = (value: number) =>
    new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  return (
    <section className="forecast-chart-panel">
      <header className="forecast-chart-header">
        <h2>{t('forecast.dailyTitle')}</h2>
        <span>
          {forecast.startDate} – {forecast.endDate}
        </span>
      </header>
      <div className="forecast-chart-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="forecast-chart"
          role="img"
          aria-label={t('forecast.chartAccessible', {
            start: forecast.startDate,
            end: forecast.endDate,
          })}
        >
          <text x={plot.left} y="13" className="forecast-chart-unit">
            MMK
          </text>
          {ticks.map((value, index) => {
            const tickY = plot.top + (index / 4) * plotHeight;
            return (
              <g key={index}>
                <line
                  x1={plot.left}
                  y1={tickY}
                  x2={width - plot.right}
                  y2={tickY}
                  className="forecast-grid-line"
                />
                <text
                  x={plot.left - 11}
                  y={tickY + 4}
                  textAnchor="end"
                  className="forecast-axis-label"
                >
                  {compactAmount(value)}
                </text>
              </g>
            );
          })}
          <path
            d={makePath('delayed')}
            className="forecast-line forecast-line-delayed"
          />
          <path
            d={makePath('expected')}
            pathLength={1}
            className="forecast-line forecast-line-expected"
          />
          {series.map((point, index) => (
            <g key={point.date}>
              {point.delayed !== null ? (
                <circle
                  cx={x(index)}
                  cy={y(point.delayed)}
                  r="4"
                  className="forecast-point forecast-point-delayed"
                  style={{ animationDelay: `${220 + index * 28}ms` }}
                >
                  <title>{`${t('forecast.lateCase')}: ${point.date}, ${money(point.delayed)} MMK`}</title>
                </circle>
              ) : null}
              {point.expected !== null ? (
                <circle
                  cx={x(index)}
                  cy={y(point.expected)}
                  r="4"
                  className="forecast-point forecast-point-expected"
                  style={{ animationDelay: `${220 + index * 28}ms` }}
                >
                  <title>{`${t('forecast.baseCase')}: ${point.date}, ${money(point.expected)} MMK`}</title>
                </circle>
              ) : null}
            </g>
          ))}
          {labelIndexes.map((index) => (
            <text
              key={index}
              x={x(index)}
              y={height - 13}
              textAnchor="middle"
              className="forecast-axis-label"
            >
              {series[index]?.date.slice(5)}
            </text>
          ))}
        </svg>
      </div>
      <div className="forecast-chart-legend" aria-hidden="true">
        <span>
          <i className="forecast-legend-expected" />
          {t('forecast.baseCase')}
        </span>
        <span>
          <i className="forecast-legend-delayed" />
          {t('forecast.lateCase')}
        </span>
      </div>
    </section>
  );
}

function RuleInsightsPanel() {
  const { t } = useTranslation();
  const data = useDemoStore((state) => state.data);
  const timeZone = useDemoStore((state) => state.timeZone);
  const today = clockForTimeZone(timeZone).today();
  const insights = buildRuleInsights(data, today);
  return (
    <AnimatedDisclosure title={t('insights.ruleTitle')}>
      <div className="insight-secondary-content">
        <p className="mt-1 text-sm text-muted">{t('insights.ruleHelp')}</p>
        {insights.length ? (
          <ul className="mt-4 grid gap-4">
            {insights.map((insight) => (
              <li
                key={insight.id}
                className={`rounded-2xl p-4 ${insight.severity === 'attention' ? 'bg-amber-50' : 'bg-[#edf3ec]'}`}
              >
                <h3 className="font-semibold">
                  {t(`insights.${insight.titleKey}`)}
                </h3>
                <p className="mt-2">
                  {t(
                    `insights.${insight.observedKey}`,
                    translationValues(insight.values, t),
                  )}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {t(`insights.${insight.interpretationKey}`)}
                </p>
                {insight.evidence.length ? (
                  <ul className="mt-3 space-y-1 border-t border-black/10 pt-3 text-sm">
                    {insight.evidence.map((item) => (
                      <li key={item.id}>
                        {t('insights.evidenceRow', {
                          description: item.descriptionKey
                            ? t(`insights.${item.descriptionKey}`)
                            : item.description || t('insights.unnamedRecord'),
                          date: item.date,
                          amount: money(item.amount),
                          due: item.dueDate
                            ? t('insights.evidenceDueDate', {
                                date: item.dueDate,
                              })
                            : '',
                        })}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-muted">{t('insights.noSignals')}</p>
        )}
      </div>
    </AnimatedDisclosure>
  );
}

function DuplicateReviewPanel() {
  const { t } = useTranslation();
  const data = useDemoStore((state) => state.data);
  const resolveDuplicate = useDemoStore((state) => state.resolveDuplicate);
  const candidates = findPossibleDuplicates(data);
  const [removeIds, setRemoveIds] = useState<Record<string, string>>({});

  function review(
    candidate: (typeof candidates)[number],
    resolution: 'keep_both' | 'duplicate_removed',
  ) {
    const redundantTransactionId =
      removeIds[candidate.fingerprint] ?? candidate.second.id;
    if (
      resolution === 'duplicate_removed' &&
      !window.confirm(t('insights.confirmRemove'))
    )
      return;
    const item: DuplicateReview = {
      id: duplicateReviewId(
        candidate.first.id,
        candidate.second.id,
        candidate.fingerprint,
      ),
      firstTransactionId: candidate.first.id,
      secondTransactionId: candidate.second.id,
      fingerprint: candidate.fingerprint,
      resolution,
      ...(resolution === 'duplicate_removed' ? { redundantTransactionId } : {}),
      reviewedAt: systemClock.now().toISOString(),
    };
    resolveDuplicate(item);
  }

  return (
    <AnimatedDisclosure title={t('insights.duplicateReviewTitle')}>
      <div className="insight-secondary-content">
        <p className="mt-1 text-sm text-muted">
          {t('insights.duplicatesHelp')}
        </p>
        {candidates.length ? (
          <ul className="mt-4 divide-y divide-[#e4e9e2]">
            {candidates.map((candidate) => (
              <li key={candidate.fingerprint} className="py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[candidate.first, candidate.second].map((transaction) => (
                    <article
                      key={transaction.id}
                      className="rounded-xl bg-canvas p-4"
                    >
                      <p className="font-semibold">
                        {transaction.description || t('insights.unnamedRecord')}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {t(`source.${transaction.source}`)}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {transaction.date} ·{' '}
                        {t(`transaction.${transaction.type}`)} ·{' '}
                        {t(`transaction.${transaction.cashStatus}`)}
                      </p>
                      <p className="mt-1 font-medium">
                        {money(transaction.amount)} MMK
                      </p>
                    </article>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="grid gap-1 text-sm font-medium">
                    {t('insights.removeChoice')}
                    <select
                      className="min-h-11 rounded-xl border border-[#bccbc0] px-3"
                      value={
                        removeIds[candidate.fingerprint] ?? candidate.second.id
                      }
                      onChange={(event) =>
                        setRemoveIds((current) => ({
                          ...current,
                          [candidate.fingerprint]: event.target.value,
                        }))
                      }
                    >
                      <option value={candidate.first.id}>
                        {t('insights.firstChoice', {
                          source: t(`source.${candidate.first.source}`),
                          description:
                            candidate.first.description ||
                            t('insights.unnamedRecord'),
                        })}
                      </option>
                      <option value={candidate.second.id}>
                        {t('insights.secondChoice', {
                          source: t(`source.${candidate.second.source}`),
                          description:
                            candidate.second.description ||
                            t('insights.unnamedRecord'),
                        })}
                      </option>
                    </select>
                  </label>
                  <button
                    className="min-h-11 rounded-lg bg-accent px-4 py-2 font-semibold text-white"
                    onClick={() => review(candidate, 'keep_both')}
                  >
                    {t('insights.keepBoth')}
                  </button>
                  <button
                    className="min-h-11 rounded-lg border border-[#bccbc0] px-4 py-2 font-semibold"
                    onClick={() => review(candidate, 'duplicate_removed')}
                  >
                    {t('insights.removeDuplicate')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-muted">{t('insights.noDuplicates')}</p>
        )}
      </div>
    </AnimatedDisclosure>
  );
}

function ForecastSummaryCard({
  title,
  minimum,
  date,
  shortfall,
  shortfallLabel,
  lowLabel,
}: {
  title: string;
  minimum: number | null;
  date: string | null;
  shortfall: number;
  shortfallLabel: string;
  lowLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <article className="forecast-summary-card">
      <h2 className="font-semibold">{title}</h2>
      <p className="forecast-summary-meta">
        {lowLabel}
        {date ? ` · ${date}` : ''}
      </p>
      <p className="forecast-summary-amount">
        {money(minimum)} <span>MMK</span>
      </p>
      <p
        className={`forecast-summary-status${shortfall ? ' forecast-summary-shortfall' : ''}`}
      >
        {shortfall
          ? t('forecast.shortfall', { amount: money(shortfall) })
          : shortfallLabel}
      </p>
    </article>
  );
}
