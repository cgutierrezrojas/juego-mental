// 🎭 Charadas: el celular en la frente, los demás dan pistas; inclinar abajo = acierto, arriba = paso. Todo puro.
// Estado: { tema, palabras (barajadas), i, jugadas: [{ palabra, acierto }], aciertos }.
import { barajar } from './comun.js';
import { TEMAS, TEMAS_CHARADAS, mostrar } from './diccionario.js';

export const SEGUNDOS = 60;
export const TEMAS_FIESTA = [...TEMAS.filter((t) => ['animales', 'comida', 'oficios', 'lugares', 'deportes'].includes(t.id)), ...TEMAS_CHARADAS];

// Las palabras de un tema (o de todos con 'mezcla'), listas para mostrar.
export function palabrasDe(tema) {
  const temas = tema === 'mezcla' ? TEMAS_FIESTA : TEMAS_FIESTA.filter((t) => t.id === tema);
  return temas.flatMap((t) => t.palabras.map((p) => (TEMAS_CHARADAS.includes(t) ? p.toUpperCase() : mostrar(p))));
}

// `usadas`: las que ya salieron en esta sesión (van al final, para no repetirlas mientras queden otras).
export function nueva(tema, usadas = [], rnd = Math.random) {
  const todas = barajar(palabrasDe(tema), rnd);
  return { tema, palabras: [...todas.filter((p) => !usadas.includes(p)), ...todas.filter((p) => usadas.includes(p))], i: 0, jugadas: [], aciertos: 0 };
}

export const actual = (e) => e.palabras[e.i % e.palabras.length];

export function marcar(e, resultado) {
  const acierto = resultado === 'acierto';
  e.jugadas.push({ palabra: actual(e), acierto });
  if (acierto) e.aciertos++;
  e.i++;
  return e;
}

// Hacia dónde mira la pantalla, con `beta` y `gamma` (grados) del sensor de orientación: 'arriba' (al techo),
// 'abajo' (al suelo) o 'recto' (de pie, en la frente). Sirve en vertical y en horizontal.
export function inclinacion(beta, gamma) {
  const r = Math.PI / 180;
  const z = Math.cos(beta * r) * Math.cos(gamma * r); // 1 = boca arriba, −1 = boca abajo, 0 = de pie
  return z > 0.6 ? 'arriba' : z < -0.6 ? 'abajo' : Math.abs(z) < 0.35 ? 'recto' : null;
}
