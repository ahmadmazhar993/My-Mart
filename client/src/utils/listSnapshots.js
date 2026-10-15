// In-memory snapshots of list pages (products + scroll position), keyed by the router's
// history-entry key. Lets the browser Back button return to the same spot instead of
// reloading the list from page 1. Cleared on full page reload.
const MAX_SNAPSHOTS = 10;
const snapshots = new Map();

export const saveSnapshot = (key, data) => {
  if (!key) return;
  snapshots.delete(key);
  snapshots.set(key, data);
  while (snapshots.size > MAX_SNAPSHOTS) snapshots.delete(snapshots.keys().next().value);
};

export const getSnapshot = (key) => snapshots.get(key) || null;
export const hasSnapshot = (key) => snapshots.has(key);
