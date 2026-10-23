import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, UserRound } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { AnimatedDisclosure } from '../components/Motion';

export function AccountControls() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!auth?.user) return null;
  return (
    <div className="account-controls">
      <Link
        to="/profile"
        className="account-profile-link"
        title={auth.user.email}
      >
        <UserRound size={18} aria-hidden="true" />
        <span>
          {auth.user.name}
          <small>
            {auth.sync === 'saving'
              ? 'Saving…'
              : auth.sync === 'error'
                ? 'Sync needs attention'
                : 'Saved'}
          </small>
        </span>
      </Link>
      <button
        type="button"
        className="account-sign-out"
        aria-label="Sign out"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError('');
          void auth
            .signOut()
            .then(() => navigate('/'))
            .catch((failure) =>
              setError(
                failure instanceof Error
                  ? failure.message
                  : 'Could not sign out.',
              ),
            )
            .finally(() => setBusy(false));
        }}
      >
        <LogOut size={18} aria-hidden="true" />
      </button>
      {error ? (
        <span className="sr-only" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function AccountNotices() {
  const auth = useAuth();
  if (!auth?.user) return null;
  return (
    <>
      {auth.canImport ? (
        <div className="account-import-notice">
          <span>A previous local workspace is available in this browser.</span>
          <button type="button" onClick={auth.importLocalRecords}>
            Import into this account
          </button>
        </div>
      ) : null}
      {auth.sync === 'error' ? (
        <div className="account-sync-notice" role="status">
          <span>
            {auth.error ||
              'Your changes are kept in this browser but have not synced.'}
          </span>
          <button
            type="button"
            onClick={() => void auth.retrySync().catch(() => undefined)}
          >
            Retry sync
          </button>
        </div>
      ) : null}
    </>
  );
}

export function AccountSettings() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!auth?.user) return null;
  async function remove(event: FormEvent) {
    event.preventDefault();
    if (
      !auth ||
      busy ||
      !window.confirm(
        'Permanently delete your account and its saved financial records? This cannot be undone.',
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await auth.deleteAccount(password);
      setPassword('');
      navigate('/', { replace: true });
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not delete the account.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="surface-card account-settings">
      <h2>Your account</h2>
      <p className="account-settings-name">{auth.user.name}</p>
      <p>{auth.user.email}</p>
      <p className="account-storage-help">
        Your records are saved to your account on this server. Receipt images
        stay on your device.
      </p>
      <AnimatedDisclosure title="Delete account">
        <form className="account-delete-form" onSubmit={remove}>
          <p>
            This permanently removes your registered account, sessions and saved
            records from this server.
          </p>
          <label>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              maxLength={128}
              required
            />
          </label>
          {error ? <p role="alert">{error}</p> : null}
          <button type="submit" disabled={busy}>
            {busy ? 'Deleting…' : 'Delete my account'}
          </button>
        </form>
      </AnimatedDisclosure>
    </section>
  );
}
