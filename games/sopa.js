// 🔍 Sopa de letras: 8 palabras de un tema escondidas en la cuadrícula; 3 minutos. Todo puro.
// Estado: { n, tema, filas: [string], palabras: [{ palabra, x, y, dx, dy, hallada }], puntos, fin }.
import { generador, azar, entero } from './semilla.js';
import { barajar } from './comun.js';
import { TEMAS } from './diccionario.js';
import { LETRAS } from './ahorcado.js';

export const CUANTAS = 8;
export const SEGUNDOS = 180;
const RECTAS = [[1, 0], [0, 1]];
const DIAGONALES = [[1, 1], [1, -1]];
const REVES = [[-1, 0], [0, -1], [-1, -1], [-1, 1]];
// `max`: la palabra más larga (en la de 8×8, hasta 6 letras para que quepan las 8).
export const NIVELES_SOPA = {
  facil: { n: 8, max: 6, dirs: RECTAS },
  normal: { n: 10, max: 10, dirs: [...RECTAS, ...DIAGONALES] },
  dificil: { n: 12, max: 12, dirs: [...RECTAS, ...DIAGONALES, ...REVES] },
};

export function nueva(semilla, nivel = 'normal') {
  const g = generador(semilla);
  const { n, max, dirs } = NIVELES_SOPA[nivel];
  const tema = TEMAS[entero(g, TEMAS.length)];
  let celdas;
  let palabras = [];
  // Si no caben las 8, se arma otra (con el mismo generador: la misma semilla da la misma sopa).
  for (let intento = 0; intento < 20 && palabras.length < CUANTAS; intento++) [celdas, palabras] = colocar(g, n, dirs, tema.palabras.filter((p) => p.length <= max));
  const filas = celdas.map((fila) => fila.map((l) => l || LETRAS[entero(g, LETRAS.length)]).join(''));
  return { n, tema: tema.id, filas, palabras, puntos: 0, fin: false };
}

// Palabras al azar; cada una prueba hasta 200 lugares (si no cabe, sigue con otra).
function colocar(g, n, dirs, lista) {
  const celdas = Array.from({ length: n }, () => Array(n).fill(''));
  const palabras = [];
  for (const palabra of barajar(lista, () => azar(g))) {
    if (palabras.length === CUANTAS) break;
    for (let k = 0; k < 200; k++) {
      const [dx, dy] = dirs[entero(g, dirs.length)];
      const x = entero(g, n);
      const y = entero(g, n);
      const fin = [x + dx * (palabra.length - 1), y + dy * (palabra.length - 1)];
      if (fin[0] < 0 || fin[0] >= n || fin[1] < 0 || fin[1] >= n) continue;
      if (![...palabra].every((l, i) => [l, ''].includes(celdas[y + dy * i][x + dx * i]))) continue;
      [...palabra].forEach((l, i) => (celdas[y + dy * i][x + dx * i] = l));
      palabras.push({ palabra, x, y, dx, dy, hallada: false });
      break;
    }
  }
  return [celdas, palabras];
}

// Marca la línea de `desde` a `hasta` ([x, y]); si es una palabra (en cualquier sentido) sin hallar, +100. Da su índice o −1.
export function marcar(e, desde, hasta) {
  const k = e.palabras.findIndex((p) => {
    if (p.hallada) return false;
    const fin = [p.x + p.dx * (p.palabra.length - 1), p.y + p.dy * (p.palabra.length - 1)];
    const igual = (a, b) => a[0] === b[0] && a[1] === b[1];
    return (igual(desde, [p.x, p.y]) && igual(hasta, fin)) || (igual(hasta, [p.x, p.y]) && igual(desde, fin));
  });
  if (k < 0 || e.fin) return -1;
  e.palabras[k].hallada = true;
  e.puntos += 100;
  if (e.palabras.every((p) => p.hallada)) e.fin = true;
  return k;
}

// Al terminar: si halló todas, +5 por cada segundo que sobró.
export function cerrar(e, restantes) {
  if (e.palabras.every((p) => p.hallada)) e.puntos += 5 * Math.max(0, restantes);
  e.fin = true;
  return e;
}

// Las casillas de la línea de `desde` a `hasta` si es recta (horizontal, vertical o diagonal); si no, [].
export function linea(desde, hasta) {
  const dx = hasta[0] - desde[0];
  const dy = hasta[1] - desde[1];
  if (dx && dy && Math.abs(dx) !== Math.abs(dy)) return [];
  const largo = Math.max(Math.abs(dx), Math.abs(dy));
  return Array.from({ length: largo + 1 }, (_, i) => [desde[0] + Math.sign(dx) * i, desde[1] + Math.sign(dy) * i]);
}
