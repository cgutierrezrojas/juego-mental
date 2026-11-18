// 🎲 Generala clásica: 2 a 4 jugadores, 11 casillas cada uno, hasta 3 tiradas por turno. Todo puro: cada acción devuelve un estado nuevo (o null si no vale).
// Estado: { n, jugadores: [{ tabla: { '1'..'6', escalera, full, poker, generala, doble } }] (null = libre, número = anotado),
// turno, dados: [5] (0 = sin tirar), guardados: [bool×5], tiradas (0..3), g: { s }, puntos: [], ganador: índice | 'empate' | null }.
import { tirar as tirarDados, contar } from './dados.js';
import { generador, semillaNueva } from './semilla.js';
import { esDados, mascara, logCuadra } from './justo.js';

export const CASILLAS = ['1', '2', '3', '4', '5', '6', 'escalera', 'full', 'poker', 'generala', 'doble'];
// Para tachar: primero lo que menos vale.
const TACHAR = ['doble', '1', '2', '3', '4', '5', '6', 'poker', 'escalera', 'full', 'generala'];
const copia = (e) => structuredClone(e);
const cuentas = (dados) => [1, 2, 3, 4, 5, 6].map((c) => contar(dados, c));
const NADA = () => [false, false, false, false, false];

export function nueva(n, semilla = semillaNueva()) {
  return {
    n,
    jugadores: Array.from({ length: n }, () => ({ tabla: Object.fromEntries(CASILLAS.map((c) => [c, null])) })),
    turno: 0, dados: [0, 0, 0, 0, 0], guardados: NADA(), tiradas: 0, g: generador(semilla), puntos: Array(n).fill(0), ganador: null,
  };
}

// Puntaje de una casilla con las cuentas de caras `k` (6 números); `servido`: salió en la primera tirada; `doble`: la Generala ya vale 50.
function puntaje(c, k, servido, doble) {
  const mx = Math.max(...k), mas = servido ? 5 : 0;
  if (c.length === 1) return k[c - 1] * c;
  if (c === 'escalera') return [0, 1].some((i) => k.slice(i, i + 5).every((x) => x === 1)) ? 20 + mas : 0;
  if (c === 'full') return mx === 3 && k.includes(2) ? 30 + mas : 0;
  if (c === 'poker') return mx >= 4 ? 40 + mas : 0;
  if (c === 'generala') return mx === 5 ? 50 : 0;
  return mx === 5 && doble ? 100 : 0;
}

// Puntos que daría cada casilla libre con los dados actuales ({} antes de tirar).
export function posibles(e) {
  if (e.tiradas === 0) return {};
  const t = e.jugadores[e.turno].tabla, k = cuentas(e.dados);
  return Object.fromEntries(CASILLAS.filter((c) => t[c] === null).map((c) => [c, puntaje(c, k, e.tiradas === 1, t.generala === 50)]));
}

export function tirar(e) {
  if (e.tiradas >= 3 || e.ganador !== null || e.pide || (e.tiradas > 0 && e.guardados.every(Boolean))) return null;
  // Con un amigo solo se pide la tirada k + 1 (con lo guardado fijo); los dados llegan después con publicar.
  if (e.amigo) return { ...copia(e), k: e.k + 1, pide: true, guardados: e.tiradas === 0 ? NADA() : e.guardados.map(Boolean) };
  const s = copia(e);
  const suelto = s.dados.map((_, i) => s.tiradas === 0 || !s.guardados[i]);
  const r = tirarDados(s.g, suelto.filter(Boolean).length);
  let j = 0;
  s.dados = s.dados.map((d, i) => (suelto[i] ? r.dados[j++] : d));
  s.g = r.g;
  if (s.tiradas++ === 0) s.guardados = NADA();
  return s;
}

export function alternarGuardado(e, i) {
  if (e.pide || e.tiradas === 0 || e.tiradas >= 3 || !(i >= 0 && i < 5)) return null;
  const s = copia(e);
  s.guardados[i] = !s.guardados[i];
  return s;
}

export const total = (j) => Object.values(j.tabla).reduce((a, b) => a + (b ?? 0), 0);

export function anotar(e, casilla) {
  if (e.pide || e.tiradas === 0 || e.ganador !== null || !CASILLAS.includes(casilla) || e.jugadores[e.turno].tabla[casilla] !== null) return null;
  const s = copia(e);
  const servida = e.tiradas === 1 && Math.max(...cuentas(e.dados)) === 5;
  s.jugadores[s.turno].tabla[casilla] = posibles(e)[casilla];
  s.puntos = s.jugadores.map(total);
  if (servida) s.ganador = s.turno; // generala servida: gana al instante
  else if (s.jugadores.every((j) => CASILLAS.every((c) => j.tabla[c] !== null))) {
    const mejor = Math.max(...s.puntos), quienes = s.puntos.flatMap((p, i) => (p === mejor ? [i] : []));
    s.ganador = quienes.length > 1 ? 'empate' : quienes[0];
  }
  if (s.ganador === null) s.turno = (s.turno + 1) % s.n;
  s.dados = [0, 0, 0, 0, 0];
  s.guardados = NADA();
  s.tiradas = 0;
  return s;
}

export const ganador = (e) => e.ganador;

// --- Con un amigo («dados justos», games/justo.js) ---
// Además de lo común (amigo, k, sellos, r, s): pide (la tirada k está pedida y aún sin dados) y hechas: [{ j, t, g, d }],
// donde hechas[k - 1] es la tirada k: de quién, cuál del turno (1–3), qué guardó y cómo quedaron los 5 dados.
export const nuevaAmigo = (sello) => ({ ...nueva(2), g: null, turno: 1, amigo: true, k: 0, pide: false, hechas: [], sellos: { x: sello }, r: {}, s: {} });

// Qué dados se tiran en la tirada pedida (todos en la primera del turno).
export const sueltos = (e) => e.dados.map((_, i) => e.tiradas === 0 || !e.guardados[i]);

// Los dados que salieron (`nuevos`, uno por cada suelto) se ponen en la mesa.
export function publicar(e, nuevos) {
  const suelto = sueltos(e);
  if (!e.pide || !esDados(nuevos, suelto.filter(Boolean).length)) return null;
  const s = copia(e);
  let j = 0;
  s.dados = s.dados.map((d, i) => (suelto[i] ? nuevos[j++] : d));
  s.tiradas++;
  s.pide = false;
  s.hechas.push({ j: e.turno, t: s.tiradas, g: [...e.guardados], d: [...s.dados] });
  return s;
}

// Pasos del juego de quien tiene el turno (ver jugadaRival en games/justo.js), con lo que eligió tomado de `e`.
// `log`: el registro de la mesa; lo guardado en cada tirada debe ser lo que quedó en log/k al pedirla.
export function pasosAmigo(w, e, log) {
  const h = e.hechas?.[w.hechas.length];
  if (w.pide) return h && Array.isArray(h.d) && logCuadra(log, w.k, w.turno, mascara(w.guardados)) ? [publicar(w, h.d.filter((_, i) => sueltos(w)[i]))] : [];
  const r = CASILLAS.map((c) => anotar(w, c));
  const t = h && Array.isArray(h.g) && h.g.length === 5 && tirar({ ...w, guardados: h.g });
  if (t && logCuadra(log, t.k, w.turno, mascara(t.guardados))) r.push(t);
  return r;
}

// Revisión final: las tiradas de cada uno ({ k, j, d: los dados que salieron de su semilla }), o null si el registro
// no cuadra (una k sin su tirada, dados guardados que cambiaron, o lo guardado o quién tiró distinto de log/k).
export function tiradasAmigo(e, log) {
  if (!Array.isArray(e.hechas) || e.pide || e.k !== e.hechas.length) return null;
  const r = [];
  for (const [i, h] of e.hechas.entries()) {
    const antes = e.hechas[i - 1];
    if (!esDados(h?.d, 5) || !Array.isArray(h.g) || ![0, 1].includes(h.j) || !logCuadra(log, i + 1, h.j, mascara(h.g)) || ![1, 2, 3].includes(h.t) || (h.t > 1 && (antes?.j !== h.j || antes.t !== h.t - 1 || h.g.some((g, x) => g && h.d[x] !== antes.d[x])))) return null;
    r.push({ k: i + 1, j: h.j, d: h.d.filter((_, x) => h.t === 1 || !h.g[x]) });
  }
  return r;
}

// Aplica una acción de la máquina: { tipo: 'tirar', guardar: [bool×5] } | { tipo: 'anotar', casilla }.
export function accion(e, a) {
  if (a.tipo === 'anotar') return anotar(e, a.casilla);
  const s = copia(e);
  s.guardados = e.tiradas === 0 ? NADA() : a.guardar.slice(0, 5).map(Boolean);
  return tirar(s);
}

// --- Máquinas ---
// Valor de reserva de cada casilla (lo que se espera sacar de ella más adelante): la Difícil anota donde más gana sobre eso.
const RESERVA = { 1: 2.6, 2: 5.2, 3: 7.8, 4: 10.4, 5: 13, 6: 15.6, escalera: 16, full: 20, poker: 18, generala: 8, doble: 1 };

const libres = (e) => TACHAR.filter((c) => e.jugadores[e.turno].tabla[c] === null);
const anotarA = (casilla) => ({ tipo: 'anotar', casilla });
// Mejor casilla según `valor(casilla, puntos)`; con empate gana la que menos vale (orden de TACHAR).
function mejorCasilla(e, valor) {
  const p = posibles(e);
  let mejor = null, v = -Infinity;
  for (const c of libres(e)) if (valor(c, p[c]) > v) [mejor, v] = [c, valor(c, p[c])];
  return mejor;
}
// Guardados que conservan hasta `quedan[i]` dados de cada cara.
function guardarCaras(e, quedan) {
  const q = [...quedan];
  return e.dados.map((d) => q[d - 1] > 0 && !!q[d - 1]--);
}
const caraMasRepetida = (k) => k.reduce((m, x, i) => (x >= k[m] ? i : m), 0);
const guardarLaMasRepetida = (e, k) => {
  const m = caraMasRepetida(k);
  return { tipo: 'tirar', guardar: guardarCaras(e, k.map((x, i) => (i === m ? x : 0))) };
};

function facil(e) {
  const k = cuentas(e.dados);
  if (e.tiradas === 3 || Math.max(...k) === 5) return anotarA(mejorCasilla(e, (c, p) => p));
  return guardarLaMasRepetida(e, k);
}

function normal(e) {
  const k = cuentas(e.dados), t = e.jugadores[e.turno].tabla, p = posibles(e);
  const hecha = ['doble', 'generala', 'escalera', 'full', 'poker'].find((c) => t[c] === null && p[c] > 0);
  if (hecha) return anotarA(hecha);
  if (e.tiradas === 3 || Math.max(...k) === 5) return anotarA(mejorCasilla(e, (c, x) => x));
  const [vistas, desde] = [0, 1].map((i) => [k.slice(i, i + 5).filter(Boolean).length, i]).sort((a, b) => b[0] - a[0])[0];
  if (t.escalera === null && vistas >= 4) return { tipo: 'tirar', guardar: guardarCaras(e, k.map((x, i) => (i >= desde && i < desde + 5 && x ? 1 : 0))) };
  const pares = k.flatMap((x, i) => (x === 2 ? [i] : []));
  if (pares.length === 2 && t.full === null) return { tipo: 'tirar', guardar: guardarCaras(e, k.map((x, i) => (pares.includes(i) ? 2 : 0))) };
  return guardarLaMasRepetida(e, k);
}

// Difícil: valor esperado. Se enumeran los resultados de los dados no guardados por multiconjuntos (≤ 252 por tirada, con su probabilidad)
// y se memoriza por (cuentas, tiradas que quedan); así las formas de guardar se evalúan en pocos milisegundos.
const FACT = [1, 1, 2, 6, 24, 120];
const RESULTADOS = [0, 1, 2, 3, 4, 5].map((m) => {
  const lista = [];
  const ir = (cara, falta, k) => {
    if (cara === 5) {
      const r = [...k, falta];
      return lista.push({ k: r, p: FACT[m] / r.reduce((a, x) => a * FACT[x], 1) / 6 ** m });
    }
    for (let x = 0; x <= falta; x++) ir(cara + 1, falta - x, [...k, x]);
  };
  ir(0, m, []);
  return lista;
});
// Todas las formas distintas de guardar de las cuentas `k`.
function subconjuntos(k) {
  let r = [[]];
  for (const x of k) r = r.flatMap((s) => Array.from({ length: x + 1 }, (_, y) => [...s, y]));
  return r;
}

function dificil(e) {
  const t = e.jugadores[e.turno].tabla, doble = t.generala === 50, lib = libres(e), k = cuentas(e.dados);
  const valor = (h, servido) => Math.max(...lib.map((c) => puntaje(c, h, servido, doble) - RESERVA[c]));
  const memoE = new Map(), memoF = new Map();
  // Valor esperado de guardar `s` y tirar el resto, con `quedan` tiradas.
  const E = (s, quedan) => {
    const clave = s.join('') + quedan;
    if (memoE.has(clave)) return memoE.get(clave);
    let v = 0;
    for (const r of RESULTADOS[5 - s.reduce((a, b) => a + b, 0)]) v += r.p * F(s.map((x, i) => x + r.k[i]), quedan - 1);
    memoE.set(clave, v);
    return v;
  };
  // Valor de una mano ya tirada con `quedan` tiradas por delante: anotar o volver a tirar lo mejor.
  const F = (h, quedan) => {
    const clave = h.join('') + quedan;
    if (memoF.has(clave)) return memoF.get(clave);
    let v = valor(h, false);
    if (quedan > 0) for (const s of subconjuntos(h)) if (s.some((x, i) => x < h[i])) v = Math.max(v, E(s, quedan));
    memoF.set(clave, v);
    return v;
  };
  let mejor = null, v = valor(k, e.tiradas === 1);
  if (e.tiradas < 3) {
    for (const s of subconjuntos(k)) {
      if (!s.some((x, i) => x < k[i])) continue;
      const x = E(s, 3 - e.tiradas);
      if (x > v) [mejor, v] = [s, x];
    }
  }
  return mejor ? { tipo: 'tirar', guardar: guardarCaras(e, mejor) } : anotarA(mejorCasilla(e, (c, x) => x - RESERVA[c]));
}

export function maquina(e, nivel, rnd) {
  if (e.tiradas === 0) return { tipo: 'tirar', guardar: NADA() };
  const t = e.jugadores[e.turno].tabla;
  // Generala servida: gana al anotar donde sea.
  if (e.tiradas === 1 && Math.max(...cuentas(e.dados)) === 5) return anotarA(['generala', 'doble', ...libres(e)].find((c) => t[c] === null));
  return (nivel === 'facil' ? facil : nivel === 'normal' ? normal : dificil)(e, rnd);
}
