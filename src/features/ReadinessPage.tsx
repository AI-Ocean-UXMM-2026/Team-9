import { useUiText } from '../i18n/useUiText';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Download,
  FileCheck2,
  FileText,
  Landmark,
  ReceiptText,
  Upload,
} from 'lucide-react';
import { SlidingSelector } from '../components/SlidingSelector';
import { AnimatedDisclosure } from '../components/Motion';
import { CreditReport } from '../components/CreditReport';
import {
  bankChecklists,
  buildCreditReadiness,
  creditChecklistKey,
} from '../domain/creditReadiness';
import { clockForTimeZone } from '../services/clock';
import { useDemoStore } from '../store/demoStore';

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

export function ReadinessPage() {
  const text = useUiText();
  const data = useDemoStore((state) => state.data);
  const timeZone = useDemoStore((state) => state.timeZone);
  const setProfile = useDemoStore((state) => state.setCreditProfile);
  const setDocumentAvailable = useDemoStore(
    (state) => state.setReadinessDocument,
  );
  const profile = data.creditProfile ?? {
    bankId: 'yoma' as const,
    applicantName: '',
    businessName: '',
  };
  const bank =
    bankChecklists.find((item) => item.id === profile.bankId) ??
    bankChecklists[1];
  const summary = buildCreditReadiness(
    data,
    bank,
    clockForTimeZone(timeZone).today(),
  );
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [exportError, setExportError] = useState(false);

  async function exportReport() {
    if (!reportRef.current || exporting) return;
    setExporting(true);
    setExportMessage('');
    setExportError(false);
    try {
      const { downloadCreditReport } = await import('../services/creditReport');
      await downloadCreditReport(
        reportRef.current,
        `FlowCredit-${bank.id}-${summary.today}.pdf`,
      );
      setExportMessage(
        'Your one-page report has been downloaded. Keep your original supporting documents with it.',
      );
    } catch {
      setExportError(true);
      setExportMessage('The PDF could not be created. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="credit-page">
      <header className="page-heading">
        <h1 tabIndex={-1}>{text('Credit readiness')}</h1>
        <p className="credit-page-intro">
          {text('Prepare the records behind your next application.')}
        </p>
      </header>
      <section
        className="credit-bank-section"
        aria-labelledby="credit-bank-title"
      >
        <div className="credit-section-heading">
          <span className="credit-step">1</span>
          <div>
            <h2 id="credit-bank-title">{text('Choose your target bank')}</h2>
            <p>
              {text(
                'See the document checklist for the bank you plan to visit.',
              )}
            </p>
          </div>
        </div>
        <SlidingSelector
          className="credit-bank-selector"
          selectionKey={bank.id}
          role="group"
          aria-label={text('Target bank')}
        >
          {bankChecklists.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={bank.id === item.id}
              disabled={exporting}
              onClick={() => {
                setProfile({ ...profile, bankId: item.id });
                setExportMessage('');
              }}
              className={
                bank.id === item.id
                  ? 'credit-bank-option is-selected'
                  : 'credit-bank-option'
              }
            >
              <span className="credit-bank-logo" aria-hidden="true">
                {item.abbreviation}
              </span>
              <strong>{item.name}</strong>
              {bank.id === item.id ? (
                <Check size={17} aria-hidden="true" />
              ) : (
                <Landmark size={17} aria-hidden="true" />
              )}
            </button>
          ))}
        </SlidingSelector>
      </section>
      <section
        className="credit-progress-card"
        aria-labelledby="credit-progress-title"
      >
        <div>
          <p id="credit-progress-title">{text('Your document preparation')}</p>
          <strong className="credit-percent">
            {summary.percent}
            <span>{text('% ready')}</span>
          </strong>
          <p>
            {text('{{completed}} of 6 groups prepared for {{bank}}', {
              completed: summary.completed,
              bank: bank.name,
            })}
          </p>
        </div>
        <div className="credit-progress-copy">
          <FileCheck2 size={26} aria-hidden="true" />
          <p>
            {summary.percent === 100
              ? text(
                  'Your preparation checklist is complete. Review the details with your branch.',
                )
              : text(
                  'Build your application kit one document at a time. You can export a progress report at any stage.',
                )}
          </p>
        </div>
        <div
          className="credit-progress-track"
          role="progressbar"
          aria-label={text('Document preparation')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary.percent}
        >
          <span style={{ width: `${summary.percent}%` }} />
        </div>
        <small>
          {text(
            'Preparation progress is based on your checklist and record coverage. It does not predict loan approval.',
          )}
        </small>
      </section>
      <div className="credit-content-grid">
        <section
          className="credit-checklist-panel"
          aria-labelledby="credit-checklist-title"
        >
          <div className="credit-section-heading">
            <span className="credit-step">2</span>
            <div>
              <h2 id="credit-checklist-title">
                {bank.name} · {text('Checklist')}
              </h2>
              <p>
                {text(
                  'Tick documents you already have. Financial record coverage updates automatically.',
                )}
              </p>
            </div>
          </div>
          <ul className="credit-checklist" key={bank.id}>
            {summary.rows.map((row) => (
              <li
                key={row.id}
                className={
                  row.complete
                    ? 'credit-requirement is-complete'
                    : 'credit-requirement'
                }
              >
                <div className="credit-requirement-heading">
                  <span className="credit-status-icon" aria-hidden="true">
                    {row.complete ? (
                      <Check size={18} />
                    ) : (
                      <CircleAlert size={18} />
                    )}
                  </span>
                  <div>
                    <h3>{text(row.title)}</h3>
                    <p>{text(row.detail)}</p>
                  </div>
                </div>
                <div className="credit-requirement-bottom">
                  <label>
                    <input
                      type="checkbox"
                      disabled={exporting}
                      checked={row.declared}
                      onChange={(event) =>
                        setDocumentAvailable(
                          creditChecklistKey(bank.id, row.id),
                          event.currentTarget.checked,
                        )
                      }
                    />
                    <span>
                      {text('Available')}: {text(row.title)}
                    </span>
                  </label>
                  <span
                    className={`credit-status-label ${row.complete ? 'is-ready' : ''}`}
                  >
                    {row.declared
                      ? text('Available · self-reported')
                      : row.supporting
                        ? text('Supporting summary ready')
                        : text('Incomplete')}
                  </span>
                </div>
                {row.match ? (
                  <div className="credit-match-note">
                    <ReceiptText size={15} aria-hidden="true" />
                    <span>
                      {row.match === 'financial'
                        ? `${summary.coveredMonths} / ${bank.historyMonths} months with settled records`
                        : `${summary.voucherMonths} / 12 months with reviewed receipt records`}
                      {row.supporting
                        ? ' · Included in your supporting summary'
                        : ' · Add records to improve coverage'}
                    </span>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="credit-checklist-note">
            “Available” means you say the document is ready. App summaries
            support a branch review and do not replace official bank statements,
            audited accounts or original vouchers.
          </p>
          <AnimatedDisclosure title={text('Checklist sources & scoring')}>
            <div className="credit-source-details">
              <p>{bank.sourceNote}</p>
              {bank.source ? (
                <a href={bank.source} target="_blank" rel="noreferrer">
                  View the bank’s published requirements{' '}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              ) : null}
              <p>
                Each of the six groups contributes equally. A declared document
                gives that group full preparation credit. Financial summaries
                earn progress from months with saved, settled records; voucher
                summaries use reviewed receipt / screenshot records. Month
                coverage does not establish complete or externally verified
                accounts.
              </p>
              <p>
                Pending, future and assumed unconfirmed payments are excluded
                from the financial summary.
              </p>
            </div>
          </AnimatedDisclosure>
        </section>
        <aside
          className="credit-evidence-panel"
          aria-label="Financial supporting evidence"
        >
          <div className="credit-evidence-heading">
            <span>
              <ReceiptText size={21} aria-hidden="true" />
            </span>
            <div>
              <h2>{text('Your supporting evidence')}</h2>
              <p>{text('Calculated from saved records')}</p>
            </div>
          </div>
          <p className="credit-evidence-summary">{text(bank.summary)}</p>
          <div className="credit-money-stat">
            <span>{text('Recorded income')}</span>
            <strong>
              {money(summary.income)} <small>MMK</small>
            </strong>
          </div>
          <div className="credit-money-stat">
            <span>{text('Recorded expenses')}</span>
            <strong>
              {money(summary.expenses)} <small>MMK</small>
            </strong>
          </div>
          <div className="credit-money-stat credit-net">
            <span>{text('Net cash movement')}</span>
            <strong>
              {money(summary.net)} <small>MMK</small>
            </strong>
          </div>
          <p className="credit-date-range">
            {summary.startDate} – {summary.today}
          </p>
          <dl className="credit-evidence-counts">
            <div>
              <dt>{text('Settled records')}</dt>
              <dd>{summary.recordCount}</dd>
            </div>
            <div>
              <dt>{text('Reviewed receipt records')}</dt>
              <dd>{summary.reviewedImageCount}</dd>
            </div>
            <div>
              <dt>{text('Months with records')}</dt>
              <dd>{summary.recentMonths} / 12</dd>
            </div>
          </dl>
          {summary.recordCount === 0 ? (
            <p className="credit-empty-evidence">
              {text(
                'Add income and expenses to start building your financial history.',
              )}
            </p>
          ) : null}
          {summary.unconfirmedCount > 0 ? (
            <p className="credit-empty-evidence">
              {summary.unconfirmedCount} assumed payments are excluded until you
              confirm them.
            </p>
          ) : null}
          {summary.duplicateCount > 0 ? (
            <p className="credit-empty-evidence">
              Review {summary.duplicateCount} possible duplicate pairs in
              Insights before sharing the report.{' '}
              <Link to="/insights">Review</Link>
            </p>
          ) : null}
          <Link className="credit-evidence-action" to="/capture">
            <Upload size={17} aria-hidden="true" />{' '}
            {text('Add receipt records')}
          </Link>
          <Link className="credit-records-link" to="/transactions">
            {text('Review all records')}{' '}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </aside>
      </div>
      <section
        className="credit-export-panel"
        aria-labelledby="credit-export-title"
      >
        <div className="credit-section-heading">
          <span className="credit-step">3</span>
          <div>
            <h2 id="credit-export-title">
              {text('Your loan application kit')}
            </h2>
            <p>
              {text(
                'One page with your cash-flow summary, checklist and evidence coverage.',
              )}
            </p>
          </div>
        </div>
        <div className="credit-profile-fields">
          <label>
            {text('Applicant name')}
            <span>{text('(optional)')}</span>
            <input
              autoComplete="name"
              maxLength={100}
              disabled={exporting}
              value={profile.applicantName}
              onChange={(event) =>
                setProfile({ ...profile, applicantName: event.target.value })
              }
              placeholder={text('Your name')}
            />
          </label>
          <label>
            {text('Business name')}
            <span>{text('(optional)')}</span>
            <input
              autoComplete="organization"
              maxLength={100}
              disabled={exporting}
              value={profile.businessName}
              onChange={(event) =>
                setProfile({ ...profile, businessName: event.target.value })
              }
              placeholder={text('Your business')}
            />
          </label>
        </div>
        <div className="credit-export-bottom">
          <p>
            <FileText size={19} aria-hidden="true" />
            <span>
              PDF · 1 page · {bank.name}
              <small>
                User-prepared supporting evidence. The bank decides acceptance
                and any additional requirements.
              </small>
            </span>
          </p>
          <button
            type="button"
            className="action-button credit-export-button"
            disabled={exporting}
            onClick={() => void exportReport()}
          >
            <Download size={18} aria-hidden="true" />
            {exporting
              ? text('Preparing PDF…')
              : text('Export Loan Application Kit')}
          </button>
        </div>
        {exportMessage ? (
          <p
            className={
              exportError
                ? 'credit-export-message is-error'
                : 'credit-export-message'
            }
            role={exportError ? 'alert' : 'status'}
          >
            {exportMessage}
          </p>
        ) : null}
      </section>
      <CreditReport
        ref={reportRef}
        summary={summary}
        applicantName={profile.applicantName}
        businessName={profile.businessName}
      />
    </div>
  );
}
