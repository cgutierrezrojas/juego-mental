// Menú, navegación entre pantallas, récords y tema.

// Cada juego: { id, nombre, categoria, icono, color, habilidad, referencia, instrucciones, juego } y, si hace falta, `unidad`
// (texto tras la puntuación) y `menorEsMejor` (récord = puntuación más baja). `habilidad` es la barra del perfil a la que cuenta y `referencia` la puntuación que vale 100 en esa barra.
// `juego` es un módulo con start(pantalla, alTerminar), que devuelve una función parar(); `color` es el nombre de su variable CSS.
// `modos`: los que tiene ese juego (por defecto solo 'normal'); `sinDificultad`: no se elige Fácil/Normal/Difícil.
// `duracion`: subtítulo de la baldosa Normal en la previa (por defecto "60 s"). `color` es el de su habilidad.
// Para añadir un juego: crear el archivo en games/, importarlo arriba y añadir su entrada aquí.
// Sin `categoria`, el juego no entra en el entrenamiento diario.
import * as calculo from './games/calculo.js';
import * as atencion from './games/atencion.js';
import * as memoria from './games/memoria.js';
import * as series from './games/series.js';
import * as sobra from './games/sobra.js';
import * as puzzle from './games/puzzle.js';
import * as rayo from './games/rayo.js';
import * as topos from './games/topos.js';
import * as mayor from './games/mayor.js';
import * as distinto from './games/distinto.js';
import * as balanza from './games/balanza.js';
import * as parejas from './games/parejas.js';
import { el, leer, guardar, esRecord } from './games/comun.js';
import { sonar, callar, activo, alternar, puedeVibrar } from './games/efectos.js';
import {
  anotar, fechaLocal, puntosGrafica, entrenoDelDia, jugadosEn, entrenoCompleto, racha,
  mejorRacha, entrenosCompletados, perfil,
} from './games/estadisticas.js';
import { MODOS, DIFICULTADES, claveRecord, esDe, filtrar, etiqueta } from './games/modos.js';
import {
  NUM_NIVELES, NOMBRE_RETO, ICONO_RETO, NOMBRE_VARIANTE, NIVELES_POR_MUNDO, mundoDe, varianteDe, configNivel, estrellasDe, nivelLibre,
  conEstrellas, totalEstrellas, desdeAntiguo, siguienteNivel, nivelesDelDia, diarioCompleto, rachaDiaria, podarDiarios, estrellasDiarias,
} from './games/niveles.js';

const JUEGOS = [
  { id: 'calculo', nombre: 'Cálculo', categoria: 'Clásicos', icono: '➕', color: 'rojo', habilidad: 'Cálculo', referencia: 30, modos: ['normal', 'rapido', 'sinfallo', 'niveles'], instrucciones: 'Resuelve todas las operaciones que puedas en 60 segundos.', juego: calculo },
  { id: 'atencion', nombre: 'Atención', categoria: 'Clásicos', icono: '👁', color: 'azul', habilidad: 'Atención', referencia: 40, modos: ['normal', 'rapido', 'sinfallo', 'niveles'], instrucciones: 'Toca el color de la tinta, no lo que dice la palabra.', juego: atencion },
  { id: 'memoria', nombre: 'Memoria', categoria: 'Clásicos', icono: '🧠', color: 'verde', habilidad: 'Memoria', referencia: 12, modos: ['normal', 'niveles'], duracion: 'hasta fallar', instrucciones: 'Mira la secuencia de colores y repítela. Cada ronda, uno más.', juego: memoria },
  { id: 'series', nombre: 'Series', categoria: 'Lógica', icono: '🔢', color: 'amarillo', habilidad: 'Lógica', referencia: 20, modos: ['normal', 'rapido', 'sinfallo', 'niveles'], instrucciones: '¿Qué número sigue? Descubre la regla de cada serie. 60 segundos.', juego: series },
  { id: 'sobra', nombre: '¿Cuál sobra?', categoria: 'Lógica', icono: '🔍', color: 'amarillo', habilidad: 'Lógica', referencia: 20, modos: ['normal', 'rapido', 'sinfallo', 'niveles'], instrucciones: 'Tres números siguen una regla y uno no: toca el que sobra. 60 segundos.', juego: sobra },
  { id: 'puzzle', nombre: 'Puzzle', categoria: 'Lógica', icono: '🧩', color: 'amarillo', habilidad: 'Lógica', referencia: 30, unidad: 'movimientos', menorEsMejor: true, modos: ['normal', 'niveles'], duracion: 'sin tiempo', instrucciones: 'Ordena las fichas del 1 al 8 con los menos movimientos posibles.', juego: puzzle },
  { id: 'rayo', nombre: 'Rayo', categoria: 'Reacción', icono: '⚡', color: 'morado', habilidad: 'Reacción', referencia: 250, unidad: 'ms', menorEsMejor: true, sinDificultad: true, modos: ['normal', 'niveles'], duracion: '5 intentos', instrucciones: 'Cuando se ponga verde, ¡toca! 5 intentos; cuenta tu tiempo medio.', juego: rayo },
  { id: 'topos', nombre: 'Topos', categoria: 'Reacción', icono: '🔨', color: 'morado', habilidad: 'Reacción', referencia: 40, modos: ['normal', 'niveles'], duracion: '30 s', instrucciones: 'Toca cada topo antes de que se esconda. Tocar una casilla vacía resta. 30 segundos.', juego: topos },
  { id: 'mayor', nombre: 'Mayor o menor', icono: '⚖️', color: 'rojo', habilidad: 'Cálculo', referencia: 35, modos: ['normal', 'rapido', 'sinfallo', 'niveles'], instrucciones: 'Toca la operación que da más. 60 segundos.', juego: mayor },
  { id: 'distinto', nombre: 'El distinto', icono: '🎯', color: 'azul', habilidad: 'Atención', referencia: 25, modos: ['normal', 'rapido', 'sinfallo', 'niveles'], instrucciones: 'Toca el cuadrado de color distinto. 60 segundos.', juego: distinto },
  { id: 'balanza', nombre: 'Balanza', icono: '🏋️', color: 'amarillo', habilidad: 'Lógica', referencia: 15, modos: ['normal', 'rapido', 'sinfallo', 'niveles'], instrucciones: 'Deduce cuánto pesa la fruta que se pregunta. 60 segundos.', juego: balanza },
  { id: 'parejas', nombre: 'Parejas', icono: '🃏', color: 'verde', habilidad: 'Memoria', referencia: 9, unidad: 'intentos', menorEsMejor: true, modos: ['normal', 'niveles'], duracion: 'sin tiempo', instrucciones: 'Encuentra todas las parejas de cartas con los menos intentos posibles.', juego: parejas },
];

const CATEGORIAS = ['Clásicos', 'Lógica', 'Reacción'];
// Ids de los juegos de cada categoría, en el orden de CATEGORIAS (para el entrenamiento diario).
// ponytail: añadir o reordenar juegos cambia qué pedían los entrenamientos pasados (y las rachas); guardar los días completados si importa.
const idsPorCategoria = CATEGORIAS.map((c) => JUEGOS.filter((j) => j.categoria === c).map((j) => j.id));

const HABILIDADES = ['Memoria', 'Cálculo', 'Atención', 'Lógica', 'Reacción'];

const $ = (id) => document.getElementById(id);
let actual = null;
let parar = null; // detiene el juego en curso (la devuelve start)
let inicio = 0; // cuándo empezó el juego en curso (tras la cuenta atrás), para medir su duración
let eleccion = { modo: 'normal', dificultad: 'normal' }; // modo y dificultad elegidos para el juego abierto
let nivelElegido = 1; // nivel seleccionado en el modo Niveles
let vistaHoy = false; // en Niveles: pestaña 📅 Hoy (los 3 diarios) en vez de los mundos
let diarioElegido = 0; // diario seleccionado (0–2) en la pestaña Hoy
let jugando = null; // { nivel, fecha, diario } del nivel en curso; se fija al empezar (puede acabar pasada la medianoche)

const leerRecord = (clave) => Number(leer(clave)) || 0;

// Última elección de modo y dificultad de un juego ("modo|dificultad"); si no vale para él, Normal + Normal.
function leerEleccion(j) {
  const [modo, dificultad] = (leer('eleccion:' + j.id) || '').split('|');
  return {
    modo: (j.modos ?? ['normal']).includes(modo) ? modo : 'normal',
    dificultad: !j.sinDificultad && dificultad in DIFICULTADES ? dificultad : 'normal',
  };
}

// Estrellas por nivel de un juego (`estrellas:<id>` = JSON con un número 0–3 por nivel). Si aún no hay,
// el progreso de la versión anterior (`niveles:<id>` = nivel más alto superado) cuenta como 1 ⭐ por nivel.
function leerEstrellas(id) {
  try {
    const estrellas = JSON.parse(leer('estrellas:' + id));
    // Al menos 50 números y sin huecos: un dato corto o con huecos no debe marcar mundos como completos.
    if (Array.isArray(estrellas)) return Array.from({ length: Math.max(NUM_NIVELES, estrellas.length) }, (_, i) => Number(estrellas[i]) || 0);
  } catch {
    // dato roto: se usa el progreso antiguo
  }
  return desdeAntiguo(Number(leer('niveles:' + id)) || 0);
}

// Niveles diarios de un juego: `diarios:<id>` = JSON { 'AAAA-MM-DD': { niveles: [n, n, n], estrellas: [e, e, e] } }.
function leerDiarios(id) {
  try {
    const diarios = JSON.parse(leer('diarios:' + id));
    // Solo días válidos: un dato roto no debe romper el menú.
    if (diarios && typeof diarios === 'object') {
      const valido = (d) => d?.niveles?.length === 3 && d.niveles.every((n) => Number.isInteger(n) && n >= 1) && d.estrellas?.length === 3;
      return Object.fromEntries(Object.entries(diarios).filter(([, d]) => valido(d)));
    }
  } catch {
    // dato roto: sin diarios
  }
  return {};
}

const guardarDiarios = (id, diarios) => guardar('diarios:' + id, JSON.stringify(podarDiarios(diarios)));

// Diarios del juego con los de hoy: se eligen (y se guardan) la primera vez que se piden en el día, según tu nivel.
function diariosConHoy(id) {
  const diarios = leerDiarios(id);
  const hoy = fechaLocal();
  if (!diarios[hoy]) {
    diarios[hoy] = { niveles: nivelesDelDia(siguienteNivel(leerEstrellas(id))), estrellas: [0, 0, 0] };
    guardarDiarios(id, diarios);
  }
  return diarios;
}

// Cuántos diarios de hoy están superados (0–3).
const diariosHechos = (id) => (leerDiarios(id)[fechaLocal()]?.estrellas ?? []).filter((e) => e > 0).length;

// Estrellas de los niveles más las de los diarios.
const estrellasDelJuego = (id) => totalEstrellas(leerEstrellas(id)) + estrellasDiarias(leerDiarios(id));

// Nivel que se juega: el elegido o, en la pestaña Hoy, el del diario elegido.
const nivelJugado = () => (vistaHoy ? diariosConHoy(actual.id)[fechaLocal()].niveles[diarioElegido] : nivelElegido);

// Menú: 📅 en las tarjetas de los juegos con diarios de hoy sin terminar.
function pintarAvisosDiarios() {
  const hoy = fechaLocal();
  for (const b of document.querySelectorAll('.tarjeta[data-juego]')) {
    b.classList.toggle('diario-pendiente', !diarioCompleto(leerDiarios(b.dataset.juego)[hoy]));
  }
}

// "245 ms", "12 movimientos" o solo "7" si el juego no tiene unidad.
const conUnidad = (j, n) => (j.unidad ? `${n} ${j.unidad}` : `${n}`);

// Historial de partidas terminadas: `historial:<id>` = JSON [{ fecha, cuando, puntos, ms, modo, dificultad }]. Si está roto, vacío.
function leerHistorial(id) {
  try {
    const historial = JSON.parse(leer('historial:' + id));
    // Solo entradas válidas: un dato roto no debe romper el menú ni las gráficas.
    return Array.isArray(historial) ? historial.filter((p) => p && typeof p === 'object' && Number.isFinite(p.puntos)) : [];
  } catch {
    return [];
  }
}

const historiales = () => Object.fromEntries(JUEGOS.map((j) => [j.id, leerHistorial(j.id)]));

// Anota la partida y suma a los contadores totales (que no se recortan con el historial).
function guardarPartida(id, partida) {
  guardar('historial:' + id, JSON.stringify(anotar(leerHistorial(id), partida)));
  guardar('contador:partidas', (Number(leer('contador:partidas')) || 0) + 1);
  guardar('contador:ms', (Number(leer('contador:ms')) || 0) + partida.ms);
}

// Gráfica de las últimas 20 partidas (la línea sube al mejorar) y media de las últimas 10.
function pintarHistorial(j) {
  const caja = $('previa-historial');
  const ultimas = leerHistorial(j.id).filter((p) => esDe(p, eleccion.modo, eleccion.dificultad)).slice(-20).map((p) => p.puntos);
  if (!ultimas.length) return caja.replaceChildren(el('p', 'sin-datos', 'Aún no hay partidas'));
  const svg = 'http://www.w3.org/2000/svg';
  const grafica = document.createElementNS(svg, 'svg');
  grafica.setAttribute('viewBox', '0 0 200 50');
  grafica.setAttribute('preserveAspectRatio', 'none');
  grafica.setAttribute('class', 'grafica');
  grafica.setAttribute('role', 'img');
  grafica.setAttribute('aria-label', `Tus últimas ${ultimas.length} partidas`);
  const linea = document.createElementNS(svg, 'polyline');
  linea.setAttribute('points', puntosGrafica(ultimas, 200, 50, j.menorEsMejor));
  linea.style.stroke = `var(--${j.color})`;
  grafica.append(linea);
  const diez = ultimas.slice(-10);
  const media = Math.round(diez.reduce((a, b) => a + b, 0) / diez.length);
  caja.replaceChildren(grafica, el('p', '', `Media de las últimas ${diez.length}: ${conUnidad(j, media)}`));
}

// Tarjeta "Entrenamiento de hoy": los 3 juegos del día (✓ si ya hay una partida hoy) y la racha.
function pintarEntreno() {
  const hoy = fechaLocal();
  const hist = historiales();
  const hechos = jugadosEn(hoy, hist);
  const ids = entrenoDelDia(hoy, idsPorCategoria);
  const titulo = el('div', 'entreno-titulo');
  titulo.append(el('span', '', 'Entrenamiento de hoy'), el('span', '', `🔥 ${racha(hoy, idsPorCategoria, hist)}`));
  const lista = el('div', 'entreno-juegos');
  for (const id of ids) {
    const j = JUEGOS.find((x) => x.id === id);
    const hecho = hechos.has(id);
    const b = el('button', hecho ? 'hecho' : '', `${hecho ? '✓' : '○'} ${j.icono} ${j.nombre}`);
    b.onclick = () => abrirPrevia(j);
    lista.append(b);
  }
  const partes = [titulo, lista];
  if (ids.every((id) => hechos.has(id))) partes.push(el('p', 'entreno-completo', '✓ ¡Entrenamiento completado!'));
  $('entreno').replaceChildren(...partes);
}

// Pantalla 📊: resumen, perfil por habilidad (barras 0–100) y récords de todos los juegos.
function pintarEstadisticas() {
  const hist = historiales();
  const hoy = fechaLocal();
  const minutos = Math.round((Number(leer('contador:ms')) || 0) / 60000);
  const resumen = el('div', 'resumen');
  for (const [valor, texto] of [
    [Number(leer('contador:partidas')) || 0, 'partidas'],
    [`${minutos} min`, 'jugando'],
    [`🔥 ${racha(hoy, idsPorCategoria, hist)}`, 'racha actual'],
    [`🔥 ${mejorRacha(idsPorCategoria, hist)}`, 'mejor racha'],
    [entrenosCompletados(idsPorCategoria, hist), 'entrenamientos'],
  ]) {
    const dato = el('div', 'dato');
    dato.append(el('strong', '', valor), el('span', '', texto));
    resumen.append(dato);
  }

  const barras = el('div', 'perfil');
  // El perfil compara partidas iguales: solo Normal + Normal.
  for (const { habilidad, valor } of perfil(JUEGOS, filtrar(hist, 'normal', 'normal'), HABILIDADES)) {
    const fila = el('div', 'fila-perfil');
    const barra = el('div', 'barra');
    const relleno = el('div');
    relleno.style.width = `${valor ?? 0}%`;
    barra.append(relleno);
    fila.append(el('span', '', habilidad), barra, el('span', '', valor ?? 'Sin datos'));
    barras.append(fila);
  }

  const records = el('ul', 'records');
  for (const j of JUEGOS) {
    const r = leerRecord(claveRecord(j.id));
    records.append(el('li', '', `${j.icono} ${j.nombre}: ${r ? conUnidad(j, r) : '—'}`));
  }

  $('estadisticas-contenido').replaceChildren(
    resumen,
    el('h3', 'categoria', 'Perfil por habilidad'),
    barras,
    el('h3', 'categoria', 'Récords'),
    records,
  );
}

function mostrar(id) {
  for (const s of document.querySelectorAll('main > section')) s.hidden = s.id !== id;
  $('btn-salir').hidden = id !== 'juego';
  $('btn-estadisticas').hidden = id !== 'menu';
  if (id === 'menu') {
    pintarEntreno();
    pintarAvisosDiarios();
  }
}

function abrirPrevia(j) {
  actual = j;
  eleccion = leerEleccion(j);
  nivelElegido = siguienteNivel(leerEstrellas(j.id));
  vistaHoy = false;
  pintarPrevia(j);
  mostrar('previa');
}

// Nombre, instrucciones, botones de modo/dificultad y, según el modo, récord y gráfica o la cuadrícula de niveles.
function pintarPrevia(j) {
  $('previa-cabecera').style.setProperty('--c', `var(--${j.color})`);
  $('previa-icono').textContent = j.icono;
  $('previa-nombre').textContent = j.nombre;
  $('previa-instrucciones').textContent = j.instrucciones;
  pintarModos(j);
  const enNiveles = eleccion.modo === 'niveles';
  $('btn-jugar').textContent = '▶ Jugar';
  $('previa-record-linea').hidden = enNiveles;
  $('previa-historial').hidden = enNiveles;
  $('previa-niveles').hidden = !enNiveles;
  if (enNiveles) return pintarNiveles(j);
  const record = leerRecord(claveRecord(j.id, eleccion.modo, eleccion.dificultad));
  $('previa-record').textContent = record ? conUnidad(j, record) : '—';
  pintarHistorial(j);
}

// Modo Niveles: total de estrellas, selector de mundo (◀ ▶) con la pestaña 📅 Hoy, los niveles del mundo
// (o los 3 diarios) con su reto y estrellas, y el objetivo.
function pintarNiveles(j) {
  const estrellas = leerEstrellas(j.id);
  const hoy = fechaLocal();
  const diarios = diariosConHoy(j.id);
  const delDia = diarios[hoy];
  const mundo = mundoDe(nivelElegido);
  const grupo = (titulo, clase) => {
    const caja = el('div', clase);
    caja.setAttribute('role', 'group');
    caja.setAttribute('aria-label', titulo);
    return caja;
  };
  // Tras elegir se repinta y el foco vuelve al botón equivalente (`selector`) de esa fila
  // (o al nombre del mundo, si una flecha ha quedado desactivada).
  const repintar = (fila, selector = '[aria-pressed="true"]') => {
    pintarNiveles(j);
    const b = $('previa-niveles').querySelector(`[aria-label="${fila}"] ${selector}`);
    (b && !b.disabled ? b : $('previa-niveles').querySelector('.nombre-mundo'))?.focus();
  };
  // Al cambiar de mundo se elige su primer nivel libre sin estrellas (o el primero del mundo).
  const irAMundo = (m, selector) => {
    const primero = (m - 1) * NIVELES_POR_MUNDO + 1;
    nivelElegido = primero;
    for (let n = primero + NIVELES_POR_MUNDO - 1; n >= primero; n--) if (nivelLibre(estrellas, n) && !(estrellas[n - 1] > 0)) nivelElegido = n;
    vistaHoy = false;
    repintar('Mundo', selector);
  };
  const flecha = (texto, clase, etiqueta, destino, disabled) => {
    const b = el('button', clase, texto);
    b.setAttribute('aria-label', etiqueta);
    b.disabled = disabled;
    b.onclick = () => irAMundo(destino, '.' + clase);
    return b;
  };

  // Completo si sus 10 niveles tienen ⭐ (la lista puede acabar a mitad del mundo).
  const completo = estrellas.slice((mundo - 1) * NIVELES_POR_MUNDO, mundo * NIVELES_POR_MUNDO).filter((e) => e > 0).length === NIVELES_POR_MUNDO;
  const variante = varianteDe(j.id, mundo);
  const nombre = el('button', 'nombre-mundo', `Mundo ${mundo}${variante ? ` · ${NOMBRE_VARIANTE[variante]}` : ''}${completo ? ' ✓' : ''}`);
  nombre.setAttribute('aria-pressed', !vistaHoy);
  nombre.onclick = () => irAMundo(mundo);
  const hechos = delDia.estrellas.filter((e) => e > 0).length;
  const pestanaHoy = el('button', 'hoy', `📅 Hoy ${hechos}/3`);
  pestanaHoy.setAttribute('aria-pressed', vistaHoy);
  pestanaHoy.setAttribute('aria-label', `Niveles de hoy, ${hechos} de 3 superados`);
  pestanaHoy.onclick = () => {
    vistaHoy = true;
    diarioElegido = Math.max(0, delDia.estrellas.findIndex((e) => !(e > 0)));
    repintar('Mundo');
  };
  const mundos = grupo('Mundo', 'mundos');
  mundos.append(
    flecha('◀', 'anterior', 'Mundo anterior', mundo - 1, mundo === 1),
    nombre,
    flecha('▶', 'siguiente', 'Mundo siguiente', mundo + 1, mundo >= mundoDe(siguienteNivel(estrellas))), // hasta el más alto desbloqueado
    pestanaHoy,
  );

  // Botón de un nivel: número, icono del reto y estrellas.
  const casilla = (n, e, libre, pulsado, etiqueta, alPulsar) => {
    const reto = configNivel(j.id, n).reto; // el reto real en este juego (los que no cambian nada salen como Normal)
    const b = el('button', reto === 'normal' ? '' : 'reto');
    b.append(el('span', '', libre ? `${n}` : `🔒${n}`), el('small', '', libre ? `${ICONO_RETO[reto]}${'⭐'.repeat(e)}${'☆'.repeat(3 - e)}` : ''));
    b.disabled = !libre;
    b.setAttribute('aria-pressed', pulsado);
    b.setAttribute('aria-label', libre ? `${etiqueta}, ${NOMBRE_RETO[reto]}, ${e} de 3 estrellas` : `${etiqueta}, bloqueado`);
    b.onclick = alPulsar;
    return b;
  };

  let rejilla;
  if (vistaHoy) {
    rejilla = grupo('Diarios', 'niveles diarios');
    delDia.niveles.forEach((n, i) => {
      rejilla.append(casilla(n, delDia.estrellas[i] || 0, true, i === diarioElegido, `Diario ${i + 1}, nivel ${n}`, () => {
        diarioElegido = i;
        repintar('Diarios');
      }));
    });
  } else {
    rejilla = grupo('Nivel', 'niveles');
    for (let n = (mundo - 1) * NIVELES_POR_MUNDO + 1; n <= mundo * NIVELES_POR_MUNDO; n++) {
      rejilla.append(casilla(n, estrellas[n - 1] || 0, nivelLibre(estrellas, n), n === nivelElegido, `Nivel ${n}`, () => {
        nivelElegido = n;
        repintar('Nivel');
      }));
    }
  }

  const n = nivelJugado();
  const cfg = configNivel(j.id, n);
  const cabecera = vistaHoy
    ? `📅 Diario ${diarioElegido + 1}/3 · Nivel ${n}${cfg.variante ? ` · ${NOMBRE_VARIANTE[cfg.variante]}` : ''}`
    : `Nivel ${n}`;
  const objetivo = el('p', 'objetivo', `${cabecera} · ${NOMBRE_RETO[cfg.reto]}\n${cfg.texto}`);
  objetivo.setAttribute('aria-live', 'polite'); // se anuncia al cambiar de nivel
  const racha = rachaDiaria(diarios, hoy);
  const total = el('p', 'total-estrellas', `⭐ ${estrellasDelJuego(j.id)}${racha ? ` · 📅🔥 ${racha}` : ''}`);
  $('previa-niveles').replaceChildren(total, mundos, rejilla, objetivo);
  $('btn-jugar').textContent = vistaHoy ? `▶ Jugar diario ${diarioElegido + 1}` : `▶ Jugar nivel ${n}`;
}

// Icono de cada modo en su baldosa y carita de cada dificultad.
const ICONO_MODO = { normal: '⏱', rapido: '⚡', sinfallo: '❤️', niveles: '🪜' };
const CARA = { facil: '🙂', normal: '😐', dificil: '😈' };

// Subtítulo de la baldosa de un modo: duración, vidas o nivel alcanzado.
function subtituloModo(j, modo) {
  if (modo === 'rapido') return '30 s';
  if (modo === 'sinfallo') return '1 vida';
  if (modo === 'niveles') return `⭐ ${estrellasDelJuego(j.id)} · 📅 ${diariosHechos(j.id)}/3`;
  return j.duracion ?? '60 s';
}

// Modo en baldosas 2×2 (si el juego tiene más de uno) y dificultad como interruptor con caritas
// (salvo en Niveles, donde la pone el nivel, y en Rayo).
function pintarModos(j) {
  const grupo = (titulo, clase, opciones, elegido, alElegir) => {
    const caja = el('div', clase);
    caja.setAttribute('role', 'group');
    caja.setAttribute('aria-label', titulo);
    for (const [valor, contenido] of opciones) {
      const b = el('button');
      b.append(...contenido);
      b.setAttribute('aria-pressed', valor === elegido);
      b.onclick = () => {
        alElegir(valor);
        $('previa-modos').querySelector(`[aria-label="${titulo}"] button[aria-pressed="true"]`)?.focus();
      };
      caja.append(b);
    }
    return [el('h3', 'categoria', titulo), caja];
  };
  const partes = [];
  const modos = j.modos ?? ['normal'];
  if (modos.length > 1) {
    const baldosa = (m) => [m, [el('span', 'icono-modo', ICONO_MODO[m]), el('span', '', MODOS[m]), el('small', '', subtituloModo(j, m))]];
    partes.push(...grupo('Modo', 'baldosas', modos.map(baldosa), eleccion.modo, (modo) => elegir(j, { ...eleccion, modo })));
  }
  if (!j.sinDificultad && eleccion.modo !== 'niveles') {
    const opciones = Object.entries(DIFICULTADES).map(([d, nombre]) => [d, [`${CARA[d]} ${nombre}`]]);
    partes.push(...grupo('Dificultad', 'segmento', opciones, eleccion.dificultad, (dificultad) => elegir(j, { ...eleccion, dificultad })));
  }
  $('previa-modos').replaceChildren(...partes);
}

function elegir(j, e) {
  eleccion = e;
  guardar('eleccion:' + j.id, `${e.modo}|${e.dificultad}`);
  pintarPrevia(j);
}

// Lo que recibe start: la elección o, en Niveles, la configuración del nivel elegido.
function opcionesDeJuego() {
  if (eleccion.modo !== 'niveles') return eleccion;
  jugando = { nivel: nivelJugado(), fecha: fechaLocal(), diario: vistaHoy ? diarioElegido : null };
  const nivel = configNivel(actual.id, jugando.nivel);
  return { modo: 'niveles', dificultad: nivel.dificultad, nivel };
}

// Cuenta atrás 3-2-1 y después empieza el juego. Mientras, ✕ la cancela con parar().
function jugar() {
  const tablero = $('tablero');
  mostrar('juego');
  let n = 3;
  let id;
  parar = () => clearTimeout(id);

  function paso() {
    if (n === 0) {
      tablero.replaceChildren();
      inicio = Date.now();
      parar = actual.juego.start(tablero, terminar, opcionesDeJuego());
      return;
    }
    tablero.replaceChildren(el('div', 'cuenta', n));
    sonar('tic');
    n--;
    id = setTimeout(paso, 1000);
  }

  paso();
}

function terminar(puntos) {
  parar = null;
  const hoy = fechaLocal();
  const entrenoAntes = entrenoCompleto(hoy, idsPorCategoria, historiales());
  const enNiveles = eleccion.modo === 'niveles';
  const partida = { fecha: hoy, cuando: Date.now(), puntos, ms: Date.now() - inicio, ...eleccion };
  const nivel = enNiveles ? jugando.nivel : 0;
  if (enNiveles) Object.assign(partida, { dificultad: configNivel(actual.id, nivel).dificultad, nivel });
  guardarPartida(actual.id, partida);
  // ¿Esta partida es la que completa el entrenamiento de hoy?
  const entrenoHoy = !entrenoAntes && entrenoCompleto(hoy, idsPorCategoria, historiales());
  let celebrar = entrenoHoy;
  $('final-puntos').textContent = conUnidad(actual, puntos);
  $('final-entreno').hidden = !entrenoHoy;

  if (enNiveles) {
    // Niveles: sin récord; se guarda la mejor marca de estrellas (del nivel o del diario)
    // y Repetir pasa a "Siguiente nivel" / "Siguiente diario" o "Reintentar".
    const cfg = configNivel(actual.id, nivel);
    const conseguidas = estrellasDe(puntos, cfg.metas, actual.menorEsMejor);
    const signo = actual.menorEsMejor ? '≤' : '';
    let texto = !conseguidas
      ? `Nivel no superado (⭐ con ${signo}${cfg.metas[0]} ${cfg.unidad})`
      : `${'⭐'.repeat(conseguidas)}${'☆'.repeat(3 - conseguidas)} ¡Superado!` +
        (conseguidas < 3 ? ` · ${'⭐'.repeat(conseguidas + 1)} con ${signo}${cfg.metas[conseguidas]} ${cfg.unidad}` : '');
    let siguiente = conseguidas > 0;
    if (jugando.diario !== null) {
      // Se guarda en el día en que empezó la partida.
      const diarios = leerDiarios(actual.id);
      const dia = diarios[jugando.fecha];
      const antes = diarioCompleto(dia);
      dia.estrellas[jugando.diario] = Math.max(dia.estrellas[jugando.diario] || 0, conseguidas);
      guardarDiarios(actual.id, diarios);
      $('final-modo').textContent = `📅 Diario ${jugando.diario + 1}/3 · Nivel ${nivel} · ${NOMBRE_RETO[cfg.reto]}`;
      if (!antes && diarioCompleto(dia)) texto += ` · ¡Diarios de hoy completos! 📅🔥 ${rachaDiaria(diarios, hoy)}`;
      const pendiente = dia.estrellas.findIndex((e) => !(e > 0));
      siguiente &&= pendiente !== -1;
      if (siguiente) diarioElegido = pendiente;
      $('btn-repetir').textContent = siguiente ? 'Siguiente diario' : 'Reintentar';
    } else {
      guardar('estrellas:' + actual.id, JSON.stringify(conEstrellas(leerEstrellas(actual.id), nivel, conseguidas)));
      $('final-modo').textContent = `🪜 Nivel ${nivel} · ${NOMBRE_RETO[cfg.reto]}`;
      if (siguiente) nivelElegido++;
      $('btn-repetir').textContent = siguiente ? 'Siguiente nivel' : 'Reintentar';
    }
    $('final-nivel').textContent = texto;
    $('final-nivel').hidden = false;
    $('final-record').hidden = true;
    celebrar ||= conseguidas > 0;
  } else {
    const clave = claveRecord(actual.id, eleccion.modo, eleccion.dificultad);
    const nuevo = esRecord(puntos, leerRecord(clave), actual.menorEsMejor);
    if (nuevo) guardar(clave, puntos);
    $('final-record').hidden = !nuevo;
    $('final-modo').textContent = etiqueta(eleccion.modo, eleccion.dificultad);
    $('final-nivel').hidden = true;
    $('btn-repetir').textContent = 'Repetir';
    celebrar ||= nuevo;
  }

  mostrar('final');
  if (celebrar) {
    confeti();
    sonar('record');
  }
}

// Lluvia de confeti con los colores del tema. Cada pieza se borra al acabar de caer.
function confeti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // el sistema pide menos movimiento
  const colores = ['--rojo', '--azul', '--verde', '--amarillo', '--acento'];
  for (let i = 0; i < 40; i++) {
    const pieza = el('div', 'confeti');
    pieza.style.left = Math.random() * 100 + 'vw';
    pieza.style.background = `var(${colores[i % colores.length]})`;
    pieza.style.animationDelay = Math.random() * 0.5 + 's';
    pieza.style.animationDuration = 1.2 + Math.random() * 0.8 + 's';
    pieza.onanimationend = () => pieza.remove();
    document.body.append(pieza);
  }
}

// Tema: el <script> del <head> ya puso data-tema; aquí se cambia con el botón ☀️/🌙.
function pintarTema() {
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  $('btn-tema').textContent = oscuro ? '☀️' : '🌙';
  document.querySelector('meta[name="theme-color"]').content = oscuro ? '#0b0f2a' : '#fff7ec';
}

$('btn-tema').onclick = () => {
  const tema = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
  document.documentElement.dataset.tema = tema;
  guardar('ajuste:tema', tema);
  pintarTema();
};
pintarTema();

// Ajustes 🔊 y 📳 (se guardan en efectos.js).
function pintarAjustes() {
  $('btn-sonido').textContent = activo('sonido') ? '🔊' : '🔇';
  $('btn-sonido').setAttribute('aria-pressed', activo('sonido'));
  $('btn-vibracion').classList.toggle('apagado', !activo('vibracion'));
  $('btn-vibracion').setAttribute('aria-pressed', activo('vibracion'));
}

$('btn-sonido').onclick = () => {
  alternar('sonido');
  pintarAjustes();
};
$('btn-vibracion').onclick = () => {
  alternar('vibracion');
  pintarAjustes();
};
$('btn-vibracion').hidden = !puedeVibrar();
pintarAjustes();

// Menú: tarjetas agrupadas por habilidad (los grupos sin juegos no se dibujan).
const ICONO_HABILIDAD = { Memoria: '🧠', Cálculo: '➕', Atención: '👁', Lógica: '🧩', Reacción: '⚡' };
for (const habilidad of HABILIDADES) {
  const juegos = JUEGOS.filter((j) => j.habilidad === habilidad);
  if (!juegos.length) continue;
  const rejilla = el('div', 'rejilla menu-juegos');
  for (const j of juegos) {
    const b = el('button', 'tarjeta color');
    b.dataset.juego = j.id;
    b.style.setProperty('--c', `var(--${j.color})`);
    b.append(el('span', 'icono', j.icono), el('span', '', j.nombre));
    b.onclick = () => abrirPrevia(j);
    rejilla.append(b);
  }
  $('lista-juegos').append(el('h3', 'categoria', `${ICONO_HABILIDAD[habilidad]} ${habilidad}`), rejilla);
}

pintarEntreno();
pintarAvisosDiarios();

$('btn-jugar').onclick = jugar;
$('btn-repetir').onclick = jugar;
for (const b of document.querySelectorAll('.btn-menu')) b.onclick = () => mostrar('menu');

$('btn-estadisticas').onclick = () => {
  pintarEstadisticas();
  mostrar('estadisticas');
};

// ✕: vuelve al menú sin guardar la puntuación.
$('btn-salir').onclick = () => {
  if (parar) parar();
  parar = null;
  callar();
  mostrar('menu');
};

// Funcionamiento sin conexión. Solo va en localhost o HTTPS; si falla, la app sigue igual.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
