import { forwardRef } from 'react';
import type { CreditReadiness } from '../domain/creditReadiness';

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

export const CreditReport = forwardRef<
  HTMLDivElement,
  {
    summary: CreditReadiness;
    applicantName: string;
    businessName: string;
  }
>(function CreditReport({ summary: s, applicantName, businessName }, ref) {
  return (
    <div ref={ref} className="credit-report" aria-hidden="true">
      <header className="credit-report-header">
        <span>SHWE TAW PYAN CHI</span>
        <span>Prepared {s.today}</span>
      </header>
      <h1>FlowCredit Readiness Report</h1>
      <p className="credit-report-subtitle">
        Supporting income evidence • {s.bank.name}
      </p>
      <div className="credit-report-identity">
        <div>
          <span>APPLICANT</span>
          <strong>{applicantName.trim() || 'Not provided'}</strong>
        </div>
        <div>
          <span>BUSINESS</span>
          <strong>{businessName.trim() || 'Not provided'}</strong>
        </div>
      </div>
      <section className="credit-report-progress">
        <div>
          <span>DOCUMENT PREPARATION</span>
          <strong>{s.percent}%</strong>
        </div>
        <p>
          {s.completed} of 6 groups prepared. Declared documents are
          self-reported; supporting summaries are generated from saved records.
          This is not a credit score.
        </p>
      </section>
      <div className="credit-report-section-heading">
        <h2>Recorded cash flow</h2>
        <span>
          {s.startDate} to {s.today} • MMK
        </span>
      </div>
      <div className="credit-report-metrics">
        <div>
          <span>Income</span>
          <strong>{money(s.income)}</strong>
        </div>
        <div>
          <span>Expenses</span>
          <strong>{money(s.expenses)}</strong>
        </div>
        <div>
          <span>Net movement</span>
          <strong>{money(s.net)}</strong>
        </div>
      </div>
      <table className="credit-report-table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Records</th>
            <th>Income (MMK)</th>
            <th>Expenses (MMK)</th>
            <th>Net (MMK)</th>
          </tr>
        </thead>
        <tbody>
          {s.monthly.map((row) => (
            <tr key={row.month}>
              <td>{row.month}</td>
              <td>{row.count}</td>
              <td>{money(row.income)}</td>
              <td>{money(row.expenses)}</td>
              <td>{money(row.income - row.expenses)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="credit-report-section-heading">
        <h2>{s.bank.name} preparation checklist</h2>
        <span>Six summary groups</span>
      </div>
      <table className="credit-report-checklist">
        <tbody>
          {s.rows.map((row) => (
            <tr key={row.id}>
              <td>{row.title}</td>
              <td>
                {row.declared
                  ? 'Available (self-reported)'
                  : row.supporting
                    ? 'Supporting summary ready'
                    : row.completion > 0
                      ? `Incomplete (${Math.round(row.completion * 100)}% coverage)`
                      : 'Incomplete'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="credit-report-evidence">
        <h2>Evidence & coverage</h2>
        <p>
          {s.recordCount} settled records: {s.reviewedImageCount} reviewed
          receipt / screenshot records, {s.manualCount} manual records and{' '}
          {s.recurringCount} confirmed schedule records. Records appear in{' '}
          {s.recentMonths} of the 12 reporting months.
        </p>
        <p>
          {s.bank.historyMonths}-month financial history: {s.coveredMonths}{' '}
          months with records. {s.pendingCount} pending and {s.unconfirmedCount}{' '}
          unconfirmed records excluded from totals.
          {s.duplicateCount > 0
            ? ` ${s.duplicateCount} possible duplicate pairs need review.`
            : ''}
        </p>
      </section>
      <footer className="credit-report-footer">
        <strong>
          User-prepared supporting summary. No audit, bank verification or
          income certification.
        </strong>
        <p>
          Zero rows indicate no recorded activity, not proof of no activity.
          Month coverage does not establish complete records. This report does
          not replace bank-issued statements, audited accounts or original
          vouchers. Acceptance and additional requirements are decided by the
          bank.
        </p>
        <p>
          {s.bank.id === 'abank'
            ? 'A Bank checklist: team draft; confirm requirements with the branch.'
            : `Checklist reference: ${s.bank.source}`}
        </p>
        <span>Prepared locally from saved app records • 1 / 1</span>
      </footer>
    </div>
  );
});
