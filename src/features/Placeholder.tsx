import { ArrowUpRight, Construction, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ScreenId } from '../app/routes';
export function Placeholder({ id }: { id: ScreenId }) {
  const { t } = useTranslation();
  const items = t(`${id}.items`, { returnObjects: true }) as string[];
  return (
    <>
      <section className="mb-9 max-w-3xl">
        <p className="mb-4 text-xs font-bold tracking-[.18em] text-accent">
          {t('prototype')}
        </p>
        <h1
          tabIndex={-1}
          className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl"
        >
          {t(`${id}.title`)}
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
          {t(`${id}.description`)}
        </p>
      </section>
      <section className="rounded-3xl border border-[#dce4dc] bg-white p-6 sm:p-9">
        <div className="mb-7 flex flex-wrap items-center gap-3">
          <span className="rounded-xl bg-[#edf3ec] p-3">
            <Construction aria-hidden="true" size={24} />
          </span>
          <span className="rounded-full bg-[#f5efdf] px-3 py-1 text-sm font-semibold text-[#725716]">
            {t('status')}
          </span>
        </div>
        <h2 className="text-xl font-semibold">{t('planned')}</h2>
        <p className="mt-2 max-w-xl leading-relaxed text-muted">{t('scope')}</p>
        <ul className="mt-7 grid gap-4">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <Check
                className="mt-1 shrink-0 text-accent"
                size={17}
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 border-t border-[#e4e9e2] pt-5 text-sm text-muted">
          {t('noData')}
        </p>
      </section>
      {id === 'dashboard' ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(['transactions', 'schedules'] as const).map((target) => (
            <Link
              key={target}
              to={`/${target}`}
              className="flex min-h-20 items-center justify-between rounded-2xl border border-[#dce4dc] bg-[#eef2e9] px-6 font-semibold hover:bg-white"
            >
              {t(`${target}.nav`)}
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
