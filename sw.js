// Permite abrir o material sem internet depois da primeira visita.
// Estratégia: rede primeiro, para a versão nova chegar sempre que houver conexão, e cache como reserva.
// Guarda só os arquivos deste site e não coleta nenhum dado.
const CACHE_NAME = "missoes-interativas-offline";
const APP_FILES = ["./", "./index.html", "./manifest.json", "./favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === "navigate") return cache.match("./index.html");
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const sameOrigin = new URL(request.url).origin === self.location.origin;
  if (request.method === "GET" && sameOrigin) event.respondWith(networkFirst(request));
});
