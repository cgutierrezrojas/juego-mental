// Tu perfil: experiencia y nivel, marcos, avatares, calendario de 7 días y misiones semanales. Todo puro.
// Registros: `perfil:calendario` = { dia, fecha }; `perfil:misiones` = { semana, avance: { id: n }, secciones: [ids jugadas], cobradas: [ids] }.
import { generador, entero } from './semilla.js';

export const XP = { partida: 10, victoria: 20, empate: 10, estrellas: 5, entreno: 30 };
export const FICHAS_NIVEL = 50;
export const xpDe = (tipo, n = 1) => (XP[tipo] ?? 0) * n;

const paraSubirDe = (n) => 100 + 20 * (n - 1);
const TITULOS = ['Novato', 'Aprendiz', 'Hábil', 'Experto', 'Maestro', 'Leyenda'];

// Nivel con `xp` acumulada; `enNivel`: la XP dentro del nivel actual.
export function nivelDe(xp) {
  let nivel = 1;
  let resto = Math.max(0, Math.floor(Number(xp) || 0));
  while (resto >= paraSubirDe(nivel)) resto -= paraSubirDe(nivel++);
  return { nivel, titulo: TITULOS[Math.min(5, Math.floor(nivel / 10))], enNivel: resto, paraSubir: paraSubirDe(nivel) };
}

export const MARCOS = [
  { id: 'ninguno', nombre: 'Sin marco', nivel: 1 }, { id: 'bronce', nombre: 'Bronce', nivel: 5 }, { id: 'plata', nombre: 'Plata', nivel: 10 },
  { id: 'oro', nombre: 'Oro', nivel: 15 }, { id: 'esmeralda', nombre: 'Esmeralda', nivel: 20 }, { id: 'rubi', nombre: 'Rubí', nivel: 25 },
  { id: 'diamante', nombre: 'Diamante', nivel: 30 }, { id: 'fuego', nombre: 'Fuego', nivel: 40 }, { id: 'arcoiris', nombre: 'Arcoíris', nivel: 50 },
];
export const marcosDisponibles = (nivel) => MARCOS.filter((m) => m.nivel <= nivel);

export const AVATAR_INICIAL = '🙂';
export const AVATARES = ['🙂', '😎', '🤓', '🥳', '😺', '🐶', '🦊', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐧', '🦉', '🐙', '🦄', '🐲', '🐢', '🐬',
  '🦖', '🐝', '🦋', '🌵', '🌻', '🍀', '🍕', '🍩', '🍉', '⚽', '🏀', '🎸', '🎮', '🎲', '🚀', '🛸', '👑', '💎', '🔥', '⭐'];

// --- Calendario de 7 días ---
export const CALENDARIO = [50, 75, 100, 125, 150, 200, 400];
export const XP_DIA7 = 100;
const ayerDe = (fecha) => {
  const f = new Date(fecha + 'T00:00:00Z');
  f.setUTCDate(f.getUTCDate() - 1);
  return f.toISOString().slice(0, 10);
};

// Qué día toca cobrar `hoy` (o cuál se cobró ya): si ayer se cobró sigue, si no vuelve al 1; tras el 7, el 1.
export function diaDeHoy(registro, hoy) {
  if (registro?.fecha === hoy) return { dia: registro.dia, cobrado: true };
  return { dia: registro?.fecha === ayerDe(hoy) ? (registro.dia % 7) + 1 : 1, cobrado: false };
}

export function cobrarCalendario(registro, hoy) {
  const { dia, cobrado } = diaDeHoy(registro, hoy);
  if (cobrado) return { registro, fichas: 0, xp: 0, dia };
  return { registro: { dia, fecha: hoy }, fichas: CALENDARIO[dia - 1], xp: dia === 7 ? XP_DIA7 : 0, dia };
}

// --- Misiones semanales ---
export const SECCIONES_MISION = ['mentales', 'mesa', 'trivia', 'cartas', 'arcade', 'palabras'];
const NOMBRE_SECCION = { mentales: 'Mentales', mesa: 'Mesa', trivia: 'Trivia', cartas: 'Cartas', arcade: 'Arcade', palabras: 'Palabras' };
// `conSeccion`: la sección se elige cada semana; `distintas`: cuenta secciones distintas jugadas.
const MISIONES = {
  facil: [
    { id: 'partidas5', texto: 'Juega 5 partidas', evento: 'partida', meta: 5 },
    { id: 'seccion3', texto: 'Juega 3 partidas de {seccion}', evento: 'partida', meta: 3, conSeccion: true },
    { id: 'estrellas3', texto: 'Consigue 3 estrellas en Niveles', evento: 'estrellas', meta: 3 },
  ],
  media: [
    { id: 'seccion10', texto: 'Juega 10 partidas de {seccion}', evento: 'partida', meta: 10, conSeccion: true },
    { id: 'gana3', texto: 'Gana 3 veces', evento: 'victoria', meta: 3 },
    { id: 'tudia3', texto: 'Completa Tu día 3 días', evento: 'entreno', meta: 3 },
    { id: 'secciones4', texto: 'Juega en 4 secciones distintas', evento: 'partida', meta: 4, distintas: true },
  ],
  dificil: [
    { id: 'partidas30', texto: 'Juega 30 partidas', evento: 'partida', meta: 30 },
    { id: 'gana8', texto: 'Gana 8 veces', evento: 'victoria', meta: 8 },
    { id: 'estrellas15', texto: 'Consigue 15 estrellas en Niveles', evento: 'estrellas', meta: 15 },
    { id: 'tudia6', texto: 'Completa Tu día 6 días', evento: 'entreno', meta: 6 },
  ],
};
const PREMIO = { facil: { fichas: 100, xp: 50 }, media: { fichas: 200, xp: 100 }, dificil: { fichas: 300, xp: 150 } };

const semillaDe = (texto) => {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h;
};

// Las 3 misiones de la semana ('2026-W46'): una de cada dificultad, iguales para todos; las secciones no se repiten.
export function misionesDe(semana) {
  const g = generador(semillaDe(semana));
  const libres = [...SECCIONES_MISION];
  return Object.keys(MISIONES).map((dificultad) => {
    const lista = MISIONES[dificultad];
    const { conSeccion, ...m } = lista[entero(g, lista.length)];
    const seccion = conSeccion ? libres.splice(entero(g, libres.length), 1)[0] : null;
    return { ...m, texto: seccion ? m.texto.replace('{seccion}', NOMBRE_SECCION[seccion]) : m.texto, dificultad, seccion, ...PREMIO[dificultad] };
  });
}

// El registro de `semana` (si es de otra, uno vacío).
export const avanceDe = (registro, semana) => (registro?.semana === semana ? registro : { semana, avance: {}, secciones: [], cobradas: [] });

// Suma un evento ('partida', 'victoria', 'estrellas'…) a las misiones que coinciden. `cumplidas`: las que se acaban de completar.
export function avanzar(registro, evento, n, seccion, semana) {
  const r0 = avanceDe(registro, semana);
  const r = { semana, avance: { ...r0.avance }, secciones: [...r0.secciones], cobradas: [...r0.cobradas] };
  if (evento === 'partida' && SECCIONES_MISION.includes(seccion) && !r.secciones.includes(seccion)) r.secciones.push(seccion);
  const cumplidas = [];
  for (const m of misionesDe(semana)) {
    if (r.cobradas.includes(m.id)) continue;
    if (m.distintas) r.avance[m.id] = r.secciones.length;
    else if (m.evento === evento && (!m.seccion || m.seccion === seccion)) r.avance[m.id] = (r.avance[m.id] ?? 0) + n;
    if ((r.avance[m.id] ?? 0) >= m.meta) {
      r.cobradas.push(m.id);
      cumplidas.push(m);
    }
  }
  return { registro: r, cumplidas };
}
