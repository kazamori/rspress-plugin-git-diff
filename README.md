# @kazamori/rspress-plugin-git-diff

An [Rspress](https://rspress.rs/) v2 plugin that shows readers how the pages of your site changed, using the git history of your docs.

Release notes and changelogs cover features and specification changes, but small edits such as a fixed typo or a changed default value rarely make it there.
This plugin reads the history at build time and publishes it with the site, so readers can see those edits without access to your repository.

- **On-page diff**: add `?diff=<rev>` or `?diff=<from>..<to>` to a page URL, and the changes are marked on the rendered page itself, down to the sentence. A bar at the bottom moves between the changes (`n` / `p`) and opens the source diff.
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
It is published at <https://kazamori.github.io/rspress-plugin-git-diff/>.

- Guide: [getting started](./docs/en/guide/getting-started.md), [on-page diff](./docs/en/guide/on-page-diff.md), [recent changes](./docs/en/guide/recent-changes.md), [options](./docs/en/guide/options.md), [publishing](./docs/en/guide/publishing.md)
- [Architecture](./docs/en/architecture.mdx), with diagrams generated from [`docs/architecture/`](./docs/architecture)

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
```

`example/` holds a small site with a scripted git history for trying the plugin by hand:

```sh
bun run example:setup   # create example/site, a separate git repository
bun run example:dev
```

See [AGENTS.md](./AGENTS.md) for the layout of the source and the constraints to keep when changing it.

## License

MIT
