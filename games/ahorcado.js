// 🪢 Ahorcado: palabras seguidas (de temas al azar) hasta perder una; 6 fallos por palabra. Todo puro.
// Estado: { g, nivel, puntos, palabras (acertadas), ronda: { palabra, tema, letras: [], fallos, estado: 'jugando' | 'ganada' | 'perdida' }, fin }.
import { generador, entero } from './semilla.js';
import { TEMAS } from './diccionario.js';

export const FALLOS = 6;
export const LARGOS = { facil: [4, 6], normal: [6, 8], dificil: [8, 12] };
export const LETRAS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

export function nueva(semilla, nivel = 'normal') {
  return siguiente({ g: generador(semilla), nivel, puntos: 0, palabras: 0, ronda: null, fin: false });
}

// La próxima palabra: un tema al azar y una de sus palabras con el largo del nivel.
export function siguiente(e) {
  const [min, max] = LARGOS[e.nivel];
  const temas = TEMAS.filter((t) => t.palabras.some((p) => p.length >= min && p.length <= max));
  const tema = temas[entero(e.g, temas.length)];
  const opciones = tema.palabras.filter((p) => p.length >= min && p.length <= max);
  e.ronda = { palabra: opciones[entero(e.g, opciones.length)], tema: tema.id, letras: [], fallos: 0, estado: 'jugando' };
  return e;
}

export const completa = (r) => [...r.palabra].every((l) => r.letras.includes(l));

// Prueba una letra: acierta o suma un fallo; al completar la palabra, +10 y +1 por cada fallo que sobró.
export function probar(e, letra) {
  const r = e.ronda;
  if (e.fin || r.estado !== 'jugando' || r.letras.includes(letra) || !LETRAS.includes(letra)) return e;
  r.letras.push(letra);
  if (!r.palabra.includes(letra)) {
    r.fallos++;
    if (r.fallos >= FALLOS) {
      r.estado = 'perdida';
      e.fin = true;
    }
  } else if (completa(r)) {
    r.estado = 'ganada';
    e.palabras++;
    e.puntos += 10 + (FALLOS - r.fallos);
  }
  return e;
}
