# S6a: 🔤 Palabras — diseño

La sección 🔤 Palabras va en dos partes: **S6a** 📅 Palabra del día, 🪢 Ahorcado y 🔍 Sopa de letras (con todo lo común de la sección) y **S6b** 🎭 Charadas, 🪜 Escalera de palabras (en Palabras) y 💰 La gran escalera (en ❓ Trivia). Este documento es S6a.

## Palabras

- Mayúsculas, **sin tildes y con Ñ**: se escribe CAMION y al final se muestra «CAMIÓN».
- `games/diccionario.js` (lista propia, sin descargas):
  - `TEMAS`: { id, nombre, icono, palabras } con animales, comida, casa, naturaleza, cuerpo, oficios, lugares y deportes; cada palabra es `'CAMION'` o `'CAMION:CAMIÓN'` cuando lleva tilde. Al menos 40 palabras por tema, de 4 a 12 letras.
  - `SOLUCIONES`: unas 365 palabras comunes de 5 letras (las de la Palabra del día).
  - `VALIDAS`: unas 2000 palabras de 5 letras (incluye `SOLUCIONES`) para aceptar un intento.
  - `mostrar(palabra)`: la forma con tilde.

## 📅 Palabra del día

- Palabra de 5 letras en 6 intentos. Cada letra: 🟩 en su lugar, 🟨 está en otra posición, ⬛ no está (con letras repetidas, cada 🟨 cuenta solo las que faltan por marcar).
- Teclado en pantalla de tres filas con Ñ, ⌫ y «Enviar»; también el teclado físico. Las teclas toman el mejor color que ya tuvo su letra.
- Si el intento no está en `VALIDAS`: «No está en la lista», sin gastar intento.
- La misma para todos: el número del día es días desde el 2026-11-05 en hora local; la palabra es `SOLUCIONES` barajada con semilla fija en esa posición (vuelve a empezar al acabarse).
- Una partida al día; si sales a mitad, sigue donde ibas. Al terminar: la palabra, tu racha, la mejor racha y cuántas veces acertaste en 1, 2… 6 intentos; «📤 Compartir» manda `Pa'l Rato 🔤 #<n> <k>/6` (o `X/6`) y los cuadritos, sin la palabra.
- Datos: `palabra:hoy` = { n, intentos, fin }, `palabra:stats` = { racha, mejor, ultimo (n del último día acertado), dist: [6] }. La racha se corta si fallas o te saltas un día. `record:palabra` = mejor racha → ranking.
- Sin retos (ya es la misma para todos). Liga: +1 al terminar.

## 🪢 Ahorcado

- Se ve el tema (pista) y la palabra en casillas. Teclado en pantalla con Ñ (y el físico); cada letra usada se marca acierto o fallo.
- 6 fallos: el dibujo (SVG) se va completando por partes; al sexto, pierdes y se muestra la palabra.
- Niveles: Fácil 4–6 letras, Normal 6–8, Difícil 8 o más.
- Partida = palabras seguidas (temas al azar) hasta perder una. Cada palabra acertada: 10 puntos + los fallos que te sobraron. `record:ahorcado` → ranking.

## 🔍 Sopa de letras

- 8 palabras de un tema escondidas en la cuadrícula; se marca una arrastrando el dedo (o el ratón) en línea recta de la primera a la última letra. 3 minutos.
- Niveles: Fácil 8×8 (horizontal y vertical), Normal 10×10 (más diagonales), Difícil 12×12 (más al revés). Palabras que quepan en el lado.
- La lista de palabras se ve abajo y se tachan al encontrarlas; las encontradas quedan resaltadas en la cuadrícula. Las casillas vacías se llenan con letras al azar.
- Puntos: 100 por palabra; si encuentras las 8, +5 por segundo que sobró. `record:sopa` → ranking.

## Retos a un amigo

- Ahorcado y Sopa usan `games/semilla.js`: con la misma semilla y el mismo nivel salen las mismas palabras / la misma sopa.
- Al terminar, «⚔️ Retar a un amigo» crea un duelo de un juego como en el Arcade (`juegos: [id]`, `victoria: 'puntos'`, `semilla`, `dificultad` = el nivel jugado). El amigo lo juega desde ⚔️ Duelos en ese nivel; gana quien hace más puntos; 48 horas.
- La elección de amigo y la creación del reto salen de `app/arcade.js` a **`app/retos.js`** (`elegirAmigo(caja, { id, semilla, dificultad, puntos })`), que usan el Arcade y Palabras.

## Común

- Página `#palabras` desde el inicio con una tarjeta por juego y los récords; pantalla `#palabras-juego` (marcador, tablero, aviso, botones). Antes de jugar: cómo se juega, nivel (Ahorcado y Sopa) y «▶ Jugar».
- Al terminar: puntos, récord (🏆 si es nuevo), «🔄 Otra vez», «⚔️ Retar a un amigo» (no en la del día) y «Volver».
- `JUEGOS_PALABRAS` en app/juegos.js (dentro de `INFO_JUEGOS`, `seccion: 'palabras'`), récords en `LIMITES` (games/sincro.js) y en `firestore.rules` (`palabra` 1–10000, `ahorcado` 1–100000, `sopa` 1–100000): **el usuario debe publicar las reglas**. Prefijo `palabra:` en las copias de seguridad.
- Colores con las variables del tema (claro y oscuro); funciona a 390 px.

## Código

- `games/diccionario.js` (listas), `games/palabra.js` (número del día, palabra, `pista(intento, solucion)` → colores, estadísticas), `games/ahorcado.js` (`nueva(semilla, nivel)`, `probar(e, letra)`), `games/sopa.js` (`nueva(semilla, nivel)` → cuadrícula y posiciones, `marcar(e, desde, hasta)`): todo puro.
- `app/palabras.js`: página, pantallas, teclado, dibujo y fin. `app/retos.js`: retos comunes.
- Pruebas en `tests.js`: colores con letras repetidas, palabra del día estable por fecha, racha (sigue, se corta), ahorcado (acierto, fallo, letra repetida, puntos), sopa (todas las palabras caben y se leen en su posición; misma semilla = misma sopa; marcar al revés y en diagonal), listas sin tildes y sin duplicados. Chrome en claro y oscuro a 390 px y un reto con dos cuentas.
