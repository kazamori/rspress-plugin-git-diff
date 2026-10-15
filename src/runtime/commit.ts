export interface CommitDate {
  date: string;
  time: string;
  /** Offset of the time zone the commit was recorded in, such as `+09:00`. */
  offset: string;
}

/**
 * Splits an ISO 8601 commit date (`git log --format=%aI`). The commit's own time
 * zone is kept so that every reader sees the same date for a commit.
 */
export function splitCommitDate(iso: string): CommitDate {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?(Z|[+-]\d{2}:\d{2})?$/.exec(iso);
  if (!match) {
    return { date: iso, time: '', offset: '' };
  }
  const [, date, time, zone] = match;
  return { date, time, offset: zone === 'Z' ? '+00:00' : (zone ?? '') };
}

export function formatCommitDate(iso: string): string {
  const { date, time, offset } = splitCommitDate(iso);
  return [date, time, offset].filter(Boolean).join(' ');
}

/** The hash shown to readers, as `git log --oneline` prints it. */
export function shortHash(hash: string): string {
  return hash.slice(0, 7);
}

/**
 * The hash put in `?diff=` links. It is longer than the shown hash so that it
 * stays unique as the history grows.
 */
export function queryHash(hash: string): string {
  return hash.slice(0, 10);
}
