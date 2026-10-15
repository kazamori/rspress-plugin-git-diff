// UI texts registered through the `i18nSource` hook.
export const i18nTexts: Record<string, Record<string, string>> = {
  gitDiffTitle: { en: 'Changes', ja: '差分', zh: '差异' },
  gitDiffClose: { en: 'Close', ja: '閉じる', zh: '关闭' },
  gitDiffUnified: { en: 'Unified', ja: '統合', zh: '统一' },
  gitDiffSplit: { en: 'Side by side', ja: '左右に並べる', zh: '并排' },
  gitDiffLoading: { en: 'Loading…', ja: '読み込み中…', zh: '加载中…' },
  gitDiffLoadError: {
    en: 'Failed to load the history.',
    ja: '履歴を読み込めませんでした。',
    zh: '无法加载历史记录。',
  },
  gitDiffNoHistory: {
    en: 'No history is available for this page.',
    ja: 'このページには表示できる履歴がありません。',
    zh: '此页面没有可显示的历史记录。',
  },
  gitDiffSyntax: {
    en: 'The diff parameter must be <rev> or <from>..<to>.',
    ja: 'diff パラメーターは <rev> または <from>..<to> の形で指定してください。',
    zh: 'diff 参数的格式应为 <rev> 或 <from>..<to>。',
  },
  gitDiffNotFound: {
    en: '{{rev}} is not in the history of this page.',
    ja: '{{rev}} はこのページの履歴にありません。',
    zh: '{{rev}} 不在此页面的历史记录中。',
  },
  gitDiffAmbiguous: {
    en: '{{rev}} matches more than one version:',
    ja: '{{rev}} に一致する版が複数あります。',
    zh: '{{rev}} 匹配多个版本：',
  },
  gitDiffNoChange: {
    en: 'The page did not change between these versions.',
    ja: 'この範囲ではページは変わっていません。',
    zh: '在这些版本之间页面没有变化。',
  },
  gitDiffOpenDiff: { en: 'Show on page', ja: 'ページ上で表示', zh: '在页面上显示' },
  gitDiffDeleted: { en: 'Page deleted', ja: 'ページを削除しました', zh: '页面已删除' },
  gitDiffRenamed: { en: 'Moved', ja: '移動しました', zh: '已移动' },
  gitDiffAssetChanged: {
    en: 'File changed',
    ja: 'ファイルを変更しました',
    zh: '文件已更改',
  },
  gitDiffAssetDeleted: {
    en: 'File deleted',
    ja: 'ファイルを削除しました',
    zh: '文件已删除',
  },
  gitDiffShowLong: {
    en: 'Show the diff ({{lines}} changed lines)',
    ja: '差分を表示する（変更 {{lines}} 行）',
    zh: '显示差异（{{lines}} 行更改）',
  },
  gitDiffSource: { en: 'Source diff', ja: 'ソースの差分', zh: '源码差异' },
  gitDiffPrev: { en: 'Previous change', ja: '前の変更', zh: '上一处更改' },
  gitDiffNext: { en: 'Next change', ja: '次の変更', zh: '下一处更改' },
  gitDiffChangeCount: { en: '{{count}} changes', ja: '{{count}} か所', zh: '{{count}} 处' },
  gitDiffLegendAdded: { en: 'Added or changed', ja: '追加と変更', zh: '新增或更改' },
  gitDiffLegendDeleted: { en: 'Deleted', ja: '削除', zh: '删除' },
  gitDiffLegendLater: {
    en: 'Changed again later',
    ja: 'その後さらに変更',
    zh: '之后再次更改',
  },
  gitDiffNoMarks: {
    en: 'The changes could not be shown on the page; see the source diff.',
    ja: '変更箇所をページ上に示せませんでした。ソースの差分で確認してください。',
    zh: '无法在页面上显示更改，请查看源码差异。',
  },
  gitDiffUnplaced: {
    en: '{{count}} changed lines are not shown on the page; see the source diff.',
    ja: 'ページ上に示せない変更が {{count}} 行あります。ソースの差分で確認してください。',
    zh: '有 {{count}} 行更改无法在页面上显示，请查看源码差异。',
  },
  gitDiffCollapse: { en: 'Collapse the diff', ja: '差分を折りたたむ', zh: '折叠差异' },
  gitDiffEmptyLog: { en: 'No changes yet.', ja: '変更はまだありません。', zh: '暂无更改。' },
};
