import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

function reducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Keeps a closing overlay mounted only for its exit transition. */
export function useAnimatedVisibility(open: boolean, duration = 200) {
  const [present, setPresent] = useState(open);
  if (open && !present) setPresent(true);
  useEffect(() => {
    if (open || !present) return;
    const timeout = window.setTimeout(
      () => setPresent(false),
      reducedMotion() ? 0 : duration,
    );
    return () => window.clearTimeout(timeout);
  }, [open, present, duration]);
  return open || present;
}

export function RouteFade({
  routeKey,
  children,
}: {
  routeKey: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element?.animate || reducedMotion()) return;
    // Opacity avoids changing the containing block of fixed chat controls.
    const animation = element.animate([{ opacity: 0.65 }, { opacity: 1 }], {
      duration: 180,
      easing: 'ease-out',
    });
    return () => animation.cancel();
  }, [routeKey]);
  return (
    <div ref={ref} className="route-view">
      {children}
    </div>
  );
}

export function CollapsiblePanel({
  open,
  children,
  id,
}: {
  open: boolean;
  children: ReactNode;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.inert = !open;
  }, [open]);
  return (
    <div
      ref={ref}
      id={id}
      className="collapsible-panel"
      data-open={open}
      aria-hidden={!open}
    >
      <div className="collapsible-panel-clip">{children}</div>
    </div>
  );
}

export function AnimatedDisclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className="insight-secondary-panel" data-open={open}>
      <button
        type="button"
        className="disclosure-trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {title}
      </button>
      <CollapsiblePanel open={open} id={id}>
        {children}
      </CollapsiblePanel>
    </section>
  );
}
