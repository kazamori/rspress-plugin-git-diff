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
| `changesInLlms` | `false` | サイトで `llms` を有効にしたとき、最近の変更のページを `llms.txt` に載せる。[最近の変更](./recent-changes#llmstxt)を参照 |
| `maxCommits` | `50` | 最近の変更の各ページに並べるコミットの数。バージョンと言語ごとに数える |
| `maxDiffLines` | `50` | 最近の変更のページで、変更した行がこれを超える差分は折りたたむ。追加した行と削除した行を合わせて数えるため、書き換えた行は 2 行と数える |
| `commitMessage` | `'strip-refs'` | コミットの要約行の示し方（後述） |
| `issueRefPattern` | `#123`、`group/project#45`、`!67` | `strip-refs` で取り除く参照のパターン。`g` フラグが必要 |
| `since` | なし | このタグかコミットより後の履歴と、その子孫にあたるタグだけを書き出す。[大きなサイト](./publishing#大きなサイト)を参照 |
| `tagPattern` | なし | `?diff=` で使えるタグと書き出すタグを、一致するものに絞る。[大きなサイト](./publishing#大きなサイト)を参照 |
| `showAuthor` | `false` | コミットの作者名を表示する |
| `pageHistory` | `true` | [ページの変更履歴](./page-history)。`false` で止める。`{ entries }` で入り口の置き場所を `'footer'`、`'nav'` から選ぶ（既定値は `['footer']`、空なら置かない） |
| `maxPageRevisions` | `20` | ページの変更履歴に並べる版の数 |

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
