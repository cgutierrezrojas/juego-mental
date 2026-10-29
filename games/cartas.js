// 🃏 La baraja inglesa de 52 cartas: { v: 1–13 (As–Rey), p: palo }. Todo puro.
import { barajar } from './comun.js';

export const PALOS = ['♠', '♥', '♦', '♣'];
export const VALORES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const baraja = (rnd = Math.random) => barajar(PALOS.flatMap((p) => VALORES.map((_, i) => ({ v: i + 1, p }))), rnd);
export const esRoja = (c) => c.p === '♥' || c.p === '♦';
export const nombreCarta = (c) => VALORES[c.v - 1] + c.p;
