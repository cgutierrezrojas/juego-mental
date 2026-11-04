// 📅 Palabra del día: 5 letras, 6 intentos, la misma para todos cada día (sale de la fecha local). Todo puro.
import { barajar } from './comun.js';
import { generador, azar } from './semilla.js';
import { SOLUCIONES } from './diccionario.js';

export const LARGO = 5;
export const INTENTOS = 6;
const PRIMER_DIA = Date.UTC(2026, 10, 4); // el #1

// Número del día (1 el 2026-11-04), con la fecha local.
export const numeroDia = (fecha = new Date()) => Math.round((Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) - PRIMER_DIA) / 86400000) + 1;

// Las soluciones barajadas siempre igual (semilla fija): el día n es la posición n − 1 (y vuelve a empezar).
const g = generador(20261105);
const ORDEN = barajar(SOLUCIONES, () => azar(g));
export const palabraDelDia = (n) => ORDEN[(((n - 1) % ORDEN.length) + ORDEN.length) % ORDEN.length];

// Colores de un intento: 'v' (en su lugar), 'a' (está en otra posición) o 'g' (no está).
// Con letras repetidas, cada 'a' solo cuenta las que quedan sin marcar en la solución.
export function pista(intento, solucion) {
  const r = Array(LARGO).fill('g');
  const quedan = {};
  for (let i = 0; i < LARGO; i++) {
    if (intento[i] === solucion[i]) r[i] = 'v';
    else quedan[solucion[i]] = (quedan[solucion[i]] ?? 0) + 1;
  }
  for (let i = 0; i < LARGO; i++) {
    if (r[i] !== 'v' && quedan[intento[i]]) {
      r[i] = 'a';
      quedan[intento[i]]--;
    }
  }
  return r;
}

// El mejor color que ya tuvo cada letra (para el teclado): { letra: 'v' | 'a' | 'g' }.
export function colorTeclas(intentos, solucion) {
  const orden = { g: 0, a: 1, v: 2 };
  const t = {};
  for (const intento of intentos) {
    pista(intento, solucion).forEach((c, i) => {
      if (!(intento[i] in t) || orden[c] > orden[t[intento[i]]]) t[intento[i]] = c;
    });
  }
  return t;
}

// Estadísticas al terminar el día n: { racha, mejor, ultimo (último día acertado), jugadas, dist: aciertos en 1…6 }.
export function anotar(stats, n, acerto, intentos) {
  const s = { racha: 0, mejor: 0, ultimo: 0, jugadas: 0, dist: Array(INTENTOS).fill(0), ...stats };
  s.dist = [...s.dist];
  s.jugadas++;
  if (acerto) {
    s.racha = s.ultimo === n - 1 ? s.racha + 1 : 1;
    s.ultimo = n;
    s.mejor = Math.max(s.mejor, s.racha);
    s.dist[intentos - 1]++;
  } else s.racha = 0;
  return s;
}

// La racha que sigue viva el día n (se corta si te saltaste un día).
export const rachaActual = (stats, n) => (stats?.ultimo >= n - 1 ? stats.racha : 0);

// Para compartir: el número, cuántos intentos y los cuadritos (sin la palabra).
export function textoCompartir(n, intentos, solucion) {
  const acerto = intentos.at(-1) === solucion;
  const cuadros = intentos.map((x) => pista(x, solucion).map((c) => ({ v: '🟩', a: '🟨', g: '⬛' })[c]).join(''));
  return [`Pa'l Rato 🔤 #${n} ${acerto ? intentos.length : 'X'}/${INTENTOS}`, ...cuadros].join('\n');
}
