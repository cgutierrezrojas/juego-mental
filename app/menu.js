// Menú: Tu día, retos pendientes, progreso de cada tarjeta y sugerencia de cuenta.
import { el, leer, guardar } from '../games/comun.js';
import { siguienteNivel } from '../games/niveles.js';
import { claveRecord } from '../games/modos.js';
import { fechaLocal, jugadosEn, entrenoDelDia, racha } from '../games/estadisticas.js';
import { CONFIG } from '../firebase-config.js';
import { abrirPrevia, elegir } from './previa.js';
import { E } from './estado.js';
import { JUEGOS, idsPorCategoria } from './juegos.js';
import { retosPendientes, estrellasDelJuego, leerEstrellas, leerRecord, historiales } from './datos.js';
import { $, mostrar } from './ui.js';
import { pintarEstadisticas } from './estadisticas.js';

// Abre un juego directamente en modo Niveles, con el camino colocado en tu nivel.
export function abrirEnNiveles(j) {
  abrirPrevia(j);
  if (E.eleccion.modo !== 'niveles') elegir(j, { ...E.eleccion, modo: 'niveles' });
  document.querySelector('.camino .actual')?.scrollIntoView({ block: 'center' });
}

// Menú: fila de retos de hoy pendientes y, en cada tarjeta, tu nivel 🪜, tu récord 🏆 y el aviso 📅.
export function pintarProgreso() {
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

// Tarjeta "☀️ Tu día": los 3 juegos del entrenamiento (✓ hechos, ▶ el siguiente), barra de avance y racha.
export function pintarEntreno() {
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

// Menú: sugerencia de entrar con Google (sin sesión o como invitado). Al cerrarla, vuelve a los 7 días.
export function pintarSugerencia() {
  const caja = $('sugerencia-cuenta');
  const toca = CONFIG && E.sesionLista && (!E.usuario || E.usuario.isAnonymous) && leer('ayuda:inicio') && Date.now() > (Number(leer('nube:sugerencia')) || 0);
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
