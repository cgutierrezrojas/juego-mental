// 🎲 Mesa: juegos por turnos (Gato y Conecta 4) contra la máquina, a dos en un celular o contra un amigo.
// Con un amigo, la misma partida sirve en vivo y por turnos: se guarda en la Realtime Database (`mesas/{id}`).
// Cada juego (games/gato.js, games/conecta4.js) define sus reglas y su máquina; aquí se pinta y se juega.
import { el, leer, guardar } from '../games/comun.js';
import { sonar } from '../games/efectos.js';
import { DIFICULTADES } from '../games/modos.js';
import { amigosDe } from '../games/amigos.js';
import { gato } from '../games/gato.js';
import { conecta4, COLUMNAS, FILAS } from '../games/conecta4.js';
import { E } from './estado.js';
import { CARA } from './juegos.js';
import { leerJSON, apuntarLogros } from './datos.js';
import { $, mostrar, confeti, preguntar } from './ui.js';
import { ligaAnotar } from './liga.js';
import { asegurarDuelista } from './duelos.js';

export const JUEGOS_MESA = [
  { ...gato, icono: '⭕', reglas: 'Haz 3 en raya (fila, columna o diagonal) antes que tu rival.', fichas: { x: '❌', o: '⭕' } },
  { ...conecta4, icono: '🔴', reglas: 'Deja caer tus fichas y haz 4 en raya antes que tu rival.', fichas: { x: '🔴', o: '🟡' } },
];
const juegoDe = (id) => JUEGOS_MESA.find((j) => j.id === id);
const CADUCA = 7 * 24 * 60 * 60 * 1000; // una partida sin movimientos en 7 días se da por perdida para todos
const otro = (f) => (f === 'x' ? 'o' : 'x');

// Partida abierta: { juego, modo: 'maquina' | 'local' | 'amigo', nivel, estado, yo, nombres, id, parar, apuntada }
let partida = null;
let elegido = { juego: null, nivel: 'normal' }; // pantalla de elegir modo

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
    const filas = await misPartidas();
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

// Partidas con amigos (las caducadas se quitan), de la más reciente a la más antigua.
async function misPartidas() {
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
function resultadoMesa(mesa, mia) {
  if (!mesa.ganador) return null;
  if (mesa.ganador === 'empate') return 'e';
  return mesa.ganador === mia ? 'v' : 'd';
}

// --- Elegir modo ---

function abrirModo(id) {
  elegido = { ...elegido, juego: id };
  mostrar('mesa-modo');
  pintarModo();
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
    el('h3', 'categoria', '🤖 Contra la máquina'),
    niveles,
    el('p', 'sin-datos', `Contra la máquina (${DIFICULTADES[elegido.nivel]}): ${record.v} victorias · ${record.e} empates · ${record.d} derrotas`),
    boton('▶ Jugar contra la máquina', 'grande color', () => empezar({ juego: j.id, modo: 'maquina', nivel: elegido.nivel })),
    el('h3', 'categoria', '📱 Dos en este celular'),
    boton('▶ Jugar a dos (pasándoos el celular)', '', () => empezar({ juego: j.id, modo: 'local' })),
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
    amigos.replaceChildren(...lista.map((a) => boton(`👥 ${a.apodo}`, '', () => retarAmigo(j.id, a))));
  } catch {
    amigos.replaceChildren(el('span', 'sin-datos', 'No se pudieron cargar tus amigos (¿sin conexión?).'));
  }
}

async function retarAmigo(juego, amigo) {
  if (!(await asegurarDuelista())) return;
  try {
    const id = await E.nube.crearMesa({
      juego,
      jugadores: { x: E.usuario.uid, o: amigo.uid },
      nombres: { [E.usuario.uid]: leer('nube:apodo'), [amigo.uid]: amigo.apodo },
      estado: juegoDe(juego).inicial(),
    });
    abrirPartidaAmigo(id);
  } catch {
    $('mesa-modo-contenido').append(el('p', 'aviso-duelo', `No se pudo crear la partida. ¿${amigo.apodo} sigue siendo tu amigo y hay conexión?`));
  }
}

// --- Partida ---

function empezar({ juego, modo, nivel }) {
  pararMesa();
  partida = { juego, modo, nivel, estado: juegoDe(juego).inicial(), yo: 'x', nombres: null, id: null, apuntada: false };
  mostrar('mesa-tablero');
  pintarTablero();
}

async function abrirPartidaAmigo(id) {
  if (!(await asegurarDuelista())) return;
  pararMesa();
  partida = { modo: 'amigo', id, estado: null, apuntada: false };
  mostrar('mesa-tablero');
  $('mesa-estado').textContent = 'Cargando la partida…';
  partida.parar = E.nube.verMesa(id, (mesa) => {
    if (!partida || partida.id !== id) return;
    if (!mesa) {
      $('mesa-estado').textContent = 'Esta partida ya no existe.';
      return;
    }
    const nueva = partida.estado && mesa.estado.celdas !== partida.estado.celdas;
    if (nueva) {
      const i = [...mesa.estado.celdas].findIndex((c, k) => c !== partida.estado.celdas[k]);
      partida.ultima = mesa.juego === 'conecta4' ? i % COLUMNAS : i; // la jugada del rival (para animarla)
    }
    Object.assign(partida, { juego: mesa.juego, estado: mesa.estado, mesa, yo: mesa.jugadores.x === E.usuario.uid ? 'x' : 'o' });
    if (nueva) sonar('tic');
    pintarTablero();
  });
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
  return partida.estado.turno === partida.yo;
}

function jugar(jugada) {
  const j = juegoDe(partida.juego);
  if (!puedoJugar() || !j.validas(partida.estado).includes(jugada)) return;
  const antes = partida.estado;
  partida.estado = j.aplicar(antes, jugada);
  partida.ultima = jugada;
  sonar('tic');
  const g = j.ganador(partida.estado);
  if (partida.modo === 'amigo') {
    partida.mesa = { ...partida.mesa, estado: partida.estado, ganador: g ?? partida.mesa.ganador };
    E.nube.jugarMesa(partida.id, partida.estado, g).catch(() => {
      partida.estado = antes; // no se pudo guardar: se deshace
      $('mesa-estado').textContent = 'No se pudo enviar la jugada (¿sin conexión?).';
    });
  }
  pintarTablero();
  if (!g && partida.modo === 'maquina') {
    partida.pensando = true;
    pintarTablero();
    setTimeout(() => {
      if (!partida || partida.modo !== 'maquina') return;
      partida.ultima = j.ia(partida.estado, partida.nivel);
      partida.estado = j.aplicar(partida.estado, partida.ultima);
      partida.pensando = false;
      sonar('tic');
      pintarTablero();
    }, 450);
  }
}

// Al terminar: estadísticas (una sola vez), liga y celebración.
function apuntarFinal(g) {
  if (partida.apuntada) return;
  partida.apuntada = true;
  ligaAnotar('partida');
  const r = g === 'empate' ? 'e' : g === partida.yo ? 'v' : 'd';
  if (partida.modo === 'maquina') {
    const stats = leerJSON('mesa:maquina');
    const delJuego = stats[partida.juego] ?? {};
    const actual = delJuego[partida.nivel] ?? { v: 0, d: 0, e: 0 };
    stats[partida.juego] = { ...delJuego, [partida.nivel]: { ...actual, [r]: actual[r] + 1 } };
    guardar('mesa:maquina', JSON.stringify(stats));
  }
  if (partida.modo === 'amigo') {
    const resultados = leerJSON('mesa:resultados');
    if (!resultados[partida.id]) {
      resultados[partida.id] = r;
      guardar('mesa:resultados', JSON.stringify(resultados));
      ligaAnotar({ v: 'victoria', e: 'empate' }[r]);
      apuntarLogros();
    }
  }
  if (r === 'v' || partida.modo === 'local') {
    confeti();
    sonar('record');
  }
}

function pintarTablero() {
  const j = juegoDe(partida.juego);
  const g = ganadorActual();
  if (g) apuntarFinal(g);
  const jugadores = ['x', 'o'].map((f) => {
    const d = el('div', `jugador-mesa${!g && partida.estado.turno === f ? ' turno' : ''}`);
    d.append(el('span', 'ficha', j.fichas[f]), el('span', '', nombreDe(f)));
    return d;
  });
  $('mesa-jugadores').replaceChildren(jugadores[0], el('span', 'vs', 'vs'), jugadores[1]);

  let estado;
  if (g === 'empate') estado = '🤝 Empate';
  else if (g) estado = partida.modo === 'local' ? `🏆 ¡Gana ${nombreDe(g)}!` : g === partida.yo ? '🏆 ¡Ganaste!' : partida.mesa?.rendido?.[E.usuario?.uid] ? 'Te rendiste.' : 'Perdiste esta vez.';
  else if (partida.pensando) estado = '🤖 Piensa la máquina…';
  else if (partida.modo === 'local') estado = `Turno de ${nombreDe(partida.estado.turno)} ${j.fichas[partida.estado.turno]}`;
  else estado = partida.estado.turno === partida.yo ? `▶ Tu turno ${j.fichas[partida.yo]}` : `⏳ Turno de ${nombreDe(partida.estado.turno)}`;
  if (partida.modo === 'amigo' && !g && partida.estado.turno !== partida.yo) estado += ' (puedes salir: te avisaremos en ⚔️)';
  $('mesa-estado').textContent = estado;

  $('mesa-tablero-juego').replaceChildren(j.id === 'gato' ? tableroGato(j, g) : tableroConecta(j, g));

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
      retarAmigo(partida.juego, { uid: rival, apodo: partida.mesa.nombres?.[rival] ?? 'Rival' });
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

function tableroGato(j, g) {
  const rejilla = el('div', 'tablero-gato');
  rejilla.setAttribute('role', 'group');
  rejilla.setAttribute('aria-label', 'Tablero del gato');
  [...partida.estado.celdas].forEach((c, i) => {
    const b = el('button', c === '.' ? '' : `ficha-${c}`, c === '.' ? '' : j.fichas[c]);
    b.disabled = c !== '.' || !puedoJugar();
    b.setAttribute('aria-label', `Fila ${Math.floor(i / 3) + 1}, columna ${(i % 3) + 1}, ${c === '.' ? 'vacía' : j.fichas[c]}`);
    b.onclick = () => jugar(i);
    rejilla.append(b);
  });
  return rejilla;
}

function tableroConecta(j) {
  const rejilla = el('div', 'tablero-conecta');
  rejilla.setAttribute('role', 'group');
  rejilla.setAttribute('aria-label', 'Tablero de Conecta 4: elige una columna');
  for (let c = 0; c < COLUMNAS; c++) {
    const columna = el('button', 'columna-conecta');
    const libres = [...Array(FILAS).keys()].filter((f) => partida.estado.celdas[f * COLUMNAS + c] === '.').length;
    columna.disabled = !libres || !puedoJugar();
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
