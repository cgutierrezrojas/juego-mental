// 🎱 Ocho locos: 2 a 4 jugadores, por rondas. Todo puro: cada acción devuelve un estado nuevo.
// Estado (gana quien llega a `meta(n)`): { n, manos: [[cartas]], mazo, pila, palo (el que manda), sentido: 1 | -1, turno, robar (2 acumulados),
// robadas (este turno, hasta 3), puntos: [], ronda, ganador (índice o null), aviso: { j, t } (lo último que pasó),
// resumen: { ronda, j, suma } (la última ronda terminada) }.
import { baraja } from './cartas.js';
import { barajar } from './comun.js';

export const meta = (n) => 100 * (n - 1); // 100 a dos, 200 a tres, 300 a cuatro: así hay varias rondas
export const MAX_ROBAR = 3;
const copia = (e) => structuredClone(e);

export const valorCarta = (c) => (c.v === 8 ? 50 : c.v === 2 ? 20 : c.v >= 11 ? 10 : c.v);
export const arriba = (e) => e.pila[e.pila.length - 1];
const siguiente = (e, pasos = 1) => (((e.turno + e.sentido * pasos) % e.n) + e.n) % e.n;

export function nueva(n, rnd = Math.random) {
  return repartir({ n, puntos: Array(n).fill(0), ronda: 0, ganador: null, resumen: null }, rnd);
}

// Reparte una ronda: 7 cartas a dos, 5 a tres o cuatro. Empieza quien sigue al que repartió.
function repartir(e, rnd) {
  const mazo = baraja(rnd);
  const cuantas = e.n === 2 ? 7 : 5;
  const manos = Array.from({ length: e.n }, () => mazo.splice(-cuantas));
  const pila = [mazo.pop()];
  const ronda = e.ronda + 1;
  return { ...e, manos, mazo, pila, palo: pila[0].p, sentido: 1, turno: ronda % e.n, robar: 0, robadas: 0, ronda, aviso: null, sinPalo: Array.from({ length: e.n }, () => []) };
}

export const puedeJugar = (e, c) => (e.robar ? c.v === 2 : c.v === 8 || c.p === e.palo || c.v === arriba(e).v);
export const jugables = (e) => e.manos[e.turno].map((c, i) => (puedeJugar(e, c) ? i : -1)).filter((i) => i >= 0);

// Tira la carta `i` de la mano (con un 8, `palo` es el que pide).
export function jugar(e, i, palo, rnd = Math.random) {
  const c = e.manos[e.turno][i];
  if (e.ganador !== null || !c || !puedeJugar(e, c) || (c.v === 8 && !palo)) return null;
  const s = copia(e);
  s.manos[s.turno].splice(i, 1);
  s.pila.push(c);
  s.palo = c.v === 8 ? palo : c.p;
  s.robadas = 0;
  if (s.sinPalo) s.sinPalo[s.turno] = s.sinPalo[s.turno].filter((x) => x !== c.p);
  s.aviso = { j: s.turno, t: c.v === 8 ? `tiró un 8 y pide ${palo}` : `tiró ${nombre(c)}` };
  if (!s.manos[s.turno].length) return cerrarRonda(s, rnd);
  let pasos = 1;
  if (c.v === 2) s.robar += 2;
  if (c.v === 11) pasos = 2; // J: salta al siguiente
  if (c.v === 12) {
    if (s.n === 2) pasos = 2; // a dos, la Q es volver a jugar
    else s.sentido *= -1;
  }
  s.turno = siguiente(s, pasos);
  return s;
}

const nombre = (c) => `${['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.v - 1]}${c.p}`;

// Saca una carta del mazo (si se acaba, se baraja la pila menos la de arriba). null si no queda ninguna.
function sacar(s, rnd) {
  if (!s.mazo.length && s.pila.length > 1) s.mazo = barajar(s.pila.splice(0, s.pila.length - 1), rnd);
  return s.mazo.pop() ?? null;
}

// Robar: con 2 acumulados te los llevas todos y pierdes el turno; si no, una carta (hasta 3 por turno, solo sin jugada).
export function puedeRobar(e) {
  return e.ganador === null && (e.robar > 0 || (!jugables(e).length && e.robadas < MAX_ROBAR && (e.mazo.length > 0 || e.pila.length > 1)));
}
export function robar(e, rnd = Math.random) {
  if (!puedeRobar(e)) return null;
  const s = copia(e);
  if (s.robar) {
    let n = 0;
    for (; n < s.robar; n++) {
      const c = sacar(s, rnd);
      if (!c) break;
      s.manos[s.turno].push(c);
    }
    s.aviso = { j: s.turno, t: `roba ${n}` };
    s.robar = 0;
    s.turno = siguiente(s);
    return s;
  }
  s.manos[s.turno].push(sacar(s, rnd));
  if (!s.robadas) (s.sinPalo ??= Array.from({ length: s.n }, () => []))[s.turno].push(s.palo); // se ve que no tenía
  s.robadas++;
  s.aviso = { j: s.turno, t: 'roba una carta' };
  return s;
}

// Pasar: sin jugada y sin poder robar más.
export const puedePasar = (e) => e.ganador === null && !e.robar && !jugables(e).length && !puedeRobar(e);
export function pasar(e) {
  if (!puedePasar(e)) return null;
  const s = copia(e);
  s.aviso = { j: s.turno, t: 'pasa' };
  s.robadas = 0;
  s.turno = siguiente(s);
  return s;
}

// Quien se queda sin cartas suma lo de los demás; si llega a la meta gana, si no se reparte otra ronda.
function cerrarRonda(s, rnd) {
  const j = s.turno;
  const suma = s.manos.flat().reduce((t, c) => t + valorCarta(c), 0);
  s.puntos[j] += suma;
  s.resumen = { ronda: s.ronda, j, suma };
  if (s.puntos[j] >= meta(s.n)) {
    s.ganador = j;
    return s;
  }
  return { ...repartir(s, rnd), resumen: s.resumen };
}

// 🤖 Lo que haría la máquina: { jugar: i, palo } | { robar: true } | { pasar: true }.
export function maquina(e, nivel = 'normal') {
  if (nivel === 'dificil') return maquinaDificil(e);
  const mano = e.manos[e.turno];
  const opciones = jugables(e);
  if (opciones.length) {
    const sinOcho = opciones.filter((i) => mano[i].v !== 8);
    const lista = sinOcho.length ? sinOcho : opciones;
    const i = lista.reduce((a, b) => (valorCarta(mano[b]) > valorCarta(mano[a]) ? b : a)); // se saca primero lo que más vale
    if (mano[i].v !== 8) return { jugar: i };
    const cuenta = {};
    for (const c of mano) if (c.v !== 8) cuenta[c.p] = (cuenta[c.p] ?? 0) + 1;
    const palo = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a])[0] ?? mano[i].p;
    return { jugar: i, palo };
  }
  return puedeRobar(e) ? { robar: true } : { pasar: true };
}

// 🤖 Difícil: le deja al siguiente la carta que menos probable es que pueda seguir (cuenta las que no vio, y recuerda
// los palos que le faltaban cuando tuvo que robar); guarda los 8 y, si el siguiente está por ganar, lo ataca con 2, J o Q.
function maquinaDificil(e) {
  const mano = e.manos[e.turno];
  const opciones = jugables(e);
  if (!opciones.length) return puedeRobar(e) ? { robar: true } : { pasar: true };
  const otro = siguiente(e);
  const h = e.manos[otro].length;
  const vistas = new Set([...mano, ...e.pila].map((c) => c.v + c.p));
  const ocultas = baraja(() => 0).filter((c) => !vistas.has(c.v + c.p));
  const leFalta = (palo) => e.sinPalo?.[otro]?.includes(palo) ?? false;
  // Probabilidad de que el siguiente tenga con qué seguir sobre (palo, valor).
  const puedeSeguir = (palo, v) => {
    const m = ocultas.filter((c) => c.v === 8 || c.v === v || (c.p === palo && !leFalta(palo))).length;
    let nada = 1;
    for (let x = 0; x < h; x++) nada *= Math.max(0, ocultas.length - m - x) / (ocultas.length - x);
    return 1 - nada;
  };
  const plan = (i) => {
    const c = mano[i];
    const resto = mano.filter((_, x) => x !== i);
    if (!resto.length) return { nota: 1e6, palo: c.p };
    // Con un 8, el palo que menos puede seguir el otro entre los que tengo.
    const palos = c.v === 8 ? [...new Set(resto.filter((r) => r.v !== 8).map((r) => r.p))] : [c.p];
    if (!palos.length) palos.push(c.p);
    const palo = palos.reduce((a, b) => (puedeSeguir(b, 0) < puedeSeguir(a, 0) ? b : a));
    let nota = -100 * puedeSeguir(palo, c.v === 8 ? 0 : c.v) + 3 * resto.filter((r) => r.v === 8 || r.p === palo).length + (c.v === 8 ? -30 : valorCarta(c) / 5);
    if (e.n === 2 && (c.v === 11 || c.v === 12)) nota += 40; // a dos, vuelve a jugar
    if (h <= 2 && (c.v === 2 || c.v === 11 || (c.v === 12 && e.n > 2))) nota += 40;
    return { nota, palo };
  };
  const planes = opciones.map((i) => ({ i, ...plan(i) }));
  const mejor = planes.reduce((a, b) => (b.nota > a.nota ? b : a));
  return mano[mejor.i].v === 8 ? { jugar: mejor.i, palo: mejor.palo } : { jugar: mejor.i };
}

// Aplica una acción de `maquina` (o de quien sea).
export const accion = (e, a, rnd = Math.random) => (a.jugar !== undefined ? jugar(e, a.jugar, a.palo, rnd) : a.robar ? robar(e, rnd) : pasar(e));
