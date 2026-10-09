// Menú, navegación entre pantallas, récords y tema.

// Cada juego: { id, nombre, categoria, icono, color, habilidad, referencia, instrucciones, juego } y, si hace falta, `unidad`
// (texto tras la puntuación) y `menorEsMejor` (récord = puntuación más baja). `habilidad` es la barra del perfil a la que cuenta y `referencia` la puntuación que vale 100 en esa barra.
// `juego` es un módulo con start(pantalla, alTerminar), que devuelve una función parar(); `color` es el nombre de su variable CSS.
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
import {
  anotar, fechaLocal, puntosGrafica, entrenoDelDia, jugadosEn, entrenoCompleto, racha,
  mejorRacha, entrenosCompletados, perfil,
} from './games/estadisticas.js';

const JUEGOS = [
  { id: 'calculo', nombre: 'Cálculo', categoria: 'Clásicos', icono: '➕', color: 'rojo', habilidad: 'Cálculo', referencia: 30, instrucciones: 'Resuelve todas las operaciones que puedas en 60 segundos.', juego: calculo },
  { id: 'atencion', nombre: 'Atención', categoria: 'Clásicos', icono: '👁', color: 'azul', habilidad: 'Atención', referencia: 40, instrucciones: 'Toca el color de la tinta, no lo que dice la palabra.', juego: atencion },
  { id: 'memoria', nombre: 'Memoria', categoria: 'Clásicos', icono: '🧠', color: 'verde', habilidad: 'Memoria', referencia: 12, instrucciones: 'Mira la secuencia de colores y repítela. Cada ronda, uno más.', juego: memoria },
  { id: 'series', nombre: 'Series', categoria: 'Lógica', icono: '🔢', color: 'amarillo', habilidad: 'Lógica', referencia: 20, instrucciones: '¿Qué número sigue? Descubre la regla de cada serie. 60 segundos.', juego: series },
  { id: 'sobra', nombre: '¿Cuál sobra?', categoria: 'Lógica', icono: '🔍', color: 'rojo', habilidad: 'Lógica', referencia: 20, instrucciones: 'Tres números siguen una regla y uno no: toca el que sobra. 60 segundos.', juego: sobra },
  { id: 'puzzle', nombre: 'Puzzle', categoria: 'Lógica', icono: '🧩', color: 'azul', habilidad: 'Lógica', referencia: 30, unidad: 'movimientos', menorEsMejor: true, instrucciones: 'Ordena las fichas del 1 al 8 con los menos movimientos posibles.', juego: puzzle },
  { id: 'rayo', nombre: 'Rayo', categoria: 'Reacción', icono: '⚡', color: 'amarillo', habilidad: 'Reacción', referencia: 250, unidad: 'ms', menorEsMejor: true, instrucciones: 'Cuando se ponga verde, ¡toca! 5 intentos; cuenta tu tiempo medio.', juego: rayo },
  { id: 'topos', nombre: 'Topos', categoria: 'Reacción', icono: '🔨', color: 'verde', habilidad: 'Reacción', referencia: 40, instrucciones: 'Toca cada topo antes de que se esconda. Tocar una casilla vacía resta. 30 segundos.', juego: topos },
];

const CATEGORIAS = ['Clásicos', 'Lógica', 'Reacción'];
// Ids de los juegos de cada categoría, en el orden de CATEGORIAS (para el entrenamiento diario).
// ponytail: añadir o reordenar juegos cambia qué pedían los entrenamientos pasados (y las rachas); guardar los días completados si importa.
const idsPorCategoria = CATEGORIAS.map((c) => JUEGOS.filter((j) => j.categoria === c).map((j) => j.id));

const HABILIDADES = ['Memoria', 'Cálculo', 'Atención', 'Lógica', 'Reacción'];

const $ = (id) => document.getElementById(id);
let actual = null;
let parar = null; // detiene el juego en curso (la devuelve start)
let inicio = 0; // cuándo empezó el juego en curso (tras la cuenta atrás), para medir su duración

function leerRecord(id) {
  return Number(leer('record:' + id)) || 0;
}

// "245 ms", "12 movimientos" o solo "7" si el juego no tiene unidad.
const conUnidad = (j, n) => (j.unidad ? `${n} ${j.unidad}` : `${n}`);

// Historial de partidas terminadas: `historial:<id>` = JSON [{ fecha, cuando, puntos, ms }]. Si está roto, vacío.
function leerHistorial(id) {
  try {
    const historial = JSON.parse(leer('historial:' + id));
    // Solo entradas válidas: un dato roto no debe romper el menú ni las gráficas.
    return Array.isArray(historial) ? historial.filter((p) => p && typeof p === 'object' && Number.isFinite(p.puntos)) : [];
  } catch {
    return [];
  }
}

const historiales = () => Object.fromEntries(JUEGOS.map((j) => [j.id, leerHistorial(j.id)]));

// Anota la partida y suma a los contadores totales (que no se recortan con el historial).
function guardarPartida(id, partida) {
  guardar('historial:' + id, JSON.stringify(anotar(leerHistorial(id), partida)));
  guardar('contador:partidas', (Number(leer('contador:partidas')) || 0) + 1);
  guardar('contador:ms', (Number(leer('contador:ms')) || 0) + partida.ms);
}

// Gráfica de las últimas 20 partidas (la línea sube al mejorar) y media de las últimas 10.
function pintarHistorial(j) {
  const caja = $('previa-historial');
  const ultimas = leerHistorial(j.id).slice(-20).map((p) => p.puntos);
  if (!ultimas.length) return caja.replaceChildren(el('p', 'sin-datos', 'Aún no hay partidas'));
  const svg = 'http://www.w3.org/2000/svg';
  const grafica = document.createElementNS(svg, 'svg');
  grafica.setAttribute('viewBox', '0 0 200 50');
  grafica.setAttribute('preserveAspectRatio', 'none');
  grafica.setAttribute('class', 'grafica');
  grafica.setAttribute('role', 'img');
  grafica.setAttribute('aria-label', `Tus últimas ${ultimas.length} partidas`);
  const linea = document.createElementNS(svg, 'polyline');
  linea.setAttribute('points', puntosGrafica(ultimas, 200, 50, j.menorEsMejor));
  linea.style.stroke = `var(--${j.color})`;
  grafica.append(linea);
  const diez = ultimas.slice(-10);
  const media = Math.round(diez.reduce((a, b) => a + b, 0) / diez.length);
  caja.replaceChildren(grafica, el('p', '', `Media de las últimas ${diez.length}: ${conUnidad(j, media)}`));
}

// Tarjeta "Entrenamiento de hoy": los 3 juegos del día (✓ si ya hay una partida hoy) y la racha.
function pintarEntreno() {
  const hoy = fechaLocal();
  const hist = historiales();
  const hechos = jugadosEn(hoy, hist);
  const ids = entrenoDelDia(hoy, idsPorCategoria);
  const titulo = el('div', 'entreno-titulo');
  titulo.append(el('span', '', 'Entrenamiento de hoy'), el('span', '', `🔥 ${racha(hoy, idsPorCategoria, hist)}`));
  const lista = el('div', 'entreno-juegos');
  for (const id of ids) {
    const j = JUEGOS.find((x) => x.id === id);
    const hecho = hechos.has(id);
    const b = el('button', hecho ? 'hecho' : '', `${hecho ? '✓' : '○'} ${j.icono} ${j.nombre}`);
    b.onclick = () => abrirPrevia(j);
    lista.append(b);
  }
  const partes = [titulo, lista];
  if (ids.every((id) => hechos.has(id))) partes.push(el('p', 'entreno-completo', '✓ ¡Entrenamiento completado!'));
  $('entreno').replaceChildren(...partes);
}

// Pantalla 📊: resumen, perfil por habilidad (barras 0–100) y récords de todos los juegos.
function pintarEstadisticas() {
  const hist = historiales();
  const hoy = fechaLocal();
  const minutos = Math.round((Number(leer('contador:ms')) || 0) / 60000);
  const resumen = el('div', 'resumen');
  for (const [valor, texto] of [
    [Number(leer('contador:partidas')) || 0, 'partidas'],
    [`${minutos} min`, 'jugando'],
    [`🔥 ${racha(hoy, idsPorCategoria, hist)}`, 'racha actual'],
    [`🔥 ${mejorRacha(idsPorCategoria, hist)}`, 'mejor racha'],
    [entrenosCompletados(idsPorCategoria, hist), 'entrenamientos'],
  ]) {
    const dato = el('div', 'dato');
    dato.append(el('strong', '', valor), el('span', '', texto));
    resumen.append(dato);
  }

  const barras = el('div', 'perfil');
  for (const { habilidad, valor } of perfil(JUEGOS, hist, HABILIDADES)) {
    const fila = el('div', 'fila-perfil');
    const barra = el('div', 'barra');
    const relleno = el('div');
    relleno.style.width = `${valor ?? 0}%`;
    barra.append(relleno);
    fila.append(el('span', '', habilidad), barra, el('span', '', valor ?? 'Sin datos'));
    barras.append(fila);
  }

  const records = el('ul', 'records');
  for (const j of JUEGOS) {
    const r = leerRecord(j.id);
    records.append(el('li', '', `${j.icono} ${j.nombre}: ${r ? conUnidad(j, r) : '—'}`));
  }

  $('estadisticas-contenido').replaceChildren(
    resumen,
    el('h3', 'categoria', 'Perfil por habilidad'),
    barras,
    el('h3', 'categoria', 'Récords'),
    records,
  );
}

function mostrar(id) {
  for (const s of document.querySelectorAll('main > section')) s.hidden = s.id !== id;
  $('btn-salir').hidden = id !== 'juego';
  $('btn-estadisticas').hidden = id !== 'menu';
  if (id === 'menu') pintarEntreno();
}

function abrirPrevia(j) {
  actual = j;
  $('previa-nombre').textContent = j.nombre;
  $('previa-instrucciones').textContent = j.instrucciones;
  const record = leerRecord(j.id);
  $('previa-record').textContent = record ? conUnidad(j, record) : '—';
  pintarHistorial(j);
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
      inicio = Date.now();
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
  const hoy = fechaLocal();
  const entrenoAntes = entrenoCompleto(hoy, idsPorCategoria, historiales());
  guardarPartida(actual.id, { fecha: hoy, cuando: Date.now(), puntos, ms: Date.now() - inicio });
  // ¿Esta partida es la que completa el entrenamiento de hoy?
  const entrenoHoy = !entrenoAntes && entrenoCompleto(hoy, idsPorCategoria, historiales());
  const nuevo = esRecord(puntos, leerRecord(actual.id), actual.menorEsMejor);
  if (nuevo) guardar('record:' + actual.id, puntos);
  $('final-puntos').textContent = conUnidad(actual, puntos);
  $('final-record').hidden = !nuevo;
  $('final-entreno').hidden = !entrenoHoy;
  mostrar('final');
  if (nuevo || entrenoHoy) {
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
for (const categoria of CATEGORIAS) {
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

pintarEntreno();

$('btn-jugar').onclick = jugar;
$('btn-repetir').onclick = jugar;
for (const b of document.querySelectorAll('.btn-menu')) b.onclick = () => mostrar('menu');

$('btn-estadisticas').onclick = () => {
  pintarEstadisticas();
  mostrar('estadisticas');
};

// ✕: vuelve al menú sin guardar la puntuación.
$('btn-salir').onclick = () => {
  if (parar) parar();
  parar = null;
  callar();
  mostrar('menu');
};

// Funcionamiento sin conexión. Solo va en localhost o HTTPS; si falla, la app sigue igual.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
