// 🎲 Generala en la pantalla: los 5 dados (un toque guarda o suelta), el botón de tirar y la tabla de todos los jugadores.
// Las reglas y la máquina están en games/generala.js; los modos, turnos y la partida con amigos, en app/cartas-mesa.js.
import { el } from '../games/comun.js';
import * as G from '../games/generala.js';
import { preguntar } from './ui.js';
import { boton, temblar } from './cartas.js';
import { dado } from './dados.js';

const NOMBRE = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', escalera: 'Escalera', full: 'Full', poker: 'Póker', generala: 'Generala', doble: 'Doble' };

// La máquina decide una vez por situación (la Difícil calcula) y la jugada se muestra en pasos, cada uno con la pausa del motor:
// primero qué dados guarda, luego tira, y al final se ve en qué casilla va a anotar y anota.
let plan = { clave: '', a: null };
function decidir(e, nivel) {
  const clave = JSON.stringify([e.turno, e.dados, e.tiradas, e.jugadores[e.turno].tabla, nivel]);
  if (plan.clave !== clave) plan = { clave, a: G.maquina(e, nivel, Math.random) };
  return plan.a;
}
function maquina(e, nivel) {
  const a = decidir(e, nivel);
  if (a.tipo === 'tirar' && e.tiradas > 0 && a.guardar.some((x, i) => x !== e.guardados[i])) return { ...structuredClone(e), guardados: a.guardar };
  return G.accion(e, a);
}

let rodado = ''; // los dados que ya se vieron rodar (para animar solo una tirada nueva)

function pintar(e, quien, miTurno, actuar, { nombres, nivel }) {
  const clave = `${e.turno}:${e.tiradas}:${e.dados.join('')}`;
  const rueda = e.tiradas > 0 && clave !== rodado;
  rodado = clave;
  const pos = G.posibles(e);
  const planCasilla = !miTurno && e.tiradas > 0 && nivel ? (() => { const a = decidir(e, nivel); return a.tipo === 'anotar' ? a.casilla : null; })() : null;

  const dados = el('div', 'dados-generala');
  dados.setAttribute('aria-label', 'Tus dados');
  e.dados.forEach((d, i) => {
    const b = el('button', 'dado-boton');
    const guardado = e.tiradas > 0 && e.guardados[i];
    b.append(dado(d, `${guardado ? 'guardado' : ''} ${rueda && !(e.tiradas > 1 && guardado) ? 'rodando' : ''}`.trim()));
    b.setAttribute('aria-label', d ? `Dado ${d}${guardado ? ', guardado' : ''}` : 'Dado sin tirar');
    if (guardado) b.setAttribute('aria-pressed', 'true');
    b.onclick = () => (miTurno && e.tiradas > 0 && e.tiradas < 3 ? actuar(G.alternarGuardado(e, i)) : temblar(b));
    dados.append(b);
  });

  const tabla = el('table', 'tabla-generala');
  const cab = el('tr');
  cab.append(el('th', '', ''), ...nombres.slice(0, e.n).map((n, j) => el('th', e.turno === j ? 'turno' : '', n)));
  tabla.append(cab);
  for (const c of G.CASILLAS) {
    const tr = el('tr');
    tr.append(el('th', '', NOMBRE[c]));
    e.jugadores.forEach((j, k) => {
      const td = el('td', e.turno === k ? 'turno' : '');
      if (j.tabla[c] !== null) td.textContent = String(j.tabla[c]);
      else if (e.turno === k && c in pos) {
        if (miTurno) {
          const b = el('button', `casilla-generala${pos[c] ? '' : ' cero'}`, String(pos[c]));
          b.setAttribute('aria-label', `Anotar ${pos[c]} en ${NOMBRE[c]}`);
          b.onclick = async () => {
            if (pos[c] === 0 && !(await preguntar({ titulo: `Tachar ${NOMBRE[c]}`, texto: 'Vale 0 puntos. ¿Anotarla así?', boton: 'Tachar' }))) return;
            actuar(G.anotar(e, c));
          };
          td.append(b);
        } else td.append(el('span', `posible${planCasilla === c ? ' plan' : ''}`, String(pos[c])));
      }
      tr.append(td);
    });
    tabla.append(tr);
  }
  const tot = el('tr', 'total');
  tot.append(el('th', '', 'Total'), ...e.jugadores.map((j) => el('td', '', String(G.total(j)))));
  tabla.append(tot);
  const caja = el('div', 'caja-generala');
  caja.append(tabla);

  const botones = [];
  if (miTurno && G.tirar(e)) botones.push(boton(`🎲 Tirar (quedan ${3 - e.tiradas})`, 'color', () => actuar(G.tirar(e))));
  const nombre = nombres[e.turno];
  const aviso = miTurno
    ? e.tiradas === 0 ? `▶ ${nombre === 'Tú' ? 'Tu turno' : `Turno de ${nombre}`}: tira los dados` : e.tiradas < 3 ? 'Toca los dados que quieras guardar, o anota en una casilla' : 'Sin tiradas: anota en una casilla'
    : `⏳ Turno de ${nombre}`;
  return {
    marcador: [el('span', '', '🎲 Generala'), el('span', '', `${nombres[quien]}: ${G.total(e.jugadores[quien])}`)],
    tapete: [dados, el('p', 'ultimo-cartas', aviso), caja],
    botones,
  };
}

export const GENERALA = {
  id: 'generala', nombre: 'Generala', icono: '🎲', seccion: 'dados', niveles: ['facil', 'normal', 'dificil'], maxMaquinas: 3, maxLocal: 4, pausa: 1000,
  verTexto: '▶ Empezar mi turno',
  reglas: 'Tira los 5 dados hasta 3 veces por turno, guardando los que quieras, y anota en una casilla libre (si ninguna sirve, tacha una: vale 0). Números: la suma de esa pinta. Escalera 20, Full 30, Póker 40, Generala 50 y Doble generala 100 (solo si ya tienes la Generala); servido (a la primera tirada) suma 5 más, salvo la Generala, que si sale servida gana la partida. Con las 11 casillas llenas, gana quien suma más.',
  nueva: (n) => G.nueva(n),
  maquina,
  pintar,
  // Con un amigo (app/dados-amigo.js): tirar solo pide la tirada; los dados se publican solos cuando llega la hora del servidor.
  amigo: {
    M: G,
    async auto(e, misDados) {
      if (!e.pide) return null;
      const d = await misDados(e.k, G.sueltos(e).filter(Boolean).length);
      return d && G.publicar(e, d);
    },
    vista: (q) => (q.guardados ? { ...q.e, guardados: q.guardados } : q.e), // lo guardado aún sin tirar vive aquí
  },
};
