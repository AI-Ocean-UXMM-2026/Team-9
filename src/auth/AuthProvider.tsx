import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { z } from 'zod';
import {
  accountRequest,
  okSchema,
  sessionSchema,
  userSchema,
  workspaceSchema,
  type AccountUser,
} from '../services/accounts';
import { useDemoStore } from '../store/demoStore';
import { STORAGE_KEY } from '../store/persistence';
import { emptyAppData, persistedStoreSchema } from '../domain/types';
import { createSampleData, DEMO_INSTANT } from '../demo/sampleData';
import { setDemoClock } from '../services/clock';

const DEMO_FLAG = 'shwe-try-demo';
const DEMO_STORAGE = `${STORAGE_KEY}:try-demo`;
const demoWasActive = () => {
  try {
    return sessionStorage.getItem(DEMO_FLAG) === '1';
  } catch {
    return false;
  }
};

interface AuthValue {
  isDemo: boolean;
  startDemo(): Promise<void>;
  exitDemo(): Promise<void>;
  resetDemo(): void;
  user: AccountUser | null;
  loading: boolean;
  error: string;
  sync: 'saved' | 'saving' | 'error';
  canImport: boolean;
  authenticate(
    mode: 'login' | 'register',
    fields: { name: string; email: string; password: string },
  ): Promise<void>;
  signOut(): Promise<void>;
  updateProfile(fields: {
    name: string;
    email: string;
    currentPassword?: string;
  }): Promise<void>;
  deleteAccount(password: string): Promise<void>;
  importLocalRecords(): void;
  retrySync(): Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);
export const useAuth = () => useContext(AuthContext);
const userStorageKey = (id: string) => `${STORAGE_KEY}:user:${id}`;
function readWorkspace(key: string) {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    const wrapped = z.object({ state: persistedStoreSchema }).safeParse(raw);
    return wrapped.success ? wrapped.data.state : null;
  } catch {
    return null;
  }
}
function hasRecords(data: ReturnType<typeof emptyAppData>) {
  return Boolean(
    data.openingBalance ||
    data.transactions.length ||
    data.scheduleRules.length ||
    data.creditProfile,
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sync, setSync] = useState<AuthValue['sync']>('saved');
  const [canImport, setCanImport] = useState(false);
  const userRef = useRef<AccountUser | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const saveNow = useCallback(async () => {
    const account = userRef.current;
    if (!account) return;
    const { data, timeZone } = useDemoStore.getState();
    setSync('saving');
    try {
      localStorage.setItem(`${userStorageKey(account.id)}:pending`, '1');
    } catch {
      /* The store reports local storage failures. */
    }
    const task = queue.current
      .catch(() => undefined)
      .then(async () => {
        if (userRef.current?.id !== account.id) return;
        await accountRequest(
          'records',
          'PUT',
          { userId: account.id, data, timeZone },
          okSchema,
        );
      });
    queue.current = task;
    try {
      await task;
      if (userRef.current?.id !== account.id) return;
      const latest = useDemoStore.getState();
      if (latest.data === data && latest.timeZone === timeZone) {
        try {
          localStorage.removeItem(`${userStorageKey(account.id)}:pending`);
        } catch {
          /* Keep the browser's cache when unavailable. */
        }
        setSync('saved');
        setError('');
      }
    } catch (failure) {
      if (userRef.current?.id === account.id) {
        setSync('error');
        setError(
          failure instanceof Error
            ? failure.message
            : 'Your changes could not be synced.',
        );
      }
      throw failure;
    }
  }, []);

  const openWorkspace = useCallback(
    async (account: AccountUser, signal?: AbortSignal) => {
      const workspace = await accountRequest(
        'records',
        'GET',
        undefined,
        workspaceSchema,
        signal,
      );
      if (signal?.aborted) return;
      if (!useDemoStore.persist.hasHydrated())
        await new Promise<void>((resolve) => {
          const unsubscribe = useDemoStore.persist.onFinishHydration(() => {
            unsubscribe();
            resolve();
          });
        });
      if (signal?.aborted) return;
      const scoped = userStorageKey(account.id);
      let pending = false;
      try {
        pending = localStorage.getItem(`${scoped}:pending`) === '1';
      } catch {
        /* Server records remain available. */
      }
      const cached = pending ? readWorkspace(scoped) : null;
      const restored = cached ?? workspace;
      useDemoStore.persist.setOptions({ name: scoped });
      useDemoStore.setState({
        data: restored.data,
        timeZone: restored.timeZone,
        storageNotice: null,
      });
      userRef.current = account;
      setUser(account);
      setError('');
      setSync(pending ? 'saving' : 'saved');
      setCanImport(
        !hasRecords(restored.data) &&
          Boolean(
            readWorkspace(STORAGE_KEY) &&
            hasRecords(readWorkspace(STORAGE_KEY)!.data),
          ),
      );
      if (pending) void saveNow().catch(() => undefined);
    },
    [saveNow],
  );

  const resumeDemo = useCallback(async (fresh = false) => {
    if (!useDemoStore.persist.hasHydrated())
      await useDemoStore.persist.rehydrate();
    clearTimeout(timer.current);
    userRef.current = null;
    const cached = fresh ? null : readWorkspace(DEMO_STORAGE);
    useDemoStore.persist.setOptions({ name: DEMO_STORAGE });
    setDemoClock(DEMO_INSTANT);
    useDemoStore.setState({
      data: cached?.data ?? createSampleData(),
      timeZone: cached?.timeZone ?? 'Asia/Rangoon',
      storageNotice: null,
    });
    setUser(null);
    setError('');
    setCanImport(false);
    setIsDemo(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (demoWasActive()) {
      void Promise.resolve()
        .then(() => {
          if (!controller.signal.aborted) return resumeDemo();
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
      return () => controller.abort();
    }
    void accountRequest(
      'auth/session',
      'GET',
      undefined,
      sessionSchema,
      controller.signal,
    )
      .then(async (result) => {
        if (result.user) await openWorkspace(result.user, controller.signal);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : 'The account service is unavailable.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [openWorkspace, resumeDemo]);

  async function startDemo() {
    if (userRef.current) throw new Error('Sign out before starting a demo.');
    await resumeDemo(true);
    try {
      sessionStorage.setItem(DEMO_FLAG, '1');
      sessionStorage.removeItem('shwe-demo-tour-finished');
    } catch {
      /* Demo remains available without persistence. */
    }
  }
  function resetDemo() {
    if (!isDemo) return;
    useDemoStore.setState({
      data: createSampleData(),
      timeZone: 'Asia/Rangoon',
      storageNotice: null,
    });
  }
  async function exitDemo() {
    setLoading(true);
    try {
      sessionStorage.removeItem(DEMO_FLAG);
    } catch {
      /* In-memory exit still works. */
    }
    setDemoClock(null);
    clearWorkspace();
    setIsDemo(false);
    try {
      const result = await accountRequest(
        'auth/session',
        'GET',
        undefined,
        sessionSchema,
      );
      if (result.user) await openWorkspace(result.user);
    } catch {
      /* A guest can leave the demo even when the backend is offline. */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    const initialSave = setTimeout(() => {
      void saveNow().catch(() => undefined);
    }, 0);
    const unsubscribe = useDemoStore.subscribe((current, previous) => {
      if (
        current.data === previous.data &&
        current.timeZone === previous.timeZone
      )
        return;
      setSync('saving');
      try {
        localStorage.setItem(`${userStorageKey(user.id)}:pending`, '1');
      } catch {
        /* The store exposes local write failures. */
      }
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void saveNow().catch(() => undefined);
      }, 400);
      if (hasRecords(current.data)) setCanImport(false);
    });
    return () => {
      unsubscribe();
      clearTimeout(initialSave);
      clearTimeout(timer.current);
    };
  }, [user, saveNow]);

  function clearWorkspace() {
    clearTimeout(timer.current);
    userRef.current = null;
    setUser(null);
    setError('');
    setCanImport(false);
    useDemoStore.persist.setOptions({ name: `${STORAGE_KEY}:signed-out` });
    useDemoStore.setState({ data: emptyAppData(), storageNotice: null });
  }
  async function authenticate(
    mode: 'login' | 'register',
    fields: { name: string; email: string; password: string },
  ) {
    const result = await accountRequest(
      `auth/${mode}`,
      'POST',
      { ...fields, email: fields.email.trim() },
      z.object({ user: userSchema }),
    );
    await openWorkspace(result.user);
  }
  async function signOut() {
    clearTimeout(timer.current);
    await saveNow();
    await accountRequest('auth/logout', 'POST', {}, okSchema);
    clearWorkspace();
  }
  async function updateProfile(fields: {
    name: string;
    email: string;
    currentPassword?: string;
  }) {
    const result = await accountRequest(
      'auth/profile',
      'PATCH',
      fields,
      z.object({ user: userSchema }),
    );
    userRef.current = result.user;
    setUser(result.user);
  }
  async function deleteAccount(password: string) {
    clearTimeout(timer.current);
    await queue.current.catch(() => undefined);
    await accountRequest('auth/account', 'DELETE', { password }, okSchema);
    const id = userRef.current?.id;
    if (id)
      try {
        localStorage.removeItem(userStorageKey(id));
        localStorage.removeItem(`${userStorageKey(id)}:pending`);
      } catch {
        /* The account is deleted on the server. */
      }
    clearWorkspace();
  }
  function importLocalRecords() {
    if (!userRef.current || hasRecords(useDemoStore.getState().data)) return;
    const legacy = readWorkspace(STORAGE_KEY);
    if (legacy) {
      useDemoStore.setState({ data: legacy.data, timeZone: legacy.timeZone });
      setCanImport(false);
    }
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        isDemo,
        startDemo,
        exitDemo,
        resetDemo,
        loading,
        error,
        sync,
        canImport,
        authenticate,
        signOut,
        updateProfile,
        deleteAccount,
        importLocalRecords,
        retrySync: saveNow,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
