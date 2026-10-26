// Pantalla 📊: resumen, logros, perfil, récords y gráfica de la previa.
import { esDe, filtrar, claveRecord } from '../games/modos.js';
import { el, leer } from '../games/comun.js';
import { puntosGrafica, fechaLocal, racha, mejorRacha, entrenosCompletados, perfil } from '../games/estadisticas.js';
import { LOGROS, progreso } from '../games/logros.js';
import { $ } from './ui.js';
import { leerHistorial, conUnidad, historiales, leerRecord, leerLogros, resumenLogros } from './datos.js';
import { E } from './estado.js';
import { idsPorCategoria, JUEGOS, HABILIDADES } from './juegos.js';

// Gráfica de las últimas 20 partidas (la línea sube al mejorar) y media de las últimas 10.
export function pintarHistorial(j) {
  const caja = $('previa-historial');
  const ultimas = leerHistorial(j.id).filter((p) => esDe(p, E.eleccion.modo, E.eleccion.dificultad)).slice(-20).map((p) => p.puntos);
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

// Pantalla 📊: resumen, perfil por habilidad (barras 0–100) y récords de todos los juegos.
export function pintarEstadisticas() {
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

  const conseguidos = leerLogros();
  const datos = resumenLogros();
  const medallas = el('div', 'logros');
  let cuantos = 0;
  for (const l of LOGROS) {
    const { valor, conseguido } = progreso(l, datos);
    if (conseguido) cuantos++;
    const medalla = el('div', conseguido ? 'logro conseguido' : 'logro');
    medalla.setAttribute('role', 'img');
    medalla.setAttribute('aria-label', `${l.nombre}: ${l.texto}. ${conseguido ? 'Conseguido' : `${valor} de ${l.meta}`}`);
    const [a, m, d] = (conseguidos[l.id] ?? '').split('-');
    medalla.append(
      el('span', 'icono-logro', l.icono),
      el('strong', '', l.nombre),
      el('small', '', l.texto),
      el('small', 'progreso-logro', conseguido ? (d ? `✓ ${d}/${m}/${a}` : '✓') : `${valor}/${l.meta}`),
    );
    medallas.append(medalla);
  }

  $('estadisticas-contenido').replaceChildren(
    resumen,
    el('h3', 'categoria', `🏅 Logros ${cuantos}/${LOGROS.length}`),
    medallas,
    el('h3', 'categoria', 'Perfil por habilidad'),
    barras,
    el('h3', 'categoria', 'Récords'),
    records,
  );
}
