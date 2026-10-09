// Rayo: cuando la zona se pone verde, ¡toca! 5 intentos; puntuación = tiempo medio en ms (menos es mejor).
import { azar, el } from './comun.js';
import { destello } from './efectos.js';

const INTENTOS = 5;

export const media = (tiempos) => Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length);

// Tiempo al azar antes del verde, para que no se pueda adivinar.
export const espera = (rnd = Math.random) => 1500 + azar(2501, rnd);

export function start(pantalla, alTerminar) {
  const tiempos = [];
  let fase = 'espera'; // 'espera' (gris) → 'ya' (verde) → 'pausa' (enseñando el tiempo)
  let inicio = 0;
  let id;

  const intento = el('span');
  const ultimo = el('span');
  const marcador = el('div', 'marcador');
  marcador.append(intento, ultimo);
  const zona = el('button', 'zona-rayo');
  pantalla.append(marcador, zona);

  function preparar() {
    fase = 'espera';
    zona.className = 'zona-rayo';
    zona.textContent = 'Espera…';
    intento.textContent = `Intento ${tiempos.length + 1} de ${INTENTOS}`;
    id = setTimeout(() => {
      fase = 'ya';
      zona.className = 'zona-rayo ya';
      zona.textContent = '¡YA!';
      inicio = performance.now();
    }, espera());
  }

  // pointerdown responde antes que click (no espera a levantar el dedo).
  zona.onpointerdown = () => {
    if (fase === 'espera') {
      // Demasiado pronto: este intento se repite.
      clearTimeout(id);
      fase = 'pausa';
      zona.className = 'zona-rayo pronto';
      zona.textContent = '¡Demasiado pronto!';
      destello(zona, false);
      id = setTimeout(preparar, 1200);
      return;
    }
    if (fase !== 'ya') return;
    const ms = Math.round(performance.now() - inicio);
    tiempos.push(ms);
    fase = 'pausa';
    zona.textContent = `${ms} ms`;
    ultimo.textContent = `Último: ${ms} ms`;
    destello(zona, true);
    if (tiempos.length === INTENTOS) id = setTimeout(() => alTerminar(media(tiempos)), 1000);
    else id = setTimeout(preparar, 1000);
  };

  preparar();
  return () => clearTimeout(id);
}
