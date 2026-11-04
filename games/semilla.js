// 🎲 Azar con semilla (mulberry32): con la misma semilla sale la misma secuencia (los retos del Arcade).
// El generador es un objeto { s } que se guarda en el estado del juego; `azar(g)` lo avanza y da un número en [0, 1).
export const generador = (semilla) => ({ s: semilla | 0 });
export const semillaNueva = () => Math.floor(Math.random() * 2 ** 31);

export function azar(g) {
  g.s = (g.s + 0x6d2b79f5) | 0;
  let t = Math.imul(g.s ^ (g.s >>> 15), 1 | g.s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const entero = (g, n) => Math.floor(azar(g) * n);
