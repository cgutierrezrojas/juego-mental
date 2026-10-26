// Cuenta rápida: ¿cuántas veces aparece una figura en la cuadrícula? 60 segundos.
import { azar, barajar } from './comun.js';
import { generarOpciones, jugarConOpciones } from './opciones.js';

const FIGURAS = ['🍎', '🍌', '🍇', '🍓', '🍊', '🥝'];
export const POR_FILA = 6;

// Con los aciertos hay más casillas (de 8 a 30) y más figuras distintas (de 2 a 4).
export function generarCuenta(aciertos, rnd = Math.random) {
  const tipos = aciertos < 5 ? 2 : aciertos < 12 ? 3 : 4;
  const total = Math.min(30, 8 + aciertos);
  const figuras = barajar(FIGURAS, rnd).slice(0, tipos);
  const objetivo = figuras[0];
  const casillas = barajar([objetivo, ...Array.from({ length: total - 1 }, () => figuras[azar(tipos, rnd)])], rnd); // al menos una
  return { casillas, objetivo, cuantas: casillas.filter((f) => f === objetivo).length };
}

export function start(pantalla, alTerminar, opciones = {}) {
  return jugarConOpciones(pantalla, alTerminar, (aciertos) => {
    const { casillas, objetivo, cuantas } = generarCuenta(aciertos);
    const filas = [];
    for (let i = 0; i < casillas.length; i += POR_FILA) filas.push(casillas.slice(i, i + POR_FILA).join(' '));
    return { texto: `${filas.join('\n')}\n¿Cuántas hay de ${objetivo}?`, opciones: generarOpciones(cuantas), correcta: cuantas };
  }, 'cuenta', opciones);
}
