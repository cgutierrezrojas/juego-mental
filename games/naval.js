// 🚢 Batalla naval 10×10, flota 5-4-3-3-2, los barcos no se tocan (ni en diagonal). Cada tiro pasa el turno. Todo puro.
// Barco: { c: casilla inicial, l: largo, v: vertical }. Estado: { turno, tiros: { x: [[casilla, resp]], o }, pendiente,
// barcos? (máquina y local), sellos? y revelado? (con un amigo) }. Respuestas: 'a' agua, 't' tocado, 'h<largo>' hundido.
// Con un amigo: los barcos quedan en el celular de cada uno y en la mesa solo va el sello SHA-256(JSON(barcos) + sal);
// al final se revelan y cada celular comprueba el sello y todas las respuestas (verificar).
// ponytail: la trampa se detecta al final, no se impide; para impedirla, este archivo puede correr en un servidor (Blaze).
import { azar } from './comun.js';

export const LADO = 10;
export const FLOTA = [5, 4, 3, 3, 2];
const otro = (t) => (t === 'x' ? 'o' : 'x');

export const casillasDe = ({ c, l, v }) => Array.from({ length: l }, (_, k) => c + k * (v ? LADO : 1));
const cabe = ({ c, l, v }) => Number.isInteger(c) && c >= 0 && c < LADO * LADO && (v ? Math.floor(c / LADO) + l <= LADO : (c % LADO) + l <= LADO);
function vecinas8(i) {
  const f = Math.floor(i / LADO), c = i % LADO, r = [];
  for (let df = -1; df <= 1; df++) for (let dc = -1; dc <= 1; dc++) {
    const ff = f + df, cc = c + dc;
    if ((df || dc) && ff >= 0 && ff < LADO && cc >= 0 && cc < LADO) r.push(ff * LADO + cc);
  }
  return r;
}

export function flotaValida(barcos) {
  if (!Array.isArray(barcos) || barcos.length !== FLOTA.length) return false;
  if (barcos.map((b) => b?.l).sort().join() !== [...FLOTA].sort().join()) return false;
  const ocupada = new Map();
  for (const [k, b] of barcos.entries()) {
    if (typeof b.v !== 'boolean' || !cabe(b)) return false;
    for (const i of casillasDe(b)) { if (ocupada.has(i)) return false; ocupada.set(i, k); }
  }
  for (const [i, k] of ocupada) for (const j of vecinas8(i)) if (ocupada.has(j) && ocupada.get(j) !== k) return false;
  return true;
}

export function flotaAlAzar(rnd = Math.random) {
  for (;;) {
    const barcos = [];
    for (const l of FLOTA) {
      let puesto = false;
      for (let intento = 0; intento < 200 && !puesto; intento++) {
        const b = { c: azar(LADO * LADO, rnd), l, v: rnd() < 0.5 };
        const prueba = [...barcos, b];
        if (cabe(b) && validaParcial(prueba)) { barcos.push(b); puesto = true; }
      }
      if (!puesto) break;
    }
    if (barcos.length === FLOTA.length) return barcos;
  }
}
// Como flotaValida pero sin exigir la flota completa (para ir colocando).
function validaParcial(barcos) {
  const ocupada = new Map();
  for (const [k, b] of barcos.entries()) for (const i of casillasDe(b)) { if (ocupada.has(i)) return false; ocupada.set(i, k); }
  for (const [i, k] of ocupada) for (const j of vecinas8(i)) if (ocupada.has(j) && ocupada.get(j) !== k) return false;
  return true;
}

export function girar(barcos, k) {
  const otra = barcos.map((b, i) => (i === k ? { c: b.c, l: b.l, v: !b.v } : b));
  return flotaValida(otra) ? otra : null;
}
export function mover(barcos, k, casilla) {
  const otra = barcos.map((b, i) => (i === k ? { c: casilla, l: b.l, v: b.v } : b));
  return flotaValida(otra) ? otra : null;
}

// Respuesta al tiro en `casilla`, sabiendo las casillas ya recibidas antes.
export function respuesta(barcos, recibidas, casilla) {
  const b = barcos.find((x) => casillasDe(x).includes(casilla));
  if (!b) return 'a';
  const tocadas = new Set([...recibidas, casilla]);
  return casillasDe(b).every((i) => tocadas.has(i)) ? 'h' + b.l : 't';
}

export function inicial({ barcos = null, amigo = false } = {}) {
  const e = { turno: amigo ? 'o' : 'x', tiros: { x: [], o: [] }, pendiente: null };
  if (barcos) e.barcos = barcos;
  if (amigo) { e.sellos = {}; e.revelado = {}; }
  return e;
}

export function validas(e) {
  if (e.pendiente !== null && e.pendiente !== undefined) return [];
  const hechos = new Set(e.tiros[e.turno].map((t) => t[0]));
  return [...Array(LADO * LADO).keys()].filter((i) => !hechos.has(i));
}

// Un tiro que no es válido (repetido, fuera del tablero, o con respuesta pendiente) no cambia nada.
export function aplicar(e, casilla) {
  if (!validas(e).includes(casilla)) return e;
  const rival = otro(e.turno);
  if (e.barcos) {
    const r = respuesta(e.barcos[rival], e.tiros[e.turno].map((t) => t[0]), casilla);
    return { ...e, tiros: { ...e.tiros, [e.turno]: [...e.tiros[e.turno], [casilla, r]] }, turno: rival };
  }
  return { ...e, pendiente: casilla, turno: rival };
}

// Con un amigo: quien tiene el turno responde al tiro pendiente del rival con su flota (el turno no cambia).
// Si no hay tiro pendiente, o está repetido o fuera del tablero, devuelve e sin cambios (evita el truco de repetir un hundido).
export function responder(e, misBarcos) {
  const tirador = otro(e.turno);
  const p = e.pendiente;
  if (!Number.isInteger(p) || p < 0 || p >= LADO * LADO || e.tiros[tirador].some((t) => t[0] === p)) return e;
  const r = respuesta(misBarcos, e.tiros[tirador].map((t) => t[0]), e.pendiente);
  return { ...e, tiros: { ...e.tiros, [tirador]: [...e.tiros[tirador], [e.pendiente, r]] }, pendiente: null };
}

// Casillas distintas con respuesta de hundido: un tiro repetido no suma.
const hundidos = (tiros) => new Set(tiros.filter(([, r]) => r[0] === 'h').map((t) => t[0])).size;
export const vencedor = (e) => ['x', 'o'].find((j) => hundidos(e.tiros[j]) === FLOTA.length) ?? null;

export function ganador(e) {
  const v = vencedor(e);
  if (!v) return null;
  if (e.sellos && !(e.revelado?.x && e.revelado?.o)) return null;
  return v;
}

// ¿Las respuestas dadas a los tiros del rival son las que corresponden a esta flota?
export function coherente(barcos, tirosDelRival) {
  const recibidas = [];
  for (const [c, r] of tirosDelRival) {
    if (!Number.isInteger(c) || c < 0 || c >= LADO * LADO || recibidas.includes(c)) return false;
    if (respuesta(barcos, recibidas, c) !== r) return false;
    recibidas.push(c);
  }
  return true;
}

export const nuevaSal = () => [...globalThis.crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function sellar(barcos, sal) {
  const datos = new TextEncoder().encode(JSON.stringify(barcos) + sal);
  const h = await globalThis.crypto.subtle.digest('SHA-256', datos);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ¿Lo que reveló `ficha` coincide con su sello y con todas las respuestas que dio?
export async function verificar(e, ficha) {
  const rv = e.revelado?.[ficha];
  if (!rv || typeof rv.sal !== 'string' || !flotaValida(rv.barcos)) return false;
  if ((await sellar(rv.barcos, rv.sal)) !== e.sellos?.[ficha]) return false;
  return coherente(rv.barcos, e.tiros[otro(ficha)]);
}

// Con un amigo: ¿el estado `e` que llega de la mesa (el rival puede escribir cualquier `datos`) sigue de forma honesta
// lo que guarda mi celular? `mio` = { barcos, sal, sellos: los fijados al verlos por primera vez, mios: mis tiros con
// la respuesta ya aceptada, tiro: mi último tiro sin respuesta }. Comprueba que:
// - mis tiros solo crecen, como mucho con la respuesta a `tiro` (que no puede quedar sin respuesta si ya me toca);
// - lo anotado como respuesta mía a sus tiros es lo que dice mi flota;
// - los sellos no cambian y el rival ya selló si me toca;
// - lo revelado a mi nombre es lo mío.
export function cambioValido(mio, e, yo) {
  const rival = otro(yo);
  const antes = mio.mios ?? [];
  const ahora = e.tiros?.[yo];
  if (!Array.isArray(ahora) || ahora.length < antes.length || ahora.length > antes.length + 1) return false;
  if (antes.some((t, k) => !Array.isArray(ahora[k]) || t[0] !== ahora[k][0] || t[1] !== ahora[k][1])) return false;
  if (ahora.length > antes.length && ahora.at(-1)[0] !== mio.tiro) return false;
  if (e.turno === yo && Number.isInteger(mio.tiro) && ahora.length === antes.length) return false; // me pasó el turno sin responder mi tiro
  if (!Array.isArray(e.tiros?.[rival]) || !coherente(mio.barcos, e.tiros[rival])) return false;
  if (['x', 'o'].some((k) => mio.sellos?.[k] && e.sellos?.[k] !== mio.sellos[k])) return false;
  if (e.turno === yo && !(mio.sellos?.[rival] ?? e.sellos?.[rival])) return false;
  const rv = e.revelado?.[yo];
  return !rv || JSON.stringify(rv) === JSON.stringify({ barcos: mio.barcos, sal: mio.sal });
}

// Al cerrar con una rendición: si me rendí yo, no hay nada que revisar (false); si se rindió el rival, el ganador
// tengo que ser yo (si no, es trampa: true). Sin rendición devuelve null: hay que revisar con verificar.
export function trampaPorRendicion(ganador, yo, meRendi, seRindio) {
  if (meRendi) return false;
  if (seRindio) return ganador !== yo;
  return null;
}

// --- Máquina: solo usa sus propios tiros y las respuestas (no mira la flota rival) ---

// Casillas de barcos ya hundidos: el grupo de tocados unidos a cada 'h' (los barcos no se tocan, así que es exacto).
function analizar(tiros) {
  const resp = new Map(tiros);
  const tocados = new Set(tiros.filter(([, r]) => r !== 'a').map(([c]) => c));
  const hundidas = new Set();
  const largosHundidos = [];
  for (const [c, r] of tiros) {
    if (r[0] !== 'h') continue;
    largosHundidos.push(Number(r.slice(1)));
    const pila = [c];
    while (pila.length) {
      const i = pila.pop();
      if (hundidas.has(i)) continue;
      hundidas.add(i);
      for (const j of [i - LADO, i + LADO, i % LADO ? i - 1 : -1, i % LADO < LADO - 1 ? i + 1 : -1]) if (j >= 0 && j < 100 && tocados.has(j)) pila.push(j);
    }
  }
  const vivos = [...tocados].filter((i) => !hundidas.has(i));
  const restantes = [...FLOTA];
  for (const l of largosHundidos) { const k = restantes.indexOf(l); if (k >= 0) restantes.splice(k, 1); }
  return { resp, hundidas, vivos, restantes };
}

export function ia(e, nivel = 'normal', rnd = Math.random) {
  const libres = validas(e);
  const una = (arr) => arr[azar(arr.length, rnd)];
  if (nivel === 'facil') return una(libres);
  const { resp, hundidas, vivos, restantes } = analizar(e.tiros[e.turno]);
  const libre = new Set(libres);
  // Alrededor de un barco hundido no puede haber otro.
  const prohibidas = new Set([...hundidas].flatMap(vecinas8));
  if (nivel === 'normal') {
    if (vivos.length) {
      const enLinea = vivos.length > 1 ? (vivos[1] - vivos[0]) % LADO === 0 ? [LADO] : [1] : [1, LADO];
      const cand = vivos.flatMap((i) => enLinea.flatMap((d) => [i - d, i + d]))
        .filter((j) => libre.has(j) && !prohibidas.has(j) && (Math.abs(j - vivos[0]) % LADO === 0 || Math.floor(j / LADO) === Math.floor(vivos[0] / LADO)));
      if (cand.length) return una(cand);
    }
    const paridad = libres.filter((i) => (Math.floor(i / LADO) + (i % LADO)) % 2 === 0 && !prohibidas.has(i));
    return una(paridad.length ? paridad : libres);
  }
  // Difícil: cuenta en cuántas posiciones posibles de los barcos restantes cae cada casilla libre.
  const peso = new Map();
  for (const l of new Set(restantes)) {
    for (let c = 0; c < 100; c++) for (const v of [false, true]) {
      const b = { c, l, v };
      if (!cabe(b)) continue;
      const cs = casillasDe(b);
      if (cs.some((i) => resp.get(i) === 'a' || hundidas.has(i) || prohibidas.has(i))) continue;
      const cubre = cs.filter((i) => vivos.includes(i)).length;
      if (vivos.length && !cubre) continue;
      for (const i of cs) if (libre.has(i)) peso.set(i, (peso.get(i) ?? 0) + (cubre ? 20 * cubre : 1));
    }
  }
  if (!peso.size) return una(libres);
  const max = Math.max(...peso.values());
  return una([...peso].filter(([, p]) => p === max).map(([i]) => i));
}

export const naval = { id: 'naval', nombre: 'Batalla naval', inicial, validas, aplicar, ganador, ia };
