import type { Annotation } from './annotate';
import { ChangeNavigator } from './ChangeNavigator';
import { formatCommitDate, queryHash } from './commit';
import type { QueryState } from './PageDiff';
import type { ResolveError } from './resolve';
import { RevisionMeta } from './RevisionMeta';
import { useText } from './text';
import type { AsyncState } from './useAsync';

/** The bar at the bottom of the page while a change is shown on it. */
export function DiffBar({
  query,
  state,
  annotation,
  keyboard,
  onSource,
  onClose,
}: {
  query: string;
  state: QueryState;
  annotation: AsyncState<Annotation>;
  /** Whether the keys for moving between changes are active. */
  keyboard: boolean;
  onSource?: () => void;
  onClose: () => void;
}) {
  const t = useText();
  const revision =
    state.kind === 'done' && state.value.result.ok ? state.value.result.target.revision : undefined;
  return (
    <div className="rp-git-diff-bar" role="region" aria-label={t('gitDiffTitle')}>
      <div className="rp-git-diff-bar-title">
        <div>
          <strong>{t('gitDiffTitle')}</strong> <code>{query}</code>
        </div>
        <RevisionMeta revision={revision} />
      </div>
      <div className="rp-git-diff-bar-status">
        <BarStatus state={state} annotation={annotation} />
      </div>
      <div className="rp-git-diff-bar-actions">
        {annotation.kind === 'done' && annotation.value.stops.length > 0 && (
          <ChangeNavigator stops={annotation.value.stops} keyboard={keyboard} />
        )}
        {onSource && (
          <button type="button" className="rp-git-diff-button" onClick={onSource}>
            {t('gitDiffSource')}
          </button>
        )}
        <button type="button" className="rp-git-diff-button" onClick={onClose}>
          {t('gitDiffClose')}
        </button>
      </div>
    </div>
  );
}

/** What the reader should know: progress, a problem, or the legend of the marks. */
function BarStatus({
  state,
  annotation,
}: {
  state: QueryState;
  annotation: AsyncState<Annotation>;
}) {
  const t = useText();
  switch (state.kind) {
    case 'idle':
    case 'loading':
      return <span>{t('gitDiffLoading')}</span>;
    case 'no-history':
      return <span>{t('gitDiffNoHistory')}</span>;
    case 'error':
      return <span>{t('gitDiffLoadError')}</span>;
  }
  const { result } = state.value;
  if (!result.ok) {
    return <ResolveErrorMessage error={result.error} />;
  }
  if (result.target.from === result.target.to) {
    return <span>{t('gitDiffNoChange')}</span>;
  }
  switch (annotation.kind) {
    case 'idle':
    case 'loading':
      return <span>{t('gitDiffLoading')}</span>;
    case 'error':
      return <span>{t('gitDiffLoadError')}</span>;
  }
  const { markers, unplaced } = annotation.value;
  return (
    <>
      <Legend later={markers.some(isLaterMark)} />
      {markers.length === 0 && <span>{t('gitDiffNoMarks')}</span>}
      {unplaced > 0 && <span>{t('gitDiffUnplaced', { count: String(unplaced) })}</span>}
    </>
  );
}

function isLaterMark(marker: HTMLElement): boolean {
  return [...marker.classList].some((name) => name.startsWith('rp-git-diff-later'));
}

/** The colors of the marks; "changed again later" appears only when it is used. */
function Legend({ later }: { later: boolean }) {
  const t = useText();
  return (
    <span className="rp-git-diff-legend">
      <span className="rp-git-diff-swatch rp-git-diff-swatch-added" />
      {t('gitDiffLegendAdded')}
      <span className="rp-git-diff-swatch rp-git-diff-swatch-deleted" />
      {t('gitDiffLegendDeleted')}
      {later && (
        <>
          <span className="rp-git-diff-swatch rp-git-diff-swatch-later" />
          {t('gitDiffLegendLater')}
        </>
      )}
    </span>
  );
}

function ResolveErrorMessage({ error }: { error: ResolveError }) {
  const t = useText();
  switch (error.kind) {
    case 'syntax':
      return <span>{t('gitDiffSyntax')}</span>;
    case 'not-found':
      return <span>{t('gitDiffNotFound', { rev: error.rev })}</span>;
    case 'ambiguous':
      return (
        <span>
          {t('gitDiffAmbiguous', { rev: error.rev })}{' '}
          {error.candidates.map((candidate) => (
            <a
              key={candidate.hash}
              className="rp-git-diff-candidate"
              href={`?diff=${queryHash(candidate.hash)}`}
            >
              <code>{queryHash(candidate.hash)}</code> {formatCommitDate(candidate.date)}
            </a>
          ))}
        </span>
      );
  }
}
