// Niveles: 20 por juego, cada uno con un objetivo. Todo puro.

export const NUM_NIVELES = 20;

// Configuración del nivel n (1–20) de un juego, o null si ese juego no tiene niveles:
// meta (aciertos/puntos/longitud a alcanzar), segundos del reloj, aciertos con los que "empiezan"
// las preguntas (sube el tramo de dificultad), dificultad del juego y texto del objetivo.
export function configNivel(id, n) {
  if (['calculo', 'series', 'sobra'].includes(id)) {
    const meta = 6 + Math.floor(n / 2);
    const segundos = id === 'calculo' ? 30 : 60; // Series y ¿Cuál sobra? piensan más por pregunta
    return { meta, segundos, aciertosIniciales: n - 1, dificultad: 'normal', texto: `${meta} aciertos en ${segundos} s` };
  }
  if (id === 'atencion') {
    const meta = 6 + n;
    return { meta, segundos: 30, aciertosIniciales: 0, dificultad: n >= 11 ? 'dificil' : 'normal', texto: `${meta} puntos en 30 s` };
  }
  if (id === 'memoria') {
    const meta = 3 + Math.floor(n * 0.55);
    return { meta, segundos: 0, aciertosIniciales: 0, dificultad: n >= 11 ? 'dificil' : 'normal', texto: `secuencia de ${meta} colores` };
  }
  if (id === 'topos') {
    const meta = 10 + n;
    const dificultad = n <= 6 ? 'facil' : n <= 13 ? 'normal' : 'dificil';
    return { meta, segundos: 30, aciertosIniciales: 0, dificultad, texto: `${meta} puntos en 30 s` };
  }
  return null;
}

// `superado`: nivel más alto superado (0 si ninguno). Se puede jugar hasta el siguiente.
export const desbloqueado = (superado, n) => n <= superado + 1;

// Progreso tras jugar el nivel n: solo sube si se superó un nivel más alto que el guardado.
export const nuevoProgreso = (superado, n, logrado) => (logrado && n > superado ? n : superado);
