# Options

Pass options to `pluginGitDiff()`.

```ts title="rspress.config.ts"
pluginGitDiff({
  maxCommits: 30,
  commitMessage: 'strip-refs',
  since: 'v1.0',
});
```

| Option | Default | Description |
| --- | --- | --- |
| `changesRoutePath` | `'/changes'` | URL of the recent changes page, after the version and language prefixes |
| `changesTitle` | per language | Title of the recent changes page, such as `{ en: 'What changed', ja: '変更履歴' }` |
| `changesInLlms` | `false` | List the recent changes pages in `llms.txt` when the site sets `llms`; see [Recent changes](./recent-changes#llmstxt) |
| `maxCommits` | `50` | Number of commits on the recent changes page |
| `maxDiffLines` | `200` | Diffs with more changed lines than this are collapsed on the recent changes page |
| `commitMessage` | `'strip-refs'` | How to show commit subjects; see below |
| `issueRefPattern` | `#123`, `group/project#45`, `!67` | References removed in the `strip-refs` mode; needs the `g` flag |
| `since` | none | Write only the history after this tag or commit |
| `tagPattern` | none | Only tags that match can be used in `?diff=` |
| `showAuthor` | `false` | Show the author name of each commit |

## Commit messages

Commit messages may refer to an issue tracker that readers cannot see.
`commitMessage` chooses what to publish.

- **`'full'`**: the subject line as it is.
- **`'strip-refs'`**: the subject line without issue and merge request references. `Fix the timeout (#12)` becomes `Fix the timeout`.
- **`'none'`**: no message; readers see the date and the diff.

Only the subject line, the first line of the message, is used.
The body of a message is never published.

## Language of the interface

The interface of the plugin is available in English, Japanese and Chinese, and follows the language of the page.
Other languages show English.
