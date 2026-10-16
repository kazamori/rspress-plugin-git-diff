import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { blobPath, logIndexPath, pageIndexPath } from '../runtime/paths';
import type { LogIndex } from '../runtime/types';
import { blobsToRead, buildSiteData, type TagSnapshot } from './data';
import { readBlobs, runGit, testGit } from './git';
import { LOG_FORMAT, parseLog } from './log';
import type { ResolvedOptions } from './options';
import type { SiteLayout } from './scope';

export interface CollectInput {
  /** Absolute path of the docs root. */
  docsDir: string;
  /** Route of every page on the site, keyed by absolute file path. */
  routes: Map<string, string>;
  layout: SiteLayout;
  options: ResolvedOptions;
  /** Directory to write the data files into; it is emptied first. */
  outDir: string;
  warn: (message: string) => void;
}

/**
 * Reads the git history of the docs root and writes the data files. Returns the
 * logs keyed by scope key, empty when the docs root is not in a git repository.
 */
export async function collectGitData(input: CollectInput): Promise<Map<string, LogIndex>> {
  await rm(input.outDir, { recursive: true, force: true });
  await mkdir(input.outDir, { recursive: true });

  const { docsDir, options, warn } = input;
  if (!(await testGit(docsDir, ['rev-parse', '--is-inside-work-tree']))) {
    warn(`${docsDir} is not in a git repository; no history is shown`);
    return new Map();
  }
  if ((await runGit(docsDir, ['rev-parse', '--is-shallow-repository'])).trim() === 'true') {
    warn('the repository is a shallow clone, so the history may be cut off; fetch the full history (for example, fetch-depth: 0)');
  }

  const repoRoot = (await runGit(docsDir, ['rev-parse', '--show-toplevel'])).trim();
  const docsRel = toPosix(path.relative(repoRoot, docsDir));
  const docsPrefix = docsRel === '' ? '' : `${docsRel}/`;
  const pathspec = docsRel === '' ? '.' : docsRel;

  const range = options.since ? [`${options.since}..HEAD`] : ['HEAD'];
  const logOutput = await runGit(repoRoot, [
    'log',
    '--no-merges',
    '-M',
    '--raw',
    '--no-abbrev',
    LOG_FORMAT,
    ...range,
    '--',
    pathspec,
  ]);
  const commits = parseLog(logOutput);

  const rootDirs = await readRootDirs(repoRoot, docsPrefix);
  const tags = await readTags(repoRoot, pathspec, options);
  const contents = await readBlobs(repoRoot, blobsToRead(commits));

  const routes = new Map<string, string>();
  for (const [absolutePath, routePath] of input.routes) {
    routes.set(toPosix(path.relative(repoRoot, absolutePath)), routePath);
  }

  const data = buildSiteData({
    commits,
    docsPrefix,
    routes,
    layout: input.layout,
    rootDirs,
    tags,
    contents,
    options,
  });

  const missing = [...data.blobs].filter((hash) => !contents.has(hash));
  const allContents = new Map([...contents, ...(await readBlobs(repoRoot, missing))]);

  await Promise.all([
    ...data.pages.map((page) => writeJson(input.outDir, pageIndexPath(page.routePath), page)),
    ...[...data.logs].map(([key, log]) => writeJson(input.outDir, logIndexPath(key), log)),
    ...[...data.blobs].map((hash) =>
      writeText(input.outDir, blobPath(hash), allContents.get(hash) ?? ''),
    ),
  ]);
  return data.logs;
}

/** Lists the directories directly under the docs root at `HEAD`. */
async function readRootDirs(repoRoot: string, docsPrefix: string): Promise<Set<string>> {
  const output = await runGit(repoRoot, [
    'ls-tree',
    '-d',
    '--name-only',
    'HEAD',
    ...(docsPrefix ? ['--', docsPrefix] : []),
  ]);
  return new Set(
    output
      .split('\n')
      .filter((line) => line !== '')
      .map((line) => line.slice(docsPrefix.length)),
  );
}

async function readTags(
  repoRoot: string,
  pathspec: string,
  options: ResolvedOptions,
): Promise<TagSnapshot[]> {
  const output = await runGit(repoRoot, [
    'for-each-ref',
    '--format=%(refname:short)%09%(objectname)%09%(*objectname)',
    'refs/tags',
  ]);
  const refs = output
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => {
      const [name, object, peeled] = line.split('\t');
      // An annotated tag points to a tag object; the peeled object is the commit.
      return { name, commit: peeled || object };
    })
    .filter(({ name }) => !options.tagPattern || options.tagPattern.test(name));

  const tags = await Promise.all(
    refs.map(async ({ name, commit }): Promise<TagSnapshot | undefined> => {
      // A tag older than `since` would expose versions that `since` hides.
      if (
        options.since &&
        !(await testGit(repoRoot, ['merge-base', '--is-ancestor', options.since, commit]))
      ) {
        return undefined;
      }
      const tree = await runGit(repoRoot, ['ls-tree', '-r', '--full-tree', commit, '--', pathspec]);
      return { name, files: parseTree(tree) };
    }),
  );
  return tags.filter((tag) => tag !== undefined);
}

/** Parses `git ls-tree -r` output into blobs keyed by path. */
function parseTree(output: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const entry of output.split('\n')) {
    const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(entry);
    if (match) files.set(match[2], match[1]);
  }
  return files;
}

async function writeJson(root: string, relative: string, value: unknown): Promise<void> {
  await writeText(root, relative, JSON.stringify(value));
}

async function writeText(root: string, relative: string, content: string): Promise<void> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}
