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
  NUM_NIVELES, NOMBRE_RETO, ICONO_RETO, NOMBRE_VARIANTE, DESCRIPCION_VARIANTE, NIVELES_POR_MUNDO, mundoDe, varianteDe, configNivel, estrellasDe, nivelLibre,
  conEstrellas, totalEstrellas, desdeAntiguo, siguienteNivel, nivelesDelDia, diarioCompleto, rachaDiaria, podarDiarios, estrellasDiarias,
} from './games/niveles.js';
import { barraFinal, fraseEstrellas, fraseRecord } from './games/final.js';
import { esClaveDelJuego, crearCopia, leerCopia } from './games/copia.js';
import { tieneProgreso, decidirSincro, datosRanking } from './games/sincro.js';
import { CONFIG } from './firebase-config.js';

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
let diarioElegido = 0; // diario seleccionado (0–2) en los retos de hoy
let mundoVisto = 1; // mundo que se ve en el camino (◀ ▶)
let nube = null; // ☁️ módulo games/nube.js, cuando ha cargado
let usuario = null; // usuario con sesión, o null
let estadoNube = ''; // texto de estado del bloque Nube
let sesionLista = false; // ya se sabe si hay sesión (Firebase respondió)
let temporizadores = []; // sonidos y confeti pendientes del final; se cancelan al salir de él
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

// Retos de hoy que te faltan en un juego; solo cuenta si ya lo juegas en Niveles (tiene alguna ⭐).
const retosPendientes = (j) => (estrellasDelJuego(j.id) > 0 ? 3 - diariosHechos(j.id) : 0);

// Abre un juego directamente en modo Niveles, con el camino colocado en tu nivel.
function abrirEnNiveles(j) {
  abrirPrevia(j);
  if (eleccion.modo !== 'niveles') elegir(j, { ...eleccion, modo: 'niveles' });
  document.querySelector('.camino .actual')?.scrollIntoView({ block: 'center' });
}

// Menú: fila de retos de hoy pendientes y, en cada tarjeta, tu nivel 🪜, tu récord 🏆 y el aviso 📅.
function pintarProgreso() {
  const retos = el('div', 'fila-retos');
  for (const b of document.querySelectorAll('.tarjeta[data-juego]')) {
    const j = JUEGOS.find((x) => x.id === b.dataset.juego);
    const pendientes = retosPendientes(j);
    const nivel = estrellasDelJuego(j.id) > 0 ? siguienteNivel(leerEstrellas(j.id)) : 0;
    const record = leerRecord(claveRecord(j.id));
    b.querySelector('.progreso').textContent = [nivel && `🪜 ${nivel}`, record && `🏆 ${record}`].filter(Boolean).join(' · ');
    b.querySelector('.aviso-retos').textContent = pendientes ? `📅 ${pendientes}` : '';
    b.setAttribute('aria-label', [j.nombre, nivel && `nivel ${nivel}`, record && `récord ${record}`, pendientes && `${pendientes} retos de hoy pendientes`].filter(Boolean).join(', '));
    if (pendientes) {
      const reto = el('button', '', `${j.icono} ${j.nombre} ${3 - pendientes}/3`);
      reto.onclick = () => abrirEnNiveles(j);
      retos.append(reto);
    }
  }
  $('retos-pendientes').replaceChildren(...(retos.children.length ? [el('h3', 'categoria', '📅 Retos de hoy pendientes'), retos] : []));
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

// Tarjeta "☀️ Tu día": los 3 juegos del entrenamiento (✓ hechos, ▶ el siguiente), barra de avance y racha.
function pintarEntreno() {
  const hoy = fechaLocal();
  const hist = historiales();
  const hechos = jugadosEn(hoy, hist);
  const ids = entrenoDelDia(hoy, idsPorCategoria);
  const siguiente = ids.find((id) => !hechos.has(id));
  const titulo = el('div', 'entreno-titulo');
  titulo.append(el('span', '', '☀️ Tu día'), el('span', '', `🔥 ${racha(hoy, idsPorCategoria, hist)}`));
  const lista = el('div', 'entreno-juegos');
  for (const id of ids) {
    const j = JUEGOS.find((x) => x.id === id);
    const hecho = hechos.has(id);
    const marca = hecho ? '✓ ' : id === siguiente ? '▶ ' : '';
    const b = el('button', hecho ? 'hecho' : id === siguiente ? 'siguiente' : '', `${marca}${j.icono} ${j.nombre}`);
    b.onclick = () => abrirPrevia(j);
    lista.append(b);
  }
  const cuantos = ids.filter((id) => hechos.has(id)).length;
  const barra = el('div', 'barra-dia');
  barra.setAttribute('role', 'img');
  barra.setAttribute('aria-label', `${cuantos} de ${ids.length} hechos`);
  const relleno = el('div');
  relleno.style.width = `${(cuantos / ids.length) * 100}%`;
  barra.append(relleno);
  const partes = [titulo, lista, barra];
  if (!siguiente) partes.push(el('p', 'entreno-completo', '✓ ¡Entrenamiento completado!'));
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

// Ventana propia en lugar de confirm()/prompt(), que muestran la dirección de la web ("… dice").
// Con `campo` (texto inicial) pide un texto y devuelve lo escrito; sin él, devuelve true. Si se cancela, null.
function preguntar({ titulo, texto, boton, campo = null }) {
  const dialogo = $('dialogo-pregunta');
  const entrada = $('pregunta-campo');
  $('pregunta-titulo').textContent = titulo;
  $('pregunta-texto').textContent = texto;
  $('pregunta-si').textContent = boton;
  entrada.hidden = campo === null;
  entrada.value = campo ?? '';
  dialogo.returnValue = '';
  dialogo.showModal();
  if (campo !== null) entrada.select();
  return new Promise((responder) => {
    dialogo.addEventListener('close', () => {
      if (dialogo.returnValue !== 'si') responder(null);
      else responder(campo === null ? true : entrada.value);
    }, { once: true });
  });
}

// Ayuda de la primera vez: un aviso encima de lo que explica (resaltado), hasta que se cierra con ✕.
const AYUDAS = {
  menu: { objetivo: '#entreno', texto: '👋 ¡Bienvenido! Empieza por ☀️ Tu día: 3 juegos para entrenar cada día y mantener tu racha 🔥. Toca cualquier juego para ver sus modos.' },
  modos: { objetivo: '#previa-modos', texto: 'Elige un modo y una dificultad. 🪜 Niveles es un camino sin fin con estrellas y 3 retos nuevos cada día.' },
  niveles: { objetivo: '.camino', texto: '🧑 marca tu nivel. Toca un nivel para ver su objetivo, o juega el siguiente con el botón grande.' },
  final: { objetivo: '#final-barra', texto: 'La barra muestra cuánto te faltó: las ⭐ en Niveles, y tu media 📊 y tu récord 🏆 en los demás modos.' },
};
const AYUDA_DE_PANTALLA = { menu: 'menu', final: 'final' }; // la previa elige la suya al pintarse

// Quita el aviso que hubiera y, si `sitio` no se ha visto aún y lo que explica está a la vista, lo muestra.
function mostrarAyuda(sitio) {
  document.querySelector('.ayuda')?.remove();
  document.querySelector('.resaltado')?.classList.remove('resaltado');
  if (!sitio || leer('ayuda:' + sitio)) return;
  const objetivo = document.querySelector(AYUDAS[sitio].objetivo);
  if (!objetivo || objetivo.hidden) return;
  const aviso = el('div', 'ayuda');
  aviso.setAttribute('role', 'note');
  const cerrar = el('button', '', '✕');
  cerrar.setAttribute('aria-label', 'Cerrar la ayuda');
  cerrar.onclick = () => {
    guardar('ayuda:' + sitio, '1');
    mostrarAyuda(null);
  };
  aviso.append(el('p', '', AYUDAS[sitio].texto), cerrar);
  objetivo.before(aviso);
  objetivo.classList.add('resaltado');
}

function mostrar(id) {
  for (const s of document.querySelectorAll('main > section')) s.hidden = s.id !== id;
  $('btn-salir').hidden = id !== 'juego';
  $('btn-ayuda').hidden = id === 'juego';
  $('btn-estadisticas').hidden = id !== 'menu';
  if (id !== 'final') {
    temporizadores.forEach(clearTimeout);
    temporizadores = [];
  }
  if (id === 'menu') {
    pintarEntreno();
    pintarProgreso();
    pintarSugerencia();
  }
  if (id !== 'previa') mostrarAyuda(AYUDA_DE_PANTALLA[id]);
  $('btn-ranking').hidden = id !== 'menu' || !usuario;
  if (id === 'menu' || id === 'final') subir().catch(() => {}); // sin conexión: se reintenta la próxima vez
}

function abrirPrevia(j) {
  actual = j;
  eleccion = leerEleccion(j);
  nivelElegido = siguienteNivel(leerEstrellas(j.id));
  mundoVisto = mundoDe(nivelElegido);
  vistaHoy = false;
  pintarPrevia(j);
  mostrar('previa');
  document.querySelector('.camino .actual')?.scrollIntoView({ block: 'center' }); // el camino empieza en tu nivel
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
  mostrarAyuda('modos');
  const record = leerRecord(claveRecord(j.id, eleccion.modo, eleccion.dificultad));
  $('previa-record').textContent = record ? conUnidad(j, record) : '—';
  pintarHistorial(j);
}

const textoEstrellas = (e) => `${'⭐'.repeat(e)}${'☆'.repeat(3 - e)}`;

// Modo Niveles: total, 📅 retos de hoy, cartel del mundo (◀ ▶) y camino de sus 10 niveles (de abajo arriba).
// Tocar un nivel o un reto abre su tarjeta; el botón grande juega siempre el siguiente nivel.
function pintarNiveles(j) {
  const estrellas = leerEstrellas(j.id);
  const hoy = fechaLocal();
  const diarios = diariosConHoy(j.id);
  const delDia = diarios[hoy];
  const siguiente = siguienteNivel(estrellas);
  const grupo = (titulo, clase) => {
    const caja = el('div', clase);
    caja.setAttribute('role', 'group');
    caja.setAttribute('aria-label', titulo);
    return caja;
  };

  const retos = grupo('Retos de hoy', 'retos-hoy');
  delDia.niveles.forEach((n, i) => {
    const e = delDia.estrellas[i] || 0;
    const reto = configNivel(j.id, n).reto;
    const b = el('button', e > 0 ? 'hecho' : '');
    b.append(el('span', '', `${n} ${ICONO_RETO[reto]}`), el('small', '', textoEstrellas(e)));
    b.setAttribute('aria-label', `Reto de hoy ${i + 1}, nivel ${n}, ${NOMBRE_RETO[reto]}, ${e} de 3 estrellas`);
    b.onclick = () => {
      vistaHoy = true;
      diarioElegido = i;
      abrirTarjeta(j);
    };
    retos.append(b);
  });

  // Cartel: ◀ nombre y variante (explicada) ▶; ▶ llega hasta el mundo más alto desbloqueado.
  const mundo = mundoVisto;
  const primero = (mundo - 1) * NIVELES_POR_MUNDO + 1;
  const hechos = estrellas.slice(primero - 1, primero - 1 + NIVELES_POR_MUNDO).filter((e) => e > 0).length;
  const variante = varianteDe(j.id, mundo);
  const cartel = grupo('Mundo', 'cartel');
  if (siguiente === primero && siguiente > 1) cartel.classList.add('nuevo'); // recién abierto: entra con animación
  const flecha = (texto, clase, etiqueta, destino, apagada) => {
    const b = el('button', clase, texto);
    b.setAttribute('aria-label', etiqueta);
    b.disabled = apagada;
    b.onclick = () => {
      mundoVisto = destino;
      pintarNiveles(j);
      // El foco se queda en la flecha; si se ha apagado, pasa a la otra.
      const otra = clase === 'anterior' ? 'siguiente' : 'anterior';
      const misma = $('previa-niveles').querySelector(`.cartel .${clase}`);
      (misma.disabled ? $('previa-niveles').querySelector(`.cartel .${otra}`) : misma).focus();
    };
    return b;
  };
  const nombre = el('div', 'nombre-mundo');
  nombre.append(
    el('strong', '', `Mundo ${mundo}${variante ? ` · ${NOMBRE_VARIANTE[variante]}` : ''}`),
    el('small', '', `${variante ? `${DESCRIPCION_VARIANTE[variante]} · ` : ''}${hechos}/${NIVELES_POR_MUNDO}`),
  );
  cartel.append(
    flecha('◀', 'anterior', 'Mundo anterior', mundo - 1, mundo === 1),
    nombre,
    flecha('▶', 'siguiente', 'Mundo siguiente', mundo + 1, mundo >= mundoDe(siguiente)),
  );

  const camino = grupo(`Niveles del mundo ${mundo}`, 'camino');
  for (let n = primero; n < primero + NIVELES_POR_MUNDO; n++) {
    const libre = nivelLibre(estrellas, n);
    const e = estrellas[n - 1] || 0;
    const reto = configNivel(j.id, n).reto; // el reto real en este juego (los que no cambian nada salen como Normal)
    const clases = [n === siguiente ? 'actual' : e > 0 ? 'hecho' : '', reto === 'jefe' ? 'jefe' : ''].join(' ').trim();
    const b = el('button', clases);
    b.append(el('span', '', libre ? `${n}` : `🔒${n}`), el('small', '', libre ? `${ICONO_RETO[reto]}${textoEstrellas(e)}` : ''));
    if (n === siguiente) {
      b.setAttribute('aria-current', 'step'); // tu siguiente nivel (no solo por el color)
      const yo = el('span', 'yo', '🧑');
      yo.setAttribute('aria-hidden', 'true');
      b.append(yo);
    }
    b.disabled = !libre;
    b.setAttribute('aria-label', libre ? `Nivel ${n}, ${NOMBRE_RETO[reto]}, ${e} de 3 estrellas` : `Nivel ${n}, bloqueado`);
    b.onclick = () => {
      vistaHoy = false;
      nivelElegido = n;
      abrirTarjeta(j);
    };
    camino.append(b);
  }

  const racha = rachaDiaria(diarios, hoy);
  const total = el('p', 'total-estrellas', `⭐ ${estrellasDelJuego(j.id)}${racha ? ` · 📅🔥 ${racha}` : ''}`);
  $('previa-niveles').replaceChildren(total, el('h3', 'categoria', '📅 Retos de hoy'), retos, cartel, camino);
  $('btn-jugar').textContent = `▶ Jugar nivel ${siguiente}`;
  mostrarAyuda('niveles'); // también al cambiar de mundo, que redibuja el camino
}

// Tarjeta (diálogo) del nivel o reto elegido: objetivo, tus estrellas y botón para jugarlo.
function abrirTarjeta(j) {
  const n = nivelJugado();
  const cfg = configNivel(j.id, n);
  const deVariante = cfg.variante ? ` · ${NOMBRE_VARIANTE[cfg.variante]}` : '';
  let titulo;
  let e;
  let extra = '';
  let boton;
  if (vistaHoy) {
    const diarios = diariosConHoy(j.id);
    const racha = rachaDiaria(diarios, fechaLocal());
    e = diarios[fechaLocal()].estrellas[diarioElegido] || 0;
    titulo = `📅 Reto de hoy ${diarioElegido + 1}/3 · Nivel ${n}`;
    extra = racha ? `Supera los 3 hoy para mantener tu 📅🔥 ${racha}` : 'Supera los 3 hoy para empezar una racha 📅🔥';
    boton = `▶ Jugar reto ${diarioElegido + 1}`;
  } else {
    e = leerEstrellas(j.id)[n - 1] || 0;
    titulo = `Nivel ${n}`;
    boton = e > 0 && e < 3 ? '▶ Jugar por ⭐⭐⭐' : '▶ Jugar';
  }
  $('tarjeta-titulo').textContent = `${titulo}${deVariante} · ${NOMBRE_RETO[cfg.reto]}`;
  $('tarjeta-texto').textContent = [`Tienes ${textoEstrellas(e)}`, cfg.texto, extra].filter(Boolean).join('\n');
  $('tarjeta-jugar').textContent = boton;
  $('tarjeta-nivel').classList.toggle('diaria', vistaHoy);
  $('tarjeta-nivel').showModal();
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

// Barra del final: se llena hasta la puntuación y marca cada valor (`etiquetas[i]` encima, el número debajo).
function pintarBarra(puntos, valores, etiquetas, menorEsMejor) {
  const barra = $('final-barra');
  barra.hidden = !valores.length;
  if (!valores.length) return;
  const { relleno, marcas } = barraFinal(puntos, valores, menorEsMejor);
  const lleno = el('div', 'relleno');
  lleno.style.setProperty('--p', `${relleno * 100}%`);
  const partes = [lleno];
  marcas.forEach((posicion, i) => {
    const marca = el('span', 'marca');
    marca.style.left = `${posicion * 100}%`;
    marca.append(el('span', '', etiquetas[i]), el('small', '', `${valores[i]}`));
    partes.push(marca);
  });
  barra.replaceChildren(...partes);
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
  $('final-puntos').textContent = puntos;
  $('final-entreno').hidden = !entrenoHoy;
  let titular = '';
  let frase = '';
  let unidad = actual.unidad ?? '';
  let espera = 0; // en Niveles, la celebración espera a que caigan las estrellas

  if (enNiveles) {
    // Niveles: sin récord; se guarda la mejor marca de estrellas (del nivel o del diario)
    // y el botón grande pasa a "Siguiente nivel" / "Siguiente diario" o "Reintentar".
    const cfg = configNivel(actual.id, nivel);
    const conseguidas = estrellasDe(puntos, cfg.metas, actual.menorEsMejor);
    unidad = cfg.unidad;
    titular = conseguidas ? '¡Superado!' : 'No superado';
    const valida = !actual.menorEsMejor || puntos > 0; // en "menos es mejor", 0 no es una marca válida
    frase = valida ? fraseEstrellas(puntos, cfg.metas, conseguidas, cfg.unidad, actual.menorEsMejor) : '';
    let siguiente = conseguidas > 0;
    if (jugando.diario !== null) {
      // Se guarda en el día en que empezó la partida.
      const diarios = leerDiarios(actual.id);
      const dia = diarios[jugando.fecha];
      const antes = diarioCompleto(dia);
      dia.estrellas[jugando.diario] = Math.max(dia.estrellas[jugando.diario] || 0, conseguidas);
      guardarDiarios(actual.id, diarios);
      $('final-modo').textContent = `📅 Diario ${jugando.diario + 1}/3 · Nivel ${nivel} · ${NOMBRE_RETO[cfg.reto]}`;
      if (!antes && diarioCompleto(dia)) frase += `\n¡Diarios de hoy completos! 📅🔥 ${rachaDiaria(diarios, hoy)}`;
      const pendiente = dia.estrellas.findIndex((e) => !(e > 0));
      siguiente &&= pendiente !== -1;
      if (siguiente) diarioElegido = pendiente;
      $('btn-repetir').textContent = siguiente ? '▶ Siguiente diario' : '↻ Reintentar';
    } else {
      guardar('estrellas:' + actual.id, JSON.stringify(conEstrellas(leerEstrellas(actual.id), nivel, conseguidas)));
      $('final-modo').textContent = `🪜 Nivel ${nivel} · ${NOMBRE_RETO[cfg.reto]}`;
      if (siguiente) nivelElegido++;
      $('btn-repetir').textContent = siguiente ? '▶ Siguiente nivel' : '↻ Reintentar';
    }
    // Superado con 1 o 2 ⭐ y el botón grande ya pasa al siguiente: también se puede repetir este por las 3.
    $('btn-mejorar').hidden = !(siguiente && conseguidas < 3);
    // Estrellas: las conseguidas caen una a una, cada una con su sonido.
    const estrellas = $('final-estrellas');
    estrellas.hidden = false;
    estrellas.setAttribute('aria-label', `${conseguidas} de 3 estrellas`);
    [...estrellas.children].forEach((s, i) => s.classList.toggle('ganada', i < conseguidas));
    for (let i = 0; i < conseguidas; i++) temporizadores.push(setTimeout(() => sonar('acierto'), 300 + i * 350));
    espera = conseguidas ? 300 + conseguidas * 350 : 0;
    pintarBarra(puntos, valida ? cfg.metas : [], ['⭐', '⭐⭐', '⭐⭐⭐'], actual.menorEsMejor);
    celebrar ||= conseguidas > 0;
  } else {
    // Otros modos: récord, y la barra compara con tu media (últimas 10 de antes) y tu récord anterior.
    const clave = claveRecord(actual.id, eleccion.modo, eleccion.dificultad);
    const anterior = leerRecord(clave);
    const nuevo = esRecord(puntos, anterior, actual.menorEsMejor);
    if (nuevo) guardar(clave, puntos);
    const previas = leerHistorial(actual.id).filter((p) => esDe(p, eleccion.modo, eleccion.dificultad)).slice(0, -1)
      .filter((p) => !actual.menorEsMejor || p.puntos > 0).slice(-10);
    const valores = [];
    const etiquetas = [];
    if (previas.length) {
      valores.push(Math.round(previas.reduce((s, p) => s + p.puntos, 0) / previas.length));
      etiquetas.push('📊');
    }
    if (anterior) {
      valores.push(anterior);
      etiquetas.push('🏆');
    }
    pintarBarra(puntos, valores, etiquetas, actual.menorEsMejor);
    titular = nuevo ? '🏆 ¡Nuevo récord!' : '';
    frase = anterior || nuevo ? fraseRecord(puntos, anterior, actual.unidad ?? 'puntos', actual.menorEsMejor) : '';
    $('final-modo').textContent = etiqueta(eleccion.modo, eleccion.dificultad);
    $('final-estrellas').hidden = true;
    $('btn-repetir').textContent = '↻ Repetir';
    $('btn-mejorar').hidden = true;
    celebrar ||= nuevo;
  }

  $('final-titular').textContent = titular;
  $('final-titular').hidden = !titular;
  $('final-titular').classList.toggle('mal', titular === 'No superado');
  $('final-barra').classList.toggle('metas', enNiveles); // etiquetas de estrellas, más pequeñas
  $('final-unidad').textContent = unidad;
  $('final-nivel').textContent = frase;
  $('final-nivel').hidden = !frase;
  mostrar('final');
  if (celebrar) {
    temporizadores.push(setTimeout(() => {
      confeti();
      sonar('record');
    }, espera));
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
    b.append(el('span', 'icono', j.icono), el('span', '', j.nombre), el('small', 'progreso'), el('span', 'aviso-retos'));
    b.onclick = () => abrirPrevia(j);
    rejilla.append(b);
  }
  $('lista-juegos').append(el('h3', 'categoria', `${ICONO_HABILIDAD[habilidad]} ${habilidad}`), rejilla);
}

pintarEntreno();
pintarProgreso();
mostrarAyuda('menu');

// En Niveles, el botón grande juega siempre el siguiente nivel (aunque antes se mirara otro en su tarjeta).
$('btn-jugar').onclick = () => {
  if (eleccion.modo === 'niveles') {
    vistaHoy = false;
    nivelElegido = siguienteNivel(leerEstrellas(actual.id));
  }
  jugar();
};
$('tarjeta-jugar').onclick = () => {
  $('tarjeta-nivel').close();
  jugar();
};
// Tocar fuera de la tarjeta (en el fondo oscuro) la cierra.
$('tarjeta-nivel').onclick = (e) => {
  if (e.target === e.currentTarget) e.currentTarget.close();
};
$('btn-repetir').onclick = jugar;
// Vuelve a jugar el mismo nivel o reto que acaba de terminar (el botón grande ya apunta al siguiente).
$('btn-mejorar').onclick = () => {
  vistaHoy = jugando.diario !== null;
  if (vistaHoy) diarioElegido = jugando.diario;
  else nivelElegido = jugando.nivel;
  jugar();
};
for (const b of document.querySelectorAll('.btn-menu')) b.onclick = () => mostrar('menu');

// ❓: vuelve a activar todos los avisos y muestra el de la pantalla actual.
$('btn-ayuda').onclick = () => {
  for (const sitio of Object.keys(AYUDAS)) guardar('ayuda:' + sitio, '');
  const pantalla = [...document.querySelectorAll('main > section')].find((s) => !s.hidden).id;
  if (pantalla === 'previa') pintarPrevia(actual);
  else mostrarAyuda(AYUDA_DE_PANTALLA[pantalla]);
  document.querySelector('.ayuda')?.scrollIntoView({ block: 'center' });
};

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

// 💾 Copia de seguridad: guarda el progreso en un archivo (en el móvil, con el menú de compartir) o lo recupera de uno.
function datosGuardados() {
  try {
    return Object.keys(localStorage).map((clave) => [clave, localStorage.getItem(clave)]);
  } catch {
    return []; // sin localStorage (modo privado): no hay nada que copiar
  }
}

// Cambia todo el progreso del juego por `datos` ({ clave: valor }); las claves que no estén se borran.
function sustituirProgreso(datos) {
  for (const [clave] of datosGuardados()) if (esClaveDelJuego(clave)) localStorage.removeItem(clave);
  for (const [clave, valor] of Object.entries(datos)) if (esClaveDelJuego(clave) && typeof valor === 'string') guardar(clave, valor);
}

const datosDelJuego = () => Object.fromEntries(datosGuardados().filter(([clave]) => esClaveDelJuego(clave)));

$('btn-exportar').onclick = async () => {
  const nombre = `juego-mental-${fechaLocal()}.json`;
  const archivo = new File([crearCopia(datosGuardados(), fechaLocal())], nombre, { type: 'application/json' });
  // En el móvil, el menú de compartir deja guardarla en Drive, mandarla por WhatsApp…; en el ordenador, se descarga.
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: 'Copia de Juego Mental' });
      $('copia-estado').textContent = '✓ Copia lista';
    } catch {
      // se canceló el menú de compartir
    }
    return;
  }
  const enlace = el('a');
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
  $('copia-estado').textContent = `✓ Copia guardada como ${nombre}`;
};

$('btn-importar').onclick = () => $('archivo-copia').click();
$('archivo-copia').onchange = async () => {
  const archivo = $('archivo-copia').files[0];
  $('archivo-copia').value = ''; // para poder elegir el mismo archivo otra vez
  if (!archivo) return;
  try {
    const datos = leerCopia(await archivo.text());
    if (!(await preguntar({ titulo: '⬆️ Recuperar copia', texto: 'Tu progreso actual se sustituirá por el de la copia.', boton: 'Recuperar' }))) return;
    sustituirProgreso(datos);
    location.reload();
  } catch (e) {
    $('copia-estado').textContent = `✗ ${e.message}`;
  }
};

// Pide al navegador que no borre los datos por su cuenta (por falta de espacio); borrarlos a mano sigue siendo posible.
navigator.storage?.persist?.().catch(() => {});

// ☁️ Nube (Firebase): sesión con Google, progreso sincronizado y ranking. Sin CONFIG, no aparece nada de esto.

// Bloque "☁️ Nube" de 📊: entrar, o la cuenta con su estado, el apodo del ranking y las opciones.
function pintarNube() {
  const caja = $('nube');
  caja.hidden = !CONFIG;
  if (!CONFIG) return;
  const boton = (texto, alPulsar) => {
    const b = el('button', '', texto);
    b.onclick = alPulsar;
    return b;
  };
  const privacidad = el('a', '', 'Política de privacidad');
  privacidad.href = 'privacidad.html';
  const partes = [el('h3', 'categoria', '☁️ Nube')];
  if (!nube) {
    partes.push(el('p', 'sin-datos', estadoNube || 'Conectando con la nube…'));
  } else if (!usuario) {
    partes.push(
      el('p', 'sin-datos', 'Entra con tu cuenta de Google para guardar tu progreso en la nube y competir en el ranking. O sigue como invitado (con un apodo) desde este celular.'),
      boton('Entrar con Google (recomendado)', () => nube.entrar().catch(() => avisarNube('No se pudo entrar. Inténtalo de nuevo.'))),
      boton('Seguir como invitado', () => nube.entrarInvitado().catch((e) => avisarNube(
        e.code === 'auth/admin-restricted-operation' || e.code === 'auth/operation-not-allowed'
          ? 'El modo invitado aún no está activado en Firebase.'
          : 'No se pudo entrar como invitado (¿sin conexión?).',
      ))),
    );
    if (estadoNube) partes.push(el('p', 'estado-nube', estadoNube));
  } else {
    const apodo = leer('nube:apodo');
    if (usuario.isAnonymous) {
      partes.push(
        el('p', '', '👤 Jugando como invitado'),
        el('p', 'aviso-invitado', 'Tu progreso solo está ligado a este celular: si borras los datos o cambias de celular, lo perderás. Vincula tu cuenta de Google para guardarlo siempre.'),
        boton('Vincular con Google', vincular),
      );
    } else {
      partes.push(el('p', '', `Conectado como ${usuario.email}`));
    }
    partes.push(
      el('p', 'estado-nube', estadoNube),
      boton('🏆 Ver el ranking', abrirRanking),
      boton(apodo ? `✏️ Apodo en el ranking: ${apodo}` : '✏️ Aparecer en el ranking', () => pedirApodo(false)),
    );
    if (!usuario.isAnonymous) partes.push(boton('Salir', () => nube.salir())); // un invitado que sale pierde su cuenta
    partes.push(boton('Borrar mis datos de la nube', borrarNube));
  }
  partes.push(privacidad);
  caja.replaceChildren(...partes);
}

function avisarNube(texto) {
  estadoNube = texto;
  pintarNube();
}

async function alCambiarUsuario(u) {
  usuario = u;
  sesionLista = true;
  estadoNube = '';
  pintarSugerencia();
  $('btn-ranking').hidden = !u || $('menu').hidden;
  pintarNube();
  if (u) await sincronizar();
}

// Al tener sesión: decide si subir, bajar o preguntar (ver decidirSincro).
async function sincronizar() {
  try {
    avisarNube('Sincronizando…');
    const local = datosDelJuego();
    if (tieneProgreso(local) && !leer('nube:cambio')) guardar('nube:cambio', Date.now()); // progreso de antes de la nube
    const enNube = await nube.leerProgreso(usuario.uid);
    const decision = decidirSincro({
      hayLocal: tieneProgreso(local),
      hayNube: tieneProgreso(enNube?.datos ?? {}),
      vinculado: leer('nube:uid') === usuario.uid,
      cambioLocal: Number(leer('nube:cambio')) || 0,
      actualizadoNube: enNube?.actualizado ?? 0,
    });
    if (decision === 'preguntar') return preguntarSincro(enNube);
    if (decision === 'bajar') return bajar(enNube);
    guardar('nube:uid', usuario.uid);
    await subir();
    pedirApodo(true);
  } catch {
    avisarNube('Sin conexión con la nube: se sincronizará más tarde.');
  }
}

// Este celular y la nube tienen progreso distinto y aún no se han vinculado: que elija la persona.
function preguntarSincro(enNube) {
  avisarNube('Elige qué progreso conservar.');
  const dialogo = $('dialogo-nube');
  $('usar-nube').onclick = () => {
    dialogo.close();
    bajar(enNube);
  };
  $('usar-local').onclick = async () => {
    dialogo.close();
    guardar('nube:uid', usuario.uid);
    guardar('nube:cambio', Date.now()); // el de este celular pasa a ser el más reciente
    await subir().catch(() => avisarNube('Sin conexión con la nube: se sincronizará más tarde.'));
    pedirApodo(true);
  };
  dialogo.showModal();
}

// Trae el progreso de la nube a este celular y recarga la app con él.
function bajar(enNube) {
  sustituirProgreso(enNube.datos);
  guardar('nube:cambio', enNube.actualizado);
  guardar('nube:subido', enNube.actualizado);
  guardar('nube:uid', usuario.uid);
  location.reload();
}

// Sube el progreso (y la fila del ranking, si hay apodo) si ha cambiado desde la última vez.
async function subir() {
  if (!nube || !usuario || leer('nube:uid') !== usuario.uid) return;
  const cambio = Number(leer('nube:cambio')) || 0;
  if (cambio > (Number(leer('nube:subido')) || 0)) {
    const datos = datosDelJuego();
    await nube.guardarProgreso(usuario.uid, datos, cambio);
    const apodo = leer('nube:apodo');
    if (apodo) await nube.guardarRanking(usuario.uid, { apodo, ...datosRanking(datos), actualizado: cambio });
    guardar('nube:subido', cambio);
  }
  avisarNube(`✓ Sincronizado (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
}

// Apodo del ranking (2–20 caracteres; vacío = no aparecer). `primeraVez`: solo se pregunta una vez por celular.
async function pedirApodo(primeraVez) {
  if (primeraVez && leer('nube:preguntado')) return;
  guardar('nube:preguntado', '1');
  const propuesta = leer('nube:apodo') || (usuario.isAnonymous ? `Invitado-${10000 + Math.floor(Math.random() * 90000)}` : '');
  const texto = await preguntar({
    titulo: '🏆 Tu apodo en el ranking',
    texto: 'De 2 a 20 caracteres. Nunca se muestran tu nombre ni tu correo. Déjalo vacío para no aparecer.',
    boton: 'Guardar',
    campo: propuesta,
  });
  if (texto === null) return; // cancelado: no cambia nada
  const apodo = texto.trim().slice(0, 20);
  try {
    if (apodo.length >= 2) {
      guardar('nube:apodo', apodo);
      await nube.guardarRanking(usuario.uid, { apodo, ...datosRanking(datosDelJuego()), actualizado: Date.now() });
    } else {
      guardar('nube:apodo', '');
      await nube.quitarRanking(usuario.uid);
    }
    pintarNube();
  } catch {
    avisarNube('No se pudo guardar el apodo (¿sin conexión?).');
  }
}

// Invitado → cuenta de Google, sin perder el progreso ni el puesto en el ranking.
async function vincular() {
  try {
    const resultado = await nube.vincularGoogle();
    if (resultado === 'vinculada') {
      usuario = nube.usuarioActual();
      pintarSugerencia();
      avisarNube('✓ Cuenta de Google vinculada: tu progreso ya está a salvo.');
    }
    // 'otra': esa cuenta de Google ya existía; al entrar con ella se sincroniza (y pregunta si hace falta).
  } catch {
    avisarNube('No se pudo vincular. Inténtalo de nuevo.');
  }
}

// Menú: sugerencia de entrar con Google (sin sesión o como invitado). Al cerrarla, vuelve a los 7 días.
function pintarSugerencia() {
  const caja = $('sugerencia-cuenta');
  const toca = CONFIG && sesionLista && (!usuario || usuario.isAnonymous) && leer('ayuda:menu') && Date.now() > (Number(leer('nube:sugerencia')) || 0);
  caja.hidden = !toca;
  if (!toca) return;
  const ir = el('button', '', 'Ir a ☁️ Nube');
  ir.onclick = () => {
    pintarEstadisticas();
    mostrar('estadisticas');
    $('nube').scrollIntoView({ block: 'start' });
  };
  const cerrar = el('button', '', '✕');
  cerrar.setAttribute('aria-label', 'Cerrar la sugerencia');
  cerrar.onclick = () => {
    guardar('nube:sugerencia', Date.now() + 7 * 24 * 60 * 60 * 1000);
    caja.hidden = true;
  };
  caja.replaceChildren(el('p', '', '💡 Entra con Google para no perder tu progreso y competir en el ranking.'), ir, cerrar);
}

async function borrarNube() {
  const seguro = await preguntar({
    titulo: 'Borrar mis datos de la nube',
    texto: 'Se borrarán tu progreso guardado en la nube y tu fila del ranking. El progreso de este celular se queda.',
    boton: 'Borrar',
  });
  if (!seguro) return;
  try {
    await nube.borrarTodo(usuario.uid);
    for (const clave of ['nube:uid', 'nube:subido', 'nube:apodo', 'nube:preguntado']) guardar(clave, '');
    await nube.salir();
    avisarNube('✓ Tus datos de la nube se han borrado.');
  } catch {
    avisarNube('No se pudieron borrar (¿sin conexión?). Inténtalo de nuevo.');
  }
}

// 🏆 Ranking: "⭐ General" (total de estrellas) o el récord Normal·Normal de un juego; top 20 y tu puesto.
function abrirRanking() {
  if (!$('ranking-tipo').options.length) {
    $('ranking-tipo').append(new Option('⭐ General (estrellas)', ''), ...JUEGOS.map((j) => new Option(`${j.icono} ${j.nombre}`, j.id)));
    $('ranking-tipo').onchange = pintarRanking;
  }
  mostrar('ranking');
  pintarRanking();
}

async function pintarRanking() {
  const j = JUEGOS.find((x) => x.id === $('ranking-tipo').value);
  const campo = j ? `records.${j.id}` : 'estrellas';
  const menor = Boolean(j?.menorEsMejor);
  const valorDe = (fila) => (j ? fila.records?.[j.id] : fila.estrellas);
  const conSufijo = (v) => (j ? conUnidad(j, v) : `${v} ⭐`);
  $('ranking-lista').replaceChildren(el('li', 'sin-datos', 'Cargando…'));
  $('ranking-tu').textContent = '';
  try {
    const filas = await nube.top(campo, menor);
    $('ranking-lista').replaceChildren(
      ...(filas.length
        ? filas.map((f) => {
            const li = el('li', f.uid === usuario.uid ? 'propia' : '');
            li.append(el('span', '', f.apodo), el('span', 'valor', conSufijo(valorDe(f))));
            return li;
          })
        : [el('li', 'sin-datos', 'Aún no hay nadie aquí. ¡Sé el primero!')]),
    );
    const mio = valorDe(datosRanking(datosDelJuego()));
    if (!leer('nube:apodo')) $('ranking-tu').textContent = 'No apareces en el ranking: ponte un apodo en 📊 › ☁️ Nube.';
    else if (mio && !filas.some((f) => f.uid === usuario.uid)) {
      $('ranking-tu').textContent = `Tú: puesto ${await nube.puesto(campo, mio, menor)} (${conSufijo(mio)})`;
    }
  } catch {
    $('ranking-lista').replaceChildren(el('li', 'sin-datos', 'No se pudo cargar el ranking (¿sin conexión?).'));
  }
}

$('btn-ranking').onclick = abrirRanking;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) subir().catch(() => {});
});

if (CONFIG) {
  import('./games/nube.js')
    .then((modulo) => {
      nube = modulo;
      pintarNube();
      return modulo.iniciar(CONFIG, alCambiarUsuario);
    })
    .catch(() => {
      nube = null;
      avisarNube('No se pudo conectar con la nube (¿sin conexión?). Tu progreso sigue guardado en este celular.');
    });
}
pintarNube();

// Funcionamiento sin conexión. Solo va en localhost o HTTPS; si falla, la app sigue igual.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
