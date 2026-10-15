// Finding and wrapping the text of one Markdown source line in rendered HTML,
// where the line's markup (links, emphasis, list markers) is gone.

/** The visible text of a Markdown source line, enough to find it on the page. */
export function plainText(line: string): string {
  return line
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')
    .replace(/^\s*>\s?/, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/(\*\*|__|~~|\*|_|`)/g, '')
    .trim();
}

/**
 * Finds `text` in the element and returns the range covering it. The text may
 * span several text nodes, for example across a link.
 */
export function findText(element: HTMLElement, text: string): Range | undefined {
  if (text === '') return undefined;
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text);
  const index = nodes.map((node) => node.data).join('').indexOf(text);
  if (index === -1) return undefined;

  const range = document.createRange();
  let offset = 0;
  let started = false;
  for (const node of nodes) {
    const next = offset + node.data.length;
    if (!started && index < next) {
      range.setStart(node, index - offset);
      started = true;
    }
    if (started && index + text.length <= next) {
      range.setEnd(node, index + text.length - offset);
      return range;
    }
    offset = next;
  }
  return undefined;
}

/** Wraps the range in a new element; fails when the range splits an element. */
export function wrapRange(range: Range, tagName: string, className: string): HTMLElement | undefined {
  const wrapper = document.createElement(tagName);
  wrapper.className = className;
  try {
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
  } catch {
    return undefined;
  }
  return wrapper;
}

/** Undoes `wrapRange`, merging the text nodes it split. */
export function unwrap(wrapper: HTMLElement): void {
  const parent = wrapper.parentNode;
  if (!parent) return;
  while (wrapper.firstChild) parent.insertBefore(wrapper.firstChild, wrapper);
  wrapper.remove();
  parent.normalize();
}
