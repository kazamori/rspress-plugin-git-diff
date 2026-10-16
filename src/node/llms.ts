import type { RsbuildPlugin } from '@rsbuild/core';
import { formatCommitDate, shortHash } from '../runtime/commit';
import { i18nTexts } from '../runtime/i18n';
import type { LogChange, LogIndex } from '../runtime/types';

/** A recent changes page as `llms.txt` and its Markdown files see it. */
export interface LlmsChangesPage {
  routePath: string;
  /** Path of the page's Markdown file from the output root, such as `ja/changes.md`. */
  mdFile: string;
  /** Markdown that replaces the rendered page; undefined to leave the page out. */
  markdown?: string;
}

/** The Markdown file Rspress writes for a route, the same way its SSG-MD does. */
export function routeMdFile(routePath: string): string {
  const file = routePath.endsWith('/') ? `${routePath}index.md` : `${routePath}.md`;
  return file.replace(/^\/+/, '');
}

/**
 * Rewrites what Rspress writes for `llms: true`. The recent changes pages are
 * rendered in the browser, so their Markdown has no content: each page is left
 * out of `llms.txt`, `llms-full.txt` and its own Markdown file, or its content is
 * replaced with the Markdown that `pages` gives.
 */
export function rsbuildPluginLlms(
  pages: () => LlmsChangesPage[],
  base: () => string,
): RsbuildPlugin {
  return {
    name: 'rspress-plugin-git-diff:llms',
    setup(api) {
      api.processAssets(
        // After Rspress has written the Markdown files at `optimize-transfer`.
        { stage: 'report', environments: ['node_md'] },
        ({ assets, compilation, compiler }) => {
          const { RawSource } = compiler.webpack.sources;
          const list = pages();
          const mdPaths = new Map(list.map((page) => [mdPath(page.mdFile, base()), page]));
          for (const page of list) {
            if (!(page.mdFile in assets)) continue;
            if (page.markdown === undefined) {
              compilation.deleteAsset(page.mdFile);
            } else {
              compilation.updateAsset(page.mdFile, new RawSource(page.markdown));
            }
          }
          for (const name of Object.keys(assets)) {
            const file = name.split('/').pop();
            if (file !== 'llms.txt' && file !== 'llms-full.txt') continue;
            const source = assets[name].source().toString();
            const updated =
              file === 'llms.txt'
                ? rewriteLlmsTxt(source, (path) => isLeftOut(mdPaths.get(path)))
                : rewriteLlmsFullTxt(source, (path) => {
                    const page = mdPaths.get(path);
                    return page && (page.markdown ?? null);
                  });
            if (updated !== source) {
              compilation.updateAsset(name, new RawSource(updated));
            }
          }
        },
      );
    },
  };
}

function isLeftOut(page: LlmsChangesPage | undefined): boolean {
  return page !== undefined && page.markdown === undefined;
}

/** The URL path of a Markdown file under the site base. */
function mdPath(mdFile: string, base: string): string {
  return `${base.replace(/\/+$/, '')}/${mdFile}`;
}

/** The path of a link in the output, without the site origin. */
function linkPath(link: string): string {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(link) ? new URL(link).pathname : link;
}

/**
 * Removes the entries of `llms.txt` whose link `isRemoved` picks, and the
 * headings of the sections left empty by that.
 */
export function rewriteLlmsTxt(source: string, isRemoved: (path: string) => boolean): string {
  const lines = source.split('\n');
  const kept = lines.filter((line) => {
    const link = /^- \[.*\]\(([^)\s]+)\)/.exec(line);
    return !link || !isRemoved(decodeURI(linkPath(link[1])));
  });
  if (kept.length === lines.length) {
    return source;
  }
  const result: string[] = [];
  for (let i = 0; i < kept.length; i++) {
    if (/^## /.test(kept[i]) && isEmptySection(kept, i + 1)) {
      // The blank lines around the heading go with it.
      while (result.length > 0 && result[result.length - 1] === '') result.pop();
      while (i + 1 < kept.length && kept[i + 1] === '') i++;
      if (i + 1 < kept.length) result.push('');
      continue;
    }
    result.push(kept[i]);
  }
  return result.join('\n');
}

function isEmptySection(lines: string[], start: number): boolean {
  for (let i = start; i < lines.length; i++) {
    if (/^## /.test(lines[i])) return true;
    if (lines[i].trim() !== '') return false;
  }
  return true;
}

/**
 * Rewrites the pages of `llms-full.txt`, which follow a `---`, `url: <link>`,
 * `---` header each. `contentOf` returns the new content of a page, null to
 * remove the page, or undefined to keep it.
 */
export function rewriteLlmsFullTxt(
  source: string,
  contentOf: (path: string) => string | null | undefined,
): string {
  const header = /^---\nurl: (\S+)\n---\n/gm;
  const starts = [...source.matchAll(header)];
  if (starts.length === 0) {
    return source;
  }
  let result = source.slice(0, starts[0].index);
  for (const [i, match] of starts.entries()) {
    const end = i + 1 < starts.length ? starts[i + 1].index : source.length;
    const block = source.slice(match.index, end);
    const content = contentOf(decodeURI(linkPath(match[1])));
    if (content === undefined) {
      result += block;
    } else if (content !== null) {
      // Keeps the blank lines that separate the block from the next one.
      const separator = /\n*$/.exec(block)?.[0] ?? '';
      result += `${match[0]}\n${content.replace(/\n+$/, '')}${separator}`;
    }
  }
  return result;
}

/**
 * The recent changes page as Markdown: the commits with their changed pages,
 * linked to the Markdown files of the pages.
 */
export function changesMarkdown(
  title: string,
  log: LogIndex,
  lang: string,
  base: string,
): string {
  const text = (key: string) => i18nTexts[key][lang] ?? i18nTexts[key].en;
  const lines = [`# ${title}`, ''];
  if (log.commits.length === 0) {
    lines.push(text('gitDiffEmptyLog'), '');
  }
  for (const commit of log.commits) {
    lines.push(`## ${formatCommitDate(commit.date)}${commit.subject ? ` ${commit.subject}` : ''}`, '');
    lines.push(`\`${shortHash(commit.hash)}\`${commit.author ? ` ${commit.author}` : ''}`, '');
    for (const change of commit.changes) {
      lines.push(`- ${changeLine(change, text, base)}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function changeLine(change: LogChange, text: (key: string) => string, base: string): string {
  if (change.kind === 'asset') {
    const status = change.status === 'deleted' ? 'gitDiffAssetDeleted' : 'gitDiffAssetChanged';
    return `\`${change.path}\` (${text(status)})`;
  }
  const title = change.title.replace(/[[\]\\]/g, '\\$&');
  const name = change.routePath
    ? `[${title}](${mdPath(routeMdFile(change.routePath), base)})`
    : title;
  if (change.status === 'deleted') return `${name} (${text('gitDiffDeleted')})`;
  if (change.status === 'renamed') return `${name} (${text('gitDiffRenamed')})`;
  return name;
}
