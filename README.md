# @kazamori/rspress-plugin-git-diff

Rspress v2 のサイトに、ドキュメントの git の履歴と差分を表示するプラグインである。
ビルド時に git から履歴を取り出して静的なファイルとして置くので、ソースのリポジトリを公開していなくても、読み手はサイト上で変更を確かめられる。

次の 2 つの見せ方を備える。

- **ページの差分**：ページの URL に `?diff=` を付けると、表示しているページの上で、追加と変更を緑、削除を赤の取り消し線で示す。
- **最近の変更**：`/changes` に、`git log -p` のようにコミットと差分を新しい順に並べたページを作る。

どちらからも、ソースの Markdown を行単位で比べた差分を開ける。
ソースの差分では、変わった文字を行内で強調し、統合と左右に並べる形を切り替えられる。

## インストール

```sh
bun add -d @kazamori/rspress-plugin-git-diff
```

```ts
// rspress.config.ts
import { defineConfig } from '@rspress/core';
import { pluginGitDiff } from '@kazamori/rspress-plugin-git-diff';

export default defineConfig({
  plugins: [pluginGitDiff()],
});
```

## ページの差分

`diff` パラメーターには git と同じ記法で版を渡す。

```
/guide/install?diff=a1b2c3d            # a1b2c3d でこのページに入った変更
/guide/install?diff=v1.0..HEAD         # v1.0 の時点から現在までの変更
/guide/install?diff=v1.0..             # 上と同じ（終点を省くと HEAD）
/guide/install?diff=a1b2c3d..e4f5a6b   # 二つの版のあいだの変更
```

変更は、表示しているページの段落、リストの項目、表の行、コードブロックの行に印を付けて示す。
一文一行で書いた段落では、変わった文だけに印を付ける。
削除した行はその位置にソースのまま示す。
画面下部のバーから、変更箇所を順に移動したり、ソースの差分を開いたりできる。
変更箇所の移動は、キーボードの `n` か `j` で次へ、`p` か `k` で前へ移ることもできる。
置き換えた文のように隣り合う削除と追加は、1 か所の変更として数える。
変更箇所がすべて画面に収まっているときは、移動のボタンを隠して箇所の数だけを示す。

表示しているページは現在の版なので、古いコミットを指定したときは、そのコミットで加えた行を現在の版まで辿って示す。
その後のコミットで書き換えた部分は、別の色で「その後さらに変更」として示す。
フロントマターのように本文に描画されない行の変更は、ページ上には示さず、その行数をバーに表示する。

版には、コミットハッシュ（4 文字以上の短縮形を含む）、タグ、`HEAD` を使える。
コミットハッシュは、そのページを変えたコミットに限る。
ページを変えていないコミットの時点を指したいときは、タグを使う。

## 最近の変更

`/changes` のページに、ドキュメントを変えたコミットを新しい順に `maxCommits` 件並べる。
各コミットの下に、変更したページごとに差分と、ページ本体と `?diff=` へのリンクを置く。
`multiVersion` や `locales` を使うサイトでは、バージョンと言語ごとに 1 ページを作る（`/en/changes`、`/v1/en/changes` など）。

次の変更は一覧に出さない。

- ファイルの追加（`multiVersion` でディレクトリをコピーしたコミットを含む）
- 内容を変えないリネーム
- 空白と改行だけを変えた整形

画像と SVG の変更は、差分を出さずに変更したことだけを示す。

## オプション

| オプション | 既定値 | 説明 |
| --- | --- | --- |
| `changesRoutePath` | `'/changes'` | 最近の変更のページの URL。バージョンと言語の接頭辞の後に付く |
| `changesTitle` | 言語ごとの既定の題 | 最近の変更のページの題。`{ ja: '...', en: '...' }` の形で渡す |
| `maxCommits` | `50` | 最近の変更に載せるコミット数 |
| `maxDiffLines` | `200` | 最近の変更で、変更行がこれを超える差分は折りたたむ |
| `commitMessage` | `'strip-refs'` | `'full'` は要約行をそのまま、`'strip-refs'` は issue への参照を取り除いて、`'none'` は表示しない |
| `issueRefPattern` | `#123`、`group/project#45`、`!67` | `strip-refs` で取り除くパターン。`g` フラグが必要 |
| `since` | なし | このタグかコミットより後の履歴だけを書き出す |
| `tagPattern` | なし | `?diff=` で使えるタグを絞る |
| `showAuthor` | `false` | コミットの作者名を表示する |

コミットメッセージは要約行（1 行目）だけを使い、本文は書き出さない。
作者のメールアドレスも書き出さない。

## 公開される内容

履歴は `_git-diff/` 配下の静的ファイルとして置くので、差分のパネルを開かなくても、誰でも各版の全文を取得できる。
過去に消した記述も、その版の内容として公開される。
公開したくない過去の版があるときは、`since` でそれより前の履歴を書き出さないようにする。

## CI での設定

浅いクローンでは履歴が途中で切れるので、全履歴とタグを取得してからビルドする。
浅いクローンを検出したときは、ビルド時に警告を出す。

```yaml
# GitHub Actions
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
    fetch-tags: true
```

## 開発

ツールの版は `mise.toml` で管理し、パッケージの管理とスクリプトの実行には bun を使う。

```sh
mise install
bun install
bun run typecheck
bun run test
bun run build
```

### サンプルのサイト

表示を手元で確かめるためのサイトを `example/` に置いている。
ドキュメントは `example/site/` の git リポジトリに入れるが、外側のリポジトリには入れ子の `.git` をコミットできないので、履歴は生成のスクリプトで作る。
スクリプトは、誤記の修正、設定値の変更、整形だけの変更、リネーム、ページの削除、画像の変更、長い変更、タグを順に積む。

```sh
bun run example:setup   # example/site を作り直す
bun run example:dev     # 開発サーバーを起動する
bun run example:build   # example/doc_build にビルドする
bun run example:preview # ビルドの結果を配信する
```

たとえば次の URL で表示を確かめられる。

- `http://localhost:3000/changes`
- `http://localhost:3000/guide/install?diff=HEAD`
- `http://localhost:3000/guide/configuration?diff=v1.0..`

### 公開

`bun publish` で npm に公開する。
公開の前に `prepublishOnly` で型チェック、テスト、ビルドを実行する。

## ライセンス

MIT
