import path from 'node:path';
import { defineConfig } from '@rspress/core';
import { pluginGitDiff } from '../dist/index.js';

// The docs live in example/site, a separate git repository created by
// `bun run example:setup`, so that the history is the same on every machine.
export default defineConfig({
  root: path.join(import.meta.dirname, 'site', 'docs'),
  outDir: path.join(import.meta.dirname, 'doc_build'),
  title: 'rspress-plugin-git-diff example',
  lang: 'ja',
  locales: [
    { lang: 'ja', label: '日本語' },
    { lang: 'en', label: 'English' },
  ],
  plugins: [
    pluginGitDiff({
      // Small enough that the long change in the sample history is collapsed.
      maxDiffLines: 20,
      showAuthor: true,
    }),
  ],
});
