export type CommitMessageMode = 'full' | 'strip-refs' | 'none';

/** Where the plugin places the entries that open the history of a page. */
export type PageHistoryEntry = 'footer' | 'nav';

export interface PageHistoryOptions {
  /**
   * Entries the plugin places: `footer` before the doc footer, `nav` in the
   * navigation bar. With none, the history opens only from a URL with `?history`
   * or from the components a theme places.
   */
  entries?: PageHistoryEntry[];
}

export interface GitDiffPluginOptions {
  /** URL of the recent changes page, placed after the version and language prefixes. */
  changesRoutePath?: string;
  /** Title of the recent changes page per language. */
  changesTitle?: Record<string, string>;
  /**
   * Whether the recent changes pages are listed in `llms.txt` and `llms-full.txt`
   * when the site sets `llms`. When they are, their Markdown lists the commits.
   */
  changesInLlms?: boolean;
  /** Number of commits on the recent changes page. */
  maxCommits?: number;
  /**
   * Diffs with more changed lines than this are collapsed on the recent changes
   * page. Added and removed lines count together, so a rewritten line counts as 2.
   */
  maxDiffLines?: number;
  /** Versions older than this tag or commit are not written out. */
  since?: string;
  /** Only tags matching this pattern can be used in the `diff` query. */
  tagPattern?: RegExp;
  commitMessage?: CommitMessageMode;
  /** References removed in the `strip-refs` mode. Must have the global flag. */
  issueRefPattern?: RegExp;
  showAuthor?: boolean;
  /** The history of each page, opened in a drawer. `false` turns it off. */
  pageHistory?: boolean | PageHistoryOptions;
  /** Number of revisions listed in the history of a page. */
  maxPageRevisions?: number;
}

export type ResolvedOptions = Required<
  Omit<GitDiffPluginOptions, 'since' | 'tagPattern' | 'pageHistory'>
> &
  Pick<GitDiffPluginOptions, 'since' | 'tagPattern'> & {
    /** Undefined when the history of pages is turned off. */
    pageHistory: Required<PageHistoryOptions> | undefined;
  };

// Matches `#123`, `group/project#45` and `!67` as separate words, so that text
// such as `C#7` or `Wow!1` stays.
export const DEFAULT_ISSUE_REF_PATTERN =
  /(?<=^|[\s(\[（「、,;:])(?:[\w.-]+(?:\/[\w.-]+)+)?[#!]\d+\b/g;

const DEFAULT_CHANGES_TITLE: Record<string, string> = {
  en: 'Recent changes',
  ja: '最近の変更',
  zh: '最近更改',
};

export function resolveOptions(options: GitDiffPluginOptions = {}): ResolvedOptions {
  const issueRefPattern = options.issueRefPattern ?? DEFAULT_ISSUE_REF_PATTERN;
  if (!issueRefPattern.global) {
    throw new Error('rspress-plugin-git-diff: issueRefPattern must have the global (g) flag');
  }
  return {
    changesRoutePath: options.changesRoutePath ?? '/changes',
    changesTitle: { ...DEFAULT_CHANGES_TITLE, ...options.changesTitle },
    changesInLlms: options.changesInLlms ?? false,
    maxCommits: options.maxCommits ?? 50,
    maxDiffLines: options.maxDiffLines ?? 50,
    since: options.since,
    tagPattern: options.tagPattern && withoutState(options.tagPattern),
    commitMessage: options.commitMessage ?? 'strip-refs',
    issueRefPattern,
    showAuthor: options.showAuthor ?? false,
    pageHistory: resolvePageHistory(options.pageHistory ?? true),
    maxPageRevisions: options.maxPageRevisions ?? 20,
  };
}

function resolvePageHistory(
  option: boolean | PageHistoryOptions,
): Required<PageHistoryOptions> | undefined {
  if (option === false) {
    return undefined;
  }
  return { entries: option === true ? ['footer'] : (option.entries ?? ['footer']) };
}

/**
 * Copies a pattern without the global and sticky flags, whose `lastIndex` would
 * make `test` depend on earlier calls.
 */
function withoutState(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
}
