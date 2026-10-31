// Keeps the Ultron page itself working with no internet.
// (The AI model files are cached separately by the AI engine.)
const CACHE = "ultron-shell-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg"];
const CDN_OK = ["esm.run", "cdn.jsdelivr.net"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener("activate", e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const cdn = CDN_OK.includes(url.hostname);
  if (!sameOrigin && !cdn) return; // model files etc. are handled elsewhere

  if (sameOrigin){
    // network first, fall back to cache when offline
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
  } else {
    // engine code from the CDN: cache first
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }))
    );
  }
});
