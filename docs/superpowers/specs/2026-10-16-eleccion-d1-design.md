# Juego Mental — D1: nueva elección de juego y modo

Fecha: 2026-10-16

Primera de tres entregas: D1 nueva elección, D2 juegos nuevos y D3 niveles ampliados. El usuario aprobó la maqueta "B · Pantalla con cabecera de color" en el compañero visual.

## Menú

- **Agrupación:** las tarjetas se agrupan por las 5 **habilidades**, en este orden: 🧠 Memoria, ➕ Cálculo, 👁 Atención, 🧩 Lógica, ⚡ Reacción. Cada título lleva su emoji y los grupos vacíos no se dibujan.
- **Tamaño:** 3 tarjetas por fila, más compactas (icono y nombre).
- **Color:** cada tarjeta lleva el color de su habilidad, el mismo para todo el grupo.

| Habilidad | Color |
|---|---|
| Memoria | `verde` |
| Cálculo | `rojo` |
| Atención | `azul` |
| Lógica | `amarillo` |
| Reacción | `morado` |

- **Entrenamiento diario:** sigue usando los 3 grupos internos de `categoria` (Clásicos, Lógica, Reacción), así no cambian los entrenamientos pasados ni las rachas.

## Pantalla del juego (previa)

- **Cabecera:** grande, del color del juego, con el icono en grande, el nombre y las instrucciones. En Neón es un borde de color con brillo.
- **Modo:** baldosas en cuadrícula de 2 columnas, solo si el juego tiene más de un modo. Cada baldosa lleva icono, nombre y subtítulo:

| Modo | Icono | Nombre | Subtítulo |
|---|---|---|---|
| normal | ⏱ | Normal | `j.duracion` o "60 s" (Memoria: "hasta fallar"; Topos: "30 s") |
| rapido | ⚡ | Rápido | "30 s" |
| sinfallo | ❤️ | Sin fallar | "1 vida" |
| niveles | 🪜 | Niveles | "⭐ N", donde N es el nivel más alto superado |

- **Dificultad:** un interruptor de tres posiciones con caritas, "🙂 Fácil · 😐 Normal · 😈 Difícil". Se oculta en Niveles y en Rayo.
- **Récord:** debajo, "🏆 Récord X" y la gráfica con la media, como ahora.
- **En Niveles:** la cuadrícula de niveles y el objetivo.
- **Botón Jugar:** "▶ Jugar" o, en Niveles, "▶ Jugar nivel N". Debajo, Menú.
- **Accesibilidad:** cada grupo (Modo, Dificultad) tiene `role="group"` y `aria-label`, el elegido lleva `aria-pressed`, y el foco vuelve al botón elegido al repintar.

## Nombres

- El modo `sinfallo` se llama **"Sin fallar"** en las baldosas, la etiqueta final y el marcador del juego ("❤️ Sin fallar"), que antes decía "❌ Hasta fallar".
- El modo `niveles` se llama **"Niveles"**: el icono 🪜 va aparte en la baldosa.

## Organización

- **`main.js`:**
  - el menú se agrupa por `HABILIDADES`, y se cambian los colores de `JUEGOS`;
  - se añade el campo `duracion` en Memoria y Topos;
  - `ICONO_MODO`, `CARA`, `ICONO_HABILIDAD`, `subtituloModo(j, modo)`;
  - `pintarModos` dibuja las baldosas y el interruptor;
  - `pintarPrevia` dibuja la cabecera y el texto de Jugar.
- **`games/modos.js`:** `MODOS.sinfallo = 'Sin fallar'`, `MODOS.niveles = 'Niveles'`.
- **`games/opciones.js`, `games/atencion.js`:** el marcador dice "❤️ Sin fallar".
- **`index.html`:** cabecera `#previa-cabecera` con `#previa-icono`, `#previa-nombre` y `#previa-instrucciones`; la línea "🏆 Récord".
- **`styles.css`:** cabecera, `.baldosas`, `.segmento` y menú de 3 columnas. Se borran las reglas `.chips` y `.chips-titulo`, que ya no se usan.

## Pruebas

- `tests.js`: la etiqueta final sale con el nombre nuevo ("Sin fallar · Normal").
- Lo visual se prueba en Chrome con capturas en los dos temas: menú por habilidades, previa de un juego de 4 modos, de Memoria (2), de Puzzle (solo dificultad) y de Rayo (ni modo ni dificultad), y el modo Niveles.
