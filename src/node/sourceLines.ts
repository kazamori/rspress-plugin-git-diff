// Marks rendered elements with the source lines they come from, so that the
// browser can show a diff on the page itself. Only page files are marked;
// a file imported into a page has its own line numbers, and the page route on
// each element tells the browser which page the numbers belong to.
import { LINES_PROPERTY, PAGE_PROPERTY } from '../runtime/attributes';

const BLOCK_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'tr',
  'blockquote',
  'dt',
  'dd',
  'div',
  'hr',
  'img',
]);

interface Position {
  start: { line: number };
  end: { line: number };
}

interface Node {
  type: string;
  tagName?: string;
  position?: Position;
  properties?: Record<string, unknown>;
  data?: Record<string, unknown>;
  children?: Node[];
}

interface File {
  path?: string;
}

/** Returns the route of a page file, or undefined for any other file. */
export type PageRouteOf = (file: string) => string | undefined;

/**
 * Wraps code blocks in an element carrying their lines, because syntax
 * highlighting replaces the rendered `pre` element and drops its position.
 */
export function remarkCodeLines(options: { pageRouteOf: PageRouteOf }) {
  return (tree: Node, file: File) => {
    const route = file.path && options.pageRouteOf(file.path);
    if (!route) return;
    const visit = (node: Node) => {
      const children = node.children;
      if (!children) return;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.type === 'code' && child.position) {
          children[i] = {
            type: 'gitDiffCode',
            data: { hName: 'div', hProperties: sourceProperties(route, child.position) },
            children: [child],
          };
        } else {
          visit(child);
        }
      }
    };
    visit(tree);
  };
}

export function rehypeSourceLines(options: { pageRouteOf: PageRouteOf }) {
  return (tree: Node, file: File) => {
    const route = file.path && options.pageRouteOf(file.path);
    if (!route) return;
    const visit = (node: Node) => {
      if (
        node.type === 'element' &&
        node.tagName &&
        BLOCK_TAGS.has(node.tagName) &&
        node.position &&
        node.properties?.[LINES_PROPERTY] === undefined
      ) {
        node.properties = { ...node.properties, ...sourceProperties(route, node.position) };
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  };
}

function sourceProperties(route: string, position: Position): Record<string, string> {
  return {
    [LINES_PROPERTY]: `${position.start.line}-${position.end.line}`,
    [PAGE_PROPERTY]: route,
  };
}
