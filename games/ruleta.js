// 🎡 Ruleta de la Trivia: reglas puras (solitario y fiesta).
// Cada acierto llena la barra; con la barra llena se juega una pregunta corona de una categoría sin corona.
// Fallar vacía la barra y, en solitario, quita una vida (`vidas: null` = sin vidas, como en la fiesta).
export const BARRA = 3;
export const VIDAS = 3;
export const CORONAS = 6;

export const inicial = (vidas = VIDAS) => ({ coronas: [], barra: 0, vidas, aciertos: 0, fallos: 0 });

const fallo = (e) => ({ ...e, barra: 0, fallos: e.fallos + 1, vidas: e.vidas === null ? null : e.vidas - 1 });

export const responder = (e, ok) => (ok ? { ...e, barra: Math.min(BARRA, e.barra + 1), aciertos: e.aciertos + 1 } : fallo(e));

export const tocaCorona = (e) => e.barra >= BARRA;

// Categorías (ids) que aún no tienen corona.
export const sinCorona = (e, ids) => ids.filter((id) => !e.coronas.includes(id));

// Pregunta corona de la categoría `cat`: la barra vuelve a 0 se acierte o no.
export const responderCorona = (e, cat, ok) =>
  ok ? { ...e, barra: 0, aciertos: e.aciertos + 1, coronas: [...e.coronas, cat] } : fallo(e);

// 'gana', 'pierde' o null si la partida sigue.
export const resultado = (e) => (e.coronas.length >= CORONAS ? 'gana' : e.vidas === 0 ? 'pierde' : null);
