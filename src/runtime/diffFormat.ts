import { useSyncExternalStore } from 'react';
import type { DiffFormat } from './render';

const STORAGE_KEY = 'rspress-plugin-git-diff:format';
const listeners = new Set<() => void>();
let current: DiffFormat | undefined;

function read(): DiffFormat {
  if (current) {
    return current;
  }
  try {
    current = localStorage.getItem(STORAGE_KEY) === 'split' ? 'split' : 'unified';
  } catch {
    current = 'unified';
  }
  return current;
}

export function setDiffFormat(format: DiffFormat): void {
  current = format;
  try {
    localStorage.setItem(STORAGE_KEY, format);
  } catch {
    // Storage may be unavailable, for example in a private window.
  }
  for (const listener of listeners) listener();
}

/** The diff layout shared by every diff on the page and remembered across visits. */
export function useDiffFormat(): DiffFormat {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    () => 'unified',
  );
}
