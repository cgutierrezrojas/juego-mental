// 💰 La gran escalera: 15 preguntas de 4 opciones (5 fáciles, 5 medias, 5 difíciles), premios que suben,
// dos escalones seguros, plantarse y 4 ayudas de un uso. Todo puro.
// Estado: { preguntas: [q], reservas: { d: q }, nivel (pregunta actual, 0–14), ganado, ayudas: { mitad, publico, cambiar, tiempo },
// quitadas: [índices], votos: [4] | null, resultado: null | 'gano' | 'fallo' | 'tiempo' | 'plantado', fin }.
// Cada q: { p, d, opciones, correcta (índice), quita (2 incorrectas para el 50:50), publico ([4] votos que suman 100) }.
import { generador, azar, entero } from './semilla.js';
import { barajar } from './comun.js';

export const PREMIOS = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];
export const SEGUROS = [4, 9]; // las preguntas 5 y 10
export const SEGUNDOS = 30;
export const MAS_TIEMPO = 30;
const ACIERTA = { 1: 65, 2: 50, 3: 38 }; // votos medios del público a la correcta

function preparar(q, g) {
  const opciones = barajar(q.o, () => azar(g));
  const correcta = opciones.indexOf(q.o[0]);
  const malas = [0, 1, 2, 3].filter((i) => i !== correcta);
  const quita = barajar(malas, () => azar(g)).slice(0, 2);
  // Público: la correcta recibe ACIERTA ± 15; el resto se reparte al azar entre las otras tres.
  const votos = Array(4).fill(0);
  votos[correcta] = Math.max(10, Math.min(90, ACIERTA[q.d] - 15 + entero(g, 31)));
  const pesos = malas.map(() => 1 + azar(g) * 3);
  let resto = 100 - votos[correcta];
  malas.forEach((i, k) => {
    const n = k === malas.length - 1 ? resto : Math.round(((100 - votos[correcta]) * pesos[k]) / pesos.reduce((a, b) => a + b, 0));
    votos[i] = Math.min(n, resto);
    resto -= votos[i];
  });
  return { p: q.p, d: q.d, opciones, correcta, quita, publico: votos };
}

// `banco`: [{ c, d, p, o }] con la correcta primero. Elige 6 por dificultad (5 y una de reserva para «Cambiar»).
export function nueva(semilla, banco) {
  const g = generador(semilla);
  const preguntas = [];
  const reservas = {};
  for (const d of [1, 2, 3]) {
    const seis = barajar(banco.filter((q) => q.d === d), () => azar(g)).slice(0, 6).map((q) => preparar(q, g));
    preguntas.push(...seis.slice(0, 5));
    reservas[d] = seis[5];
  }
  return { preguntas, reservas, nivel: 0, ganado: 0, ayudas: { mitad: true, publico: true, cambiar: true, tiempo: true }, quitadas: [], votos: null, resultado: null, fin: false };
}

export const actual = (e) => e.preguntas[e.nivel];
// Lo que te llevas si fallas en la pregunta `nivel`: el último seguro ya superado.
export const seguro = (nivel) => {
  const s = SEGUROS.filter((k) => k < nivel).at(-1);
  return s === undefined ? 0 : PREMIOS[s];
};

function cerrar(e, resultado) {
  e.resultado = resultado;
  e.fin = true;
  return e;
}

// Responde la opción `i`: si acierta sube un escalón (y en la 15 gana); si no, se lleva el seguro.
export function responder(e, i) {
  if (e.fin || e.quitadas.includes(i)) return e;
  if (i === actual(e).correcta) {
    e.ganado = PREMIOS[e.nivel];
    e.quitadas = [];
    e.votos = null;
    if (e.nivel === PREMIOS.length - 1) return cerrar(e, 'gano');
    e.nivel++;
    return e;
  }
  e.ganado = seguro(e.nivel);
  return cerrar(e, 'fallo');
}

export function sinTiempo(e) {
  if (e.fin) return e;
  e.ganado = seguro(e.nivel);
  return cerrar(e, 'tiempo');
}

export const plantarse = (e) => (e.fin ? e : cerrar(e, 'plantado'));

// Usa una ayuda (si queda): 'mitad', 'publico', 'cambiar' o 'tiempo' (el reloj lo suma la pantalla).
export function ayuda(e, tipo) {
  if (e.fin || !e.ayudas[tipo]) return e;
  e.ayudas[tipo] = false;
  const q = actual(e);
  if (tipo === 'mitad') e.quitadas = q.quita;
  if (tipo === 'publico') e.votos = q.publico;
  if (tipo === 'cambiar') {
    e.preguntas[e.nivel] = e.reservas[q.d];
    e.quitadas = [];
    e.votos = null;
  }
  return e;
}
