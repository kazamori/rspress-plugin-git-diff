import type {
  HiddenReason,
  LogChange,
  LogChangeStatus,
  LogCommit,
  LogIndex,
  PageIndex,
  PageRevision,
  TagIndex,
} from '../runtime/types';
import { buildHistories, type FileHistory } from './history';
import type { Commit, FileChange } from './log';
import { formatSubject } from './message';
import type { ResolvedOptions } from './options';
import { extractTitle, isAssetFile, isFormatOnlyChange, isPageFile } from './page';
import { isDroppedVersionPath, listScopes, scopeKey, scopeOfPath, type SiteLayout } from './scope';

export interface TagSnapshot {
  name: string;
  /** Blob of every file under the docs root at the tag, keyed by repository path. */
  files: Map<string, string>;
}

export interface DataInput {
  /** Newest first. */
  commits: Commit[];
  /** Docs root relative to the repository root, with a trailing slash or empty. */
  docsPrefix: string;
  /** Route of every page on the site, keyed by repository path. */
  routes: Map<string, string>;
  layout: SiteLayout;
  /** Directories directly under the docs root at `HEAD`. */
  rootDirs: Set<string>;
  tags: TagSnapshot[];
  /** Contents of the blobs listed by `blobsToRead`. */
  contents: Map<string, string>;
  options: ResolvedOptions;
}

export interface SiteData {
  pages: PageIndex[];
  /** Keyed by scope key. */
  logs: Map<string, LogIndex>;
  /** Blobs the pages and logs refer to. */
  blobs: Set<string>;
  /** Every tag written, including those at which a page did not exist. */
  tags: TagIndex;
}

/** Blobs whose contents `buildSiteData` needs, for titles and the format check. */
export function blobsToRead(commits: Commit[]): Set<string> {
  const blobs = new Set<string>();
  for (const commit of commits) {
    for (const change of commit.changes) {
      if (!isPageFile(change.path)) {
        continue;
      }
      if (change.oldBlob) blobs.add(change.oldBlob);
      if (change.newBlob) blobs.add(change.newBlob);
    }
  }
  return blobs;
}

export function buildSiteData(input: DataInput): SiteData {
  const context: BuildContext = { ...input, hiddenReason: memoizedHiddenReason(input.contents) };
  const pageCommits = input.commits.map((commit) => ({
    ...commit,
    changes: commit.changes.filter((change) => isPageFile(change.path)),
  }));
  const histories = buildHistories(pageCommits);
  const blobs = new Set<string>();

  const pages: PageIndex[] = [];
  for (const history of histories) {
    const routePath = history.deleted ? undefined : input.routes.get(history.path);
    if (!routePath) {
      continue;
    }
    const page = buildPageIndex(history, routePath, context);
    for (const revision of page.revisions) {
      blobs.add(revision.blob);
      if (revision.prevBlob) blobs.add(revision.prevBlob);
    }
    for (const blob of Object.values(page.tags)) {
      if (blob) blobs.add(blob);
    }
    pages.push(page);
  }

  const logs = buildLogs(context, histories);
  for (const log of logs.values()) {
    for (const commit of log.commits) {
      for (const change of commit.changes) {
        if (change.kind !== 'page') continue;
        if (change.blob) blobs.add(change.blob);
        if (change.prevBlob) blobs.add(change.prevBlob);
      }
    }
  }

  return { pages, logs, blobs, tags: { tags: input.tags.map((tag) => tag.name) } };
}

function buildPageIndex(history: FileHistory, routePath: string, input: BuildContext): PageIndex {
  const revisions: PageRevision[] = [];
  for (const { commit, change } of history.revisions) {
    if (!change.newBlob) {
      continue;
    }
    revisions.push({
      ...commitMeta(commit, input.options),
      prevBlob: change.oldBlob,
      blob: change.newBlob,
      hidden: input.hiddenReason(change),
    });
  }

  // Tags at which the page did not exist are left out; on a site with many
  // tags, they would make up a large part of every index.
  const tags: Record<string, string> = {};
  for (const tag of input.tags) {
    const path = history.paths.find((p) => tag.files.has(p));
    const blob = path && tag.files.get(path);
    if (blob) tags[tag.name] = blob;
  }
  return { routePath, revisions, tags };
}

function buildLogs(input: BuildContext, histories: FileHistory[]): Map<string, LogIndex> {
  // Which history each page change belongs to, so that a change links to
  // the page as it exists now even if the file was renamed later.
  const historyOf = new Map<FileChange, FileHistory>();
  for (const history of histories) {
    for (const { change } of history.revisions) {
      historyOf.set(change, history);
    }
  }

  const logs = new Map<string, LogIndex>();
  for (const scope of listScopes(input.layout)) {
    logs.set(scopeKey(scope), { commits: [] });
  }

  for (const commit of input.commits) {
    const byScope = new Map<string, LogChange[]>();
    const add = (path: string, change: LogChange) => {
      const relative = path.slice(input.docsPrefix.length);
      if (isDroppedVersionPath(relative, input.layout, input.rootDirs)) {
        return;
      }
      const key = scopeKey(scopeOfPath(relative, input.layout));
      const list = byScope.get(key) ?? [];
      list.push(change);
      byScope.set(key, list);
    };

    for (const change of commit.changes) {
      if (!isPageFile(change.path) || input.hiddenReason(change)) {
        continue;
      }
      const history = historyOf.get(change);
      const routePath =
        history && !history.deleted ? (input.routes.get(history.path) ?? null) : null;
      const deleted = change.status === 'D';
      add(change.path, {
        kind: 'page',
        status: logStatus(change),
        title: pageTitle(change, input.contents),
        routePath,
        prevBlob: deleted ? null : change.oldBlob,
        blob: deleted ? null : change.newBlob,
      });
    }

    for (const change of commit.changes) {
      if (isAssetFile(change.path) && !input.hiddenReason(change)) {
        add(change.path, {
          kind: 'asset',
          status: logStatus(change),
          path: change.path.slice(input.docsPrefix.length),
        });
      }
    }

    for (const [key, changes] of byScope) {
      const log = logs.get(key);
      if (log && log.commits.length < input.options.maxCommits) {
        log.commits.push({ ...commitMeta(commit, input.options), changes } satisfies LogCommit);
      }
    }
  }
  return logs;
}

interface BuildContext extends DataInput {
  /** Why a change is left out of the lists; computed once per change. */
  hiddenReason: (change: FileChange) => HiddenReason | undefined;
}

function memoizedHiddenReason(contents: Map<string, string>) {
  const cache = new Map<FileChange, HiddenReason | undefined>();
  return (change: FileChange) => {
    if (!cache.has(change)) cache.set(change, hiddenReason(change, contents));
    return cache.get(change);
  };
}

function hiddenReason(change: FileChange, contents: Map<string, string>): HiddenReason | undefined {
  if (change.status === 'A') {
    return 'added';
  }
  if (change.status === 'R' && change.oldBlob === change.newBlob) {
    return 'renamed';
  }
  if (change.oldBlob && change.newBlob) {
    const before = contents.get(change.oldBlob);
    const after = contents.get(change.newBlob);
    if (before !== undefined && after !== undefined && isFormatOnlyChange(before, after)) {
      return 'format';
    }
  }
  return undefined;
}

function logStatus(change: FileChange): LogChangeStatus {
  switch (change.status) {
    case 'D':
      return 'deleted';
    case 'R':
      return 'renamed';
    default:
      return 'modified';
  }
}

function pageTitle(change: FileChange, contents: Map<string, string>): string {
  const blob = change.newBlob ?? change.oldBlob;
  const content = blob ? contents.get(blob) : undefined;
  return (content && extractTitle(content)) || change.path.split('/').pop() || change.path;
}

function commitMeta(commit: Commit, options: ResolvedOptions) {
  return {
    hash: commit.hash,
    date: commit.date,
    author: options.showAuthor ? commit.author : undefined,
    subject: formatSubject(commit.subject, options.commitMessage, options.issueRefPattern),
  };
}
