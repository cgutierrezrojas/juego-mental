# Ronda 3 🎲 Dados: Cacho chileno y Generala

Diseño aprobado por el usuario el 2026-11-17 («dale con todo»: se hacen 3a y 3b). Esta ronda agrega la sección 🎲 Dados al inicio, con dos juegos. La sección Mesa cambia su ícono a ♟️.

## Alcance

**3a: juegos y modos sin red**
- La sección Dados, con Cacho y Generala.
- Modo contra la máquina, con niveles Fácil, Normal y Difícil.
- Modo de varios jugadores en un celular, con la pantalla para pasarlo.
- Liga, experiencia, misiones, récords y anuncios.

**3b: contra un amigo en línea, 1 contra 1, por turnos**
- Se juega con «dados justos»: nadie puede elegir sus dados ni ver los dados ocultos del otro.
- Las trampas se detectan, a más tardar, al final de la partida.

Se implementa 3a primero y 3b después, en la misma rama.

## Arquitectura

**Motor de turnos.** Se reutiliza `app/cartas-mesa.js`, que ya maneja N jugadores, máquinas, la pantalla para pasar el celular y las mesas de amigos con `estado.datos`. Se generaliza con lo mínimo:
- Cada juego declara su sección (`seccion`: `'cartas'` o `'dados'`). De ahí salen a qué página vuelve al salir, el `ligaAnotar` y `anotarPerfil` con esa sección, y la clave de récord. Para los dados es `dados:<id>` y `dados:<id>-<nivel>`.
- Los juegos de dados usan los niveles `facil`, `normal` y `dificil`; los de cartas siguen con `normal` y `dificil`. Cada juego declara `niveles`.

**Reglas puras.**
- `games/dados.js`: tirada con generador, conteo y nombres de pintas.
- `games/cacho.js`.
- `games/generala.js`.
- Todo es puro, con el azar inyectado mediante el generador `{s}` de `games/semilla.js`, para poder probarlo y, en 3b, derivarlo de las semillas.

**Interfaz.**
- `app/dados.js`: la página de la sección (`#dados`), con las tarjetas de los dos juegos y «Tus partidas con amigos».
- El `pintar` de cada juego: `app/dados-cacho.js` y `app/dados-generala.js`.
- Dados dibujados en CSS, con los puntos de cada cara. Sin imágenes.

**Integración en el resto del sitio.**
- `SECCIONES` en `app/juegos.js`: `{ id: 'dados', nombre: 'Dados', icono: '🎲', color: …, descripcion: 'cacho y generala' }`. Mesa pasa a `icono: '♟️'`.
- `ABRIR` en `app/inicio.js`, `SECCIONES_MISION` y `NOMBRE_SECCION` en `games/perfil.js`.
- El mapa de secciones de `app/ui.js` (la pantalla de juego vuelve a Dados) y `PARTIDAS` si se agrega una pantalla nueva.
- El prefijo `dados:` en `games/copia.js` y en la sincronización (`games/sincro.js` `DE_PROGRESO`, si corresponde).
- `ARCHIVOS` de `sw.js`.

## 🎲 Cacho chileno

**Jugadores.** De 2 a 6. Contra la máquina, de 1 a 5 máquinas; en un celular, de 2 a 6 personas; con un amigo, 1 contra 1.

**Dados.** Cada jugador empieza con 5 dados ocultos. Las pintas, en orden, son: As (1), Tonto (2), Tren (3), Cuadra (4), Quina (5) y Sexto (6). Los ases son comodines y cuentan como cualquier pinta.

**Apuestas.**
- Una apuesta es `{ n, pinta }`: «hay al menos n dados de esa pinta entre todos».
- La apuesta siguiente debe ser mayor:
  - **Sin ases de por medio:** se sube la cantidad (con cualquier pinta), o se mantiene la cantidad y se sube la pinta.
  - **A ases:** la cantidad mínima es `ceil(n / 2)`. Por ejemplo, de 7 Quinas se pasa a 4 Ases.
  - **De ases a otra pinta:** la cantidad mínima es `2n + 1`. Por ejemplo, de 4 Ases se pasa a 9.
  - **Entre ases:** se sube la cantidad.
- El primero de la ronda no puede abrir en ases, salvo que tenga un solo dado.

**Dudar.** Se destapan todos los dados.
- Si el total de la pinta, contando los ases salvo en obligo, es mayor o igual que `n`, pierde un dado quien dudó.
- Si es menor, pierde un dado quien apostó.

**Calzar.** Solo puede hacerlo quien tiene el turno, y no sobre una apuesta propia.
- Si el total es exactamente `n`, quien calzó recupera un dado (hasta un máximo de 5).
- Si no, quien calzó pierde un dado.

**Rondas.**
- La siguiente ronda la empieza quien perdió el dado, o quien calzó.
- Si quien la empezaría quedó sin dados, empieza el siguiente que todavía tenga.
- Todos vuelven a tirar al comenzar cada ronda.

**Obligo.**
- La primera vez que un jugador queda con 1 dado, la ronda siguiente es de obligo y la abre ese jugador.
- Durante el obligo no hay comodines, la pinta de la apertura no puede cambiar y solo sube la cantidad.
- Cada jugador hace obligo una sola vez por partida.

**Final.** Gana el último jugador con dados.

**Pantalla.**
- Tu cacho, con tus dados; un toque los tapa o destapa.
- Los cachos de los demás, con su cantidad de dados.
- La apuesta vigente en grande, con quién la hizo.
- Un selector de cantidad y pinta. Solo deja elegir apuestas válidas, y la sugerida es la mínima válida.
- Los botones «Subir», «🤨 Dudo» y «🎯 Calzo».
- Al dudar o calzar, se muestra la revelación de todos los dados, con los que cuentan resaltados, y quién perdió o ganó un dado.
- En un celular entre varios, entre turnos aparece «Pasa el celular a <nombre>»; tus dados solo se ven después de tocar «Ya lo tengo».

**Estado puro (`games/cacho.js`).**
```
{ jugadores: [{ dados: [..], obligoUsado }], turno, apuesta: { n, pinta, de } | null,
  obligo: índice | null, ronda, g: {s}, ultima: { tipo: 'dudo' | 'calzo', ... } }
```
- Funciones: `nueva(n, semilla)`, `validas(e)` (o `apuestaMinima` más `esValida`), `apostar`, `dudar`, `calzar`, `ganador`, `maquina(e, nivel, rnd)`.
- En el modo amigo (3b), los dados de cada jugador no van en el estado compartido. Ver más abajo.

## 🎲 Generala clásica

**Jugadores.** De 2 a 4. Contra la máquina, de 1 a 3 máquinas; en un celular, de 2 a 4 personas; con un amigo, 1 contra 1.

**Turno.**
- Hasta 3 tiradas. Entre tiradas, cada dado se guarda o se suelta con un toque.
- Después se anota en una casilla libre. Si no queda ninguna útil, se tacha una, que vale 0.

**Casillas y puntajes.**
| Casilla | Puntaje |
|---|---|
| 1, 2, 3, 4, 5, 6 | Suma de esa pinta |
| Escalera (1-2-3-4-5 o 2-3-4-5-6) | 20 (25 servida) |
| Full (3 + 2) | 30 (35 servido) |
| Póker (4 iguales) | 40 (45 servido) |
| Generala (5 iguales) | 50 |
| Doble generala (una segunda generala) | 100 |

- **Servido** quiere decir que salió en la primera tirada del turno.
- **Generala servida:** gana la partida al instante.
- **Doble generala:** solo se puede anotar si la casilla Generala ya tiene 50.

**Final.** Termina cuando todos llenaron sus 11 casillas. Gana quien suma más; con la misma suma, empate.

**Pantalla.**
- Los 5 dados grandes, con los guardados marcados.
- El botón «🎲 Tirar (quedan N)».
- La tabla de todos los jugadores, con los puntos posibles de la tirada actual en tu columna. Tocar una casilla la anota, con confirmación si vale 0.
- En un celular entre varios, la pantalla para pasarlo entre turnos. Aquí no hay información oculta: es solo para que se note de quién es el turno.

**Estado puro (`games/generala.js`).**
```
{ jugadores: [{ tabla: { '1'..'6', escalera, full, poker, generala, doble } }], turno,
  dados: [5], guardados: [bool×5], tiradas, g: {s} }
```
- Funciones: `nueva(n, semilla)`, `tirar(e)`, `alternarGuardado(e, i)`, `posibles(e)`, `anotar(e, casilla)`, `ganador`, `maquina(e, nivel)`. La máquina devuelve una acción: tirar con ciertos dados guardados, o anotar.

## 🤖 Máquinas

**Cacho.**
- **Fácil:** sube con la apuesta mínima válida usando su pinta más repetida; el 30 % de las veces sube con una apuesta al azar entre las 6 primeras válidas. Duda al azar cuando la apuesta supera el doble de lo esperado.
- **Normal:** calcula lo esperado de una pinta como sus dados de esa pinta (con ases si cuentan) más los dados ocultos por 1/3 (por 1/6 en obligo o si la pinta es As), con aproximación normal.
  - Duda si la apuesta supera lo esperado + 1.
  - Calza si la apuesta está a menos de 0,5 de lo esperado y la probabilidad de acierto supera el 40 % (con 20 % perdía contra Fácil).
  - Si no, sube a la apuesta válida con mayor probabilidad de ser cierta.
- **Difícil:** usa la probabilidad binomial exacta y deduce de las apuestas de los demás que su pinta probablemente abunda (suma +0,5 por cada apuesta rival en esa pinta, hasta +2).
  - Sube con la apuesta más baja cuya probabilidad esté a 0,3 de la mejor.
  - Duda si P(cierta) + 0,8 de la mejor subida < 0,5.
  - Calza con probabilidad de acierto > 30 %.
  - Farolea en un 30 % de las veces (apuesta mínima en una pinta al azar).

**Generala.**
- **Fácil:** guarda la pinta más repetida y anota en la casilla de mayor puntaje disponible.
- **Normal:** reglas sencillas (busca escalera si tiene 4 seguidos, full o póker si tiene trío, etc.) y anota maximizando el puntaje, con preferencia por no gastar Generala ni Doble.
- **Difícil:** valor esperado. Para cada una de las 32 formas de guardar, calcula el mejor puntaje esperado tras las tiradas restantes (enumerando resultados, como mucho 7776). Para anotar usa el puntaje más un valor de reserva por casilla, para no gastar casillas caras temprano.

**Requisitos.**
- Comprobar con simulaciones que la Difícil le gana a la Normal en al menos el 60 % de las partidas 1 contra 1: en Cacho, partidas a 5 dados por lado; en Generala, más puntos.
- Ninguna jugada de la máquina debe pasar de unos 300 ms en un celular de gama media, o sea unos 60 ms en un computador.

## 3b: contra un amigo con «dados justos»

**Protocolo** (módulo puro `games/justo.js`, que comparten los dos juegos):

1. **Sellos.**
   - Quien reta (x) genera una semilla secreta `s_x` de 16 bytes aleatorios y crea la mesa con `sello_x = SHA-256(s_x)`.
   - El invitado (o) genera `s_o`. En su primera escritura publica `sello_o` y un número público `r_o` de 16 bytes aleatorios.
   - Después, x publica su número público `r_x`.
   - Así cada número público se elige cuando la semilla secreta del otro ya está sellada.
2. **Tiradas con la hora del servidor** (decisión del usuario del 2026-11-18). Con solo `(s_yo, r_rival, k)` el dueño podría calcular de antemano todas sus tiradas y elegir qué guardar sabiendo lo que va a salir. Por eso cada tirada incorpora una hora que pone el servidor y que nadie conoce antes de escribir:
   - **Contador y registro.** La mesa lleva un contador global de tiradas `estado.k` (entero) y un registro de solo escritura `mesas/$id/log/$k = { cuando }`.
     - Para pedir la tirada k, quien tiene el turno escribe en una sola actualización `estado.k = k` (exactamente el anterior + 1) y `log/k.cuando = now`, junto con su decisión: qué dados guarda en la Generala o el inicio de ronda en el Cacho.
     - Las reglas de RTDB garantizan que `cuando` es la hora real del servidor y que `log/k` no se puede reescribir.
     - Las reglas también exigen que `estado.k` solo se mantenga, o suba de a 1 escribiendo a la vez `log/<nuevo k>`.
   - **Dados.** Los dados de la tirada k salen de `dadosDe(s_yo, r_rival + ':' + log[k].cuando, k, cuantos)`.
     - Solo se pueden calcular después de que el servidor guardó `cuando`, y la decisión ya quedó fija.
     - No se puede «volver a tirar»: cada k se usa una sola vez y el historial de la partida debe usar todos los k consecutivos. Un k gastado sin su tirada correspondiente es trampa.
   - **Publicación.** En la Generala, una segunda escritura publica los dados calculados. En el Cacho, los dados de la ronda quedan ocultos hasta revelarlos.
   - **Revisión al final.** Usa `log[k].cuando`, que es infalsificable, para recalcular cada tirada.
   - **Límite.** Un tramposo solo podría intentar adivinar la hora exacta en milisegundos de su propia escritura. Con la latencia de la red eso no es práctico.
3. **Cacho.**
   - Los dados de cada jugador no se suben a la mesa.
   - Al dudar o calzar, la ronda pasa a fase «revelar»: cada jugador, en su turno, publica sus dados de esa ronda.
   - El turno de revelar va primero a quien no hizo la jugada. El estado registra quién debe revelar.
   - El resultado se calcula cuando ambos revelaron.
4. **Generala.**
   - Los dados son públicos.
   - Quien tira publica el resultado calculado con su semilla. Los dados guardados se conservan y los demás se toman de la tirada siguiente de la secuencia.
5. **Revisión al final.**
   - Ambos publican su semilla `s`.
   - Cada celular comprueba el sello del rival y recalcula todas sus tiradas: en el Cacho, sus revelaciones; en la Generala, cada tirada.
   - Si algo no cuadra, se muestra «⚠️ Tu rival hizo trampa» y para ese jugador cuenta como victoria.
6. **Transiciones.**
   - Como en la Batalla naval, cada celular guarda localmente en `dados:<idMesa>` su semilla y el historial de lo que escribió.
   - Al llegar un cambio, comprueba que sea exactamente una jugada legítima del rival a partir de su última escritura, o un prefijo de sus propias escrituras si alguna se perdió.
   - Se reutiliza el patrón de `siguePartida` y `confirmarNaval` de `games/naval.js` y `app/mesa.js`. Si conviene, se extrae a una función común.
7. **Reglas de RTDB.**
   - Se agregan `'cacho'` y `'generala'` a la lista de juegos con `datos` (como mucho 8000 caracteres) en `database.rules.json`.
   - Se agrega `estado/k`, un entero que se mantiene o sube de a 1, y solo si en la misma actualización existe `log/<k>`.
   - Se agrega `log/$k`: lo escribe una sola vez quien tiene el turno, con `cuando === now` y `$k` igual al nuevo `estado/k`. Lo leen los dos jugadores, como el resto de la mesa.
   - Se prueban en el emulador: reescribir el log, saltar k o poner una hora falsa debe ser rechazado.
   - El usuario las publica.
8. **Prueba real.** Con dos cuentas, igual que en la ronda 2: una partida honesta de cada juego y una con trampa (dados que no cuadran con la semilla).

**Límite aceptado (como en la Batalla naval).** Un cliente modificado puede mentir durante la partida, pero se descubre al final y pierde. Quien abandona sin revelar deja la partida hasta que caduca a los 7 días. Impedir la trampa del todo requiere un servidor (plan Blaze).

## Pruebas
- **Tests puros en `tests.js`.**
  - Cacho:
    - apuestas válidas, incluidos los cambios a ases y desde ases;
    - dudar y calzar en todos sus casos;
    - ases como comodines y sin comodines en obligo;
    - obligo una sola vez por jugador;
    - turno inicial tras perder un dado o quedar sin dados;
    - final de la partida.
  - Generala:
    - las casillas, incluidos servido, doble generala y tachar;
    - la generala servida gana al instante;
    - final y empate.
  - Máquinas: siempre hacen una jugada válida.
  - `justo.js`:
    - el mismo par semilla-número público da los mismos dados;
    - la distribución es uniforme;
    - la verificación detecta un dado cambiado y un sello falso;
    - la transición exacta.
- **Navegador (CDP).** Cada juego contra la máquina y en un celular entre varios, revisado en tema claro y oscuro a 360 px. El modo amigo, con nube falsa y con dos cuentas reales.
- **Simulaciones** de las máquinas, con sus tiempos.

## Fuera de alcance
- Más de 2 jugadores en línea.
- Partidas de dados en vivo.
- Otras variantes: Generala con escalera al As o reglas locales del Cacho distintas a las descritas.
- Servidor antitrampas.
