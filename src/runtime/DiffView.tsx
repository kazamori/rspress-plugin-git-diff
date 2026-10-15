import { useDark } from '@rspress/core/runtime';
import { useEffect, useRef, useState } from 'react';
import { setDiffFormat, useDiffFormat } from './diffFormat';
import { loadBlob } from './fetch';
import { useText } from './text';
import { useAsync } from './useAsync';

type RenderModule = typeof import('./render');

// jsdiff and diff2html are loaded on the first diff, so pages without one skip them.
let renderModule: Promise<RenderModule> | undefined;
function loadRenderModule(): Promise<RenderModule> {
  renderModule ??= import('./render');
  return renderModule;
}

/** Switches every diff on the page between the unified and side-by-side layouts. */
export function FormatToggle() {
  const t = useText();
  const format = useDiffFormat();
  return (
    <div className="rp-git-diff-toggle" role="group">
      <button type="button" aria-pressed={format === 'unified'} onClick={() => setDiffFormat('unified')}>
        {t('gitDiffUnified')}
      </button>
      <button type="button" aria-pressed={format === 'split'} onClick={() => setDiffFormat('split')}>
        {t('gitDiffSplit')}
      </button>
    </div>
  );
}

interface DiffViewProps {
  name: string;
  /** Blob hashes; null stands for a missing file. */
  from: string | null;
  to: string | null;
  /** Collapse the diff when more lines than this changed. */
  collapseOver?: number;
  /** Defer loading until the diff scrolls into view. */
  lazy?: boolean;
}

/** The source diff between two versions of a page. */
export function DiffView({ name, from, to, collapseOver, lazy = false }: DiffViewProps) {
  const t = useText();
  const format = useDiffFormat();
  const dark = useDark();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useScrolledIntoView(ref, !lazy);
  const [expanded, setExpanded] = useState(false);

  const diff = useAsync(
    visible
      ? async () => {
          const [module, before, after] = await Promise.all([
            loadRenderModule(),
            loadBlob(from),
            loadBlob(to),
          ]);
          const patch = module.createPatch(name, before, after);
          return { module, patch, changedLines: module.countChangedLines(patch) };
        }
      : undefined,
    [visible, name, from, to],
  );

  let body: React.ReactNode;
  if (diff.kind === 'idle' || diff.kind === 'loading') {
    body = <p className="rp-git-diff-message">{t('gitDiffLoading')}</p>;
  } else if (diff.kind === 'error') {
    body = <p className="rp-git-diff-message">{t('gitDiffLoadError')}</p>;
  } else {
    const { module, patch, changedLines } = diff.value;
    const collapsible = collapseOver !== undefined && changedLines > collapseOver;
    if (collapsible && !expanded) {
      body = (
        <button type="button" className="rp-git-diff-expand" onClick={() => setExpanded(true)}>
          {t('gitDiffShowLong', { lines: String(changedLines) })}
        </button>
      );
    } else {
      const collapse = () => {
        setExpanded(false);
        // After reading a long diff, the reader would otherwise lose their place.
        // Bring back the page name above the diff when there is one.
        requestAnimationFrame(() => {
          const target = ref.current?.closest<HTMLElement>('.rp-git-diff-change') ?? ref.current;
          target?.scrollIntoView({ block: 'nearest' });
        });
      };
      const collapseButton = collapsible && (
        <button type="button" className="rp-git-diff-expand" onClick={collapse}>
          {t('gitDiffCollapse')}
        </button>
      );
      body = (
        <>
          {collapseButton}
          <div
            className="rp-git-diff-body"
            // diff2html escapes the file contents.
            dangerouslySetInnerHTML={{ __html: module.renderPatch(patch, format, dark) }}
          />
          {collapseButton}
        </>
      );
    }
  }
  return (
    <div ref={ref} className="rp-git-diff-view">
      {body}
    </div>
  );
}

/** Becomes true once the element comes near the viewport, or at once when `eager`. */
function useScrolledIntoView(ref: React.RefObject<HTMLElement | null>, eager: boolean): boolean {
  const [visible, setVisible] = useState(eager);
  useEffect(() => {
    if (visible || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, visible]);
  return visible;
}
