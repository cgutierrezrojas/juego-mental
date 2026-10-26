// ¿Verdadero o falso?: ¿está bien la operación? 60 segundos, como Cálculo.
import { azar } from './comun.js';
import { generarOperacion } from './calculo.js';
import { jugarConOpciones } from './opciones.js';

export const VERDADERO = '✓ Verdadero';
export const FALSO = '✗ Falso';

// Una operación con un resultado: la mitad de las veces el bueno y si no uno cercano (nunca negativo).
export function generarAfirmacion(aciertos, rnd = Math.random) {
  const { texto, resultado } = generarOperacion(aciertos, rnd);
  const cierta = rnd() < 0.5;
  let mostrado = resultado;
  if (!cierta) {
    const salto = 1 + azar(resultado >= 20 ? 10 : 3, rnd); // con resultados grandes, errores más grandes
    mostrado = rnd() < 0.5 && resultado - salto >= 0 ? resultado - salto : resultado + salto;
  }
  return { texto: `${texto} = ${mostrado}`, cierta };
}

export function start(pantalla, alTerminar, opciones = {}) {
  return jugarConOpciones(pantalla, alTerminar, (aciertos) => {
    const { texto, cierta } = generarAfirmacion(aciertos);
    return { texto, opciones: [VERDADERO, FALSO], correcta: cierta ? VERDADERO : FALSO };
  }, '', opciones);
}
