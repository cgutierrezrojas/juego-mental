// 🎲 Mesa: juegos por turnos (ver JUEGOS_MESA) contra la máquina, a dos en un celular o contra un amigo.
// Con un amigo, la misma partida sirve en vivo y por turnos: se guarda en la Realtime Database (`mesas/{id}`).
// Cada juego (games/gato.js, games/conecta4.js) define sus reglas y su máquina; aquí se pinta y se juega.
import { el, leer, guardar } from '../games/comun.js';
import { sonar } from '../games/efectos.js';
import { DIFICULTADES } from '../games/modos.js';
import { amigosDe } from '../games/amigos.js';
import { gato } from '../games/gato.js';
import { conecta4, COLUMNAS, FILAS } from '../games/conecta4.js';
import { damas } from '../games/damas.js';
import { tableroDamas } from './mesa-damas.js';
import { reversi, contar as contarReversi } from '../games/reversi.js';
import { tableroReversi } from './mesa-reversi.js';
import { cajas, contar as contarCajas } from '../games/cajas.js';
import { tableroCajas } from './mesa-cajas.js';
import { naval, FLOTA as FLOTA_NAVAL, flotaAlAzar, nuevaSal, sellar, responder, vencedor, verificar, coherente, siguePartida, trampaPorRendicion, igual } from '../games/naval.js';
import { colocarFlota, tableroNaval, textoRespuesta } from './mesa-naval.js';
import { E } from './estado.js';
import { CARA } from './juegos.js';
import { leerJSON, apuntarLogros } from './datos.js';
import { $, mostrar, confeti, preguntar } from './ui.js';
import { ligaAnotar } from './liga.js';
import { anotarPerfil } from './perfil.js';
import { finDePartida } from './anuncios.js';
import { asegurarDuelista } from './duelos.js';

export const JUEGOS_MESA = [
  { ...gato, icono: '⭕', reglas: 'Haz 3 en raya (fila, columna o diagonal) antes que tu rival.', fichas: { x: '❌', o: '⭕' },
    tablero: tableroGato, ultimaJugada: (a, d) => [...d.celdas].findIndex((c, k) => c !== a.celdas[k]) },
  { ...conecta4, icono: '🔴', reglas: 'Deja caer tus fichas y haz 4 en raya antes que tu rival.', fichas: { x: '🔴', o: '🟡' },
    tablero: tableroConecta, ultimaJugada: (a, d) => [...d.celdas].findIndex((c, k) => c !== a.celdas[k]) % COLUMNAS },
  { ...damas, icono: '⚫', reglas: 'Damas latinas: comer es obligatorio y manda la jugada que más come. La dama vuela en diagonal.', fichas: { x: '⚪', o: '⚫' },
    tablero: tableroDamas,
    marcador: (e) => { const f = (t) => { const k = [...e.celdas].filter((c) => c.toLowerCase() === t).length; return `${k} pieza${k === 1 ? '' : 's'}`; }; return { x: f('x'), o: f('o') }; },
    ultimaJugada: (a, d) => [...d.celdas].findIndex((c, k) => c !== '.' && a.celdas[k] === '.') },
  { ...reversi, icono: '⚪', reglas: 'Encierra las fichas del rival entre dos tuyas para darlas vuelta. Gana quien tenga más al final.', fichas: { x: '⚫', o: '⚪' },
    tablero: tableroReversi,
    marcador: (e) => { const n = contarReversi(e); const f = (k) => `${k} ficha${k === 1 ? '' : 's'}`; return { x: f(n.x), o: f(n.o) }; },
    ultimaJugada: (a, d) => [...d.celdas].findIndex((c, k) => c !== '.' && a.celdas[k] === '.') },
  { ...cajas, icono: '✏️', reglas: 'Traza una línea por turno. Si cierras una caja es tuya y vuelves a jugar. Gana quien tenga más cajas.', fichas: { x: '🟦', o: '🟥' },
    opciones: [{ clave: 'n', nombre: 'Tamaño', valores: [[3, '3×3'], [4, '4×4'], [5, '5×5']], defecto: 4 }],
    tablero: tableroCajas,
    marcador: (e) => { const c = contarCajas(e); const f = (k) => `${k} caja${k === 1 ? '' : 's'}`; return { x: f(c.x), o: f(c.o) }; },
    ultimaJugada: (a, d) => [...d.celdas].findIndex((c, k) => c === '-' && a.celdas[k] === '.') },
  { ...naval, icono: '🚢', reglas: 'Coloca tus 5 barcos (no pueden tocarse) y hunde la flota rival disparando por turnos.', fichas: { x: '🚢', o: '⛴️' },
  tablero: tableroNaval,
  marcador: (e) => ({ x: `${e.tiros.x.filter(([, r]) => r[0] === 'h').length}/${FLOTA_NAVAL.length} hundidos`, o: `${e.tiros.o.filter(([, r]) => r[0] === 'h').length}/${FLOTA_NAVAL.length} hundidos` }),
  aNube: (e) => ({ turno: e.turno, datos: JSON.stringify(e) }),
  // Unos `datos` ilegibles solo los escribe un rival tramposo: null (ver ilegible en alActualizar).
  deNube: (s) => { try { const e = JSON.parse(s.datos); return e && typeof e === 'object' ? e : null; } catch { return null; } },
  async preparar({ modo, contenedor }) {
    const x = await colocarFlota(contenedor, modo === 'local' ? '🚢 Jugador 1: coloca tu flota' : '🚢 Coloca tu flota');
    if (!x) return null;
    if (modo !== 'local') return { barcos: { x, o: flotaAlAzar() } };
    contenedor.replaceChildren(el('h3', '', '📱 Pasa el celular a Jugador 2'));
    await new Promise((r) => { const b = el('button', 'color grande', '👀 Ya lo tengo'); b.onclick = r; contenedor.append(b); });
    const o = await colocarFlota(contenedor, '⛴️ Jugador 2: coloca tu flota');
    return o ? { barcos: { x, o } } : null;
  },
  // Con un amigo: cada celular responde solo a los tiros del rival con su flota guardada en `naval:<id>`
  // ({ barcos, sal, hist }). `hist` = [estado con el que me llegó el turno, ...lo que escribí después]: el rival puede
  // escribir cualquier `datos`, así que cada estado que me devuelve el turno se revisa contra eso con siguePartida y,
  // al final, lo que revela con verificar.
  alJugar(partida) {
    const mio = leerNaval(partida.id);
    if (mio?.hist) guardarNaval(partida.id, { ...mio, hist: [...mio.hist, partida.estado] });
  },
  alEnviado: (partida, estado) => confirmarNaval(partida.id, estado),
  async alActualizar({ partida: p, enviar, sigue }) {
    const e = p.estado;
    const yo = p.yo;
    const rival = otro(yo);
    let mio = leerNaval(p.id);
    p.misBarcos = mio?.barcos ?? null;
    // ¿Es una continuación exacta de lo mío (sin historial, formato viejo: no se sabe) y mis respuestas son las de mi flota?
    const cuadra = () => !mio || ((!mio.hist || siguePartida(mio.hist, e, yo)) && Array.isArray(e.tiros?.[rival]) && coherente(mio.barcos, e.tiros[rival]));
    if (p.mesa.ganador) {
      // Revisión final (una vez): rendiciones, cambios del rival y lo que reveló contra su sello y sus respuestas.
      if (p.trampaRival !== undefined) return;
      const rendido = p.mesa.rendido ?? {};
      let trampa = trampaPorRendicion(p.mesa.ganador, yo, !!rendido[p.mesa.jugadores[yo]], !!rendido[p.mesa.jugadores[rival]]);
      if (trampa === null) trampa = !cuadra() || !(await verificar(e, rival));
      p.trampaRival = trampa;
      return;
    }
    if (p.ilegible) {
      // `datos` ilegibles (se sigue con el último estado bueno, `e`): con mi turno es trampa; si no, se ignoran.
      if (p.mesa.estado.turno !== yo) return;
      p.trampaRival = true;
      if (!(await enviar(e, yo))) p.trampaRival = undefined;
      return;
    }
    if (!mio && e.sellos?.[yo]) { p.sinBarcos = true; return; } // datos borrados: solo puede rendirse
    if (e.turno !== yo) return; // turno del rival (o mi propio eco): se revisa cuando me lo devuelva
    // Cada cosa que escribo se anota en `hist` antes de enviarla.
    const escribir = async (est, g) => {
      mio.hist.push(est);
      guardarNaval(p.id, mio);
      const ok = await enviar(est, g);
      if (ok) confirmarNaval(p.id, est);
      return ok;
    };
    if (!mio) {
      // Invitado que aún no coloca: coloca, sella y escribe (sigue siendo su turno).
      limpiarCabecera();
      const barcos = await colocarFlota($('mesa-tablero-juego'), '🚢 Coloca tu flota');
      if (!sigue()) return;
      if (!barcos) { pararMesa(); return abrirMesa(); }
      mio = { barcos, sal: nuevaSal(), hist: [e] };
      p.misBarcos = barcos;
      return escribir({ ...e, sellos: { ...e.sellos, [yo]: await sellar(barcos, mio.sal) } });
    }
    // Un cambio que no cuadra, o un tiro repetido o fuera del tablero: trampa. Se cierra a mi favor sin revelar nada.
    // (cuadra antes de responder: responder no se fía de un estado que no cuadra)
    const pendiente = e.pendiente !== null && e.pendiente !== undefined;
    const nuevo = cuadra() ? (pendiente ? responder(e, mio.barcos) : e) : null;
    if (!nuevo || (nuevo === e && pendiente)) {
      p.trampaRival = true;
      if (!(await enviar(e, yo))) p.trampaRival = undefined; // se reintenta con la próxima actualización
      return;
    }
    mio = { barcos: mio.barcos, sal: mio.sal, hist: [e] }; // aceptado: es la nueva base
    guardarNaval(p.id, mio);
    // Mi sello no llegó a la mesa (falló el envío): se vuelve a mandar antes que nada.
    if (!e.sellos?.[yo]) return escribir({ ...e, sellos: { ...e.sellos, [yo]: await sellar(mio.barcos, mio.sal) } });
    const mostrado = { barcos: mio.barcos, sal: mio.sal }; // lo que se revela
    const v = vencedor(nuevo);
    if (v && v !== yo && !nuevo.revelado?.[yo]) {
      // Perdí: revelo y paso el turno al ganador para que revele y cierre.
      return escribir({ ...nuevo, revelado: { ...nuevo.revelado, [yo]: mostrado }, turno: v });
    }
    if (v === yo && !nuevo.revelado?.[yo]) {
      const final = { ...nuevo, revelado: { ...nuevo.revelado, [yo]: mostrado } };
      const trampa = !(await verificar(final, rival));
      if (!sigue()) return;
      p.trampaRival = trampa;
      if (!(await escribir(final, yo))) p.trampaRival = undefined;
      return;
    }
    if (nuevo !== e) return escribir(nuevo);
  } },
];
const leerNaval = (id) => JSON.parse(leer('naval:' + id) || 'null');
const guardarNaval = (id, mio) => guardar('naval:' + id, JSON.stringify(mio));
// Una escritura mía llegó a la nube: lo de antes ya no puede volver como «escritura perdida» (si vuelve, lo escribió el rival).
// ponytail: si la app se cierra justo entre que la nube guarda y avisa, ese único paso queda sin confirmar.
function confirmarNaval(id, estado) {
  const mio = leerNaval(id);
  const k = mio?.hist?.findIndex((h) => igual(h, estado)) ?? -1;
  if (k > 0) guardarNaval(id, { ...mio, hist: mio.hist.slice(k) });
}
const aNube = (j, e) => (j.aNube ? j.aNube(e) : e);
const deNube = (j, s) => (j.deNube ? j.deNube(s) : s);
const juegoDe = (id) => JUEGOS_MESA.find((j) => j.id === id);
const CADUCA = 7 * 24 * 60 * 60 * 1000; // una partida sin movimientos en 7 días se da por perdida para todos
const otro = (f) => (f === 'x' ? 'o' : 'x');
// Sin el marcador ni los botones de la partida anterior (al colocar la flota de Batalla naval).
function limpiarCabecera() {
  $('mesa-estado').textContent = '';
  $('mesa-jugadores').replaceChildren();
  $('mesa-botones').replaceChildren();
}

// Partida abierta: { juego, modo: 'maquina' | 'local' | 'amigo', nivel, estado, yo, nombres, id, parar, apuntada }
let partida = null;
let elegido = { juego: null, nivel: 'normal', opciones: {} }; // pantalla de elegir modo

export function pararMesa() {
  partida?.parar?.();
  if (partida) partida.parar = null;
}

// --- Página de la sección ---

export function abrirMesa() {
  mostrar('mesa');
  pintarMesa();
}

async function pintarMesa() {
  $('mesa-juegos').replaceChildren(...JUEGOS_MESA.map((j) => {
    const b = el('button', 'tarjeta color');
    b.style.setProperty('--c', 'var(--verde)');
    b.append(el('span', 'icono', j.icono), el('span', '', j.nombre));
    b.onclick = () => abrirModo(j.id);
    return b;
  }));
  const caja = $('mesa-partidas');
  if (!E.usuario || !E.nube?.hayEstados()) return caja.replaceChildren();
  caja.replaceChildren(el('p', 'sin-datos', 'Cargando tus partidas con amigos…'));
  try {
    const filas = (await misPartidas()).filter(({ mesa }) => juegoDe(mesa.juego)); // la ruleta se lista en Trivia
    if (!filas.length) return caja.replaceChildren();
    caja.replaceChildren(el('h3', 'categoria', '👥 Tus partidas con amigos'), ...filas.slice(0, 12).map(({ id, mesa, info }) => {
      const j = juegoDe(mesa.juego);
      const mia = mesa.jugadores.x === E.usuario.uid ? 'x' : 'o';
      const resultado = resultadoMesa(mesa, mia);
      let detalle = mesa.jugadores[mesa.estado.turno] === E.usuario.uid ? '▶ Tu turno' : `⏳ Turno de ${info.nombreRival}`;
      if (resultado) detalle = { v: '🏆 Ganaste', d: 'Perdiste', e: '🤝 Empate' }[resultado];
      const b = el('button', `fila-duelo ${resultado ? `resultado-${resultado}` : detalle.startsWith('▶') ? 'tu-turno' : ''}`);
      b.append(el('span', '', `${j.icono} ${j.nombre} vs ${info.nombreRival}`), el('small', '', detalle));
      b.onclick = () => abrirPartidaAmigo(id);
      return b;
    }));
  } catch {
    caja.replaceChildren(el('p', 'sin-datos', 'No se pudieron cargar tus partidas (¿sin conexión?).'));
  }
}

// Partidas con amigos (las caducadas se quitan), de la más reciente a la más antigua. También las de 🎡 Ruleta.
export async function misPartidas() {
  const uid = E.usuario.uid;
  const indice = await E.nube.misMesasDe(uid);
  const filas = await Promise.all(Object.entries(indice).map(async ([id, info]) => {
    const mesa = await E.nube.leerMesa(id).catch(() => null);
    const vieja = mesa && !mesa.ganador && Date.now() - (mesa.actualizada ?? 0) > CADUCA;
    if (!mesa || vieja) {
      E.nube.quitarDeMisMesas(uid, id);
      if (mesa && mesa.jugadores.x === uid) E.nube.borrarMesa(id);
      return null;
    }
    return { id, mesa, info };
  }));
  return filas.filter(Boolean).sort((a, b) => (b.mesa.actualizada ?? 0) - (a.mesa.actualizada ?? 0));
}

// Partidas con amigos en las que te toca mover (para el aviso de ⚔️ en la barra).
export async function mesasEnTuTurno() {
  if (!E.usuario || !E.nube?.hayEstados()) return 0;
  return (await misPartidas()).filter(({ mesa }) => !mesa.ganador && mesa.jugadores[mesa.estado.turno] === E.usuario.uid).length;
}

// 'v' / 'd' / 'e' para la ficha `mia`, o null si la partida sigue.
export function resultadoMesa(mesa, mia) {
  if (!mesa.ganador) return null;
  if (mesa.ganador === 'empate') return 'e';
  return mesa.ganador === mia ? 'v' : 'd';
}

// --- Elegir modo ---

function abrirModo(id) {
  const j = juegoDe(id);
  elegido = { ...elegido, juego: id, opciones: Object.fromEntries((j.opciones ?? []).map((o) => [o.clave, o.defecto])) };
  mostrar('mesa-modo');
  pintarModo();
}

function selectoresOpciones(j) {
  return (j.opciones ?? []).flatMap((o) => {
    const grupo = el('div', 'opciones-duelo');
    grupo.setAttribute('role', 'group');
    grupo.setAttribute('aria-label', o.nombre);
    for (const [valor, texto] of o.valores) {
      const b = el('button', '', texto);
      b.setAttribute('aria-pressed', elegido.opciones[o.clave] === valor);
      b.onclick = () => { elegido.opciones[o.clave] = valor; pintarModo(); };
      grupo.append(b);
    }
    return [el('h3', 'categoria', o.nombre), grupo];
  });
}

async function pintarModo() {
  const j = juegoDe(elegido.juego);
  $('mesa-modo-titulo').textContent = `${j.icono} ${j.nombre}`;
  const boton = (texto, clase, alPulsar) => {
    const b = el('button', clase, texto);
    if (clase.includes('color')) b.style.setProperty('--c', 'var(--verde)');
    b.onclick = alPulsar;
    return b;
  };
  const record = leerJSON('mesa:maquina')[j.id]?.[elegido.nivel] ?? { v: 0, d: 0, e: 0 };
  const niveles = el('div', 'opciones-duelo');
  niveles.setAttribute('role', 'group');
  niveles.setAttribute('aria-label', 'Dificultad de la máquina');
  for (const [d, nombre] of Object.entries(DIFICULTADES)) {
    const b = boton(`${CARA[d]} ${nombre}`, '', () => {
      elegido.nivel = d;
      pintarModo();
      $('mesa-modo-contenido').querySelector('[aria-label="Dificultad de la máquina"] [aria-pressed="true"]')?.focus();
    });
    b.setAttribute('aria-pressed', d === elegido.nivel);
    niveles.append(b);
  }
  const amigos = el('div', 'opciones-duelo');
  const partes = [
    el('p', 'sin-datos', j.reglas),
    ...selectoresOpciones(j),
    el('h3', 'categoria', '🤖 Contra la máquina'),
    niveles,
    el('p', 'sin-datos', `Contra la máquina (${DIFICULTADES[elegido.nivel]}): ${record.v} victorias · ${record.e} empates · ${record.d} derrotas`),
    boton('▶ Jugar contra la máquina', 'grande color', () => empezar({ juego: j.id, modo: 'maquina', nivel: elegido.nivel, opciones: elegido.opciones })),
    el('h3', 'categoria', '📱 Dos en este celular'),
    boton('▶ Jugar a dos (pasándoos el celular)', '', () => empezar({ juego: j.id, modo: 'local', opciones: elegido.opciones })),
    el('h3', 'categoria', '👥 Contra un amigo'),
    amigos,
  ];
  $('mesa-modo-contenido').replaceChildren(...partes);
  if (!E.usuario || !E.nube?.hayEstados()) {
    return amigos.replaceChildren(boton('Entra para jugar con tus amigos', '', () => asegurarDuelista()));
  }
  amigos.replaceChildren(el('span', 'sin-datos', 'Cargando tus amigos…'));
  try {
    const { amigos: lista } = amigosDe(await E.nube.misSolicitudes(E.usuario.uid), E.usuario.uid);
    if (!lista.length) return amigos.replaceChildren(el('span', 'sin-datos', 'Aún no tienes amigos: agrégalos en 👥 Amigos.'));
    amigos.replaceChildren(...lista.map((a) => boton(`👥 ${a.apodo}`, '', () => retarAmigo(j.id, a, elegido.opciones))));
  } catch {
    amigos.replaceChildren(el('span', 'sin-datos', 'No se pudieron cargar tus amigos (¿sin conexión?).'));
  }
}

async function retarAmigo(juego, amigo, opciones = {}) {
  if (!(await asegurarDuelista())) return;
  const j = juegoDe(juego);
  let secreto = null;
  let estado = j.inicial({ ...opciones, amigo: juego === 'naval' });
  if (juego === 'naval') {
    // Con un amigo, a la mesa solo va el sello de la flota; la flota y la sal quedan en este celular.
    pararMesa();
    mostrar('mesa-tablero');
    limpiarCabecera();
    const barcos = await colocarFlota($('mesa-tablero-juego'), `🚢 Coloca tu flota contra ${amigo.apodo}`);
    if (!barcos) return abrirModo(juego);
    const sal = nuevaSal();
    const sello = await sellar(barcos, sal);
    estado = { ...estado, sellos: { x: sello } };
    secreto = { barcos, sal, hist: [estado] }; // mi primera escritura
  }
  try {
    const id = await E.nube.crearMesa({
      juego,
      jugadores: { x: E.usuario.uid, o: amigo.uid },
      nombres: { [E.usuario.uid]: leer('nube:apodo'), [amigo.uid]: amigo.apodo },
      estado: aNube(j, estado),
    });
    if (secreto) guardarNaval(id, secreto);
    abrirPartidaAmigo(id);
  } catch {
    if (secreto) abrirModo(juego); // estaba en la pantalla de colocar: se vuelve para ver el aviso
    $('mesa-modo-contenido').append(el('p', 'aviso-duelo', `No se pudo crear la partida. ¿${amigo.apodo} sigue siendo tu amigo y hay conexión?`));
  }
}

// --- Partida ---

let empezando = 0; // cuenta de intentos: si el jugador se va mientras se prepara, no se crea la partida
async function empezar({ juego, modo, nivel, opciones = {} }) {
  pararMesa();
  const mio = ++empezando;
  const j = juegoDe(juego);
  let extra = {};
  if (j.preparar) {
    mostrar('mesa-tablero');
    limpiarCabecera();
    extra = await j.preparar({ modo, contenedor: $('mesa-tablero-juego') });
    if (mio !== empezando || $('mesa-tablero').hidden) return; // se fue o empezó otra
    if (!extra) return abrirModo(juego); // canceló
  }
  partida = { juego, modo, nivel, opciones, estado: j.inicial({ ...opciones, ...extra }), yo: 'x', nombres: null, id: null, apuntada: false };
  partida.repintar = pintarTablero;
  if (modo === 'local' && juego === 'naval') { partida.tapado = true; partida.ultimoTexto = ''; } // el celular aún está en manos de Jugador 2
  mostrar('mesa-tablero');
  pintarTablero();
  moverMaquina();
}

async function abrirPartidaAmigo(id) {
  if (!(await asegurarDuelista())) return;
  pararMesa();
  partida = { modo: 'amigo', id, estado: null, apuntada: false };
  mostrar('mesa-tablero');
  $('mesa-estado').textContent = 'Cargando la partida…';
  partida.parar = E.nube.verMesa(id, async (mesa) => {
    if (!partida || partida.id !== id) return;
    if (!mesa) {
      $('mesa-estado').textContent = 'Esta partida ya no existe.';
      return;
    }
    const j = juegoDe(mesa.juego);
    let estado = deNube(j, mesa.estado);
    const ilegible = !estado; // (Batalla naval) se sigue con el último estado bueno
    if (ilegible) estado = partida.estado ?? j.inicial({ amigo: true });
    const nueva = partida.estado && !igual(estado, partida.estado);
    if (nueva && j.ultimaJugada) partida.ultima = j.ultimaJugada(partida.estado, estado); // la jugada del rival (para animarla)
    Object.assign(partida, { juego: mesa.juego, estado, mesa, ilegible, opciones: Object.fromEntries((j.opciones ?? []).filter((o) => estado[o.clave] !== undefined).map((o) => [o.clave, estado[o.clave]])), yo: mesa.jugadores.x === E.usuario.uid ? 'x' : 'o' });
    if (nueva) sonar('tic');
    if (j.alActualizar && !partida.escribiendo) {
      // Una revisión a la vez: si llega otra actualización mientras tanto, se repite al terminar con la última.
      const p = partida;
      if (p.ocupado) { p.otraVez = true; return; }
      p.ocupado = true;
      const sigue = () => partida === p && p.parar !== null && !$('mesa-tablero').hidden; // ¿no se fue ni empezó otra?
      try {
        do {
          p.otraVez = false;
          await j.alActualizar({ partida: p, enviar: (est, g) => enviarEstado(p, est, g), sigue });
        } while (p.otraVez && sigue());
      } finally {
        p.ocupado = false;
      }
      if (!sigue()) return;
    }
    pintarTablero();
  });
}

// Envía un estado propio (con o sin ganador) en una partida con un amigo; mientras se envía, no se reacciona al eco.
// Devuelve si se pudo; si no, deja un aviso que se ve hasta el próximo envío bueno.
async function enviarEstado(p, estado, ganador = null) {
  p.escribiendo = true;
  try {
    await E.nube.jugarMesa(p.id, aNube(juegoDe(p.juego), estado), ganador);
    p.estado = estado;
    p.aviso = null;
    return true;
  } catch {
    p.aviso = 'No se pudo enviar (¿sin conexión?).';
    if (p === partida) $('mesa-estado').textContent = p.aviso;
    return false;
  } finally {
    p.escribiendo = false;
  }
}

const nombreDe = (ficha) => {
  if (partida.modo === 'maquina') return ficha === partida.yo ? 'Tú' : `Máquina (${DIFICULTADES[partida.nivel]})`;
  if (partida.modo === 'local') return `Jugador ${ficha === 'x' ? 1 : 2}`;
  const uid = partida.mesa.jugadores[ficha];
  return uid === E.usuario.uid ? 'Tú' : partida.mesa.nombres?.[uid] ?? 'Rival';
};

// Ganador de la partida abierta: el del tablero o, con amigos, el que no se rindió.
function ganadorActual() {
  if (partida.modo === 'amigo') return partida.mesa?.ganador ?? null;
  return juegoDe(partida.juego).ganador(partida.estado);
}

function puedoJugar() {
  if (ganadorActual()) return false;
  if (partida.modo === 'maquina') return partida.estado.turno === partida.yo && !partida.pensando;
  if (partida.modo === 'local') return true;
  if (partida.sinBarcos || partida.trampaRival) return false;
  return partida.estado.turno === partida.yo;
}

function jugar(jugada) {
  const j = juegoDe(partida.juego);
  if (!puedoJugar() || !j.validas(partida.estado).includes(jugada)) return;
  const antes = partida.estado;
  partida.estado = j.aplicar(antes, jugada);
  partida.ultima = jugada;
  if (partida.modo === 'local' && partida.juego === 'naval') {
    partida.ultimoTexto = textoRespuesta(partida.estado.tiros[antes.turno].at(-1)[1]);
    partida.tapado = true;
  }
  // Reversi: si quien juega repite turno, el rival no tenía jugadas.
  partida.paso = partida.juego === 'reversi' && partida.estado.turno === antes.turno ? 'Tu rival no puede jugar: sigues' : null;
  sonar('tic');
  const g = j.ganador(partida.estado);
  if (partida.modo === 'amigo') {
    const p = partida; // al fallar, `partida` puede ser otra
    j.alJugar?.(p, jugada);
    p.mesa = { ...p.mesa, estado: p.estado, ganador: g ?? p.mesa.ganador };
    const enviado = p.estado;
    E.nube.jugarMesa(p.id, aNube(j, enviado), g).then(() => j.alEnviado?.(p, enviado), () => {
      p.estado = antes; // no se pudo guardar: se deshace
      if (p === partida) $('mesa-estado').textContent = 'No se pudo enviar la jugada (¿sin conexión?).';
    });
  }
  pintarTablero();
  moverMaquina();
}

// La máquina juega mientras sea su turno (Reversi y Cajas pueden darle varias jugadas seguidas).
function moverMaquina() {
  const esta = partida;
  const j = juegoDe(esta.juego);
  if (esta.modo !== 'maquina' || j.ganador(esta.estado) || esta.estado.turno === esta.yo) return;
  esta.pensando = true;
  pintarTablero();
  setTimeout(() => {
    if (partida !== esta) return;
    esta.ultima = j.ia(esta.estado, esta.nivel);
    const antes = esta.estado;
    esta.estado = j.aplicar(antes, esta.ultima);
    esta.paso = esta.juego === 'reversi' && esta.estado.turno === antes.turno ? 'No puedes jugar: sigue la máquina' : null;
    esta.pensando = false;
    sonar('tic');
    pintarTablero();
    moverMaquina();
  }, 450);
}

// Resultado de una partida con un amigo (Mesa o Ruleta): se apunta una sola vez por partida.
export function apuntarResultadoAmigo(id, r, seccion = 'mesa') {
  const resultados = leerJSON('mesa:resultados');
  if (resultados[id]) return;
  resultados[id] = r;
  guardar('mesa:resultados', JSON.stringify(resultados));
  ligaAnotar('partida', 1, seccion);
  ligaAnotar({ v: 'victoria', e: 'empate' }[r], 1, seccion);
  apuntarLogros();
}

// Al terminar: estadísticas (una sola vez), liga y celebración.
function apuntarFinal(g) {
  if (partida.apuntada) return;
  partida.apuntada = true;
  if (partida.modo !== 'amigo') { ligaAnotar('partida', 1, 'mesa'); finDePartida(); }
  let r = g === 'empate' ? 'e' : g === partida.yo ? 'v' : 'd';
  if (partida.trampaRival) r = 'v';
  if (partida.modo === 'maquina') {
    const stats = leerJSON('mesa:maquina');
    const delJuego = stats[partida.juego] ?? {};
    const actual = delJuego[partida.nivel] ?? { v: 0, d: 0, e: 0 };
    stats[partida.juego] = { ...delJuego, [partida.nivel]: { ...actual, [r]: actual[r] + 1 } };
    guardar('mesa:maquina', JSON.stringify(stats));
  }
  if (partida.modo === 'maquina' && r === 'v') anotarPerfil('victoria', 1, 'mesa');
  if (partida.modo === 'amigo') apuntarResultadoAmigo(partida.id, r);
  if (partida.modo === 'amigo' && partida.juego === 'naval') {
    try { localStorage.removeItem('naval:' + partida.id); } catch { /* sin localStorage */ } // ya no hace falta: no crece sin fin en la nube
  }
  if (r === 'v' || partida.modo === 'local') {
    confeti();
    sonar('record');
  }
}

function pintarTablero() {
  const j = juegoDe(partida.juego);
  const g = ganadorActual();
  // Batalla naval con un amigo: se apunta cuando ya terminó la revisión de trampas (es async).
  if (g && (partida.juego !== 'naval' || partida.modo !== 'amigo' || partida.trampaRival !== undefined)) apuntarFinal(g);
  const jugadores = ['x', 'o'].map((f) => {
    const d = el('div', `jugador-mesa${!g && partida.estado.turno === f ? ' turno' : ''}`);
    d.append(el('span', 'ficha-mesa', j.fichas[f]), el('span', '', nombreDe(f)));
    if (j.marcador) d.append(el('small', 'marcador-mesa', j.marcador(partida.estado)[f]));
    return d;
  });
  $('mesa-jugadores').replaceChildren(jugadores[0], el('span', 'vs', 'vs'), jugadores[1]);

  let estado;
  if (g === 'empate') estado = '🤝 Empate';
  else if (g) estado = partida.modo === 'local' ? `🏆 ¡Gana ${nombreDe(g)}!` : g === partida.yo ? '🏆 ¡Ganaste!' : partida.mesa?.rendido?.[E.usuario?.uid] ? 'Te rendiste.' : 'Perdiste esta vez.';
  else if (partida.pensando) estado = '🤖 Piensa la máquina…';
  else if (partida.modo === 'local') estado = `Turno de ${nombreDe(partida.estado.turno)} ${j.fichas[partida.estado.turno]}`;
  else estado = partida.estado.turno === partida.yo ? `▶ Tu turno ${j.fichas[partida.yo]}` : `⏳ Turno de ${nombreDe(partida.estado.turno)}`;
  if (!g && partida.paso) estado = `${partida.paso} · ${estado}`;
  if (partida.modo === 'amigo' && !g && partida.estado.turno !== partida.yo) estado += ' (puedes salir: te avisaremos en ⚔️)';
  if (partida.trampaRival) estado = '⚠️ Tu rival hizo trampa: cuenta como victoria tuya';
  if (partida.sinBarcos && !g) estado = 'No tienes tus barcos de esta partida en este celular. Solo puedes rendirte.';
  if (partida.aviso && !g) estado = `${partida.aviso} · ${estado}`;
  $('mesa-estado').textContent = estado;

  $('mesa-tablero-juego').replaceChildren(j.tablero({ partida, j, g, puedo: puedoJugar(), jugar }));

  const boton = (texto, clase, alPulsar) => {
    const b = el('button', clase, texto);
    if (clase.includes('color')) b.style.setProperty('--c', 'var(--verde)');
    b.onclick = alPulsar;
    return b;
  };
  const botones = [];
  if (g) {
    botones.push(boton(partida.modo === 'amigo' ? '🔄 Revancha' : '🔄 Otra partida', 'color', () => {
      if (partida.modo !== 'amigo') return empezar(partida);
      const rival = partida.mesa.jugadores[otro(partida.yo)];
      retarAmigo(partida.juego, { uid: rival, apodo: partida.mesa.nombres?.[rival] ?? 'Rival' }, partida.opciones ?? {});
    }));
  } else if (partida.modo === 'amigo') {
    botones.push(boton('🏳️ Rendirse', '', async () => {
      const seguro = await preguntar({ titulo: '🏳️ Rendirse', texto: 'Perderás esta partida.', boton: 'Rendirse' });
      if (seguro) E.nube.rendirseMesa(partida.id, E.usuario.uid, otro(partida.yo)).catch(() => {});
    }));
  }
  botones.push(boton('Volver a Mesa', '', abrirMesa));
  $('mesa-botones').replaceChildren(...botones);
}

function tableroGato({ partida, j, puedo, jugar }) {
  const rejilla = el('div', 'tablero-gato');
  rejilla.setAttribute('role', 'group');
  rejilla.setAttribute('aria-label', 'Tablero del gato');
  [...partida.estado.celdas].forEach((c, i) => {
    const b = el('button', c === '.' ? '' : `ficha-${c}`, c === '.' ? '' : j.fichas[c]);
    b.disabled = c !== '.' || !puedo;
    b.setAttribute('aria-label', `Fila ${Math.floor(i / 3) + 1}, columna ${(i % 3) + 1}, ${c === '.' ? 'vacía' : j.fichas[c]}`);
    b.onclick = () => jugar(i);
    rejilla.append(b);
  });
  return rejilla;
}

function tableroConecta({ partida, j, puedo, jugar }) {
  const rejilla = el('div', 'tablero-conecta');
  rejilla.setAttribute('role', 'group');
  rejilla.setAttribute('aria-label', 'Tablero de 4 en línea: elige una columna');
  for (let c = 0; c < COLUMNAS; c++) {
    const columna = el('button', 'columna-conecta');
    const libres = [...Array(FILAS).keys()].filter((f) => partida.estado.celdas[f * COLUMNAS + c] === '.').length;
    columna.disabled = !libres || !puedo;
    columna.setAttribute('aria-label', `Columna ${c + 1}, ${libres} hueco${libres === 1 ? '' : 's'}`);
    for (let f = 0; f < FILAS; f++) {
      const v = partida.estado.celdas[f * COLUMNAS + c];
      const hueco = el('span', `hueco${v !== '.' ? ` ficha-${v}` : ''}`, v === '.' ? '' : j.fichas[v]);
      if (partida.ultima === c && f === libres) hueco.classList.add('cae'); // la ficha que acaba de caer
      columna.append(hueco);
    }
    columna.onclick = () => jugar(c);
    rejilla.append(columna);
  }
  return rejilla;
}
