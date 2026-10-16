import { execFileSync } from 'node:child_process';
import path from 'node:path';

const siteDir = path.join(import.meta.dirname, '..', 'example', 'site');

/**
 * The short hash of the commit in the example history with this subject. Commits
 * are looked up by subject, as the hashes are not part of what the script fixes.
 */
export function hashOf(subject: string): string {
  const hash = execFileSync(
    'git',
    ['log', '--fixed-strings', `--grep=${subject}`, '--format=%h', '-1'],
    { cwd: siteDir, encoding: 'utf8' },
  ).trim();
  if (!hash) {
    throw new Error(`no commit in example/site has the subject ${subject}`);
  }
  return hash;
}
