# Juego Mental — F4: ayuda de la primera vez

Fecha: 2026-10-21

Última mejora de la ronda F. El usuario eligió la opción B, un aviso discreto, con un toque de la A: el aviso señala con una flecha la parte que explica y esa parte se resalta. También aprobó este diseño.

## Avisos

La primera vez que se ve cada sitio, aparece una tarjeta justo encima de lo que explica:

- **Tarjeta:** una o dos frases, una flecha hacia abajo y una ✕ para cerrar.
- **Resaltado:** la parte explicada lleva un contorno de color de acento que parpadea suavemente.
- **Al cerrar con ✕:** se guarda `ayuda:<sitio>` = `1` y el aviso no vuelve a salir.

| Sitio | Señala | Texto |
|---|---|---|
| `menu` | `#entreno` | 👋 ¡Bienvenido! Empieza por ☀️ Tu día: 3 juegos para entrenar cada día y mantener tu racha 🔥. Toca cualquier juego para ver sus modos. |
| `modos` (previa, modos sin Niveles) | `#previa-modos` | Elige un modo y una dificultad. 🪜 Niveles es un camino sin fin con estrellas y 3 retos nuevos cada día. |
| `niveles` (previa en Niveles) | `.camino` | 🧑 marca tu nivel. Toca un nivel para ver su objetivo, o juega el siguiente con el botón grande. |
| `final` | `#final-barra` (si se ve) | La barra muestra cuánto te faltó: las ⭐ en Niveles, y tu media 📊 y tu récord 🏆 en los demás modos. |

- **Un aviso cada vez:** al cambiar de pantalla o repintar la previa, se quitan el aviso y el resaltado anteriores.
- **Sin destino visible:** si lo que hay que señalar no está o está oculto, no se muestra nada. El aviso del final espera a la primera partida que tenga barra.
- **Accesibilidad:** el aviso tiene `role="note"` y la ✕ lleva `aria-label="Cerrar la ayuda"`.
- **Movimiento reducido:** con `prefers-reduced-motion` no hay parpadeo ni animación de entrada.

## Botón ❓

- **Dónde:** en `#esquina`, delante de 🔊, con `aria-label="Ver la ayuda otra vez"`. Se oculta durante la partida.
- **Qué hace:** borra las marcas `ayuda:*` y muestra el aviso de la pantalla actual. En la previa lo consigue repintándola.

## Organización

- **`index.html`:** el botón `#btn-ayuda`.
- **`main.js`:**
  - `AYUDAS` (sitio → `{ objetivo, texto }`) y `mostrarAyuda(sitio)`;
  - `mostrar(id)` llama a `mostrarAyuda` con `menu` o `final` (y nada en el resto), salvo en la previa;
  - `pintarPrevia` llama a `mostrarAyuda` con `niveles` o `modos`.
- **`styles.css`:** `.ayuda`, su flecha, `.resaltado` y el movimiento reducido.

## Pruebas

En Chrome, con los temas claro y oscuro y a 390 px:

- en el primer arranque sale el aviso del menú y Tu día queda resaltado;
- al cerrarlo y recargar, no vuelve;
- al abrir un juego sale el aviso de modos;
- al pasar a Niveles sale el del camino;
- ❓ vuelve a mostrar el aviso de la pantalla actual.
