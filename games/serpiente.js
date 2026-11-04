// 🐍 Serpiente: cuadrícula de N×N, come frutas y crece; choca con el borde o consigo misma y pierde. Todo puro.
// `paso(e, entrada)` avanza un cuadro (1/60 s); la serpiente se mueve cada `cada` cuadros.
// Estado: { g (azar), cuerpo: [[x, y]] (la cabeza primero), dir, cola: [dir] (giros pedidos), fruta, dorada: { x, y, t } | null,
// puntos, comidas, cada, cuadro, fin }.
import { generador, azar, entero } from './semilla.js';

export const N = 15;
export const DIRS = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };
const DORADA = 300; // cuadros que dura la fruta dorada (5 s)

export function nuevo(semilla) {
  const e = { g: generador(semilla), cuerpo: [[3, 7], [2, 7], [1, 7]], dir: 'derecha', cola: [], fruta: null, dorada: null, puntos: 0, comidas: 0, cada: 10, cuadro: 0, fin: false };
  e.fruta = libre(e);
  return e;
}

// Una casilla libre: la que sale al azar o, si está ocupada, la siguiente libre (así la secuencia no depende de cómo se juegue).
function libre(e) {
  const ocupada = (x, y) => e.cuerpo.some(([a, b]) => a === x && b === y) || (e.fruta && e.fruta[0] === x && e.fruta[1] === y) || (e.dorada && e.dorada.x === x && e.dorada.y === y);
  const inicio = entero(e.g, N * N);
  for (let k = 0; k < N * N; k++) {
    const c = (inicio + k) % (N * N);
    if (!ocupada(c % N, Math.floor(c / N))) return [c % N, Math.floor(c / N)];
  }
  return null;
}

const contraria = (a, b) => DIRS[a][0] === -DIRS[b][0] && DIRS[a][1] === -DIRS[b][1];

export function paso(e, entrada) {
  if (e.fin) return e;
  // Hasta 2 giros en cola (para girar dos veces rápido); no se puede dar media vuelta.
  const ultima = e.cola.at(-1) ?? e.dir;
  if (entrada && DIRS[entrada] && entrada !== ultima && !contraria(entrada, ultima) && e.cola.length < 2) e.cola.push(entrada);
  e.cuadro++;
  if (e.dorada && --e.dorada.t <= 0) e.dorada = null;
  if (e.cuadro % e.cada) return e;
  e.dir = e.cola.shift() ?? e.dir;
  const [dx, dy] = DIRS[e.dir];
  const [x, y] = [e.cuerpo[0][0] + dx, e.cuerpo[0][1] + dy];
  const come = e.fruta && x === e.fruta[0] && y === e.fruta[1];
  const dorada = e.dorada && x === e.dorada.x && y === e.dorada.y;
  const cuerpo = come || dorada ? e.cuerpo : e.cuerpo.slice(0, -1);
  if (x < 0 || y < 0 || x >= N || y >= N || cuerpo.some(([a, b]) => a === x && b === y)) {
    e.fin = true;
    return e;
  }
  e.cuerpo = [[x, y], ...cuerpo];
  if (come) {
    e.puntos++;
    e.comidas++;
    if (e.comidas % 5 === 0) e.cada = Math.max(4, e.cada - 1);
    e.fruta = null;
    e.fruta = libre(e);
  }
  if (dorada) {
    e.puntos += 5;
    e.dorada = null;
  }
  if (!e.dorada && azar(e.g) < 1 / 40) {
    const c = libre(e);
    if (c) e.dorada = { x: c[0], y: c[1], t: DORADA };
  }
  return e;
}
