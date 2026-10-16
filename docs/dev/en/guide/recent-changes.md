# Recent changes

The plugin adds a page at `/changes` that lists recent commits, newest first, like `git log -p`.
Readers who do not open a given page can still notice small edits to it here.

## Link to the page

The plugin does not add a link to the page; without one, readers find it only if they know the URL.
Add an item to the navigation, in `_nav.json` or in `themeConfig.nav`:

```json title="docs/_nav.json"
[
  { "text": "Guide", "link": "/guide/getting-started" },
  { "text": "Recent changes", "link": "/changes" }
]
```

- With `multiVersion` or `locales`, add the item to the `_nav.json` of each version and language. Write the link without the version and language, as above; Rspress adds them from the directory of the `_nav.json`.
- In `themeConfig.nav`, Rspress adds the language to the link only on sites without `multiVersion`. With `multiVersion`, write the full route, such as `/1.0/ja/changes`.
- If you change [`changesRoutePath`](./options), use the same path in the link.

Rspress adds the site `base`, and the `.html` suffix when `route.cleanUrls` is `false`, to these links.

## What each entry shows

Each commit is a card.
Its header shows the date and time in the commit's own time zone, the subject, the short hash and, if enabled, the author.

Below the header, each changed page has:

- its title, linked to the page,
- a "Show on page" link that opens the page with `?diff=<hash>`,
- the diff of its Markdown source, unified or side by side.

Diffs load when they scroll into view.
A diff with more changed lines than [`maxDiffLines`](./options) is collapsed until the reader expands it, and can be collapsed again.

A deleted page is listed with its last title and no link.
Changed images, such as PNG or SVG files, are listed without a diff.

## Changes left out

These changes do not appear in the list, because they tell readers nothing new.

- **Added files.** With `multiVersion`, a new version usually starts as a copy of a directory; the copy would show every line as added.
- **Renames that keep the content.**
- **Edits that only move whitespace or line breaks**, such as rewrapping a paragraph.

A range in the [on-page diff](./on-page-diff) still includes them.

## Versions and languages

With `multiVersion` or `locales`, each version and language gets its own page, such as `/changes`, `/ja/changes` and `/v1/ja/changes`.
Each lists only the changes under its own directory, so a fix copied to several versions does not appear several times on one page.

Each page lists up to [`maxCommits`](./options) commits of its own version and language.
Commits in one version do not reduce the number shown for another.

A page can list fewer commits than `maxCommits`.
A commit appears only when it has a change that is not left out (see "Changes left out" above), so a commit that only copies a version directory does not appear.
Neither does the history from before pages moved to their current paths, when git did not detect the move as a rename.

## llms.txt

With `llms: true`, Rspress writes `llms.txt`, `llms-full.txt` and a Markdown version of every page.
The recent changes page is rendered in the browser, so its Markdown version would contain no commits.
For this reason, the plugin leaves the recent changes pages out of these files by default.

Set [`changesInLlms`](./options) to `true` to list them.
Their Markdown versions then list the commits with the date, the subject and the changed pages, without the diffs.
Rspress groups `llms.txt` by navigation item, so with the [link in the navigation](#link-to-the-page), the recent changes page gets a section of its own.
