import { useRef } from 'react';

/**
 * Guards against out-of-order responses (e.g. changing a filter twice quickly: the slower, older
 * request must never overwrite the newer one's results).
 *
 *   const latest = useLatestRequest();
 *   return latest.guard(api.list(params)).then(...)
 *
 * Only the most recently issued request is allowed to deliver its result or its error. A request
 * that has been superseded simply never settles, so its `.then/.catch/.finally` handlers do not run
 * (the newer request's handlers do). Callers that wait on the promise (see useLiveRefresh) have a
 * timeout for that case.
 */
export default function useLatestRequest() {
  const ref = useRef(null);
  if (!ref.current) {
    let counter = 0;
    const never = () => new Promise(() => {});
    ref.current = {
      guard(promise) {
        counter += 1;
        const mine = counter;
        return promise.then(
          (value) => (mine === counter ? value : never()),
          (error) => (mine === counter ? Promise.reject(error) : never()),
        );
      },
    };
  }
  return ref.current;
}
