// 🃏 Motor de juegos con comodines (tríos y escalas) para la Carioca y, después, el Burako. Todo puro.
// Carta: { v: 1–13, p: palo } o comodín { v: 0, p: '🃏' }.
// Juego: { tipo: 'T' (trío) | 'E' (escala, 4 a 13 seguidas del mismo palo, puede dar la vuelta por el As)
//        | 'S' (escala sucia: A–K de cualquier palo) | 'R' (escala real: A–K de un palo, sin comodines), cartas, inicio? }.
// En las escalas las cartas van en orden y `inicio` es el valor de la primera (un comodín vale lo que le toca).
import { PALOS } from './cartas.js';

export const COMODIN = { v: 0, p: '🃏' };
export const esComodin = (c) => c.v === 0;
export const puntos = (cartas) => cartas.reduce((t, c) => t + (c.v === 0 ? 30 : c.v === 1 ? 20 : c.v >= 11 ? 10 : c.v), 0);
export const valorEn = (inicio, k) => ((inicio - 1 + k) % 13) + 1;
export const NOMBRE_JUEGO = { T: 'trío', E: 'escala', S: 'escala sucia', R: 'escala real', P: 'pierna', L: 'escalera' };

function trio(cartas) {
  const reales = cartas.filter((c) => !esComodin(c));
  const comodines = cartas.length - reales.length;
  if (cartas.length < 3 || comodines >= reales.length || reales.some((c) => c.v !== reales[0].v)) return null;
  return { tipo: 'T', cartas: [...reales, ...cartas.filter(esComodin)] };
}

// Busca dónde empieza la escala para que cada carta real caiga en su valor y los comodines llenen los huecos.
function escala(cartas, tipo) {
  const reales = cartas.filter((c) => !esComodin(c));
  const comodines = cartas.length - reales.length;
  const largo = cartas.length;
  const valores = new Set(reales.map((c) => c.v));
  if (valores.size !== reales.length || largo > 13) return null;
  if (tipo === 'E' && (largo < 4 || comodines >= reales.length)) return null;
  if (tipo !== 'E' && largo !== 13) return null;
  if (tipo === 'R' && comodines) return null;
  if (tipo !== 'S' && reales.some((c) => c.p !== reales[0].p)) return null;
  for (let inicio = 1; inicio <= 13; inicio++) {
    const hueco = Array.from({ length: largo }, (_, k) => !valores.has(valorEn(inicio, k)));
    if (hueco.filter(Boolean).length !== comodines) continue;
    if (tipo === 'E' && hueco.some((h, k) => h && hueco[k + 1])) continue; // dos comodines seguidos no
    const orden = hueco.map((h, k) => (h ? { ...COMODIN } : reales.find((c) => c.v === valorEn(inicio, k))));
    return { tipo, cartas: orden, inicio };
  }
  return null;
}

// --- Burako: 'P' (pierna: 3 o más del mismo número) y 'L' (escalera: 3 o más seguidas del mismo color, el 1 abajo o
// arriba, sin vuelta). Comodín: el comodín y los 2; uno por juego como mucho. `sucio` dice si lleva comodín.
const comodinB = (c) => c.v === 0 || c.v === 2;

function pierna(cartas) {
  const reales = cartas.filter((c) => !comodinB(c));
  if (cartas.length < 3 || cartas.length - reales.length > 1 || reales.some((c) => c.v !== reales[0].v)) return null;
  return { tipo: 'P', cartas: [...reales, ...cartas.filter(comodinB)], sucio: cartas.length > reales.length };
}

// Posiciones 1–14 (el 1 vale 1 o 14). Prueba primero con todos los 2 naturales y después con cada comodín posible.
function escalera(cartas) {
  const largo = cartas.length;
  if (largo < 3 || largo > 14 || cartas.filter(esComodin).length > 1) return null;
  const opciones = [-1, ...cartas.map((c, i) => (comodinB(c) ? i : -1)).filter((i) => i >= 0)];
  for (const w of opciones) {
    const naturales = cartas.filter((c, i) => i !== w);
    if (naturales.some((c) => esComodin(c) || c.p !== naturales[0].p)) continue;
    for (let inicio = 1; inicio + largo - 1 <= 14; inicio++) {
      const fin = inicio + largo - 1;
      const lugar = new Map();
      let ases = 0;
      const ok = naturales.every((c) => {
        const pos = c.v !== 1 ? c.v : ases++ === 0 && inicio === 1 ? 1 : 14;
        if (pos < inicio || pos > fin || lugar.has(pos)) return false;
        lugar.set(pos, c);
        return true;
      });
      if (!ok) continue;
      const orden = Array.from({ length: largo }, (_, k) => lugar.get(inicio + k) ?? cartas[w]);
      return { tipo: 'L', cartas: orden, inicio, sucio: w >= 0 };
    }
  }
  return null;
}

// ¿Forman estas cartas un juego de ese tipo? Devuelve el juego ordenado o null.
export const armar = (tipo, cartas) => (tipo === 'T' ? trio(cartas) : tipo === 'P' ? pierna(cartas) : tipo === 'L' ? escalera(cartas) : escala(cartas, tipo));

const anterior = (v) => (v === 1 ? 13 : v - 1);

// Formas de agregar `carta` a un juego de la mesa: [{ juego, lado: 'abajo' | 'arriba' | null }].
// Las escalas de la Carioca solo crecen por las puntas y no se reacomodan: un comodín queda donde se puso.
export function opcionesAgregar(juego, carta) {
  if (juego.tipo !== 'E') {
    const j = ['T', 'P', 'L'].includes(juego.tipo) ? armar(juego.tipo, [...juego.cartas, carta]) : null;
    return j ? [{ juego: j, lado: null }] : [];
  }
  const { cartas, inicio } = juego;
  const reales = cartas.filter((c) => !esComodin(c));
  if (cartas.length >= 13) return [];
  const abajo = { lado: 'abajo', juego: { ...juego, cartas: [carta, ...cartas], inicio: anterior(inicio) } };
  const arriba = { lado: 'arriba', juego: { ...juego, cartas: [...cartas, carta] } };
  if (esComodin(carta)) {
    if (cartas.length + 1 - reales.length >= reales.length) return []; // siempre menos comodines que cartas
    return [...(esComodin(cartas[0]) ? [] : [abajo]), ...(esComodin(cartas.at(-1)) ? [] : [arriba])]; // dos seguidos no
  }
  if (carta.p !== reales[0].p) return [];
  return [...(carta.v === anterior(inicio) ? [abajo] : []), ...(carta.v === valorEn(inicio, cartas.length) ? [arriba] : [])];
}

// La primera forma de agregar `carta` (o null).
export const agregar = (juego, carta) => opcionesAgregar(juego, carta)[0]?.juego ?? null;

// Cambiar el comodín: la carta que reemplaza ocupa su lugar y el comodín vuelve a la mano. { juego, comodin } o null.
export function cambiar(juego, carta) {
  if (esComodin(carta)) return null;
  const k = juego.cartas.findIndex((c, x) => esComodin(c) && (juego.tipo === 'T' ? carta.v === juego.cartas[0].v : carta.v === valorEn(juego.inicio, x) && (juego.tipo === 'S' || carta.p === juego.cartas.find((r) => !esComodin(r)).p)));
  if (k < 0) return null;
  const cartas = juego.cartas.map((c, x) => (x === k ? carta : c));
  return { juego: { ...juego, cartas }, comodin: juego.cartas[k] };
}

// --- Bajar un contrato: la mejor forma de armar los juegos pedidos con la mano ---

// Juegos posibles de un tipo con las cartas libres (índices de la mano).
function candidatos(mano, libres, tipo) {
  const comodines = libres.filter((i) => esComodin(mano[i]));
  const reales = libres.filter((i) => !esComodin(mano[i]));
  const salida = [];
  if (tipo === 'T') {
    const porValor = {};
    for (const i of reales) (porValor[mano[i].v] ??= []).push(i);
    for (const grupo of Object.values(porValor)) {
      // Cartas iguales (mismo número y palo) dan lo mismo: se prueban los conjuntos de palos distintos.
      const vistos = new Set();
      for (let mascara = 1; mascara < 1 << grupo.length; mascara++) {
        const elegidas = grupo.filter((_, x) => mascara & (1 << x));
        const clave = elegidas.map((i) => mano[i].p).sort().join();
        if (elegidas.length < 2 || vistos.has(clave)) continue;
        vistos.add(clave);
        // Al bajar, el trío va justo de 3: lo demás se agrega desde el turno siguiente.
        if (elegidas.length === 3) salida.push(elegidas);
        if (elegidas.length === 2 && comodines.length) salida.push([...elegidas, comodines[0]]);
      }
    }
  } else if (tipo === 'E') {
    for (const palo of PALOS) {
      const deValor = {};
      for (const i of reales) if (mano[i].p === palo) deValor[mano[i].v] ??= i;
      if (Object.keys(deValor).length < 2) continue;
      for (let inicio = 1; inicio <= 13; inicio++) {
        for (const largo of [4]) { // al bajar, la escala va justa de 4
          const indices = Array.from({ length: largo }, (_, k) => deValor[valorEn(inicio, k)]);
          const huecos = indices.filter((i) => i === undefined).length;
          if (huecos > comodines.length || huecos >= largo - huecos) continue;
          if (indices.some((i, k) => i === undefined && indices[k + 1] === undefined && k + 1 < largo)) continue;
          // El comodín queda en su hueco (o punta) elegido: la escala ya va armada en `.juego`.
          let h = 0;
          const ix = indices.map((i) => i ?? comodines[h++]);
          ix.juego = { tipo, cartas: ix.map((i) => mano[i]), inicio };
          salida.push(ix);
        }
      }
    }
  } else {
    const palos = tipo === 'R' ? PALOS : [null];
    for (const palo of palos) {
      const deValor = {};
      for (const i of reales) if (palo === null || mano[i].p === palo) deValor[mano[i].v] ??= i;
      const faltan = 13 - Object.keys(deValor).length;
      if (tipo === 'R' ? !faltan : faltan <= comodines.length) salida.push([...Object.values(deValor), ...comodines.slice(0, faltan)]);
    }
  }
  return salida;
}

// Las formas distintas de bajar `tipos` (p. ej. ['T', 'T', 'E']), de la mejor a la peor: menos comodines y,
// entre esas, menos puntos en la mano. Cada una: { juegos, usados (índices de la mano) }.
// Con `primera`, se queda con la primera que encuentra (para saber si se puede).
// ponytail: búsqueda exhaustiva con tope de nodos; con manos de 12–16 cartas sobra.
export function bajadas(mano, tipos, cuantas = 12, primera = false) {
  const formas = new Map();
  let nodos = 0;
  const buscar = (k, libres, elegidos) => {
    if (++nodos > 60000 || (primera && formas.size)) return;
    if (k === tipos.length) {
      const juegos = elegidos.map((ix, x) => ix.juego ?? armar(tipos[x], ix.map((i) => mano[i])));
      // Cartas iguales (doble baraja) y el orden de los juegos dan la misma forma.
      const clave = juegos.map((j) => j.cartas.map((c) => c.v + c.p).join()).sort().join('|');
      const usados = elegidos.flat();
      if (!formas.has(clave)) formas.set(clave, { juegos, usados, comodines: usados.filter((i) => esComodin(mano[i])).length, valor: puntos(usados.map((i) => mano[i])) });
      return;
    }
    for (const juego of candidatos(mano, libres, tipos[k])) {
      buscar(k + 1, libres.filter((i) => !juego.includes(i)), [...elegidos, juego]);
    }
  };
  buscar(0, mano.map((_, i) => i), []);
  return [...formas.values()].sort((a, b) => a.comodines - b.comodines || b.valor - a.valor).slice(0, cuantas)
    .map(({ juegos, usados }) => ({ juegos, usados }));
}

export const mejorBajada = (mano, tipos, primera = false) => bajadas(mano, tipos, 1, primera)[0] ?? null;
