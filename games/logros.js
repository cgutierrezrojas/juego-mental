// Logros (medallas): cada uno se consigue cuando un dato del resumen llega a su meta. Todo puro.
// `resumen`: { partidas, mejorRacha, entrenos, juegosJugados, estrellas, jefes, tresEstrellas, pasadoNivel50, diasRetos, victorias }.

export const LOGROS = [
  { id: 'primera', icono: '🎮', nombre: 'Primera partida', texto: 'Juega tu primera partida', dato: 'partidas', meta: 1 },
  { id: 'partidas-10', icono: '🔟', nombre: 'Constante', texto: '10 partidas', dato: 'partidas', meta: 10 },
  { id: 'partidas-100', icono: '💯', nombre: 'Centenario', texto: '100 partidas', dato: 'partidas', meta: 100 },
  { id: 'entreno-1', icono: '☀️', nombre: 'Buen día', texto: 'Completa tu primer entrenamiento', dato: 'entrenos', meta: 1 },
  { id: 'entreno-10', icono: '📆', nombre: 'Disciplina', texto: '10 entrenamientos completos', dato: 'entrenos', meta: 10 },
  { id: 'racha-3', icono: '🔥', nombre: 'En marcha', texto: 'Racha de 3 días', dato: 'mejorRacha', meta: 3 },
  { id: 'racha-7', icono: '⚡', nombre: 'Una semana', texto: 'Racha de 7 días', dato: 'mejorRacha', meta: 7 },
  { id: 'racha-30', icono: '🏅', nombre: 'Imparable', texto: 'Racha de 30 días', dato: 'mejorRacha', meta: 30 },
  { id: 'explorador', icono: '🗺️', nombre: 'Explorador', texto: 'Juega los 12 juegos', dato: 'juegosJugados', meta: 12 },
  { id: 'estrellas-50', icono: '⭐', nombre: 'Estrellado', texto: '50 estrellas', dato: 'estrellas', meta: 50 },
  { id: 'estrellas-250', icono: '🌟', nombre: 'Constelación', texto: '250 estrellas', dato: 'estrellas', meta: 250 },
  { id: 'estrellas-1000', icono: '💫', nombre: 'Galaxia', texto: '1000 estrellas', dato: 'estrellas', meta: 1000 },
  { id: 'jefe-1', icono: '👑', nombre: 'Primer jefe', texto: 'Vence a un jefe de mundo', dato: 'jefes', meta: 1 },
  { id: 'jefe-10', icono: '🐉', nombre: 'Cazajefes', texto: 'Vence a 10 jefes', dato: 'jefes', meta: 10 },
  { id: 'perfecto-25', icono: '💎', nombre: 'Perfeccionista', texto: '25 niveles con ⭐⭐⭐', dato: 'tresEstrellas', meta: 25 },
  { id: 'nivel-50', icono: '🚀', nombre: 'Más allá', texto: 'Supera el nivel 50 de un juego', dato: 'pasadoNivel50', meta: 1 },
  { id: 'retos-1', icono: '📅', nombre: 'Retador', texto: 'Completa los 3 retos de hoy de un juego', dato: 'diasRetos', meta: 1 },
  { id: 'retos-7', icono: '🗓️', nombre: 'Retador fiel', texto: '7 días con retos de hoy completos', dato: 'diasRetos', meta: 7 },
  { id: 'duelo-1', icono: '⚔️', nombre: 'Duelista', texto: 'Gana tu primer duelo', dato: 'victorias', meta: 1 },
  { id: 'duelo-10', icono: '🏆', nombre: 'Campeón', texto: 'Gana 10 duelos', dato: 'victorias', meta: 10 },
];

// Progreso de un logro: cuánto llevas (sin pasar de la meta) y si está conseguido.
export function progreso(logro, resumen) {
  const valor = Math.min(logro.meta, resumen[logro.dato] ?? 0);
  return { valor, conseguido: valor >= logro.meta };
}

// Logros que el resumen ya cumple y que aún no estaban en `conseguidos` ({ id: fecha }).
export const logrosNuevos = (resumen, conseguidos) =>
  LOGROS.filter((l) => !conseguidos[l.id] && progreso(l, resumen).conseguido);
