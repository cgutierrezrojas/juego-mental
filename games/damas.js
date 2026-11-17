// ⚫ Damas latinas en 8×8. Tablero: texto de 64 letras ('.', 'x', 'o'; mayúscula = dama), casilla = fila * 8 + col, fila 0 arriba.
// Las x empiezan abajo y suben. Comer es obligatorio y manda la secuencia que más come; la dama es voladora;
// los peones solo comen hacia adelante; corona quien termina la jugada en la última fila. Todo puro.
import { azar } from './comun.js';
import { mejorJugada } from './minimax.js';

export const EMPATE_SIN_COMER = 30;
const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const otro = (t) => (t === 'x' ? 'o' : 'x');
const dentro = (f, c) => f >= 0 && f < 8 && c >= 0 && c < 8;
const adelante = (t) => (t === 'x' ? -1 : 1);

export function inicial() {
  let celdas = '';
  for (let f = 0; f < 8; f++) for (let c = 0; c < 8; c++) celdas += (f + c) % 2 === 1 ? (f < 3 ? 'o' : f > 4 ? 'x' : '.') : '.';
  return { celdas, turno: 'x', sinComer: 0 };
}

// Secuencias de captura desde i (la pieza ya se quitó de su casilla de origen en `celdas`).
function saltos(celdas, i, pieza, comidas, camino, salida) {
  const t = pieza.toLowerCase();
  const dama = pieza !== t;
  const f = i >> 3, c = i & 7;
  let alguno = false;
  for (const [df, dc] of DIRS) {
    if (!dama && df !== adelante(t)) continue;
    let ff = f + df, cc = c + dc;
    if (dama) while (dentro(ff, cc) && celdas[ff * 8 + cc] === '.') { ff += df; cc += dc; }
    if (!dentro(ff, cc)) continue;
    const k = ff * 8 + cc;
    const v = celdas[k];
    if (v === '.' || v.toLowerCase() === t || comidas.includes(k)) continue;
    let lf = ff + df, lc = cc + dc;
    while (dentro(lf, lc) && celdas[lf * 8 + lc] === '.') {
      alguno = true;
      saltos(celdas, lf * 8 + lc, pieza, [...comidas, k], [...camino, lf * 8 + lc], salida);
      if (!dama) break;
      lf += df; lc += dc;
    }
  }
  if (!alguno && comidas.length) salida.push({ camino, comidas });
}

// Todas las jugadas legales: si se puede comer, solo las que más comen.
const memo = new Map();
export function jugadas(e) {
  const clave = e.celdas + e.turno;
  let r = memo.get(clave);
  if (!r) {
    r = generar(e);
    if (memo.size > 5000) memo.clear(); // ponytail: caché simple, se vacía al llenarse (y en cada ia) para no retener memoria en el celular
    memo.set(clave, r);
  }
  return r;
}

function generar(e) {
  const capturas = [];
  const simples = [];
  for (let i = 0; i < 64; i++) {
    const p = e.celdas[i];
    if (p === '.' || p.toLowerCase() !== e.turno) continue;
    const sin = e.celdas.slice(0, i) + '.' + e.celdas.slice(i + 1);
    saltos(sin, i, p, [], [i], capturas);
    const dama = p !== e.turno;
    const f = i >> 3, c = i & 7;
    for (const [df, dc] of DIRS) {
      if (!dama && df !== adelante(e.turno)) continue;
      let ff = f + df, cc = c + dc;
      while (dentro(ff, cc) && e.celdas[ff * 8 + cc] === '.') {
        simples.push({ camino: [i, ff * 8 + cc], comidas: [] });
        if (!dama) break;
        ff += df; cc += dc;
      }
    }
  }
  if (!capturas.length) return simples;
  const max = Math.max(...capturas.map((j) => j.comidas.length));
  return capturas.filter((j) => j.comidas.length === max);
}

export const validas = (e) => [...new Set(jugadas(e).map((j) => j.camino.join('-')))];

export function aplicar(e, jugada) {
  const j = jugadas(e).find((x) => x.camino.join('-') === jugada);
  const celdas = e.celdas.split('');
  const desde = j.camino[0];
  const hasta = j.camino[j.camino.length - 1];
  let pieza = celdas[desde];
  const eraDama = pieza !== e.turno;
  celdas[desde] = '.';
  for (const k of j.comidas) celdas[k] = '.';
  if (!eraDama && (hasta >> 3) === (e.turno === 'x' ? 0 : 7)) pieza = pieza.toUpperCase();
  celdas[hasta] = pieza;
  const sinComer = !j.comidas.length && eraDama ? e.sinComer + 1 : 0;
  return { celdas: celdas.join(''), turno: otro(e.turno), sinComer };
}

export function ganador(e) {
  if (!jugadas(e).length) return otro(e.turno);
  if (e.sinComer >= EMPATE_SIN_COMER) return 'empate';
  return null;
}

// Valor para quien tiene el turno: material (peón 1, dama 3) y, en la difícil, avance de los peones y centro.
function valorCon(posicion) {
  return (e) => {
    let v = 0;
    for (let i = 0; i < 64; i++) {
      const p = e.celdas[i];
      if (p === '.') continue;
      const t = p.toLowerCase();
      let m = p === t ? 1 : 3;
      if (posicion && p === t) m += 0.05 * (t === 'x' ? 7 - (i >> 3) : i >> 3);
      if (posicion && (i & 7) >= 2 && (i & 7) <= 5) m += 0.03;
      v += t === e.turno ? m : -m;
    }
    return v;
  };
}
const NORMAL = { validas, aplicar, ganador, valor: valorCon(false) };
const DIFICIL = { validas, aplicar, ganador, valor: valorCon(true) };

// ponytail: profundidad 4 por tiempo en celular (con 5 la peor jugada tardaba 120 ms en PC; con 4, 32 ms y gana 95 % a la normal); sube a 5 si hace falta más fuerza
export function ia(e, nivel = 'normal', rnd = Math.random) {
  memo.clear();
  const v = validas(e);
  if (nivel === 'facil' || v.length === 1) return v[azar(v.length, rnd)];
  return nivel === 'dificil' ? mejorJugada(e, DIFICIL, 4, rnd) : mejorJugada(e, NORMAL, 2, rnd);
}

export const damas = { id: 'damas', nombre: 'Damas', inicial, validas, aplicar, ganador, ia };
