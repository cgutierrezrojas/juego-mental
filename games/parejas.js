// Parejas: encuentra todas las parejas de cartas con los menos intentos posibles.
import { barajar, el } from './comun.js';
import { destello, sonar } from './efectos.js';

export const SIMBOLOS = ['🍎', '🐶', '⭐', '🌙', '🚗', '🎈', '🌵', '🐟', '🍕', '⚽'];
const PAREJAS = { facil: 4, normal: 6, dificil: 8 };

// n parejas al azar: cada símbolo dos veces, barajadas.
export function repartir(n, rnd = Math.random) {
  const elegidos = barajar(SIMBOLOS, rnd).slice(0, n);
  return barajar([...elegidos, ...elegidos], rnd);
}

export function start(pantalla, alTerminar, opciones = {}) {
  const { dificultad = 'normal' } = opciones;
  const cartas = repartir(opciones.nivel?.parejas ?? PAREJAS[dificultad]); // en Niveles, las parejas las pone el nivel
  const total = cartas.length / 2;
  let abiertas = []; // cartas levantadas en este intento (0, 1 o 2)
  let encontradas = 0;
  let intentos = 0;
  let terminado = false;
  let id;

  const marcadorIntentos = el('span', '', 'Intentos: 0');
  const marcadorParejas = el('span', '', `Parejas: 0/${total}`);
  const marcador = el('div', 'marcador');
  marcador.append(marcadorIntentos, marcadorParejas);
  const mensaje = el('p', 'mensaje');
  const rejilla = el('div', 'parejas');
  const botones = cartas.map((_, i) => {
    const b = el('button', 'carta');
    b.ariaLabel = 'Carta boca abajo';
    b.onclick = () => tocar(i);
    return b;
  });
  rejilla.append(...botones);
  pantalla.append(marcador, mensaje, rejilla);

  function mostrar(i, visible) {
    botones[i].textContent = visible ? cartas[i] : '';
    botones[i].classList.toggle('vista', visible);
    botones[i].ariaLabel = visible ? cartas[i] : 'Carta boca abajo';
  }

  function tocar(i) {
    if (terminado || abiertas.length === 2 || abiertas.includes(i) || botones[i].classList.contains('hecha')) return;
    mostrar(i, true);
    sonar('tic');
    abiertas.push(i);
    if (abiertas.length < 2) return;
    intentos++;
    marcadorIntentos.textContent = `Intentos: ${intentos}`;
    const [a, b] = abiertas;
    if (cartas[a] === cartas[b]) {
      // Pareja: se quedan descubiertas (un solo sonido de acierto).
      botones[a].classList.add('hecha');
      botones[b].classList.add('hecha');
      botones[a].disabled = true;
      botones[b].disabled = true;
      destello(botones[a], true, false);
      destello(botones[b], true);
      abiertas = [];
      encontradas++;
      marcadorParejas.textContent = `Parejas: ${encontradas}/${total}`;
      if (encontradas === total) {
        terminado = true;
        mensaje.textContent = '✓ ¡Todas!';
        id = setTimeout(() => alTerminar(intentos), 700);
      }
    } else {
      // No son pareja: se ven un momento y se tapan.
      destello(botones[b], false);
      id = setTimeout(() => {
        for (const k of abiertas) mostrar(k, false);
        abiertas = [];
      }, 800);
    }
  }

  return () => {
    terminado = true;
    clearTimeout(id);
  };
}
