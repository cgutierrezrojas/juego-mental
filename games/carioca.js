// 🃏 Carioca (chilena): 2 barajas + 4 comodines, 12 cartas, una ronda por contrato. Todo puro.
// Estado: { n, contratos: [ids], extras: { comprar, comodin }, ronda (1…), reparte, turno, fase: 'robar' | 'comprar' | 'jugar',
// manos, mazo, pozo, mesa: [juego + { dueno }], bajados: [bool], bajoAhora (bajó en este turno: aún no agrega),
// compras: [n], oferta: { cola, vuelve } (quién decide comprar y a quién le toca robar), puntos, ganadas, ganador,
// aviso: { j, t }, resumen: { ronda, j, sumas } }.
import { baraja, nombreCarta } from './cartas.js';
import { barajar } from './comun.js';
import * as R from './rummy.js';

export const CONTRATOS = {
  '2T': { nombre: '2 tríos', juegos: ['T', 'T'] },
  TE: { nombre: 'Trío y escala', juegos: ['T', 'E'] },
  '2E': { nombre: '2 escalas', juegos: ['E', 'E'] },
  '3T': { nombre: '3 tríos', juegos: ['T', 'T', 'T'] },
  '2TE': { nombre: '2 tríos y escala', juegos: ['T', 'T', 'E'] },
  T2E: { nombre: 'Trío y 2 escalas', juegos: ['T', 'E', 'E'] },
  '3E': { nombre: '3 escalas', juegos: ['E', 'E', 'E'] },
  '4T': { nombre: '4 tríos', juegos: ['T', 'T', 'T', 'T'] },
  S: { nombre: 'Escala sucia', juegos: ['S'] },
  R: { nombre: 'Escala real', juegos: ['R'] },
};
export const CLASICA = ['2T', 'TE', '2E', '3T', '2TE', 'T2E', '3E', '4T', 'S', 'R'];
export const CORTA = CLASICA.slice(0, 4);
export const MAX_RONDAS = 12;
export const MAX_COMPRAS = 3;
export const MAX_VUELTAS = 3; // veces que se puede rebarajar el pozo en una ronda; después la ronda termina sin ganador
export const nombre = (c) => (R.esComodin(c) ? '🃏' : nombreCarta(c));
export const contrato = (e) => CONTRATOS[e.contratos[e.ronda - 1]];

const copia = (e) => structuredClone(e);
const mazoDoble = (rnd) => barajar([...baraja(rnd), ...baraja(rnd), ...Array.from({ length: 4 }, () => ({ ...R.COMODIN }))], rnd);

// ajustes: { contratos, comprar, comodin } (comprar solo vale con 3 o 4 jugadores).
export function nueva(n, ajustes = {}, rnd = Math.random) {
  const contratos = ajustes.contratos?.length ? ajustes.contratos.slice(0, MAX_RONDAS) : CLASICA;
  const extras = { comprar: !!ajustes.comprar && n >= 3, comodin: !!ajustes.comodin };
  const e = { n, contratos, extras, puntos: Array(n).fill(0), ganadas: Array(n).fill(0), ronda: 0, reparte: (2 * n - 2) % n, ganador: null, resumen: null };
  return repartir(e, rnd);
}

// Reparte el siguiente; empieza quien sigue al que reparte (en la primera ronda, el jugador 0).
function repartir(e, rnd) {
  const mazo = mazoDoble(rnd);
  const reparte = (e.reparte + 1) % e.n;
  const manos = Array.from({ length: e.n }, () => mazo.splice(-12));
  return { ...e, mazo, pozo: [mazo.pop()], manos, mesa: [], bajados: Array(e.n).fill(false), bajoAhora: false, compras: Array(e.n).fill(0), oferta: null, vueltas: 0,
    fase: 'robar', reparte, turno: (reparte + 1) % e.n, ronda: e.ronda + 1, aviso: null };
}

function sacar(s, rnd) {
  if (!s.mazo.length && s.pozo.length > 1) {
    s.mazo = barajar(s.pozo.splice(0, s.pozo.length - 1), rnd);
    s.vueltas = (s.vueltas ?? 0) + 1;
  }
  return s.mazo.pop() ?? null;
}
export const puedeRobar = (e, de) => e.ganador === null && e.fase === 'robar' && (de === 'pozo' ? e.pozo.length > 0 : e.mazo.length > 0 || e.pozo.length > 1);

// Robar del pozo o del mazo. Del mazo, con «comprar», antes deciden los demás que no bajaron (sin el que la botó).
export function robar(e, de, rnd = Math.random) {
  if (!puedeRobar(e, de)) return null;
  const s = copia(e);
  const j = s.turno;
  if (de === 'pozo') {
    const c = s.pozo.pop();
    s.manos[j].push(c);
    s.fase = 'jugar';
    s.aviso = { j, t: `tomó ${nombre(c)} del pozo` };
    return s;
  }
  const cola = [];
  if (s.extras.comprar && s.pozo.length) {
    for (let k = 1; k < s.n - 1; k++) {
      const x = (j + k) % s.n;
      if (!s.bajados[x] && s.compras[x] < MAX_COMPRAS) cola.push(x);
    }
  }
  if (cola.length) {
    s.fase = 'comprar';
    s.oferta = { cola, vuelve: j };
    s.turno = cola[0];
    return s;
  }
  return robarMazo(s, rnd);
}

function robarMazo(s, rnd) {
  const c = sacar(s, rnd);
  if (c) s.manos[s.turno].push(c);
  s.fase = 'jugar';
  s.aviso = { j: s.turno, t: 'robó del mazo' };
  return s;
}

// Comprar (o no) la carta de arriba del pozo: se lleva además una del mazo de castigo.
export function comprar(e, si, rnd = Math.random) {
  if (e.ganador !== null || e.fase !== 'comprar') return null;
  const s = copia(e);
  const j = s.turno;
  const { vuelve } = s.oferta;
  if (si) {
    const c = s.pozo.pop();
    s.manos[j].push(c);
    const castigo = sacar(s, rnd);
    if (castigo) s.manos[j].push(castigo);
    s.compras[j]++;
    s.oferta = null;
    s.turno = vuelve;
    robarMazo(s, rnd);
    s.aviso = { j, t: `compró ${nombre(c)}` };
    return s;
  }
  s.oferta.cola.shift();
  if (s.oferta.cola.length) {
    s.turno = s.oferta.cola[0];
    return s;
  }
  s.oferta = null;
  s.turno = vuelve;
  return robarMazo(s, rnd);
}

const enJuego = (e) => e.ganador === null && e.fase === 'jugar';
export const puedeBajar = (e) => enJuego(e) && !e.bajados[e.turno] && !!R.mejorBajada(e.manos[e.turno], contrato(e).juegos, true);
const puedeTocarMesa = (e) => enJuego(e) && e.bajados[e.turno] && !e.bajoAhora;

// Formas de bajar el contrato ahora (la primera es la mejor); tríos de 3 y escalas de 4, el resto se agrega después.
export const formasDeBajar = (e) => (enJuego(e) && !e.bajados[e.turno] ? R.bajadas(e.manos[e.turno], contrato(e).juegos) : []);

// Bajar el contrato con la forma `forma` de formasDeBajar (0: la mejor).
export function bajar(e, rnd = Math.random, forma = 0) {
  if (!enJuego(e) || e.bajados[e.turno]) return null;
  const b = formasDeBajar(e)[forma];
  if (!b) return null;
  const s = copia(e);
  const j = s.turno;
  s.manos[j] = s.manos[j].filter((_, i) => !b.usados.includes(i));
  s.mesa.push(...b.juegos.map((juego) => ({ ...juego, dueno: j })));
  s.bajados[j] = true;
  s.bajoAhora = true;
  s.aviso = { j, t: `bajó ${contrato(s).nombre.toLowerCase()}` };
  // Una escala de 13 ya no admite cartas: quien la baja gana la ronda (si compró de más, esas no cuentan).
  if (['S', 'R'].includes(contrato(s).juegos[0])) s.manos[j] = [];
  return s.manos[j].length ? s : cerrarRonda(s, rnd);
}

// Agregar la carta `i` de la mano al juego `k` de la mesa (desde el turno siguiente al de bajar).
// `lado` ('abajo' | 'arriba'): en qué punta de la escala, si cabe en las dos (p. ej. un comodín).
export function agregar(e, i, k, rnd = Math.random, lado = null) {
  const c = e.manos[e.turno]?.[i];
  const opciones = puedeTocarMesa(e) && c && e.mesa[k] ? R.opcionesAgregar(e.mesa[k], c) : [];
  const juego = (opciones.find((o) => o.lado === lado) ?? opciones[0])?.juego;
  if (!juego) return null;
  const s = copia(e);
  const j = s.turno;
  s.manos[j].splice(i, 1);
  s.mesa[k] = { ...juego, dueno: s.mesa[k].dueno };
  s.aviso = { j, t: `agregó ${nombre(c)}` };
  return s.manos[j].length ? s : cerrarRonda(s, rnd);
}

// Cambiar el comodín (regla extra): la carta `i` toma el lugar de un comodín del juego `k` y el comodín vuelve a la mano.
export function cambiar(e, i, k) {
  const c = e.manos[e.turno]?.[i];
  const r = e.extras.comodin && puedeTocarMesa(e) && c && e.mesa[k] ? R.cambiar(e.mesa[k], c) : null;
  if (!r) return null;
  const s = copia(e);
  const j = s.turno;
  s.manos[j].splice(i, 1, r.comodin);
  s.mesa[k] = { ...r.juego, dueno: s.mesa[k].dueno };
  s.aviso = { j, t: `cambió un comodín por ${nombre(c)}` };
  return s;
}

// Botar la carta `i` al pozo: termina el turno.
export function botar(e, i, rnd = Math.random) {
  const c = e.manos[e.turno]?.[i];
  if (!enJuego(e) || !c) return null;
  const s = copia(e);
  const j = s.turno;
  s.manos[j].splice(i, 1);
  s.pozo.push(c);
  s.aviso = { j, t: `botó ${nombre(c)}` };
  if (!s.manos[j].length) return cerrarRonda(s, rnd);
  if (s.vueltas >= MAX_VUELTAS) return cerrarRonda(s, rnd, null);
  s.turno = (j + 1) % s.n;
  s.fase = 'robar';
  s.bajoAhora = false;
  return s;
}

// Quien se queda sin cartas gana la ronda; los demás suman lo que tienen en la mano. Al final gana quien tiene menos
// puntos (empate: más rondas ganadas; si sigue, quien ganó la última).
// Si el mazo se rebarajó MAX_VUELTAS veces, la ronda termina sin ganador (j = null) y todos suman su mano.
function cerrarRonda(s, rnd, j = s.turno) {
  const sumas = s.manos.map((m) => R.puntos(m));
  s.puntos = s.puntos.map((p, x) => p + sumas[x]);
  if (j !== null) s.ganadas[j]++;
  s.resumen = { ronda: s.ronda, j, sumas };
  if (s.ronda < s.contratos.length) return { ...repartir(s, rnd), resumen: s.resumen };
  const orden = s.puntos.map((p, x) => x).sort((a, b) => s.puntos[a] - s.puntos[b] || s.ganadas[b] - s.ganadas[a] || (b === j) - (a === j));
  s.ganador = orden[0];
  s.fase = 'fin';
  return s;
}

// --- 🤖 Máquina ---

const cerca = (a, b) => {
  const d = Math.abs(a - b);
  return Math.min(d, 13 - d);
};
// Qué tanto sirve una carta para el contrato de la ronda (sin bajar todavía).
function utilidad(e, c, mano) {
  const tipos = contrato(e).juegos;
  if (R.esComodin(c)) return tipos[0] === 'R' ? 0 : 100; // en la escala real no sirven
  const otras = mano.filter((x) => x !== c && !R.esComodin(x));
  if (tipos[0] === 'S') return otras.some((x) => x.v === c.v) ? 0 : 10;
  if (tipos[0] === 'R') {
    const distintos = (palo) => new Set(otras.filter((x) => x.p === palo).map((x) => x.v)).size;
    const mio = ['♠', '♥', '♦', '♣'].reduce((a, b) => (distintos(b) > distintos(a) ? b : a));
    return c.p === mio && !otras.some((x) => x.p === c.p && x.v === c.v) ? 10 : 0;
  }
  let u = 0;
  if (tipos.includes('T')) u += 4 * otras.filter((x) => x.v === c.v).length;
  if (tipos.includes('E')) u += 3 * otras.filter((x) => x.p === c.p && x.v !== c.v && cerca(x.v, c.v) <= 2).length;
  return u;
}
const entraEnMesa = (e, c) => e.mesa.some((juego) => R.agregar(juego, c));

// { robar: 'mazo' | 'pozo' } | { comprar: bool } | { bajar: true, forma? } | { agregar: i, juego: k } | { cambiar: i, juego: k } | { botar: i }
export function maquina(e, nivel = 'normal') {
  if (nivel === 'dificil') {
    const a = maquinaDificil(e);
    if (a) return a;
  }
  const j = e.turno;
  const mano = e.manos[j];
  const arriba = e.pozo.at(-1);
  // Bota la que menos sirve (y entre esas, la que más puntos vale); ya bajado, la que más vale.
  const nota = (c, cartas) => (e.bajados[j] ? (R.esComodin(c) ? 1000 : 0) : utilidad(e, c, cartas)) * 100 - R.puntos([c]);
  const peor = (cartas) => cartas.reduce((a, c) => (nota(c, cartas) < nota(a, cartas) ? c : a));
  // La del pozo sirve si no sería justo la que botaría después (si no, dos máquinas se la pasan sin robar nunca del mazo).
  const sirve = (c) => c && (e.bajados[j] ? entraEnMesa(e, c) : utilidad(e, c, mano) >= 4 && peor([...mano, c]) !== c);
  if (e.fase === 'comprar') return { comprar: sirve(arriba) && utilidad(e, arriba, mano) >= 8 };
  if (e.fase === 'robar') return { robar: sirve(arriba) || !puedeRobar(e, 'mazo') ? 'pozo' : 'mazo' };
  if (!e.bajados[j] && puedeBajar(e)) return { bajar: true };
  if (puedeTocarMesa(e)) {
    for (let i = 0; i < mano.length; i++) for (let k = 0; k < e.mesa.length; k++) if (R.agregar(e.mesa[k], mano[i])) return { agregar: i, juego: k };
    if (e.extras.comodin) for (let i = 0; i < mano.length; i++) for (let k = 0; k < e.mesa.length; k++) if (R.cambiar(e.mesa[k], mano[i])) return { cambiar: i, juego: k };
  }
  return { botar: mano.indexOf(peor(mano)) };
}

// 🤖 Difícil: mide cuántas cartas le faltan para el contrato (cuántos comodines de más necesitaría para bajar) y bota,
// toma del pozo o compra según eso. Ya bajado, no bota cartas que entran en la mesa (le sirven a otro). null: como la normal.
function faltan(mano, tipos, hasta = 4) {
  for (let k = 0; k <= hasta; k++) if (R.mejorBajada([...mano, ...Array.from({ length: k }, () => ({ ...R.COMODIN }))], tipos, true)) return k;
  return hasta + 1;
}
function maquinaDificil(e) {
  const j = e.turno;
  const mano = e.manos[j];
  const arriba = e.pozo.at(-1);
  const tipos = contrato(e).juegos;
  if (e.bajados[j]) {
    if (e.fase !== 'jugar' || (puedeTocarMesa(e) && mano.some((c) => entraEnMesa(e, c)))) return null;
    const libres = mano.map((c, i) => i).filter((i) => !entraEnMesa(e, mano[i]) && !R.esComodin(mano[i]));
    const lista = libres.length ? libres : mano.map((c, i) => i);
    return { botar: lista.reduce((a, i) => (R.puntos([mano[i]]) > R.puntos([mano[a]]) ? i : a)) };
  }
  if (tipos[0] === 'S' || tipos[0] === 'R') return null; // con 13 cartas la cuenta no sirve: como la normal
  const ahora = faltan(mano, tipos);
  if (e.fase === 'robar' || e.fase === 'comprar') {
    const mejora = arriba && faltan([...mano, arriba], tipos, ahora) < ahora;
    if (e.fase === 'comprar') return { comprar: mejora && ahora >= 2 };
    return { robar: mejora || !puedeRobar(e, 'mazo') ? 'pozo' : 'mazo' };
  }
  if (puedeBajar(e)) return { bajar: true };
  // Bota la que menos lo aleja del contrato; entre esas, la que más puntos vale (nunca un comodín si hay otra).
  let mejor = null;
  mano.forEach((c, i) => {
    if (R.esComodin(c) && mano.some((x) => !R.esComodin(x))) return;
    const nota = faltan(mano.filter((_, x) => x !== i), tipos, ahora + 1) * 100 - R.puntos([c]) - (entraEnMesa(e, c) ? -50 : 0);
    if (!mejor || nota < mejor.nota) mejor = { i, nota };
  });
  return { botar: mejor.i };
}

export function accion(e, a, rnd = Math.random) {
  if (a.robar) return robar(e, a.robar, rnd);
  if (a.comprar !== undefined) return comprar(e, a.comprar, rnd);
  if (a.bajar) return bajar(e, rnd, a.forma ?? 0);
  if (a.agregar !== undefined) return agregar(e, a.agregar, a.juego, rnd, a.lado);
  if (a.cambiar !== undefined) return cambiar(e, a.cambiar, a.juego);
  return botar(e, a.botar, rnd);
}
