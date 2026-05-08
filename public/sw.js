const CACHE_NAME = "scrollsense-ai-v12";
const APP_SHELL = [
  "/",
  "/onboarding",
  "/mood",
  "/feed",
  "/tests",
  "/dashboard",
  "/recommendations",
  "/report",
  "/methodology",
  "/settings",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon.svg"
];
const DEMO_API_RESPONSE = {
  mode: "demo",
  videos: [
    {
      id: "M7lc1UVf-VE",
      title: "Demo embed: YouTube player sample",
      channelTitle: "YouTube Developers",
      thumbnail: "https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg",
      embedUrl: "https://www.youtube.com/embed/M7lc1UVf-VE"
    },
    {
      id: "jNQXAC9IVRw",
      title: "Demo embed: short public archive clip",
      channelTitle: "Public YouTube Archive",
      thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
      embedUrl: "https://www.youtube.com/embed/jNQXAC9IVRw"
    },
    {
      id: "BaW_jenozKc",
      title: "Demo embed: developer test clip",
      channelTitle: "YouTube Developers",
      thumbnail: "https://i.ytimg.com/vi/BaW_jenozKc/hqdefault.jpg",
      embedUrl: "https://www.youtube.com/embed/BaW_jenozKc"
    }
  ],
  message: "Offline demo mode is active. Reconnect to refresh public videos.",
  fetchedAt: new Date().toISOString()
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled(APP_SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              new Response(JSON.stringify({ ...DEMO_API_RESPONSE, fetchedAt: new Date().toISOString() }), {
                headers: { "Content-Type": "application/json" }
              })
          )
        )
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        });
      })
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
