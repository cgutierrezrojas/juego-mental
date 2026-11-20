// 🃏 Juegos de cartas por turnos (🎱 Ocho locos, 🧹 Escoba y los de app/carioca.js, burako.js, chinchon.js…): contra la máquina, a dos en un celular
// (con una pantalla para pasarlo sin ver las cartas del otro) o contra un amigo (en `mesas/{id}` como la Mesa:
// el estado entero va como texto en `estado.datos` y `estado.turno` dice a quién le toca: 'x' es el jugador 0, 'o' el 1).
// Cada juego da sus reglas (games/ocho.js, games/escoba.js, games/carioca.js), su `pintar` (la mesa del jugador que mira) y su
// `resumen` de ronda; puede dar `opciones` para la pantalla de modos, `pausa` de la máquina, `menosGana` (gana el de menos puntos),
// `maquinas` ([[cuántas, texto]]), `nombres(n)` de los jugadores contra la máquina y `equipos(nombres)` si los puntos son por equipo.
// También `seccion` ('cartas' por defecto o 'dados': a dónde vuelve, a qué cuenta y la clave del récord), `niveles` (['normal', 'dificil']
// por defecto; los dados usan también 'facil') y `maxLocal` (cuántos pueden jugar en un celular; 2 por defecto).
// Los dados con un amigo dan `amigo` (ver app/dados-amigo.js): sus dados salen de semillas selladas, no del estado.
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
import { anotarPerfil } from './perfil.js';
import { finDePartida } from './anuncios.js';
import { asegurarDuelista } from './duelos.js';
import { misPartidas, resultadoMesa, apuntarResultadoAmigo } from './mesa.js';
import { naipe, pantalla, boton, abrirCartas, alSalir, temblar } from './cartas.js';
import { abrirDados } from './dados.js';
import { CARIOCA } from './carioca.js';
import { GENERALA } from './dados-generala.js';
import { CACHO } from './dados-cacho.js';
import { BURAKO } from './burako.js';
import { CHINCHON } from './chinchon.js';
import * as AMIGO from './dados-amigo.js';

const FICHA = ['x', 'o'];

// Partida: { J (juego), modo: 'maquina' | 'local' | 'amigo', e, yo (el que mira, salvo a dos en un celular),
// nombres, vista (a dos: de quién son las cartas a la vista), visto (última ronda cuyo resumen se vio), id, mesa, apuntada, timer }
let p = null;
let maquinas = 1; // máquinas elegidas (Ocho locos, Carioca, Burako)
let nivel = 'normal'; // 'facil' | 'normal' | 'dificil', contra la máquina
let locales = 2; // jugadores en un celular (juegos con maxLocal > 2)
const NIVELES = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' };
// Récord contra la máquina por nivel: `cartas:ocho`, `cartas:ocho-dificil`, `dados:cacho-facil`…
export const claveRecord = (id, nv, seccion = 'cartas') => `${seccion}:${id}${nv === 'normal' ? '' : `-${nv}`}`;
const secDe = (J) => J.seccion ?? 'cartas';
const secP = () => (p.J ? secDe(p.J) : p.seccion ?? 'cartas');
// La página de la sección a la que se vuelve.
const salirA = (seccion) => (seccion === 'dados' ? abrirDados : abrirCartas)();
const volver = () => salirA(secP());
const pant = (marcador, tapete, botones, aviso = '') => pantalla(marcador, tapete, botones, aviso, secP());

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
  credito: ES.CREDITO,
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
export const JUEGOS_MESA_CARTAS = [OCHO, ESCOBA, CARIOCA, BURAKO, CHINCHON, GENERALA, CACHO];
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
export function naipeEs(c) {
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
  const niveles = J.niveles ?? ['normal', 'dificil'];
  if (!niveles.includes(nivel)) nivel = 'normal';
  const maxLocal = J.maxLocal ?? 2;
  if (locales > maxLocal) locales = 2;
  for (const nv of niveles) {
    const r = leerJSON(claveRecord(J.id, nv, secDe(J)));
    if (r.partidas) partes.push(el('p', 'sin-datos', `Contra la máquina (${NIVELES[nv]}): ${r.ganadas} de ${r.partidas} ganadas`));
  }
  partes.push(el('h3', 'categoria', '🤖 Contra la máquina'));
  partes.push(fila('Nivel', niveles.map((nv) => [NIVELES[nv], NIVELES[nv], nv === nivel, () => (nivel = nv)])));
  const cuantas = J.maquinas ?? Array.from({ length: J.maxMaquinas }, (_, i) => [i + 1, `${i + 1} 🤖`]);
  if (!cuantas.some(([k]) => k === maquinas)) maquinas = cuantas[0][0];
  if (cuantas.length > 1) partes.push(fila('Cuántas máquinas', cuantas.map(([k, texto]) => [texto, `${k} ${k > 1 ? 'máquinas' : 'máquina'}`, k === maquinas, () => (maquinas = k)])));
  partes.push(boton('▶ Jugar contra la máquina', 'color', () => empezar(J, 'maquina', maquinas + 1)), el('h3', 'categoria', maxLocal > 2 ? '📱 En este celular' : '📱 Dos en este celular'));
  if (maxLocal > 2) partes.push(fila('Cuántos juegan', Array.from({ length: maxLocal - 1 }, (_, i) => [i + 2, `${i + 2} jugadores`, i + 2 === locales, () => (locales = i + 2)])));
  partes.push(boton(maxLocal > 2 ? '▶ Jugar (pasándose el celular)' : '▶ Jugar a dos (pasándose el celular)', '', () => empezar(J, 'local', locales)), el('h3', 'categoria', '👥 Contra un amigo'));
  const amigos = el('div', 'opciones-duelo');
  partes.push(amigos);
  pantalla([], partes, [boton('Volver', '', () => salirA(secDe(J)))], '', secDe(J));
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

// En la página de Cartas o de Dados: las partidas con amigos de los juegos de esa sección.
export const pintarPartidasCartas = () => pintarPartidas('cartas');
export async function pintarPartidas(seccion) {
  const caja = $(`${seccion}-partidas`);
  if (!E.usuario || !E.nube?.hayEstados()) return caja.replaceChildren();
  try {
    const filas = (await misPartidas()).filter(({ mesa }) => juegoDe(mesa.juego) && secDe(juegoDe(mesa.juego)) === seccion);
    if (!filas.length) return caja.replaceChildren();
    caja.replaceChildren(el('h3', 'categoria', '👥 Tus partidas con amigos'), ...filas.slice(0, 12).map(({ id, mesa, info }) => {
      const J = juegoDe(mesa.juego);
      const resultado = resultadoMesa(mesa, mesa.jugadores.x === E.usuario.uid ? 'x' : 'o');
      let detalle = mesa.jugadores[mesa.estado.turno] === E.usuario.uid ? '▶ Tu turno' : `⏳ Turno de ${info.nombreRival}`;
      if (resultado) detalle = { v: '🏆 Ganaste', d: 'Perdiste', e: '🤝 Empate' }[resultado];
      const b = el('button', `fila-duelo ${resultado ? `resultado-${resultado}` : detalle.startsWith('▶') ? 'tu-turno' : ''}`);
      b.append(el('span', '', `${J.icono} ${J.nombre} vs ${info.nombreRival}`), el('small', '', detalle));
      b.onclick = () => abrirAmigo(id, seccion);
      return b;
    }));
  } catch {
    caja.replaceChildren(el('p', 'sin-datos', 'No se pudieron cargar tus partidas (¿sin conexión?).'));
  }
}

// --- Partida ---

function empezar(J, modo, n) {
  pararPartida();
  const nombres = modo === 'local' ? Array.from({ length: n }, (_, i) => `Jugador ${i + 1}`) : J.nombres?.(n) ?? ['Tú', ...Array.from({ length: n - 1 }, (_, i) => (n > 2 ? `🤖 Máquina ${i + 1}` : '🤖 Máquina'))];
  p = { J, modo, nivel, e: J.nueva(n), yo: 0, nombres, vista: null, visto: 0, apuntada: false };
  alSalir(pararPartida);
  pintar();
}

async function retarAmigo(J, amigo) {
  if (!(await asegurarDuelista())) return;
  try {
    const justo = J.amigo ? await AMIGO.crear(J.amigo.M) : null;
    const e = justo?.e ?? J.nueva(2);
    const id = await E.nube.crearMesa({
      juego: J.id,
      jugadores: { x: E.usuario.uid, o: amigo.uid },
      nombres: { [E.usuario.uid]: leer('nube:apodo'), [amigo.uid]: amigo.apodo },
      estado: justo ? AMIGO.aNube(e) : { turno: FICHA[e.turno], datos: JSON.stringify(e) },
    });
    if (justo) AMIGO.guardarNueva(id, justo.mio);
    abrirAmigo(id, secDe(J));
  } catch {
    $('cartas-aviso').textContent = `No se pudo crear la partida. ¿${amigo.apodo} sigue siendo tu amigo y hay conexión?`;
  }
}

async function abrirAmigo(id, seccion = 'cartas') {
  if (!(await asegurarDuelista())) return;
  pararPartida();
  p = { modo: 'amigo', id, seccion, e: null, visto: 0, apuntada: false };
  alSalir(pararPartida);
  pant([], [el('p', 'sin-datos', 'Cargando la partida…')], [boton('Volver', '', volver)]);
  p.dejar = E.nube.verMesa(id, (mesa) => {
    if (p?.id !== id) return;
    if (!mesa) return pant([], [el('p', 'sin-datos', 'Esta partida ya no existe.')], [boton('Volver', '', volver)]);
    const yo = mesa.jugadores.x === E.usuario.uid ? 0 : 1;
    const nombre = (i) => (i === yo ? 'Tú' : mesa.nombres?.[mesa.jugadores[FICHA[i]]] ?? 'Rival');
    const primera = !p.e;
    const J = juegoDe(mesa.juego);
    if (J?.amigo) {
      // Dados con un amigo: se revisa y se escribe lo automático antes de pintar.
      const q = p;
      Object.assign(q, { J, yo, nombres: [nombre(0), nombre(1)] });
      AMIGO.alCambiar(q, mesa);
      if (primera && q.e) q.visto = q.e.resumen?.ronda ?? 0;
      return AMIGO.correr(q, J.amigo, () => p === q && q.dejar !== null, pintar);
    }
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
// 'empate' (la Generala) termina la partida sin ganador.
const ganador = () => (p.modo === 'amigo' && p.mesa?.ganador ? (p.mesa.ganador === 'empate' ? 'empate' : FICHA.indexOf(p.mesa.ganador)) : p.e.ganador);

function actuar(nuevo) {
  if (p.modo === 'amigo' && p.J.amigo) {
    const q = p;
    return sonar(AMIGO.jugar(q, q.J.amigo, nuevo, () => p === q && q.dejar !== null, pintar) ? 'tic' : 'fallo');
  }
  if (!nuevo) return sonar('fallo');
  p.e = nuevo;
  sonar('tic');
  if (p.modo === 'amigo') {
    const g = nuevo.ganador;
    E.nube.jugarMesa(p.id, { turno: FICHA[nuevo.turno], datos: JSON.stringify(nuevo) }, g === null ? null : g === 'empate' ? 'empate' : FICHA[g]).catch(() => {
      $('cartas-aviso').textContent = 'No se pudo enviar la jugada (¿sin conexión?).';
    });
  }
  pintar();
}

function pintar() {
  clearTimeout(p.timer);
  const { J } = p;
  const justo = p.modo === 'amigo' && J.amigo; // dados con un amigo
  if (justo && !p.e) return pant([], [el('p', 'sin-datos', 'Esta partida tiene datos dañados.')], [boton('Volver', '', volver)]);
  const e = justo ? J.amigo.vista(p) : p.e;
  const g = ganador();
  // (con los dados, el final se muestra cuando terminó la revisión de trampas)
  if (g !== null && (g >= 0 || g === 'empate') && !(justo && p.trampaRival === undefined)) return pintarFin(g);
  if (e.resumen && e.resumen.ronda > p.visto) return pintarResumen();
  // A dos en un celular: antes de cada turno, una pantalla para pasarlo sin ver las cartas del otro.
  if (p.modo === 'local' && p.vista !== e.turno) {
    return pant([], [el('p', 'turno-trivia', `📱 Turno de ${p.nombres[e.turno]}`), el('p', 'sin-datos', 'Pásale el celular. Toca cuando esté listo.')], [
      boton(J.verTexto ?? '👀 Ver mis cartas', 'color', () => {
        p.vista = e.turno;
        pintar();
      }),
      boton('Salir', '', salirMesa),
    ]);
  }
  const quien = p.modo === 'local' ? e.turno : p.yo;
  const humano = p.modo !== 'maquina' || e.turno === p.yo;
  const vista = J.pintar(e, quien, justo ? AMIGO.puedo(p) : humano && e.turno === quien, actuar, { nombres: p.nombres, repintar: pintar, nivel: p.modo === 'maquina' ? p.nivel : null });
  const botones = [...vista.botones];
  if (p.modo === 'amigo') botones.push(boton('🏳️ Rendirse', '', rendirse));
  botones.push(boton('Salir', '', salirMesa));
  let aviso = '';
  if (justo) aviso = p.trampaRival ? '⚠️ Tu rival hizo trampa' : p.sinSemilla ? 'No tienes tu semilla de esta partida en este celular. Solo puedes rendirte.' : p.aviso ?? (e.ganador !== null && e.ganador !== undefined ? '🔎 Revisando los dados…' : '');
  pant(vista.marcador, vista.tapete, botones, aviso);
  $('cartas-tapete').className = 'tapete-mesa';
  if (!humano) p.timer = setTimeout(() => actuar(J.maquina(p.e, p.nivel)), J.pausa ?? 900);
}

async function rendirse() {
  const seguro = await preguntar({ titulo: '🏳️ Rendirse', texto: 'Perderás esta partida.', boton: 'Rendirse' });
  if (seguro) E.nube.rendirseMesa(p.id, E.usuario.uid, FICHA[1 - p.yo]).catch(() => {});
}

// Nombres de quienes tienen puntos (los jugadores o, si el juego es por equipos, los equipos); `ganador` es uno de esos índices.
const conPuntos = () => p.J.equipos?.(p.nombres) ?? p.nombres;

const tablaPuntos = (e) => {
  const lista = el('ul', 'puntos-cartas');
  (p.J.puntos?.(e) ?? e.puntos).map((pts, i) => [pts, i]).sort((a, b) => (p.J.menosGana ? a[0] - b[0] : b[0] - a[0])).forEach(([pts, i]) => lista.append(el('li', '', `${conPuntos()[i]}: ${pts}`)));
  return lista;
};

// Contra la máquina o a dos en un celular, la partida solo vive aquí: salir (o atrás) la pierde, así que se pregunta.
async function salirMesa() {
  if (p.modo === 'amigo' || (await preguntar({ titulo: '¿Salir de la partida?', texto: 'Se perderá la partida en curso.', boton: 'Salir' }))) volver();
}

function pintarResumen() {
  const { e } = p;
  const r = e.resumen;
  pant([el('span', '', `${p.J.icono} Ronda ${r.ronda}`), el('span', '', p.J.metaTexto?.(e) ?? `Meta ${p.J.meta(e)}`)], [...p.J.resumen(e, p.nombres), tablaPuntos(e)], [boton('▶ Seguir', 'color', () => {
    p.visto = r.ronda;
    p.vista = null;
    pintar();
  }), boton('Salir', '', salirMesa)]);
}

function pintarFin(g) {
  const trampa = !!p.trampaRival; // dados con un amigo: cuenta como victoria mía
  const empate = g === 'empate' && !trampa;
  const gane = trampa || (!empate && (p.modo === 'local' || g === p.yo));
  if (!p.apuntada) {
    p.apuntada = true;
    if (p.modo === 'maquina') {
      const r = leerJSON(claveRecord(p.J.id, p.nivel, secP()));
      guardar(claveRecord(p.J.id, p.nivel, secP()), JSON.stringify({ partidas: (r.partidas ?? 0) + 1, ganadas: (r.ganadas ?? 0) + (gane ? 1 : 0) }));
    }
    if (p.modo === 'amigo') {
      apuntarResultadoAmigo(p.id, empate ? 'e' : gane ? 'v' : 'd', secP());
      if (p.J.amigo) AMIGO.borrarMio(p.id); // la semilla ya no hace falta
    } else {
      ligaAnotar('partida', 1, secP());
      if (p.modo === 'maquina' && gane) anotarPerfil('victoria', 1, secP());
      finDePartida();
    }
    if (gane) {
      confeti();
      sonar('record');
    }
  }
  const rendido = p.mesa?.rendido?.[E.usuario?.uid];
  const titulo = trampa ? '⚠️ Tu rival hizo trampa: cuenta como victoria tuya' : empate ? '🤝 Empate' : p.modo === 'local' || g !== p.yo ? (rendido ? 'Te rendiste.' : `🏆 Gana ${conPuntos()[g]}`) : '🏆 ¡Ganaste!';
  pant([el('span', '', `${p.J.icono} ${p.J.nombre}`)], [el('p', 'turno-trivia', titulo), tablaPuntos(p.e)], [
    boton(p.modo === 'amigo' ? '🔄 Revancha' : '🔄 Otra partida', 'color', () => {
      if (p.modo !== 'amigo') return empezar(p.J, p.modo, p.e.n);
      const rival = p.mesa.jugadores[FICHA[1 - p.yo]];
      retarAmigo(p.J, { uid: rival, apodo: p.mesa.nombres?.[rival] ?? 'Rival' });
    }),
    boton('Volver', '', volver),
  ]);
}
