export type CommitMessageMode = 'full' | 'strip-refs' | 'none';

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
  /** Diffs longer than this are collapsed on the recent changes page. */
  maxDiffLines?: number;
  /** Versions older than this tag or commit are not written out. */
  since?: string;
  /** Only tags matching this pattern can be used in the `diff` query. */
  tagPattern?: RegExp;
  commitMessage?: CommitMessageMode;
  /** References removed in the `strip-refs` mode. Must have the global flag. */
  issueRefPattern?: RegExp;
  showAuthor?: boolean;
}

export type ResolvedOptions = Required<Omit<GitDiffPluginOptions, 'since' | 'tagPattern'>> &
  Pick<GitDiffPluginOptions, 'since' | 'tagPattern'>;

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
    maxDiffLines: options.maxDiffLines ?? 200,
    since: options.since,
    tagPattern: options.tagPattern && withoutState(options.tagPattern),
    commitMessage: options.commitMessage ?? 'strip-refs',
    issueRefPattern,
    showAuthor: options.showAuthor ?? false,
  };
}

/**
 * Copies a pattern without the global and sticky flags, whose `lastIndex` would
 * make `test` depend on earlier calls.
 */
function withoutState(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
}
