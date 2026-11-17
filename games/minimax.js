// Búsqueda minimax con poda alfa-beta, común a los juegos de Mesa. El turno puede repetirse (Reversi, Cajas):
// si después de una jugada sigue el mismo jugador, el valor no cambia de signo.
import { azar } from './comun.js';

const GANA = 100000;

function negamax(e, reglas, prof, alfa, beta) {
  const g = reglas.ganador(e);
  if (g) return g === 'empate' ? 0 : (g === e.turno ? GANA + prof : -GANA - prof);
  if (prof === 0) return reglas.valor(e);
  let mejor = -Infinity;
  for (const j of reglas.validas(e)) {
    const h = reglas.aplicar(e, j);
    const v = h.turno === e.turno ? negamax(h, reglas, prof - 1, alfa, beta) : -negamax(h, reglas, prof - 1, -beta, -alfa);
    if (v > mejor) mejor = v;
    if (mejor > alfa) alfa = mejor;
    if (alfa >= beta) break;
  }
  return mejor;
}

// La mejor jugada para e.turno mirando `profundidad` jugadas; entre las igual de buenas, una al azar.
export function mejorJugada(e, reglas, profundidad, rnd = Math.random) {
  const jugadas = reglas.validas(e);
  const valores = jugadas.map((j) => {
    const h = reglas.aplicar(e, j);
    return h.turno === e.turno ? negamax(h, reglas, profundidad - 1, -Infinity, Infinity) : -negamax(h, reglas, profundidad - 1, -Infinity, Infinity);
  });
  const max = Math.max(...valores);
  const mejores = jugadas.filter((_, k) => valores[k] === max);
  return mejores[azar(mejores.length, rnd)];
}
