import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createServer } from 'node:http';
import type {
  PluginContext,
  NormalizedOutputOptions,
  OutputChunk,
} from 'rollup';
import ts from 'typescript';
import { expect, it, vi } from 'vitest';
import { pwaPlugin } from '../../scripts/pwaPlugin';

interface TestEvent {
  request?: Request;
  data?: unknown;
  waitUntil(task: Promise<unknown>): void;
  respondWith(task: Promise<Response>): void;
}

interface HarnessOptions {
  origin?: string;
  source?: string;
  fetcher?: (request: string | Request) => Promise<Response>;
}

function workerHarness(
  active = true,
  clients = 1,
  installFails = false,
  options: HarnessOptions = {},
) {
  const origin = options.origin ?? 'https://crochet.test';
  const prefix = 'punto-a-punto-app-';
  const currentName =
    options.source?.match(/const cacheName = "([^"]+)";/)?.[1] ??
    `${prefix}new`;
  const content = new Map<string, Map<string, Response>>([
    [currentName, new Map()],
    [`${prefix}old`, new Map([['/old.js', new Response('old module')]])],
    ['unrelated-cache', new Map()],
  ]);
  const listeners = new Map<string, (event: TestEvent) => void>();
  const skipWaiting = vi.fn(async () => {});
  const claim = vi.fn(async () => {});
  const network = vi.fn(async (request: string | Request) =>
    options.fetcher ? options.fetcher(request) : new Response('network'),
  );
  const open = async (name: string) => ({
    async addAll(paths: string[]) {
      const entries = content.get(name)!;
      for (const path of paths) {
        const response = options.fetcher
          ? await network(`${origin}${path}`)
          : new Response(path, {
              headers: {
                Vary: 'Origin',
                'Content-Type': path === '/' ? 'text/html' : 'text/javascript',
              },
            });
        entries.set(path, response);
      }
      if (installFails) throw new Error('Interrupted installation');
    },
    async match(input: string | Request, options?: CacheQueryOptions) {
      const path =
        typeof input === 'string' ? input : new URL(input.url).pathname;
      const response = content.get(name)?.get(path);
      if (
        typeof input !== 'string' &&
        input.headers.has('Origin') &&
        response?.headers.has('Vary') &&
        !options?.ignoreVary
      )
        return undefined;
      return response?.clone();
    },
  });
  const cacheStorage = {
    open,
    async keys() {
      return [...content.keys()];
    },
    async delete(name: string) {
      return content.delete(name);
    },
    async match(request: Request, options?: CacheQueryOptions) {
      for (const name of content.keys()) {
        const response = await (await open(name)).match(request, options);
        if (response) return response;
      }
      return undefined;
    },
  };
  const source =
    options.source ??
    ts
      .transpileModule(readFileSync('src/pwa/worker.ts', 'utf8'), {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      })
      .outputText.replaceAll('__CACHE_NAME__', JSON.stringify(currentName))
      .replaceAll('__PRECACHE_ASSETS__', JSON.stringify(['/', '/main.js']))
      .replace(/export\s*\{\s*\};?\s*$/, '');
  runInNewContext(source, {
    self: {
      registration: { active: active ? {} : undefined },
      location: { origin },
      skipWaiting,
      clients: {
        claim,
        async matchAll() {
          return Array.from({ length: clients }, () => ({}));
        },
      },
      addEventListener(name: string, listener: (event: TestEvent) => void) {
        listeners.set(name, listener);
      },
    },
    caches: cacheStorage,
    fetch: network,
    URL,
    Response,
  });
  async function dispatch(
    name: string,
    input: { request?: Request; data?: unknown } = {},
  ) {
    let pending: Promise<unknown> = Promise.resolve();
    let response: Promise<Response> | undefined;
    listeners.get(name)!({
      ...input,
      waitUntil(task) {
        pending = task;
      },
      respondWith(task) {
        response = task;
      },
    });
    await pending;
    return response ? await response : undefined;
  }
  return {
    dispatch,
    content,
    currentName,
    skipWaiting,
    claim,
    network,
    cacheStorage,
  };
}

it('activates immediately on the first visit and waits when replacing a version in use', async () => {
  const first = workerHarness(false);
  await first.dispatch('install');
  expect(first.skipWaiting).toHaveBeenCalledOnce();
  const update = workerHarness();
  await update.dispatch('install');
  expect(update.skipWaiting).not.toHaveBeenCalled();
});
it('discards an incomplete cache when installation fails', async () => {
  const harness = workerHarness(true, 1, true);
  await expect(harness.dispatch('install')).rejects.toThrow(
    'Interrupted installation',
  );
  expect(harness.content.has(harness.currentName)).toBe(false);
  expect(harness.content.has('punto-a-punto-app-old')).toBe(true);
});
it('serves the document and CORS module requests offline despite Vary Origin', async () => {
  const harness = workerHarness();
  await harness.dispatch('install');
  const navigation = {
    method: 'GET',
    mode: 'navigate',
    url: 'https://crochet.test/',
  } as Request;
  expect(
    await (await harness.dispatch('fetch', { request: navigation }))?.text(),
  ).toBe('/');
  const module = new Request('https://crochet.test/main.js', {
    headers: { Origin: 'https://crochet.test' },
  });
  expect(
    await (await harness.dispatch('fetch', { request: module }))?.text(),
  ).toBe('/main.js');
  expect(harness.network).not.toHaveBeenCalled();
});
it('leaves foreign origins and non-GET requests alone', async () => {
  const harness = workerHarness();
  expect(
    await harness.dispatch('fetch', {
      request: new Request('https://other.test/main.js'),
    }),
  ).toBeUndefined();
  expect(
    await harness.dispatch('fetch', {
      request: new Request('https://crochet.test/', { method: 'POST' }),
    }),
  ).toBeUndefined();
  expect(harness.network).not.toHaveBeenCalled();
});
it('retains old assets while another window may still use them', async () => {
  const harness = workerHarness(true, 2);
  await harness.dispatch('activate');
  expect(harness.content.has('punto-a-punto-app-old')).toBe(true);
  expect(
    await (
      await harness.dispatch('fetch', {
        request: new Request('https://crochet.test/old.js'),
      })
    )?.text(),
  ).toBe('old module');
  expect(harness.claim).toHaveBeenCalledOnce();
});
it('cleans only obsolete application caches when one window remains', async () => {
  const harness = workerHarness();
  await harness.dispatch('activate');
  expect(harness.content.has('punto-a-punto-app-old')).toBe(false);
  expect(harness.content.has(harness.currentName)).toBe(true);
  expect(harness.content.has('unrelated-cache')).toBe(true);
});
it('activates a waiting update only on the opening message and ignores malformed messages', async () => {
  const harness = workerHarness();
  await harness.dispatch('message', { data: null });
  await harness.dispatch('message', { data: 'activate-on-open' });
  expect(harness.skipWaiting).not.toHaveBeenCalled();
  await harness.dispatch('message', { data: { type: 'activate-on-open' } });
  expect(harness.skipWaiting).toHaveBeenCalledOnce();
  await harness.dispatch('message', { data: { type: 'cleanup' } });
  expect(harness.content.has('punto-a-punto-app-old')).toBe(false);
});

function emittedWorker(): string {
  let source: string | undefined;
  const plugin = pwaPlugin();
  const hook = plugin.generateBundle;
  if (typeof hook !== 'function')
    throw new Error('Missing bundle generation hook');
  const emitFile: PluginContext['emitFile'] = (file) => {
    if (file.type === 'asset' && file.fileName === 'sw.js') {
      source =
        typeof file.source === 'string'
          ? file.source
          : new TextDecoder().decode(file.source);
    }
    return 'worker-reference';
  };
  hook.call(
    { emitFile } as PluginContext,
    {} as NormalizedOutputOptions,
    { 'main.js': { type: 'chunk', code: 'export {};' } as OutputChunk },
    false,
  );
  if (!source) throw new Error('The build did not emit a service worker');
  return source;
}

it('handles a real index.html redirect, repairs a legacy installation and serves repeated navigations offline', async () => {
  const document =
    '<!doctype html><html><body><div id="root">Prueba de navegación</div></body></html>';
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(request.url ?? '/');
    if (request.url === '/index.html') {
      response.writeHead(308, { Location: '/' });
      response.end();
      return;
    }
    response.writeHead(200, {
      'Content-Type':
        request.url === '/main.js' ? 'text/javascript' : 'text/html',
      Vary: 'Origin',
    });
    response.end(request.url === '/main.js' ? 'export {};' : document);
  });
  await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Missing test server port');
    const origin = `http://localhost:${address.port}`;
    const legacy = await fetch(`${origin}/index.html`);
    expect(legacy.redirected).toBe(true);
    const harness = workerHarness(true, 1, false, {
      origin,
      source: emittedWorker(),
      fetcher: (request) =>
        fetch(typeof request === 'string' ? request : request.url),
    });
    harness.content
      .get('punto-a-punto-app-old')!
      .set('/index.html', legacy.clone());
    requests.length = 0;
    await harness.dispatch('install');
    expect(requests).toContain('/');
    expect(requests).not.toContain('/index.html');
    expect(harness.skipWaiting).toHaveBeenCalledOnce();
    await harness.dispatch('activate');
    expect(harness.content.has('punto-a-punto-app-old')).toBe(true);
    harness.network.mockRejectedValue(new TypeError('Offline'));
    const navigation = {
      url: `${origin}/`,
      method: 'GET',
      mode: 'navigate',
    } as Request;
    for (let visit = 0; visit < 3; visit += 1) {
      const response = await harness.dispatch('fetch', { request: navigation });
      expect(response?.redirected).toBe(false);
      expect(await response?.text()).toBe(document);
    }
    expect(harness.content.get(harness.currentName)?.get('/')?.redirected).toBe(
      false,
    );
    await harness.dispatch('message', { data: { type: 'cleanup' } });
    expect(harness.content.has('punto-a-punto-app-old')).toBe(false);
    harness.network.mockReset();
    harness.network.mockImplementation((request) =>
      fetch(typeof request === 'string' ? request : request.url),
    );
    harness.content.get(harness.currentName)!.set('/', legacy.clone());
    const fallback = await harness.dispatch('fetch', { request: navigation });
    expect(fallback?.redirected).toBe(false);
    expect(await fallback?.text()).toBe(document);
    harness.content.get(harness.currentName)!.clear();
    const redirectedNetwork = await harness.dispatch('fetch', {
      request: { ...navigation, url: `${origin}/index.html` } as Request,
    });
    expect(redirectedNetwork?.redirected).toBe(false);
    expect(await redirectedNetwork?.text()).toBe(document);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

it.each([
  'missing',
  'empty',
  'wrong-type',
  'error-status',
  'storage-error',
] as const)(
  'uses the network when the navigation cache is %s',
  async (scenario) => {
    const harness = workerHarness();
    const content = harness.content.get(harness.currentName)!;
    if (scenario === 'empty')
      content.set(
        '/',
        new Response('', { headers: { 'Content-Type': 'text/html' } }),
      );
    if (scenario === 'wrong-type')
      content.set(
        '/',
        new Response('invalid HTML', {
          headers: { 'Content-Type': 'text/plain' },
        }),
      );
    if (scenario === 'error-status')
      content.set(
        '/',
        new Response('failure', {
          status: 503,
          headers: { 'Content-Type': 'text/html' },
        }),
      );
    if (scenario === 'storage-error')
      vi.spyOn(harness.cacheStorage, 'open').mockRejectedValue(
        new Error('Storage unavailable'),
      );
    const response = await harness.dispatch('fetch', {
      request: {
        url: 'https://crochet.test/',
        method: 'GET',
        mode: 'navigate',
      } as Request,
    });
    expect(await response?.text()).toBe('network');
    expect(harness.network).toHaveBeenCalledOnce();
  },
);

it('keeps online resources available when opening the cache fails', async () => {
  const harness = workerHarness();
  vi.spyOn(harness.cacheStorage, 'open').mockRejectedValue(
    new Error('Storage unavailable'),
  );
  const response = await harness.dispatch('fetch', {
    request: new Request('https://crochet.test/main.js'),
  });
  expect(await response?.text()).toBe('network');
});
