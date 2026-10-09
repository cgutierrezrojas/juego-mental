// Menú, navegación entre pantallas, récords y tema.

// Cada juego: { id, nombre, categoria, icono, color, instrucciones, juego } y, si hace falta, `unidad`
// (texto tras la puntuación) y `menorEsMejor` (récord = puntuación más baja). `juego` es un módulo con
// start(pantalla, alTerminar), que devuelve una función parar(); `color` es el nombre de su variable CSS.
// Para añadir un juego: crear el archivo en games/, importarlo arriba y añadir su entrada aquí.
import * as calculo from './games/calculo.js';
import * as atencion from './games/atencion.js';
import * as memoria from './games/memoria.js';
import * as series from './games/series.js';
import * as sobra from './games/sobra.js';
import * as puzzle from './games/puzzle.js';
import * as rayo from './games/rayo.js';
import * as topos from './games/topos.js';
import { el, leer, guardar, esRecord } from './games/comun.js';
import { sonar, callar, activo, alternar, puedeVibrar } from './games/efectos.js';

const JUEGOS = [
  { id: 'calculo', nombre: 'Cálculo', categoria: 'Clásicos', icono: '➕', color: 'rojo', instrucciones: 'Resuelve todas las operaciones que puedas en 60 segundos.', juego: calculo },
  { id: 'atencion', nombre: 'Atención', categoria: 'Clásicos', icono: '👁', color: 'azul', instrucciones: 'Toca el color de la tinta, no lo que dice la palabra.', juego: atencion },
  { id: 'memoria', nombre: 'Memoria', categoria: 'Clásicos', icono: '🧠', color: 'verde', instrucciones: 'Mira la secuencia de colores y repítela. Cada ronda, uno más.', juego: memoria },
  { id: 'series', nombre: 'Series', categoria: 'Lógica', icono: '🔢', color: 'amarillo', instrucciones: '¿Qué número sigue? Descubre la regla de cada serie. 60 segundos.', juego: series },
  { id: 'sobra', nombre: '¿Cuál sobra?', categoria: 'Lógica', icono: '🧩', color: 'rojo', instrucciones: 'Tres números siguen una regla y uno no: toca el que sobra. 60 segundos.', juego: sobra },
  { id: 'puzzle', nombre: 'Puzzle', categoria: 'Lógica', icono: '🟦', color: 'azul', unidad: 'movimientos', menorEsMejor: true, instrucciones: 'Ordena las fichas del 1 al 8 con los menos movimientos posibles.', juego: puzzle },
  { id: 'rayo', nombre: 'Rayo', categoria: 'Reacción', icono: '⚡', color: 'amarillo', unidad: 'ms', menorEsMejor: true, instrucciones: 'Cuando se ponga verde, ¡toca! 5 intentos; cuenta tu tiempo medio.', juego: rayo },
  { id: 'topos', nombre: 'Topos', categoria: 'Reacción', icono: '🔨', color: 'verde', instrucciones: 'Toca cada topo antes de que se esconda. Tocar una casilla vacía resta. 30 segundos.', juego: topos },
];

const $ = (id) => document.getElementById(id);
let actual = null;
let parar = null; // detiene el juego en curso (la devuelve start)

function leerRecord(id) {
  return Number(leer('record:' + id)) || 0;
}

// "245 ms", "12 movimientos" o solo "7" si el juego no tiene unidad.
const conUnidad = (j, n) => (j.unidad ? `${n} ${j.unidad}` : `${n}`);

function mostrar(id) {
  for (const s of document.querySelectorAll('main > section')) s.hidden = s.id !== id;
  $('btn-salir').hidden = id !== 'juego';
}

function abrirPrevia(j) {
  actual = j;
  $('previa-nombre').textContent = j.nombre;
  $('previa-instrucciones').textContent = j.instrucciones;
  const record = leerRecord(j.id);
  $('previa-record').textContent = record ? conUnidad(j, record) : '—';
  mostrar('previa');
}

// Cuenta atrás 3-2-1 y después empieza el juego. Mientras, ✕ la cancela con parar().
function jugar() {
  const tablero = $('tablero');
  mostrar('juego');
  let n = 3;
  let id;
  parar = () => clearTimeout(id);

  function paso() {
    if (n === 0) {
      tablero.replaceChildren();
      parar = actual.juego.start(tablero, terminar);
      return;
    }
    tablero.replaceChildren(el('div', 'cuenta', n));
    sonar('tic');
    n--;
    id = setTimeout(paso, 1000);
  }

  paso();
}

function terminar(puntos) {
  parar = null;
  const nuevo = esRecord(puntos, leerRecord(actual.id), actual.menorEsMejor);
  if (nuevo) guardar('record:' + actual.id, puntos);
  $('final-puntos').textContent = conUnidad(actual, puntos);
  $('final-record').hidden = !nuevo;
  mostrar('final');
  if (nuevo) {
    confeti();
    sonar('record');
  }
}

// Lluvia de confeti con los colores del tema. Cada pieza se borra al acabar de caer.
function confeti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // el sistema pide menos movimiento
  const colores = ['--rojo', '--azul', '--verde', '--amarillo', '--acento'];
  for (let i = 0; i < 40; i++) {
    const pieza = el('div', 'confeti');
    pieza.style.left = Math.random() * 100 + 'vw';
    pieza.style.background = `var(${colores[i % colores.length]})`;
    pieza.style.animationDelay = Math.random() * 0.5 + 's';
    pieza.style.animationDuration = 1.2 + Math.random() * 0.8 + 's';
    pieza.onanimationend = () => pieza.remove();
    document.body.append(pieza);
  }
}

// Tema: el <script> del <head> ya puso data-tema; aquí se cambia con el botón ☀️/🌙.
function pintarTema() {
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  $('btn-tema').textContent = oscuro ? '☀️' : '🌙';
  document.querySelector('meta[name="theme-color"]').content = oscuro ? '#0b0f2a' : '#fff7ec';
}

$('btn-tema').onclick = () => {
  const tema = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
  document.documentElement.dataset.tema = tema;
  guardar('ajuste:tema', tema);
  pintarTema();
};
pintarTema();

// Ajustes 🔊 y 📳 (se guardan en efectos.js).
function pintarAjustes() {
  $('btn-sonido').textContent = activo('sonido') ? '🔊' : '🔇';
  $('btn-sonido').setAttribute('aria-pressed', activo('sonido'));
  $('btn-vibracion').classList.toggle('apagado', !activo('vibracion'));
  $('btn-vibracion').setAttribute('aria-pressed', activo('vibracion'));
}

$('btn-sonido').onclick = () => {
  alternar('sonido');
  pintarAjustes();
};
$('btn-vibracion').onclick = () => {
  alternar('vibracion');
  pintarAjustes();
};
$('btn-vibracion').hidden = !puedeVibrar();
pintarAjustes();

// Menú: tarjetas en cuadrícula, agrupadas por categoría (las categorías sin juegos no se dibujan).
for (const categoria of ['Clásicos', 'Lógica', 'Reacción']) {
  const juegos = JUEGOS.filter((j) => j.categoria === categoria);
  if (!juegos.length) continue;
  const rejilla = el('div', 'rejilla');
  for (const j of juegos) {
    const b = el('button', 'tarjeta color');
    b.style.setProperty('--c', `var(--${j.color})`);
    b.append(el('span', 'icono', j.icono), el('span', '', j.nombre));
    b.onclick = () => abrirPrevia(j);
    rejilla.append(b);
  }
  $('lista-juegos').append(el('h3', 'categoria', categoria), rejilla);
}

$('btn-jugar').onclick = jugar;
$('btn-repetir').onclick = jugar;
for (const b of document.querySelectorAll('.btn-menu')) b.onclick = () => mostrar('menu');

// ✕: vuelve al menú sin guardar la puntuación.
$('btn-salir').onclick = () => {
  if (parar) parar();
  parar = null;
  callar();
  mostrar('menu');
};

// Funcionamiento sin conexión. Solo va en localhost o HTTPS; si falla, la app sigue igual.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
