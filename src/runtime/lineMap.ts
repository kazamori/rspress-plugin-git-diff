import { diffArrays } from 'diff';

/** Lines removed at one place, shown before line `anchor` of the current version. */
export interface Deletion {
  /** 1-based line of the current version; one past the last line means the end. */
  anchor: number;
  lines: string[];
}

/** Where the changes between two versions fall on the current version of a page. */
export interface PageMarks {
  /** 1-based lines of the current version that the change added. */
  added: Set<number>;
  /** 1-based lines of the current version that replaced added lines later. */
  later: Set<number>;
  deletions: Deletion[];
}

/**
 * Groups changed lines that touch each other into one change, so that a
 * replacement (a deletion and the lines added at its place) or a run of added
 * lines with blank lines between counts as one place to visit.
 */
export function groupChanges(marks: PageMarks): number[][] {
  const lines = new Set<number>([...marks.added, ...marks.later]);
  for (const deletion of marks.deletions) lines.add(deletion.anchor);
  const sorted = [...lines].sort((a, b) => a - b);

  const groups: number[][] = [];
  for (const line of sorted) {
    const last = groups.at(-1);
    if (last && line <= (last.at(-1) ?? 0) + 1) {
      last.push(line);
    } else {
      groups.push([line]);
    }
  }
  return groups;
}

export function splitLines(text: string): string[] {
  const lines = text.split('\n');
  if (lines.at(-1) === '') {
    lines.pop();
  }
  return lines;
}

/**
 * Places the change from `from` to `to` on `current`, the version the page shows.
 * When `to` is older than `current`, added lines are followed to the current version;
 * those that were rewritten afterwards mark their replacements as `later`.
 */
export function markChanges(from: string, to: string, current: string): PageMarks {
  const change = lineChange(splitLines(from), splitLines(to));
  if (to === current) {
    return {
      added: new Set([...change.added].map((index) => index + 1)),
      later: new Set(),
      deletions: change.deletions.map((d) => ({ anchor: d.anchor + 1, lines: d.lines })),
    };
  }

  const toLines = splitLines(to);
  const currentLines = splitLines(current);
  const forward = followLines(toLines, currentLines, change.added);

  const added = new Set<number>();
  for (const index of change.added) {
    const mapped = forward.map.get(index);
    if (mapped !== undefined) added.add(mapped + 1);
  }
  const deletions = change.deletions.map((d) => ({
    anchor: nextMapped(forward.map, d.anchor, toLines.length, currentLines.length) + 1,
    lines: d.lines,
  }));
  return { added, later: forward.later, deletions };
}

interface LineChange {
  /** 0-based indexes in the newer version. */
  added: Set<number>;
  /** Anchors are 0-based indexes in the newer version. */
  deletions: Deletion[];
}

function lineChange(before: string[], after: string[]): LineChange {
  const added = new Set<number>();
  const deletions: Deletion[] = [];
  let index = 0;
  for (const part of diffArrays(before, after)) {
    if (part.removed) {
      deletions.push({ anchor: index, lines: part.value });
    } else if (part.added) {
      for (let i = 0; i < part.value.length; i++) added.add(index + i);
      index += part.value.length;
    } else {
      index += part.value.length;
    }
  }
  return { added, deletions };
}

function followLines(
  older: string[],
  newer: string[],
  addedInOlder: Set<number>,
): { map: Map<number, number>; later: Set<number> } {
  const map = new Map<number, number>();
  const later = new Set<number>();
  let oldIndex = 0;
  let newIndex = 0;
  // A hunk is a run of removed and added parts between unchanged lines.
  let hunkTouchesAdded = false;
  let hunkNewLines: number[] = [];
  const closeHunk = () => {
    if (hunkTouchesAdded) {
      for (const line of hunkNewLines) later.add(line + 1);
    }
    hunkTouchesAdded = false;
    hunkNewLines = [];
  };

  for (const part of diffArrays(older, newer)) {
    if (part.removed) {
      for (let i = 0; i < part.value.length; i++) {
        if (addedInOlder.has(oldIndex + i)) hunkTouchesAdded = true;
      }
      oldIndex += part.value.length;
    } else if (part.added) {
      for (let i = 0; i < part.value.length; i++) hunkNewLines.push(newIndex + i);
      newIndex += part.value.length;
    } else {
      closeHunk();
      for (let i = 0; i < part.value.length; i++) map.set(oldIndex + i, newIndex + i);
      oldIndex += part.value.length;
      newIndex += part.value.length;
    }
  }
  closeHunk();
  return { map, later };
}

/** Maps an anchor to the first following line that still exists. */
function nextMapped(map: Map<number, number>, anchor: number, oldLength: number, newLength: number): number {
  for (let index = anchor; index < oldLength; index++) {
    const mapped = map.get(index);
    if (mapped !== undefined) return mapped;
  }
  return newLength;
}
