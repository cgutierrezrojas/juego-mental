// ⚡ Trivia rápida: preguntas de todas las categorías contra el reloj, de fáciles a difíciles según los aciertos.
import { jugarConOpciones } from './opciones.js';
import { pregunta } from './preguntas.js';

export const dificultadDe = (aciertos) => (aciertos < 5 ? 1 : aciertos < 12 ? 2 : 3);

export function start(pantalla, alTerminar, opciones = {}) {
  return jugarConOpciones(pantalla, alTerminar, (aciertos) => {
    const q = pregunta((x) => x.d === dificultadDe(aciertos));
    return { texto: q.p, opciones: q.opciones, correcta: q.correcta, pista: `Era: ${q.correcta}`, columnas: 1 };
  }, 'trivia', opciones);
}
