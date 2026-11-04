// 🧱 Ladrillos: la paleta sigue al dedo, la pelota rompe la pared; 3 vidas; cada pared nueva es más rápida. Todo puro.
// Mundo de ANCHO×ALTO (y crece hacia abajo). `paso(e, entrada)` avanza un cuadro (1/60 s);
// entrada: { x } (el dedo: la paleta va hacia ahí) | 'izquierda' | 'derecha' | null.
// Estado: { g, paleta (x del centro), bola: { x, y, vx, vy } | null (sobre la paleta), espera, ladrillos: [{ fila, col }],
// pared, vel, vidas, puntos, fin }.
import { generador, azar } from './semilla.js';

export const ANCHO = 360;
export const ALTO = 480;
export const FILAS = 6;
export const COLS = 8;
export const LADRILLO = { w: ANCHO / COLS, h: 18, arriba: 50 };
export const PALETA = { w: 70, h: 10, y: ALTO - 30 };
export const R = 6;

export function nuevo(semilla) {
  const e = { g: generador(semilla), paleta: ANCHO / 2, bola: null, espera: 60, ladrillos: [], pared: 0, vel: 4.5, vidas: 3, puntos: 0, fin: false };
  return pared(e);
}

// Pared nueva (con algunos huecos al azar) y la pelota vuelve a la paleta, más rápida.
function pared(e) {
  e.pared++;
  e.vel = 4.5 + (e.pared - 1) * 0.6;
  e.ladrillos = [];
  for (let fila = 0; fila < FILAS; fila++) for (let col = 0; col < COLS; col++) if (e.pared === 1 || azar(e.g) > 0.15) e.ladrillos.push({ fila, col });
  if (!e.ladrillos.length) e.ladrillos.push({ fila: FILAS - 1, col: 0 });
  e.bola = null;
  e.espera = 60;
  return e;
}
export const valor = (fila) => FILAS - fila; // los de arriba valen más

const caja = (l) => ({ x: l.col * LADRILLO.w, y: LADRILLO.arriba + l.fila * LADRILLO.h, w: LADRILLO.w, h: LADRILLO.h });

export function paso(e, entrada) {
  if (e.fin) return e;
  const meta = typeof entrada?.x === 'number' ? entrada.x : e.paleta + (entrada === 'izquierda' ? -40 : entrada === 'derecha' ? 40 : 0);
  e.paleta += Math.sign(meta - e.paleta) * Math.min(9, Math.abs(meta - e.paleta));
  e.paleta = Math.max(PALETA.w / 2, Math.min(ANCHO - PALETA.w / 2, e.paleta));
  if (!e.bola) {
    if (--e.espera > 0) return e;
    const angulo = (azar(e.g) - 0.5) * (Math.PI / 2); // hacia arriba, hasta 45° a cada lado
    e.bola = { x: e.paleta, y: PALETA.y - R, vx: e.vel * Math.sin(angulo), vy: -e.vel * Math.cos(angulo) };
  }
  // Dos medios pasos para que la pelota rápida no atraviese ladrillos.
  for (let k = 0; k < 2 && e.bola; k++) mover(e);
  return e;
}

function mover(e) {
  const b = e.bola;
  b.x += b.vx / 2;
  b.y += b.vy / 2;
  if (b.x < R || b.x > ANCHO - R) {
    b.vx = -b.vx;
    b.x = Math.max(R, Math.min(ANCHO - R, b.x));
  }
  if (b.y < R) {
    b.vy = Math.abs(b.vy);
    b.y = R;
  }
  // Paleta: el ángulo depende de dónde pega (en la punta sale más inclinada).
  if (b.vy > 0 && b.y + R >= PALETA.y && b.y + R <= PALETA.y + PALETA.h + 6 && Math.abs(b.x - e.paleta) <= PALETA.w / 2 + R) {
    let angulo = ((b.x - e.paleta) / (PALETA.w / 2)) * (Math.PI / 3);
    if (Math.abs(angulo) < 0.2) angulo = b.x >= e.paleta ? 0.2 : -0.2; // nunca recta: se quedaría rebotando en el mismo lugar
    b.vx = e.vel * Math.sin(angulo);
    b.vy = -e.vel * Math.cos(angulo);
    b.y = PALETA.y - R;
  }
  const k = e.ladrillos.findIndex((l) => {
    const c = caja(l);
    return b.x + R > c.x && b.x - R < c.x + c.w && b.y + R > c.y && b.y - R < c.y + c.h;
  });
  if (k >= 0) {
    const c = caja(e.ladrillos[k]);
    // Rebota en el eje donde se metió menos.
    const dx = Math.min(b.x + R - c.x, c.x + c.w - (b.x - R));
    const dy = Math.min(b.y + R - c.y, c.y + c.h - (b.y - R));
    if (dx < dy) b.vx = -b.vx;
    else b.vy = -b.vy;
    e.puntos += valor(e.ladrillos[k].fila);
    e.ladrillos.splice(k, 1);
    if (!e.ladrillos.length) pared(e);
    return;
  }
  if (b.y - R > ALTO) {
    e.vidas--;
    e.bola = null;
    e.espera = 60;
    if (!e.vidas) e.fin = true;
  }
}
