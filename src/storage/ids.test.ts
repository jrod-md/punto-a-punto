import { expect, it, vi } from 'vitest';
import { createId } from './ids';
it('creates a UUID with the version and variant bits from random bytes', () => {
  expect(
    createId((bytes) => {
      bytes.fill(255);
      return bytes;
    }),
  ).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  expect(createId((bytes) => bytes)).toBe(
    '00000000-0000-4000-8000-000000000000',
  );
});
it('works with getRandomValues when secure-context randomUUID is unavailable', () => {
  vi.stubGlobal('crypto', {
    getRandomValues(bytes: Uint8Array) {
      bytes.fill(42);
      return bytes;
    },
  });
  try {
    expect(createId()).toBe('2a2a2a2a-2a2a-4a2a-aa2a-2a2a2a2a2a2a');
  } finally {
    vi.unstubAllGlobals();
  }
});
