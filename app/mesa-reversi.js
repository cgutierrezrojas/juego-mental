// ⚪ Tablero del Reversi: las casillas donde puedes jugar llevan un punto.
import { el } from '../games/comun.js';

export function tableroReversi({ partida, j, puedo, jugar }) {
  const posibles = new Set(puedo ? j.validas(partida.estado) : []);
  const rejilla = el('div', 'tablero-reversi');
  rejilla.setAttribute('role', 'group');
  rejilla.setAttribute('aria-label', 'Tablero de reversi');
  [...partida.estado.celdas].forEach((c, i) => {
    const b = el('button', `casilla-reversi${posibles.has(i) ? ' posible' : ''}${i === partida.ultima ? ' ultima' : ''}`);
    if (c !== '.') b.append(el('span', `disco ficha-${c}`));
    b.disabled = !posibles.has(i);
    b.setAttribute('aria-label', `Fila ${(i >> 3) + 1}, columna ${(i & 7) + 1}${c === '.' ? '' : `, ${j.fichas[c]}`}`);
    b.onclick = () => jugar(i);
    rejilla.append(b);
  });
  return rejilla;
}
