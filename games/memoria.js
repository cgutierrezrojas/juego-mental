// Memoria (Simon): repite la secuencia de colores. Cada ronda añade uno. Un error termina.
import { azar, el } from './comun.js';
import { destello, tono } from './efectos.js';

const COLORES = ['rojo', 'azul', 'verde', 'amarillo'];

export function alargar(secuencia, rnd = Math.random) {
  return [...secuencia, azar(COLORES.length, rnd)];
}

// Milisegundos por color [al empezar, mínimo] según la dificultad.
const VELOCIDAD = { facil: [800, 350], normal: [600, 250], dificil: [400, 180] };

// Milisegundos que se ilumina cada color. A partir de la ronda 5 va un poco más rápido.
export function pausa(ronda, dificultad = 'normal') {
  const [base, minimo] = VELOCIDAD[dificultad];
  return ronda < 5 ? base : Math.max(minimo, base - (ronda - 4) * 50);
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export function start(pantalla, alTerminar, opciones = {}) {
  const { dificultad = 'normal' } = opciones;
  let secuencia = [];
  let pos = 0;
  let turno = false; // true cuando el jugador puede tocar
  let parado = false; // true tras parar(): ya no se enciende nada ni se termina la partida

  const estado = el('p', 'marcador');
  const mensaje = el('p', 'mensaje'); // ✓ / ✗ grande, arriba: lejos del dedo que tapa el botón
  const rejilla = el('div', 'rejilla simon');
  const botones = COLORES.map((c, i) => {
    const b = el('button', 'grande color');
    b.style.setProperty('--c', `var(--${c})`);
    b.ariaLabel = c;
    b.onclick = () => tocar(i);
    return b;
  });
  rejilla.append(...botones);
  pantalla.append(estado, mensaje, rejilla);

  async function ronda() {
    secuencia = alargar(secuencia);
    turno = false;
    estado.textContent = `Ronda ${secuencia.length} — Mira…`;
    mensaje.textContent = '';
    const ms = pausa(secuencia.length, dificultad);
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

  function decir(texto, ok) {
    mensaje.textContent = texto;
    mensaje.className = 'mensaje';
    void mensaje.offsetWidth; // reinicia la animación
    mensaje.classList.add(ok ? 'bien' : 'fallo');
  }

  function tocar(i) {
    if (!turno) return;
    if (i !== secuencia[pos]) return fallar(i);
    // Acierto: el botón se ilumina con su nota, como cuando lo enseña el juego.
    tono(i);
    destello(botones[i], true, false); // sin el pitido: ya suena la nota del color
    botones[i].classList.add('encendido');
    setTimeout(() => botones[i].classList.remove('encendido'), 250);
    pos++;
    if (pos < secuencia.length) return decir('✓', true);
    turno = false;
    decir('✓ ¡Ronda superada!', true);
    setTimeout(() => { if (!parado) ronda(); }, 800);
  }

  // Fallo: el botón tocado se marca con ✗ y borde rojo y tiembla, el correcto parpadea dos veces y luego se termina.
  async function fallar(i) {
    turno = false;
    destello(botones[i], false); // pitido grave + vibración
    botones[i].classList.add('temblor');
    botones[i].textContent = '✗';
    decir('✗ Era este', false);
    const correcto = botones[secuencia[pos]];
    for (let vez = 0; vez < 2; vez++) {
      correcto.classList.add('encendido');
      await esperar(300);
      correcto.classList.remove('encendido');
      await esperar(200);
    }
    await esperar(500);
    // Puntuación = la secuencia más larga repetida entera (la anterior a esta).
    if (!parado) alTerminar(secuencia.length - 1);
  }

  ronda();
  return () => {
    parado = true;
    turno = false;
  };
}
