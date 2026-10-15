export type ChangeStatus = 'A' | 'M' | 'D' | 'R' | 'T';

export interface FileChange {
  status: ChangeStatus;
  /** Similarity index of a rename, 0 to 100. */
  similarity?: number;
  /** Path before the change; differs from `path` only for renames. */
  oldPath: string;
  path: string;
  /** Null when the side does not exist (added or deleted). */
  oldBlob: string | null;
  newBlob: string | null;
}

export interface Commit {
  hash: string;
  date: string;
  author: string;
  subject: string;
  changes: FileChange[];
}

const RECORD_SEPARATOR = '\x1e';
const FIELD_SEPARATOR = '\x1f';

/** The `--format` argument whose output `parseLog` reads. */
export const LOG_FORMAT = `--format=${RECORD_SEPARATOR}%H${FIELD_SEPARATOR}%aI${FIELD_SEPARATOR}%an${FIELD_SEPARATOR}%s`;

const RAW_LINE = /^:\d+ \d+ ([0-9a-f]+) ([0-9a-f]+) ([A-Z])(\d*)\t([^\t]+)(?:\t(.+))?$/;
const NULL_BLOB = /^0+$/;

/**
 * Parses `git log --raw --no-abbrev` output produced with `LOG_FORMAT`.
 * Commits keep the order of the output, that is, newest first.
 */
export function parseLog(output: string): Commit[] {
  const commits: Commit[] = [];
  for (const record of output.split(RECORD_SEPARATOR)) {
    if (record.trim() === '') {
      continue;
    }
    const [headerLine, ...rest] = record.split('\n');
    const [hash, date, author, subject] = headerLine.split(FIELD_SEPARATOR);
    const changes: FileChange[] = [];
    for (const line of rest) {
      const change = parseRawLine(line);
      if (change) {
        changes.push(change);
      }
    }
    commits.push({ hash, date, author, subject: subject ?? '', changes });
  }
  return commits;
}

function parseRawLine(line: string): FileChange | undefined {
  const match = RAW_LINE.exec(line);
  if (!match) {
    return undefined;
  }
  const [, oldBlob, newBlob, letter, score, firstPath, secondPath] = match;
  const status = letter as ChangeStatus;
  const isRename = status === 'R';
  return {
    status,
    similarity: isRename ? Number(score) : undefined,
    oldPath: firstPath,
    path: isRename && secondPath ? secondPath : firstPath,
    oldBlob: NULL_BLOB.test(oldBlob) ? null : oldBlob,
    newBlob: NULL_BLOB.test(newBlob) ? null : newBlob,
  };
}
