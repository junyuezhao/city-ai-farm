/**
 * 城市AI农场 — Service Worker
 * 策略：
 *   - 静态资源 (html/css/js/images/icons) → Cache First
 *   - API 请求 (/api/*)              → Network First，失败回退缓存
 *   - 其他导航请求                   → Network First，失败回退离线页
 * 缓存版本：v1（修改此版本号可强制清空旧缓存）
 */
const CACHE_VERSION = "city-ai-farm-v1";
const CACHE_STATIC  = `${CACHE_VERSION}-static`;
const CACHE_API     = `${CACHE_VERSION}-api`;
const CACHE_OFFLINE = `${CACHE_VERSION}-offline`;

// ── 静态资源预缓存列表（install 时缓存） ───────────────
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/admin-console.html",
  "/manifest.json",
  "/css/style.css",
  "/js/app.js",
  "/js/data.js",
  "/assets/icons/icon-192x192.png",
  "/assets/icons/icon-512x512.png",
  "/assets/icons/favicon.ico",
  "/assets/icons/apple-touch-icon.png",
];

// ── 安装事件：预缓存 ───────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] install → precaching");
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── 激活事件：清理旧缓存 ───────────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] activate → cleanup old caches");
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_STATIC && k !== CACHE_API && k !== CACHE_OFFLINE)
            .map((k) => { console.log("[SW] deleting old cache:", k); return caches.delete(k); })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── 请求拦截 ───────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== location.origin) return;

  // API 请求 → Network First
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, CACHE_API));
    return;
  }

  // 静态资源 → Cache First
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // 导航请求 → Network First，失败回退离线页
  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, CACHE_OFFLINE)
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // 默认：Network First
  event.respondWith(networkFirst(request, CACHE_STATIC));
});

// ── 策略函数 ───────────────────────────────────────────

/** Cache First — 适合不常变的静态资源 */
function cacheFirst(request, cacheName) {
  return caches.match(request)
    .then((cached) => {
      if (cached) {
        // 后台静默更新缓存
        fetchAndCache(request, cacheName).catch(() => {});
        return cached;
      }
      return fetchAndCache(request, cacheName);
    });
}

/** Network First — 适合需要最新数据的请求 */
function networkFirst(request, cacheName) {
  return fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(cacheName).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(() => caches.match(request)
      .then((cached) => cached || new Response("Offline", { status: 503 }))
    );
}

/** 抓取并缓存 */
function fetchAndCache(request, cacheName) {
  return fetch(request)
    .then((response) => {
      if (!response || response.status !== 200) return response;
      const clone = response.clone();
      caches.open(cacheName).then((cache) => cache.put(request, clone));
      return response;
    });
}

/** 判断是否为静态资源 */
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".gif") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".json") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".ttf")
  );
}

// ── 消息事件（供页面手动触发缓存更新） ────────────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => caches.delete(k)))
      ).then(() => event.ports[0].postMessage({ ok: true }))
    );
  }
});

console.log("[SW] registered →", CACHE_VERSION);
