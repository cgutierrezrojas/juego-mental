// Topos: toca cada topo antes de que se esconda. 30 segundos. Tocar una casilla vacía resta.
import { azar, el, temporizador, pintarReloj } from './comun.js';
import { destello } from './efectos.js';

// Milisegundos que dura cada topo [al empezar, mínimo] según la dificultad.
const DURACION = { facil: [1300, 600], normal: [1000, 450], dificil: [750, 350] };

export function duracionTopo(aciertos, dificultad = 'normal') {
  const [base, minimo] = DURACION[dificultad];
  return Math.max(minimo, base - aciertos * 25);
}

export function start(pantalla, alTerminar, opciones = {}) {
  const { dificultad = 'normal' } = opciones;
  let aciertos = 0;
  let errores = 0;
  let topo = -1; // casilla con el topo (-1: ninguna)
  let anterior = -1;
  let id;
  const puntuacion = () => Math.max(0, aciertos - errores);

  const tiempo = el('span');
  const puntos = el('span', '', 'Puntos: 0');
  const marcador = el('div', 'marcador');
  marcador.append(tiempo, puntos);
  const rejilla = el('div', 'topos');
  const casillas = Array.from({ length: 9 }, (_, i) => {
    const b = el('button', 'casilla');
    b.onpointerdown = () => tocar(i);
    return b;
  });
  rejilla.append(...casillas);
  pantalla.append(marcador, rejilla);

  const reloj = temporizador(30, (s) => pintarReloj(tiempo, s), () => {
    clearTimeout(id);
    alTerminar(puntuacion());
  });

  function aparecer() {
    do topo = azar(9); while (topo === anterior); // nunca dos veces seguidas en la misma casilla
    anterior = topo;
    casillas[topo].classList.add('topo');
    casillas[topo].textContent = '🐹';
    id = setTimeout(esconder, duracionTopo(aciertos, dificultad));
  }

  // Quita el topo y saca el siguiente 200 ms después.
  function esconder() {
    casillas[topo].classList.remove('topo');
    casillas[topo].textContent = '';
    topo = -1;
    id = setTimeout(aparecer, 200);
  }

  function tocar(i) {
    const ok = i === topo;
    destello(casillas[i], ok);
    if (ok) {
      aciertos++;
      clearTimeout(id);
      esconder();
    } else {
      errores++;
    }
    puntos.textContent = `Puntos: ${puntuacion()}`;
  }

  aparecer();
  return () => {
    reloj.parar();
    clearTimeout(id);
  };
}
