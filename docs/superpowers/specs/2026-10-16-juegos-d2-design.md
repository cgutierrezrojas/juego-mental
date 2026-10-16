# Juego Mental — D2: cuatro juegos nuevos

Fecha: 2026-10-16

Segunda entrega de D. Añade 🃏 Parejas, 🎯 El distinto, 🏋️ Balanza y ⚖️ Mayor o menor. Con ellos son 12 juegos. El usuario aprobó las reglas y las maquetas en el compañero visual.

## Reglas

| Juego | Habilidad (color) | Cómo se juega | Puntuación | Modos | Dificultad |
|---|---|---|---|---|---|
| 🃏 Parejas | Memoria (verde) | cartas con emoji boca abajo; se tocan 2: si son pareja quedan descubiertas, si no, se tapan a los 0,8 s; termina al encontrarlas todas | intentos, menos es mejor (unidad "intentos") | solo Normal | número de parejas: 4 / 6 / 8 |
| 🎯 El distinto | Atención (azul) | cuadrícula de cuadrados del mismo color salvo uno, más claro u oscuro; hay que tocarlo | aciertos | Normal 60 s · Rápido 30 s · Sin fallar | como Cálculo (`aciertosSegun`) |
| 🏋️ Balanza | Lógica (amarillo) | de 1 a 3 balanzas con frutas de peso oculto; hay que decir cuánto pesa la que se pregunta, entre 4 respuestas | aciertos | Normal · Rápido · Sin fallar | como Cálculo |
| ⚖️ Mayor o menor | Cálculo (rojo) | dos operaciones (nunca dan lo mismo); hay que tocar la que da más | aciertos | Normal · Rápido · Sin fallar | como Cálculo |

En los tres juegos de 60 s, fallar resta 3 s, igual que en Cálculo.

### Detalles

- **El distinto:**
  - La cuadrícula crece con los aciertos que ven los generadores: 2×2 hasta 3 aciertos, 3×3 de 4 a 8, 4×4 de 9 a 14 y 5×5 desde 15.
  - El color base es al azar: tono 0–359, saturación 65 % y luminosidad 45–59 %.
  - El distinto cambia la luminosidad en ±`max(4, 22 − aciertos)` puntos.
- **Balanza:**
  - Los pesos son enteros del 1 al 9.
  - Hasta 4 aciertos, una ecuación (`k` frutas iguales con `k` de 2 a 4), y se pregunta esa fruta.
  - De 5 a 9, dos ecuaciones (`A A = 2a`, `A B = a + b`), y se pregunta B.
  - Desde 10, tres ecuaciones (`A A`, `A B`, `B C`), y se pregunta C.
  - Las frutas salen al azar de 🍎 🍌 🍇 🍐 🍊 🍓.
  - Las opciones se generan con `generarOpciones(respuesta)`.
- **Mayor o menor:** dos operaciones de `generarOperacion` (los tramos de Cálculo); si dan el mismo resultado se generan otras.
- **Parejas:** los símbolos salen al azar de una lista de 10 emojis, y la cuadrícula tiene 4 columnas. En el perfil, la referencia es 9 intentos (Normal, 6 parejas).

## Esqueleto compartido

El distinto, Balanza y Mayor o menor usan `jugarConOpciones` (`games/opciones.js`). Con eso heredan los modos, la dificultad, el reloj, la penalización, `parar` y los niveles (D3). Para dibujar casillas que no son números, `generar` puede devolver además:

- `columnas`: columnas de la rejilla de opciones (por defecto 2).
- `pintar(boton, valor)`: retoca cada botón de opción. El distinto lo usa para pintar el color y quitar el texto.

Sin esos campos, la rejilla sigue siendo la de siempre.

## En la app

- Cada juego tiene su entrada en `JUEGOS`, con habilidad, color, referencia del perfil, modos y, en Parejas, `unidad` y `menorEsMejor`. Aparecen en su grupo del menú y usan la pantalla de juego nueva de D1.
- No tienen `categoria`, así que **no entran en el entrenamiento diario**. Esto evita recalcular los entrenamientos y las rachas pasadas.
- Tienen récord, historial, gráfica y perfil, como los demás. El modo Niveles llegará con D3.
- `sw.js` añade `games/parejas.js`, `games/distinto.js`, `games/balanza.js` y `games/mayor.js`.

## Pruebas (en `tests.js`)

- **Parejas:** `repartir(n)` da 2n cartas, cada símbolo exactamente dos veces y n símbolos distintos.
- **El distinto:** el lado según los aciertos (2/3/4/5); el distinto está dentro de la rejilla; la diferencia de luminosidad se ajusta a la fórmula, con mínimo 4.
- **Balanza:** en cada tramo hay 1, 2 o 3 ecuaciones; cada ecuación suma bien con los pesos; la respuesta es el peso de la fruta preguntada; los pesos van de 1 a 9.
- **Mayor o menor:** los dos resultados nunca son iguales y la correcta es la de mayor resultado.
- Lo visual y el juego completo se prueban en Chrome.
