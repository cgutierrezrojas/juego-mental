# Ronda 4 🃏 Cartas — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:subagent-driven-development. Pasos con casillas (`- [ ]`).

**Objetivo:** agregar el ♣️ Chinchón clásico y el ⚔️ Truco chileno a la sección 🃏 Cartas, contra la máquina (Fácil, Normal,
Difícil), en un celular y contra un amigo.

**Arquitectura:**
- Reglas puras en `games/chinchon.js` y `games/truco.js`, con el azar inyectado (`rnd`).
- Cada juego es un objeto para el motor `app/cartas-mesa.js` (como `CARIOCA` en `app/carioca.js`): `app/chinchon.js` y `app/truco.js`.
- Con un amigo, el estado entero va como texto en `mesas/{id}/estado.datos` (igual que Escoba o Carioca; sin dados justos).

**Spec (fuente de las reglas y valores exactos):** `docs/superpowers/specs/2026-11-19-cartas-ronda4-design.md`. Cada tarea dice qué
secciones leer.

## Restricciones globales

- **Idioma:** español en el texto visible, los comentarios y los mensajes de commit.
- **Commits:** `git -c user.email=203862735+cgutierrezrojas@users.noreply.github.com commit …`; el mensaje termina con
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, nunca con otro modelo.
- **Rama:** todo en `cartas4`. No se fusiona ni se sube. No hagas commit de `app-android/app/capacitor.build.gradle` ni de
  `app-android/capacitor.settings.gradle` (cambios de fin de línea).
- **sw.js:** cada archivo nuevo de la app va en `ARCHIVOS`; después, la `VERSION` exacta que pida `node tests.js`.
- **No leer:** `android/` ni `app-android/keystore.properties`. No poner en el repo el correo del usuario ni el UID del administrador.
- **Tests:** `node tests.js` (todos deben pasar; hoy son 137).
- **Servidor de pruebas:** `python -m http.server 8754` en la raíz. Se detiene **solo por PID**, desde PowerShell:
  `Get-CimInstance Win32_Process -Filter "Name like 'python%'" | Where-Object { $_.CommandLine -match 'http\.server 8754' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`.
  Nunca se matan todos los procesos de python.
- **Driver CDP:** `C:/Users/ADMIN/AppData/Local/Temp/claude/c--Users-ADMIN-Desktop-juego-mental/108c02ba-0e81-45cd-86a7-284219213cd5/scratchpad/cdp360.mjs`.
  Uso: `node cdp360.mjs http://localhost:8754/ prueba.js captura.png [claro|oscuro]` (cwd = esa carpeta). La prueba es una función
  `async () => {...}` que se evalúa en la página. Si la primera carga sale vieja (SW), se corre otra vez. Scripts y capturas nuevos en
  `C:\Users\ADMIN\AppData\Local\Temp\claude\1c7c5dcd270f9de4\108c02ba-0e81-45cd-86a7-284219213cd5\scratchpad`. Las capturas se miran
  con Read, en claro y en oscuro, a 360 px.
- **Módulos puros:** nunca modifican la entrada; el azar entra por `rnd` (por defecto `Math.random`); cada acción inválida devuelve
  `null`; la máquina es `maquina(e, nivel, rnd)` con `nivel` `'facil' | 'normal' | 'dificil'` y devuelve una acción para `accion(e, a, rnd)`.
- **La máquina no hace trampa:** solo mira su mano, el descarte / las cartas ya jugadas y lo que el rival hizo a la vista. Nunca la
  mano del rival ni el orden del mazo.
- **Tiempo de la máquina:** como mucho ~60 ms por jugada en un computador. Si no alcanza, se simplifica con un comentario `ponytail:`.
- **Baraja:** `barajaEs(rnd)` de `games/escoba.js` da `{ v: 1..10, p }` (8 = sota, 9 = caballo, 10 = rey). Nombres con `nombre(c)` /
  `nombreLargo(c)` de `games/escoba.js`; dibujo con `naipe(c)` de `app/cartas.js` (mira cómo lo usa la Escoba con la baraja española).
- **Motor:** contrato de `app/cartas-mesa.js` (léelo entero): `J = { id, nombre, icono, reglas, credito?, nueva(n), maquina(e, nv),
  pintar(e, quien, miTurno, actuar, extra) → { marcador, tapete, botones }, resumen(e, nombres), meta(e), metaTexto?, menosGana?,
  maxMaquinas | maquinas, maxLocal?, niveles?, pausa? }`. El estado lleva `turno` (quien debe actuar), `puntos`, `ganador` (índice o
  `null`), `resumen` (`{ ronda, … }` o `null`) y `aviso` (`{ j, t }` o `null`).
- **Integración:** el motor ya llama a `ligaAnotar`, `anotarPerfil`, `finDePartida` y guarda el récord por nivel; no lo dupliques.
- **Diálogos nuevos:** si agregas un `<dialog>`, va en las listas de estilos de diálogos de `styles.css` (si no, sale blanco en oscuro).

---

### Tarea 1: Chinchón — reglas puras, máquina y tests

**Leer:** spec, sección «♣️ Chinchón clásico»; `games/escoba.js` (baraja y estilo de módulo puro); `games/carioca.js` (estilo de un
juego de robar/botar con máquina); la parte de Carioca en `tests.js` (estilo de tests).

**Crear `games/chinchon.js`** con este estado y estas funciones (exporta todas):

- Estado: `{ n, manos: [[c]], mazo: [c], descarte: [c] (arriba = último), turno, robo: null | 'mazo' | 'descarte' (lo que ya robó en
  este turno), robada: c | null (la recién robada del descarte, que no se puede botar), puntos: [n], fuera: [bool] (eliminados),
  ronda, empieza (quién empezó esta ronda), ganador, aviso, resumen }`.
- `PUNTOS(c)`: `c.v <= 7 ? c.v : c.v + 2` (sota 10, caballo 11, rey 12).
- `mejorForma(cartas) → { juegos: [[c]], sueltas: [c], pts }`: la forma de ordenar en tríos/cuartetos y escalas (≥3 seguidas del
  mismo palo por `v`, 7→sota seguido, sin vuelta) que deja menos puntos sueltos. Búsqueda exhaustiva sobre 7–8 cartas.
- `esChinchon(cartas)`: 7 cartas, mismo palo, `v` consecutivos.
- `agregarSueltas(juegos, sueltas) → { juegos, sueltas }`: agrega todas las sueltas posibles a juegos ajenos (mismo número a un trío
  de 3; alargar una escala por una punta; repite hasta que no quepa ninguna más).
- `nueva(n = 2, rnd)`: ronda 1 repartida (7 cartas, una carta al descarte, `empieza` 0).
- `robar(e, de, rnd)`, `botar(e, i, rnd)`, `cerrables(e) → [i]` (índices de cartas que, botadas, dejan sueltas ≤ 3; solo con 8 cartas y
  ya robado), `cerrar(e, i, rnd)`.
- Al cerrar: `resumen = { ronda, cerro: j, chinchon: bool, filas: [{ j, juegos, sueltas, pts }] }`; puntos según la spec (−10 sin
  sueltas; chinchón gana la partida: `ganador = j`); los demás ordenan su mano y agregan sueltas a los juegos del que cerró.
  Eliminación al **pasar de 100**; gana el último en pie. Si la partida sigue, se reparte la ronda siguiente (`empieza` pasa al
  siguiente no eliminado) y el estado nuevo conserva `resumen`.
- Mazo agotado al robar: se baraja el descarte salvo la carta de arriba.
- Turno: tras botar, pasa al siguiente no eliminado. `aviso` dice lo que hizo (robó del descarte qué carta, botó qué carta, cerró).
- `maquina(e, nivel, rnd)` y `accion(e, a, rnd)` con acciones `{ robar: 'mazo' | 'descarte' }`, `{ botar: i }`, `{ cerrar: i }`. Los tres
  niveles como dice la spec. La Difícil recuerda solo lo visible (cartas que el rival tomó del descarte y las que botó; guárdalo en el
  estado, p. ej. `vistas: [[c]]` por jugador, actualizado en `robar`/`botar`).

**Tests en `tests.js`** (todos los casos de la sección «Pruebas» de la spec para el Chinchón), más: una partida entera entre máquinas
para cada nivel y para 2, 3 y 4 jugadores termina con un ganador sin errores (semilla fija), y `nueva`/`robar`/`botar` no modifican su
entrada.

- [ ] Escribir los tests y verlos fallar.
- [ ] Implementar `games/chinchon.js`.
- [ ] `node tests.js` pasa.
- [ ] Commit «Chinchón: reglas, máquina y pruebas».

### Tarea 2: Chinchón en la sección Cartas + reglas de Firebase

**Leer:** `app/cartas-mesa.js` entero; `app/carioca.js` (objeto para el motor con mano ordenable y botones); `app/cartas.js`
(tarjetas de la sección y estadísticas, línea ~85); `database.rules.json` (`mesas/$id/estado/.validate`); `sw.js`.

**Hacer:**
1. `app/chinchon.js`: `export const CHINCHON = { id: 'chinchon', nombre: 'Chinchón', icono: '♣️', maxMaquinas: 3, maxLocal: 4,
   niveles: ['facil', 'normal', 'dificil'], menosGana: true, meta: () => 100, metaTexto: () => 'Pasar de 100 elimina', reglas, credito
   (el mismo de la Escoba, por las cartas), nueva, maquina, pintar, resumen }`.
   - `pintar`: rivales (nombre, cartas en mano, puntos, eliminado), mazo (tocar = robar) y descarte (tocar = robar del descarte), tu
     mano; si ya robaste, tocar una carta la bota; botón «Cerrar» cuando `cerrables(e)` no está vacío (luego se elige la carta entre
     las marcadas, con «Cancelar»); botón «Ordenar» (orden visual: juegos de `mejorForma` primero, sueltas al final; guárdalo solo en la
     vista, no en el estado). El aviso de lo último y «▶ Tu turno: roba» / «▶ Bota una carta (o cierra)».
   - `resumen`: quién cerró (y si fue chinchón o −10), y por jugador sus juegos y sueltas con sus puntos.
2. `app/cartas-mesa.js`: importar `CHINCHON` y agregarlo a `JUEGOS_MESA_CARTAS` después de `BURAKO`.
3. `app/cartas.js`: agregar `['chinchon', '♣️ Chinchón']` a la lista de estadísticas (línea ~85) y
   `tarjeta('♣️', 'Chinchón', () => abrirJuegoMesa('chinchon'))` al final de `$('cartas-juegos').replaceChildren(…)` (línea ~78).
   Ojo: 🀄 ya es del Burako.
4. `database.rules.json`: agregar `chinchon` **y** `truco` a la lista de juegos con `datos` texto ≤ 8000 en `mesas/$id/estado/.validate`.
   Comprueba con el emulador de Firebase: copia `database.rules.json` a
   `C:/Users/ADMIN/AppData/Local/Temp/claude/c--Users-ADMIN-Desktop-juego-mental/108c02ba-0e81-45cd-86a7-284219213cd5/scratchpad/fb/`,
   y desde esa carpeta en Bash: `unset VSCODE_CWD; export JAVA_HOME=/c/Users/ADMIN/jdk21/jdk-21.0.13+9; PATH=$JAVA_HOME/bin:$PATH npx firebase emulators:exec --only database --project demo-palrato "node prueba.mjs"`
   (y `prueba-dados.mjs`); las dos deben seguir pasando. Agrega a `prueba.mjs` un caso: una mesa `chinchon` acepta `estado.datos`
   texto y rechaza `estado.celdas` sin `datos`.
5. `sw.js`: `app/chinchon.js` y `games/chinchon.js` en `ARCHIVOS`; `VERSION` la que pida el test.
6. Pruebas en el navegador (CDP, 360 px, claro y oscuro): una partida contra 1 máquina (robar, botar, cerrar cuando se pueda) y una
   contra 3 máquinas hasta el primer resumen; local a 3 hasta pasar el celular. Nada se sale de la pantalla a 360 px (8 cartas en
   mano deben caber o envolver bien). Mira las capturas.

- [ ] Hacer los puntos 1–5.
- [ ] `node tests.js` y las pruebas del emulador pasan.
- [ ] Capturas revisadas en claro y oscuro.
- [ ] Commit «Chinchón en Cartas; reglas de mesas para chinchón y truco».

### Tarea 3: Truco chileno — reglas puras, máquina y tests

**Leer:** spec, sección «⚔️ Truco chileno» completa (es la fuente de cada número); `games/escoba.js`; el estilo de tests de `tests.js`.

**Crear `games/truco.js`** (exporta todo):

- `JERARQUIA(c) → número` (mayor gana; iguales empatan) según la lista de la spec.
- `tanto(cartas) → número` (envido, máx. 33).
- Estado: `{ n: 2, manos: [[c],[c]] (cartas que quedan), bazas: [{ c: [c0|null, c1|null], gana: 0 | 1 | 'parda' | null }], mano (0|1:
  quién es mano esta ronda), turno, puntos: [a, b], ronda, envido: { cantos: [], quien, estado: null | 'pendiente' | 'querido' | 'no',
  tantos? }, truco: { nivel: 0..3 (querido), cantado: 0..3, quien, quiero: j | null (quién puede subir), pendiente: bool },
  juega: j (a quién le toca tirar carta cuando no hay canto pendiente), ganador, aviso, resumen }`.
  Puedes ajustar los nombres internos si quedan más claros, pero mantén `turno`, `puntos`, `ganador`, `aviso`, `resumen` y exporta
  `acciones(e)`.
- `acciones(e) → [a]`: las acciones legales de `e.turno`. Formas: `{ carta: i }`, `{ canto: 'envido' | 'real' | 'falta' | 'truco' |
  'retruco' | 'vale4' }`, `{ quiero: true | false }`, `{ mazo: true }`. Con un canto pendiente solo: quiero/no quiero y subir (incluido
  «el envido está primero» = cantar envido con un truco pendiente en la primera baza si el envido no se jugó).
- `accion(e, a, rnd) → e' | null` (null si `a` no está en `acciones(e)`).
- `nueva(rnd)`, puntos de envido/truco/mazo, pardas y final a 24 **exactamente como la spec**. Al terminar cada ronda: `resumen = {
  ronda, lineas: [texto] }` (p. ej. «Envido querido: 27 contra 31, +2 para Jugador 2», «Truco querido, +2 para Tú»; usa índices de
  jugador en los datos y deja que la app ponga los nombres: `lineas: [{ j, t }]`), y se reparte la siguiente ronda (la mano alterna)
  salvo que alguien llegue a 24 (`ganador`). Los puntos del envido se suman en cuanto se resuelve (puede ganar la partida ahí).
- `maquina(e, nivel, rnd)` con los tres niveles de la spec. La Difícil estima la fuerza con las cartas que no ha visto (baraja menos su
  mano menos lo jugado) y miente a veces (p. ej. 20 %).

**Tests:** todos los casos de «Pruebas» de la spec para el Truco, con estados armados a mano (manos fijas), más: una partida entera
entre máquinas por nivel termina en ≥24 sin errores (semilla fija); `accion` devuelve `null` para cualquier acción fuera de
`acciones(e)`; `accion` no modifica su entrada.

- [ ] Escribir los tests y verlos fallar.
- [ ] Implementar `games/truco.js`.
- [ ] `node tests.js` pasa.
- [ ] Commit «Truco chileno: reglas, cantos, máquina y pruebas».

### Tarea 4: Truco en la sección Cartas

**Leer:** `app/cartas-mesa.js` entero; `app/chinchon.js` (de la Tarea 2) y `app/carioca.js`; spec, «⚔️ Truco chileno», «Pantalla».

**Hacer:**
1. `app/truco.js`: `export const TRUCO = { id: 'truco', nombre: 'Truco', icono: '⚔️', maxMaquinas: 1, niveles: ['facil', 'normal',
   'dificil'], meta: () => 24, metaTexto: (e) => …malas/buenas…, reglas, credito (el de la Escoba), nueva: () => T.nueva(), maquina,
   pintar, resumen }`.
   - `pintar`: marcador con puntos (malas/buenas); las bazas jugadas (rival arriba, tú abajo, ganador de cada una); tu mano (tocar una
     carta la juega cuando `{ carta: i }` es legal); botones con las acciones legales con nombres claros («Envido», «Real envido»,
     «Falta envido», «Truco», «Retruco», «Vale cuatro», «Quiero», «No quiero», «Irse al mazo»; y «El envido está primero» cuando
     corresponda). El aviso dice lo último («Tu rival cantó Truco»).
   - `resumen`: las líneas de la ronda con los nombres.
   - Con la máquina, `pausa` ~900 ms está bien; si la máquina canta, el humano ve el aviso antes de responder.
2. `app/cartas-mesa.js`: importar `TRUCO` y agregarlo a `JUEGOS_MESA_CARTAS` después de `CHINCHON`.
3. `app/cartas.js`: `['truco', '⚔️ Truco']` en las estadísticas y `tarjeta('⚔️', 'Truco', () => abrirJuegoMesa('truco'))` en
   `$('cartas-juegos')`, después del Chinchón.
4. `sw.js`: `app/truco.js` y `games/truco.js` en `ARCHIVOS`; `VERSION` nueva.
5. Pruebas en el navegador (CDP, 360 px, claro y oscuro): contra la máquina, una ronda con envido querido y truco querido, y una con
   «no quiero»; local a dos: al cantar, la pantalla tapada pasa al otro, y al responder vuelve. Mira las capturas: los botones de
   cantos no deben desbordar a 360 px.

- [ ] Hacer los puntos 1–4.
- [ ] `node tests.js` pasa; capturas revisadas.
- [ ] Commit «Truco en Cartas».

### Tarea 5: Simulaciones de las máquinas

**Leer:** spec, «Pruebas» (simulaciones); la Tarea 6 del plan de dados como referencia del estilo
(`docs/superpowers/plans/2026-11-17-dados-ronda3.md`, «Tarea 6», solo esa sección) y cómo quedaron esas simulaciones en `tests.js`.

**Hacer:**
- Un script de simulación (en la carpeta de scratchpad de la sesión, no en el repo) que juega muchas partidas máquina contra máquina
  con semilla fija, alternando quién empieza: Chinchón a 2 (Difícil vs Normal, Normal vs Fácil, Difícil vs Fácil) y Truco (los mismos
  cruces). Mínimo 400 partidas por cruce.
- Ajustar `maquina` hasta que en cada juego Difícil > Normal > Fácil con **más del 55 %** en cada cruce, sin pasar el tiempo por jugada.
- En `tests.js`, un test rápido por juego (≤ 2 s cada uno, p. ej. 150 partidas con semilla fija) que asegure Difícil vs Fácil > 55 %.
- Anotar los porcentajes finales en la spec (sección «Pruebas», línea nueva «Resultados»).

- [ ] Simular y ajustar.
- [ ] Tests rápidos en `tests.js`; `node tests.js` pasa.
- [ ] Commit «Chinchón y Truco: niveles de máquina ajustados».

### Tarea 6 (controlador, después de que el usuario publique las reglas): prueba real con dos cuentas

Adaptar `…/scratchpad/r9-real.js` de la sesión (Dados) o `r5-naval-real.js`: una partida con un amigo de cada juego entre dos cuentas
(A en la UI, B por SDK), comprobando que las jugadas viajan y que el resultado queda en los dos; luego limpiar todo en Firebase
(mesas, misMesas, amistad y cuentas de prueba).
