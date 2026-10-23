import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SlidingSelector } from '../components/SlidingSelector';

export function PaymentsLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <div className="payments-page">
      <header className="page-heading">
        <h1 tabIndex={-1}>{t('payments.title')}</h1>
        <SlidingSelector
          as="nav"
          className="section-tabs"
          aria-label={t('payments.nav')}
          selectionKey={pathname}
        >
          {[
            ['schedule', 'schedule'],
            ['owed-to-me', 'owedToMe'],
            ['i-owe', 'iOwe'],
          ].map(([path, label]) => (
            <NavLink
              key={path}
              className={({ isActive }) =>
                `section-tab${isActive ? ' section-tab-active' : ''}`
              }
              to={`/payments/${path}`}
            >
              {t(`payments.${label}`)}
            </NavLink>
          ))}
        </SlidingSelector>
      </header>
      <div key={pathname} className="payments-view">
        <Outlet />
      </div>
    </div>
  );
}
