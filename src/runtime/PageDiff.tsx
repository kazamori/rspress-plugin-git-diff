import { useLocation, useNavigate, usePage } from '@rspress/core/runtime';
import { useCallback, useState } from 'react';
import { DiffBar } from './DiffBar';
import { loadPageIndex, NotFoundError } from './fetch';
import { type DiffTarget, type ResolveResult, resolveDiffQuery } from './resolve';
import { SourcePanel } from './SourcePanel';
import { type AsyncState, useAsync } from './useAsync';
import { usePageAnnotation } from './usePageAnnotation';

/** The `diff` parameter resolved against the history of the current page. */
export type QueryState =
  | AsyncState<{ result: ResolveResult; head: string }>
  | { kind: 'no-history' };

/**
 * Shows the change named by the `diff` parameter of the URL: marked on the
 * rendered page, with the source diff available in a panel. Registered as a
 * global component, so it is on every page.
 */
export default function PageDiff() {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get('diff');
  if (query === null) {
    return null;
  }
  // A new query or page starts over, dropping the marks of the previous one.
  return <QueriedPageDiff key={`${location.pathname}?${query}`} query={query} />;
}

function QueriedPageDiff({ query }: { query: string }) {
  const { page } = usePage();
  const routePath = page.routePath;
  const [sourceOpen, setSourceOpen] = useState(false);
  const close = useCloseDiff();

  const loaded = useAsync(
    async () => {
      const index = await loadPageIndex(routePath);
      const head = index.revisions[0]?.blob;
      return head ? { result: resolveDiffQuery(query, index), head } : undefined;
    },
    [routePath, query],
  );
  const state = queryState(loaded);
  const target = changeToShow(state);
  const annotation = usePageAnnotation(
    routePath,
    target,
    state.kind === 'done' ? state.value.head : undefined,
  );

  return (
    <>
      <DiffBar
        query={query}
        state={state}
        annotation={annotation}
        keyboard={!sourceOpen}
        onSource={target ? () => setSourceOpen(true) : undefined}
        onClose={close}
      />
      {sourceOpen && target && (
        <SourcePanel
          query={query}
          target={target}
          name={page.title || routePath}
          onClose={() => setSourceOpen(false)}
        />
      )}
    </>
  );
}

/** A page without an index, or with an empty one, has no history to show. */
function queryState(
  loaded: AsyncState<{ result: ResolveResult; head: string } | undefined>,
): QueryState {
  if (loaded.kind === 'error' && loaded.error instanceof NotFoundError) {
    return { kind: 'no-history' };
  }
  if (loaded.kind === 'done') {
    return loaded.value ? { kind: 'done', value: loaded.value } : { kind: 'no-history' };
  }
  return loaded;
}

/** The versions to compare, when the query resolved to an actual change. */
function changeToShow(state: QueryState): DiffTarget | undefined {
  if (state.kind !== 'done' || !state.value.result.ok) return undefined;
  const { target } = state.value.result;
  return target.from === target.to ? undefined : target;
}

/** Removes the `diff` parameter and keeps the rest of the URL. */
function useCloseDiff(): () => void {
  const location = useLocation();
  const navigate = useNavigate();
  return useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.delete('diff');
    const search = params.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash });
  }, [location, navigate]);
}
