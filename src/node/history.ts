import type { Commit, FileChange } from './log';

export interface FileRevision {
  commit: Commit;
  change: FileChange;
}

/** The history of one file, following renames. */
export interface FileHistory {
  /** Path at the end of the history, relative to the repository root. */
  path: string;
  /** Every path the file had, newest first. */
  paths: string[];
  /** Newest first. */
  revisions: FileRevision[];
  deleted: boolean;
}

/**
 * Splits commits (newest first, as `git log` prints them) into one history per file.
 * A rename continues the history of the old path. Adding a file at a path that was
 * deleted starts a new history.
 */
export function buildHistories(commits: Commit[]): FileHistory[] {
  const histories: FileHistory[] = [];
  const live = new Map<string, FileHistory>();

  const start = (path: string): FileHistory => {
    const history: FileHistory = { path, paths: [path], revisions: [], deleted: false };
    histories.push(history);
    live.set(path, history);
    return history;
  };

  for (const commit of [...commits].reverse()) {
    for (const change of commit.changes) {
      let history: FileHistory;
      switch (change.status) {
        case 'A':
          history = start(change.path);
          break;
        case 'R':
          history = live.get(change.oldPath) ?? start(change.oldPath);
          live.delete(change.oldPath);
          live.set(change.path, history);
          history.path = change.path;
          history.paths.unshift(change.path);
          break;
        case 'D':
          history = live.get(change.path) ?? start(change.path);
          live.delete(change.path);
          history.deleted = true;
          break;
        default:
          history = live.get(change.path) ?? start(change.path);
      }
      history.revisions.unshift({ commit, change });
    }
  }
  return histories;
}
