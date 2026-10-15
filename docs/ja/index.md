---
pageType: home
hero:
  name: rspress-plugin-git-diff
  text: ページごとの変更を、サイト上で確かめる
  tagline: ドキュメントの git の履歴を、読み手がたどれる差分にする Rspress v2 のプラグイン。リポジトリを公開していなくても使える。
  actions:
    - theme: brand
      text: はじめる
      link: /ja/guide/getting-started
    - theme: alt
      text: 最近の変更
      link: /ja/changes
features:
  - title: ページそのものに差分を示す
    details: ページの URL に ?diff= を付けると、描画されたページの上で、変わった文に印が付く。
  - title: 最近の変更の一覧
    details: /changes のページに、git log -p のようにコミットとページごとの差分を並べる。
  - title: 小さな修正も見落とさない
    details: リリースノートに載らない誤記の修正や設定値の変更にも、読み手が気付ける。
  - title: リポジトリへのアクセスは不要
    details: 履歴はビルド時に読み出し、静的なファイルとしてサイトと一緒に公開する。
---
