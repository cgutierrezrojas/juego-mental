// 🔤 Palabras: página de la sección y las pantallas de 📅 Palabra del día, 🪢 Ahorcado y 🔍 Sopa de letras.
// La lógica es pura (games/palabra.js, ahorcado.js, sopa.js); aquí se dibuja, se teclea y se termina.
// Récord en `record:<id>` (ranking), partidas en `palabra:partidas`, el día en `palabra:hoy` y `palabra:stats`.
import { el, leer, guardar, esRecord } from '../games/comun.js';
import { sonar } from '../games/efectos.js';
import { semillaNueva } from '../games/semilla.js';
import { TEMAS, VALIDAS, mostrar as conTilde } from '../games/diccionario.js';
import * as P from '../games/palabra.js';
import * as H from '../games/ahorcado.js';
import * as S from '../games/sopa.js';
import { E } from './estado.js';
import { leerJSON } from './datos.js';
import { $, mostrar, confeti, compartirTexto } from './ui.js';
import { ligaAnotar } from './liga.js';
import { JUEGOS_PALABRAS } from './juegos.js';
import { anotarEnDuelo, volverAlDuelo } from './duelos.js';
import { elegirAmigo } from './retos.js';

const NIVELES = [['facil', '🙂 Fácil'], ['normal', '😐 Normal'], ['dificil', '😈 Difícil']];
const AYUDA = {
  palabra: 'Adivina la palabra de 5 letras en 6 intentos. 🟩 la letra está en su lugar, 🟨 está en otra posición, ⬛ no está. Es la misma para todos y cambia cada día.',
  ahorcado: 'Adivina la palabra letra por letra; tienes 6 fallos. Te damos el tema como pista. Cada palabra vale 10 puntos más los fallos que te sobren, y sigues hasta perder una.',
  sopa: 'Encuentra las 8 palabras del tema arrastrando el dedo de la primera a la última letra. Tienes 3 minutos: 100 puntos por palabra y, si las encuentras todas, 5 más por cada segundo que sobre.',
};
const FILAS_TECLADO = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'];
const tema = (id) => TEMAS.find((t) => t.id === id);
const nombreNivel = (id) => NIVELES.find(([k]) => k === id)[1];

const boton = (texto, clase, alPulsar) => {
  const b = el('button', clase, texto);
  if (clase.includes('color')) b.style.setProperty('--c', 'var(--amarillo)');
  b.onclick = alPulsar;
  return b;
};

// --- Página ---

export function abrirPalabras() {
  pararPalabras();
  mostrar('palabras');
  $('palabras-juegos').replaceChildren(...JUEGOS_PALABRAS.map((j) => {
    const b = el('button', 'tarjeta color');
    b.style.setProperty('--c', 'var(--amarillo)');
    b.append(el('span', 'icono', j.icono), el('span', '', j.nombre));
    b.onclick = () => abrirJuegoPalabras(j.id);
    return b;
  }));
  const stats = leerJSON('palabra:stats');
  const partidas = leerJSON('palabra:partidas');
  const filas = [
    ...(stats.jugadas ? [`📅 Palabra del día: racha ${P.rachaActual(stats, P.numeroDia())} · mejor ${stats.mejor}`] : []),
    ...['ahorcado', 'sopa'].filter((id) => partidas[id]).map((id) => {
      const j = JUEGOS_PALABRAS.find((x) => x.id === id);
      return `${j.icono} ${j.nombre}: récord ${Number(leer(`record:${id}`)) || 0} · ${partidas[id]} partida${partidas[id] > 1 ? 's' : ''}`;
    }),
  ];
  $('palabras-records').replaceChildren(...(filas.length ? [el('h3', 'categoria', '🏆 Tus récords'), ...filas.map((f) => el('p', 'sin-datos', f))] : []));
}

// --- Partida ---

// p: { id, e, semilla, nivel, duelo, alTeclear, reloj, espera, restantes } (en la del día: { id, hoy, escrito })
let p = null;

export function pararPalabras() {
  if (!p) return;
  clearInterval(p.reloj);
  clearTimeout(p.espera);
  window.removeEventListener('keydown', p.alTeclear);
  p = null;
}

// Antes de jugar: cómo se juega, el nivel (Ahorcado y Sopa) y ▶ Jugar. `duelo`: { semilla, dificultad } si es un reto.
export function abrirJuegoPalabras(id, duelo = null) {
  pararPalabras();
  const info = JUEGOS_PALABRAS.find((j) => j.id === id);
  mostrar('palabras-juego');
  $('palabras-aviso').textContent = '';
  if (id === 'palabra') {
    const hoy = diaDeHoy();
    if (hoy.fin) return resumenDia(hoy);
    marcadorDia(hoy.n);
    $('palabras-tapete').replaceChildren(el('p', 'sin-datos', AYUDA.palabra));
    return $('palabras-botones').replaceChildren(boton(hoy.intentos.length ? '▶ Seguir' : '▶ Jugar', 'color', jugarDia), boton('Volver', '', abrirPalabras));
  }
  const record = Number(leer(`record:${id}`)) || 0;
  $('palabras-marcador').replaceChildren(el('span', '', `${info.icono} ${info.nombre}`), el('span', '', duelo ? '⚔️ Reto' : `🏆 ${record}`));
  let nivel = duelo?.dificultad ?? (leer(`palabra:nivel-${id}`) || 'normal');
  const niveles = el('div', 'opciones-duelo');
  const pintarNiveles = () => niveles.replaceChildren(...NIVELES.map(([k, texto]) => {
    const b = boton(texto, '', () => {
      nivel = k;
      guardar(`palabra:nivel-${id}`, k);
      pintarNiveles();
    });
    b.setAttribute('aria-pressed', String(k === nivel));
    return b;
  }));
  pintarNiveles();
  $('palabras-tapete').replaceChildren(
    el('p', 'sin-datos', AYUDA[id]),
    ...(duelo ? [el('p', 'sin-datos', `⚔️ Juegas la misma partida que ${E.enDuelo?.rival ?? 'tu rival'} en ${nombreNivel(nivel)}: gana quien hace más puntos.`)] : [niveles]),
  );
  $('palabras-botones').replaceChildren(
    boton('▶ Jugar', 'color', () => jugar(id, duelo?.semilla ?? semillaNueva(), nivel, duelo)),
    boton('Volver', '', () => (duelo ? volverAlDuelo() : abrirPalabras())),
  );
}

function jugar(id, semilla, nivel, duelo) {
  pararPalabras();
  $('palabras-aviso').textContent = '';
  if (id === 'ahorcado') jugarAhorcado(semilla, nivel, duelo);
  else jugarSopa(semilla, nivel, duelo);
}

// Teclado en pantalla (y el físico). `alPulsar(letra | 'ENVIAR' | '⌫')`; `conEnviar`: fila de abajo con Enviar y ⌫.
function teclado(alPulsar, conEnviar) {
  const caja = el('div', 'teclado');
  FILAS_TECLADO.forEach((fila, i) => {
    const f = el('div', 'fila-teclado');
    if (conEnviar && i === 2) f.append(boton('Enviar', 'tecla ancha', () => alPulsar('ENVIAR')));
    for (const l of fila) {
      const b = boton(l, 'tecla', () => alPulsar(l));
      b.dataset.l = l;
      f.append(b);
    }
    if (conEnviar && i === 2) f.append(boton('⌫', 'tecla ancha', () => alPulsar('⌫')));
    caja.append(f);
  });
  p.alTeclear = (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.key === 'Enter') alPulsar('ENVIAR');
    else if (ev.key === 'Backspace') alPulsar('⌫');
    else {
      const k = ev.key.toUpperCase();
      const l = k === 'Ñ' ? k : k.normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (l.length === 1 && H.LETRAS.includes(l)) alPulsar(l);
      else return;
    }
    ev.preventDefault();
  };
  window.addEventListener('keydown', p.alTeclear);
  return caja;
}

const pintarTeclas = (colores) => {
  for (const b of document.querySelectorAll('#palabras-tapete .tecla[data-l]')) {
    b.className = `tecla ${colores[b.dataset.l] ?? ''}`;
  }
};

// --- 📅 Palabra del día ---

function diaDeHoy() {
  const n = P.numeroDia();
  const h = leerJSON('palabra:hoy');
  return h.n === n ? h : { n, intentos: [], fin: false };
}

function marcadorDia(n) {
  const stats = leerJSON('palabra:stats');
  $('palabras-marcador').replaceChildren(el('span', '', `📅 Palabra #${n}`), el('span', '', `🔥 ${P.rachaActual(stats, n)}`));
}

function tableroDia(hoy, escrito = '') {
  const sol = P.palabraDelDia(hoy.n);
  const t = el('div', 'tablero-palabra');
  for (let i = 0; i < P.INTENTOS; i++) {
    const x = hoy.intentos[i] ?? (i === hoy.intentos.length ? escrito : '');
    const colores = hoy.intentos[i] ? P.pista(x, sol) : [];
    for (let k = 0; k < P.LARGO; k++) t.append(el('span', `letra-palabra ${colores[k] ?? (x[k] ? 'escrita' : '')}`, x[k] ?? ''));
  }
  t.setAttribute('aria-label', hoy.intentos.map((x) => `${x}: ${P.pista(x, sol).map((c) => ({ v: 'en su lugar', a: 'en otra posición', g: 'no está' })[c]).join(', ')}`).join('. ') || 'Sin intentos todavía');
  return t;
}

function jugarDia() {
  pararPalabras();
  p = { id: 'palabra', hoy: diaDeHoy(), escrito: '' };
  marcadorDia(p.hoy.n);
  $('palabras-tapete').replaceChildren(tableroDia(p.hoy), teclado(pulsarDia, true));
  pintarTeclas(P.colorTeclas(p.hoy.intentos, P.palabraDelDia(p.hoy.n)));
  $('palabras-botones').replaceChildren(boton('Salir', '', abrirPalabras));
}

function pulsarDia(k) {
  const { hoy } = p;
  if (hoy.fin) return;
  $('palabras-aviso').textContent = '';
  if (k === '⌫') p.escrito = p.escrito.slice(0, -1);
  else if (k === 'ENVIAR') {
    if (p.escrito.length < P.LARGO) return ($('palabras-aviso').textContent = 'Faltan letras');
    if (!VALIDAS.has(p.escrito)) {
      sonar('fallo');
      return ($('palabras-aviso').textContent = 'No está en la lista');
    }
    hoy.intentos.push(p.escrito);
    p.escrito = '';
    const sol = P.palabraDelDia(hoy.n);
    hoy.fin = hoy.intentos.at(-1) === sol || hoy.intentos.length === P.INTENTOS;
    guardar('palabra:hoy', JSON.stringify(hoy));
    pintarTeclas(P.colorTeclas(hoy.intentos, sol));
    if (hoy.fin) return finDia(hoy);
    sonar('tic');
  } else if (p.escrito.length < P.LARGO) p.escrito += k;
  $('palabras-tapete').firstChild.replaceWith(tableroDia(hoy, p.escrito));
}

function finDia(hoy) {
  const acerto = hoy.intentos.at(-1) === P.palabraDelDia(hoy.n);
  const stats = P.anotar(leerJSON('palabra:stats'), hoy.n, acerto, hoy.intentos.length);
  guardar('palabra:stats', JSON.stringify(stats));
  const nuevo = acerto && esRecord(stats.mejor, Number(leer('record:palabra')) || 0);
  if (nuevo) guardar('record:palabra', String(stats.mejor));
  ligaAnotar('partida');
  sonar(acerto ? 'record' : 'fallo');
  if (acerto) confeti();
  pararPalabras();
  resumenDia(hoy);
}

function resumenDia(hoy) {
  const sol = P.palabraDelDia(hoy.n);
  const acerto = hoy.intentos.at(-1) === sol;
  const stats = leerJSON('palabra:stats');
  marcadorDia(hoy.n);
  const maximo = Math.max(1, ...(stats.dist ?? [0]));
  const barras = el('div', 'barras-palabra');
  (stats.dist ?? []).forEach((n, i) => {
    const fila = el('div', 'barra-palabra');
    const b = el('span', acerto && hoy.intentos.length === i + 1 ? 'hoy' : '', String(n));
    b.style.width = `${Math.max(8, (n / maximo) * 100)}%`;
    fila.append(el('span', '', String(i + 1)), b);
    barras.append(fila);
  });
  $('palabras-tapete').replaceChildren(
    tableroDia(hoy),
    el('p', 'sin-datos', `🔥 Racha: ${P.rachaActual(stats, hoy.n)} · Mejor: ${stats.mejor ?? 0} · Jugadas: ${stats.jugadas ?? 0}`),
    barras,
    el('p', 'sin-datos', `Mañana sale la #${hoy.n + 1}.`),
  );
  $('palabras-aviso').textContent = acerto ? `🎉 ¡${conTilde(sol)}! La adivinaste en ${hoy.intentos.length}/${P.INTENTOS}.` : `La palabra era ${conTilde(sol)}.`;
  $('palabras-botones').replaceChildren(
    boton('📤 Compartir', 'color', () => compartirTexto(P.textoCompartir(hoy.n, hoy.intentos, sol), () => ($('palabras-aviso').textContent = '📋 Copiado: pégalo donde quieras.'))),
    boton('Volver', '', abrirPalabras),
  );
}

// --- 🪢 Ahorcado ---

function jugarAhorcado(semilla, nivel, duelo) {
  p = { id: 'ahorcado', e: H.nueva(semilla, nivel), semilla, nivel, duelo };
  $('palabras-tapete').replaceChildren(el('div', 'ahorcado'), teclado(pulsarAhorcado, false));
  $('palabras-botones').replaceChildren(boton('Salir', '', () => (duelo ? terminar() : abrirPalabras())));
  pintarAhorcado();
}

// El dibujo: la horca siempre y una parte más por cada fallo (cabeza, cuerpo, brazos y piernas).
function dibujo(fallos) {
  const partes = [
    '<circle cx="80" cy="38" r="10"/>', '<line x1="80" y1="48" x2="80" y2="82"/>', '<line x1="80" y1="58" x2="66" y2="72"/>',
    '<line x1="80" y1="58" x2="94" y2="72"/>', '<line x1="80" y1="82" x2="68" y2="102"/>', '<line x1="80" y1="82" x2="92" y2="102"/>',
  ];
  const svg = `<svg viewBox="0 0 120 120" class="dibujo-ahorcado" role="img" aria-label="${fallos} de ${H.FALLOS} fallos"><g>
    <line x1="10" y1="112" x2="60" y2="112"/><line x1="30" y1="112" x2="30" y2="10"/><line x1="30" y1="10" x2="80" y2="10"/><line x1="80" y1="10" x2="80" y2="28"/>
    ${partes.slice(0, fallos).join('')}</g></svg>`;
  const caja = el('div');
  caja.innerHTML = svg;
  return caja.firstElementChild;
}

function pintarAhorcado() {
  const { e } = p;
  const r = e.ronda;
  const t = tema(r.tema);
  const visible = r.estado === 'perdida' ? conTilde(r.palabra) : [...r.palabra].map((l) => (r.letras.includes(l) ? l : '_')).join('');
  const casillas = el('div', 'palabra-ahorcado');
  for (const l of visible) casillas.append(el('span', r.estado === 'perdida' && !r.letras.includes(l) ? 'faltaba' : '', l === '_' ? '' : l));
  casillas.setAttribute('aria-label', visible.replaceAll('_', ' guion ').trim());
  $('palabras-tapete').firstChild.replaceChildren(el('p', 'tema-ahorcado', `${t.icono} ${t.nombre} · ${r.palabra.length} letras · ❤️ ${H.FALLOS - r.fallos}`), dibujo(r.fallos), casillas);
  const colores = Object.fromEntries(r.letras.map((l) => [l, r.palabra.includes(l) ? 'v' : 'g']));
  pintarTeclas(colores);
  const record = Number(leer('record:ahorcado')) || 0;
  $('palabras-marcador').replaceChildren(el('span', '', `🪢 ${e.puntos} pts · ${e.palabras} 📝`), el('span', '', p.duelo ? '⚔️ Reto' : `🏆 ${Math.max(record, e.puntos)}`));
}

function pulsarAhorcado(l) {
  const { e } = p;
  const r = e.ronda;
  if (r.estado !== 'jugando' || l === 'ENVIAR' || l === '⌫') return;
  const fallos = r.fallos;
  H.probar(e, l);
  pintarAhorcado();
  if (r.estado === 'ganada') {
    sonar('acierto');
    $('palabras-aviso').textContent = `✅ ¡${conTilde(r.palabra)}! +${10 + H.FALLOS - r.fallos}`;
    p.espera = setTimeout(() => {
      H.siguiente(e);
      $('palabras-aviso').textContent = '';
      pintarAhorcado();
    }, 1300);
  } else if (r.estado === 'perdida') {
    $('palabras-aviso').textContent = `💀 Era ${conTilde(r.palabra)}.`;
    p.espera = setTimeout(terminar, 1600);
  } else if (r.fallos > fallos) sonar('fallo');
  else sonar('tic');
}

// --- 🔍 Sopa de letras ---

function jugarSopa(semilla, nivel, duelo) {
  const e = S.nueva(semilla, nivel);
  p = { id: 'sopa', e, semilla, nivel, duelo, restantes: S.SEGUNDOS };
  const rejilla = el('div', 'sopa');
  rejilla.style.setProperty('--n', e.n);
  e.filas.forEach((fila, y) => [...fila].forEach((l, x) => {
    const c = el('span', 'letra-sopa', l);
    c.dataset.x = x;
    c.dataset.y = y;
    rejilla.append(c);
  }));
  rejilla.setAttribute('aria-label', `Sopa de ${e.n} por ${e.n}`);
  const t = tema(e.tema);
  $('palabras-tapete').replaceChildren(el('p', 'tema-ahorcado', `${t.icono} ${t.nombre}`), rejilla, el('div', 'lista-sopa'));
  controlesSopa(rejilla);
  pintarSopa();
  $('palabras-botones').replaceChildren(boton('Terminar', '', terminarSopa));
  p.reloj = setInterval(() => {
    p.restantes--;
    marcadorSopa();
    if (p.restantes <= 0) terminarSopa();
  }, 1000);
}

function controlesSopa(rejilla) {
  let desde = null;
  const celda = (ev) => {
    const c = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.letra-sopa');
    return c && rejilla.contains(c) ? [Number(c.dataset.x), Number(c.dataset.y)] : null;
  };
  const resaltar = (casillas) => {
    for (const c of rejilla.children) c.classList.remove('marcando');
    for (const [x, y] of casillas) rejilla.children[y * p.e.n + x].classList.add('marcando');
  };
  rejilla.onpointerdown = (ev) => {
    desde = celda(ev);
    if (!desde) return;
    ev.preventDefault();
    resaltar([desde]);
  };
  rejilla.onpointermove = (ev) => {
    const hasta = desde && celda(ev);
    if (hasta) resaltar(S.linea(desde, hasta));
  };
  rejilla.onpointerup = rejilla.onpointercancel = (ev) => {
    const hasta = desde && celda(ev);
    resaltar([]);
    if (hasta && p?.id === 'sopa' && S.marcar(p.e, desde, hasta) >= 0) {
      sonar('acierto');
      pintarSopa();
      if (p.e.fin) terminarSopa();
    }
    desde = null;
  };
}

function pintarSopa() {
  const { e } = p;
  const rejilla = $('palabras-tapete').querySelector('.sopa');
  for (const w of e.palabras.filter((x) => x.hallada)) {
    for (let i = 0; i < w.palabra.length; i++) rejilla.children[(w.y + w.dy * i) * e.n + w.x + w.dx * i].classList.add('hallada');
  }
  $('palabras-tapete').querySelector('.lista-sopa').replaceChildren(...e.palabras.map((w) => el('span', w.hallada ? 'hallada' : '', w.palabra)));
  marcadorSopa();
}

function marcadorSopa() {
  const m = Math.floor(Math.max(0, p.restantes) / 60);
  const s = String(Math.max(0, p.restantes) % 60).padStart(2, '0');
  const hallas = p.e.palabras.filter((w) => w.hallada).length;
  $('palabras-marcador').replaceChildren(el('span', '', `🔍 ${hallas}/${p.e.palabras.length} · ${p.e.puntos} pts`), el('span', p.restantes <= 10 ? 'urgente' : '', `⏱ ${m}:${s}`));
}

function terminarSopa() {
  if (!p || p.id !== 'sopa') return;
  clearInterval(p.reloj);
  S.cerrar(p.e, p.restantes);
  terminar();
}

// --- Fin (Ahorcado y Sopa) ---

function terminar() {
  const { id, e, duelo, semilla, nivel } = p;
  e.fin = true;
  const puntos = e.puntos;
  const record = Number(leer(`record:${id}`)) || 0;
  const nuevo = !duelo && esRecord(puntos, record);
  if (nuevo) guardar(`record:${id}`, String(puntos));
  const partidas = leerJSON('palabra:partidas');
  guardar('palabra:partidas', JSON.stringify({ ...partidas, [id]: (partidas[id] ?? 0) + 1 }));
  ligaAnotar('partida');
  if (duelo) anotarEnDuelo(puntos);
  sonar(nuevo ? 'record' : 'fallo');
  if (nuevo) confeti();
  pararPalabras();
  for (const b of document.querySelectorAll('#palabras-tapete .tecla')) b.disabled = true;
  const extra = id === 'sopa' ? ` (${e.palabras.filter((w) => w.hallada).length} de ${e.palabras.length} palabras)` : ` (${e.palabras} palabra${e.palabras === 1 ? '' : 's'})`;
  $('palabras-aviso').textContent = duelo ? `⚔️ ${puntos} puntos anotados en el reto.` : nuevo ? `🏆 ¡Nuevo récord: ${puntos}!${extra}` : `${puntos} puntos${extra} · récord ${record}`;
  if (id === 'sopa') revelarSopa(e);
  if (duelo) return $('palabras-botones').replaceChildren(boton('⚔️ Volver al duelo', 'color', volverAlDuelo));
  const amigos = el('div', 'opciones-duelo');
  $('palabras-botones').replaceChildren(
    boton('🔄 Otra vez', 'color', () => jugar(id, semillaNueva(), nivel, null)),
    boton('⚔️ Retar a un amigo', '', () => elegirAmigo(amigos, { id, semilla, dificultad: nivel, puntos })),
    boton('Volver', '', abrirPalabras),
  );
  $('palabras-tapete').append(amigos);
}

// Al terminar la sopa se ven las palabras que faltaron.
function revelarSopa(e) {
  const rejilla = $('palabras-tapete').querySelector('.sopa');
  for (const w of e.palabras.filter((x) => !x.hallada)) {
    for (let i = 0; i < w.palabra.length; i++) rejilla.children[(w.y + w.dy * i) * e.n + w.x + w.dx * i].classList.add('faltaba');
  }
  rejilla.onpointerdown = rejilla.onpointermove = rejilla.onpointerup = null;
}
