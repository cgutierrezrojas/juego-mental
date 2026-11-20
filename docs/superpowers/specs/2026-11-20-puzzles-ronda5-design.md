# Ronda 5 🧩 Puzzles: Sudoku y Buscaminas infinito — diseño

Fecha: 2026-11-20 · Rama: `puzzles5`

## Objetivo

Sección nueva «🧩 Puzzles» en el inicio con dos juegos para un jugador: **Sudoku 9×9** y **Buscaminas infinito**.
Cada uno tiene Fácil / Normal / Difícil y un **📅 Del día** (mismo puzzle para todos, un intento, ranking del día).
Las fichas (🪙, `app/premios.js`) dejan de servir solo para los juegos de apuestas: se gastan en pistas y en seguir tras una mina.

## Sección

- `SECCIONES` (app/juegos.js) gana `{ id: 'puzzles', nombre: 'Puzzles', icono: '🧩', color: …, descripcion: 'sudoku, buscaminas…' }`.
- `app/puzzles.js` sigue el patrón de `app/dados.js`: `abrirPuzzles()`, `JUEGOS_PUZZLES = 2`, enganchado en `ABRIR` y en la cuenta de juegos de `app/inicio.js`.
- Página de la sección: dos tarjetas; al elegir un juego, los cuatro modos (Fácil, Normal, Difícil, 📅 Del día) con su récord al lado.
  El del día dice «Ya jugado hoy: …» si ya se usó el intento.
- Al terminar: XP y misiones vía `ligaAnotar('partida', 1, 'puzzles')` (y victoria cuando corresponda), como los demás juegos.
- En partida se ocultan barra y esquina (`PARTIDAS` en app/ui.js); cada pantalla tiene su ← Salir.
- Archivos nuevos van a `ARCHIVOS` de `sw.js`; VERSION = la huella que pida tests.js.

## Sudoku (`games/sudoku.js` puro + `app/sudoku.js` UI)

- Generador con semilla (`games/semilla.js`): tablero completo al azar con backtracking y luego quita casillas
  en orden aleatorio mientras la solución siga siendo **única** (contador de soluciones que corta en 2).
- Pistas objetivo: Fácil 40, Normal 32, Difícil 26 (si con esa semilla no se llega, se queda con lo logrado, a lo más objetivo+4; nunca pierde la unicidad).
- Jugar: tocar casilla → tocar número del teclado 1–9 (y ⌫ borrar). Modo ✏️ notas alterna escribir candidatos.
  Las casillas dadas no se tocan.
- Choques: un número repetido en su fila, columna o caja se marca en rojo. No se revela si coincide con la solución.
- Se resuelve cuando la cuadrícula está llena y coincide con la solución. Marca = tiempo (menos es mejor).
- **💡 Pista: 20 fichas** — rellena una casilla vacía (o equivocada) con su valor correcto; desactivada si no alcanzan
  las fichas o en el del día. Usar pistas no impide el récord.
- La partida en curso se guarda (`sudoku-partida`) y se puede retomar (salvo el del día, que cuenta el intento al empezar).
- Funciones puras: `generar(semilla, nivel) → { dadas: string81, solucion: string81 }`, `soluciones(tablero, tope)`,
  `choques(tablero) → Set<índice>`, `resuelto(tablero, solucion)`.

## Buscaminas infinito (`games/minas.js` puro + `app/minas.js` UI)

- **Mapa sin bordes.** Mina en `(x, y)` = `hash(semilla, x, y) < densidad(x, y)`; nada se guarda salvo lo abierto y las banderas.
- Densidad base: Fácil 12 %, Normal 17 %, Difícil 22 %; sube +1 punto porcentual por cada 25 casillas de distancia (Chebyshev)
  desde el origen, con tope +8.
- **Inicio seguro:** el cuadro 3×3 alrededor del origen nunca tiene minas y al empezar se abre (con su expansión).
- Abrir una casilla con 0 minas vecinas expande en anchura (BFS), con un tope de 5000 casillas por toque para no colgarse.
- **Vista:** se dibuja solo la ventana visible (canvas o grilla con casillas de ~36 px); se arrastra con el dedo/ratón;
  botón 🎯 vuelve al origen. Tocar abre; mantener pulsado (≥ 400 ms) pone/quita 🚩; botón alterna modo bandera.
  Tocar un número con tantas banderas alrededor como su valor abre sus vecinas (acorde).
- **Puntaje** = casillas abiertas + 5 por cada bandera correcta (se cuentan al terminar). Récord por nivel (más es mejor).
- **💥 Mina:** aviso con
  - 📺 **Seguir viendo un anuncio** — solo en la app (`hayAnuncios()` + `verAnuncioPremio()`), una vez por partida;
  - 🪙 **Seguir por fichas** — 50, luego 100, 200… (se duplica por cada continuación de la partida); desactivado si no alcanzan,
    mostrando cuánto falta;
  - **Terminar** — se anota el puntaje.
  Al seguir, la mina queda marcada como bandera correcta (no suma el bonus) y se sigue jugando.
- La partida en curso se guarda (`minas-partida`: semilla, nivel, abiertas, banderas, continuaciones) y se retoma.
- Funciones puras: `hayMina(semilla, nivel, x, y)`, `vecinas(…)`, `abrir(e, x, y) → e'` (con expansión y detección de mina),
  `bandera(e, x, y)`, `acorde(e, x, y)`, `puntaje(e)`, `costoSeguir(n) = 50 * 2**n`.

## 📅 Del día

- Semilla = hash de la fecha local (`fechaLocal()`), igual para todos; nivel Normal.
- Un intento por día y juego: se apunta `puzzles:dia:<juego>` = `{ fecha, resultado }` al empezar. Salir cuenta como
  terminado (Sudoku sin resolver = sin marca; Buscaminas = puntaje hasta ese momento).
- Sin pistas ni continuaciones.
- **Ranking del día** en Firestore: `diario/{fecha}_{juego}/jugadores/{uid}` = `{ apodo, valor, actualizado, avatar, marco, nivel }`,
  mismo patrón que la liga semanal (cada uno escribe solo su fila, no baneados, `adornoValido`). Reglas:
  - Sudoku: `valor` = segundos, int, 60 ≤ valor ≤ 86400.
  - Buscaminas: `valor` = puntaje, int, 0 ≤ valor ≤ 100000.
  - La fila solo se crea (no se actualiza): un intento.
  Solo se sube con cuenta y apodo; se muestra el top 20 y el puesto propio. La limpieza de días viejos queda para
  `borrarTodo` (la fila propia) — no se borran días ajenos.
- El usuario publica `firestore.rules`.

## Pruebas (tests.js)

- Sudoku: misma semilla ⇒ mismo puzzle; `soluciones(dadas, 2) === 1` en los tres niveles; la solución cumple las reglas;
  `choques` detecta fila/columna/caja; nº de pistas dentro del rango; generar un Difícil tarda < 1,5 s.
- Minas: `hayMina` determinista; 3×3 del origen sin minas; la expansión abre exactamente la región de ceros y su borde
  (comparado con una búsqueda de referencia en un tablero pequeño); acorde; tocar mina deja el estado en «boom»;
  `costoSeguir` 50/100/200; puntaje con bandera correcta/incorrecta.
- Del día: misma fecha ⇒ misma semilla; el intento se consume al empezar.
- Reglas de Firestore: prueba en el emulador (scratchpad `fb-copia`) de crear/actualizar/valores fuera de rango.
- Prueba real con dos cuentas del ranking del día; capturas claro/oscuro de ambos juegos.

## Fuera de alcance

Multijugador o retos a amigos con estos juegos; más puzzles (nonogramas, etc.); validación de récords en servidor.
