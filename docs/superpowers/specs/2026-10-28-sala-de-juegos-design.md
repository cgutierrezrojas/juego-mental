# Pa'l Rato — S1: sala de juegos

Fecha: 2026-10-28

La app deja de ser solo de juegos mentales y pasa a ser una **sala de juegos** para pasar el rato, sola o con amigos. Este documento es la primera parte. Le siguen, por orden: S2 🎲 Mesa (Gato y Conecta 4, solo y con amigos), S3 ❓ Trivia, S4 🃏 Cartas, S5 🏎️ Arcade y S6 🔤 Palabras y fiesta.

El usuario eligió en el compañero visual la opción A (inicio con secciones grandes) con la barra inferior de la opción C. También eligió el nombre **Pa'l Rato**.

## Nombre

- **Pa'l Rato** es el título de la app, el nombre del manifiesto (name y short_name), el `<title>` y el encabezado del inicio.
- Lo interno no cambia: el paquete de Android, la dirección web, las claves guardadas y el proyecto de Firebase siguen igual. El progreso y las cuentas no se tocan.
- La política de privacidad y los textos para compartir dicen "Pa'l Rato".
- El icono no cambia por ahora.

## Inicio (`#inicio`, pantalla de entrada)

- **Arriba, la fila de hoy** (botones pequeños):
  - ☀️ Tu día (hechos/3), que abre la tarjeta "Tu día" completa en Mentales;
  - 🏅 Liga (puntos), que abre la liga;
  - 📅 Retos (pendientes), solo si hay alguno.
- **Debajo, una baldosa grande por sección**, cada una con icono, nombre y subtítulo (por ejemplo "16 juegos"):
  - 🧠 Mentales;
  - 🎲 Mesa, ❓ Trivia, 🃏 Cartas, 🏎️ Arcade y 🔤 Palabras.
  - Las secciones sin juegos se ven apagadas, con "Próximamente", y al tocarlas aparece un aviso breve.
- El aviso de ayuda de la primera vez explica las secciones y la barra inferior.

## Página de sección (`#seccion`)

- **Cabecera:** el icono y el nombre de la sección, y una flecha ← para volver al inicio.
- **🧠 Mentales:** contiene lo que hoy es el menú. Arriba van Tu día, la liga y los retos de hoy; debajo, los 16 juegos agrupados por habilidad, con su progreso y avisos.
- **Secciones futuras:** cada una pinta sus juegos en una cuadrícula, agrupados como necesite.

## Barra inferior (`#barra`)

- **Botones fijos:** 🏠 Inicio · ⚔️ Duelos · 👥 Amigos · 🏆 Ranking · 👤 Tú.
- **Cuándo se ve:** en todas las pantallas salvo durante una partida y en su cuenta atrás.
- **Avisos sobre los iconos:**
  - ⚔️: duelos en tu turno e invitaciones;
  - 👥: solicitudes y mensajes sin leer.
- **El botón de la pantalla actual se resalta.**
  - Cuenta como Inicio: el inicio y las páginas de sección.
  - Cuenta como Duelos: la bandeja, crear un duelo, un duelo y el duelo en vivo.
  - Cuenta como Amigos: Amigos y el chat.
- **Sin sesión:** Duelos, Amigos y Ranking llevan a "Tú › ☁️ Nube" con el aviso de entrar, igual que ahora.
- **👤 Tú** es la pantalla 📊 actual (resumen, logros, perfil, récords, nube y copia), renombrada "👤 Tú".

## Arriba

- Quedan ❓ 🔊 📳 🌙.
- Desaparecen 📊 y 🏆, porque pasan a la barra.
- El ✕ de la partida sigue como ahora.

## Juegos y secciones (código)

- **Secciones:** `app/juegos.js` define `SECCIONES`, una lista con `{ id, nombre, icono, color, descripcion }`.
- **Juegos:** cada juego de `JUEGOS` tiene `seccion`; los 16 actuales son `'mentales'`. Una sección sin juegos se muestra como "Próximamente".
- **Funcionalidades comunes:** retos de hoy, liga, logros, duelos y ranking siguen funcionando igual, porque usan `JUEGOS`.
- **Botón "Menú":** los botones "Menú" de las pantallas pasan a llevar al inicio, y la pantalla `#menu` actual pasa a ser la página de Mentales.

## Pruebas

- **`tests.js`:** todos los juegos tienen una sección válida, y cada sección tiene nombre e icono.
- **Chrome (390 px, temas claro y oscuro):**
  - el inicio muestra las 6 secciones, con 5 "Próximamente";
  - Mentales abre los 16 juegos;
  - la barra navega a las 5 pantallas y se oculta en la partida;
  - los avisos de Duelos y Amigos aparecen;
  - Tu día y la liga se abren desde la fila de hoy.
- **Regresión:** las pruebas de las fases anteriores (niveles, final, duelos, amigos, liga…) siguen pasando con la navegación nueva.
