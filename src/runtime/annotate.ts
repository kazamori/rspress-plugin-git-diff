// Marks a change on the rendered page. The build adds the source lines of each
// block to the HTML (see `attributes.ts`); this module finds the blocks that
// render changed lines and marks them, or inserts the removed lines.
import { LINES_ATTRIBUTE, pageBlocksSelector } from './attributes';
import { groupChanges, type PageMarks } from './lineMap';
import { findText, plainText, unwrap, wrapRange } from './textRange';

export interface Annotation {
  /** Inserted or marked elements in document order. */
  markers: HTMLElement[];
  /**
   * Places to visit in document order. A place holds the elements of one change,
   * such as a removed sentence and the sentence that replaced it.
   */
  stops: HTMLElement[][];
  /** Changed lines that match no rendered element, such as front matter or imports. */
  unplaced: number;
  remove: () => void;
}

/** A rendered element and the source lines it comes from. */
interface Block {
  element: HTMLElement;
  start: number;
  end: number;
}

type Kind = 'added' | 'later';

/** Element classes, also used by the styles. */
const markClass = {
  block: (kind: Kind) => `rp-git-diff-${kind}`,
  inline: (kind: Kind) => `rp-git-diff-${kind}-inline`,
  codeLine: (kind: Kind) => `rp-git-diff-${kind}-line`,
};

/**
 * Marks the changes on the rendered page of `routePath`. `lines` are the lines
 * of the version the page shows, which the line attributes refer to.
 */
export function annotatePage(
  root: ParentNode,
  routePath: string,
  marks: PageMarks,
  lines: string[],
): Annotation {
  const blocks = collectBlocks(root, routePath);
  const undo: (() => void)[] = [];
  // The elements that show each changed line, for grouping them into stops.
  const elementsByLine = new Map<number, HTMLElement[]>();
  const record = (line: number, element: HTMLElement) => {
    elementsByLine.set(line, [...(elementsByLine.get(line) ?? []), element]);
  };
  let unplaced = 0;

  for (const [line, kind] of changedLines(marks)) {
    const block = innermost(blocks, line);
    if (!block) {
      if (lines[line - 1]?.trim()) unplaced++;
      continue;
    }
    const marked = markLine(block, line, lines[line - 1] ?? '', kind);
    if (marked.undo) undo.push(marked.undo);
    record(line, marked.element);
  }

  for (const deletion of marks.deletions) {
    const inserted = insertDeletion(blocks, deletion.anchor, deletion.lines, lines);
    if (inserted.length === 0) {
      unplaced += deletion.lines.filter((line) => line.trim()).length;
      continue;
    }
    undo.push(() => {
      for (const element of inserted) element.remove();
    });
    for (const element of inserted) record(deletion.anchor, element);
  }

  const stops = mergeStops(
    groupChanges(marks).map((group) =>
      sortByDocument(unique(group.flatMap((line) => elementsByLine.get(line) ?? []))),
    ),
  );
  return {
    markers: sortByDocument(unique([...elementsByLine.values()].flat())),
    stops,
    unplaced,
    remove: () => {
      for (const step of undo.reverse()) step();
    },
  };
}

function changedLines(marks: PageMarks): [number, Kind][] {
  return [
    ...[...marks.added].map((line): [number, Kind] => [line, 'added']),
    ...[...marks.later].map((line): [number, Kind] => [line, 'later']),
  ];
}

/**
 * Marks one changed line: a line of a code block, a sentence of running text,
 * or else the whole block. `undo` is absent when the block was already marked.
 */
function markLine(
  block: Block,
  line: number,
  source: string,
  kind: Kind,
): { element: HTMLElement; undo?: () => void } {
  // Index 0 of a code block is its opening fence, which renders no line.
  const codeLine = codeLinesOf(block.element)?.[line - block.start - 1];
  if (codeLine) {
    return { element: codeLine, undo: addClass(codeLine, markClass.codeLine(kind)) };
  }

  const splittable = block.start !== block.end && isRunningText(block.element);
  const range = splittable ? findText(block.element, plainText(source)) : undefined;
  const mark = range && wrapRange(range, 'mark', markClass.inline(kind));
  if (mark) {
    return { element: mark, undo: () => unwrap(mark) };
  }

  if (block.element.classList.contains(markClass.block(kind))) {
    return { element: block.element };
  }
  return { element: block.element, undo: addClass(block.element, markClass.block(kind)) };
}

/** Shows removed source lines at `anchor`, the line that now follows them. */
function insertDeletion(
  blocks: Block[],
  anchor: number,
  removed: string[],
  lines: string[],
): HTMLElement[] {
  const visible = removed.filter((line) => line.trim() !== '');
  // Lines before the first rendered block, such as front matter, are not on the page.
  const firstLine = Math.min(...blocks.map((b) => b.start));
  if (visible.length === 0 || anchor < firstLine) return [];

  // When the anchor is inside a block, the lines were removed from that block.
  const container = innermost(blocks, anchor);
  if (container && container.start < anchor) {
    const inside =
      insertIntoCode(container, anchor, removed) ??
      insertIntoText(container, visible, lines[anchor - 1] ?? '');
    if (inside) return [inside];
    return insertBefore(container, visible);
  }

  const next = blockStartingAt(blocks, anchor);
  if (next) return insertBefore(next, visible);
  const last = lastBlockBefore(blocks, anchor);
  return last ? insertAfter(last, visible) : [];
}

/** Puts removed code lines between the rendered lines of a code block. */
function insertIntoCode(block: Block, anchor: number, removed: string[]): HTMLElement | undefined {
  const codeLines = codeLinesOf(block.element);
  const code = codeLines?.[0]?.parentElement;
  if (!codeLines || !code) return undefined;

  const wrapper = document.createElement('span');
  wrapper.className = 'rp-git-diff-deleted-lines';
  for (const text of removed) {
    const line = document.createElement('span');
    line.className = 'line rp-git-diff-deleted-line';
    line.textContent = text;
    wrapper.append(line, '\n');
  }
  const next = codeLines[anchor - block.start - 1];
  if (next) {
    code.insertBefore(wrapper, next);
  } else {
    code.append('\n', wrapper);
  }
  return wrapper;
}

/** Puts a removed sentence inline before the sentence that now follows it. */
function insertIntoText(block: Block, removed: string[], following: string): HTMLElement | undefined {
  if (!isRunningText(block.element)) return undefined;
  const range = findText(block.element, plainText(following));
  if (!range) return undefined;

  const del = document.createElement('del');
  del.className = 'rp-git-diff-deleted-inline';
  del.textContent = removed.map(plainText).join(' ');
  // Stay outside the mark of the sentence that replaced the removed one.
  const start = range.startContainer.parentElement;
  if (range.startOffset === 0 && start?.matches('mark[class^="rp-git-diff-"]')) {
    start.before(del);
  } else {
    range.collapse(true);
    range.insertNode(del);
  }
  return del;
}

function insertBefore(block: Block, removed: string[]): HTMLElement[] {
  const elements = deletedElements(block, removed);
  block.element.before(...elements);
  return elements;
}

function insertAfter(block: Block, removed: string[]): HTMLElement[] {
  const elements = deletedElements(block, removed);
  block.element.after(...elements);
  return elements;
}

/** Removed lines next to a table row become rows, so that the table stays valid. */
function deletedElements(neighbor: Block, removed: string[]): HTMLElement[] {
  if (neighbor.element instanceof HTMLTableRowElement) {
    return deletedRows(removed, neighbor.element.cells.length);
  }
  const box = document.createElement('div');
  box.className = 'rp-git-diff-deleted';
  const content = document.createElement('del');
  content.textContent = removed.join('\n');
  box.appendChild(content);
  return [box];
}

/** Removed table rows, one cell per column. */
function deletedRows(lines: string[], columns: number): HTMLElement[] {
  return lines.map((line) => {
    const row = document.createElement('tr');
    row.className = 'rp-git-diff-deleted';
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
    for (let i = 0; i < Math.max(columns, 1); i++) {
      const cell = document.createElement('td');
      const del = document.createElement('del');
      del.textContent = plainText(cells[i] ?? '');
      cell.appendChild(del);
      row.appendChild(cell);
    }
    return row;
  });
}

function collectBlocks(root: ParentNode, routePath: string): Block[] {
  const blocks: Block[] = [];
  for (const element of root.querySelectorAll<HTMLElement>(pageBlocksSelector(routePath))) {
    const match = /^(\d+)-(\d+)$/.exec(element.getAttribute(LINES_ATTRIBUTE) ?? '');
    if (match) blocks.push({ element, start: Number(match[1]), end: Number(match[2]) });
  }
  return blocks;
}

/** The smallest block that renders `line`. */
function innermost(blocks: Block[], line: number): Block | undefined {
  let best: Block | undefined;
  for (const block of blocks) {
    if (block.start <= line && line <= block.end) {
      if (!best || block.end - block.start < best.end - best.start) best = block;
    }
  }
  return best;
}

/** The first block at or after `line`, preferring a table row over its cells or table. */
function blockStartingAt(blocks: Block[], line: number): Block | undefined {
  let best: Block | undefined;
  for (const block of blocks) {
    if (block.start < line) continue;
    if (
      !best ||
      block.start < best.start ||
      (block.start === best.start && block.end - block.start > best.end - best.start)
    ) {
      best = block;
    }
  }
  const row = blocks.find((b) => b.element instanceof HTMLTableRowElement && b.start === best?.start);
  return row ?? best;
}

function lastBlockBefore(blocks: Block[], line: number): Block | undefined {
  let best: Block | undefined;
  for (const block of blocks) {
    if (block.end < line && (!best || block.end > best.end)) best = block;
  }
  return best;
}

/** The rendered lines of a highlighted code block, one per source line. */
function codeLinesOf(element: HTMLElement): HTMLElement[] | undefined {
  const code = element.querySelector('pre > code');
  if (!code) return undefined;
  return [...code.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.classList.contains('line') &&
      !child.classList.contains('rp-git-diff-deleted-line'),
  );
}

/** Whether the element is running text, where single sentences can be marked. */
function isRunningText(element: HTMLElement): boolean {
  return ['P', 'LI', 'DD', 'DT', 'BLOCKQUOTE'].includes(element.tagName);
}

/** Adds a class and returns how to restore the element exactly. */
function addClass(element: HTMLElement, name: string): () => void {
  const hadClass = element.hasAttribute('class');
  element.classList.add(name);
  return () => {
    element.classList.remove(name);
    if (!hadClass && element.classList.length === 0) element.removeAttribute('class');
  };
}

/**
 * Drops empty stops and merges stops that share an element, which happens when
 * one marked block renders lines of two separate changes.
 */
function mergeStops(stops: HTMLElement[][]): HTMLElement[][] {
  const merged: HTMLElement[][] = [];
  for (const stop of stops) {
    if (stop.length === 0) continue;
    const last = merged.at(-1);
    if (last && stop.some((element) => last.includes(element))) {
      merged[merged.length - 1] = sortByDocument(unique([...last, ...stop]));
    } else {
      merged.push(stop);
    }
  }
  return merged;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function sortByDocument(elements: HTMLElement[]): HTMLElement[] {
  return elements.sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );
}
