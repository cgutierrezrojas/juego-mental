# Ruleta personalizable (Trivia) — diseño

Extensión de S3a: la 🎡 Ruleta y la 🎉 Fiesta se pueden personalizar antes de jugar.

## Ajustes

Se guardan en `trivia:ajustes` (se sincroniza y entra en la copia, como todo `trivia:`). Si falta o está mal, se usa la clásica.

| Clave | Qué es | Opciones | Clásica |
|---|---|---|---|
| `barra` | aciertos para ir por la corona | 1, 2, 3, 4, 5 | 3 |
| `corona` | preguntas de la corona (hay que acertarlas todas seguidas) | 1, 2, 3 | 1 |
| `coronas` | coronas para ganar | 3, 4, 5, 6 | 6 |
| `vidas` | vidas en solitario (`null` = ∞; en la fiesta siempre `null`) | 1, 2, 3, 5, ∞ | 3 |
| `segundos` | tiempo por pregunta (`0` = sin reloj) | 10, 20, 30, 0 | 20 |
| `comodines` | `{ mitad, cambiar, segunda, tiempo }` | 0–3 cada uno | 0 |

`esClasica(a)` dice si son exactamente los clásicos.

## Pantallas

- **Ruleta** → pantalla previa en `#trivia-partida`: resumen en una línea («Clásica: …» o «Personalizada: …»), **▶ Empezar**, **⚙️ Personalizar**, **Volver**.
- **Fiesta** → la pantalla de nombres muestra el mismo resumen y un botón **⚙️ Personalizar**.
- **⚙️ Personalizar**: una fila de botones por ajuste (estilo `.baldosas`, `aria-pressed`), la fila de vidas solo en solitario, **Volver a la clásica** y **Listo** (vuelve a la pantalla de donde vino). Cada toque guarda.

## Reglas (`games/ruleta.js`, puro)

- `inicial(a)` → `{ coronas: [], barra: 0, vidas, aciertos: 0, fallos: 0, progreso: 0, comodines: {...a.comodines} }`; las reglas reciben los ajustes donde los necesitan (`tocaCorona(e, a)`, `resultado(e, a)`, `responder(e, ok, a)`).
- Corona de varias preguntas: `responderCorona(e, cat, ok, a)` — acierto con `progreso + 1 < a.corona` suma `progreso`; acierto final da la corona y vuelve `barra` y `progreso` a 0; fallo = fallo normal (barra y progreso a 0, resta vida).
- `usar(e, tipo)` resta un comodín (nunca baja de 0).
- `resultado`: `'gana'` con `a.coronas` coronas; `'pierde'` con 0 vidas.

## Comodines en la pregunta

Botones bajo las opciones con lo que queda (`✂️ 50:50 ×2`); se ocultan los que están a 0.

- **✂️ 50:50**: deshabilita dos opciones incorrectas al azar. Uno por pregunta.
- **🔄 Cambiar**: otra pregunta de la misma categoría (dificultad 3 si es corona); el progreso de la corona se mantiene y el reloj vuelve a empezar.
- **⏱️ Más tiempo**: +15 s al reloj. No aparece sin reloj.
- **🔁 Segunda oportunidad**: el jugador la activa antes de responder (una por pregunta; solo se gasta si falla y lo salva). Si falla con ella activa, la opción elegida queda en rojo y deshabilitada y se vuelve a elegir; el reloj sigue. No salva si se acaba el tiempo.

La cabecera de una corona de varias preguntas muestra `👑 2/3`.

## Récord

Solo las partidas en solitario con ajustes clásicos actualizan `trivia:ruleta` y los logros. Todas suman `ligaAnotar('partida')`.

## Pruebas

`tests.js`: barra configurable, corona de 2–3 preguntas (avanza, gana, se pierde al fallar), coronas para ganar, vidas ∞, `usar` no baja de 0, `esClasica`, lectura de ajustes inválidos → clásica. Prueba en Chrome: personalizar, jugar con comodines, Fiesta con ajustes, ancho 390, tema claro y oscuro.
