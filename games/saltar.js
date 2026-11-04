// 🦘 Saltar: corre solo; tocar salta (y en el aire, doble salto). Obstáculos en el suelo y pájaros en el aire. Todo puro.
// Mundo de ANCHO×ALTO con el suelo en y = 0 (hacia arriba es positivo). `paso(e, salta)` avanza un cuadro (1/60 s).
// Estado: { g, y, vy, saltos, obstaculos: [{ x, y, w, h, tipo: 'cactus' | 'pajaro' }], hasta (distancia al próximo), dist, vel, puntos, fin }.
import { generador, azar } from './semilla.js';

export const ANCHO = 400;
export const ALTO = 200;
export const JUGADOR = { x: 50, w: 28, h: 36 };
const GRAVEDAD = 0.6;
const SALTO = 10.5;
const DOBLE = 9;

export function nuevo(semilla) {
  return { g: generador(semilla), y: 0, vy: 0, saltos: 0, obstaculos: [], hasta: 300, dist: 0, vel: 4, puntos: 0, fin: false };
}

// El próximo obstáculo: cactus de 1 o 2, o un pájaro bajo (hay que saltarlo) o alto (no hay que saltar).
function obstaculo(e) {
  const r = azar(e.g);
  if (r < 0.45) return { x: ANCHO, y: 0, w: 18, h: 30 + Math.floor(azar(e.g) * 16), tipo: 'cactus' };
  if (r < 0.75) return { x: ANCHO, y: 0, w: 40, h: 34, tipo: 'cactus' };
  return { x: ANCHO, y: azar(e.g) < 0.5 ? 20 : 48, w: 30, h: 20, tipo: 'pajaro' };
}

const choca = (e, o) => JUGADOR.x + 4 < o.x + o.w && JUGADOR.x + JUGADOR.w - 4 > o.x && e.y + 4 < o.y + o.h && e.y + JUGADOR.h > o.y + 4;

export function paso(e, salta) {
  if (e.fin) return e;
  if (salta && e.saltos < 2) {
    e.vy = e.saltos ? DOBLE : SALTO;
    e.saltos++;
  }
  e.vy -= GRAVEDAD;
  e.y += e.vy;
  if (e.y <= 0) {
    e.y = 0;
    e.vy = 0;
    e.saltos = 0;
  }
  e.dist += e.vel;
  e.vel = Math.min(11, 4 + e.dist / 2500);
  e.puntos = Math.floor(e.dist / 10);
  for (const o of e.obstaculos) o.x -= e.vel;
  e.obstaculos = e.obstaculos.filter((o) => o.x + o.w > 0);
  e.hasta -= e.vel;
  if (e.hasta <= 0) {
    e.obstaculos.push(obstaculo(e));
    e.hasta = e.vel * (45 + azar(e.g) * 45); // separación: 0,75 a 1,5 s, siempre saltable
  }
  if (e.obstaculos.some((o) => choca(e, o))) e.fin = true;
  return e;
}
