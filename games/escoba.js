// 🧹 Escoba de 15 (baraja española de 40), a dos, por rondas. Todo puro: cada acción devuelve un estado nuevo.
// Carta: { v: 1–10 (sota 8, caballo 9, rey 10), p: 'oros' | 'copas' | 'espadas' | 'bastos' }.
// Estado: { n: 2, manos, mesa, mazo, llevadas: [[cartas]], escobas, ultimo (el último que se llevó), turno, puntos, ronda,
// ganador (índice o null), aviso: { j, t }, resumen: { ronda, filas: [{ t, valores, pts }], suma } }.
import { barajar } from './comun.js';

export const META = 15;
export const PALOS_ES = ['oros', 'copas', 'espadas', 'bastos'];
export const EMOJI = { oros: '🪙', copas: '🏆', espadas: '⚔️', bastos: '🪵' };
export const VALOR_ES = ['1', '2', '3', '4', '5', '6', '7', 'S', 'C', 'R'];
const NOMBRES = ['As', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Sota', 'Caballo', 'Rey'];
export const nombre = (c) => `${VALOR_ES[c.v - 1]}${EMOJI[c.p]}`;
export const nombreLargo = (c) => `${NOMBRES[c.v - 1]} de ${c.p}`;

const copia = (e) => structuredClone(e);
const suma = (cartas) => cartas.reduce((t, c) => t + c.v, 0);
export const barajaEs = (rnd = Math.random) => barajar(PALOS_ES.flatMap((p) => NOMBRES.map((_, i) => ({ v: i + 1, p }))), rnd);

export function nueva(n = 2, rnd = Math.random) {
  return repartir({ n: 2, puntos: [0, 0], ronda: 0, ganador: null, resumen: null }, rnd);
}

// 3 a cada uno y 4 a la mesa; reparten por turnos y empieza el otro. Si la mesa suma 15, es escoba de quien reparte.
function repartir(e, rnd) {
  const mazo = barajaEs(rnd);
  const ronda = e.ronda + 1;
  const reparte = ronda % 2;
  const s = { ...e, mazo, manos: [mazo.splice(-3), mazo.splice(-3)], mesa: mazo.splice(-4), llevadas: [[], []], escobas: [0, 0], ultimo: null, turno: 1 - reparte, ronda, aviso: null };
  if (suma(s.mesa) === 15) {
    s.llevadas[reparte].push(...s.mesa);
    s.mesa = [];
    s.escobas[reparte]++;
    s.ultimo = reparte;
    s.aviso = { j: reparte, t: '¡escoba al repartir! La mesa sumaba 15' };
  }
  return s;
}

// Las formas de llevarse cartas con la carta `i` de la mano: listas de índices de la mesa que con ella suman 15.
export const opciones = (e, i) => formasDe(e.mesa, 15 - e.manos[e.turno][i].v);
function formasDe(mesa, falta) {
  const formas = [];
  const buscar = (desde, quedan, elegidas) => {
    if (!quedan && elegidas.length) return formas.push(elegidas);
    for (let x = desde; x < mesa.length; x++) if (mesa[x].v <= quedan) buscar(x + 1, quedan - mesa[x].v, [...elegidas, x]);
  };
  buscar(0, falta, []);
  return formas;
}

// Tira la carta `i`: si suma 15 con cartas de la mesa se las lleva (la forma `k`); si no, queda en la mesa.
export function jugar(e, i, k = 0, rnd = Math.random) {
  const c = e.manos[e.turno]?.[i];
  const formas = c ? opciones(e, i) : [];
  if (e.ganador !== null || !c || (formas.length && !formas[k])) return null;
  const s = copia(e);
  const j = s.turno;
  s.manos[j].splice(i, 1);
  if (formas.length) {
    const toma = formas[k];
    const llevo = [c, ...toma.map((x) => s.mesa[x])];
    s.mesa = s.mesa.filter((_, x) => !toma.includes(x));
    s.llevadas[j].push(...llevo);
    s.ultimo = j;
    if (!s.mesa.length) s.escobas[j]++;
    s.aviso = { j, t: `${s.mesa.length ? '' : '¡escoba! '}se llevó ${llevo.map(nombre).join(' ')}` };
  } else {
    s.mesa.push(c);
    s.aviso = { j, t: `tiró ${nombre(c)}` };
  }
  s.turno = 1 - j;
  if (s.manos.every((m) => !m.length)) {
    if (!s.mazo.length) return cerrarRonda(s, rnd);
    for (const m of s.manos) m.push(...s.mazo.splice(-3));
  }
  return s;
}

// Lo que queda en la mesa es del último que se llevó. +1 por escoba, y +1 a quien tenga más cartas, más oros, más sietes
// y el 7 de oros (empate: nadie). Gana quien llega a 15; si los dos llegan con los mismos puntos, otra ronda.
function cerrarRonda(s, rnd) {
  const quien = s.ultimo ?? s.turno;
  s.llevadas[quien].push(...s.mesa);
  s.mesa = [];
  const cuenta = (f) => s.llevadas.map((l) => l.filter(f).length);
  const mas = ([a, b]) => [a > b ? 1 : 0, b > a ? 1 : 0];
  const filas = [
    { t: '🧹 Escobas', valores: s.escobas, pts: s.escobas },
    ...[
      ['🂠 Más cartas', () => true],
      ['🪙 Más oros', (c) => c.p === 'oros'],
      ['7️⃣ Más sietes', (c) => c.v === 7],
      ['✨ 7 de oros', (c) => c.v === 7 && c.p === 'oros'],
    ].map(([t, f]) => ({ t, valores: cuenta(f), pts: mas(cuenta(f)) })),
  ];
  const ganados = [0, 1].map((j) => filas.reduce((t, f) => t + f.pts[j], 0));
  s.puntos = s.puntos.map((pts, j) => pts + ganados[j]);
  s.resumen = { ronda: s.ronda, filas, suma: ganados };
  const [a, b] = s.puntos;
  if (Math.max(a, b) >= META && a !== b) {
    s.ganador = a > b ? 0 : 1;
    return s;
  }
  return { ...repartir(s, rnd), resumen: s.resumen };
}

// 🤖 La máquina: si se puede llevar algo, lo que más vale (escoba, 7 de oros, sietes, oros); si no, tira lo que menos
// vale cuidando no dejar la mesa entre 5 y 14 (el otro haría escoba con una sola carta).
const precio = (c) => 1 + (c.p === 'oros' ? 3 : 0) + (c.v === 7 ? 4 : 0) + (c.v === 7 && c.p === 'oros' ? 20 : 0);
export function maquina(e, nivel = 'normal') {
  if (nivel === 'dificil') return maquinaDificil(e);
  let mejor = null;
  e.manos[e.turno].forEach((c, i) => {
    const formas = opciones(e, i);
    const jugadas = formas.length
      ? formas.map((t, k) => ({ jugar: i, k, nota: 1000 + (t.length === e.mesa.length ? 100 : 0) + precio(c) + t.reduce((s, x) => s + precio(e.mesa[x]), 0) }))
      : [{ jugar: i, k: 0, nota: -2 * precio(c) - (suma(e.mesa) + c.v >= 5 && suma(e.mesa) + c.v <= 14 ? 50 : 0) + c.v / 100 }];
    for (const j of jugadas) if (!mejor || j.nota > mejor.nota) mejor = j;
  });
  return { jugar: mejor.jugar, k: mejor.k };
}

// 🤖 Difícil: lleva la cuenta de las cartas que ya salieron (la mano propia, la mesa y lo llevado) y, para cada jugada,
// resta lo peor que podría llevarse el otro con la mesa que queda, según la probabilidad de que tenga cada número.
const peso = (c) => 0.5 + (c.p === 'oros' ? 1 : 0) + (c.v === 7 ? 2 : 0) + (c.v === 7 && c.p === 'oros' ? 6 : 0);
const ESCOBA = 10;
function maquinaDificil(e) {
  const yo = e.turno;
  const vistas = new Set([...e.manos[yo], ...e.mesa, ...e.llevadas.flat()].map((c) => c.v + c.p));
  const ocultas = barajaEs(() => 0).filter((c) => !vistas.has(c.v + c.p));
  const h = e.manos[1 - yo].length || (e.mazo.length ? 3 : 0);
  // Probabilidad de que el otro tenga al menos un `v` (sus h cartas salen de las ocultas).
  const tiene = (v) => {
    const m = ocultas.filter((c) => c.v === v).length;
    let nada = 1;
    for (let x = 0; x < h; x++) nada *= Math.max(0, ocultas.length - m - x) / (ocultas.length - x);
    return 1 - nada;
  };
  const prob = Array.from({ length: 11 }, (_, v) => (v ? tiene(v) : 0));
  const peligro = (mesa) => {
    let peor = 0;
    for (let v = 1; v <= 10; v++) {
      if (!prob[v]) continue;
      for (const t of formasDe(mesa, 15 - v)) peor = Math.max(peor, prob[v] * (t.reduce((s, x) => s + peso(mesa[x]), 0) + (t.length === mesa.length ? ESCOBA : 0)));
    }
    return peor;
  };
  let mejor = null;
  e.manos[yo].forEach((c, i) => {
    const formas = opciones(e, i);
    const jugadas = formas.length
      ? formas.map((t, k) => {
          const queda = e.mesa.filter((_, x) => !t.includes(x));
          return { jugar: i, k, nota: peso(c) + t.reduce((s, x) => s + peso(e.mesa[x]), 0) + (queda.length ? 0 : ESCOBA) - peligro(queda) };
        })
      : [{ jugar: i, k: 0, nota: -peligro([...e.mesa, c]) - peso(c) / 2 }];
    for (const j of jugadas) if (!mejor || j.nota > mejor.nota) mejor = j;
  });
  return { jugar: mejor.jugar, k: mejor.k };
}

export const accion = (e, a, rnd = Math.random) => jugar(e, a.jugar, a.k ?? 0, rnd);
