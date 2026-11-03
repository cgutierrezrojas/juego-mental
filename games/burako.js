// 🀄 Burako: 106 fichas (1–13 en 4 colores ×2 y 2 comodines), 11 al atril, 2 muertos, hasta 3000 puntos. Todo puro.
// Equipos: el jugador j es del equipo j % 2 (a dos, cada uno es su equipo; a cuatro, 0 y 2 contra 1 y 3).
// Estado: { n, ronda (la mano), reparte, turno, fase: 'robar' | 'jugar' | 'fin', manos, mazo, pozo,
// muertos: [fichas | null] por equipo (null: ya lo tomó), mesa: [[juegos]] por equipo, puntos: [n] por equipo,
// ganador (equipo), aviso: { j, t }, resumen: { ronda, cierra (equipo | null), filas: [{ juegos, burakos, cierre, muerto, atril, total }] } }.
import { barajar } from './comun.js';
import * as R from './rummy.js';

export const COLORES = ['rojo', 'azul', 'amarillo', 'negro'];
export const META = 3000;
export const equipo = (j) => j % 2;
export const esComodin = (c) => c.v === 0 || c.v === 2;
export const nombre = (c) => (c.v === 0 ? 'comodín' : `${c.v} ${c.p}`);
export const valor = (c) => (c.v === 0 ? 50 : c.v === 1 ? 15 : c.v === 2 ? 20 : c.v <= 7 ? 5 : 10);
const suma = (fichas) => fichas.reduce((t, c) => t + valor(c), 0);
export const esBurako = (juego) => juego.cartas.length >= 7;

const copia = (e) => structuredClone(e);
const fichas = () => [
  ...[0, 1].flatMap(() => COLORES.flatMap((p) => Array.from({ length: 13 }, (_, i) => ({ v: i + 1, p })))),
  { ...R.COMODIN }, { ...R.COMODIN },
];

export function nueva(n, rnd = Math.random) {
  return repartir({ n, ronda: 0, reparte: n - 1, puntos: [0, 0], ganador: null, resumen: null }, rnd);
}

function repartir(e, rnd) {
  const mazo = barajar(fichas(), rnd);
  const reparte = (e.reparte + 1) % e.n;
  return { ...e, mazo, manos: Array.from({ length: e.n }, () => mazo.splice(-11)), muertos: [mazo.splice(-11), mazo.splice(-11)], pozo: [mazo.pop()],
    mesa: [[], []], fase: 'robar', reparte, turno: (reparte + 1) % e.n, ronda: e.ronda + 1, aviso: null };
}

// Robar una del mazo o llevarse todo el pozo.
export function robar(e, de) {
  if (e.ganador !== null || e.fase !== 'robar' || !(de === 'pozo' ? e.pozo : e.mazo).length) return null;
  const s = copia(e);
  const j = s.turno;
  if (de === 'pozo') {
    s.aviso = { j, t: `se llevó el pozo (${s.pozo.length})` };
    s.manos[j].push(...s.pozo.splice(0));
  } else {
    s.manos[j].push(s.mazo.pop());
    s.aviso = { j, t: 'robó del mazo' };
  }
  s.fase = 'jugar';
  return s;
}

export const puedeCerrar = (e, eq) => !e.muertos[eq] && e.mesa[eq].some(esBurako);

// Después de bajar o agregar: sin fichas toma el muerto o cierra; si no puede cerrar, le tienen que quedar 2 (una para botar).
function seguir(s) {
  const j = s.turno;
  const eq = equipo(j);
  const quedan = s.manos[j].length;
  if (s.muertos[eq]) {
    if (!quedan) {
      s.manos[j] = s.muertos[eq];
      s.muertos[eq] = null;
      s.aviso = { j, t: `${s.aviso.t} y tomó el muerto` };
    }
    return s;
  }
  if (puedeCerrar(s, eq)) return quedan ? s : cerrarMano(s, eq);
  return quedan >= 2 ? s : null;
}

const enJuego = (e) => e.ganador === null && e.fase === 'jugar';
const tomar = (e, indices) => (new Set(indices).size === indices.length && indices.every((i) => e.manos[e.turno][i]) ? indices.map((i) => e.manos[e.turno][i]) : null);
const quitar = (s, indices) => (s.manos[s.turno] = s.manos[s.turno].filter((_, i) => !indices.includes(i)));

// El juego (pierna o escalera) que forman estas fichas, o null.
export const formar = (cartas) => R.armar('P', cartas) ?? R.armar('L', cartas);

// Bajar un juego nuevo con las fichas `indices` del atril.
export function bajar(e, indices) {
  const cartas = enJuego(e) && tomar(e, indices);
  const juego = cartas && formar(cartas);
  if (!juego) return null;
  const s = copia(e);
  quitar(s, indices);
  s.mesa[equipo(s.turno)].push(juego);
  s.aviso = { j: s.turno, t: `bajó ${R.NOMBRE_JUEGO[juego.tipo]} de ${cartas.length}` };
  return seguir(s);
}

// Agregar las fichas `indices` al juego `k` del equipo.
export function agregar(e, indices, k) {
  const cartas = enJuego(e) && tomar(e, indices);
  const viejo = cartas && e.mesa[equipo(e.turno)][k];
  const juego = viejo && R.armar(viejo.tipo, [...viejo.cartas, ...cartas]);
  if (!juego) return null;
  const s = copia(e);
  quitar(s, indices);
  s.mesa[equipo(s.turno)][k] = juego;
  s.aviso = { j: s.turno, t: `agregó ${cartas.map(nombre).join(', ')}` };
  return seguir(s);
}

// Botar la ficha `i` al pozo: termina el turno. Si se acaba el mazo, termina la mano sin cierre.
export function botar(e, i) {
  const c = enJuego(e) && e.manos[e.turno][i];
  if (!c) return null;
  const s = copia(e);
  const j = s.turno;
  const eq = equipo(j);
  s.manos[j].splice(i, 1);
  s.pozo.push(c);
  s.aviso = { j, t: `botó ${nombre(c)}` };
  if (!s.manos[j].length) {
    if (s.muertos[eq]) {
      s.manos[j] = s.muertos[eq];
      s.muertos[eq] = null;
      s.aviso.t += ' y tomó el muerto';
    } else if (puedeCerrar(s, eq)) return cerrarMano(s, eq);
    else return null;
  }
  if (!s.mazo.length) return cerrarMano(s, null);
  s.turno = (j + 1) % s.n;
  s.fase = 'robar';
  return s;
}

// Cada equipo suma sus juegos y burakos (limpio 200, sucio 100), 100 si cerró; resta lo del atril y 100 si no tomó el muerto.
function cerrarMano(s, cierra) {
  const filas = [0, 1].map((eq) => {
    const f = {
      juegos: suma(s.mesa[eq].flatMap((j) => j.cartas)),
      burakos: s.mesa[eq].filter(esBurako).reduce((t, j) => t + (j.sucio ? 100 : 200), 0),
      cierre: cierra === eq ? 100 : 0,
      muerto: s.muertos[eq] ? -100 : 0,
      atril: -suma(s.manos.filter((_, j) => equipo(j) === eq).flat()),
    };
    return { ...f, total: f.juegos + f.burakos + f.cierre + f.muerto + f.atril };
  });
  s.puntos = s.puntos.map((p, eq) => p + filas[eq].total);
  s.resumen = { ronda: s.ronda, cierra, filas };
  if (Math.max(...s.puntos) >= META && s.puntos[0] !== s.puntos[1]) {
    s.ganador = s.puntos[0] > s.puntos[1] ? 0 : 1;
    s.fase = 'fin';
    return s;
  }
  return { ...repartir(s, Math.random), resumen: s.resumen };
}

// --- 🤖 Máquina ---

// Juegos que se pueden bajar con el atril: listas de índices (sin comodín primero, los más largos primero).
export function juegosPosibles(mano) {
  const comodines = mano.map((c, i) => i).filter((i) => esComodin(mano[i]));
  const salida = [];
  const porValor = {};
  mano.forEach((c, i) => !esComodin(c) && (porValor[c.v] ??= []).push(i));
  for (const g of Object.values(porValor)) {
    if (g.length >= 3) salida.push(g);
    else if (g.length === 2 && comodines.length) salida.push([...g, comodines[0]]);
  }
  for (const p of COLORES) {
    const deValor = {};
    mano.forEach((c, i) => c.p === p && (deValor[c.v] ??= []).push(i));
    const pos = { ...Object.fromEntries(Object.entries(deValor).map(([v, ix]) => [v, ix[0]])), 14: deValor[1]?.at(-1) }; // el 1 también va arriba
    for (let ini = 1; ini <= 12; ini++) {
      for (let largo = 15 - ini; largo >= 3; largo--) {
        const ix = Array.from({ length: largo }, (_, k) => pos[ini + k]);
        const faltan = ix.filter((i) => i === undefined).length;
        const usados = [...new Set(ix.filter((i) => i !== undefined))];
        if (faltan === 0 && usados.length === largo) salida.push(usados);
        else if (faltan === 1 && usados.length === largo - 1) {
          const w = comodines.find((i) => !usados.includes(i));
          if (w !== undefined) salida.push([...usados, w]);
        } else continue;
        break;
      }
    }
  }
  const sucio = (ix) => ix.some((i) => esComodin(mano[i]) && !formar(ix.filter((x) => x !== i).map((x) => mano[x])));
  return salida.filter((ix) => formar(ix.map((i) => mano[i]))).sort((a, b) => sucio(a) - sucio(b) || b.length - a.length);
}

// Cuánto ayuda una ficha a armar juegos con las otras del atril.
function utilidad(c, mano) {
  if (esComodin(c)) return 100;
  const otras = mano.filter((x) => x !== c && !esComodin(x));
  const cerca = (a, b) => Math.min(Math.abs(a - b), a === 1 ? Math.abs(14 - b) : 99, b === 1 ? Math.abs(14 - a) : 99);
  return 4 * otras.filter((x) => x.v === c.v).length + 3 * otras.filter((x) => x.p === c.p && x.v !== c.v && cerca(x.v, c.v) <= 2).length;
}
const entra = (juegos, c) => juegos.some((j) => R.agregar(j, c));

// { robar: 'mazo' | 'pozo' } | { bajar: [i] } | { agregar: [i], juego: k } | { botar: i }
export function maquina(e, nivel = 'normal') {
  const dificil = nivel === 'dificil';
  const j = e.turno;
  const eq = equipo(j);
  const mano = e.manos[j];
  const mios = e.mesa[eq];
  const rivales = e.mesa[1 - eq];
  if (e.fase === 'robar') {
    // La del pozo sirve si de verdad se puede jugar (si no, dos máquinas se la pasan para siempre).
    const t = e.pozo.length && robar(e, 'pozo');
    const ultima = t && t.manos[j].length - 1;
    const sirve = t && (t.mesa[eq].some((_, k) => agregar(t, [ultima], k)) || juegosPosibles(t.manos[j]).some((ix) => ix.includes(ultima) && bajar(t, ix)));
    const grande = dificil && e.pozo.length >= 4 && e.mazo.length > 8;
    return { robar: e.pozo.length && (sirve || grande || !e.mazo.length) ? 'pozo' : 'mazo' };
  }
  // Prueba una jugada y la hace solo si es válida.
  const vale = (a) => accion(e, a) !== null;
  for (const ix of juegosPosibles(mano)) if (vale({ bajar: ix })) return { bajar: ix };
  for (let i = 0; i < mano.length; i++) {
    for (let k = 0; k < mios.length; k++) {
      const nuevo = R.agregar(mios[k], mano[i]);
      // Un comodín solo para llegar a 7 (el burako) o para vaciar el atril.
      if (nuevo?.sucio && !mios[k].sucio && mios[k].cartas.length !== 6 && mano.length > 2) continue;
      if (vale({ agregar: [i], juego: k })) return { agregar: [i], juego: k };
    }
  }
  // Bota la que menos sirve; entre esas, la que más vale (la difícil evita las que le sirven al rival).
  const nota = (c) => utilidad(c, mano) * 100 - valor(c) + (dificil && entra(rivales, c) ? 5000 : 0);
  const orden = mano.map((c, i) => i).sort((a, b) => nota(mano[a]) - nota(mano[b]));
  return { botar: orden.find((i) => vale({ botar: i })) ?? orden[0] };
}

export function accion(e, a) {
  if (a.robar) return robar(e, a.robar);
  if (a.bajar) return bajar(e, a.bajar);
  if (a.agregar) return agregar(e, a.agregar, a.juego);
  return botar(e, a.botar);
}
