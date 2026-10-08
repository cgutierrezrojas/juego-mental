// Memoria (Simon): repite la secuencia de colores. Cada ronda añade uno. Un error termina.
import { azar, el } from './comun.js';
import { destello, tono } from './efectos.js';

const COLORES = ['rojo', 'azul', 'verde', 'amarillo'];

export function alargar(secuencia, rnd = Math.random) {
  return [...secuencia, azar(COLORES.length, rnd)];
}

// Milisegundos que se ilumina cada color. A partir de la ronda 5 va un poco más rápido.
export function pausa(ronda) {
  return ronda < 5 ? 600 : Math.max(250, 600 - (ronda - 4) * 50);
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export function start(pantalla, alTerminar) {
  let secuencia = [];
  let pos = 0;
  let turno = false; // true cuando el jugador puede tocar
  let parado = false; // true tras parar(): ya no se enciende nada ni se termina la partida

  const estado = el('p', 'marcador');
  const rejilla = el('div', 'rejilla simon');
  const botones = COLORES.map((c, i) => {
    const b = el('button', 'grande color');
    b.style.setProperty('--c', `var(--${c})`);
    b.ariaLabel = c;
    b.onclick = () => tocar(i);
    return b;
  });
  rejilla.append(...botones);
  pantalla.append(estado, rejilla);

  async function ronda() {
    secuencia = alargar(secuencia);
    turno = false;
    estado.textContent = `Ronda ${secuencia.length} — Mira…`;
    const ms = pausa(secuencia.length);
    await esperar(600);
    for (const i of secuencia) {
      if (parado) return;
      botones[i].classList.add('encendido');
      tono(i, ms / 1000);
      await esperar(ms);
      botones[i].classList.remove('encendido');
      await esperar(ms / 3);
    }
    if (parado) return;
    pos = 0;
    turno = true;
    estado.textContent = `Ronda ${secuencia.length} — Repite`;
  }

  function tocar(i) {
    if (!turno) return;
    const ok = i === secuencia[pos];
    if (ok) tono(i);
    destello(botones[i], ok, !ok); // al acertar suena la nota del color en vez del pitido
    if (!ok) {
      turno = false;
      // Puntuación = la secuencia más larga repetida entera (la anterior a esta).
      setTimeout(() => { if (!parado) alTerminar(secuencia.length - 1); }, 600);
      return;
    }
    pos++;
    if (pos === secuencia.length) ronda();
  }

  ronda();
  return () => {
    parado = true;
    turno = false;
  };
}
