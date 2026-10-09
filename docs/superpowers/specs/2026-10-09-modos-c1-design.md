# Juego Mental — Fase C1: modos y dificultad

Fecha: 2026-10-09

Primera entrega de la fase C. Añade a la previa la elección de **modo** (Normal, Rápido, Hasta fallar) y **dificultad** (Fácil, Normal, Difícil), con récords e historial separados por combinación. Los niveles van en C2.

## Qué tiene cada juego

| Juego | Modos | Dificultad |
|---|---|---|
| Cálculo, Series, ¿Cuál sobra? | Normal (60 s) · Rápido (30 s) · Hasta fallar | Fácil: los generadores no pasan del 2.º tramo (aciertos vistos ≤ 9) · Normal: como ahora · Difícil: empiezan en el 3.º (aciertos + 10) |
| Atención | Normal (60 s) · Rápido (30 s) · Hasta fallar | Fácil: los errores no restan · Normal: como ahora · Difícil: los 4 botones cambian de orden en cada ronda |
| Memoria | solo Normal | velocidad por color: 800 / 600 / 400 ms (mínimo con la aceleración: 350 / 250 / 180) |
| Puzzle | solo Normal | movimientos al desordenar: 20 / 100 / 300 |
| Topos | solo Normal | duración del topo: 1300 / 1000 / 750 ms, que baja 25 ms por acierto hasta un mínimo de 600 / 450 / 350 |
| Rayo | solo Normal | sin dificultad |

- **Hasta fallar:** sin reloj; el marcador muestra "❌ Hasta fallar". El primer fallo enseña el anillo rojo (y la pista, si la hay), y 0,6 s después termina la partida. Puntuación = aciertos.
- Normal + Normal es exactamente el juego de hoy.

## Elección en la previa

- Bajo las instrucciones aparecen dos filas de botones: **Modo**, solo si el juego tiene más de uno, y **Dificultad**, salvo en Rayo. El botón elegido queda resaltado con `aria-pressed`.
- La elección de cada juego se guarda en `eleccion:<id>` como `"<modo>|<dificultad>"`. Si el valor no es válido para ese juego, se usa Normal + Normal.
- Al cambiar la elección se actualizan en el momento el récord y la gráfica de la previa.
- `start(pantalla, alTerminar, opciones)` recibe `{ modo, dificultad }`. Quien no las usa las ignora, y sin `opciones` todo funciona como antes.

## Récords, historial y estadísticas

- **Récord** con `claveRecord(id, modo, dificultad)`: Normal + Normal es `record:<id>`, la de siempre, así que se conservan los récords que ya existen. El resto usa `record:<id>:<modo>:<dificultad>`.
- **Cada partida** guarda también `modo` y `dificultad`. Las antiguas, sin esos campos, cuentan como Normal + Normal (`esDe(partida, modo, dificultad)`).
- **La gráfica y la media de la previa** muestran solo las partidas del modo y la dificultad elegidos.
- **La pantalla final** muestra bajo la puntuación la etiqueta "Rápido · Difícil"; en Normal + Normal no muestra nada.
- **Pantalla 📊:** el perfil por habilidad solo usa partidas Normal + Normal (`filtrar(historiales, 'normal', 'normal')`) y los récords listados son los Normal + Normal. El entrenamiento diario y los contadores cuentan cualquier modo.

## Organización

- **`games/modos.js`** (nuevo, puro): `MODOS`, `DIFICULTADES` (nombres visibles), `claveRecord`, `esDe`, `filtrar`, `aciertosSegun(aciertos, dificultad)` y `etiqueta(modo, dificultad)`.
- **`games/opciones.js`:** `jugarConOpciones(pantalla, alTerminar, generar, claseEnunciado, opciones)` aplica el modo y la dificultad. Su `parar()` limpia también el temporizador de 0,6 s de "Hasta fallar".
- **`games/calculo.js`, `series.js`, `sobra.js`:** pasan `opciones`.
- **`games/atencion.js`:** modos y dificultad propios.
- **`games/memoria.js`:** `pausa(ronda, dificultad)`. **`games/puzzle.js`:** `barajarPuzzle(rnd, movimientos)`. **`games/topos.js`:** `duracionTopo(aciertos, dificultad)`. Sin el segundo argumento dan los valores de hoy.
- **`main.js`:** la elección, las filas de botones, los récords, el historial y la etiqueta por modo, y el perfil Normal.
- **`index.html`:** `#previa-modos` y `#final-modo`. **`sw.js`:** `games/modos.js`.

## Pruebas (en `tests.js`)

- `claveRecord`: la de siempre en Normal + Normal y la compuesta en el resto. `etiqueta`: vacía en Normal + Normal.
- `aciertosSegun`: Fácil topa en 9, Normal no cambia, Difícil suma 10.
- `esDe` y `filtrar`: las partidas sin campos cuentan como Normal + Normal; se filtra por modo y por dificultad.
- `pausa` y `duracionTopo` con dificultad: los valores de la tabla, y sin dificultad, los de antes.
- `barajarPuzzle` con 20 y 300 movimientos: nunca resuelto, y de media hay menos fichas fuera de sitio con 20 que con 300.

Lo visual (filas de botones, Rápido, Hasta fallar, Atención difícil, etiqueta final, récords separados) se prueba jugando en Chrome.

## Fuera de alcance

Niveles (C2). Las instrucciones de cada juego no cambian según el modo, porque los botones ya lo indican.
