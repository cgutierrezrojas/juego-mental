// 🎡 Ruleta de la Trivia: reglas puras (solitario y fiesta).
// Cada acierto llena la barra; con la barra llena se juega la corona: `corona` preguntas seguidas de una categoría sin corona.
// Fallar vacía la barra y, en solitario, quita una vida (`vidas: null` = sin vidas, como en la fiesta).
// Las reglas reciben los ajustes de la partida (`a`); sin ellos se juega la clásica.
export const COMODINES = ['mitad', 'cambiar', 'segunda', 'tiempo'];
export const CLASICA = { barra: 3, corona: 1, coronas: 6, vidas: 3, segundos: 20, comodines: { mitad: 0, cambiar: 0, segunda: 0, tiempo: 0 } };
export const OPCIONES = { barra: [1, 2, 3, 4, 5], corona: [1, 2, 3], coronas: [3, 4, 5, 6], vidas: [1, 2, 3, 5, null], segundos: [10, 20, 30, 0] };
export const CANTIDADES = [0, 1, 2, 3];

// Ajustes guardados → ajustes válidos (lo que falte o no esté entre las opciones queda como en la clásica).
export function ajustesDe(g) {
  const a = { ...CLASICA, comodines: { ...CLASICA.comodines } };
  if (!g || typeof g !== 'object') return a;
  for (const k in OPCIONES) if (OPCIONES[k].includes(g[k])) a[k] = g[k];
  for (const k of COMODINES) if (CANTIDADES.includes(g.comodines?.[k])) a.comodines[k] = g.comodines[k];
  return a;
}

export const esClasica = (a) => JSON.stringify(ajustesDe(a)) === JSON.stringify(CLASICA);

export const inicial = (a = CLASICA, vidas = a.vidas) =>
  ({ coronas: [], barra: 0, progreso: 0, vidas, aciertos: 0, fallos: 0, comodines: { ...a.comodines } });

const fallo = (e) => ({ ...e, barra: 0, progreso: 0, fallos: e.fallos + 1, vidas: e.vidas === null ? null : e.vidas - 1 });

export const responder = (e, ok, a = CLASICA) => (ok ? { ...e, barra: Math.min(a.barra, e.barra + 1), aciertos: e.aciertos + 1 } : fallo(e));

export const tocaCorona = (e, a = CLASICA) => e.barra >= a.barra;

// Categorías (ids) que aún no tienen corona.
export const sinCorona = (e, ids) => ids.filter((id) => !e.coronas.includes(id));

// Pregunta de la corona de `cat`: cada acierto suma `progreso`; con `a.corona` aciertos se gana la corona.
export function responderCorona(e, cat, ok, a = CLASICA) {
  if (!ok) return fallo(e);
  const s = { ...e, aciertos: e.aciertos + 1, progreso: e.progreso + 1 };
  return s.progreso < a.corona ? s : { ...s, barra: 0, progreso: 0, coronas: [...e.coronas, cat] };
}

export const usar = (e, tipo) => ({ ...e, comodines: { ...e.comodines, [tipo]: Math.max(0, e.comodines[tipo] - 1) } });

// 'gana', 'pierde' o null si la partida sigue.
export const resultado = (e, a = CLASICA) => (e.coronas.length >= a.coronas ? 'gana' : e.vidas === 0 ? 'pierde' : null);
