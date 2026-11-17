// ✏️ Puntos y cajas con n×n cajas (3, 4 o 5). Estado { n, celdas, turno }: celdas = líneas ('.' libre, '-' trazada)
// seguidas de los dueños de cada caja ('.', 'x', 'o'). Cerrar una caja da otro turno. Todo puro.
import { azar } from './comun.js';

const otro = (t) => (t === 'x' ? 'o' : 'x');
export const lineas = (n) => 2 * n * (n + 1);
const h = (n, f, c) => f * n + c;
const v = (n, f, c) => n * (n + 1) + f * (n + 1) + c;
export const ladosDe = (n, f, c) => [h(n, f, c), h(n, f + 1, c), v(n, f, c), v(n, f, c + 1)];

// Cajas (índice f*n+c) que toca la línea l.
function cajasDe(n, l) {
  const H = n * (n + 1);
  if (l < H) { const f = Math.floor(l / n), c = l % n; return [f - 1, f].filter((ff) => ff >= 0 && ff < n).map((ff) => ff * n + c); }
  const k = l - H, f = Math.floor(k / (n + 1)), c = k % (n + 1);
  return [c - 1, c].filter((cc) => cc >= 0 && cc < n).map((cc) => f * n + cc);
}
const ladosTrazados = (n, ls, b) => ladosDe(n, Math.floor(b / n), b % n).filter((l) => ls[l] === '-').length;

export function inicial({ n = 4 } = {}) {
  return { n, celdas: '.'.repeat(lineas(n) + n * n), turno: 'x' };
}

export const validas = (e) => [...Array(lineas(e.n)).keys()].filter((l) => e.celdas[l] === '.');

// Traza l sobre las líneas `ls` (texto): devuelve las líneas nuevas y cuántas cajas cerró.
function trazar(n, ls, l) {
  const nuevas = ls.slice(0, l) + '-' + ls.slice(l + 1);
  return { nuevas, cerradas: cajasDe(n, l).filter((b) => ladosTrazados(n, nuevas, b) === 4) };
}

export function aplicar(e, l) {
  const L = lineas(e.n);
  const { nuevas, cerradas } = trazar(e.n, e.celdas.slice(0, L), l);
  const duenos = e.celdas.slice(L).split('');
  for (const b of cerradas) duenos[b] = e.turno;
  return { n: e.n, celdas: nuevas + duenos.join(''), turno: cerradas.length ? e.turno : otro(e.turno) };
}

export function contar(e) {
  const d = e.celdas.slice(lineas(e.n));
  return { x: [...d].filter((c) => c === 'x').length, o: [...d].filter((c) => c === 'o').length };
}

export function ganador(e) {
  if (e.celdas.slice(0, lineas(e.n)).includes('.')) return null;
  const { x, o } = contar(e);
  return x === o ? 'empate' : x > o ? 'x' : 'o';
}

// Final exacto: mejor diferencia de cajas futuras (del que mueve menos las del rival) desde estas líneas.
function resolver(n, ls, memo) {
  if (!ls.includes('.')) return 0;
  if (memo.has(ls)) return memo.get(ls);
  let mejor = -Infinity;
  for (let l = 0; l < ls.length; l++) {
    if (ls[l] !== '.') continue;
    const { nuevas, cerradas } = trazar(n, ls, l);
    const v2 = cerradas.length ? cerradas.length + resolver(n, nuevas, memo) : -resolver(n, nuevas, memo);
    if (v2 > mejor) mejor = v2;
  }
  memo.set(ls, mejor);
  return mejor;
}
const FINAL_EXACTO = 14; // ponytail: con ≤ 14 líneas libres se resuelve exacto (2^14 estados); subir si el celular aguanta

// Cuántas cajas regala la línea l: el rival cierra todo lo que pueda en cadena.
function regala(n, ls, l) {
  let { nuevas } = trazar(n, ls, l);
  let total = 0;
  for (;;) {
    const libre = [...nuevas].findIndex((c, k) => c === '.' && trazar(n, nuevas, k).cerradas.length);
    if (libre < 0) return total;
    const r = trazar(n, nuevas, libre);
    total += r.cerradas.length;
    nuevas = r.nuevas;
  }
}

export function ia(e, nivel = 'normal', rnd = Math.random) {
  const n = e.n;
  const ls = e.celdas.slice(0, lineas(n));
  const libres = validas(e);
  const una = (arr) => arr[azar(arr.length, rnd)];
  if (nivel === 'facil') return una(libres);
  if (nivel === 'dificil' && libres.length <= FINAL_EXACTO) {
    const memo = new Map();
    const valores = libres.map((l) => { const { nuevas, cerradas } = trazar(n, ls, l); return cerradas.length ? cerradas.length + resolver(n, nuevas, memo) : -resolver(n, nuevas, memo); });
    const max = Math.max(...valores);
    return una(libres.filter((_, k) => valores[k] === max));
  }
  const cierran = libres.filter((l) => trazar(n, ls, l).cerradas.length);
  if (cierran.length) return una(cierran);
  const seguras = libres.filter((l) => cajasDe(n, l).every((b) => ladosTrazados(n, ls, b) < 2));
  if (seguras.length) return una(seguras);
  const costos = libres.map((l) => regala(n, ls, l));
  const min = Math.min(...costos);
  return una(libres.filter((_, k) => costos[k] === min));
}

export const cajas = { id: 'cajas', nombre: 'Puntos y cajas', inicial, validas, aplicar, ganador, ia };
