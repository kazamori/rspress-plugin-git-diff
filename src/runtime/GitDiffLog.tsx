import { withBase } from '@rspress/core/runtime';
import { queryHash, shortHash, splitCommitDate } from './commit';
import { DiffView, FormatToggle } from './DiffView';
import { loadLogIndex } from './fetch';
import { useText } from './text';
import type { LogAssetChange, LogCommit, LogPageChange } from './types';
import { useAsync } from './useAsync';

interface GitDiffLogProps {
  /** The version and language whose changes to list, as `scopeKey` names it. */
  scope: string;
  maxDiffLines: number;
}

/**
 * Lists recent commits with the diff of each changed page, like `git log -p`.
 * The recent changes pages that the plugin adds consist of this component.
 */
export default function GitDiffLog({ scope, maxDiffLines }: GitDiffLogProps) {
  const t = useText();
  const log = useAsync(() => loadLogIndex(scope), [scope]);

  if (log.kind === 'idle' || log.kind === 'loading') {
    return <p className="rp-git-diff-message">{t('gitDiffLoading')}</p>;
  }
  if (log.kind === 'error') {
    return <p className="rp-git-diff-message">{t('gitDiffLoadError')}</p>;
  }
  if (log.value.commits.length === 0) {
    return <p className="rp-git-diff-message">{t('gitDiffEmptyLog')}</p>;
  }
  return (
    <div className="rp-git-diff-log rp-not-doc">
      <FormatToggle />
      {log.value.commits.map((commit) => (
        <CommitEntry key={commit.hash} commit={commit} maxDiffLines={maxDiffLines} />
      ))}
    </div>
  );
}

function CommitEntry({ commit, maxDiffLines }: { commit: LogCommit; maxDiffLines: number }) {
  const { date, time, offset } = splitCommitDate(commit.date);
  return (
    <section className="rp-git-diff-commit">
      <header className="rp-git-diff-commit-header">
        <time className="rp-git-diff-date" dateTime={commit.date}>
          <span className="rp-git-diff-date-day">{date}</span>
          <span className="rp-git-diff-date-time">
            {time} <span className="rp-git-diff-date-offset">{offset}</span>
          </span>
        </time>
        <div className="rp-git-diff-commit-summary">
          {commit.subject && <div className="rp-git-diff-subject">{commit.subject}</div>}
          <div className="rp-git-diff-commit-meta">
            <code>{shortHash(commit.hash)}</code>
            {commit.author && <span>{commit.author}</span>}
          </div>
        </div>
      </header>
      <div className="rp-git-diff-changes">
        {commit.changes.map((change, index) =>
          change.kind === 'page' ? (
            <PageChangeEntry
              key={`${index}-${change.title}`}
              hash={commit.hash}
              change={change}
              maxDiffLines={maxDiffLines}
            />
          ) : (
            <AssetChangeEntry key={`${index}-${change.path}`} change={change} />
          ),
        )}
      </div>
    </section>
  );
}

/** An image or other file: the plugin shows that it changed, without a diff. */
function AssetChangeEntry({ change }: { change: LogAssetChange }) {
  const t = useText();
  return (
    <div className="rp-git-diff-change">
      <div className="rp-git-diff-change-header">
        <code>{change.path}</code>
        <span className="rp-git-diff-status">
          {change.status === 'deleted' ? t('gitDiffAssetDeleted') : t('gitDiffAssetChanged')}
        </span>
      </div>
    </div>
  );
}

/**
 * A changed page with its diff. A page deleted since has no link, and a deleted
 * page shows no diff.
 */
function PageChangeEntry({
  hash,
  change,
  maxDiffLines,
}: {
  hash: string;
  change: LogPageChange;
  maxDiffLines: number;
}) {
  const t = useText();
  const deleted = change.status === 'deleted';
  const pageUrl = change.routePath && withBase(change.routePath);
  return (
    <div className="rp-git-diff-change">
      <div className="rp-git-diff-change-header">
        {pageUrl ? <a href={pageUrl}>{change.title}</a> : <span>{change.title}</span>}
        {deleted && <span className="rp-git-diff-status">{t('gitDiffDeleted')}</span>}
        {change.status === 'renamed' && (
          <span className="rp-git-diff-status">{t('gitDiffRenamed')}</span>
        )}
        {pageUrl && !deleted && (
          <a className="rp-git-diff-open" href={`${pageUrl}?diff=${queryHash(hash)}`}>
            {t('gitDiffOpenDiff')}
          </a>
        )}
      </div>
      {!deleted && (
        <DiffView
          name={change.title}
          from={change.prevBlob}
          to={change.blob}
          collapseOver={maxDiffLines}
          lazy
        />
      )}
    </div>
  );
}
