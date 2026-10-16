# Publishing

## What gets published

The plugin writes the history to `git-diff-data/` in the build output.

- `pages/`: the revisions of each page and the page version at each tag
- `log/`: the recent commits of each version and language
- `blobs/`: the source of every page version that these refer to

These are static files that anyone can fetch, whether or not they open a diff.
**Text that was removed from the docs stays readable in the versions that contain it.**
If old versions must not be published, set [`since`](./options) to a tag or commit; nothing older than that point is written.

Commit messages are processed before they are written, and only the subject line is used (see [Commit messages](./options#commit-messages)).
Email addresses of authors are never written.

## Build in CI

A shallow clone cuts the history short, and the plugin warns when it detects one.
Fetch the full history and the tags before building.

```yaml title=".github/workflows/docs.yml"
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
    fetch-tags: true
```

## Uncommitted changes

The plugin reads committed history only.
Pages added or edited without a commit have no history until they are committed.

## Large sites

The output grows with the history.
`git-diff-data/` holds every version of every page in the history, and the index of each page records the version of the page at every tag.
Two options narrow down what is written.

- **[`tagPattern`](./options)**: only the tags readers should use in `?diff=` are recorded. Without it, every tag in the repository is recorded for every page, including tags of packages in a monorepo. The build warns when it writes more than 20 tags without `tagPattern`.
- **[`since`](./options)**: the history before a tag or commit, such as the last major release, is not written. This removes the old versions themselves, which make up most of the output.

With `since`, only tags that descend from `since` in the history are written.
In a repository that tags its releases on release branches, a release tag as `since` leaves out the later release tags too, because they are on other branches.
In that case, set `since` to the commit on the main branch where the release branch starts, such as the output of `git merge-base v2.0.0 main`.

As an example, these are the sizes for the documentation of [Rspack](https://github.com/web-infra-dev/rspack) (374 pages, 1,212 commits, release tags on release branches), measured in October 2026 with `tagPattern: /^v\d/`:

| `since` | Commits | `git-diff-data/` | Tags written |
| --- | --- | --- | --- |
| none | 1,212 | 88.6 MiB | 239 |
| `v1.0.0` (August 2024) | 902 | 71.6 MiB | 1 |
| `v1.5.0` (August 2025) | 548 | 51.3 MiB | 1 |
| `v2.0.0` (April 2026) | 274 | 28.0 MiB | 1 |
| `git merge-base v2.0.0 main` | 274 | 28.1 MiB | 34 |

Without `tagPattern`, all 402 tags of the repository were recorded, and `git-diff-data/` was 91.3 MiB.
Pages that have not changed since `since` have no history; with `v2.0.0`, 18 of the 374 pages had none.

To see what reading the history costs, set `RSPRESS_GIT_DIFF_STATS=1`.
The build then prints the time, the heap in use and the counts of each step: reading the log, reading the page contents, building the data and writing the files.

```sh
RSPRESS_GIT_DIFF_STATS=1 rspress build
```
