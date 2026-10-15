// Shapes of the JSON files written at build time under `_git-diff/`.
// The node side writes them and the runtime side reads them.

/** Why a revision is left out of the history lists. */
export type HiddenReason = 'added' | 'renamed' | 'format';

export interface PageRevision {
  hash: string;
  date: string;
  author?: string;
  subject?: string;
  /** Blob of the page before this commit; null when the commit added the file. */
  prevBlob: string | null;
  blob: string;
  hidden?: HiddenReason;
}

export interface PageIndex {
  routePath: string;
  /** Newest first. */
  revisions: PageRevision[];
  /** Tag name to the page blob at that tag; null when the page did not exist. */
  tags: Record<string, string | null>;
}

export type LogChangeStatus = 'modified' | 'renamed' | 'deleted';

export interface LogPageChange {
  kind: 'page';
  status: LogChangeStatus;
  title: string;
  /** Null when the page no longer exists on the site. */
  routePath: string | null;
  prevBlob: string | null;
  blob: string | null;
}

export interface LogAssetChange {
  kind: 'asset';
  status: LogChangeStatus;
  path: string;
}

export type LogChange = LogPageChange | LogAssetChange;

export interface LogCommit {
  hash: string;
  date: string;
  author?: string;
  subject?: string;
  changes: LogChange[];
}

export interface LogIndex {
  /** Newest first. */
  commits: LogCommit[];
}
