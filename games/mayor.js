// Mayor o menor: toca la operación que da más. 60 segundos, como Cálculo.
import { generarOperacion } from './calculo.js';
import { jugarConOpciones } from './opciones.js';

// Dos operaciones del tramo de dificultad que toque, que nunca dan lo mismo.
export function generarPar(aciertos, rnd = Math.random) {
  let a;
  let b;
  do {
    a = generarOperacion(aciertos, rnd);
    b = generarOperacion(aciertos, rnd);
  } while (a.resultado === b.resultado);
  return { a, b, mayor: a.resultado > b.resultado ? a.texto : b.texto };
}

export function start(pantalla, alTerminar, opciones = {}) {
  return jugarConOpciones(pantalla, alTerminar, (aciertos) => {
    const { a, b, mayor } = generarPar(aciertos);
    return { texto: '¿Cuál da más?', opciones: [a.texto, b.texto], correcta: mayor, columnas: 1 };
  }, '', opciones);
}
