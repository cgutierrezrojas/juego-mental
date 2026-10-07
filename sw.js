// Service worker: guarda los archivos para poder jugar sin conexión.
const CACHE = 'juego-mental';
const ARCHIVOS = [
  './', 'index.html', 'styles.css', 'main.js', 'manifest.json', 'icon.svg',
  'games/comun.js', 'games/calculo.js', 'games/atencion.js', 'games/memoria.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)));
});

// Primero la red (así los cambios se ven al momento) y, si no hay conexión, la copia guardada.
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return respuesta;
      })
      .catch(() => caches.match(e.request)),
  );
});
