// 🀄 Burako en la pantalla: las fichas, los juegos de cada equipo y el atril (se eligen varias fichas para bajar o agregar).
// Las reglas están en games/burako.js; los modos, turnos y la partida con amigos, en app/cartas-mesa.js.
import { el } from '../games/comun.js';
import * as B from '../games/burako.js';
import * as R from '../games/rummy.js';
import { boton, temblar } from './cartas.js';

const ficha = (c) => {
  const f = el('button', `ficha-burako ${c.v ? `color-${c.p}` : 'comodin'}`, c.v ? String(c.v) : '★');
  f.setAttribute('aria-label', B.nombre(c));
  return f;
};

let elegidas = []; // índices del atril tocados
let porNumero = false;
let visto = null; // el estado que se dibujó la última vez (al cambiar, se olvida lo elegido)

const ordenAtril = (mano) => mano.map((c, i) => i).sort((a, b) => {
  const [x, y] = [mano[a], mano[b]];
  if (!x.v !== !y.v) return x.v ? -1 : 1;
  const color = B.COLORES.indexOf(x.p) - B.COLORES.indexOf(y.p);
  return porNumero ? x.v - y.v || color : color || x.v - y.v;
});

const filaFichas = (cartas) => {
  const caja = el('div', 'fichas-juego');
  caja.append(...cartas.map((c) => ficha(c)));
  for (const f of caja.children) f.tabIndex = -1;
  return caja;
};

function pintar(e, quien, miTurno, actuar, { nombres, repintar }) {
  if (e !== visto) {
    elegidas = [];
    visto = e;
  }
  const eq = B.equipo(quien);
  const mano = e.manos[quien];
  const jugando = miTurno && e.fase === 'jugar';
  const sel = elegidas.map((i) => mano[i]);

  const rivales = el('div', 'rivales-cartas');
  e.manos.forEach((m, i) => {
    if (i === quien) return;
    const r = el('div', `rival-cartas${e.turno === i ? ' turno' : ''}`);
    r.append(el('strong', '', `${nombres[i]}${B.equipo(i) === eq ? ' (tu equipo)' : ''}`), el('span', '', `🀫 ${m.length} · ${e.muertos[B.equipo(i)] ? 'sin muerto' : '💀 muerto tomado'}`));
    rivales.append(r);
  });

  // Juegos de tu equipo: con fichas elegidas, se iluminan los que las aceptan y tocarlos las agrega.
  const mios = el('div', 'mesa-burako');
  if (!e.mesa[eq].length) mios.append(el('span', 'sin-datos', 'Tu equipo aún no baja juegos.'));
  e.mesa[eq].forEach((juego, k) => {
    const entra = jugando && sel.length && R.armar(juego.tipo, [...juego.cartas, ...sel]);
    const b = el('button', `juego-carioca${entra ? ' sirve' : ''}${B.esBurako(juego) ? ' burako' : ''}`);
    b.append(filaFichas(juego.cartas));
    b.setAttribute('aria-label', `${R.NOMBRE_JUEGO[juego.tipo]} de ${juego.cartas.length}${B.esBurako(juego) ? ', burako' : ''}`);
    b.onclick = () => (entra ? actuar(B.agregar(e, elegidas, k)) : temblar(b));
    mios.append(b);
  });
  const suyos = el('div', 'mesa-burako');
  if (!e.mesa[1 - eq].length) suyos.append(el('span', 'sin-datos', 'Todavía no bajan juegos.'));
  for (const juego of e.mesa[1 - eq]) {
    const caja = el('div', `juego-carioca${B.esBurako(juego) ? ' burako' : ''}`);
    caja.append(filaFichas(juego.cartas));
    suyos.append(caja);
  }

  const centro = el('div', 'centro-ocho centro-burako');
  const robando = miTurno && e.fase === 'robar';
  const mazo = el('button', 'ficha-burako dorso', String(e.mazo.length));
  mazo.setAttribute('aria-label', `Mazo (${e.mazo.length}): robar`);
  mazo.onclick = () => (robando ? actuar(B.robar(e, 'mazo')) : temblar(mazo));
  const arriba = e.pozo.at(-1);
  const pozo = arriba ? ficha(arriba) : el('div', 'hueco-carta', 'Pozo');
  pozo.setAttribute('aria-label', arriba ? `Pozo (${e.pozo.length}), arriba ${B.nombre(arriba)}: llevárselo` : 'Pozo vacío');
  pozo.onclick = () => (robando && arriba ? actuar(B.robar(e, 'pozo')) : temblar(pozo));
  centro.append(mazo, pozo, el('span', 'sin-datos', `Pozo: ${e.pozo.length}`));

  const atril = el('div', 'mano-cartas atril-burako');
  atril.setAttribute('aria-label', 'Tu atril');
  for (const i of ordenAtril(mano)) {
    const f = ficha(mano[i]);
    const elegida = elegidas.includes(i);
    if (elegida) f.classList.add('elegida');
    f.setAttribute('aria-pressed', String(elegida));
    f.onclick = () => {
      if (!jugando) return temblar(f);
      elegidas = elegida ? elegidas.filter((x) => x !== i) : [...elegidas, i];
      repintar();
    };
    atril.append(f);
  }

  const ultimo = e.aviso ? `${nombres[e.aviso.j]}: ${e.aviso.t}. ` : '';
  let ayuda = `⏳ Turno de ${nombres[e.turno]}`;
  if (miTurno) ayuda = e.fase === 'robar' ? '▶ Tu turno: roba del mazo o llévate el pozo' : '▶ Elige fichas para bajar un juego o agregar, y bota una';
  const tapete = [rivales, el('p', 'titulo-burako', `Rivales · ${e.puntos[1 - eq]} pts`), suyos, centro,
    el('p', 'titulo-burako', `Tu equipo · ${e.puntos[eq]} pts${e.muertos[eq] ? '' : ' · 💀 muerto tomado'}`), mios, el('p', 'ultimo-cartas', ultimo + ayuda), atril];

  const botones = [];
  if (robando) botones.push(boton('🀫 Robar del mazo', 'color', () => actuar(B.robar(e, 'mazo'))), boton(`Llevarse el pozo (${e.pozo.length})`, '', () => actuar(B.robar(e, 'pozo'))));
  if (jugando) {
    const bajar = boton('⬇️ Bajar juego', 'color', () => actuar(B.bajar(e, elegidas)));
    bajar.disabled = !B.formar(sel);
    const botar = boton(sel.length === 1 ? `🗑️ Botar ${B.nombre(sel[0])}` : '🗑️ Botar (elige una ficha)', '', () => actuar(B.botar(e, elegidas[0])));
    botar.disabled = sel.length !== 1;
    botones.push(bajar, botar);
  }
  botones.push(boton(porNumero ? 'Ordenar por color' : 'Ordenar por número', '', () => {
    porNumero = !porNumero;
    repintar();
  }));

  return {
    marcador: [el('span', '', `🀄 Mano ${e.ronda} · mazo ${e.mazo.length}`), el('span', '', `${e.puntos[eq]} / ${B.META}`)],
    tapete,
    botones,
  };
}

function resumen(e, nombres) {
  const r = e.resumen;
  const equipos = equiposDe(nombres);
  const tabla = el('table', 'tabla-escoba');
  const filaT = (celdas, tag = 'td') => {
    const tr = el('tr');
    tr.append(...celdas.map((c) => el(tag, '', String(c))));
    return tr;
  };
  const signo = (x) => (x > 0 ? `+${x}` : String(x));
  tabla.append(filaT(['', ...equipos], 'th'),
    ...[['Juegos', 'juegos'], ['Burakos', 'burakos'], ['Cierre', 'cierre'], ['Muerto', 'muerto'], ['Atril', 'atril']].map(([t, k]) => filaT([t, ...r.filas.map((f) => signo(f[k]))])),
    filaT(['Mano', ...r.filas.map((f) => signo(f.total))], 'th'));
  const quien = r.cierra === null ? 'Se acabó el mazo: nadie cerró.' : `${equipos[r.cierra].startsWith('Tú') ? '🎉 Cerraste' : `Cierra ${equipos[r.cierra]}`} la mano ${r.ronda}`;
  return [el('p', 'turno-trivia', quien), tabla, el('p', 'sin-datos', `Gana el primer equipo que llega a ${B.META}.`)];
}

const equiposDe = (nombres) => (nombres.length === 4 ? [`${nombres[0]} y ${nombres[2]}`, `${nombres[1]} y ${nombres[3]}`] : nombres);

export const BURAKO = {
  id: 'burako', nombre: 'Burako', icono: '🀄', maxMaquinas: 3, pausa: 600,
  maquinas: [[1, '1 contra 1'], [3, '2 contra 2']],
  nombres: (n) => (n === 2 ? ['Tú', '🤖 Máquina'] : ['Tú', '🤖 Rival 1', '🤖 Compañera', '🤖 Rival 2']),
  equipos: equiposDe,
  meta: () => B.META,
  metaTexto: () => `Hasta ${B.META}`,
  reglas: '106 fichas (del 1 al 13 en 4 colores, dos de cada una, y 2 comodines; los 2 también son comodín). En tu turno robas una del mazo o te llevas todo el pozo, bajas juegos (escalera: 3 o más seguidas del mismo color; pierna: 3 o más del mismo número; un comodín por juego) o agregas a los de tu equipo, y botas una. Sin fichas, tomas el muerto. Burako: juego de 7 o más (limpio +200, sucio +100). Para cerrar hay que tener el muerto y un burako (+100). Valen: 1 = 15, 2 = 20, 3–7 = 5, 8–13 = 10, comodín = 50. Gana el primer equipo que llega a 3000.',
  nueva: (n) => B.nueva(n),
  maquina: (e, nv) => B.accion(e, B.maquina(e, nv)),
  pintar,
  resumen,
};
