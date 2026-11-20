// 🔢 Sudoku: reglas puras. Un tablero es un texto de 81 caracteres '0'..'9' ('0' = vacía), fila por fila.
import { generador, entero } from './semilla.js';

export const PISTAS = { facil: 40, normal: 32, dificil: 26 };

// Índices de las casillas que ven a la casilla i (fila, columna y caja), sin ella misma.
const VECINAS = Array.from({ length: 81 }, (_, i) => {
  const f = Math.floor(i / 9), c = i % 9, v = new Set();
  for (let k = 0; k < 9; k++) { v.add(f * 9 + k); v.add(k * 9 + c); }
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) v.add((f - (f % 3) + a) * 9 + c - (c % 3) + b);
  v.delete(i);
  return [...v];
});

const candidatas = (a, i) => {
  const usados = new Set(VECINAS[i].map((j) => a[j]));
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !usados.has(n));
};

// Cuenta soluciones (corta al llegar a `tope`). Elige siempre la vacía con menos candidatas.
export function soluciones(t, tope = 2) {
  const a = [...t].map(Number);
  for (let i = 0; i < 81; i++) if (a[i] && !candidatas(a.map((x, j) => (j === i ? 0 : x)), i).includes(a[i])) return 0;
  let n = 0;
  const ir = () => {
    let mejor = -1, cands = null;
    for (let i = 0; i < 81; i++) {
      if (a[i]) continue;
      const c = candidatas(a, i);
      if (!cands || c.length < cands.length) { mejor = i; cands = c; if (c.length < 2) break; }
    }
    if (mejor < 0) { n++; return; }
    for (const v of cands) {
      a[mejor] = v;
      ir();
      if (n >= tope) break;
    }
    a[mejor] = 0;
  };
  ir();
  return n;
}

function llenar(g) {
  const a = Array(81).fill(0);
  const ir = (i) => {
    if (i === 81) return true;
    const c = candidatas(a, i);
    while (c.length) {
      a[i] = c.splice(entero(g, c.length), 1)[0];
      if (ir(i + 1)) return true;
    }
    a[i] = 0;
    return false;
  };
  ir(0);
  return a;
}

export function generar(semilla, nivel) {
  const g = generador(semilla);
  const llena = llenar(g);
  const solucion = llena.join('');
  const orden = [...Array(81).keys()];
  for (let i = 80; i > 0; i--) { const j = entero(g, i + 1); [orden[i], orden[j]] = [orden[j], orden[i]]; }
  const a = [...llena];
  let quedan = 81;
  for (const i of orden) {
    if (quedan <= PISTAS[nivel]) break;
    const v = a[i];
    a[i] = 0;
    if (soluciones(a.join('')) === 1) quedan--; else a[i] = v;
  }
  return { dadas: a.join(''), solucion };
}

// Casillas no vacías cuyo número se repite en su fila, columna o caja.
export function choques(t) {
  const r = new Set();
  for (let i = 0; i < 81; i++) if (t[i] !== '0' && VECINAS[i].some((j) => t[j] === t[i])) r.add(i);
  return r;
}

export const resuelto = (t, solucion) => t === solucion;

// Primera casilla vacía o distinta de la solución (-1 si no hay).
export const pista = (t, solucion) => [...t].findIndex((c, i) => c !== solucion[i]);
