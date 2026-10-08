// Menú, navegación entre pantallas, récords y tema.

// Cada juego: { id, nombre, color, instrucciones, juego }. `juego` es un módulo con start(pantalla, alTerminar),
// que devuelve una función parar(); `color` es el nombre de su variable CSS.
// Para añadir un juego: crear el archivo en games/, importarlo arriba y añadir su entrada aquí.
import * as calculo from './games/calculo.js';
import * as atencion from './games/atencion.js';
import * as memoria from './games/memoria.js';
import { leer, guardar } from './games/comun.js';

const JUEGOS = [
  { id: 'calculo', nombre: 'Cálculo', color: 'rojo', instrucciones: 'Resuelve todas las operaciones que puedas en 60 segundos.', juego: calculo },
  { id: 'atencion', nombre: 'Atención', color: 'azul', instrucciones: 'Toca el color de la tinta, no lo que dice la palabra.', juego: atencion },
  { id: 'memoria', nombre: 'Memoria', color: 'verde', instrucciones: 'Mira la secuencia de colores y repítela. Cada ronda, uno más.', juego: memoria },
];

const $ = (id) => document.getElementById(id);
let actual = null;
let parar = null; // detiene el juego en curso (la devuelve start)

function leerRecord(id) {
  return Number(leer('record:' + id)) || 0;
}

function mostrar(id) {
  for (const s of document.querySelectorAll('main > section')) s.hidden = s.id !== id;
}

function abrirPrevia(j) {
  actual = j;
  $('previa-nombre').textContent = j.nombre;
  $('previa-instrucciones').textContent = j.instrucciones;
  $('previa-record').textContent = leerRecord(j.id);
  mostrar('previa');
}

function jugar() {
  const tablero = $('tablero');
  tablero.replaceChildren();
  mostrar('juego');
  parar = actual.juego.start(tablero, terminar);
}

function terminar(puntos) {
  parar = null;
  const nuevo = puntos > leerRecord(actual.id);
  if (nuevo) guardar('record:' + actual.id, puntos);
  $('final-puntos').textContent = puntos;
  $('final-record').hidden = !nuevo;
  mostrar('final');
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

for (const j of JUEGOS) {
  const b = document.createElement('button');
  b.className = 'grande color';
  b.style.setProperty('--c', `var(--${j.color})`);
  b.textContent = j.nombre;
  b.onclick = () => abrirPrevia(j);
  $('lista-juegos').append(b);
}

$('btn-jugar').onclick = jugar;
$('btn-repetir').onclick = jugar;
for (const b of document.querySelectorAll('.btn-menu')) b.onclick = () => mostrar('menu');

// ✕: vuelve al menú sin guardar la puntuación.
$('btn-salir').onclick = () => {
  if (parar) parar();
  parar = null;
  mostrar('menu');
};

// Funcionamiento sin conexión. Solo va en localhost o HTTPS; si falla, la app sigue igual.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
