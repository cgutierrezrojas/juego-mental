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
- `localStorage` con prefijo `cartas:` (se sincroniza con la copia en la nube): `cartas:solitario` (partida en curso), `cartas:record-solitario`, `cartas:21`.

## Código

- `games/cartas.js`: baraja (crear, barajar, valor, color).
- `games/solitario.js`, `games/veintiuno.js`: reglas puras, sin DOM.
- `app/cartas.js`: página y pantallas.

## Pruebas

`tests.js`: baraja (52 distintas), solitario (repartir, movimientos válidos e inválidos, robar de a 1 y 3, deshacer, terminar solo, ganar), 21 (puntos con ases, blackjack, doblar, separar, banca, pagos). Chrome: jugar ambos con toque y arrastre, claro/oscuro, 390 px.
