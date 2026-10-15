import type { Annotation } from './annotate';
import { pageBlocksSelector } from './attributes';
import { loadBlob } from './fetch';
import type { DiffTarget } from './resolve';
import { type AsyncState, useAsync } from './useAsync';

/**
 * Marks the change on the rendered page and removes the marks when the change
 * or the page changes. `head` is the blob of the version the page shows.
 */
export function usePageAnnotation(
  routePath: string,
  target: DiffTarget | undefined,
  head: string | undefined,
): AsyncState<Annotation> {
  return useAsync(
    target && head
      ? async (isCancelled) => {
          // The modules are loaded on demand, so pages without `diff` skip them.
          const [lineMap, annotate, from, to, current] = await Promise.all([
            import('./lineMap'),
            import('./annotate'),
            loadBlob(target.from),
            loadBlob(target.to),
            loadBlob(head),
          ]);
          const root = await waitForPage(routePath, isCancelled);
          if (!root) throw new Error(`the content of ${routePath} did not appear`);
          const marks = lineMap.markChanges(from, to, current);
          return annotate.annotatePage(root, routePath, marks, lineMap.splitLines(current));
        }
      : undefined,
    [routePath, target, head],
    (annotation) => annotation.remove(),
  );
}

/**
 * Waits until the content of the page is rendered. Right after moving between
 * pages, the previous page may still be on screen, so the blocks must carry
 * this page's route.
 */
async function waitForPage(
  routePath: string,
  isCancelled: () => boolean,
): Promise<ParentNode | undefined> {
  const selector = pageBlocksSelector(routePath);
  for (let attempt = 0; attempt < 100 && !isCancelled(); attempt++) {
    const root = document.querySelector('.rp-doc-layout__doc') ?? document.body;
    if (root.querySelector(selector)) return root;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return undefined;
}
