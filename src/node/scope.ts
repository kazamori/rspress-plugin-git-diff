/** A version and language pair; each recent changes page covers one scope. */
export interface Scope {
  version: string;
  lang: string;
}

export interface SiteLayout {
  versions: string[];
  defaultVersion: string;
  langs: string[];
  defaultLang: string;
}

/** Splits a path relative to the docs root the same way Rspress does for routes. */
export function scopeOfPath(relativePath: string, layout: SiteLayout): Scope {
  const parts = relativePath.split('/');
  let version = layout.defaultVersion;
  let lang = layout.defaultLang;
  if (layout.versions.length > 0 && layout.versions.includes(parts[0])) {
    version = parts.shift() ?? version;
  }
  if (layout.langs.length > 0 && layout.langs.includes(parts[0])) {
    lang = parts.shift() ?? lang;
  }
  return { version, lang };
}

/**
 * Whether a path lies in a version directory that is no longer configured,
 * such as a dropped `1.0/`: with multiVersion, a directory under the docs root
 * that is neither a version nor present at `HEAD`. Such paths do not belong to
 * the default version.
 */
export function isDroppedVersionPath(
  relativePath: string,
  layout: SiteLayout,
  rootDirs: Set<string>,
): boolean {
  if (layout.versions.length === 0) {
    return false;
  }
  const slash = relativePath.indexOf('/');
  if (slash < 0) {
    return false;
  }
  const dir = relativePath.slice(0, slash);
  return !layout.versions.includes(dir) && !rootDirs.has(dir);
}

export function listScopes(layout: SiteLayout): Scope[] {
  const versions = layout.versions.length > 0 ? layout.versions : [layout.defaultVersion];
  const langs = layout.langs.length > 0 ? layout.langs : [layout.defaultLang];
  return versions.flatMap((version) => langs.map((lang) => ({ version, lang })));
}

export function scopeKey(scope: Scope): string {
  return `${scope.version || '_'}.${scope.lang || '_'}`;
}

/** The route of a page under a scope, without the prefixes of the defaults. */
export function scopedRoutePath(scope: Scope, layout: SiteLayout, routePath: string): string {
  const prefix = [
    scope.version === layout.defaultVersion ? '' : scope.version,
    scope.lang === layout.defaultLang ? '' : scope.lang,
  ].filter(Boolean);
  return `/${[...prefix, routePath.replace(/^\//, '')].join('/')}`;
}
