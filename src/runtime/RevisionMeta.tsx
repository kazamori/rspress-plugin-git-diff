import { formatCommitDate } from './commit';
import type { PageRevision } from './types';

/** The date, subject and author of a revision, in one line. */
export function RevisionMeta({ revision }: { revision?: PageRevision }) {
  if (!revision) {
    return null;
  }
  const { date, subject, author } = revision;
  return (
    <span className="rp-git-diff-meta">
      <time className="rp-git-diff-meta-date" dateTime={date}>
        {formatCommitDate(date)}
      </time>
      {subject && ` ${subject}`}
      {author && ` (${author})`}
    </span>
  );
}
