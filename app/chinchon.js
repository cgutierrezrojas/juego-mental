// ♣️ Chinchón en la pantalla: los rivales, el mazo y el descarte, y tu mano (tocar una carta la bota; «Cerrar» marca las que cierran).
// Las reglas y la máquina están en games/chinchon.js; los modos, turnos y la partida con amigos, en app/cartas-mesa.js.
import { el } from '../games/comun.js';
import * as C from '../games/chinchon.js';
import { nombre, CREDITO, PALOS_ES } from '../games/escoba.js';
import { naipe, boton, temblar } from './cartas.js';
import { naipeEs } from './cartas-mesa.js';

let cerrando = false; // eligiendo la carta con que se cierra
let ordenada = false; // la mano se muestra con los juegos primero y las sueltas al final
let visto = null; // el estado que se dibujó la última vez (al cambiar, se sale del modo de cerrar)

// Los índices de la mano en el orden en que se dibujan (mejorForma devuelve las mismas cartas de la mano).
const orden = (mano) => {
  if (!ordenada) return [...mano.keys()];
  const f = C.mejorForma(mano);
  const sueltas = [...f.sueltas].sort((a, b) => PALOS_ES.indexOf(a.p) - PALOS_ES.indexOf(b.p) || a.v - b.v);
  return [...f.juegos.flat(), ...sueltas].map((c) => mano.indexOf(c));
};

function pintar(e, quien, miTurno, actuar, { nombres, repintar }) {
  if (e !== visto) {
    cerrando = false;
    visto = e;
  }
  const mano = e.manos[quien];
  const robando = miTurno && !e.robo;
  const botando = miTurno && !!e.robo;
  const cierran = botando ? C.cerrables(e) : [];
  if (!cierran.length) cerrando = false;

  const rivales = el('div', 'rivales-cartas');
  e.manos.forEach((m, i) => {
    if (i === quien) return;
    const r = el('div', `rival-cartas${e.turno === i ? ' turno' : ''}`);
    r.append(el('strong', '', nombres[i]), el('span', '', e.fuera[i] ? `❌ eliminado · ${e.puntos[i]} pts` : `🂠 ${m.length} · ${e.puntos[i]} pts`));
    rivales.append(r);
  });

  const centro = el('div', 'centro-ocho centro-chinchon');
  const mazo = naipe(null, false);
  mazo.tabIndex = 0;
  mazo.setAttribute('aria-label', `Mazo (${e.mazo.length}): robar`);
  mazo.onclick = () => (robando ? actuar(C.robar(e, 'mazo')) : temblar(mazo));
  const arriba = e.descarte.at(-1);
  const descarte = arriba ? naipeEs(arriba) : el('div', 'hueco-carta', 'Descarte');
  descarte.setAttribute('aria-label', arriba ? `Descarte: tomar ${nombre(arriba)}` : 'Descarte vacío');
  descarte.onclick = () => (robando && arriba ? actuar(C.robar(e, 'descarte')) : temblar(descarte));
  centro.append(mazo, descarte);

  const manoCaja = el('div', 'mano-cartas mano-chinchon');
  manoCaja.setAttribute('aria-label', 'Tus cartas');
  for (const i of orden(mano)) {
    const c = mano[i];
    const n = naipeEs(c);
    const robada = e.robada && c.v === e.robada.v && c.p === e.robada.p;
    if (cerrando && cierran.includes(i)) n.classList.add('sirve');
    if (robada) n.classList.add('robada');
    n.onclick = () => {
      if (cerrando) return cierran.includes(i) ? actuar(C.cerrar(e, i)) : temblar(n);
      if (!botando || robada) return temblar(n);
      actuar(C.botar(e, i));
    };
    manoCaja.append(n);
  }

  const ultimo = e.aviso ? `${nombres[e.aviso.j]}: ${e.aviso.t}. ` : '';
  let ayuda = `⏳ Turno de ${nombres[e.turno]}`;
  if (robando) ayuda = '▶ Tu turno: roba';
  else if (cerrando) ayuda = '▶ Toca la carta con que cierras (las marcadas)';
  else if (botando) ayuda = cierran.length ? '▶ Bota una carta (o cierra)' : '▶ Bota una carta';
  if (e.fuera[quien]) ayuda = '❌ Quedaste fuera (pasaste de 100)';

  const botones = [];
  if (robando) {
    botones.push(boton('🂠 Robar del mazo', 'color', () => actuar(C.robar(e, 'mazo'))));
    if (arriba) botones.push(boton(`Tomar ${nombre(arriba)}`, '', () => actuar(C.robar(e, 'descarte'))));
  }
  if (cerrando) {
    botones.push(boton('Cancelar', '', () => {
      cerrando = false;
      repintar();
    }));
  } else if (cierran.length) {
    botones.push(boton('✋ Cerrar', 'color', () => {
      cerrando = true;
      repintar();
    }));
  }
  botones.push(boton(ordenada ? 'Sin ordenar' : 'Ordenar', '', () => {
    ordenada = !ordenada;
    repintar();
  }));

  return {
    marcador: [el('span', '', `♣️ Ronda ${e.ronda} · mazo ${e.mazo.length}`), el('span', '', `${nombres[quien]}: ${e.puntos[quien]} / ${C.LIMITE}`)],
    tapete: [rivales, centro, el('p', 'ultimo-cartas', ultimo + ayuda), manoCaja],
    botones,
  };
}

const texto = (cartas) => cartas.map(nombre).join(' ');

function resumen(e, nombres) {
  const r = e.resumen;
  const yo = nombres[r.cerro] === 'Tú';
  const como = r.chinchon ? ' con ¡chinchón!' : r.filas[0].pts === -10 ? ' sin sueltas (−10)' : '';
  const titulo = `${yo ? '🎉 Cerraste' : `Cierra ${nombres[r.cerro]}`} la ronda ${r.ronda}${como}`;
  const filas = r.filas.map((f) => {
    const caja = el('div', 'fila-chinchon');
    caja.append(el('strong', '', `${nombres[f.j]}: ${f.pts > 0 ? `+${f.pts}` : f.pts}${e.fuera[f.j] ? ' · ❌ queda fuera' : ''}`),
      el('span', '', `Juegos: ${f.juegos.length ? f.juegos.map(texto).join(' · ') : '—'}`),
      el('span', '', `Sueltas: ${f.sueltas.length ? texto(f.sueltas) : '—'}`));
    // Las que agregó a juegos ajenos no vienen en la fila: son las que faltan de sus 7.
    const agrego = 7 - f.juegos.flat().length - f.sueltas.length;
    if (agrego > 0) caja.append(el('span', '', `Agregó ${agrego} a los juegos de la mesa`));
    return caja;
  });
  return [el('p', 'turno-trivia', titulo), ...filas, el('p', 'sin-datos', 'Quien pasa de 100 queda fuera; gana el último en pie.')];
}

export const CHINCHON = {
  id: 'chinchon', nombre: 'Chinchón', icono: '♣️', maxMaquinas: 3, maxLocal: 4, pausa: 600,
  niveles: ['facil', 'normal', 'dificil'],
  menosGana: true,
  meta: () => 100,
  metaTexto: () => 'Pasar de 100 elimina',
  credito: CREDITO,
  reglas: 'Baraja española de 40, 7 cartas cada uno. En tu turno robas (del mazo o la de arriba del descarte) y botas una (no la que tomaste del descarte). Juegos: 3 o 4 del mismo número, o 3 o más seguidas del mismo palo (el 7 sigue con la sota). Puedes cerrar al botar si te quedan 3 puntos sueltos o menos: sin sueltas te anotas −10, y las 7 en escala del mismo palo (chinchón) ganan la partida. Los demás pueden agregar sus sueltas a tus juegos y se anotan lo que les queda (sota 10, caballo 11, rey 12). Quien pasa de 100 queda fuera; gana el último en pie.',
  nueva: (n) => C.nueva(n),
  maquina: (e, nv) => C.accion(e, C.maquina(e, nv)),
  pintar,
  resumen,
};
