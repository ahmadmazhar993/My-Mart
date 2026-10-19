import { API_BASE, API_VERSION } from './api';

/**
 * Live updates (Server-Sent Events) for the whole browser, shared by every page and every tab.
 *
 * The server decides what this user may be told; events only say "something changed"
 * (topic + id), and pages re-fetch through the normal authorised APIs.
 *
 * Why one connection per browser, not per tab: over HTTP/1.1 a browser allows only ~6 connections
 * to one host, and a live stream holds one for as long as it is open. A few tabs (or old pages
 * kept in the back/forward cache) would use them all up and every API request would hang. So:
 *   - tabs of the same signed-in user elect ONE leader (Web Locks); only the leader opens the
 *     stream and relays each event to the other tabs through a BroadcastChannel;
 *   - if the leader tab closes, another tab takes over automatically;
 *   - the stream is released when a page is hidden/frozen (`pagehide`) and re-opened on restore;
 *   - without Web Locks/BroadcastChannel (very old browsers) each tab simply opens its own.
 */

const RECONNECT = '*reconnect';
const listeners = new Set(); // { topics: Set<string> | null, callback }

let enabled = false;
let token = null; // null = rely on the session cookie (e.g. Google sign-in)
let userKey = null; // identifies the signed-in user; scopes the shared channel and lock

let source = null;
let connected = false;
let everConnected = false;
let retryTimer = null;
let retryDelay = 2000;

let channel = null;
let isLeader = false;
let releaseLock = null;
let lockAbort = null;
let wasFollower = false;

const dispatch = (event) => {
  listeners.forEach(({ topics, callback }) => {
    if (!topics || topics.has(event.topic) || event.topic === RECONNECT) callback(event);
  });
};

const relay = (message) => {
  try { channel?.postMessage(message); } catch { /* channel closed */ }
};

const sharedModeSupported = () => typeof navigator !== 'undefined'
  && 'locks' in navigator
  && typeof BroadcastChannel !== 'undefined'
  && !!userKey;

function closeStream() {
  clearTimeout(retryTimer);
  retryTimer = null;
  if (source) {
    source.close();
    source = null;
  }
  if (connected) relay({ kind: 'state', connected: false });
  connected = false;
}

function openStream() {
  if (!enabled || typeof EventSource === 'undefined' || source) return;
  const url = new URL(`${API_VERSION}/events`, API_BASE);
  if (token) url.searchParams.set('token', token);
  source = new EventSource(url.toString(), { withCredentials: true });

  source.onmessage = (message) => {
    let payload;
    try { payload = JSON.parse(message.data); } catch { return; }
    if (payload.type === 'connected') {
      connected = true;
      retryDelay = 2000;
      relay({ kind: 'state', connected: true });
      // After a drop (or a leader hand-over) events may have been missed: tell every page to refresh.
      if (everConnected) {
        const refresh = { type: 'event', topic: RECONNECT };
        dispatch(refresh);
        relay({ kind: 'event', payload: refresh });
      }
      everConnected = true;
      return;
    }
    if (payload.type === 'event') {
      dispatch(payload);
      relay({ kind: 'event', payload });
    }
  };

  source.onerror = () => {
    if (connected) relay({ kind: 'state', connected: false });
    connected = false;
    // The browser retries by itself while the stream is "connecting". A CLOSED stream (e.g. an
    // expired token answered with 401) is never retried natively, so retry with backoff, using
    // whatever token is current in storage.
    if (source && source.readyState === 2) {
      source.close();
      source = null;
      retryTimer = setTimeout(() => {
        if (!enabled || !isLeader) return;
        token = localStorage.getItem('token') || null;
        openStream();
      }, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 60000);
    }
  };
}

function start() {
  if (!enabled) return;
  if (!sharedModeSupported()) {
    isLeader = true;
    openStream();
    return;
  }

  channel = new BroadcastChannel(`ahm-live:${userKey}`);
  channel.onmessage = ({ data }) => {
    if (!data) return;
    if (isLeader) {
      // A tab that just opened asks how the stream is doing.
      if (data.kind === 'hello') relay({ kind: 'state', connected });
      return;
    }
    if (data.kind === 'event') dispatch(data.payload);
    if (data.kind === 'state') connected = !!data.connected;
  };

  lockAbort = new AbortController();
  navigator.locks.request(
    `ahm-live-leader:${userKey}`,
    { signal: lockAbort.signal },
    () => new Promise((resolve) => {
      // This tab is the leader until it closes, logs out or is hidden/frozen.
      isLeader = true;
      releaseLock = resolve;
      everConnected = wasFollower; // a promoted follower may have missed events during the hand-over
      openStream();
    }),
  ).catch(() => { /* aborted while waiting: this tab stays a follower and then stops */ });

  wasFollower = true;
  relay({ kind: 'hello' });
}

function stop() {
  if (releaseLock) { releaseLock(); releaseLock = null; }
  if (lockAbort) { lockAbort.abort(); lockAbort = null; }
  isLeader = false;
  closeStream();
  if (channel) { channel.close(); channel = null; }
  connected = false;
}

export function connectRealtime(nextToken, nextUserKey = null) {
  const key = nextUserKey ? String(nextUserKey) : null;
  if (enabled && (nextToken || null) === token && key === userKey && (source || channel)) return;
  stop();
  enabled = true;
  token = nextToken || null;
  userKey = key;
  everConnected = false;
  wasFollower = false;
  start();
}

export function disconnectRealtime() {
  stop();
  enabled = false;
  token = null;
  userKey = null;
  everConnected = false;
  wasFollower = false;
}

/** True while the live stream is open and healthy (here or in the leader tab). */
export const isRealtimeConnected = () => connected;

/** Subscribe to some topics (or all, with topics = null). Returns an unsubscribe function. */
export function subscribe(topics, callback) {
  const entry = { topics: topics ? new Set(topics) : null, callback };
  listeners.add(entry);
  return () => listeners.delete(entry);
}

if (typeof window !== 'undefined') {
  // Free the connection when the page is going away or being frozen in the back/forward cache,
  // and bring it back (with a refresh) if the page is restored.
  window.addEventListener('pagehide', () => {
    if (enabled) stop();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && enabled) {
      start();
      dispatch({ type: 'event', topic: RECONNECT });
    }
  });
}

// A tab that was asleep may have missed events (browsers throttle background connections).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && enabled) dispatch({ type: 'event', topic: RECONNECT });
  });
}
