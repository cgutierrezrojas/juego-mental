# Juego Mental — Pulido v2

Fecha: 2026-10-07

Parte de la v1 (`2026-10-07-juego-mental-design.md`), ya construida. Esta ronda mejora el aspecto, la sensación de juego y el sonido, y cierra los arreglos pendientes. Publicar la app queda para después.

## Temas

Hay dos temas. Cada uno es un conjunto de variables CSS que se activa con `data-tema="claro"` o `data-tema="oscuro"` en `<html>`.

- **Colorido (claro):** fondo crema cálido, botones macizos de colores con "relieve" (sombra inferior sólida) y título en naranja.
- **Neón (oscuro):** fondo azul noche. Los botones son transparentes, con borde y texto del color de cada juego y un resplandor (`box-shadow`). El título es cian con brillo.

Colores:

| Variable | Colorido | Neón |
|---|---|---|
| `--fondo` | `#fff7ec` | `#0b0f2a` |
| `--texto` | `#2b2b2b` | `#e8ecff` |
| `--superficie` (botones neutros) | `#ffffff` | `transparent` con borde `--texto` |
| `--acento` (título) | `#e8552a` | `#7df9ff` |
| `--rojo` | `#e63946` | `#ff4f6d` |
| `--azul` | `#1f6feb` | `#7df9ff` |
| `--verde` | `#2b9348` | `#5dff9b` |
| `--amarillo` | `#b8860b` | `#ffe66d` |
| `--ok` | `#2b9348` | `#5dff9b` |
| `--mal` | `#e63946` | `#ff4f6d` |

En Colorido, los colores de juego tienen un contraste de al menos 3:1 con el fondo, así que la palabra de Stroop se lee con cualquier tinta. Por eso se quita el fondo oscuro fijo que se añadió a la palabra de Stroop en la v1.

- **Menú:** cada juego tiene su color (Cálculo `rojo`, Atención `azul`, Memoria `verde`). La entrada de `JUEGOS` en `main.js` gana un campo `color` con el nombre de la variable.
- **Simon:** en Colorido, los botones están rellenos, apagados al 40 % de opacidad y encendidos al 100 %. En Neón, apagados solo tienen el borde de color; encendidos se rellenan y brillan.
- **Primer tema:** si hay `ajuste:tema` guardado en `localStorage`, se usa ese. Si no, se sigue `prefers-color-scheme`. Un `<script>` pequeño en el `<head>` aplica el tema antes de pintar, para que no se vea un parpadeo del tema equivocado.
- **Botón ☀️/🌙:** en la esquina superior del menú. Cambia de tema y lo guarda.

## Sensación

- **Cuenta atrás:** al pulsar Jugar o Repetir aparecen "3", "2", "1" grandes en la pantalla de juego, uno por segundo, con un "tic" en cada uno. Después empieza el juego. La hace `main.js` antes de llamar a `start`.
- **Transiciones:** cada pantalla entra con un fundido y un deslizamiento corto hacia arriba (0,25 s, solo CSS).
- **Nuevo récord:** cae confeti con los colores del tema durante unos 2 s sobre la pantalla final, y suena una melodía corta. Las piezas son unos 40 elementos que crea `main.js`, que se animan con CSS y se borran al terminar.
- **Aviso de tiempo:** en Cálculo y Atención, el reloj se pone del color `--mal` y late en los últimos 10 segundos.

## Sonido y vibración

- **Botones:** en la esquina del menú, junto a ☀️/🌙, hay un botón 🔊/🔇 (sonido) y otro 📳 (vibración). Los dos empiezan encendidos y se guardan en `ajuste:sonido` y `ajuste:vibracion` (`"1"` u `"0"`).
- **Sin vibración:** si el navegador no tiene `navigator.vibrate` (Safari en iPhone), el botón 📳 no se muestra.
- **Sonidos:** se generan con la Web Audio API, sin archivos.
  - Acierto: pitido agudo y corto.
  - Fallo: pitido grave.
  - Cuenta atrás: tic.
  - Récord: melodía corta de 3-4 notas ascendentes.
  - Simon: cada color tiene su nota, la misma al iluminarse y al tocarlo. Rojo 329.63 Hz, azul 277.18 Hz, verde 440 Hz, amarillo 164.81 Hz.
- **Vibración:** un toque corto (30 ms) al acertar y uno doble (`[60, 40, 60]`) al fallar.
- **Fallos:** si la Web Audio API o `localStorage` no están disponibles o fallan, el juego sigue sin sonido o sin guardar el ajuste.

## Arreglos

- **Salir a mitad de partida:** durante la cuenta atrás y el juego hay un botón ✕ arriba que vuelve al menú sin guardar la puntuación. Para que funcione, `start(pantalla, alTerminar)` devuelve una función `parar()`. Al llamarla se detienen los relojes, las secuencias y los temporizadores pendientes, y `alTerminar` ya no se llamará. `temporizador()` gana un `parar()`.
- **Destello visible siempre:** la respuesta visual pasa a ser un anillo verde (`--ok`) o rojo (`--mal`) alrededor del elemento, animado con `box-shadow` (0,3 s), en lugar de cambiar el fondo. Se ve sobre cualquier color y en los dos temas.
- **Cálculo sin pistas:** si se ordenan las 4 opciones, la correcta ocupa cualquiera de las 4 posiciones con la misma probabilidad. La excepción es cuando no hay suficientes números no negativos por debajo; ahí se desplaza hacia abajo lo justo. Se mantienen las reglas de la v1: distractores cercanos (±5 como mucho), distintos entre sí y no negativos.

## Estructura

```
index.html          + script de tema en <head>, botones de esquina, botón ✕
styles.css          temas, transiciones, anillo, confeti, cuenta atrás, aviso de tiempo
main.js             tema, ajustes de la esquina, cuenta atrás, salir, confeti
games/efectos.js    NUEVO: destello() (anillo + sonido + vibración), sonidos, vibración y ajustes 🔊/📳
games/comun.js      leer()/guardar() de localStorage, pintarReloj(), temporizador() con parar();
                    destello() se muda a efectos.js (así efectos.js puede usar leer/guardar sin que
                    los dos archivos se importen mutuamente)
games/calculo.js    nuevo reparto de opciones; devuelve parar; aviso de tiempo
games/atencion.js   devuelve parar; aviso de tiempo; sin fondo fijo en la palabra
games/memoria.js    devuelve parar; notas por color
sw.js               añade games/efectos.js a la lista
```

`games/efectos.js` no toca `document`, `localStorage` ni `AudioContext` al cargarse; lo hace la primera vez que hacen falta. Así `node tests.js` sigue funcionando.

## Pruebas

En `tests.js`:
- **Posición de la correcta en Cálculo:** con un resultado de 50, la correcta ocupa cada posición (ordenadas de menor a mayor) entre un 20 % y un 30 % de las veces. Siguen cumpliéndose las reglas de la v1 con resultados de 0 a 144.
- **Ajustes:** sin nada guardado, sonido y vibración empiezan encendidos.

A mano, en el PC y en el móvil:
- Los dos temas: el primero sigue al sistema, el botón cambia y se recuerda, no hay parpadeo al cargar, y la palabra de Stroop se lee con las 4 tintas en ambos.
- La cuenta atrás, las transiciones, el confeti al batir el récord y el aviso de los últimos 10 s.
- Los sonidos de acierto, fallo, tic, récord y las notas de Simon. 🔇 silencia todo.
- La vibración en Android. El botón 📳 no aparece en iPhone.
- ✕ en la cuenta atrás y en cada juego: vuelve al menú, no suena nada después, no aparece la pantalla final y no se guarda récord.

## Fuera de alcance

- Publicar la app (GitHub Pages, Capacitor).
- Nuevos minijuegos, modos, estadísticas.
- Iconos PNG (solo si el móvil no ofrece instalar al publicarla).
