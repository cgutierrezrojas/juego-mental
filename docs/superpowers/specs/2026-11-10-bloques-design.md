# 🧩 Bloques (Arcade) — diseño

Juego de bloques que caen, propio (sin el nombre ni el aspecto de ninguna marca), dentro de 🏎️ Arcade, con cuatro modalidades.

## Juego (`games/bloques.js`, puro, como `ladrillos.js`)

- Tablero de 10 columnas × 20 filas; las 7 piezas de 4 cuadros (I, O, T, S, Z, J, L). Se ve la **siguiente** pieza.
- Orden por **bolsa de 7** (las 7 piezas barajadas, luego otra bolsa) con el generador con semilla de `games/semilla.js`: misma semilla = mismas piezas (retos).
- Girar en sentido horario; si choca, se prueba desplazada 1 y 2 casillas a cada lado (y 1 arriba); si nada cabe, no gira.
- Gravedad por nivel (cuadros por fila, a 60 cuadros/s): `max(2, 48 - 4·(nivel-1))`. En el suelo espera **30 cuadros** antes de fijarse (mover o girar con éxito reinicia la espera, como máximo 15 veces por pieza).
- Puntos al hacer líneas: 1/2/3/4 líneas = 100/300/500/800 × nivel. Bajar rápido +1 por casilla, soltar de golpe +2 por casilla.
- Fin: una pieza nueva no cabe al aparecer.
- `nuevo(semilla, modo)` y `paso(e, entrada)` (un cuadro). Entrada: `'izquierda' | 'derecha' | 'girar' | 'soltar' | null`, más `e.bajando` (▼ mantenido) que pone la app. El estado guarda `puntos`, `lineas`, `nivel`, `cuadros` (tiempo), `fin`.

## Modalidades

| id | Nombre | Regla | Récord (`record:…`) |
|---|---|---|---|
| `clasico` | 🧩 Clásico | Sin fin; nivel = 1 + líneas/10 | `record:bloques` (puntos) · **ranking, liga y retos** |
| `contrarreloj` | ⏱️ Contrarreloj | Termina al llegar a 40 líneas (gana); si se tapa, no hay marca | `record:bloques:contrarreloj` (décimas de segundo, menos es mejor) |
| `dosmin` | ⏳ 2 minutos | Termina a los 120 s; nivel fijo 5 | `record:bloques:dosmin` (puntos) |
| `escombros` | 🪨 Escombros | Empieza con 8 filas de basura (un hueco al azar por fila); cada 10 s sube una fila de basura desde abajo; nivel fijo 3 | `record:bloques:escombros` (líneas) |

- Solo `record:bloques` (Clásico) va al ranking (`datosRanking` ya ignora las claves con `:`).
- Los retos con amigos son siempre en Clásico.

## App (`app/arcade.js`)

- `JUEGOS.bloques` con `controles: 'bloques'` y `modos`. Al abrir Bloques: botones de modalidad (con su récord) antes de ▶ Jugar; en un reto, Clásico directo.
- El récord y el marcador usan la clave y la unidad del modo (tiempo como `1:23.4`); Contrarreloj compara con `esRecord(…, menorEsMejor)`.
- **Controles:** fila de botones bajo el tablero: ◀ ▶ (mantener repite: tras 10 cuadros, uno cada 3), ⟳ girar, ▼ bajar rápido (mientras se mantiene), ⏬ soltar. **Gestos** sobre el tablero: tocar = girar, deslizar a los lados = mover una casilla por cada 30 unidades, deslizar abajo = soltar. Teclado: ← → mover, ↑ girar, ↓ bajar, espacio soltar.
- Dibujo: celdas redondeadas con los colores de la paleta (`colores()`), cuadrícula tenue, sombra de dónde caerá la pieza, y a la derecha «Siguiente», líneas, nivel y (según el modo) el tiempo.
- Pausa al ocultar la app, como los demás.

## Resto

- `app/juegos.js`: `{ id: 'bloques', nombre: 'Bloques', icono: '🧩', … }`.
- `games/sincro.js` `LIMITES.bloques = [1, 10000000]`; `firestore.rules`: `bloques` en `recordsValidos` (1–10.000.000) y en `topes()` de duelos (10.000.000). **El usuario publica `firestore.rules` antes de que la web salga**: sin eso, las reglas rechazan la fila del ranking de quien tenga récord de Bloques.
- `sw.js`: `games/bloques.js` en la lista.

## Pruebas (`tests.js`)

- Misma semilla → misma secuencia; cada bolsa de 7 trae las 7 piezas.
- Línea completa se borra y suma 100 × nivel; cuatro líneas 800 × nivel.
- No gira dentro de una pared ocupada; junto a la pared, gira desplazándose.
- Soltar suma 2 por casilla y fija la pieza en el acto.
- Contrarreloj termina a las 40 líneas; 2 minutos termina a los 7200 cuadros; Escombros empieza con 8 filas y sube una a los 600 cuadros.
- Fin cuando la pieza nueva no cabe.
- Navegador: jugar cada modalidad, botones y gestos, tema claro y oscuro, y en el emulador (WebView antiguo).
