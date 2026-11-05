# Fichas del casino: bono del día, desafíos y (más adelante) anuncio — diseño

Hoy, en el 🃏 21 y el 🎴 Bacará (fichas compartidas en `cartas:fichas` = `{ fichas, max }`), al bajar de 5 fichas aparece «🏦 La casa te presta 100» sin límite. Se cambia por formas de ganar fichas que premian jugar el resto de la app y, en la app Android, ver un anuncio.

**Las fichas nunca se venden por dinero real** (si se pudieran comprar, Play trataría la app como juego de apuestas simulado).

## Pantalla «sin fichas» (21 y Bacará)

Con menos de 5 fichas, en lugar del préstamo:

- **🎁 Bono del día +100**: una vez por día (fecha local). Usado: desactivado, con «Vuelve mañana».
- **🎯 Desafíos de hoy**: la lista con su estado y un botón para ir a cada uno:
  - ☀️ Tu día completo (3 de 3): **+100** → abre Mentales en la tarjeta Tu día (`abrirMentales('#entreno')`).
  - 🔤 Palabra del día resuelta: **+50** → abre la palabra del día (`abrirJuegoPalabras('palabra')`).
  - 📅 Niveles diarios superados: **+10 cada uno, hasta +100 al día** (se ve «N/10») → abre Mentales (`abrirMentales()`).
  - Debajo: «Hoy llevas X de 250 fichas por desafíos».
- **📺 Ver un anuncio +100**: no se muestra todavía; se añade en la parte C (AdMob, solo en la app Capacitor).
- **Salir**, como hoy.

## Premios por desafíos

- Tope diario por desafíos: **250** fichas. Lo que pase del tope no se da.
- Cada desafío se premia una vez al día (Tu día, palabra); los niveles diarios, por cada nivel diario superado **por primera vez** (de 0 a ≥1 estrella), hasta 10.
- Las fichas se suman a `cartas:fichas` (y suben `max` si lo superan) aunque no estés sin fichas.
- Aviso: en la pantalla final de la partida (junto a los logros, `#final-logros`) para Tu día y niveles diarios; en el resumen de la palabra del día, una línea. Texto: «🪙 +50 fichas por la palabra del día».
- El bono no cuenta en el tope de desafíos.

## Datos y código

- `cartas:premios` = `{ fecha, ganadas, hechos: [...], diarios, bono }` (prefijo `cartas:`: se sincroniza y entra en la copia, como las fichas). Si `fecha` no es hoy, el día empieza de cero (salvo `bono`, que guarda la fecha en que se usó).
- `games/premios.js` (puro):
  - `MONTOS = { tudia: 100, palabra: 50, diario: 10 }`, `TOPE = 250`, `TOPE_DIARIOS = 10`, `BONO = 100`.
  - `premio(registro, tipo, fecha)` → `{ registro, fichas }` (`fichas` = lo que se da, 0 si ya estaba o no cabe).
  - `bono(registro, fecha)` → `{ registro, fichas }` (100 o 0).
  - `hoyDe(registro, fecha)` → `{ tudia, palabra, diarios, ganadas, bonoUsado }` para pintar la lista.
- `app/premios.js`: `darPremio(tipo)` lee y guarda `cartas:premios` y `cartas:fichas`, devuelve el texto del aviso o `''`; `fichasDeHoy()` para la pantalla.
- Ganchos: `app/partida.js` (Tu día completado: donde hoy `ligaAnotar('entreno')`; nivel diario superado por primera vez: donde se guardan las estrellas del diario) y `app/palabras.js` (`finDia` con acierto).
- `app/cartas.js`: la pantalla «sin fichas» nueva en `pintarApuesta`.

## Pruebas

- `tests.js`: montos; Tu día y palabra una vez al día; diarios hasta 10; tope 250 (un premio que no cabe entero da lo que queda); día nuevo empieza de cero; bono una vez al día y se renueva; el bono no cuenta en el tope.
- Chrome: quedarse sin fichas → bono +100 → al volver a quedarse sin fichas el bono sale desactivado → «Desafíos de hoy» → resolver la palabra del día → aviso y saldo +50 → la lista marca ✓.

## Para después (potenciar)

Más desafíos (ganar un duelo, terminar un solitario, subir en la liga), racha de días con premio creciente, fichas por logros.
