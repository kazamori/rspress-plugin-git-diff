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
