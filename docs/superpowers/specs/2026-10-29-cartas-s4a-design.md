# S4a: 🃏 Cartas — Solitario y 21 — diseño

Primera parte de la sección Cartas. S4b (Ocho locos + Escoba) y S4c (Carioca) reutilizan la baraja y el dibujo de las cartas.

## Sección

- La baldosa 🃏 Cartas del inicio deja de decir «Próximamente» y muestra «2 juegos».
- Página `#cartas`: una tarjeta por juego y debajo los récords.
- Las cartas se dibujan con CSS (sin imágenes): blancas, valor y palo (♠ ♥ ♦ ♣) en rojo o negro, dorso con dibujo. Claro, oscuro, 390 px de ancho.

## 🂡 Solitario (Klondike)

- 7 columnas, 4 pilas (As → Rey por palo), mazo que se recorre sin límite.
- Antes de jugar: robar **de a 1** o **de a 3**.
- Mover: un toque manda la carta (y las que tiene encima) al mejor lugar: primero su pila, si no la primera columna que la acepte. También se arrastra con el dedo (pointer events). Si no se puede mover, tiembla.
- Ayudas: ↩️ Deshacer (sin límite), 💡 Pista (ilumina una jugada posible), ✨ Terminar solo (cuando todo está destapado y el mazo vacío).
- Marcador: tiempo y movimientos. Al ganar, confeti.
- Récord por modo (de a 1 / de a 3): partidas, ganadas, mejor tiempo, menos movimientos.
- La partida en curso se guarda; al volver sigue igual.

## 🃏 21 (Blackjack)

- 100 fichas de mentira al empezar. Apuesta con fichas de 5, 10, 25 y 50.
- Pedir, Plantarse, Doblar (dobla la apuesta, una carta más y se planta), Separar un par en dos manos (una vez; con ases, una carta a cada uno).
- La banca pide hasta 17 o más.
- 21 con las dos primeras cartas paga 3 a 2; ganar paga 1 a 1; empate devuelve la apuesta.
- Una baraja; se baraja de nuevo cuando quedan menos de 15 cartas.
- Sin fichas: «La casa te presta 100».
- Récord: máximo de fichas, manos jugadas y ganadas.

## Liga y datos

- Liga: solitario ganado = +1 partida; en el 21, cada 5 manos = +1.
- `localStorage` con prefijo `cartas:` (se copia a la nube): `cartas:solitario` (récords por modo) y `cartas:21` (fichas, récords y la mano en curso). La partida de solitario a medias va en `solitario-partida`, solo en este celular (con su historial para deshacer).
- Cada pila del solitario es de un palo (♠ ♥ ♦ ♣), como dibuja su hueco.

## Código

- `games/cartas.js`: baraja (crear, barajar, valor, color).
- `games/solitario.js`, `games/veintiuno.js`: reglas puras, sin DOM.
- `app/cartas.js`: página y pantallas.

## Pruebas

`tests.js`: baraja (52 distintas), solitario (repartir, movimientos válidos e inválidos, robar de a 1 y 3, deshacer, terminar solo, ganar), 21 (puntos con ases, blackjack, doblar, separar, banca, pagos). Chrome: jugar ambos con toque y arrastre, claro/oscuro, 390 px.

## 🎴 Bacará (añadido el 2026-10-30)

- Fichas compartidas con el 21: `cartas:fichas` = { fichas, max } (al estrenarlo se toman las de `cartas:21`). Préstamo y máximo comunes.
- Antes de cada mano: a quién apuestas (Jugador, Banca o Empate) y cuánto (fichas de 5, 10, 25, 50).
- Reparto automático con la tabla oficial de la tercera carta; se explica por qué pidió cada uno. Puntos: As 1, 2–9 su valor, 10 y figuras 0, solo la última cifra. Natural (8 o 9 con dos cartas): nadie pide.
- Pagos: Jugador 1 a 1; Banca 1 a 1 menos 5 % (redondeado abajo); Empate 8 a 1; si hay empate, al Jugador o a la Banca se les devuelve la apuesta.
- Récord `cartas:bacara`: manos y ganadas. Liga: cada 5 manos, +1.
- Reglas en `games/bacara.js` (puras, con pruebas); pantalla en `app/cartas.js`. El inicio muestra «3 juegos».
