// 🧩 Bloques: caen piezas de 4 cuadros; las filas completas se borran. Cuatro modalidades. Todo puro.
// `paso(e, entrada)` avanza un cuadro (1/60 s); entrada: 'izquierda' | 'derecha' | 'girar' | 'soltar' | null.
// `e.bajando` (▼ mantenido) lo pone la app. Celdas: e.celdas[fila][col] = letra de la pieza, 'x' (basura) o null.
import { generador, entero } from './semilla.js';

export const ANCHO = 10;
export const ALTO = 20;
export const MODOS = ['clasico', 'contrarreloj', 'dosmin', 'escombros'];
export const LINEAS_META = 40; // contrarreloj
export const CUADROS_DOSMIN = 120 * 60;
export const CADA_BASURA = 10 * 60; // escombros
const ESPERA_SUELO = 30;
const REINICIOS = 15;
const PUNTOS = [0, 100, 300, 500, 800];

// Forma de cada pieza dentro de su caja (lado `n`); girar = (x, y) → (n-1-y, x).
export const PIEZAS = {
  I: { n: 4, c: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { n: 2, c: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { n: 3, c: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { n: 3, c: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { n: 3, c: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { n: 3, c: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { n: 3, c: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};
const LETRAS = Object.keys(PIEZAS);

// Cuadros por fila según el nivel (más nivel, más rápido).
export const gravedad = (nivel) => Math.max(2, 48 - 4 * (nivel - 1));
const nivelFijo = { dosmin: 5, escombros: 3 };

export function nuevo(semilla, modo = 'clasico') {
  const e = {
    g: generador(semilla), modo, bolsa: [], celdas: Array.from({ length: ALTO }, () => Array(ANCHO).fill(null)),
    pieza: null, siguiente: null, puntos: 0, lineas: 0, nivel: nivelFijo[modo] ?? 1, cuadros: 0,
    caida: 0, suelo: 0, reinicios: 0, bajando: false, fin: false, gano: false,
  };
  if (modo === 'escombros') for (let i = 0; i < 8; i++) subirBasura(e);
  e.siguiente = sacar(e);
  aparecer(e);
  return e;
}

// Bolsa de 7: las 7 piezas barajadas; al vaciarse, otra.
function sacar(e) {
  if (!e.bolsa.length) {
    e.bolsa = [...LETRAS];
    for (let i = e.bolsa.length - 1; i > 0; i--) {
      const j = entero(e.g, i + 1);
      [e.bolsa[i], e.bolsa[j]] = [e.bolsa[j], e.bolsa[i]];
    }
  }
  return e.bolsa.shift();
}

const celdasDe = (p) => p.c.map(([x, y]) => [p.x + x, p.y + y]);
export const cabe = (e, p) => celdasDe(p).every(([x, y]) => x >= 0 && x < ANCHO && y < ALTO && (y < 0 || !e.celdas[y][x]));

function aparecer(e) {
  const t = e.siguiente;
  e.siguiente = sacar(e);
  e.pieza = { t, n: PIEZAS[t].n, c: PIEZAS[t].c, x: Math.floor((ANCHO - PIEZAS[t].n) / 2), y: 0 };
  e.caida = e.suelo = e.reinicios = 0;
  if (!cabe(e, e.pieza)) e.fin = true;
}

// Mueve o gira la pieza si cabe; en el suelo, un movimiento logrado da más tiempo antes de fijarse.
function probar(e, p) {
  if (!cabe(e, p)) return false;
  const enSuelo = !cabe(e, { ...e.pieza, y: e.pieza.y + 1 });
  e.pieza = p;
  if (enSuelo && e.reinicios < REINICIOS) {
    e.suelo = 0;
    e.reinicios++;
  }
  return true;
}

function girar(e) {
  const { n, c } = e.pieza;
  const giro = { ...e.pieza, c: c.map(([x, y]) => [n - 1 - y, x]) };
  // Junto a una pared u otra pieza, se prueba desplazada.
  for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]]) {
    if (probar(e, { ...giro, x: giro.x + dx, y: giro.y + dy })) return;
  }
}

// Fila donde caería la pieza (para la sombra y para soltar).
export function filaFinal(e) {
  let y = e.pieza.y;
  while (cabe(e, { ...e.pieza, y: y + 1 })) y++;
  return y;
}

function fijar(e) {
  for (const [x, y] of celdasDe(e.pieza)) {
    if (y < 0) return void (e.fin = true); // quedó fuera del tablero
    e.celdas[y][x] = e.pieza.t;
  }
  const quedan = e.celdas.filter((f) => f.some((c) => !c));
  const n = ALTO - quedan.length;
  e.celdas = [...Array.from({ length: n }, () => Array(ANCHO).fill(null)), ...quedan];
  e.puntos += PUNTOS[n] * e.nivel;
  e.lineas += n;
  if (!(e.modo in nivelFijo)) e.nivel = 1 + Math.floor(e.lineas / 10);
  if (e.modo === 'contrarreloj' && e.lineas >= LINEAS_META) {
    e.gano = e.fin = true;
    return;
  }
  aparecer(e);
}

// Escombros: entra una fila de basura por abajo (con un hueco) y todo sube una fila.
function subirBasura(e) {
  if (e.celdas[0].some(Boolean)) return void (e.fin = true);
  const hueco = entero(e.g, ANCHO);
  e.celdas = [...e.celdas.slice(1), Array.from({ length: ANCHO }, (_, x) => (x === hueco ? null : 'x'))];
  if (e.pieza && !cabe(e, e.pieza)) {
    e.pieza = { ...e.pieza, y: e.pieza.y - 1 };
    if (!cabe(e, e.pieza)) e.fin = true;
  }
}

export function paso(e, entrada) {
  if (e.fin) return e;
  e.cuadros++;
  if (e.modo === 'dosmin' && e.cuadros >= CUADROS_DOSMIN) {
    e.fin = true;
    return e;
  }
  if (e.modo === 'escombros' && e.cuadros % CADA_BASURA === 0) {
    subirBasura(e);
    if (e.fin) return e;
  }
  const p = e.pieza;
  if (entrada === 'izquierda' || entrada === 'derecha') probar(e, { ...p, x: p.x + (entrada === 'izquierda' ? -1 : 1) });
  if (entrada === 'girar') girar(e);
  if (entrada === 'soltar') {
    const y = filaFinal(e);
    e.puntos += 2 * (y - e.pieza.y);
    e.pieza = { ...e.pieza, y };
    fijar(e);
    return e;
  }
  const abajo = { ...e.pieza, y: e.pieza.y + 1 };
  if (cabe(e, abajo)) {
    e.suelo = 0;
    if (++e.caida >= (e.bajando ? 2 : gravedad(e.nivel))) {
      e.caida = 0;
      e.pieza = abajo;
      if (e.bajando) e.puntos++;
    }
  } else if (++e.suelo >= ESPERA_SUELO) fijar(e);
  return e;
}

// La marca de la partida según el modo (0 = sin marca): puntos, décimas de segundo (contrarreloj) o líneas (escombros).
export function resultado(e) {
  if (e.modo === 'contrarreloj') return e.gano ? Math.round(e.cuadros / 6) : 0;
  if (e.modo === 'escombros') return e.lineas;
  return e.puntos;
}
