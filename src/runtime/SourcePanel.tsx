import { useEffect } from 'react';
import { DiffView, FormatToggle } from './DiffView';
import type { DiffTarget } from './resolve';
import { RevisionMeta } from './RevisionMeta';
import { useText } from './text';

/** The source diff in a dialog over the page; Escape or a click outside closes it. */
export function SourcePanel({
  query,
  target,
  name,
  onClose,
}: {
  query: string;
  target: DiffTarget;
  name: string;
  onClose: () => void;
}) {
  const t = useText();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="rp-git-diff-overlay" onClick={onClose}>
      <div
        className="rp-git-diff-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('gitDiffSource')}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="rp-git-diff-panel-header">
          <div className="rp-git-diff-panel-title">
            <strong>{t('gitDiffSource')}</strong> <code>{query}</code>
            <RevisionMeta revision={target.revision} />
          </div>
          <FormatToggle />
          <button type="button" className="rp-git-diff-close" onClick={onClose}>
            {t('gitDiffClose')}
          </button>
        </header>
        <div className="rp-git-diff-panel-body">
          <DiffView name={name} from={target.from} to={target.to} />
        </div>
      </div>
    </div>
  );
}
