// 🃏 Cartas: la página de la sección, el 🂡 Solitario y el 🃏 21. Las reglas están en games/solitario.js y games/veintiuno.js.
// Récords en `cartas:` (se copian a la nube); la partida de solitario a medias, solo en este celular (`solitario-partida`).
import { el, leer, guardar } from '../games/comun.js';
import { sonar } from '../games/efectos.js';
import { esRoja, VALORES, PALOS } from '../games/cartas.js';
import * as S from '../games/solitario.js';
import * as V from '../games/veintiuno.js';
import { leerJSON } from './datos.js';
import { $, mostrar, confeti, preguntar } from './ui.js';
import { ligaAnotar } from './liga.js';

export const JUEGOS_CARTAS = 2; // para la cuenta del inicio
const NOMBRE_PALO = { '♠': 'picas', '♥': 'corazones', '♦': 'diamantes', '♣': 'tréboles' };
const NOMBRE_VALOR = { 1: 'As', 11: 'J', 12: 'Q', 13: 'K' };
const reloj = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

let parar = null; // lo que hay que apagar al salir de la partida (el reloj del solitario)
export function pararCartas() {
  parar?.();
  parar = null;
}

const boton = (texto, clase, alPulsar) => {
  const b = el('button', clase, texto);
  if (clase.includes('color')) b.style.setProperty('--c', 'var(--rojo)');
  b.onclick = alPulsar;
  return b;
};

// Una carta: boca arriba (valor y palo en las esquinas y al centro) o boca abajo (dorso).
function naipe(c, arriba = true) {
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
  const tarjeta = (icono, nombre, alPulsar) => {
    const b = boton('', 'tarjeta color', alPulsar);
    b.append(el('span', 'icono', icono), el('span', '', nombre));
    return b;
  };
  $('cartas-juegos').replaceChildren(tarjeta('🂡', 'Solitario', abrirSolitario), tarjeta('🃏', '21', abrir21));
  const filas = [];
  const r = leerJSON('cartas:solitario');
  for (const robo of ['1', '3']) {
    const x = r[robo];
    if (x?.partidas) filas.push(`🂡 De a ${robo}: ${x.ganadas} de ${x.partidas} ganadas${x.ganadas ? ` · mejor ${reloj(x.tiempo)} · ${x.movimientos} movimientos` : ''}`);
  }
  const b = leerJSON('cartas:21');
  if (b.manos) filas.push(`🃏 21: máximo ${b.max} 🪙 · ${b.ganadas} de ${b.manos} manos ganadas`);
  $('cartas-records').replaceChildren(...(filas.length ? [el('h3', 'categoria', 'Tus récords'), ...filas.map((t) => el('p', 'sin-datos', t))] : []));
}

const pantalla = (marcador, tapete, botones, aviso = '') => {
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

const temblar = (n) => {
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

// --- 🃏 21 ---

// Guardado: { fichas, max, manos, ganadas, apuesta (la última), mano (en curso o null), zapato }
const leer21 = () => ({ fichas: 100, max: 100, manos: 0, ganadas: 0, apuesta: 10, mano: null, zapato: [], ...leerJSON('cartas:21') });
let b21 = null;
const guardar21 = () => guardar('cartas:21', JSON.stringify(b21));

function abrir21() {
  pararCartas();
  b21 = leer21();
  pintar21();
}

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

const textoPuntos = (cartas) => {
  const p = V.puntos(cartas);
  return p.total > 21 ? `${p.total} 💥` : p.blanda && p.total < 21 ? `${p.total - 10} / ${p.total}` : String(p.total);
};

function pintar21() {
  const { fichas, mano: m } = b21;
  const marcador = [el('span', '', `🪙 ${fichas} fichas`), el('span', '', `Récord ${b21.max}`)];
  if (!m) return pintarApuesta(marcador);
  const tapete = [filaCartas(m.fin ? `Banca: ${textoPuntos(m.banca)}` : 'Banca', m.banca, m.fin ? 0 : 1, 'banca')];
  m.manos.forEach((mano, i) => {
    const res = m.fin ? ` · ${{ blackjack: '🎉 ¡21!', gana: '✅ Ganas', empate: '🤝 Empate', pierde: '❌ Pierdes' }[V.resultado(m, mano)]}` : '';
    const nombre = m.manos.length > 1 ? `Mano ${i + 1}` : 'Tú';
    tapete.push(filaCartas(`${nombre}: ${textoPuntos(mano.cartas)} · apuesta ${mano.apuesta}${res}`, mano.cartas, 0, !m.fin && i === m.actual ? 'actual' : ''));
  });
  if (m.fin) {
    const cobro = V.cobro(m);
    const apostado = m.manos.reduce((s, x) => s + x.apuesta, 0);
    const botones = [boton('🃏 Otra mano', 'color', otraMano), boton('Salir', '', abrirCartas)];
    pantalla(marcador, tapete, botones, cobro > apostado ? `Ganas ${cobro - apostado} fichas` : cobro === apostado ? 'Recuperas tu apuesta' : `Pierdes ${apostado - cobro} fichas`);
  } else {
    const jugar = (f) => () => {
      b21.mano = f(b21.mano);
      if (b21.mano.fin) cerrarMano();
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
    pantalla(marcador, tapete, [boton('Pedir', 'color', jugar(V.pedir)), boton('Plantarse', 'color', jugar(V.plantarse)), doblar, separar]);
  }
  $('cartas-tapete').className = 'tapete-21';
}

function pintarApuesta(marcador) {
  const apuesta = Math.min(b21.apuesta, b21.fichas - (b21.fichas % 5)) || 0;
  b21.apuesta = apuesta;
  if (b21.fichas < 5) {
    return pantalla(marcador, [el('h2', '', '🃏 21'), el('p', '', 'Te quedaste sin fichas.')], [
      boton('🏦 La casa te presta 100', 'color', () => {
        b21.fichas += 100;
        guardar21();
        pintar21();
      }),
      boton('Salir', '', abrirCartas),
    ]);
  }
  const texto = el('p', 'apuesta-21', `Apuesta: ${apuesta}`);
  const fichas = el('div', 'fichas-21');
  for (const f of [5, 10, 25, 50]) {
    const b = boton(String(f), `ficha f${f}`, () => {
      b21.apuesta += f;
      pintar21();
    });
    b.disabled = apuesta + f > b21.fichas;
    b.setAttribute('aria-label', `Apostar ${f} más`);
    fichas.append(b);
  }
  const repartir = boton('🃏 Repartir', 'color', () => {
    b21.fichas -= apuesta;
    b21.mano = V.repartir(b21.zapato, apuesta);
    b21.zapato = [];
    if (b21.mano.fin) cerrarMano();
    sonar('tic');
    guardar21();
    pintar21();
  });
  repartir.disabled = !apuesta;
  pantalla(marcador, [el('h2', '', '🃏 21'), el('p', '', 'Acércate a 21 sin pasarte y gánale a la banca. La banca pide hasta 17.'), texto, fichas], [
    repartir,
    boton('Borrar', '', () => {
      b21.apuesta = 0;
      pintar21();
    }),
    boton('Salir', '', abrirCartas),
  ]);
}

// La mano terminó: cobrar, récords y liga (cada 5 manos, +1 partida).
function cerrarMano() {
  const m = b21.mano;
  const cobro = V.cobro(m);
  b21.fichas += cobro;
  b21.max = Math.max(b21.max, b21.fichas);
  b21.manos++;
  if (cobro > m.manos.reduce((s, x) => s + x.apuesta, 0)) {
    b21.ganadas++;
    sonar('acierto');
  }
  if (b21.manos % 5 === 0) ligaAnotar('partida');
}

function otraMano() {
  b21.zapato = b21.mano.zapato;
  b21.mano = null;
  guardar21();
  pintar21();
}
