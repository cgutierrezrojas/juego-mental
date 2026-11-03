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
export const NOMBRE_JUEGO = { T: 'trío', E: 'escala', S: 'escala sucia', R: 'escala real' };

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

// ¿Forman estas cartas un juego de ese tipo? Devuelve el juego ordenado o null.
export const armar = (tipo, cartas) => (tipo === 'T' ? trio(cartas) : escala(cartas, tipo));

// Agregar una carta a un juego de la mesa (las escalas de 13 ya están llenas).
// ponytail: en una escala se vuelve a acomodar entera, así que un comodín puede correrse a una punta.
export const agregar = (juego, carta) => (juego.tipo === 'T' || juego.tipo === 'E' ? armar(juego.tipo, [...juego.cartas, carta]) : null);

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
        for (let c = 0; c <= Math.min(comodines.length, elegidas.length - 1); c++) if (elegidas.length + c >= 3) salida.push([...elegidas, ...comodines.slice(0, c)]);
      }
    }
  } else if (tipo === 'E') {
    for (const palo of PALOS) {
      const deValor = {};
      for (const i of reales) if (mano[i].p === palo) deValor[mano[i].v] ??= i;
      if (Object.keys(deValor).length < 2) continue;
      for (let inicio = 1; inicio <= 13; inicio++) {
        for (let largo = 4; largo <= 13; largo++) {
          const indices = Array.from({ length: largo }, (_, k) => deValor[valorEn(inicio, k)]);
          const huecos = indices.filter((i) => i === undefined).length;
          if (huecos > comodines.length || huecos >= largo - huecos || indices[0] === undefined) continue; // sin comodín en la punta de abajo: no se repite
          if (indices.some((i, k) => i === undefined && indices[k + 1] === undefined && k + 1 < largo)) continue;
          salida.push([...indices.filter((i) => i !== undefined), ...comodines.slice(0, huecos)]);
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

// La forma de bajar `tipos` (p. ej. ['T', 'T', 'E']) que deja menos puntos en la mano, o null.
// Devuelve { juegos, usados (índices de la mano) }. Con `primera`, la primera que encuentra (para saber si se puede).
// ponytail: búsqueda exhaustiva con tope de nodos; con manos de 12–16 cartas sobra.
export function mejorBajada(mano, tipos, primera = false) {
  let mejor = null;
  let nodos = 0;
  const buscar = (k, libres, elegidos) => {
    if (++nodos > 60000 || (primera && mejor)) return;
    if (k === tipos.length) {
      const usados = elegidos.flat();
      const valor = puntos(usados.map((i) => mano[i]));
      if (!mejor || valor > mejor.valor) mejor = { valor, elegidos };
      return;
    }
    for (const juego of candidatos(mano, libres, tipos[k])) {
      buscar(k + 1, libres.filter((i) => !juego.includes(i)), [...elegidos, juego]);
    }
  };
  buscar(0, mano.map((_, i) => i), []);
  if (!mejor) return null;
  return { juegos: mejor.elegidos.map((ix, k) => armar(tipos[k], ix.map((i) => mano[i]))), usados: mejor.elegidos.flat() };
}
