/// <reference lib="webworker" />
export {};
declare const __CACHE_NAME__: string;
declare const __PRECACHE_ASSETS__: string[];
const worker = self as unknown as ServiceWorkerGlobalScope;
const cacheName = __CACHE_NAME__;
const assets = __PRECACHE_ASSETS__;
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
      if (!worker.registration.active) await worker.skipWaiting();
    })(),
  ),
);
worker.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      await cleanOldCaches();
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
      const cache = await caches.open(cacheName);
      if (request.mode === 'navigate')
        return (
          (await cache.match('/index.html', { ignoreVary: true })) ??
          fetch(request)
        );
      // Static assets are identical for every same-origin Origin header.
      return (
        (await cache.match(request, { ignoreVary: true })) ??
        (await caches.match(request, { ignoreVary: true })) ??
        fetch(request)
      );
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
