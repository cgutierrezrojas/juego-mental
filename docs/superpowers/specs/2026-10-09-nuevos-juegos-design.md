# Juego Mental — Fase A: cinco juegos nuevos

Fecha: 2026-10-09

Parte de la app ya publicada (v1 + pulido v2). Añade tres juegos de Lógica (Series, ¿Cuál sobra?, Puzzle) y dos de Reacción (Rayo, Topos), y reorganiza el menú para que quepan los 8 juegos.

## Menú

- Tarjetas en 2 columnas con icono y nombre, agrupadas bajo tres títulos pequeños, cada tarjeta con el color de su juego:

| Categoría | Juegos (icono, color) |
|---|---|
| Clásicos | ➕ Cálculo (rojo) · 👁 Atención (azul) · 🧠 Memoria (verde) |
| Lógica | 🔢 Series (amarillo) · 🧩 ¿Cuál sobra? (rojo) · 🟦 Puzzle (azul) |
| Reacción | ⚡ Rayo (amarillo) · 🔨 Topos (verde) |

- Cada entrada de `JUEGOS` en `main.js` gana `categoria` e `icono`, y opcionalmente `unidad` (texto tras la puntuación) y `menorEsMejor`.

## Récords

- En Rayo (`ms`) y Puzzle (`movimientos`) gana el número más bajo (`menorEsMejor: true`). En el resto, el más alto, como hasta ahora.
- Una puntuación de 0 nunca es récord. Si no hay récord guardado, cualquier puntuación mayor que 0 lo bate.
- La previa muestra "Récord: —" si aún no hay récord. La previa y la pantalla final muestran la unidad, por ejemplo "245 ms".
- La comparación es una función pura `esRecord(puntos, record, menorEsMejor)` en `games/comun.js`.

## Juegos de opciones: Cálculo, Series y ¿Cuál sobra?

Los tres funcionan igual: 60 s, un enunciado y 4 botones. Acertar suma un acierto; fallar resta 3 s y la partida sigue. Puntuación = aciertos.

- Ese esqueleto se saca de `calculo.js` a un archivo nuevo, `games/opciones.js`, con `jugarConOpciones(pantalla, alTerminar, generar, claseEnunciado)`. Cada juego solo aporta `generar(aciertos) → { texto, opciones, correcta, pista? }`.
- `generarOpciones` (la correcta y 3 distractores sin pistas) también se muda a `opciones.js`.
- Si la ronda trae `pista`, al fallarla se enseña bajo el enunciado hasta la siguiente respuesta.

### 🔢 Series

- Se ven 4 números y "?". Las 4 opciones salen de `generarOpciones(siguiente)`.
- Tipos de serie según los aciertos de la partida:

| Aciertos | Tipos |
|---|---|
| 0–4 | sumar siempre lo mismo (+1 a +9) |
| 5–9 | + restar siempre lo mismo (sin bajar de 0), multiplicar por 2 o por 3 |
| 10–14 | restar, multiplicar, alterna (+p, +q, +p, +q… con p ≠ q), cuadrados consecutivos |
| 15+ | multiplicar, alterna, cuadrados, Fibonacci (cada uno es la suma de los dos anteriores) |

### 🧩 ¿Cuál sobra?

- Se ven 4 números distintos (de 1 en adelante): tres cumplen una regla y uno no. Se toca el que sobra.
- Reglas según los aciertos: 0–4 pares e impares (números hasta 20); 5–9 además múltiplos de 5 y de 3 (hasta 50); 10+ además cuadrados perfectos y primos (hasta 100).
- **Sin ambigüedad:** con ninguna regla de la lista completa puede quedar otro número distinto como "el raro". Raro significa que es el único que la cumple, o el único que no la cumple. Si pasa, se genera otra ronda.
- Pista al fallar: "Eran <regla>", por ejemplo "Eran pares".

## 🟦 Puzzle

- Tablero 3×3 con las fichas del 1 al 8 y un hueco. Tocar una ficha junto al hueco la mueve al hueco. Tocar otra marca un anillo rojo y no cuenta como movimiento.
- Se baraja con 100 movimientos válidos al azar desde el puzzle resuelto, así que siempre tiene solución. Si sale resuelto, se vuelve a barajar.
- Sin límite de tiempo. Al resolverlo suena el acierto y, tras 0,6 s, se termina. Puntuación = movimientos (menor es mejor).

## ⚡ Rayo

- 5 intentos. Una zona grande muestra "Espera…". Tras un tiempo al azar entre 1,5 s y 4 s se pone verde con "¡YA!", y se toca lo más rápido posible. Se mide desde que se pone verde hasta que se toca (`pointerdown`, más rápido que el clic). Se enseña el tiempo, por ejemplo "312 ms".
- Tocar antes del verde: la zona se pone roja con "¡Demasiado pronto!" y ese intento se repite.
- Puntuación = media redondeada de los 5 tiempos, en ms (menor es mejor).

## 🔨 Topos

- 30 s. En una cuadrícula de 3×3 aparece un topo (🐹) en una casilla al azar, nunca en la misma dos veces seguidas.
- Cada topo dura `max(450, 1000 − 25 × aciertos)` ms. Al tocarlo o al esconderse, el siguiente aparece 200 ms después.
- Tocar una casilla vacía cuenta como error. Puntuación = aciertos − errores, con mínimo 0.

## Común a los cinco

- Exportan `start(pantalla, alTerminar)`, que devuelve `parar()`. Tras `parar()` no llaman a `alTerminar` ni programan nada más.
- Usan la cuenta atrás, ✕, el anillo y el sonido/vibración de `destello()`, los dos temas y "reducir movimiento" (la zona de Rayo y las casillas no añaden animaciones nuevas).
- Su lógica pura va exportada aparte para `tests.js`. Ningún módulo toca `document` al cargarse.
- `sw.js` añade `games/opciones.js` y los cinco archivos nuevos.

## Pruebas (en `tests.js`)

- `esRecord`: mayor y menor es mejor, sin récord, puntuación 0.
- **Series:** en cada tramo, los 5 números (4 visibles + el que sigue) son enteros ≥ 0 y siguen alguno de los tipos permitidos en ese tramo. En 0–4, siempre suma constante positiva.
- **¿Cuál sobra?:** en cada tramo, 4 números distintos dentro del rango. Exactamente 3 cumplen la regla elegida y el que sobra no. Ninguna regla de la lista señala otro número. Solo aparecen las reglas del tramo.
- **Puzzle:** barajar no da el puzzle resuelto y tiene las 9 piezas. `mover` solo acepta fichas vecinas del hueco. `resuelto` reconoce el orden.
- **Rayo y Topos:** `media`, el rango de `espera` y `duracionTopo`.
- La prueba existente de opciones de Cálculo pasa a importar `generarOpciones` desde `opciones.js`.

## Fuera de alcance

Estadísticas, modos de juego, tiendas y cuentas online, que son las fases B a E.
