# Juego Mental — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** PWA de tres minijuegos mentales (Cálculo, Atención/Stroop, Memoria/Simon) con récords locales, según `docs/superpowers/specs/2026-10-07-juego-mental-design.md`.

**Arquitectura:** Una sola página (`index.html`) con cuatro `<section>` (menú, previa, juego, final) que `main.js` muestra u oculta. Cada juego es un módulo ES en `games/` que exporta `start(pantalla, alTerminar)` y, por separado, sus funciones puras. `games/comun.js` reúne lo que usan los tres juegos (azar, barajar, crear elementos, destello, temporizador).

**Tecnología:** HTML + CSS + JavaScript (módulos ES), sin frameworks ni compilación. `localStorage` para récords. Servidor de desarrollo: `python -m http.server 8000`. Pruebas: `tests.js` (se ejecuta con `node tests.js` y también en el navegador desde `tests.html`).

## Restricciones globales

- Sin frameworks, sin dependencias, sin paso de compilación.
- Código simple y legible (el proyecto también es para aprender). Nombres en español.
- Cada juego exporta `start(pantalla, alTerminar)`; el menú no conoce el interior de los juegos.
- Lógica pura en funciones exportadas, separada del DOM. Los módulos no tocan `document` al cargarse (así `node tests.js` funciona).
- Récords en `localStorage` con la clave `record:<juego>`. Si `localStorage` falla, el juego funciona igual sin guardar.
- Móvil en vertical primero, botones grandes; en PC, columna centrada. Fondo oscuro por defecto, adaptado a `prefers-color-scheme`.
- Respuesta visual inmediata: verde si aciertas, rojo si fallas, animación corta.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `index.html` | Las cuatro pantallas como `<section>` |
| `styles.css` | Todo el aspecto |
| `main.js` | Lista de juegos, navegación, récords, registro del service worker |
| `games/comun.js` | `azar`, `barajar`, `el`, `destello`, `temporizador` |
| `games/calculo.js` | Juego de cálculo |
| `games/atencion.js` | Juego Stroop |
| `games/memoria.js` | Juego Simon |
| `tests.js` | Pruebas de la lógica pura (Node y navegador) |
| `tests.html` | Muestra el resultado de `tests.js` en el navegador |
| `manifest.json`, `icon.svg`, `sw.js` | PWA |

## Cómo probar

- Pruebas de lógica: `node tests.js` (en la raíz del proyecto). Cada línea empieza por ✅ o ❌; si hay algún ❌ el código de salida es 1.
- En el navegador: `python -m http.server 8000` y abrir `http://localhost:8000` (la app) o `http://localhost:8000/tests.html` (pruebas).
- En el móvil (misma wifi): `python -m http.server 8000 --bind 0.0.0.0`, buscar la IP del PC con `ipconfig` y abrir `http://<IP>:8000`.

---

### Task 1: Base — pantallas, estilos, navegación, récords y utilidades comunes

**Files:**
- Create: `index.html`, `styles.css`, `main.js`, `games/comun.js`, `tests.js`, `tests.html`

**Interfaces:**
- Produces (`games/comun.js`):
  - `azar(n, rnd = Math.random) → number` entero en `[0, n)`
  - `barajar(lista, rnd = Math.random) → array` copia barajada (no modifica la original)
  - `el(tag, clase = '', texto = '') → HTMLElement`
  - `destello(elemento, ok: boolean)` añade la clase `ok` o `mal` y reinicia la animación
  - `temporizador(segundos, alCambiar(restantes), alFin()) → { restar(s) }` cuenta atrás de 1 s; `alFin` se llama una sola vez
- Produces (`main.js`): array `JUEGOS` con entradas `{ id, nombre, instrucciones, juego }`, donde `juego` es el módulo importado.
- Produces (`tests.js`): `probar(nombre, fn)` y `assert(condicion, mensaje)`; las tareas siguientes añaden pruebas al final del archivo.
- Produces (CSS): clases `grande`, `rejilla`, `marcador`, `enunciado`, `ok`, `mal`, `simon`, `encendido`; variables `--rojo --azul --verde --amarillo`.

- [ ] **Step 1: Escribir las pruebas de `comun.js`**

`tests.js`:

```js
// Pruebas de la lógica pura. Se ejecutan con `node tests.js` o abriendo tests.html.
import { azar, barajar } from './games/comun.js';

function probar(nombre, fn) {
  let linea;
  try {
    fn();
    linea = `✅ ${nombre}`;
  } catch (e) {
    linea = `❌ ${nombre}: ${e.message}`;
    if (typeof process !== 'undefined') process.exitCode = 1;
  }
  if (typeof document !== 'undefined') document.getElementById('resultados').textContent += linea + '\n';
  else console.log(linea);
}

function assert(condicion, mensaje = 'falló') {
  if (!condicion) throw new Error(mensaje);
}

// --- comun.js ---

probar('azar da enteros entre 0 y n-1', () => {
  for (let i = 0; i < 1000; i++) {
    const n = azar(4);
    assert(Number.isInteger(n) && n >= 0 && n < 4, `salió ${n}`);
  }
  assert(azar(4, () => 0) === 0);
  assert(azar(4, () => 0.999) === 3);
});

probar('barajar conserva los elementos y no modifica la original', () => {
  const original = [1, 2, 3, 4, 5];
  const b = barajar(original);
  assert(original.join() === '1,2,3,4,5', 'modificó la original');
  assert([...b].sort().join() === '1,2,3,4,5', `quedó ${b}`);
});
```

`tests.html`:

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pruebas — Juego Mental</title>
</head>
<body>
  <h1>Pruebas</h1>
  <pre id="resultados"></pre>
  <script type="module" src="tests.js"></script>
</body>
</html>
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `node tests.js`
Expected: error `Cannot find module ... games/comun.js`.

- [ ] **Step 3: Escribir `games/comun.js`**

```js
// Piezas que usan todos los juegos.

// Entero al azar entre 0 y n-1. `rnd` se puede cambiar en las pruebas.
export function azar(n, rnd = Math.random) {
  return Math.floor(rnd() * n);
}

// Copia barajada de la lista (Fisher-Yates).
export function barajar(lista, rnd = Math.random) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = azar(i + 1, rnd);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function el(tag, clase = '', texto = '') {
  const e = document.createElement(tag);
  e.className = clase;
  e.textContent = texto;
  return e;
}

// Destello verde (ok) o rojo (mal) sobre un elemento.
export function destello(elemento, ok) {
  elemento.classList.remove('ok', 'mal');
  void elemento.offsetWidth; // fuerza al navegador a reiniciar la animación
  elemento.classList.add(ok ? 'ok' : 'mal');
}

// Cuenta atrás. Llama a alCambiar(restantes) en cada cambio y a alFin() una sola vez al llegar a 0.
export function temporizador(segundos, alCambiar, alFin) {
  let restantes = segundos;
  const id = setInterval(() => cambiar(-1), 1000);

  function cambiar(delta) {
    if (restantes <= 0) return;
    restantes = Math.max(0, restantes + delta);
    alCambiar(restantes);
    if (restantes === 0) {
      clearInterval(id);
      alFin();
    }
  }

  alCambiar(restantes);
  return { restar: (s) => cambiar(-s) };
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `node tests.js`
Expected: dos líneas con ✅ y ninguna con ❌.

- [ ] **Step 5: Escribir `index.html`**

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Juego Mental</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main>
    <section id="menu">
      <h1>Juego Mental</h1>
      <div id="lista-juegos"></div>
    </section>

    <section id="previa" hidden>
      <h2 id="previa-nombre"></h2>
      <p id="previa-instrucciones"></p>
      <p>Récord: <span id="previa-record"></span></p>
      <button id="btn-jugar" class="grande">Jugar</button>
      <button class="btn-menu">Menú</button>
    </section>

    <section id="juego" hidden></section>

    <section id="final" hidden>
      <h2>Puntuación: <span id="final-puntos"></span></h2>
      <p id="final-record" hidden>¡Nuevo récord!</p>
      <button id="btn-repetir" class="grande">Repetir</button>
      <button class="btn-menu">Menú</button>
    </section>
  </main>
  <script type="module" src="main.js"></script>
</body>
</html>
```

- [ ] **Step 6: Escribir `styles.css`**

```css
:root {
  --fondo: #121212;
  --texto: #f2f2f2;
  --boton: #2a2a2a;
  --ok: #2ecc71;
  --mal: #e74c3c;
  --rojo: #e74c3c;
  --azul: #3498db;
  --verde: #27ae60;
  --amarillo: #f1c40f;
}

@media (prefers-color-scheme: light) {
  :root {
    --fondo: #f4f4f4;
    --texto: #111;
    --boton: #ddd;
  }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--fondo);
  color: var(--texto);
  font-family: system-ui, sans-serif;
}

main {
  max-width: 480px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 16px;
}

section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: center;
}

section[hidden] { display: none; }

#lista-juegos {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

button {
  font: inherit;
  font-size: 1.2rem;
  padding: 14px;
  border: 0;
  border-radius: 12px;
  background: var(--boton);
  color: var(--texto);
  cursor: pointer;
  touch-action: manipulation; /* evita el zoom por doble toque en el móvil */
}

button.grande {
  font-size: 1.5rem;
  padding: 20px;
}

.rejilla {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.marcador {
  display: flex;
  justify-content: space-between;
  font-size: 1.2rem;
}

.enunciado {
  margin: 24px 0;
  padding: 16px;
  border-radius: 12px;
  font-size: 2.5rem;
  font-weight: bold;
}

/* Simon: botones apagados hasta que se encienden */
.simon button {
  aspect-ratio: 1;
  opacity: 0.4;
}
.simon button.encendido { opacity: 1; }

.ok { animation: destello-ok 0.3s; }
.mal { animation: destello-mal 0.3s; }

@keyframes destello-ok {
  50% { background: var(--ok); opacity: 1; }
}
@keyframes destello-mal {
  50% { background: var(--mal); opacity: 1; }
}
```

- [ ] **Step 7: Escribir `main.js`**

```js
// Menú, navegación entre pantallas y récords.

// Cada juego: { id, nombre, instrucciones, juego }, donde `juego` es un módulo con start(pantalla, alTerminar).
// Para añadir un juego: crear el archivo en games/, importarlo arriba y añadir su entrada aquí.
const JUEGOS = [];

const $ = (id) => document.getElementById(id);
let actual = null;

function leerRecord(id) {
  try {
    return Number(localStorage.getItem('record:' + id)) || 0;
  } catch {
    return 0; // sin localStorage (modo privado): se juega sin récord
  }
}

function guardarRecord(id, puntos) {
  try {
    localStorage.setItem('record:' + id, puntos);
  } catch {
    // sin localStorage: no se guarda
  }
}

function mostrar(id) {
  for (const s of document.querySelectorAll('main > section')) s.hidden = s.id !== id;
}

function abrirPrevia(j) {
  actual = j;
  $('previa-nombre').textContent = j.nombre;
  $('previa-instrucciones').textContent = j.instrucciones;
  $('previa-record').textContent = leerRecord(j.id);
  mostrar('previa');
}

function jugar() {
  const pantalla = $('juego');
  pantalla.replaceChildren();
  mostrar('juego');
  actual.juego.start(pantalla, terminar);
}

function terminar(puntos) {
  const nuevo = puntos > leerRecord(actual.id);
  if (nuevo) guardarRecord(actual.id, puntos);
  $('final-puntos').textContent = puntos;
  $('final-record').hidden = !nuevo;
  mostrar('final');
}

for (const j of JUEGOS) {
  const b = document.createElement('button');
  b.className = 'grande';
  b.textContent = j.nombre;
  b.onclick = () => abrirPrevia(j);
  $('lista-juegos').append(b);
}

$('btn-jugar').onclick = jugar;
$('btn-repetir').onclick = jugar;
for (const b of document.querySelectorAll('.btn-menu')) b.onclick = () => mostrar('menu');
```

- [ ] **Step 8: Comprobar en el navegador**

Run: `python -m http.server 8000` y abrir `http://localhost:8000`.
Expected: fondo oscuro, título "Juego Mental", sin errores en la consola (F12). `http://localhost:8000/tests.html` muestra las dos líneas ✅.

- [ ] **Step 9: Commit**

```bash
git add index.html styles.css main.js games/comun.js tests.js tests.html
git commit -m "Base: pantallas, estilos, navegación, récords y utilidades"
```

---

### Task 2: Cálculo

**Files:**
- Create: `games/calculo.js`
- Modify: `main.js` (import + entrada en `JUEGOS`), `tests.js` (añadir pruebas al final)

**Interfaces:**
- Consumes: `azar`, `barajar`, `el`, `destello`, `temporizador` de `games/comun.js`; clases CSS `marcador`, `enunciado`, `rejilla`, `grande`.
- Produces: `generarOperacion(aciertos, rnd = Math.random) → { texto, resultado }`, `generarOpciones(resultado, rnd = Math.random) → number[4]`, `start(pantalla, alTerminar)`.

- [ ] **Step 1: Añadir las pruebas al final de `tests.js`**

```js
// --- calculo.js ---
import { generarOperacion, generarOpciones } from './games/calculo.js';

probar('cálculo: 0-4 aciertos solo sumas de 1 a 10', () => {
  for (let i = 0; i < 500; i++) {
    const op = generarOperacion(0);
    const m = op.texto.match(/^(\d+) \+ (\d+)$/);
    assert(m, `operación inesperada: ${op.texto}`);
    const [a, b] = [Number(m[1]), Number(m[2])];
    assert(a >= 1 && a <= 10 && b >= 1 && b <= 10, op.texto);
    assert(op.resultado === a + b, op.texto);
  }
});

probar('cálculo: 5-9 aciertos sumas y restas hasta 20, resultado >= 0', () => {
  for (let i = 0; i < 500; i++) {
    const op = generarOperacion(7);
    const m = op.texto.match(/^(\d+) ([+−]) (\d+)$/);
    assert(m, `operación inesperada: ${op.texto}`);
    const [a, b] = [Number(m[1]), Number(m[3])];
    assert(a <= 20 && b <= 20, op.texto);
    assert(op.resultado === (m[2] === '+' ? a + b : a - b), op.texto);
    assert(op.resultado >= 0, op.texto);
  }
});

probar('cálculo: 10-14 aciertos incluye multiplicaciones de 2 a 9', () => {
  let hayMulti = false;
  for (let i = 0; i < 500; i++) {
    const op = generarOperacion(12);
    const m = op.texto.match(/^(\d+) × (\d+)$/);
    if (!m) continue;
    hayMulti = true;
    const [a, b] = [Number(m[1]), Number(m[2])];
    assert(a >= 2 && a <= 9 && b >= 2 && b <= 9, op.texto);
    assert(op.resultado === a * b, op.texto);
  }
  assert(hayMulti, 'no salió ninguna multiplicación');
});

probar('cálculo: 15+ aciertos números hasta 100 y multiplicaciones hasta 12×12', () => {
  for (let i = 0; i < 500; i++) {
    const op = generarOperacion(20);
    const m = op.texto.match(/^(\d+) ([+−×]) (\d+)$/);
    assert(m, `operación inesperada: ${op.texto}`);
    const [a, b] = [Number(m[1]), Number(m[3])];
    const max = m[2] === '×' ? 12 : 100;
    assert(a <= max && b <= max, op.texto);
    assert(op.resultado >= 0, op.texto);
  }
});

probar('cálculo: 4 opciones distintas, no negativas, cercanas, con la correcta', () => {
  for (const resultado of [0, 1, 2, 7, 50, 144]) {
    for (let i = 0; i < 100; i++) {
      const opciones = generarOpciones(resultado);
      assert(opciones.length === 4, `${opciones}`);
      assert(new Set(opciones).size === 4, `repetidas: ${opciones}`);
      assert(opciones.includes(resultado), `falta ${resultado}: ${opciones}`);
      assert(opciones.every((n) => n >= 0 && Math.abs(n - resultado) <= 5), `${opciones}`);
    }
  }
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `node tests.js`
Expected: error `Cannot find module ... games/calculo.js`.

- [ ] **Step 3: Escribir `games/calculo.js`**

```js
// Cálculo: 60 segundos para resolver operaciones eligiendo entre 4 respuestas.
import { azar, barajar, el, destello, temporizador } from './comun.js';

const entre = (min, max, rnd) => min + azar(max - min + 1, rnd);

function suma(max, rnd) {
  const a = entre(1, max, rnd);
  const b = entre(1, max, rnd);
  return { texto: `${a} + ${b}`, resultado: a + b };
}

function resta(max, rnd) {
  const a = entre(1, max, rnd);
  const b = entre(1, a, rnd); // b <= a, así el resultado nunca es negativo
  return { texto: `${a} − ${b}`, resultado: a - b };
}

function multiplicacion(min, max, rnd) {
  const a = entre(min, max, rnd);
  const b = entre(min, max, rnd);
  return { texto: `${a} × ${b}`, resultado: a * b };
}

// La dificultad sube con los aciertos de la partida.
export function generarOperacion(aciertos, rnd = Math.random) {
  const tipos =
    aciertos < 5 ? [() => suma(10, rnd)] :
    aciertos < 10 ? [() => suma(20, rnd), () => resta(20, rnd)] :
    aciertos < 15 ? [() => suma(20, rnd), () => resta(20, rnd), () => multiplicacion(2, 9, rnd)] :
    [() => suma(100, rnd), () => resta(100, rnd), () => multiplicacion(2, 12, rnd)];
  return tipos[azar(tipos.length, rnd)]();
}

// La correcta y 3 distractores a ±5 como mucho, distintos y no negativos, en orden aleatorio.
export function generarOpciones(resultado, rnd = Math.random) {
  const cercanos = [];
  for (let d = -5; d <= 5; d++) {
    if (d !== 0 && resultado + d >= 0) cercanos.push(resultado + d);
  }
  return barajar([resultado, ...barajar(cercanos, rnd).slice(0, 3)], rnd);
}

export function start(pantalla, alTerminar) {
  let aciertos = 0;
  let operacion;

  const tiempo = el('span');
  const puntos = el('span', '', 'Aciertos: 0');
  const marcador = el('div', 'marcador');
  marcador.append(tiempo, puntos);
  const enunciado = el('div', 'enunciado');
  const rejilla = el('div', 'rejilla');
  pantalla.append(marcador, enunciado, rejilla);

  const reloj = temporizador(60, (s) => { tiempo.textContent = `⏱ ${s}`; }, () => alTerminar(aciertos));

  function nueva() {
    operacion = generarOperacion(aciertos);
    enunciado.textContent = operacion.texto;
    rejilla.replaceChildren(...generarOpciones(operacion.resultado).map((n) => {
      const b = el('button', 'grande', n);
      b.onclick = () => responder(n);
      return b;
    }));
  }

  function responder(n) {
    const ok = n === operacion.resultado;
    destello(enunciado, ok);
    if (ok) {
      aciertos++;
      puntos.textContent = `Aciertos: ${aciertos}`;
    } else {
      reloj.restar(3);
    }
    nueva();
  }

  nueva();
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `node tests.js`
Expected: todas las líneas con ✅.

- [ ] **Step 5: Añadir Cálculo al menú en `main.js`**

Al principio del archivo, antes de `const JUEGOS`:

```js
import * as calculo from './games/calculo.js';
```

Y sustituir `const JUEGOS = [];` por:

```js
const JUEGOS = [
  { id: 'calculo', nombre: 'Cálculo', instrucciones: 'Resuelve todas las operaciones que puedas en 60 segundos.', juego: calculo },
];
```

- [ ] **Step 6: Jugar una partida**

Run: `python -m http.server 8000`, abrir `http://localhost:8000`.
Expected: Menú → Cálculo → previa con récord 0 → Jugar. El reloj baja de 60; acertar destella en verde y suma; fallar destella en rojo y resta 3 s. A los 0 s aparece la pantalla final con la puntuación y "¡Nuevo récord!" (si es > 0). Repetir empieza otra partida; Menú vuelve al menú; la previa muestra ahora el récord.

- [ ] **Step 7: Commit**

```bash
git add games/calculo.js main.js tests.js
git commit -m "Juego de cálculo"
```

---

### Task 3: Atención (Stroop)

**Files:**
- Create: `games/atencion.js`
- Modify: `main.js` (import + entrada en `JUEGOS`), `tests.js` (añadir pruebas al final)

**Interfaces:**
- Consumes: `azar`, `el`, `destello`, `temporizador` de `games/comun.js`; variables CSS `--rojo --azul --verde --amarillo`.
- Produces: `COLORES` (array de `{ nombre, css }`), `generarRonda(rnd = Math.random) → { palabra, tinta }` (índices de `COLORES`), `puntuacion(aciertos, errores) → number`, `start(pantalla, alTerminar)`.

- [ ] **Step 1: Añadir las pruebas al final de `tests.js`**

```js
// --- atencion.js ---
import { COLORES, generarRonda, puntuacion } from './games/atencion.js';

probar('stroop: 4 colores', () => {
  assert(COLORES.map((c) => c.nombre).join() === 'ROJO,AZUL,VERDE,AMARILLO');
});

probar('stroop: palabra y tinta coinciden en torno a 1/4 de las veces', () => {
  let coinciden = 0;
  const veces = 8000;
  for (let i = 0; i < veces; i++) {
    const r = generarRonda();
    assert(r.palabra >= 0 && r.palabra < 4 && r.tinta >= 0 && r.tinta < 4, JSON.stringify(r));
    if (r.palabra === r.tinta) coinciden++;
  }
  const p = coinciden / veces;
  assert(p > 0.2 && p < 0.3, `proporción ${p}`);
});

probar('stroop: puntuación = aciertos - errores, mínimo 0', () => {
  assert(puntuacion(10, 3) === 7);
  assert(puntuacion(2, 5) === 0);
  assert(puntuacion(0, 0) === 0);
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `node tests.js`
Expected: error `Cannot find module ... games/atencion.js`.

- [ ] **Step 3: Escribir `games/atencion.js`**

```js
// Atención (Stroop): toca el color de la TINTA, no lo que dice la palabra. 60 segundos.
import { azar, el, destello, temporizador } from './comun.js';

export const COLORES = [
  { nombre: 'ROJO', css: 'var(--rojo)' },
  { nombre: 'AZUL', css: 'var(--azul)' },
  { nombre: 'VERDE', css: 'var(--verde)' },
  { nombre: 'AMARILLO', css: 'var(--amarillo)' },
];

// Palabra y tinta se eligen por separado, así coinciden 1 de cada 4 veces.
export function generarRonda(rnd = Math.random) {
  return { palabra: azar(COLORES.length, rnd), tinta: azar(COLORES.length, rnd) };
}

export function puntuacion(aciertos, errores) {
  return Math.max(0, aciertos - errores);
}

export function start(pantalla, alTerminar) {
  let aciertos = 0;
  let errores = 0;
  let ronda;

  const tiempo = el('span');
  const puntos = el('span', '', 'Puntos: 0');
  const marcador = el('div', 'marcador');
  marcador.append(tiempo, puntos);
  const enunciado = el('div', 'enunciado');
  const rejilla = el('div', 'rejilla');
  rejilla.append(...COLORES.map((c, i) => {
    const b = el('button', 'grande', c.nombre);
    b.style.background = c.css;
    b.style.color = '#111';
    b.onclick = () => responder(i);
    return b;
  }));
  pantalla.append(marcador, enunciado, rejilla);

  temporizador(60, (s) => { tiempo.textContent = `⏱ ${s}`; }, () => alTerminar(puntuacion(aciertos, errores)));

  function nueva() {
    ronda = generarRonda();
    enunciado.textContent = COLORES[ronda.palabra].nombre;
    enunciado.style.color = COLORES[ronda.tinta].css;
  }

  function responder(i) {
    const ok = i === ronda.tinta;
    destello(enunciado, ok);
    if (ok) aciertos++;
    else errores++;
    puntos.textContent = `Puntos: ${puntuacion(aciertos, errores)}`;
    nueva();
  }

  nueva();
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `node tests.js`
Expected: todas las líneas con ✅.

- [ ] **Step 5: Añadir Atención al menú en `main.js`**

Debajo de `import * as calculo from './games/calculo.js';`:

```js
import * as atencion from './games/atencion.js';
```

Y en `JUEGOS`, debajo de la entrada de cálculo:

```js
  { id: 'atencion', nombre: 'Atención', instrucciones: 'Toca el color de la tinta, no lo que dice la palabra.', juego: atencion },
```

- [ ] **Step 6: Jugar una partida**

Run: `python -m http.server 8000`, abrir `http://localhost:8000`.
Expected: Menú → Atención → Jugar. Se ve una palabra de color escrita con otra tinta (a veces la misma). Tocar el botón del color de la tinta destella en verde y suma; si no, destella en rojo y resta. A los 60 s, pantalla final. Probar también con el sistema en modo claro: la palabra sigue siendo legible.

- [ ] **Step 7: Commit**

```bash
git add games/atencion.js main.js tests.js
git commit -m "Juego de atención (Stroop)"
```

---

### Task 4: Memoria (Simon)

**Files:**
- Create: `games/memoria.js`
- Modify: `main.js` (import + entrada en `JUEGOS`), `tests.js` (añadir pruebas al final)

**Interfaces:**
- Consumes: `azar`, `el`, `destello` de `games/comun.js`; clases CSS `simon`, `encendido`, `rejilla`, `grande`.
- Produces: `alargar(secuencia, rnd = Math.random) → number[]` (copia con un color más, 0-3), `pausa(ronda) → ms`, `start(pantalla, alTerminar)`.

- [ ] **Step 1: Añadir las pruebas al final de `tests.js`**

```js
// --- memoria.js ---
import { alargar, pausa } from './games/memoria.js';

probar('simon: alargar añade un color 0-3 sin modificar la original', () => {
  const original = [2, 0];
  const nueva = alargar(original);
  assert(original.join() === '2,0', 'modificó la original');
  assert(nueva.length === 3 && nueva[0] === 2 && nueva[1] === 0, `${nueva}`);
  assert(nueva[2] >= 0 && nueva[2] < 4, `${nueva}`);
  assert(alargar([], () => 0.999)[0] === 3);
});

probar('simon: la secuencia crece de 1 en 1 desde 1', () => {
  let s = [];
  for (let i = 1; i <= 10; i++) {
    s = alargar(s);
    assert(s.length === i, `longitud ${s.length}`);
  }
});

probar('simon: velocidad igual hasta la ronda 4, más rápida desde la 5, con mínimo', () => {
  assert(pausa(1) === pausa(4), 'cambió antes de la ronda 5');
  assert(pausa(5) < pausa(4), 'no acelera en la ronda 5');
  assert(pausa(10) < pausa(5), 'no sigue acelerando');
  assert(pausa(100) >= 250, 'demasiado rápida');
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `node tests.js`
Expected: error `Cannot find module ... games/memoria.js`.

- [ ] **Step 3: Escribir `games/memoria.js`**

```js
// Memoria (Simon): repite la secuencia de colores. Cada ronda añade uno. Un error termina.
import { azar, el, destello } from './comun.js';

const COLORES = ['rojo', 'azul', 'verde', 'amarillo'];

export function alargar(secuencia, rnd = Math.random) {
  return [...secuencia, azar(COLORES.length, rnd)];
}

// Milisegundos que se ilumina cada color. A partir de la ronda 5 va un poco más rápido.
export function pausa(ronda) {
  return ronda < 5 ? 600 : Math.max(250, 600 - (ronda - 4) * 50);
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export function start(pantalla, alTerminar) {
  let secuencia = [];
  let pos = 0;
  let turno = false; // true cuando el jugador puede tocar

  const estado = el('p', 'marcador');
  const rejilla = el('div', 'rejilla simon');
  const botones = COLORES.map((c, i) => {
    const b = el('button', 'grande');
    b.style.background = `var(--${c})`;
    b.ariaLabel = c;
    b.onclick = () => tocar(i);
    return b;
  });
  rejilla.append(...botones);
  pantalla.append(estado, rejilla);

  async function ronda() {
    secuencia = alargar(secuencia);
    turno = false;
    estado.textContent = `Ronda ${secuencia.length} — Mira…`;
    const ms = pausa(secuencia.length);
    await esperar(600);
    for (const i of secuencia) {
      botones[i].classList.add('encendido');
      await esperar(ms);
      botones[i].classList.remove('encendido');
      await esperar(ms / 3);
    }
    pos = 0;
    turno = true;
    estado.textContent = `Ronda ${secuencia.length} — Repite`;
  }

  function tocar(i) {
    if (!turno) return;
    const ok = i === secuencia[pos];
    destello(botones[i], ok);
    if (!ok) {
      turno = false;
      // Puntuación = la secuencia más larga repetida entera (la anterior a esta).
      setTimeout(() => alTerminar(secuencia.length - 1), 600);
      return;
    }
    pos++;
    if (pos === secuencia.length) ronda();
  }

  ronda();
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `node tests.js`
Expected: todas las líneas con ✅.

- [ ] **Step 5: Añadir Memoria al menú en `main.js`**

Debajo de `import * as atencion from './games/atencion.js';`:

```js
import * as memoria from './games/memoria.js';
```

Y en `JUEGOS`, debajo de la entrada de atención:

```js
  { id: 'memoria', nombre: 'Memoria', instrucciones: 'Mira la secuencia de colores y repítela. Cada ronda, uno más.', juego: memoria },
```

- [ ] **Step 6: Jugar una partida**

Run: `python -m http.server 8000`, abrir `http://localhost:8000`.
Expected: Menú → Memoria → Jugar. Cuadrícula 2×2 de colores apagados. "Mira…": se enciende 1 color; durante esa fase tocar no hace nada. "Repite": tocar bien destella en verde; al completar la secuencia empieza otra ronda con un color más. Un fallo destella en rojo y, tras un momento, la pantalla final muestra la longitud de la última secuencia completada (fallar en la ronda 1 da 0). Desde la ronda 5 la secuencia va algo más rápida.

- [ ] **Step 7: Commit**

```bash
git add games/memoria.js main.js tests.js
git commit -m "Juego de memoria (Simon)"
```

---

### Task 5: PWA — instalable y sin conexión

**Files:**
- Create: `manifest.json`, `icon.svg`, `sw.js`
- Modify: `index.html` (enlace al manifest), `main.js` (registro del service worker)

**Interfaces:**
- Consumes: la lista completa de archivos de las tareas 1-4.
- Produces: nada que usen otras tareas.

Nota: el service worker solo funciona en `localhost` o con HTTPS. Al abrir la app en el móvil por la IP de la red local (http), el registro falla en silencio y la app funciona igual, solo que sin modo sin conexión. La instalación real en el móvil llegará con HTTPS o con Capacitor (fuera de alcance).

- [ ] **Step 1: Escribir `icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#121212"/>
  <rect x="14" y="14" width="34" height="34" rx="6" fill="#e74c3c"/>
  <rect x="52" y="14" width="34" height="34" rx="6" fill="#3498db"/>
  <rect x="14" y="52" width="34" height="34" rx="6" fill="#27ae60"/>
  <rect x="52" y="52" width="34" height="34" rx="6" fill="#f1c40f"/>
</svg>
```

- [ ] **Step 2: Escribir `manifest.json`**

```json
{
  "name": "Juego Mental",
  "short_name": "Juego Mental",
  "start_url": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#121212",
  "theme_color": "#121212",
  "icons": [
    { "src": "icon.svg", "sizes": "any", "type": "image/svg+xml" }
  ]
}
```

- [ ] **Step 3: Escribir `sw.js`**

```js
// Service worker: guarda los archivos para poder jugar sin conexión.
const CACHE = 'juego-mental';
const ARCHIVOS = [
  './', 'index.html', 'styles.css', 'main.js', 'manifest.json', 'icon.svg',
  'games/comun.js', 'games/calculo.js', 'games/atencion.js', 'games/memoria.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)));
});

// Primero la red (así los cambios se ven al momento) y, si no hay conexión, la copia guardada.
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return respuesta;
      })
      .catch(() => caches.match(e.request)),
  );
});
```

- [ ] **Step 4: Enlazar el manifest en `index.html`**

Debajo de `<link rel="stylesheet" href="styles.css">`:

```html
  <link rel="manifest" href="manifest.json">
  <link rel="icon" href="icon.svg">
  <meta name="theme-color" content="#121212">
```

- [ ] **Step 5: Registrar el service worker al final de `main.js`**

```js
// Funcionamiento sin conexión. Solo va en localhost o HTTPS; si falla, la app sigue igual.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
```

- [ ] **Step 6: Comprobar sin conexión**

Run: `python -m http.server 8000`, abrir `http://localhost:8000` en Chrome.
Expected: F12 → Application → Manifest muestra "Juego Mental" con el icono y sin errores; Service Workers muestra `sw.js` activo. Recargar una vez, parar el servidor (Ctrl+C) y recargar: la app carga y se puede jugar. `node tests.js` sigue todo en ✅.

- [ ] **Step 7: Commit**

```bash
git add manifest.json icon.svg sw.js index.html main.js
git commit -m "PWA: manifest y funcionamiento sin conexión"
```
