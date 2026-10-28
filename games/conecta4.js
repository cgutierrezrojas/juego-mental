// 🔴 Conecta 4: 7 columnas × 6 filas; la ficha cae a la casilla libre más baja. Todo puro.
// Tablero: texto de 42 letras ('x', 'o' o '.'), filas de arriba abajo (casilla = fila * 7 + columna).
import { azar } from './comun.js';

export const COLUMNAS = 7;
export const FILAS = 6;
const otro = (j) => (j === 'x' ? 'o' : 'x');
const casilla = (f, c) => f * COLUMNAS + c;

export const inicial = () => ({ celdas: '.'.repeat(COLUMNAS * FILAS), turno: 'x' });

// Columnas donde aún cabe una ficha.
export const validas = (e) => Array.from({ length: COLUMNAS }, (_, c) => c).filter((c) => e.celdas[c] === '.');

// Fila en la que caería una ficha en la columna `c` (o -1 si está llena).
export function filaLibre(e, c) {
  for (let f = FILAS - 1; f >= 0; f--) if (e.celdas[casilla(f, c)] === '.') return f;
  return -1;
}

export function aplicar(e, c) {
  const i = casilla(filaLibre(e, c), c);
  return { celdas: e.celdas.slice(0, i) + e.turno + e.celdas.slice(i + 1), turno: otro(e.turno) };
}

// Todas las líneas de 4 casillas (horizontales, verticales y las dos diagonales).
const VENTANAS = [];
for (let f = 0; f < FILAS; f++) {
  for (let c = 0; c < COLUMNAS; c++) {
    for (const [df, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const linea = [0, 1, 2, 3].map((k) => [f + df * k, c + dc * k]);
      if (linea.every(([ff, cc]) => ff >= 0 && ff < FILAS && cc >= 0 && cc < COLUMNAS)) VENTANAS.push(linea.map(([ff, cc]) => casilla(ff, cc)));
    }
  }
}

export function ganador(e) {
  for (const v of VENTANAS) {
    const a = e.celdas[v[0]];
    if (a !== '.' && v.every((i) => e.celdas[i] === a)) return a;
  }
  return e.celdas.includes('.') ? null : 'empate';
}

// Valoración para `j`: grupos de 3 y 2 con hueco, menos los del rival, y preferencia por el centro.
function valoracion(e, j) {
  let puntos = 0;
  for (const v of VENTANAS) {
    const mias = v.filter((i) => e.celdas[i] === j).length;
    const suyas = v.filter((i) => e.celdas[i] === otro(j)).length;
    const vacias = 4 - mias - suyas;
    if (suyas === 0) puntos += mias === 3 ? 5 : mias === 2 && vacias === 2 ? 2 : 0;
    if (mias === 0) puntos -= suyas === 3 ? 4 : 0;
  }
  for (let f = 0; f < FILAS; f++) if (e.celdas[casilla(f, 3)] === j) puntos += 3;
  return puntos;
}

// Minimax con poda alfa-beta, desde el punto de vista de quien tiene el turno.
function negamax(e, profundidad, alfa, beta) {
  const g = ganador(e);
  if (g === 'empate') return 0;
  if (g) return g === e.turno ? 100000 + profundidad : -100000 - profundidad; // ganar antes vale más
  if (profundidad === 0) return valoracion(e, e.turno) - valoracion(e, otro(e.turno));
  let mejor = -Infinity;
  for (const c of ordenCentral(validas(e))) {
    mejor = Math.max(mejor, -negamax(aplicar(e, c), profundidad - 1, -beta, -alfa));
    alfa = Math.max(alfa, mejor);
    if (alfa >= beta) break;
  }
  return mejor;
}

// Primero las columnas del centro: la poda funciona mejor.
const ordenCentral = (cols) => [...cols].sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));

// Jugada de la máquina: 'facil' al azar; 'normal' gana, bloquea y no regala la victoria; 'dificil' piensa 5 jugadas.
export function ia(e, nivel = 'normal', rnd = Math.random) {
  const libres = validas(e);
  if (nivel === 'facil') return libres[azar(libres.length, rnd)];
  if (nivel === 'normal') {
    const gana = libres.find((c) => ganador(aplicar(e, c)) === e.turno);
    if (gana !== undefined) return gana;
    const bloquea = libres.find((c) => ganador(aplicar({ ...e, turno: otro(e.turno) }, c)) === otro(e.turno));
    if (bloquea !== undefined) return bloquea;
    // Evita jugar debajo de una casilla con la que el rival ganaría.
    const seguras = libres.filter((c) => {
      const despues = aplicar(e, c);
      return !validas(despues).some((c2) => ganador(aplicar(despues, c2)) === otro(e.turno));
    });
    const opciones = seguras.length ? seguras : libres;
    return opciones[azar(opciones.length, rnd)];
  }
  let mejor = -Infinity;
  let mejores = [];
  for (const c of ordenCentral(libres)) {
    const v = -negamax(aplicar(e, c), 4, -Infinity, Infinity);
    if (v > mejor) {
      mejor = v;
      mejores = [c];
    } else if (v === mejor) mejores.push(c);
  }
  return mejores[azar(mejores.length, rnd)];
}

export const conecta4 = { id: 'conecta4', nombre: 'Conecta 4', inicial, validas, aplicar, ganador, ia };
