// 🃏 Cartas: la página de la sección, el 🂡 Solitario, el 🃏 21 y el 🎴 Bacará (reglas en games/solitario.js, veintiuno.js y bacara.js).
// El 21 y el Bacará comparten las fichas (`cartas:fichas`). Récords en `cartas:` (se copian a la nube); la partida de solitario a medias, solo en este celular (`solitario-partida`).
import { el, leer, guardar } from '../games/comun.js';
import { sonar } from '../games/efectos.js';
import { esRoja, VALORES, PALOS } from '../games/cartas.js';
import * as S from '../games/solitario.js';
import * as V from '../games/veintiuno.js';
import * as B from '../games/bacara.js';
import { leerJSON } from './datos.js';
import { $, mostrar, confeti, preguntar } from './ui.js';
import { ligaAnotar } from './liga.js';
import { abrirJuegoMesa, pintarPartidasCartas } from './cartas-mesa.js';

export const JUEGOS_CARTAS = 4; // para la cuenta del inicio
const NOMBRE_PALO = { '♠': 'picas', '♥': 'corazones', '♦': 'diamantes', '♣': 'tréboles' };
const NOMBRE_VALOR = { 1: 'As', 11: 'J', 12: 'Q', 13: 'K' };
const reloj = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

let parar = null; // lo que hay que apagar al salir de la partida (el reloj del solitario, la máquina o la mesa con un amigo)
export function pararCartas() {
  parar?.();
  parar = null;
}
export const alSalir = (fn) => (parar = fn);

export const boton = (texto, clase, alPulsar) => {
  const b = el('button', clase, texto);
  if (clase.includes('color')) b.style.setProperty('--c', 'var(--rojo)');
  b.onclick = alPulsar;
  return b;
};

// Una carta: boca arriba (valor y palo en las esquinas y al centro) o boca abajo (dorso).
export function naipe(c, arriba = true) {
  const n = el('button', 'naipe');
  if (!arriba) {
    n.classList.add('dorso');
    n.setAttribute('aria-label', 'Carta boca abajo');
    n.tabIndex = -1;
    return n;
  }
  if (esRoja(c)) n.classList.add('roja');
  const v = VALORES[c.v - 1];
  n.append(el('span', 'esquina', `${v}${c.p}`), el('span', 'centro', c.p));
  n.setAttribute('aria-label', `${NOMBRE_VALOR[c.v] ?? c.v} de ${NOMBRE_PALO[c.p]}`);
  return n;
}

const hueco = (texto = '') => {
  const h = el('div', 'hueco-carta', texto);
  h.setAttribute('aria-hidden', 'true');
  return h;
};

// --- Página de la sección ---

export function abrirCartas() {
  mostrar('cartas');
  pintarPartidasCartas();
  const tarjeta = (icono, nombre, alPulsar) => {
    const b = boton('', 'tarjeta color', alPulsar);
    b.append(el('span', 'icono', icono), el('span', '', nombre));
    return b;
  };
  $('cartas-juegos').replaceChildren(tarjeta('🂡', 'Solitario', abrirSolitario), tarjeta('🃏', '21', abrir21), tarjeta('🎴', 'Bacará', abrirBacara), tarjeta('🎱', 'Ocho locos', () => abrirJuegoMesa('ocho')));
  const filas = [];
  const r = leerJSON('cartas:solitario');
  for (const robo of ['1', '3']) {
    const x = r[robo];
    if (x?.partidas) filas.push(`🂡 De a ${robo}: ${x.ganadas} de ${x.partidas} ganadas${x.ganadas ? ` · mejor ${reloj(x.tiempo)} · ${x.movimientos} movimientos` : ''}`);
  }
  const ocho = leerJSON('cartas:ocho');
  if (ocho.partidas) filas.push(`🎱 Ocho locos: ${ocho.ganadas} de ${ocho.partidas} ganadas contra la máquina`);
  const casino = { '🃏 21': leerJSON('cartas:21'), '🎴 Bacará': leerJSON('cartas:bacara') };
  for (const [nombre, x] of Object.entries(casino)) if (x.manos) filas.push(`${nombre}: ${x.ganadas} de ${x.manos} manos ganadas`);
  if (casino['🃏 21'].manos || casino['🎴 Bacará'].manos) filas.push(`🪙 Fichas: ${leerFichas().fichas} · récord ${leerFichas().max}`);
  $('cartas-records').replaceChildren(...(filas.length ? [el('h3', 'categoria', 'Tus récords'), ...filas.map((t) => el('p', 'sin-datos', t))] : []));
}

export const pantalla = (marcador, tapete, botones, aviso = '') => {
  mostrar('cartas-juego');
  $('cartas-marcador').replaceChildren(...marcador);
  $('cartas-tapete').replaceChildren(...tapete);
  $('cartas-aviso').textContent = aviso;
  $('cartas-botones').replaceChildren(...botones);
};

// --- 🂡 Solitario ---

// Partida: { e (estado), historia: [estados anteriores], segundos }
let sol = null;
const guardarSol = () => guardar('solitario-partida', sol ? JSON.stringify(sol) : '');

function abrirSolitario() {
  try {
    sol = JSON.parse(leer('solitario-partida'));
  } catch {
    sol = null;
  }
  if (sol?.e?.columnas && !S.ganado(sol.e)) return jugarSolitario();
  sol = null;
  pantalla([], [el('h2', '', '🂡 Solitario'), el('p', '', 'Ordena las cartas en las 4 pilas, del As al Rey de cada palo. En las columnas, de mayor a menor alternando rojo y negro.')], [
    boton('De a 1 (más fácil)', 'color', () => nuevoSolitario(1)),
    boton('De a 3 (clásico)', 'color', () => nuevoSolitario(3)),
    boton('Volver', '', abrirCartas),
  ], '¿Cuántas cartas robas del mazo cada vez?');
}

function apuntarSol(cambiar) {
  const r = leerJSON('cartas:solitario');
  const k = String(sol.e.robo);
  r[k] = { partidas: 0, ganadas: 0, ...r[k] };
  cambiar(r[k]);
  guardar('cartas:solitario', JSON.stringify(r));
}

function nuevoSolitario(robo) {
  sol = { e: S.repartir(robo), historia: [], segundos: 0 };
  apuntarSol((x) => x.partidas++);
  jugarSolitario();
}

async function otraSolitario() {
  if (sol && !S.ganado(sol.e) && sol.e.movimientos) {
    const si = await preguntar({ titulo: '¿Empezar otra?', texto: 'Dejarás esta partida sin terminar.', boton: 'Sí, otra' });
    if (!si) return;
  }
  sol = null;
  guardarSol();
  abrirSolitario();
}

function jugarSolitario() {
  pararCartas();
  const tic = setInterval(() => {
    if (S.ganado(sol.e)) return;
    sol.segundos++;
    const t = document.getElementById('sol-tiempo');
    if (t) t.textContent = `⏱ ${reloj(sol.segundos)}`;
  }, 1000);
  parar = () => {
    clearInterval(tic);
    guardarSol();
  };
  pintarSolitario();
}

function jugada(nuevo) {
  if (!nuevo) return false;
  sol.historia.push(sol.e);
  sol.e = nuevo;
  sonar('tic');
  if (S.ganado(nuevo)) ganarSolitario();
  guardarSol();
  pintarSolitario();
  return true;
}

function ganarSolitario() {
  apuntarSol((x) => {
    x.ganadas++;
    x.tiempo = Math.min(x.tiempo ?? Infinity, sol.segundos);
    x.movimientos = Math.min(x.movimientos ?? Infinity, sol.e.movimientos);
  });
  ligaAnotar('partida');
  sonar('record');
  confeti();
}

export const temblar = (n) => {
  n.classList.remove('tiembla');
  void n.offsetWidth; // vuelve a empezar la animación
  n.classList.add('tiembla');
};

function pintarSolitario(pistaVista = null) {
  const e = sol.e;
  const ganada = S.ganado(e);
  // Fila de arriba: mazo, descarte, un hueco y las 4 pilas. Debajo, las 7 columnas.
  const arriba = el('div', 'fila-solitario');
  const mazo = e.mazo.length ? naipe(null, false) : el('button', 'hueco-carta', e.descarte.length ? '↻' : '');
  mazo.classList.add('mazo');
  mazo.tabIndex = 0;
  mazo.setAttribute('aria-label', e.mazo.length ? `Mazo: robar (quedan ${e.mazo.length})` : 'Dar vuelta el descarte');
  mazo.onclick = () => jugada(S.robar(e));
  const descarte = el('div', 'descarte');
  const vistas = e.descarte.slice(e.robo === 3 ? -3 : -1);
  vistas.forEach((c, i) => {
    const n = naipe(c);
    n.style.left = `${i * 22}%`;
    if (i === vistas.length - 1) carta(n, { de: 'descarte' });
    else n.tabIndex = -1;
    descarte.append(n);
  });
  arriba.append(mazo, descarte, el('div'));
  e.pilas.forEach((pila, i) => {
    const caja = el('div', 'pila');
    caja.dataset.destino = `pila:${i}`;
    caja.append(hueco(PALOS[i]));
    if (pila.length) caja.append(carta(naipe(pila.at(-1)), { de: 'pila', i }));
    arriba.append(caja);
  });
  const abajo = el('div', 'columnas-solitario');
  e.columnas.forEach((col, i) => {
    const caja = el('div', 'columna');
    caja.dataset.destino = `col:${i}`;
    caja.append(hueco());
    let top = 0;
    col.forEach((c, k) => {
      const n = c.a ? carta(naipe(c), { de: 'col', i, k }) : naipe(c, false);
      n.style.top = `${top}px`;
      top += c.a ? 22 : 9;
      caja.append(n);
    });
    caja.style.height = `calc(${top}px + var(--alto-naipe))`;
    abajo.append(caja);
  });

  if (pistaVista) marcarPista(arriba, abajo, pistaVista);
  const botones = [boton('↩️ Deshacer', '', deshacer), boton('💡 Pista', '', pista)];
  if (S.puedeTerminar(e) && !ganada) botones.push(boton('✨ Terminar solo', 'color', () => jugada(S.terminar(e))));
  botones.push(boton('🔄 Otra', '', otraSolitario), boton('Salir', '', abrirCartas));
  botones[0].disabled = !sol.historia.length || ganada;
  botones[1].disabled = ganada;
  const marcador = [el('span', '', `🂡 De a ${e.robo}`), el('span', '', `${e.movimientos} ${e.movimientos === 1 ? 'movimiento' : 'movimientos'}`)];
  const tiempo = el('span', '', `⏱ ${reloj(sol.segundos)}`);
  tiempo.id = 'sol-tiempo';
  marcador.splice(1, 0, tiempo);
  pantalla(marcador, [arriba, abajo], botones, ganada ? `🎉 ¡Ganaste en ${reloj(sol.segundos)} con ${e.movimientos} movimientos!` : '');
  $('cartas-tapete').className = 'tapete-solitario';
}

function deshacer() {
  if (!sol.historia.length) return;
  sol.e = sol.historia.pop();
  guardarSol();
  pintarSolitario();
}

function pista() {
  const p = S.pista(sol.e);
  if (!p) return ($('cartas-aviso').textContent = 'No quedan jugadas: prueba a deshacer o empieza otra.');
  pintarSolitario(p);
}

// Ilumina el origen y el destino de la pista (o el mazo, si toca robar).
function marcarPista(arriba, abajo, p) {
  if (p.robar) return arriba.querySelector('.mazo').classList.add('pista');
  const { o, d } = p;
  const origen = o.de === 'descarte' ? arriba.querySelector('.descarte').lastChild
    : o.de === 'pila' ? arriba.querySelectorAll('.pila')[o.i].lastChild
      : abajo.children[o.i].children[o.k + 1]; // +1: el hueco va primero
  origen?.classList.add('pista');
  const destino = d.a === 'pila' ? arriba.querySelectorAll('.pila')[d.i] : abajo.children[d.i];
  (destino.lastChild ?? destino).classList.add('pista');
  if (o.de === 'col') for (const n of [...abajo.children[o.i].children].slice(o.k + 2)) n.classList.add('pista');
}

// Una carta que se puede jugar: un toque la manda al mejor lugar; también se arrastra (con las que tiene encima).
function carta(n, o) {
  n.classList.add('jugable');
  let arrastre = null;
  n.onclick = () => {
    if (arrastre?.movido) return (arrastre = null);
    const d = S.destinoMejor(sol.e, o);
    if (!d || !jugada(S.mover(sol.e, o, d))) {
      temblar(n);
      sonar('fallo');
    }
  };
  n.onpointerdown = (ev) => {
    if (ev.button) return;
    const grupo = o.de === 'col' ? [...n.parentNode.children].slice(o.k + 1) : [n];
    arrastre = { x: ev.clientX, y: ev.clientY, grupo, movido: false };
    try {
      n.setPointerCapture(ev.pointerId);
    } catch {
      // sin captura el arrastre igual funciona mientras el dedo siga encima
    }
  };
  n.onpointermove = (ev) => {
    if (!arrastre) return;
    const dx = ev.clientX - arrastre.x;
    const dy = ev.clientY - arrastre.y;
    if (!arrastre.movido && Math.hypot(dx, dy) < 8) return;
    arrastre.movido = true;
    for (const g of arrastre.grupo) {
      g.classList.add('arrastrando');
      g.style.translate = `${dx}px ${dy}px`;
    }
  };
  n.onpointerup = (ev) => {
    if (!arrastre?.movido) return;
    for (const g of arrastre.grupo) g.style.visibility = 'hidden';
    const sitio = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-destino]');
    for (const g of arrastre.grupo) g.style.visibility = '';
    const [a, i] = sitio?.dataset.destino.split(':') ?? [];
    if (!a || !jugada(S.mover(sol.e, o, { a, i: Number(i) }))) {
      pintarSolitario();
      if (a) sonar('fallo');
    }
  };
  n.onpointercancel = () => {
    arrastre = null;
    pintarSolitario();
  };
  return n;
}

// --- Fichas de casino (21 y Bacará) ---

// `cartas:fichas` = { fichas, max }; la primera vez salen de las que había en el 21.
function leerFichas() {
  const v = leerJSON('cartas:21');
  return { fichas: v.fichas ?? 100, max: v.max ?? 100, ...leerJSON('cartas:fichas') };
}
// Guarda las fichas en su clave y el resto del juego en la suya.
function guardarCasino(clave, j) {
  const { fichas, max, ...resto } = j;
  guardar(clave, JSON.stringify(resto));
  guardar('cartas:fichas', JSON.stringify({ fichas, max }));
}

const marcadorFichas = (j) => [el('span', '', `🪙 ${j.fichas} fichas`), el('span', '', `Récord ${j.max}`)];

// Apostar. `j` lleva { fichas, apuesta }; `cabeza`: lo que va antes de las fichas; `repartir()` juega la mano
// (con la apuesta ya descontada); `guardarJ` guarda y `repintar` vuelve a dibujar.
function pintarApuesta(j, cabeza, repartir, guardarJ, repintar) {
  const apuesta = Math.min(j.apuesta, j.fichas - (j.fichas % 5)) || 0;
  j.apuesta = apuesta;
  if (j.fichas < 5) {
    return pantalla(marcadorFichas(j), [cabeza[0], el('p', '', 'Te quedaste sin fichas.')], [
      boton('🏦 La casa te presta 100', 'color', () => {
        j.fichas += 100;
        j.apuesta = 10;
        guardarJ();
        repintar();
      }),
      boton('Salir', '', abrirCartas),
    ]);
  }
  const fichas = el('div', 'fichas-21');
  for (const f of [5, 10, 25, 50]) {
    const b = boton(String(f), `ficha f${f}`, () => {
      j.apuesta += f;
      repintar();
    });
    b.disabled = apuesta + f > j.fichas;
    b.setAttribute('aria-label', `Apostar ${f} más`);
    fichas.append(b);
  }
  const jugar = boton('🃏 Repartir', 'color', () => {
    j.fichas -= apuesta;
    repartir();
    sonar('tic');
    guardarJ();
    repintar();
  });
  jugar.disabled = !apuesta;
  pantalla(marcadorFichas(j), [...cabeza, el('p', 'apuesta-21', `Apuesta: ${apuesta}`), fichas], [
    jugar,
    boton('Borrar', '', () => {
      j.apuesta = 0;
      repintar();
    }),
    boton('Salir', '', abrirCartas),
  ]);
  $('cartas-tapete').className = 'tapete-21';
}

// Al acabar una mano: cobrar, récords y liga (cada 5 manos, +1 partida). `j`: { fichas, max, manos, ganadas }.
function cerrarMano(j, cobro, apostado) {
  j.fichas += cobro;
  j.max = Math.max(j.max, j.fichas);
  j.manos++;
  if (cobro > apostado) {
    j.ganadas++;
    sonar('acierto');
  }
  if (j.manos % 5 === 0) ligaAnotar('partida');
}

const textoCobro = (cobro, apostado) => (cobro > apostado ? `Ganas ${cobro - apostado} fichas` : cobro === apostado ? 'Recuperas tu apuesta' : `Pierdes ${apostado - cobro} fichas`);

function filaCartas(titulo, cartas, ocultas = 0, clase = '') {
  const caja = el('div', `mano-21 ${clase}`);
  const fila = el('div', 'cartas-21');
  cartas.forEach((c, i) => {
    const n = naipe(c, i < cartas.length - ocultas);
    n.tabIndex = -1;
    fila.append(n);
  });
  caja.append(el('p', '', titulo), fila);
  return caja;
}

// --- 🃏 21 ---

// Guardado (`cartas:21`): { manos, ganadas, apuesta (la última), mano (en curso o null), zapato }
let b21 = null;
const guardar21 = () => guardarCasino('cartas:21', b21);
const apostado21 = (m) => m.manos.reduce((s, x) => s + x.apuesta, 0);
const cerrar21 = () => b21.mano.fin && cerrarMano(b21, V.cobro(b21.mano), apostado21(b21.mano));

function abrir21() {
  pararCartas();
  b21 = { manos: 0, ganadas: 0, apuesta: 10, mano: null, zapato: [], ...leerJSON('cartas:21'), ...leerFichas() };
  pintar21();
}

const textoPuntos = (cartas) => {
  const p = V.puntos(cartas);
  return p.total > 21 ? `${p.total} 💥` : p.blanda && p.total < 21 ? `${p.total - 10} / ${p.total}` : String(p.total);
};

function pintar21() {
  const { fichas, mano: m } = b21;
  if (!m) {
    const cabeza = [el('h2', '', '🃏 21'), el('p', '', 'Acércate a 21 sin pasarte y gánale a la banca. La banca pide hasta 17.')];
    return pintarApuesta(b21, cabeza, () => {
      b21.mano = V.repartir(b21.zapato, b21.apuesta);
      b21.zapato = [];
      cerrar21();
    }, guardar21, pintar21);
  }
  const tapete = [filaCartas(m.fin ? `Banca: ${textoPuntos(m.banca)}` : 'Banca', m.banca, m.fin ? 0 : 1, 'banca')];
  m.manos.forEach((mano, i) => {
    const res = m.fin ? ` · ${{ blackjack: '🎉 ¡21!', gana: '✅ Ganas', empate: '🤝 Empate', pierde: '❌ Pierdes' }[V.resultado(m, mano)]}` : '';
    const nombre = m.manos.length > 1 ? `Mano ${i + 1}` : 'Tú';
    tapete.push(filaCartas(`${nombre}: ${textoPuntos(mano.cartas)} · apuesta ${mano.apuesta}${res}`, mano.cartas, 0, !m.fin && i === m.actual ? 'actual' : ''));
  });
  if (m.fin) {
    pantalla(marcadorFichas(b21), tapete, [boton('🃏 Otra mano', 'color', otraMano), boton('Salir', '', abrirCartas)], textoCobro(V.cobro(m), apostado21(m)));
  } else {
    const jugar = (f) => () => {
      b21.mano = f(b21.mano);
      cerrar21();
      sonar('tic');
      guardar21();
      pintar21();
    };
    const pagar = (f) => () => {
      b21.fichas -= b21.mano.manos[b21.mano.actual].apuesta;
      jugar(f)();
    };
    const doblar = boton('Doblar', '', pagar(V.doblar));
    const separar = boton('Separar', '', pagar(V.separar));
    doblar.disabled = !V.puedeDoblar(m, fichas);
    separar.disabled = !V.puedeSeparar(m, fichas);
    pantalla(marcadorFichas(b21), tapete, [boton('Pedir', 'color', jugar(V.pedir)), boton('Plantarse', 'color', jugar(V.plantarse)), doblar, separar]);
  }
  $('cartas-tapete').className = 'tapete-21';
}

function otraMano() {
  b21.zapato = b21.mano.zapato;
  b21.mano = null;
  guardar21();
  pintar21();
}

// --- 🎴 Bacará ---

// Guardado (`cartas:bacara`): { manos, ganadas, apuesta, a (a quién se apuesta), zapato }
let bac = null;
let ultimaBac = null; // la mano recién ultimaBac, para mostrarla
const QUIEN = { jugador: '🙋 Jugador', banca: '🏦 Banca', empate: '🤝 Empate' };
const guardarBac = () => guardarCasino('cartas:bacara', bac);

function abrirBacara() {
  pararCartas();
  bac = { manos: 0, ganadas: 0, apuesta: 10, a: 'jugador', zapato: [], ...leerJSON('cartas:bacara'), ...leerFichas() };
  ultimaBac = null;
  pintarBacara();
}

function pintarBacara() {
  if (ultimaBac) {
    const { mano, a, apuesta } = ultimaBac;
    const clase = (quien) => (mano.ganador === quien ? 'gana' : '');
    pantalla(marcadorFichas(bac), [
      filaCartas(`${QUIEN.jugador}: ${B.punto(mano.jugador)}`, mano.jugador, 0, clase('jugador')),
      filaCartas(`${QUIEN.banca}: ${B.punto(mano.banca)}`, mano.banca, 0, clase('banca')),
      ...mano.motivos.map((t) => el('p', 'motivo', t)),
      el('p', 'apuesta-21', mano.ganador === 'empate' ? '🤝 Empate' : `Gana ${mano.ganador === 'jugador' ? 'el Jugador' : 'la Banca'}`),
    ], [
      boton('🎴 Otra mano', 'color', () => {
        ultimaBac = null;
        pintarBacara();
      }),
      boton('Salir', '', abrirCartas),
    ], `Apostaste ${apuesta} a ${QUIEN[a]}. ${textoCobro(B.cobro(apuesta, a, mano.ganador), apuesta)}`);
    $('cartas-tapete').className = 'tapete-21';
    return;
  }
  const quien = el('div', 'opciones-ajuste');
  quien.setAttribute('role', 'group');
  quien.setAttribute('aria-label', '¿A quién apuestas?');
  for (const k of Object.keys(QUIEN)) {
    const b = boton(QUIEN[k], '', () => {
      bac.a = k;
      guardarBac();
      pintarBacara();
    });
    b.setAttribute('aria-pressed', String(bac.a === k));
    quien.append(b);
  }
  const cabeza = [
    el('h2', '', '🎴 Bacará'),
    el('p', '', 'Gana la mano que más se acerque a 9. Paga: Jugador 1 a 1 · Banca 1 a 1 menos 5 % · Empate 8 a 1.'),
    quien,
  ];
  pintarApuesta(bac, cabeza, () => {
    const mano = B.jugar(bac.zapato);
    bac.zapato = mano.zapato;
    ultimaBac = { mano: { ...mano, zapato: null }, a: bac.a, apuesta: bac.apuesta };
    cerrarMano(bac, B.cobro(bac.apuesta, bac.a, mano.ganador), bac.apuesta);
  }, guardarBac, pintarBacara);
}
