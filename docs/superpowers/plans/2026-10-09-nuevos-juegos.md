# Juego Mental — Plan de la fase A: cinco juegos nuevos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** Implementar `docs/superpowers/specs/2026-10-09-nuevos-juegos-design.md`: menú en cuadrícula por categorías, récords con unidad y "menor es mejor", y los juegos Series, ¿Cuál sobra?, Puzzle, Rayo y Topos.

**Arquitectura:** Cada juego es un módulo en `games/` que exporta `start(pantalla, alTerminar) → parar` y su lógica pura. Los juegos de 4 opciones (Cálculo, Series, ¿Cuál sobra?) comparten `games/opciones.js` (`jugarConOpciones`, `generarOpciones`). `main.js` dibuja el menú desde `JUEGOS` agrupando por `categoria` y compara récords con `esRecord` de `games/comun.js`.

**Tecnología:** HTML + CSS + JavaScript (módulos ES), sin frameworks ni compilación. Pruebas con `node tests.js`.

## Restricciones globales

- Sin frameworks, sin dependencias, sin paso de compilación. Código simple y legible; nombres en español.
- Los módulos de `games/` no tocan `document`, `localStorage`, `navigator` ni `AudioContext` al cargarse (así `node tests.js` funciona).
- `start(pantalla, alTerminar)` devuelve `parar()`. Tras `parar()` el juego no llama a `alTerminar` ni programa nada más (timeouts/intervalos limpiados o ignorados).
- Respuesta visual/sonora con `destello(elemento, ok)` de `games/efectos.js`.
- Colores de tarjeta: Cálculo `rojo`, Atención `azul`, Memoria `verde`, Series `amarillo`, ¿Cuál sobra? `rojo`, Puzzle `azul`, Rayo `amarillo`, Topos `verde`.
- Cada juego nuevo se añade a `JUEGOS` (`main.js`) y a `ARCHIVOS` (`sw.js`).

## Mapa de archivos

| Archivo | Tarea | Qué |
|---|---|---|
| `games/comun.js` | T1, T2 | + `esRecord`, + `entre` |
| `main.js` | T1–T6 | menú en cuadrícula, unidades, récords; una entrada por juego |
| `styles.css` | T1, T2, T4, T5, T6 | tarjetas, categorías, pista, puzzle, zona de Rayo, topos |
| `games/opciones.js` | T2 (nuevo) | `generarOpciones`, `jugarConOpciones` |
| `games/calculo.js` | T2 | usa `opciones.js` |
| `games/series.js` | T2 (nuevo) | Series |
| `games/sobra.js` | T3 (nuevo) | ¿Cuál sobra? |
| `games/puzzle.js` | T4 (nuevo) | Puzzle |
| `games/rayo.js` | T5 (nuevo) | Rayo |
| `games/topos.js` | T6 (nuevo) | Topos |
| `sw.js` | T2–T6 | lista de archivos |
| `tests.js` | T1–T6 | pruebas puras |

## Cómo probar

- `node tests.js` en la raíz: todas las líneas ✅; con algún ❌ el código de salida es 1.
- Navegador: `python -m http.server 8000` y `http://localhost:8000` (recargar con Ctrl+Shift+R; el service worker está activo).

---

### Task 1: Menú en cuadrícula por categorías y récords con unidad

**Files:**
- Modify: `games/comun.js`, `main.js`, `styles.css`, `tests.js`

**Interfaces:**
- Produces (`games/comun.js`): `esRecord(puntos, record, menorEsMejor = false) → boolean`.
- Produces (`main.js`): entradas de `JUEGOS` con `{ id, nombre, categoria, icono, color, instrucciones, juego }` y opcionales `unidad`, `menorEsMejor`. Categorías en orden: `'Clásicos'`, `'Lógica'`, `'Reacción'` (las vacías no se dibujan).
- Produces (CSS): clases `tarjeta`, `icono`, `categoria`.

- [ ] **Step 1: Prueba de `esRecord` al final de `tests.js`**

Cambiar la línea 2 de `tests.js`:

```js
import { azar, barajar, leer, temporizador } from './games/comun.js';
```

por:

```js
import { azar, barajar, leer, temporizador, esRecord } from './games/comun.js';
```

Y añadir al final:

```js
// --- récords ---

probar('récords: mayor es mejor, menor es mejor, sin récord y puntuación 0', () => {
  assert(esRecord(10, 5) === true);
  assert(esRecord(5, 10) === false);
  assert(esRecord(5, 5) === false, 'empatar no es récord');
  assert(esRecord(200, 250, true) === true);
  assert(esRecord(300, 250, true) === false);
  assert(esRecord(300, 0, true) === true, 'sin récord guardado, cualquier puntuación lo bate');
  assert(esRecord(7, 0) === true);
  assert(esRecord(0, 0) === false, '0 nunca es récord');
  assert(esRecord(0, 5, true) === false, '0 nunca es récord, tampoco en menor es mejor');
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `node tests.js`
Expected: error `does not provide an export named 'esRecord'`.

- [ ] **Step 3: `esRecord` al final de `games/comun.js`**

```js
// ¿Bate el récord? Una puntuación de 0 nunca lo es; sin récord guardado (0), cualquier otra sí.
export function esRecord(puntos, record, menorEsMejor = false) {
  if (puntos <= 0) return false;
  if (record <= 0) return true;
  return menorEsMejor ? puntos < record : puntos > record;
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `node tests.js` → todo ✅ (18 pruebas).

- [ ] **Step 5: `main.js` — campos nuevos, unidades y récords**

Sustituir el comentario y la lista `JUEGOS`:

```js
// Cada juego: { id, nombre, color, instrucciones, juego }. `juego` es un módulo con start(pantalla, alTerminar),
// que devuelve una función parar(); `color` es el nombre de su variable CSS.
// Para añadir un juego: crear el archivo en games/, importarlo arriba y añadir su entrada aquí.
```

por:

```js
// Cada juego: { id, nombre, categoria, icono, color, instrucciones, juego } y, si hace falta, `unidad`
// (texto tras la puntuación) y `menorEsMejor` (récord = puntuación más baja). `juego` es un módulo con
// start(pantalla, alTerminar), que devuelve una función parar(); `color` es el nombre de su variable CSS.
// Para añadir un juego: crear el archivo en games/, importarlo arriba y añadir su entrada aquí.
```

Y sustituir las tres entradas actuales:

```js
  { id: 'calculo', nombre: 'Cálculo', color: 'rojo', instrucciones: 'Resuelve todas las operaciones que puedas en 60 segundos.', juego: calculo },
  { id: 'atencion', nombre: 'Atención', color: 'azul', instrucciones: 'Toca el color de la tinta, no lo que dice la palabra.', juego: atencion },
  { id: 'memoria', nombre: 'Memoria', color: 'verde', instrucciones: 'Mira la secuencia de colores y repítela. Cada ronda, uno más.', juego: memoria },
```

por:

```js
  { id: 'calculo', nombre: 'Cálculo', categoria: 'Clásicos', icono: '➕', color: 'rojo', instrucciones: 'Resuelve todas las operaciones que puedas en 60 segundos.', juego: calculo },
  { id: 'atencion', nombre: 'Atención', categoria: 'Clásicos', icono: '👁', color: 'azul', instrucciones: 'Toca el color de la tinta, no lo que dice la palabra.', juego: atencion },
  { id: 'memoria', nombre: 'Memoria', categoria: 'Clásicos', icono: '🧠', color: 'verde', instrucciones: 'Mira la secuencia de colores y repítela. Cada ronda, uno más.', juego: memoria },
```

Cambiar el import de comun:

```js
import { el, leer, guardar } from './games/comun.js';
```

por:

```js
import { el, leer, guardar, esRecord } from './games/comun.js';
```

Debajo de la función `leerRecord` añadir:

```js
// "245 ms", "12 movimientos" o solo "7" si el juego no tiene unidad.
const conUnidad = (j, n) => (j.unidad ? `${n} ${j.unidad}` : `${n}`);
```

En `abrirPrevia`, sustituir:

```js
  $('previa-record').textContent = leerRecord(j.id);
```

por:

```js
  const record = leerRecord(j.id);
  $('previa-record').textContent = record ? conUnidad(j, record) : '—';
```

En `terminar`, sustituir:

```js
  const nuevo = puntos > leerRecord(actual.id);
  if (nuevo) guardar('record:' + actual.id, puntos);
  $('final-puntos').textContent = puntos;
```

por:

```js
  const nuevo = esRecord(puntos, leerRecord(actual.id), actual.menorEsMejor);
  if (nuevo) guardar('record:' + actual.id, puntos);
  $('final-puntos').textContent = conUnidad(actual, puntos);
```

Y sustituir el bucle que crea los botones del menú:

```js
for (const j of JUEGOS) {
  const b = document.createElement('button');
  b.className = 'grande color';
  b.style.setProperty('--c', `var(--${j.color})`);
  b.textContent = j.nombre;
  b.onclick = () => abrirPrevia(j);
  $('lista-juegos').append(b);
}
```

por:

```js
// Menú: tarjetas en cuadrícula, agrupadas por categoría (las categorías sin juegos no se dibujan).
for (const categoria of ['Clásicos', 'Lógica', 'Reacción']) {
  const juegos = JUEGOS.filter((j) => j.categoria === categoria);
  if (!juegos.length) continue;
  const rejilla = el('div', 'rejilla');
  for (const j of juegos) {
    const b = el('button', 'tarjeta color');
    b.style.setProperty('--c', `var(--${j.color})`);
    b.append(el('span', 'icono', j.icono), el('span', '', j.nombre));
    b.onclick = () => abrirPrevia(j);
    rejilla.append(b);
  }
  $('lista-juegos').append(el('h3', 'categoria', categoria), rejilla);
}
```

- [ ] **Step 6: Estilos — sustituir el bloque `#lista-juegos` de `styles.css`**

Sustituir:

```css
#lista-juegos {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

por:

```css
#lista-juegos {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Título pequeño de cada grupo de juegos en el menú */
.categoria {
  margin: 8px 0 0;
  text-align: left;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.7;
}

/* Tarjeta de juego del menú: icono grande y nombre debajo */
button.tarjeta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  font-size: 1.1rem;
}

.tarjeta .icono { font-size: 1.8rem; }
```

- [ ] **Step 7: Comprobar**

Run: `node tests.js` → 18 ✅.
En el navegador (ambos temas): el menú muestra el título "CLÁSICOS" y 3 tarjetas en 2 columnas (➕ Cálculo rojo, 👁 Atención azul, 🧠 Memoria verde). La previa de un juego sin récord muestra "Récord: —". Jugar una partida con puntos > 0: "¡Nuevo récord!" y la previa ya muestra el número.

- [ ] **Step 8: Commit**

```bash
git add games/comun.js main.js styles.css tests.js
git commit -m "Menú en cuadrícula por categorías; récords con unidad y menor es mejor"
```

---

### Task 2: `opciones.js` compartido + juego Series

**Files:**
- Create: `games/opciones.js`, `games/series.js`
- Modify: `games/comun.js` (+ `entre`), `games/calculo.js`, `main.js`, `styles.css`, `sw.js`, `tests.js`

**Interfaces:**
- Produces (`games/comun.js`): `entre(min, max, rnd = Math.random) → entero en [min, max]`.
- Produces (`games/opciones.js`): `generarOpciones(resultado, rnd)` (movida tal cual desde calculo.js), `jugarConOpciones(pantalla, alTerminar, generar, claseEnunciado = '') → parar`, donde `generar(aciertos) → { texto, opciones, correcta, pista? }`.
- Produces (`games/series.js`): `generarSerie(aciertos, rnd = Math.random) → { numeros }` (5 números: los 4 visibles y el siguiente), `start`.
- Produces (CSS): clases `pista`, `serie`.

- [ ] **Step 1: Pruebas de Series al final de `tests.js` y nuevo import de `generarOpciones`**

Sustituir la línea:

```js
import { generarOperacion, generarOpciones } from './games/calculo.js';
```

por:

```js
import { generarOperacion } from './games/calculo.js';
import { generarOpciones } from './games/opciones.js';
```

Y añadir al final:

```js
// --- series.js ---
import { generarSerie } from './games/series.js';

// ¿Qué tipos de serie encajan con estos 5 números?
function tiposDeSerie(s) {
  const d = s.slice(1).map((n, i) => n - s[i]);
  const tipos = [];
  if (d.every((x) => x === d[0] && x > 0)) tipos.push('suma');
  if (d.every((x) => x === d[0] && x < 0)) tipos.push('resta');
  if (s[0] > 0 && [2, 3].some((r) => s.slice(1).every((n, i) => n === s[i] * r))) tipos.push('multiplica');
  if (d[0] === d[2] && d[1] === d[3] && d[0] !== d[1]) tipos.push('alterna');
  if (s.every((n, i) => Math.sqrt(n) === Math.sqrt(s[0]) + i)) tipos.push('cuadrados');
  if (s.slice(2).every((n, i) => n === s[i] + s[i + 1])) tipos.push('fibonacci');
  return tipos;
}

probar('series: 5 enteros >= 0 que siguen un tipo permitido en cada tramo', () => {
  const permitidos = [
    [0, ['suma']],
    [7, ['suma', 'resta', 'multiplica']],
    [12, ['resta', 'multiplica', 'alterna', 'cuadrados']],
    [20, ['multiplica', 'alterna', 'cuadrados', 'fibonacci']],
  ];
  for (const [aciertos, tipos] of permitidos) {
    for (let i = 0; i < 500; i++) {
      const { numeros } = generarSerie(aciertos);
      assert(numeros.length === 5, `${numeros}`);
      assert(numeros.every((n) => Number.isInteger(n) && n >= 0), `negativo o no entero: ${numeros}`);
      assert(tiposDeSerie(numeros).some((t) => tipos.includes(t)), `aciertos ${aciertos}: ${numeros} no es ${tipos}`);
    }
  }
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `node tests.js`
Expected: error `Cannot find module ... games/opciones.js`.

- [ ] **Step 3: `entre` en `games/comun.js`**

Debajo de la función `azar(...)`:

```js
// Entero al azar entre min y max, ambos incluidos.
export const entre = (min, max, rnd = Math.random) => min + azar(max - min + 1, rnd);
```

- [ ] **Step 4: Crear `games/opciones.js`**

```js
// Juegos de 4 opciones (Cálculo, Series, ¿Cuál sobra?): 60 segundos, un enunciado y 4 botones.
// Acertar suma un acierto; fallar resta 3 segundos y la partida sigue. Puntuación = aciertos.
import { azar, barajar, el, temporizador, pintarReloj } from './comun.js';
import { destello } from './efectos.js';

// Números enteros de `desde` a `hasta`, ambos incluidos (vacío si desde > hasta).
const rango = (desde, hasta) => Array.from({ length: Math.max(0, hasta - desde + 1) }, (_, i) => desde + i);

// La correcta y 3 distractores a ±5 como mucho, distintos y no negativos, en orden aleatorio.
// Se elige al azar cuántos quedan por debajo de la correcta (0 a 3), así la correcta puede ser
// la más baja, la más alta o una del medio con la misma probabilidad. Con resultados pequeños
// no caben tantos por debajo y se ponen los que caben.
export function generarOpciones(resultado, rnd = Math.random) {
  const debajo = Math.min(azar(4, rnd), resultado);
  const menores = barajar(rango(Math.max(0, resultado - 5), resultado - 1), rnd).slice(0, debajo);
  const mayores = barajar(rango(resultado + 1, resultado + 5), rnd).slice(0, 3 - debajo);
  return barajar([resultado, ...menores, ...mayores], rnd);
}

// `generar(aciertos)` devuelve { texto, opciones, correcta } y, si quiere, `pista`:
// un texto que se enseña bajo el enunciado cuando se falla esa ronda.
export function jugarConOpciones(pantalla, alTerminar, generar, claseEnunciado = '') {
  let aciertos = 0;
  let ronda;

  const tiempo = el('span');
  const puntos = el('span', '', 'Aciertos: 0');
  const marcador = el('div', 'marcador');
  marcador.append(tiempo, puntos);
  const enunciado = el('div', `enunciado ${claseEnunciado}`.trim());
  const pista = el('p', 'pista');
  const rejilla = el('div', 'rejilla');
  pantalla.append(marcador, enunciado, pista, rejilla);

  const reloj = temporizador(60, (s) => pintarReloj(tiempo, s), () => alTerminar(aciertos));

  function nueva() {
    ronda = generar(aciertos);
    enunciado.textContent = ronda.texto;
    rejilla.replaceChildren(...ronda.opciones.map((n) => {
      const b = el('button', 'grande', n);
      b.onclick = () => responder(n);
      return b;
    }));
  }

  function responder(n) {
    const ok = n === ronda.correcta;
    destello(enunciado, ok);
    pista.textContent = ok ? '' : ronda.pista ?? '';
    if (ok) {
      aciertos++;
      puntos.textContent = `Aciertos: ${aciertos}`;
    } else {
      reloj.restar(3);
    }
    nueva();
  }

  nueva();
  return reloj.parar;
}
```

- [ ] **Step 5: `games/calculo.js` usa `opciones.js`**

Sustituir las líneas de import y el helper `entre`:

```js
import { azar, barajar, el, temporizador, pintarReloj } from './comun.js';
import { destello } from './efectos.js';

const entre = (min, max, rnd) => min + azar(max - min + 1, rnd);
```

por:

```js
import { azar, entre } from './comun.js';
import { generarOpciones, jugarConOpciones } from './opciones.js';
```

Borrar desde la línea `// Números enteros de \`desde\` a \`hasta\`...` hasta el final del archivo (el helper `rango`, `generarOpciones` y el `start` actual) y poner en su lugar:

```js
export function start(pantalla, alTerminar) {
  return jugarConOpciones(pantalla, alTerminar, (aciertos) => {
    const { texto, resultado } = generarOperacion(aciertos);
    return { texto, opciones: generarOpciones(resultado), correcta: resultado };
  });
}
```

- [ ] **Step 6: Crear `games/series.js`**

```js
// Series: ¿qué número sigue? 60 segundos, 4 opciones; la dificultad sube con los aciertos.
import { azar, entre } from './comun.js';
import { generarOpciones, jugarConOpciones } from './opciones.js';

// Cada tipo devuelve 5 números: los 4 que se ven y el que sigue.
const cinco = (f) => [0, 1, 2, 3, 4].map(f);

const suma = (rnd) => {
  const inicio = entre(1, 20, rnd);
  const paso = entre(1, 9, rnd);
  return cinco((i) => inicio + i * paso);
};

const resta = (rnd) => {
  const paso = entre(1, 9, rnd);
  const inicio = 4 * paso + entre(0, 20, rnd); // así el quinto nunca baja de 0
  return cinco((i) => inicio - i * paso);
};

const multiplica = (rnd) => {
  const factor = entre(2, 3, rnd);
  const inicio = entre(1, 5, rnd);
  return cinco((i) => inicio * factor ** i);
};

const alterna = (rnd) => {
  const p = entre(1, 5, rnd);
  const q = entre(6, 9, rnd); // p y q siempre distintos
  const serie = [entre(1, 10, rnd)];
  for (let i = 1; i < 5; i++) serie.push(serie[i - 1] + (i % 2 ? p : q));
  return serie;
};

const cuadrados = (rnd) => {
  const base = entre(1, 6, rnd);
  return cinco((i) => (base + i) ** 2);
};

const fibonacci = (rnd) => {
  const serie = [entre(1, 5, rnd), entre(1, 5, rnd)];
  while (serie.length < 5) serie.push(serie.at(-1) + serie.at(-2));
  return serie;
};

export function generarSerie(aciertos, rnd = Math.random) {
  const tipos =
    aciertos < 5 ? [suma] :
    aciertos < 10 ? [suma, resta, multiplica] :
    aciertos < 15 ? [resta, multiplica, alterna, cuadrados] :
    [multiplica, alterna, cuadrados, fibonacci];
  return { numeros: tipos[azar(tipos.length, rnd)](rnd) };
}

export function start(pantalla, alTerminar) {
  return jugarConOpciones(pantalla, alTerminar, (aciertos) => {
    const { numeros } = generarSerie(aciertos);
    const siguiente = numeros[4];
    return { texto: `${numeros.slice(0, 4).join(', ')}, ?`, opciones: generarOpciones(siguiente), correcta: siguiente };
  }, 'serie');
}
```

- [ ] **Step 7: Ejecutar las pruebas**

Run: `node tests.js` → todo ✅ (19 pruebas), incluidas las de Cálculo con el nuevo import.

- [ ] **Step 8: Series en `main.js`, estilos y `sw.js`**

`main.js`: debajo de `import * as memoria from './games/memoria.js';` añadir:

```js
import * as series from './games/series.js';
```

Y en `JUEGOS`, debajo de la entrada de memoria:

```js
  { id: 'series', nombre: 'Series', categoria: 'Lógica', icono: '🔢', color: 'amarillo', instrucciones: '¿Qué número sigue? Descubre la regla de cada serie. 60 segundos.', juego: series },
```

`styles.css`, al final:

```css
/* Juegos de opciones: pista bajo el enunciado tras un fallo (hueco reservado para que nada salte) */
.pista {
  min-height: 1.4rem;
  margin: -12px 0 0;
  color: var(--mal);
  font-weight: 700;
}

/* Series: enunciado más pequeño, caben 4 números de hasta 3 cifras */
.enunciado.serie { font-size: 1.8rem; }
```

`sw.js`: sustituir

```js
  'games/comun.js', 'games/efectos.js', 'games/calculo.js', 'games/atencion.js', 'games/memoria.js',
```

por

```js
  'games/comun.js', 'games/efectos.js', 'games/calculo.js', 'games/atencion.js', 'games/memoria.js',
  'games/opciones.js', 'games/series.js',
```

- [ ] **Step 9: Comprobar**

Run: `node tests.js` → 19 ✅.
En el navegador: Cálculo se juega exactamente como antes (60 s, −3 s al fallar, puntuación = aciertos). En el menú aparece "LÓGICA" con 🔢 Series (amarillo). Series: se ve p. ej. "3, 7, 11, 15, ?" con 4 opciones; acertar suma; fallar resta 3 s; a los 60 s pantalla final. ✕ a mitad vuelve al menú sin pantalla final.

- [ ] **Step 10: Commit**

```bash
git add games/comun.js games/opciones.js games/calculo.js games/series.js main.js styles.css sw.js tests.js
git commit -m "Juego Series; esqueleto de juegos de opciones compartido en opciones.js"
```

---

### Task 3: ¿Cuál sobra?

**Files:**
- Create: `games/sobra.js`
- Modify: `main.js`, `sw.js`, `tests.js`

**Interfaces:**
- Consumes: `azar`, `barajar` de `comun.js`; `jugarConOpciones` de `opciones.js` (con `pista`).
- Produces (`games/sobra.js`): `REGLAS` (array de `{ nombre, cumple(n), desde }`), `reglasDisponibles(aciertos)`, `distinto(regla, numeros) → número | null`, `generarRonda(aciertos, rnd = Math.random) → { numeros, sobra, regla }` (`regla` es el objeto de `REGLAS`), `start`.

- [ ] **Step 1: Pruebas al final de `tests.js`**

```js
// --- sobra.js ---
import { REGLAS, reglasDisponibles, distinto, generarRonda as rondaSobra } from './games/sobra.js';

probar('sobra: 3 cumplen la regla, el que sobra no, y ninguna otra regla señala a otro', () => {
  for (const [aciertos, max] of [[0, 20], [7, 50], [12, 100]]) {
    const nombres = reglasDisponibles(aciertos).map((r) => r.nombre);
    for (let i = 0; i < 500; i++) {
      const { numeros, sobra, regla } = rondaSobra(aciertos);
      assert(numeros.length === 4 && new Set(numeros).size === 4, `${numeros}`);
      assert(numeros.every((n) => Number.isInteger(n) && n >= 1 && n <= max), `fuera de rango: ${numeros}`);
      assert(nombres.includes(regla.nombre), `regla ${regla.nombre} no disponible con ${aciertos} aciertos`);
      assert(numeros.filter(regla.cumple).length === 3 && !regla.cumple(sobra), `${numeros} / ${regla.nombre}`);
      for (const r of REGLAS) assert([null, sobra].includes(distinto(r, numeros)), `ambiguo: ${numeros} con ${r.nombre}`);
    }
  }
});

probar('sobra: reglas por tramo y "distinto"', () => {
  assert(reglasDisponibles(0).map((r) => r.nombre).join() === 'pares,impares');
  assert(reglasDisponibles(5).length === 4);
  assert(reglasDisponibles(10).length === 6);
  const pares = REGLAS.find((r) => r.nombre === 'pares');
  assert(distinto(pares, [2, 4, 6, 9]) === 9);
  assert(distinto(pares, [1, 3, 5, 8]) === 8, 'también es raro el único que sí cumple');
  assert(distinto(pares, [2, 4, 7, 9]) === null);
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `node tests.js`
Expected: error `Cannot find module ... games/sobra.js`.

- [ ] **Step 3: Crear `games/sobra.js`**

```js
// ¿Cuál sobra?: tres números siguen una regla y uno no. 60 segundos, 4 opciones.
import { azar, barajar } from './comun.js';
import { jugarConOpciones } from './opciones.js';

function esPrimo(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

// `desde`: aciertos de la partida a partir de los cuales aparece la regla.
export const REGLAS = [
  { nombre: 'pares', cumple: (n) => n % 2 === 0, desde: 0 },
  { nombre: 'impares', cumple: (n) => n % 2 === 1, desde: 0 },
  { nombre: 'múltiplos de 5', cumple: (n) => n % 5 === 0, desde: 5 },
  { nombre: 'múltiplos de 3', cumple: (n) => n % 3 === 0, desde: 5 },
  { nombre: 'cuadrados perfectos', cumple: (n) => Number.isInteger(Math.sqrt(n)), desde: 10 },
  { nombre: 'primos', cumple: esPrimo, desde: 10 },
];

export const reglasDisponibles = (aciertos) => REGLAS.filter((r) => aciertos >= r.desde);

// El raro de los 4 según una regla: el único que la cumple o el único que no (null si no hay uno solo).
export function distinto(regla, numeros) {
  const si = numeros.filter(regla.cumple);
  const no = numeros.filter((n) => !regla.cumple(n));
  if (si.length === 1) return si[0];
  if (no.length === 1) return no[0];
  return null;
}

export function generarRonda(aciertos, rnd = Math.random) {
  const reglas = reglasDisponibles(aciertos);
  const max = aciertos < 5 ? 20 : aciertos < 10 ? 50 : 100;
  for (;;) {
    const regla = reglas[azar(reglas.length, rnd)];
    const si = [];
    const no = [];
    while (si.length < 3 || no.length < 1) {
      const n = 1 + azar(max, rnd);
      if (si.includes(n) || no.includes(n)) continue;
      if (regla.cumple(n)) {
        if (si.length < 3) si.push(n);
      } else if (no.length < 1) {
        no.push(n);
      }
    }
    const numeros = barajar([...si, ...no], rnd);
    const sobra = no[0];
    // Sin ambigüedad: ninguna regla (de toda la lista) puede señalar a otro número como el raro.
    if (REGLAS.every((r) => [null, sobra].includes(distinto(r, numeros)))) return { numeros, sobra, regla };
  }
}

export function start(pantalla, alTerminar) {
  return jugarConOpciones(pantalla, alTerminar, (aciertos) => {
    const { numeros, sobra, regla } = generarRonda(aciertos);
    return { texto: '¿Cuál sobra?', opciones: numeros, correcta: sobra, pista: `Eran ${regla.nombre}` };
  });
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `node tests.js` → todo ✅ (21 pruebas).

- [ ] **Step 5: En `main.js` y `sw.js`**

`main.js`: debajo de `import * as series from './games/series.js';` añadir:

```js
import * as sobra from './games/sobra.js';
```

Y en `JUEGOS`, debajo de la entrada de series:

```js
  { id: 'sobra', nombre: '¿Cuál sobra?', categoria: 'Lógica', icono: '🧩', color: 'rojo', instrucciones: 'Tres números siguen una regla y uno no: toca el que sobra. 60 segundos.', juego: sobra },
```

`sw.js`: sustituir

```js
  'games/opciones.js', 'games/series.js',
```

por

```js
  'games/opciones.js', 'games/series.js', 'games/sobra.js',
```

- [ ] **Step 6: Comprobar**

Run: `node tests.js` → 21 ✅.
En el navegador: 🧩 ¿Cuál sobra? (rojo) en "LÓGICA". Enunciado "¿Cuál sobra?" y 4 números. Fallar resta 3 s y enseña en rojo, bajo el enunciado, p. ej. "Eran pares"; al acertar la siguiente desaparece.

- [ ] **Step 7: Commit**

```bash
git add games/sobra.js main.js sw.js tests.js
git commit -m "Juego ¿Cuál sobra?"
```

---

### Task 4: Puzzle

**Files:**
- Create: `games/puzzle.js`
- Modify: `main.js`, `styles.css`, `sw.js`, `tests.js`

**Interfaces:**
- Consumes: `azar`, `el` de `comun.js`; `destello`, `sonar` de `efectos.js`; `unidad`/`menorEsMejor` de la Tarea 1.
- Produces (`games/puzzle.js`): `RESUELTO` (`[1,2,3,4,5,6,7,8,0]`, 0 = hueco), `mover(tablero, i) → nuevo tablero | null`, `resuelto(tablero) → boolean`, `barajarPuzzle(rnd = Math.random)`, `start`.

- [ ] **Step 1: Pruebas al final de `tests.js`**

```js
// --- puzzle.js ---
import { RESUELTO, mover, resuelto, barajarPuzzle } from './games/puzzle.js';

probar('puzzle: mover solo fichas junto al hueco; resuelto reconoce el orden', () => {
  assert(resuelto(RESUELTO));
  // Hueco en la esquina inferior derecha (índice 8): se pueden mover el 5 y el 7.
  assert(mover(RESUELTO, 5).join() === '1,2,3,4,5,0,7,8,6', 'arriba del hueco');
  assert(mover(RESUELTO, 7).join() === '1,2,3,4,5,6,7,0,8', 'izquierda del hueco');
  assert(mover(RESUELTO, 0) === null && mover(RESUELTO, 4) === null && mover(RESUELTO, 6) === null, 'no vecinas');
  assert(RESUELTO.join() === '1,2,3,4,5,6,7,8,0', 'mover no modifica el original');
  // De la fila de abajo no se salta a la siguiente fila: con el hueco en 3, el 2 no es vecino.
  assert(mover([1, 2, 3, 0, 4, 5, 6, 7, 8], 2) === null);
  assert(!resuelto(mover(RESUELTO, 5)));
});

probar('puzzle: barajar da las 9 piezas y nunca el puzzle resuelto', () => {
  for (let i = 0; i < 200; i++) {
    const t = barajarPuzzle();
    assert([...t].sort().join() === '0,1,2,3,4,5,6,7,8', `${t}`);
    assert(!resuelto(t), 'salió resuelto');
  }
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `node tests.js`
Expected: error `Cannot find module ... games/puzzle.js`.

- [ ] **Step 3: Crear `games/puzzle.js`**

```js
// Puzzle 3×3: ordena las fichas del 1 al 8 con los menos movimientos posibles. Sin límite de tiempo.
import { azar, el } from './comun.js';
import { destello, sonar } from './efectos.js';

export const RESUELTO = [1, 2, 3, 4, 5, 6, 7, 8, 0]; // 0 = hueco

// Casillas que tocan a la casilla i (arriba, abajo, izquierda, derecha) en el tablero 3×3.
function vecinas(i) {
  const v = [i - 3, i + 3];
  if (i % 3 > 0) v.push(i - 1);
  if (i % 3 < 2) v.push(i + 1);
  return v.filter((c) => c >= 0 && c < 9);
}

// Mueve la ficha de la casilla i al hueco. Devuelve un tablero nuevo, o null si no está junto al hueco.
export function mover(tablero, i) {
  const hueco = tablero.indexOf(0);
  if (!vecinas(hueco).includes(i)) return null;
  const nuevo = [...tablero];
  [nuevo[hueco], nuevo[i]] = [nuevo[i], nuevo[hueco]];
  return nuevo;
}

export const resuelto = (tablero) => tablero.every((v, i) => v === RESUELTO[i]);

// 100 movimientos válidos al azar desde el resuelto: siempre tiene solución.
export function barajarPuzzle(rnd = Math.random) {
  let tablero = RESUELTO;
  do {
    for (let k = 0; k < 100; k++) {
      const opciones = vecinas(tablero.indexOf(0));
      tablero = mover(tablero, opciones[azar(opciones.length, rnd)]);
    }
  } while (resuelto(tablero));
  return tablero;
}

export function start(pantalla, alTerminar) {
  let tablero = barajarPuzzle();
  let movimientos = 0;
  let terminado = false;
  let id;

  const contador = el('span', '', 'Movimientos: 0');
  const marcador = el('div', 'marcador');
  marcador.append(el('span', '', 'Ordena del 1 al 8'), contador);
  const rejilla = el('div', 'puzzle');
  pantalla.append(marcador, rejilla);

  function pintar() {
    rejilla.replaceChildren(...tablero.map((v, i) => {
      if (!v) return el('div', 'hueco');
      const b = el('button', 'grande color', v);
      b.style.setProperty('--c', 'var(--azul)');
      b.onclick = () => tocar(i, b);
      return b;
    }));
  }

  function tocar(i, boton) {
    if (terminado) return;
    const nuevo = mover(tablero, i);
    if (!nuevo) return destello(boton, false);
    tablero = nuevo;
    movimientos++;
    contador.textContent = `Movimientos: ${movimientos}`;
    sonar('tic');
    pintar();
    if (resuelto(tablero)) {
      terminado = true;
      sonar('acierto');
      id = setTimeout(() => alTerminar(movimientos), 600);
    }
  }

  pintar();
  return () => {
    terminado = true;
    clearTimeout(id);
  };
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `node tests.js` → todo ✅ (23 pruebas).

- [ ] **Step 5: En `main.js`, `styles.css` y `sw.js`**

`main.js`: debajo de `import * as sobra from './games/sobra.js';` añadir:

```js
import * as puzzle from './games/puzzle.js';
```

Y en `JUEGOS`, debajo de la entrada de sobra:

```js
  { id: 'puzzle', nombre: 'Puzzle', categoria: 'Lógica', icono: '🟦', color: 'azul', unidad: 'movimientos', menorEsMejor: true, instrucciones: 'Ordena las fichas del 1 al 8 con los menos movimientos posibles.', juego: puzzle },
```

`styles.css`, al final:

```css
/* Puzzle 3×3 */
.puzzle {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.puzzle button {
  aspect-ratio: 1;
  padding: 0;
  font-size: 2rem;
}
```

`sw.js`: sustituir

```js
  'games/opciones.js', 'games/series.js', 'games/sobra.js',
```

por

```js
  'games/opciones.js', 'games/series.js', 'games/sobra.js', 'games/puzzle.js',
```

- [ ] **Step 6: Comprobar**

Run: `node tests.js` → 23 ✅.
En el navegador: 🟦 Puzzle (azul) en "LÓGICA". Tablero 3×3 desordenado con un hueco. Tocar una ficha vecina del hueco la mueve y suma un movimiento; tocar una no vecina da anillo rojo y no suma. Al ordenarlo (se puede probar desde la consola resolviendo hasta el final o jugando), pantalla final "Puntuación: N movimientos" y "¡Nuevo récord!"; la previa muestra "Récord: N movimientos". Otra partida con más movimientos no es récord; con menos, sí.

- [ ] **Step 7: Commit**

```bash
git add games/puzzle.js main.js styles.css sw.js tests.js
git commit -m "Juego Puzzle 3×3"
```

---

### Task 5: Rayo

**Files:**
- Create: `games/rayo.js`
- Modify: `main.js`, `styles.css`, `sw.js`, `tests.js`

**Interfaces:**
- Consumes: `azar`, `el` de `comun.js`; `destello` de `efectos.js`.
- Produces (`games/rayo.js`): `media(tiempos) → entero`, `espera(rnd = Math.random) → ms entre 1500 y 4000`, `start`.
- Produces (CSS): clases `zona-rayo`, `ya`, `pronto`.

- [ ] **Step 1: Pruebas al final de `tests.js`**

```js
// --- rayo.js ---
import { media, espera } from './games/rayo.js';

probar('rayo: media redondeada y espera entre 1,5 y 4 s', () => {
  assert(media([300, 310, 320]) === 310);
  assert(media([250, 251]) === 251, 'redondea 250.5 hacia arriba');
  assert(espera(() => 0) === 1500);
  assert(espera(() => 0.99999) === 4000);
  for (let i = 0; i < 1000; i++) {
    const ms = espera();
    assert(Number.isInteger(ms) && ms >= 1500 && ms <= 4000, `${ms}`);
  }
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `node tests.js`
Expected: error `Cannot find module ... games/rayo.js`.

- [ ] **Step 3: Crear `games/rayo.js`**

```js
// Rayo: cuando la zona se pone verde, ¡toca! 5 intentos; puntuación = tiempo medio en ms (menos es mejor).
import { azar, el } from './comun.js';
import { destello } from './efectos.js';

const INTENTOS = 5;

export const media = (tiempos) => Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length);

// Tiempo al azar antes del verde, para que no se pueda adivinar.
export const espera = (rnd = Math.random) => 1500 + azar(2501, rnd);

export function start(pantalla, alTerminar) {
  const tiempos = [];
  let fase = 'espera'; // 'espera' (gris) → 'ya' (verde) → 'pausa' (enseñando el tiempo)
  let inicio = 0;
  let id;

  const intento = el('span');
  const ultimo = el('span');
  const marcador = el('div', 'marcador');
  marcador.append(intento, ultimo);
  const zona = el('button', 'zona-rayo');
  pantalla.append(marcador, zona);

  function preparar() {
    fase = 'espera';
    zona.className = 'zona-rayo';
    zona.textContent = 'Espera…';
    intento.textContent = `Intento ${tiempos.length + 1} de ${INTENTOS}`;
    id = setTimeout(() => {
      fase = 'ya';
      zona.className = 'zona-rayo ya';
      zona.textContent = '¡YA!';
      inicio = performance.now();
    }, espera());
  }

  // pointerdown responde antes que click (no espera a levantar el dedo).
  zona.onpointerdown = () => {
    if (fase === 'espera') {
      // Demasiado pronto: este intento se repite.
      clearTimeout(id);
      fase = 'pausa';
      zona.className = 'zona-rayo pronto';
      zona.textContent = '¡Demasiado pronto!';
      destello(zona, false);
      id = setTimeout(preparar, 1200);
      return;
    }
    if (fase !== 'ya') return;
    const ms = Math.round(performance.now() - inicio);
    tiempos.push(ms);
    fase = 'pausa';
    zona.textContent = `${ms} ms`;
    ultimo.textContent = `Último: ${ms} ms`;
    destello(zona, true);
    if (tiempos.length === INTENTOS) id = setTimeout(() => alTerminar(media(tiempos)), 1000);
    else id = setTimeout(preparar, 1000);
  };

  preparar();
  return () => clearTimeout(id);
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `node tests.js` → todo ✅ (24 pruebas).

- [ ] **Step 5: En `main.js`, `styles.css` y `sw.js`**

`main.js`: debajo de `import * as puzzle from './games/puzzle.js';` añadir:

```js
import * as rayo from './games/rayo.js';
```

Y en `JUEGOS`, debajo de la entrada de puzzle:

```js
  { id: 'rayo', nombre: 'Rayo', categoria: 'Reacción', icono: '⚡', color: 'amarillo', unidad: 'ms', menorEsMejor: true, instrucciones: 'Cuando se ponga verde, ¡toca! 5 intentos; cuenta tu tiempo medio.', juego: rayo },
```

`styles.css`, al final:

```css
/* Rayo: zona grande que pasa de gris (espera) a verde (¡ya!) o rojo (demasiado pronto) */
.zona-rayo {
  min-height: 50vh;
  font-size: 2rem;
}

.zona-rayo.ya {
  background: var(--verde);
  color: #fff;
}

.zona-rayo.pronto {
  background: var(--mal);
  color: #fff;
}
```

`sw.js`: sustituir

```js
  'games/opciones.js', 'games/series.js', 'games/sobra.js', 'games/puzzle.js',
```

por

```js
  'games/opciones.js', 'games/series.js', 'games/sobra.js', 'games/puzzle.js', 'games/rayo.js',
```

- [ ] **Step 6: Comprobar**

Run: `node tests.js` → 24 ✅.
En el navegador (ambos temas): en el menú aparece "REACCIÓN" con ⚡ Rayo (amarillo). Zona grande "Espera…"; tras 1,5–4 s se pone verde "¡YA!"; al tocar enseña "NNN ms" y pasa al siguiente intento. Tocar antes del verde: rojo "¡Demasiado pronto!" y el intento se repite (el contador "Intento N de 5" no avanza). Tras 5 intentos: "Puntuación: NNN ms". Récord: una media más baja lo bate, una más alta no. ✕ durante la espera: no vuelve a ponerse verde ni aparece la pantalla final.

- [ ] **Step 7: Commit**

```bash
git add games/rayo.js main.js styles.css sw.js tests.js
git commit -m "Juego Rayo"
```

---

### Task 6: Topos

**Files:**
- Create: `games/topos.js`
- Modify: `main.js`, `styles.css`, `sw.js`, `tests.js`

**Interfaces:**
- Consumes: `azar`, `el`, `temporizador`, `pintarReloj` de `comun.js`; `destello` de `efectos.js`.
- Produces (`games/topos.js`): `duracionTopo(aciertos) → ms`, `start`.
- Produces (CSS): clases `topos`, `casilla`, `topo`.

- [ ] **Step 1: Pruebas al final de `tests.js`**

```js
// --- topos.js ---
import { duracionTopo } from './games/topos.js';

probar('topos: cada topo dura 1 s y 25 ms menos por acierto, mínimo 0,45 s', () => {
  assert(duracionTopo(0) === 1000);
  assert(duracionTopo(10) === 750);
  assert(duracionTopo(22) === 450);
  assert(duracionTopo(100) === 450);
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `node tests.js`
Expected: error `Cannot find module ... games/topos.js`.

- [ ] **Step 3: Crear `games/topos.js`**

```js
// Topos: toca cada topo antes de que se esconda. 30 segundos. Tocar una casilla vacía resta.
import { azar, el, temporizador, pintarReloj } from './comun.js';
import { destello } from './efectos.js';

export const duracionTopo = (aciertos) => Math.max(450, 1000 - aciertos * 25);

export function start(pantalla, alTerminar) {
  let aciertos = 0;
  let errores = 0;
  let topo = -1; // casilla con el topo (-1: ninguna)
  let anterior = -1;
  let id;
  const puntuacion = () => Math.max(0, aciertos - errores);

  const tiempo = el('span');
  const puntos = el('span', '', 'Puntos: 0');
  const marcador = el('div', 'marcador');
  marcador.append(tiempo, puntos);
  const rejilla = el('div', 'topos');
  const casillas = Array.from({ length: 9 }, (_, i) => {
    const b = el('button', 'grande casilla');
    b.onpointerdown = () => tocar(i);
    return b;
  });
  rejilla.append(...casillas);
  pantalla.append(marcador, rejilla);

  const reloj = temporizador(30, (s) => pintarReloj(tiempo, s), () => {
    clearTimeout(id);
    alTerminar(puntuacion());
  });

  function aparecer() {
    do topo = azar(9); while (topo === anterior); // nunca dos veces seguidas en la misma casilla
    anterior = topo;
    casillas[topo].classList.add('topo');
    casillas[topo].textContent = '🐹';
    id = setTimeout(esconder, duracionTopo(aciertos));
  }

  // Quita el topo y saca el siguiente 200 ms después.
  function esconder() {
    casillas[topo].classList.remove('topo');
    casillas[topo].textContent = '';
    topo = -1;
    id = setTimeout(aparecer, 200);
  }

  function tocar(i) {
    const ok = i === topo;
    destello(casillas[i], ok);
    if (ok) {
      aciertos++;
      clearTimeout(id);
      esconder();
    } else {
      errores++;
    }
    puntos.textContent = `Puntos: ${puntuacion()}`;
  }

  aparecer();
  return () => {
    reloj.parar();
    clearTimeout(id);
  };
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `node tests.js` → todo ✅ (25 pruebas).

- [ ] **Step 5: En `main.js`, `styles.css` y `sw.js`**

`main.js`: debajo de `import * as rayo from './games/rayo.js';` añadir:

```js
import * as topos from './games/topos.js';
```

Y en `JUEGOS`, debajo de la entrada de rayo:

```js
  { id: 'topos', nombre: 'Topos', categoria: 'Reacción', icono: '🔨', color: 'verde', instrucciones: 'Toca cada topo antes de que se esconda. Tocar una casilla vacía resta. 30 segundos.', juego: topos },
```

`styles.css`, al final:

```css
/* Topos: cuadrícula 3×3; la casilla con topo se resalta con el color de acento */
.topos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.casilla {
  aspect-ratio: 1;
  padding: 0;
  font-size: 2.5rem;
}

.casilla.topo { background: var(--acento); }
```

`sw.js`: sustituir

```js
  'games/opciones.js', 'games/series.js', 'games/sobra.js', 'games/puzzle.js', 'games/rayo.js',
```

por

```js
  'games/opciones.js', 'games/series.js', 'games/sobra.js', 'games/puzzle.js', 'games/rayo.js',
  'games/topos.js',
```

- [ ] **Step 6: Comprobar**

Run: `node tests.js` → 25 ✅.
En el navegador (ambos temas): 🔨 Topos (verde) en "REACCIÓN"; el menú completo son 8 tarjetas en 3 grupos y cabe en una pantalla de móvil (390×780) sin desplazarse o casi. Topos: aparece 🐹 en casillas al azar (nunca la misma dos veces seguidas); tocarlo suma y sale otro; tocar una vacía resta (anillo rojo); los topos duran menos según aciertas; a partir de 10 s el reloj avisa; a los 30 s pantalla final con aciertos − errores (mínimo 0). ✕ a mitad: no aparecen más topos ni pantalla final.

- [ ] **Step 7: Commit**

```bash
git add games/topos.js main.js styles.css sw.js tests.js
git commit -m "Juego Topos"
```
