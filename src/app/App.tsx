import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { TFunction } from 'i18next';
import { ArrowLeftRight, CircleDollarSign, FlaskConical, Menu, Plus, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { primaryDestinations, screens, utilityDestinations } from './routes';
import { Placeholder } from '../features/Placeholder';
import { CapturePage } from '../features/CapturePage';
import { ChatPage, ForecastPage, OwedPage } from '../features/AnalysisPages';
import { ReadinessPage } from '../features/ReadinessPage';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useDemoStore } from '../store/demoStore';
import {
  DashboardPage,
  BudgetPage,
  SchedulesPage,
  SettingsPage,
  TransactionsPage,
} from '../features/FinancialPages';
import { MorePage } from '../features/MorePage';

function ScrollMark({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" fill="none" className={className}>
      <path
        d="M11 9.5h18a3.5 3.5 0 0 1 0 7H14.5a3.5 3.5 0 0 0 0 7H29a3.5 3.5 0 0 1 0 7H11a3.5 3.5 0 0 1 0-7h14.5a3.5 3.5 0 0 0 0-7H11a3.5 3.5 0 0 1 0-7Z"
        stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M8 13V27" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function routeName(pathname: string, t: TFunction) {
  if (pathname.startsWith('/payments') || pathname === '/schedules' || pathname === '/owed') return t('payments.nav');
  if (pathname.startsWith('/transactions/')) return t('transactions.nav');
  if (pathname === '/budget') return t('budget.title');
  if (pathname === '/more') return t('more.nav');
  const screen = screens.find((item) => item.path === pathname);
  return screen ? t(`${screen.id}.nav`) : t('notFound');
}

export function App() {
  const { t } = useTranslation();
  const storageNotice = useDemoStore((state) => state.storageNotice);
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const quickAddButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const quickAddRef = useRef<HTMLElement>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const isComposer = location.pathname === '/transactions/new';

  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      document.querySelector<HTMLElement>('h1')?.focus();
      previousPath.current = location.pathname;
    }
    document.title = `${routeName(location.pathname, t)} · ${t('brand')}`;
  }, [location.pathname, t]);

  useEffect(() => {
    setMobileDrawerOpen(false);
    setQuickAddOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const drawer = drawerRef.current;
    drawer?.querySelector<HTMLElement>('[data-drawer-close]')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
      if (event.key !== 'Tab' || !drawer) return;
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      ));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileDrawerOpen]);

  useEffect(() => {
    if (!quickAddOpen) return;
    const dialog = quickAddRef.current;
    dialog?.querySelector<HTMLElement>('a[href]')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setQuickAddOpen(false);
        quickAddButtonRef.current?.focus();
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [quickAddOpen]);

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
      <a className="skip-link" href="#main" onClick={(event) => {
        event.preventDefault();
        document.getElementById('main')?.focus();
      }}>{t('skip')}</a>
      {storageNotice ? (
        <div className="storage-notice" role="status">
          <span>{storageNotice}</span>
          <button className="pill-button pill-button-quiet" onClick={() => useDemoStore.getState().dismissStorageNotice()}>
            {t('dismiss')}
          </button>
        </div>
      ) : null}
      <div className="app-frame">
        <aside id="app-navigation" className="app-sidebar">
          <Link to="/" className="brand-lockup">
            <span className="brand-symbol"><ScrollMark className="size-7" /></span>
            <span className="brand-name">{t('brand')}</span>
          </Link>
          <div className="sidebar-caption">{t('navigation')}</div>
          <nav aria-label={t('navigation')} className="primary-navigation">
            {primaryDestinations.filter((item) => item.id !== 'more').map(({ id, path, icon: Icon }) => (
              <NavLink key={id} to={path} end={path === '/'} className={({ isActive }) => `navigation-link${isActive ? ' navigation-link-active' : ''}`}>
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span>{t(`${id}.nav`)}</span>
              </NavLink>
            ))}
          </nav>
          <Link className="sidebar-caption sidebar-caption-secondary sidebar-more-link" to="/more">{t('more.nav')}</Link>
          <nav aria-label={t('more.nav')} className="primary-navigation">
            {utilityDestinations.map(({ id, path, icon: Icon }) => (
              <NavLink key={id} to={path} className={({ isActive }) => `navigation-link${isActive ? ' navigation-link-active' : ''}`}>
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span>{t(`${id}.nav`)}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {mobileDrawerOpen ? (
          <>
            <button
              type="button"
              className="mobile-drawer-backdrop"
              aria-label={t('close')}
              onClick={() => {
                setMobileDrawerOpen(false);
                menuButtonRef.current?.focus();
              }}
            />
            <aside
              ref={drawerRef}
              id="mobile-drawer"
              className="mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={t('navigation')}
            >
              <div className="mobile-drawer-header">
                <Link to="/" className="brand-lockup" onClick={() => setMobileDrawerOpen(false)}>
                  <span className="brand-symbol"><ScrollMark className="size-6" /></span>
                  <span className="brand-name">{t('brand')}</span>
                </Link>
                <button
                  type="button"
                  className="drawer-close-button"
                  data-drawer-close
                  aria-label={t('close')}
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    menuButtonRef.current?.focus();
                  }}
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
              <nav aria-label={t('navigation')} className="drawer-navigation">
                {primaryDestinations.map(({ id, path, icon: Icon }) => (
                  <NavLink
                    key={id}
                    to={path}
                    end={path === '/'}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={({ isActive }) => `drawer-link${isActive || (id === 'payments' && location.pathname.startsWith('/payments')) ? ' drawer-link-active' : ''}`}
                  >
                    <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                    <span>{t(`${id}.nav`)}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="drawer-section-label">{t('more.nav')}</div>
              <nav aria-label={t('more.nav')} className="drawer-navigation">
                {utilityDestinations.map(({ id, path, icon: Icon }) => (
                  <NavLink
                    key={id}
                    to={path}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={({ isActive }) => `drawer-link${isActive ? ' drawer-link-active' : ''}`}
                  >
                    <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                    <span>{t(`${id}.nav`)}</span>
                  </NavLink>
                ))}
              </nav>
            </aside>
          </>
        ) : null}

        <div className="app-main-column">
          <header className="topbar">
            <button
              ref={menuButtonRef}
              type="button"
              className="mobile-menu-trigger lg:hidden"
              aria-label={t('menu')}
              aria-haspopup="dialog"
              aria-expanded={mobileDrawerOpen}
              aria-controls="mobile-drawer"
              onClick={() => setMobileDrawerOpen(true)}
            >
              <Menu size={21} aria-hidden="true" />
            </button>
            <Link to="/" className="mobile-brand lg:hidden">
              <span className="brand-symbol"><ScrollMark className="size-6" /></span>
              <span>{t('brand')}</span>
            </Link>
            <div className="topbar-actions">
              <span className="demo-badge" title={t('demo')} aria-label={t('demo')}>
                <FlaskConical size={14} aria-hidden="true" />{t('demoMode', { defaultValue: 'Synthetic data' })}
              </span>
            </div>
          </header>
          <main id="main" tabIndex={-1} className="page-content">
            <ErrorBoundary key={location.pathname}>
              <Routes>
                <Route path="/transactions/new" element={<TransactionsPage />} />
                {screens.filter(({ id }) => id !== 'schedules' && id !== 'owed').map(({ id, path }) => (
                  <Route key={id} path={path} element={
                    id === 'dashboard' ? <DashboardPage />
                      : id === 'transactions' ? <TransactionsPage />
                        : id === 'capture' ? <CapturePage />
                          : id === 'insights' ? <ForecastPage />
                            : id === 'chat' ? <ChatPage />
                              : id === 'settings' ? <SettingsPage />
                                : id === 'readiness' ? <ReadinessPage />
                                  : <Placeholder id={id} />
                  } />
                ))}
                <Route path="/payments" element={<Navigate to="/payments/schedule" replace />} />
                <Route path="/payments/schedule" element={<SchedulesPage />} />
                <Route path="/payments/upcoming" element={<Navigate to="/payments/schedule" replace />} />
                <Route path="/payments/owed" element={<Navigate to="/payments/owed-to-me" replace />} />
                <Route path="/payments/owed-to-me" element={<OwedPage kind="to-me" />} />
                <Route path="/payments/i-owe" element={<OwedPage kind="i-owe" />} />
                <Route path="/budget" element={<BudgetPage />} />
                <Route path="/schedules" element={<Navigate to="/payments/schedule" replace />} />
                <Route path="/owed" element={<Navigate to="/payments/owed-to-me" replace />} />
                <Route path="/more" element={<MorePage />} />
                <Route path="*" element={<section className="surface-card p-8">
                  <h1 tabIndex={-1} className="text-3xl font-semibold">{t('notFound')}</h1>
                  <p className="my-4 text-muted-foreground">{t('notFoundBody')}</p>
                  <Link className="text-primary underline" to="/">{t('back')}</Link>
                </section>} />
              </Routes>
            </ErrorBoundary>
          </main>
          <nav className="mobile-bottom-nav lg:hidden" aria-label={t('navigation')}>
            {primaryDestinations.map(({ id, path, icon: Icon }) => (
              <NavLink key={id} to={path} end={path === '/'} className={({ isActive }) => {
                const utilityPage = ['/chat', '/readiness', '/settings'].includes(location.pathname);
                const active = isActive || (id === 'more' && utilityPage);
                return `mobile-tab${active ? ' mobile-tab-active' : ''}`;
              }}>
                <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                <span>{t(`${id}.nav`)}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      {!isComposer ? (
        <>
          {quickAddOpen ? (
            <>
              <button type="button" className="quick-add-backdrop" aria-label={t('close')} onClick={() => { setQuickAddOpen(false); quickAddButtonRef.current?.focus(); }} />
              <section ref={quickAddRef} className="quick-add-menu" role="dialog" aria-modal="true" aria-label={t('quickAdd.title')}>
                <Link to="/transactions/new" className="quick-add-option" onClick={() => setQuickAddOpen(false)}>
                  <span className="quick-add-icon"><ArrowLeftRight size={20} aria-hidden="true" /></span>
                  <span><strong>{t('quickAdd.transaction')}</strong><small>{t('quickAdd.transactionHelp')}</small></span>
                </Link>
                <Link to="/budget" className="quick-add-option" onClick={() => setQuickAddOpen(false)}>
                  <span className="quick-add-icon"><CircleDollarSign size={20} aria-hidden="true" /></span>
                  <span><strong>{t('quickAdd.budget')}</strong><small>{t('quickAdd.budgetHelp')}</small></span>
                </Link>
                <Link to="/capture" className="quick-add-option" onClick={() => setQuickAddOpen(false)}>
                  <span className="quick-add-icon"><Upload size={20} aria-hidden="true" /></span>
                  <span><strong>{t('quickAdd.uploadReceipt')}</strong><small>{t('quickAdd.uploadReceiptHelp')}</small></span>
                </Link>
              </section>
            </>
          ) : null}
          <button
            ref={quickAddButtonRef}
            type="button"
            className="global-add-button"
            aria-label={t('quickAdd.open')}
            aria-expanded={quickAddOpen}
            onClick={() => setQuickAddOpen((open) => !open)}
          >
            {quickAddOpen ? <X size={25} aria-hidden="true" /> : <Plus size={27} aria-hidden="true" />}
          </button>
        </>
      ) : null}
    </>
  );
}
