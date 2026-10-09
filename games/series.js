// Series: ¿qué número sigue? 60 segundos, 4 opciones; la dificultad sube con los aciertos.
import { azar, entre } from './comun.js';
import { generarOpciones, jugarConOpciones } from './opciones.js';

// Cada tipo devuelve 5 números: los 4 que se ven y el que sigue.
const cinco = (f) => [0, 1, 2, 3, 4].map(f);

const suma = (rnd) => {
  const inicio = entre(1, 20, rnd);
  const paso = entre(1, 9, rnd);
  return cinco((i) => inicio + i * paso);
};

const resta = (rnd) => {
  const paso = entre(1, 9, rnd);
  const inicio = 4 * paso + entre(0, 20, rnd); // así el quinto nunca baja de 0
  return cinco((i) => inicio - i * paso);
};

const multiplica = (rnd) => {
  const factor = entre(2, 3, rnd);
  const inicio = entre(1, 5, rnd);
  return cinco((i) => inicio * factor ** i);
};

const alterna = (rnd) => {
  const p = entre(1, 5, rnd);
  const q = entre(6, 9, rnd); // p y q siempre distintos
  const serie = [entre(1, 10, rnd)];
  for (let i = 1; i < 5; i++) serie.push(serie[i - 1] + (i % 2 ? p : q));
  return serie;
};

const cuadrados = (rnd) => {
  const base = entre(1, 6, rnd);
  return cinco((i) => (base + i) ** 2);
};

const fibonacci = (rnd) => {
  const serie = [entre(1, 5, rnd), entre(1, 5, rnd)];
  while (serie.length < 5) serie.push(serie.at(-1) + serie.at(-2));
  return serie;
};

export function generarSerie(aciertos, rnd = Math.random) {
  const tipos =
    aciertos < 5 ? [suma] :
    aciertos < 10 ? [suma, resta, multiplica] :
    aciertos < 15 ? [resta, multiplica, alterna, cuadrados] :
    [multiplica, alterna, cuadrados, fibonacci];
  return { numeros: tipos[azar(tipos.length, rnd)](rnd) };
}

export function start(pantalla, alTerminar) {
  return jugarConOpciones(pantalla, alTerminar, (aciertos) => {
    const { numeros } = generarSerie(aciertos);
    const siguiente = numeros[4];
    return { texto: `${numeros.slice(0, 4).join(', ')}, ?`, opciones: generarOpciones(siguiente), correcta: siguiente };
  }, 'serie');
}
