import type { CommitMessageMode } from './options';

/** Returns the subject to publish, or undefined when nothing should be shown. */
export function formatSubject(
  subject: string,
  mode: CommitMessageMode,
  issueRefPattern: RegExp,
): string | undefined {
  switch (mode) {
    case 'none':
      return undefined;
    case 'full':
      return subject;
    case 'strip-refs': {
      const stripped = subject
        .replace(issueRefPattern, '')
        // Clean up what the references leave behind, such as `()` or `, ,`.
        .replace(/\(\s*(?:[,;]\s*)*\)|\[\s*(?:[,;]\s*)*\]/g, '')
        .replace(/\s*[,;](?:\s*[,;])+/g, ',')
        .replace(/\s+([,;.:)\]])/g, '$1')
        .replace(/[\s,;:]+$/, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      return stripped === '' ? undefined : stripped;
    }
  }
}
