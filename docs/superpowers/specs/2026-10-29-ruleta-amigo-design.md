# S3b: 🎡 Ruleta contra un amigo — diseño

Partida por turnos (y en vivo si los dos están) contra un amigo, con el motor de partidas de Mesa (`mesas/{id}`).

## Reglas

- Como la Fiesta: en tu turno giras y respondes hasta fallar; al fallar pasa el turno. Gana quien junte antes `a.coronas` coronas. Sin vidas.
- Los ajustes son los de quien crea la partida (se guardan en la mesa); cada jugador tiene sus comodines.
- Quien crea la partida empieza.
- La pregunta en pantalla se guarda como pendiente: si sales a mitad, al volver te sale la misma (con el reloj entero).
- Como en Mesa: 🏳️ Rendirse (pierde), 🔄 Revancha (partida nueva con tus ajustes), caduca a los 7 días sin movimientos; el resultado cuenta para logros ⚔️/🏆 y liga (+3 victoria, +1 partida), una sola vez por partida.

## Datos

`mesas/{id}` con `juego: 'ruleta'`, `ajustes` (los de `R.ajustesDe`) y
`estado: { turno: 'x' | 'o', x: E, o: E, pendiente?: { cat, corona, p } }`, donde `E` es el estado de `games/ruleta.js` con `coronas` como texto (`'geo,ocio'`), porque la Realtime Database no guarda listas vacías (`R.aNube` / `R.deNube`).

Reglas (`database.rules.json`): la validación de `estado` acepta, si `juego` es `ruleta`, un estado sin `celdas`. Lo demás (quién escribe `estado`, `ganador`, `rendido`) no cambia. **El usuario publica las reglas en Firebase.**

## Pantallas

- ❓ Trivia: tarjeta **👥 Contra un amigo** (resumen de tus ajustes + lista de amigos) y, arriba, «Tus partidas de ruleta» (▶ Tu turno / ⏳ Turno de X / resultado).
- Partida: la misma pantalla de la ruleta. Con el turno del rival: su marcador en vivo, «⏳ Turno de X (puedes salir: te avisaremos en ⚔️)», 🏳️ Rendirse y Volver. En tu turno, 🏳️ Rendirse junto a Girar.
- Mesa sigue mostrando solo Gato y Conecta 4. El aviso ⚔️ cuenta también las ruletas en tu turno.

## Organización

- `games/ruleta.js`: `aNube`, `deNube`.
- `app/mesa.js`: exporta `misPartidas` y `apuntarResultadoAmigo(id, r)` (resultados, liga y logros, una vez por partida; también lo usa Mesa).
- `app/trivia.js`: modo `amigo` de la partida (escucha la mesa con `verMesa`, sube el estado con `jugarMesa` tras cada respuesta y al mostrar una pregunta).

## Pruebas

`tests.js`: `aNube`/`deNube` ida y vuelta (con coronas vacías, sin `vidas`). Chrome con dos cuentas contra la Firebase real: crear, jugar hasta fallar, turno del rival en vivo, salir a mitad de pregunta y volver, rendirse, ganar, revancha.
