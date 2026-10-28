// ⭕ Gato (tres en raya). Tablero: texto de 9 letras ('x', 'o' o '.'), filas de arriba abajo. Todo puro.
import { azar } from './comun.js';

const LINEAS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const otro = (j) => (j === 'x' ? 'o' : 'x');

export const inicial = () => ({ celdas: '.........', turno: 'x' });

export const validas = (e) => [...e.celdas].map((c, i) => (c === '.' ? i : -1)).filter((i) => i >= 0);

export const aplicar = (e, i) => ({ celdas: e.celdas.slice(0, i) + e.turno + e.celdas.slice(i + 1), turno: otro(e.turno) });

// 'x' u 'o' si hay tres en raya, 'empate' si el tablero está lleno, o null si se sigue.
export function ganador(e) {
  for (const [a, b, c] of LINEAS) if (e.celdas[a] !== '.' && e.celdas[a] === e.celdas[b] && e.celdas[a] === e.celdas[c]) return e.celdas[a];
  return e.celdas.includes('.') ? null : 'empate';
}

// Valor de la posición para quien tiene el turno: 1 gana, 0 empate, -1 pierde (minimax completo: el Gato es pequeño).
function valor(e) {
  const g = ganador(e);
  if (g === 'empate') return 0;
  if (g) return g === e.turno ? 1 : -1;
  return Math.max(...validas(e).map((i) => -valor(aplicar(e, i))));
}

// La jugada que gana ya, o la que impide que el rival gane en la siguiente.
function ganarOBloquear(e) {
  const libres = validas(e);
  return libres.find((i) => ganador(aplicar(e, i)) === e.turno)
    ?? libres.find((i) => ganador(aplicar({ ...e, turno: otro(e.turno) }, i)) === otro(e.turno));
}

// Jugada de la máquina: 'facil' al azar; 'normal' gana o bloquea si puede; 'dificil' perfecta (nunca pierde).
export function ia(e, nivel = 'normal', rnd = Math.random) {
  const libres = validas(e);
  if (nivel === 'facil') return libres[azar(libres.length, rnd)];
  if (nivel === 'normal') return ganarOBloquear(e) ?? libres[azar(libres.length, rnd)];
  const valores = libres.map((i) => -valor(aplicar(e, i)));
  const mejor = Math.max(...valores);
  const mejores = libres.filter((_, k) => valores[k] === mejor);
  return mejores[azar(mejores.length, rnd)];
}

export const gato = { id: 'gato', nombre: 'Gato', inicial, validas, aplicar, ganador, ia };
