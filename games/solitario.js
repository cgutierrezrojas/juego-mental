// 🂡 Solitario (Klondike): 7 columnas, 4 pilas del As al Rey y el mazo. Todo puro: cada jugada devuelve un estado nuevo.
// Estado: { robo: 1 | 3, mazo: [cartas boca abajo], descarte: [], pilas: [♠, ♥, ♦, ♣], columnas: [[{ v, p, a }]], movimientos }
// (`a`: boca arriba). Origen de una jugada: { de: 'descarte' } | { de: 'pila', i } | { de: 'col', i, k } (k: desde qué carta).
// Destino: { a: 'pila', i } | { a: 'col', i }.
import { baraja, esRoja, PALOS } from './cartas.js';

const copia = (e) => structuredClone(e);
const ultima = (lista) => lista[lista.length - 1];

export function repartir(robo = 1, rnd = Math.random) {
  const cartas = baraja(rnd);
  const columnas = Array.from({ length: 7 }, (_, i) => cartas.splice(0, i + 1).map((c, k) => ({ ...c, a: k === i })));
  return { robo, mazo: cartas, descarte: [], pilas: [[], [], [], []], columnas, movimientos: 0 };
}

// Roba 1 o 3 del mazo al descarte; con el mazo vacío, el descarte vuelve al mazo.
export function robar(e) {
  if (!e.mazo.length && !e.descarte.length) return null;
  const s = copia(e);
  if (s.mazo.length) s.descarte.push(...s.mazo.splice(-s.robo).reverse());
  else [s.mazo, s.descarte] = [s.descarte.reverse(), []];
  s.movimientos++;
  return s;
}

// Las cartas que se mueven desde ese origen, o null si no se puede tomar de ahí.
export function cartasDe(e, o) {
  if (o.de === 'descarte') return e.descarte.length ? [ultima(e.descarte)] : null;
  if (o.de === 'pila') return e.pilas[o.i].length ? [ultima(e.pilas[o.i])] : null;
  const col = e.columnas[o.i];
  return col[o.k]?.a ? col.slice(o.k) : null;
}

export function puede(e, o, d) {
  const cartas = cartasDe(e, o);
  if (!cartas || (o.de === (d.a === 'pila' ? 'pila' : 'col') && o.i === d.i)) return false;
  const c = cartas[0];
  if (d.a === 'pila') {
    const arriba = ultima(e.pilas[d.i]);
    return cartas.length === 1 && c.p === PALOS[d.i] && c.v === (arriba ? arriba.v + 1 : 1); // cada pila es de un palo
  }
  const arriba = ultima(e.columnas[d.i]);
  return arriba ? arriba.a && esRoja(arriba) !== esRoja(c) && c.v === arriba.v - 1 : c.v === 13;
}

export function mover(e, o, d) {
  if (!puede(e, o, d)) return null;
  const s = copia(e);
  const n = cartasDe(e, o).length;
  const desde = o.de === 'descarte' ? s.descarte : o.de === 'pila' ? s.pilas[o.i] : s.columnas[o.i];
  const cartas = desde.splice(-n);
  if (o.de === 'col' && desde.length) ultima(desde).a = true;
  (d.a === 'pila' ? s.pilas[d.i] : s.columnas[d.i]).push(...cartas);
  s.movimientos++;
  return s;
}

// Un toque: primero a su pila; si no, a la primera columna que la acepte (un Rey que ya está al fondo no se mueve a otra vacía).
export function destinoMejor(e, o) {
  for (let i = 0; i < 4; i++) if (puede(e, o, { a: 'pila', i })) return { a: 'pila', i };
  const reyAlFondo = o.de === 'col' && o.k === 0;
  for (let i = 0; i < 7; i++) {
    if (reyAlFondo && !e.columnas[i].length) continue;
    if (puede(e, o, { a: 'col', i })) return { a: 'col', i };
  }
  return null;
}

// 💡 Una jugada que sirve: subir a una pila, sacar del descarte o destapar una carta. Si no hay, robar ({ robar: true }), o null.
export function pista(e) {
  const origenes = [{ de: 'descarte' }];
  e.columnas.forEach((col, i) => {
    const k = col.findIndex((c) => c.a);
    if (k >= 0) origenes.push({ de: 'col', i, k: col.length - 1 }, { de: 'col', i, k });
  });
  for (const o of origenes) {
    const d = destinoMejor(e, o);
    if (!d) continue;
    const destapa = o.de === 'col' && o.k > 0 && !e.columnas[o.i][o.k - 1].a;
    if (d.a === 'pila' || o.de === 'descarte' || destapa) return { o, d };
  }
  return e.mazo.length || e.descarte.length ? { robar: true } : null;
}

export const puedeTerminar = (e) => !e.mazo.length && !e.descarte.length && e.columnas.every((col) => col.every((c) => c.a));

// ✨ Sube todas las cartas a las pilas, de una en una (cuando ya está todo destapado).
export function terminar(e) {
  let s = e;
  for (let seguir = true; seguir; ) {
    seguir = false;
    for (let i = 0; i < 7; i++) {
      const col = s.columnas[i];
      const d = col.length && destinoMejor(s, { de: 'col', i, k: col.length - 1 });
      if (d?.a === 'pila') {
        s = mover(s, { de: 'col', i, k: col.length - 1 }, d);
        seguir = true;
      }
    }
  }
  return s;
}

export const ganado = (e) => e.pilas.every((p) => p.length === 13);
