// ¿Cuál sobra?: tres números siguen una regla y uno no. 60 segundos, 4 opciones.
import { azar, barajar } from './comun.js';
import { jugarConOpciones } from './opciones.js';

function esPrimo(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

// `desde`: aciertos de la partida a partir de los cuales aparece la regla.
export const REGLAS = [
  { nombre: 'pares', cumple: (n) => n % 2 === 0, desde: 0 },
  { nombre: 'impares', cumple: (n) => n % 2 === 1, desde: 0 },
  { nombre: 'múltiplos de 5', cumple: (n) => n % 5 === 0, desde: 5 },
  { nombre: 'múltiplos de 3', cumple: (n) => n % 3 === 0, desde: 5 },
  { nombre: 'cuadrados perfectos', cumple: (n) => Number.isInteger(Math.sqrt(n)), desde: 10 },
  { nombre: 'primos', cumple: esPrimo, desde: 10 },
];

export const reglasDisponibles = (aciertos) => REGLAS.filter((r) => aciertos >= r.desde);

// El raro de los 4 según una regla: el único que la cumple o el único que no (null si no hay uno solo).
export function distinto(regla, numeros) {
  const si = numeros.filter(regla.cumple);
  const no = numeros.filter((n) => !regla.cumple(n));
  if (si.length === 1) return si[0];
  if (no.length === 1) return no[0];
  return null;
}

export function generarRonda(aciertos, rnd = Math.random) {
  const reglas = reglasDisponibles(aciertos);
  const max = aciertos < 5 ? 20 : aciertos < 10 ? 50 : 100;
  for (;;) {
    const regla = reglas[azar(reglas.length, rnd)];
    const si = [];
    const no = [];
    while (si.length < 3 || no.length < 1) {
      const n = 1 + azar(max, rnd);
      if (si.includes(n) || no.includes(n)) continue;
      if (regla.cumple(n)) {
        if (si.length < 3) si.push(n);
      } else if (no.length < 1) {
        no.push(n);
      }
    }
    const numeros = barajar([...si, ...no], rnd);
    const sobra = no[0];
    // Sin ambigüedad: ninguna regla (de toda la lista) puede señalar a otro número como el raro.
    if (REGLAS.every((r) => [null, sobra].includes(distinto(r, numeros)))) return { numeros, sobra, regla };
  }
}

export function start(pantalla, alTerminar) {
  return jugarConOpciones(pantalla, alTerminar, (aciertos) => {
    const { numeros, sobra, regla } = generarRonda(aciertos);
    return { texto: '¿Cuál sobra?', opciones: numeros, correcta: sobra, pista: `Eran ${regla.nombre}` };
  });
}
