// ♣️ Chinchón clásico (baraja española de 40), de 2 a 4, por rondas. Todo puro: cada acción devuelve un estado nuevo.
// Carta: { v: 1–10 (sota 8, caballo 9, rey 10), p }. Escalas por `v` del mismo palo: el 7 sigue con la sota; sin vuelta.
// Estado: { n, manos, mazo, descarte (arriba = último), turno, robo: null | 'mazo' | 'descarte' (lo que ya robó en este turno),
// robada (la recién tomada del descarte: no se puede botar), puntos, fuera: [bool] (eliminados), ronda, empieza,
// vueltas (veces que se rebarajó el descarte en esta ronda),
// vistas: [{ tomo: [c], boto: [c] }] (lo que cada uno hizo a la vista en esta ronda), ganador (índice o null), aviso: { j, t },
// resumen: { ronda, cerro, chinchon, filas: [{ j, juegos, sueltas, pts }] } }.
import { barajar } from './comun.js';
import { barajaEs, nombre } from './escoba.js';

export const LIMITE = 100; // quien pasa de esto queda fuera
export const PUNTOS = (c) => (c.v <= 7 ? c.v : c.v + 2);

const copia = (e) => structuredClone(e);
const igual = (a, b) => !!a && !!b && a.v === b.v && a.p === b.p;
const sumar = (cartas) => cartas.reduce((t, c) => t + PUNTOS(c), 0);
const porV = (a, b) => a.v - b.v;
const sin = (cartas, i) => cartas.filter((_, x) => x !== i);

// Las máscaras (sin la carta `i`) de las otras cartas libres que forman juego con ella: tríos/cuartetos y escalas que la contienen.
function juegosCon(cartas, i, libres) {
  const c = cartas[i];
  const otras = [...cartas.keys()].filter((k) => libres & (1 << k));
  const mismas = otras.filter((k) => cartas[k].v === c.v);
  const res = [];
  for (let a = 0; a < mismas.length; a++) {
    for (let b = a + 1; b < mismas.length; b++) {
      res.push((1 << mismas[a]) | (1 << mismas[b]));
      for (let d = b + 1; d < mismas.length; d++) res.push((1 << mismas[a]) | (1 << mismas[b]) | (1 << mismas[d]));
    }
  }
  const delPalo = new Map(otras.filter((k) => cartas[k].p === c.p).map((k) => [cartas[k].v, k]));
  let lo = c.v;
  let hi = c.v;
  while (delPalo.has(lo - 1)) lo--;
  while (delPalo.has(hi + 1)) hi++;
  for (let a = lo; a <= c.v; a++) {
    for (let b = Math.max(c.v, a + 2); b <= hi; b++) {
      let m = 0;
      for (let v = a; v <= b; v++) if (v !== c.v) m |= 1 << delPalo.get(v);
      res.push(m);
    }
  }
  return res;
}

// La forma de ordenar las cartas en juegos que deja menos puntos sueltos (búsqueda exhaustiva con memoria por máscara).
export function mejorForma(cartas) {
  const memo = new Map();
  const buscar = (libres) => {
    if (!libres) return { juegos: [], sueltas: [], pts: 0 };
    if (memo.has(libres)) return memo.get(libres);
    const i = 31 - Math.clz32(libres & -libres);
    const resto = libres & ~(1 << i);
    const r0 = buscar(resto);
    let mejor = { juegos: r0.juegos, sueltas: [cartas[i], ...r0.sueltas], pts: r0.pts + PUNTOS(cartas[i]) };
    for (const m of juegosCon(cartas, i, resto)) {
      const r = buscar(resto & ~m);
      if (r.pts < mejor.pts) {
        const juego = cartas.filter((_, k) => (m | (1 << i)) & (1 << k)).sort(porV);
        mejor = { juegos: [juego, ...r.juegos], sueltas: r.sueltas, pts: r.pts };
      }
    }
    memo.set(libres, mejor);
    return mejor;
  };
  return buscar((1 << cartas.length) - 1);
}

export function esChinchon(cartas) {
  const o = [...cartas].sort(porV);
  return o.length === 7 && o.every((c, k) => c.p === o[0].p && c.v === o[0].v + k);
}

const esTrio = (juego) => juego.every((c) => c.v === juego[0].v);
const cabe = (juego, c) => (esTrio(juego) ? juego.length === 3 && c.v === juego[0].v : c.p === juego[0].p && (c.v === juego[0].v - 1 || c.v === juego.at(-1).v + 1));

// Agrega a juegos ajenos (al trío de 3, o alargando una escala por una punta) las sueltas que dejen menos puntos: prueba cada
// suelta en cada juego donde cabe, o dejarla suelta (búsqueda exhaustiva; son pocas).
export function agregarSueltas(juegos, sueltas) {
  const buscar = (js, quedan) => {
    let mejor = { juegos: js, sueltas: quedan, pts: sumar(quedan) };
    quedan.forEach((c, x) => js.forEach((j, k) => {
      if (!cabe(j, c)) return;
      const r = buscar(js.map((g, y) => (y === k ? [...g, c].sort(porV) : g)), sin(quedan, x));
      if (r.pts < mejor.pts) mejor = r;
    }));
    return mejor;
  };
  const r = buscar(juegos.map((j) => [...j].sort(porV)), [...sueltas]);
  return { juegos: r.juegos, sueltas: r.sueltas };
}

// Todas las formas de ordenar las cartas en juegos (para elegir la que deja menos puntos después de agregar).
function* formas(cartas, libres = (1 << cartas.length) - 1) {
  if (!libres) return yield { juegos: [], sueltas: [] };
  const i = 31 - Math.clz32(libres & -libres);
  const resto = libres & ~(1 << i);
  for (const f of formas(cartas, resto)) yield { juegos: f.juegos, sueltas: [cartas[i], ...f.sueltas] };
  for (const m of juegosCon(cartas, i, resto)) {
    const juego = cartas.filter((_, k) => (m | (1 << i)) & (1 << k)).sort(porV);
    for (const f of formas(cartas, resto & ~m)) yield { juegos: [juego, ...f.juegos], sueltas: f.sueltas };
  }
}

// El siguiente que sigue en pie después de `j`.
function siguiente(e, j) {
  for (let k = 1; k <= e.n; k++) if (!e.fuera[(j + k) % e.n]) return (j + k) % e.n;
  return j;
}

function repartir(e, empieza, rnd) {
  const mazo = barajaEs(rnd);
  const manos = e.fuera.map((f) => (f ? [] : mazo.splice(-7)));
  return { ...e, manos, mazo, descarte: [mazo.pop()], turno: empieza, empieza, robo: null, robada: null, ronda: e.ronda + 1,
    vueltas: 0, vistas: manos.map(() => ({ tomo: [], boto: [] })), aviso: null };
}

export function nueva(n = 2, rnd = Math.random) {
  return repartir({ n, puntos: Array(n).fill(0), fuera: Array(n).fill(false), ronda: 0, ganador: null, resumen: null }, 0, rnd);
}

// Robar del mazo o la de arriba del descarte. Si el mazo se acabó, se baraja el descarte salvo la de arriba.
export function robar(e, de, rnd = Math.random) {
  if (e.ganador !== null || e.robo || !['mazo', 'descarte'].includes(de)) return null;
  if (de === 'descarte' ? !e.descarte.length : !e.mazo.length && e.descarte.length < 2) return null;
  const s = copia(e);
  const j = s.turno;
  let c;
  if (de === 'descarte') {
    c = s.descarte.pop();
    s.robada = c;
    s.vistas[j].tomo.push(c);
    s.aviso = { j, t: `tomó ${nombre(c)} del descarte` };
  } else {
    if (!s.mazo.length) {
      s.mazo = barajar(s.descarte.splice(0, s.descarte.length - 1), rnd);
      s.vueltas = (s.vueltas ?? 0) + 1;
    }
    c = s.mazo.pop();
    s.aviso = { j, t: 'robó del mazo' };
  }
  s.manos[j].push(c);
  s.robo = de;
  return s;
}

const puedeBotar = (e, i) => e.ganador === null && !!e.robo && !!e.manos[e.turno][i] && !igual(e.manos[e.turno][i], e.robada);

// Botar la carta `i` (ya robado; no la recién tomada del descarte): pasa el turno.
export function botar(e, i, rnd = Math.random) {
  if (!puedeBotar(e, i)) return null;
  const s = copia(e);
  const j = s.turno;
  const [c] = s.manos[j].splice(i, 1);
  s.descarte.push(c);
  const v = s.vistas[j];
  v.tomo = v.tomo.filter((x) => !igual(x, c));
  v.boto.push(c);
  s.aviso = { j, t: `botó ${nombre(c)}` };
  s.turno = siguiente(s, j);
  s.robo = null;
  s.robada = null;
  return s;
}

// Las cartas que, botadas, dejan las otras 7 con 3 o menos puntos sueltos.
export function cerrables(e) {
  const mano = e.manos[e.turno];
  if (e.ganador !== null || !e.robo || mano.length !== 8) return [];
  return [...mano.keys()].filter((i) => !igual(mano[i], e.robada) && mejorForma(sin(mano, i)).pts <= 3);
}

// Cerrar botando la carta `i`: se anotan los puntos sueltos (−10 sin sueltas; chinchón gana la partida). Los demás ordenan su mano
// y agregan sueltas a los juegos del que cerró. Quien pasa de 100 queda fuera; gana el último en pie (si no queda nadie, el de
// menos puntos). Si sigue, se reparte otra ronda y el estado conserva el resumen.
export function cerrar(e, i, rnd = Math.random) {
  if (!cerrables(e).includes(i)) return null;
  const s = copia(e);
  const j = s.turno;
  const [c] = s.manos[j].splice(i, 1);
  s.descarte.push(c);
  const propia = mejorForma(s.manos[j]);
  const chinchon = esChinchon(s.manos[j]);
  const filas = [{ j, juegos: propia.juegos, sueltas: propia.sueltas, pts: propia.pts || -10 }];
  let mesa = propia.juegos;
  for (let x = siguiente(s, j); x !== j; x = siguiente(s, x)) {
    let f = null;
    for (const forma of formas(s.manos[x])) {
      const r = agregarSueltas(mesa, forma.sueltas);
      const pts = sumar(r.sueltas);
      if (!f || pts < f.pts) f = { juegos: forma.juegos, mesa: r.juegos, sueltas: r.sueltas, pts };
    }
    mesa = f.mesa;
    filas.push({ j: x, juegos: f.juegos, sueltas: f.sueltas, pts: f.pts });
  }
  for (const f of filas) s.puntos[f.j] += f.pts;
  s.resumen = { ronda: s.ronda, cerro: j, chinchon, filas };
  s.aviso = { j, t: chinchon ? '¡hizo chinchón!' : `cerró botando ${nombre(c)}` };
  const seguian = [...s.fuera.keys()].filter((x) => !s.fuera[x]);
  s.fuera = s.puntos.map((p, x) => s.fuera[x] || p > LIMITE);
  const vivos = seguian.filter((x) => !s.fuera[x]);
  if (chinchon) s.ganador = j;
  else if (vivos.length === 1) s.ganador = vivos[0];
  else if (!vivos.length) s.ganador = seguian.reduce((a, x) => (s.puntos[x] < s.puntos[a] ? x : a));
  if (s.ganador !== null) {
    s.robo = null;
    s.robada = null;
    return s;
  }
  return { ...repartir(s, siguiente(s, s.empieza), rnd), resumen: s.resumen, aviso: s.aviso };
}

// --- 🤖 Máquina (solo mira su mano, el descarte y lo que los demás hicieron a la vista) ---

// Qué tan buena es una mano de 7: puntos sueltos, menos 3 por cada par de sueltas que se acercan a un juego (mismo número, o
// mismo palo a 1 o 2 de distancia).
function nota(cartas, forma = mejorForma(cartas)) {
  const s = forma.sueltas;
  let cerca = 0;
  for (let a = 0; a < s.length; a++) for (let b = a + 1; b < s.length; b++) if (s[a].v === s[b].v || (s[a].p === s[b].p && Math.abs(s[a].v - s[b].v) <= 2)) cerca++;
  return forma.pts - 3 * cerca;
}

// Para cada carta que se puede botar: la forma y la nota de las 7 que quedan.
const opciones = (mano, robada) => [...mano.keys()].filter((i) => !igual(mano[i], robada)).map((i) => {
  const resto = sin(mano, i);
  const forma = mejorForma(resto);
  return { i, forma, nota: nota(resto, forma), chinchon: esChinchon(resto) };
});
const menor = (lista, f) => lista.reduce((a, x) => (f(x) < f(a) ? x : a));

// Le falta una carta para el chinchón: 6 seguidas del mismo palo.
const faltaChinchon = (mano) => mano.some((c) => [1, 2, 3, 4, 5].every((k) => mano.some((x) => x.p === c.p && x.v === c.v + k)));

// Cuánto le sirve la carta al siguiente rival, según lo que tomó del descarte (y no botó) y lo que botó.
function peligro(e, c) {
  const v = e.vistas?.[siguiente(e, e.turno)];
  if (!v) return 0;
  const sirve = v.tomo.filter((x) => x.v === c.v || (x.p === c.p && Math.abs(x.v - c.v) <= 2)).length;
  return v.boto.some((x) => x.v === c.v) ? 0 : sirve;
}

// { robar: 'mazo' | 'descarte' } | { botar: i } | { cerrar: i }
export function maquina(e, nivel = 'normal', rnd = Math.random) {
  const mano = e.manos[e.turno];
  const arriba = e.descarte.at(-1);
  if (!e.robo) {
    if (!arriba) return { robar: 'mazo' };
    if (!e.mazo.length && e.descarte.length < 2) return { robar: 'descarte' };
    const con = [...mano, arriba];
    if (nivel === 'facil') return { robar: mejorForma(con).juegos.some((j) => j.includes(arriba)) ? 'descarte' : 'mazo' };
    const mejor = menor(opciones(con, arriba), (o) => o.nota);
    // La Difícil no siempre bota la de menor nota (espera el −10, evita darle cartas al rival): para no pasarse la misma
    // carta con otra máquina sin fin, solo toma del descarte lo que entra en un juego.
    const toma = mejor.nota < nota(mano) - 2 && (nivel !== 'dificil' || mejor.forma.juegos.some((j) => j.includes(arriba)));
    return { robar: toma ? 'descarte' : 'mazo' };
  }
  const ops = opciones(mano, e.robada);
  const cierres = ops.filter((o) => o.forma.pts <= 3);
  const chin = cierres.find((o) => o.chinchon);
  if (chin) return { cerrar: chin.i };
  const cierre = cierres.length ? menor(cierres, (o) => o.forma.pts) : null;
  const quedaMazo = e.mazo.length > 0;
  // ponytail: con el mazo ya rebarajado, a veces bota al azar una de sus 3 mejores opciones: si nadie suelta lo que otro
  // necesita, la ronda no terminaría nunca. Una regla de fin de ronda (como en la Carioca) si llega a hacer falta para personas.
  if (!cierre && e.vueltas && rnd() < 0.3) return { botar: [...ops].sort((a, b) => a.nota - b.nota)[Math.floor(rnd() * Math.min(3, ops.length))].i };
  if (nivel === 'facil') {
    if (cierre) return { cerrar: cierre.i };
    const sueltas = mejorForma(mano).sueltas.filter((c) => !igual(c, e.robada));
    if (sueltas.length) return { botar: mano.indexOf(menor(sueltas, (c) => -PUNTOS(c))) };
    return { botar: menor(ops, (o) => o.nota).i };
  }
  if (nivel === 'dificil' && cierre) {
    // Le falta una carta para el −10: guarda la suelta chica y bota la otra.
    if (cierre.forma.pts && cierre.forma.sueltas.length === 1 && quedaMazo) return { botar: cierre.i };
  }
  if (cierre && !(faltaChinchon(mano) && quedaMazo)) return { cerrar: cierre.i };
  const mejor = menor(ops, (o) => o.nota);
  if (nivel !== 'dificil') return { botar: mejor.i };
  // Difícil: entre las opciones parecidas, la que menos le sirve al siguiente.
  const parecidas = ops.filter((o) => o.nota <= mejor.nota + 2);
  return { botar: menor(parecidas, (o) => peligro(e, mano[o.i]) * 100 + o.nota).i };
}

export function accion(e, a, rnd = Math.random) {
  if (a?.robar) return robar(e, a.robar, rnd);
  if (a?.cerrar !== undefined) return cerrar(e, a.cerrar, rnd);
  if (a?.botar !== undefined) return botar(e, a.botar, rnd);
  return null;
}
