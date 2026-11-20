// 💣 Buscaminas infinito en pantalla (reglas puras en games/minas.js). Un <canvas> que dibuja solo lo visible y solo
// cuando algo cambia. La partida normal a medias se guarda solo en este celular (`minas-partida` = { e, anuncio });
// la del día no: el intento se gasta al empezar y salir la termina con el puntaje que lleve.
import { el, leer, guardar } from '../games/comun.js';
import { sonar, vibrar } from '../games/efectos.js';
import * as M from '../games/minas.js';
import { semillaNueva } from '../games/semilla.js';
import { mostrar, $, confeti, preguntar } from './ui.js';
import { boton } from './cartas.js';
import { leerFichas, sumarFichas } from './premios.js';
import { finDePartida, hayAnuncios, verAnuncioPremio } from './anuncios.js';
import { ligaAnotar } from './liga.js';
import { anotarPerfil } from './perfil.js';
import { abrirModos, anotarRecord, apuntarDia, leerPuzzle, rankingDia, NOMBRE_NIVEL } from './puzzles.js';

const CLAVE = 'minas-partida';
const C = 36; // lado de la casilla en px CSS
const ARRASTRE = 8; // px antes de que el toque pase a mover la vista
const LARGO = 400; // ms para la bandera por pulsación larga
const EMOJI = '20px system-ui, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

// p: { e, delDia, anuncio (ya se usó el 📺), modoBandera, ox, oy (px del mundo en la esquina del lienzo), w, h,
//      lienzo, ctx, col, cuadro, cursor (casilla con teclado o null), obs, alCambiar, fin }
let p = null;

const guardarPartida = () => {
  if (p && !p.delDia && !p.fin) guardar(CLAVE, JSON.stringify({ e: p.e, anuncio: p.anuncio }));
};

// La partida a medias ({ nivel, e, anuncio, abiertas }) o null.
export function partidaMinas() {
  try {
    const g = JSON.parse(leer(CLAVE));
    return g?.e?.abiertas && M.DENSIDAD[g.e.nivel] && !g.e.fin ? { ...g, nivel: g.e.nivel, abiertas: Object.keys(g.e.abiertas).length } : null;
  } catch {
    return null;
  }
}

export function pararMinas() {
  if (!p) return;
  p.lienzo?.onpointercancel?.(); // corta el reloj de la pulsación larga
  if (p.delDia && !p.fin) anotarFin(); // salir del del día también lo termina
  guardarPartida();
  cancelAnimationFrame(p.cuadro);
  p.obs.disconnect();
  removeEventListener('resize', p.alCambiar);
  if ($('dialogo-minas').open) $('dialogo-minas').close();
  p = null;
}

// `nivel` null + `seguir`: retoma la guardada. `semilla` para una nueva; `delDia`: sin continuaciones ni guardado.
export function jugarMinas(nivel, { semilla, delDia = false, seguir = false } = {}) {
  pararMinas();
  const g = seguir ? partidaMinas() : null;
  if (seguir && !g) return abrirModos('minas');
  p = { e: g?.e ?? M.nueva(semilla, nivel), delDia, anuncio: g?.anuncio ?? false, modoBandera: false, cursor: null, fin: false, cuadro: 0 };
  guardarPartida();
  mostrar('puzzle-juego');
  const lienzo = el('canvas', 'lienzo-minas');
  lienzo.tabIndex = 0;
  lienzo.setAttribute('role', 'img');
  lienzo.setAttribute('aria-label', 'Buscaminas: toca para abrir, mantén pulsado para poner bandera, arrastra para moverte. Con teclado: flechas, Enter abre, F bandera.');
  p.lienzo = lienzo;
  $('puzzle-tapete').replaceChildren(lienzo);
  p.col = colores();
  ajustar();
  centrar();
  controles();
  // Redibuja al cambiar de tema o de tamaño.
  p.obs = new MutationObserver(() => {
    p.col = colores();
    pedir();
  });
  p.obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
  p.alCambiar = () => {
    const [w, h] = [p.w, p.h];
    ajustar();
    p.ox += (w - p.w) / 2;
    p.oy += (h - p.h) / 2;
    pedir();
  };
  addEventListener('resize', p.alCambiar);
  barra();
  pedir();
  if (p.e.boom) avisoBoom(); // se cerró la app con el aviso abierto
}

function colores() {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(`--${n}`).trim();
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  // Números clásicos (1 azul, 2 verde, 3 rojo, 4 morado, 5 granate, 6 turquesa, 7 negro, 8 gris) con los tonos del tema.
  return {
    fondo: v('fondo'), texto: v('texto'), rojo: v('rojo'), acento: v('acento'),
    num: ['', v('azul'), v('verde'), v('rojo'), v('morado'), v('amarillo'), oscuro ? '#4fd1c5' : '#0e8a8a', v('texto'), v('texto')],
  };
}

// Tamaño real del lienzo (nítido con devicePixelRatio); se dibuja en px CSS.
function ajustar() {
  const { lienzo } = p;
  const dpr = window.devicePixelRatio || 1;
  p.w = lienzo.clientWidth || 360;
  p.h = lienzo.clientHeight || 400;
  lienzo.width = Math.round(p.w * dpr);
  lienzo.height = Math.round(p.h * dpr);
  p.ctx = lienzo.getContext('2d');
  p.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// La casilla (0, 0) en el centro del lienzo.
function centrar() {
  p.ox = C / 2 - p.w / 2;
  p.oy = C / 2 - p.h / 2;
}

const pedir = () => {
  if (p && !p.cuadro) p.cuadro = requestAnimationFrame(() => {
    if (!p) return;
    p.cuadro = 0;
    dibujar();
  });
};

function dibujar() {
  const { ctx, w, h, ox, oy, col, e } = p;
  ctx.globalAlpha = 1;
  ctx.fillStyle = col.fondo;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 1;
  for (let y = Math.floor(oy / C); y * C - oy < h; y++) {
    for (let x = Math.floor(ox / C); x * C - ox < w; x++) {
      const k = `${x},${y}`, px = x * C - ox, py = y * C - oy, n = e.abiertas[k];
      if (n !== undefined) {
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = col.texto;
        ctx.strokeRect(px + 0.5, py + 0.5, C - 1, C - 1);
        ctx.globalAlpha = 1;
        if (n) {
          ctx.fillStyle = col.num[n];
          ctx.font = '800 20px system-ui, sans-serif';
          ctx.fillText(String(n), px + C / 2, py + C / 2 + 1);
        }
        continue;
      }
      const mina = e.fin && M.hayMina(e.semilla, e.nivel, x, y); // al terminar se ven las minas
      const roja = k === e.boom || e.explotadas[k];
      ctx.globalAlpha = roja ? (k === e.boom ? 0.85 : 0.35) : 0.17;
      ctx.fillStyle = roja ? col.rojo : col.texto;
      ctx.fillRect(px + 2, py + 2, C - 4, C - 4);
      ctx.globalAlpha = 1;
      const icono = k === e.boom ? '💥' : e.explotadas[k] ? '💣' : e.banderas[k] ? (e.fin && !mina ? '❌' : '🚩') : mina ? '💣' : '';
      if (icono) {
        ctx.font = EMOJI;
        ctx.fillStyle = col.texto;
        ctx.fillText(icono, px + C / 2, py + C / 2 + 1);
      }
    }
  }
  if (p.cursor) {
    ctx.strokeStyle = col.acento;
    ctx.lineWidth = 3;
    ctx.strokeRect(p.cursor[0] * C - ox + 1.5, p.cursor[1] * C - oy + 1.5, C - 3, C - 3);
  }
}

const quieto = () => p.fin || p.e.boom !== null;

// Un toque en (x, y): un número hace acorde; si no, abre (o bandera en modo 🚩).
function tocar(x, y) {
  if (p.e.boom && !p.fin) return avisoBoom(); // el aviso se cerró con ← atrás: vuelve a salir
  if (quieto()) return;
  const abierta = p.e.abiertas[`${x},${y}`];
  if (abierta !== undefined) jugada(abierta ? M.acorde(p.e, x, y) : p.e);
  else jugada(p.modoBandera ? M.bandera(p.e, x, y) : M.abrir(p.e, x, y));
}

function ponerBandera(x, y) {
  if (quieto()) return;
  const e = M.bandera(p.e, x, y);
  if (e !== p.e) vibrar([30]);
  jugada(e);
}

function jugada(e) {
  if (e === p.e) return;
  const antes = Object.keys(p.e.abiertas).length;
  p.e = e;
  pedir();
  if (e.boom) {
    sonar('fallo');
    vibrar([60, 40, 120]);
    guardarPartida(); // con el boom: cerrar la app no lo esquiva
    return avisoBoom();
  }
  if (Object.keys(e.abiertas).length > antes) sonar('tic');
  guardarPartida();
  barra();
}

function controles() {
  const { lienzo } = p;
  const casilla = (ev) => {
    const r = lienzo.getBoundingClientRect();
    return [Math.floor((ev.clientX - r.left + p.ox) / C), Math.floor((ev.clientY - r.top + p.oy) / C)];
  };
  let t = null; // { id, x, y, ox, oy, movido, largo, reloj }
  lienzo.oncontextmenu = (ev) => ev.preventDefault(); // la pulsación larga ya es la bandera
  lienzo.onpointerdown = (ev) => {
    if (!p || t || ev.button > 0) return; // un solo dedo a la vez
    ev.preventDefault();
    lienzo.setPointerCapture?.(ev.pointerId);
    p.cursor = null;
    const c = casilla(ev), yo = p;
    t = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, ox: p.ox, oy: p.oy, movido: false, largo: false };
    t.reloj = setTimeout(() => {
      if (p !== yo || !t || t.movido) return; // la partida pudo pararse o cambiar
      t.largo = true;
      ponerBandera(...c);
    }, LARGO);
  };
  lienzo.onpointermove = (ev) => {
    if (!p || !t || ev.pointerId !== t.id) return;
    const dx = ev.clientX - t.x, dy = ev.clientY - t.y;
    if (!t.movido && Math.hypot(dx, dy) <= ARRASTRE) return;
    t.movido = true;
    clearTimeout(t.reloj);
    p.ox = t.ox - dx;
    p.oy = t.oy - dy;
    pedir();
  };
  lienzo.onpointerup = (ev) => {
    if (!p || !t || ev.pointerId !== t.id) return;
    clearTimeout(t.reloj);
    if (!t.movido && !t.largo) tocar(...casilla(ev));
    t = null;
  };
  lienzo.onpointercancel = lienzo.onlostpointercapture = () => {
    if (t) clearTimeout(t.reloj);
    t = null;
  };
  // Teclado: flechas mueven un cursor (y la vista lo sigue), Enter/espacio = toque, F = bandera.
  const PASO = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  lienzo.onkeydown = (ev) => {
    if (!p) return;
    const d = PASO[ev.key];
    if (!d && !['Enter', ' ', 'f', 'F'].includes(ev.key)) return;
    ev.preventDefault();
    p.cursor ??= [0, 0];
    if (d) {
      p.cursor = [p.cursor[0] + d[0], p.cursor[1] + d[1]];
      const [px, py] = [p.cursor[0] * C - p.ox, p.cursor[1] * C - p.oy];
      if (px < 0 || px + C > p.w) p.ox += px < 0 ? px : px + C - p.w;
      if (py < 0 || py + C > p.h) p.oy += py < 0 ? py : py + C - p.h;
    } else if (ev.key === 'f' || ev.key === 'F') ponerBandera(...p.cursor);
    else tocar(...p.cursor);
    pedir();
  };
}

// Marcador (nivel y casillas abiertas; las banderas correctas se suman al terminar) y botones.
function barra() {
  const titulo = p.delDia ? '📅 Del día' : `💣 ${NOMBRE_NIVEL[p.e.nivel]}`;
  const abiertas = Object.keys(p.e.abiertas).length;
  $('puzzle-marcador').replaceChildren(el('span', '', titulo), el('span', '', `⭐ ${abiertas}`));
  $('puzzle-marcador').lastChild.setAttribute('aria-label', `${abiertas} casillas abiertas`);
  if (p.fin) return;
  const salirB = boton('← Salir', '', salir);
  salirB.setAttribute('aria-label', 'Volver a Buscaminas'); // ← atrás del sistema usa este botón (ui.js atras())
  const banderaB = boton(p.modoBandera ? '🚩 Bandera: sí' : '🚩 Bandera: no', '', () => {
    p.modoBandera = !p.modoBandera;
    barra();
  });
  banderaB.setAttribute('aria-pressed', String(p.modoBandera));
  banderaB.classList.add('modo-bandera');
  const centroB = boton('🎯', '', () => {
    centrar();
    pedir();
  });
  centroB.setAttribute('aria-label', 'Centrar en el origen');
  $('puzzle-botones').replaceChildren(salirB, banderaB, centroB);
}

// 💥 ¡Boom!: 📺 seguir con anuncio (una vez), 🪙 seguir por fichas o terminar. En el del día, solo terminar.
function avisoBoom() {
  const d = $('dialogo-minas');
  const costo = M.costoSeguir(p.e.seguidas);
  const { fichas } = leerFichas();
  const anuncio = $('minas-anuncio'), pagar = $('minas-fichas');
  anuncio.hidden = p.delDia || p.anuncio || !hayAnuncios();
  pagar.hidden = p.delDia;
  pagar.disabled = fichas < costo;
  pagar.textContent = `🪙 Seguir por ${costo} fichas${fichas < costo ? ` (te faltan ${costo - fichas})` : ''}`;
  $('minas-texto').textContent = p.delDia ? `Pisaste una mina. Tu puntaje de hoy: ${M.puntaje(p.e)}.` : `Pisaste una mina. Tienes ${fichas} fichas.`;
  const terminarB = $('minas-terminar');
  anuncio.disabled = terminarB.disabled = false;
  anuncio.onclick = async () => {
    const yo = p;
    anuncio.disabled = pagar.disabled = terminarB.disabled = true; // mientras dura el anuncio
    const visto = await verAnuncioPremio();
    anuncio.disabled = terminarB.disabled = false;
    pagar.disabled = leerFichas().fichas < costo;
    if (p !== yo || p.fin || !p.e.boom || !visto) return;
    p.anuncio = true;
    continuar();
  };
  pagar.onclick = () => {
    if (!p || leerFichas().fichas < costo) return;
    sumarFichas(-costo);
    continuar();
  };
  terminarB.onclick = () => {
    d.close();
    terminarPartida();
  };
  d.oncancel = (ev) => ev.preventDefault(); // hay que elegir
  if (!d.open) d.showModal();
}

function continuar() {
  $('dialogo-minas').close();
  p.e = M.seguir(p.e);
  guardarPartida();
  barra();
  pedir();
}

// Lo que se anota al terminar: récord o marca del día, liga, perfil e intersticial. Devuelve la línea del récord.
function anotarFin() {
  p.e = M.terminar(p.e);
  p.fin = true;
  const s = M.puntaje(p.e);
  let linea;
  if (p.delDia) {
    apuntarDia('minas', s);
    linea = '📅 Tu puntaje de hoy queda apuntado.';
  } else {
    guardar(CLAVE, '');
    linea = anotarRecord('minas', p.e.nivel, s) ? '🏆 ¡Nuevo récord!' : `🏆 Récord: ${leerPuzzle('minas')[p.e.nivel].mejor} pts`;
  }
  ligaAnotar('partida', 1, 'puzzles');
  if (s - (p.e.inicio ?? 0) >= 100) anotarPerfil('victoria', 1, 'puzzles');
  finDePartida();
  return linea;
}

function terminarPartida() {
  const linea = anotarFin();
  const s = M.puntaje(p.e);
  p.cursor = null;
  const nuevo = linea.includes('Nuevo');
  if (nuevo) {
    sonar('record');
    confeti();
  }
  barra();
  pedir();
  const buenas = (s - Object.keys(p.e.abiertas).length) / 5;
  $('puzzle-tapete').append(
    el('p', 'turno-trivia', `💣 ${s} puntos`),
    el('p', 'sin-datos', `${Object.keys(p.e.abiertas).length} casillas abiertas + ${buenas} ${buenas === 1 ? 'bandera bien puesta' : 'banderas bien puestas'} × 5. ${linea}`),
    ...(p.delDia ? [rankingDia('minas')] : []),
  );
  const { delDia } = p, nivel = p.e.nivel;
  $('puzzle-botones').replaceChildren(
    ...(delDia ? [] : [boton(`Otro ${NOMBRE_NIVEL[nivel]}`, 'color', () => jugarMinas(nivel, { semilla: semillaNueva() }))]),
    boton('Volver', '', () => abrirModos('minas')),
  );
  $('puzzle-botones').firstChild.style.setProperty('--c', 'var(--verde)');
}

async function salir() {
  const yo = p;
  const si = await preguntar({
    titulo: '¿Terminar la partida?',
    texto: yo.delDia ? 'Se apunta como tu intento de hoy.' : 'Se anota tu puntaje y la partida termina.',
    boton: 'Terminar',
  });
  if (si && p === yo && !p.fin) terminarPartida();
}
