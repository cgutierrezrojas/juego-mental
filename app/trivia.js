// ❓ Trivia: la página de la sección, la 🎡 Ruleta (solitario) y la 🎉 Fiesta (de 2 a 6 en un celular).
// Las reglas de la ruleta están en games/ruleta.js y las preguntas en games/preguntas.js.
// La ⚡ Trivia rápida es un juego más de JUEGOS (games/trivia.js) y se abre con la previa de siempre.
import { el, guardar, barajar, temporizador, pintarReloj } from '../games/comun.js';
import { sonar } from '../games/efectos.js';
import { CATEGORIAS_TRIVIA, pregunta } from '../games/preguntas.js';
import * as R from '../games/ruleta.js';
import { INFO_JUEGOS } from './juegos.js';
import { leerJSON, apuntarLogros } from './datos.js';
import { abrirPrevia } from './previa.js';
import { $, mostrar, confeti } from './ui.js';
import { ligaAnotar } from './liga.js';

export const JUEGOS_TRIVIA = 3; // Ruleta, Fiesta y Trivia rápida (para la cuenta del inicio)
const MAS_TIEMPO = 15;
const IDS = CATEGORIAS_TRIVIA.map((c) => c.id);
const categoria = (id) => CATEGORIAS_TRIVIA.find((c) => c.id === id);
const COMODIN = { mitad: ['✂️', '50:50'], cambiar: ['🔄', 'Cambiar pregunta'], segunda: ['🔁', 'Segunda oportunidad'], tiempo: ['⏱️', `+${MAS_TIEMPO} s`] };

// Partida abierta: { modo: 'solo' | 'fiesta', a (ajustes), jugadores: [{ nombre, e }], turno, giro, apuntada, reloj, espera }
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

// --- Ajustes de la partida ---

const leerAjustes = () => R.ajustesDe(leerJSON('trivia:ajustes'));
const guardarAjustes = (a) => guardar('trivia:ajustes', JSON.stringify(a));

// Las reglas en una línea («Clásica: …» o «Personalizada: …»). En la fiesta no hay vidas.
function resumen(a, solo) {
  const clasica = R.esClasica(solo ? a : { ...a, vidas: R.CLASICA.vidas });
  const comodines = R.COMODINES.filter((k) => a.comodines[k]).map((k) => `${COMODIN[k][0]}×${a.comodines[k]}`).join(' ');
  return [
    `${clasica ? 'Clásica' : 'Personalizada'}: ${a.barra} ${a.barra === 1 ? 'acierto' : 'aciertos'} para la corona`,
    `corona de ${a.corona} ${a.corona === 1 ? 'pregunta' : 'preguntas'}`,
    `${a.coronas} 👑`,
    ...(solo ? [a.vidas === null ? '∞ ❤️' : `${a.vidas} ❤️`] : []),
    a.segundos ? `${a.segundos} s` : 'sin reloj',
    comodines || 'sin comodines',
  ].join(' · ');
}

function pintarAjustes(solo, volver) {
  const a = leerAjustes();
  const fila = (titulo, valores, actual, texto, cambiar) => {
    const opciones = el('div', 'opciones-ajuste');
    for (const v of valores) {
      const b = boton(texto(v), '', () => {
        cambiar(v);
        guardarAjustes(a);
        for (const x of opciones.children) x.setAttribute('aria-pressed', String(x === b));
      });
      b.setAttribute('aria-pressed', String(v === actual));
      opciones.append(b);
    }
    const caja = el('div', 'fila-ajuste');
    caja.append(el('p', '', titulo), opciones);
    return caja;
  };
  const filas = [
    fila('Aciertos para ir por la corona', R.OPCIONES.barra, a.barra, String, (v) => (a.barra = v)),
    fila('Preguntas de la corona (todas seguidas)', R.OPCIONES.corona, a.corona, String, (v) => (a.corona = v)),
    fila('Coronas para ganar', R.OPCIONES.coronas, a.coronas, String, (v) => (a.coronas = v)),
  ];
  if (solo) filas.push(fila('Vidas', R.OPCIONES.vidas, a.vidas, (v) => (v === null ? '∞' : String(v)), (v) => (a.vidas = v)));
  filas.push(fila('Tiempo por pregunta', R.OPCIONES.segundos, a.segundos, (v) => (v ? `${v} s` : 'Sin reloj'), (v) => (a.segundos = v)));
  for (const k of R.COMODINES) {
    filas.push(fila(`${COMODIN[k].join(' ')}`, R.CANTIDADES, a.comodines[k], String, (v) => (a.comodines[k] = v)));
  }
  $('trivia-marcador').replaceChildren();
  $('trivia-contenido').replaceChildren(el('h2', '', '⚙️ Personalizar'), ...filas);
  $('trivia-botones').replaceChildren(
    boton('✔ Listo', 'color', volver),
    boton('Volver a la clásica', '', () => {
      guardarAjustes(R.CLASICA);
      pintarAjustes(solo, volver);
    }),
  );
}

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
    tarjeta('🎡', 'Ruleta', pintarSolo),
    tarjeta('🎉', 'Fiesta', pintarFiesta),
    tarjeta(INFO_JUEGOS.trivia.icono, INFO_JUEGOS.trivia.nombre, () => abrirPrevia(INFO_JUEGOS.trivia)),
  );
}

// Ruleta en solitario: las reglas y empezar.
function pintarSolo() {
  pararTrivia();
  partida = null;
  mostrar('trivia-partida');
  $('trivia-marcador').replaceChildren();
  $('trivia-contenido').replaceChildren(el('h2', '', '🎡 Ruleta'), el('p', 'sin-datos', resumen(leerAjustes(), true)));
  $('trivia-botones').replaceChildren(
    boton('▶ Empezar', 'color', () => empezar('solo', [{ nombre: 'Tú' }])),
    boton('⚙️ Personalizar', '', () => pintarAjustes(true, pintarSolo)),
    boton('Volver', '', abrirTrivia),
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
    el('p', 'sin-datos', 'Os pasáis el celular: cada uno juega hasta fallar. Gana quien junte antes sus coronas 👑.'),
    lista,
    el('p', 'sin-datos', resumen(leerAjustes(), false)),
  );
  const botones = [];
  if (nombresFiesta.length < 6) botones.push(boton('＋ Jugador', '', () => { nombresFiesta.push(''); pintarFiesta(); }));
  if (nombresFiesta.length > 2) botones.push(boton('－ Jugador', '', () => { nombresFiesta.pop(); pintarFiesta(); }));
  botones.push(boton('▶ Empezar', 'color', () => empezar('fiesta', nombresFiesta.map((n, i) => ({ nombre: n.trim() || `Jugador ${i + 1}` })))));
  $('trivia-botones').replaceChildren(...botones, boton('⚙️ Personalizar', '', () => pintarAjustes(false, pintarFiesta)), boton('Volver', '', abrirTrivia));
}

// --- Partida ---

function empezar(modo, jugadores) {
  pararTrivia();
  const a = leerAjustes();
  const vidas = modo === 'solo' ? a.vidas : null;
  partida = { modo, a, jugadores: jugadores.map((j) => ({ ...j, e: R.inicial(a, vidas) })), turno: 0, giro: 0, apuntada: false };
  mostrar('trivia-partida');
  if (modo === 'fiesta') pintarTurno();
  else pintarRuleta();
}

const actual = () => partida.jugadores[partida.turno];

function pintarMarcador() {
  const { a } = partida;
  const j = actual();
  const fila = el('div', 'marcador-trivia');
  const coronas = el('div', 'coronas');
  coronas.setAttribute('aria-label', `Coronas: ${j.e.coronas.length} de ${a.coronas}`);
  for (const c of CATEGORIAS_TRIVIA) {
    const s = el('span', j.e.coronas.includes(c.id) ? 'corona tiene' : 'corona', c.icono);
    s.style.setProperty('--c', c.color);
    s.title = c.nombre;
    coronas.append(s);
  }
  const barra = el('span', 'barra-trivia', '●'.repeat(j.e.barra) + '○'.repeat(a.barra - j.e.barra));
  barra.setAttribute('aria-label', `Barra: ${j.e.barra} de ${a.barra}`);
  const izquierda = partida.modo === 'fiesta' ? el('strong', '', `📱 ${j.nombre}`)
    : el('span', '', j.e.vidas === null ? '❤️ ∞' : '❤️'.repeat(j.e.vidas) + '🤍'.repeat(a.vidas - j.e.vidas));
  fila.append(izquierda);
  if (a.coronas < CATEGORIAS_TRIVIA.length) fila.append(el('span', '', `${j.e.coronas.length}/${a.coronas} 👑`));
  fila.append(barra);
  const partes = [fila, coronas];
  if (partida.modo === 'fiesta') {
    partes.push(el('p', 'sin-datos', partida.jugadores.map((x) => `${x.nombre} ${x.e.coronas.length}👑`).join(' · ')));
  }
  $('trivia-marcador').replaceChildren(...partes);
}

// Fiesta: pantalla para pasar el celular.
function pintarTurno() {
  $('trivia-marcador').replaceChildren();
  $('trivia-contenido').replaceChildren(el('p', 'turno-trivia', `Turno de ${actual().nombre} 📱`), el('p', 'sin-datos', `${actual().e.coronas.length} de ${partida.a.coronas} coronas`));
  $('trivia-botones').replaceChildren(boton('▶ Estoy listo', 'grande color', pintarRuleta));
}

function pintarRuleta() {
  pintarMarcador();
  const e = actual().e;
  if (R.tocaCorona(e, partida.a)) return pintarElegirCorona();
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
  const varias = partida.a.corona > 1 ? `las ${partida.a.corona} preguntas difíciles seguidas` : 'esta pregunta difícil';
  $('trivia-contenido').replaceChildren(
    el('p', 'turno-trivia', '👑 ¡Pregunta corona!'),
    el('p', 'sin-datos', `Elige la categoría. Si aciertas ${varias}, ganas su corona.`),
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
  pararTrivia();
  pintarMarcador();
  const { a } = partida;
  const j = actual();
  const c = categoria(cat);
  // La corona siempre es difícil (si no quedan difíciles sin ver, se repiten).
  const q = pregunta((x) => x.c === cat && (!corona || x.d === 3));
  const reloj = el('span', 'reloj-trivia');
  const cabecera = el('div', 'cabecera-pregunta');
  cabecera.style.setProperty('--c', c.color);
  const titulo = corona ? `👑${a.corona > 1 ? ` ${j.e.progreso + 1}/${a.corona}` : ''} ` : '';
  cabecera.append(el('span', '', `${titulo}${c.icono} ${c.nombre}`), reloj);
  const opciones = q.opciones.map((o) => boton(o, 'grande opcion-trivia', (ev) => responder(o, ev.currentTarget)));

  // Comodines: botones con lo que queda; la segunda oportunidad es automática y solo se avisa.
  const ayudas = el('div', 'comodines');
  const texto = (tipo) => `${COMODIN[tipo][0]} ${COMODIN[tipo][1]} ×${j.e.comodines[tipo]}`;
  const comodin = (tipo, accion) => {
    if (!j.e.comodines[tipo]) return;
    const b = boton(texto(tipo), '', () => {
      j.e = R.usar(j.e, tipo);
      if (j.e.comodines[tipo]) b.textContent = texto(tipo);
      else b.remove();
      accion(b);
    });
    ayudas.append(b);
  };
  comodin('mitad', (b) => {
    b.remove(); // uno por pregunta
    for (const x of barajar(opciones.filter((x) => x.textContent !== q.correcta && !x.disabled)).slice(0, 2)) {
      x.disabled = true;
      x.classList.add('quitada');
    }
  });
  comodin('cambiar', () => pintarPregunta(cat, corona));
  if (a.segundos) comodin('tiempo', () => partida.reloj.restar(-MAS_TIEMPO));
  const segunda = el('span', 'sin-datos');
  const avisarSegunda = () => (segunda.textContent = j.e.comodines.segunda ? texto('segunda') : '');
  avisarSegunda();
  ayudas.append(segunda);

  $('trivia-contenido').replaceChildren(cabecera, el('p', 'pregunta-trivia', q.p), ...opciones, ayudas);
  $('trivia-botones').replaceChildren();
  partida.reloj = a.segundos ? temporizador(a.segundos, (s) => pintarReloj(reloj, s), () => responder(null)) : null;

  function responder(o, b) {
    const ok = o === q.correcta;
    if (!ok && o !== null && j.e.comodines.segunda) {
      j.e = R.usar(j.e, 'segunda');
      b.disabled = true;
      b.classList.add('incorrecta');
      avisarSegunda();
      sonar('fallo');
      return;
    }
    partida.reloj?.parar();
    ayudas.remove();
    for (const x of opciones) {
      x.disabled = true;
      if (x.textContent === q.correcta) x.classList.add('correcta');
      else if (x.textContent === o) x.classList.add('incorrecta');
    }
    if (o === null) reloj.textContent = '⏰ ¡Tiempo!';
    sonar(ok ? 'acierto' : 'fallo');
    j.e = corona ? R.responderCorona(j.e, cat, ok, a) : R.responder(j.e, ok, a);
    pintarMarcador();
    partida.espera = setTimeout(() => seguir(ok, cat), ok ? 900 : 1800);
  }
}

function seguir(ok, cat) {
  const j = actual();
  const fin = R.resultado(j.e, partida.a);
  if (fin) return pintarFin(fin);
  if (j.e.progreso > 0) return pintarPregunta(cat, true); // sigue la corona
  if (!ok && partida.modo === 'fiesta') {
    partida.turno = (partida.turno + 1) % partida.jugadores.length;
    return pintarTurno();
  }
  pintarRuleta();
}

function pintarFin(fin) {
  const { a } = partida;
  const j = actual();
  if (!partida.apuntada) {
    partida.apuntada = true;
    ligaAnotar('partida');
    // Solo las partidas clásicas cuentan para el récord y los logros.
    if (partida.modo === 'solo' && R.esClasica(a)) {
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
  const titulo = partida.modo === 'fiesta' ? `🏆 ¡Gana ${j.nombre}!` : fin === 'gana' ? `🏆 ¡Juntaste las ${a.coronas} coronas!` : 'Sin vidas 💔';
  $('trivia-contenido').replaceChildren(
    el('p', 'turno-trivia', titulo),
    el('p', 'sin-datos', `${j.e.coronas.length} 👑 · ${j.e.aciertos} aciertos · ${j.e.fallos} fallos`),
  );
  $('trivia-botones').replaceChildren(
    boton('🔄 Otra partida', 'color', () => empezar(partida.modo, partida.jugadores.map(({ nombre }) => ({ nombre })))),
    boton('Volver a Trivia', '', abrirTrivia),
  );
}
