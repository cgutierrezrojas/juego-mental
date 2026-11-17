# Ronda 2 🎲 Mesa: Damas, Reversi, Puntos y cajas, Batalla naval — diseño

Aprobado por el usuario el 2026-11-17. La sección Mesa pasa de 2 a 6 juegos.

## Objetivo

Agregar cuatro juegos de tablero a la sección 🎲 Mesa, reutilizando el motor de [app/mesa.js](../../../app/mesa.js). Cada juego tiene los mismos tres modos que el Gato y el 4 en línea:

- **Contra la máquina**, con niveles Fácil, Normal y Difícil.
- **A dos en un celular.**
- **Contra un amigo.** La Batalla naval solo se juega por turnos.

## Arquitectura

Se sigue el patrón del Gato.

**Reglas.** Cada juego es un archivo **puro** en `games/` que exporta:
- `inicial(opciones)`: estado `{ celdas | datos, turno: 'x'|'o', ... }`;
- `validas(e)`;
- `aplicar(e, jugada)`;
- `ganador(e)`, que devuelve `'x'`, `'o'`, `'empate'` o `null`;
- `ia(e, nivel, rnd)`.

**Interfaz.** El juego se agrega a `JUEGOS_MESA` en app/mesa.js con `icono`, `reglas`, `fichas` y su función de tablero. La lógica de tablero que no quepa en mesa.js va en un archivo propio por juego, `app/mesa-<id>.js`, para no inflar mesa.js.

**Turnos.** El turno vive en el estado, así que `aplicar` decide quién sigue. Con eso se resuelven dos casos sin tocar el motor:
- el turno extra de Cajas;
- el pase automático de Reversi.

**Opciones al empezar.** `empezar` y `retarAmigo` aceptan `opciones`, como el tamaño de Cajas, y se las pasan a `inicial(opciones)`. La pantalla de modo muestra el selector de opciones solo si el juego define `opciones`.

**Jugadas.** Las jugadas son valores simples, número o texto, para que `validas(e).includes(jugada)` siga funcionando.

**Animación de la jugada del rival.** Hoy se calcula comparando celdas, con un caso especial para el 4 en línea. Se reemplaza por `j.ultimaJugada?.(antes, despues)`, opcional por juego; si el juego no la define, no hay animación.

| Juego | Archivo | Estado | Jugada |
|---|---|---|---|
| ⚫ Damas | `games/damas.js` | `celdas` (64: `.`, `x`, `o`, `X`, `O`; mayúscula = dama), `turno`, `sinComer` (contador para el empate) | texto con el camino completo, `"12-26-40"` |
| ⚪ Reversi | `games/reversi.js` | `celdas` (64), `turno` | índice de casilla |
| ✏️ Puntos y cajas | `games/cajas.js` | `n` (3, 4 o 5 cajas por lado), `celdas` = líneas (`2n(n+1)`, `.` o `-`) seguidas de los dueños de cada caja (`n²`, `.`, `x` u `o`), `turno` | índice de línea |
| 🚢 Batalla naval | `games/naval.js` | `datos`: texto JSON (ver más abajo), `turno` | índice de casilla (0–99) |

## Reglas de cada juego

### ⚫ Damas latinas

- Tablero de 8×8 con 12 peones por lado en las casillas oscuras. Empiezan las `x`, abajo.
- Los peones avanzan una casilla en diagonal y solo comen hacia adelante.
- La dama es voladora:
  - se mueve cualquier número de casillas en diagonal;
  - come saltando una pieza a distancia y cae en cualquier casilla libre detrás.
- **Comer es obligatorio** y es obligatoria la secuencia que **más piezas** come. Si hay varias con el mismo máximo, se elige cualquiera de ellas.
- En una secuencia, las piezas comidas se retiran al final y no se pueden saltar dos veces.
- Corona el peón que **termina** su jugada en la última fila. Si solo pasa por ella dentro de una secuencia, sigue siendo peón.
- Gana quien deja al rival sin piezas o sin jugadas.
- **Empate:** 30 jugadas seguidas (contando las de ambos) en las que solo se mueven damas y nadie come. Las cuenta `sinComer`.

**Interfaz.** Tocas una pieza que tenga jugadas y se marcan los destinos posibles. Si la jugada es una secuencia de saltos, cada toque avanza un salto. Solo se envía la jugada cuando el camino coincide con una jugada válida completa. Tocar otra pieza propia cambia la selección.

### ⚪ Reversi

- Reglas clásicas en 8×8 con las 4 fichas iniciales al centro. Empiezan las negras (`x`).
- Si el siguiente jugador no tiene jugadas pero el otro sí, `aplicar` deja el turno en quien acaba de jugar, y la interfaz muestra «Tu rival no puede jugar: sigues tú».
- La partida termina cuando ninguno puede jugar. Gana quien tiene más fichas; con la misma cantidad, empate.
- El marcador muestra las fichas de cada uno.

### ✏️ Puntos y cajas

- Opción `n`: 3×3, 4×4 o 5×5 cajas. Por defecto 4×4.
- En tu turno trazas una línea. Si cierras una o dos cajas, son tuyas y vuelves a jugar.
- Termina cuando están todas las líneas. Gana quien tiene más cajas; con la misma cantidad, empate (posible en 4×4).
- Las cajas se pintan con el color de su dueño.

### 🚢 Batalla naval

- Tablero de 10×10 con 5 barcos de largo 5, 4, 3, 3 y 2, en horizontal o vertical. Los barcos **no pueden tocarse**, ni siquiera en diagonal.
- Cada tiro pasa el turno, sea agua o tocado.
- Gana quien hunde toda la flota rival.
- **Colocación:**
  - «🎲 Al azar» genera una flota válida;
  - tocar un barco lo gira, si cabe;
  - tocar un barco y luego una casilla lo mueve, si cabe;
  - «✅ Listo» confirma.
- Pantallas durante la partida: tu tablero con los tiros recibidos y el tablero del rival con tus tiros y sus respuestas.
- **A dos en un celular:** entre turnos aparece la pantalla «Pasa el celular a Jugador N» con un botón «Ya lo tengo», para no ver la flota del otro. La colocación también se hace por turnos.
- **Estado (`datos`):**
  - `barcos`: las flotas, solo en los modos máquina y local; nunca se suben a la nube;
  - `tiros: { x: [[casilla, respuesta]], o: [...] }`, con respuesta `a` (agua), `t` (tocado) o `h<largo>` (hundido);
  - `pendiente`;
  - `sellos`, `revelado` y `fase`, solo con un amigo.

## Batalla naval con un amigo: sello y revisión

La posición de los barcos nunca sale del celular de su dueño mientras dura la partida.

1. **Inicio.** Quien reta coloca su flota y la mesa se crea con `sellos.x = SHA-256(JSON(barcos) + sal)`. La sal son 16 bytes al azar de `crypto.getRandomValues`, en hex. El invitado coloca la suya y escribe `sellos.o` en su primer turno. Empieza el invitado: su primera escritura lleva el sello y su primer tiro.
2. **Guardado local.** Los barcos y la sal se guardan en `naval:<idMesa>`, con prefijo `naval:` en PREFIJOS para que entren en la copia de seguridad.
3. **Tiro.** Quien tiene el turno escribe su tiro en `pendiente` y pasa el turno.
4. **Respuesta automática.** Cuando el rival abre la partida, su celular escribe la respuesta (agua, tocado o hundido) al tiro pendiente, **sin pasar el turno**. Luego el rival dispara. Las dos escrituras ocurren mientras el turno es suyo, así que la regla actual de `estado` (solo escribe quien tiene el turno) sirve sin cambios de lógica.
5. **Fin.** Cuando un jugador responde «hundido» al último barco, su celular:
   - escribe en `revelado.<yo>` sus barcos y su sal;
   - pone `fase: 'revelar'`;
   - pasa el turno.

   El ganador, al abrir, revela los suyos y escribe `ganador`.
6. **Revisión.** Cada celular comprueba la revelación del rival:
   - que el sello coincida;
   - que la flota sea válida;
   - que **todas** las respuestas dadas sean coherentes con esa flota.

   Si algo falla, se muestra «⚠️ Tu rival hizo trampa: cuenta como victoria tuya» y en `mesa:resultados` se apunta `v`, aunque `ganador` en la nube diga otra cosa. `ganador` no se puede reescribir, y lo que cuenta para liga, perfil y logros es el resultado local.
7. **Datos borrados.** Si falta `naval:<idMesa>`, por cambio de celular o datos borrados, no se puede responder. La partida muestra «No tienes tus barcos de esta partida en este celular» con el botón «Rendirse», que usa el `rendido` de siempre.

**Límite aceptado.** Una app modificada puede mentir durante la partida, pero se descubre en la revisión final y pierde. Si abandona sin revelar, la partida caduca a los 7 días como cualquier mesa.

**Más adelante.** Para que la trampa sea imposible y no solo detectable, hace falta un servidor (plan Blaze con Cloud Functions, o el servidor de US$6) que guarde ambas flotas y responda los tiros. `games/naval.js` es puro y se puede ejecutar ahí sin cambios.

## Máquinas

| Juego | Fácil | Normal | Difícil |
|---|---|---|---|
| Damas | azar | minimax con poda alfa-beta, profundidad 2; material: peón 1, dama 3 | alfa-beta, profundidad 6, más posición (avance, centro) |
| Reversi | azar | tabla de pesos por casilla (esquinas buenas, casillas X malas) | alfa-beta, profundidad 4, con pesos + movilidad |
| Cajas | azar | cierra toda caja disponible; si no, evita trazar la 3.ª línea de una caja; si no queda otra, entrega la cadena más corta | Normal + control de cadenas al final (doble cruz: deja las 2 últimas cajas de una cadena larga para quedarse con el control) |
| Naval | tiros al azar | caza y remata: tras un tocado, prueba las casillas vecinas en la línea | mapa de probabilidad: cuenta en cuántas posiciones posibles de los barcos restantes cae cada casilla y tira a la mayor; con un tocado, remata |

- **Comprobación.** Con simulaciones, en un script del scratchpad, la Difícil debe ganarle a la Normal en al menos el 60 % de 100 partidas en Damas, Reversi y Cajas. En Naval debe hundir la flota en menos tiros de media. Si no lo logra, se ajusta antes de publicar.
- **Tiempo.** La máquina no debe tardar más de unos 300 ms por jugada en un celular de gama media. Si la profundidad no alcanza, se baja y se anota.

## Datos, liga y perfil

Igual que los juegos actuales de Mesa:
- `mesa:maquina[juego][nivel]` guarda victorias, empates y derrotas;
- `ligaAnotar('partida', 1, 'mesa')`;
- `anotarPerfil('victoria', 1, 'mesa')` al ganar a la máquina;
- `finDePartida()` en el modo máquina y en el local;
- `apuntarResultadoAmigo` en el modo amigo.

## Reglas de Firebase (RTDB)

El usuario publica `database.rules.json`, que cambia así:
- `estado.celdas`: el máximo pasa de 64 a **128**, por las cajas de 5×5: 60 líneas + 25 cajas = 85.
- `'naval'` se agrega a la lista de juegos que usan `datos` (≤ 8000).
- Las reglas de turno, ganador y rendición no cambian.

Se prueban en el emulador de Firebase con `scratchpad/fb`, junto a las 21 pruebas que ya existen:
- una mesa de cajas de 85 celdas se acepta;
- una mesa naval con `datos` se acepta;
- escribir fuera de turno se rechaza.

## Pruebas

- **Tests puros en tests.js:**
  - **Damas:** salida inicial (7 jugadas), comer obligatorio, mayoría de piezas obligatoria, dama voladora, coronación al final de la jugada, empate de 30.
  - **Reversi:** salida (4 jugadas), volteo en varias direcciones, pase, final con conteo.
  - **Cajas:** número de líneas por `n`, turno extra al cerrar, doble cierre, final.
  - **Naval:** flota al azar válida (sin tocarse), respuestas agua/tocado/hundido, verificación del sello y de la coherencia (detecta una mentira), final.
- **Navegador:** cada juego en el script CDP de Chrome contra la máquina, a dos (incluida la pantalla de pasar el celular en Naval) y con un amigo con dos cuentas, incluida una Naval completa con revisión.
- **Revisión:** `sw.js` lleva los archivos nuevos en `ARCHIVOS` y la VERSION al día.

## Fuera de alcance

- Batalla naval en vivo.
- Variantes extra: damas inglesas, tableros de otros tamaños en Damas o Reversi, Naval con otras flotas.
- Servidor antitrampas: queda para cuando se active Blaze.
