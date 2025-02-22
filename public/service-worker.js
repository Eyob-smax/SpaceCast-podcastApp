const cacheName = "podcast-v1";
const filesToCache = [
  "/manifest.json",
  "/index.html",
  "/style.css",
  "/script.js",
  "/Podcast_01_generated.jpg",
  "/Podcast-icon-192.png",
  "/Podcast-icon-512.png",
];

self.addEventListener("install", (event) => {
  console.log("Service Worker: Installed");

  event.waitUntil(
    caches.open(cacheName).then((cache) => {
      console.log("Service Worker: Caching files");
      return cache.addAll(filesToCache); // ✅ Fix: Ensure promise is returned
    })
  );
});

self.addEventListener("fetch", (event) => {
  console.log("Service Worker: Fetching", event.request.url);

  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).catch(() => {
          console.warn("Fetch failed, returning offline fallback.");
          return caches.match("./index.html");
        })
      );
    })
  );
});

self.addEventListener("activate", (event) => {
  const cacheList = [cacheName]; // ✅ Fix: Only keep the latest cache

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (!cacheList.includes(cache)) {
            // ✅ Fix: Proper check
            console.log("Deleting old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});
