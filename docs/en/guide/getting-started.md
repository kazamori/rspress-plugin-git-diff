# Getting started

rspress-plugin-git-diff shows readers how the pages of an Rspress site changed.
It reads the git history of the docs when the site is built and publishes it with the site, so readers do not need access to the repository.

Release notes and changelogs usually cover features and specification changes.
Smaller edits, such as a fixed typo or a changed default value, rarely make it there, and readers notice them only by comparing the source.
This plugin makes those edits visible on the site.

## Requirements

- Rspress v2
- The docs are in a git repository, and the build runs inside it
- The build sees the full history (see [Publishing](./publishing#build-in-ci) for CI settings)

## Install

```sh
npm install -D @kazamori/rspress-plugin-git-diff
```

Other package managers work as well, for example `bun add -d @kazamori/rspress-plugin-git-diff`.

## Add the plugin

```ts title="rspress.config.ts"
import { defineConfig } from '@rspress/core';
import { pluginGitDiff } from '@kazamori/rspress-plugin-git-diff';

export default defineConfig({
  plugins: [pluginGitDiff()],
});
```

The defaults suit most sites.
See [Options](./options) to change them.

## Try it

Build or start the site, then open these URLs.

- `/changes` lists the recent commits with their diffs. See [Recent changes](./recent-changes).
- Any page with `?diff=HEAD`, such as `/guide/getting-started?diff=HEAD`, marks the latest change of that page on the page itself. See [On-page diff](./on-page-diff).

This site uses the plugin too.
Open [Recent changes](/changes), or follow a "Show on page" link there, to see how it works.
