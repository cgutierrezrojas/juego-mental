// Final de partida: barra de metas (posiciones 0–1) y frase de lo que faltó. Todo puro.

const SINGULAR = { aciertos: 'acierto', puntos: 'punto', colores: 'color', movimientos: 'movimiento', intentos: 'intento' };
const cantidad = (n, unidad) => `${n} ${n === 1 ? SINGULAR[unidad] ?? unidad : unidad}`;

// Posición (0–1) de la puntuación (`relleno`) y de cada marca. En "menos es mejor" se invierte: a la derecha, mejor.
// El tramo va desde la marca más baja menos su separación hasta la más alta más media separación.
export function barraFinal(puntos, marcas, menorEsMejor = false) {
  const valor = (x) => (menorEsMejor ? -x : x);
  const min = Math.min(...marcas.map(valor));
  const max = Math.max(...marcas.map(valor));
  const tramo = max - min || Math.abs(max) * 0.2 || 1; // marcas iguales: un 20 % de su valor
  const desde = min - tramo;
  const hasta = max + tramo / 2;
  const posicion = (x) => Math.min(1, Math.max(0, (valor(x) - desde) / (hasta - desde)));
  return { relleno: posicion(puntos), marcas: marcas.map(posicion) };
}

// Niveles: cuánto faltó para la siguiente estrella.
export function fraseEstrellas(puntos, metas, conseguidas, unidad, menorEsMejor = false) {
  if (conseguidas === 3) return '¡Las 3 estrellas!';
  const falta = Math.abs(metas[conseguidas] - puntos);
  const estrellas = '⭐'.repeat(conseguidas + 1);
  if (menorEsMejor) return `Te faltó bajar ${cantidad(falta, unidad)} para ${estrellas}`;
  return `${falta === 1 ? 'Te faltó' : 'Te faltaron'} ${cantidad(falta, unidad)} para ${estrellas}`;
}

// Otros modos: comparación con el récord de antes de esta partida (`anterior` = 0 si no había).
export function fraseRecord(puntos, anterior, unidad, menorEsMejor = false) {
  if (!anterior) return '¡Tu primer récord!';
  const mejora = menorEsMejor ? anterior - puntos : puntos - anterior;
  if (mejora > 0) return `🏆 ${cantidad(mejora, unidad)} mejor que tu récord anterior`;
  if (mejora === 0) return `¡Igualaste tu récord (${anterior})!`;
  return `A ${cantidad(-mejora, unidad)} de tu récord (${anterior})`;
}
