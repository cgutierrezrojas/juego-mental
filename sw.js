// Service worker: guarda los archivos para poder jugar sin conexión.
// VERSION es una huella de todos los archivos: tests.js avisa si cambió algo y no se actualizó.
const VERSION = '901e1f72cc';
const CACHE = 'pal-rato-' + VERSION;
const ARCHIVOS = [
  './', 'index.html', 'styles.css', 'main.js', 'manifest.json', 'icon.svg', 'apple-touch-icon.png',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
  'games/comun.js', 'games/efectos.js', 'games/calculo.js', 'games/atencion.js', 'games/memoria.js',
  'games/opciones.js', 'games/series.js', 'games/sobra.js', 'games/puzzle.js', 'games/rayo.js',
  'games/topos.js', 'games/estadisticas.js', 'games/premios.js', 'games/modos.js', 'games/niveles.js',
  'games/mayor.js', 'games/menos.js', 'games/verdad.js', 'games/anagrama.js', 'games/cuenta.js', 'games/distinto.js', 'games/balanza.js', 'games/parejas.js', 'games/final.js',
  'games/copia.js', 'games/amigos.js', 'games/vivo.js', 'games/chat.js', 
  'app/estado.js', 'app/juegos.js', 'app/datos.js', 'app/ui.js', 'app/menu.js', 'app/estadisticas.js', 'app/premios.js', 'app/previa.js', 'app/partida.js', 'app/cuenta.js', 'app/duelos.js', 'app/amigos.js', 'app/vivo.js', 'app/chat.js', 'app/liga.js', 'app/inicio.js', 'app/mesa.js', 'app/trivia.js', 'app/cartas.js', 'app/arcade.js', 'games/semilla.js', 'games/serpiente.js', 'games/saltar.js', 'games/autos.js', 'games/ladrillos.js', 'games/bloques.js', 'app/retos.js', 'app/palabras.js', 'games/diccionario.js', 'games/palabra.js', 'games/ahorcado.js', 'games/sopa.js', 'games/definiciones.js', 'games/escalera.js', 'games/charadas.js', 'games/granescalera.js', 'app/granescalera.js', 'app/cartas-mesa.js', 'app/carioca.js', 'app/burako.js', 'games/rummy.js', 'games/carioca.js', 'games/burako.js', 'games/ocho.js', 'games/escoba.js', 'img/baraja-espanola.webp', 'games/cartas.js', 'games/solitario.js', 'games/veintiuno.js', 'games/bacara.js', 'games/ruleta.js', 'games/trivia.js', 'games/preguntas.js', 'games/gato.js', 'games/conecta4.js', 'games/liga.js', 'games/duelos.js', 'games/logros.js', 'games/sincro.js', 'games/nube.js', 'firebase-config.js', 'anuncios-config.js', 'app/anuncios.js', 'privacidad.html',
];

self.addEventListener('install', (e) => {
  // el service worker nuevo toma el control sin esperar a cerrar todas las pestañas
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS.map((a) => new Request(a, { cache: 'reload' })))));
});

// Al activarse una versión nueva se borran las copias viejas.
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});

// Primero la copia guardada de esta versión (arranca al instante, con o sin señal); lo que no esté, de la red.
// Una versión nueva se descarga entera en segundo plano (install) y se usa al volver a abrir la app,
// así nunca se mezclan archivos viejos y nuevos. Las peticiones a Firebase (y cualquier otra) van directas a la red.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then((c) => c.match(e.request, { ignoreSearch: true }).then((guardada) => guardada ?? fetch(e.request))));
});
