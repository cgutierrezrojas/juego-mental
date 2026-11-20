# Ronda 4 🃏 Cartas: Chinchón y Truco chileno

Fecha: 2026-11-19. Rama: `cartas4`.

## Qué se hace

Dos juegos nuevos en la sección 🃏 Cartas, junto a Ocho locos, Escoba, Carioca y Burako:

- **♣️ Chinchón clásico**: contra la máquina (tú + 1 a 3 máquinas), local (2 a 4 en un celular) y con un amigo (1 contra 1).
- **⚔️ Truco chileno**: 1 contra 1, contra la máquina, local (2 en un celular) y con un amigo.

Los dos usan el motor `app/cartas-mesa.js` tal como está (ganchos `J.*`, pantalla tapada al pasar el celular, récords por nivel,
`ligaAnotar`/`anotarPerfil`, `finDePartida`), la baraja española de 40 (`games/escoba.js`: `barajaEs`, `nombre`, `EMOJI`) y el
dibujo de naipes de `app/cartas.js` (`naipe`).

Niveles de máquina: `['facil', 'normal', 'dificil']` en los dos (`J.niveles`).

Con un amigo: igual que las otras cartas, el estado entero va como texto en `mesas/{id}/estado.datos` (decisión del usuario: no
se cifran las cartas). Sin dados justos ni sellos.

## Archivos

| Archivo | Qué tiene |
|---|---|
| `games/chinchon.js` | Reglas puras del Chinchón: reparto, robar, botar, juegos, cerrar, conteo, eliminación, máquina. |
| `games/truco.js` | Reglas puras del Truco: jerarquía, envido, cantos, bazas, puntos, máquina. |
| `app/chinchon.js` | Objeto `CHINCHON` para el motor: `pintar`, `resumen`, `reglas`, botones. |
| `app/truco.js` | Objeto `TRUCO` para el motor: `pintar`, `resumen`, `reglas`, botones de cantos. |
| `app/cartas-mesa.js` | Registrar `CHINCHON` y `TRUCO` en la lista de juegos de cartas. |
| `app/cartas.js` | Agregar los dos a las tarjetas de la sección y a las estadísticas. |
| `database.rules.json` | Agregar `chinchon` y `truco` a la lista de juegos con `estado.datos` (texto ≤ 8000). |
| `sw.js` | Archivos nuevos en `ARCHIVOS`; VERSION = huella que pide `tests.js`. |
| `tests.js` | Pruebas de reglas y simulaciones de niveles. |

`games/rummy.js` no se reutiliza: trabaja con 13 valores que dan la vuelta (K-A-2) y la baraja española de 40 tiene 10 valores sin
vuelta. El Chinchón tiene su propia búsqueda de juegos, pequeña.

## ♣️ Chinchón clásico

**Baraja:** 40 cartas (1–7, sota, caballo, rey de oros, copas, espadas y bastos). Orden para escalas: 1, 2, …, 7, sota, caballo, rey
(el 7 va seguido de la sota). Sin comodines. El rey no da la vuelta al 1.

**Valor de las cartas sueltas:** su número; sota 10, caballo 11, rey 12.

**Reparto:** 7 cartas a cada jugador; una carta boca arriba inicia el descarte. Empieza el jugador a la derecha del que reparte
(en el código: el turno inicial rota cada ronda).

**Turno:** robar una carta (del mazo o la de arriba del descarte) y luego botar una carta. No se puede botar la misma carta que se
acaba de robar del descarte. Si el mazo se acaba, se baraja el descarte salvo la carta de arriba.

**Juegos válidos:**
- Trío o cuarteto: 3 o 4 cartas del mismo número.
- Escala: 3 o más cartas seguidas del mismo palo.

**Cerrar:** en vez de botar normalmente, el jugador puede cerrar si, después de apartar la carta que bota, sus 7 cartas se pueden
ordenar en juegos dejando sueltas que suman **3 o menos**. Al cerrar:
- Si no le queda ninguna suelta, se anota **−10**.
- Si sus 7 cartas son una escala del mismo palo (**chinchón**), **gana la partida entera** en el acto.
- Si no, se anota la suma de sus sueltas.

**Los demás:** su mano se ordena sola en la mejor forma posible (la que deja menos puntos sueltos), y pueden **agregar sueltas a los
juegos del que cerró** (una carta del mismo número a un trío, o una carta que alarga una escala por una punta). Se anotan lo que
les queda suelto.

**Eliminación y final:** quien **pasa de 100** puntos queda eliminado. Gana el último que queda. A dos jugadores, la partida
termina cuando uno pasa de 100 (o hace chinchón).

**Botón de cerrar:** visible solo cuando el jugador tiene 8 cartas y existe una carta que, al botarla, deja la mano cerrable. Al
pulsarlo se elige la carta a botar entre las que lo permiten.

**Ordenar la mano:** botón «Ordenar» que agrupa los juegos a la izquierda y deja las sueltas al final, como ayuda visual.

**Máquina:**
- **Fácil:** roba del descarte solo si la carta forma juego de inmediato; bota la suelta más alta. Cierra en cuanto puede.
- **Normal:** valora cada carta por cuánto le acerca a un juego (pares, escalas abiertas); bota la de menos valor y más puntos.
  Cierra en cuanto puede, salvo que le falte una carta para el chinchón.
- **Difícil:** lo de Normal, más memoria de lo que el rival robó del descarte y botó: no bota cartas que le sirvan al rival
  siguiente si tiene otra opción parecida. Espera para cerrar con 0 sueltas (−10) si le falta una carta y quedan cartas en el mazo.

## ⚔️ Truco chileno

**Baraja:** 40 cartas. **Jerarquía** (de mayor a menor):
1. 1 de espadas
2. 1 de bastos
3. 7 de espadas
4. 7 de oros
5. los 3
6. los 2
7. 1 de copas y 1 de oros
8. los reyes
9. los caballos
10. las sotas
11. 7 de copas y 7 de bastos
12. los 6
13. los 5
14. los 4

Cartas de la misma jerarquía empatan (parda).

**Reparto:** 3 cartas a cada uno. La **mano** (quien juega primero la primera baza) alterna en cada ronda.

**Bazas:** se juegan hasta 3. Gana la ronda quien gana 2 bazas. Pardas:
- Si la 1.ª es parda, gana la ronda quien gane la 2.ª; si la 2.ª también es parda, quien gane la 3.ª; si las tres son pardas, gana la mano.
- Si la 1.ª la gana alguien y la 2.ª (o la 3.ª) es parda, gana quien ganó la 1.ª.
Quien gana una baza juega primero la siguiente.

**Envido** (solo en la primera baza, antes de que quien canta haya jugado su carta):
- Tanto: dos cartas del mismo palo valen 20 + la suma de sus números (las figuras valen 0); si no hay dos del mismo palo, vale la
  carta más alta (figura = 0). Se toma la mejor combinación de las 3 cartas. Máximo 33.
- Cantos: **Envido** (2), **Real envido** (3), **Falta envido** (lo que le falta al que va ganando para llegar a 24). Se pueden
  encadenar: Envido → Envido → Real envido → Falta envido (cada uno solo puede subir con un canto igual o mayor que el anterior; un
  segundo Envido solo después del primero).
- **Querido:** gana el de mayor tanto (empate: la mano) y se anota la suma de los cantos (Falta envido reemplaza la suma).
- **No querido:** el que cantó último se anota la suma de los cantos ya queridos antes de ese, mínimo 1.
- Si alguien canta Truco en la primera baza antes de que se jugara el envido, el otro puede responder «El envido está primero»
  (cantar un envido); el truco queda pendiente hasta que el envido se resuelva.
- Los tantos se muestran al resolver el envido (el estado es honesto: los calcula el juego).

**Truco:**
- **Truco** (2), **Retruco** (3), **Vale cuatro** (4). Se responde Quiero, No quiero o subiendo.
- Solo puede subir quien tiene «el quiero»: el que aceptó el último canto. Se puede cantar en cualquier momento del turno propio.
- **No querido:** quien cantó se anota el valor anterior (Truco no querido = 1, Retruco no querido = 2, Vale cuatro no querido = 3) y
  la ronda termina.
- **Querido:** quien gana la ronda se anota el valor querido. Sin truco, la ronda vale 1.

**Irse al mazo:** en su turno, un jugador abandona la ronda. El rival se anota lo que valga el truco en ese momento (1 sin truco,
o el valor querido); si fue en la primera baza y aún no se cantó envido, el rival se anota 1 más.

**Final:** gana el primero en llegar a **24** (12 malas y 12 buenas; el marcador muestra «malas» hasta 12 y «buenas» desde 13).

**Turno en el motor:** `e.turno` es siempre quien debe actuar. Cuando alguien canta, el turno pasa al otro hasta que responda; al
responder vuelve a quien tenía que jugar carta. Así cada canto, respuesta o carta es una jugada del motor por turnos (y con un amigo
cada una se sube a `mesas/{id}`).

**Pantalla:** tu mano (3 cartas), las cartas jugadas en cada baza (tuyas abajo, del rival arriba), el marcador y botones:
- en tu turno: Envido / Real envido / Falta envido (cuando se puede), Truco / Retruco / Vale cuatro (cuando se puede), Irse al mazo;
- si te cantaron: Quiero / No quiero / los cantos para subir.
El aviso dice lo último que pasó («Tu rival cantó Truco», «Envido: 27 contra 31, gana tu rival»).

**Máquina:**
- **Fácil:** juega una carta al azar; acepta cantos el 50 % de las veces; canta envido solo con 30 o más y truco casi nunca.
- **Normal:** juega la carta más baja que gana la baza (o la más baja si no puede ganarla); canta y acepta según la fuerza de su
  mano (tanto para el envido; jerarquía y bazas ya ganadas para el truco).
- **Difícil:** lo de Normal, más memoria de las cartas jugadas (calcula la probabilidad de ganar con lo que queda en la baraja) y
  mentiras: a veces canta truco o envido con mano débil.

## Récords, perfil y misiones

Igual que las otras cartas: récord contra la máquina por nivel (`claveRecord('chinchon', nivel)`, `claveRecord('truco', nivel)`),
`ligaAnotar('partida', …, 'cartas')` y `anotarPerfil`, `finDePartida()` al terminar, estadísticas de partidas ganadas en la pantalla
de la sección.

## Reglas de Firebase

En `database.rules.json`, `mesas/$id/estado/.validate`: agregar `chinchon` y `truco` a la lista de juegos que guardan `datos` como
texto ≤ 8000 (junto a naval, ocho, escoba, carioca y burako). El usuario debe publicar el archivo después.

## Pruebas

En `tests.js`:
- **Chinchón:** escalas con el salto 7→sota; tríos y cuartetos; mejor ordenamiento (menos puntos sueltos); cerrar con ≤ 3, con 0
  (−10) y con chinchón (gana la partida); no se puede cerrar con 4 sueltos; agregar sueltas a los juegos del que cerró; eliminación al
  pasar de 100; mazo agotado se rebaraja; no botar la carta recién robada del descarte.
- **Truco:** jerarquía completa; tanto del envido (20 + números, figuras 0, sin pareja); cada combinación de envido querido y no
  querido; Falta envido; «el envido está primero»; truco/retruco/vale cuatro queridos y no queridos; solo sube quien tiene el
  quiero; pardas en cada caso; irse al mazo; final a 24.
- **Simulaciones de niveles** (contra la máquina misma, muchas partidas, semilla fija): en cada juego, Difícil le gana a Normal y
  Normal a Fácil más del 55 % de las partidas.
- Partida completa de cada juego sin errores entre máquinas, para cada nivel.

## Fuera de esta ronda

- Flor (no se usa en el Truco chileno).
- Truco a 4 jugadores en parejas.
- Cartas ocultas con cifrado (póker mental): se puede hacer más adelante para todas las cartas a la vez.
