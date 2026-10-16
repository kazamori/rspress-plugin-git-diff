# @kazamori/rspress-plugin-git-diff

An [Rspress](https://rspress.rs/) v2 plugin that shows readers how the pages of your site changed, using the git history of your docs.

Release notes and changelogs cover features and specification changes, but small edits such as a fixed typo or a changed default value rarely make it there.
This plugin reads the history at build time and publishes it with the site, so readers can see those edits without access to your repository.

- **On-page diff**: add `?diff=<rev>` or `?diff=<from>..<to>` to a page URL, and the changes are marked on the rendered page itself, down to the sentence. A bar at the bottom moves between the changes (`n` / `p`) and opens the source diff.
- **Page history**: each page lists its own revisions with their diffs in a drawer, opened from the end of the page, the navigation bar, or `?history`.
- **Recent changes**: a `/changes` page lists recent commits with the diff of each changed page, like `git log -p`, for each version and language.
- **Noise left out**: added files (such as directories copied for a new version), renames that keep the content, and whitespace-only edits stay out of the lists.
- **Safe defaults for private repositories**: only the subject line of a commit message is published, with issue references stripped.

## Install

```sh
npm install -D @kazamori/rspress-plugin-git-diff
```

```ts
// rspress.config.ts
import { defineConfig } from '@rspress/core';
import { pluginGitDiff } from '@kazamori/rspress-plugin-git-diff';

export default defineConfig({
  plugins: [pluginGitDiff()],
});
```

Build in a clone with the full history and tags (for GitHub Actions, `fetch-depth: 0` and `fetch-tags: true`).

## Documentation

The documentation is an Rspress site in [`docs/`](./docs), in English and Japanese, and it uses this plugin itself.
It is published at <https://kazamori.github.io/rspress-plugin-git-diff/> from `main`, as the `dev` version: it describes the plugin under development, which may be ahead of the latest release on npm.

- Guide: [getting started](./docs/dev/en/guide/getting-started.md), [on-page diff](./docs/dev/en/guide/on-page-diff.md), [recent changes](./docs/dev/en/guide/recent-changes.md), [page history](./docs/dev/en/guide/page-history.md), [options](./docs/dev/en/guide/options.md), [publishing](./docs/dev/en/guide/publishing.md)
- [Architecture](./docs/dev/en/architecture.mdx), with diagrams generated from [`docs/architecture/`](./docs/architecture)

To browse it locally:

```sh
bun run docs:dev
```

## Development

Tool versions are pinned in `mise.toml`, and bun runs the scripts.

```sh
mise install
bun install
bun run typecheck
bun run test
bun run build
bun run e2e   # end-to-end tests with Playwright; run `bunx playwright install chromium` first
```

`example/` holds a small site with a scripted git history for trying the plugin by hand:

```sh
bun run example:setup   # create example/site, a separate git repository
bun run example:dev
```

See [AGENTS.md](./AGENTS.md) for the layout of the source and the constraints to keep when changing it.

## Releasing

Releases are published to npm as [`@kazamori/rspress-plugin-git-diff`](https://www.npmjs.com/package/@kazamori/rspress-plugin-git-diff) from a local clone.

You need an npm account that is a member of the [kazamori organization](https://www.npmjs.com/org/kazamori) with permission to publish, with two-factor authentication enabled.
Log in once and check the account:

```sh
npm login
npm whoami
```

1. Set the version on a branch, and merge it through a pull request:

   ```sh
   git switch -c release/0.5.0
   npm version 0.5.0 --no-git-tag-version
   git commit -am "Release 0.5.0"
   ```

2. On an up-to-date `main` without local changes, install the dependencies and run the end-to-end tests:

   ```sh
   git switch main
   git pull
   bun install --frozen-lockfile
   bun run e2e
   ```

3. Check what goes into the package: only `dist/`, `README.md`, `LICENSE` and `package.json`.

   ```sh
   npm pack --dry-run
   ```

4. Publish. `prepublishOnly` runs `typecheck`, `test` and `build` first, and `publishConfig` makes the scoped package public. npm asks for a one-time password.

   ```sh
   npm publish
   ```

5. Tag the published commit and create a GitHub release:

   ```sh
   git tag -a v0.5.0 -m "v0.5.0"
   git push origin v0.5.0
   gh release create v0.5.0 --title v0.5.0 --generate-notes
   ```

6. Check the published version, and rebuild the documentation site so that the new tag can be used in `?diff=` there (pushing a tag does not trigger the Pages workflow):

   ```sh
   npm view @kazamori/rspress-plugin-git-diff version
   gh workflow run pages.yml
   ```

## License

MIT
