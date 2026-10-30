# S4b: 🎱 Ocho locos y 🧹 Escoba — diseño

## Común

- Modos: 🤖 contra la máquina (Ocho locos: 1 a 3 máquinas; Escoba: 1), 📱 a dos en un celular (pantalla «Turno de X, toca para ver tus cartas» entre turnos) y 👥 contra un amigo (por turnos y en vivo en `mesas/{id}` como la Mesa y la Ruleta; rendirse, revancha, lista «Tus partidas con amigos» en Cartas).
- Partida por puntos con resumen al final de cada ronda.
- Récord contra la máquina: `cartas:ocho`, `cartas:escoba` = { partidas, ganadas }. Liga: partida terminada +1; con un amigo, victoria/empate como en la Mesa (`apuntarResultadoAmigo`).
- Con un amigo las manos viajan por la base de datos (se podrían ver con herramientas del navegador): aceptado.
- Reglas puras en `games/ocho.js` y `games/escoba.js` (con su máquina y pruebas); pantallas en `app/cartas.js`.

## 🎱 Ocho locos (baraja inglesa)

- 7 cartas a cada uno con 2 jugadores, 5 con 3–4. Se da vuelta una carta para empezar.
- Jugar una carta del mismo palo o valor que la de arriba.
- 8: sobre cualquier carta, eliges el palo. 2: el siguiente roba 2 salvo que tire otro 2 (se acumula). J: salta al siguiente. Q: invierte el sentido (a dos: vuelves a jugar).
- Sin jugada: robas hasta 3; si una sirve la juegas, si no pasas. Mazo vacío: se baraja la pila menos la de arriba.
- Quien se queda sin cartas suma lo que tienen los demás: 8 = 50, 2 = 20, J/Q/K = 10, As = 1, el resto su número. Gana quien llega a 100 (200 si son tres, 300 si son cuatro, para que haya varias rondas).
- Máquina: guarda los 8, responde a un 2 con otro, elige el palo del que más tiene.

## 🧹 Escoba de 15 (baraja española)

- 40 cartas: 1–7, sota (8), caballo (9), rey (10); 🪙 oros, 🏆 copas, ⚔️ espadas, 🪵 bastos. Dibujadas con CSS.
- 3 a cada uno y 4 a la mesa; si la mesa suma 15, se la lleva quien reparte (escoba).
- Tiras una carta: si con cartas de la mesa suma 15 te las llevas (eliges si hay varias formas); si no, queda en la mesa. Dejar la mesa vacía: escoba (+1).
- Se reparten 3 más cuando se acaban las manos; al final, lo que queda en la mesa es del último que se llevó cartas.
- Puntos por ronda: escobas, más cartas, más oros, 7 de oros, más sietes (+1 cada uno; empate = nadie). Gana quien llega a 15.
- Máquina: busca escoba, el 7 de oros, oros y sietes; al tirar sin llevarse nada, evita dejar escoba fácil.

## Orden

Primero Ocho locos (3 modos) y se publica; luego Escoba. Regla nueva de la Realtime Database para las mesas de cartas (la publica el usuario).
