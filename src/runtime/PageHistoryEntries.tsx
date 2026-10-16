import { useLocation, useNavigate, usePage } from '@rspress/core/runtime';
import { useCallback } from 'react';
import { splitCommitDate } from './commit';
import { loadPageIndex } from './fetch';
import {
  HISTORY_PARAM,
  listPageHistory,
  type PageHistoryList,
  withHistoryParam,
  withoutHistoryParam,
} from './pageHistory';
import { useText } from './text';
import { useAsync } from './useAsync';

// History entries the plugin places and themes can place. They only change the
// URL; the drawer, a global component, opens when the URL has `?history`.

/** Marks a history entry that this page pushed, so that closing can go back. */
const OPENED_HERE = 'rpGitDiffHistory';

/**
 * The history of the current page, or undefined while it loads or when the page
 * has none (no index, or nothing to list).
 */
export function usePageHistory(maxRevisions = Number.POSITIVE_INFINITY): PageHistoryList | undefined {
  const { page } = usePage();
  const routePath = page.routePath;
  const index = useAsync(() => loadPageIndex(routePath), [routePath]);
  if (index.kind !== 'done') {
    return undefined;
  }
  const list = listPageHistory(index.value, maxRevisions);
  return list.revisions.length > 0 ? list : undefined;
}

/** Whether the history is open, with functions that open and close it. */
export function useHistoryParam(): {
  open: boolean;
  openHref: string;
  openHistory: () => void;
  closeHistory: () => void;
} {
  const location = useLocation();
  const navigate = useNavigate();
  const open = new URLSearchParams(location.search).has(HISTORY_PARAM);
  const openHref = withHistoryParam(location.search);
  const openHistory = useCallback(() => {
    navigate(
      { pathname: location.pathname, search: withHistoryParam(location.search), hash: location.hash },
      { state: { [OPENED_HERE]: true } },
    );
  }, [location, navigate]);
  const closeHistory = useCallback(() => {
    // Going back keeps the browser history as it was before the drawer opened.
    if ((location.state as Record<string, unknown> | null)?.[OPENED_HERE]) {
      navigate(-1);
      return;
    }
    navigate(
      { pathname: location.pathname, search: withoutHistoryParam(location.search), hash: location.hash },
      { replace: true },
    );
  }, [location, navigate]);
  return { open, openHref, openHistory, closeHistory };
}

/** Handles a plain click in the page, and leaves the others (new tab) to the browser. */
function useOpenOnClick(): (event: React.MouseEvent) => void {
  const { openHistory } = useHistoryParam();
  return (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    openHistory();
  };
}

/**
 * A line that opens the history, with the number of changes and the date of the
 * last one. Placed before the doc footer, or in a theme slot such as
 * `beforeDocFooter`.
 */
export function PageHistoryLink() {
  const t = useText();
  const history = usePageHistory();
  const { openHref } = useHistoryParam();
  const onClick = useOpenOnClick();
  if (!history?.latest) {
    return null;
  }
  const { date } = splitCommitDate(history.latest.date);
  return (
    <p className="rp-git-diff-history-link">
      <a href={openHref} onClick={onClick}>
        {history.changes > 0
          ? t('gitDiffHistoryEntry', { count: String(history.changes), date })
          : t('gitDiffHistoryAddedOnly', { date })}
      </a>
    </p>
  );
}

/** A button that opens the history, for the navigation bar (`afterNavMenu`). */
export function PageHistoryButton() {
  const t = useText();
  const history = usePageHistory();
  const { openHref } = useHistoryParam();
  const onClick = useOpenOnClick();
  if (!history) {
    return null;
  }
  return (
    <a
      className="rp-git-diff-history-button"
      href={openHref}
      onClick={onClick}
      aria-label={t('gitDiffOpenHistory')}
      title={t('gitDiffOpenHistory')}
    >
      <HistoryIcon />
    </a>
  );
}

/** A clock with an arrow running back around it. */
function HistoryIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
