// 💣 Buscaminas infinito: reglas puras. El mapa no se guarda: cada mina sale de un hash de (semilla, x, y).
// Las casillas se llaman 'x,y'. Ninguna función muta su entrada.
export const DENSIDAD = { facil: 0.12, normal: 0.17, dificil: 0.22 };
const TOPE = 5000; // casillas nuevas por toque

export const densidad = (nivel, x, y) => DENSIDAD[nivel] + Math.min(0.08, Math.floor(Math.max(Math.abs(x), Math.abs(y)) / 25) * 0.01);

// Hash entero de 32 bits sin signo (mezcla tipo mulberry32/murmur).
function hash(semilla, x, y) {
  let h = Math.imul(semilla | 0, 0x9e3779b1) ^ Math.imul(x | 0, 0x85ebca6b) ^ Math.imul(y | 0, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export function hayMina(semilla, nivel, x, y) {
  if (Math.abs(x) <= 1 && Math.abs(y) <= 1) return false;
  return hash(semilla, x, y) / 4294967296 < densidad(nivel, x, y);
}

const clave = (x, y) => `${x},${y}`;
const coords = (k) => k.split(',').map(Number);
const vecinas = (x, y) => { const r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) r.push([x + dx, y + dy]); return r; };
const numero = (e, x, y) => vecinas(x, y).filter(([a, b]) => hayMina(e.semilla, e.nivel, a, b)).length;
const copia = (e) => ({ ...e, abiertas: { ...e.abiertas }, banderas: { ...e.banderas }, explotadas: { ...e.explotadas } });
const quieto = (e) => e.fin || e.boom !== null;

// Abre (x, y) sobre una copia ya hecha `r`; devuelve true si no era una mina.
function abrirEn(r, x, y) {
  const k = clave(x, y);
  if (r.abiertas[k] !== undefined || r.banderas[k] || r.explotadas[k]) return;
  if (hayMina(r.semilla, r.nivel, x, y)) { r.boom = k; return; }
  r.abiertas[k] = numero(r, x, y);
  let nuevas = 1;
  if (r.abiertas[k] !== 0) return;
  const cola = [[x, y]];
  for (let i = 0; i < cola.length && nuevas < TOPE; i++) {
    for (const [a, b] of vecinas(...cola[i])) {
      const kv = clave(a, b);
      if (r.abiertas[kv] !== undefined || r.banderas[kv] || r.explotadas[kv] || nuevas >= TOPE) continue;
      r.abiertas[kv] = numero(r, a, b); // vecina de un 0: nunca es mina
      nuevas++;
      if (r.abiertas[kv] === 0) cola.push([a, b]);
    }
  }
}

export function nueva(semilla, nivel) {
  const r = { semilla, nivel, abiertas: {}, banderas: {}, explotadas: {}, boom: null, seguidas: 0, fin: false };
  abrirEn(r, 0, 0);
  r.inicio = Object.keys(r.abiertas).length; // la apertura gratis no cuenta para la victoria
  return r;
}

export function abrir(e, x, y) {
  if (quieto(e)) return e;
  const r = copia(e);
  abrirEn(r, x, y);
  return r;
}

export function bandera(e, x, y) {
  const k = clave(x, y);
  if (quieto(e) || e.abiertas[k] !== undefined || e.explotadas[k]) return e;
  const r = copia(e);
  if (r.banderas[k]) delete r.banderas[k]; else r.banderas[k] = true;
  return r;
}

// Un número con tantas banderas (o explotadas) alrededor como su valor abre sus vecinas cerradas.
export function acorde(e, x, y) {
  const v = e.abiertas[clave(x, y)];
  if (quieto(e) || !v) return e;
  const vec = vecinas(x, y);
  if (vec.filter(([a, b]) => e.banderas[clave(a, b)] || e.explotadas[clave(a, b)]).length !== v) return e;
  const r = copia(e);
  for (const [a, b] of vec) {
    abrirEn(r, a, b); // abrirEn ya salta banderas y abiertas
    if (r.boom) break; // tras una mina no se sigue abriendo
  }
  return r;
}

export const costoSeguir = (n) => 50 * 2 ** n;

export function seguir(e) {
  if (e.boom === null) return e;
  const r = copia(e);
  r.explotadas[e.boom] = true;
  r.boom = null;
  r.seguidas = e.seguidas + 1;
  return r;
}

export const terminar = (e) => ({ ...copia(e), fin: true });

export function puntaje(e) {
  const buenas = Object.keys(e.banderas).filter((k) => { const [x, y] = coords(k); return hayMina(e.semilla, e.nivel, x, y); }).length;
  return Object.keys(e.abiertas).length + 5 * buenas;
}

// Semilla del día: hash del texto «fecha|juego» (FNV-1a, 32 bits).
export function semillaDelDia(fecha, juego) {
  let h = 0x811c9dc5;
  for (const c of `${fecha}|${juego}`) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193);
  return h >>> 0;
}
