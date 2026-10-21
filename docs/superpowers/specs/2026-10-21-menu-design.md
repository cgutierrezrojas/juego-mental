# Juego Mental — F3: menú principal

Fecha: 2026-10-21

Es la tercera mejora de la ronda F. El usuario eligió la opción A en el compañero visual: "Tu día" arriba y tarjetas con progreso. También aprobó este diseño.

## Tarjeta "☀️ Tu día"

Sustituye a "Entrenamiento de hoy" y usa los mismos datos:

- **Cabecera:** "☀️ Tu día" y la racha 🔥.
- **Los 3 juegos del día:**
  - los hechos van en verde, con ✓;
  - el siguiente lleva ▶ y un borde de color de acento;
  - el resto aparece sin marca.
- **Barra de avance:** muestra cuántos llevas de los 3. Tiene `role="img"` y la etiqueta "N de 3 hechos".
- **Al completarlo:** aparece "✓ ¡Entrenamiento completado!", igual que ahora.

## 📅 Retos de hoy pendientes

- **Qué es:** una fila de botones del tipo "➕ Cálculo 1/3", bajo un título.
- **Qué juegos salen:** solo los que ya juegas en Niveles, es decir, los que suman alguna ⭐ entre niveles y diarios. Además, deben tener hoy algún reto sin superar.
- **Al tocar uno:** se abre ese juego en modo Niveles (se guarda como su modo elegido) y el camino se coloca en tu nivel.
- **Sin pendientes:** la sección no aparece.

## Tarjetas de los juegos

- **Línea de progreso:** debajo del nombre aparece "🪜 23 · 🏆 12".
  - 🪜 es tu siguiente nivel; solo sale si juegas en Niveles.
  - 🏆 es tu récord en Normal + Normal; solo sale si existe.
- **Aviso morado "📅 N":** se coloca en la esquina y muestra los retos de hoy que te faltan. Sigue la misma regla que la fila de retos pendientes.
  - Sustituye al 📅 que antes salía en todas las tarjetas.
- **Lector de pantalla:** la tarjeta tiene `aria-label`, por ejemplo "Cálculo, nivel 52, récord 30, 2 retos de hoy pendientes".
- **Cuándo se actualiza:** todo se repinta al volver al menú (`mostrar('menu')`) y al arrancar.

## Organización

- **`index.html`:** se añade `<div id="retos-pendientes">` tras `#entreno`.
- **`main.js`:**
  - `pintarEntreno` cambia;
  - `pintarProgreso` sustituye a `pintarAvisosDiarios`;
  - se añaden `retosPendientes(j)` y `abrirEnNiveles(j)`;
  - cada tarjeta lleva ahora `.progreso` y `.aviso-retos`.
- **`styles.css`:**
  - "Tu día" (hechos en verde, el siguiente y la barra);
  - la fila de retos;
  - la línea de progreso y el aviso;
  - se quita `.diario-pendiente`.

## Pruebas

Se prueban en Chrome, a 390 px y en los dos temas:

- **Sin progreso:** no hay fila de retos ni avisos, y las tarjetas no muestran línea de progreso.
- **Con estrellas en Mayor y un récord en Cálculo:**
  - aparece el reto "⚖️ Mayor o menor 0/3" y Mayor lleva el aviso "📅 3";
  - Cálculo muestra "🏆 N".
- **Al tocar el reto:** se abre Mayor en Niveles.
- **"Tu día":** marca ▶ en el primer juego sin hacer y la barra avanza.
