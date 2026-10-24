// ¿Cuál da menos?: toca la operación que da menos. 60 segundos, como Cálculo (pareja de ¿Cuál da más?).
import { generarPar } from './mayor.js';
import { jugarConOpciones } from './opciones.js';

// Dos operaciones que nunca dan lo mismo; la correcta es la de menor resultado.
export function generarParMenor(aciertos, rnd = Math.random) {
  const { a, b, mayor } = generarPar(aciertos, rnd);
  return { a, b, menor: mayor === a.texto ? b.texto : a.texto };
}

export function start(pantalla, alTerminar, opciones = {}) {
  return jugarConOpciones(pantalla, alTerminar, (aciertos) => {
    const { a, b, menor } = generarParMenor(aciertos);
    return { texto: '¿Cuál da menos?', opciones: [a.texto, b.texto], correcta: menor, columnas: 1 };
  }, '', opciones);
}
