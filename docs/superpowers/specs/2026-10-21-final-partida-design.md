# Juego Mental — F2: final de partida

Fecha: 2026-10-21

Segunda mejora de la ronda F. En el compañero visual, el usuario eligió la opción A: estrellas grandes y una barra de metas. Para los modos sin estrellas eligió la C: la misma barra, pero comparando con la media y el récord. Aprobó este diseño.

## Pantalla, de arriba abajo

1. **Modo:** igual que ahora, por ejemplo "🪜 Nivel 17 · ⏱ Normal" o "⏱ Normal · 😐 Normal".
2. **Estrellas** (solo en Niveles):
   - son 3 estrellas grandes; las conseguidas caen una a una (a los 0,3 s, 0,65 s y 1 s), cada una con su sonido `acierto`;
   - las que no se consiguen se quedan en gris;
   - para el lector de pantalla son `role="img"` con la etiqueta "N de 3 estrellas".
3. **Titular:** "¡Superado!" (verde), "No superado" (rojo), "🏆 ¡Nuevo récord!" o nada.
4. **Puntuación** en grande y, debajo, su unidad: en Niveles, la del nivel; si no, la del juego (sin unidad si no la tiene).
5. **Barra:** se llena desde 0 hasta tu puntuación con una animación de 0,9 s.
   - **Niveles:** marca ⭐, ⭐⭐ y ⭐⭐⭐, con su número debajo.
   - **Otros modos:** marca 📊 la media de tus últimas 10 partidas anteriores (mismo modo y dificultad) y 🏆 tu récord de antes de esta partida. Solo salen las marcas que existen. Sin ninguna, no hay barra.
   - **"Menos es mejor"** (Rayo, Puzzle, Parejas): la barra está invertida, de modo que a la derecha siempre es mejor.
6. **Frase de lo que faltó:**
   - **Niveles:**
     - "Te faltaron 2 aciertos para ⭐⭐⭐" (con 1, "Te faltó 1 acierto…");
     - en los de menos es mejor, "Te faltó bajar 12 ms para ⭐⭐";
     - con las 3, "¡Las 3 estrellas!".
     - Si es un reto de hoy y completa los 3, se añade en otra línea "¡Diarios de hoy completos! 📅🔥 N".
   - **Otros modos:**
     - "🏆 2 aciertos mejor que tu récord anterior";
     - "¡Tu primer récord!";
     - "¡Igualaste tu récord (21)!";
     - "A 3 aciertos de tu récord (21)".
     - Sin récord anterior ni récord nuevo, no hay frase.
     - La unidad de las frases es la del juego, o "puntos" si no tiene.
7. **Botones:** el grande es "▶ Siguiente nivel", "▶ Siguiente diario", "↻ Reintentar" o "↻ Repetir". Debajo va una fila con "↻ Por ⭐⭐⭐" (cuando sale) y "🏠 Menú".

Se mantienen el aviso de entrenamiento completado y el confeti. En Niveles, el confeti y la melodía esperan a que caigan las estrellas. Con `prefers-reduced-motion` no hay animaciones: todo aparece directamente.

## Organización

- **`games/final.js`** (nuevo y puro):
  - `barraFinal(puntos, marcas, menorEsMejor)` devuelve `{ relleno, marcas }`, con posiciones de 0 a 1.
    - Trabaja en un espacio donde "más es mejor" (en menos es mejor, invierte el signo).
    - El tramo va desde la marca más baja menos su separación hasta la más alta más media separación.
    - Si todas las marcas coinciden, la separación es el 20 % de su valor, o 1.
    - El resultado se recorta a [0, 1].
  - `fraseEstrellas(puntos, metas, conseguidas, unidad, menorEsMejor)`.
  - `fraseRecord(puntos, anterior, unidad, menorEsMejor)`.
  - Las unidades van en singular con 1: acierto, punto, color, movimiento, intento; "ms" no cambia.
- **`index.html`:** la sección `#final`, reorganizada.
- **`main.js`:** `terminar()` rellena las piezas nuevas y una función `pintarBarra` dibuja la barra.
- **`styles.css`:** las estrellas, la barra con sus marcas, la fila de botones y las animaciones.

## Pruebas

- **`tests.js`:**
  - `barraFinal` en los dos sentidos (12/15/18 dan 0,4/0,6/0,8), con el recorte y con marcas iguales;
  - las frases con plural y singular, menos es mejor, 3 estrellas, récord nuevo, igualado y por debajo.
- **Chrome:**
  - un nivel con ⭐⭐ (barra, frase y tres botones);
  - un modo Normal con récord y media;
  - una primera partida, sin barra;
  - Rayo con la barra invertida;
  - temas claro y oscuro, a 390 px.
