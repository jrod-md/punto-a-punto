import { useEffect } from 'react';
export interface ScreenLock {
  released: boolean;
  release(): Promise<void>;
}
export interface WakePort {
  request(type: 'screen'): Promise<ScreenLock>;
}
export async function acquireScreenLock(
  port?: WakePort,
): Promise<ScreenLock | null> {
  try {
    return port ? await port.request('screen') : null;
  } catch {
    return null;
  }
}
export default function useWakeLock() {
  useEffect(() => {
    let cancelled = false;
    let lock: ScreenLock | null = null;
    let requesting = false;
    const acquire = async () => {
      if (
        cancelled ||
        requesting ||
        document.visibilityState !== 'visible' ||
        (lock && !lock.released)
      )
        return;
      requesting = true;
      const next = await acquireScreenLock(navigator.wakeLock);
      requesting = false;
      if (cancelled) {
        if (next) void next.release().catch(() => {});
      } else lock = next;
    };
    void acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      if (lock) void lock.release().catch(() => {});
    };
  }, []);
}
