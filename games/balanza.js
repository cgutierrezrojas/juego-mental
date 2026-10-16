// Balanza: deduce cuánto pesa la fruta que se pregunta. 60 segundos, como Cálculo.
import { barajar, entre } from './comun.js';
import { generarOpciones, jugarConOpciones } from './opciones.js';

const FRUTAS = ['🍎', '🍌', '🍇', '🍐', '🍊', '🍓'];

// Ecuaciones con pesos ocultos (1–9), la fruta que se pregunta y su peso. Tramos según los aciertos:
// 1 ecuación (k frutas iguales), 2 (A A, A B → B) o 3 (A A, A B, B C → C).
export function generarBalanza(aciertos, rnd = Math.random) {
  const [A, B, C] = barajar(FRUTAS, rnd);
  const pesos = { [A]: entre(1, 9, rnd), [B]: entre(1, 9, rnd), [C]: entre(1, 9, rnd) };
  const ecuacion = (...frutas) => ({ frutas, total: frutas.reduce((s, f) => s + pesos[f], 0) });
  let ecuaciones;
  let pregunta;
  if (aciertos < 5) {
    ecuaciones = [ecuacion(...Array(entre(2, 4, rnd)).fill(A))];
    pregunta = A;
  } else if (aciertos < 10) {
    ecuaciones = [ecuacion(A, A), ecuacion(A, B)];
    pregunta = B;
  } else {
    ecuaciones = [ecuacion(A, A), ecuacion(A, B), ecuacion(B, C)];
    pregunta = C;
  }
  return { ecuaciones, pregunta, respuesta: pesos[pregunta], pesos };
}

export function start(pantalla, alTerminar, opciones = {}) {
  return jugarConOpciones(pantalla, alTerminar, (aciertos) => {
    const { ecuaciones, pregunta, respuesta } = generarBalanza(aciertos);
    const lineas = ecuaciones.map((e) => `⚖️ ${e.frutas.join(' ')} = ${e.total}`);
    return { texto: [...lineas, `${pregunta} = ?`].join('\n'), opciones: generarOpciones(respuesta), correcta: respuesta };
  }, 'balanza', opciones);
}
