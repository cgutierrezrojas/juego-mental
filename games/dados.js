// 🎲 Dados: lo común de los juegos de dados (Cacho y Generala). Todo puro: el azar entra por el generador { s } de semilla.js.
import { entero } from './semilla.js';

export const PINTAS = [{ nombre: 'As', n: 1 }, { nombre: 'Dos', n: 2 }, { nombre: 'Tres', n: 3 }, { nombre: 'Cuatro', n: 4 }, { nombre: 'Quinto', n: 5 }, { nombre: 'Sexto', n: 6 }];

// Tira `n` dados con una copia del generador: devuelve { g (el generador avanzado), dados: [1..6] }.
export function tirar(g, n) {
  const h = { s: g.s };
  return { g: h, dados: Array.from({ length: n }, () => entero(h, 6) + 1) };
}

export const contar = (dados, cara) => dados.filter((d) => d === cara).length;
