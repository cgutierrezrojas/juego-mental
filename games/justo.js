// «Dados justos» con un amigo, sin servidor: cada uno sella una semilla secreta y sus dados salen de
// HMAC-SHA-256(semilla, número público del rival + ':' + k). Al final se revelan las semillas y se recalcula todo.
// Puro. Todo lo que usa crypto.subtle es async (sellar, dadosDe, verificarSemilla).

const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
const texto = (t) => new TextEncoder().encode(t);

// 16 bytes aleatorios en hex: sirve de semilla secreta y de número público.
export const nuevaSemilla = () => hex(globalThis.crypto.getRandomValues(new Uint8Array(16)));

// SHA-256 en hex del texto de la semilla.
export async function sellar(s) {
  return hex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', texto(s))));
}

export const verificarSemilla = async (sello, s) => typeof s === 'string' && typeof sello === 'string' && (await sellar(s)) === sello;

// `cuantos` dados (1–6) de la tirada `k` del dueño de `s`. Sin sesgo: se descartan los bytes ≥ 252 (252 = 6 · 42);
// si no alcanzan los 32 bytes, se sigue con HMAC(s, rRival:k:1), (…:2), …
export async function dadosDe(s, rRival, k, cuantos) {
  const clave = await globalThis.crypto.subtle.importKey('raw', texto(s), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const dados = [];
  for (let c = 0; dados.length < cuantos; c++) {
    const msj = rRival + ':' + k + (c ? ':' + c : '');
    for (const b of new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', clave, texto(msj)))) {
      if (b < 252 && dados.length < cuantos) dados.push((b % 6) + 1);
    }
  }
  return dados;
}

// Igualdad profunda de datos JSON (sin importar el orden de las claves).
export const igual = (a, b) => a === b || (!!a && !!b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)
  && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => igual(a[k], b[k])));

// Con un amigo (el rival puede escribir cualquier `datos` mientras tiene el turno): ¿el estado `e` sigue de forma
// honesta lo que vi y escribí? `hist` = [B, ...mis escrituras]: B es el estado con el que me llegó el turno y el último
// (W) es lo último que escribí. `e` vale si es uno de ellos (alguna escritura mía no llegó: sigo desde ahí) o si
// `unaJugadaRival(W, e, yo)`: el juego decide si `e` es exactamente W más UNA jugada legítima del rival.
export const siguePartida = (hist, e, yo, unaJugadaRival) => hist.some((h) => igual(h, e)) || unaJugadaRival(hist.at(-1), e, yo);

// Una escritura mía (`estado`) llegó a la nube: lo de antes ya no puede volver como «escritura perdida». Devuelve el
// historial recortado desde ella, o el mismo `hist` si no hay nada que recortar.
export function recortar(hist, estado) {
  const k = hist?.findIndex((h) => igual(h, estado)) ?? -1;
  return k > 0 ? hist.slice(k) : hist;
}

// --- Partida de dados con un amigo (Cacho y Generala) ---
// El estado compartido lleva, además del juego: amigo: true, k (tiradas pedidas: en la mesa va como `estado.k`, y cada
// una tiene su hora del servidor en `log/k`), sellos, r (números públicos) y s (semillas reveladas al final), todos { x, o }.
// `turno` es 0 (x) o 1 (o): quien puede escribir. Arranca en 1: o sella y publica su número; luego x publica el suyo.
const FICHA = ['x', 'o'];
const hexDe = (t, n) => typeof t === 'string' && t.length === n && /^[0-9a-f]+$/.test(t);
// La decisión de cada tirada queda en `log/k` (de solo escritura) junto con la hora: `g` = lo guardado como '0'/'1' por dado
// (en el Cacho, que no guarda nada, '00000') y `j` = quién la pidió ('x' | 'o').
export const mascara = (g) => (Array.isArray(g) && g.length === 5 ? g : [0, 0, 0, 0, 0]).map((x) => (x ? '1' : '0')).join('');
export const logCuadra = (log, k, j, g) => log?.[k]?.j === FICHA[j] && log[k].g === g;
export const esDados = (d, n) => Array.isArray(d) && d.length === n && d.every((x) => Number.isInteger(x) && x >= 1 && x <= 6);

// Los pasos del protocolo (no del juego) que puede dar quien tiene el turno en `w`, con lo que eligió tomado de `e`.
// null: no toca ninguno, juega el juego.
export function pasosComunes(w, e) {
  const f = w.turno, F = FICHA[f];
  if (!w.sellos?.o) return f === 1 && hexDe(e.sellos?.o, 64) && hexDe(e.r?.o, 32) ? [{ ...w, sellos: { ...w.sellos, o: e.sellos.o }, r: { ...w.r, o: e.r.o }, turno: 0 }] : [];
  if (!w.r?.x) return f === 0 && hexDe(e.r?.x, 32) ? [{ ...w, r: { ...w.r, x: e.r.x } }] : [];
  // Terminó: cada uno revela su semilla en su turno y se lo pasa al otro.
  if (w.ganador !== null) return !w.s?.[F] && hexDe(e.s?.[F], 32) ? [{ ...w, s: { ...w.s, [F]: e.s[F] }, turno: 1 - f }] : [];
  return null;
}

const json = (x) => JSON.parse(JSON.stringify(x));
// ¿`e` es `w` más pasos legítimos del rival (solo los suyos, hasta devolverme el turno)? `pasos(w, e)` da los del juego.
// Busca en profundidad: cada paso toma del propio `e` lo que el rival eligió (su apuesta, sus dados…), y al final todo
// debe ser idéntico a `e`.
export function jugadaRival(w, e, yo, pasos, hondo = 12) {
  if (hondo === 0 || !w || w.turno === yo || !e || typeof e !== 'object') return false;
  return (pasosComunes(w, e) ?? pasos(w, e)).some((t) => t && (igual(json(t), e) || jugadaRival(t, e, yo, pasos, hondo - 1)));
}

// Revisión final de los dados del jugador `j` (0 | 1): `tiradas` = [{ k, j, d }] (los dados que salieron de la semilla
// en la tirada k), `s` su semilla revelada, `rOtro` el número público del otro y `log` el registro de la mesa.
export async function tiradasHonestas(tiradas, j, s, rOtro, log) {
  for (const t of tiradas) {
    if (t.j !== j) continue;
    const cuando = log?.[t.k]?.cuando;
    if (typeof cuando !== 'number' || !esDados(t.d, t.d?.length) || t.d.length > 5) return false;
    if (!igual(await dadosDe(s, rOtro + ':' + cuando, t.k, t.d.length), t.d)) return false;
  }
  return true;
}

// Al final: ¿el sello del rival (0 | 1) cuadra con la semilla que reveló y todas sus tiradas con ella?
// `tiradas` = lo que da tiradasAmigo del juego (null si el registro no cuadra).
export async function rivalHonesto(e, rival, log, tiradas) {
  const F = FICHA[rival], rOtro = e.r?.[FICHA[1 - rival]];
  return !!tiradas && typeof rOtro === 'string' && (await verificarSemilla(e.sellos?.[F], e.s?.[F])) && tiradasHonestas(tiradas, rival, e.s[F], rOtro, log);
}
