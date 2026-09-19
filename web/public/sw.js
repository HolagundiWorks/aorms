// Minimal service worker (2026-09-19) — exists only to satisfy Chrome's
// PWA installability requirement (a registered SW with a fetch handler),
// not to add offline/caching behavior. This app is authenticated and
// data-changes-constantly by nature (Pulse KPIs, tasks) — a caching
// strategy here risks serving stale office data with zero time this
// session to properly design/test cache invalidation, so this is
// deliberately a pure passthrough: every request just goes to the
// network exactly as if no service worker were installed at all.
self.addEventListener("fetch", () => {
  // No-op — let the browser handle every request normally.
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
