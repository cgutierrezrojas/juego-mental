// 🎲 Cacho chileno: 2 a 6 jugadores, 5 dados ocultos cada uno; se apuesta cuántos dados de una pinta hay entre todos. Todo puro: cada acción devuelve un estado nuevo (o null si no vale).
// Estado: { n, jugadores: [{ dados: [..], obligoUsado }], turno, apuesta: { n, pinta, de } | null, apuestas: [apuestas de la ronda],
// obligo: índice | null, ronda, g: { s }, ganador: índice | null, resumen: { ronda, tipo, por, apuesta, dados, total, quien, delta, obligo } | null }.
// Los ases (pinta 1) son comodines, salvo en obligo. La resolución (resolver) recibe los dados de todos explícitos: en el modo amigo se reutiliza con los dados revelados.
import { tirar as tirarDados, contar } from './dados.js';
import { generador, semillaNueva } from './semilla.js';
import { esDados } from './justo.js';

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
  if (e.ganador !== null || e.revelar || (e.amigo && e.k !== e.ronda) || !a || !Number.isInteger(a.n) || !Number.isInteger(a.pinta) || a.pinta < 1 || a.pinta > 6 || a.n < 1 || a.n > totalDados(e)) return false;
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
  if (s.ganador === null && s.g) repartir(s);
  return s;
}

export function apostar(e, a) {
  if (!esValida(e, a)) return null;
  const s = copia(e), ap = { n: a.n, pinta: a.pinta, de: e.turno };
  s.apuesta = ap; s.apuestas.push(ap);
  do s.turno = (s.turno + 1) % s.n; while (s.jugadores[s.turno].dados.length === 0);
  return s;
}

// Con un amigo no se ven los dados: se pasa a revelarlos (ver revelar).
const fin = (e, tipo) => (e.amigo ? aRevelar(e, tipo) : cerrar(e, tipo));
export const dudar = (e) => (e.ganador === null && e.apuesta && !e.revelar ? fin(e, 'dudo') : null);
export const calzar = (e) => (e.ganador === null && e.apuesta && !e.revelar && e.apuesta.de !== e.turno ? fin(e, 'calzo') : null);
export const ganador = (e) => e.ganador;

// Acción de la máquina o del jugador: { tipo: 'apostar', n, pinta } | { tipo: 'dudar' } | { tipo: 'calzar' }.
export function accion(e, a) {
  if (!a) return null;
  return a.tipo === 'apostar' ? apostar(e, a) : a.tipo === 'dudar' ? dudar(e) : a.tipo === 'calzar' ? calzar(e) : null;
}

// --- Con un amigo («dados justos», games/justo.js) ---
// Además de lo común (amigo, k, sellos, r, s): los dados de cada uno no van en la mesa (`dados` son ceros, solo dicen
// cuántos tiene) y salen de su semilla con la tirada k = ronda. Al dudar o calzar, `revelar` = { tipo, por, dados: [x, o] }:
// revela primero quien no hizo la jugada y luego el otro, que cierra la ronda. reveladas[k - 1] = los dados de la ronda k.
export const ocultar = (e) => ({ ...e, jugadores: e.jugadores.map((j) => ({ ...j, dados: j.dados.map(() => 0) })) });
export const nuevaAmigo = (sello) => ocultar({ ...nueva(2), g: null, turno: 1, amigo: true, k: 0, revelar: null, reveladas: [], sellos: { x: sello }, r: {}, s: {} });

function aRevelar(e, tipo) {
  const s = copia(e);
  s.revelar = { tipo, por: e.turno, dados: e.jugadores.map(() => null) };
  s.turno = e.apuesta.de;
  return s;
}

// Empieza la ronda: se pide la tirada k (la hora del servidor de `log/k` decide los dados de los dos).
export const empezarRonda = (e) => (e.amigo && e.ganador === null && !e.revelar && e.k === e.ronda - 1 ? { ...copia(e), k: e.k + 1 } : null);

// Quien tiene el turno revela sus dados de la ronda; si ya revelaron todos, se cierra la ronda con ellos.
export function revelar(e, dados) {
  const t = e.turno;
  if (!e.revelar || e.revelar.dados[t] || !esDados(dados, e.jugadores[t].dados.length)) return null;
  const s = copia(e);
  s.revelar.dados[t] = [...dados];
  if (s.revelar.dados.some((d) => !d)) {
    s.turno = s.revelar.dados.findIndex((d) => !d);
    return s;
  }
  const r = cerrar({ ...s, turno: s.revelar.por, jugadores: s.jugadores.map((j, i) => ({ ...j, dados: s.revelar.dados[i] })) }, s.revelar.tipo);
  return ocultar({ ...r, revelar: null, reveladas: [...s.reveladas, s.revelar.dados] });
}

// Pasos del juego de quien tiene el turno (ver jugadaRival en games/justo.js), con lo que eligió tomado de `e`.
export function pasosAmigo(w, e) {
  if (w.k < w.ronda) return [empezarRonda(w)];
  const t = w.turno, misma = e.ronda === w.ronda;
  if (w.revelar) return [revelar(w, misma ? e.revelar?.dados?.[t] : e.reveladas?.[w.ronda - 1]?.[t])];
  const a = misma ? e.apuestas?.[w.apuestas.length] : null;
  return [a && apostar(w, { n: a.n, pinta: a.pinta }), dudar(w), calzar(w)];
}

// Revisión final: los dados revelados de cada uno ({ k, j, d }), o null si alguna ronda (k) no tiene su revelación.
export function tiradasAmigo(e) {
  if (!Array.isArray(e.reveladas) || e.revelar || e.k !== e.reveladas.length || !e.reveladas.every((ds) => Array.isArray(ds) && ds.length === 2)) return null;
  return e.reveladas.flatMap((ds, i) => ds.map((d, j) => ({ k: i + 1, j, d })));
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
  const a = rnd() < 0.3 ? v[Math.floor(rnd() * Math.min(v.length, 6))] : (v.find((x) => x.pinta === mejor) ?? v[0]);
  return { tipo: 'apostar', n: a.n, pinta: a.pinta };
}

function listo(e, nivel, rnd) {
  const ap = e.apuesta, exacta = nivel === 'dificil';
  // La Difícil deduce que su pinta abunda donde los rivales apostaron (hasta +2).
  const deduce = (p) => (exacta ? Math.min(2, 0.5 * e.apuestas.filter((x) => x.de !== e.turno && x.pinta === p).length) : 0);
  // ponytail: afinado con simulaciones (Difícil > Normal > Fácil, ~62 % cada una contra la anterior). Normal calza con P(exacto) > 0,4 (con 0,2 perdía contra Fácil); Difícil con 0,3.
  const v = validas(e);
  let mejor = null, pm = -1;
  const ps = v.map((a) => prob(e, a, exacta, deduce(a.pinta)).mayor);
  ps.forEach((p, i) => { if (p > pm + 1e-9) [mejor, pm] = [v[i], p]; });
  if (exacta) { const i = ps.findIndex((p) => p >= pm - 0.3); if (i >= 0) mejor = v[i]; }
  if (ap) {
    const pr = prob(e, ap, exacta, deduce(ap.pinta));
    // Difícil: duda si es más probable que la apuesta sea falsa que la mejor subida verdadera (con un margen).
    if (!mejor || (exacta ? pr.mayor + pm * 0.8 < 0.5 : ap.n > pr.esperado + 1)) return { tipo: 'dudar' };
    if (ap.de !== e.turno && Math.abs(ap.n - pr.esperado) < 0.5 && pr.igual > (exacta ? 0.3 : 0.4)) return { tipo: 'calzar' };
  }
  if (!mejor) return { tipo: 'dudar' };
  if (exacta && rnd() < 0.3) { // farol: una apuesta mínima cualquiera
    const m = v.filter((a) => a.n === v[0].n), a = m[Math.floor(rnd() * m.length)];
    return { tipo: 'apostar', n: a.n, pinta: a.pinta };
  }
  return { tipo: 'apostar', n: mejor.n, pinta: mejor.pinta };
}

export function maquina(e, nivel, rnd = Math.random) {
  return nivel === 'facil' ? facil(e, rnd) : listo(e, nivel, rnd);
}
