// Creates example/site, a git repository whose history covers the cases the
// plugin handles: typo fixes, value changes, whitespace-only reflows, added,
// renamed and deleted pages, image changes, long changes and tags.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const siteDir = path.join(import.meta.dirname, '..', 'site');
const docsDir = path.join(siteDir, 'docs');

let day = 0;

function git(...args: string[]): void {
  // Fixed dates make the history the same on every run.
  // Vary the time of day so that the times on the page differ.
  const hour = String(9 + ((day * 5) % 10)).padStart(2, '0');
  const minute = String((day * 17) % 60).padStart(2, '0');
  const date = `2026-09-${String(day).padStart(2, '0')}T${hour}:${minute}:00+09:00`;
  execFileSync('git', args, {
    cwd: siteDir,
    stdio: 'pipe',
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: date,
      GIT_COMMITTER_DATE: date,
      GIT_COMMITTER_NAME: 'Docs Bot',
      GIT_COMMITTER_EMAIL: 'docs@example.com',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
    },
  });
}

function write(file: string, content: string): void {
  const target = path.join(docsDir, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${content.trim()}\n`);
}

function remove(file: string): void {
  rmSync(path.join(docsDir, file));
}

function commit(author: string, message: string): void {
  day++;
  git('add', '-A');
  git('commit', '-q', `--author=${author} <${author.toLowerCase()}@example.com>`, '-m', message);
}

function svg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="${color}"/></svg>`;
}

const installJa = (version: string, command: string, configPage = 'config') => `
# インストール

## 必要な環境

Node.js ${version} 以上が必要である。

## 手順

次のコマンドでパッケージをインストールする。

\`\`\`sh
${command}
\`\`\`

インストールが終わったら、設定ファイルを作る。
設定の項目は[設定](./${configPage})のページで説明する。
`;

const configJa = (timeout: number, retries: number) => `
# 設定

設定ファイルは \`example.config.json\` である。

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| \`timeout\` | ${timeout} | 接続を待つ秒数 |
| \`retries\` | ${retries} | 失敗したときに再試行する回数 |

\`timeout\` を短くしすぎると、遅いネットワークで接続に失敗することがある。
`;

// Breaks the last sentence of the config page after the comma.
const reflow = (content: string) =>
  content.replace('短くしすぎると、遅い', '短くしすぎると、\n遅い');

const installEn = (version: string) => `
# Installation

You need Node.js ${version} or later.

\`\`\`sh
npm install example
\`\`\`
`;

const faqJa = (answer: string) => `
# よくある質問

## 接続に失敗する

${answer}
`;

function longPage(sections: number, revised: boolean): string {
  const lines = ['# リリースの手順', ''];
  for (let i = 1; i <= sections; i++) {
    lines.push(`## 手順 ${i}`, '');
    lines.push(
      revised
        ? `手順 ${i} では、作業の前に変更内容を確認し、確認した結果を記録する。`
        : `手順 ${i} では、変更内容を確認する。`,
    );
    lines.push('');
  }
  return lines.join('\n');
}

rmSync(siteDir, { recursive: true, force: true });
mkdirSync(siteDir, { recursive: true });
git('init', '-q', '-b', 'main');

write('ja/index.md', '# サンプル\n\nrspress-plugin-git-diff の表示を確かめるためのサイトである。');
write('en/index.md', '# Example\n\nA site to try rspress-plugin-git-diff.');
write('ja/guide/install.md', installJa('18', 'npm instal example'));
write('ja/guide/config.md', configJa(30, 3));
write('ja/guide/images/flow.svg', svg('#4f46e5'));
write('ja/guide/release.md', longPage(30, false));
write('en/guide/install.md', installEn('18'));
// The navigation bar links to the page the plugin adds. A nav in the config
// would turn off the sidebar generated from the files, so the nav is in
// _nav.json instead; Rspress adds the language prefix to its links. With a
// _nav.json alone, Rspress builds a sidebar for each subdirectory only, so the
// _meta.json keeps one sidebar for the whole language directory.
const sidebar = JSON.stringify(
  ['index', { type: 'dir', name: 'guide', label: 'guide', collapsible: true }],
  null,
  2,
);
write('ja/_nav.json', JSON.stringify([{ text: '最近の変更', link: '/changes' }], null, 2));
write('ja/_meta.json', sidebar);
write('en/_nav.json', JSON.stringify([{ text: 'Recent changes', link: '/changes' }], null, 2));
write('en/_meta.json', sidebar);
commit('Alice', 'ドキュメントを追加する');

write('ja/guide/install.md', installJa('18', 'npm install example'));
commit('Bob', 'インストールのコマンドの誤記を直す (#12)');

write('ja/guide/config.md', configJa(60, 3));
commit('Alice', 'timeout の既定値を 60 秒に直す group/docs#45');

// Only the line breaks change, so the plugin hides this commit from the lists.
write('ja/guide/config.md', reflow(configJa(60, 3)));
commit('Bob', '一文一行に整形する');
git('tag', 'v1.0');

write('ja/guide/faq.md', faqJa('ネットワークの設定を確認する。'));
commit('Alice', 'よくある質問のページを追加する');

write('ja/guide/install.md', installJa('20', 'npm install example'));
write('en/guide/install.md', installEn('20'));
commit('Carol', '必要な Node.js の版を 20 に上げる !7');

remove('ja/guide/config.md');
write('ja/guide/configuration.md', reflow(configJa(60, 5)));
write('ja/guide/install.md', installJa('20', 'npm install example', 'configuration'));
commit('Bob', '設定のページの URL を変え、retries の既定値を直す');

write('ja/guide/images/flow.svg', svg('#059669'));
commit('Alice', '図の色を変える');

write('ja/guide/faq.md', faqJa('ネットワークの設定と、`timeout` の値を確認する。'));
commit('Carol', 'よくある質問の回答を補う');

remove('ja/guide/faq.md');
commit('Alice', 'よくある質問のページを削除する');

// Changes a code block, adds a list and removes one sentence of a paragraph.
write(
  'ja/guide/install.md',
  installJa('20', 'npm install example\nnpx example init', 'configuration')
    .replace('インストールが終わったら、設定ファイルを作る。\n', '')
    .replace(
      '## 手順',
      '## 手順\n\n作業の前に、次の 2 点を確かめる。\n\n- ネットワークに接続している\n- 書き込みの権限がある',
    ),
);
commit('Carol', '初期化のコマンドと事前の確認を加える');

write('ja/guide/release.md', longPage(30, true));
commit('Bob', 'リリースの手順に記録の作業を加える');
git('tag', '-a', 'v1.1', '-m', 'v1.1');

console.log(`created ${siteDir}`);
