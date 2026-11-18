// 🎲 Cacho chileno: 2 a 6 jugadores, 5 dados ocultos cada uno; se apuesta cuántos dados de una pinta hay entre todos. Todo puro: cada acción devuelve un estado nuevo (o null si no vale).
// Estado: { n, jugadores: [{ dados: [..], obligoUsado }], turno, apuesta: { n, pinta, de } | null, apuestas: [apuestas de la ronda],
// obligo: índice | null, ronda, g: { s }, ganador: índice | null, resumen: { ronda, tipo, por, apuesta, dados, total, quien, delta, obligo } | null }.
// Los ases (pinta 1) son comodines, salvo en obligo. La resolución (resolver) recibe los dados de todos explícitos: en el modo amigo se reutiliza con los dados revelados.
import { tirar as tirarDados, contar } from './dados.js';
import { generador, semillaNueva } from './semilla.js';

const copia = (e) => structuredClone(e);
const PINTAS_ORDEN = [2, 3, 4, 5, 6, 1];
export const totalDados = (e) => e.jugadores.reduce((a, j) => a + j.dados.length, 0);

function repartir(s) {
  s.jugadores.forEach((j) => { const r = tirarDados(s.g, j.dados.length); s.g = r.g; j.dados = r.dados; });
}

export function nueva(n, semilla = semillaNueva()) {
  const e = {
    n, jugadores: Array.from({ length: n }, () => ({ dados: Array(5).fill(1), obligoUsado: false })),
    turno: 0, apuesta: null, apuestas: [], obligo: null, ronda: 1, g: generador(semilla), ganador: null, resumen: null,
  };
  repartir(e);
  return e;
}

// ¿Es válida `a` = { n, pinta } como siguiente apuesta?
export function esValida(e, a) {
  if (e.ganador !== null || !a || !Number.isInteger(a.n) || !Number.isInteger(a.pinta) || a.pinta < 1 || a.pinta > 6 || a.n < 1 || a.n > totalDados(e)) return false;
  const p = e.apuesta;
  if (!p) return a.pinta !== 1 || e.jugadores[e.turno].dados.length === 1; // apertura: no en ases salvo con un solo dado
  if (e.obligo !== null) return a.pinta === p.pinta && a.n > p.n; // obligo: pinta fija y solo sube la cantidad
  if (a.pinta === 1) return p.pinta === 1 ? a.n > p.n : a.n >= Math.ceil(p.n / 2);
  if (p.pinta === 1) return a.n >= 2 * p.n + 1;
  return a.n > p.n || (a.n === p.n && a.pinta > p.pinta);
}

// Todas las apuestas válidas, por cantidad y luego por pinta (ases al final de cada cantidad).
export function validas(e) {
  const r = [];
  for (let n = 1; n <= totalDados(e); n++) for (const pinta of PINTAS_ORDEN) if (esValida(e, { n, pinta })) r.push({ n, pinta });
  return r;
}

// La sugerida: la menor válida, prefiriendo una pinta que no sea As.
export function apuestaMinima(e) {
  const v = validas(e);
  return v.find((a) => a.pinta !== 1) ?? v[0] ?? null;
}

// Cuántos dados cuentan para `pinta` en `dados` (lista de listas): los ases comodín, salvo en obligo o si la pinta es As.
export function totalDe(dados, pinta, obligo) {
  const todos = dados.flat();
  return contar(todos, pinta) + (obligo || pinta === 1 ? 0 : contar(todos, 1));
}

// Resolución pura. `tipo`: 'dudo' | 'calzo'; `dados`: los de todos (revelados). Devuelve { total, quien (el que cambia de dados), delta (-1 | +1 | 0 si calza con 5),
// cuantos (dados de cada uno después), empieza (la ronda siguiente), obligo (índice que abre en obligo o null), ganador }.
export function resolver(e, tipo, dados) {
  const a = e.apuesta, total = totalDe(dados, a.pinta, e.obligo !== null);
  const quien = tipo === 'dudo' ? (total >= a.n ? e.turno : a.de) : e.turno;
  const delta = tipo === 'dudo' || total !== a.n ? -1 : 1;
  const cuantos = dados.map((d, i) => d.length + (i === quien ? delta : 0));
  const tope = cuantos[quien] > 5; // tope de 5 dados
  if (tope) cuantos[quien] = 5;
  const vivos = cuantos.flatMap((c, i) => (c > 0 ? [i] : []));
  let empieza = quien;
  while (cuantos[empieza] === 0) empieza = (empieza + 1) % e.n;
  const obligo = cuantos[quien] === 1 && delta === -1 && !e.jugadores[quien].obligoUsado ? quien : null;
  return { total, quien, delta: tope ? 0 : delta, empieza, obligo, cuantos, ganador: vivos.length === 1 ? vivos[0] : null };
}

function cerrar(e, tipo) {
  const dados = e.jugadores.map((j) => j.dados), r = resolver(e, tipo, dados);
  const s = copia(e);
  s.resumen = { ronda: e.ronda, tipo, por: e.turno, apuesta: e.apuesta, dados: copia(dados), total: r.total, quien: r.quien, delta: r.delta, obligo: e.obligo !== null };
  s.jugadores.forEach((j, i) => { j.dados = j.dados.slice(0, r.cuantos[i]); while (j.dados.length < r.cuantos[i]) j.dados.push(1); });
  if (r.obligo !== null) s.jugadores[r.obligo].obligoUsado = true;
  s.obligo = r.obligo;
  s.apuesta = null; s.apuestas = []; s.ronda++;
  s.ganador = r.ganador;
  s.turno = r.obligo ?? r.empieza;
  if (s.ganador === null) repartir(s);
  return s;
}

export function apostar(e, a) {
  if (!esValida(e, a)) return null;
  const s = copia(e), ap = { n: a.n, pinta: a.pinta, de: e.turno };
  s.apuesta = ap; s.apuestas.push(ap);
  do s.turno = (s.turno + 1) % s.n; while (s.jugadores[s.turno].dados.length === 0);
  return s;
}

export const dudar = (e) => (e.ganador === null && e.apuesta ? cerrar(e, 'dudo') : null);
export const calzar = (e) => (e.ganador === null && e.apuesta && e.apuesta.de !== e.turno ? cerrar(e, 'calzo') : null);
export const ganador = (e) => e.ganador;

// Acción de la máquina o del jugador: { tipo: 'apostar', n, pinta } | { tipo: 'dudar' } | { tipo: 'calzar' }.
export function accion(e, a) {
  if (!a) return null;
  return a.tipo === 'apostar' ? apostar(e, a) : a.tipo === 'dudar' ? dudar(e) : a.tipo === 'calzar' ? calzar(e) : null;
}

// --- Máquinas ---
// P(X >= k) y P(X = k) con X ~ Binomial(h, q), exactas.
function binom(h, q, k) {
  let p = (1 - q) ** h, acum = 0, exacto = 0;
  for (let i = 0; i <= h; i++) {
    if (i >= k) acum += p;
    if (i === k) exacto = p;
    p *= ((h - i) / (i + 1)) * (q / (1 - q));
  }
  return { mayor: Math.min(1, acum), igual: exacto };
}
// ponytail: la Normal usa la aproximación normal (barata y algo burda); la Difícil, la binomial exacta.
function normal(h, q, k) {
  const m = h * q, sd = Math.sqrt(h * q * (1 - q)) || 1e-9;
  const cdf = (x) => {
    const z = (x - m) / sd, t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  };
  return { mayor: k <= 0 ? 1 : 1 - cdf(k - 0.5), igual: cdf(k + 0.5) - cdf(k - 0.5) };
}

// Mis dados que cuentan para la pinta, los ocultos y la probabilidad de cada dado oculto.
function vista(e, pinta) {
  const mis = e.jugadores[e.turno].dados, obligo = e.obligo !== null;
  return { mios: totalDe([mis], pinta, obligo), ocultos: totalDados(e) - mis.length, q: obligo || pinta === 1 ? 1 / 6 : 1 / 3 };
}
// { mayor, igual, esperado } de que haya >= / = a.n; `extra`: dados "deducidos" de las apuestas rivales (solo la Difícil).
function prob(e, a, exacta, extra = 0) {
  const v = vista(e, a.pinta), k = Math.ceil(a.n - v.mios - extra);
  return { ...(exacta ? binom : normal)(v.ocultos, v.q, k), esperado: v.mios + extra + v.ocultos * v.q };
}

function facil(e, rnd) {
  const ap = e.apuesta, mis = e.jugadores[e.turno].dados;
  if (ap && prob(e, ap, false).esperado * 2 < ap.n && rnd() < 0.5) return { tipo: 'dudar' };
  const v = validas(e);
  if (!v.length) return { tipo: 'dudar' };
  // Su pinta más repetida (sin contar ases): la apuesta mínima en ella, o la mínima que haya.
  let mejor = 2;
  for (const p of PINTAS_ORDEN) if (contar(mis, p) >= contar(mis, mejor)) mejor = p;
  const a = v.find((x) => x.pinta === mejor) ?? v[0];
  return { tipo: 'apostar', n: a.n, pinta: a.pinta };
}

function listo(e, nivel, rnd) {
  const ap = e.apuesta, exacta = nivel === 'dificil';
  // La Difícil deduce que su pinta abunda donde los rivales apostaron (hasta +2).
  const deduce = (p) => (exacta ? Math.min(2, 0.5 * e.apuestas.filter((x) => x.de !== e.turno && x.pinta === p).length) : 0);
  // ponytail: afinado a mano con simulaciones (Difícil ~58 % contra Normal). Normal calza con P(exacto) > 0,4 y no 0,2 como pedía la spec: con 0,2 perdía casi siempre contra Fácil.
  const v = validas(e);
  let mejor = null, pm = -1;
  const ps = v.map((a) => prob(e, a, exacta, deduce(a.pinta)).mayor);
  ps.forEach((p, i) => { if (p > pm + 1e-9) [mejor, pm] = [v[i], p]; });
  if (exacta) { const i = ps.findIndex((p) => p >= pm - 0.15); if (i >= 0) mejor = v[i]; }
  if (ap) {
    const pr = prob(e, ap, exacta, deduce(ap.pinta));
    // Difícil: duda si es más probable que la apuesta sea falsa que la mejor subida verdadera (con un margen).
    if (!mejor || (exacta ? pr.mayor + pm * 0.8 < 0.5 : ap.n > pr.esperado + 1)) return { tipo: 'dudar' };
    if (ap.de !== e.turno && Math.abs(ap.n - pr.esperado) < 0.5 && pr.igual > (exacta ? 0.3 : 0.4)) return { tipo: 'calzar' };
  }
  if (!mejor) return { tipo: 'dudar' };
  if (exacta && rnd() < 0.15) { // farol: una apuesta mínima cualquiera
    const m = v.filter((a) => a.n === v[0].n), a = m[Math.floor(rnd() * m.length)];
    return { tipo: 'apostar', n: a.n, pinta: a.pinta };
  }
  return { tipo: 'apostar', n: mejor.n, pinta: mejor.pinta };
}

export function maquina(e, nivel, rnd = Math.random) {
  return nivel === 'facil' ? facil(e, rnd) : listo(e, nivel, rnd);
}
