// ⚔️ Truco chileno (baraja española de 40), 1 contra 1, a 24 puntos. Todo puro: cada acción devuelve un estado nuevo.
// Carta: { v: 1–10 (sota 8, caballo 9, rey 10), p }.
// Estado: { n: 2, manos: [[c], [c]] (las que quedan), bazas: [{ c: [c0 | null, c1 | null], gana: 0 | 1 | 'parda' | null, sale (quien
// tiró primero) }], mano (quien es mano esta ronda), turno (quien debe actuar ahora), juega (a quien le toca tirar carta), puntos,
// ronda, envido: { cantos: [], quien (el último que cantó), estado: null | 'pendiente' | 'querido' | 'no', tantos? },
// truco: { nivel: 0–3 (lo querido), cantado: 0–3, quien (el último que cantó), quiero (quien puede subir; null: cualquiera),
// pendiente }, notas: [{ j, t }] (lo anotado en esta ronda), ganador, aviso: { j, t }, resumen: { ronda, lineas: [{ j, t }] } }.
// Las líneas del resumen dicen quién se anota (`j`) y qué («Truco querido, +2»); la app pone los nombres.
import { barajaEs, nombre, PALOS_ES } from './escoba.js';

export const META = 24;
export const CANTOS = { envido: 'Envido', real: 'Real envido', falta: 'Falta envido', truco: 'Truco', retruco: 'Retruco', vale4: 'Vale cuatro' };
const ENVIDOS = ['envido', 'real', 'falta'];
const TRUCOS = ['truco', 'retruco', 'vale4'];
const VALOR = [1, 2, 3, 4]; // lo que vale la ronda según el nivel del truco
const VALOR_ENVIDO = { envido: 2, real: 3 };

// De mayor a menor: cada grupo empata entre sí.
const ORDEN = ['1espadas', '1bastos', '7espadas', '7oros', '3', '2', '1copas 1oros', '10', '9', '8', '7copas 7bastos', '6', '5', '4'];
export function JERARQUIA(c) {
  return ORDEN.length - ORDEN.findIndex((g) => g.split(' ').some((k) => k === `${c.v}${c.p}` || k === `${c.v}`));
}

const puntoEnvido = (c) => (c.v <= 7 ? c.v : 0);
// Dos del mismo palo: 20 + sus números (figuras 0); si no, la carta más alta. La mejor combinación.
export function tanto(cartas) {
  let mejor = Math.max(0, ...cartas.map(puntoEnvido));
  for (let a = 0; a < cartas.length; a++) for (let b = a + 1; b < cartas.length; b++) {
    if (cartas[a].p === cartas[b].p) mejor = Math.max(mejor, 20 + puntoEnvido(cartas[a]) + puntoEnvido(cartas[b]));
  }
  return mejor;
}

// Quién gana la ronda según los ganadores de las bazas jugadas (0, 1 o 'parda'); null si sigue.
export function ganaRonda(g, mano) {
  for (const j of [0, 1]) if (g.filter((x) => x === j).length === 2) return j;
  if (g.length < 2) return null;
  if (g[0] === 'parda') return g.slice(1).find((x) => x !== 'parda') ?? (g.length === 3 ? mano : null);
  if (g[1] === 'parda') return g[0];
  return g.length < 3 ? null : g[2] === 'parda' ? g[0] : g[2];
}

function repartir(e, mano, rnd) {
  const mazo = barajaEs(rnd);
  return { ...e, manos: [mazo.splice(-3), mazo.splice(-3)], bazas: [{ c: [null, null], gana: null, sale: mano }], mano, turno: mano, juega: mano,
    ronda: e.ronda + 1, envido: { cantos: [], quien: null, estado: null }, truco: { nivel: 0, cantado: 0, quien: null, quiero: null, pendiente: false },
    notas: [], aviso: null };
}

// `n` se ignora (siempre son 2); se acepta `nueva(rnd)` también.
export function nueva(n = 2, rnd = Math.random) {
  if (typeof n === 'function') rnd = n;
  return repartir({ n: 2, puntos: [0, 0], ronda: 0, ganador: null, resumen: null }, 0, rnd);
}

// Las 3 cartas con que empezó la ronda (el envido solo se juega en la primera baza).
const cartasDe = (e, j) => [...e.manos[j], ...(e.bazas[0].c[j] ? [e.bazas[0].c[j]] : [])];
const subidasEnvido = (cantos) => {
  const u = cantos.at(-1);
  if (u === 'falta') return [];
  if (u === 'real') return ['falta'];
  return cantos.length >= 2 ? ['real', 'falta'] : ENVIDOS;
};

// Las acciones legales de `e.turno`.
export function acciones(e) {
  if (e.ganador !== null) return [];
  const j = e.turno;
  const { envido: en, truco: tr } = e;
  const res = [];
  const cantar = (canto) => res.push({ canto });
  // Envido: en la primera baza, antes de tirar su carta, si no se jugó otro ni se quiso un truco.
  const envidoAbierto = en.estado === null && e.bazas.length === 1 && !e.bazas[0].c[j] && tr.nivel === 0;
  if (en.estado === 'pendiente') {
    res.push({ quiero: true }, { quiero: false });
    subidasEnvido(en.cantos).forEach(cantar);
  } else if (tr.pendiente) {
    res.push({ quiero: true }, { quiero: false });
    if (tr.cantado < 3) cantar(TRUCOS[tr.cantado]);
    if (envidoAbierto) ENVIDOS.forEach(cantar); // «el envido está primero»
  } else {
    e.manos[j].forEach((_, carta) => res.push({ carta }));
    if (envidoAbierto) ENVIDOS.forEach(cantar);
    if (tr.cantado < 3 && (tr.quiero === null || tr.quiero === j)) cantar(TRUCOS[tr.cantado]);
    res.push({ mazo: true });
  }
  return res;
}

function anotar(s, j, pts, t) {
  s.puntos[j] += pts;
  s.notas.push({ j, t });
  if (s.puntos[j] >= META && s.ganador === null) s.ganador = j;
}

// Fin de la ronda: el resumen y, si nadie llegó a 24, la ronda siguiente (la mano alterna).
function cerrar(s, rnd) {
  s.resumen = { ronda: s.ronda, lineas: s.notas };
  if (s.ganador !== null) return s;
  return { ...repartir(s, 1 - s.mano, rnd), resumen: s.resumen, aviso: s.aviso };
}

const sumaEnvido = (cantos) => cantos.reduce((t, k) => t + VALOR_ENVIDO[k], 0);

function responderEnvido(s, si, rnd) {
  const en = s.envido;
  const j = s.turno;
  if (si) {
    const t = [0, 1].map((x) => tanto(cartasDe(s, x)));
    const w = t[0] === t[1] ? s.mano : t[0] > t[1] ? 0 : 1;
    const falta = en.cantos.includes('falta');
    const pts = falta ? META - Math.max(...s.puntos) : sumaEnvido(en.cantos);
    en.estado = 'querido';
    en.tantos = t;
    s.aviso = { j: w, t: `ganó el envido: ${t[w]} contra ${t[1 - w]}` };
    anotar(s, w, pts, `${falta ? 'Falta envido' : 'Envido'} querido: ${t[w]} contra ${t[1 - w]}, +${pts}`);
  } else {
    const pts = Math.max(1, sumaEnvido(en.cantos.slice(0, -1)));
    en.estado = 'no';
    s.aviso = { j, t: 'no quiso' };
    anotar(s, en.quien, pts, `${CANTOS[en.cantos.at(-1)]} no querido, +${pts}`);
  }
  if (s.ganador !== null) return cerrar(s, rnd);
  s.turno = s.truco.pendiente ? 1 - s.truco.quien : s.juega; // si había un truco esperando, se responde ahora
  return s;
}

function responderTruco(s, si, rnd) {
  const tr = s.truco;
  const j = s.turno;
  s.aviso = { j, t: si ? 'quiso' : 'no quiso' };
  if (si) {
    tr.nivel = tr.cantado;
    tr.quiero = j;
    tr.pendiente = false;
    s.turno = s.juega;
    return s;
  }
  const pts = VALOR[tr.cantado - 1];
  anotar(s, tr.quien, pts, `${CANTOS[TRUCOS[tr.cantado - 1]]} no querido, +${pts}`);
  return cerrar(s, rnd);
}

function tirar(s, i, rnd) {
  const j = s.turno;
  const o = 1 - j;
  const b = s.bazas.at(-1);
  const [c] = s.manos[j].splice(i, 1);
  b.c[j] = c;
  s.aviso = { j, t: `jugó ${nombre(c)}` };
  if (!b.c[o]) {
    s.turno = s.juega = o;
    return s;
  }
  const d = JERARQUIA(b.c[0]) - JERARQUIA(b.c[1]);
  b.gana = d > 0 ? 0 : d < 0 ? 1 : 'parda';
  const w = ganaRonda(s.bazas.map((x) => x.gana), s.mano);
  if (w !== null) {
    const v = VALOR[s.truco.nivel];
    anotar(s, w, v, s.truco.nivel ? `${CANTOS[TRUCOS[s.truco.nivel - 1]]} querido, +${v}` : 'Ganó la ronda, +1');
    return cerrar(s, rnd);
  }
  const sale = b.gana === 'parda' ? b.sale : b.gana; // quien gana la baza sale en la siguiente; en parda, el mismo
  s.bazas.push({ c: [null, null], gana: null, sale });
  s.turno = s.juega = sale;
  return s;
}

export function accion(e, a, rnd = Math.random) {
  const k = JSON.stringify(a);
  if (!acciones(e).some((x) => JSON.stringify(x) === k)) return null;
  const s = structuredClone(e);
  const j = s.turno;
  if (a.carta !== undefined) return tirar(s, a.carta, rnd);
  if (a.quiero !== undefined) return s.envido.estado === 'pendiente' ? responderEnvido(s, a.quiero, rnd) : responderTruco(s, a.quiero, rnd);
  if (a.mazo) {
    // El rival se anota lo que vale el truco; en la primera baza sin envido cantado, 1 más.
    const v = VALOR[s.truco.nivel] + (s.bazas.length === 1 && s.envido.estado === null ? 1 : 0);
    s.aviso = { j, t: 'se fue al mazo' };
    anotar(s, 1 - j, v, `Su rival se fue al mazo, +${v}`);
    return cerrar(s, rnd);
  }
  if (ENVIDOS.includes(a.canto)) {
    Object.assign(s.envido, { quien: j, estado: 'pendiente' });
    s.envido.cantos.push(a.canto);
  } else {
    const tr = s.truco;
    if (tr.pendiente) tr.nivel = tr.cantado; // subir es querer lo anterior
    Object.assign(tr, { cantado: tr.cantado + 1, quien: j, pendiente: true });
  }
  s.turno = 1 - j;
  s.aviso = { j, t: `cantó ${CANTOS[a.canto]}` };
  return s;
}

// --- 🤖 Máquina (solo mira su mano, las cartas jugadas y los cantos; del rival solo sabe cuántas cartas le quedan) ---

const TODAS = PALOS_ES.flatMap((p) => Array.from({ length: 10 }, (_, i) => ({ v: i + 1, p })));
const igual = (a, b) => a.v === b.v && a.p === b.p;
const sinVer = (vistas) => TODAS.filter((c) => !vistas.some((x) => igual(x, c)));
// `k` al azar de `lista` (sin repetir).
function muestra(lista, k, rnd) {
  const a = [...lista];
  for (let i = 0; i < k; i++) {
    const x = i + Math.floor(rnd() * (a.length - i));
    [a[i], a[x]] = [a[x], a[i]];
  }
  return a.slice(0, k);
}

// Qué carta tirar (índice), con las fuerzas de la mano: la más baja que gana la que está en la mesa (o la más baja si ninguna
// gana); saliendo, la más baja, o la más alta si ya perdió una baza.
function politica(mano, contra, g, j) {
  const orden = [...mano.keys()].sort((a, b) => mano[a] - mano[b]);
  if (contra !== null) return orden.find((i) => mano[i] > contra) ?? orden[0];
  return g.includes(1 - j) ? orden.at(-1) : orden[0];
}

// Juega lo que queda de la ronda con fuerzas (los dos con `politica`; `primera`: la carta que tira primero quien juega) y dice
// quién la gana.
function simular(g, mesa, sale, manos, juega, mano, primera) {
  for (;;) {
    const w = ganaRonda(g, mano);
    if (w !== null) return w;
    const j = juega;
    const o = 1 - j;
    const i = primera ?? politica(manos[j], mesa[o], g, j);
    primera = null;
    mesa[j] = manos[j].splice(i, 1)[0];
    if (mesa[o] === null) {
      sale = j;
      juega = o;
      continue;
    }
    const d = mesa[0] - mesa[1];
    const r = d > 0 ? 0 : d < 0 ? 1 : 'parda';
    g.push(r);
    juega = r === 'parda' ? sale : r;
    mesa = [null, null];
  }
}

// Probabilidad de ganar la ronda para `j`, repartiendo al rival al azar las cartas que no ha visto. Con `memoria` descuenta todas
// las cartas jugadas; sin ella, solo las de la baza en curso (las ve en la mesa).
function probRonda(e, j, primera, memoria, rnd, veces = 120) {
  const o = 1 - j;
  const b = e.bazas.at(-1);
  const vistas = (memoria ? e.bazas : [b]).flatMap((x) => x.c).filter(Boolean);
  const resto = sinVer([...e.manos[j], ...vistas]).map(JERARQUIA);
  const g0 = e.bazas.slice(0, -1).map((x) => x.gana);
  const mesa0 = b.c.map((c) => (c ? JERARQUIA(c) : null));
  const mia = e.manos[j].map(JERARQUIA);
  let gana = 0;
  for (let k = 0; k < veces; k++) {
    const manos = [];
    manos[j] = [...mia];
    manos[o] = muestra(resto, e.manos[o].length, rnd);
    if (simular([...g0], [...mesa0], b.sale, manos, e.juega, e.mano, primera) === j) gana++;
  }
  return gana / veces;
}

// Probabilidad de ganar el envido. Normal: una estimación por su tanto. Difícil: reparte al rival lo que no ha visto (sabiendo la
// carta que tiró en la primera baza, si la tiró).
function probEnvido(e, j, memoria, rnd, veces = 200) {
  const mias = cartasDe(e, j);
  const t = tanto(mias);
  if (!memoria) return Math.min(0.95, Math.max(0.05, (t - 18) / 15));
  const tiro = e.bazas[0].c[1 - j];
  const resto = sinVer([...mias, ...(tiro ? [tiro] : [])]);
  let gana = 0;
  for (let k = 0; k < veces; k++) {
    const r = tanto([...(tiro ? [tiro] : []), ...muestra(resto, tiro ? 2 : 3, rnd)]);
    if (t > r || (t === r && e.mano === j)) gana++;
  }
  return gana / veces;
}

// La Difícil prueba cada carta (de la más baja a la más alta) y se queda con la que da más probabilidad de ganar la ronda, si
// mejora en algo a la más baja.
function mejorCarta(e, j, rnd) {
  const f = e.manos[j].map(JERARQUIA);
  const orden = [...f.keys()].sort((a, b) => f[a] - f[b]);
  let mejor = orden[0];
  let pm = -1;
  for (const i of orden) {
    const p = probRonda(e, j, i, true, rnd, 100);
    if (p > pm + 0.02) {
      pm = p;
      mejor = i;
    }
  }
  return mejor;
}

// { carta: i } | { canto } | { quiero } (la máquina nunca se va al mazo: le cuesta lo mismo o más que perder jugando).
export function maquina(e, nivel = 'normal', rnd = Math.random) {
  const ops = acciones(e).map((a) => JSON.stringify(a));
  const hay = (canto) => ops.includes(JSON.stringify({ canto }));
  const j = e.turno;
  const tr = e.truco;
  const envido = hay('envido') || hay('real') || hay('falta');
  const truco = TRUCOS.find(hay);
  const respondiendo = ops.includes('{"quiero":true}');
  if (nivel === 'facil') {
    if (respondiendo) return { quiero: rnd() < 0.5 };
    if (hay('envido') && tanto(cartasDe(e, j)) >= 30) return { canto: 'envido' };
    if (truco && rnd() < 0.05) return { canto: truco };
    return { carta: Math.floor(rnd() * e.manos[j].length) };
  }
  const memoria = nivel === 'dificil';
  if (e.envido.estado === 'pendiente') {
    const p = probEnvido(e, j, memoria, rnd);
    if (p > 0.8 && hay('real')) return { canto: 'real' };
    if (p > 0.9 && hay('falta')) return { canto: 'falta' };
    return { quiero: p > (e.envido.cantos.includes('falta') ? 0.6 : 0.45) };
  }
  // Cantar envido (también como «el envido está primero»); la Difícil a veces miente.
  if (envido) {
    const p = probEnvido(e, j, memoria, rnd);
    if (p > 0.62 || (memoria && !respondiendo && rnd() < 0.15)) return { canto: p > 0.85 ? 'real' : 'envido' };
  }
  if (tr.pendiente) {
    // Querer conviene si (2p − 1)·V > −(V − 1), o sea p > 1 / 2V; con margen.
    const p = probRonda(e, j, null, memoria, rnd);
    if (truco && p > 0.8) return { canto: truco };
    return { quiero: p > 1 / (2 * VALOR[tr.cantado]) + 0.15 };
  }
  if (truco && (probRonda(e, j, null, memoria, rnd) > 0.7 || (memoria && rnd() < 0.2))) return { canto: truco };
  if (memoria) return { carta: mejorCarta(e, j, rnd) };
  const contra = e.bazas.at(-1).c[1 - j];
  return { carta: politica(e.manos[j].map(JERARQUIA), contra ? JERARQUIA(contra) : null, e.bazas.map((b) => b.gana).filter((x) => x !== null), j) };
}
