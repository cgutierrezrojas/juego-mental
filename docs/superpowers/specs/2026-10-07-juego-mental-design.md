# Juego Mental — Diseño v1

Fecha: 2026-10-07

## Objetivo

App de minijuegos de habilidad mental, pensada primero para móvil, que también funciona en web y PC. Uso personal por ahora, con la posibilidad de publicarla en tiendas más adelante. El proyecto también sirve para aprender, así que el código debe ser simple y legible.

## Tecnología

- App web (PWA) con HTML + CSS + JavaScript (módulos ES), sin frameworks ni herramientas de compilación.
- Récords guardados en el dispositivo con `localStorage`.
- Para probar en desarrollo, un servidor local estático.
- Más adelante, publicación en tiendas envolviendo la app con Capacitor.

## Estructura

```
juego-mental/
├── index.html        una sola página; las "pantallas" son secciones que se muestran u ocultan
├── styles.css
├── main.js           menú, navegación, récords
├── games/
│   ├── memoria.js
│   ├── calculo.js
│   └── atencion.js
├── tests.html        pruebas de la lógica pura en el navegador
├── manifest.json     instalable
└── sw.js             funcionamiento sin conexión (se añade al final)
```

Cada minijuego exporta `start(pantalla, alTerminar)`:
- `pantalla`: el elemento HTML donde el juego se dibuja.
- `alTerminar(puntuacion)`: el juego la llama al acabar la partida.

El menú no conoce cómo funciona cada juego por dentro. Para añadir un juego hay que crear un archivo en `games/` y añadir una entrada en la lista de juegos de `main.js`.

La lógica pura (generar operaciones, comprobar respuestas, calcular puntos) va en funciones exportadas separadas del DOM, para poder probarla en `tests.html`.

## Minijuegos

### Memoria (Simon): modo "hasta que falles"
- 4 botones de colores en cuadrícula de 2×2.
- La secuencia empieza con 1 color y en cada ronda superada se añade 1 color aleatorio.
- Fase "mira" (se ilumina la secuencia, no se puede tocar) y fase "repite".
- Un error termina la partida.
- Puntuación = longitud de la secuencia más larga repetida correctamente.
- La velocidad de reproducción aumenta un poco a partir de la ronda 5.

### Cálculo: 60 segundos
- Se muestra una operación y 4 respuestas para tocar, una de ellas correcta.
- Las respuestas incorrectas son cercanas a la correcta, distintas entre sí y no negativas.
- La dificultad depende de los aciertos de la partida:
  - 0–4: sumas con números de 1 a 10.
  - 5–9: sumas y restas hasta 20, con resultado ≥ 0.
  - 10–14: añade multiplicaciones de 2 a 9 × 2 a 9.
  - 15 o más: sumas y restas hasta 100 y multiplicaciones hasta 12×12.
- Un error resta 3 segundos. La partida no termina.
- Puntuación = número de aciertos.

### Atención (Stroop): 60 segundos
- Colores: ROJO, AZUL, VERDE, AMARILLO.
- Se muestra una palabra de color escrita con una tinta de color. Hay que tocar el botón del color de la **tinta**.
- La palabra y la tinta coinciden con una probabilidad de 1/4.
- Puntuación = aciertos − errores, con mínimo 0.

### Común
- Pantalla previa con las instrucciones (una línea), el récord y el botón Jugar.
- Respuesta visual inmediata: verde si aciertas, rojo si fallas, con una animación corta.
- Pantalla final con la puntuación, "¡Nuevo récord!" si corresponde, y los botones Repetir y Menú.
- El récord de cada juego se guarda en `localStorage` con la clave `record:<juego>`. Si `localStorage` falla (por ejemplo, en modo privado), el juego funciona igual, solo que sin guardar el récord.

## Aspecto

- Diseñado primero para el móvil en vertical, con botones grandes. En el PC se muestra como una columna centrada.
- Fondo oscuro por defecto, que se adapta a `prefers-color-scheme`. Colores vivos en los botones de juego.

## Pruebas

- `tests.html` ejecuta asserts sobre la lógica pura (generador de operaciones, respuestas distractoras, puntuación de Stroop, crecimiento de la secuencia de Simon) y muestra ✅ o ❌.
- Lo visual se prueba jugando en el PC y en el móvil a través de la red local.

## Orden de construcción

1. Base: `index.html`, estilos, menú, navegación y récords.
2. Cálculo.
3. Atención (Stroop).
4. Memoria (Simon).
5. PWA: `manifest.json` + `sw.js`.

## Fuera de alcance (pendiente)

- Minijuegos de Lógica (secuencias o puzzles) y Reacción.
- Elegir el modo de juego (por tiempo, hasta fallar o por niveles) en cada minijuego.
- Estadísticas, progreso por habilidad y entrenamiento diario.
- Cuentas, rankings online y sincronización (Firebase o Supabase).
- Publicación en tiendas con Capacitor.
