# Ronda 6 🏆 Competencia: desafío diario del Arcade y torneo semanal — diseño

Fecha: 2026-11-20 · Rama: `competencia6`

## Objetivo

Sección nueva «🏆 Competencia» con dos competencias para todos los jugadores con cuenta:
- **🕹️ Desafío de hoy:** un juego del Arcade por día, misma partida para todos, 3 intentos, ranking del día y 🪙 30 fichas.
- **🏆 Torneo de la semana:** un juego por semana (Arcade o Mentales), intentos ilimitados, ranking semanal y premios en fichas
  e insignia para el podio.

## Sección

- `SECCIONES` (app/juegos.js): `{ id: 'competencia', nombre: 'Competencia', icono: '🏆', color: 'rojo', descripcion: 'desafío de hoy y torneo semanal' }`.
- `app/competencia.js`: `abrirCompetencia()` con dos tarjetas grandes (juego, intentos/mejor marca, días u horas que quedan) y debajo el
  ranking de cada una (top 20 + tu puesto). Patrón de `app/puzzles.js` (`rankingDia`).
- Enganche en `ABRIR` y en la cuenta de juegos de `app/inicio.js` (cuenta 2). En la fila «Hoy» del inicio aparece «🕹️ Desafío de hoy»
  mientras no se haya jugado.
- Sin cuenta: se puede jugar, pero el ranking dice «Entra con tu cuenta para competir».

## Desafío de hoy (Arcade)

- Juego del día: `JUEGO_DIA = ['serpiente', 'saltar', 'autos', 'ladrillos', 'bloques']`, índice = días desde 2026-11-20 (fecha local)
  mod 5. Bloques en su modo por defecto (el de los retos, Clásico).
- Semilla: `semillaDelDia(fecha, 'arcade')` (de `games/minas.js`).
- Se juega en la pantalla del Arcade con la semilla fija, como un reto (`abrirJuegoArcade(id, { semilla, competencia: 'dia' })`):
  marcador «🕹️ Desafío · intento n/3»; al terminar vuelve a Competencia y no toca el récord normal del juego.
- **3 intentos**: el intento se cuenta al empezar (`compe:dia = { fecha, intentos, mejor }`). Cuenta la mejor marca.
- **Ranking** en `diario/{fecha}_arcade/jugadores/{uid}` = `{ apodo, valor, intentos, juego, actualizado, avatar, marco, nivel }`.
  Se sube tras cada intento que mejora (o el primero). Reglas:
  - create: dueño, no baneado, `intentos == 1`, valor int 0–10.000.000 (tope de Bloques), `juego` en la lista, campos fijos.
  - update: dueño, no baneado, `intentos == resource.intentos + 1`, `intentos <= 3`, `valor >= resource.valor`, `juego` igual.
  - Si un intento no mejora, igual se sube con el mismo `valor` e `intentos + 1` (así los intentos quedan contados en la nube).
- 🪙 **30 fichas** la primera vez del día (nuevo tipo `arcadedia` en `MONTOS` de `games/premios.js`, cuenta para el `TOPE`).
- Liga: cada intento suma `ligaAnotar('partida', 1, 'arcade')` como cualquier partida.

## Torneo de la semana

- Juego de la semana: `JUEGOS_TORNEO = ['serpiente', 'calculo', 'saltar', 'atencion', 'autos', 'memoria', 'ladrillos', 'series',
  'bloques', 'sobra', 'puzzle', 'rayo', 'topos']` (5 del Arcade intercalados con los 8 Mentales originales), índice = semanas desde la
  semana ISO de 2026-11-16 mod 13.
- Arcade: semilla `semillaDelDia(semana, 'torneo')`, igual para todos. Mentales: modo Normal, dificultad Normal, sin semilla (son al
  azar pero parejos, como en los duelos). Puzzle (menos movimientos = mejor) usa «menos es mejor».
- Intentos ilimitados; cuenta la mejor marca (`compe:torneo = { semana, mejor, partidas }`). Las partidas del torneo no tocan el récord
  normal ni las estrellas/niveles del juego; sí suman a la liga como partida.
- **Ranking** en `torneo/{semana}/jugadores/{uid}` = `{ apodo, valor, juego, actualizado, avatar, marco, nivel }`:
  - create: dueño, no baneado, `semana` con forma `AAAA-Www`, `juego` en la lista, valor dentro de los topes del juego (los mismos de
    `topes()` de los duelos en firestore.rules).
  - update: dueño, no baneado, `juego` igual, valor mejor (`>` normal; `<` si el juego es `puzzle`).
  - Se sube solo cuando mejora.
- **Premios** al empezar una semana nueva (una vez por semana, `compe:premio = semana ya revisada`), patrón de `comprobarPodio` en
  app/liga.js: se lee el top 3 de la semana anterior y tu fila.
  - 🥇 500, 🥈 300, 🥉 150 fichas y suma 1 a `perfil:torneos` ({ oro, plata, bronce }), que el perfil muestra como «🏆 Torneos: 🥇×n 🥈×n 🥉×n».
  - Si participaste y no quedaste en el podio: 25 fichas.
  - Aviso al abrir la app («🏆 ¡Quedaste 2.º en el torneo de Autos! +300 fichas»).
  - Estos premios no cuentan para el `TOPE` diario.

## Moderación

- Los rankings del desafío, del torneo y del día de Puzzles muestran los botones ⚠️ denunciar / 🚫 expulsar de la liga
  (`botonesModeracion` de app/liga.js).
- `expulsar` también borra la fila del expulsado en el desafío de hoy y en el torneo de esta semana (lote aparte con `.catch`, como el
  diario de Puzzles).
- `borrarTodo` borra las filas propias de `torneo/{semana}` desde la semana de 2026-11-16 y las de `diario/{fecha}_arcade` (después del
  borrado principal, cada lote con `.catch`).

## Datos y sincronización

- Claves locales con prefijo `compe:` (agregar a `PREFIJOS` de `games/copia.js`); `perfil:torneos` ya entra por `perfil:`.

## Pruebas

- Puras (`games/competencia.js`): `juegoDelDia(fecha)` y `juegoDeLaSemana(semana)` deterministas y rotando; `anotarIntento` (3 como
  máximo, mejor marca, primer intento del día); `mejora(juego, nuevo, viejo)` con «menos es mejor» del puzzle; `premioTorneo(puesto,
  participo)` → 500/300/150/25/0; el premio se da una sola vez por semana.
- Firestore en el emulador: create/update del desafío (intentos 1→2→3, 4 ✗, bajar valor ✗, cambiar juego ✗) y del torneo (mejorar OK,
  empeorar ✗, puzzle al revés, fuera de tope ✗, semana mal formada ✗), baneado ✗, admin borra.
- CDP a 360 px claro/oscuro: sección, desafío con sus 3 intentos, torneo de un juego del Arcade y uno de Mentales.
- Prueba real con dos cuentas: rankings del desafío y del torneo, y el premio del podio (simulando la semana anterior con filas de prueba).

## Fuera de alcance

Validación en servidor, premios de fichas por ranking diario, torneos entre amigos con llaves.
