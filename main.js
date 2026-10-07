// Menú, navegación entre pantallas y récords.

// Cada juego: { id, nombre, instrucciones, juego }, donde `juego` es un módulo con start(pantalla, alTerminar).
// Para añadir un juego: crear el archivo en games/, importarlo arriba y añadir su entrada aquí.
import * as calculo from './games/calculo.js';
import * as atencion from './games/atencion.js';

const JUEGOS = [
  { id: 'calculo', nombre: 'Cálculo', instrucciones: 'Resuelve todas las operaciones que puedas en 60 segundos.', juego: calculo },
  { id: 'atencion', nombre: 'Atención', instrucciones: 'Toca el color de la tinta, no lo que dice la palabra.', juego: atencion },
];

const $ = (id) => document.getElementById(id);
let actual = null;

function leerRecord(id) {
  try {
    return Number(localStorage.getItem('record:' + id)) || 0;
  } catch {
    return 0; // sin localStorage (modo privado): se juega sin récord
  }
}

function guardarRecord(id, puntos) {
  try {
    localStorage.setItem('record:' + id, puntos);
  } catch {
    // sin localStorage: no se guarda
  }
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
  const pantalla = $('juego');
  pantalla.replaceChildren();
  mostrar('juego');
  actual.juego.start(pantalla, terminar);
}

function terminar(puntos) {
  const nuevo = puntos > leerRecord(actual.id);
  if (nuevo) guardarRecord(actual.id, puntos);
  $('final-puntos').textContent = puntos;
  $('final-record').hidden = !nuevo;
  mostrar('final');
}

for (const j of JUEGOS) {
  const b = document.createElement('button');
  b.className = 'grande';
  b.textContent = j.nombre;
  b.onclick = () => abrirPrevia(j);
  $('lista-juegos').append(b);
}

$('btn-jugar').onclick = jugar;
$('btn-repetir').onclick = jugar;
for (const b of document.querySelectorAll('.btn-menu')) b.onclick = () => mostrar('menu');
