# Ronda 5 🧩 Puzzles — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:subagent-driven-development. Pasos con casillas (`- [ ]`).

**Objetivo:** sección nueva «🧩 Puzzles» con 🔢 Sudoku 9×9 y 💣 Buscaminas infinito (Fácil, Normal, Difícil y 📅 Del día con
ranking del día), donde las fichas sirven para pistas y para seguir tras una mina.

**Arquitectura:**
- Reglas puras en `games/sudoku.js` y `games/minas.js` (semilla de `games/semilla.js`, sin DOM, sin modificar la entrada).
- UI en `app/sudoku.js` y `app/minas.js`; la página de la sección y el «del día» en `app/puzzles.js` (patrón de `app/dados.js`).
- Ranking del día en Firestore `diario/{fecha}_{juego}/jugadores/{uid}` (patrón de la liga semanal).

**Spec (fuente de las reglas y valores exactos):** `docs/superpowers/specs/2026-11-20-puzzles-ronda5-design.md`. Léela entera antes de
empezar cualquier tarea.

## Restricciones globales

- **Idioma:** español en el texto visible, los comentarios y los mensajes de commit.
- **Commits:** `git -c user.email=203862735+cgutierrezrojas@users.noreply.github.com commit …`; el mensaje termina con
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, nunca con otro modelo.
- **Rama:** todo en `puzzles5`. No se fusiona ni se sube. No hagas commit de `app-android/app/capacitor.build.gradle` ni de
  `app-android/capacitor.settings.gradle`.
- **sw.js:** cada archivo nuevo de la app va en `ARCHIVOS`; después, la `VERSION` exacta que pida `node tests.js`.
- **No leer:** `android/` ni `app-android/keystore.properties`. No poner en el repo el correo del usuario ni el UID del administrador.
- **Tests:** `node tests.js` (todos deben pasar; hoy son 147). Estilo: mira los tests existentes del Chinchón/Truco en `tests.js`.
- **Servidor de pruebas:** `python -m http.server 8754` en la raíz. Se detiene **solo por PID**, desde PowerShell:
  `Get-CimInstance Win32_Process -Filter "Name like 'python%'" | Where-Object { $_.CommandLine -match 'http\.server 8754' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`.
  Nunca se matan todos los procesos de python.
- **Scratchpad (S):** `C:\Users\ADMIN\AppData\Local\Temp\claude\1c7c5dcd270f9de4\108c02ba-0e81-45cd-86a7-284219213cd5\scratchpad`.
  Driver CDP: `S/cdp-r9.mjs`. Uso (cwd = S): `node cdp-r9.mjs http://localhost:8754/ prueba.js captura.png [claro|oscuro]`. La prueba es
  una función `async () => {...}` que se evalúa en la página (ejemplos: `S/tr-maquina-fin.js`, `S/ch-resumen-3.js`). Si la primera
  carga sale vieja (SW), se corre otra vez. Las capturas se miran con Read, en claro y en oscuro, a 360 px.
- **Almacenamiento:** todo lo de esta ronda bajo el prefijo `puzzles:` (agrégalo a `PREFIJOS` de `games/copia.js` y a `DE_PROGRESO` de
  `games/sincro.js`), salvo la partida a medias, que va en `sudoku-partida` / `minas-partida` (solo en este celular, como
  `solitario-partida`). Lee/escribe con `leerJSON` (`app/datos.js`) y `guardar` (`games/comun.js`).
  - `puzzles:sudoku` y `puzzles:minas` = `{ facil: { mejor, veces }, normal: {…}, dificil: {…}, dia: { fecha, valor } }`
    (Sudoku: `mejor` = segundos, menos es mejor; Minas: `mejor` = puntaje, más es mejor; `valor` null si no terminó).
- **Fichas:** `leerFichas()`, `sumarFichas(n)` de `app/premios.js` (n negativo para gastar). Anuncio con premio: `hayAnuncios()`,
  `verAnuncioPremio()` de `app/anuncios.js`. Al terminar una partida: `finDePartida()` (intersticial) y
  `ligaAnotar('partida', 1, 'puzzles')` de `app/liga.js` (más `ligaAnotar('victoria', 1, 'puzzles')` al resolver un Sudoku y en Minas
  cuando el puntaje ≥ 100; revisa en `games/liga.js`/`games/perfil.js` qué tipos existen y usa los que ya usan los demás juegos).
- **Pantallas en partida:** sus `<section>` van en `PARTIDAS` de `app/ui.js` y cada una tiene su ← Salir.
- **Diálogos nuevos:** si agregas un `<dialog>`, va en las listas de estilos de diálogos de `styles.css` (si no, sale blanco en oscuro).
- **Móvil primero:** nada se sale a 360 px; toques de ≥ 36 px.

---

### Tarea 1: Sudoku — reglas puras y tests

**Leer:** spec «Sudoku»; `games/semilla.js`; `games/puzzle.js` (estilo de módulo puro corto).

**Crear `games/sudoku.js`** (exporta todo):
- Tableros como texto de 81 caracteres `'0'..'9'` (`'0'` = vacía), fila por fila.
- `PISTAS = { facil: 40, normal: 32, dificil: 26 }`.
- `soluciones(t, tope = 2) → número` (backtracking con la casilla de menos candidatos primero; corta al llegar a `tope`).
- `generar(semilla, nivel) → { dadas, solucion }`: llena con backtracking usando `generador(semilla)`/`entero`; luego recorre las 81
  casillas en orden barajado con la misma semilla y quita cada una si `soluciones(…, 2) === 1`, hasta llegar a `PISTAS[nivel]`.
  Si no llega, se queda con lo logrado (nunca pierde unicidad).
- `choques(t) → Set<índice>`: casillas no vacías con el mismo número en su fila, columna o caja 3×3.
- `resuelto(t, solucion) → bool`.
- `pista(t, solucion) → índice | -1`: la primera casilla (en orden) vacía o distinta de la solución.

**Tests:** misma semilla ⇒ mismo `dadas`; los tres niveles dan `soluciones(dadas) === 1`, `solucion` válida (cada fila/columna/caja
1–9) y coherente con `dadas`; pistas entre `PISTAS[nivel]` y `PISTAS[nivel] + 4`; `choques` detecta fila, columna y caja (casos a
mano) y vacío en la solución; `resuelto`; `pista`; generar un Difícil tarda < 1,5 s (promedio de 5 semillas).

- [ ] Tests, verlos fallar. - [ ] Implementar. - [ ] `node tests.js` pasa. - [ ] Commit «Sudoku: generador con solución única y pruebas».

### Tarea 2: Buscaminas infinito — reglas puras y tests

**Leer:** spec «Buscaminas infinito»; `games/semilla.js`.

**Crear `games/minas.js`** (exporta todo):
- `DENSIDAD = { facil: 0.12, normal: 0.17, dificil: 0.22 }`; `densidad(nivel, x, y) = DENSIDAD[nivel] + min(0.08, floor(max(|x|,|y|) / 25) * 0.01)`.
- `hayMina(semilla, nivel, x, y)`: falso si `|x| ≤ 1 && |y| ≤ 1`; si no, `hash(semilla, x, y) / 2^32 < densidad(…)` con un hash entero
  32 bits estable (p. ej. mezclar con `Math.imul` como mulberry32). Determinista.
- Estado: `{ semilla, nivel, abiertas: { 'x,y': n } (n = minas vecinas), banderas: { 'x,y': true }, explotadas: { 'x,y': true },
  boom: null | 'x,y', seguidas: 0, fin: false }`. Claves `'x,y'`.
- `nueva(semilla, nivel) → e` con la expansión ya hecha desde (0,0).
- `abrir(e, x, y) → e'`: nada si abierta, con bandera, `boom` o `fin`; mina → `boom = 'x,y'`; 0 → BFS por vecinas (tope 5000 casillas
  nuevas por toque).
- `bandera(e, x, y)`, `acorde(e, x, y)` (si el número tiene tantas banderas+explotadas alrededor como su valor, abre las vecinas
  cerradas sin bandera; puede dar `boom`).
- `seguir(e) → e'`: la casilla de `boom` pasa a `explotadas`, `boom = null`, `seguidas + 1`. `costoSeguir(n) = 50 * 2 ** n`.
- `terminar(e) → e'` con `fin: true`. `puntaje(e) = nº abiertas + 5 * banderas sobre mina` (explotadas no suman).
- `semillaDelDia(fecha 'AAAA-MM-DD', juego) → entero` (hash del texto; la usa también el Sudoku) — ponla aquí y expórtala.

**Tests:** `hayMina` determinista y 3×3 del origen sin minas; densidad observada en un cuadro de 200×200 lejos del origen ≈ la
esperada (±2 pp); expansión igual a una BFS de referencia sobre un cuadro 30×30 alrededor del origen; acorde abre/da boom; `seguir`
y `costoSeguir` 50/100/200; `puntaje` con bandera correcta, incorrecta y explotada; `abrir` no modifica la entrada; misma
`semillaDelDia` para la misma fecha, distinta para otra fecha o juego.

- [ ] Tests, verlos fallar. - [ ] Implementar. - [ ] `node tests.js` pasa. - [ ] Commit «Buscaminas infinito: reglas y pruebas».

### Tarea 3: Sección Puzzles + Sudoku en pantalla

**Leer:** `app/dados.js`, `app/inicio.js` (`ABRIR`, cuenta de juegos), `app/juegos.js` (`SECCIONES`), `index.html` (secciones `dados`,
`arcade-juego`), `app/ui.js` (`mostrar`, `PARTIDAS`), `app/premios.js`, `app/estadisticas.js` (cómo listan récords otras secciones).

**Hacer:**
1. `SECCIONES`: `{ id: 'puzzles', nombre: 'Puzzles', icono: '🧩', color: 'verde', descripcion: 'sudoku, buscaminas…' }` (antes de
   Arcade). `app/puzzles.js`: `JUEGOS_PUZZLES = 2`, `abrirPuzzles()` (dos tarjetas 🔢 Sudoku / 💣 Buscaminas) y
   `abrirModos(juego)` (Fácil/Normal/Difícil con su récord, y 📅 Del día: «Ya jugado hoy: …» si `dia.fecha === fechaLocal()`;
   el ranking del día se agrega en la Tarea 5). Enganchar en `ABRIR` y en la cuenta de `app/inicio.js`.
2. `index.html`: `<section id="puzzles">` y `<section id="puzzle-juego">` (esta en `PARTIDAS`).
3. `app/sudoku.js` `jugarSudoku(nivel, { semilla, delDia })`: grilla 9×9 (cajas marcadas), teclado 1–9 + ⌫ + ✏️ notas + 💡 Pista
   (20 fichas; desactivada sin fichas o en el del día; muestra las fichas que tienes), reloj, ← Salir. Casilla elegida y las de su
   mismo número resaltadas; choques en rojo; dadas en negrita y no editables. Al resolver: guarda `mejor`/`veces`, `ligaAnotar`,
   `finDePartida()`, pantalla de fin con tiempo y récord. Partida normal a medias en `sudoku-partida` (al abrir el nivel pregunta
   «¿Seguir la partida?» si la hay); el del día: al empezar guarda `dia = { fecha, valor: null }` y al resolver `valor = segundos`.
4. Estadísticas: récords de Puzzles en la página de estadísticas, como las otras secciones.
5. `games/copia.js` / `games/sincro.js`: prefijo `puzzles:`. `sw.js`: archivos nuevos y VERSION.
6. CDP a 360 px claro y oscuro: abrir sección, elegir Fácil, escribir números, una nota, provocar un choque, usar 💡 con fichas,
   resolver (rellena desde la solución por código) y ver el fin. Mira las capturas.

- [ ] Puntos 1–5. - [ ] `node tests.js` pasa. - [ ] Capturas revisadas. - [ ] Commit «Puzzles: sección nueva y Sudoku».

### Tarea 4: Buscaminas infinito en pantalla

**Leer:** `app/sudoku.js` y `app/puzzles.js` (de la Tarea 3); `app/arcade.js` (lienzo y teclas, cómo dibuja con canvas y escucha
toques); `app/anuncios.js`.

**Hacer `app/minas.js` `jugarMinas(nivel, { semilla, delDia })`:**
- `<canvas>` que llena el ancho de `#puzzle-juego`, casillas de 36 px CSS (con `devicePixelRatio`), se dibuja solo lo visible
  (`requestAnimationFrame` al cambiar). Colores desde las variables CSS del tema (claro/oscuro). Números con los colores clásicos.
- Punteros (`pointerdown/move/up`): arrastrar > 8 px mueve la vista; toque corto abre (o bandera en modo 🚩); mantener ≥ 400 ms
  pone/quita bandera (con vibración si está activa, como los demás juegos); tocar un número hace `acorde`.
- Barra: puntaje, 💣 nivel, botón 🚩 (modo bandera), 🎯 (centra en el origen), ← Salir (pregunta y termina la partida).
- 💥 al `boom`: `<dialog>` «¡Boom!» con 📺 Seguir viendo un anuncio (solo si `hayAnuncios()` y no usado en esta partida; si
  `verAnuncioPremio()` da false, no sigue), 🪙 Seguir por `costoSeguir(e.seguidas)` fichas (desactivado con «te faltan N» si no
  alcanzan), Terminar. En el del día solo Terminar.
- Al terminar: récord `mejor` (más es mejor) y `veces`, `ligaAnotar`, `finDePartida()`, pantalla de fin. Partida normal a medias en
  `minas-partida` (se guarda tras cada jugada; «¿Seguir la partida?» al abrir el nivel). Del día: `dia = { fecha, valor: null }` al
  empezar, `valor = puntaje` al terminar (salir también termina).
- Enganchar la tarjeta 💣 de `app/puzzles.js`. `sw.js`.
- CDP a 360 px claro y oscuro: arrastrar, abrir, bandera por pulsación larga y por modo, acorde, provocar boom (busca una mina con
  `hayMina` por código), seguir por fichas, terminar. Mira las capturas.

- [ ] Hacer. - [ ] `node tests.js` pasa. - [ ] Capturas revisadas. - [ ] Commit «Puzzles: Buscaminas infinito».

### Tarea 5: 📅 Del día con ranking + reglas de Firestore

**Leer:** spec «Del día»; `firestore.rules` (liga semanal, `baneado()`, `adornoValido`); `games/nube.js` (liga, `borrarTodo`);
`app/liga.js` (`filaLiga`, `filaPublica`); cómo muestra el ranking de la liga la app (busca `topLiga`).

**Hacer:**
1. `firestore.rules`: `match /diario/{dia}/jugadores/{uid}`: read con sesión; delete el dueño o admin; **solo create** (no update) si
   es el dueño, no baneado, `keys().hasOnly(['apodo','valor','actualizado','avatar','marco','nivel'])`, `adornoValido`, apodo 2–20,
   `actualizado is int`, `dia.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}_(sudoku|minas)$')`, y `valor is int` con 60–86400 si
   `dia` termina en `_sudoku` o 0–100000 si en `_minas`.
2. `games/nube.js`: `guardarDiario(dia, uid, fila)`, `topDiario(dia, menorEsMejor, cuantos = 20)`, `puestoDiario(dia, valor,
   menorEsMejor)`; en `borrarTodo`, borrar la fila propia de cada día desde 2026-11-20 hasta hoy para los dos juegos (en lotes de
   `writeBatch` ≤ 500).
3. `app/puzzles.js`: el del día usa `semillaDelDia(fechaLocal(), juego)` y nivel `normal`. Al terminar con resultado y con cuenta y
   apodo: sube la fila (`{ apodo, valor, actualizado: Date.now(), ...filaPublica() }`); si falla, aviso y queda en
   `puzzles:<juego>.dia.pendiente = true` para reintentar al abrir la sección. En `abrirModos` y en el fin del del día: top 20 del
   día con el puesto propio (estilo de la liga), o «Entra con tu cuenta para el ranking del día».
4. Emulador de Firestore: escribir `S/fb-copia/prueba-diario.mjs` (patrón de `S/fb-copia/prueba.mjs` con
   `@firebase/rules-unit-testing`, `firestore: { host: '127.0.0.1', port: 8080, rules }`), copiar `firestore.rules` allí y correr desde
   `S/fb-copia` en Bash: `unset VSCODE_CWD; export JAVA_HOME=/c/Users/ADMIN/jdk21/jdk-21.0.13+9; PATH=$JAVA_HOME/bin:$PATH node node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --only firestore --project demo-palrato "node prueba-diario.mjs"`
   (si falta `node_modules` o `firebase.json`, crea `firebase.json` mínimo y usa los paquetes que ya estén; no instales nada global).
   Casos: crear propia OK; crear ajena ✗; update ✗; sudoku 59 ✗ / 60 OK / 86401 ✗; minas −1 ✗ / 100001 ✗; campo extra ✗;
   `dia` mal formado ✗; baneado ✗; leer con sesión OK.
5. CDP: jugar el del día de cada juego sin cuenta (queda «Ya jugado hoy», sin pistas ni continuar) y comprobar que mañana (fecha
   simulada) vuelve a estar disponible. Capturas claro/oscuro.

- [ ] Hacer. - [ ] `node tests.js` y el emulador pasan. - [ ] Capturas revisadas. - [ ] Commit «Puzzles: puzzle del día con ranking».

### Tarea 6 (controlador, después de que el usuario publique `firestore.rules`): prueba real con dos cuentas

Dos cuentas de invitado con apodo juegan el del día de cada juego; las dos se ven en el top del día con su puesto; una segunda
subida de la misma cuenta es rechazada. Limpieza: filas del día, perfiles, ranking, liga y las dos cuentas.
