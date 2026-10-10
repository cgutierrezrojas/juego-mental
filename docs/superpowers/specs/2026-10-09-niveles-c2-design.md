# Juego Mental — Fase C2: niveles

Fecha: 2026-10-09

Segunda entrega de la fase C. Añade el modo **🪜 Niveles**: 20 niveles por juego, cada uno con un objetivo. Al superar un nivel se desbloquea el siguiente.

## Juegos y objetivos

| Juego | Objetivo del nivel N (1–20) | Dificultad del nivel |
|---|---|---|
| Cálculo, Series, ¿Cuál sobra? | `6 + ⌊N/2⌋` aciertos (6 → 16) en 30 s (Cálculo) o 60 s (Series, ¿Cuál sobra?) | las preguntas empiezan como si ya llevaras `N − 1` aciertos |
| Atención | `6 + N` puntos en 30 s (7 → 26) | Normal del 1 al 10; Difícil (botones barajados) del 11 al 20 |
| Memoria | secuencia de `3 + ⌊N × 0,55⌋` colores (3 → 14) | velocidad Normal del 1 al 10; Difícil del 11 al 20 |
| Topos | `10 + N` puntos en 30 s (11 → 30) | Fácil (1–6), Normal (7–13), Difícil (14–20) |

- Rayo y Puzzle no tienen niveles.
- Las metas nunca bajan de un nivel al siguiente.

## En la previa

- **🪜 Niveles** es un modo más en la fila Modo de esos 6 juegos. En Memoria y Topos, la fila pasa a tener dos botones: Normal y Niveles.
- En modo Niveles se ocultan la fila de dificultad (la pone el nivel), el récord y la gráfica. En su lugar aparece una cuadrícula de 5 × 4 con los niveles:
  - "⭐N" si está superado;
  - "N" si está desbloqueado;
  - "🔒N" si está bloqueado (deshabilitado).
- El nivel elegido queda resaltado (`aria-pressed`). Por defecto es el siguiente al más alto superado. Debajo se ve el objetivo, por ejemplo "Nivel 4: 8 aciertos en 30 s".
- Cada botón lleva `aria-label` ("Nivel 4, superado", "Nivel 9, bloqueado").

## Jugar un nivel

- `start` recibe `opciones = { modo: 'niveles', dificultad, nivel: { meta, segundos, aciertosIniciales, … } }`.
- **Juegos por tiempo:** el reloj dura `nivel.segundos` y el marcador muestra el progreso hacia la meta ("Aciertos: 3/8", "Puntos: 5/12").
- **Al alcanzar la meta**, la partida termina en ese momento, tras un destello de 0,4 s, con la puntuación conseguida.
- **Memoria:** al completar una secuencia de la longitud meta dice "✓ ¡Nivel superado!" y termina. El estado muestra "Ronda 3 de 6".
- **Cuándo cuenta como superado:** si la puntuación final es igual o mayor que la meta.

## Final de un nivel

- Bajo la puntuación aparece "🪜 Nivel N" y:
  - si lo superas, "⭐ ¡Nivel N superado!", con confeti y melodía;
  - si no, "Nivel no superado (objetivo: …)".
- El botón Repetir pasa a llamarse:
  - **Siguiente nivel**, si lo has superado y no era el 20. Al pulsarlo juegas el nivel N+1.
  - **Reintentar**, en el resto de casos.
- Fuera del modo Niveles vuelve a decir "Repetir".
- En Niveles no hay récord.

## Progreso y estadísticas

- `niveles:<juego>` guarda el nivel más alto superado (0 si ninguno). Superar un nivel más bajo no lo reduce.
- Las partidas de niveles se anotan en el historial con `modo: 'niveles'` y `nivel: N`. Cuentan para el entrenamiento diario y los contadores. No entran en el perfil, que solo usa Normal + Normal.

## Organización

- **`games/niveles.js`** (nuevo, puro): `NUM_NIVELES = 20`, `configNivel(id, n)` (devuelve `{ meta, segundos, aciertosIniciales, dificultad, texto }`, o `null` si el juego no tiene niveles), `desbloqueado(superado, n)` y `nuevoProgreso(superado, n, logrado)`.
- **`games/modos.js`:** `MODOS.niveles = '🪜 Niveles'`.
- **`games/opciones.js`, `atencion.js`, `memoria.js`, `topos.js`:** soportan `opciones.nivel`. Sin él no cambia nada.
- **`main.js`:** modo `niveles` en los 6 juegos, la cuadrícula, las opciones del nivel al jugar, el final de nivel y el progreso.
- **`index.html`:** `#previa-record-linea` (id para la línea del récord), `#previa-niveles` y `#final-nivel`.
- **`sw.js`:** `games/niveles.js`.

## Pruebas (en `tests.js`)

- `configNivel`: los valores de la tabla en los niveles 1, 11 y 20 de cada juego; `null` para Rayo y Puzzle; las metas no bajan del 1 al 20.
- `desbloqueado` y `nuevoProgreso`: el siguiente al superado está libre y el de después no; superar uno más alto sube el progreso; uno más bajo o no superado no lo cambia.

Lo demás (cuadrícula, terminar al llegar a la meta, Siguiente nivel, progreso guardado) se prueba jugando en Chrome.
