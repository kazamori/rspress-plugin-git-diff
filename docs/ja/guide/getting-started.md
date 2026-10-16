# はじめに

rspress-plugin-git-diff は、Rspress のサイトのページがどう変わったかを読み手に示すプラグインである。
サイトのビルド時にドキュメントの git の履歴を読み出し、サイトと一緒に公開する。
そのため、読み手はリポジトリにアクセスしなくても変更を確かめられる。

リリースノートや CHANGELOG に書くのは、機能の追加や仕様の変更であることが多い。
誤記の修正や既定値の変更のような小さな修正はそこに載らず、読み手はソースを見比べないと気付けない。
このプラグインは、そうした修正をサイト上で見えるようにする。

## 必要な環境

- Rspress v2
- ドキュメントが git のリポジトリにあり、その中でビルドすること
- ビルド時に全履歴を参照できること（CI の設定は[公開](./publishing#ci-でのビルド)を参照）

## インストール

```sh
npm install -D @kazamori/rspress-plugin-git-diff
```

ほかのパッケージマネージャーでも入れられる（`bun add -d @kazamori/rspress-plugin-git-diff` など）。

## プラグインの追加

```ts title="rspress.config.ts"
import { defineConfig } from '@rspress/core';
import { pluginGitDiff } from '@kazamori/rspress-plugin-git-diff';

export default defineConfig({
  plugins: [pluginGitDiff()],
});
```

たいていのサイトは既定の設定のまま使える。
設定を変えるときは[オプション](./options)を参照する。

## 動作の確認

サイトをビルドするか開発サーバーを起動し、次の URL を開く。

- `/changes` には、最近のコミットと差分が並ぶ。詳しくは[最近の変更](./recent-changes)を参照する。このページへのリンクはプラグインが加えないので、[ナビゲーションに置く](./recent-changes#ページへのリンク)。
- 任意のページに `?diff=HEAD` を付けて開くと（`/guide/getting-started?diff=HEAD` など）、そのページの最新の変更に、ページ上で印が付く。詳しくは[ページ上の差分](./on-page-diff)を参照する。

このサイト自体もこのプラグインを使っている。
[最近の変更](/ja/changes)を開くか、そこにある「ページ上で表示」のリンクをたどると、動作を確かめられる。
