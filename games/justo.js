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
