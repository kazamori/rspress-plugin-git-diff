import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RspressPlugin, UserConfig } from '@rspress/core';
import { i18nTexts } from '../runtime/i18n';
import { DATA_DIR } from '../runtime/paths';
import { collectGitData } from './collect';
import { type GitDiffPluginOptions, type ResolvedOptions, resolveOptions } from './options';
import { listScopes, type Scope, scopedRoutePath, scopeKey, type SiteLayout } from './scope';
import { rehypeSourceLines, remarkCodeLines } from './sourceLines';

export type { CommitMessageMode, GitDiffPluginOptions } from './options';

const PLUGIN_NAME = 'rspress-plugin-git-diff';

const runtimeDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'runtime');
// Where the data files are written before Rsbuild copies them into the output.
const cacheDir = path.join(process.cwd(), 'node_modules', '.cache', PLUGIN_NAME);

export function pluginGitDiff(userOptions: GitDiffPluginOptions = {}): RspressPlugin {
  const options = resolveOptions(userOptions);
  // Route of every page under the docs root, keyed by absolute file path. Filled
  // when routes are generated, which is before Markdown is compiled and before
  // the build starts.
  const pageRoutes = new Map<string, string>();
  const pageRouteOf = (file: string) => pageRoutes.get(path.normalize(file));

  return {
    name: PLUGIN_NAME,
    globalUIComponents: [path.join(runtimeDir, 'PageDiff.js')],
    globalStyles: path.join(runtimeDir, 'style.css'),
    markdown: {
      remarkPlugins: [[remarkCodeLines, { pageRouteOf }]],
      rehypePlugins: [[rehypeSourceLines, { pageRouteOf }]],
    },
    builderConfig: {
      output: {
        copy: [{ from: cacheDir, to: DATA_DIR }],
      },
    },

    i18nSource(source) {
      return { ...source, ...i18nTexts };
    },

    addPages(config) {
      const layout = siteLayout(config);
      return listScopes(layout).map((scope) => ({
        routePath: scopedRoutePath(scope, layout, options.changesRoutePath),
        content: changesPageContent(scope, options),
      }));
    },

    routeGenerated(routeMeta) {
      pageRoutes.clear();
      for (const route of routeMeta) {
        // Pages added by plugins, such as the recent changes pages, live outside
        // the docs root and have no git history.
        if (!route.relativePath.startsWith('..')) {
          pageRoutes.set(path.normalize(route.absolutePath), route.routePath);
        }
      }
    },

    async beforeBuild(config) {
      await collectGitData({
        docsDir: path.resolve(config.root ?? 'docs'),
        routes: pageRoutes,
        layout: siteLayout(config),
        options,
        outDir: cacheDir,
        warn: (message) => console.warn(`[${PLUGIN_NAME}] ${message}`),
      });
    },
  };
}

/** The MDX source of the recent changes page of one scope. */
function changesPageContent(scope: Scope, options: ResolvedOptions): string {
  const title = options.changesTitle[scope.lang] ?? options.changesTitle.en;
  const component = path.join(runtimeDir, 'GitDiffLog.js');
  return [
    '---',
    `title: ${JSON.stringify(title)}`,
    // The diffs need the full width; the page has no outline to show.
    'pageType: doc-wide',
    'outline: false',
    '---',
    '',
    `import GitDiffLog from ${JSON.stringify(component)};`,
    '',
    `# ${title}`,
    '',
    `<GitDiffLog scope=${JSON.stringify(scopeKey(scope))} maxDiffLines={${options.maxDiffLines}} />`,
    '',
  ].join('\n');
}

function siteLayout(config: UserConfig): SiteLayout {
  const locales = config.locales ?? config.themeConfig?.locales ?? [];
  return {
    versions: config.multiVersion?.versions ?? [],
    defaultVersion: config.multiVersion?.default ?? '',
    langs: locales.map((locale) => locale.lang),
    defaultLang: config.lang ?? '',
  };
}
