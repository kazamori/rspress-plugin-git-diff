import { performance } from 'node:perf_hooks';

/** Reports the time, heap and counts of each step of reading the history. */
export interface Stats {
  step(name: string, details?: Record<string, number>): void;
}

const MiB = 1024 * 1024;

/** Stats that report through `report`, or do nothing without it. */
export function createStats(report: ((message: string) => void) | undefined): Stats {
  if (!report) {
    return { step() {} };
  }
  let last = performance.now();
  return {
    step(name, details = {}) {
      const now = performance.now();
      const heap = process.memoryUsage().heapUsed / MiB;
      const parts = [
        `${Math.round(now - last)} ms`,
        ...Object.entries(details).map(([key, value]) => `${key} ${value}`),
        `heap ${heap.toFixed(1)} MiB`,
      ];
      report(`${name}: ${parts.join(', ')}`);
      last = now;
    },
  };
}
