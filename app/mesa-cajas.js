// ✏️ Tablero de Puntos y cajas: rejilla de puntos, líneas (botones) y cajas (con el color de su dueño).
import { el } from '../games/comun.js';
import { lineas } from '../games/cajas.js';

export function tableroCajas({ partida, j, puedo, jugar }) {
  const { n, celdas } = partida.estado;
  const H = n * (n + 1);
  const L = lineas(n);
  const lado = 2 * n + 1;
  const rejilla = el('div', 'tablero-cajas');
  rejilla.style.setProperty('--n', n);
  rejilla.setAttribute('role', 'group');
  rejilla.setAttribute('aria-label', `Puntos y cajas ${n}×${n}`);
  for (let fy = 0; fy < lado; fy++) {
    for (let cx = 0; cx < lado; cx++) {
      if (fy % 2 === 0 && cx % 2 === 0) { rejilla.append(el('span', 'punto-cajas')); continue; }
      if (fy % 2 === 1 && cx % 2 === 1) {
        const d = celdas[L + ((fy - 1) / 2) * n + (cx - 1) / 2];
        rejilla.append(el('span', `caja-cajas${d !== '.' ? ` de-${d}` : ''}`, d === '.' ? '' : j.fichas[d]));
        continue;
      }
      const l = fy % 2 === 0 ? (fy / 2) * n + (cx - 1) / 2 : H + ((fy - 1) / 2) * (n + 1) + cx / 2;
      const b = el('button', `linea-cajas ${fy % 2 === 0 ? 'horizontal' : 'vertical'}${celdas[l] === '-' ? ' trazada' : ''}${l === partida.ultima ? ' ultima' : ''}`);
      b.disabled = celdas[l] === '-' || !puedo;
      b.setAttribute('aria-label', `Línea ${l + 1}${celdas[l] === '-' ? ', trazada' : ''}`);
      b.onclick = () => jugar(l);
      rejilla.append(b);
    }
  }
  return rejilla;
}
