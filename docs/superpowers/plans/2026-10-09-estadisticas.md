# Juego Mental — Plan de la fase B: estadísticas y progreso

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** Implementar `docs/superpowers/specs/2026-10-09-estadisticas-design.md`: historial de partidas con gráfica en la previa, entrenamiento diario con racha, pantalla 📊 con resumen, perfil por habilidad y récords.

**Arquitectura:** Toda la lógica es pura y vive en `games/estadisticas.js` (probada con `node tests.js`). `main.js` lee/guarda en `localStorage` (`historial:<id>`, `contador:partidas`, `contador:ms`) y dibuja la tarjeta de entrenamiento, la gráfica SVG y la pantalla 📊.

**Tecnología:** HTML + CSS + JavaScript (módulos ES), sin frameworks ni compilación.

## Restricciones globales

- Sin frameworks, sin dependencias, sin paso de compilación. Código simple y legible; nombres en español.
- `games/estadisticas.js` es puro: no toca `document`, `localStorage`, `navigator` ni la hora salvo por el valor por defecto de `fechaLocal`.
- Solo se anotan partidas terminadas (las de ✕ no). Sin `localStorage` todo sigue funcionando sin guardar.
- Historial: últimas 100 partidas por juego, cada una `{ fecha, cuando, puntos, ms }`.
- Habilidades y referencias exactas: Memoria←memoria 12; Cálculo←calculo 30; Atención←atencion 40; Lógica←series 20, sobra 20, puzzle 30; Reacción←rayo 250, topos 40.
- Categorías en orden: Clásicos, Lógica, Reacción.

## Mapa de archivos

| Archivo | Tarea | Qué |
|---|---|---|
| `games/estadisticas.js` | T1 (nuevo) | lógica pura |
| `tests.js` | T1 | pruebas |
| `sw.js` | T1 | + `games/estadisticas.js` |
| `main.js` | T2, T3, T4 | guardar partidas, gráfica, tarjeta, pantalla 📊 |
| `index.html` | T2, T3, T4 | `#previa-historial`, `#entreno`, `#final-entreno`, botón 📊, `#estadisticas` |
| `styles.css` | T2, T3, T4 | estilos de cada parte |

## Cómo probar

- `node tests.js`: todas ✅ (de 25 a 33).
- Navegador: `python -m http.server 8000` → `http://localhost:8000` (Ctrl+Shift+R). Para simular días pasados se puede escribir `historial:<id>` a mano en la consola con `localStorage.setItem`.

---

### Task 1: Lógica pura de estadísticas

**Files:**
- Create: `games/estadisticas.js`
- Modify: `tests.js`, `sw.js`

**Interfaces:**
- Produces (`games/estadisticas.js`):
  - `MAX_PARTIDAS = 100`
  - `anotar(historial, partida) → historial nuevo` (al final, recortado a 100; no modifica el original)
  - `fechaLocal(fecha = new Date()) → 'AAAA-MM-DD'` (hora local)
  - `diaAnterior('AAAA-MM-DD') → 'AAAA-MM-DD'`
  - `entrenoDelDia(fecha, categorias) → [id, id, id]`; `categorias` = `[[ids Clásicos], [ids Lógica], [ids Reacción]]`
  - `jugadosEn(fecha, historiales) → Set de ids`; `historiales` = `{ id: [partidas] }`
  - `entrenoCompleto(fecha, categorias, historiales) → boolean`
  - `racha(hoy, categorias, historiales) → número`
  - `mejorRacha(categorias, historiales) → número`
  - `entrenosCompletados(categorias, historiales) → número`
  - `nivel(puntos, referencia, menorEsMejor = false) → 0..100`
  - `perfil(juegos, historiales, habilidades) → [{ habilidad, valor }]` (`valor` 0..100 o `null`); `juegos` = `[{ id, habilidad, referencia, menorEsMejor? }]`
  - `puntosGrafica(valores, ancho, alto, menorEsMejor = false) → 'x,y x,y …'`

- [ ] **Step 1: Pruebas al final de `tests.js`**

```js
// --- estadisticas.js ---
import {
  anotar, fechaLocal, diaAnterior, entrenoDelDia, jugadosEn, entrenoCompleto,
  racha, mejorRacha, entrenosCompletados, nivel, perfil, puntosGrafica,
} from './games/estadisticas.js';

probar('estadísticas: anotar recorta a 100 y no modifica el original', () => {
  const h = Array.from({ length: 100 }, (_, i) => ({ puntos: i }));
  const nuevo = anotar(h, { puntos: 100 });
  assert(h.length === 100 && nuevo.length === 100, `${h.length} / ${nuevo.length}`);
  assert(nuevo[0].puntos === 1 && nuevo[99].puntos === 100);
  assert(anotar([], { puntos: 5 }).length === 1);
});

probar('estadísticas: fechas locales y día anterior', () => {
  assert(fechaLocal(new Date(2026, 0, 5, 23, 30)) === '2026-01-05');
  assert(diaAnterior('2026-03-01') === '2026-02-28');
  assert(diaAnterior('2026-01-01') === '2025-12-31');
  assert(diaAnterior('2026-10-09') === '2026-10-08');
});

// Categorías de prueba y un ayudante que completa el entrenamiento de un día.
const CATS = [['calculo', 'atencion', 'memoria'], ['series', 'sobra', 'puzzle'], ['rayo', 'topos']];
function completar(historiales, fecha) {
  for (const id of entrenoDelDia(fecha, CATS)) (historiales[id] ??= []).push({ fecha, cuando: 0, puntos: 1, ms: 0 });
  return historiales;
}

probar('estadísticas: entrenamiento del día fijo por fecha, uno por categoría, variado', () => {
  const a = entrenoDelDia('2026-10-09', CATS);
  assert(a.join() === entrenoDelDia('2026-10-09', CATS).join(), 'misma fecha, mismo resultado');
  assert(a.length === 3 && CATS.every((ids, i) => ids.includes(a[i])), `${a}`);
  const distintos = new Set();
  let dia = '2026-10-31';
  for (let i = 0; i < 30; i++, dia = diaAnterior(dia)) distintos.add(entrenoDelDia(dia, CATS).join());
  assert(distintos.size >= 5, `solo ${distintos.size} combinaciones en 30 días`);
});

probar('estadísticas: jugados y entrenamiento completo', () => {
  const h = completar({}, '2026-10-09');
  assert(entrenoCompleto('2026-10-09', CATS, h));
  assert(!entrenoCompleto('2026-10-08', CATS, h));
  const uno = entrenoDelDia('2026-10-09', CATS)[0];
  assert(jugadosEn('2026-10-09', { [uno]: [{ fecha: '2026-10-09' }] }).has(uno));
  assert(!entrenoCompleto('2026-10-09', CATS, { [uno]: [{ fecha: '2026-10-09' }] }), 'con uno solo no está completo');
});

probar('estadísticas: racha, mejor racha y entrenamientos completados', () => {
  const h = {};
  for (const f of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-06', '2026-10-07', '2026-10-08']) completar(h, f);
  assert(racha('2026-10-08', CATS, h) === 3, 'hoy completo: 06, 07, 08');
  assert(racha('2026-10-09', CATS, h) === 3, 'hoy sin hacer: cuenta hasta ayer');
  assert(racha('2026-10-10', CATS, h) === 0, 'ayer sin hacer: racha perdida');
  assert(racha('2026-10-04', CATS, h) === 3, '01, 02, 03');
  assert(mejorRacha(CATS, h) === 3);
  completar(h, '2026-10-09');
  assert(racha('2026-10-09', CATS, h) === 4);
  assert(mejorRacha(CATS, h) === 4);
  assert(entrenosCompletados(CATS, h) === 7);
  // Un día con partidas pero sin completar no suma ni corta la cuenta de días completos.
  (h.calculo ??= []).push({ fecha: '2026-10-05', cuando: 0, puntos: 1, ms: 0 });
  assert(entrenosCompletados(CATS, h) === 7 && mejorRacha(CATS, h) === 4);
  assert(racha('2026-10-01', CATS, {}) === 0 && mejorRacha(CATS, {}) === 0);
});

probar('estadísticas: nivel de una partida (0–100)', () => {
  assert(nivel(15, 30) === 50);
  assert(nivel(45, 30) === 100, 'tope 100');
  assert(nivel(500, 250, true) === 50, 'menor es mejor');
  assert(nivel(200, 250, true) === 100);
  assert(nivel(0, 30) === 0 && nivel(0, 250, true) === 0);
});

probar('estadísticas: perfil por habilidad', () => {
  const juegos = [
    { id: 'series', habilidad: 'Lógica', referencia: 20 },
    { id: 'puzzle', habilidad: 'Lógica', referencia: 30, menorEsMejor: true },
    { id: 'rayo', habilidad: 'Reacción', referencia: 250, menorEsMejor: true },
  ];
  const historiales = {
    // 7 partidas de Lógica mezcladas; cuentan las 5 más recientes por `cuando`.
    series: [10, 20, 30, 40].map((c, i) => ({ cuando: c, puntos: [0, 20, 10, 20][i] })), // niveles 0, 100, 50, 100
    puzzle: [5, 15, 25].map((c, i) => ({ cuando: c, puntos: [30, 60, 30][i] })), // niveles 100, 50, 100
    rayo: [],
  };
  // Por `cuando`: 5→100, 10→0, 15→50, 20→100, 25→100, 30→50, 40→100. Últimas 5: 50,100,100,50,100 → 80.
  const p = perfil(juegos, historiales, ['Lógica', 'Reacción', 'Memoria']);
  assert(p.map((x) => `${x.habilidad}:${x.valor}`).join() === 'Lógica:80,Reacción:null,Memoria:null', JSON.stringify(p));
});

probar('estadísticas: puntos de la gráfica (mejor arriba)', () => {
  assert(puntosGrafica([1, 3], 100, 40) === '0,40 100,0', 'mayor es mejor: el 3 arriba');
  assert(puntosGrafica([300, 200], 100, 40, true) === '0,40 100,0', 'menor es mejor: el 200 arriba');
  assert(puntosGrafica([7], 100, 40) === '0,20 100,20', 'una partida: plana a media altura');
  assert(puntosGrafica([5, 5, 5], 100, 40) === '0,20 50,20 100,20', 'todas iguales: plana');
  assert(puntosGrafica([], 100, 40) === '');
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `node tests.js`
Expected: error `Cannot find module ... games/estadisticas.js`.

- [ ] **Step 3: Crear `games/estadisticas.js`**

```js
// Estadísticas: historial, entrenamiento diario, rachas, perfil por habilidad y gráfica.
// Todo puro: recibe los datos y devuelve resultados; main.js lee/guarda y dibuja.

export const MAX_PARTIDAS = 100;

// Añade una partida ({ fecha, cuando, puntos, ms }) al final y se queda con las últimas 100.
export const anotar = (historial, partida) => [...historial, partida].slice(-MAX_PARTIDAS);

// Día local 'AAAA-MM-DD' (no UTC: a las 23:30 sigue siendo hoy).
export function fechaLocal(fecha = new Date()) {
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

export function diaAnterior(fecha) {
  const [a, m, d] = fecha.split('-').map(Number);
  return fechaLocal(new Date(a, m - 1, d - 1)); // Date ajusta solo el cambio de mes y de año
}

// Número fijo para un texto (hash FNV-1a): la misma fecha da siempre los mismos juegos.
function hash(texto) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

// Los 3 juegos del día: uno de cada categoría.
export const entrenoDelDia = (fecha, categorias) => categorias.map((ids, i) => ids[hash(`${fecha}#${i}`) % ids.length]);

// Juegos con al menos una partida terminada en esa fecha.
export const jugadosEn = (fecha, historiales) =>
  new Set(Object.keys(historiales).filter((id) => historiales[id].some((p) => p.fecha === fecha)));

export function entrenoCompleto(fecha, categorias, historiales) {
  const jugados = jugadosEn(fecha, historiales);
  return entrenoDelDia(fecha, categorias).every((id) => jugados.has(id));
}

// Días seguidos con el entrenamiento completo. Si hoy aún no está hecho, se cuenta desde ayer
// (la racha no se pierde hasta que acaba el día).
export function racha(hoy, categorias, historiales) {
  let dia = entrenoCompleto(hoy, categorias, historiales) ? hoy : diaAnterior(hoy);
  let dias = 0;
  while (entrenoCompleto(dia, categorias, historiales)) {
    dias++;
    dia = diaAnterior(dia);
  }
  return dias;
}

// Fechas (ordenadas) en las que el entrenamiento se completó.
function diasCompletos(categorias, historiales) {
  const fechas = new Set(Object.values(historiales).flat().map((p) => p.fecha));
  return [...fechas].sort().filter((f) => entrenoCompleto(f, categorias, historiales));
}

export function mejorRacha(categorias, historiales) {
  let mejor = 0;
  let actual = 0;
  let ultimo = null;
  for (const f of diasCompletos(categorias, historiales)) {
    actual = ultimo === diaAnterior(f) ? actual + 1 : 1;
    ultimo = f;
    mejor = Math.max(mejor, actual);
  }
  return mejor;
}

export const entrenosCompletados = (categorias, historiales) => diasCompletos(categorias, historiales).length;

// Qué tan cerca está una puntuación de la referencia de "muy bueno" (100) de su juego.
export function nivel(puntos, referencia, menorEsMejor = false) {
  if (puntos <= 0) return 0;
  return Math.round(Math.min(100, (menorEsMejor ? referencia / puntos : puntos / referencia) * 100));
}

// Para cada habilidad, la media del nivel de sus últimas 5 partidas (de cualquiera de sus juegos), o null.
export function perfil(juegos, historiales, habilidades) {
  return habilidades.map((habilidad) => {
    const niveles = juegos
      .filter((j) => j.habilidad === habilidad)
      .flatMap((j) => (historiales[j.id] ?? []).map((p) => ({ cuando: p.cuando, n: nivel(p.puntos, j.referencia, j.menorEsMejor) })))
      .sort((a, b) => a.cuando - b.cuando)
      .slice(-5)
      .map((x) => x.n);
    const valor = niveles.length ? Math.round(niveles.reduce((a, b) => a + b, 0) / niveles.length) : null;
    return { habilidad, valor };
  });
}

// Puntos "x,y" de la línea de la gráfica en un lienzo ancho×alto. La mejor puntuación queda arriba (y = 0).
// Con una sola partida o todas iguales, la línea es plana a media altura.
export function puntosGrafica(valores, ancho, alto, menorEsMejor = false) {
  if (!valores.length) return '';
  const lista = valores.length === 1 ? [valores[0], valores[0]] : valores;
  const min = Math.min(...lista);
  const max = Math.max(...lista);
  return lista.map((v, i) => {
    const x = Math.round((i / (lista.length - 1)) * ancho);
    let alturaRel = max === min ? 0.5 : (v - min) / (max - min); // 0 = peor, 1 = mejor (si mayor es mejor)
    if (menorEsMejor && max !== min) alturaRel = 1 - alturaRel;
    return `${x},${Math.round((1 - alturaRel) * alto)}`;
  }).join(' ');
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `node tests.js` → todo ✅ (33 pruebas).

- [ ] **Step 5: Añadir el archivo a `sw.js`**

Sustituir

```js
  'games/topos.js',
```

por

```js
  'games/topos.js', 'games/estadisticas.js',
```

- [ ] **Step 6: Commit**

```bash
git add games/estadisticas.js tests.js sw.js
git commit -m "Estadísticas: lógica pura (historial, entrenamiento diario, rachas, perfil, gráfica)"
```

---

### Task 2: Guardar partidas y gráfica en la previa

**Files:**
- Modify: `main.js`, `index.html`, `styles.css`

**Interfaces:**
- Consumes: `anotar`, `fechaLocal`, `puntosGrafica` de `games/estadisticas.js`.
- Produces (`main.js`): `leerHistorial(id) → [partidas]`, `historiales() → { id: [partidas] }`, `guardarPartida(id, partida)`, variable `inicio` (ms en que empezó el juego), `pintarHistorial(j)`. `JUEGOS` con `habilidad` y `referencia`.
- Produces (HTML): `#previa-historial`.

- [ ] **Step 1: `JUEGOS` con habilidad y referencia (`main.js`)**

Sustituir las 8 entradas de `JUEGOS` por:

```js
  { id: 'calculo', nombre: 'Cálculo', categoria: 'Clásicos', icono: '➕', color: 'rojo', habilidad: 'Cálculo', referencia: 30, instrucciones: 'Resuelve todas las operaciones que puedas en 60 segundos.', juego: calculo },
  { id: 'atencion', nombre: 'Atención', categoria: 'Clásicos', icono: '👁', color: 'azul', habilidad: 'Atención', referencia: 40, instrucciones: 'Toca el color de la tinta, no lo que dice la palabra.', juego: atencion },
  { id: 'memoria', nombre: 'Memoria', categoria: 'Clásicos', icono: '🧠', color: 'verde', habilidad: 'Memoria', referencia: 12, instrucciones: 'Mira la secuencia de colores y repítela. Cada ronda, uno más.', juego: memoria },
  { id: 'series', nombre: 'Series', categoria: 'Lógica', icono: '🔢', color: 'amarillo', habilidad: 'Lógica', referencia: 20, instrucciones: '¿Qué número sigue? Descubre la regla de cada serie. 60 segundos.', juego: series },
  { id: 'sobra', nombre: '¿Cuál sobra?', categoria: 'Lógica', icono: '🔍', color: 'rojo', habilidad: 'Lógica', referencia: 20, instrucciones: 'Tres números siguen una regla y uno no: toca el que sobra. 60 segundos.', juego: sobra },
  { id: 'puzzle', nombre: 'Puzzle', categoria: 'Lógica', icono: '🧩', color: 'azul', habilidad: 'Lógica', referencia: 30, unidad: 'movimientos', menorEsMejor: true, instrucciones: 'Ordena las fichas del 1 al 8 con los menos movimientos posibles.', juego: puzzle },
  { id: 'rayo', nombre: 'Rayo', categoria: 'Reacción', icono: '⚡', color: 'amarillo', habilidad: 'Reacción', referencia: 250, unidad: 'ms', menorEsMejor: true, instrucciones: 'Cuando se ponga verde, ¡toca! 5 intentos; cuenta tu tiempo medio.', juego: rayo },
  { id: 'topos', nombre: 'Topos', categoria: 'Reacción', icono: '🔨', color: 'verde', habilidad: 'Reacción', referencia: 40, instrucciones: 'Toca cada topo antes de que se esconda. Tocar una casilla vacía resta. 30 segundos.', juego: topos },
```

Y en el comentario de encima de los imports, sustituir

```js
// Cada juego: { id, nombre, categoria, icono, color, instrucciones, juego } y, si hace falta, `unidad`
```

por

```js
// Cada juego: { id, nombre, categoria, icono, color, habilidad, referencia, instrucciones, juego } y, si hace falta, `unidad`
// `habilidad` es la barra del perfil a la que cuenta y `referencia` la puntuación que vale 100 en esa barra.
```

- [ ] **Step 2: Imports, estado y guardado (`main.js`)**

Debajo de `import { sonar, callar, activo, alternar, puedeVibrar } from './games/efectos.js';` añadir:

```js
import { anotar, fechaLocal, puntosGrafica } from './games/estadisticas.js';
```

Sustituir

```js
let parar = null; // detiene el juego en curso (la devuelve start)
```

por

```js
let parar = null; // detiene el juego en curso (la devuelve start)
let inicio = 0; // cuándo empezó el juego en curso (tras la cuenta atrás), para medir su duración
```

Debajo de la línea `const conUnidad = ...` añadir:

```js
// Historial de partidas terminadas: `historial:<id>` = JSON [{ fecha, cuando, puntos, ms }]. Si está roto, vacío.
function leerHistorial(id) {
  try {
    return JSON.parse(leer('historial:' + id)) || [];
  } catch {
    return [];
  }
}

const historiales = () => Object.fromEntries(JUEGOS.map((j) => [j.id, leerHistorial(j.id)]));

// Anota la partida y suma a los contadores totales (que no se recortan con el historial).
function guardarPartida(id, partida) {
  guardar('historial:' + id, JSON.stringify(anotar(leerHistorial(id), partida)));
  guardar('contador:partidas', (Number(leer('contador:partidas')) || 0) + 1);
  guardar('contador:ms', (Number(leer('contador:ms')) || 0) + partida.ms);
}

// Gráfica de las últimas 20 partidas (la línea sube al mejorar) y media de las últimas 10.
function pintarHistorial(j) {
  const caja = $('previa-historial');
  const ultimas = leerHistorial(j.id).slice(-20).map((p) => p.puntos);
  if (!ultimas.length) return caja.replaceChildren(el('p', 'sin-datos', 'Aún no hay partidas'));
  const svg = 'http://www.w3.org/2000/svg';
  const grafica = document.createElementNS(svg, 'svg');
  grafica.setAttribute('viewBox', '0 0 200 50');
  grafica.setAttribute('preserveAspectRatio', 'none');
  grafica.setAttribute('class', 'grafica');
  grafica.setAttribute('role', 'img');
  grafica.setAttribute('aria-label', `Tus últimas ${ultimas.length} partidas`);
  const linea = document.createElementNS(svg, 'polyline');
  linea.setAttribute('points', puntosGrafica(ultimas, 200, 50, j.menorEsMejor));
  linea.style.stroke = `var(--${j.color})`;
  grafica.append(linea);
  const diez = ultimas.slice(-10);
  const media = Math.round(diez.reduce((a, b) => a + b, 0) / diez.length);
  caja.replaceChildren(grafica, el('p', '', `Media de las últimas ${diez.length}: ${conUnidad(j, media)}`));
}
```

En `abrirPrevia`, sustituir

```js
  $('previa-record').textContent = record ? conUnidad(j, record) : '—';
  mostrar('previa');
```

por

```js
  $('previa-record').textContent = record ? conUnidad(j, record) : '—';
  pintarHistorial(j);
  mostrar('previa');
```

En `jugar`, sustituir

```js
      tablero.replaceChildren();
      parar = actual.juego.start(tablero, terminar);
```

por

```js
      tablero.replaceChildren();
      inicio = Date.now();
      parar = actual.juego.start(tablero, terminar);
```

En `terminar`, sustituir

```js
function terminar(puntos) {
  parar = null;
```

por

```js
function terminar(puntos) {
  parar = null;
  guardarPartida(actual.id, { fecha: fechaLocal(), cuando: Date.now(), puntos, ms: Date.now() - inicio });
```

- [ ] **Step 3: `#previa-historial` en `index.html`**

Sustituir

```html
      <p>Récord: <span id="previa-record"></span></p>
```

por

```html
      <p>Récord: <span id="previa-record"></span></p>
      <div id="previa-historial"></div>
```

- [ ] **Step 4: Estilos al final de `styles.css`**

```css
/* Previa: gráfica de las últimas partidas */
#previa-historial {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

#previa-historial p { margin: 0; }

.grafica {
  width: 100%;
  max-width: 320px;
  height: 60px;
  overflow: visible;
}

.grafica polyline {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke; /* grosor fijo aunque el SVG se estire */
}

.sin-datos { opacity: 0.7; }
```

- [ ] **Step 5: Comprobar**

Run: `node tests.js` → 33 ✅.
En el navegador: la previa de un juego sin partidas dice "Aún no hay partidas". Terminar 2–3 partidas: la previa muestra la línea con el color del juego y "Media de las últimas N: X" (con unidad en Rayo/Puzzle). En `localStorage`: `historial:<id>` es una lista de `{ fecha, cuando, puntos, ms }` con `ms` ≈ duración real; `contador:partidas` sube 1 por partida. Una partida abandonada con ✕ no se anota.

- [ ] **Step 6: Commit**

```bash
git add main.js index.html styles.css
git commit -m "Guarda cada partida terminada y muestra la gráfica de progreso en la previa"
```

---

### Task 3: Tarjeta de entrenamiento de hoy y racha

**Files:**
- Modify: `main.js`, `index.html`, `styles.css`

**Interfaces:**
- Consumes: `historiales()`, `guardarPartida`, `abrirPrevia`, `confeti`, `sonar` (main.js); `fechaLocal`, `entrenoDelDia`, `jugadosEn`, `entrenoCompleto`, `racha` (estadisticas.js).
- Produces (`main.js`): `CATEGORIAS`, `idsPorCategoria`, `pintarEntreno()` (se llama al mostrar el menú y al arrancar).
- Produces (HTML): `#entreno`, `#final-entreno`.

- [ ] **Step 1: Imports y categorías (`main.js`)**

Sustituir

```js
import { anotar, fechaLocal, puntosGrafica } from './games/estadisticas.js';
```

por

```js
import { anotar, fechaLocal, puntosGrafica, entrenoDelDia, jugadosEn, entrenoCompleto, racha } from './games/estadisticas.js';
```

Debajo del cierre de la lista `JUEGOS` (la línea `];`) añadir:

```js
const CATEGORIAS = ['Clásicos', 'Lógica', 'Reacción'];
// Ids de los juegos de cada categoría, en el orden de CATEGORIAS (para el entrenamiento diario).
const idsPorCategoria = CATEGORIAS.map((c) => JUEGOS.filter((j) => j.categoria === c).map((j) => j.id));
```

Y en el bucle del menú, sustituir

```js
for (const categoria of ['Clásicos', 'Lógica', 'Reacción']) {
```

por

```js
for (const categoria of CATEGORIAS) {
```

- [ ] **Step 2: Dibujar la tarjeta (`main.js`)**

Debajo de la función `pintarHistorial` añadir:

```js
// Tarjeta "Entrenamiento de hoy": los 3 juegos del día (✓ si ya hay una partida hoy) y la racha.
function pintarEntreno() {
  const hoy = fechaLocal();
  const hist = historiales();
  const hechos = jugadosEn(hoy, hist);
  const ids = entrenoDelDia(hoy, idsPorCategoria);
  const titulo = el('div', 'entreno-titulo');
  titulo.append(el('span', '', 'Entrenamiento de hoy'), el('span', '', `🔥 ${racha(hoy, idsPorCategoria, hist)}`));
  const lista = el('div', 'entreno-juegos');
  for (const id of ids) {
    const j = JUEGOS.find((x) => x.id === id);
    const hecho = hechos.has(id);
    const b = el('button', hecho ? 'hecho' : '', `${hecho ? '✓' : '○'} ${j.icono} ${j.nombre}`);
    b.onclick = () => abrirPrevia(j);
    lista.append(b);
  }
  const partes = [titulo, lista];
  if (ids.every((id) => hechos.has(id))) partes.push(el('p', 'entreno-completo', '✓ ¡Entrenamiento completado!'));
  $('entreno').replaceChildren(...partes);
}
```

En `mostrar`, sustituir

```js
  $('btn-salir').hidden = id !== 'juego';
}
```

por

```js
  $('btn-salir').hidden = id !== 'juego';
  if (id === 'menu') pintarEntreno();
}
```

Y debajo del bucle que dibuja el menú (después de su `}` final) añadir:

```js
pintarEntreno();
```

- [ ] **Step 3: Celebrar al completar el entrenamiento (`main.js`)**

Sustituir el principio de `terminar` hasta `mostrar('final');` y el bloque de celebración:

```js
function terminar(puntos) {
  parar = null;
  guardarPartida(actual.id, { fecha: fechaLocal(), cuando: Date.now(), puntos, ms: Date.now() - inicio });
  const nuevo = esRecord(puntos, leerRecord(actual.id), actual.menorEsMejor);
  if (nuevo) guardar('record:' + actual.id, puntos);
  $('final-puntos').textContent = conUnidad(actual, puntos);
  $('final-record').hidden = !nuevo;
  mostrar('final');
  if (nuevo) {
    confeti();
    sonar('record');
  }
}
```

por

```js
function terminar(puntos) {
  parar = null;
  const hoy = fechaLocal();
  const entrenoAntes = entrenoCompleto(hoy, idsPorCategoria, historiales());
  guardarPartida(actual.id, { fecha: hoy, cuando: Date.now(), puntos, ms: Date.now() - inicio });
  // ¿Esta partida es la que completa el entrenamiento de hoy?
  const entrenoHoy = !entrenoAntes && entrenoCompleto(hoy, idsPorCategoria, historiales());
  const nuevo = esRecord(puntos, leerRecord(actual.id), actual.menorEsMejor);
  if (nuevo) guardar('record:' + actual.id, puntos);
  $('final-puntos').textContent = conUnidad(actual, puntos);
  $('final-record').hidden = !nuevo;
  $('final-entreno').hidden = !entrenoHoy;
  mostrar('final');
  if (nuevo || entrenoHoy) {
    confeti();
    sonar('record');
  }
}
```

- [ ] **Step 4: `index.html`**

Sustituir

```html
      <h1>Juego Mental</h1>
      <div id="lista-juegos"></div>
```

por

```html
      <h1>Juego Mental</h1>
      <div id="entreno"></div>
      <div id="lista-juegos"></div>
```

Y sustituir

```html
      <p id="final-record" hidden>¡Nuevo récord!</p>
```

por

```html
      <p id="final-record" hidden>¡Nuevo récord!</p>
      <p id="final-entreno" hidden>✓ ¡Entrenamiento de hoy completado!</p>
```

- [ ] **Step 5: Estilos al final de `styles.css`**

```css
/* Menú: tarjeta "Entrenamiento de hoy" */
#entreno {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 2px solid var(--acento);
  border-radius: 14px;
}

.entreno-titulo {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  font-weight: 900;
  text-transform: uppercase;
  color: var(--acento);
}

.entreno-juegos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.entreno-juegos button {
  font-size: 0.85rem;
  padding: 8px 4px;
}

.entreno-juegos button.hecho { opacity: 0.6; }

.entreno-completo,
#final-entreno {
  margin: 0;
  color: var(--ok);
  font-weight: 900;
}
```

- [ ] **Step 6: Comprobar**

Run: `node tests.js` → 33 ✅.
En el navegador (ambos temas): bajo el título del menú, la tarjeta "ENTRENAMIENTO DE HOY 🔥 0" con 3 juegos (uno de cada categoría) marcados ○. Tocar uno abre su previa. Terminar una partida de uno: al volver al menú sale con ✓. Terminar los tres: la pantalla final de la última dice "✓ ¡Entrenamiento de hoy completado!" con confeti y melodía; el menú muestra "✓ ¡Entrenamiento completado!" y 🔥 1. Recargar: sigue igual. Jugar otra vez un juego del día ya hecho no vuelve a celebrar.

- [ ] **Step 7: Commit**

```bash
git add main.js index.html styles.css
git commit -m "Tarjeta de entrenamiento de hoy con racha y celebración al completarlo"
```

---

### Task 4: Pantalla 📊 (resumen, perfil y récords)

**Files:**
- Modify: `main.js`, `index.html`, `styles.css`

**Interfaces:**
- Consumes: `historiales()`, `idsPorCategoria`, `leerRecord`, `conUnidad`, `mostrar` (main.js); `racha`, `mejorRacha`, `entrenosCompletados`, `perfil`, `fechaLocal` (estadisticas.js).
- Produces (`main.js`): `HABILIDADES`, `pintarEstadisticas()`; botón `#btn-estadisticas` visible solo en el menú.
- Produces (HTML): sección `#estadisticas` con `#estadisticas-contenido` y botón Menú.

- [ ] **Step 1: Imports y habilidades (`main.js`)**

Sustituir

```js
import { anotar, fechaLocal, puntosGrafica, entrenoDelDia, jugadosEn, entrenoCompleto, racha } from './games/estadisticas.js';
```

por

```js
import {
  anotar, fechaLocal, puntosGrafica, entrenoDelDia, jugadosEn, entrenoCompleto, racha,
  mejorRacha, entrenosCompletados, perfil,
} from './games/estadisticas.js';
```

Debajo de `const CATEGORIAS = ['Clásicos', 'Lógica', 'Reacción'];` añadir:

```js
const HABILIDADES = ['Memoria', 'Cálculo', 'Atención', 'Lógica', 'Reacción'];
```

- [ ] **Step 2: Dibujar la pantalla (`main.js`)**

Debajo de la función `pintarEntreno` añadir:

```js
// Pantalla 📊: resumen, perfil por habilidad (barras 0–100) y récords de todos los juegos.
function pintarEstadisticas() {
  const hist = historiales();
  const hoy = fechaLocal();
  const minutos = Math.round((Number(leer('contador:ms')) || 0) / 60000);
  const resumen = el('div', 'resumen');
  for (const [valor, texto] of [
    [Number(leer('contador:partidas')) || 0, 'partidas'],
    [`${minutos} min`, 'jugando'],
    [`🔥 ${racha(hoy, idsPorCategoria, hist)}`, 'racha actual'],
    [`🔥 ${mejorRacha(idsPorCategoria, hist)}`, 'mejor racha'],
    [entrenosCompletados(idsPorCategoria, hist), 'entrenamientos'],
  ]) {
    const dato = el('div', 'dato');
    dato.append(el('strong', '', valor), el('span', '', texto));
    resumen.append(dato);
  }

  const barras = el('div', 'perfil');
  for (const { habilidad, valor } of perfil(JUEGOS, hist, HABILIDADES)) {
    const fila = el('div', 'fila-perfil');
    const barra = el('div', 'barra');
    const relleno = el('div');
    relleno.style.width = `${valor ?? 0}%`;
    barra.append(relleno);
    fila.append(el('span', '', habilidad), barra, el('span', '', valor ?? 'Sin datos'));
    barras.append(fila);
  }

  const records = el('ul', 'records');
  for (const j of JUEGOS) {
    const r = leerRecord(j.id);
    records.append(el('li', '', `${j.icono} ${j.nombre}: ${r ? conUnidad(j, r) : '—'}`));
  }

  $('estadisticas-contenido').replaceChildren(
    resumen,
    el('h3', 'categoria', 'Perfil por habilidad'),
    barras,
    el('h3', 'categoria', 'Récords'),
    records,
  );
}
```

En `mostrar`, sustituir

```js
  $('btn-salir').hidden = id !== 'juego';
  if (id === 'menu') pintarEntreno();
}
```

por

```js
  $('btn-salir').hidden = id !== 'juego';
  $('btn-estadisticas').hidden = id !== 'menu';
  if (id === 'menu') pintarEntreno();
}
```

Debajo de la línea `for (const b of document.querySelectorAll('.btn-menu')) b.onclick = () => mostrar('menu');` añadir:

```js
$('btn-estadisticas').onclick = () => {
  pintarEstadisticas();
  mostrar('estadisticas');
};
```

- [ ] **Step 3: `index.html`**

Sustituir

```html
      <button id="btn-salir" aria-label="Salir al menú" hidden>✕</button>
```

por

```html
      <button id="btn-estadisticas" aria-label="Estadísticas">📊</button>
      <button id="btn-salir" aria-label="Salir al menú" hidden>✕</button>
```

Y debajo del cierre de la sección `#final` (`</section>` que sigue al botón Menú de la pantalla final) añadir:

```html

    <section id="estadisticas" hidden>
      <h2>Estadísticas</h2>
      <div id="estadisticas-contenido"></div>
      <button class="btn-menu">Menú</button>
    </section>
```

- [ ] **Step 4: Estilos al final de `styles.css`**

```css
/* Pantalla 📊 */
.resumen {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.dato {
  display: flex;
  flex-direction: column;
  padding: 8px 4px;
  border-radius: 12px;
  background: var(--superficie);
  box-shadow: var(--relieve);
}

[data-tema="oscuro"] .dato { border: 2px solid rgba(232, 236, 255, 0.4); }

.dato strong { font-size: 1.3rem; }
.dato span { font-size: 0.8rem; opacity: 0.75; }

.perfil {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fila-perfil {
  display: grid;
  grid-template-columns: 5.5rem 1fr 4.5rem;
  align-items: center;
  gap: 8px;
  text-align: left;
}

.fila-perfil span:last-child { font-size: 0.85rem; text-align: right; }

.barra {
  height: 12px;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.25);
  overflow: hidden;
}

.barra > div {
  height: 100%;
  border-radius: 6px;
  background: var(--acento);
}

.records {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  text-align: left;
  font-size: 0.95rem;
}
```

- [ ] **Step 5: Comprobar**

Run: `node tests.js` → 33 ✅.
En el navegador (ambos temas): en el menú aparece 📊 a la izquierda de la barra (no en previa/juego/final; jugando sigue el ✕). 📊 abre "Estadísticas": 5 recuadros (partidas, minutos, racha actual, mejor racha, entrenamientos), 5 barras de habilidad ("Sin datos" en las que no tienen partidas; con partidas, barra y número 0–100), y los 8 récords ("—" si no hay). Menú vuelve. Cabe a 390 px de ancho sin desbordar.

- [ ] **Step 6: Commit**

```bash
git add main.js index.html styles.css
git commit -m "Pantalla de estadísticas: resumen, perfil por habilidad y récords"
```
