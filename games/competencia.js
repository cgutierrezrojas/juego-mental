// 🏆 Competencia: qué juego toca en el desafío de hoy y en el torneo de la semana, intentos, mejoras y premios. Todo puro.
// `compe:dia` = { fecha, intentos, mejor }; `compe:torneo` = { semana, juego, mejor, partidas }; `perfil:torneos` = { oro, plata, bronce }.

export const JUEGO_DIA = ['serpiente', 'saltar', 'autos', 'ladrillos', 'bloques'];
// 5 del Arcade intercalados con los 8 Mentales originales.
export const JUEGOS_TORNEO = ['serpiente', 'calculo', 'saltar', 'atencion', 'autos', 'memoria', 'ladrillos', 'series', 'bloques', 'sobra', 'puzzle', 'rayo', 'topos'];
export const MENOS_ES_MEJOR = ['puzzle', 'rayo'];
export const INTENTOS = 3;
export const PREMIOS_TORNEO = [500, 300, 150];
export const POR_PARTICIPAR = 25;

const DIA = 86400000;
const utc = (fecha) => {
  const [a, m, d] = fecha.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
};
const vuelta = (n, largo) => ((n % largo) + largo) % largo;
const diasDesde = (fecha, inicio) => Math.round((utc(fecha) - utc(inicio)) / DIA);
export const haceDias = (fecha, n) => new Date(utc(fecha) - n * DIA).toISOString().slice(0, 10);

export const juegoDelDia = (fecha) => JUEGO_DIA[vuelta(diasDesde(fecha, '2026-11-20'), JUEGO_DIA.length)];
// El 16-11-2026 es lunes: cada 7 días desde él empieza una semana (ISO) nueva.
export const juegoDeLaSemana = (fecha) => JUEGOS_TORNEO[vuelta(Math.floor(diasDesde(fecha, '2026-11-16') / 7), JUEGOS_TORNEO.length)];

// El registro de `fecha` (si es de otro día, empieza de cero).
const delDia = (r, fecha) => (r?.fecha === fecha ? r : { fecha, intentos: 0, mejor: null });
// Gasta un intento al empezar; null si ya no quedan.
export function anotarIntento(registro, fecha) {
  const r = delDia(registro, fecha);
  return r.intentos >= INTENTOS ? null : { ...r, intentos: r.intentos + 1 };
}
export const quedan = (registro, fecha) => INTENTOS - delDia(registro, fecha).intentos;
export const anotarMarca = (registro, valor) => ({ ...registro, mejor: registro.mejor == null ? valor : Math.max(registro.mejor, valor) });

// ¿`nuevo` mejora la marca del torneo `viejo` (null = sin marca)? 0 no es marca.
export function mejora(juego, nuevo, viejo) {
  if (!(nuevo > 0)) return false;
  if (viejo == null) return true;
  return MENOS_ES_MEJOR.includes(juego) ? nuevo < viejo : nuevo > viejo;
}

// Fichas por el torneo de la semana pasada: `puesto` 1–3 (0 = fuera del podio).
export const premioTorneo = (puesto, participo) => PREMIOS_TORNEO[puesto - 1] ?? (participo ? POR_PARTICIPAR : 0);
export function sumarMedalla(torneos, puesto) {
  const t = { oro: 0, plata: 0, bronce: 0, ...torneos };
  const k = ['oro', 'plata', 'bronce'][puesto - 1];
  if (k) t[k]++;
  return t;
}
