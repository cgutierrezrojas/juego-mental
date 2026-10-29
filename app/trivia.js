// ❓ Trivia: la página de la sección, la 🎡 Ruleta (solitario), la 🎉 Fiesta (de 2 a 6 en un celular)
// y la 👥 Ruleta contra un amigo (por turnos y en vivo, en `mesas/{id}` como la Mesa: ver app/mesa.js).
// Las reglas de la ruleta están en games/ruleta.js y las preguntas en games/preguntas.js.
// La ⚡ Trivia rápida es un juego más de JUEGOS (games/trivia.js) y se abre con la previa de siempre.
import { el, leer, guardar, barajar, temporizador, pintarReloj } from '../games/comun.js';
import { sonar } from '../games/efectos.js';
import { CATEGORIAS_TRIVIA, PREGUNTAS, pregunta, problemaPregunta, agregarPreguntas } from '../games/preguntas.js';
import * as R from '../games/ruleta.js';
import { amigosDe } from '../games/amigos.js';
import { E } from './estado.js';
import { INFO_JUEGOS } from './juegos.js';
import { leerJSON, apuntarLogros } from './datos.js';
import { abrirPrevia } from './previa.js';
import { $, mostrar, confeti, preguntar } from './ui.js';
import { ligaAnotar } from './liga.js';
import { asegurarDuelista } from './duelos.js';
import { misPartidas, resultadoMesa, apuntarResultadoAmigo } from './mesa.js';

export const JUEGOS_TRIVIA = 3; // Ruleta, Fiesta y Trivia rápida (para la cuenta del inicio)
const MAS_TIEMPO = 15;
const IDS = CATEGORIAS_TRIVIA.map((c) => c.id);
const categoria = (id) => CATEGORIAS_TRIVIA.find((c) => c.id === id);
const COMODIN = { mitad: ['✂️', '50:50'], cambiar: ['🔄', 'Cambiar pregunta'], segunda: ['🔁', 'Segunda oportunidad'], tiempo: ['⏱️', `+${MAS_TIEMPO} s`] };

// Partida abierta: { modo: 'solo' | 'fiesta' | 'amigo', a (ajustes), jugadores: [{ nombre, e }], turno, giro, apuntada, reloj, espera }
// Con un amigo además: { id, mesa, yo: 'x' | 'o', jugando (mi turno en curso), parar (deja de escuchar la mesa) }.
let partida = null;
let nombresFiesta = ['', ''];

const pararReloj = () => {
  partida?.reloj?.parar();
  clearTimeout(partida?.espera);
};

export function pararTrivia() {
  pararReloj();
  partida?.parar?.();
  if (partida) partida.parar = null;
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

// Una fila de botones para elegir un valor (el elegido queda con `aria-pressed`).
function filaOpciones(titulo, valores, actual, texto, cambiar) {
  const opciones = el('div', 'opciones-ajuste');
  opciones.setAttribute('role', 'group');
  opciones.setAttribute('aria-label', titulo);
  for (const v of valores) {
    const b = boton(texto(v), '', () => {
      cambiar(v);
      for (const x of opciones.children) x.setAttribute('aria-pressed', String(x === b));
    });
    b.setAttribute('aria-pressed', String(v === actual));
    opciones.append(b);
  }
  const caja = el('div', 'fila-ajuste');
  caja.append(el('p', '', titulo), opciones);
  return caja;
}

function pintarAjustes(solo, volver) {
  const a = leerAjustes();
  const fila = (titulo, valores, actual, texto, cambiar) => filaOpciones(titulo, valores, actual, texto, (v) => {
    cambiar(v);
    guardarAjustes(a);
  });
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
    tarjeta('👥', 'Contra un amigo', pintarAmigos),
    tarjeta(INFO_JUEGOS.trivia.icono, INFO_JUEGOS.trivia.nombre, () => abrirPrevia(INFO_JUEGOS.trivia)),
    tarjeta('✍️', 'Proponer pregunta', () => pintarProponer()),
  );
  pintarPartidas();
  pintarAdmin();
  bajarPreguntas();
}

// --- ✍️ Preguntas de los jugadores ---

const DIFICULTAD = { 1: '🙂 Fácil', 2: '😐 Normal', 3: '😈 Difícil' };
const borradorVacio = () => ({ c: '', d: 2, p: '', o: ['', '', '', ''] });
let borrador = borradorVacio();

// Las aprobadas se guardan en `trivia-extra` y se suman al banco (también sin conexión: ver games/preguntas.js).
// ponytail: se bajan todas cada vez; con cientos de aprobadas, bajar solo las nuevas.
async function bajarPreguntas() {
  if (!E.nube) return;
  try {
    const lista = await E.nube.preguntasAprobadas();
    guardar('trivia-extra', JSON.stringify(lista));
    agregarPreguntas(lista);
  } catch {
    // sin conexión: quedan las ya guardadas
  }
}

async function pintarProponer(enviada = false) {
  pararTrivia();
  partida = null;
  mostrar('trivia-partida');
  $('trivia-marcador').replaceChildren();
  const campo = (tag, etiqueta, valor, max, alCambiar) => {
    const c = el(tag);
    c.value = valor;
    c.maxLength = max;
    c.placeholder = etiqueta;
    c.setAttribute('aria-label', etiqueta);
    c.oninput = () => alCambiar(c.value);
    return c;
  };
  const campos = el('div', 'nombres-fiesta');
  campos.append(
    campo('textarea', 'Tu pregunta', borrador.p, 110, (v) => (borrador.p = v)),
    ...borrador.o.map((o, i) => campo('input', i ? `❌ Respuesta incorrecta ${i}` : '✅ Respuesta correcta', o, 26, (v) => (borrador.o[i] = v))),
  );
  const tituloCategoria = () => `Categoría${borrador.c ? `: ${categoria(borrador.c).nombre}` : ''}`;
  const categorias = filaOpciones('Categoría', IDS, borrador.c, (id) => categoria(id).icono, (id) => {
    borrador.c = id;
    categorias.firstChild.textContent = tituloCategoria();
  });
  categorias.firstChild.textContent = tituloCategoria();
  categorias.querySelectorAll('button').forEach((b, i) => {
    b.setAttribute('aria-label', CATEGORIAS_TRIVIA[i].nombre); // el botón solo lleva el icono
    b.title = CATEGORIAS_TRIVIA[i].nombre;
  });
  const aviso = el('p', 'sin-datos', enviada ? '✅ ¡Enviada! Aquí abajo verás cuándo se revise.' : '');
  aviso.setAttribute('aria-live', 'polite');
  const mias = el('div', 'opciones-duelo');
  $('trivia-contenido').replaceChildren(
    el('h2', '', '✍️ Proponer pregunta'),
    el('p', 'sin-datos', 'Si se aprueba, la jugarán todos. Escribe primero la respuesta correcta (en el juego se barajan).'),
    categorias,
    filaOpciones('Dificultad', [1, 2, 3], borrador.d, (d) => DIFICULTAD[d], (d) => (borrador.d = d)),
    campos,
    aviso,
    mias,
  );
  const enviar = boton('📨 Enviar', 'color', async () => {
    const q = { c: borrador.c, d: borrador.d, p: borrador.p.trim(), o: borrador.o.map((o) => o.trim()) };
    const problema = problemaPregunta(q);
    if (problema) return (aviso.textContent = problema);
    if (!(await asegurarDuelista())) return;
    enviar.disabled = true;
    try {
      await E.nube.proponer({ de: E.usuario.uid, apodo: leer('nube:apodo'), ...q });
      borrador = borradorVacio();
      pintarProponer(true);
    } catch {
      aviso.textContent = 'No se pudo enviar (¿sin conexión?).';
      enviar.disabled = false;
    }
  });
  $('trivia-botones').replaceChildren(enviar, boton('Volver', '', abrirTrivia));
  if (!E.usuario || !E.nube) return;
  try {
    const lista = (await E.nube.misPropuestas(E.usuario.uid)).sort((a, b) => b.creada - a.creada);
    if (!lista.length) return;
    const estado = { pendiente: '⏳ Pendiente', aprobada: '✅ Aprobada', rechazada: '❌ Rechazada' };
    mias.replaceChildren(el('h3', 'categoria', 'Tus propuestas'), ...lista.map((p) => {
      const fila = el('div', `fila-duelo ${{ aprobada: 'resultado-v', rechazada: 'resultado-d' }[p.estado] ?? ''}`);
      fila.append(el('span', '', `${categoria(p.c)?.icono ?? ''} ${p.p}`), el('small', '', estado[p.estado]));
      return fila;
    }));
  } catch {
    mias.replaceChildren(el('p', 'sin-datos', 'No se pudieron cargar tus propuestas (¿sin conexión?).'));
  }
}

// 🛡️ Solo para quien tiene un documento en `admins` (ver firestore.rules).
async function pintarAdmin() {
  const caja = $('trivia-admin');
  caja.replaceChildren();
  if (!E.usuario || !E.nube) return;
  try {
    if (!(await E.nube.esAdmin(E.usuario.uid))) return;
    const pendientes = await E.nube.propuestasPendientes();
    caja.replaceChildren(boton(`🛡️ Revisar propuestas (${pendientes.length})`, pendientes.length ? 'color' : '', pintarRevision));
  } catch {
    // sin conexión o sin permiso: no se muestra
  }
}

async function pintarRevision() {
  pararTrivia();
  partida = null;
  mostrar('trivia-partida');
  $('trivia-marcador').replaceChildren();
  const cargando = el('p', 'sin-datos', 'Cargando…');
  $('trivia-contenido').replaceChildren(el('h2', '', '🛡️ Revisar propuestas'), cargando);
  $('trivia-botones').replaceChildren(boton('Volver a Trivia', '', abrirTrivia));
  let lista;
  try {
    lista = (await E.nube.propuestasPendientes()).sort((a, b) => a.creada - b.creada);
  } catch {
    return (cargando.textContent = 'No se pudieron cargar (¿sin conexión?).');
  }
  if (!lista.length) return (cargando.textContent = 'No hay propuestas pendientes. 🎉');
  cargando.replaceWith(...lista.map((p) => {
    const c = categoria(p.c);
    const tarjeta = el('div', 'propuesta');
    const respuestas = el('ul');
    respuestas.append(...p.o.map((o, i) => el('li', '', `${i ? '❌' : '✅'} ${o}`)));
    const decidir = (aprobar) => async () => {
      try {
        await E.nube.revisarPropuesta(p, aprobar);
        if (aprobar) agregarPreguntas([p]);
        tarjeta.replaceChildren(el('p', 'sin-datos', `${aprobar ? '✅ Aprobada' : '❌ Rechazada'}: ${p.p}`));
      } catch {
        tarjeta.append(el('p', 'aviso-duelo', 'No se pudo guardar (¿sin conexión?).'));
      }
    };
    const botones = el('div', 'fila-botones');
    botones.append(boton('✅ Aprobar', 'color', decidir(true)), boton('❌ Rechazar', '', decidir(false)));
    tarjeta.append(el('p', 'sin-datos', `${c?.icono ?? ''} ${c?.nombre ?? p.c} · ${DIFICULTAD[p.d]} · de ${p.apodo}`), el('strong', '', p.p), respuestas, botones);
    return tarjeta;
  }));
}

// Tus ruletas con amigos (como «Tus partidas con amigos» de la Mesa).
async function pintarPartidas() {
  const caja = $('trivia-partidas');
  if (!E.usuario || !E.nube?.hayEstados()) return caja.replaceChildren();
  try {
    const filas = (await misPartidas()).filter(({ mesa }) => mesa.juego === 'ruleta');
    if (!filas.length) return caja.replaceChildren();
    caja.replaceChildren(el('h3', 'categoria', '👥 Tus ruletas con amigos'), ...filas.slice(0, 12).map(({ id, mesa, info }) => {
      const resultado = resultadoMesa(mesa, mesa.jugadores.x === E.usuario.uid ? 'x' : 'o');
      let detalle = mesa.jugadores[mesa.estado.turno] === E.usuario.uid ? '▶ Tu turno' : `⏳ Turno de ${info.nombreRival}`;
      if (resultado) detalle = { v: '🏆 Ganaste', d: 'Perdiste', e: '🤝 Empate' }[resultado];
      const b = el('button', `fila-duelo ${resultado ? `resultado-${resultado}` : detalle.startsWith('▶') ? 'tu-turno' : ''}`);
      b.append(el('span', '', `🎡 Ruleta vs ${info.nombreRival}`), el('small', '', detalle));
      b.onclick = () => abrirRuletaAmigo(id);
      return b;
    }));
  } catch {
    caja.replaceChildren(el('p', 'sin-datos', 'No se pudieron cargar tus ruletas con amigos (¿sin conexión?).'));
  }
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

// --- 👥 Contra un amigo ---

async function pintarAmigos() {
  pararTrivia();
  partida = null;
  mostrar('trivia-partida');
  $('trivia-marcador').replaceChildren();
  const amigos = el('div', 'opciones-duelo');
  $('trivia-contenido').replaceChildren(
    el('h2', '', '👥 Contra un amigo'),
    el('p', 'sin-datos', 'Por turnos: juegas hasta fallar y le toca a tu amigo. Gana quien junte antes sus coronas 👑.'),
    el('p', 'sin-datos', resumen(leerAjustes(), false)),
    amigos,
  );
  $('trivia-botones').replaceChildren(boton('⚙️ Personalizar', '', () => pintarAjustes(false, pintarAmigos)), boton('Volver', '', abrirTrivia));
  if (!E.usuario || !E.nube?.hayEstados()) {
    return amigos.replaceChildren(boton('Entra para jugar con tus amigos', '', () => asegurarDuelista()));
  }
  amigos.replaceChildren(el('span', 'sin-datos', 'Cargando tus amigos…'));
  try {
    const { amigos: lista } = amigosDe(await E.nube.misSolicitudes(E.usuario.uid), E.usuario.uid);
    if (!lista.length) return amigos.replaceChildren(el('span', 'sin-datos', 'Aún no tienes amigos: agrégalos en 👥 Amigos.'));
    amigos.replaceChildren(...lista.map((a) => boton(`👥 ${a.apodo}`, '', () => retarAmigo(a))));
  } catch {
    amigos.replaceChildren(el('span', 'sin-datos', 'No se pudieron cargar tus amigos (¿sin conexión?).'));
  }
}

// Partida nueva con tus ajustes; empiezas tú.
async function retarAmigo(amigo) {
  if (!(await asegurarDuelista())) return;
  const a = leerAjustes();
  const e = R.aNube(R.inicial(a, null));
  try {
    const id = await E.nube.crearMesa({
      juego: 'ruleta',
      jugadores: { x: E.usuario.uid, o: amigo.uid },
      nombres: { [E.usuario.uid]: leer('nube:apodo'), [amigo.uid]: amigo.apodo },
      ajustes: a,
      estado: { turno: 'x', x: e, o: e },
    });
    abrirRuletaAmigo(id);
  } catch {
    $('trivia-contenido').append(el('p', 'aviso-duelo', `No se pudo crear la partida. ¿${amigo.apodo} sigue siendo tu amigo y hay conexión?`));
  }
}

// La mesa en vivo: mientras juego mi turno (`jugando`) los ecos de mis propias jugadas no repintan nada.
async function abrirRuletaAmigo(id) {
  if (!(await asegurarDuelista())) return;
  pararTrivia();
  partida = { modo: 'amigo', id, mesa: null, giro: 0, apuntada: false, jugando: false };
  mostrar('trivia-partida');
  $('trivia-marcador').replaceChildren();
  $('trivia-contenido').replaceChildren(el('p', 'sin-datos', 'Cargando la partida…'));
  $('trivia-botones').replaceChildren(boton('Volver a Trivia', '', abrirTrivia));
  partida.parar = E.nube.verMesa(id, (mesa) => {
    if (partida?.id !== id) return;
    if (!mesa) return $('trivia-contenido').replaceChildren(el('p', 'sin-datos', 'Esta partida ya no existe.'));
    partida.mesa = mesa;
    if (partida.jugando && !(mesa.ganador && mesa.ganador !== partida.yo)) return;
    cargarMesa(mesa);
    if (mesa.ganador) return pintarFin();
    if (mesa.estado.turno !== partida.yo) return pintarEspera();
    partida.jugando = true;
    const p = mesa.estado.pendiente;
    if (p) pintarPregunta(p.cat, p.corona, p.p);
    else pintarRuleta();
  });
}

function cargarMesa(mesa) {
  const yo = mesa.jugadores.x === E.usuario.uid ? 'x' : 'o';
  const a = R.ajustesDe(mesa.ajustes);
  const nombre = (f) => (f === yo ? 'Tú' : mesa.nombres?.[mesa.jugadores[f]] ?? 'Rival');
  const ficha = mesa.ganador ?? mesa.estado.turno;
  Object.assign(partida, {
    yo,
    a,
    jugadores: ['x', 'o'].map((f) => ({ ficha: f, nombre: nombre(f), e: R.deNube(mesa.estado[f], a) })),
    turno: ficha === 'o' ? 1 : 0,
  });
}

// Sube el estado de la partida (tras cada respuesta, y con la pregunta pendiente al mostrarla).
function subir(pendiente, ganador, turno = actual().ficha) {
  if (partida.modo !== 'amigo') return;
  const [x, o] = partida.jugadores.map((j) => R.aNube(j.e));
  const estado = { turno, x, o, ...(pendiente ? { pendiente } : {}) };
  E.nube.jugarMesa(partida.id, estado, ganador).catch(() => {
    $('trivia-contenido').append(el('p', 'aviso-duelo', 'No se pudo guardar la jugada (¿sin conexión?).'));
  });
}

const rendirse = () => boton('🏳️ Rendirse', '', async () => {
  const seguro = await preguntar({ titulo: '🏳️ Rendirse', texto: 'Perderás esta partida.', boton: 'Rendirse' });
  if (seguro) E.nube.rendirseMesa(partida.id, E.usuario.uid, partida.yo === 'x' ? 'o' : 'x').catch(() => {});
});

// El turno del rival: su marcador, en vivo.
function pintarEspera() {
  pararReloj();
  partida.jugando = false;
  pintarMarcador();
  $('trivia-contenido').replaceChildren(
    el('p', 'turno-trivia', `⏳ Turno de ${actual().nombre}`),
    el('p', 'sin-datos', `${actual().e.aciertos} ${actual().e.aciertos === 1 ? 'acierto' : 'aciertos'} en la partida. Puedes salir: te avisaremos en ⚔️.`),
  );
  $('trivia-botones').replaceChildren(rendirse(), boton('Volver a Trivia', '', abrirTrivia));
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
  const izquierda = partida.modo !== 'solo' ? el('strong', '', `📱 ${j.nombre}`)
    : el('span', '', j.e.vidas === null ? '❤️ ∞' : '❤️'.repeat(j.e.vidas) + '🤍'.repeat(a.vidas - j.e.vidas));
  fila.append(izquierda);
  if (a.coronas < CATEGORIAS_TRIVIA.length) fila.append(el('span', '', `${j.e.coronas.length}/${a.coronas} 👑`));
  fila.append(barra);
  const partes = [fila, coronas];
  if (partida.modo !== 'solo') {
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
  $('trivia-botones').replaceChildren(girar, ...(partida.modo === 'amigo' ? [rendirse()] : []));
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

// `texto`: la pregunta pendiente de una partida con un amigo (al volver a abrirla sale la misma).
function pintarPregunta(cat, corona, texto) {
  pararReloj();
  pintarMarcador();
  const { a } = partida;
  const j = actual();
  const c = categoria(cat);
  // La corona siempre es difícil (si no quedan difíciles sin ver, se repiten).
  const guardada = texto && PREGUNTAS.find((x) => x.p === texto);
  const q = guardada ? { ...guardada, opciones: barajar(guardada.o), correcta: guardada.o[0] } : pregunta((x) => x.c === cat && (!corona || x.d === 3));
  const pendiente = { cat, corona, p: q.p };
  const reloj = el('span', 'reloj-trivia');
  const cabecera = el('div', 'cabecera-pregunta');
  cabecera.style.setProperty('--c', c.color);
  const titulo = corona ? `👑${a.corona > 1 ? ` ${j.e.progreso + 1}/${a.corona}` : ''} ` : '';
  cabecera.append(el('span', '', `${titulo}${c.icono} ${c.nombre}`), reloj);
  const opciones = q.opciones.map((o) => boton(o, 'grande opcion-trivia', (ev) => responder(o, ev.currentTarget)));

  // Comodines: botones con lo que queda.
  const ayudas = el('div', 'comodines');
  const etiqueta = (tipo) => `${COMODIN[tipo][0]} ${COMODIN[tipo][1]} ×${j.e.comodines[tipo]}`;
  const comodin = (tipo, accion) => {
    if (!j.e.comodines[tipo]) return;
    const b = boton(etiqueta(tipo), '', () => {
      j.e = R.usar(j.e, tipo);
      if (j.e.comodines[tipo]) b.textContent = etiqueta(tipo);
      else b.remove();
      subir(pendiente);
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
  // Segunda oportunidad: se activa antes de responder (una por pregunta) y solo se gasta si fallas y te salva.
  let segunda = false;
  if (j.e.comodines.segunda) {
    const b = boton(etiqueta('segunda'), '', () => {
      segunda = true;
      b.replaceWith(el('span', 'sin-datos', '🔁 Segunda oportunidad activa'));
    });
    ayudas.append(b);
  }
  if (a.segundos) comodin('tiempo', () => partida.reloj.restar(-MAS_TIEMPO));

  $('trivia-contenido').replaceChildren(cabecera, el('p', 'pregunta-trivia', q.p), ...opciones, ayudas);
  $('trivia-botones').replaceChildren();
  subir(pendiente);
  partida.reloj = a.segundos ? temporizador(a.segundos, (s) => pintarReloj(reloj, s), () => responder(null)) : null;

  function responder(o, b) {
    const ok = o === q.correcta;
    if (!ok && o !== null && segunda) {
      segunda = false;
      j.e = R.usar(j.e, 'segunda');
      subir(pendiente);
      b.disabled = true;
      b.classList.add('incorrecta');
      ayudas.querySelector('span').textContent = '🔁 ¡Elige otra vez!';
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
    const fin = R.resultado(j.e, a);
    subir(null, fin ? j.ficha : undefined, ok || fin ? j.ficha : partida.jugadores[1 - partida.turno].ficha);
    pintarMarcador();
    partida.espera = setTimeout(() => seguir(ok, cat), ok ? 900 : 1800);
  }
}

function seguir(ok, cat) {
  const j = actual();
  const fin = R.resultado(j.e, partida.a);
  if (fin) return pintarFin(fin);
  if (j.e.progreso > 0) return pintarPregunta(cat, true); // sigue la corona
  if (!ok && partida.modo !== 'solo') {
    partida.turno = (partida.turno + 1) % partida.jugadores.length;
    return partida.modo === 'amigo' ? pintarEspera() : pintarTurno();
  }
  pintarRuleta();
}

function pintarFin(fin) {
  pararReloj();
  if (partida.modo === 'amigo') return pintarFinAmigo();
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

// Fin con un amigo: el ganador es el de la mesa (o yo, si acabo de ganar y aún no llega el eco).
function pintarFinAmigo() {
  partida.jugando = false;
  const { mesa } = partida;
  const g = mesa.ganador ?? actual().ficha;
  const r = g === partida.yo ? 'v' : 'd';
  if (!partida.apuntada) {
    partida.apuntada = true;
    apuntarResultadoAmigo(partida.id, r);
    if (r === 'v') {
      confeti();
      sonar('record');
    }
  }
  partida.turno = g === 'o' ? 1 : 0;
  pintarMarcador();
  const titulo = r === 'v' ? '🏆 ¡Ganaste!' : mesa.rendido?.[E.usuario.uid] ? 'Te rendiste.' : `🏆 Ganó ${actual().nombre}`;
  const detalle = r === 'v' && mesa.rendido ? 'Tu rival se rindió.' : `${actual().e.coronas.length} 👑 · ${actual().e.aciertos} aciertos`;
  $('trivia-contenido').replaceChildren(el('p', 'turno-trivia', titulo), el('p', 'sin-datos', detalle));
  const rival = mesa.jugadores[partida.yo === 'x' ? 'o' : 'x'];
  $('trivia-botones').replaceChildren(
    boton('🔄 Revancha', 'color', () => retarAmigo({ uid: rival, apodo: mesa.nombres?.[rival] ?? 'Rival' })),
    boton('Volver a Trivia', '', abrirTrivia),
  );
}
