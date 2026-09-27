const CACHE_NAME = "peakguard-shell-v1";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(SHELL_FILES);
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

/* Only the app shell is cached, so the interface opens instantly / offline.
   Everything else (weather, terrain, map tiles, search) always goes to the
   network so the app never shows stale data — if it fails, the app's own
   "Data unavailable" handling takes over, same as online. */
self.addEventListener("fetch", function(event){
  var url = new URL(event.request.url);
  var isShellFile = url.origin === self.location.origin && SHELL_FILES.some(function(f){
    var normalized = f.replace("./", "/");
    return url.pathname === normalized || (normalized === "/" && url.pathname === "/index.html") || (f === "./" && url.pathname.endsWith("/"));
  });
  if(!isShellFile){ return; }
  event.respondWith(
    caches.match(event.request).then(function(cached){
      var network = fetch(event.request).then(function(resp){
        if(resp && resp.ok){
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, resp.clone()); });
        }
        return resp;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
