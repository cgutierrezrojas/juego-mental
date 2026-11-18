// 🎲 Dados: la página de la sección (Cacho y Generala, que usan el motor de turnos de app/cartas-mesa.js)
// y el dado dibujado en CSS (`.dado`, con los puntos de cada cara) que usan los dos juegos.
import { el } from '../games/comun.js';
import { mostrar, $ } from './ui.js';
import { boton } from './cartas.js';
import { JUEGOS_MESA_CARTAS, abrirJuegoMesa, pintarPartidas } from './cartas-mesa.js';

export const JUEGOS_DADOS = 2; // para la cuenta del inicio (Cacho y Generala)

export function abrirDados() {
  mostrar('dados');
  pintarPartidas('dados');
  $('dados-juegos').replaceChildren(...JUEGOS_MESA_CARTAS.filter((J) => J.seccion === 'dados').map((J) => {
    const b = boton('', 'tarjeta color', () => abrirJuegoMesa(J.id));
    b.append(el('span', 'icono', J.icono), el('span', '', J.nombre));
    return b;
  }));
}

// Un dado con la cara 1–6 (o sin número, que se ve vacío); `clases`: 'guardado', 'tapado', 'cuenta', 'rodando'.
export function dado(cara, clases = '') {
  const d = el('span', `dado ${clases}`.trim());
  d.dataset.cara = String(cara);
  d.setAttribute('role', 'img');
  d.setAttribute('aria-label', clases.includes('tapado') ? 'Dado tapado' : `Dado: ${cara}`);
  d.append(...Array.from({ length: cara }, () => el('i')));
  return d;
}
