# On-page diff

Add a `diff` parameter to the URL of a page, and the page shows what changed on itself.
Added and changed text is green, and removed text appears in red with a strike-through at the place it was removed from.

## The diff parameter

The parameter uses git's notation.

| URL | Shows |
| --- | --- |
| `/guide/install?diff=a1b2c3d` | The change that commit `a1b2c3d` made to this page |
| `/guide/install?diff=v1.0..HEAD` | Everything that changed since tag `v1.0` |
| `/guide/install?diff=v1.0..` | The same as above; an empty end means `HEAD` |
| `/guide/install?diff=a1b2c3d..e4f5a6b` | The changes between two versions |

A revision is one of the following.

- **A commit hash**: four characters or more. It must be a commit that changed this page. If a short hash matches more than one commit, the page lists the candidates.
- **A tag**: any tag in the repository, unless [`tagPattern`](./options) narrows them down. A tag can name a point where the page did not change.
- **`HEAD`**: the latest version of the page.

## Tag your releases

A commit hash in `?diff=` must name a commit that changed the page.
To show everything that changed on a page since a release, readers need a name for the release itself, and only a tag gives one: `?diff=v2.0..` works on every page, whether or not the page changed in the release commit.
Without tags, ranges are of little use.

- **Tag each release** of the docs, such as `v2.0`.
- **With `multiVersion`**, a release usually copies the development directory to a new version directory, such as `docs/dev/` to `docs/2.0/`. Tag the commit that makes the copy. At that commit both directories have the same content, so the same range answers two questions:
  - on a page of the development version, `?diff=v2.0..` shows what changed since the release, that is, what the next release will change;
  - on a page of the released version, `?diff=v2.0..` shows the corrections made after the release.
- **Tags added later** to older commits may not give the same result. If the development directory already had changes for the next release at the tagged commit, the tag names those changes on the pages of the development version, not the release. A tag also does not resolve on a page that had another path at the tag, unless git followed the move as a rename.
- **Set [`tagPattern`](./options)** to the release tags, such as `/^v\d/`, so that other tags in the repository cannot be used in `?diff=`.

The tags are read when the site is built, so a new tag works on the site after the next build, not when it is pushed.
With [`since`](./options), tags older than `since` are not written.

## How changes are marked

The plugin marks the rendered page rather than drawing a separate diff.

- **Paragraphs and list items**: when a paragraph spans several source lines, only the changed lines are marked. Docs written with one sentence per line get sentence-level marks.
- **Tables**: changed rows are marked, and removed rows appear as struck-through rows with one cell per column.
- **Code blocks**: changed lines of code are marked line by line, and removed lines are inserted between them.
- **Removed blocks**: a removed paragraph appears as its Markdown source, in a red box at the place it was removed from.

The page always shows its latest version.
When the parameter names an older commit, the plugin follows the lines that commit added up to the latest version.
Lines that later commits rewrote are marked in amber as "changed again later".

Some changes have no place on the page.
Front matter and `import` lines are not rendered, so the bar reports how many changed lines it could not show.
Open the source diff to see them.

## The bar

While a diff is shown, a bar at the bottom of the screen shows the date, subject and author of the change, and a legend of the colors.

- **↑ and ↓** move between changes. The keys `n` or `j` move to the next change, and `p` or `k` to the previous one. A removed sentence and the sentence that replaced it count as one change.
- When every change is already on the screen, the bar shows only the number of changes.
- **Source diff** opens the diff of the Markdown source in a dialog, either unified or side by side.
- **Close** removes the parameter and returns to the normal page.

## Limitations

- In the development server, a page with uncommitted edits can show marks in the wrong place, because the line numbers follow the latest commit.
- When the first sentence of a paragraph is removed, it appears as a box before the paragraph rather than inline.
- The placement relies on the default Rspress theme. A heavily customized theme may leave some changes unmarked; the source diff still shows them.
