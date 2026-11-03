# S4c: 🃏 Carioca (y luego Burako) — diseño

S4c se publica en dos partes: **S4c1 Carioca**, que crea el motor común de juegos (`games/rummy.js`), y **S4c2 Burako**, que lo reutiliza. Esta parte describe la Carioca. Para el Burako ya está acordado: fichas 1–13 en 4 colores ×2 + comodines, atril y muertos; modos 1 contra máquina, 2 contra 2 con máquinas y contra un amigo; tendrá su propio diseño.

## Reglas (Carioca chilena)

- 2 barajas inglesas + 4 comodines (108 cartas). 12 cartas a cada uno; se da vuelta una para empezar el pozo. Reparte cada ronda el siguiente; empieza quien sigue al que reparte.
- **Trío**: 3 o más cartas del mismo número (los palos se pueden repetir).
- **Escala**: 4 o más cartas seguidas del mismo palo (hasta 13); puede dar la vuelta por el As (J-Q-K-A, Q-K-A-2 y K-A-2-3 valen).
- **Escala sucia**: las 13 cartas del As al Rey, de cualquier palo, con comodines. **Escala real**: las 13 del As al Rey de un solo palo, sin comodines.
- **Comodines**: en cada juego hay más cartas normales que comodines; en una escala no van dos comodines seguidos.
- **Turno**: 1) robar del mazo o la de arriba del pozo; 2) si no bajaste y tienes el contrato de la ronda, bajarlo (exactamente los juegos del contrato; cada juego puede tener más cartas que el mínimo); 3) desde el turno siguiente al de bajar, agregar cartas a cualquier juego de la mesa (propio o ajeno); 4) botar una carta al pozo. Si te quedas sin cartas (al bajar, agregar o botar), ganas la ronda.
- Mazo vacío: se baraja el pozo menos la de arriba.
- **Puntos** de lo que queda en la mano: As 20, J/Q/K 10, comodín 30, del 2 al 10 su número. Gana la partida quien termina con **menos** puntos; empate: más rondas ganadas; si sigue, quien ganó la última ronda.

## Partidas

- **Clásica** (10 rondas): 2 tríos · trío y escala · 2 escalas · 3 tríos · 2 tríos y escala · trío y 2 escalas · 3 escalas · 4 tríos · escala sucia · escala real.
- **Corta**: las 4 primeras.
- **Personalizada**: se arma una lista de 1 a 12 rondas con los contratos del catálogo (los 10 de arriba), en el orden elegido y repitiendo si se quiere; se quitan con ✕. Ahí se pueden activar dos reglas extra:
  - **Comprar** (solo con 3 o 4 jugadores): si el siguiente roba del mazo en vez de tomar la carta botada, los demás que aún no bajaron (en orden, sin contar a quien la botó) pueden comprarla llevándose además una del mazo; hasta 3 compras por jugador por ronda. Cuando lo decide una máquina, a ti te aparece «¿Comprar 7♥?».
  - **Cambiar el comodín**: después de bajar, en tu turno, si tienes la carta que un comodín reemplaza en un juego de la mesa (en un trío, ese número de cualquier palo; en una escala, ese número y palo), la pones y te llevas el comodín.
- Los ajustes de la personalizada se guardan en `cartas:carioca-ajustes`; con un amigo viajan en el estado de la mesa.

## Modos

- 🤖 Contra 1 a 3 máquinas, nivel Normal o Difícil. 📱 Dos en un celular. 👥 Contra un amigo (mesas, 1 contra 1).
- Récord `cartas:carioca` y `cartas:carioca-dificil` = { partidas, ganadas }. Liga: partida terminada +1; con un amigo, `apuntarResultadoAmigo`.
- Con un amigo: hay que agregar `carioca` (y luego `burako`) a la regla de `mesas/$id/estado` de la Realtime Database; la publica el usuario.

## Pantalla

- Mano ordenable (por palo o por número). Mesa con los juegos bajados de cada jugador.
- **⬇️ Bajar**: se activa cuando tienes el contrato; la app arma los juegos (la combinación que deja menos puntos en la mano), los muestra y confirmas.
- **Agregar**: tocas una carta de la mano y luego el juego; se iluminan los juegos donde cabe.
- **Botar**: tocas una carta y «Botar». Robar: tocar el mazo o el pozo.
- Resumen al final de cada ronda (puntos de cada uno y total) y tabla final.

## Código

- `games/rummy.js`: validar trío/escala/escala de 13 con comodines, agregar a un juego, cambiar comodín, buscar la mejor forma de bajar un contrato, puntos. Puro y con pruebas; lo usa también el Burako.
- `games/carioca.js`: rondas y contratos, turnos (robar, bajar, agregar, botar), comprar, fin de ronda, máquinas Normal y Difícil. La Difícil se mide con simulaciones contra la Normal (debe ganar claramente más).
- `app/cartas-mesa.js`: el juego `carioca` en `JUEGOS_MESA_CARTAS` con su `pintar` y `resumen`; los modos, revancha y la lista de partidas con amigos salen del motor de mesa.
- Pruebas: juegos válidos e inválidos (comodines, As alto/bajo), bajar contrato, agregar, cambiar comodín, comprar, puntos y empates, partidas completas entre máquinas, y que el estado quepa en 8000 caracteres.
