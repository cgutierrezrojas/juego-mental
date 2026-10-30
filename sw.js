// Service worker: guarda los archivos para poder jugar sin conexión.
const CACHE = 'juego-mental';
const ARCHIVOS = [
  './', 'index.html', 'styles.css', 'main.js', 'manifest.json', 'icon.svg', 'apple-touch-icon.png',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
  'games/comun.js', 'games/efectos.js', 'games/calculo.js', 'games/atencion.js', 'games/memoria.js',
  'games/opciones.js', 'games/series.js', 'games/sobra.js', 'games/puzzle.js', 'games/rayo.js',
  'games/topos.js', 'games/estadisticas.js', 'games/modos.js', 'games/niveles.js',
  'games/mayor.js', 'games/menos.js', 'games/verdad.js', 'games/anagrama.js', 'games/cuenta.js', 'games/distinto.js', 'games/balanza.js', 'games/parejas.js', 'games/final.js',
  'games/copia.js', 'games/amigos.js', 'games/vivo.js', 'games/chat.js', 
  'app/estado.js', 'app/juegos.js', 'app/datos.js', 'app/ui.js', 'app/menu.js', 'app/estadisticas.js', 'app/previa.js', 'app/partida.js', 'app/cuenta.js', 'app/duelos.js', 'app/amigos.js', 'app/vivo.js', 'app/chat.js', 'app/liga.js', 'app/inicio.js', 'app/mesa.js', 'app/trivia.js', 'app/cartas.js', 'app/cartas-mesa.js', 'games/ocho.js', 'games/cartas.js', 'games/solitario.js', 'games/veintiuno.js', 'games/bacara.js', 'games/ruleta.js', 'games/trivia.js', 'games/preguntas.js', 'games/gato.js', 'games/conecta4.js', 'games/liga.js', 'games/duelos.js', 'games/logros.js', 'games/sincro.js', 'games/nube.js', 'firebase-config.js', 'privacidad.html',
];

self.addEventListener('install', (e) => {
  // el service worker nuevo toma el control sin esperar a cerrar todas las pestañas
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)));
});

// Primero la red, preguntando siempre al servidor si hay versión nueva (cache: 'no-cache'),
// para que nunca se mezclen archivos viejos y nuevos; sin conexión, la copia guardada.
// Solo las peticiones GET de esta web: las de Firebase (y cualquier otra) van directas a la red.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
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
