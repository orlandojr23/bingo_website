// Bin'Go Smart Waste Collection - Progressive Web App Service Worker
const CACHE_NAME = "bingo-pwa-v2";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/icon.png",
  "/logo-green-v2.png",
  "/favicon.ico",
  "/manifest.webmanifest",
];

// Install: Cache critical shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn("[SW] Pre-cache partial warning:", err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean old caches and claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: Network-first for pages, Cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests, non-http protocols, or external geospatial map tiles
  if (
    request.method !== "GET" ||
    !url.protocol.startsWith("http") ||
    url.hostname.includes("cartocdn.com") ||
    url.hostname.includes("openstreetmap.org") ||
    url.hostname.includes("mapbox") ||
    url.hostname.includes("basemaps")
  ) {
    return;
  }

  // Handle navigation (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return (await caches.match(OFFLINE_URL)) || new Response("Offline", { status: 503 });
        })
    );
    return;
  }

  // Handle static assets (images, fonts, scripts, css)
  if (
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style" ||
    request.destination === "script" ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => new Response("", { status: 404 }));
      })
    );
    return;
  }

  // Default network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Push Notifications for truck arrivals & ticket status updates
self.addEventListener("push", (event) => {
  let data = {
    title: "Bin'Go Alert",
    body: "Waste collection truck is arriving in your area soon!",
    icon: "/icon.png",
    badge: "/icon.png",
    data: { url: "/live-map" },
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icon.png",
    badge: data.badge || "/icon.png",
    vibrate: [200, 100, 200],
    data: data.data || { url: "/live-map" },
    actions: [
      { action: "explore", title: "View Live Map" },
      { action: "close", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/live-map";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
