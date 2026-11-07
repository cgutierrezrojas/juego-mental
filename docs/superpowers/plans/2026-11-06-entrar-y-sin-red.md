# Pedir cuenta y avisar sin internet — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que Duelos, Amigos, Ranking y los juegos contra amigos muestren una ventana para entrar (o un aviso de «sin internet») en vez de llevar a «Tú».

**Architecture:** Una ventana `#dialogo-cuenta` que pinta `ventanaCuenta()` en `app/cuenta.js`. `pedirCuenta(accion)` decide qué mostrar (sin red / nube caída / cargando / sin sesión) y resuelve `true` si hay sesión. `asegurarDuelista(accion)` (el punto por el que pasan todos los accesos sociales) la usa.

**Tech Stack:** JS sin compilación (ES modules), `<dialog>`.

Especificación: `docs/superpowers/specs/2026-11-06-entrar-y-sin-red-design.md`.

## Global Constraints

- Textos exactos (español): ver el código de abajo; no cambiarlos.
- Archivos con fin de línea CRLF: tras cada edición, verificar con `grep` que el cambio quedó.
- `node tests.js` debe pasar; al cambiar archivos de `ARCHIVOS` de `sw.js`, poner la `const VERSION` que pide la prueba.
- No leer ni tocar `android/` ni `app-android/keystore.properties`.
- Commit con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Ventana de cuenta y avisos sin red

**Files:**
- Modify: `index.html` (junto a `<dialog id="dialogo-nube">`)
- Modify: `app/estado.js` (estado `E`)
- Modify: `main.js` (carga de la nube, botones de ranking)
- Modify: `app/cuenta.js` (`pintarNube`, `alCambiarUsuario`, funciones nuevas)
- Modify: `app/duelos.js` (`asegurarDuelista`, `abrirDuelos`)
- Modify: `app/amigos.js` (`abrirAmigos`)
- Modify: `app/menu.js` (`pintarSugerencia`)
- Modify: `sw.js` (`VERSION`)

**Interfaces:**
- Produces: `pedirCuenta(accion: string): Promise<boolean>` (export de `app/cuenta.js`); `asegurarDuelista(accion = 'jugar con tus amigos'): Promise<boolean>`; `E.nubeFallo: boolean`.

- [ ] **Step 1: `index.html`** — tras el `</dialog>` de `dialogo-nube`, con la misma sangría:

```html
    <dialog id="dialogo-cuenta" aria-labelledby="cuenta-titulo">
      <div class="tarjeta-dentro"></div>
    </dialog>
```

- [ ] **Step 2: `app/estado.js`** — en `E`, tras `estadoNube`:

```js
  nubeFallo: false, // no se pudo cargar la nube (sin conexión al abrir): hay que recargar para reintentar
```

- [ ] **Step 3: `main.js`** — en el `.catch` de `import('./games/nube.js')`, tras `E.nube = null;` añadir `E.nubeFallo = true;`. En los dos botones de ranking: `asegurarDuelista()` → `asegurarDuelista('ver el ranking')` (`$('btn-ranking').onclick` y `$('btn-liga').onclick`).

- [ ] **Step 4: `app/cuenta.js`** — antes de `export function pintarNube()`:

```js
const errorInvitado = (e) => e.code === 'auth/admin-restricted-operation' || e.code === 'auth/operation-not-allowed'
  ? 'El modo invitado aún no está activado en Firebase.'
  : 'No se pudo entrar como invitado (¿sin conexión?).';

// Tras entrar: espera a que alCambiarUsuario apunte al usuario (si Firebase abrió sesión).
async function conSesion() {
  if (!E.nube.usuarioActual()) return false;
  for (let i = 0; i < 50 && !E.usuario; i++) await new Promise((r) => setTimeout(r, 100));
  return Boolean(E.usuario);
}

// Ventana de cuenta: título, texto y acciones [texto, función, mensaje de error]. Resuelve true si alguna dejó sesión.
function ventanaCuenta(titulo, texto, acciones, cerrarTexto = 'Ahora no') {
  const dialogo = $('dialogo-cuenta');
  const h3 = el('h3', '', titulo);
  h3.id = 'cuenta-titulo';
  const estado = el('p', 'estado-nube', '');
  const botones = acciones.map(([etiqueta, accion, error], i) => {
    const b = el('button', i === 0 ? 'grande color' : '', etiqueta);
    if (i === 0) b.style.setProperty('--c', 'var(--azul)');
    b.onclick = async () => {
      estado.textContent = '';
      try {
        await accion();
        if (await conSesion()) dialogo.close('si');
      } catch (e) {
        estado.textContent = error(e);
      }
    };
    return b;
  });
  const cerrar = el('button', '', cerrarTexto);
  cerrar.onclick = () => dialogo.close();
  dialogo.firstElementChild.replaceChildren(h3, el('p', '', texto), ...botones, cerrar, estado);
  dialogo.returnValue = '';
  dialogo.showModal();
  return new Promise((listo) => dialogo.addEventListener('close', () => listo(dialogo.returnValue === 'si'), { once: true }));
}

// Antes de algo que necesita la nube: avisa si no hay internet o la nube no está, y pide entrar si no hay sesión.
// true si hay sesión (de antes o abierta desde la ventana).
export function pedirCuenta(accion) {
  if (!navigator.onLine) return ventanaCuenta('📶 Sin conexión', `Conéctate a internet para ${accion}. Los juegos de un jugador funcionan sin conexión.`, [], 'Entendido');
  if (E.nubeFallo) return ventanaCuenta('📶 Ya hay conexión', 'Toca Conectar para cargar tus amigos, duelos y ranking. Tu progreso está guardado.', [['Conectar', () => location.reload(), () => '']]);
  if (!E.nube || !E.sesionLista) return ventanaCuenta('☁️ Conectando…', 'Conectando con la nube. Inténtalo en unos segundos.', [], 'Entendido');
  if (E.usuario) return Promise.resolve(true);
  return ventanaCuenta(`Entra para ${accion}`, 'Con una cuenta guardas tu progreso en la nube, juegas con amigos y apareces en el ranking.', [
    ['Entrar con Google (recomendado)', () => E.nube.entrar(), () => 'No se pudo entrar. Inténtalo de nuevo.'],
    ['Seguir como invitado', () => E.nube.entrarInvitado(), errorInvitado],
  ]);
}
```

En `pintarNube`:
- La rama `if (!E.nube)` pasa a:

```js
  if (!E.nube) {
    partes.push(el('p', 'sin-datos', E.estadoNube || 'Conectando con la nube…'));
    if (E.nubeFallo && navigator.onLine) partes.push(boton('Conectar', () => location.reload()));
  } else if (!E.usuario) {
```

- El botón «Seguir como invitado» usa `errorInvitado`: `boton('Seguir como invitado', () => E.nube.entrarInvitado().catch((e) => avisarNube(errorInvitado(e)))),` (borrar el ternario que había).

En `alCambiarUsuario`, la línea `asegurarDuelista(); // lleva a ☁️ Nube; al entrar se abre el duelo` pasa a:

```js
      pedirCuenta('jugar este duelo'); // al entrar, alCambiarUsuario abre el duelo
```

y quitar `asegurarDuelista` del import de `./duelos.js` si ya no se usa en el archivo.

- [ ] **Step 5: `app/duelos.js`** — `asegurarDuelista` queda:

```js
// Antes de lo social: internet, nube y sesión (ver pedirCuenta), y apodo para el ranking.
export async function asegurarDuelista(accion = 'jugar con tus amigos') {
  if (!CONFIG) return false;
  if (!(await pedirCuenta(accion))) return false;
  if (!leer('nube:apodo')) await pedirApodo(false);
  return Boolean(leer('nube:apodo'));
}
```

(Mantener el comentario que tuviera encima si describe lo mismo; si no, usar este.) Import: `import { pedirApodo, pedirCuenta } from './cuenta.js';` — quitar `avisarNube` y `pintarEstadisticas` del import si ya no se usan en el archivo (comprobar con grep). En `abrirDuelos`: `asegurarDuelista('jugar duelos')`.

- [ ] **Step 6: `app/amigos.js`** — en `abrirAmigos`: `asegurarDuelista('ver a tus amigos')`.

- [ ] **Step 7: `app/menu.js`** — en `pintarSugerencia`, el botón `ir`:

```js
  const ir = el('button', '', E.usuario ? 'Ir a ☁️ Nube' : 'Crear cuenta');
  ir.onclick = () => {
    if (!E.usuario) return pedirCuenta('guardar tu progreso');
    pintarEstadisticas();
    mostrar('estadisticas');
    $('nube').scrollIntoView({ block: 'start' });
  };
```

Import: `import { pedirCuenta } from './cuenta.js';` (la importación circular cuenta↔menu es segura: solo se usa al pulsar).

- [ ] **Step 8: Verificar ediciones y pruebas**

```bash
grep -n "dialogo-cuenta" index.html; grep -n "nubeFallo" main.js app/estado.js app/cuenta.js; grep -n "pedirCuenta" app/*.js; grep -n "asegurarDuelista('" app/*.js main.js
```
Expected: el diálogo; `nubeFallo` en los 3 archivos; `pedirCuenta` definida y usada en cuenta, duelos y menu; acciones en amigos, duelos y main (2).

Run: `node tests.js` → ajustar `VERSION` en `sw.js` con la huella pedida → todo ✅.

- [ ] **Step 9: Prueba en Chrome** (servidor `python -m http.server 8754` en la raíz; pararlo solo por PID: `ps -ef | grep "http.server 8754" | grep -v grep | awk '{print $2}' | xargs -r kill`)

Con un script por CDP (o como se pueda), sin sesión:
1. Esperar a que cargue la nube (`E` no es global: esperar ~4 s) y tocar `#btn-amigos` → `#dialogo-cuenta[open]` con título «Entra para ver a tus amigos»; la pantalla visible sigue siendo `inicio`.
2. «Ahora no» → el diálogo se cierra y sigue `inicio`.
3. Tocar `#btn-ranking` → «Entra para ver el ranking»; «Seguir como invitado» → aparece el diálogo de apodo (el de `pedirApodo`); escribir un apodo y aceptar → pantalla `ranking`.
4. Recargar, `Object.defineProperty(navigator, 'onLine', { get: () => false })` y tocar `#btn-duelos` → «📶 Sin conexión» con «Conéctate a internet para jugar duelos…».
Sin errores de consola. Captura de la ventana del paso 1 en claro y oscuro.

- [ ] **Step 10: Commit**

```bash
git add index.html main.js sw.js app/estado.js app/cuenta.js app/duelos.js app/amigos.js app/menu.js
git commit -m "Ventana para entrar y aviso sin internet antes de duelos, amigos y ranking"
```
