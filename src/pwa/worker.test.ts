import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { expect, it, vi } from 'vitest';

interface TestEvent {
  request?: Request;
  data?: unknown;
  waitUntil(task: Promise<unknown>): void;
  respondWith(task: Promise<Response>): void;
}

function workerHarness(active = true, clients = 1, installFails = false) {
  const prefix = 'punto-a-punto-app-';
  const currentName = `${prefix}new`;
  const content = new Map<string, Map<string, Response>>([
    [currentName, new Map()], [`${prefix}old`, new Map([['/old.js', new Response('old module')]])],
    ['unrelated-cache', new Map()],
  ]);
  const listeners = new Map<string, (event: TestEvent) => void>();
  const skipWaiting = vi.fn(async () => {});
  const claim = vi.fn(async () => {});
  const network = vi.fn(async () => new Response('network'));
  const open = async (name: string) => ({
    async addAll(paths: string[]) {
      const entries = content.get(name)!;
      for (const path of paths) entries.set(path, new Response(path, { headers: { Vary: 'Origin' } }));
      if (installFails) throw new Error('Interrupted installation');
    },
    async match(input: string | Request, options?: CacheQueryOptions) {
      const path = typeof input === 'string' ? input : new URL(input.url).pathname;
      const response = content.get(name)?.get(path);
      if (typeof input !== 'string' && input.headers.has('Origin') && response?.headers.has('Vary') && !options?.ignoreVary) return undefined;
      return response;
    },
  });
  const cacheStorage = {
    open,
    async keys() { return [...content.keys()]; },
    async delete(name: string) { return content.delete(name); },
    async match(request: Request, options?: CacheQueryOptions) {
      for (const name of content.keys()) { const response = await (await open(name)).match(request, options); if (response) return response; }
      return undefined;
    },
  };
  const source = ts.transpileModule(readFileSync('src/pwa/worker.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
    .replaceAll('__CACHE_NAME__', JSON.stringify(currentName)).replaceAll('__PRECACHE_ASSETS__', JSON.stringify(['/index.html', '/main.js']))
    .replace(/export\s*\{\s*\};?\s*$/, '');
  runInNewContext(source, {
    self: { registration: { active: active ? {} : undefined }, location: { origin: 'https://crochet.test' }, skipWaiting,
      clients: { claim, async matchAll() { return Array.from({ length: clients }, () => ({})); } },
      addEventListener(name: string, listener: (event: TestEvent) => void) { listeners.set(name, listener); } },
    caches: cacheStorage, fetch: network, URL,
  });
  async function dispatch(name: string, input: { request?: Request; data?: unknown } = {}) {
    let pending: Promise<unknown> = Promise.resolve();
    let response: Promise<Response> | undefined;
    listeners.get(name)!({ ...input, waitUntil(task) { pending = task; }, respondWith(task) { response = task; } });
    await pending;
    return response ? await response : undefined;
  }
  return { dispatch, content, currentName, skipWaiting, claim, network };
}

it('activates immediately on the first visit and waits when replacing a version in use', async () => {
  const first = workerHarness(false); await first.dispatch('install'); expect(first.skipWaiting).toHaveBeenCalledOnce();
  const update = workerHarness(); await update.dispatch('install'); expect(update.skipWaiting).not.toHaveBeenCalled();
});
it('discards an incomplete cache when installation fails', async () => {
  const harness = workerHarness(true, 1, true);
  await expect(harness.dispatch('install')).rejects.toThrow('Interrupted installation');
  expect(harness.content.has(harness.currentName)).toBe(false); expect(harness.content.has('punto-a-punto-app-old')).toBe(true);
});
it('serves the document and CORS module requests offline despite Vary Origin', async () => {
  const harness = workerHarness(); await harness.dispatch('install');
  const navigation = { method: 'GET', mode: 'navigate', url: 'https://crochet.test/' } as Request;
  expect(await (await harness.dispatch('fetch', { request: navigation }))?.text()).toBe('/index.html');
  const module = new Request('https://crochet.test/main.js', { headers: { Origin: 'https://crochet.test' } });
  expect(await (await harness.dispatch('fetch', { request: module }))?.text()).toBe('/main.js');
  expect(harness.network).not.toHaveBeenCalled();
});
it('leaves foreign origins and non-GET requests alone', async () => {
  const harness = workerHarness();
  expect(await harness.dispatch('fetch', { request: new Request('https://other.test/main.js') })).toBeUndefined();
  expect(await harness.dispatch('fetch', { request: new Request('https://crochet.test/', { method: 'POST' }) })).toBeUndefined();
  expect(harness.network).not.toHaveBeenCalled();
});
it('retains old assets while another window may still use them', async () => {
  const harness = workerHarness(true, 2); await harness.dispatch('activate');
  expect(harness.content.has('punto-a-punto-app-old')).toBe(true);
  expect(await (await harness.dispatch('fetch', { request: new Request('https://crochet.test/old.js') }))?.text()).toBe('old module');
  expect(harness.claim).toHaveBeenCalledOnce();
});
it('cleans only obsolete application caches when one window remains', async () => {
  const harness = workerHarness(); await harness.dispatch('activate');
  expect(harness.content.has('punto-a-punto-app-old')).toBe(false);
  expect(harness.content.has(harness.currentName)).toBe(true); expect(harness.content.has('unrelated-cache')).toBe(true);
});
it('activates a waiting update only on the opening message and ignores malformed messages', async () => {
  const harness = workerHarness();
  await harness.dispatch('message', { data: null }); await harness.dispatch('message', { data: 'activate-on-open' });
  expect(harness.skipWaiting).not.toHaveBeenCalled();
  await harness.dispatch('message', { data: { type: 'activate-on-open' } }); expect(harness.skipWaiting).toHaveBeenCalledOnce();
  await harness.dispatch('message', { data: { type: 'cleanup' } }); expect(harness.content.has('punto-a-punto-app-old')).toBe(false);
});
