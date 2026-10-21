import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { App } from './App';
describe('foundation', () => {
  it('keeps the demo disclosure and placeholder after navigation', () => {
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
    expect(screen.getByText('Not implemented yet')).toBeVisible();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
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
});
