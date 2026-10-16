// El distinto: toca el cuadrado de color diferente. 60 segundos, como Cálculo.
import { azar } from './comun.js';
import { jugarConOpciones } from './opciones.js';

// Una ronda: lado de la cuadrícula, casilla distinta y los dos colores.
// Con los aciertos crece la cuadrícula y la diferencia de luminosidad es más sutil.
export function generarRonda(aciertos, rnd = Math.random) {
  const lado = aciertos < 4 ? 2 : aciertos < 9 ? 3 : aciertos < 15 ? 4 : 5;
  const diferencia = Math.max(4, 22 - aciertos);
  const tono = azar(360, rnd);
  const luz = 45 + azar(15, rnd);
  const signo = rnd() < 0.5 ? -1 : 1;
  return {
    lado,
    diferencia,
    distinto: azar(lado * lado, rnd),
    color: `hsl(${tono} 65% ${luz}%)`,
    colorDistinto: `hsl(${tono} 65% ${luz + signo * diferencia}%)`,
  };
}

export function start(pantalla, alTerminar, opciones = {}) {
  return jugarConOpciones(pantalla, alTerminar, (aciertos) => {
    const r = generarRonda(aciertos);
    return {
      texto: 'Toca el distinto',
      opciones: Array.from({ length: r.lado * r.lado }, (_, i) => i),
      correcta: r.distinto,
      columnas: r.lado,
      pintar: (boton, i) => {
        boton.textContent = '';
        boton.className = 'casilla-color';
        boton.style.background = i === r.distinto ? r.colorDistinto : r.color;
        boton.ariaLabel = `Casilla ${i + 1}`;
      },
    };
  }, 'distinto', opciones);
}
