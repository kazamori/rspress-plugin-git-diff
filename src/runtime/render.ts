// Loaded with a dynamic import so that pages without diffs do not download
// jsdiff and diff2html.
import { createTwoFilesPatch } from 'diff';
import { html } from 'diff2html';
import type { Diff2HtmlConfig } from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';

export type DiffFormat = 'unified' | 'split';

export function createPatch(name: string, before: string, after: string): string {
  return createTwoFilesPatch(name, name, before, after, undefined, undefined, { context: 3 });
}

export function countChangedLines(patch: string): number {
  let count = 0;
  for (const line of patch.split('\n')) {
    if ((line.startsWith('+') && !line.startsWith('+++')) || (line.startsWith('-') && !line.startsWith('---'))) {
      count++;
    }
  }
  return count;
}

export function renderPatch(patch: string, format: DiffFormat, dark: boolean): string {
  const config: Diff2HtmlConfig = {
    drawFileList: false,
    outputFormat: format === 'split' ? 'side-by-side' : 'line-by-line',
    matching: 'lines',
    // Word matching treats a Japanese sentence without spaces as one word.
    diffStyle: 'char',
    colorScheme: (dark ? 'dark' : 'light') as Diff2HtmlConfig['colorScheme'],
  };
  return html(patch, config);
}
