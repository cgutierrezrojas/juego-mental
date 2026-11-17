// ⚪ Reversi en 8×8. Tablero: texto de 64 letras ('.', 'x' negras, 'o' blancas), casilla = fila * 8 + col. Empiezan las x.
// Si al rival no le quedan jugadas pero a ti sí, vuelves a jugar. Termina cuando nadie puede jugar. Todo puro.
import { azar } from './comun.js';
import { mejorJugada } from './minimax.js';

const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const otro = (t) => (t === 'x' ? 'o' : 'x');
const PESOS = [
  100, -20, 10, 5, 5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
  10, -2, -1, -1, -1, -1, -2, 10,
  5, -2, -1, -1, -1, -1, -2, 5,
  5, -2, -1, -1, -1, -1, -2, 5,
  10, -2, -1, -1, -1, -1, -2, 10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10, 5, 5, 10, -20, 100,
];

export function inicial() {
  const c = '.'.repeat(64).split('');
  c[27] = 'o'; c[28] = 'x'; c[35] = 'x'; c[36] = 'o';
  return { celdas: c.join(''), turno: 'x' };
}

// Casillas que voltea `t` jugando en i.
function volteos(celdas, i, t) {
  if (celdas[i] !== '.') return [];
  const f0 = i >> 3, c0 = i & 7;
  const todas = [];
  for (const [df, dc] of DIRS) {
    const linea = [];
    let f = f0 + df, c = c0 + dc;
    while (f >= 0 && f < 8 && c >= 0 && c < 8 && celdas[f * 8 + c] === otro(t)) { linea.push(f * 8 + c); f += df; c += dc; }
    if (linea.length && f >= 0 && f < 8 && c >= 0 && c < 8 && celdas[f * 8 + c] === t) todas.push(...linea);
  }
  return todas;
}

// ponytail: caché simple por tablero+turno (el minimax repite posiciones); se vacía al llenarse.
const memo = new Map();
function jugadasDe(celdas, t) {
  const clave = celdas + t;
  let r = memo.get(clave);
  if (!r) {
    r = [...Array(64).keys()].filter((i) => volteos(celdas, i, t).length);
    if (memo.size > 50000) memo.clear();
    memo.set(clave, r);
  }
  return r;
}
export const validas = (e) => [...jugadasDe(e.celdas, e.turno)]; // copia: el llamador puede ordenarla

export function aplicar(e, i) {
  const c = e.celdas.split('');
  for (const k of [i, ...volteos(e.celdas, i, e.turno)]) c[k] = e.turno;
  const celdas = c.join('');
  const sigue = jugadasDe(celdas, otro(e.turno)).length ? otro(e.turno) : e.turno;
  return { celdas, turno: sigue };
}

export const contar = (e) => ({ x: [...e.celdas].filter((c) => c === 'x').length, o: [...e.celdas].filter((c) => c === 'o').length });

export function ganador(e) {
  if (jugadasDe(e.celdas, 'x').length || jugadasDe(e.celdas, 'o').length) return null;
  const { x, o } = contar(e);
  return x === o ? 'empate' : x > o ? 'x' : 'o';
}

const valorPesos = (e) => [...e.celdas].reduce((s, c, i) => s + (c === e.turno ? PESOS[i] : c === '.' ? 0 : -PESOS[i]), 0);
const DIFICIL = {
  validas, aplicar, ganador,
  valor: (e) => valorPesos(e) + 5 * (jugadasDe(e.celdas, e.turno).length - jugadasDe(e.celdas, otro(e.turno)).length),
};

export function ia(e, nivel = 'normal', rnd = Math.random) {
  const v = validas(e);
  if (nivel === 'facil') return v[azar(v.length, rnd)];
  // ponytail: profundidad 3; con 4 pasaba de 300 ms por jugada en celulares lentos (515 ms en PC); sube a 4 si hace falta más fuerza
  if (nivel === 'dificil') return mejorJugada(e, DIFICIL, 3, rnd);
  const max = Math.max(...v.map((i) => PESOS[i]));
  const mejores = v.filter((i) => PESOS[i] === max);
  return mejores[azar(mejores.length, rnd)];
}

export const reversi = { id: 'reversi', nombre: 'Reversi', inicial, validas, aplicar, ganador, ia };
