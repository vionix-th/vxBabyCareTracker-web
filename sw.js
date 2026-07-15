const CACHE_NAME = "vionix-baby-care-v2";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];
const NAVIGATION_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = request.mode === "navigate"
      ? await fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS)
      : await fetch(request);
    if (response.ok) await cache.put(request.mode === "navigate" ? "/" : request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request.mode === "navigate" ? "/" : request);
    return cached || Response.error();
  }
}

function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Navigation network timeout")), timeoutMs);
    fetch(request).then(resolve, reject).finally(() => clearTimeout(timeout));
  });
}
