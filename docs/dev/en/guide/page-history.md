# Page history

Each page can show its own history, like `git log -p` for one file.
The history opens in a drawer over the page, so the reader stays where they were.

## Opening the history

By default, a line before the doc footer, at the end of each page, opens the history:

> History of this page (4 changes, last on 2026-09-11)

Adding `?history` to the URL of a page opens it as well, so a link can point to the history of a page.
The drawer closes with its Close button, Escape, a click outside it, or the browser's Back button.

Pages without history, such as the [recent changes](./recent-changes) page, show no line.

## What the history shows

The drawer lists the revisions of the page, newest first, the same way as the recent changes page.

- the date and time in the commit's own time zone, the subject, the short hash and, if enabled, the author,
- a "Show on page" link that closes the drawer and opens the page with `?diff=<hash>`,
- the diff of its Markdown source, unified or side by side. Diffs load when they scroll into view, and diffs with more changed lines than [`maxDiffLines`](./options) are collapsed.

The revisions that the recent changes page leaves out (see [Changes left out](./recent-changes#changes-left-out)) are left out here too, except the one that added the page.
It is listed last, without a diff, so that a page that has not changed since shows when it was added.

The drawer lists up to [`maxPageRevisions`](./options) revisions and says how many older ones are not listed.
The limit applies only to the list; [ranges](./on-page-diff) can still use every revision.

## Where the entries go

`pageHistory.entries` chooses where the plugin places the entries that open the history.

```ts title="rspress.config.ts"
pluginGitDiff({
  pageHistory: { entries: ['footer', 'nav'] },
});
```

- **`'footer'`** (default): the line before the doc footer.
- **`'nav'`**: a button with a clock icon in the navigation bar, before the language and theme switches.
- **`[]`**: no entries; only a URL with `?history` opens the history.

Set `pageHistory: false` to turn the history off.

## Placing the entries in a theme

A plugin cannot fill the slots of the Rspress layout, so the plugin inserts its entries into the rendered page.
This relies on the structure of the default theme.
A site with a [custom theme](https://rspress.rs/guide/basic/custom-theme) can place the entries itself with the components the plugin exports:

- **`PageHistoryLink`**: the line that the `'footer'` entry places.
- **`PageHistoryButton`**: the button that the `'nav'` entry places.

```tsx title="theme/index.tsx"
import { PageHistoryButton, PageHistoryLink } from '@kazamori/rspress-plugin-git-diff/runtime';
import { Layout as BasicLayout } from '@rspress/core/theme-original';

function Layout() {
  return <BasicLayout afterNavMenu={<PageHistoryButton />} beforeDocFooter={<PageHistoryLink />} />;
}

export { Layout };
export * from '@rspress/core/theme-original';
```

If the theme already overrides `Layout`, for example to add a banner, pass the components to the same `BasicLayout` together with the other props.
Set `pageHistory: { entries: [] }` so that the plugin does not place the same entries again.
The drawer itself still comes from the plugin; the components only open it.

## Cost

Every page fetches its index from `git-diff-data/pages/` to show the entry, a small JSON file that the build already writes for the [on-page diff](./on-page-diff).
On a page without history, the request returns 404, and the browser may log it in the console.
