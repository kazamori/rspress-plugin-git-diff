import { useI18n } from '@rspress/core/runtime';
import type { i18nTexts } from './i18n';

// Kept apart from i18n.ts, which the build side imports and which therefore
// must not import browser-only modules.

/** Looks up a UI text of this plugin in the current language. */
export function useText() {
  return useI18n<typeof i18nTexts>();
}
