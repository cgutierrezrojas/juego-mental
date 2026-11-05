# Conexiones dentro del plan gratis — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que Realtime Database solo esté conectada mientras se usa (chat, mesa, duelo en vivo), pasando el estado en línea y las invitaciones en vivo a Firestore. Es la parte A de `docs/superpowers/specs/2026-11-05-movil-y-conexiones-design.md`.

**Architecture:** todo el acceso a Firebase vive en `games/nube.js`. Ahí se agrega un contador de uso de Realtime Database (`goOnline` / `goOffline`), se envuelven las funciones existentes y se cambian estado e invitaciones a Firestore, sin cambiar sus nombres públicos (salvo `borrarInvitacion`). La lógica pura nueva (`enLinea`) va en `games/amigos.js` con su prueba en `tests.js`.

**Tech Stack:** JS (módulos ES) sin compilación, Firebase SDK 10.12.2 desde gstatic, reglas de Firestore y Realtime Database, `node tests.js`, pruebas de navegador con CDP desde el scratchpad.

## Global Constraints

- Rama `conexiones-spark` desde `master`; al final, ff-merge a `master` y push.
- Commits con el correo anónimo ya configurado y la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Textos, nombres y comentarios en español, con el estilo del código vecino.
- **El usuario publica `firestore.rules` y `database.rules.json`** a mano: se le da el texto y se espera su «listo» antes de las pruebas con Firebase real.
- No leer ni subir `android/`.
- Antes de publicar: `VERSION` de `sw.js` al día (`node tests.js` la exige).
- Servidor de pruebas: `python -m http.server 8754` en el repo; se detiene solo por su PID.

---

### Task 1: `enLinea` (puro) y su prueba

**Files:**
- Modify: `games/amigos.js` (al final)
- Test: `tests.js` (sección `// --- amigos.js ---`)

**Interfaces:**
- Produces: `enLinea(dato, ahora, limite = 5 * 60000)` → `'conectado' | 'jugando' | 'ausente' | 'desconectado'`. `dato` = `{ estado, cuando }` (cuando en ms) o `null`.

- [ ] **Step 1: Prueba que falla** (en `tests.js`, agrega `enLinea` al import de `./games/amigos.js` de la sección amigos):

```js
probar('enLinea: el estado vale 5 minutos; después, desconectado', () => {
  const ahora = 10_000_000;
  assert(enLinea({ estado: 'jugando', cuando: ahora - 60000 }, ahora) === 'jugando');
  assert(enLinea({ estado: 'ausente', cuando: ahora - 299000 }, ahora) === 'ausente');
  assert(enLinea({ estado: 'conectado', cuando: ahora - 301000 }, ahora) === 'desconectado');
  assert(enLinea({ estado: 'conectado' }, ahora) === 'desconectado');
  assert(enLinea(null, ahora) === 'desconectado');
});
```

- [ ] **Step 2:** `node tests.js` → falla (`enLinea` no existe).
- [ ] **Step 3: Implementa** en `games/amigos.js`:

```js
// Estado que se muestra de un amigo: el último publicado, salvo que tenga más de `limite` ms (la app se cerró sin avisar).
export const enLinea = (dato, ahora, limite = 5 * 60000) =>
  !dato?.cuando || ahora - dato.cuando > limite ? 'desconectado' : dato.estado;
```

- [ ] **Step 4:** `node tests.js` → la nueva pasa. (La de `sw.js` fallará hasta la Task 6; es lo esperado.)
- [ ] **Step 5:** `git add games/amigos.js tests.js && git commit -m "Amigos: enLinea da por desconectado un estado de más de 5 minutos"`

### Task 2: Realtime Database solo mientras se usa

**Files:**
- Modify: `games/nube.js` (`iniciar` y todas las funciones que usan `rt`)

**Interfaces:**
- Produces (internas de `nube.js`): `usar()` → `soltar()`; `conRed(f)` → promesa de `f()`; `escuchando(deshacer)` → función para dejar de escuchar.
- Las funciones exportadas no cambian de nombre ni de firma.

- [ ] **Step 1: Contador.** Después de `let desfase = 0;`:

```js
// Realtime Database solo conectada mientras algo la usa (el plan gratis admite 100 conexiones a la vez).
// El SDK no cierra solo la conexión: al quedar sin uso, se desconecta a los 30 s.
let enUso = 0;
let apagar;
function usar() {
  clearTimeout(apagar);
  if (enUso++ === 0) rt.goOnline(base);
  let suelto = false;
  return () => {
    if (suelto) return;
    suelto = true;
    if (--enUso === 0) apagar = setTimeout(() => enUso === 0 && rt.goOffline(base), 30000);
  };
}
// Una lectura o escritura suelta: conectada hasta que termina.
async function conRed(f) {
  const soltar = usar();
  try {
    return await f();
  } finally {
    soltar();
  }
}
// Una escucha: conectada hasta que se deja de escuchar.
function escuchando(deshacer) {
  const soltar = usar();
  return () => {
    deshacer();
    soltar();
  };
}
```

- [ ] **Step 2:** en `iniciar`, después de `base = rt.getDatabase(firebase);`, agrega `rt.goOffline(base);`.
- [ ] **Step 3: Envuelve** cada función de Realtime Database (mismo cuerpo, dentro de `conRed(() => …)` o `escuchando(…)`):

```js
export const verSala = (id, alCambiar) => escuchando(rt.onValue(rt.ref(base, `vivo/${id}`), (d) => alCambiar(d.val()), () => alCambiar(null)));
export const cambiarSala = (id, cambios) => conRed(() => rt.update(rt.ref(base, `vivo/${id}`), cambios));
export const borrarSala = (id) => conRed(() => rt.remove(rt.ref(base, `vivo/${id}`))).catch(() => {});
export const prepararAbandono = (id, uid) => conRed(() => rt.onDisconnect(rt.ref(base, `vivo/${id}/fuera/${uid}`)).set(true)).catch(() => {});
export const cancelarAbandono = (id, uid) => conRed(() => rt.onDisconnect(rt.ref(base, `vivo/${id}/fuera/${uid}`)).cancel()).catch(() => {});

export function escucharChat(id, alLlegar, alFallar) {
  const consulta = rt.query(rt.ref(base, `chats/${id}/mensajes`), rt.limitToLast(50));
  return escuchando(rt.onChildAdded(consulta, (d) => alLlegar({ id: d.key, ...d.val() }), alFallar));
}
export const enviarMensaje = (id, de, texto) => conRed(() => rt.push(rt.ref(base, `chats/${id}/mensajes`), { de, texto, cuando: rt.serverTimestamp() }));
export async function ultimoMensaje(id) {
  let ultimo = null;
  (await conRed(() => rt.get(rt.query(rt.ref(base, `chats/${id}/mensajes`), rt.limitToLast(1))))).forEach((d) => {
    ultimo = d.val();
  });
  return ultimo;
}
export const marcarLeido = (uid, id) => conRed(() => rt.set(rt.ref(base, `leidos/${uid}/${id}`), rt.serverTimestamp())).catch(() => {});
export const leidoHasta = async (uid, id) => (await conRed(() => rt.get(rt.ref(base, `leidos/${uid}/${id}`)))).val() ?? 0;
export const bloquear = (uid, otro, apodo) => conRed(() => rt.set(rt.ref(base, `bloqueos/${uid}/${otro}`), apodo));
export const desbloquear = (uid, otro) => conRed(() => rt.remove(rt.ref(base, `bloqueos/${uid}/${otro}`)));
export const bloqueados = async (uid) => (rt ? (await conRed(() => rt.get(rt.ref(base, `bloqueos/${uid}`)))).val() ?? {} : {});
export const denunciar = (datos) => conRed(() => rt.push(rt.ref(base, 'denuncias'), { ...datos, cuando: rt.serverTimestamp() }));

export const crearMesa = (mesa) => conRed(async () => {
  const ref = rt.push(rt.ref(base, 'mesas'));
  await rt.set(ref, { ...mesa, creada: rt.serverTimestamp(), actualizada: rt.serverTimestamp() });
  const { x, o } = mesa.jugadores;
  await rt.set(rt.ref(base, `misMesas/${x}/${ref.key}`), { juego: mesa.juego, rival: o, nombreRival: mesa.nombres[o] });
  await rt.set(rt.ref(base, `misMesas/${o}/${ref.key}`), { juego: mesa.juego, rival: x, nombreRival: mesa.nombres[x] });
  return ref.key;
});
export const verMesa = (id, alCambiar) => escuchando(rt.onValue(rt.ref(base, `mesas/${id}`), (d) => alCambiar(d.val()), () => alCambiar(null)));
export const leerMesa = async (id) => (await conRed(() => rt.get(rt.ref(base, `mesas/${id}`)))).val();
export const jugarMesa = (id, estado, ganador) => conRed(() => rt.update(rt.ref(base, `mesas/${id}`), { estado, ...(ganador ? { ganador } : {}), actualizada: rt.serverTimestamp() }));
export const rendirseMesa = (id, uid, ganador) => conRed(() => rt.update(rt.ref(base, `mesas/${id}`), { [`rendido/${uid}`]: true, ganador, actualizada: rt.serverTimestamp() }));
export const misMesasDe = async (uid) => (rt ? (await conRed(() => rt.get(rt.ref(base, `misMesas/${uid}`)))).val() ?? {} : {});
export const quitarDeMisMesas = (uid, id) => conRed(() => rt.remove(rt.ref(base, `misMesas/${uid}/${id}`))).catch(() => {});
export const borrarMesa = (id) => conRed(() => rt.remove(rt.ref(base, `mesas/${id}`))).catch(() => {});
```

`guardarAmigosEstados` y `borrarTiempoReal` se envuelven en la Task 3 (cambian ahí). `crearSalaVivo` y las invitaciones, en la Task 4.

- [ ] **Step 4:** `node tests.js` (todo pasa salvo `sw.js`) y en el navegador abrir la app sin errores de consola.
- [ ] **Step 5:** `git commit -am "Nube: Realtime Database solo conectada mientras se usa (se desconecta a los 30 s sin uso)"`

### Task 3: Estado en línea en Firestore

**Files:**
- Modify: `games/nube.js` (bloque de estados: `iniciarEstados`, `ponerEstado`, `pararEstados`, `verEstado`, `guardarAmigosEstados`; `borrarTodo` y `borrarTiempoReal`)
- Modify: `firestore.rules` (colección `estados`)
- Modify: `database.rules.json` (quitar `estado`)

**Interfaces:**
- Consumes: `enLinea` (Task 1), `conRed` (Task 2).
- Produces: mismas firmas que hoy (`iniciarEstados(uid)`, `ponerEstado(estado)`, `pararEstados()`, `verEstado(uid, alCambiar)` → dejar, `guardarAmigosEstados(uid, uids)`). `app/` no cambia.

- [ ] **Step 1:** importa `enLinea` en `games/nube.js`: `import { codigoAmigo, enLinea } from './amigos.js';`
- [ ] **Step 2:** reemplaza el bloque de estados (desde `let refEstado = null;` hasta el final de `guardarAmigosEstados`) por:

```js
// --- Estados en línea (`estados/{uid}` en Firestore: { estado, cuando, amigos }; solo lo leen los de `amigos`) ---

let miEstado = null; // { uid, estado } mientras hay sesión
let latido;

export const hayEstados = () => Boolean(rt);

const escribirEstado = (extra = {}) =>
  miEstado && fs.setDoc(documento('estados', miEstado.uid), { estado: miEstado.estado, cuando: fs.serverTimestamp(), ...extra }, { merge: true }).catch(() => {});

// Publica el estado y lo repite cada 3 min mientras la app está a la vista (si no, a los 5 min se ve desconectado).
export function iniciarEstados(uid) {
  if (!rt) return;
  miEstado = { uid, estado: 'conectado' };
  clearInterval(latido);
  latido = setInterval(() => !document.hidden && escribirEstado(), 3 * 60000);
}

export function ponerEstado(estado) {
  if (!miEstado) return;
  miEstado.estado = estado;
  escribirEstado();
}

// Antes de cerrar sesión (después ya no se puede escribir).
export async function pararEstados() {
  clearInterval(latido);
  if (miEstado) {
    miEstado.estado = 'desconectado';
    await escribirEstado();
  }
  miEstado = null;
}

// Avisa con alCambiar(estado) al cambiar el de un amigo, y cada minuto (para notar que se le pasó el tiempo).
// Si aún no hay permiso (el amigo no ha abierto Amigos desde que lo son), se reintenta cada 20 s.
export function verEstado(uid, alCambiar) {
  if (!rt) return () => {};
  let dato = null;
  let parar = () => {};
  let espera;
  const avisar = () => alCambiar(enLinea(dato, Date.now()));
  const escuchar = () => {
    parar = fs.onSnapshot(documento('estados', uid), (d) => {
      dato = d.exists() ? { estado: d.data().estado, cuando: d.data().cuando?.toMillis() } : null;
      avisar();
    }, () => {
      dato = null;
      avisar();
      espera = setTimeout(escuchar, 20000);
    });
  };
  escuchar();
  const reloj = setInterval(avisar, 60000);
  return () => {
    clearTimeout(espera);
    clearInterval(reloj);
    parar();
  };
}

// Quiénes pueden ver mi estado (Firestore) y escribirme o retarme (Realtime Database, por sus reglas).
export function guardarAmigosEstados(uid, uids) {
  if (!rt) return Promise.resolve();
  escribirEstado({ amigos: uids });
  return conRed(() => rt.set(rt.ref(base, `amigos/${uid}`), Object.fromEntries(uids.map((u) => [u, true])))).catch(() => {});
}
```

- [ ] **Step 3: Borrar cuenta.** En `borrarTodo`, agrega a la lista del `Promise.all` de Firestore: `fs.deleteDoc(documento('estados', uid)),`. En `borrarTiempoReal`:
  - quita `await rt.onDisconnect(rt.ref(base, \`estado/${uid}\`)).cancel();`;
  - cambia `['estado', 'amigos', 'leidos', 'bloqueos']` por `['amigos', 'leidos', 'bloqueos']`;
  - envuelve el cuerpo: `async function borrarTiempoReal(uid, otros) { return conRed(async () => { …cuerpo actual… }); }`.
  `pararEstados()` sigue llamándose ahí (ya no toca Realtime Database).
- [ ] **Step 4: Reglas de Firestore.** En `firestore.rules`, después de `match /perfiles/{uid} { … }`:

```
    // Estado en línea: lo escribe su dueño; lo leen él y los amigos que él lista.
    match /estados/{uid} {
      allow read: if request.auth != null && (request.auth.uid == uid || request.auth.uid in resource.data.get('amigos', []));
      allow delete: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null && request.auth.uid == uid && estadoValido(request.resource.data);
    }
```

  y junto a las demás funciones:

```
    function estadoValido(d) {
      return d.keys().hasOnly(['estado', 'cuando', 'amigos']) && d.keys().hasAll(['estado', 'cuando'])
        && d.estado in ['conectado', 'jugando', 'ausente', 'desconectado']
        && d.cuando == request.time
        && (!('amigos' in d) || (d.amigos is list && d.amigos.size() <= 500));
    }
```

- [ ] **Step 5: Reglas de Realtime Database.** En `database.rules.json`, borra el bloque `"estado": { "$uid": { … } },` de la raíz. El de dentro de `vivo/$sala` se queda.
- [ ] **Step 6:** `node tests.js` (todo salvo `sw.js`).
- [ ] **Step 7:** `git commit -am "Estado en línea en Firestore (estados/{uid}) con latido cada 3 min; Realtime Database ya no lo guarda"`

### Task 4: Invitaciones en vivo en Firestore

**Files:**
- Modify: `games/nube.js` (`crearSalaVivo`, `escucharInvitaciones`, `borrarInvitacion`, `borrarTodo`, `borrarTiempoReal`)
- Modify: `app/vivo.js` (llamadas a `borrarInvitacion`; bloqueados en `recibirInvitacion`)
- Modify: `firestore.rules` (colección `invitacionesVivo`)
- Modify: `database.rules.json` (quitar `invitaciones`)

**Interfaces:**
- Consumes: `conRed` (Task 2).
- Produces: `escucharInvitaciones(uid, alLlegar)` → dejar; `alLlegar(id, { de, para, nombre, juegos, dificultad, cuando })` con `cuando` en ms. `borrarInvitacion(sala)` (**cambia**: sin `uid`).

- [ ] **Step 1:** en `games/nube.js`:

```js
// Crea la sala y avisa al amigo (`invitacionesVivo/{sala}` en Firestore). Devuelve el id de la sala.
export async function crearSalaVivo(sala) {
  const id = await conRed(async () => {
    const ref = rt.push(rt.ref(base, 'vivo'));
    await rt.set(ref, sala);
    return ref.key;
  });
  await fs.setDoc(fs.doc(db, 'invitacionesVivo', id), {
    de: sala.anfitrion, para: sala.invitado, nombre: sala.nombres[sala.anfitrion], juegos: sala.juegos, dificultad: sala.dificultad, cuando: fs.serverTimestamp(),
  });
  return id;
}
```

```js
export const escucharInvitaciones = (uid, alLlegar) =>
  fs.onSnapshot(fs.query(fs.collection(db, 'invitacionesVivo'), fs.where('para', '==', uid)), (s) => {
    for (const c of s.docChanges()) if (c.type === 'added') alLlegar(c.doc.id, { ...c.doc.data(), cuando: c.doc.data().cuando?.toMillis() ?? 0 });
  }, () => {});
export const borrarInvitacion = (sala) => fs.deleteDoc(fs.doc(db, 'invitacionesVivo', sala)).catch(() => {});
```

- [ ] **Step 2: Borrar cuenta.** En `borrarTodo`, antes del `Promise.all`:

```js
  const misInvitaciones = async (campo) => (await fs.getDocs(fs.query(fs.collection(db, 'invitacionesVivo'), fs.where(campo, '==', uid)))).docs.map((d) => d.id);
  const invitacionesVivo = rt ? [...await misInvitaciones('de'), ...await misInvitaciones('para')] : [];
```

  y en la lista: `...invitacionesVivo.map((id) => borrarInvitacion(id)),`. En `borrarTiempoReal` quita `hijos(\`invitaciones/${uid}\`)` del `Promise.all` (queda `const [amigos, mesas] = …`) y la línea `...salas.map(…)`.
- [ ] **Step 3: `app/vivo.js`.** Cambia las cuatro llamadas `E.nube.borrarInvitacion(x, id)` por `E.nube.borrarInvitacion(id)`. Al comienzo de `recibirInvitacion`, después del `if` del reto viejo, agrega:

```js
  // Firestore no ve los bloqueos (están en Realtime Database): el reto de alguien bloqueado se descarta aquí.
  const bloqueos = await E.nube.bloqueados(E.usuario.uid).catch(() => ({}));
  if (bloqueos[invitacion.de]) return E.nube.borrarInvitacion(id);
```

  y vuelve la función `async` (`export async function recibirInvitacion(id, invitacion)`).
- [ ] **Step 4: Reglas de Firestore**, después de `estados`:

```
    // Reto en vivo: lo crea quien reta a un amigo; lo leen y borran los dos. La sala está en Realtime Database.
    match /invitacionesVivo/{sala} {
      allow read, delete: if request.auth != null && (resource.data.de == request.auth.uid || resource.data.para == request.auth.uid);
      allow create: if request.auth != null && invitacionValida(request.resource.data);
    }
```

```
    function invitacionValida(d) {
      return d.keys().hasOnly(['de', 'para', 'nombre', 'juegos', 'dificultad', 'cuando'])
        && d.de == request.auth.uid && d.para is string && nombre(d.nombre)
        && d.juegos is list && d.juegos.size() >= 1 && d.juegos.size() <= 5
        && d.dificultad is string && d.dificultad.size() <= 20
        && d.cuando == request.time
        && sonAmigos(d.de, d.para);
    }
```

- [ ] **Step 5:** en `database.rules.json`, borra el bloque `"invitaciones": { … },` de la raíz.
- [ ] **Step 6:** `node tests.js` (todo salvo `sw.js`).
- [ ] **Step 7:** `git commit -am "Retos en vivo: la invitación va en Firestore (invitacionesVivo); los de alguien bloqueado se descartan"`

### Task 5: Reglas publicadas y pruebas en el navegador

**Files:**
- Create (scratchpad, no van al repo): `s8a.js` (estado, invitación, conexión), `s8b.js` (ataques a las reglas)

- [ ] **Step 1:** pasar al usuario el texto completo de `firestore.rules` y `database.rules.json` con las instrucciones de siempre (Consola de Firebase › Firestore › Reglas › Publicar; Realtime Database › Reglas › Publicar). Esperar su «listo».
- [ ] **Step 2: `s8a.js`** con dos cuentas anónimas (patrón de `s7e.js`: `initializeApp(CONFIG, nombre)` por cuenta), amigos con solicitud aceptada:
  - A escribe su estado con `amigos: [B]`; B lo lee (`jugando`); C (no amigo) recibe `permission-denied`.
  - A crea `invitacionesVivo/{id}` para B; B la ve con `onSnapshot` `where('para','==',B)`; B la borra.
  - **Conexión:** en la app (cuenta propia), con `import(SDK + 'firebase-database.js')` y `getDatabase(getApp())`, escuchar `.info/connected`: `false` al cargar; abrir un chat → `true`; cerrar y esperar 31 s → `false`.
- [ ] **Step 3: `s8b.js`** (debe salir todo denegado): leer el estado de un no-amigo; estado con campo extra; estado con `cuando` de otro momento; estado `'hackeando'`; invitación a un no-amigo; invitación con `de` de otra persona; sobrescribir una invitación existente; escribir en `estado/` o `invitaciones/` de Realtime Database.
- [ ] **Step 4: regresión** con los scripts de siempre del scratchpad: duelo en vivo completo (aceptar y rechazar), chat con no leídos, mesa con amigo y borrar cuenta (`s7c`), sin errores de consola. Al borrar cuenta, no queda `estados/{uid}` ni invitaciones.
- [ ] **Step 5:** limpieza de las cuentas de prueba (como en `s7e.js`).

### Task 6: Privacidad, service worker y publicación

**Files:**
- Modify: `privacidad.html` (línea del estado), `sw.js` (`VERSION`)

- [ ] **Step 1:** en `privacidad.html`, la línea del estado queda: `tus amigos, tus solicitudes de amistad y tu estado (conectado, jugando, ausente o desconectado, con la hora de la última vez), que solo ven tus amigos;`
- [ ] **Step 2:** `node tests.js` → copiar el `VERSION` que pide en `sw.js` → `node tests.js` todo ✅.
- [ ] **Step 3:** `git commit -am "Privacidad: el estado guarda la hora de la última vez; versión del service worker"`, ff-merge a `master`, `git push`. Comprobar que el workflow de Pages termine bien y la app en producción cargue sin errores.
- [ ] **Step 4:** actualizar la memoria (`estado-proyecto.md`): parte A hecha; siguen B (Capacitor) y C (anuncios).

---

## Preparación de B y C (la hace el usuario; sin código)

Los planes de B (Capacitor) y C (AdMob y compras) se escriben cuando esto esté listo:

1. **Android Studio** instalado (developer.android.com/studio). Al abrirlo la primera vez, aceptar las licencias del SDK. Trae el JDK 21 que pide Capacitor 8.
2. **Un celular Android con depuración USB** (Ajustes › Acerca del teléfono › tocar 7 veces «Número de compilación» › Opciones de desarrollador › Depuración USB), o un emulador creado en Android Studio.
3. **Cuenta de AdMob** (admob.google.com, gratis), con la app «Pa'l Rato» (Android) creada; anotar el **ID de la app** y crear dos bloques: «Recompensado» e «Intersticial».
4. **Play Console:** perfil de pagos configurado y el producto de compra única **`quitar_anuncios`** (se puede crear después de subir la primera versión).
5. La app Capacitor reutiliza el **nombre de paquete** de la TWA, `io.github.cgutierrezrojas.juegomental`, y la misma llave (`signing.keystore`, que no sale de `android/`).
