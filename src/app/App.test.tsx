import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { App } from './App';
import { useDemoStore } from '../store/demoStore';
describe('foundation', () => {
  it('keeps the demo disclosure and grounded assistant after navigation', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('link', { name: 'Ask AI', hidden: true }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Ask your companion',
    );
    expect(
      screen.getByText(
        'Demo mode: simulated data. Do not enter real financial information.',
      ),
    ).toBeVisible();
    expect(screen.getByLabelText('Ask about your records')).toBeVisible();
    expect(screen.queryByText('Not implemented yet')).not.toBeInTheDocument();
  });
  it('recovers unknown addresses', () => {
    render(
      <MemoryRouter initialEntries={['/unknown']}>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: 'Back to dashboard' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Your financial picture',
    );
  });

  it('shows a recovery notice from validated persistence', () => {
    useDemoStore.setState({
      storageNotice: 'Saved demo data was invalid and has been reset.',
    });
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Saved demo data was invalid and has been reset.',
    );
    useDemoStore.setState({ storageNotice: null });
  });

  it('shows record checks and a persistent document checklist on readiness', () => {
    useDemoStore.getState().replaceData({
      ...useDemoStore.getState().data,
      checklist: {},
    });
    render(
      <MemoryRouter initialEntries={['/readiness']}>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: 'Prepare your records' }),
    ).toBeVisible();
    expect(screen.getByText(/not a credit score/i)).toBeVisible();
    const incomeEvidence = screen.getByRole('checkbox', {
      name: 'Income records or invoices',
    });
    fireEvent.click(incomeEvidence);
    expect(useDemoStore.getState().data.checklist.income_records).toBe(true);
    useDemoStore.getState().setReadinessDocument('income_records', false);
  });
});
