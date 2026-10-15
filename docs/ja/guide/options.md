# オプション

オプションは `pluginGitDiff()` に渡す。

```ts title="rspress.config.ts"
pluginGitDiff({
  maxCommits: 30,
  commitMessage: 'strip-refs',
  since: 'v1.0',
});
```

| オプション | 既定値 | 説明 |
| --- | --- | --- |
| `changesRoutePath` | `'/changes'` | 最近の変更のページの URL。バージョンと言語の接頭辞の後に付く |
| `changesTitle` | 言語ごとの既定の題 | 最近の変更のページの題。`{ en: 'What changed', ja: '変更履歴' }` の形で渡す |
| `maxCommits` | `50` | 最近の変更のページに並べるコミットの数 |
| `maxDiffLines` | `200` | 最近の変更のページで、変更した行がこれを超える差分は折りたたむ |
| `commitMessage` | `'strip-refs'` | コミットの要約行の示し方（後述） |
| `issueRefPattern` | `#123`、`group/project#45`、`!67` | `strip-refs` で取り除く参照のパターン。`g` フラグが必要 |
| `since` | なし | このタグかコミットより後の履歴だけを書き出す |
| `tagPattern` | なし | `?diff=` で使えるタグを、一致するものに絞る |
| `showAuthor` | `false` | コミットの作者名を表示する |

## コミットメッセージ

コミットメッセージには、読み手が見られない issue tracker への参照が入ることがある。
`commitMessage` で、何を公開するかを選ぶ。

- **`'full'`**：要約行をそのまま示す。
- **`'strip-refs'`**：issue と merge request への参照を取り除いて示す。`Fix the timeout (#12)` は `Fix the timeout` になる。
- **`'none'`**：メッセージを示さない。読み手には日時と差分だけが見える。

使うのは要約行（メッセージの 1 行目）だけである。
メッセージの本文は公開しない。

## UI の言語

プラグインの UI は英語、日本語、中国語に対応しており、ページの言語に合わせて切り替わる。
ほかの言語のページでは英語で表示する。
