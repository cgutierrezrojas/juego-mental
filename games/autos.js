// 🏎️ Autos: carretera de 3 pistas vista desde arriba; se cambia de pista para esquivar el tráfico y juntar monedas. Todo puro.
// Mundo de ANCHO×ALTO (y crece hacia abajo). `paso(e, entrada)` avanza un cuadro (1/60 s); entrada: 'izquierda' | 'derecha' | null.
// Estado: { g, carril, x (para animar el cambio), cosas: [{ carril, y, tipo: 'auto' | 'moneda', color }], hasta, dist, vel, monedas, puntos, fin }.
import { generador, azar, entero } from './semilla.js';

export const ANCHO = 300;
export const ALTO = 450;
export const PISTA = ANCHO / 3;
export const AUTO = { w: 54, h: 84 };
export const Y_JUGADOR = ALTO - AUTO.h - 20;
export const centro = (carril) => PISTA * carril + PISTA / 2;

export function nuevo(semilla) {
  return { g: generador(semilla), carril: 1, x: centro(1), cosas: [], hasta: 120, dist: 0, vel: 5, monedas: 0, puntos: 0, fin: false };
}

// Una fila de tráfico: 1 o 2 autos (nunca las 3 pistas tapadas) y a veces una moneda en una pista libre.
function fila(e) {
  const tapadas = new Set([entero(e.g, 3)]);
  if (azar(e.g) < 0.35) tapadas.add(entero(e.g, 3));
  for (const c of tapadas) e.cosas.push({ carril: c, y: -AUTO.h, tipo: 'auto', color: entero(e.g, 4) });
  const libres = [0, 1, 2].filter((c) => !tapadas.has(c));
  if (azar(e.g) < 0.5) e.cosas.push({ carril: libres[entero(e.g, libres.length)], y: -AUTO.h / 2 - 15, tipo: 'moneda' });
}

export function paso(e, entrada) {
  if (e.fin) return e;
  if (entrada === 'izquierda') e.carril = Math.max(0, e.carril - 1);
  if (entrada === 'derecha') e.carril = Math.min(2, e.carril + 1);
  const meta = centro(e.carril);
  e.x += Math.sign(meta - e.x) * Math.min(12, Math.abs(meta - e.x));
  e.dist += e.vel;
  e.vel = Math.min(14, 5 + e.dist / 3000);
  for (const c of e.cosas) c.y += e.vel;
  e.cosas = e.cosas.filter((c) => c.y < ALTO);
  e.hasta -= e.vel;
  if (e.hasta <= 0) {
    fila(e);
    e.hasta = AUTO.h * 2 + azar(e.g) * AUTO.h * 2; // espacio para cambiar de pista entre filas
  }
  // Choques: el auto en su posición actual (mientras cambia de pista también puede chocar).
  for (const c of e.cosas) {
    const cerca = Math.abs(centro(c.carril) - e.x) < AUTO.w - 8;
    if (c.tipo === 'auto' && cerca && c.y + AUTO.h - 8 > Y_JUGADOR && c.y + 8 < Y_JUGADOR + AUTO.h) e.fin = true;
    if (c.tipo === 'moneda' && !c.tomada && cerca && c.y + 30 > Y_JUGADOR && c.y < Y_JUGADOR + AUTO.h) {
      c.tomada = true;
      e.monedas++;
    }
  }
  e.cosas = e.cosas.filter((c) => !c.tomada);
  e.puntos = Math.floor(e.dist / 50) + e.monedas * 10;
  return e;
}
