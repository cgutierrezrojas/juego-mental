// 🪜 Escalera de palabras: 10 definiciones de largo creciente; cada 2,5 s se destapa una letra. Todo puro.
// Acertar da 10 puntos por cada letra aún oculta; fallar o que se destapen todas quita una de las 3 vidas.
// Estado: { palabras: [{ palabra, tilde, definicion, orden (índices en el orden en que se destapan) }], i, destapadas,
// estado: 'jugando' | 'acertada' | 'fallada', vidas, puntos, fin }.
import { generador, azar, entero } from './semilla.js';
import { barajar } from './comun.js';
import { DEFINICIONES } from './definiciones.js';

export const LARGOS = [4, 5, 6, 7, 7, 8, 8, 9, 10, 11];
export const VIDAS = 3;
export const CADA = 2500; // ms entre letras

export function nueva(semilla) {
  const g = generador(semilla);
  const elegidas = [];
  for (const largo of LARGOS) {
    const opciones = DEFINICIONES.filter((d) => d.palabra.length === largo && !elegidas.includes(d));
    elegidas.push(opciones[entero(g, opciones.length)]);
  }
  const palabras = elegidas.map((d) => ({ ...d, orden: barajar([...[...d.palabra].keys()], () => azar(g)) }));
  return { palabras, i: 0, destapadas: 0, estado: 'jugando', vidas: VIDAS, puntos: 0, fin: false };
}

export const actual = (e) => e.palabras[e.i];
// Las posiciones ya destapadas de la palabra actual.
export const visibles = (e) => actual(e).orden.slice(0, e.destapadas);

function fallar(e) {
  e.estado = 'fallada';
  e.vidas--;
  if (!e.vidas) e.fin = true;
}

export function destapar(e) {
  if (e.fin || e.estado !== 'jugando') return e;
  e.destapadas++;
  if (e.destapadas >= actual(e).palabra.length) fallar(e);
  return e;
}

export function responder(e, texto) {
  if (e.fin || e.estado !== 'jugando') return e;
  const { palabra } = actual(e);
  if (texto === palabra) {
    e.estado = 'acertada';
    e.puntos += 10 * (palabra.length - e.destapadas);
  } else fallar(e);
  return e;
}

export function siguiente(e) {
  if (e.fin) return e;
  e.i++;
  e.destapadas = 0;
  e.estado = 'jugando';
  if (e.i >= e.palabras.length) {
    e.i = e.palabras.length - 1;
    e.fin = true;
  }
  return e;
}
