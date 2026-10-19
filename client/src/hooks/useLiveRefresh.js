import { useEffect, useRef } from 'react';
import { subscribe, isRealtimeConnected } from '../services/realtime';

/**
 * Runs `callback` (normally a silent re-fetch) whenever one of `topics` changes on the server,
 * and again after the live connection recovers or the tab becomes visible.
 *
 * - Bursts of events are merged into one refresh (`delay`).
 * - Safety net: while the tab is visible the page also re-syncs every 15s if the live stream is down,
 *   and every 60s even when it is up, so a missed event can never leave the screen stale for long.
 * - Refreshes never overlap: if the callback returns a promise, an event that arrives while it is
 *   still running queues exactly one more refresh afterwards. That guarantees the screen ends on
 *   the newest data even when responses would otherwise arrive out of order.
 */
export default function useLiveRefresh(topics, callback, { delay = 500, enabled = true } = {}) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const key = topics.join('|');

  useEffect(() => {
    if (!enabled) return undefined;
    let timer = null;
    let running = false;
    let queued = false;
    let active = true;

    const execute = async () => {
      if (running) { queued = true; return; }
      running = true;
      try {
        // A refresh superseded by a newer request never settles (see useLatestRequest): don't wait on it forever.
        await Promise.race([callbackRef.current(), new Promise((resolve) => { setTimeout(resolve, 15000); })]);
      } catch {
        // the page's own error handling already reported it
      } finally {
        running = false;
        if (queued && active) { queued = false; execute(); }
      }
    };

    const fire = () => {
      clearTimeout(timer);
      timer = setTimeout(execute, delay);
    };
    const unsubscribe = subscribe(topics, fire);
    let beats = 0;
    const safetyNet = setInterval(() => {
      beats += 1;
      if (document.visibilityState !== 'visible') return;
      if (!isRealtimeConnected() || beats % 4 === 0) execute();
    }, 15000);
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(safetyNet);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, delay, enabled]);
}
