// 🙂 Tu perfil: nivel, avatar con marco y misiones (reglas puras en games/perfil.js).
import { leer, guardar, el } from '../games/comun.js';
import { fechaLocal } from '../games/estadisticas.js';
import { semanaDe } from '../games/liga.js';
import { cobrarCalendario, diaDeHoy, nivelDe, xpDe, avanzar, MARCOS, FICHAS_NIVEL, AVATAR_INICIAL, marcosDisponibles, AVATARES, CALENDARIO, misionesDe, avanceDe } from '../games/perfil.js';
import { leerJSON } from './datos.js';
import { sumarFichas } from './premios.js';
import { $, confeti, mostrar } from './ui.js';

const miXP = () => Number(leer('perfil:xp')) || 0;
export const miNivel = () => nivelDe(miXP());
export const miAvatar = () => ({ a: AVATAR_INICIAL, m: 'ninguno', ...leerJSON('perfil:avatar') });
// Lo que ven los demás junto al apodo (ranking, liga y perfil público).
export function filaPublica() {
  const { a, m } = miAvatar();
  return { avatar: a, marco: m, nivel: Math.min(1000, miNivel().nivel) };
}

let ocultar;
export function avisarPerfil(textos) {
  if (!textos.length) return;
  const aviso = $('aviso-perfil');
  aviso.textContent = textos.join(' · ');
  aviso.hidden = false;
  clearTimeout(ocultar);
  ocultar = setTimeout(() => (aviso.hidden = true), 4000);
}

// Suma XP; al subir de nivel da fichas, avisa y celebra (y anuncia los marcos nuevos).
export function sumarXP(xp, avisos) {
  if (!xp) return;
  const antes = miNivel().nivel;
  guardar('perfil:xp', String(miXP() + xp));
  const ahora = miNivel().nivel;
  if (ahora === antes) return;
  sumarFichas(FICHAS_NIVEL * (ahora - antes));
  avisos.push(`⬆️ ¡Nivel ${ahora}! +${FICHAS_NIVEL * (ahora - antes)} fichas`);
  for (const m of MARCOS) if (m.nivel > antes && m.nivel <= ahora) avisos.push(`🖼️ Nuevo marco: ${m.nombre}`);
  confeti();
}

// Un evento del juego ('partida', 'victoria', 'empate', 'estrellas', 'entreno'): XP y misiones (que se cobran solas).
export function anotarPerfil(tipo, n = 1, seccion = null) {
  if (n <= 0) return;
  const { registro, cumplidas } = avanzar(leerJSON('perfil:misiones'), tipo, n, seccion, semanaDe(fechaLocal()));
  guardar('perfil:misiones', JSON.stringify(registro));
  const avisos = [];
  let xp = xpDe(tipo, n);
  for (const m of cumplidas) {
    sumarFichas(m.fichas);
    xp += m.xp;
    avisos.push(`🎯 Misión cumplida: ${m.texto} +${m.fichas} fichas`);
  }
  sumarXP(xp, avisos);
  avisarPerfil(avisos);
  if (!$('inicio').hidden) pintarCabeceraPerfil();
}

export const calendarioHoy = () => diaDeHoy(leerJSON('perfil:calendario'), fechaLocal());

// Cobra el día del calendario (si no se cobró hoy). Devuelve las fichas.
export function cobrarDia() {
  const { registro, fichas, xp, dia } = cobrarCalendario(leerJSON('perfil:calendario'), fechaLocal());
  if (!fichas) return 0;
  guardar('perfil:calendario', JSON.stringify(registro));
  sumarFichas(fichas);
  const avisos = [`🎁 Día ${dia}/7: +${fichas} fichas`];
  sumarXP(xp, avisos);
  avisarPerfil(avisos);
  if (!$('inicio').hidden) pintarCabeceraPerfil();
  return fichas;
}

// Avatar con el anillo de su marco (clase `marco-<id>`).
export function dibujoAvatar(avatar, marco, grande = false) {
  const a = el('span', `avatar marco-${MARCOS.some((m) => m.id === marco) ? marco : 'ninguno'}${grande ? ' grande' : ''}`, avatar || AVATAR_INICIAL);
  a.setAttribute('aria-hidden', 'true');
  return a;
}

export function misMisiones() {
  const semana = semanaDe(fechaLocal());
  const r = avanceDe(leerJSON('perfil:misiones'), semana);
  return misionesDe(semana).map((m) => ({ ...m, hecha: r.cobradas.includes(m.id), avance: Math.min(m.meta, m.distintas ? r.secciones.length : r.avance[m.id] ?? 0) }));
}

const barra = (valor, total) => {
  const b = el('progress', 'barra-perfil');
  b.max = total;
  b.value = valor;
  return b;
};

// Inicio: avatar, nivel y barra de XP; tarjetas del calendario y de las misiones.
export function pintarCabeceraPerfil() {
  const n = miNivel();
  const { a, m } = miAvatar();
  const texto = el('span', 'texto-perfil');
  texto.append(el('strong', '', `Nivel ${n.nivel} · ${n.titulo}`), barra(n.enNivel, n.paraSubir), el('small', '', `${n.enNivel}/${n.paraSubir} XP`));
  $('cabecera-perfil').replaceChildren(dibujoAvatar(a, m), texto);
  $('cabecera-perfil').setAttribute('aria-label', `Tu perfil: nivel ${n.nivel}, ${n.titulo}, ${n.enNivel} de ${n.paraSubir} XP`);
  $('cabecera-perfil').onclick = abrirPerfil;
  const cal = calendarioHoy();
  const hechas = misMisiones().filter((x) => x.hecha).length;
  const tarjeta = (titulo, detalle, alPulsar, destacada) => {
    const b = el('button', `tarjeta-perfil${destacada ? ' color' : ''}`);
    b.append(el('strong', '', titulo), el('small', '', detalle));
    b.onclick = alPulsar;
    return b;
  };
  $('tarjetas-perfil').replaceChildren(
    tarjeta(`🎁 Día ${cal.dia}/7`, cal.cobrado ? 'Vuelve mañana' : `¡Cobrar ${CALENDARIO[cal.dia - 1]}!`, () => {
      if (!cal.cobrado) cobrarDia();
      pintarCabeceraPerfil();
      if (cal.cobrado) abrirPerfil();
    }, !cal.cobrado),
    tarjeta(`🎯 Misiones ${hechas}/3`, 'de esta semana', abrirPerfil, false),
  );
}

export function abrirPerfil() {
  mostrar('perfil');
  pintarPerfil();
}

function pintarPerfil() {
  const n = miNivel();
  const { a, m } = miAvatar();
  const elegir = (cambio) => {
    guardar('perfil:avatar', JSON.stringify({ ...miAvatar(), ...cambio }));
    pintarPerfil();
  };
  const cabeza = el('div', 'perfil-cabeza');
  cabeza.append(dibujoAvatar(a, m, true), el('strong', '', `Nivel ${n.nivel} · ${n.titulo}`), barra(n.enNivel, n.paraSubir), el('small', '', `${n.enNivel}/${n.paraSubir} XP · +50 fichas por nivel`));

  const avatares = el('div', 'rejilla-avatares');
  avatares.append(...AVATARES.map((x) => {
    const b = el('button', x === a ? 'elegido' : '', x);
    b.setAttribute('aria-label', `Avatar ${x}`);
    b.setAttribute('aria-pressed', String(x === a));
    b.onclick = () => elegir({ a: x });
    return b;
  }));

  const disponibles = marcosDisponibles(n.nivel).map((x) => x.id);
  const marcos = el('div', 'fila-marcos');
  marcos.append(...MARCOS.map((x) => {
    const libre = disponibles.includes(x.id);
    const b = el('button', x.id === m ? 'elegido' : '');
    b.append(dibujoAvatar(a, x.id), el('small', '', libre ? x.nombre : `Nv ${x.nivel}`));
    b.disabled = !libre;
    b.setAttribute('aria-label', libre ? `Marco ${x.nombre}` : `Marco ${x.nombre}: se gana en el nivel ${x.nivel}`);
    b.setAttribute('aria-pressed', String(x.id === m));
    b.onclick = () => elegir({ m: x.id });
    return b;
  }));

  const cal = calendarioHoy();
  const dias = el('div', 'calendario');
  dias.append(...CALENDARIO.map((f, i) => {
    const d = i + 1;
    const hecho = d < cal.dia || (d === cal.dia && cal.cobrado);
    const casilla = el('div', `dia${d === cal.dia ? ' hoy' : ''}${hecho ? ' hecho' : ''}`);
    casilla.append(el('small', '', `Día ${d}`), el('strong', '', hecho ? '✓' : `${f}`));
    return casilla;
  }));
  const cobrar = el('button', 'color', cal.cobrado ? '🎁 Vuelve mañana' : `🎁 Cobrar ${CALENDARIO[cal.dia - 1]} fichas`);
  cobrar.disabled = cal.cobrado;
  cobrar.onclick = () => {
    cobrarDia();
    pintarPerfil();
  };

  const misiones = el('div', 'misiones');
  misiones.append(...misMisiones().map((x) => {
    const fila = el('div', `mision${x.hecha ? ' hecha' : ''}`);
    fila.append(el('span', '', `${x.hecha ? '✓' : '🎯'} ${x.texto}`), barra(x.avance, x.meta), el('small', '', `${x.avance}/${x.meta} · +${x.fichas} fichas y ${x.xp} XP`));
    return fila;
  }));

  $('perfil-contenido').replaceChildren(
    cabeza,
    el('h3', 'categoria', '🎁 Calendario'), dias, cobrar,
    el('h3', 'categoria', '🎯 Misiones de la semana'), misiones, el('p', 'sin-datos', 'Se cobran solas al cumplirlas. Cambian cada lunes.'),
    el('h3', 'categoria', '🙂 Avatar'), avatares,
    el('h3', 'categoria', '🖼️ Marco'), marcos,
  );
}
