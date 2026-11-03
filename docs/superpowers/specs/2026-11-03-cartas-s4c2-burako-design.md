# S4c2: 🀄 Burako — diseño

Segunda parte de S4c. Reutiliza el motor de juegos de la Carioca (`games/rummy.js`) y el motor de mesa (`app/cartas-mesa.js`).

## Fichas y reparto

- 106 fichas: del 1 al 13 en 4 colores (rojo, azul, amarillo y negro), dos de cada una, y 2 comodines.
- 11 fichas al atril de cada jugador y 2 **muertos** de 11 fichas; una ficha da vuelta para empezar el pozo.
- Se dibujan como fichas: rectángulo claro con el número grande en su color (con su nombre para el lector de pantalla: «7 rojo»).

## Juegos

- **Escalera**: 3 o más fichas seguidas del mismo color. El 1 va abajo (1-2-3) o arriba (12-13-1), sin dar la vuelta.
- **Pierna**: 3 o más fichas del mismo número, de cualquier color (no de 2).
- **Comodines**: los 2 comodines y los 2. Cada juego lleva como mucho **un** comodín. Un 2 de ese color en su lugar de una escalera es un 2 normal.
- **Burako**: un juego de 7 o más fichas. Limpio (sin comodín) +200; sucio (con comodín) +100.
- Los juegos son del equipo: solo se agregan fichas a los juegos propios o del compañero.

## Turno

1. Robar una ficha del mazo, o llevarse **todo el pozo**.
2. Bajar juegos nuevos y agregar fichas a los juegos del equipo, en cualquier orden.
3. Botar una ficha al pozo (termina el turno).

- **Muerto**: el primero del equipo que se queda sin fichas toma el muerto del equipo. Si se quedó sin fichas al bajar o agregar, sigue jugando con él; si fue al botar, lo juega en su próximo turno. Cada equipo tiene un solo muerto.
- **Cerrar**: un jugador cierra la mano quedándose sin fichas cuando su equipo ya tomó el muerto y tiene al menos un burako. Si no puede cerrar, no puede quedarse sin fichas (siempre le debe quedar una para botar).
- Si el mazo se acaba, la mano termina sin cierre y se cuenta igual.

## Puntos

- Valor de las fichas: 1 = 15, 2 = 20, del 3 al 7 = 5, del 8 al 13 = 10, comodín = 50.
- Al terminar la mano, cada equipo suma: las fichas de sus juegos, sus burakos (+200 / +100), +100 si cerró; y resta: las fichas que le quedan en el atril y 100 si no tomó su muerto.
- La partida sigue mano a mano hasta que un equipo llega a **3000**. Si los dos pasan 3000, gana el que tiene más; con empate, otra mano.

## Modos

- 🤖 1 contra 1 máquina, y 2 contra 2 (tú y una máquina compañera contra dos máquinas; los equipos se turnan: tú, rival, compañero, rival). Nivel Normal o Difícil.
- 📱 Dos en un celular. 👥 Contra un amigo (mesas, 1 contra 1). La regla de la Realtime Database ya acepta `burako`.
- Récord `cartas:burako` y `cartas:burako-dificil` = { partidas, ganadas }. Liga: partida terminada +1; con un amigo, `apuntarResultadoAmigo`.

## Pantalla

- Arriba los rivales (fichas en el atril, si tomaron el muerto, puntos). Los juegos del equipo rival y los del tuyo, separados.
- Mazo (con cuántas quedan) y pozo (la de arriba y cuántas tiene). Robar: tocar el mazo o el pozo.
- Atril ordenable (por color o por número). Tocas fichas para elegirlas (varias):
  - **⬇️ Bajar juego** se activa cuando las elegidas forman una escalera o una pierna.
  - Con fichas elegidas, se iluminan los juegos del equipo donde caben; tocarlo las agrega.
  - **🗑️ Botar** con una sola ficha elegida.
- Resumen de cada mano (tabla por equipo: juegos, burakos, cierre, muerto, atril, total) y tabla final.

## Código

- `games/rummy.js`: los juegos del Burako (escalera de 3 sin vuelta con el 1 alto o bajo y pierna; un comodín; el 2 como comodín o como 2 normal) junto a los de la Carioca, con pruebas.
- `games/burako.js`: fichas, reparto, turnos (robar, llevarse el pozo, bajar, agregar, botar), muertos, cierre, puntos, máquinas Normal y Difícil (la Difícil se mide con simulaciones contra la Normal y debe ganar claramente más). Puro.
- `app/burako.js`: pantalla (`pintar`, `resumen`) y el juego en `JUEGOS_MESA_CARTAS`; la ficha `.ficha` en `styles.css`.
- Pruebas: juegos válidos e inválidos, bajar y agregar, muerto, cerrar (y no poder quedarse sin fichas), puntos, partidas completas entre máquinas de 2 y 4 jugadores, y que el estado quepa en 8000 caracteres. Chrome en claro y oscuro y modo amigo con dos cuentas.
