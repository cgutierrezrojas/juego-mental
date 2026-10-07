// Atención (Stroop): toca el color de la TINTA, no lo que dice la palabra. 60 segundos.
import { azar, el, destello, temporizador } from './comun.js';

export const COLORES = [
  { nombre: 'ROJO', css: 'var(--rojo)' },
  { nombre: 'AZUL', css: 'var(--azul)' },
  { nombre: 'VERDE', css: 'var(--verde)' },
  { nombre: 'AMARILLO', css: 'var(--amarillo)' },
];

// Palabra y tinta se eligen por separado, así coinciden 1 de cada 4 veces.
export function generarRonda(rnd = Math.random) {
  return { palabra: azar(COLORES.length, rnd), tinta: azar(COLORES.length, rnd) };
}

export function puntuacion(aciertos, errores) {
  return Math.max(0, aciertos - errores);
}

export function start(pantalla, alTerminar) {
  let aciertos = 0;
  let errores = 0;
  let ronda;

  const tiempo = el('span');
  const puntos = el('span', '', 'Puntos: 0');
  const marcador = el('div', 'marcador');
  marcador.append(tiempo, puntos);
  const enunciado = el('div', 'enunciado');
  enunciado.style.background = '#222';
  const rejilla = el('div', 'rejilla');
  rejilla.append(...COLORES.map((c, i) => {
    const b = el('button', 'grande', c.nombre);
    b.style.background = c.css;
    b.style.color = '#111';
    b.onclick = () => responder(i);
    return b;
  }));
  pantalla.append(marcador, enunciado, rejilla);

  temporizador(60, (s) => { tiempo.textContent = `⏱ ${s}`; }, () => alTerminar(puntuacion(aciertos, errores)));

  function nueva() {
    ronda = generarRonda();
    enunciado.textContent = COLORES[ronda.palabra].nombre;
    enunciado.style.color = COLORES[ronda.tinta].css;
  }

  function responder(i) {
    const ok = i === ronda.tinta;
    destello(enunciado, ok);
    if (ok) aciertos++;
    else errores++;
    puntos.textContent = `Puntos: ${puntuacion(aciertos, errores)}`;
    nueva();
  }

  nueva();
}
