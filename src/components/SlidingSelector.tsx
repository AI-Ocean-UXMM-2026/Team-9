import { useLayoutEffect, useRef, type HTMLAttributes } from 'react';

type SlidingSelectorProps = HTMLAttributes<HTMLElement> & {
  as?: 'nav' | 'div';
  selectionKey: string;
  selectedSelector?: string;
};

/** A shared highlight follows the selected control without remounting it. */
export function SlidingSelector({
  as = 'div',
  selectionKey,
  selectedSelector = '[aria-current="page"], [aria-pressed="true"]',
  className = '',
  children,
  ...props
}: SlidingSelectorProps) {
  const rootRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let disposed = false;
    let frame = 0;
    const measure = () => {
      if (disposed) return;
      const selected = root.querySelector<HTMLElement>(selectedSelector);
      if (!selected || !selected.offsetWidth) {
        root.dataset.measured = 'false';
        return;
      }
      root.style.setProperty('--selection-x', `${selected.offsetLeft}px`);
      root.style.setProperty('--selection-y', `${selected.offsetTop}px`);
      root.style.setProperty('--selection-width', `${selected.offsetWidth}px`);
      root.style.setProperty(
        '--selection-height',
        `${selected.offsetHeight}px`,
      );
      root.dataset.measured = 'true';
      if (root.dataset.motionReady !== 'true') {
        frame = requestAnimationFrame(() => {
          root.dataset.motionReady = 'true';
        });
      }
    };
    measure();
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(measure)
        : null;
    observer?.observe(root);
    root
      .querySelectorAll<HTMLElement>('a, button')
      .forEach((control) => observer?.observe(control));
    document.fonts?.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [selectionKey, selectedSelector]);

  const content = (
    <>
      <span className="sliding-selection-indicator" aria-hidden="true" />
      {children}
    </>
  );
  const ref = (node: HTMLElement | null) => {
    rootRef.current = node;
  };
  return as === 'nav' ? (
    <nav {...props} ref={ref} className={`sliding-selector ${className}`}>
      {content}
    </nav>
  ) : (
    <div {...props} ref={ref} className={`sliding-selector ${className}`}>
      {content}
    </div>
  );
}
