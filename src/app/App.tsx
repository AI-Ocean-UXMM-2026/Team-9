import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Leaf, Menu, X, FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { screens } from './routes';
import { Placeholder } from '../features/Placeholder';
import { CapturePage } from '../features/CapturePage';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useDemoStore } from '../store/demoStore';
import {
  DashboardPage,
  SchedulesPage,
  SettingsPage,
  TransactionsPage,
} from '../features/FinancialPages';
export function App() {
  const { t } = useTranslation();
  const storageNotice = useDemoStore((state) => state.storageNotice);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      document.querySelector<HTMLElement>('h1')?.focus();
      previousPath.current = location.pathname;
    }
    const screen = screens.find((s) => s.path === location.pathname);
    document.title = `${screen ? t(`${screen.id}.nav`) : t('notFound')} · ${t('brand')}`;
  }, [location.pathname, t]);
  useEffect(() => {
    const process = () => useDemoStore.getState().processDueSchedules();
    if (useDemoStore.persist.hasHydrated()) {
      process();
      return;
    }
    return useDemoStore.persist.onFinishHydration(process);
  }, []);
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        {t('skip')}
      </a>
      <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-ink px-4 py-3 text-center text-xs leading-relaxed text-white sm:text-sm">
        <FlaskConical size={16} className="shrink-0" aria-hidden="true" />
        {t('demo')}
      </div>
      {storageNotice ? (
        <div
          className="flex items-center justify-center gap-3 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950"
          role="status"
        >
          <span>{storageNotice}</span>
          <button
            className="min-h-11 rounded px-2 font-semibold underline"
            onClick={() => useDemoStore.getState().dismissStorageNotice()}
          >
            {t('dismiss')}
          </button>
        </div>
      ) : null}
      <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-[#dce4dc] bg-white lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between p-5 lg:p-7">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 font-semibold"
            >
              <span className="rounded-xl bg-accent p-2 text-white">
                <Leaf size={22} aria-hidden="true" />
              </span>
              <span className="max-w-32 leading-tight">{t('brand')}</span>
            </Link>
            <button
              className="flex min-h-11 items-center gap-2 rounded-lg px-3 lg:hidden"
              aria-expanded={open}
              aria-controls="main-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? (
                <X size={20} aria-hidden="true" />
              ) : (
                <Menu size={20} aria-hidden="true" />
              )}
              {t(open ? 'close' : 'menu')}
            </button>
          </div>
          <nav
            id="main-navigation"
            aria-label={t('navigation')}
            className={`${open ? 'block' : 'hidden'} px-4 pb-6 lg:block`}
          >
            <p className="mb-3 mt-3 px-3 text-[10px] font-bold tracking-[.18em] text-muted">
              {t('workspace')}
            </p>
            {screens.map(({ id, path, icon: Icon }) => (
              <NavLink
                key={id}
                to={path}
                end={path === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `mb-1 flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${isActive ? 'bg-[#e7f1e9] text-accent' : 'text-muted hover:bg-canvas'}`
                }
              >
                <Icon size={19} aria-hidden="true" />
                {t(`${id}.nav`)}
              </NavLink>
            ))}
          </nav>
          <p className="hidden border-t border-[#e4e9e2] px-7 py-6 text-xs leading-relaxed text-muted lg:block">
            {t('tagline')}
          </p>
        </aside>
        <div className="min-w-0">
          <header className="flex items-center justify-between border-b border-[#e4e9e2] px-6 py-5 sm:px-10">
            <span className="text-sm text-muted">{t('brand')}</span>
            <span className="rounded-full border border-[#cdddcf] px-3 py-1 text-xs font-medium text-accent">
              {t('phase')}
            </span>
          </header>
          <main
            id="main"
            tabIndex={-1}
            className="mx-auto max-w-5xl px-5 py-9 sm:px-10 sm:py-12"
          >
            <ErrorBoundary key={location.pathname}>
              <Routes>
                {screens.map(({ id, path }) => (
                  <Route
                    key={id}
                    path={path}
                    element={
                      id === 'dashboard' ? (
                        <DashboardPage />
                      ) : id === 'transactions' ? (
                        <TransactionsPage />
                      ) : id === 'schedules' ? (
                        <SchedulesPage />
                      ) : id === 'capture' ? (
                        <CapturePage />
                      ) : id === 'settings' ? (
                        <SettingsPage />
                      ) : (
                        <Placeholder id={id} />
                      )
                    }
                  />
                ))}
                <Route
                  path="*"
                  element={
                    <section>
                      <h1 tabIndex={-1} className="text-3xl font-semibold">
                        {t('notFound')}
                      </h1>
                      <p className="my-4">{t('notFoundBody')}</p>
                      <Link className="underline" to="/">
                        {t('back')}
                      </Link>
                    </section>
                  }
                />
              </Routes>
            </ErrorBoundary>
            <footer className="mt-10 text-xs text-muted">{t('footer')}</footer>
          </main>
        </div>
      </div>
    </>
  );
}
