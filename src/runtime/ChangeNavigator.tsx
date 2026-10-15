import { useCallback, useEffect, useState } from 'react';
import { useText } from './text';

const CURRENT_CLASS = 'rp-git-diff-current';

/**
 * Moves between the changes with the buttons or the keys n/j and p/k. The buttons
 * are hidden while every change is already on the screen and the reader has not
 * started moving.
 */
export function ChangeNavigator({ stops, keyboard }: { stops: HTMLElement[][]; keyboard: boolean }) {
  const t = useText();
  // -1 until the reader moves; the page starts scrolled to the first change.
  const [current, setCurrent] = useState(-1);
  const allVisible = useAllOnScreen(stops);

  useEffect(() => {
    const first = stops[0]?.[0];
    if (first && !isOnScreen(first)) {
      first.scrollIntoView({ block: 'center' });
    }
  }, [stops]);

  useEffect(() => {
    const stop = stops[current];
    if (!stop) return;
    for (const element of stop) element.classList.add(CURRENT_CLASS);
    stop[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    return () => {
      for (const element of stop) element.classList.remove(CURRENT_CLASS);
    };
  }, [stops, current]);

  const move = useCallback(
    (step: 1 | -1) =>
      setCurrent((index) => {
        if (index === -1) return step > 0 ? 0 : stops.length - 1;
        return (index + step + stops.length) % stops.length;
      }),
    [stops.length],
  );
  useMoveKeys(keyboard, move);

  const count =
    current === -1
      ? t('gitDiffChangeCount', { count: String(stops.length) })
      : `${current + 1} / ${stops.length}`;
  if (allVisible && current === -1) {
    return <span className="rp-git-diff-counter">{count}</span>;
  }
  return (
    <span className="rp-git-diff-navigator">
      <button
        type="button"
        className="rp-git-diff-button"
        onClick={() => move(-1)}
        aria-label={t('gitDiffPrev')}
        title={`${t('gitDiffPrev')} (p, k)`}
      >
        ↑
      </button>
      <span className="rp-git-diff-counter">{count}</span>
      <button
        type="button"
        className="rp-git-diff-button"
        onClick={() => move(1)}
        aria-label={t('gitDiffNext')}
        title={`${t('gitDiffNext')} (n, j)`}
      >
        ↓
      </button>
    </span>
  );
}

/** n or j moves forward and p or k backward, except while the reader is typing. */
function useMoveKeys(enabled: boolean, move: (step: 1 | -1) => void): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) return;
      if (event.key === 'n' || event.key === 'j') move(1);
      else if (event.key === 'p' || event.key === 'k') move(-1);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, move]);
}

/** Whether every change is on the screen, updated as the reader scrolls. */
function useAllOnScreen(stops: HTMLElement[][]): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setVisible(stops.every((stop) => stop.every(isOnScreen))));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [stops]);
  return visible;
}

/** Whether the element is between the navigation bar and the diff bar. */
function isOnScreen(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const top = document.querySelector('.rp-nav')?.getBoundingClientRect().bottom ?? 0;
  const bottom = document.querySelector('.rp-git-diff-bar')?.getBoundingClientRect().top ?? window.innerHeight;
  return rect.top >= top && rect.bottom <= bottom;
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}
