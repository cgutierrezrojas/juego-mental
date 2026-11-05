# Fichas: bono del día y desafíos — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cambiar «🏦 La casa te presta 100» del 21 y el Bacará por un bono diario de +100 y fichas por desafíos diarios (Tu día, palabra del día, niveles diarios). Spec: `docs/superpowers/specs/2026-11-05-fichas-desafios-design.md`.

**Architecture:** reglas puras en `games/premios.js` (con pruebas); `app/premios.js` lee y guarda `cartas:premios` y `cartas:fichas` (y se queda con `leerFichas`, que hoy es privado de `app/cartas.js`); ganchos en `app/partida.js` y `app/palabras.js`; pantalla «sin fichas» en `app/cartas.js`.

**Tech Stack:** JS (módulos ES) sin compilación; `node tests.js`; Chrome por CDP desde el scratchpad.

## Global Constraints

- Rama `fichas-desafios` desde `master`.
- Textos y comentarios en español, con el estilo del código vecino.
- Commits con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Montos: Tu día **+100**, palabra del día **+50**, nivel diario **+10** (hasta 10 al día), tope por desafíos **250**, bono **+100** una vez al día (no cuenta en el tope). Fecha local (`fechaLocal()` de `games/estadisticas.js`).
- Las fichas nunca se compran. El anuncio (📺) **no** se implementa ahora.
- Los archivos del repo tienen fin de línea CRLF en la copia de trabajo: comprobar con grep que cada edición se aplicó.
- La prueba 'sw.js: versión al día' fallará hasta la última tarea (la hace el controlador).

---

### Task 1: Reglas puras (`games/premios.js`) y pruebas

**Files:**
- Create: `games/premios.js`
- Test: `tests.js` (sección nueva `// --- premios.js ---` al final, antes de cualquier prueba exclusiva de Node si la hay; seguir el formato `probar(nombre, fn)` / `assert`)

**Interfaces:**
- Produces: `MONTOS`, `TOPE`, `TOPE_DIARIOS`, `BONO`, `premio(registro, tipo, fecha)` → `{ registro, fichas }`, `bono(registro, fecha)` → `{ registro, fichas }`, `hoyDe(registro, fecha)` → `{ tudia, palabra, diarios, ganadas, bonoUsado }`. `tipo` ∈ `'tudia' | 'palabra' | 'diario'`. `registro` puede ser `{}` o `null` (nada guardado).

- [ ] **Step 1: Pruebas que fallan** (al final de `tests.js`, con su import):

```js
// --- premios.js ---
import { premio, bono, hoyDe, TOPE } from './games/premios.js';

probar('premios: montos y una vez al día', () => {
  let r = {};
  let p = premio(r, 'tudia', '2026-11-05');
  assert(p.fichas === 100, `tudia dio ${p.fichas}`);
  r = p.registro;
  assert(premio(r, 'tudia', '2026-11-05').fichas === 0, 'tudia dos veces');
  p = premio(r, 'palabra', '2026-11-05');
  assert(p.fichas === 50);
  r = p.registro;
  assert(premio(r, 'palabra', '2026-11-05').fichas === 0, 'palabra dos veces');
  const h = hoyDe(r, '2026-11-05');
  assert(h.tudia && h.palabra && h.ganadas === 150 && h.diarios === 0);
});

probar('premios: niveles diarios hasta 10 y tope de 250', () => {
  let r = {};
  let total = 0;
  for (let i = 0; i < 12; i++) {
    const p = premio(r, 'diario', '2026-11-05');
    total += p.fichas;
    r = p.registro;
  }
  assert(total === 100, `diarios dieron ${total}`);
  assert(hoyDe(r, '2026-11-05').diarios === 10);
  r = premio(r, 'tudia', '2026-11-05').registro; // 200
  const p = premio(r, 'palabra', '2026-11-05'); // solo caben 50
  assert(p.fichas === 50 && p.registro.ganadas === TOPE, `palabra dio ${p.fichas}`);
  const q = premio({ ...p.registro, hechos: [] }, 'tudia', '2026-11-05');
  assert(q.fichas === 0, 'pasado el tope no da nada');
});

probar('premios: día nuevo empieza de cero; el bono una vez al día y fuera del tope', () => {
  let r = premio({}, 'tudia', '2026-11-05').registro;
  let b = bono(r, '2026-11-05');
  assert(b.fichas === 100);
  r = b.registro;
  assert(bono(r, '2026-11-05').fichas === 0, 'bono dos veces');
  assert(hoyDe(r, '2026-11-05').bonoUsado && hoyDe(r, '2026-11-05').ganadas === 100, 'el bono no suma al tope');
  assert(premio(r, 'tudia', '2026-11-06').fichas === 100, 'otro día');
  assert(!hoyDe(r, '2026-11-06').bonoUsado && bono(r, '2026-11-06').fichas === 100, 'bono de otro día');
  assert(premio(null, 'palabra', '2026-11-06').fichas === 50, 'sin registro');
});
```

- [ ] **Step 2:** `node tests.js` → falla (no existe `games/premios.js`).
- [ ] **Step 3:** crear `games/premios.js`:

```js
// Fichas del casino (21 y Bacará) por desafíos del día y bono diario. Todo puro.
// Registro (`cartas:premios`): { fecha, ganadas, hechos: ['tudia', 'palabra'], diarios, bono: fecha en que se usó }.

export const MONTOS = { tudia: 100, palabra: 50, diario: 10 };
export const TOPE = 250; // fichas al día por desafíos (el bono va aparte)
export const TOPE_DIARIOS = 10; // niveles diarios que dan fichas cada día
export const BONO = 100;

// El registro de `fecha`: si es de otro día, empieza de cero (el bono guarda su propia fecha).
const delDia = (r, fecha) => (r?.fecha === fecha ? r : { fecha, ganadas: 0, hechos: [], diarios: 0, bono: r?.bono ?? null });

// Premio por un desafío cumplido: lo que cabe hasta el tope, una vez al día (los diarios, hasta TOPE_DIARIOS).
export function premio(registro, tipo, fecha) {
  const r = delDia(registro, fecha);
  const diario = tipo === 'diario';
  if (diario ? r.diarios >= TOPE_DIARIOS : r.hechos.includes(tipo)) return { registro: r, fichas: 0 };
  const fichas = Math.max(0, Math.min(MONTOS[tipo], TOPE - r.ganadas));
  return {
    registro: { ...r, ganadas: r.ganadas + fichas, hechos: diario ? r.hechos : [...r.hechos, tipo], diarios: r.diarios + (diario ? 1 : 0) },
    fichas,
  };
}

export function bono(registro, fecha) {
  const r = delDia(registro, fecha);
  return r.bono === fecha ? { registro: r, fichas: 0 } : { registro: { ...r, bono: fecha }, fichas: BONO };
}

// Lo de hoy, para la lista de desafíos.
export function hoyDe(registro, fecha) {
  const r = delDia(registro, fecha);
  return { tudia: r.hechos.includes('tudia'), palabra: r.hechos.includes('palabra'), diarios: r.diarios, ganadas: r.ganadas, bonoUsado: r.bono === fecha };
}
```

- [ ] **Step 4:** `node tests.js` → las 3 nuevas pasan (solo falla la de `sw.js`).
- [ ] **Step 5:** commit «Fichas: reglas de premios por desafíos y bono del día».

### Task 2: Dar los premios (`app/premios.js` y ganchos)

**Files:**
- Create: `app/premios.js`
- Modify: `app/cartas.js` (quitar `leerFichas` privada e importarla), `app/partida.js`, `app/palabras.js`

**Interfaces:**
- Consumes: `premio`, `bono`, `hoyDe` de Task 1.
- Produces: `leerFichas()` → `{ fichas, max }`; `darPremio(tipo)` → texto del aviso o `''`; `cobrarBono()` → fichas dadas (100 o 0); `desafiosDeHoy()` → `hoyDe(...)` de hoy.

- [ ] **Step 1:** crear `app/premios.js`:

```js
// 🪙 Fichas por desafíos y bono del día (reglas puras en games/premios.js).
import { guardar } from '../games/comun.js';
import { fechaLocal } from '../games/estadisticas.js';
import { premio, bono, hoyDe } from '../games/premios.js';
import { leerJSON } from './datos.js';

const NOMBRE = { tudia: 'completar Tu día', palabra: 'la palabra del día', diario: 'un nivel diario' };

// `cartas:fichas` = { fichas, max }; la primera vez salen de las que había en el 21.
export function leerFichas() {
  const v = leerJSON('cartas:21');
  return { fichas: v.fichas ?? 100, max: v.max ?? 100, ...leerJSON('cartas:fichas') };
}

function sumarFichas(n) {
  const f = leerFichas();
  f.fichas += n;
  f.max = Math.max(f.max, f.fichas);
  guardar('cartas:fichas', JSON.stringify({ fichas: f.fichas, max: f.max }));
}

// Apunta un desafío cumplido; devuelve el aviso («🪙 +50 fichas por la palabra del día») o '' si no da nada.
export function darPremio(tipo) {
  const { registro, fichas } = premio(leerJSON('cartas:premios'), tipo, fechaLocal());
  guardar('cartas:premios', JSON.stringify(registro));
  if (!fichas) return '';
  sumarFichas(fichas);
  return `🪙 +${fichas} fichas por ${NOMBRE[tipo]}`;
}

export function cobrarBono() {
  const { registro, fichas } = bono(leerJSON('cartas:premios'), fechaLocal());
  guardar('cartas:premios', JSON.stringify(registro));
  if (fichas) sumarFichas(fichas);
  return fichas;
}

export const desafiosDeHoy = () => hoyDe(leerJSON('cartas:premios'), fechaLocal());
```

- [ ] **Step 2: `app/cartas.js`.** Borra la función `leerFichas` (y su comentario) del bloque «Fichas de casino» e importa `import { leerFichas } from './premios.js';`. `guardarCasino` se queda igual.
- [ ] **Step 3: `app/partida.js`.** Importa `import { darPremio } from './premios.js';`. En `terminar(puntos)`:
  - Después de `const entrenoHoy = …` declara `const premios = [];` y en `if (entrenoHoy) ligaAnotar('entreno');` añade el premio: `if (entrenoHoy) { ligaAnotar('entreno'); premios.push(darPremio('tudia')); }`.
  - En el bloque del diario, **antes** de `dia.estrellas[E.jugando.diario] = Math.max(…)`: `if (conseguidas > 0 && !(dia.estrellas[E.jugando.diario] > 0)) premios.push(darPremio('diario'));` (solo la primera vez que se supera ese diario).
  - Donde se pintan los logros, une los avisos:

```js
  const logros = apuntarLogros();
  const avisos = [...logros.map((l) => `🏅 ¡Logro desbloqueado! ${l.icono} ${l.nombre}`), ...premios.filter(Boolean)];
  $('final-logros').textContent = avisos.join('\n');
  $('final-logros').hidden = !avisos.length;
  celebrar ||= logros.length > 0;
```

- [ ] **Step 4: `app/palabras.js`.** Importa `import { darPremio } from './premios.js';`. En `finDia(hoy)`, después de `resumenDia(hoy);`:

```js
  const premioPalabra = acerto ? darPremio('palabra') : '';
  if (premioPalabra) $('palabras-aviso').textContent += ` ${premioPalabra}`;
```

- [ ] **Step 5:** `node --input-type=module --check < archivo` para los 4 archivos; `node tests.js` (solo falla `sw.js`).
- [ ] **Step 6:** commit «Fichas: se ganan al completar Tu día, la palabra del día y niveles diarios».

### Task 3: Pantalla «sin fichas»

**Files:**
- Modify: `app/cartas.js` (`pintarApuesta`), `app/inicio.js` (exportar `abrirMentales`)

**Interfaces:**
- Consumes: `cobrarBono()`, `desafiosDeHoy()`, `leerFichas()` de Task 2; `TOPE`, `MONTOS`, `TOPE_DIARIOS` de `games/premios.js`; `abrirJuegoPalabras(id)` de `app/palabras.js`; `abrirMentales(selector)` de `app/inicio.js` (hoy privada: añade `export`).

- [ ] **Step 1:** en `app/inicio.js`, `function abrirMentales(selector)` → `export function abrirMentales(selector)`.
- [ ] **Step 2:** en `app/cartas.js` importa `cobrarBono, desafiosDeHoy` (junto a `leerFichas`) de `./premios.js`, `{ TOPE, MONTOS, TOPE_DIARIOS }` de `../games/premios.js`, `{ abrirMentales }` de `./inicio.js` y `{ abrirJuegoPalabras }` de `./palabras.js` (las dependencias circulares solo se usan al pulsar, no al cargar). Reemplaza el bloque `if (j.fichas < 5) { … }` de `pintarApuesta` por:

```js
  if (j.fichas < 5) {
    const hoy = desafiosDeHoy();
    const bonoBtn = boton(hoy.bonoUsado ? '🎁 Bono del día: vuelve mañana' : `🎁 Bono del día +${100}`, 'color', () => {
      j.fichas += cobrarBono();
      j.max = Math.max(j.max, j.fichas);
      j.apuesta = 10;
      guardarJ();
      repintar();
    });
    bonoBtn.disabled = hoy.bonoUsado;
    // Cada desafío: hecho (✓) o un botón para ir a jugarlo.
    const desafio = (hecho, texto, ir) => (hecho ? el('p', 'sin-datos', `✓ ${texto}`) : boton(`🎯 ${texto}`, '', ir));
    return pantalla(marcadorFichas(j), [
      cabeza[0],
      el('p', '', 'Te quedaste sin fichas. Gana más:'),
      el('h3', 'categoria', '🎯 Desafíos de hoy'),
      desafio(hoy.tudia, `☀️ Tu día completo: +${MONTOS.tudia}`, () => abrirMentales('#entreno')),
      desafio(hoy.palabra, `🔤 Palabra del día: +${MONTOS.palabra}`, () => abrirJuegoPalabras('palabra')),
      desafio(hoy.diarios >= TOPE_DIARIOS, `📅 Niveles diarios (${hoy.diarios}/${TOPE_DIARIOS}): +${MONTOS.diario} cada uno`, () => abrirMentales()),
      el('p', 'sin-datos', `Hoy llevas ${hoy.ganadas} de ${TOPE} fichas por desafíos.`),
    ], [bonoBtn, boton('Salir', '', abrirCartas)]);
  }
```

  Usa la constante `BONO` de `games/premios.js` en vez del `100` literal del texto del bono (impórtala junto a las otras). Ajusta a las firmas reales de `pantalla(marcador, contenido, botones)` y `boton(texto, clase, alPulsar)` de `app/cartas.js` (léelas antes) — si `pantalla` no acepta botones en el contenido, mueve los botones de desafío a la lista de botones manteniendo el mismo orden visual.
- [ ] **Step 3:** comprueba la sintaxis (`node --input-type=module --check`) y `node tests.js` (solo falla `sw.js`).
- [ ] **Step 4:** commit «Fichas: sin fichas, bono del día y desafíos de hoy en vez del préstamo de la casa».

### Task 4: Prueba en Chrome, versión y publicación (controlador)

- [ ] Script CDP en el scratchpad: dejar `cartas:fichas` en `{ fichas: 0, max: 100 }`, abrir el 21 → ver bono y desafíos → bono +100 → apostar hasta quedar en 0 (o volver a poner 0) → bono desactivado → «🔤 Palabra del día» abre la palabra → resolverla (la solución sale de `games/palabra.js` `palabraDelDia`) → aviso «🪙 +50» y saldo +50 → volver al 21: ✓ en la palabra. Claro y oscuro a 390 px, 0 errores de consola.
- [ ] `sw.js` VERSION al día, `node tests.js` todo ✅, ff-merge a `master`, push, comprobar el despliegue y actualizar la memoria.
