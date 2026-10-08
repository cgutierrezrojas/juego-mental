// Menú, navegación entre pantallas, récords y tema.

// Cada juego: { id, nombre, color, instrucciones, juego }. `juego` es un módulo con start(pantalla, alTerminar),
// que devuelve una función parar(); `color` es el nombre de su variable CSS.
// Para añadir un juego: crear el archivo en games/, importarlo arriba y añadir su entrada aquí.
import * as calculo from './games/calculo.js';
import * as atencion from './games/atencion.js';
import * as memoria from './games/memoria.js';
import { el, leer, guardar } from './games/comun.js';
import { sonar, activo, alternar, puedeVibrar } from './games/efectos.js';

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
  const nuevo = puntos > leerRecord(actual.id);
  if (nuevo) guardar('record:' + actual.id, puntos);
  $('final-puntos').textContent = puntos;
  $('final-record').hidden = !nuevo;
  mostrar('final');
  if (nuevo) {
    confeti();
    sonar('record');
  }
}

// Lluvia de confeti con los colores del tema. Cada pieza se borra al acabar de caer.
function confeti() {
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
  $('btn-sonido').ariaPressed = activo('sonido');
  $('btn-vibracion').classList.toggle('apagado', !activo('vibracion'));
  $('btn-vibracion').ariaPressed = activo('vibracion');
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
