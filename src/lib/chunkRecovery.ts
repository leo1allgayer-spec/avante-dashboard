// A navigation is already in progress in this document. Avoid consuming the retry
// budget twice when both Vite and React report the same failed import.
const recovering = new WeakSet<Window>();
const MAX_AUTOMATIC_RECOVERIES = 2;
const RECOVERY_WINDOW_MS = 60_000;

export function recoverChunk(target: Window = window, manual = false): boolean {
  if (!target.navigator.onLine || (!manual && recovering.has(target))) return false;
  const now = Date.now();
  try {
    const key = 'avante:chunk-recovery';
    const countKey = key + ':attempts';
    const last = Number(target.sessionStorage.getItem(key));
    const recent = last > 0 && now - last < RECOVERY_WINDOW_MS;
    const attempts = recent ? Math.max(1, Number(target.sessionStorage.getItem(countKey)) || 1) : 0;
    if (!manual && attempts >= MAX_AUTOMATIC_RECOVERIES) return false;
    target.sessionStorage.setItem(key, String(now));
    target.sessionStorage.setItem(countKey, String(manual ? MAX_AUTOMATIC_RECOVERIES : attempts + 1));
  } catch {
    // Without session storage, automatic navigation cannot be bounded safely.
    // An explicit user retry can still fetch a fresh entry document.
    if (!manual) return false;
  }
  try {
    const url = new URL(target.location.href);
    url.searchParams.set('_app_update', String(now));
    recovering.add(target);
    target.location.replace(url.href);
    return true;
  } catch {
    recovering.delete(target);
    return false;
  }
}

export const isChunkError = (error: Error) => /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(error.message);

export function installChunkRecovery(target: Window = window) {
  const url = new URL(target.location.href);
  if (url.searchParams.has('_app_update')) {
    url.searchParams.delete('_app_update');
    target.history.replaceState(target.history.state, '', url.href);
  }
  target.addEventListener('vite:preloadError', (event) => {
    if (recoverChunk(target)) event.preventDefault();
  });
}
