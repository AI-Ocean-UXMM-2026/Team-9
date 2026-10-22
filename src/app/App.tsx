import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  ArrowDownUp,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { screens } from './routes';
import { Button } from '../components/ui/button';
import { Placeholder } from '../features/Placeholder';
import { CapturePage } from '../features/CapturePage';
import { ChatPage, ForecastPage, OwedPage } from '../features/AnalysisPages';
import { ReadinessPage } from '../features/ReadinessPage';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useDemoStore } from '../store/demoStore';
import {
  DashboardPage,
  SchedulesPage,
  SettingsPage,
  TransactionsPage,
} from '../features/FinancialPages';

const mobileDestinations = [
  { id: 'dashboard', path: '/', icon: LayoutDashboard },
  { id: 'transactions', path: '/transactions', icon: ArrowDownUp },
  { id: 'schedules', path: '/schedules', icon: CalendarDays },
] as const;

function ScrollMark({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      fill="none"
      className={className}
    >
      <path
        d="M11 9.5h18a3.5 3.5 0 0 1 0 7H14.5a3.5 3.5 0 0 0 0 7H29a3.5 3.5 0 0 1 0 7H11a3.5 3.5 0 0 1 0-7h14.5a3.5 3.5 0 0 0 0-7H11a3.5 3.5 0 0 1 0-7Z"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 13V27"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

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
      {storageNotice ? (
        <div className="storage-notice" role="status">
          <span>{storageNotice}</span>
          <button
            className="pill-button pill-button-quiet"
            onClick={() => useDemoStore.getState().dismissStorageNotice()}
          >
            {t('dismiss')}
          </button>
        </div>
      ) : null}
      <div className="app-frame">
        {open ? (
          <button
            className="nav-backdrop lg:hidden"
            aria-label={t('dismissNavigation', {
              defaultValue: 'Dismiss navigation',
            })}
            onClick={() => setOpen(false)}
          />
        ) : null}
        <aside
          id="app-navigation"
          className={`app-sidebar ${open ? 'app-sidebar-open' : ''}`}
        >
          <Link to="/" className="brand-lockup" onClick={() => setOpen(false)}>
            <span className="brand-symbol">
              <ScrollMark className="size-7" />
            </span>
            <span className="brand-name">{t('brand')}</span>
          </Link>
          <div className="sidebar-caption">{t('workspace')}</div>
          <nav aria-label={t('navigation')} className="primary-navigation">
            {screens.map(({ id, path, icon: Icon }) => (
              <NavLink
                key={id}
                to={path}
                end={path === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `navigation-link${isActive ? ' navigation-link-active' : ''}`
                }
              >
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span>{t(`${id}.nav`)}</span>
                <ChevronRight
                  className="navigation-chevron"
                  size={15}
                  aria-hidden="true"
                />
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-help-icon">
              <CircleHelp size={18} />
            </div>
            <p>{t('tagline')}</p>
          </div>
        </aside>
        <div className="app-main-column">
          <header className="topbar">
            <Button
              variant="ghost"
              size="icon-lg"
              className="icon-button mobile-menu-button lg:hidden"
              aria-label={t(open ? 'close' : 'menu')}
              aria-expanded={open}
              aria-controls="app-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={21} /> : <Menu size={21} />}
            </Button>
            <Link
              to="/"
              className="mobile-brand lg:hidden"
              onClick={() => setOpen(false)}
            >
              <span className="brand-symbol">
                <ScrollMark className="size-6" />
              </span>
              <span>{t('brand')}</span>
            </Link>
            <div className="topbar-context hidden lg:block">
              <span className="topbar-dot" />
              {t('demoWorkspace', { defaultValue: 'Personal workspace' })}
            </div>
            <div className="topbar-actions">
              <span
                className="demo-badge"
                title={t('demo')}
                aria-label={t('demo')}
              >
                <FlaskConical size={14} />
                {t('demoMode', { defaultValue: 'Synthetic data' })}
              </span>
              <Link
                className="avatar-button"
                to="/settings"
                aria-label={t('settings.nav')}
              >
                <Settings className="size-5" strokeWidth={1.8} />
              </Link>
            </div>
          </header>
          <main id="main" tabIndex={-1} className="page-content">
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
                      ) : id === 'owed' ? (
                        <OwedPage />
                      ) : id === 'insights' ? (
                        <ForecastPage />
                      ) : id === 'chat' ? (
                        <ChatPage />
                      ) : id === 'settings' ? (
                        <SettingsPage />
                      ) : id === 'readiness' ? (
                        <ReadinessPage />
                      ) : (
                        <Placeholder id={id} />
                      )
                    }
                  />
                ))}
                <Route
                  path="*"
                  element={
                    <section className="surface-card p-8">
                      <h1 tabIndex={-1} className="text-3xl font-semibold">
                        {t('notFound')}
                      </h1>
                      <p className="my-4 text-muted-foreground">
                        {t('notFoundBody')}
                      </p>
                      <Link className="text-primary underline" to="/">
                        {t('back')}
                      </Link>
                    </section>
                  }
                />
              </Routes>
            </ErrorBoundary>
            <footer className="app-footer">{t('footer')}</footer>
          </main>
          <nav
            className="mobile-bottom-nav lg:hidden"
            aria-label={t('quickNavigation', {
              defaultValue: 'Quick navigation',
            })}
          >
            {mobileDestinations.map(({ id, path, icon: Icon }) => (
              <NavLink
                key={id}
                to={path}
                end={path === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `mobile-tab${isActive ? ' mobile-tab-active' : ''}`
                }
              >
                <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                <span>{t(`${id}.nav`)}</span>
              </NavLink>
            ))}
            <button
              className={`mobile-tab${open ? ' mobile-tab-active' : ''}`}
              onClick={() => setOpen(!open)}
              aria-expanded={open}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
              <span>{t('more', { defaultValue: 'More' })}</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}
