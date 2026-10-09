// Modos de juego y dificultades: nombres visibles, claves de récord y filtros. Todo puro.

export const MODOS = { normal: 'Normal', rapido: 'Rápido', sinfallo: 'Hasta fallar' };
export const DIFICULTADES = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' };

// Normal + Normal conserva la clave de siempre (así no se pierden los récords que ya había).
export const claveRecord = (id, modo = 'normal', dificultad = 'normal') =>
  modo === 'normal' && dificultad === 'normal' ? `record:${id}` : `record:${id}:${modo}:${dificultad}`;

// ¿Se jugó esta partida en ese modo y dificultad? Las antiguas (sin esos campos) son Normal + Normal.
export const esDe = (partida, modo, dificultad) =>
  (partida.modo ?? 'normal') === modo && (partida.dificultad ?? 'normal') === dificultad;

// Historiales con solo las partidas de ese modo y dificultad.
export const filtrar = (historiales, modo, dificultad) =>
  Object.fromEntries(Object.entries(historiales).map(([id, lista]) => [id, lista.filter((p) => esDe(p, modo, dificultad))]));

// Aciertos que "ven" los generadores: Fácil no pasa del 2.º tramo (≤ 9); Difícil empieza en el 3.º (+10).
export function aciertosSegun(aciertos, dificultad) {
  if (dificultad === 'facil') return Math.min(aciertos, 9);
  if (dificultad === 'dificil') return aciertos + 10;
  return aciertos;
}

// "Rápido · Difícil" para la pantalla final; nada en Normal + Normal.
export const etiqueta = (modo, dificultad) =>
  modo === 'normal' && dificultad === 'normal' ? '' : `${MODOS[modo]} · ${DIFICULTADES[dificultad]}`;
