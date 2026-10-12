import { expect, it } from 'vitest';
import { acquireScreenLock } from './useWakeLock';
it('handles unavailable and denied wake locks silently and preserves an available sentinel', async () => {
  expect(await acquireScreenLock()).toBeNull(); expect(await acquireScreenLock({ async request() { throw new Error('denied'); } })).toBeNull();
  const sentinel = { released: false, async release() {} };
  expect(await acquireScreenLock({ async request(type) { expect(type).toBe('screen'); return sentinel; } })).toBe(sentinel);
});
