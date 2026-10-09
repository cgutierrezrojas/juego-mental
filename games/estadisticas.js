// Estadísticas: historial, entrenamiento diario, rachas, perfil por habilidad y gráfica.
// Todo puro: recibe los datos y devuelve resultados; main.js lee/guarda y dibuja.

export const MAX_PARTIDAS = 100;

// Añade una partida ({ fecha, cuando, puntos, ms }) al final y se queda con las últimas 100.
export const anotar = (historial, partida) => [...historial, partida].slice(-MAX_PARTIDAS);

// Día local 'AAAA-MM-DD' (no UTC: a las 23:30 sigue siendo hoy).
export function fechaLocal(fecha = new Date()) {
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

export function diaAnterior(fecha) {
  const [a, m, d] = fecha.split('-').map(Number);
  return fechaLocal(new Date(a, m - 1, d - 1)); // Date ajusta solo el cambio de mes y de año
}

// Número fijo para un texto (hash FNV-1a): la misma fecha da siempre los mismos juegos.
function hash(texto) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h ^ (h >>> 16)) >>> 0; // mezcla los bits altos: sin esto, con % 2 el bit bajo casi alterna día a día
}

// Los 3 juegos del día: uno de cada categoría.
export const entrenoDelDia = (fecha, categorias) => categorias.map((ids, i) => ids[hash(`${fecha}#${i}`) % ids.length]);

// Juegos con al menos una partida terminada en esa fecha.
export const jugadosEn = (fecha, historiales) =>
  new Set(Object.keys(historiales).filter((id) => historiales[id].some((p) => p.fecha === fecha)));

export function entrenoCompleto(fecha, categorias, historiales) {
  const jugados = jugadosEn(fecha, historiales);
  return entrenoDelDia(fecha, categorias).every((id) => jugados.has(id));
}

// Días seguidos con el entrenamiento completo. Si hoy aún no está hecho, se cuenta desde ayer
// (la racha no se pierde hasta que acaba el día).
export function racha(hoy, categorias, historiales) {
  let dia = entrenoCompleto(hoy, categorias, historiales) ? hoy : diaAnterior(hoy);
  let dias = 0;
  while (entrenoCompleto(dia, categorias, historiales)) {
    dias++;
    dia = diaAnterior(dia);
  }
  return dias;
}

// Fechas (ordenadas) en las que el entrenamiento se completó.
function diasCompletos(categorias, historiales) {
  const fechas = new Set(Object.values(historiales).flat().map((p) => p.fecha));
  return [...fechas].sort().filter((f) => entrenoCompleto(f, categorias, historiales));
}

export function mejorRacha(categorias, historiales) {
  let mejor = 0;
  let actual = 0;
  let ultimo = null;
  for (const f of diasCompletos(categorias, historiales)) {
    actual = ultimo === diaAnterior(f) ? actual + 1 : 1;
    ultimo = f;
    mejor = Math.max(mejor, actual);
  }
  return mejor;
}

export const entrenosCompletados = (categorias, historiales) => diasCompletos(categorias, historiales).length;

// Qué tan cerca está una puntuación de la referencia de "muy bueno" (100) de su juego.
export function nivel(puntos, referencia, menorEsMejor = false) {
  if (puntos <= 0) return 0;
  return Math.round(Math.min(100, (menorEsMejor ? referencia / puntos : puntos / referencia) * 100));
}

// Para cada habilidad, la media del nivel de sus últimas 5 partidas (de cualquiera de sus juegos), o null.
export function perfil(juegos, historiales, habilidades) {
  return habilidades.map((habilidad) => {
    const niveles = juegos
      .filter((j) => j.habilidad === habilidad)
      .flatMap((j) => (historiales[j.id] ?? []).map((p) => ({ cuando: p.cuando, n: nivel(p.puntos, j.referencia, j.menorEsMejor) })))
      .sort((a, b) => a.cuando - b.cuando)
      .slice(-5)
      .map((x) => x.n);
    const valor = niveles.length ? Math.round(niveles.reduce((a, b) => a + b, 0) / niveles.length) : null;
    return { habilidad, valor };
  });
}

// Puntos "x,y" de la línea de la gráfica en un lienzo ancho×alto. La mejor puntuación queda arriba (y = 0).
// Con una sola partida o todas iguales, la línea es plana a media altura.
export function puntosGrafica(valores, ancho, alto, menorEsMejor = false) {
  if (!valores.length) return '';
  const lista = valores.length === 1 ? [valores[0], valores[0]] : valores;
  const min = Math.min(...lista);
  const max = Math.max(...lista);
  return lista.map((v, i) => {
    const x = Math.round((i / (lista.length - 1)) * ancho);
    let alturaRel = max === min ? 0.5 : (v - min) / (max - min); // 0 = peor, 1 = mejor (si mayor es mejor)
    if (menorEsMejor && max !== min) alturaRel = 1 - alturaRel;
    return `${x},${Math.round((1 - alturaRel) * alto)}`;
  }).join(' ');
}
