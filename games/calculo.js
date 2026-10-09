// Cálculo: 60 segundos para resolver operaciones eligiendo entre 4 respuestas.
import { azar, entre } from './comun.js';
import { generarOpciones, jugarConOpciones } from './opciones.js';

function suma(max, rnd) {
  const a = entre(1, max, rnd);
  const b = entre(1, max, rnd);
  return { texto: `${a} + ${b}`, resultado: a + b };
}

function resta(max, rnd) {
  const a = entre(1, max, rnd);
  const b = entre(1, a, rnd); // b <= a, así el resultado nunca es negativo
  return { texto: `${a} − ${b}`, resultado: a - b };
}

function multiplicacion(min, max, rnd) {
  const a = entre(min, max, rnd);
  const b = entre(min, max, rnd);
  return { texto: `${a} × ${b}`, resultado: a * b };
}

// La dificultad sube con los aciertos de la partida.
export function generarOperacion(aciertos, rnd = Math.random) {
  const tipos =
    aciertos < 5 ? [() => suma(10, rnd)] :
    aciertos < 10 ? [() => suma(20, rnd), () => resta(20, rnd)] :
    aciertos < 15 ? [() => suma(20, rnd), () => resta(20, rnd), () => multiplicacion(2, 9, rnd)] :
    [() => suma(100, rnd), () => resta(100, rnd), () => multiplicacion(2, 12, rnd)];
  return tipos[azar(tipos.length, rnd)]();
}

export function start(pantalla, alTerminar, opciones = {}) {
  return jugarConOpciones(pantalla, alTerminar, (aciertos) => {
    const { texto, resultado } = generarOperacion(aciertos);
    return { texto, opciones: generarOpciones(resultado), correcta: resultado };
  }, '', opciones);
}
