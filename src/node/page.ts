const PAGE_EXTENSIONS = ['.md', '.mdx'];
const ASSET_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'];

export function isPageFile(path: string): boolean {
  return hasExtension(path, PAGE_EXTENSIONS);
}

export function isAssetFile(path: string): boolean {
  return hasExtension(path, ASSET_EXTENSIONS);
}

function hasExtension(path: string, extensions: string[]): boolean {
  const lower = path.toLowerCase();
  return extensions.some((extension) => lower.endsWith(extension));
}

/** Whether two versions differ only in whitespace, including line breaks. */
export function isFormatOnlyChange(before: string, after: string): boolean {
  return before !== after && before.replace(/\s+/g, '') === after.replace(/\s+/g, '');
}

/** Takes the title from the front matter or the first level-1 heading. */
export function extractTitle(content: string): string | undefined {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (frontmatter) {
    const title = /^title:\s*(.+?)\s*$/m.exec(frontmatter[1]);
    if (title) {
      return unquote(title[1]);
    }
  }
  const body = frontmatter ? content.slice(frontmatter[0].length) : content;
  const heading = /^#\s+(.+?)\s*#*\s*$/m.exec(body);
  return heading ? plainHeading(heading[1]) : undefined;
}

/** Removes a custom anchor such as `{#id}` and the syntax of inline Markdown. */
function plainHeading(heading: string): string | undefined {
  const text = heading
    .replace(/\s*\{#[^}]*\}$/, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(`+)(.+?)\1/g, '$2')
    .replace(/(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, '$2')
    .replace(/(?<![\w*])\*(?=\S)(.+?)(?<=\S)\*(?![\w*])/g, '$1')
    .replace(/(?<!\w)_(?=\S)(.+?)(?<=\S)_(?!\w)/g, '$1')
    .trim();
  return text || undefined;
}

function unquote(value: string): string {
  const quoted = /^(['"])(.*)\1$/.exec(value);
  return quoted ? quoted[2] : value;
}
