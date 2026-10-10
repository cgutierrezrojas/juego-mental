// Service worker: guarda los archivos para poder jugar sin conexión.
const CACHE = 'juego-mental';
const ARCHIVOS = [
  './', 'index.html', 'styles.css', 'main.js', 'manifest.json', 'icon.svg', 'apple-touch-icon.png',
  'games/comun.js', 'games/efectos.js', 'games/calculo.js', 'games/atencion.js', 'games/memoria.js',
  'games/opciones.js', 'games/series.js', 'games/sobra.js', 'games/puzzle.js', 'games/rayo.js',
  'games/topos.js', 'games/estadisticas.js', 'games/modos.js', 'games/niveles.js',
];

self.addEventListener('install', (e) => {
  // el service worker nuevo toma el control sin esperar a cerrar todas las pestañas
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)));
});

// Primero la red, preguntando siempre al servidor si hay versión nueva (cache: 'no-cache'),
// para que nunca se mezclen archivos viejos y nuevos; sin conexión, la copia guardada.
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return respuesta;
      })
      .catch(() => caches.match(e.request)),
  );
});
