# Juego Mental — D3: niveles ampliados

Fecha: 2026-10-16

Última entrega de D. Sustituye los 20 niveles de C2 por **50 niveles en 5 mundos** en los **12 juegos**, con **estrellas de 1 a 3** y **retos variados**. El usuario aprobó la maqueta en el compañero visual.

## Retos (los mismos números de nivel para todos los juegos)

(Curva suavizada al calcular las cifras: con 30 aciertos en 30 s el nivel 50 sería imposible.)

| Nivel | Reto | Efecto |
|---|---|---|
| 10, 20, …, 50 | 👑 Jefe | meta × 1,1 (o × 0,9 en los de "menos es mejor") |
| 5, 15, 25, 35, 45 | ❤️ Sin fallar | solo en juegos por tiempo: un fallo termina; meta × 0,7 |
| terminados en 3 o 7 | ⚡ Contrarreloj | en juegos por tiempo: tiempo × 0,75 y meta × 0,8; en Memoria, velocidad Difícil (si aún no lo era) |
| el resto | ⏱ Normal | — |

Un reto que no cambia nada en un juego se juega y se muestra como Normal (p. ej. ⚡ en Rayo).

- **Juegos por tiempo:** Cálculo, Mayor o menor, El distinto, Series, ¿Cuál sobra?, Balanza, Atención y Topos.
- **En los demás** (Memoria, Puzzle, Rayo y Parejas), los retos que no tienen sentido se juegan como Normal.

## Meta base del nivel N (1–50), antes del reto

| Juego | Meta base | Parámetros |
|---|---|---|
| Cálculo, Mayor o menor, El distinto | `5 + round(0,25·N)` aciertos | 30 s (El distinto: 45 s); preguntas desde `min(N−1, 20)` aciertos |
| Series, ¿Cuál sobra?, Balanza | igual | 60 s (Balanza: 75 s); igual |
| Atención | `6 + round(0,25·N)` puntos | 30 s; Difícil desde el nivel 11 |
| Memoria | secuencia de `3 + ⌊0,2·N⌋` colores | velocidad Difícil desde el nivel 21 |
| Topos | `10 + round(0,25·N)` puntos | 30 s; Fácil (1–10), Normal (11–30), Difícil (31–50) |
| Puzzle | `round(30 + 0,5·N)` movimientos o menos | desordenado con `10 + 4·N` movimientos |
| Rayo | `450 − 3·N` ms de media o menos | 5 intentos |
| Parejas | `round(2,2·parejas)` intentos o menos | parejas = `3 + ⌈N/10⌉` (4 en el mundo 1, 8 en el 5) |

## Estrellas

- **"Más es mejor":** ⭐ con la meta, ⭐⭐ con `⌈meta × 1,25⌉` y ⭐⭐⭐ con `⌈meta × 1,5⌉`.
- **"Menos es mejor"** (Puzzle, Rayo y Parejas): ⭐ con meta o menos, ⭐⭐ con `round(meta × 0,9)` y ⭐⭐⭐ con `round(meta × 0,8)`.
- **La partida ya no se corta al llegar a la meta.** En los juegos por tiempo, y en Memoria, termina al alcanzar las ⭐⭐⭐, se acabe el tiempo o (en Sin fallar) con el primer fallo.
- **Guardado:** se guarda la mejor marca de estrellas de cada nivel en `estrellas:<juego>`, una lista JSON de 50 números entre 0 y 3.
- **Paso desde la versión anterior:** si no hay `estrellas:<juego>`, cada nivel superado en `niveles:<juego>` cuenta como 1 ⭐.
- **Desbloqueo:** un nivel está libre si es el 1 o si el anterior tiene al menos 1 ⭐. Un mundo se abre al superar el jefe del anterior, porque su primer nivel queda libre.

## Pantalla del juego en modo Niveles

- **Total del juego**, por ejemplo "⭐ 23/150".
- **Fila de mundos** (1–5): bloqueados con 🔒 y completos (todos sus niveles con ⭐) con ✓.
- **Cuadrícula del mundo elegido**, 10 niveles en 5 columnas. Cada uno muestra su número, el icono del reto (❤️ ⚡ 👑) y sus estrellas (⭐⭐☆). Los de reto llevan un borde de color y los bloqueados, 🔒.
- **Objetivo:** "Nivel 17 · ⏱ Normal" y "⭐ 12 · ⭐⭐ 15 · ⭐⭐⭐ 18 aciertos en 30 s". En los de menos es mejor, con "≤".
- **Botón:** "▶ Jugar nivel 17".
- **Nivel por defecto:** el primero libre sin estrellas.
- **Accesibilidad:** las filas de mundos y niveles tienen `role="group"` y `aria-label`; el elegido lleva `aria-pressed` y recibe el foco tras repintar; cada nivel tiene un `aria-label` con su reto y sus estrellas; el objetivo es `aria-live`.
- **Subtítulo de la baldosa Niveles:** el total de estrellas, por ejemplo "⭐ 23".

## Final de un nivel

- "🪜 Nivel 17 · ⏱ Normal" y, si se supera, las estrellas conseguidas ("⭐⭐☆ ¡Superado!") junto a lo que hace falta para la siguiente ("⭐⭐⭐ con 18 aciertos").
- Si no se supera: "Nivel no superado (⭐ con 12 aciertos)".
- Con 1 ⭐ o más hay confeti y melodía, y el botón dice **Siguiente nivel** (salvo en el 50). Si no, **Reintentar**.

## Juegos

- Pasan a tener modo Niveles: Puzzle, Rayo, Parejas, Mayor o menor, El distinto y Balanza.
- Subtítulo Normal de los de un solo modo: Puzzle y Parejas, "sin tiempo"; Rayo, "5 intentos".
- `opciones.js`, `atencion.js` y `topos.js` terminan al alcanzar `nivel.tope` (⭐⭐⭐). Si `nivel.sinFallar`, el primer fallo termina sin restar.
- `memoria.js` termina con éxito al completar una secuencia de `nivel.tope` colores.
- `puzzle.js` desordena con `nivel.desorden` y `parejas.js` reparte `nivel.parejas`.

## Organización

- **`games/niveles.js`** (reescrito, puro):
  - `NUM_NIVELES = 50`, `NOMBRE_RETO`, `ICONO_RETO`, `retoDe(n)`;
  - `configNivel(id, n)` devuelve `{ meta, metas, tope, segundos, aciertosIniciales, dificultad, sinFallar, reto, desorden?, parejas?, unidad, texto }`;
  - `estrellasDe(puntos, metas, menorEsMejor)`;
  - `nivelLibre`, `conEstrellas`, `totalEstrellas`, `desdeAntiguo` y `siguienteNivel`.
- **`main.js`:** guarda y lee las estrellas (pasando el progreso antiguo), dibuja los mundos y los niveles, el final de nivel y los modos de los juegos.
- **`styles.css`:** mundos, niveles con estrellas, borde de reto y objetivo en dos líneas.

## Pruebas (en `tests.js`)

- **`retoDe`:** el patrón de la tabla.
- **`configNivel`:**
  - valores en algunos niveles (1, 3, 5, 10, 50) de varios juegos;
  - los 12 juegos tienen 50 niveles y Rayo/Puzzle ya no dan `null`;
  - las 3 metas de cada nivel están ordenadas (crecientes o decrecientes según el juego) y son distintas;
  - en Parejas, la meta ⭐⭐⭐ nunca baja del número de parejas.
- **`estrellasDe`:** 0, 1, 2 y 3 estrellas en los dos sentidos.
- **Progreso:** `nivelLibre`, `conEstrellas` (no baja), `totalEstrellas`, `desdeAntiguo` y `siguienteNivel`.
