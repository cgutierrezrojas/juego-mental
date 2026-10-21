// Niveles: mundos de 10 sin fin, con estrellas (1–3), retos, variantes y niveles diarios. Todo puro.
import { diaAnterior } from './estadisticas.js';

export const NUM_NIVELES = 50; // la dificultad crece hasta el nivel 50; después se queda en ese techo
export const NIVELES_POR_MUNDO = 10;
export const mundoDe = (n) => Math.ceil(n / NIVELES_POR_MUNDO);
export const NOMBRE_RETO = { normal: '⏱ Normal', sinfallo: '❤️ Sin fallar', contrarreloj: '⚡ Contrarreloj', jefe: '👑 Jefe' };
export const ICONO_RETO = { normal: '', sinfallo: '❤️', contrarreloj: '⚡', jefe: '👑' };

// Segundos de los juegos de opciones; Atención y Topos son de 30 s.
const OPCIONES = { calculo: 30, mayor: 30, distinto: 45, series: 60, sobra: 60, balanza: 75 };
const CON_TIEMPO = [...Object.keys(OPCIONES), 'atencion', 'topos'];
const MENOR_ES_MEJOR = ['puzzle', 'rayo', 'parejas'];

// Variantes de los mundos a partir del 6, en rotación. Solo en los juegos con reloj (en los demás no cambiarían nada).
export const VARIANTES = ['maraton', 'relampago', 'precision'];
export const NOMBRE_VARIANTE = { maraton: '🏃 Maratón', relampago: '⚡ Relámpago', precision: '❤️ Precisión' };

export function varianteDe(id, mundo) {
  if (mundo <= NUM_NIVELES / NIVELES_POR_MUNDO || !CON_TIEMPO.includes(id)) return null;
  return VARIANTES[(mundo - 6) % VARIANTES.length];
}

// Reto del nivel n: jefe cada 10, sin fallar cada 5 (sin contar los jefes), contrarreloj en los terminados en 3 y 7.
export function retoDe(n) {
  if (n % 10 === 0) return 'jefe';
  if (n % 5 === 0) return 'sinfallo';
  if (n % 10 === 3 || n % 10 === 7) return 'contrarreloj';
  return 'normal';
}

// Meta base (sin reto) y parámetros del juego en el nivel n.
function base(id, n) {
  if (id in OPCIONES) {
    return { meta: 5 + Math.round(n * 0.25), segundos: OPCIONES[id], aciertosIniciales: Math.min(n - 1, 20), dificultad: 'normal', unidad: 'aciertos' };
  }
  if (id === 'atencion') return { meta: 6 + Math.round(n * 0.25), segundos: 30, dificultad: n >= 11 ? 'dificil' : 'normal', unidad: 'puntos' };
  if (id === 'memoria') return { meta: 3 + Math.floor(n * 0.2), dificultad: n >= 21 ? 'dificil' : 'normal', unidad: 'colores' };
  if (id === 'topos') return { meta: 10 + Math.round(n * 0.25), segundos: 30, dificultad: n <= 10 ? 'facil' : n <= 30 ? 'normal' : 'dificil', unidad: 'puntos' };
  if (id === 'puzzle') return { meta: Math.round(30 + n * 0.5), desorden: 10 + n * 4, unidad: 'movimientos' };
  if (id === 'rayo') return { meta: 450 - n * 3, unidad: 'ms' };
  if (id === 'parejas') {
    const parejas = 3 + Math.ceil(n / 10); // 4 parejas en el mundo 1 … 8 en el 5
    return { meta: Math.round(parejas * 2.2), parejas, unidad: 'intentos' };
  }
  return null;
}

// Configuración completa del nivel n de un juego: base + reto + las 3 metas de las estrellas.
export function configNivel(id, n) {
  const b = base(id, Math.min(n, NUM_NIVELES)); // pasado el 50, la base se queda en el techo
  if (!b) return null;
  const mundo = mundoDe(n);
  const variante = varianteDe(id, mundo);
  let reto = retoDe(n);
  if (variante === 'precision' && reto !== 'jefe' && n % 2 === 1) reto = 'sinfallo'; // la mitad, Sin fallar
  const menor = MENOR_ES_MEJOR.includes(id);
  const conTiempo = CON_TIEMPO.includes(id);
  let { meta, segundos = 0, dificultad = 'normal' } = b;
  // Cada 5 mundos a partir del 6 la meta sube un poco (en "menos es mejor", baja un 2 %), como mucho 5 veces.
  const extra = Math.min(5, Math.floor((mundo - 1) / 5));
  if (extra) meta = menor ? Math.round(meta * (1 - 0.02 * extra)) : meta + extra;
  if (variante === 'maraton') {
    segundos = Math.round(segundos * 1.5);
    meta = Math.round(meta * 1.4);
  } else if (variante === 'relampago') {
    segundos = Math.round(segundos * 0.75);
    meta = Math.round(meta * 0.75);
  }
  let sinFallar = false;
  if (reto === 'jefe') {
    meta = Math.round(meta * (menor ? 0.9 : 1.1));
  } else if (reto === 'sinfallo' && conTiempo) {
    sinFallar = true;
    meta = Math.round(meta * 0.7);
  } else if (reto === 'contrarreloj' && conTiempo) {
    segundos = Math.round(segundos * 0.75);
    meta = Math.round(meta * 0.8);
  } else if (reto === 'contrarreloj' && id === 'memoria' && dificultad !== 'dificil') {
    dificultad = 'dificil';
  } else {
    reto = 'normal'; // un reto que no cambia nada en este juego se juega (y se muestra) como Normal
  }
  const metas = menor
    ? [meta, Math.round(meta * 0.9), Math.round(meta * 0.8)]
    : [meta, Math.ceil(meta * 1.25), Math.ceil(meta * 1.5)];
  const signo = menor ? '≤' : '';
  const tiempo = segundos ? ` en ${segundos} s` : '';
  const texto = `⭐ ${signo}${metas[0]} · ⭐⭐ ${signo}${metas[1]} · ⭐⭐⭐ ${signo}${metas[2]} ${b.unidad}${tiempo}`;
  return { aciertosIniciales: 0, ...b, meta, metas, tope: metas[2], segundos, dificultad, sinFallar, reto, variante, mundo, texto };
}

// Estrellas conseguidas (0–3) con una puntuación. En "menos es mejor", 0 no es una marca válida.
export function estrellasDe(puntos, metas, menorEsMejor = false) {
  if (menorEsMejor) return puntos > 0 ? metas.filter((m) => puntos <= m).length : 0;
  return metas.filter((m) => puntos >= m).length;
}

// `estrellas`: lista de 50 números 0–3 (índice n − 1). Un nivel está libre si es el 1 o el anterior tiene ⭐.
export const nivelLibre = (estrellas, n) => n === 1 || (estrellas[n - 2] ?? 0) > 0;

// Guarda la mejor marca del nivel n (nunca baja). Devuelve una lista nueva.
export function conEstrellas(estrellas, n, nuevas) {
  const resultado = [...estrellas];
  resultado[n - 1] = Math.max(resultado[n - 1] ?? 0, nuevas);
  return resultado;
}

export const totalEstrellas = (estrellas) => estrellas.reduce((suma, e) => suma + (e || 0), 0);

// Progreso de la versión anterior (`superado` = nivel más alto superado) como 1 ⭐ por nivel.
export const desdeAntiguo = (superado) => Array.from({ length: NUM_NIVELES }, (_, i) => (i < superado ? 1 : 0));

// Siguiente nivel por jugar: el primero sin estrellas (los mundos no se acaban).
export function siguienteNivel(estrellas) {
  const i = estrellas.findIndex((e) => !(e > 0));
  return i === -1 ? estrellas.length + 1 : i + 1;
}

// --- Niveles diarios ---
// diarios de un juego: { 'AAAA-MM-DD': { niveles: [n, n, n], estrellas: [0–3, 0–3, 0–3] } }

// Los 3 niveles del día: uno por debajo, uno a tu altura y uno por encima de tu siguiente nivel.
export function nivelesDelDia(siguiente) {
  const centro = Math.max(3, siguiente);
  return [centro - 2, centro, centro + 2];
}

export const diarioCompleto = (dia) => Boolean(dia) && dia.estrellas.every((e) => e > 0);

// Días seguidos con los 3 diarios superados. Si hoy aún no, se cuenta desde ayer.
export function rachaDiaria(diarios, hoy) {
  let dia = diarioCompleto(diarios[hoy]) ? hoy : diaAnterior(hoy);
  let dias = 0;
  while (diarioCompleto(diarios[dia])) {
    dias++;
    dia = diaAnterior(dia);
  }
  return dias;
}

// Solo se guardan los últimos `maximo` días.
export function podarDiarios(diarios, maximo = 60) {
  return Object.fromEntries(Object.keys(diarios).sort().slice(-maximo).map((f) => [f, diarios[f]]));
}

export const estrellasDiarias = (diarios) =>
  Object.values(diarios).reduce((suma, dia) => suma + dia.estrellas.reduce((a, e) => a + (e || 0), 0), 0);
