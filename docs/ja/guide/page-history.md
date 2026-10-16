# ページの変更履歴

各ページは、そのページ自身の変更履歴を示せる。
1 つのファイルに対する `git log -p` に当たる一覧である。
履歴はページの上に重ねたドロワーに開くので、読み手は読んでいた位置を離れずに済む。

## 履歴の開き方

既定では、各ページの末尾（文書のフッターの直前）に置いた 1 行から履歴を開く。

> このページの変更履歴（4 件、最終更新 2026-09-11）

ページの URL に `?history` を付けても開ける。
そのため、あるページの履歴へ直接リンクできる。
ドロワーは、閉じるボタン、Escape、ドロワーの外のクリック、ブラウザーの「戻る」のどれでも閉じる。

[最近の変更](./recent-changes)のページのように履歴のないページには、この 1 行を出さない。

## 履歴に示す内容

ドロワーには、そのページの版を新しい順に、最近の変更のページと同じ形で並べる。

- コミットに記録されたタイムゾーンでの日時、要約行、短縮したハッシュ（設定に応じて作者も）
- ドロワーを閉じて、そのページを `?diff=<hash>` 付きで開く「ページ上で表示」のリンク
- Markdown のソースの差分（統合か、左右に並べる形）。差分は画面に近づいたときに読み込み、変更した行が [`maxDiffLines`](./options) を超えるものは折りたたむ。

最近の変更のページで一覧から除く版（[一覧から除く変更](./recent-changes#一覧から除く変更)を参照）は、ここでも除く。
ただし、ページを追加した版だけは、差分を付けずに最後に示す。
こうすると、追加してから変わっていないページでも、いつ追加したかがわかる。

ドロワーに並べる版の数は [`maxPageRevisions`](./options) までで、それより古い版の数を最後に示す。
この上限は一覧に並べる数だけを決める。
[範囲の指定](./on-page-diff)では、すべての版を使える。

## 入り口の置き場所

履歴を開く入り口をプラグインがどこに置くかは、`pageHistory.entries` で選ぶ。

```ts title="rspress.config.ts"
pluginGitDiff({
  pageHistory: { entries: ['footer', 'nav'] },
});
```

- **`'footer'`**（既定値）：文書のフッターの直前に置く 1 行
- **`'nav'`**：ナビゲーションバーの、言語とテーマの切り替えの前に置く時計のアイコンのボタン
- **`[]`**：入り口を置かない。`?history` を付けた URL でだけ履歴を開ける。

履歴の機能そのものを止めるには、`pageHistory: false` にする。

## テーマで入り口を置く

プラグインは Rspress のレイアウトの slot を埋められないので、描画されたページに入り口を差し込む。
この差し込みは、既定のテーマの DOM 構造を前提にしている。
[カスタムテーマ](https://rspress.rs/guide/basic/custom-theme)を使うサイトでは、プラグインが公開するコンポーネントで、入り口を自分で置ける。

- **`PageHistoryLink`**：`'footer'` で置く 1 行
- **`PageHistoryButton`**：`'nav'` で置くボタン

```tsx title="theme/index.tsx"
import { PageHistoryButton, PageHistoryLink } from '@kazamori/rspress-plugin-git-diff/runtime';
import { Layout as BasicLayout } from '@rspress/core/theme-original';

function Layout() {
  return <BasicLayout afterNavMenu={<PageHistoryButton />} beforeDocFooter={<PageHistoryLink />} />;
}

export { Layout };
export * from '@rspress/core/theme-original';
```

バナーを加えるためなどで、テーマがすでに `Layout` を上書きしている場合は、ほかの props と一緒に同じ `BasicLayout` に渡す。
このとき、プラグインが同じ入り口を重ねて置かないように、`pageHistory: { entries: [] }` にする。
ドロワーは引き続きプラグインが描画し、これらのコンポーネントはドロワーを開くだけである。

## 読み込みの負荷

入り口を出すかどうかを決めるため、各ページは `git-diff-data/pages/` から自分の索引を取得する。
この索引は、[ページ上の差分](./on-page-diff)のためにビルドがすでに書き出している小さな JSON である。
履歴のないページではこの取得が 404 になり、ブラウザーのコンソールに記録されることがある。
