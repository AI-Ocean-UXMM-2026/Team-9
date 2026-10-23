import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Coffee,
  Eye,
  EyeOff,
  LockKeyhole,
  ReceiptText,
  ShoppingBasket,
  Wallet,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthProvider';
import { BrandMark } from '../components/BrandMark';

const cards = [
  {
    label: 'Market receipt',
    amount: '12,500 MMK',
    icon: ReceiptText,
    x: '57%',
    y: '17%',
    angle: '-11deg',
    tone: 'lavender',
  },
  {
    label: 'Income',
    amount: '+85,000 MMK',
    icon: Wallet,
    x: '83%',
    y: '23%',
    angle: '9deg',
    tone: 'blue',
  },
  {
    label: 'Utilities',
    amount: '18,000 MMK',
    icon: Zap,
    x: '52%',
    y: '47%',
    angle: '5deg',
    tone: 'lavender',
  },
  {
    label: 'Coffee',
    amount: '4,500 MMK',
    icon: Coffee,
    x: '91%',
    y: '48%',
    angle: '-8deg',
    tone: 'blue',
  },
  {
    label: 'Side project',
    amount: '+32,000 MMK',
    icon: BriefcaseBusiness,
    x: '72%',
    y: '81%',
    angle: '-10deg',
    tone: 'mint',
  },
  {
    label: 'Groceries',
    amount: '24,000 MMK',
    icon: ShoppingBasket,
    x: '92%',
    y: '84%',
    angle: '9deg',
    tone: 'lavender',
  },
];

export function AccessPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth()!;
  const mode =
    location.pathname === '/login'
      ? 'login'
      : location.pathname === '/register'
        ? 'register'
        : 'landing';
  const [destination] = useState(() =>
    ['/login', '/register', '/welcome', '/'].includes(location.pathname)
      ? '/'
      : location.pathname,
  );
  const active = mode !== 'landing';
  useEffect(() => {
    document.title = `${mode === 'landing' ? 'Welcome' : mode === 'register' ? 'Create account' : 'Sign in'} · ${t('brand')}`;
  }, [mode, t]);
  return (
    <main className="access-stage" data-view={active ? 'auth' : 'landing'}>
      <header className="access-nav">
        <Link to="/" className="access-brand-link">
          <span>
            <BrandMark />
          </span>
          <strong>{t('brand')}</strong>
        </Link>
        <Link
          className="access-nav-link"
          to={mode === 'login' ? '/register' : '/login'}
        >
          {mode === 'login' ? 'Create account' : 'Sign in'}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>
      <section className="access-hero" aria-hidden={active}>
        <p className="access-eyebrow">
          <span />
          Your finances, in one place
        </p>
        <h1>
          Bring your
          <br />
          money
          <br />
          <em>together.</em>
        </h1>
        <p className="access-hero-description">
          Make sense of every little spend and every bit of income, all in one
          calm place.
        </p>
        <button
          type="button"
          className="access-get-started"
          disabled={active}
          onClick={() => navigate('/register')}
        >
          Get started
          <ArrowRight size={20} aria-hidden="true" />
        </button>
        <p className="access-privacy">
          <LockKeyhole size={15} aria-hidden="true" />A personal space for your
          financial records
        </p>
      </section>
      <div className="access-receipts" aria-hidden="true">
        {cards.map((card, index) => (
          <div
            key={card.label}
            className={`access-card access-card-${index + 1}`}
            style={
              {
                '--card-x': card.x,
                '--card-y': card.y,
                '--card-angle': card.angle,
                '--card-delay': `${index * 35}ms`,
                '--float-delay': `${index * -0.7}s`,
              } as CSSProperties
            }
          >
            <div className={`access-card-face access-card-${card.tone}`}>
              <span className="access-card-icon">
                <card.icon size={22} strokeWidth={1.7} />
              </span>
              <div className="access-card-copy">
                <strong>{card.label}</strong>
                <small>{card.amount}</small>
              </div>
            </div>
          </div>
        ))}
      </div>
      <section className="access-brand-reveal" aria-hidden={!active}>
        <span className="access-logo-reveal">
          <BrandMark />
        </span>
        <h2>{t('brand')}</h2>
        <p>
          Your records.
          <br />
          One clear picture.
        </p>
      </section>
      {active ? (
        <section
          className="access-form-panel"
          key={mode}
          aria-label={mode === 'register' ? 'Create account' : 'Sign in'}
        >
          <Link to="/" className="access-back">
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </Link>
          <AuthForm mode={mode} destination={destination} />
        </section>
      ) : null}
      {!active && auth.error ? (
        <p className="access-connection-note" role="status">
          {auth.error}
        </p>
      ) : null}
      <footer className="access-footer">
        <span>Small steps. A clearer picture.</span>
        <span>Built for everyday money</span>
      </footer>
    </main>
  );
}

function AuthForm({
  mode,
  destination,
}: {
  mode: 'register' | 'login';
  destination: string;
}) {
  const auth = useAuth()!;
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const timer = setTimeout(
      () => inputRef.current?.focus({ preventScroll: true }),
      matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700,
    );
    return () => clearTimeout(timer);
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError('');
    if (mode === 'register' && password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await auth.authenticate(mode, { name, email, password });
      setPassword('');
      setConfirm('');
      navigate(destination, { replace: true });
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <>
      <p className="access-form-eyebrow">YOUR EVERYDAY MONEY COMPANION</p>
      <h1>{mode === 'register' ? 'A clearer start.' : 'Welcome back.'}</h1>
      <p className="access-form-description">
        {mode === 'register'
          ? 'Create your account and bring your records together.'
          : 'Sign in to pick up where you left off.'}
      </p>
      <form className="access-form" onSubmit={submit}>
        {mode === 'register' ? (
          <label>
            Your name
            <input
              ref={inputRef}
              autoComplete="name"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              placeholder="How should we call you?"
              required
              disabled={submitting}
            />
          </label>
        ) : null}
        <label>
          Email address
          <input
            ref={mode === 'login' ? inputRef : undefined}
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            disabled={submitting}
          />
        </label>
        <label>
          Password
          <div className="access-password-wrap">
            <input
              type={visible ? 'text' : 'password'}
              autoComplete={
                mode === 'register' ? 'new-password' : 'current-password'
              }
              minLength={mode === 'register' ? 8 : 1}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                mode === 'register'
                  ? 'At least 8 characters'
                  : 'Enter your password'
              }
              aria-describedby={
                mode === 'register' ? 'password-help' : undefined
              }
              required
              disabled={submitting}
            />
            <button
              type="button"
              aria-label={visible ? 'Hide password' : 'Show password'}
              aria-pressed={visible}
              onClick={() => setVisible((value) => !value)}
            >
              {visible ? (
                <EyeOff size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
            </button>
          </div>
        </label>
        {mode === 'register' ? (
          <>
            <p id="password-help" className="access-password-help">
              Use at least 8 characters. A longer phrase works well.
            </p>
            <label>
              Confirm password
              <input
                type={visible ? 'text' : 'password'}
                autoComplete="new-password"
                maxLength={128}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Enter it once more"
                required
                disabled={submitting}
              />
            </label>
          </>
        ) : null}
        {error || auth.error ? (
          <p className="access-form-error" role="alert">
            {error || auth.error}
          </p>
        ) : null}
        <button className="access-submit" disabled={submitting}>
          {submitting
            ? mode === 'register'
              ? 'Creating account…'
              : 'Signing in…'
            : mode === 'register'
              ? 'Create account'
              : 'Sign in'}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>
      <p className="access-form-switch">
        {mode === 'register' ? 'Already have an account?' : 'New here?'}{' '}
        <Link to={mode === 'register' ? '/login' : '/register'}>
          {mode === 'register' ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
      <p className="access-form-privacy">
        <LockKeyhole size={13} aria-hidden="true" />
        Your account keeps your workspace separate.
      </p>
    </>
  );
}
