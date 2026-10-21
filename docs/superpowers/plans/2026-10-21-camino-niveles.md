# F1: camino de niveles. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cambiar la cuadrícula de niveles por un camino en zigzag, poner siempre visibles los retos de hoy y abrir cada nivel en una tarjeta `<dialog>`.

**Architecture:**
- La lógica de niveles no cambia; solo se añade `DESCRIPCION_VARIANTE` en `games/niveles.js`.
- `pintarNiveles` en `main.js` se reescribe para dibujar:
  - el total;
  - los retos de hoy;
  - el cartel del mundo;
  - el camino.
- Una nueva función `abrirTarjeta` rellena y abre el `<dialog id="tarjeta-nivel">` que se añade a `index.html`.
- El zigzag y las animaciones son solo CSS.

**Tech Stack:** HTML, CSS y JS sin frameworks, con módulos ES. Pruebas con `node tests.js` y en Chrome con el script CDP.

**Spec:** `docs/superpowers/specs/2026-10-21-camino-niveles-design.md`

## Global Constraints

- **Código:** en español, sencillo, sin librerías ni compilación.
- **Accesibilidad:**
  - los botones de nivel y de reto mantienen su `aria-label` con el reto y las estrellas;
  - las filas son `role="group"`;
  - el orden del DOM es de 1 a 10.
- **Movimiento:** con `prefers-reduced-motion: reduce` no hay latido ni animación del cartel.
- **Temas:** deben funcionar el Colorido (`:root`) y el Neón (`[data-tema="oscuro"]`). Los fondos del Neón son transparentes y el color va en el borde y el texto.
- **Pantalla:** sin desplazamiento horizontal a 390 px de ancho.
- **Commits:** con el correo anónimo configurado y el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Explicación de las variantes

**Files:**
- Modify: `games/niveles.js` (tras `NOMBRE_VARIANTE`)
- Test: `tests.js` (prueba 'niveles: mundos sin fin con variantes')

**Interfaces:**
- Produces: `DESCRIPCION_VARIANTE: { maraton, relampago, precision } → string`

- [ ] **Step 1: Escribir la prueba.** En `tests.js`, añadir `DESCRIPCION_VARIANTE, VARIANTES` al import de `./games/niveles.js` y, al final de la prueba 'niveles: mundos sin fin con variantes', esta línea:

```js
  assert(VARIANTES.every((v) => typeof DESCRIPCION_VARIANTE[v] === 'string' && DESCRIPCION_VARIANTE[v].length > 0), 'cada variante tiene su explicación');
```

- [ ] **Step 2: Comprobar que falla.** Ejecutar `node tests.js`. Se espera ❌ en esa prueba o un error de import.

- [ ] **Step 3: Implementar.** En `games/niveles.js`, debajo de `NOMBRE_VARIANTE`:

```js
export const DESCRIPCION_VARIANTE = {
  maraton: 'Más tiempo, más aciertos',
  relampago: 'Menos tiempo, menos aciertos',
  precision: 'La mitad de los niveles, sin fallar',
};
```

- [ ] **Step 4: Comprobar que pasa.** Ejecutar `node tests.js`. Se esperan 49 ✅ y ningún ❌.

- [ ] **Step 5: Commit.** Mensaje: "Niveles: explicación de cada variante".

### Task 2: Camino, retos de hoy, cartel y tarjeta

**Files:**
- Modify: `index.html` (dentro de `<main>`, tras la sección `previa`)
- Modify: `main.js` (import, variables de estado, `abrirPrevia`, `pintarNiveles` y su sustituto, `btn-jugar`)
- Modify: `styles.css` (quitar la cuadrícula, los mundos y el objetivo antiguos; añadir el bloque F1)

**Interfaces:**
- Consumes: `DESCRIPCION_VARIANTE` (Task 1), y `diariosConHoy`, `leerEstrellas`, `nivelJugado`, `vistaHoy`, `diarioElegido`, `nivelElegido` y `jugar` de `main.js`.
- Produces: `pintarNiveles(j)` y `abrirTarjeta(j)`, más la variable `mundoVisto`.

- [ ] **Step 1: Añadir el diálogo en `index.html`.** Va justo después de `</section>` de `#previa`:

```html
    <dialog id="tarjeta-nivel" aria-labelledby="tarjeta-titulo">
      <div class="tarjeta-dentro">
        <form method="dialog"><button aria-label="Cerrar">✕</button></form>
        <h3 id="tarjeta-titulo"></h3>
        <p id="tarjeta-texto"></p>
        <button id="tarjeta-jugar" class="grande color"></button>
      </div>
    </dialog>
```

- [ ] **Step 2: Cambiar el estado en `main.js`.**
  - Añadir `DESCRIPCION_VARIANTE` al import de niveles.
  - Debajo de `let diarioElegido…`, añadir:

```js
let mundoVisto = 1; // mundo que se ve en el camino (◀ ▶)
```

  - En `abrirPrevia`, sustituir el cuerpo por:

```js
  actual = j;
  eleccion = leerEleccion(j);
  nivelElegido = siguienteNivel(leerEstrellas(j.id));
  mundoVisto = mundoDe(nivelElegido);
  vistaHoy = false;
  pintarPrevia(j);
  mostrar('previa');
  document.querySelector('.camino .actual')?.scrollIntoView({ block: 'center' }); // el camino empieza en tu nivel
```

- [ ] **Step 3: Sustituir `pintarNiveles` por la versión nueva.** El bloque que se reemplaza va desde el comentario `// Modo Niveles:` hasta antes de `// Icono de cada modo`. Este es el código nuevo:

```js
const textoEstrellas = (e) => `${'⭐'.repeat(e)}${'☆'.repeat(3 - e)}`;

// Modo Niveles: total, 📅 retos de hoy, cartel del mundo (◀ ▶) y camino de sus 10 niveles (de abajo arriba).
// Tocar un nivel o un reto abre su tarjeta; el botón grande juega siempre el siguiente nivel.
function pintarNiveles(j) {
  const estrellas = leerEstrellas(j.id);
  const hoy = fechaLocal();
  const diarios = diariosConHoy(j.id);
  const delDia = diarios[hoy];
  const siguiente = siguienteNivel(estrellas);
  const grupo = (titulo, clase) => {
    const caja = el('div', clase);
    caja.setAttribute('role', 'group');
    caja.setAttribute('aria-label', titulo);
    return caja;
  };

  const retos = grupo('Retos de hoy', 'retos-hoy');
  delDia.niveles.forEach((n, i) => {
    const e = delDia.estrellas[i] || 0;
    const reto = configNivel(j.id, n).reto;
    const b = el('button', e > 0 ? 'hecho' : '');
    b.append(el('span', '', `${n} ${ICONO_RETO[reto]}`), el('small', '', textoEstrellas(e)));
    b.setAttribute('aria-label', `Reto de hoy ${i + 1}, nivel ${n}, ${NOMBRE_RETO[reto]}, ${e} de 3 estrellas`);
    b.onclick = () => {
      vistaHoy = true;
      diarioElegido = i;
      abrirTarjeta(j);
    };
    retos.append(b);
  });

  // Cartel: ◀ nombre y variante (explicada) ▶; ▶ llega hasta el mundo más alto desbloqueado.
  const mundo = mundoVisto;
  const primero = (mundo - 1) * NIVELES_POR_MUNDO + 1;
  const hechos = estrellas.slice(primero - 1, primero - 1 + NIVELES_POR_MUNDO).filter((e) => e > 0).length;
  const variante = varianteDe(j.id, mundo);
  const cartel = grupo('Mundo', 'cartel');
  if (siguiente === primero && siguiente > 1) cartel.classList.add('nuevo'); // recién abierto: entra con animación
  const flecha = (texto, clase, etiqueta, destino, apagada) => {
    const b = el('button', clase, texto);
    b.setAttribute('aria-label', etiqueta);
    b.disabled = apagada;
    b.onclick = () => {
      mundoVisto = destino;
      pintarNiveles(j);
      // El foco se queda en la flecha; si se ha apagado, pasa a la otra.
      const otra = clase === 'anterior' ? 'siguiente' : 'anterior';
      const misma = $('previa-niveles').querySelector(`.cartel .${clase}`);
      (misma.disabled ? $('previa-niveles').querySelector(`.cartel .${otra}`) : misma).focus();
    };
    return b;
  };
  const nombre = el('div', 'nombre-mundo');
  nombre.append(
    el('strong', '', `Mundo ${mundo}${variante ? ` · ${NOMBRE_VARIANTE[variante]}` : ''}`),
    el('small', '', `${variante ? `${DESCRIPCION_VARIANTE[variante]} · ` : ''}${hechos}/${NIVELES_POR_MUNDO}`),
  );
  cartel.append(
    flecha('◀', 'anterior', 'Mundo anterior', mundo - 1, mundo === 1),
    nombre,
    flecha('▶', 'siguiente', 'Mundo siguiente', mundo + 1, mundo >= mundoDe(siguiente)),
  );

  const camino = grupo(`Niveles del mundo ${mundo}`, 'camino');
  for (let n = primero; n < primero + NIVELES_POR_MUNDO; n++) {
    const libre = nivelLibre(estrellas, n);
    const e = estrellas[n - 1] || 0;
    const reto = configNivel(j.id, n).reto; // el reto real en este juego (los que no cambian nada salen como Normal)
    const clases = [n === siguiente ? 'actual' : e > 0 ? 'hecho' : '', reto === 'jefe' ? 'jefe' : ''].join(' ').trim();
    const b = el('button', clases);
    b.append(el('span', '', libre ? `${n}` : `🔒${n}`), el('small', '', libre ? `${ICONO_RETO[reto]}${textoEstrellas(e)}` : ''));
    if (n === siguiente) {
      const yo = el('span', 'yo', '🧑');
      yo.setAttribute('aria-hidden', 'true');
      b.append(yo);
    }
    b.disabled = !libre;
    b.setAttribute('aria-label', libre ? `Nivel ${n}, ${NOMBRE_RETO[reto]}, ${e} de 3 estrellas` : `Nivel ${n}, bloqueado`);
    b.onclick = () => {
      vistaHoy = false;
      nivelElegido = n;
      abrirTarjeta(j);
    };
    camino.append(b);
  }

  const racha = rachaDiaria(diarios, hoy);
  const total = el('p', 'total-estrellas', `⭐ ${estrellasDelJuego(j.id)}${racha ? ` · 📅🔥 ${racha}` : ''}`);
  $('previa-niveles').replaceChildren(total, el('h3', 'categoria', '📅 Retos de hoy'), retos, cartel, camino);
  $('btn-jugar').textContent = `▶ Jugar nivel ${siguiente}`;
}

// Tarjeta (diálogo) del nivel o reto elegido: objetivo, tus estrellas y botón para jugarlo.
function abrirTarjeta(j) {
  const n = nivelJugado();
  const cfg = configNivel(j.id, n);
  const deVariante = cfg.variante ? ` · ${NOMBRE_VARIANTE[cfg.variante]}` : '';
  let titulo;
  let e;
  let extra = '';
  let boton;
  if (vistaHoy) {
    const diarios = diariosConHoy(j.id);
    const racha = rachaDiaria(diarios, fechaLocal());
    e = diarios[fechaLocal()].estrellas[diarioElegido] || 0;
    titulo = `📅 Reto de hoy ${diarioElegido + 1}/3 · Nivel ${n}`;
    extra = racha ? `Supera los 3 hoy para mantener tu 📅🔥 ${racha}` : 'Supera los 3 hoy para empezar una racha 📅🔥';
    boton = `▶ Jugar reto ${diarioElegido + 1}`;
  } else {
    e = leerEstrellas(j.id)[n - 1] || 0;
    titulo = `Nivel ${n}`;
    boton = e > 0 && e < 3 ? '▶ Jugar por ⭐⭐⭐' : '▶ Jugar';
  }
  $('tarjeta-titulo').textContent = `${titulo}${deVariante} · ${NOMBRE_RETO[cfg.reto]}`;
  $('tarjeta-texto').textContent = [`Tienes ${textoEstrellas(e)}`, cfg.texto, extra].filter(Boolean).join('\n');
  $('tarjeta-jugar').textContent = boton;
  $('tarjeta-nivel').classList.toggle('diaria', vistaHoy);
  $('tarjeta-nivel').showModal();
}
```

- [ ] **Step 4: Conectar los botones.** Al final de `main.js`, sustituir `$('btn-jugar').onclick = jugar;` por:

```js
// En Niveles, el botón grande juega siempre el siguiente nivel (aunque antes se mirara otro en su tarjeta).
$('btn-jugar').onclick = () => {
  if (eleccion.modo === 'niveles') {
    vistaHoy = false;
    nivelElegido = siguienteNivel(leerEstrellas(actual.id));
  }
  jugar();
};
$('tarjeta-jugar').onclick = () => {
  $('tarjeta-nivel').close();
  jugar();
};
// Tocar fuera de la tarjeta (en el fondo oscuro) la cierra.
$('tarjeta-nivel').onclick = (e) => {
  if (e.target === e.currentTarget) e.currentTarget.close();
};
```

  Después, quitar del import los nombres que ya no se usen (comprobar con grep `ICONO_RETO`, `mundoDe`…) y ejecutar `node --check main.js`.

- [ ] **Step 5: CSS.**
  - En `styles.css`, borrar:
    - las reglas `.niveles…` y `.objetivo` del bloque "Previa: cuadrícula de niveles", conservando `#previa-niveles` y la regla de `[hidden]`;
    - el bloque "Niveles: total de estrellas, mundos…" entero, salvo `.total-estrellas`;
    - el bloque "Niveles sin fin: selector…", conservando el aviso 📅 de las tarjetas.
  - Añadir al final:

```css
/* F1: camino de niveles */
.retos-hoy { display: flex; gap: 8px; }
.retos-hoy button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 0;
  font-size: 0.95rem;
  border-color: var(--azul);
}
.retos-hoy button.hecho { background: var(--azul); color: #fff; }
[data-tema="oscuro"] .retos-hoy button.hecho { background: transparent; color: var(--azul); box-shadow: 0 0 8px var(--azul); }
.retos-hoy small,
.camino small { font-size: 0.6rem; letter-spacing: -1px; }

.cartel {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border: 2px solid var(--acento);
  border-radius: 16px;
  background: var(--acento);
  color: #fff;
}
[data-tema="oscuro"] .cartel { background: transparent; color: var(--acento); box-shadow: 0 0 8px var(--acento); }
.cartel button { flex: 0 0 44px; padding: 8px 0; }
.cartel button:disabled { opacity: 0.35; cursor: default; }
.nombre-mundo { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; }
.nombre-mundo small { font-size: 0.8rem; font-weight: 600; opacity: 0.9; }
.cartel.nuevo { animation: mundo-nuevo 0.6s ease-out; }
@keyframes mundo-nuevo {
  from { scale: 0.6; opacity: 0; }
  60% { scale: 1.08; }
}

/* Camino: de abajo arriba (column-reverse), en zigzag con `translate` (deja `scale` libre para el latido) */
.camino {
  position: relative;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}
.camino::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  border-left: 3px dashed currentColor;
  opacity: 0.2;
}
.camino button {
  position: relative;
  width: 58px;
  height: 58px;
  padding: 0;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  line-height: 1.1;
}
.camino button:nth-child(4n + 2) { translate: 60px 0; }
.camino button:nth-child(4n) { translate: -60px 0; }
.camino button:disabled { opacity: 0.4; cursor: default; }
.camino button.hecho { background: var(--verde); color: #fff; }
.camino button.jefe { width: 72px; height: 72px; background: var(--amarillo); color: #fff; }
.camino button.actual {
  width: 70px;
  height: 70px;
  background: var(--acento);
  color: #fff;
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--acento) 30%, transparent), var(--relieve);
  animation: latir-suave 1.4s infinite;
}
@keyframes latir-suave { 50% { scale: 1.08; } }
.camino .yo { position: absolute; top: -8px; right: -24px; font-size: 1.3rem; }
[data-tema="oscuro"] .camino button.hecho { background: transparent; color: var(--verde); border-color: var(--verde); }
[data-tema="oscuro"] .camino button.jefe { background: transparent; color: var(--amarillo); border-color: var(--amarillo); }
[data-tema="oscuro"] .camino button.actual { background: transparent; color: var(--acento); border-color: var(--acento); box-shadow: 0 0 12px var(--acento); }

/* Tarjeta del nivel: diálogo anclado abajo */
#tarjeta-nivel {
  width: min(420px, 100% - 24px);
  margin: auto auto 12px;
  padding: 0;
  border: none;
  border-top: 6px solid var(--acento);
  border-radius: 20px;
  background: var(--fondo);
  color: var(--texto);
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.3);
}
#tarjeta-nivel.diaria { border-top-color: var(--azul); }
#tarjeta-nivel[open] { animation: subir 0.2s ease-out; }
@keyframes subir { from { translate: 0 40px; opacity: 0; } }
#tarjeta-nivel::backdrop { background: rgba(0, 0, 0, 0.4); }
.tarjeta-dentro { display: flex; flex-direction: column; gap: 10px; padding: 16px; }
.tarjeta-dentro h3 { margin: 0 40px 0 0; }
.tarjeta-dentro p { margin: 0; font-weight: 700; white-space: pre-line; }
.tarjeta-dentro form { position: absolute; top: 10px; right: 10px; }
.tarjeta-dentro form button { padding: 4px 10px; font-size: 1rem; box-shadow: none; }
#tarjeta-jugar { --c: var(--acento); }
#tarjeta-nivel.diaria #tarjeta-jugar { --c: var(--azul); }

@media (prefers-reduced-motion: reduce) {
  .camino button.actual,
  .cartel.nuevo,
  #tarjeta-nivel[open] { animation: none; }
}
```

- [ ] **Step 6: Probar en Chrome (CDP, 390×780).** Servidor: `python -m http.server <puerto>`. Comprobar:
  - al abrir Mayor en Niveles con 51 niveles ⭐, se ve el Mundo 6, con "Más tiempo, más aciertos · 1/10", y el nodo 52 lleva `.actual`;
  - tocar el nivel 51 abre `#tarjeta-nivel[open]` con "▶ Jugar por ⭐⭐⭐", y Esc la cierra;
  - tocar el reto 1 y "Jugar reto 1" lleva a jugar; al terminar, `diarios:mayor` guarda sus estrellas;
  - el botón grande juega el siguiente nivel;
  - `scrollWidth === 390`, sin errores en la consola;
  - capturas en los temas claro y oscuro.

- [ ] **Step 7: Commit.** Mensaje: "Niveles en camino: retos de hoy siempre visibles, cartel del mundo y tarjeta de nivel".
