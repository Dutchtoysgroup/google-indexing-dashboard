// Indexing Dashboard — service worker
// Strategy:
//   - Navigation requests: network-first, fall back to cached shell.
//   - /api/*: network-only (always fresh data).
//   - Static assets (/_next/static, images, fonts): cache-first with background refresh.

const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const OFFLINE_URL = "/";

const PRECACHE_URLS = [
  "/",
  "/favicon.png",
  "/logo.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API: always network, never cache
  if (url.pathname.startsWith("/api/")) return;

  // Navigation: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) =>
            cached ?? caches.match(OFFLINE_URL).then(
              (fallback) =>
                fallback ??
                new Response("Offline", {
                  status: 503,
                  headers: { "Content-Type": "text/plain" },
                }),
            ),
          ),
        ),
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|ttf|css|js)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networked = fetch(request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches
                .open(RUNTIME_CACHE)
                .then((cache) => cache.put(request, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached ?? networked;
      }),
    );
  }
});
