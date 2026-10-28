// 🏠 Inicio de Pa'l Rato: lo de hoy (Tu día, liga, retos) y una baldosa grande por sección.
import { el } from '../games/comun.js';
import { fechaLocal, jugadosEn, entrenoDelDia } from '../games/estadisticas.js';
import { CONFIG } from '../firebase-config.js';
import { SECCIONES, JUEGOS, idsPorCategoria } from './juegos.js';
import { historiales, retosPendientes } from './datos.js';
import { misPuntosLiga } from './liga.js';
import { $, mostrar } from './ui.js';

// Abre Mentales (la página con los juegos de ahora) y, si se pide, la lleva hasta una parte.
function abrirMentales(selector) {
  mostrar('menu');
  if (selector) document.querySelector(selector)?.scrollIntoView({ block: 'start' });
}

// Cada sección abre su página; de momento solo hay juegos en Mentales (las demás llegan en S2–S6).
const ABRIR = { mentales: () => abrirMentales() };

export function pintarInicio() {
  const hoy = fechaLocal();
  const hechos = jugadosEn(hoy, historiales());
  const cuantos = entrenoDelDia(hoy, idsPorCategoria).filter((id) => hechos.has(id)).length;
  const retos = JUEGOS.reduce((suma, j) => suma + retosPendientes(j), 0);
  const chip = (texto, etiqueta, alPulsar) => {
    const b = el('button', 'chip-hoy', texto);
    b.setAttribute('aria-label', etiqueta);
    b.onclick = alPulsar;
    return b;
  };
  const fila = [chip(`☀️ Tu día ${cuantos}/3`, `Tu día: ${cuantos} de 3 hechos`, () => abrirMentales('#entreno'))];
  if (CONFIG) fila.push(chip(`🏅 ${misPuntosLiga()} pts`, `Liga semanal: ${misPuntosLiga()} puntos`, () => $('btn-liga').click()));
  if (retos) fila.push(chip(`📅 ${retos} reto${retos > 1 ? 's' : ''}`, `${retos} retos de hoy pendientes`, () => abrirMentales('#retos-pendientes')));
  $('hoy').replaceChildren(...fila);

  $('aviso-inicio').textContent = '';
  $('secciones').replaceChildren(...SECCIONES.map((s) => {
    const n = JUEGOS.filter((j) => j.seccion === s.id).length;
    const b = el('button', n ? 'seccion color' : 'seccion color pronto');
    b.style.setProperty('--c', `var(--${s.color})`);
    b.append(el('span', 'icono-seccion', s.icono), el('strong', '', s.nombre), el('small', '', n ? `${n} juego${n > 1 ? 's' : ''}` : 'Próximamente'));
    b.setAttribute('aria-label', n ? `${s.nombre}: ${s.descripcion}. ${n} juegos` : `${s.nombre}: próximamente`);
    b.onclick = () => (n && ABRIR[s.id] ? ABRIR[s.id]() : ($('aviso-inicio').textContent = `${s.icono} ${s.nombre} llegará pronto. ¡Estamos en ello!`));
    return b;
  }));
}
