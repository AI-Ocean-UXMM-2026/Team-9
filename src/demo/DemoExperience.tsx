import { useUiText } from '../i18n/useUiText';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Play, RotateCcw, X } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { LiquidGlassLens } from '../components/LiquidGlassLens';

const steps = [
  {
    path: '/',
    title: 'Welcome to Shwe Taw Pyan Chi',
    text: 'Take a quick look around with sample business records. Use Next at your own pace, or skip the guide and explore.',
  },
  {
    path: '/',
    target: '.balance-card',
    title: 'Your money, at a glance',
    text: 'Your recorded balance combines the opening balance and confirmed payments. Pending money stays separate.',
  },
  {
    path: '/',
    target: '.movement-details',
    title: 'Understand cash movement',
    text: 'Compare income and expenses for a reporting period. These totals come from settled transactions.',
  },
  {
    path: '/',
    target: '.global-add-button',
    title: 'Start with the plus button',
    text: 'This is the shortcut to recording money, setting a budget, or uploading a receipt.',
  },
  {
    path: '/',
    target: '[data-demo-action="transaction"]',
    menu: true,
    title: 'Add a transaction',
    text: 'Record income or an expense, choose a category, and mark it paid or pending.',
  },
  {
    path: '/',
    target: '[data-demo-action="budget"]',
    menu: true,
    title: 'Set a budget',
    text: 'Choose monthly spending limits and compare them with your recorded expenses.',
  },
  {
    path: '/',
    target: '[data-demo-action="receipt"]',
    menu: true,
    title: 'Upload a receipt',
    text: 'Extract text locally from a receipt or screenshot. Review the fields before saving the transaction.',
  },
  {
    path: '/transactions/new',
    target: '.composer-amount-field',
    title: 'Keep recording simple',
    text: 'Start with the amount, then choose a date, payment status, and category. The calendar and categories work here too.',
  },
  {
    path: '/',
    target: '.balance-card',
    title: 'Back to your overview',
    text: 'As you save payments, the dashboard and reports update from the same records.',
  },
  {
    path: '/transactions',
    target: '.activity-filter-bar',
    title: 'Find a transaction quickly',
    text: 'Browse the sample history from 2025 onward. Filter by date, income, expense, or pending status.',
  },
  {
    path: '/payments/schedule',
    target: '.section-tabs',
    title: 'Stay ahead of payments',
    text: 'Schedules show one-time and monthly payments. The other tabs separate money owed to you from money you owe.',
  },
  {
    path: '/payments/owed-to-me',
    target: '.owed-total-card',
    title: 'See what is still outstanding',
    text: 'This sample business is owed 480,000 MMK. Pending payments are not added to the recorded balance.',
  },
  {
    path: '/insights',
    target: '.forecast-chart-panel',
    title: 'Look ahead',
    text: 'Compare the expected cash flow with a scenario where income arrives seven days late. These are estimates from your records.',
  },
  {
    path: '/readiness',
    target: '.credit-progress-card',
    title: 'Prepare supporting documents',
    text: 'Choose a bank, review its checklist, and export a supporting financial summary. Preparation progress is not loan approval.',
  },
  {
    path: '/more',
    target: '.utility-grid',
    title: 'More when you need it',
    text: 'Find your profile, the Ask AI demo, Credit Readiness, and Settings here.',
  },
  {
    path: '/',
    title: 'You are ready to explore',
    text: 'Try adding a sample transaction or using the filters. Demo changes stay separate from registered accounts. Create an account whenever you are ready.',
  },
] as const;
type Step = {
  path: string;
  target?: string;
  menu?: boolean;
  title: string;
  text: string;
};
const TourContext = createContext({
  active: false,
  menuOpen: false,
  advance: () => {},
});
export const useDemoTour = () => useContext(TourContext);
const wasFinished = () => {
  try {
    return sessionStorage.getItem('shwe-demo-tour-finished') === '1';
  } catch {
    return false;
  }
};

export function DemoExperience({ children }: { children: ReactNode }) {
  const text = useUiText();
  const auth = useAuth()!;
  const navigate = useNavigate();
  const [index, setIndex] = useState<number | null>(() =>
    wasFinished() ? null : 0,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const step: Step | null = index === null ? null : steps[index];
  const go = (nextIndex: number) => {
    navigate(steps[nextIndex].path);
    setIndex(nextIndex);
  };
  const finish = useCallback(() => {
    setIndex(null);
    try {
      sessionStorage.setItem('shwe-demo-tour-finished', '1');
    } catch {
      /* Guide remains skippable. */
    }
  }, []);
  async function leave(register = false) {
    setBusy(true);
    try {
      await auth.exitDemo();
      navigate(register ? '/register' : '/', { replace: true });
    } finally {
      setBusy(false);
    }
  }
  return (
    <TourContext.Provider
      value={{
        active: index !== null,
        menuOpen: Boolean(step?.menu),
        advance: () =>
          index !== null &&
          (index === steps.length - 1 ? finish() : go(index + 1)),
      }}
    >
      <div className="demo-experience" data-tour-active={index !== null}>
        <div
          className="demo-banner"
          role="region"
          aria-label={text('Demo workspace')}
        >
          <span>
            <strong>{text('Try Demo')}</strong>
            <small>
              {text(
                'Sample records · 23 Oct 2026 · Saved only in this browser',
              )}
            </small>
          </span>
          <div>
            <button type="button" onClick={() => go(0)}>
              <Play size={14} aria-hidden="true" />
              {text('Guide')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    text(
                      'Reset only this demo workspace to the original sample records?',
                    ),
                  )
                ) {
                  try {
                    auth.resetDemo();
                    navigate('/');
                    setError('');
                  } catch {
                    setError('The demo could not be reset. Please try again.');
                  }
                }
              }}
            >
              <RotateCcw size={14} aria-hidden="true" />
              {text('Reset demo')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void leave(true)}
            >
              {text('Create account')}
            </button>
            <button
              type="button"
              disabled={busy}
              aria-label={text('Exit demo')}
              onClick={() => void leave()}
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
        {error && <p role="alert">{error}</p>}
        {children}
      </div>
      {step && index !== null && (
        <TourSpotlight
          step={step}
          index={index}
          previous={() => go(Math.max(0, index - 1))}
          next={() => (index === steps.length - 1 ? finish() : go(index + 1))}
          finish={finish}
        />
      )}
    </TourContext.Provider>
  );
}

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
  radii: number[];
};
function TourSpotlight({
  step,
  index,
  previous,
  next,
  finish,
}: {
  step: Step;
  index: number;
  previous(): void;
  next(): void;
  finish(): void;
}) {
  const text = useUiText();
  const [rect, setRect] = useState<Rect | null>(null);
  const outline = useRef<HTMLDivElement>(null);
  const spotlightMotion = useRef<Animation | null>(null);
  const caption = useRef<HTMLElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  useEffect(() => () => spotlightMotion.current?.cancel(), []);
  useEffect(() => {
    let stopped = false,
      frame = 0,
      attempt = 0,
      timeout: ReturnType<typeof setTimeout>;
    let observer: ResizeObserver | undefined;
    let ready = false;
    let firstMeasurement = true;
    const updateSpotlight = (next: Rect | null) => {
      const node = outline.current;
      if (firstMeasurement && node) {
        firstMeasurement = false;
        // Read the visible position before interrupting an earlier transition.
        // The same outline survives route changes and rapid Back/Next presses.
        const from = node.getBoundingClientRect();
        const fromRadius = getComputedStyle(node).borderRadius;
        spotlightMotion.current?.cancel();
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const to = next ?? {
            left: 0,
            top: 0,
            width: window.innerWidth,
            height: window.innerHeight,
            radii: [0, 0, 0, 0],
          };
          spotlightMotion.current = node.animate(
            [
              {
                left: `${from.left}px`,
                top: `${from.top}px`,
                width: `${from.width}px`,
                height: `${from.height}px`,
                borderRadius: fromRadius,
              },
              {
                left: `${to.left}px`,
                top: `${to.top}px`,
                width: `${to.width}px`,
                height: `${to.height}px`,
                borderRadius: to.radii.map((radius) => `${radius}px`).join(' '),
              },
            ],
            { duration: 560, easing: 'cubic-bezier(.22,.75,.18,1)' },
          );
        }
      }
      setRect(next);
    };
    let placement: 'center' | 'top' | 'bottom' = 'center';
    const positionCaption = (target: DOMRect | null) => {
      const card = caption.current;
      if (!card) return;
      const viewportHeight = window.innerHeight;
      const margin = window.innerWidth <= 760 ? 14 : 24;
      const height = card.getBoundingClientRect().height;
      if (!target) placement = 'center';
      else {
        const midpoint = target.top + target.height / 2;
        // Separate thresholds prevent flipping back and forth on small scrolls.
        if (placement === 'center')
          placement = midpoint > viewportHeight * 0.55 ? 'top' : 'bottom';
        else if (placement === 'bottom' && midpoint > viewportHeight * 0.62)
          placement = 'top';
        else if (placement === 'top' && midpoint < viewportHeight * 0.5)
          placement = 'bottom';
      }
      const preferred =
        placement === 'center'
          ? (viewportHeight - height) / 2
          : placement === 'top'
            ? 18
            : viewportHeight - height - margin;
      const y = Math.max(14, Math.min(preferred, viewportHeight - height - 14));
      card.style.setProperty('--tour-caption-y', `${Math.round(y)}px`);
      card.dataset.placement = placement;
    };
    const inertNodes: {
      node: HTMLElement;
      before: boolean;
      muted: string | null;
    }[] = [];
    const measure = () => {
      if (stopped || !ready) return;
      const target = targetRef.current;
      if (!target || !target.isConnected) {
        updateSpotlight(null);
        positionCaption(null);
        return;
      }
      const r = target.getBoundingClientRect(),
        pad = 6;
      positionCaption(r);
      const left = Math.max(6, r.left - pad),
        top = Math.max(6, r.top - pad);
      const computed = getComputedStyle(target);
      const radius = (value: string) =>
        Math.min(
          r.width / 2,
          r.height / 2,
          value.includes('%')
            ? (parseFloat(value) / 100) * Math.min(r.width, r.height)
            : parseFloat(value) || 0,
        ) + pad;
      updateSpotlight({
        left,
        top,
        width: Math.max(0, Math.min(innerWidth - 6, r.right + pad) - left),
        height: Math.max(0, Math.min(innerHeight - 6, r.bottom + pad) - top),
        radii: [
          computed.borderTopLeftRadius,
          computed.borderTopRightRadius,
          computed.borderBottomRightRadius,
          computed.borderBottomLeftRadius,
        ].map(radius),
      });
    };
    const makeInert = (parent: HTMLElement, target: HTMLElement | null) => {
      for (const child of Array.from(parent.children)) {
        if (!(child instanceof HTMLElement)) continue;
        if (target && child.contains(target)) {
          if (child !== target) makeInert(child, target);
        } else {
          inertNodes.push({
            node: child,
            before: child.inert,
            muted: child.getAttribute('data-demo-muted'),
          });
          child.inert = true;
          child.setAttribute('data-demo-muted', 'true');
        }
      }
    };
    const locate = () => {
      if (stopped) return;
      const target = step.target
        ? document.querySelector<HTMLElement>(step.target)
        : null;
      if (step.target && !target && attempt++ < 35) {
        timeout = setTimeout(locate, 60);
        return;
      }
      targetRef.current = target;
      target?.scrollIntoView({
        block: 'start',
        inline: 'nearest',
        behavior: 'instant',
      });
      const root = document.getElementById('root');
      if (root) makeInert(root, target);
      caption.current
        ?.querySelector<HTMLButtonElement>('[data-tour-next]')
        ?.focus({ preventScroll: true });
      // Let navigation and its instant scroll settle before choosing the endpoint.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          ready = true;
          measure();
        });
      });
      observer = new ResizeObserver(measure);
      if (target) observer.observe(target);
      if (caption.current) observer.observe(caption.current);
      // Re-measure after brief route and disclosure animations finish.
      timeout = setTimeout(measure, 350);
    };
    frame = requestAnimationFrame(locate);
    const trackViewport = () => {
      // Follow a gesture directly; do not let the opening lag behind its target.
      spotlightMotion.current?.cancel();
      measure();
    };
    window.addEventListener('resize', trackViewport);
    window.addEventListener('scroll', trackViewport, true);
    const keys = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish();
        return;
      }
      if (e.key !== 'Tab') return;
      const elements = [
        ...(targetRef.current
          ? Array.from(
              targetRef.current.querySelectorAll<HTMLElement>(
                'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
              ),
            )
          : []),
        ...Array.from(
          caption.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled)',
          ) ?? [],
        ),
      ].filter((el) => el.getClientRects().length && !el.closest('[inert]'));
      if (
        targetRef.current?.matches(
          'button:not(:disabled), a[href], input:not(:disabled)',
        )
      )
        elements.unshift(targetRef.current);
      const first = elements[0],
        last = elements[elements.length - 1];
      if (
        e.shiftKey &&
        (!elements.includes(document.activeElement as HTMLElement) ||
          document.activeElement === first)
      ) {
        e.preventDefault();
        last?.focus();
      } else if (
        !e.shiftKey &&
        (!elements.includes(document.activeElement as HTMLElement) ||
          document.activeElement === last)
      ) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', keys, true);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
      observer?.disconnect();
      window.removeEventListener('resize', trackViewport);
      window.removeEventListener('scroll', trackViewport, true);
      window.removeEventListener('keydown', keys, true);
      inertNodes.forEach(({ node, before, muted }) => {
        node.inert = before;
        if (muted === null) node.removeAttribute('data-demo-muted');
        else node.setAttribute('data-demo-muted', muted);
      });
    };
  }, [step, finish]);
  return createPortal(
    <div className="demo-tour-layer">
      <div
        className="demo-tour-shade"
        style={{
          inset: 0,
          opacity: rect ? 0 : 1,
          pointerEvents: rect ? 'none' : 'auto',
        }}
        aria-hidden="true"
      />
      <div
        ref={outline}
        className="demo-tour-outline"
        style={{
          left: rect?.left ?? 0,
          top: rect?.top ?? 0,
          width: rect?.width ?? '100vw',
          height: rect?.height ?? '100dvh',
          borderRadius: rect
            ? rect.radii.map((radius) => `${radius}px`).join(' ')
            : 0,
          opacity: rect ? 1 : 0,
        }}
        aria-hidden="true"
      />
      <section
        ref={caption}
        className="demo-tour-caption"
        aria-label="Demo guide"
        aria-labelledby="demo-tour-title"
        onPointerMove={(event) => {
          if (
            event.pointerType !== 'mouse' ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
          )
            return;
          const bounds = event.currentTarget.getBoundingClientRect();
          event.currentTarget.style.setProperty(
            '--glass-light-x',
            `${((event.clientX - bounds.left) / bounds.width) * 100}%`,
          );
          event.currentTarget.style.setProperty(
            '--glass-light-y',
            `${((event.clientY - bounds.top) / bounds.height) * 100}%`,
          );
        }}
        onPointerLeave={(event) => {
          event.currentTarget.style.removeProperty('--glass-light-x');
          event.currentTarget.style.removeProperty('--glass-light-y');
        }}
      >
        <LiquidGlassLens />
        <div className="demo-tour-progress">
          <span>
            {index + 1} / {steps.length}
          </span>
          <button type="button" onClick={finish}>
            {text('Skip guide')}
            <X size={15} aria-hidden="true" />
          </button>
        </div>
        <h2 id="demo-tour-title">{text(step.title)}</h2>
        <p>{text(step.text)}</p>
        <div className="demo-tour-actions">
          <button type="button" disabled={index === 0} onClick={previous}>
            <ArrowLeft size={16} aria-hidden="true" />
            {text('Back')}
          </button>
          <button
            className="action-button"
            type="button"
            data-tour-next
            onClick={next}
          >
            {index === 0
              ? text('Start walkthrough')
              : index === steps.length - 1
                ? text('Explore demo')
                : text('Next')}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
