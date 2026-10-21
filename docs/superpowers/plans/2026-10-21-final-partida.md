# F2: final de partida. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un final de partida con estrellas animadas, una barra de metas (o de media y récord) y una frase con lo que faltó.

**Architecture:**
- El nuevo `games/final.js`, puro, calcula la barra y las frases.
- En `main.js`, `terminar()` rellena la sección `#final`, ya reorganizada en `index.html`.
- Las animaciones van solo en CSS.

**Tech Stack:** HTML, CSS y JS sin frameworks, con módulos ES. Pruebas con `node tests.js` y en Chrome con CDP.

**Spec:** `docs/superpowers/specs/2026-10-21-final-partida-design.md`

## Global Constraints

- **Código:** en español, sencillo, sin librerías.
- **Movimiento reducido:** con `prefers-reduced-motion: reduce` no hay animaciones.
- **Temas y tamaño:** funciona en los temas Colorido y Neón, y a 390 px sin desplazamiento horizontal.
- **Commits:** con el correo anónimo y el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: `games/final.js` y sus pruebas

**Files:**
- Create: `games/final.js`
- Test: `tests.js` (sección nueva antes de `// --- mayor.js ---`)

**Interfaces:**
- Produces:
  - `barraFinal(puntos, marcas, menorEsMejor = false) → { relleno: number, marcas: number[] }`
  - `fraseEstrellas(puntos, metas, conseguidas, unidad, menorEsMejor = false) → string`
  - `fraseRecord(puntos, anterior, unidad, menorEsMejor = false) → string`

- [ ] **Step 1: Escribir las pruebas**

```js
// --- final.js ---
import { barraFinal, fraseEstrellas, fraseRecord } from './games/final.js';

probar('final: barra de metas', () => {
  const redondo = (b) => [b.relleno, ...b.marcas].map((x) => Math.round(x * 100)).join();
  assert(redondo(barraFinal(16, [12, 15, 18])) === '67,40,60,80', redondo(barraFinal(16, [12, 15, 18])));
  assert(redondo(barraFinal(447, [447, 402, 358], true)) === '40,40,60,80', 'menos es mejor: a la derecha, mejor');
  assert(barraFinal(0, [12, 15, 18]).relleno === 0 && barraFinal(99, [12, 15, 18]).relleno === 1, 'se recorta a 0–1');
  const iguales = barraFinal(20, [20, 20]);
  assert(iguales.marcas[0] === iguales.marcas[1] && iguales.relleno > 0 && iguales.relleno < 1, JSON.stringify(iguales));
  assert(barraFinal(5, [0]).relleno === 1, 'marca 0 no divide entre 0');
});

probar('final: frases', () => {
  assert(fraseEstrellas(16, [12, 15, 18], 2, 'aciertos') === 'Te faltaron 2 aciertos para ⭐⭐⭐');
  assert(fraseEstrellas(17, [12, 15, 18], 2, 'aciertos') === 'Te faltó 1 acierto para ⭐⭐⭐');
  assert(fraseEstrellas(4, [5, 7, 8], 0, 'colores') === 'Te faltó 1 color para ⭐');
  assert(fraseEstrellas(414, [447, 402, 358], 1, 'ms', true) === 'Te faltó bajar 12 ms para ⭐⭐');
  assert(fraseEstrellas(20, [12, 15, 18], 3, 'aciertos') === '¡Las 3 estrellas!');
  assert(fraseRecord(23, 21, 'puntos') === '🏆 2 puntos mejor que tu récord anterior');
  assert(fraseRecord(23, 0, 'puntos') === '¡Tu primer récord!');
  assert(fraseRecord(21, 21, 'puntos') === '¡Igualaste tu récord (21)!');
  assert(fraseRecord(18, 21, 'puntos') === 'A 3 puntos de tu récord (21)');
  assert(fraseRecord(250, 240, 'ms', true) === 'A 10 ms de tu récord (240)');
  assert(fraseRecord(239, 240, 'ms', true) === '🏆 1 ms mejor que tu récord anterior');
});
```

- [ ] **Step 2:** Ejecutar `node tests.js`. Se espera un fallo de import, porque `games/final.js` aún no existe.

- [ ] **Step 3: Implementar `games/final.js`**

```js
// Final de partida: barra de metas (posiciones 0–1) y frase de lo que faltó. Todo puro.

const SINGULAR = { aciertos: 'acierto', puntos: 'punto', colores: 'color', movimientos: 'movimiento', intentos: 'intento' };
const cantidad = (n, unidad) => `${n} ${n === 1 ? SINGULAR[unidad] ?? unidad : unidad}`;

// Posición (0–1) de la puntuación (`relleno`) y de cada marca. En "menos es mejor" se invierte: a la derecha, mejor.
// El tramo va desde la marca más baja menos su separación hasta la más alta más media separación.
export function barraFinal(puntos, marcas, menorEsMejor = false) {
  const valor = (x) => (menorEsMejor ? -x : x);
  const min = Math.min(...marcas.map(valor));
  const max = Math.max(...marcas.map(valor));
  const tramo = max - min || Math.abs(max) * 0.2 || 1; // marcas iguales: un 20 % de su valor
  const desde = min - tramo;
  const hasta = max + tramo / 2;
  const posicion = (x) => Math.min(1, Math.max(0, (valor(x) - desde) / (hasta - desde)));
  return { relleno: posicion(puntos), marcas: marcas.map(posicion) };
}

// Niveles: cuánto faltó para la siguiente estrella.
export function fraseEstrellas(puntos, metas, conseguidas, unidad, menorEsMejor = false) {
  if (conseguidas === 3) return '¡Las 3 estrellas!';
  const falta = Math.abs(metas[conseguidas] - puntos);
  const estrellas = '⭐'.repeat(conseguidas + 1);
  if (menorEsMejor) return `Te faltó bajar ${cantidad(falta, unidad)} para ${estrellas}`;
  return `${falta === 1 ? 'Te faltó' : 'Te faltaron'} ${cantidad(falta, unidad)} para ${estrellas}`;
}

// Otros modos: comparación con el récord de antes de esta partida (`anterior` = 0 si no había).
export function fraseRecord(puntos, anterior, unidad, menorEsMejor = false) {
  if (!anterior) return '¡Tu primer récord!';
  const mejora = menorEsMejor ? anterior - puntos : puntos - anterior;
  if (mejora > 0) return `🏆 ${cantidad(mejora, unidad)} mejor que tu récord anterior`;
  if (mejora === 0) return `¡Igualaste tu récord (${anterior})!`;
  return `A ${cantidad(-mejora, unidad)} de tu récord (${anterior})`;
}
```

- [ ] **Step 4:** Ejecutar `node tests.js`. Se esperan 51 ✅ y ningún ❌.
- [ ] **Step 5:** Commit con el mensaje "Final de partida: barra de metas y frases (lógica y pruebas)".

### Task 2: Pantalla final

**Files:**
- Modify: `index.html` (sección `#final`)
- Modify: `main.js` (import, `terminar`, nueva `pintarBarra`)
- Modify: `styles.css` (bloque F2 al final)

**Interfaces:**
- Consumes: `barraFinal`, `fraseEstrellas` y `fraseRecord` (Task 1), y `leerHistorial`, `esDe`, `leerRecord`, `claveRecord` y `estrellasDe` de `main.js`.

- [ ] **Step 1: `index.html`.** Sustituir el contenido de `<section id="final" hidden>` por:

```html
      <p id="final-modo"></p>
      <p id="final-estrellas" role="img" hidden><span>⭐</span><span>⭐</span><span>⭐</span></p>
      <p id="final-titular" hidden></p>
      <p id="final-puntos"></p>
      <p id="final-unidad"></p>
      <div id="final-barra" aria-hidden="true" hidden></div>
      <p id="final-nivel" hidden></p>
      <p id="final-entreno" hidden>✓ ¡Entrenamiento de hoy completado!</p>
      <button id="btn-repetir" class="grande color" style="--c: var(--acento)">Repetir</button>
      <div class="fila-botones">
        <button id="btn-mejorar" hidden>↻ Por ⭐⭐⭐</button>
        <button class="btn-menu">🏠 Menú</button>
      </div>
```

- [ ] **Step 2: `main.js`.**
  - Añadir el import `import { barraFinal, fraseEstrellas, fraseRecord } from './games/final.js';` tras el de niveles.
  - Antes de `function terminar`, añadir:

```js
// Barra del final: se llena hasta la puntuación y marca cada valor (`etiquetas[i]` encima, el número debajo).
function pintarBarra(puntos, valores, etiquetas, menorEsMejor) {
  const barra = $('final-barra');
  barra.hidden = !valores.length;
  if (!valores.length) return;
  const { relleno, marcas } = barraFinal(puntos, valores, menorEsMejor);
  const lleno = el('div', 'relleno');
  lleno.style.setProperty('--p', `${relleno * 100}%`);
  const partes = [lleno];
  marcas.forEach((posicion, i) => {
    const marca = el('span', 'marca');
    marca.style.left = `${posicion * 100}%`;
    marca.append(el('span', '', etiquetas[i]), el('small', '', `${valores[i]}`));
    partes.push(marca);
  });
  barra.replaceChildren(...partes);
}
```

  - Dentro de `terminar`, reemplazar desde `$('final-puntos').textContent = conUnidad(actual, puntos);` hasta el cierre de `if (celebrar) { … }` por:

```js
  $('final-puntos').textContent = puntos;
  $('final-entreno').hidden = !entrenoHoy;
  let titular = '';
  let frase = '';
  let unidad = actual.unidad ?? '';
  let espera = 0; // en Niveles, la celebración espera a que caigan las estrellas

  if (enNiveles) {
    // Niveles: sin récord; se guarda la mejor marca de estrellas (del nivel o del diario)
    // y el botón grande pasa a "Siguiente nivel" / "Siguiente diario" o "Reintentar".
    const cfg = configNivel(actual.id, nivel);
    const conseguidas = estrellasDe(puntos, cfg.metas, actual.menorEsMejor);
    unidad = cfg.unidad;
    titular = conseguidas ? '¡Superado!' : 'No superado';
    frase = fraseEstrellas(puntos, cfg.metas, conseguidas, cfg.unidad, actual.menorEsMejor);
    let siguiente = conseguidas > 0;
    if (jugando.diario !== null) {
      // Se guarda en el día en que empezó la partida.
      const diarios = leerDiarios(actual.id);
      const dia = diarios[jugando.fecha];
      const antes = diarioCompleto(dia);
      dia.estrellas[jugando.diario] = Math.max(dia.estrellas[jugando.diario] || 0, conseguidas);
      guardarDiarios(actual.id, diarios);
      $('final-modo').textContent = `📅 Diario ${jugando.diario + 1}/3 · Nivel ${nivel} · ${NOMBRE_RETO[cfg.reto]}`;
      if (!antes && diarioCompleto(dia)) frase += `\n¡Diarios de hoy completos! 📅🔥 ${rachaDiaria(diarios, hoy)}`;
      const pendiente = dia.estrellas.findIndex((e) => !(e > 0));
      siguiente &&= pendiente !== -1;
      if (siguiente) diarioElegido = pendiente;
      $('btn-repetir').textContent = siguiente ? '▶ Siguiente diario' : '↻ Reintentar';
    } else {
      guardar('estrellas:' + actual.id, JSON.stringify(conEstrellas(leerEstrellas(actual.id), nivel, conseguidas)));
      $('final-modo').textContent = `🪜 Nivel ${nivel} · ${NOMBRE_RETO[cfg.reto]}`;
      if (siguiente) nivelElegido++;
      $('btn-repetir').textContent = siguiente ? '▶ Siguiente nivel' : '↻ Reintentar';
    }
    // Superado con 1 o 2 ⭐ y el botón grande ya pasa al siguiente: también se puede repetir este por las 3.
    $('btn-mejorar').hidden = !(siguiente && conseguidas < 3);
    // Estrellas: las conseguidas caen una a una, cada una con su sonido.
    const estrellas = $('final-estrellas');
    estrellas.hidden = false;
    estrellas.setAttribute('aria-label', `${conseguidas} de 3 estrellas`);
    [...estrellas.children].forEach((s, i) => s.classList.toggle('ganada', i < conseguidas));
    for (let i = 0; i < conseguidas; i++) setTimeout(() => sonar('acierto'), 300 + i * 350);
    espera = conseguidas ? 300 + conseguidas * 350 : 0;
    pintarBarra(puntos, cfg.metas, ['⭐', '⭐⭐', '⭐⭐⭐'], actual.menorEsMejor);
    celebrar ||= conseguidas > 0;
  } else {
    // Otros modos: récord, y la barra compara con tu media (últimas 10 de antes) y tu récord anterior.
    const clave = claveRecord(actual.id, eleccion.modo, eleccion.dificultad);
    const anterior = leerRecord(clave);
    const nuevo = esRecord(puntos, anterior, actual.menorEsMejor);
    if (nuevo) guardar(clave, puntos);
    const previas = leerHistorial(actual.id).filter((p) => esDe(p, eleccion.modo, eleccion.dificultad)).slice(0, -1).slice(-10);
    const valores = [];
    const etiquetas = [];
    if (previas.length) {
      valores.push(Math.round(previas.reduce((s, p) => s + p.puntos, 0) / previas.length));
      etiquetas.push('📊');
    }
    if (anterior) {
      valores.push(anterior);
      etiquetas.push('🏆');
    }
    pintarBarra(puntos, valores, etiquetas, actual.menorEsMejor);
    titular = nuevo ? '🏆 ¡Nuevo récord!' : '';
    frase = anterior || nuevo ? fraseRecord(puntos, anterior, actual.unidad ?? 'puntos', actual.menorEsMejor) : '';
    $('final-modo').textContent = etiqueta(eleccion.modo, eleccion.dificultad);
    $('final-estrellas').hidden = true;
    $('btn-repetir').textContent = '↻ Repetir';
    $('btn-mejorar').hidden = true;
    celebrar ||= nuevo;
  }

  $('final-titular').textContent = titular;
  $('final-titular').hidden = !titular;
  $('final-titular').classList.toggle('mal', titular === 'No superado');
  $('final-unidad').textContent = unidad;
  $('final-nivel').textContent = frase;
  $('final-nivel').hidden = !frase;
  mostrar('final');
  if (celebrar) {
    setTimeout(() => {
      confeti();
      sonar('record');
    }, espera);
  }
```

  - Comprobar con grep que ya no queda ninguna referencia a `final-record`, y si `conUnidad` sigue en uso. Después, ejecutar `node --check main.js`.

- [ ] **Step 3: `styles.css`.**
  - Quitar `#final-nivel { font-size: 1.15rem; }`.
  - Añadir al final:

```css
/* F2: final de partida */
#final-estrellas { margin: 0; font-size: 3rem; letter-spacing: 6px; }
#final-estrellas span { display: inline-block; opacity: 0.25; filter: grayscale(1); }
#final-estrellas span.ganada { opacity: 1; filter: none; animation: caer-estrella 0.4s ease-out backwards; }
#final-estrellas span.ganada:nth-child(1) { animation-delay: 0.3s; }
#final-estrellas span.ganada:nth-child(2) { animation-delay: 0.65s; }
#final-estrellas span.ganada:nth-child(3) { animation-delay: 1s; }
@keyframes caer-estrella { from { scale: 2.4; opacity: 0; } }
#final-titular { margin: 0; font-size: 1.4rem; font-weight: 900; color: var(--ok); }
#final-titular.mal { color: var(--mal); }
#final-puntos { margin: 0; font-size: 3.2rem; font-weight: 900; line-height: 1; }
#final-unidad { margin: 0; font-weight: 700; opacity: 0.7; }
#final-unidad:empty { display: none; }
#final-nivel { white-space: pre-line; }

#final-barra {
  position: relative;
  height: 14px;
  margin: 30px 12px 26px;
  border-radius: 7px;
  background: rgba(128, 128, 128, 0.25);
}
#final-barra .relleno {
  width: var(--p);
  height: 100%;
  border-radius: 7px;
  background: var(--acento);
  animation: llenar 0.9s ease-out;
}
@keyframes llenar { from { width: 0; } }
#final-barra .marca {
  position: absolute;
  top: -26px;
  bottom: -22px;
  translate: -50% 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  font-weight: 800;
  background: linear-gradient(currentColor, currentColor) center / 2px 22px no-repeat; /* raya de la marca */
}

.fila-botones { display: flex; gap: 8px; }
.fila-botones button { flex: 1; }

@media (prefers-reduced-motion: reduce) {
  #final-estrellas span.ganada,
  #final-barra .relleno { animation: none; }
}
```

- [ ] **Step 4: Probar en Chrome (CDP, 390×780).** Comprobar:
  - Mayor nivel 1 con 7 aciertos: ⭐⭐ ganadas, "Te faltó 1 acierto para ⭐⭐⭐" y tres botones;
  - Cálculo Normal, dos partidas: la segunda muestra la barra con 📊 y 🏆 y su frase;
  - primera partida de un juego: sin barra y "¡Tu primer récord!" si puntúa;
  - captura en tema claro y en tema oscuro;
  - `scrollWidth` igual a 390 y ningún error en la consola.
- [ ] **Step 5:** Commit con el mensaje "Final de partida: estrellas que caen, barra de metas o de media y récord, y frase de lo que faltó".
