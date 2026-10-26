// ⚔️ Duelos por turnos.
import { ligaAnotar } from './liga.js';
import { resultadoPara, estadoDuelo, marcador, elegirJuegos, PLAZO, verRival } from '../games/duelos.js';
import { guardar, leer, el } from '../games/comun.js';
import { CONFIG } from '../firebase-config.js';
import { amigosDe } from '../games/amigos.js';
import { DIFICULTADES } from '../games/modos.js';
import { sonar } from '../games/efectos.js';
import { E } from './estado.js';
import { INFO_JUEGOS, HABILIDADES, ICONO_HABILIDAD, JUEGOS, CARA } from './juegos.js';
import { leerJSON, apuntarLogros, balanceDuelos } from './datos.js';
import { pintarEstadisticas } from './estadisticas.js';
import { mostrar, $, confeti } from './ui.js';
import { avisarNube, pedirApodo } from './cuenta.js';
import { agregarAmigo } from './amigos.js';
import { jugar } from './partida.js';

export const NOMBRE_RESULTADO = { v: 'ganaste', d: 'perdiste', e: 'empate' };

export const nombreRival = (duelo) => duelo.nombres?.[duelo.jugadores.find((j) => j !== E.usuario.uid) ?? ''] ?? null;
export const horasRestantes = (duelo) => Math.max(0, Math.ceil((duelo.caduca - Date.now()) / 3600000));
export const iconosJuegos = (duelo) => duelo.juegos.map((id) => INFO_JUEGOS[id]?.icono ?? '').join(' ');

// El duelo con lo jugado en este celular que aún no esté en la nube (si falló la subida).
export function conLocal(duelo) {
  const mios = leerJSON('duelos:jugados')[duelo.id] ?? {};
  return { ...duelo, resultados: { ...duelo.resultados, [E.usuario.uid]: { ...mios, ...(duelo.resultados?.[E.usuario.uid] ?? {}) } } };
}

export async function reintentarSubidas(duelo) {
  const mios = leerJSON('duelos:jugados')[duelo.id] ?? {};
  for (const [juego, puntos] of Object.entries(mios)) {
    if (duelo.resultados?.[E.usuario.uid]?.[juego] === undefined) await E.nube.anotarDuelo(duelo.id, E.usuario.uid, juego, puntos).catch(() => {});
  }
}

// Apunta en las estadísticas el resultado de un duelo terminado (una sola vez). Devuelve 'v'/'d'/'e' si es nuevo.
export function apuntarResultado(duelo) {
  const resultados = leerJSON('duelos:resultados');
  if (resultados[duelo.id]) return null;
  resultados[duelo.id] = resultadoPara(duelo, E.usuario.uid, INFO_JUEGOS);
  guardar('duelos:resultados', JSON.stringify(resultados));
  ligaAnotar({ v: 'victoria', e: 'empate' }[resultados[duelo.id]]);
  apuntarLogros();
  return resultados[duelo.id];
}

// Para jugar duelos hace falta sesión (Google o invitado) y apodo; si no, se lleva a ☁️ Nube o se pide el apodo.
export async function asegurarDuelista() {
  if (!CONFIG) return false;
  if (!E.usuario) {
    pintarEstadisticas();
    mostrar('estadisticas');
    avisarNube('⚔️ Entra con Google o como invitado para jugar duelos.');
    $('nube').scrollIntoView({ block: 'start' });
    return false;
  }
  if (!leer('nube:apodo')) await pedirApodo(false);
  return Boolean(leer('nube:apodo'));
}

// Menú: botón ⚔️ con cuántos duelos esperan tu turno (o te invitan).
export async function pintarAvisoDuelos(forzar = false) {
  $('btn-duelos').hidden = !CONFIG;
  $('btn-amigos').hidden = !CONFIG;
  if (!E.usuario || !E.nube) {
    $('aviso-amigos').textContent = '';
    return ($('aviso-duelos').textContent = '');
  }
  if (!forzar && Date.now() - E.avisoDuelosCuando < 60000) return;
  E.avisoDuelosCuando = Date.now();
  try {
    const ocultos = leerJSON('duelos:ocultos');
    const [mios, invit] = await Promise.all([E.nube.misDuelos(E.usuario.uid), E.nube.invitaciones(E.usuario.uid)]);
    const todos = [...mios, ...invit.filter((d) => !d.jugadores.includes(E.usuario.uid) && !ocultos[d.id])].map(conLocal);
    const pendientes = todos.filter((d) => ['tu-turno', 'invitacion'].includes(estadoDuelo(d, E.usuario.uid, Date.now()))).length;
    $('aviso-duelos').textContent = pendientes ? `${pendientes} tu turno` : '';
    const { recibidas, amigos } = amigosDe(await E.nube.misSolicitudes(E.usuario.uid), E.usuario.uid);
    E.nube.guardarAmigosEstados(E.usuario.uid, amigos.map((a) => a.uid)); // los amigos nuevos ya pueden ver mi estado
    $('aviso-amigos').textContent = recibidas.length ? `${recibidas.length} nueva${recibidas.length > 1 ? 's' : ''}` : '';
  } catch {
    // sin conexión: sin aviso
  }
}

export async function abrirDuelos() {
  if (!(await asegurarDuelista())) return;
  mostrar('duelos');
  pintarDuelos();
}

// Bandeja: balance y duelos agrupados (invitaciones, tu turno, esperando, terminados).
export async function pintarDuelos() {
  const { v, d, e } = balanceDuelos();
  $('duelos-balance').textContent = `🏆 ${v} victorias · ${d} derrotas · ${e} empates`;
  $('duelos-lista').replaceChildren(el('p', 'sin-datos', 'Cargando…'));
  try {
    const ahora = Date.now();
    const ocultos = leerJSON('duelos:ocultos');
    const [mios, invit] = await Promise.all([E.nube.misDuelos(E.usuario.uid), E.nube.invitaciones(E.usuario.uid)]);
    const todos = [...mios, ...invit.filter((x) => !x.jugadores.includes(E.usuario.uid) && !ocultos[x.id])].map(conLocal);
    const grupos = { invitacion: [], 'tu-turno': [], esperando: [], terminado: [] };
    for (const duelo of todos.sort((a, b) => b.creado - a.creado)) {
      const estado = estadoDuelo(duelo, E.usuario.uid, ahora);
      if (estado === 'terminado') apuntarResultado(duelo);
      grupos[estado === 'caducado' ? 'terminado' : estado]?.push({ duelo, estado });
    }
    const titulos = { invitacion: '📨 Te desafían', 'tu-turno': '▶ Tu turno', esperando: '⏳ Esperando al rival', terminado: '🏁 Terminados' };
    const partes = [];
    for (const [grupo, filas] of Object.entries(grupos)) {
      if (!filas.length) continue;
      partes.push(el('h3', 'categoria', titulos[grupo]), ...filas.slice(0, grupo === 'terminado' ? 10 : 50).map(filaDuelo));
    }
    $('duelos-lista').replaceChildren(...(partes.length ? partes : [el('p', 'sin-datos', 'Aún no tienes duelos. ¡Crea el primero!')]));
    $('aviso-duelos').textContent = grupos['tu-turno'].length + grupos.invitacion.length ? `${grupos['tu-turno'].length + grupos.invitacion.length} tu turno` : '';
  } catch {
    $('duelos-lista').replaceChildren(el('p', 'sin-datos', 'No se pudieron cargar los duelos (¿sin conexión?).'));
  }
}

export function filaDuelo({ duelo, estado }) {
  const rival = nombreRival(duelo);
  let texto;
  let detalle;
  let clase = estado;
  if (estado === 'invitacion') {
    texto = `${duelo.nombres[duelo.anfitrion]} te desafía`;
    detalle = `${iconosJuegos(duelo)} · quedan ${horasRestantes(duelo)} h`;
  } else if (estado === 'caducado') {
    texto = 'Sin rival';
    detalle = 'caducado';
  } else if (estado === 'terminado') {
    const r = resultadoPara(duelo, E.usuario.uid, INFO_JUEGOS);
    const m = marcador(duelo, E.usuario.uid, INFO_JUEGOS, true);
    texto = `vs ${rival}`;
    detalle = `${NOMBRE_RESULTADO[r]} ${m.mio}–${m.suyo}`;
    clase += ` resultado-${r}`;
  } else {
    texto = rival ? `vs ${rival}` : duelo.azar ? '🎲 Buscando rival…' : '🔗 Esperando que acepten';
    const jugados = Object.keys(duelo.resultados[E.usuario.uid] ?? {}).length;
    detalle = `${iconosJuegos(duelo)} · ${jugados}/${duelo.juegos.length} · quedan ${horasRestantes(duelo)} h`;
  }
  const fila = el('button', `fila-duelo ${clase}`);
  fila.append(el('span', '', texto), el('small', '', detalle));
  fila.onclick = () => abrirDuelo(duelo.id);
  return fila;
}

// --- Crear un duelo ---

export async function abrirNuevoDuelo(rival = 'enlace') {
  if (!(await asegurarDuelista())) return;
  E.nuevoDuelo = { forma: 'azar', habilidad: HABILIDADES[0], elegidos: [], dificultad: 'normal', victoria: 'juegos', rival };
  mostrar('nuevo-duelo');
  pintarNuevoDuelo();
}

export function pintarNuevoDuelo() {
  const n = E.nuevoDuelo;
  const grupo = (titulo, opciones, elegido, alElegir) => {
    const caja = el('div', 'opciones-duelo');
    caja.setAttribute('role', 'group');
    caja.setAttribute('aria-label', titulo);
    for (const [valor, texto] of opciones) {
      const b = el('button', '', texto);
      b.setAttribute('aria-pressed', Array.isArray(elegido) ? elegido.includes(valor) : valor === elegido);
      b.onclick = () => {
        alElegir(valor);
        pintarNuevoDuelo();
        $('nuevo-duelo-contenido').querySelector(`[aria-label="${titulo}"] button[aria-pressed="true"]`)?.focus();
      };
      caja.append(b);
    }
    return [el('h3', 'categoria', titulo), caja];
  };
  const partes = [
    ...grupo('Juegos', [['azar', '🎲 3 al azar'], ['habilidad', '🧠 Habilidad'], ['elegir', '✋ Elegir']], n.forma, (v) => (n.forma = v)),
  ];
  if (n.forma === 'habilidad') {
    partes.push(...grupo('Habilidad', HABILIDADES.map((h) => [h, `${ICONO_HABILIDAD[h]} ${h}`]), n.habilidad, (v) => (n.habilidad = v)));
  }
  if (n.forma === 'elegir') {
    partes.push(...grupo(`Elige de 1 a 5 (${n.elegidos.length}/5)`, JUEGOS.map((j) => [j.id, `${j.icono} ${j.nombre}`]), n.elegidos, (id) => {
      if (n.elegidos.includes(id)) n.elegidos = n.elegidos.filter((x) => x !== id);
      else if (n.elegidos.length < 5) n.elegidos.push(id);
    }));
  }
  partes.push(
    ...grupo('Dificultad', Object.entries(DIFICULTADES).map(([d, nombre]) => [d, `${CARA[d]} ${nombre}`]), n.dificultad, (v) => (n.dificultad = v)),
    ...grupo('Cómo se gana', [['juegos', 'Juego a juego'], ['puntos', 'Suma de puntos']], n.victoria, (v) => (n.victoria = v)),
  );
  if (typeof n.rival === 'object') {
    const cambiar = el('button', '', 'Cambiar rival');
    cambiar.onclick = () => {
      n.rival = 'enlace';
      pintarNuevoDuelo();
    };
    partes.push(el('h3', 'categoria', 'Rival'), el('p', 'rival-elegido', `⚔️ ${n.rival.apodo}`), cambiar);
  } else {
    partes.push(
      ...grupo('Rival', [['enlace', '🔗 Enlace'], ['azar', '🎲 Al azar'], ['amigo', '👥 Amigo']], n.rival, (v) => (n.rival = v)),
    );
    if (n.rival === 'amigo') {
      const lista = el('div', 'opciones-duelo');
      lista.setAttribute('role', 'group');
      lista.setAttribute('aria-label', 'Elige a tu amigo');
      lista.append(el('span', 'sin-datos', 'Cargando tus amigos…'));
      partes.push(lista);
      E.nube.misSolicitudes(E.usuario.uid).then((solicitudes) => {
        const { amigos } = amigosDe(solicitudes, E.usuario.uid);
        if (!amigos.length) return lista.replaceChildren(el('span', 'sin-datos', 'Aún no tienes amigos: agrégalos en 👥 Amigos.'));
        lista.replaceChildren(...amigos.map((a) => {
          const b = el('button', '', `👥 ${a.apodo}`);
          b.onclick = () => {
            n.rival = { uid: a.uid, apodo: a.apodo };
            pintarNuevoDuelo();
          };
          return b;
        }));
      }).catch(() => lista.replaceChildren(el('span', 'sin-datos', 'No se pudieron cargar tus amigos (¿sin conexión?).')));
    } else {
      partes.push(el('p', 'sin-datos', 'También puedes retar desde 🏆 Ranking (⚔️ junto a cada nombre) o desde 👥 Amigos.'));
    }
  }
  const crear = el('button', 'grande color', '⚔️ Crear y desafiar');
  crear.style.setProperty('--c', 'var(--acento)');
  crear.disabled = (n.forma === 'elegir' && !n.elegidos.length) || n.rival === 'amigo';
  crear.onclick = () => crearDuelo(crear);
  partes.push(crear, el('p', 'estado-duelo', ''));
  $('nuevo-duelo-contenido').replaceChildren(...partes);
}

export async function crearDuelo(boton) {
  const n = E.nuevoDuelo;
  const apodo = leer('nube:apodo');
  boton.disabled = true;
  try {
    const ahora = Date.now();
    if (n.rival === 'azar') {
      // Si alguien busca rival, se juega su duelo (con sus juegos); si no, se crea uno abierto.
      const libres = (await E.nube.duelosAlAzar()).filter((d) => !d.jugadores.includes(E.usuario.uid) && d.caduca > ahora + 60000);
      for (const d of libres) {
        try {
          await E.nube.unirseDuelo(d.id, E.usuario.uid, apodo);
          return abrirDuelo(d.id, `🎲 Te has emparejado con ${d.nombres[d.anfitrion]}: jugáis los juegos que eligió.`);
        } catch {
          // otro se adelantó: se prueba el siguiente
        }
      }
    }
    const candidatos = n.forma === 'habilidad' ? JUEGOS.filter((j) => j.habilidad === n.habilidad) : JUEGOS;
    const juegos = n.forma === 'elegir' ? n.elegidos : elegirJuegos(candidatos.map((j) => j.id));
    const id = await E.nube.crearDuelo({
      anfitrion: E.usuario.uid,
      jugadores: [E.usuario.uid],
      nombres: { [E.usuario.uid]: apodo },
      invitado: typeof n.rival === 'object' ? n.rival.uid : null,
      abierto: true,
      azar: n.rival === 'azar',
      juegos,
      dificultad: n.dificultad,
      victoria: n.victoria,
      creado: ahora,
      caduca: ahora + PLAZO,
      resultados: {},
    });
    const avisos = {
      enlace: '🔗 Duelo creado: manda el enlace a tu rival.',
      azar: '🎲 Duelo creado: la próxima persona que busque rival jugará contra ti.',
    };
    await abrirDuelo(id, avisos[n.rival] ?? `📨 Desafío enviado a ${n.rival.apodo}: lo verá en sus duelos.`);
    if (n.rival === 'enlace') compartirDuelo({ id, juegos });
  } catch {
    boton.disabled = false;
    $('nuevo-duelo-contenido').querySelector('.estado-duelo').textContent = 'No se pudo crear el duelo (¿sin conexión?).';
  }
}

export async function compartirDuelo(duelo) {
  const enlace = `https://cgutierrezrojas.github.io/juego-mental/?duelo=${duelo.id}`;
  const texto = `⚔️ ${leer('nube:apodo')} te desafía a un duelo en Juego Mental (${iconosJuegos(duelo)}). ¡Acepta aquí! ${enlace}`;
  if (navigator.share) {
    try {
      await navigator.share({ text: texto });
    } catch {
      // se canceló
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(texto);
    const estado = $('duelo-contenido').querySelector('.estado-duelo');
    if (estado) estado.textContent = '✓ Enlace copiado: pégalo en WhatsApp o donde quieras.';
  } catch {
    // sin portapapeles
  }
}

// --- Un duelo ---
export async function abrirDuelo(id, aviso = '') {
  if (!(await asegurarDuelista())) return;
  mostrar('duelo');
  $('duelo-contenido').replaceChildren(el('p', 'sin-datos', 'Cargando…'));
  try {
    const duelo = await E.nube.leerDuelo(id);
    if (!duelo) throw new Error('Este duelo ya no existe.');
    await reintentarSubidas(duelo);
    pintarDuelo(conLocal(duelo), aviso);
  } catch (e) {
    $('duelo-contenido').replaceChildren(el('p', 'sin-datos', e.message?.endsWith('.') ? e.message : 'No se pudo cargar el duelo (¿sin conexión?).'));
  }
}

export function pintarDuelo(duelo, aviso) {
  const uid = E.usuario.uid;
  const estado = estadoDuelo(duelo, uid, Date.now());
  const terminado = estado === 'terminado';
  const boton = (texto, clase, alPulsar) => {
    const b = el('button', clase, texto);
    if (clase.includes('color')) b.style.setProperty('--c', 'var(--acento)');
    b.onclick = alPulsar;
    return b;
  };
  const listaJuegos = el('p', '', duelo.juegos.map((id) => `${INFO_JUEGOS[id].icono} ${INFO_JUEGOS[id].nombre}`).join(' · '));
  const reglas = `${duelo.victoria === 'puntos' ? 'Suma de puntos' : 'Juego a juego'} · ${DIFICULTADES[duelo.dificultad]}`;
  const partes = aviso ? [el('p', 'aviso-duelo', aviso)] : [];

  if (estado === 'invitacion' || estado === 'ajeno') {
    partes.push(el('p', 'titulo-duelo', `⚔️ ${duelo.nombres[duelo.anfitrion]} te desafía`), listaJuegos, el('p', 'sin-datos', `${reglas} · quedan ${horasRestantes(duelo)} h`));
    if (estado === 'invitacion') {
      partes.push(boton('⚔️ Aceptar duelo', 'grande color', async () => {
        try {
          await E.nube.unirseDuelo(duelo.id, uid, leer('nube:apodo'));
          abrirDuelo(duelo.id, '✓ Duelo aceptado. ¡Suerte!');
        } catch (e) {
          abrirDuelo(duelo.id, e.message);
        }
      }));
      if (duelo.invitado === uid) {
        partes.push(boton('Rechazar', '', () => {
          guardar('duelos:ocultos', JSON.stringify({ ...leerJSON('duelos:ocultos'), [duelo.id]: true }));
          abrirDuelos();
        }));
      }
    } else {
      partes.push(el('p', 'sin-datos', 'Este duelo ya tiene sus dos jugadores.'));
    }
    return $('duelo-contenido').replaceChildren(...partes);
  }

  const rival = nombreRival(duelo);
  const m = marcador(duelo, uid, INFO_JUEGOS, terminado);
  // Marcador y juegos en la misma cuadrícula: cada número queda justo debajo de su jugador.
  const tabla = el('div', 'tabla-duelo');
  const jugador = (nombre, apodo, valor) => {
    const celda = el('div', 'jugador-duelo');
    celda.append(el('span', '', nombre), el('small', 'apodo-duelo', apodo), el('strong', '', `${valor}`));
    return celda;
  };
  const cabecera = el('div', 'cabecera-duelo');
  cabecera.append(el('span', 'vs', '⚔️'), jugador('Tú', leer('nube:apodo'), m.mio), jugador('Rival', rival ?? 'por llegar', rival ? m.suyo : '–'));
  tabla.append(cabecera);
  let situacion = `quedan ${horasRestantes(duelo)} h`;
  if (estado === 'caducado') situacion = 'caducado sin rival';
  if (terminado) situacion = 'terminado';
  partes.push(tabla, el('p', 'sin-datos', `${reglas} · ${situacion}`));

  if (terminado) {
    const nuevo = apuntarResultado(duelo);
    const r = nuevo ?? leerJSON('duelos:resultados')[duelo.id];
    partes.push(el('p', `resultado-duelo resultado-${r}`, { v: '🏆 ¡Ganaste el duelo!', d: 'Perdiste esta vez. ¡A por la revancha!', e: '🤝 Empate' }[r]));
    if (nuevo === 'v') {
      confeti();
      sonar('record');
    }
  }

  for (const p of m.porJuego) {
    const j = INFO_JUEGOS[p.id];
    const fila = el('div', 'fila-juego-duelo');
    const suyo = verRival(duelo, uid, p.id, terminado) ? p.suyo ?? '…' : '🔒';
    fila.append(
      el('span', '', `${j.icono} ${j.nombre}`),
      el('span', p.gana === 'yo' ? 'gana' : '', `${p.mio ?? '—'}`),
      el('span', p.gana === 'rival' ? 'gana' : '', `${suyo}`),
    );
    tabla.append(fila);
  }
  if (!terminado) partes.push(el('p', 'sin-datos', '🔒 La puntuación del rival en cada juego se ve cuando hayas jugado el tuyo.'));

  const siguiente = duelo.juegos.find((id) => duelo.resultados[uid]?.[id] === undefined);
  if (!terminado && estado !== 'caducado' && siguiente) {
    partes.push(boton(`▶ Jugar ${INFO_JUEGOS[siguiente].nombre}`, 'grande color', () => jugarDuelo(duelo, siguiente)));
  }
  const uidRival = duelo.jugadores.find((j) => j !== uid);
  if (uidRival) partes.push(boton(`👥 Agregar a ${rival} como amigo`, '', () => agregarAmigo(uidRival, rival)));
  if (duelo.jugadores.length < 2 && estado !== 'caducado' && !duelo.invitado) {
    partes.push(boton('📤 Compartir enlace', '', () => compartirDuelo(duelo)));
  }
  partes.push(el('p', 'estado-duelo', ''));
  $('duelo-contenido').replaceChildren(...partes);
}

// Juega un juego del duelo en modo Normal con la dificultad del duelo; al terminar se anota (ver terminar()).
export function jugarDuelo(duelo, juego) {
  E.actual = INFO_JUEGOS[juego];
  E.eleccion = { modo: 'normal', dificultad: E.actual.sinDificultad ? 'normal' : duelo.dificultad };
  E.enDuelo = { id: duelo.id, juego, rival: nombreRival(duelo), numero: duelo.juegos.indexOf(juego) + 1, total: duelo.juegos.length };
  jugar();
}

// Guarda la puntuación de un juego del duelo en este celular y la sube (si falla, se reintenta al abrir el duelo).
export function anotarEnDuelo(puntos) {
  const { id, juego } = E.enDuelo;
  const jugados = leerJSON('duelos:jugados');
  jugados[id] = { ...(jugados[id] ?? {}), [juego]: puntos };
  guardar('duelos:jugados', JSON.stringify(jugados));
  E.nube.anotarDuelo(id, E.usuario.uid, juego, puntos).catch(() => {});
}

export function volverAlDuelo() {
  const id = E.enDuelo.id;
  E.enDuelo = null;
  abrirDuelo(id);
}
