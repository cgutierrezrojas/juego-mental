# Juego Mental — Niveles infinitos y niveles diarios

Fecha: 2026-10-21

Sobre D3 (50 niveles con estrellas y retos). El usuario no quiere quedarse sin niveles. Pidió las dos cosas: **mundos infinitos** y **niveles diarios**. Aprobó el diseño en la conversación.

## Mundos infinitos

- **Sin final:** después del mundo 5 vienen el 6, el 7… sin fin, con 10 niveles por mundo y jefe en el 10.º. Siguen las mismas reglas de estrellas y retos.
- **Techo:** la dificultad base crece hasta el nivel 50 como en D3. A partir de ahí se queda en el valor del nivel 50 (`base(id, min(n, 50))`).
- **Subida suave:** cada 5 mundos a partir del 6, la meta sube un poco, como mucho 5 veces. Va de `+1` en los mundos 6–10 a `+5` desde el 26. En los de "menos es mejor", baja un 2 % por paso.
- **Variantes:** a partir del mundo 6, cada mundo trae una, en rotación (6 Maratón, 7 Relámpago, 8 Precisión, 9 Maratón…). Solo se aplican en los juegos con reloj; en Memoria, Puzzle, Rayo y Parejas no cambiarían nada y no se muestran.

| Variante | Efecto |
|---|---|
| 🏃 Maratón | tiempo × 1,5 y meta × 1,4 |
| ⚡ Relámpago | tiempo × 0,75 y meta × 0,75 |
| ❤️ Precisión | los niveles impares (salvo el jefe) son ❤️ Sin fallar |

- **Experto, descartado.** Era una cuarta variante (dificultad Difícil). Pasado el nivel 50 los juegos ya están en su dificultad máxima, así que no cambiaría nada.
- **Las estrellas se guardan para cualquier número de niveles** (`estrellas:<id>`, una lista sin límite de 50).
- **Siguiente nivel:** `siguienteNivel` da el primero sin estrellas, aunque sea el 51 o el 300.
- **Pantalla:**
  - un selector **◀ Mundo N · 🏃 Maratón ▶** sustituye a los botones de mundo 1–5;
  - ◀ se desactiva en el mundo 1 y ▶ en el mundo más alto desbloqueado;
  - el total es "⭐ N", sin máximo, e incluye las estrellas de los diarios.
- **Final:** "Siguiente nivel" ya no se para en el 50.

## Niveles diarios

- **Cuándo y cuáles:** la primera vez que se abren los Niveles de un juego en un día se generan **3 niveles**: tu siguiente nivel − 2, el siguiente y + 2. El mínimo es 1, 3, 5. Son configuraciones normales de `configNivel`, con su reto y su variante. Se mantienen todo el día.
- **Guardado:** en `diarios:<id>`, como JSON `{ "AAAA-MM-DD": { niveles: [n, n, n], estrellas: [e, e, e] } }`, con solo los últimos 60 días.
- **Estrellas:** cada diario guarda su mejor marca de 1 a 3. **No** desbloquean mundos, pero suman al total.
- **Racha diaria por juego (📅🔥 N):** días seguidos con los 3 diarios superados (al menos ⭐ en cada uno). Si hoy aún no, cuenta desde ayer.
- **Pantalla:**
  - una pestaña **📅 Hoy x/3** en la fila del selector de mundo;
  - en esa pestaña, los 3 diarios con su número de nivel, el icono del reto y sus estrellas, y la racha;
  - objetivo "📅 Diario 2/3 · Nivel 17 · ⏱ Normal" y botón "▶ Jugar diario 2".
- **Final:**
  - "📅 Diario 2/3 · <reto>" con las estrellas;
  - el botón pasa a **Siguiente diario** (el primero aún sin ⭐) o **Reintentar**;
  - hay confeti si se consigue alguna ⭐.
- **Avisos:**
  - en el menú, las tarjetas de los juegos con diarios de hoy sin terminar llevan un 📅 en la esquina;
  - la baldosa Niveles pone "⭐ N · 📅 x/3".

## Organización

- **`games/niveles.js`:**
  - `NIVELES_POR_MUNDO`, `mundoDe`, `VARIANTES`, `NOMBRE_VARIANTE`, `varianteDe(id, mundo)`;
  - `configNivel` para cualquier `n`, que además devuelve `variante` y `mundo`;
  - `siguienteNivel` sin límite;
  - `nivelesDelDia`, `diarioCompleto`, `rachaDiaria`, `podarDiarios` y `estrellasDiarias`.
- **`main.js`:**
  - estrellas sin límite, selector de mundo, pestaña Hoy y diarios;
  - `nivelJugado()`, el final del diario y los avisos 📅.
- **`styles.css`:** el selector de mundo y el aviso 📅 de las tarjetas.

## Pruebas (en `tests.js`)

- **Variantes:** `varianteDe` en los mundos 5–9, y `null` en los juegos sin reloj.
- **`configNivel` en niveles altos:**
  - Cálculo 51 (Maratón), 61 (Relámpago), 63 (Relámpago + Contrarreloj), 71 y 72 (Precisión), 301 (subida máxima);
  - Rayo 60 y Memoria 55.
- **12 juegos × 400 niveles:** las 3 metas ordenadas, distintas y positivas, y en Parejas ⭐⭐⭐ ≥ parejas.
- **`siguienteNivel`** pasa del 50.
- **Diarios:** `nivelesDelDia`, `diarioCompleto`, `rachaDiaria`, `podarDiarios` y `estrellasDiarias`.
