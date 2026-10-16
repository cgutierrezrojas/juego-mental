// Niveles: 50 por juego en 5 mundos de 10, con estrellas (1–3) y retos. Todo puro.

export const NUM_NIVELES = 50;
export const NOMBRE_RETO = { normal: '⏱ Normal', sinfallo: '❤️ Sin fallar', contrarreloj: '⚡ Contrarreloj', jefe: '👑 Jefe' };
export const ICONO_RETO = { normal: '', sinfallo: '❤️', contrarreloj: '⚡', jefe: '👑' };

// Segundos de los juegos de opciones; Atención y Topos son de 30 s.
const OPCIONES = { calculo: 30, mayor: 30, distinto: 45, series: 60, sobra: 60, balanza: 75 };
const CON_TIEMPO = [...Object.keys(OPCIONES), 'atencion', 'topos'];
const MENOR_ES_MEJOR = ['puzzle', 'rayo', 'parejas'];

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
  const b = base(id, n);
  if (!b) return null;
  let reto = retoDe(n);
  const menor = MENOR_ES_MEJOR.includes(id);
  const conTiempo = CON_TIEMPO.includes(id);
  let { meta, segundos = 0, dificultad = 'normal' } = b;
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
  return { aciertosIniciales: 0, ...b, meta, metas, tope: metas[2], segundos, dificultad, sinFallar, reto, texto };
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

// Primer nivel libre sin estrellas (o el último, si están todos).
export function siguienteNivel(estrellas) {
  for (let n = 1; n <= NUM_NIVELES; n++) if (nivelLibre(estrellas, n) && !(estrellas[n - 1] > 0)) return n;
  return NUM_NIVELES;
}
