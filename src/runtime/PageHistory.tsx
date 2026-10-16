import { usePage } from '@rspress/core/runtime';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { queryHash, shortHash, splitCommitDate } from './commit';
import { DiffView, FormatToggle } from './DiffView';
import type { PageHistoryList } from './historyList';
import {
  PageHistoryButton,
  PageHistoryLink,
  useHistoryParam,
  usePageHistory,
} from './PageHistoryEntries';
import { useText } from './text';
import type { PageRevision } from './types';

type Entry = 'footer' | 'nav';

interface PageHistoryProps {
  /** Entries to place on the page; see `PageHistoryOptions` of the plugin. */
  entries: Entry[];
  maxRevisions: number;
  maxDiffLines: number;
}

/**
 * The history of the current page in a drawer, opened by `?history` in the URL.
 * Registered as a global component. A plugin cannot fill the slots of the
 * layout, so the entries are placed into the rendered page through portals.
 */
export default function PageHistory({ entries, maxRevisions, maxDiffLines }: PageHistoryProps) {
  const { open } = useHistoryParam();
  const footer = usePortalSlot(entries.includes('footer') ? placeBeforeDocFooter : undefined);
  const nav = usePortalSlot(entries.includes('nav') ? placeInNav : undefined);
  return (
    <>
      {footer && createPortal(<PageHistoryLink />, footer)}
      {nav && createPortal(<PageHistoryButton />, nav)}
      {open && <HistoryDrawer maxRevisions={maxRevisions} maxDiffLines={maxDiffLines} />}
    </>
  );
}

function HistoryDrawer({ maxRevisions, maxDiffLines }: { maxRevisions: number; maxDiffLines: number }) {
  const t = useText();
  const { page } = usePage();
  const history = usePageHistory(maxRevisions);
  const { closeHistory } = useHistoryParam();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeHistory();
    };
    window.addEventListener('keydown', onKeyDown);
    // The page behind the drawer stays where the reader left it.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [closeHistory]);

  return (
    <div className="rp-git-diff-overlay rp-git-diff-drawer-overlay" onClick={closeHistory}>
      <aside
        className="rp-git-diff-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t('gitDiffHistory')}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="rp-git-diff-panel-header">
          <div className="rp-git-diff-panel-title">
            <strong>{t('gitDiffHistory')}</strong>
            {page.title && <span className="rp-git-diff-meta">{page.title}</span>}
          </div>
          <FormatToggle />
          <button type="button" className="rp-git-diff-button" onClick={closeHistory}>
            {t('gitDiffClose')}
          </button>
        </header>
        <div className="rp-git-diff-drawer-body">
          <HistoryList history={history} maxDiffLines={maxDiffLines} />
        </div>
      </aside>
    </div>
  );
}

function HistoryList({
  history,
  maxDiffLines,
}: {
  history: PageHistoryList | undefined;
  maxDiffLines: number;
}) {
  const t = useText();
  if (!history) {
    return <p className="rp-git-diff-message">{t('gitDiffNoHistory')}</p>;
  }
  return (
    <div className="rp-git-diff-log">
      {history.revisions.map((revision) => (
        <RevisionEntry key={revision.hash} revision={revision} maxDiffLines={maxDiffLines} />
      ))}
      {history.omitted > 0 && (
        <p className="rp-git-diff-message">
          {t('gitDiffHistoryMore', { count: String(history.omitted) })}
        </p>
      )}
    </div>
  );
}

/** One revision, laid out like a commit on the recent changes page. */
function RevisionEntry({ revision, maxDiffLines }: { revision: PageRevision; maxDiffLines: number }) {
  const t = useText();
  const { page } = usePage();
  const { date, time, offset } = splitCommitDate(revision.date);
  const added = revision.hidden === 'added';
  return (
    <section className="rp-git-diff-commit">
      <header className="rp-git-diff-commit-header">
        <time className="rp-git-diff-date" dateTime={revision.date}>
          <span className="rp-git-diff-date-day">{date}</span>
          <span className="rp-git-diff-date-time">
            {time} <span className="rp-git-diff-date-offset">{offset}</span>
          </span>
        </time>
        <div className="rp-git-diff-commit-summary">
          {revision.subject && <div className="rp-git-diff-subject">{revision.subject}</div>}
          <div className="rp-git-diff-commit-meta">
            <code>{shortHash(revision.hash)}</code>
            {revision.author && <span>{revision.author}</span>}
          </div>
        </div>
      </header>
      <div className="rp-git-diff-changes">
        <div className="rp-git-diff-change">
          <div className="rp-git-diff-change-header">
            {added ? (
              <span className="rp-git-diff-status">{t('gitDiffAdded')}</span>
            ) : (
              // Without `history`, so that the drawer closes and the bar opens.
              <a className="rp-git-diff-open" href={`?diff=${queryHash(revision.hash)}`}>
                {t('gitDiffOpenDiff')}
              </a>
            )}
          </div>
          {!added && (
            <DiffView
              name={page.title || page.routePath}
              from={revision.prevBlob}
              to={revision.blob}
              collapseOver={maxDiffLines}
              lazy
            />
          )}
        </div>
      </div>
    </section>
  );
}

/** Puts `slot` where it belongs in the rendered page; false when there is no place. */
type Place = (slot: HTMLElement) => boolean;

/** Before the doc footer, or at the end of the document when it has no footer. */
const placeBeforeDocFooter: Place = (slot) => {
  const container = document.querySelector('.rp-doc-layout__doc-container');
  if (!container) return false;
  const footer = container.querySelector(':scope > .rp-doc-footer');
  if (footer) {
    if (slot.nextElementSibling !== footer) container.insertBefore(slot, footer);
  } else if (container.lastElementChild !== slot) {
    container.append(slot);
  }
  return true;
};

/** In the right part of the navigation bar, before the language and theme switches. */
const placeInNav: Place = (slot) => {
  const right = document.querySelector('.rp-nav__right');
  if (!right) return false;
  const others = right.querySelector(':scope > .rp-nav__others');
  if (others) {
    if (slot.nextElementSibling !== others) right.insertBefore(slot, others);
  } else if (right.lastElementChild !== slot) {
    right.append(slot);
  }
  return true;
};

/**
 * An element kept at the place `place` finds in the rendered page, for a portal.
 * The theme renders the page again on navigation, so the element is put back
 * whenever the page changes.
 */
function usePortalSlot(place: Place | undefined): HTMLElement | undefined {
  const [slot, setSlot] = useState<HTMLElement>();
  useEffect(() => {
    if (!place) return;
    const element = document.createElement('div');
    element.className = 'rp-git-diff-slot';
    const update = () => {
      if (!place(element)) element.remove();
    };
    update();
    setSlot(element);
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      element.remove();
      setSlot(undefined);
    };
  }, [place]);
  return slot;
}
