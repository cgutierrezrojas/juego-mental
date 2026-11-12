// 🙂 Tu perfil: nivel, avatar con marco y misiones (reglas puras en games/perfil.js).
import { leer, guardar } from '../games/comun.js';
import { fechaLocal } from '../games/estadisticas.js';
import { semanaDe } from '../games/liga.js';
import { nivelDe, xpDe, avanzar, MARCOS, FICHAS_NIVEL, AVATAR_INICIAL } from '../games/perfil.js';
import { leerJSON } from './datos.js';
import { sumarFichas } from './premios.js';
import { $, confeti } from './ui.js';

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
}
