// HTML attributes that the build adds to rendered pages and the browser reads.
// Shared by both sides, so this file must not import browser-only modules.

/** `start-end`, the 1-based source lines that a rendered element comes from. */
export const LINES_ATTRIBUTE = 'data-git-diff-lines';
/** The same attribute as a hast property name. */
export const LINES_PROPERTY = 'dataGitDiffLines';

/** The route of the page whose source the line numbers refer to. */
export const PAGE_ATTRIBUTE = 'data-git-diff-page';
export const PAGE_PROPERTY = 'dataGitDiffPage';

/** Selects the elements with source lines of one page. */
export function pageBlocksSelector(routePath: string): string {
  return `[${PAGE_ATTRIBUTE}="${CSS.escape(routePath)}"][${LINES_ATTRIBUTE}]`;
}
