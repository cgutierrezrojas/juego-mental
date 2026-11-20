# Ronda 6 🏆 Competencia — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sección nueva «🏆 Competencia» con el 🕹️ Desafío de hoy (un juego del Arcade al día, misma partida para todos, 3 intentos,
ranking del día, 🪙 30 fichas) y el 🏆 Torneo de la semana (un juego del Arcade o de Mentales por semana, intentos ilimitados, ranking
semanal y premios para el podio).

**Architecture:** Reglas puras en `games/competencia.js` (qué juego toca, intentos, mejoras, premios). La pantalla está en
`app/competencia.js`. Para jugar se reusan la pantalla del Arcade (`abrirJuegoArcade` con un objeto `competencia` de enganches) y la
partida de Mentales (`E.enCompetencia`, como `E.enDuelo`). Los rankings van en Firestore: `diario/{fecha}_arcade/jugadores/{uid}` y
`torneo/{semana}/jugadores/{uid}`.

**Tech Stack:** JS vanilla con módulos ES, sin compilación; Firebase (Firestore); pruebas con `node tests.js`; emulador de Firestore en
el scratchpad (`fb-copia`).

Spec: `docs/superpowers/specs/2026-11-20-competencia-ronda6-design.md`.

**Precisiones sobre el spec** (se aplican en este plan):
1. «Menos es mejor» vale para `puzzle` **y** `rayo` (Rayo se mide en ms y `menorEsMejor: true` en app/juegos.js). Están en
   `MENOS_ES_MEJOR`.
2. En las reglas del desafío, `intentos` tiene que **subir** (`>` en vez de `== +1`), y el create acepta de 1 a 3. Así un intento
   abandonado (se cerró la app) no bloquea los siguientes. El tope sigue siendo 3.
3. Los 30 fichas los da `darPremio('arcadedia')` al terminar cada intento. Es idempotente por día, así que solo paga la primera vez.

## Global Constraints

- Todo el texto visible en español (es-CL neutro). Los comentarios del código también, siguiendo el estilo de los archivos vecinos.
- Sin dependencias nuevas ni paso de compilación.
- `sw.js`: cada archivo nuevo va en `ARCHIVOS`, y `VERSION` es la huella que pide `node tests.js`. Si la prueba falla, pon exactamente
  el valor que imprime (`pon const VERSION = '…'; en sw.js`).
- `node tests.js` tiene que quedar con todos ✅ (hoy son 164) al final de cada tarea.
- Commits: `git -c user.email=203862735+cgutierrezrojas@users.noreply.github.com commit -m "…"`, con el mensaje terminado en
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- No hagas commit de `app-android/app/capacitor.build.gradle` ni de `app-android/capacitor.settings.gradle` (si aparecen cambiados,
  `git checkout -- <archivo>`). No leas ni toques `android/` ni `app-android/keystore.properties`.
- No levantes servidores http (`python -m http.server`): las pruebas en el navegador las hace el controlador.
- Juegos del desafío: `JUEGO_DIA = ['serpiente', 'saltar', 'autos', 'ladrillos', 'bloques']`; índice = días desde 2026-11-20 mod 5.
- Juegos del torneo: `JUEGOS_TORNEO = ['serpiente', 'calculo', 'saltar', 'atencion', 'autos', 'memoria', 'ladrillos', 'series',
  'bloques', 'sobra', 'puzzle', 'rayo', 'topos']`; índice = semanas desde el lunes 2026-11-16 mod 13.
- Semillas: desafío `semillaDelDia(fecha, 'arcade')`; torneo del Arcade `semillaDelDia(semana, 'torneo')` (de `games/minas.js`).
  Los Mentales del torneo se juegan en modo Normal, dificultad Normal, sin semilla.
- 3 intentos por día; el intento cuenta al empezar. Torneo con intentos ilimitados; cuenta la mejor marca.
- Las partidas de la competencia no tocan el récord normal del juego. Sí suman a la liga (`ligaAnotar('partida', …)`, que ya hacen las
  pantallas de juego).
- Premios del torneo: 🥇 500, 🥈 300, 🥉 150 fichas y +1 en `perfil:torneos` ({ oro, plata, bronce }); 25 por participar. No cuentan
  para el `TOPE` diario (se suman con `sumarFichas`). Desafío: 🪙 30 (`MONTOS.arcadedia`, sí cuenta para el `TOPE`).
- Claves locales: `compe:dia` = { fecha, intentos, mejor, pendiente? }, `compe:torneo` = { semana, juego, mejor, partidas, pendiente? },
  `compe:premio` = semana ya revisada, `perfil:torneos`.

---

### Task 1: Reglas puras de la competencia

**Files:**
- Create: `games/competencia.js`
- Modify: `games/premios.js` (MONTOS), `app/premios.js` (NOMBRE), `games/copia.js` (PREFIJOS), `sw.js` (ARCHIVOS y VERSION)
- Test: `tests.js` (al final)

**Interfaces:**
- Produces (`games/competencia.js`): `JUEGO_DIA`, `JUEGOS_TORNEO`, `MENOS_ES_MEJOR`, `INTENTOS` (3), `PREMIOS_TORNEO` ([500, 300, 150]),
  `POR_PARTICIPAR` (25), `haceDias(fecha, n) → 'AAAA-MM-DD'`, `juegoDelDia(fecha) → id`, `juegoDeLaSemana(fecha) → id`,
  `anotarIntento(registro, fecha) → registro | null`, `quedan(registro, fecha) → n`, `anotarMarca(registro, valor) → registro`,
  `mejora(juego, nuevo, viejo) → bool`, `premioTorneo(puesto, participo) → fichas`, `sumarMedalla(torneos, puesto) → torneos`.
- Produces: `MONTOS.arcadedia = 30`; `esClaveDelJuego('compe:…') === true`.

- [ ] **Step 1: Escribe las pruebas (al final de `tests.js`)**

```js
// --- competencia.js (🏆 Competencia) ---
import * as co from './games/competencia.js';
import * as prem6 from './games/premios.js';
import * as copia6 from './games/copia.js';
import * as juegos6 from './app/juegos.js';

probar('competencia: juego del día rota cada día desde el 20-11-2026', () => {
  assert(co.juegoDelDia('2026-11-20') === 'serpiente' && co.juegoDelDia('2026-11-21') === 'saltar' && co.juegoDelDia('2026-11-24') === 'bloques');
  assert(co.juegoDelDia('2026-11-25') === 'serpiente' && co.juegoDelDia('2026-11-19') === 'bloques', 'da la vuelta (también hacia atrás)');
  assert(co.JUEGO_DIA.every((id) => juegos6.JUEGOS_ARCADE.some((j) => j.id === id)), 'todos del Arcade');
});
probar('competencia: juego de la semana cambia cada lunes desde el 16-11-2026', () => {
  assert(co.juegoDeLaSemana('2026-11-16') === 'serpiente' && co.juegoDeLaSemana('2026-11-22') === 'serpiente', 'lunes a domingo');
  assert(co.juegoDeLaSemana('2026-11-23') === 'calculo' && co.juegoDeLaSemana('2026-11-15') === 'topos', 'semana siguiente y anterior');
  assert(co.juegoDeLaSemana(co.haceDias('2026-11-16', -7 * 13)) === 'serpiente', 'vuelta de 13 semanas');
  assert(co.juegoDeLaSemana('2027-01-04') === 'series', 'cruza el año (7 semanas después)');
  assert(co.haceDias('2026-11-23', 7) === '2026-11-16' && co.haceDias('2026-01-01', 1) === '2025-12-31');
  assert(co.JUEGOS_TORNEO.every((id) => juegos6.INFO_JUEGOS[id]), 'todos existen');
});
probar('competencia: 3 intentos por día y la mejor marca', () => {
  let r = null;
  for (let i = 1; i <= 3; i++) {
    r = co.anotarIntento(r, '2026-11-20');
    assert(r.intentos === i && r.fecha === '2026-11-20', `intento ${i}`);
    r = co.anotarMarca(r, [50, 20, 80][i - 1]);
  }
  assert(r.mejor === 80 && co.quedan(r, '2026-11-20') === 0);
  assert(co.anotarIntento(r, '2026-11-20') === null, 'no hay cuarto');
  const otro = co.anotarIntento(r, '2026-11-21');
  assert(otro.intentos === 1 && otro.mejor === null && co.quedan(r, '2026-11-21') === 3, 'día nuevo');
  assert(co.anotarMarca(co.anotarIntento(null, '2026-11-20'), 0).mejor === 0, '0 es marca en el desafío');
});
probar('competencia: mejora con «menos es mejor» en puzzle y rayo', () => {
  assert(co.mejora('autos', 10, null) && co.mejora('autos', 11, 10) && !co.mejora('autos', 10, 10) && !co.mejora('autos', 9, 10));
  assert(co.mejora('puzzle', 30, null) && co.mejora('puzzle', 29, 30) && !co.mejora('puzzle', 31, 30));
  assert(co.mejora('rayo', 250, 300) && !co.mejora('rayo', 300, 250));
  assert(!co.mejora('autos', 0, null) && !co.mejora('puzzle', 0, 30), '0 no es marca en el torneo');
});
probar('competencia: premios del torneo y medallero', () => {
  assert([1, 2, 3].map((p) => co.premioTorneo(p, true)).join() === '500,300,150');
  assert(co.premioTorneo(0, true) === 25 && co.premioTorneo(0, false) === 0 && co.premioTorneo(4, true) === 25);
  let t = co.sumarMedalla(undefined, 1);
  t = co.sumarMedalla(co.sumarMedalla(co.sumarMedalla(t, 3), 1), 0);
  assert(t.oro === 2 && t.plata === 0 && t.bronce === 1);
});
probar('competencia: 30 fichas por el desafío, una vez al día; claves compe: en la copia', () => {
  const a = prem6.premio(null, 'arcadedia', '2026-11-20');
  assert(a.fichas === 30 && prem6.premio(a.registro, 'arcadedia', '2026-11-20').fichas === 0);
  assert(copia6.esClaveDelJuego('compe:dia') && copia6.esClaveDelJuego('compe:torneo') && copia6.esClaveDelJuego('compe:premio'));
});
```

- [ ] **Step 2: Comprueba que fallan**

Run: `node tests.js`
Expected: error al importar `./games/competencia.js` (no existe).

- [ ] **Step 3: Crea `games/competencia.js`**

```js
// 🏆 Competencia: qué juego toca en el desafío de hoy y en el torneo de la semana, intentos, mejoras y premios. Todo puro.
// `compe:dia` = { fecha, intentos, mejor }; `compe:torneo` = { semana, juego, mejor, partidas }; `perfil:torneos` = { oro, plata, bronce }.

export const JUEGO_DIA = ['serpiente', 'saltar', 'autos', 'ladrillos', 'bloques'];
// 5 del Arcade intercalados con los 8 Mentales originales.
export const JUEGOS_TORNEO = ['serpiente', 'calculo', 'saltar', 'atencion', 'autos', 'memoria', 'ladrillos', 'series', 'bloques', 'sobra', 'puzzle', 'rayo', 'topos'];
export const MENOS_ES_MEJOR = ['puzzle', 'rayo'];
export const INTENTOS = 3;
export const PREMIOS_TORNEO = [500, 300, 150];
export const POR_PARTICIPAR = 25;

const DIA = 86400000;
const utc = (fecha) => {
  const [a, m, d] = fecha.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
};
const vuelta = (n, largo) => ((n % largo) + largo) % largo;
const diasDesde = (fecha, inicio) => Math.round((utc(fecha) - utc(inicio)) / DIA);
export const haceDias = (fecha, n) => new Date(utc(fecha) - n * DIA).toISOString().slice(0, 10);

export const juegoDelDia = (fecha) => JUEGO_DIA[vuelta(diasDesde(fecha, '2026-11-20'), JUEGO_DIA.length)];
// El 16-11-2026 es lunes: cada 7 días desde él empieza una semana (ISO) nueva.
export const juegoDeLaSemana = (fecha) => JUEGOS_TORNEO[vuelta(Math.floor(diasDesde(fecha, '2026-11-16') / 7), JUEGOS_TORNEO.length)];

// El registro de `fecha` (si es de otro día, empieza de cero).
const delDia = (r, fecha) => (r?.fecha === fecha ? r : { fecha, intentos: 0, mejor: null });
// Gasta un intento al empezar; null si ya no quedan.
export function anotarIntento(registro, fecha) {
  const r = delDia(registro, fecha);
  return r.intentos >= INTENTOS ? null : { ...r, intentos: r.intentos + 1 };
}
export const quedan = (registro, fecha) => INTENTOS - delDia(registro, fecha).intentos;
export const anotarMarca = (registro, valor) => ({ ...registro, mejor: registro.mejor == null ? valor : Math.max(registro.mejor, valor) });

// ¿`nuevo` mejora la marca del torneo `viejo` (null = sin marca)? 0 no es marca.
export function mejora(juego, nuevo, viejo) {
  if (!(nuevo > 0)) return false;
  if (viejo == null) return true;
  return MENOS_ES_MEJOR.includes(juego) ? nuevo < viejo : nuevo > viejo;
}

// Fichas por el torneo de la semana pasada: `puesto` 1–3 (0 = fuera del podio).
export const premioTorneo = (puesto, participo) => PREMIOS_TORNEO[puesto - 1] ?? (participo ? POR_PARTICIPAR : 0);
export function sumarMedalla(torneos, puesto) {
  const t = { oro: 0, plata: 0, bronce: 0, ...torneos };
  const k = ['oro', 'plata', 'bronce'][puesto - 1];
  if (k) t[k]++;
  return t;
}
```

- [ ] **Step 4: Montos, nombres y prefijos**

`games/premios.js`:
```js
export const MONTOS = { tudia: 100, palabra: 50, diario: 10, arcadedia: 30 };
```
`app/premios.js`:
```js
const NOMBRE = { tudia: 'completar Tu día', palabra: 'la palabra del día', diario: 'un nivel diario', arcadedia: 'el desafío de hoy' };
```
`games/copia.js`: añade `'compe:'` al final de `PREFIJOS`.

`sw.js`: añade `'games/competencia.js'` al final de `ARCHIVOS`.

- [ ] **Step 5: Corre las pruebas**

Run: `node tests.js`
Expected: las 6 nuevas ✅. Solo falla «sw.js: versión al día con los archivos»: pon en `sw.js` la `VERSION` que imprime y vuelve a
correr hasta que todo esté ✅ (170).

- [ ] **Step 6: Commit**

```bash
git add games/competencia.js games/premios.js app/premios.js games/copia.js sw.js tests.js
git -c user.email=203862735+cgutierrezrojas@users.noreply.github.com commit -m "Competencia: reglas puras del desafío y el torneo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Firestore — reglas, nube y borrado

**Files:**
- Modify: `firestore.rules`, `games/nube.js`
- Test: `C:\Users\ADMIN\AppData\Local\Temp\claude\1c7c5dcd270f9de4\108c02ba-0e81-45cd-86a7-284219213cd5\scratchpad\fb-copia\prueba-compe.mjs`
  (nuevo, fuera del repo)

**Interfaces:**
- Consumes: nada de la Task 1.
- Produces (`games/nube.js`): `guardarTorneo(semana, uid, fila)`, `leerTorneo(semana, uid) → fila | null`,
  `topTorneo(semana, menorEsMejor, cuantos = 20) → [{ uid, ... }]`, `puestoTorneo(semana, valor, menorEsMejor) → n`. El desafío usa las
  funciones de siempre (`guardarDiario`, `leerDiario`, `topDiario`, `puestoDiario`) con `dia = '{fecha}_arcade'`.
  Las filas del desafío son `{ apodo, valor, intentos, juego, actualizado, avatar, marco, nivel }` y las del torneo
  `{ apodo, valor, juego, actualizado, avatar, marco, nivel }`.

- [ ] **Step 1: Reglas**

En `firestore.rules`, cambia todo el `match /diario/{dia}/jugadores/{uid} { … }` (y su comentario) por:

```
    // 📅 Del día. Puzzles (`{fecha}_{sudoku|minas}`): cada uno crea su fila una sola vez (un intento); Sudoku `valor` = segundos,
    // Buscaminas `valor` = puntaje. 🕹️ Desafío del Arcade (`{fecha}_arcade`): hasta 3 intentos; se crea con 1–3 y cada
    // actualización sube `intentos`, no baja `valor` (la mejor marca) ni cambia `juego`.
    match /diario/{dia}/jugadores/{uid} {
      allow read: if request.auth != null;
      allow delete: if request.auth != null && (request.auth.uid == uid || esAdmin());
      allow create: if request.auth != null && request.auth.uid == uid && !baneado()
        && (puzzleDiaValido(dia, request.resource.data) || desafioValido(dia, request.resource.data));
      allow update: if request.auth != null && request.auth.uid == uid && !baneado()
        && desafioValido(dia, request.resource.data)
        && request.resource.data.intentos > resource.data.intentos
        && request.resource.data.valor >= resource.data.valor
        && request.resource.data.juego == resource.data.juego;
    }

    // 🏆 Torneo de la semana (`AAAA-Www`): cada uno escribe solo su fila y solo para mejorarla (en puzzle y rayo, menos es mejor).
    match /torneo/{semana}/jugadores/{uid} {
      allow read: if request.auth != null;
      allow delete: if request.auth != null && (request.auth.uid == uid || esAdmin());
      allow create: if request.auth != null && request.auth.uid == uid && !baneado() && torneoValido(semana, request.resource.data);
      allow update: if request.auth != null && request.auth.uid == uid && !baneado() && torneoValido(semana, request.resource.data)
        && request.resource.data.juego == resource.data.juego
        && ((request.resource.data.juego in ['puzzle', 'rayo'] && request.resource.data.valor < resource.data.valor)
          || (!(request.resource.data.juego in ['puzzle', 'rayo']) && request.resource.data.valor > resource.data.valor));
    }
```

Junto a las demás funciones (por ejemplo, después de `adornoValido`), añade:

```
    // Apodo, avatar y hora de las filas del día y del torneo.
    function filaConApodo(f) {
      return adornoValido(f) && f.apodo is string && f.apodo.size() >= 2 && f.apodo.size() <= 20 && f.actualizado is int;
    }

    function puzzleDiaValido(dia, f) {
      return dia.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}_(sudoku|minas)$')
        && f.keys().hasOnly(['apodo', 'valor', 'actualizado', 'avatar', 'marco', 'nivel'])
        && filaConApodo(f) && f.valor is int
        && ((dia.matches('.*_sudoku$') && f.valor >= 60 && f.valor <= 86400)
          || (dia.matches('.*_minas$') && f.valor >= 0 && f.valor <= 100000));
    }

    function desafioValido(dia, f) {
      return dia.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}_arcade$')
        && f.keys().hasOnly(['apodo', 'valor', 'intentos', 'juego', 'actualizado', 'avatar', 'marco', 'nivel'])
        && filaConApodo(f)
        && f.valor is int && f.valor >= 0 && f.valor <= 10000000
        && f.intentos is int && f.intentos >= 1 && f.intentos <= 3
        && f.juego in ['serpiente', 'saltar', 'autos', 'ladrillos', 'bloques'];
    }

    // Mismos juegos que JUEGOS_TORNEO en games/competencia.js; el tope es el de los duelos.
    function torneoValido(semana, f) {
      return semana.matches('^[0-9]{4}-W[0-9]{2}$')
        && f.keys().hasOnly(['apodo', 'valor', 'juego', 'actualizado', 'avatar', 'marco', 'nivel'])
        && filaConApodo(f)
        && f.juego in ['serpiente', 'calculo', 'saltar', 'atencion', 'autos', 'memoria', 'ladrillos', 'series', 'bloques', 'sobra', 'puzzle', 'rayo', 'topos']
        && f.valor is int && f.valor >= 1 && f.valor <= topes()[f.juego];
    }
```

- [ ] **Step 2: Prueba en el emulador (escríbela)**

Crea `prueba-compe.mjs` en el `fb-copia` del scratchpad (ruta completa en **Files**), con el mismo arranque que `prueba-diario.mjs`
(léelo: `initializeTestEnvironment` con `readFileSync('firestore.rules')`, admin `uidAdmin`, baneado `uidMalo`, helper `t`):

```js
// Reglas del 🕹️ desafío (`diario/{fecha}_arcade`) y del 🏆 torneo (`torneo/{semana}`) en el emulador de Firestore.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const env = await initializeTestEnvironment({
  projectId: 'demo-palrato',
  firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
});
const A = 'uidAna', B = 'uidBeto', MALO = 'uidMalo';
await env.withSecurityRulesDisabled(async (c) => {
  await setDoc(doc(c.firestore(), 'baneados', MALO), { apodo: 'Malo', cuando: 1 });
  await setDoc(doc(c.firestore(), 'admins', 'uidAdmin'), { si: true });
});
const fa = env.authenticatedContext(A).firestore(), fb = env.authenticatedContext(B).firestore();
const fm = env.authenticatedContext(MALO).firestore(), fadm = env.authenticatedContext('uidAdmin').firestore();
let ok = 0, mal = 0;
const t = async (nombre, p, debe) => {
  try { await (debe ? assertSucceeds(p) : assertFails(p)); ok++; console.log('✅', nombre); } catch (e) { mal++; console.log('❌', nombre, e.message); }
};
const D = '2026-11-20_arcade', W = '2026-W47';
const fd = (f, dia, uid) => doc(f, 'diario', dia, 'jugadores', uid);
const ft = (f, semana, uid) => doc(f, 'torneo', semana, 'jugadores', uid);
const dia = (valor, intentos, extra = {}) => ({ apodo: 'Ana', valor, intentos, juego: 'serpiente', actualizado: Date.now(), avatar: '🙂', marco: 'ninguno', nivel: 3, ...extra });
const tor = (valor, juego = 'autos', extra = {}) => ({ apodo: 'Ana', valor, juego, actualizado: Date.now(), avatar: '🙂', marco: 'ninguno', nivel: 3, ...extra });

// 🕹️ Desafío
await t('desafío: crear con intento 1', setDoc(fd(fa, D, A), dia(50, 1)), true);
await t('desafío: intento 2 sin mejorar (mismo valor)', setDoc(fd(fa, D, A), dia(50, 2)), true);
await t('desafío: repetir intento 2', setDoc(fd(fa, D, A), dia(60, 2)), false);
await t('desafío: bajar el valor', setDoc(fd(fa, D, A), dia(40, 3)), false);
await t('desafío: cambiar de juego', setDoc(fd(fa, D, A), dia(70, 3, { juego: 'autos' })), false);
await t('desafío: intento 3 mejorando', setDoc(fd(fa, D, A), dia(70, 3)), true);
await t('desafío: intento 4', setDoc(fd(fa, D, A), dia(80, 4)), false);
await t('desafío: crear con 3 (intentos abandonados)', setDoc(fd(fb, D, B), dia(10, 3, { apodo: 'Beto' })), true);
await t('desafío: crear con 0 intentos', setDoc(fd(fa, '2026-11-21_arcade', A), dia(10, 0)), false);
await t('desafío: crear con 4 intentos', setDoc(fd(fa, '2026-11-21_arcade', A), dia(10, 4)), false);
await t('desafío: juego que no es del Arcade', setDoc(fd(fa, '2026-11-21_arcade', A), dia(10, 1, { juego: 'calculo' })), false);
await t('desafío: valor 10000001', setDoc(fd(fa, '2026-11-21_arcade', A), dia(10000001, 1)), false);
await t('desafío: valor 1.5', setDoc(fd(fa, '2026-11-21_arcade', A), dia(1.5, 1)), false);
await t('desafío: campo extra', setDoc(fd(fa, '2026-11-21_arcade', A), dia(10, 1, { x: 1 })), false);
await t('desafío: fila ajena', setDoc(fd(fa, '2026-11-21_arcade', B), dia(10, 1)), false);
await t('desafío: baneado', setDoc(fd(fm, '2026-11-21_arcade', MALO), dia(10, 1, { apodo: 'Malo' })), false);
await t('desafío: valor 0 con intento 1', setDoc(fd(fa, '2026-11-21_arcade', A), dia(0, 1)), true);
await t('puzzle del día sigue sin update', setDoc(fd(fa, '2026-11-25_minas', A), { apodo: 'Ana', valor: 5, actualizado: 1 }), true);
await t('puzzle del día: update rechazado', setDoc(fd(fa, '2026-11-25_minas', A), { apodo: 'Ana', valor: 6, actualizado: 2 }), false);
await t('puzzle del día: no acepta campos del desafío', setDoc(fd(fb, '2026-11-25_sudoku', B), { apodo: 'Beto', valor: 100, actualizado: 1, intentos: 1, juego: 'serpiente' }), false);

// 🏆 Torneo
await t('torneo: crear', setDoc(ft(fa, W, A), tor(100)), true);
await t('torneo: mejorar', setDoc(ft(fa, W, A), tor(150)), true);
await t('torneo: empeorar', setDoc(ft(fa, W, A), tor(120)), false);
await t('torneo: igualar', setDoc(ft(fa, W, A), tor(150)), false);
await t('torneo: cambiar de juego', setDoc(ft(fa, W, A), tor(200, 'saltar')), false);
await t('torneo: puzzle crear', setDoc(ft(fb, W, B), tor(40, 'puzzle', { apodo: 'Beto' })), true);
await t('torneo: puzzle con más movimientos', setDoc(ft(fb, W, B), tor(45, 'puzzle', { apodo: 'Beto' })), false);
await t('torneo: puzzle con menos movimientos', setDoc(ft(fb, W, B), tor(35, 'puzzle', { apodo: 'Beto' })), true);
await t('torneo: rayo menos es mejor', setDoc(ft(fa, '2026-W48', A), tor(300, 'rayo')), true);
await t('torneo: rayo más lento', setDoc(ft(fa, '2026-W48', A), tor(310, 'rayo')), false);
await t('torneo: valor 0', setDoc(ft(fa, '2026-W49', A), tor(0)), false);
await t('torneo: calculo sobre el tope (1001)', setDoc(ft(fa, '2026-W49', A), tor(1001, 'calculo')), false);
await t('torneo: bloques 10000000', setDoc(ft(fa, '2026-W49', A), tor(10000000, 'bloques')), true);
await t('torneo: juego fuera de la lista', setDoc(ft(fa, '2026-W50', A), tor(10, 'trivia')), false);
await t('torneo: semana mal formada', setDoc(ft(fa, '2026-47', A), tor(10)), false);
await t('torneo: campo extra', setDoc(ft(fa, '2026-W50', A), tor(10, 'autos', { intentos: 1 })), false);
await t('torneo: fila ajena', setDoc(ft(fa, '2026-W50', B), tor(10)), false);
await t('torneo: baneado', setDoc(ft(fm, '2026-W50', MALO), tor(10, 'autos', { apodo: 'Malo' })), false);
await t('torneo: otro borra mi fila', deleteDoc(ft(fb, W, A)), false);
await t('torneo: admin borra', deleteDoc(ft(fadm, W, A)), true);
await t('desafío: admin borra', deleteDoc(fd(fadm, D, B)), true);
await t('desafío: dueño borra', deleteDoc(fd(fa, D, A)), true);

console.log(`\n${ok} bien, ${mal} mal`);
await env.cleanup();
process.exit(mal ? 1 : 0);
```

- [ ] **Step 3: Corre el emulador (las dos pruebas)**

Desde el `fb-copia` del scratchpad, copia antes las reglas del repo: `cp /c/Users/ADMIN/Desktop/juego-mental/firestore.rules .`

Run (Bash):
```bash
unset VSCODE_CWD; export JAVA_HOME=/c/Users/ADMIN/jdk21/jdk-21.0.13+9; PATH=$JAVA_HOME/bin:$PATH node node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --only firestore --project demo-palrato "node prueba-compe.mjs && node prueba-diario.mjs"
```
Expected: `42 bien, 0 mal` en prueba-compe y prueba-diario sin ningún ❌ (las reglas del puzzle del día no cambiaron de
comportamiento).

- [ ] **Step 4: `games/nube.js`**

Después del bloque «📅 Puzzle del día» (tras `puestoDiario`), añade:

```js
// --- 🏆 Torneo de la semana (`torneo/{semana}/jugadores/{uid}`: { apodo, valor, juego, actualizado, avatar, marco, nivel }) ---
// El 🕹️ desafío de hoy usa las funciones del día con `dia = '{fecha}_arcade'` (fila con además `intentos` y `juego`).

const jugadorTorneo = (semana, uid) => fs.doc(db, 'torneo', semana, 'jugadores', uid);
// Solo se acepta si mejora (ver firestore.rules); si no, permission-denied.
export const guardarTorneo = (semana, uid, fila) => fs.setDoc(jugadorTorneo(semana, uid), fila);
export const leerTorneo = async (semana, uid) => (await fs.getDoc(jugadorTorneo(semana, uid))).data() ?? null;

export async function topTorneo(semana, menorEsMejor, cuantos = 20) {
  const consulta = fs.query(fs.collection(db, 'torneo', semana, 'jugadores'), fs.orderBy('valor', menorEsMejor ? 'asc' : 'desc'), fs.limit(cuantos));
  return (await fs.getDocs(consulta)).docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function puestoTorneo(semana, valor, menorEsMejor) {
  const consulta = fs.query(fs.collection(db, 'torneo', semana, 'jugadores'), fs.where('valor', menorEsMejor ? '<' : '>', valor));
  return (await fs.getCountFromServer(consulta)).data().count + 1;
}
```

`jugadorTorneo` se usa en `borrarTodo` y `expulsar`, que están más arriba en el archivo. Es una `const` de módulo y esas funciones se
llaman después de que el módulo termina de cargar, así que funciona (igual que `jugadorDiario`).

En `borrarTodo`:
- en el bucle del diario cambia `['sudoku', 'minas']` por `['sudoku', 'minas', 'arcade']` y el comentario a «de los dos puzzles y del
  desafío del Arcade»;
- antes del bucle de lotes, añade las filas del torneo (desde la semana del 16-11-2026). `semanas` ya tiene todas las semanas desde
  octubre de 2026, y `'AAAA-Www'` se ordena bien como texto:
  ```js
  // 🏆 La fila propia de cada torneo (desde la semana del 16-11-2026).
  const torneo = [...semanas].filter((s) => s >= '2026-W47').map((s) => jugadorTorneo(s, uid));
  ```
- el bucle de lotes recorre `const extra = [...diario, ...torneo];` en vez de `diario`. Cambia el comentario a «si la regla de /diario o
  /torneo no está publicada…».
- actualiza el comentario de cabecera de `borrarTodo`: «…ligas, puzzles y desafíos del día, torneos, solicitudes…».

En `expulsar`, en el segundo lote:
```js
  // 📅 Sus filas del día (puzzles y desafío) de hoy y de ayer y la del torneo de esta semana, en otro lote: el baneo no depende de él
  const dias = fs.writeBatch(db);
  for (const fecha of [fechaLocal(), fechaLocal(new Date(Date.now() - 86400000))]) {
    for (const juego of ['sudoku', 'minas', 'arcade']) dias.delete(jugadorDiario(`${fecha}_${juego}`, uid));
  }
  dias.delete(jugadorTorneo(semana, uid));
  await dias.commit().catch(() => {});
```

- [ ] **Step 5: Corre las pruebas del repo**

Run: `node tests.js`
Expected: todos ✅ salvo, si acaso, la huella de `sw.js` (`games/nube.js` está en ARCHIVOS). Actualiza `VERSION` con el valor que
imprime y vuelve a correr.

- [ ] **Step 6: Commit**

```bash
git add firestore.rules games/nube.js sw.js
git -c user.email=203862735+cgutierrezrojas@users.noreply.github.com commit -m "Competencia: reglas y nube del desafío y el torneo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Jugar en la competencia (Arcade y Mentales)

**Files:**
- Modify: `app/arcade.js`, `app/partida.js`, `app/estado.js`, `app/previa.js`, `main.js`, `sw.js` (VERSION)

**Interfaces:**
- Produces, en el Arcade: `abrirJuegoArcade(id, { semilla, competencia })`, donde `competencia` = {
  `etiqueta()` → texto de la derecha del marcador, `texto` → párrafo bajo la ayuda antes de jugar,
  `empezar()` → `false` si no se puede jugar (no quedan intentos; entonces se llama a `volver()`),
  `terminar(puntos)` → texto del aviso final, `volver()` → vuelve a la Competencia }.
  Se juega el modo por defecto (como un reto), no toca el récord ni el reto con amigos. «Salir» a media partida termina la partida (cuenta).
- Produces, en Mentales: `E.enCompetencia` = { `titulo` (texto de `#final-modo`), `terminar(puntos)` → aviso, `volver()` }.
  Quien lo fija pone antes `E.actual` y `E.eleccion` y llama a `jugar()` de `app/partida.js`.

- [ ] **Step 1: `app/arcade.js`**

Cambia el comentario y `abrirJuegoArcade`:

```js
// Antes de jugar: cómo se juega y ▶ Jugar. `duelo`: { semilla } si es un reto; { semilla, competencia } en la 🏆 Competencia, con
// competencia = { etiqueta(), texto, empezar() (false: no se puede jugar), terminar(puntos) → aviso, volver() }.
export function abrirJuegoArcade(id, duelo = null) {
  pararArcade();
  const c = duelo?.competencia;
  const info = JUEGOS_ARCADE.find((j) => j.id === id);
  mostrar('arcade-juego');
  const record = Number(leer(`record:${id}`)) || 0;
  $('arcade-marcador').replaceChildren(el('span', '', `${info.icono} ${info.nombre}`), el('span', '', c ? c.etiqueta() : duelo ? '⚔️ Reto' : `🏆 ${record}`));
  $('arcade-tapete').replaceChildren(el('p', 'sin-datos', JUEGOS[id].ayuda), ...(c ? [el('p', 'sin-datos', c.texto)] : duelo ? [el('p', 'sin-datos', `⚔️ Juegas la misma partida que ${E.enDuelo?.rival ?? 'tu rival'}: gana quien hace más puntos.`)] : []));
  $('arcade-aviso').textContent = '';
  const volver = boton('Volver', '', () => (c ? c.volver() : duelo ? volverAlDuelo() : abrirArcade()));
```
(El resto de la función queda igual.)

En `jugar(id, duelo, modo)`, como primera línea:
```js
  if (duelo?.competencia && !duelo.competencia.empezar()) return duelo.competencia.volver();
```

En `marcador()`, cambia `p.duelo ? '⚔️ Reto' : …` por `p.duelo ? (p.duelo.competencia?.etiqueta() ?? '⚔️ Reto') : …`.

En `terminar()`:
```js
  const { id, e, duelo, semilla, modo } = p;
  const c = duelo?.competencia;
```
y cambia `if (duelo) anotarEnDuelo(puntos);` por `if (duelo && !c) anotarEnDuelo(puntos);`. Después de `pararArcade();` y de calcular
`resumen`, deja las últimas líneas así:

```js
  if (c) {
    $('arcade-aviso').textContent = c.terminar(puntos);
    return $('arcade-botones').replaceChildren(boton('🏆 Volver a Competencia', 'color', c.volver));
  }
  $('arcade-aviso').textContent = duelo ? `⚔️ ${puntos} puntos anotados en el reto.` : nuevo ? `🏆 ¡Nuevo récord: ${conUnidad(valor, m)}!` : resumen.filter(Boolean).join(' · ');
  if (duelo) return $('arcade-botones').replaceChildren(boton('⚔️ Volver al duelo', 'color', volverAlDuelo));
  // … (lo de siempre: Otra vez, Retar, Volver)
```
`nuevo` ya es `false` con `duelo` (y la competencia siempre trae `duelo`), así que no se guarda récord. El «Salir» de la partida ya llama a
`terminar()` cuando hay `duelo`: con la competencia también, así que el intento se cierra con los puntos que lleve.

- [ ] **Step 2: `app/estado.js`**

Después de `enDuelo`:
```js
  enCompetencia: null, // { titulo, terminar(puntos) → aviso, volver() } mientras se juega el 🏆 torneo con un juego de Mentales
```

- [ ] **Step 3: `app/partida.js` (`terminar`)**

- El récord: `const nuevo = !E.enCompetencia && esRecord(puntos, anterior, E.actual.menorEsMejor);`
- Después del bloque `if (E.enDuelo) { … }` añade:
```js
  if (E.enCompetencia) {
    premios.push(E.enCompetencia.terminar(puntos)); // se muestra con los logros
    $('final-modo').textContent = E.enCompetencia.titulo;
    $('btn-repetir').textContent = '🏆 Volver a Competencia';
    $('btn-mejorar').hidden = true;
  }
```
(`premios` es el array de avisos que ya se junta en `avisos` más abajo.)

- [ ] **Step 4: `app/previa.js`**

En `abrirPrevia`, junto a `E.enDuelo = null;`, añade `E.enCompetencia = null;`.

- [ ] **Step 5: `main.js`**

Junto a los demás manejadores del final:
```js
// 🏆 Desde el final de un juego del torneo se vuelve a la Competencia.
const volverACompetencia = () => {
  const { volver } = E.enCompetencia;
  E.enCompetencia = null;
  volver();
};
$('btn-repetir').onclick = () => (E.enDuelo ? volverAlDuelo() : E.enVivo ? verResultadoVivo() : E.enCompetencia ? volverACompetencia() : jugar());
```
(sustituye la línea `$('btn-repetir').onclick = …` que ya existe).

En `$('btn-salir').onclick`, cambia el final por:
```js
  if (E.parar) E.parar();
  E.parar = null;
  callar();
  if (E.enCompetencia) return volverACompetencia(); // salir del torneo no anota nada (se puede jugar otra vez)
  mostrar('menu');
```

En el bucle de `.btn-menu`, pon `E.enCompetencia = null;` antes de navegar:
```js
for (const b of document.querySelectorAll('.btn-menu')) {
  b.onclick = () => {
    E.enCompetencia = null;
    if (!b.closest('#previa, #final')) mostrar('inicio');
    else if (E.actual?.seccion === 'trivia') abrirTrivia();
    else mostrar('menu');
  };
}
```

- [ ] **Step 6: Corre las pruebas y revisa a mano**

Run: `node tests.js`
Expected: todos ✅ (actualiza la `VERSION` de `sw.js` con la que pida). Revisa con `git diff` que los duelos siguen igual: con
`{ semilla }` sin `competencia`, cada rama hace exactamente lo de antes.

- [ ] **Step 7: Commit**

```bash
git add app/arcade.js app/partida.js app/estado.js app/previa.js main.js sw.js
git -c user.email=203862735+cgutierrezrojas@users.noreply.github.com commit -m "Competencia: jugar el desafío y el torneo desde el Arcade y Mentales

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: La sección 🏆 Competencia

**Files:**
- Create: `app/competencia.js`
- Modify: `app/juegos.js` (SECCIONES), `app/inicio.js` (ABRIR, cuenta, fila «Hoy»), `app/ui.js` (pestaña), `index.html` (sección),
  `styles.css`, `sw.js` (ARCHIVOS y VERSION)

**Interfaces:**
- Consumes: Task 1 (`games/competencia.js`, `MONTOS.arcadedia`), Task 2 (`guardarDiario`/`leerDiario`/`topDiario`/`puestoDiario` con
  `'{fecha}_arcade'`, `guardarTorneo`/`topTorneo`/`puestoTorneo`), Task 3 (`abrirJuegoArcade(id, { semilla, competencia })`,
  `E.enCompetencia`).
  Ya existen: `soyAdmin()`, `botonesModeracion(f, esAdmin, alExpulsar)` (app/liga.js), `filaPublica()`, `nombreConAvatar(f)`
  (app/perfil.js), `darPremio(tipo)` (app/premios.js), `boton(texto, clase, alPulsar)` (app/cartas.js), `jugar()` (app/partida.js),
  `INFO_JUEGOS` (app/juegos.js), `semanaDe`, `diasRestantes` (games/liga.js), `semillaDelDia` (games/minas.js).
- Produces: `abrirCompetencia()`, `desafioJugadoHoy() → bool`, `marca(juego, valor) → texto`, `cajaRanking(titulo, opciones)` (la usa
  la Task 5 desde este mismo archivo).

- [ ] **Step 1: HTML, sección, pestaña y estilos**

`index.html`, después de la `<section id="puzzles" …>…</section>`:
```html
    <section id="competencia" hidden>
      <header class="cabecera-seccion">
        <button id="btn-competencia-volver" aria-label="Volver al inicio">←</button>
        <h2>🏆 Competencia</h2>
      </header>
      <div id="competencia-contenido"></div>
    </section>
```

`app/juegos.js`, en `SECCIONES` después de `puzzles`:
```js
  { id: 'competencia', nombre: 'Competencia', icono: '🏆', color: 'rojo', descripcion: 'desafío de hoy y torneo semanal' },
```

`app/ui.js`: en el objeto `pestana` de `mostrar`, añade `competencia: 'nav-inicio',`.

`styles.css` (al final):
```css
/* 🏆 Competencia: una tarjeta por competencia con su ranking debajo */
#competencia-contenido { display: flex; flex-direction: column; gap: 12px; }
.tarjeta-compe { display: flex; flex-direction: column; gap: 6px; padding: 14px; border-radius: 16px; background: var(--superficie); box-shadow: var(--relieve); text-align: left; }
.tarjeta-compe h3 { margin: 0; }
.tarjeta-compe .juego-compe { margin: 0; font-size: 1.3rem; font-weight: 800; }
.tarjeta-compe small { opacity: 0.85; }
.tarjeta-compe button { margin-top: 6px; }
```

- [ ] **Step 2: Crea `app/competencia.js`**

```js
// 🏆 Competencia: 🕹️ Desafío de hoy (un juego del Arcade, misma partida para todos, 3 intentos) y 🏆 Torneo de la semana
// (un juego del Arcade o de Mentales, intentos ilimitados). Reglas puras en games/competencia.js.
// Local: `compe:dia` = { fecha, intentos, mejor, pendiente? } y `compe:torneo` = { semana, juego, mejor, partidas, pendiente? }.
// Nube: `diario/{fecha}_arcade/jugadores/{uid}` y `torneo/{semana}/jugadores/{uid}` (ver firestore.rules).
import { el, guardar, leer } from '../games/comun.js';
import { fechaLocal } from '../games/estadisticas.js';
import { semanaDe, diasRestantes } from '../games/liga.js';
import { semillaDelDia } from '../games/minas.js';
import { MONTOS } from '../games/premios.js';
import { juegoDelDia, juegoDeLaSemana, anotarIntento, anotarMarca, quedan, mejora, INTENTOS, MENOS_ES_MEJOR, PREMIOS_TORNEO, POR_PARTICIPAR } from '../games/competencia.js';
import { leerJSON } from './datos.js';
import { E } from './estado.js';
import { $, mostrar } from './ui.js';
import { INFO_JUEGOS } from './juegos.js';
import { filaPublica, nombreConAvatar } from './perfil.js';
import { soyAdmin, botonesModeracion } from './liga.js';
import { darPremio } from './premios.js';
import { boton } from './cartas.js';
import { abrirJuegoArcade } from './arcade.js';
import { jugar } from './partida.js';

const leerDia = () => leerJSON('compe:dia');
const leerTorneo = () => leerJSON('compe:torneo');
export const marca = (juego, v) => `${v} ${INFO_JUEGOS[juego].unidad ?? 'pts'}`;
export const desafioJugadoHoy = () => leerDia().fecha === fechaLocal() && leerDia().intentos > 0;

const subiendo = {}; // 'dia' | 'torneo' → subida en curso (el ranking la espera un rato para salir con tu fila)

// Sube la fila (con cuenta y apodo). Queda `pendiente` hasta que responda: si falla, se reintenta al abrir la Competencia;
// permission-denied (las reglas no la admiten, por ejemplo porque otro celular ya subió más intentos) no se reintenta.
function subir(tipo) {
  const clave = 'compe:' + tipo;
  const r = leerJSON(clave);
  const apodo = leer('nube:apodo');
  if (!E.nube || !E.usuario || !apodo || r.mejor == null) return;
  r.pendiente = true;
  guardar(clave, JSON.stringify(r));
  const base = { apodo, actualizado: Date.now(), ...filaPublica() };
  const promesa = tipo === 'dia'
    ? E.nube.guardarDiario(`${r.fecha}_arcade`, E.usuario.uid, { ...base, valor: Math.min(r.mejor, 10000000), intentos: r.intentos, juego: juegoDelDia(r.fecha) })
    : E.nube.guardarTorneo(r.semana, E.usuario.uid, { ...base, valor: r.mejor, juego: r.juego });
  subiendo[tipo] = promesa.then(() => true, (e) => e?.code === 'permission-denied').then((listo) => {
    delete subiendo[tipo];
    const ahora = leerJSON(clave);
    // si mientras tanto cambió (otro intento), esa subida nueva es la que manda
    if (!listo || ahora.mejor !== r.mejor || ahora.intentos !== r.intentos || ahora.fecha !== r.fecha || ahora.semana !== r.semana) return;
    delete ahora.pendiente;
    guardar(clave, JSON.stringify(ahora));
  });
}

// Si desde otro celular ya se usaron intentos hoy, se traen (así no hay más de 3). Devuelve true si cambió algo.
async function traerDia() {
  const hoy = fechaLocal();
  const fila = await E.nube.leerDiario(`${hoy}_arcade`, E.usuario.uid).catch(() => null);
  if (!fila) return false;
  const r = leerDia();
  const local = r.fecha === hoy ? r : { fecha: hoy, intentos: 0, mejor: null };
  if (fila.intentos <= local.intentos && (local.mejor ?? -1) >= fila.valor) return false;
  guardar('compe:dia', JSON.stringify({ ...local, intentos: Math.max(local.intentos, fila.intentos), mejor: Math.max(local.mejor ?? 0, fila.valor) }));
  return true;
}

// 🕹️ Un intento del desafío: se gasta al pulsar ▶ Jugar; al terminar se apunta la mejor marca, se sube y se dan las fichas.
function jugarDesafio() {
  const fecha = fechaLocal();
  const juego = juegoDelDia(fecha);
  let empezado = false;
  abrirJuegoArcade(juego, {
    semilla: semillaDelDia(fecha, 'arcade'),
    competencia: {
      etiqueta: () => (empezado ? `🕹️ Desafío · intento ${leerDia().intentos}/${INTENTOS}` : `🕹️ Desafío · quedan ${quedan(leerDia(), fecha)}`),
      texto: `🕹️ Desafío de hoy: todos juegan la misma partida. Tienes ${INTENTOS} intentos y cuenta el mejor.`,
      empezar: () => {
        const r = anotarIntento(leerDia(), fecha);
        if (!r) return false;
        guardar('compe:dia', JSON.stringify(r));
        empezado = true;
        return true;
      },
      terminar: (puntos) => {
        const antes = leerDia().mejor;
        const r = anotarMarca(leerDia(), puntos);
        guardar('compe:dia', JSON.stringify(r));
        subir('dia');
        const q = INTENTOS - r.intentos;
        const linea = `🕹️ ${marca(juego, puntos)}${antes != null && puntos > antes ? ' · ¡mejoraste!' : ''} · tu mejor: ${marca(juego, r.mejor)} · ${q ? `te queda${q > 1 ? 'n' : ''} ${q}` : 'sin intentos hasta mañana'}`;
        return [linea, darPremio('arcadedia')].filter(Boolean).join('\n');
      },
      volver: abrirCompetencia,
    },
  });
}

// 🏆 Una partida del torneo: Arcade con la semilla de la semana; Mentales en Normal y sin semilla.
function jugarTorneo() {
  const fecha = fechaLocal();
  const semana = semanaDe(fecha);
  const juego = juegoDeLaSemana(fecha);
  const terminar = (puntos) => {
    const antes = leerTorneo();
    const r = antes.semana === semana ? antes : { semana, juego, mejor: null, partidas: 0 };
    r.partidas = (r.partidas ?? 0) + 1;
    const mejoro = mejora(juego, puntos, r.mejor);
    if (mejoro) r.mejor = puntos;
    guardar('compe:torneo', JSON.stringify(r));
    if (mejoro) subir('torneo');
    if (mejoro) return `🏆 ¡Nueva mejor marca del torneo: ${marca(juego, puntos)}!`;
    return r.mejor != null ? `🏆 Tu mejor marca del torneo sigue siendo ${marca(juego, r.mejor)}` : '';
  };
  if (INFO_JUEGOS[juego].arcade) {
    return abrirJuegoArcade(juego, {
      semilla: semillaDelDia(semana, 'torneo'),
      competencia: {
        etiqueta: () => {
          const t = leerTorneo();
          return t.semana === semana && t.mejor != null ? `🏆 Torneo · mejor ${t.mejor}` : '🏆 Torneo';
        },
        texto: '🏆 Torneo de la semana: todos juegan la misma partida. Juega las veces que quieras; cuenta tu mejor marca.',
        empezar: () => true,
        terminar,
        volver: abrirCompetencia,
      },
    });
  }
  E.actual = INFO_JUEGOS[juego];
  E.eleccion = { modo: 'normal', dificultad: 'normal' };
  E.enCompetencia = { titulo: '🏆 Torneo de la semana', terminar, volver: abrirCompetencia };
  jugar();
}

// Top 20 con tu puesto y los botones ⚠️/🚫 (como la liga), o el aviso de entrar con la cuenta. Se rellena al llegar de la nube.
// `cargar()` → filas; `puesto(valor)` → número; `mio` = tu marca o null; `pendiente()` → si tu marca aún no se sube; `espera` = subida en curso.
export function cajaRanking(titulo, { juego, cargar, puesto, mio, pendiente, espera }) {
  const caja = el('div', 'caja-dia');
  caja.append(el('h3', 'categoria', titulo));
  if (!E.nube || !E.usuario) {
    caja.append(el('p', 'sin-datos', 'Entra con tu cuenta para competir'));
    return caja;
  }
  const lista = el('ol', 'ranking-dia');
  const tu = el('p', 'tu-dia', 'Cargando…');
  caja.append(lista, tu);
  const pintar = async () => {
    // Sin conexión, Firestore deja la escritura en cola sin fallar: no se espera más de 5 s.
    await Promise.race([espera, new Promise((listo) => setTimeout(listo, 5000))]);
    const uid = E.usuario.uid;
    const [filas, esAdmin] = await Promise.all([cargar(), soyAdmin()]);
    lista.replaceChildren(...(filas.length ? filas.map((f) => {
      const li = el('li', f.uid === uid ? 'propia' : '');
      li.append(nombreConAvatar(f), el('span', 'valor', marca(juego, f.valor)));
      if (f.uid !== uid) {
        const acciones = el('span', 'acciones');
        acciones.append(...botonesModeracion(f, esAdmin, () => pintar().catch(() => {})));
        li.append(acciones);
      }
      return li;
    }) : [el('li', 'sin-datos', 'Aún nadie ha jugado. ¡Sé el primero!')]));
    let texto;
    if (!leer('nube:apodo')) texto = 'No apareces: ponte un apodo en 📊 › ☁️ Nube.';
    else if (mio == null) texto = 'Juega para aparecer.';
    else {
      texto = `Tu marca: ${marca(juego, mio)}`;
      if (!filas.some((f) => f.uid === uid)) texto += pendiente() ? ' · ⚠️ Aún no se sube tu marca (¿sin conexión?); se reintenta sola' : ` · puesto ${await puesto(mio)}`;
    }
    tu.textContent = texto;
  };
  pintar().catch(() => (tu.textContent = 'No se pudo cargar el ranking (¿sin conexión?).'));
  return caja;
}

function tarjeta(titulo, juego, lineas, texto, alPulsar, activo) {
  const J = INFO_JUEGOS[juego];
  const caja = el('div', 'tarjeta-compe');
  caja.append(el('h3', '', titulo), el('p', 'juego-compe', `${J.icono} ${J.nombre}`), ...lineas.map((l) => el('small', '', l)));
  const b = boton(texto, 'grande color', alPulsar);
  b.style.setProperty('--c', 'var(--rojo)');
  b.disabled = !activo;
  caja.append(b);
  return caja;
}

function pintar() {
  const hoy = fechaLocal();
  const semana = semanaDe(hoy);
  const jd = juegoDelDia(hoy);
  const jt = juegoDeLaSemana(hoy);
  const d = leerDia();
  const t = leerTorneo();
  const intentos = d.fecha === hoy ? d.intentos : 0;
  const mejorDia = d.fecha === hoy ? d.mejor : null;
  const mejorTorneo = t.semana === semana ? t.mejor : null;
  const horas = 24 - new Date().getHours();
  const dias = diasRestantes(hoy);
  const menos = MENOS_ES_MEJOR.includes(jt);
  $('competencia-contenido').replaceChildren(
    tarjeta('🕹️ Desafío de hoy', jd, [
      `Intentos: ${intentos}/${INTENTOS}${mejorDia != null ? ` · tu mejor: ${marca(jd, mejorDia)}` : ''}`,
      `Termina en ${horas} h · 🪙 ${MONTOS.arcadedia} fichas por jugarlo`,
    ], intentos < INTENTOS ? `▶ Jugar (intento ${intentos + 1}/${INTENTOS})` : 'Sin intentos: vuelve mañana', jugarDesafio, intentos < INTENTOS),
    cajaRanking('🕹️ Ranking del desafío', {
      juego: jd,
      cargar: () => E.nube.topDiario(`${hoy}_arcade`, false, 20),
      puesto: (v) => E.nube.puestoDiario(`${hoy}_arcade`, v, false),
      mio: mejorDia,
      pendiente: () => Boolean(leerDia().pendiente),
      espera: subiendo.dia,
    }),
    tarjeta('🏆 Torneo de la semana', jt, [
      `${t.semana === semana ? t.partidas : 0} partidas${mejorTorneo != null ? ` · tu mejor: ${marca(jt, mejorTorneo)}` : ''}${menos ? ' · menos es mejor' : ''}`,
      `Termina en ${dias} día${dias > 1 ? 's' : ''} · 🥇 ${PREMIOS_TORNEO[0]} · 🥈 ${PREMIOS_TORNEO[1]} · 🥉 ${PREMIOS_TORNEO[2]} · 🪙 ${POR_PARTICIPAR} por participar`,
    ], '▶ Jugar', jugarTorneo, true),
    cajaRanking('🏆 Ranking del torneo', {
      juego: jt,
      cargar: () => E.nube.topTorneo(semana, menos, 20),
      puesto: (v) => E.nube.puestoTorneo(semana, v, menos),
      mio: mejorTorneo,
      pendiente: () => Boolean(leerTorneo().pendiente),
      espera: subiendo.torneo,
    }),
  );
}

export function abrirCompetencia() {
  mostrar('competencia');
  $('btn-competencia-volver').onclick = () => mostrar('inicio');
  for (const tipo of ['dia', 'torneo']) if (leerJSON('compe:' + tipo).pendiente && !subiendo[tipo]) subir(tipo);
  pintar();
  if (E.nube && E.usuario) traerDia().then((cambio) => cambio && !$('competencia').hidden && pintar());
}
```

Ojo: «Termina en N h» es un aviso aproximado (horas enteras hasta medianoche); así queda bien.

- [ ] **Step 3: `app/inicio.js`**

- `import { abrirCompetencia, desafioJugadoHoy } from './competencia.js';`
- En `ABRIR`: `competencia: abrirCompetencia,`.
- En la cuenta de juegos (el objeto con `mesa: JUEGOS_MESA.length, …`): `competencia: 2,` (desafío y torneo).
- En la fila «Hoy», después del chip de Tu día y antes del de la liga:
```js
  if (!desafioJugadoHoy()) fila.push(chip('🕹️ Desafío de hoy', 'Desafío de hoy del Arcade: aún no lo juegas', abrirCompetencia));
```

- [ ] **Step 4: `sw.js` y pruebas**

Añade `'app/competencia.js'` al final de `ARCHIVOS`.

Run: `node tests.js`
Expected: todos ✅ tras poner la `VERSION` que pida. La prueba «secciones: cada juego en una sección válida» sigue pasando, porque la
sección nueva trae nombre, icono, color y descripción.

Comprueba también que el módulo carga sin errores de import. Desde la raíz del repo:
```bash
node -e "import('./app/competencia.js').then(() => console.log('ok'), (e) => console.log(e.message))"
```
Expected: o `ok`, o un error que solo hable de `document`, `window`, `localStorage` o `navigator` (no hay DOM en node). Si dice
«does not provide an export named …», hay un import mal escrito: corrígelo.

- [ ] **Step 5: Commit**

```bash
git add app/competencia.js app/juegos.js app/inicio.js app/ui.js index.html styles.css sw.js
git -c user.email=203862735+cgutierrezrojas@users.noreply.github.com commit -m "Competencia: sección con el desafío de hoy y el torneo de la semana

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Premios del torneo, medallero y moderación del ranking de Puzzles

**Files:**
- Modify: `app/competencia.js`, `app/cuenta.js`, `app/perfil.js`, `app/puzzles.js`, `sw.js` (VERSION)

**Interfaces:**
- Consumes: Task 1 (`juegoDeLaSemana`, `haceDias`, `premioTorneo`, `sumarMedalla`, `MENOS_ES_MEJOR`), Task 2 (`topTorneo`, `leerTorneo`
  de la nube). Ya existen: `semanaAnterior(fecha)` (games/liga.js), `sumarFichas(n)` (app/premios.js), `avisarPerfil(textos)` (aviso de
  4 s, app/perfil.js), `confeti()` (app/ui.js), `soyAdmin`, `botonesModeracion` (app/liga.js).
- Produces: `comprobarTorneo()` (en app/competencia.js), que se llama tras `comprobarPodio()`.

- [ ] **Step 1: `comprobarTorneo` en `app/competencia.js`**

Añade los imports `haceDias, premioTorneo, sumarMedalla` (de games/competencia.js), `semanaAnterior` (de games/liga.js), `sumarFichas`
(de ./premios.js), `avisarPerfil` (de ./perfil.js) y `confeti` (de ./ui.js). Después añade:

```js
const PUESTO = { 1: '🥇 ¡Quedaste 1.º', 2: '🥈 ¡Quedaste 2.º', 3: '🥉 ¡Quedaste 3.º' };

// Al empezar una semana nueva se mira el torneo de la anterior (una sola vez por semana, `compe:premio`):
// podio 500/300/150 fichas y medalla en `perfil:torneos`; si participaste y no quedaste, 25. No cuenta para el tope diario.
export async function comprobarTorneo() {
  const hoy = fechaLocal();
  const anterior = semanaAnterior(hoy);
  if (!E.nube || !E.usuario || leer('compe:premio') === anterior) return;
  const juego = juegoDeLaSemana(haceDias(hoy, 7));
  try {
    const uid = E.usuario.uid;
    const [podio, mia] = await Promise.all([E.nube.topTorneo(anterior, MENOS_ES_MEJOR.includes(juego), 3), E.nube.leerTorneo(anterior, uid)]);
    guardar('compe:premio', anterior);
    const puesto = podio.findIndex((f) => f.uid === uid) + 1;
    const fichas = premioTorneo(puesto, Boolean(mia));
    if (!fichas) return;
    sumarFichas(fichas);
    const nombre = INFO_JUEGOS[juego].nombre;
    if (puesto) {
      guardar('perfil:torneos', JSON.stringify(sumarMedalla(leerJSON('perfil:torneos'), puesto)));
      confeti();
      avisarPerfil([`${PUESTO[puesto]} en el torneo de ${nombre}! +${fichas} fichas`]);
    } else {
      avisarPerfil([`🏆 Gracias por jugar el torneo de ${nombre}: +${fichas} fichas`]);
    }
  } catch {
    // sin conexión: se mira la próxima vez
  }
}
```

- [ ] **Step 2: `app/cuenta.js`**

`import { comprobarTorneo } from './competencia.js';` y, justo después de `comprobarPodio();` (en `alCambiarUsuario`, tras la
sincronización), `comprobarTorneo();`.

- [ ] **Step 3: Medallero en el perfil (`app/perfil.js`, `pintarPerfil`)**

Antes de `$('perfil-contenido').replaceChildren(`:
```js
  const t = leerJSON('perfil:torneos');
  const torneos = t.oro || t.plata || t.bronce ? [el('p', 'sin-datos', `🏆 Torneos: 🥇×${t.oro ?? 0} 🥈×${t.plata ?? 0} 🥉×${t.bronce ?? 0}`)] : [];
```
y en `replaceChildren`, justo después de `cabeza,` añade `...torneos,`.

- [ ] **Step 4: ⚠️/🚫 en el ranking del día de Puzzles (`app/puzzles.js`, `rankingDia`)**

`import { soyAdmin, botonesModeracion } from './liga.js';`. Dentro del `async` de `rankingDia`, saca el pintado de la lista a una
función para poder repintar tras expulsar:

```js
    const filas = await E.nube.topDiario(idDia(fecha, juego), J.menorEsMejor, 20);
    const esAdmin = await soyAdmin();
    const pintarLista = (lasFilas) => lista.replaceChildren(...(lasFilas.length ? lasFilas.map((f) => {
      const li = el('li', f.uid === uid ? 'propia' : '');
      li.append(nombreConAvatar(f), el('span', 'valor', J.marca(f.valor)));
      if (f.uid !== uid) {
        const acciones = el('span', 'acciones');
        acciones.append(...botonesModeracion(f, esAdmin, async () => pintarLista(await E.nube.topDiario(idDia(fecha, juego), J.menorEsMejor, 20))));
        li.append(acciones);
      }
      return li;
    }) : [el('li', 'sin-datos', 'Aún nadie lo ha terminado hoy. ¡Sé el primero!')]));
    pintarLista(filas);
```
(sustituye al `lista.replaceChildren(…)` de antes; lo de «tu marca» queda igual).

- [ ] **Step 5: Pruebas**

Run: `node tests.js`
Expected: todos ✅ tras la `VERSION` que pida `sw.js`. Repite la comprobación de import de la Task 4 con `./app/competencia.js` y
`./app/puzzles.js`.

- [ ] **Step 6: Commit**

```bash
git add app/competencia.js app/cuenta.js app/perfil.js app/puzzles.js sw.js
git -c user.email=203862735+cgutierrezrojas@users.noreply.github.com commit -m "Competencia: premios del torneo, medallero y moderación del ranking de Puzzles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Verificación del controlador (después de las tareas)

1. Servidor `python -m http.server 8754` (lo levanta el controlador) y CDP (`S/cdp-r9.mjs`) a 360 px, claro y oscuro:
   - inicio con la baldosa 🏆 y el chip «🕹️ Desafío de hoy»;
   - Competencia sin cuenta;
   - los 3 intentos del desafío (el 4.º desactivado, y el chip desaparece tras el 1.º; 🪙 +30 solo la primera vez);
   - torneo del Arcade y de Mentales (cambiando la fecha con `Date` simulado si hace falta): el récord normal no cambia y el final dice
     «🏆 Volver a Competencia»;
   - un duelo del Arcade sigue funcionando igual.
   Debe quedar con 0 errores de consola.
2. El usuario publica `firestore.rules`.
3. Prueba real con dos cuentas:
   - filas en los dos rankings, con intentos 1→3 en la nube;
   - ⚠️/🚫 en los tres rankings;
   - premio del podio, simulando la semana anterior con filas de prueba en `torneo/{semana anterior}` y `compe:premio` borrado;
   - limpieza completa de Firebase al final.
