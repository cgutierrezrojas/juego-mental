// ⚫ Tablero de las Damas: tocas una pieza, se marcan sus destinos; en una secuencia de saltos, cada toque avanza uno.
import { el } from '../games/comun.js';
import { jugadas } from '../games/damas.js';

let camino = []; // casillas tocadas de la jugada en curso
let estadoVisto = null; // si el estado cambia (jugó el rival), se olvida la selección

export function tableroDamas({ partida, j, puedo, jugar }) {
  if (estadoVisto !== partida.estado) { camino = []; estadoVisto = partida.estado; }
  const ultima = typeof partida.ultima === 'string' ? Number(partida.ultima.split('-').pop()) : partida.ultima;
  const todas = puedo ? jugadas(partida.estado).map((x) => x.camino) : [];
  const empiezan = (c) => c.length > camino.length && camino.every((v, k) => c[k] === v);
  const posibles = camino.length ? todas.filter(empiezan) : [];
  const destinos = new Set(posibles.map((c) => c[camino.length]));
  const origenes = new Set(todas.map((c) => c[0]));
  const rejilla = el('div', 'tablero-damas');
  rejilla.setAttribute('role', 'group');
  rejilla.setAttribute('aria-label', 'Tablero de damas');
  [...partida.estado.celdas].forEach((p, i) => {
    const oscura = ((i >> 3) + (i & 7)) % 2 === 1;
    const b = el('button', `casilla-damas${oscura ? ' oscura' : ''}`);
    if (p !== '.') b.append(el('span', `pieza-damas ficha-${p.toLowerCase()}${p !== p.toLowerCase() ? ' dama' : ''}`, p !== p.toLowerCase() ? '♛' : ''));
    if (camino.includes(i)) b.classList.add('elegida');
    if (destinos.has(i)) b.classList.add('destino');
    if (i === ultima) b.classList.add('ultima');
    b.disabled = !oscura || !puedo || !(origenes.has(i) || destinos.has(i));
    b.setAttribute('aria-label', `Fila ${(i >> 3) + 1}, columna ${(i & 7) + 1}${p === '.' ? '' : `, ${p.toLowerCase() === 'x' ? j.fichas.x : j.fichas.o}${p !== p.toLowerCase() ? ' dama' : ''}`}`);
    b.onclick = () => {
      if (destinos.has(i)) camino = [...camino, i];
      else if (origenes.has(i)) camino = [i];
      const completa = todas.find((c) => c.length === camino.length && c.every((v, k) => v === camino[k]));
      const sigue = todas.some((c) => c.length > camino.length && c.every((v, k) => k >= camino.length || v === camino[k]));
      if (completa && !sigue) { const jug = camino.join('-'); camino = []; return jugar(jug); }
      rejilla.replaceWith(tableroDamas({ partida, j, puedo, jugar }));
    };
    rejilla.append(b);
  });
  return rejilla;
}
