// ❓ Trivia: la página de la sección, la 🎡 Ruleta (solitario) y la 🎉 Fiesta (de 2 a 6 en un celular).
// Las reglas de la ruleta están en games/ruleta.js y las preguntas en games/preguntas.js.
// La ⚡ Trivia rápida es un juego más de JUEGOS (games/trivia.js) y se abre con la previa de siempre.
import { el, guardar, temporizador, pintarReloj } from '../games/comun.js';
import { sonar } from '../games/efectos.js';
import { CATEGORIAS_TRIVIA, pregunta } from '../games/preguntas.js';
import * as R from '../games/ruleta.js';
import { INFO_JUEGOS } from './juegos.js';
import { leerJSON, apuntarLogros } from './datos.js';
import { abrirPrevia } from './previa.js';
import { $, mostrar, confeti } from './ui.js';
import { ligaAnotar } from './liga.js';

export const JUEGOS_TRIVIA = 3; // Ruleta, Fiesta y Trivia rápida (para la cuenta del inicio)
const SEGUNDOS = 20;
const IDS = CATEGORIAS_TRIVIA.map((c) => c.id);
const categoria = (id) => CATEGORIAS_TRIVIA.find((c) => c.id === id);

// Partida abierta: { modo: 'solo' | 'fiesta', jugadores: [{ nombre, e }], turno, giro, apuntada, reloj, espera }
let partida = null;
let nombresFiesta = ['', ''];

export function pararTrivia() {
  partida?.reloj?.parar();
  clearTimeout(partida?.espera);
}

const boton = (texto, clase, alPulsar) => {
  const b = el('button', clase, texto);
  if (clase.includes('color')) b.style.setProperty('--c', 'var(--azul)');
  b.onclick = alPulsar;
  return b;
};

// --- Página de la sección ---

export function abrirTrivia() {
  mostrar('trivia');
  const r = leerJSON('trivia:ruleta');
  $('trivia-record').textContent = r.partidas ? `🎡 Tu mejor ruleta: ${r.mejor} 👑 · ${r.ganadas} de ${r.partidas} ganadas` : '';
  const tarjeta = (icono, nombre, alPulsar) => {
    const b = boton('', 'tarjeta color', alPulsar);
    b.append(el('span', 'icono', icono), el('span', '', nombre));
    return b;
  };
  $('trivia-juegos').replaceChildren(
    tarjeta('🎡', 'Ruleta', () => empezar('solo', [{ nombre: 'Tú' }])),
    tarjeta('🎉', 'Fiesta', pintarFiesta),
    tarjeta(INFO_JUEGOS.trivia.icono, INFO_JUEGOS.trivia.nombre, () => abrirPrevia(INFO_JUEGOS.trivia)),
  );
}

// Fiesta: nombres de 2 a 6 jugadores.
function pintarFiesta() {
  pararTrivia();
  partida = null;
  mostrar('trivia-partida');
  $('trivia-marcador').replaceChildren();
  const campos = nombresFiesta.map((n, i) => {
    const c = el('input');
    c.value = n;
    c.placeholder = `Jugador ${i + 1}`;
    c.maxLength = 16;
    c.setAttribute('aria-label', `Nombre del jugador ${i + 1}`);
    c.oninput = () => (nombresFiesta[i] = c.value);
    return c;
  });
  const lista = el('div', 'nombres-fiesta');
  lista.append(...campos);
  $('trivia-contenido').replaceChildren(
    el('h2', '', '🎉 Fiesta'),
    el('p', 'sin-datos', 'Os pasáis el celular: cada uno juega hasta fallar. Gana quien junte antes las 6 👑.'),
    lista,
  );
  const botones = [];
  if (nombresFiesta.length < 6) botones.push(boton('＋ Jugador', '', () => { nombresFiesta.push(''); pintarFiesta(); }));
  if (nombresFiesta.length > 2) botones.push(boton('－ Jugador', '', () => { nombresFiesta.pop(); pintarFiesta(); }));
  botones.push(boton('▶ Empezar', 'color', () => empezar('fiesta', nombresFiesta.map((n, i) => ({ nombre: n.trim() || `Jugador ${i + 1}` })))));
  $('trivia-botones').replaceChildren(...botones, boton('Volver', '', abrirTrivia));
}

// --- Partida ---

function empezar(modo, jugadores) {
  pararTrivia();
  const vidas = modo === 'solo' ? R.VIDAS : null;
  partida = { modo, jugadores: jugadores.map((j) => ({ ...j, e: R.inicial(vidas) })), turno: 0, giro: 0, apuntada: false };
  mostrar('trivia-partida');
  if (modo === 'fiesta') pintarTurno();
  else pintarRuleta();
}

const actual = () => partida.jugadores[partida.turno];

function pintarMarcador() {
  const j = actual();
  const fila = el('div', 'marcador-trivia');
  const coronas = el('div', 'coronas');
  coronas.setAttribute('aria-label', `Coronas: ${j.e.coronas.length} de ${R.CORONAS}`);
  for (const c of CATEGORIAS_TRIVIA) {
    const s = el('span', j.e.coronas.includes(c.id) ? 'corona tiene' : 'corona', c.icono);
    s.style.setProperty('--c', c.color);
    s.title = c.nombre;
    coronas.append(s);
  }
  const barra = el('span', 'barra-trivia', '●'.repeat(j.e.barra) + '○'.repeat(R.BARRA - j.e.barra));
  barra.setAttribute('aria-label', `Barra: ${j.e.barra} de ${R.BARRA}`);
  const izquierda = j.e.vidas === null ? el('strong', '', `📱 ${j.nombre}`) : el('span', '', '❤️'.repeat(j.e.vidas) + '🤍'.repeat(R.VIDAS - j.e.vidas));
  fila.append(izquierda, barra);
  const partes = [fila, coronas];
  if (partida.modo === 'fiesta') {
    partes.push(el('p', 'sin-datos', partida.jugadores.map((x) => `${x.nombre} ${x.e.coronas.length}👑`).join(' · ')));
  }
  $('trivia-marcador').replaceChildren(...partes);
}

// Fiesta: pantalla para pasar el celular.
function pintarTurno() {
  $('trivia-marcador').replaceChildren();
  $('trivia-contenido').replaceChildren(el('p', 'turno-trivia', `Turno de ${actual().nombre} 📱`), el('p', 'sin-datos', `${actual().e.coronas.length} de ${R.CORONAS} coronas`));
  $('trivia-botones').replaceChildren(boton('▶ Estoy listo', 'grande color', pintarRuleta));
}

function pintarRuleta() {
  pintarMarcador();
  const e = actual().e;
  if (R.tocaCorona(e)) return pintarElegirCorona();
  const rueda = el('div', 'ruleta');
  rueda.style.background = `conic-gradient(${CATEGORIAS_TRIVIA.map((c, i) => `${c.color} ${i * 60}deg ${(i + 1) * 60}deg`).join(', ')})`;
  rueda.style.transform = `rotate(${partida.giro}deg)`;
  CATEGORIAS_TRIVIA.forEach((c, i) => {
    const s = el('span', 'gajo', c.icono);
    s.style.transform = `rotate(${i * 60 + 30}deg)`;
    rueda.append(s);
  });
  const caja = el('div', 'caja-ruleta');
  caja.append(el('span', 'puntero', '▼'), rueda);
  $('trivia-contenido').replaceChildren(caja);
  const girar = boton('🎡 Girar', 'grande color', () => {
    girar.disabled = true;
    const i = Math.floor(Math.random() * IDS.length);
    const destino = (360 - (i * 60 + 30)) % 360; // el centro del gajo `i` bajo el puntero
    partida.giro += 360 * 4 + ((destino - (partida.giro % 360)) + 360) % 360;
    rueda.style.transform = `rotate(${partida.giro}deg)`;
    sonar('tic');
    const lento = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    partida.espera = setTimeout(() => pintarPregunta(IDS[i], false), lento ? 1800 : 300);
  });
  $('trivia-botones').replaceChildren(girar);
}

function pintarElegirCorona() {
  const libres = R.sinCorona(actual().e, IDS);
  $('trivia-contenido').replaceChildren(
    el('p', 'turno-trivia', '👑 ¡Pregunta corona!'),
    el('p', 'sin-datos', 'Elige la categoría. Si aciertas esta pregunta difícil, ganas su corona.'),
    ...libres.map((id) => {
      const c = categoria(id);
      const b = boton(`${c.icono} ${c.nombre}`, 'grande color', () => pintarPregunta(id, true));
      b.style.setProperty('--c', c.color);
      return b;
    }),
  );
  $('trivia-botones').replaceChildren();
}

function pintarPregunta(cat, corona) {
  pintarMarcador();
  const c = categoria(cat);
  // La corona siempre es difícil (si no quedan difíciles sin ver, se repiten).
  const q = pregunta((x) => x.c === cat && (!corona || x.d === 3));
  const reloj = el('span', 'reloj-trivia');
  const cabecera = el('div', 'cabecera-pregunta');
  cabecera.style.setProperty('--c', c.color);
  cabecera.append(el('span', '', `${corona ? '👑 ' : ''}${c.icono} ${c.nombre}`), reloj);
  const opciones = q.opciones.map((o) => boton(o, 'grande opcion-trivia', () => responder(o)));
  $('trivia-contenido').replaceChildren(cabecera, el('p', 'pregunta-trivia', q.p), ...opciones);
  $('trivia-botones').replaceChildren();
  partida.reloj = temporizador(SEGUNDOS, (s) => pintarReloj(reloj, s), () => responder(null));

  function responder(o) {
    partida.reloj.parar();
    const ok = o === q.correcta;
    for (const b of opciones) {
      b.disabled = true;
      if (b.textContent === q.correcta) b.classList.add('correcta');
      else if (b.textContent === o) b.classList.add('incorrecta');
    }
    if (o === null) reloj.textContent = '⏰ ¡Tiempo!';
    sonar(ok ? 'acierto' : 'fallo');
    const j = actual();
    j.e = corona ? R.responderCorona(j.e, cat, ok) : R.responder(j.e, ok);
    pintarMarcador();
    partida.espera = setTimeout(() => seguir(ok), ok ? 900 : 1800);
  }
}

function seguir(ok) {
  const j = actual();
  const fin = R.resultado(j.e);
  if (fin) return pintarFin(fin);
  if (!ok && partida.modo === 'fiesta') {
    partida.turno = (partida.turno + 1) % partida.jugadores.length;
    return pintarTurno();
  }
  pintarRuleta();
}

function pintarFin(fin) {
  const j = actual();
  if (!partida.apuntada) {
    partida.apuntada = true;
    ligaAnotar('partida');
    if (partida.modo === 'solo') {
      const r = leerJSON('trivia:ruleta');
      guardar('trivia:ruleta', JSON.stringify({
        partidas: (r.partidas ?? 0) + 1,
        ganadas: (r.ganadas ?? 0) + (fin === 'gana' ? 1 : 0),
        mejor: Math.max(r.mejor ?? 0, j.e.coronas.length),
      }));
      apuntarLogros();
    }
    if (fin === 'gana') {
      confeti();
      sonar('record');
    }
  }
  pintarMarcador();
  const titulo = partida.modo === 'fiesta' ? `🏆 ¡Gana ${j.nombre}!` : fin === 'gana' ? '🏆 ¡Juntaste las 6 coronas!' : 'Sin vidas 💔';
  $('trivia-contenido').replaceChildren(
    el('p', 'turno-trivia', titulo),
    el('p', 'sin-datos', `${j.e.coronas.length} 👑 · ${j.e.aciertos} aciertos · ${j.e.fallos} fallos`),
  );
  $('trivia-botones').replaceChildren(
    boton('🔄 Otra partida', 'color', () => empezar(partida.modo, partida.jugadores.map(({ nombre }) => ({ nombre })))),
    boton('Volver a Trivia', '', abrirTrivia),
  );
}
