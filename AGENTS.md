# AGENTS.md

Guidance for agents working in this repository.
README.md and the documentation site (`docs/`) describe what the plugin does and how to use it; this file covers only what you need to change it.

## Overview

`@kazamori/rspress-plugin-git-diff` is an Rspress v2 plugin that shows the git history and diffs of documentation pages.
At build time it reads the git history and writes static JSON and page sources under `git-diff-data/`.
In the browser, it fetches those files to show the on-page diff, the source diff and the recent changes page.

## Commands

Tool versions are pinned in `mise.toml`, and bun manages dependencies and runs the scripts.
Do not use npm or pnpm; only `bun.lock` is kept.

```sh
mise install            # install bun
bun install
bun run typecheck       # tsc --noEmit
bun run test            # rstest, with a node and a dom project
bun run e2e             # Playwright, against the example site (see "Tests")
bun run build           # rslib, into dist/
bun run docs:dev        # the documentation site, which uses dist/
```

When you finish a change, make sure `typecheck`, `test` and `build` all pass.

## Layout

- **`src/node/`**: the Rspress plugin. It runs in Node.js, and rslib bundles it into `dist/index.js`.
- **`src/runtime/`**: components and CSS for the browser. rslib emits them unbundled into `dist/runtime/`, and the site's Rsbuild compiles them again.
- **`tests/`**: tests. `*.dom.test.ts` run in happy-dom and the rest in Node (`rstest.config.ts`).
- **`docs/`**: the documentation site, in English (`docs/dev/en/`) and Japanese (`docs/dev/ja/`). See "Documentation" below.
- **`example/`**: a small site for trying the plugin by hand. See "Example site" below.

### Build-time flow

Rspress calls the hooks in this order: `config`, `addPages`, `routeGenerated`, `beforeBuild`, then Markdown compilation.

1. `addPages` creates a recent changes page (MDX) for each version and language.
2. `routeGenerated` records the route of every page file under the docs root.
3. `beforeBuild` calls `collect.ts`, which reads the history and writes the data. `data.ts` builds the data with pure functions and does not touch git.
4. While Markdown compiles, the remark and rehype plugins in `sourceLines.ts` add the source lines and the page route to rendered elements.
5. With `llms`, the Rsbuild plugin in `llms.ts` rewrites what Rspress wrote for the recent changes pages (their Markdown, `llms.txt` and `llms-full.txt`) after Rspress has written them.

### Browser entry points

- **`PageDiff.tsx`**: registered in `globalUIComponents`. It runs only when the URL has `diff`, marks the page and shows the bar.
- **`GitDiffLog.tsx`**: the body of the recent changes page.
- **`PageHistory.tsx`**: registered in `globalUIComponents` unless `pageHistory` is `false`. It shows the history of the page in a drawer when the URL has `history`, and inserts the entries (`PageHistoryEntries.tsx`) into the rendered page through portals, because a plugin cannot fill the layout slots. `index.ts` exports the entries as `./runtime` for themes.
- The diff computation (`lineMap.ts`, `render.ts`) and the marking (`annotate.ts`) are dynamic imports, so pages without `diff` do not load jsdiff and diff2html. Do not turn them into static imports.

## Constraints

### Files shared by both sides

`src/node/` imports some files of `src/runtime/` (`types.ts`, `paths.ts`, `attributes.ts`, `i18n.ts`, `commit.ts`).
These files must not import browser-only modules such as `@rspress/core/runtime` or React; otherwise browser code ends up in the Node bundle.
That is why `useText` lives in `text.ts` rather than `i18n.ts`.
After a change, check that `dist/index.js` imports only Node built-in modules.

Conversely, `src/runtime/` cannot import files outside itself.
The browser side is emitted unbundled, so such files would be missing from the package.

### Data format

`src/runtime/types.ts` is the contract between the data the build writes and the browser that reads it.
When you change the format, change both `data.ts` (writing) and the browser components that read it.
Data paths live in `paths.ts` and HTML attribute names in `attributes.ts`; do not write these strings elsewhere.

### What gets published

The written data becomes static files that anyone can fetch.
Only the processed subject line of a commit message is written (`message.ts`).
Never write author email addresses or unprocessed messages.

### UI texts

Add UI texts to `i18n.ts` in all three languages, `en`, `ja` and `zh`, and look them up with `useText` from `text.ts`.

### CSS

Every class name starts with `rp-git-diff-`.
Use the theme's CSS variables (`--rp-c-*`) or translucent colors that read well in both light and dark modes.
Dark mode follows the Rspress switch; the diff2html color scheme follows `useDark`.

## Tests

- Test pure functions (log parsing, history building, revision resolution, line mapping) with unit tests.
- Test git reading as `tests/collect.test.ts` does: create a git repository in a temporary directory, with dates and authors fixed through environment variables.
- Test page marking as `tests/annotate.dom.test.ts` does: with HTML fragments shaped like what Rspress renders.
- Test the behavior in the browser with the end-to-end tests in `e2e/`. `bun run e2e` recreates and builds the example site, serves it on port 4173 and runs Playwright against it (`playwright.config.ts`); run `bunx playwright install chromium` once beforehand. Look commits up with `hashOf()` in `e2e/history.ts`, and set `locale` for pages in another language. When you add a kind of change to `create-repo.ts`, add a test for how it is shown.

## Documentation

The site in `docs/` documents the plugin and uses it, so its own git history is what its recent changes pages show.
`rspress.config.ts` at the repository root configures it and imports the plugin from `dist/`.
`.github/workflows/pages.yml` publishes it to GitHub Pages on every push to `main`, under the `base` `/rspress-plugin-git-diff/`.
Write links in the pages without the base; Rspress adds it.
The site uses `multiVersion` with a single version, `dev`, which describes `main`; its pages are in `docs/dev/`.
Rspress shows its version switch only with two or more versions, so the `_nav.json` files have a `dev` menu instead; remove it when a released version is added next to `dev`.
`.github/workflows/ci.yml` runs `typecheck`, `test` and `build`, and the end-to-end tests, on pushes and pull requests.

- Keep the English and Japanese pages in step. Write English first; Japanese follows the same structure.
- Navigation and sidebars come from `_nav.json` and `_meta.json` in each language directory. Keep both files: a `nav` in the config turns off the generated sidebar, and a `_nav.json` alone gives a sidebar per subdirectory only.

### Architecture diagrams

The diagrams are made with the archify skill.
`docs/architecture/*.{architecture,sequence,dataflow}.json` are the sources, and the `*.html` next to them are the interactive diagrams, which the site copies to `/architecture/`.
The PNG images in `docs/public/architecture/` are exported from those HTML files (Export, then PNG) and scaled to 2400px wide.

When the source changes in a way a diagram shows, update the JSON, including `meta.repository.revision` and the `sources` line ranges, then run archify `finalize` and export the PNG again.
Before rerunning `finalize`, delete the receipts it left (`*.finalize.json`, `*.finalize-summary.json`, `*.browser-check.json`, `*.delivery.json`), or it refuses to replace them.
The receipts record local absolute paths and are ignored by git.

## Example site

`example/site/` is a generated git repository and is never committed to this repository (it is in `.gitignore`).
A nested `.git` cannot be committed, so `example/scripts/create-repo.ts` creates the history.

```sh
bun run example:setup     # recreate example/site
bun run example:dev       # build dist, then start the dev server
bun run example:build     # build into example/doc_build
bun run example:preview   # serve the build (port 4173)
```

When you add a new kind of change to display, add a commit that reproduces it to `create-repo.ts`.
Commit dates are fixed, so the history is the same every time.
Still, do not write tests or scripts that depend on hash values; look commits up by subject, for example with `git log --grep`.

## Pitfalls met so far

- **Renaming a small file**: renaming a file of a few lines while editing it can drop the similarity below git's default 50%, so git reports a deletion and an addition. Keep the edits small in commits that rename files in the example history.
- **Browser language in headless checks**: Rspress redirects to the page in the browser's language. To check English pages, set the browser language to English (with Playwright, `newContext({ locale: 'en-US' })`).
- **Line numbers and front matter**: Rspress replaces front matter with blank lines before compiling, so the line numbers on elements match the source file. The on-page marks rely on this.
- **Line numbers of code blocks**: syntax highlighting rebuilds `pre`, and the position is gone by the rehype stage. The remark plugin wraps code blocks in an element that keeps their lines.
- **Directory names starting with an underscore**: hosts that run Jekyll, such as GitHub Pages published from a branch, drop them from the site. For this reason, the data directory was renamed from `_git-diff/` to `git-diff-data/`; keep output names free of a leading underscore.
- **Stopping the preview server**: `pkill -f "rspress preview"` chained with other commands in one shell matches that shell too and stops it, so the following commands never run. Run the stop command on its own.

## Releases

README.md describes how to publish to npm.

## Commits

- Write commit messages and pull request descriptions in English.
- Mention related issues in the body, such as `Refs #1`.
- Small bug fixes that do not change the specification may be committed to `main` directly, without a pull request; close the issue with `Fixes #N` in the body.
- For other changes, such as new options, changed defaults, the data format or new features, create a branch and open a pull request.
