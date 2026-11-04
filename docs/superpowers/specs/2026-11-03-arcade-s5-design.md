# S5: 🏎️ Arcade — diseño

Cuatro juegos de acción en dos partes: **S5a** 🐍 Serpiente y 🦘 Saltar (con todo lo común del Arcade) y **S5b** 🏎️ Autos y 🧱 Ladrillos.

## Juegos

- **🐍 Serpiente**: cuadrícula de 15×15. Come frutas (+1) y crece; a veces sale una fruta dorada (+5) que desaparece a los 5 s. Pierde al chocar con el borde o consigo misma. Se mueve deslizando el dedo sobre el tablero o con las flechas / WASD (no se puede dar media vuelta). Cada 5 frutas va más rápido.
- **🦘 Saltar**: el personaje corre solo. Tocar (o espacio / flecha arriba) salta; un segundo toque en el aire hace doble salto. Obstáculos en el suelo (cactus, de 1 o 2 de ancho) y en el aire (pájaros a dos alturas). Puntaje: distancia (1 punto cada 10 px). La velocidad sube con la distancia.
- **🏎️ Autos**: carretera de 3 pistas vista desde arriba. Tocar la mitad izquierda o derecha de la pantalla (o flechas) cambia de pista. Autos que bajan por las pistas (nunca las 3 tapadas a la vez) y monedas (+10). Puntaje: distancia + monedas. La velocidad sube con la distancia.
- **🧱 Ladrillos**: paleta abajo que sigue al dedo (o flechas), pelota que rebota y 6 filas de ladrillos (+1 cada uno; los de arriba valen más). 3 vidas. Al vaciar la pared sale otra y la pelota va más rápida.

## Dificultad

Una sola: todos empiezan igual y el juego se acelera mientras aguantas; así los puntajes se comparan.

## Común a los cuatro

- Página `#arcade` desde el inicio, con una tarjeta por juego y los récords. Pantalla `#arcade-juego` con marcador (puntos y récord), el `<canvas>` y botones (Pausa, Salir).
- Antes de empezar, una pantalla con cómo se juega y «▶ Jugar». Al perder: puntos, récord (🏆 si es nuevo), «🔄 Otra vez», «⚔️ Retar a un amigo» y «Volver».
- Se pausa sola al cambiar de pestaña o salir de la pantalla.
- Datos: `record:<id>` (mejor puntaje, el mismo prefijo que los juegos mentales: se sincroniza y va al **ranking**) y `arcade:<id>` = { partidas }. Liga: partida terminada +1.
- Dibujo en canvas con formas simples y emojis; los colores salen de las variables del tema (claro u oscuro). Se adapta al ancho (hasta 480 px).

## Retos a un amigo

- Cada partida usa una **semilla**; con la misma semilla salen las mismas frutas, obstáculos, autos y paredes (generador pseudoaleatorio con semilla).
- «⚔️ Retar a un amigo» crea un duelo de un solo juego (`juegos: [id]`, suma de puntos, `semilla`) invitando al amigo elegido y anota tu puntaje. El amigo lo ve en ⚔️ Duelos, juega la misma partida y gana quien hace más puntos; hay 48 horas.
- Las reglas de Firestore cambian (las publica el usuario): `semilla` (entero) en el duelo nuevo y los récords del Arcade en el ranking (`serpiente`, `saltar`, `autos`, `ladrillos`, de 1 a 100000).

## Código

- `games/semilla.js`: generador con semilla (mulberry32).
- `games/serpiente.js`, `games/saltar.js`, `games/autos.js`, `games/ladrillos.js`: puros. `nuevo(semilla)` y `paso(e, entrada)` avanza un cuadro fijo (1/60 s); `e.fin` y `e.puntos`. Nada de dibujar.
- `app/arcade.js`: página, bucle con paso fijo (requestAnimationFrame), controles (toque, deslizar, teclado), dibujo de cada juego, pausa, fin, récords y retos.
- `app/juegos.js`: `JUEGOS_ARCADE` (id, nombre, icono, unidad) en `INFO_JUEGOS` para los duelos y en el ranking.
- Pruebas: reglas de cada juego (comer, chocar, saltar, esquivar, rebotar), misma semilla = misma partida, partidas simuladas que terminan. Chrome en claro y oscuro a 390 px.
