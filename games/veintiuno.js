// 🃏 21 (Blackjack) contra la banca. Todo puro: cada jugada devuelve una mano nueva.
// Mano: { zapato: [cartas por salir], banca: [cartas], manos: [{ cartas, apuesta, hecha, separada }], actual, fin }
// (`separada`: viene de separar un par; su 21 no es blackjack). Las fichas las lleva quien llama: `cobro` dice cuánto devolver.
import { baraja } from './cartas.js';

export const POCAS = 15; // con menos cartas en el zapato se baraja de nuevo
const valor = (c) => Math.min(c.v, 10);

// { total, blanda }: el As vale 11 si no te pasas (blanda) y si no 1.
export function puntos(cartas) {
  const duro = cartas.reduce((s, c) => s + valor(c), 0);
  const blanda = cartas.some((c) => c.v === 1) && duro + 10 <= 21;
  return { total: duro + (blanda ? 10 : 0), blanda };
}

const total = (cartas) => puntos(cartas).total;
const esBlackjack = (mano) => !mano.separada && mano.cartas.length === 2 && total(mano.cartas) === 21;

export function repartir(zapato, apuesta, rnd = Math.random) {
  const z = zapato.length < POCAS ? baraja(rnd) : [...zapato];
  const yo = [z.pop(), z.pop()];
  const banca = [z.pop(), z.pop()];
  const m = { zapato: z, banca, manos: [{ cartas: yo, apuesta, hecha: false, separada: false }], actual: 0, fin: false };
  // Con un blackjack (tuyo o de la banca) la mano se acaba al repartir.
  if (esBlackjack(m.manos[0]) || total(banca) === 21) return { ...m, manos: [{ ...m.manos[0], hecha: true }], fin: true };
  return m;
}

// Pasa a la siguiente mano sin hacer; si no queda ninguna, juega la banca (pide hasta 17) y se acaba.
function seguir(m) {
  const s = structuredClone(m);
  const mano = s.manos[s.actual];
  if (total(mano.cartas) >= 21) mano.hecha = true;
  if (!mano.hecha) return s;
  s.actual = s.manos.findIndex((x) => !x.hecha);
  if (s.actual >= 0) return seguir(s);
  if (s.manos.some((x) => total(x.cartas) <= 21)) while (total(s.banca) < 17) s.banca.push(s.zapato.pop());
  s.fin = true;
  return s;
}

const conMano = (m, cambiar) => {
  const s = structuredClone(m);
  cambiar(s.manos[s.actual], s);
  return seguir(s);
};

export const pedir = (m) => conMano(m, (mano, s) => mano.cartas.push(s.zapato.pop()));
export const plantarse = (m) => conMano(m, (mano) => (mano.hecha = true));

export const puedeDoblar = (m, fichas) => !m.fin && m.manos[m.actual].cartas.length === 2 && fichas >= m.manos[m.actual].apuesta;
export const doblar = (m) => conMano(m, (mano, s) => {
  mano.apuesta *= 2;
  mano.cartas.push(s.zapato.pop());
  mano.hecha = true;
});

// Separar: una vez, con un par del mismo valor (10, J, Q y K valen igual). Con ases, una carta a cada uno y listo.
export function puedeSeparar(m, fichas) {
  const [a, b, ...resto] = m.manos[m.actual].cartas;
  return !m.fin && m.manos.length === 1 && !resto.length && valor(a) === valor(b) && fichas >= m.manos[0].apuesta;
}
export function separar(m) {
  const s = structuredClone(m);
  const [a, b] = s.manos[0].cartas;
  const ases = a.v === 1;
  s.manos = [a, b].map((c) => ({ cartas: [c, s.zapato.pop()], apuesta: m.manos[0].apuesta, hecha: ases, separada: true }));
  return seguir(s);
}

// Resultado de cada mano: 'blackjack' | 'gana' | 'empate' | 'pierde'.
export function resultado(m, mano) {
  const yo = total(mano.cartas);
  const banca = total(m.banca);
  const bjBanca = m.banca.length === 2 && banca === 21;
  if (yo > 21) return 'pierde';
  if (esBlackjack(mano)) return bjBanca ? 'empate' : 'blackjack';
  if (bjBanca) return 'pierde';
  return banca > 21 || yo > banca ? 'gana' : yo === banca ? 'empate' : 'pierde';
}

// Fichas que te devuelven al acabar (la apuesta incluida): blackjack 3 a 2, ganar 1 a 1, empate la apuesta.
const PAGO = { blackjack: 2.5, gana: 2, empate: 1, pierde: 0 };
export const cobro = (m) => m.manos.reduce((s, mano) => s + Math.floor(mano.apuesta * PAGO[resultado(m, mano)]), 0);
