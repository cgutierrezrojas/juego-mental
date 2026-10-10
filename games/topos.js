// Topos: toca cada topo antes de que se esconda. 30 segundos. Tocar una casilla vacía resta.
import { azar, el, temporizador, pintarReloj } from './comun.js';
import { destello } from './efectos.js';

// Milisegundos que dura cada topo [al empezar, mínimo] según la dificultad.
const DURACION = { facil: [1300, 600], normal: [1000, 450], dificil: [750, 350] };

export function duracionTopo(aciertos, dificultad = 'normal') {
  const [base, minimo] = DURACION[dificultad];
  return Math.max(minimo, base - aciertos * 25);
}

// `opciones.nivel` (modo Niveles): reloj de `nivel.segundos` y termina al llegar a `nivel.meta` puntos.
export function start(pantalla, alTerminar, opciones = {}) {
  const { dificultad = 'normal', nivel = null } = opciones;
  let terminado = false;
  let aciertos = 0;
  let errores = 0;
  let topo = -1; // casilla con el topo (-1: ninguna)
  let anterior = -1;
  let id;
  const puntuacion = () => Math.max(0, aciertos - errores);

  const tiempo = el('span');
  const puntos = el('span', '', nivel ? `Puntos: 0/${nivel.meta}` : 'Puntos: 0');
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

  const reloj = temporizador(nivel ? nivel.segundos : 30, (s) => pintarReloj(tiempo, s), () => {
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
    if (terminado) return;
    const ok = i === topo;
    destello(casillas[i], ok);
    if (ok) {
      aciertos++;
      clearTimeout(id);
      esconder();
    } else {
      errores++;
    }
    puntos.textContent = nivel ? `Puntos: ${puntuacion()}/${nivel.meta}` : `Puntos: ${puntuacion()}`;
    if (nivel && puntuacion() >= nivel.meta) {
      // Meta del nivel alcanzada: no salen más topos y se termina tras el destello.
      terminado = true;
      reloj.parar();
      clearTimeout(id);
      id = setTimeout(() => alTerminar(puntuacion()), 400);
    }
  }

  aparecer();
  return () => {
    terminado = true;
    reloj.parar();
    clearTimeout(id);
  };
}
