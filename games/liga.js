// Liga semanal: qué semana es, cuánto queda y cuántos puntos llevas. Todo puro.
// Registro de una semana (`liga:<semana>`): { partidas: { fecha: n }, estrellas, entrenos, victorias, empates }.

export const MAX_PARTIDAS_DIA = 10; // las partidas suman como mucho 10 puntos al día

const fechaDe = (texto) => {
  const [a, m, d] = texto.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};
const texto = (f) => f.toISOString().slice(0, 10);

// Semana ISO de una fecha 'AAAA-MM-DD': 'AAAA-Www' (las semanas empiezan en lunes).
export function semanaDe(fecha) {
  const f = fechaDe(fecha);
  const dia = f.getUTCDay() || 7; // lunes = 1 … domingo = 7
  f.setUTCDate(f.getUTCDate() + 4 - dia); // el jueves de esa semana decide el año
  const inicioAno = new Date(Date.UTC(f.getUTCFullYear(), 0, 1));
  const numero = Math.ceil(((f - inicioAno) / 86400000 + 1) / 7);
  return `${f.getUTCFullYear()}-W${String(numero).padStart(2, '0')}`;
}

// La semana anterior a la de `fecha`.
export function semanaAnterior(fecha) {
  const f = fechaDe(fecha);
  f.setUTCDate(f.getUTCDate() - 7);
  return semanaDe(texto(f));
}

// Días que quedan hasta el final del domingo (contando hoy): lunes = 7, domingo = 1.
export const diasRestantes = (fecha) => 8 - (fechaDe(fecha).getUTCDay() || 7);

export function puntosLiga(registro = {}) {
  const partidas = Object.values(registro.partidas ?? {}).reduce((s, n) => s + Math.min(MAX_PARTIDAS_DIA, n), 0);
  return partidas + (registro.estrellas ?? 0) + 5 * (registro.entrenos ?? 0) + 3 * (registro.victorias ?? 0) + (registro.empates ?? 0);
}

// Registro nuevo tras sumar algo: 'partida' (en `fecha`), 'estrellas' (n), 'entreno', 'victoria' o 'empate'.
export function anotarLiga(registro = {}, tipo, fecha, n = 1) {
  const r = { partidas: {}, estrellas: 0, entrenos: 0, victorias: 0, empates: 0, ...registro };
  if (tipo === 'partida') r.partidas = { ...r.partidas, [fecha]: (r.partidas[fecha] ?? 0) + 1 };
  if (tipo === 'estrellas') r.estrellas += n;
  if (tipo === 'entreno') r.entrenos += 1;
  if (tipo === 'victoria') r.victorias += 1;
  if (tipo === 'empate') r.empates += 1;
  return r;
}
