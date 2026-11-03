// 🃏 Juegos de cartas por turnos (🎱 Ocho locos y 🧹 Escoba): contra la máquina, a dos en un celular
// (con una pantalla para pasarlo sin ver las cartas del otro) o contra un amigo (en `mesas/{id}` como la Mesa:
// el estado entero va como texto en `estado.datos` y `estado.turno` dice a quién le toca: 'x' es el jugador 0, 'o' el 1).
// Cada juego da sus reglas (games/ocho.js, games/escoba.js, games/carioca.js), su `pintar` (la mesa del jugador que mira) y su
// `resumen` de ronda; puede dar `opciones` para la pantalla de modos, `pausa` de la máquina y `menosGana` (gana el de menos puntos).
import { el, leer, guardar } from '../games/comun.js';
import { sonar } from '../games/efectos.js';
import { esRoja } from '../games/cartas.js';
import * as O from '../games/ocho.js';
import * as ES from '../games/escoba.js';
import { amigosDe } from '../games/amigos.js';
import { E } from './estado.js';
import { leerJSON } from './datos.js';
import { $, confeti, preguntar } from './ui.js';
import { ligaAnotar } from './liga.js';
import { asegurarDuelista } from './duelos.js';
import { misPartidas, resultadoMesa, apuntarResultadoAmigo } from './mesa.js';
import { naipe, pantalla, boton, abrirCartas, alSalir, temblar } from './cartas.js';
import { CARIOCA } from './carioca.js';

const FICHA = ['x', 'o'];

// Partida: { J (juego), modo: 'maquina' | 'local' | 'amigo', e, yo (el que mira, salvo a dos en un celular),
// nombres, vista (a dos: de quién son las cartas a la vista), visto (última ronda cuyo resumen se vio), id, mesa, apuntada, timer }
let p = null;
let maquinas = 1; // rivales elegidos en el Ocho locos
let nivel = 'normal'; // 'normal' | 'dificil', contra la máquina
const NIVELES = { normal: 'Normal', dificil: 'Difícil' };
// Récord contra la máquina por nivel: `cartas:ocho`, `cartas:ocho-dificil`…
export const claveRecord = (id, nv) => `cartas:${id}${nv === 'dificil' ? '-dificil' : ''}`;

function pararPartida() {
  clearTimeout(p?.timer);
  p?.dejar?.();
  if (p) p.dejar = null;
}

// --- 🎱 Ocho locos ---

const OCHO = {
  id: 'ocho', nombre: 'Ocho locos', icono: '🎱', maxMaquinas: 3, meta: (e) => O.meta(e.n),
  reglas: 'Tira una carta del mismo palo o número. El 8 cambia el palo; el 2 hace robar 2 (se acumulan); la J salta al siguiente; la Q cambia el sentido. Sin jugada robas hasta 3. Quien se queda sin cartas suma lo que tienen los demás: gana el primero en llegar a 100 (200 si son tres, 300 si son cuatro).',
  nueva: (n) => O.nueva(n),
  maquina: (e, nv) => O.accion(e, O.maquina(e, nv)),
  pintar: pintarOcho,
  resumen: (e) => [
    el('p', 'turno-trivia', `${p.nombres[e.resumen.j] === 'Tú' ? '🎉 Ganaste' : `Gana ${p.nombres[e.resumen.j]}`} la ronda ${e.resumen.ronda}`),
    el('p', 'sin-datos', `Suma ${e.resumen.suma} puntos con las cartas de los demás.`),
  ],
};

// --- 🧹 Escoba ---

const ESCOBA = {
  id: 'escoba', nombre: 'Escoba', icono: '🧹', maxMaquinas: 1, meta: () => ES.META,
  credito: 'Cartas: <a href="https://commons.wikimedia.org/wiki/File:Baraja_espa%C3%B1ola_completa.png" target="_blank" rel="noopener">Baraja española completa</a> de <a href="https://commons.wikimedia.org/wiki/User:Basquetteur" target="_blank" rel="noopener">Basquetteur</a>, <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.es" target="_blank" rel="noopener">CC BY-SA 3.0</a> (reducida).',
  reglas: 'Baraja española: la sota (10) vale 8, el caballo (11) vale 9 y el rey (12) vale 10. Tira una carta: si con cartas de la mesa suma 15, te las llevas; dejar la mesa vacía es escoba. Cada ronda da 1 punto por escoba y 1 a quien tenga más cartas, más oros, más sietes y el 7 de oros. Gana el primero en llegar a 15.',
  nueva: () => ES.nueva(),
  maquina: (e, nv) => ES.accion(e, ES.maquina(e, nv)),
  pintar: pintarEscoba,
  resumen: (e) => {
    const r = e.resumen;
    const tabla = el('table', 'tabla-escoba');
    const fila = (celdas, tag = 'td') => {
      const tr = el('tr');
      tr.append(...celdas.map((c) => el(tag, '', String(c))));
      return tr;
    };
    tabla.append(fila(['', ...p.nombres], 'th'), ...r.filas.map((f) => fila([f.t, ...f.valores.map((v, j) => `${v}${f.pts[j] ? ' ⭐' : ''}`)])), fila(['Puntos', ...r.suma.map((x) => `+${x}`)], 'th'));
    return [el('p', 'turno-trivia', `🧹 Fin de la ronda ${r.ronda}`), tabla];
  },
};
export const JUEGOS_MESA_CARTAS = [OCHO, ESCOBA, CARIOCA];
const juegoDe = (id) => JUEGOS_MESA_CARTAS.find((j) => j.id === id);

function pintarOcho(e, quien, miTurno, actuar) {
  const yo = (i) => i === quien;
  const rivales = el('div', 'rivales-cartas');
  e.manos.forEach((mano, i) => {
    if (yo(i)) return;
    const r = el('div', `rival-cartas${e.turno === i ? ' turno' : ''}`);
    r.append(el('strong', '', p.nombres[i]), el('span', '', `🂠 ${mano.length} · ${e.puntos[i]} pts`));
    rivales.append(r);
  });
  const centro = el('div', 'centro-ocho');
  const mazo = naipe(null, false);
  mazo.tabIndex = 0;
  mazo.setAttribute('aria-label', `Mazo (${e.mazo.length}): robar`);
  mazo.onclick = () => (miTurno && O.puedeRobar(e) ? actuar(O.robar(e)) : temblar(mazo));
  const info = el('div', 'info-ocho');
  if (e.palo !== O.arriba(e).p) info.append(el('span', `palo-pedido${esRoja({ p: e.palo }) ? ' roja' : ''}`, `Pide ${e.palo}`));
  if (e.robar) info.append(el('span', 'robar-ocho', `+${e.robar}`));
  centro.append(mazo, naipe(O.arriba(e)), info);

  const mano = el('div', 'mano-cartas');
  mano.setAttribute('aria-label', 'Tus cartas');
  e.manos[quien].forEach((c, i) => {
    const n = naipe(c);
    const sirve = miTurno && O.puedeJugar(e, c);
    if (sirve) n.classList.add('sirve');
    n.onclick = () => {
      if (!sirve) return temblar(n);
      if (c.v !== 8) return actuar(O.jugar(e, i));
      // Con un 8 se elige el palo.
      $('cartas-botones').replaceChildren(...['♠', '♥', '♦', '♣'].map((palo) => boton(palo, `palo-boton${esRoja({ p: palo }) ? ' roja' : ''}`, () => actuar(O.jugar(e, i, palo)))), boton('Cancelar', '', () => pintar()));
      $('cartas-aviso').textContent = '¿Qué palo pides?';
    };
    mano.append(n);
  });

  const ultimo = e.aviso ? `${p.nombres[e.aviso.j]}: ${e.aviso.t}. ` : '';
  const turno = miTurno ? `▶ Tu turno${e.robar ? `: tira un 2 o roba ${e.robar}` : ''}` : `⏳ Turno de ${p.nombres[e.turno]}`;
  const botones = [];
  if (miTurno && O.puedeRobar(e)) botones.push(boton(e.robar ? `Robar ${e.robar}` : `Robar (${O.MAX_ROBAR - e.robadas})`, 'color', () => actuar(O.robar(e))));
  if (miTurno && O.puedePasar(e)) botones.push(boton('Pasar', 'color', () => actuar(O.pasar(e))));
  return {
    marcador: [el('span', '', `🎱 Ronda ${e.ronda}`), el('span', '', `${p.nombres[quien]}: ${e.puntos[quien]} / ${O.meta(e.n)}`)],
    tapete: [rivales, centro, el('p', 'ultimo-cartas', ultimo + turno), mano],
    botones,
  };
}

// Carta española: un recorte de img/baraja-espanola.webp («Baraja española completa» de Basquetteur, CC BY-SA 3.0,
// reducida). Filas: oros, copas, espadas, bastos; columnas: 1 a 12 (la sota es el 10, el caballo el 11 y el rey el 12).
function naipeEs(c) {
  const n = el('button', 'naipe espanola');
  n.style.setProperty('--col', c.v <= 7 ? c.v - 1 : c.v + 1);
  n.style.setProperty('--fila', ES.PALOS_ES.indexOf(c.p));
  n.setAttribute('aria-label', ES.nombreLargo(c));
  return n;
}

function pintarEscoba(e, quien, miTurno, actuar) {
  const otro = 1 - quien;
  const rival = el('div', `rival-cartas${e.turno === otro ? ' turno' : ''}`);
  rival.append(el('strong', '', p.nombres[otro]), el('span', '', `🂠 ${e.manos[otro].length} · 🧹 ${e.escobas[otro]} · ${e.llevadas[otro].length} llevadas · ${e.puntos[otro]} pts`));
  const mesa = el('div', 'mesa-escoba');
  mesa.setAttribute('aria-label', 'La mesa');
  const naipes = e.mesa.map((c) => naipeEs(c));
  naipes.forEach((n) => (n.tabIndex = -1));
  mesa.append(...(naipes.length ? naipes : [el('span', 'sin-datos', 'Mesa vacía')]));

  const mano = el('div', 'mano-cartas');
  mano.setAttribute('aria-label', 'Tus cartas');
  e.manos[quien].forEach((c, i) => {
    const n = naipeEs(c);
    const formas = miTurno ? ES.opciones(e, i) : [];
    if (formas.length) n.classList.add('sirve');
    n.onclick = () => {
      if (!miTurno) return temblar(n);
      if (formas.length <= 1) return actuar(ES.jugar(e, i, 0));
      // Varias formas de sumar 15: se elige cuál llevarse (se marcan en la mesa al pasar por encima).
      const marcar = (t) => naipes.forEach((x, k) => x.classList.toggle('pista', t?.includes(k) ?? false));
      $('cartas-botones').replaceChildren(...formas.map((t, k) => {
        const b = boton(`Llevar ${t.map((x) => ES.nombre(e.mesa[x])).join(' ')}`, 'color', () => actuar(ES.jugar(e, i, k)));
        b.onpointerenter = b.onfocus = () => marcar(t);
        return b;
      }), boton('Cancelar', '', () => pintar()));
      $('cartas-aviso').textContent = `¿Qué te llevas con ${ES.nombre(c)}?`;
    };
    mano.append(n);
  });

  const ultimo = e.aviso ? `${p.nombres[e.aviso.j]}: ${e.aviso.t}. ` : '';
  const turno = miTurno ? '▶ Tu turno: las que suman 15 brillan' : `⏳ Turno de ${p.nombres[e.turno]}`;
  return {
    marcador: [el('span', '', `🧹 Ronda ${e.ronda} · mazo ${e.mazo.length}`), el('span', '', `${p.nombres[quien]}: ${e.puntos[quien]} / ${ES.META}`)],
    tapete: [rival, mesa, el('p', 'ultimo-cartas', ultimo + turno), mano, el('p', 'sin-datos', `${p.nombres[quien]}: 🧹 ${e.escobas[quien]} · ${e.llevadas[quien].length} llevadas`)],
    botones: [],
  };
}

// --- Página: elegir modo ---

export function abrirJuegoMesa(id) {
  alSalir(pararPartida);
  pararPartida();
  const J = juegoDe(id);
  const partes = [el('h2', '', `${J.icono} ${J.nombre}`), el('p', 'sin-datos', J.reglas), ...(J.opciones?.() ?? [])];
  if (J.credito) {
    const credito = el('p', 'credito-cartas');
    credito.innerHTML = J.credito;
    partes.push(credito);
  }
  for (const nv of Object.keys(NIVELES)) {
    const r = leerJSON(claveRecord(J.id, nv));
    if (r.partidas) partes.push(el('p', 'sin-datos', `Contra la máquina (${NIVELES[nv]}): ${r.ganadas} de ${r.partidas} ganadas`));
  }
  partes.push(el('h3', 'categoria', '🤖 Contra la máquina'));
  partes.push(fila('Nivel', Object.entries(NIVELES).map(([nv, t]) => [t, t, nv === nivel, () => (nivel = nv)])));
  if (J.maxMaquinas > 1) {
    const opciones = Array.from({ length: J.maxMaquinas }, (_, i) => [`${i + 1} 🤖`, `${i + 1} ${i ? 'máquinas' : 'máquina'}`, i + 1 === maquinas, () => (maquinas = i + 1)]);
    partes.push(fila('Cuántas máquinas', opciones));
  }
  partes.push(
    boton('▶ Jugar contra la máquina', 'color', () => empezar(J, 'maquina', J.maxMaquinas > 1 ? maquinas + 1 : 2)),
    el('h3', 'categoria', '📱 Dos en este celular'),
    boton('▶ Jugar a dos (pasándose el celular)', '', () => empezar(J, 'local', 2)),
    el('h3', 'categoria', '👥 Contra un amigo'),
  );
  const amigos = el('div', 'opciones-duelo');
  partes.push(amigos);
  pantalla([], partes, [boton('Volver', '', abrirCartas)]);
  $('cartas-tapete').className = 'tapete-modos';
  pintarAmigos(J, amigos);
}

// Una fila de botones donde se elige uno: opciones = [[texto, etiqueta, elegido, alElegir]].
export function fila(nombre, opciones) {
  const caja = el('div', 'opciones-ajuste');
  caja.setAttribute('role', 'group');
  caja.setAttribute('aria-label', nombre);
  for (const [texto, etiqueta, elegido, alElegir] of opciones) {
    const b = boton(texto, '', () => {
      alElegir();
      for (const x of caja.children) x.setAttribute('aria-pressed', String(x === b));
    });
    b.setAttribute('aria-pressed', String(elegido));
    b.setAttribute('aria-label', etiqueta);
    caja.append(b);
  }
  return caja;
}

async function pintarAmigos(J, caja) {
  if (!E.usuario || !E.nube?.hayEstados()) return caja.replaceChildren(boton('Entra para jugar con tus amigos', '', () => asegurarDuelista()));
  caja.replaceChildren(el('span', 'sin-datos', 'Cargando tus amigos…'));
  try {
    const { amigos } = amigosDe(await E.nube.misSolicitudes(E.usuario.uid), E.usuario.uid);
    if (!amigos.length) return caja.replaceChildren(el('span', 'sin-datos', 'Aún no tienes amigos: agrégalos en 👥 Amigos.'));
    caja.replaceChildren(...amigos.map((a) => boton(`👥 ${a.apodo}`, '', () => retarAmigo(J, a))));
  } catch {
    caja.replaceChildren(el('span', 'sin-datos', 'No se pudieron cargar tus amigos (¿sin conexión?).'));
  }
}

// En la página de Cartas: las partidas con amigos de estos juegos.
export async function pintarPartidasCartas() {
  const caja = $('cartas-partidas');
  if (!E.usuario || !E.nube?.hayEstados()) return caja.replaceChildren();
  try {
    const filas = (await misPartidas()).filter(({ mesa }) => juegoDe(mesa.juego));
    if (!filas.length) return caja.replaceChildren();
    caja.replaceChildren(el('h3', 'categoria', '👥 Tus partidas con amigos'), ...filas.slice(0, 12).map(({ id, mesa, info }) => {
      const J = juegoDe(mesa.juego);
      const resultado = resultadoMesa(mesa, mesa.jugadores.x === E.usuario.uid ? 'x' : 'o');
      let detalle = mesa.jugadores[mesa.estado.turno] === E.usuario.uid ? '▶ Tu turno' : `⏳ Turno de ${info.nombreRival}`;
      if (resultado) detalle = { v: '🏆 Ganaste', d: 'Perdiste', e: '🤝 Empate' }[resultado];
      const b = el('button', `fila-duelo ${resultado ? `resultado-${resultado}` : detalle.startsWith('▶') ? 'tu-turno' : ''}`);
      b.append(el('span', '', `${J.icono} ${J.nombre} vs ${info.nombreRival}`), el('small', '', detalle));
      b.onclick = () => abrirAmigo(id);
      return b;
    }));
  } catch {
    caja.replaceChildren(el('p', 'sin-datos', 'No se pudieron cargar tus partidas (¿sin conexión?).'));
  }
}

// --- Partida ---

function empezar(J, modo, n) {
  pararPartida();
  const nombres = modo === 'local' ? ['Jugador 1', 'Jugador 2'] : ['Tú', ...Array.from({ length: n - 1 }, (_, i) => (n > 2 ? `🤖 Máquina ${i + 1}` : '🤖 Máquina'))];
  p = { J, modo, nivel, e: J.nueva(n), yo: 0, nombres, vista: null, visto: 0, apuntada: false };
  alSalir(pararPartida);
  pintar();
}

async function retarAmigo(J, amigo) {
  if (!(await asegurarDuelista())) return;
  try {
    const e = J.nueva(2);
    const id = await E.nube.crearMesa({
      juego: J.id,
      jugadores: { x: E.usuario.uid, o: amigo.uid },
      nombres: { [E.usuario.uid]: leer('nube:apodo'), [amigo.uid]: amigo.apodo },
      estado: { turno: FICHA[e.turno], datos: JSON.stringify(e) },
    });
    abrirAmigo(id);
  } catch {
    $('cartas-aviso').textContent = `No se pudo crear la partida. ¿${amigo.apodo} sigue siendo tu amigo y hay conexión?`;
  }
}

async function abrirAmigo(id) {
  if (!(await asegurarDuelista())) return;
  pararPartida();
  p = { modo: 'amigo', id, e: null, visto: 0, apuntada: false };
  alSalir(pararPartida);
  pantalla([], [el('p', 'sin-datos', 'Cargando la partida…')], [boton('Volver', '', abrirCartas)]);
  p.dejar = E.nube.verMesa(id, (mesa) => {
    if (p?.id !== id) return;
    if (!mesa) return pantalla([], [el('p', 'sin-datos', 'Esta partida ya no existe.')], [boton('Volver', '', abrirCartas)]);
    const yo = mesa.jugadores.x === E.usuario.uid ? 0 : 1;
    const nombre = (i) => (i === yo ? 'Tú' : mesa.nombres?.[mesa.jugadores[FICHA[i]]] ?? 'Rival');
    const primera = !p.e;
    let e;
    try {
      e = JSON.parse(mesa.estado.datos);
    } catch {
      return; // datos dañados (o una escritura que el servidor va a rechazar): se queda lo que había
    }
    Object.assign(p, { J: juegoDe(mesa.juego), mesa, yo, nombres: [nombre(0), nombre(1)], e });
    if (primera) p.visto = p.e.resumen?.ronda ?? 0; // al abrir no se repite el resumen de una ronda vieja
    pintar();
  });
}

// Ganador: índice del jugador, o null. Con un amigo también cuenta quien se rindió.
const ganador = () => (p.modo === 'amigo' && p.mesa?.ganador ? FICHA.indexOf(p.mesa.ganador) : p.e.ganador);

function actuar(nuevo) {
  if (!nuevo) return sonar('fallo');
  p.e = nuevo;
  sonar('tic');
  if (p.modo === 'amigo') {
    const g = nuevo.ganador;
    E.nube.jugarMesa(p.id, { turno: FICHA[nuevo.turno], datos: JSON.stringify(nuevo) }, g === null ? null : FICHA[g]).catch(() => {
      $('cartas-aviso').textContent = 'No se pudo enviar la jugada (¿sin conexión?).';
    });
  }
  pintar();
}

function pintar() {
  clearTimeout(p.timer);
  const { e, J } = p;
  const g = ganador();
  if (g !== null && g >= 0) return pintarFin(g);
  if (e.resumen && e.resumen.ronda > p.visto) return pintarResumen();
  // A dos en un celular: antes de cada turno, una pantalla para pasarlo sin ver las cartas del otro.
  if (p.modo === 'local' && p.vista !== e.turno) {
    return pantalla([], [el('p', 'turno-trivia', `📱 Turno de ${p.nombres[e.turno]}`), el('p', 'sin-datos', 'Pásale el celular. Toca cuando esté listo.')], [
      boton('👀 Ver mis cartas', 'color', () => {
        p.vista = e.turno;
        pintar();
      }),
      boton('Salir', '', abrirCartas),
    ]);
  }
  const quien = p.modo === 'local' ? e.turno : p.yo;
  const humano = p.modo !== 'maquina' || e.turno === p.yo;
  const vista = J.pintar(e, quien, humano && e.turno === quien, actuar, { nombres: p.nombres, repintar: pintar });
  const botones = [...vista.botones];
  if (p.modo === 'amigo') botones.push(boton('🏳️ Rendirse', '', rendirse));
  botones.push(boton('Salir', '', abrirCartas));
  pantalla(vista.marcador, vista.tapete, botones);
  $('cartas-tapete').className = 'tapete-mesa';
  if (!humano) p.timer = setTimeout(() => actuar(J.maquina(p.e, p.nivel)), J.pausa ?? 900);
}

async function rendirse() {
  const seguro = await preguntar({ titulo: '🏳️ Rendirse', texto: 'Perderás esta partida.', boton: 'Rendirse' });
  if (seguro) E.nube.rendirseMesa(p.id, E.usuario.uid, FICHA[1 - p.yo]).catch(() => {});
}

const tablaPuntos = (e) => {
  const lista = el('ul', 'puntos-cartas');
  e.puntos.map((pts, i) => [pts, i]).sort((a, b) => (p.J.menosGana ? a[0] - b[0] : b[0] - a[0])).forEach(([pts, i]) => lista.append(el('li', '', `${p.nombres[i]}: ${pts}`)));
  return lista;
};

function pintarResumen() {
  const { e } = p;
  const r = e.resumen;
  pantalla([el('span', '', `${p.J.icono} Ronda ${r.ronda}`), el('span', '', p.J.metaTexto?.(e) ?? `Meta ${p.J.meta(e)}`)], [...p.J.resumen(e, p.nombres), tablaPuntos(e)], [boton('▶ Seguir', 'color', () => {
    p.visto = r.ronda;
    p.vista = null;
    pintar();
  }), boton('Salir', '', abrirCartas)]);
}

function pintarFin(g) {
  const gane = p.modo === 'local' || g === p.yo;
  if (!p.apuntada) {
    p.apuntada = true;
    if (p.modo === 'maquina') {
      const r = leerJSON(claveRecord(p.J.id, p.nivel));
      guardar(claveRecord(p.J.id, p.nivel), JSON.stringify({ partidas: (r.partidas ?? 0) + 1, ganadas: (r.ganadas ?? 0) + (gane ? 1 : 0) }));
    }
    if (p.modo === 'amigo') apuntarResultadoAmigo(p.id, gane ? 'v' : 'd');
    else ligaAnotar('partida');
    if (gane) {
      confeti();
      sonar('record');
    }
  }
  const rendido = p.mesa?.rendido?.[E.usuario?.uid];
  const titulo = p.modo === 'local' || g !== p.yo ? (rendido ? 'Te rendiste.' : `🏆 Gana ${p.nombres[g]}`) : '🏆 ¡Ganaste!';
  pantalla([el('span', '', `${p.J.icono} ${p.J.nombre}`)], [el('p', 'turno-trivia', titulo), tablaPuntos(p.e)], [
    boton(p.modo === 'amigo' ? '🔄 Revancha' : '🔄 Otra partida', 'color', () => {
      if (p.modo !== 'amigo') return empezar(p.J, p.modo, p.e.n);
      const rival = p.mesa.jugadores[FICHA[1 - p.yo]];
      retarAmigo(p.J, { uid: rival, apodo: p.mesa.nombres?.[rival] ?? 'Rival' });
    }),
    boton('Volver', '', abrirCartas),
  ]);
}
