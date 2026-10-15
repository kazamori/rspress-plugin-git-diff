import { type DependencyList, useEffect, useState } from 'react';

export type AsyncState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown }
  | { kind: 'done'; value: T };

/**
 * Runs `load` when the dependencies change and drops results that arrive after
 * the component moved on. Without `load` the state stays idle. `dispose` undoes
 * what a loaded value did, such as marks put on the page.
 */
export function useAsync<T>(
  load: ((isCancelled: () => boolean) => Promise<T>) | undefined,
  deps: DependencyList,
  dispose?: (value: T) => void,
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ kind: 'idle' });

  // `deps` lists what `load` depends on, as with `useEffect`.
  useEffect(() => {
    if (!load) {
      setState({ kind: 'idle' });
      return;
    }
    let cancelled = false;
    let loaded: { value: T } | undefined;
    setState({ kind: 'loading' });
    load(() => cancelled)
      .then((value) => {
        if (cancelled) {
          dispose?.(value);
          return;
        }
        loaded = { value };
        setState({ kind: 'done', value });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ kind: 'error', error });
      });
    return () => {
      cancelled = true;
      if (loaded) dispose?.(loaded.value);
    };
  }, deps);

  return state;
}
