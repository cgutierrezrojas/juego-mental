# Juego Mental — Fase B: estadísticas y progreso

Fecha: 2026-10-09

Sobre la app con 8 juegos (fase A). Añade el historial de partidas, el entrenamiento diario con racha, una pantalla de estadísticas y el perfil por habilidad.

## Datos

- Cada partida **terminada** (no las abandonadas con ✕) se anota en `localStorage`, en `historial:<juego>`, como JSON: una lista de `{ fecha, cuando, puntos, ms }`.
  - `fecha`: día local `AAAA-MM-DD`.
  - `cuando`: marca de tiempo en ms, para ordenar partidas de juegos distintos.
  - `ms`: duración desde que empieza el juego (tras la cuenta atrás) hasta que termina.
- Se guardan las **últimas 100 partidas** de cada juego.
- Dos contadores aparte, `contador:partidas` y `contador:ms`, llevan el total de partidas y de tiempo jugado. No se pierden aunque se recorte el historial. Empiezan en 0 para quien ya tenía la app.
- Un historial corrupto se trata como vacío. Sin `localStorage` todo funciona, solo que sin guardar (como los récords).

## Historial en la previa

- Bajo el récord, una gráfica de línea (SVG hecho a mano) con las **últimas 20 puntuaciones**, del color del juego. Debajo: "Media de las últimas N: X" (N ≤ 10, con la unidad del juego).
- La línea sube cuando mejoras. En los juegos de "menor es mejor" (Puzzle, Rayo) el eje va al revés. Con una sola partida o con todas iguales, la línea queda plana a media altura.
- Sin partidas: "Aún no hay partidas".

## Entrenamiento de hoy

- Es una tarjeta arriba del menú, entre el título y los juegos. Muestra 3 juegos, uno de cada categoría (Clásicos, Lógica, Reacción), elegidos con un hash de la fecha local (FNV-1a de `"<fecha>#<n.º categoría>"`). Son los mismos todo el día y en cualquier dispositivo, y cambian con la fecha.
- Cada juego aparece con ✓ si hoy hay al menos una partida terminada de él (se deduce del historial). Si no, con ○. Tocarlo abre su previa.
- Con los 3 hechos, la tarjeta muestra "✓ ¡Entrenamiento completado!". Al terminar la partida que lo completa, la pantalla final dice "✓ ¡Entrenamiento de hoy completado!", con confeti y la melodía (los mismos que el récord, sin repetirse si coinciden).
- **Racha 🔥 N** (en la tarjeta): días seguidos con el entrenamiento completo. Cuenta desde hoy si hoy está completo y, si no, desde ayer. Así la racha no se pierde hasta que acaba el día.
- La tarjeta se vuelve a dibujar cada vez que se muestra el menú.
- Con la tarjeta, el menú ya no cabe entero en 390×780 y se desplaza un poco. Se acepta.

## Pantalla 📊

- Se abre con el botón 📊 a la izquierda de la barra, visible solo en el menú (✕ ocupa ese sitio al jugar). Lleva un botón Menú.
- **Resumen**, en recuadros: partidas jugadas, minutos jugados, racha actual 🔥, mejor racha 🔥 y entrenamientos completados.
- **Perfil por habilidad:** 5 barras de 0 a 100 con su número, o "Sin datos".

| Habilidad | Juegos | Referencia "muy bueno" (= 100) |
|---|---|---|
| Memoria | Memoria | 12 |
| Cálculo | Cálculo | 30 |
| Atención | Atención | 40 |
| Lógica | Series · ¿Cuál sobra? · Puzzle | 20 · 20 · 30 movimientos |
| Reacción | Rayo · Topos | 250 ms · 40 |

- Nivel de una partida: `min(100, puntos / referencia × 100)`; en "menor es mejor", `min(100, referencia / puntos × 100)`; 0 puntos → 0. La barra es la media redondeada del nivel de las **últimas 5 partidas** (por `cuando`) de los juegos de esa habilidad.
- **Récords:** los 8 juegos con icono y récord ("—" si no hay).
- Cada entrada de `JUEGOS` gana `habilidad` y `referencia`.

## Organización

- `games/estadisticas.js` (nuevo), solo funciones puras:
  - `anotar(historial, partida)`
  - `fechaLocal(fecha = new Date())`, `diaAnterior(fecha)`
  - `entrenoDelDia(fecha, categorias)`, donde `categorias` es una lista con los ids de cada categoría
  - `jugadosEn(fecha, historiales)`, `entrenoCompleto(fecha, categorias, historiales)`
  - `racha(hoy, categorias, historiales)`, `mejorRacha(...)`, `entrenosCompletados(...)`
  - `nivel(puntos, referencia, menorEsMejor)`, `perfil(juegos, historiales, habilidades)`
  - `puntosGrafica(valores, ancho, alto, menorEsMejor)`
- `main.js` lee y guarda (`historial:*`, `contador:*`) y dibuja la tarjeta, la gráfica y la pantalla 📊.
- `index.html`: botón 📊, `#entreno`, `#previa-historial`, `#final-entreno` y la sección `#estadisticas`.
- `sw.js`: añade `games/estadisticas.js`.

## Pruebas (en `tests.js`)

- `anotar` recorta a 100 y no modifica el original. `fechaLocal` y `diaAnterior`, incluido el cambio de mes y de año.
- `entrenoDelDia`: misma fecha → mismo resultado; un juego de cada categoría; en 30 días seguidos salen al menos 5 combinaciones distintas.
- Racha:
  - días completos seguidos;
  - hoy sin hacer → cuenta hasta ayer;
  - un hueco la corta;
  - un día con partidas pero sin el entrenamiento completo no cuenta;
  - `mejorRacha` y `entrenosCompletados`.
- `nivel`: mayor es mejor, menor es mejor, tope 100, 0 puntos.
- `perfil`: "sin datos" (null) sin partidas; media de las últimas 5 por `cuando`, mezclando juegos de la misma habilidad.
- `puntosGrafica`: la mejor puntuación queda arriba (y = 0) en los dos sentidos; una sola partida da una línea plana a media altura.

Lo visual (tarjeta, gráfica y pantalla 📊, en los dos temas) se prueba en el navegador.

## Fuera de alcance

Modos de juego, tiendas y cuentas online (fases C a E). Las referencias del perfil se ajustarán con datos reales.
