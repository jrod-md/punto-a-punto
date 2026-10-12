/// <reference lib="webworker" />
export {};
declare const __CACHE_NAME__: string;
declare const __PRECACHE_ASSETS__: string[];
const worker = self as unknown as ServiceWorkerGlobalScope;
const cacheName = __CACHE_NAME__;
const assets = __PRECACHE_ASSETS__;
async function hasRedirectedLegacyDocument(): Promise<boolean> {
  const names = await caches.keys();
  for (const name of names) {
    if (!name.startsWith('punto-a-punto-app-') || name === cacheName) continue;
    const cache = await caches.open(name);
    const document =
      (await cache.match('/index.html', { ignoreVary: true })) ??
      (await cache.match('/', { ignoreVary: true }));
    if (document?.redirected) return true;
  }
  return false;
}

async function navigationResponse(request: Request): Promise<Response> {
  try {
    const cache = await caches.open(cacheName);
    const document = await cache.match('/', { ignoreVary: true });
    if (
      document?.status === 200 &&
      !document.redirected &&
      document.headers.get('Content-Type')?.includes('text/html') &&
      (await document.clone().text()).trim()
    ) {
      return document;
    }
  } catch {
    // A broken cache must not prevent an online navigation.
  }
  const response = await fetch(request);
  return response.redirected
    ? new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    : response;
}

async function cleanOldCaches() {
  const clients = await worker.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  if (clients.length > 1) return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter(
        (key) => key.startsWith('punto-a-punto-app-') && key !== cacheName,
      )
      .map((key) => caches.delete(key)),
  );
}
worker.addEventListener('install', (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      try {
        await cache.addAll(assets);
      } catch (reason) {
        await caches.delete(cacheName);
        throw reason;
      }
      if (
        !worker.registration.active ||
        (await hasRedirectedLegacyDocument())
      ) {
        // A broken legacy worker cannot run the application's update handshake.
        await worker.skipWaiting();
      }
    })(),
  ),
);
worker.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      // Keep an already open legacy page's chunks until a corrected page opens.
      if (!(await hasRedirectedLegacyDocument())) await cleanOldCaches();
      await worker.clients.claim();
    })(),
  ),
);
worker.addEventListener('fetch', (event) => {
  const request = event.request;
  if (
    request.method !== 'GET' ||
    new URL(request.url).origin !== worker.location.origin
  )
    return;
  event.respondWith(
    (async () => {
      if (request.mode === 'navigate') return navigationResponse(request);
      // Static assets are identical for every same-origin Origin header.
      try {
        const cache = await caches.open(cacheName);
        const response =
          (await cache.match(request, { ignoreVary: true })) ??
          (await caches.match(request, { ignoreVary: true }));
        if (response) return response;
      } catch {
        // Static resources also fall back to the network if storage fails.
      }
      return fetch(request);
    })(),
  );
});
worker.addEventListener('message', (event) => {
  const data: unknown = event.data;
  const type =
    typeof data === 'object' && data !== null && 'type' in data
      ? data.type
      : null;
  if (type === 'activate-on-open') event.waitUntil(worker.skipWaiting());
  if (type === 'cleanup') event.waitUntil(cleanOldCaches());
});
