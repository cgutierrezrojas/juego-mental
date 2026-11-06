# App Android con Capacitor — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Empaquetar Pa'l Rato como app Android con Capacitor 8, con la web dentro de la app y entrada nativa con Google.

**Architecture:** La web sigue igual (ES modules sin compilación). Un script copia los archivos de la app a `www/`; Capacitor los mete en el proyecto nativo `app-android/`. Dentro de la app, `games/nube.js` pide el `idToken` a la ventana nativa de Google (plugin `@capacitor-firebase/authentication`, `skipNativeAuth`) y abre la sesión en el SDK web de Firebase de siempre.

**Tech Stack:** Capacitor 8 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/app`), `@capacitor-firebase/authentication`, Firebase JS SDK 10.12.2 (gstatic), Gradle, Node 22.

Especificación: `docs/superpowers/specs/2026-11-05-movil-y-conexiones-design.md`, sección B.

## Global Constraints

- Paquete: `io.github.cgutierrezrojas.juegomental`. Nombre: `Pa'l Rato`. Color de fondo: `#fff7ec`.
- Proyecto nativo en `app-android/`. **Nunca leer, tocar ni listar `android/`** (guarda la llave y contraseñas). Nunca leer `app-android/keystore.properties`.
- La web no gana paso de compilación: nada de bundlers, imports de npm en el código web ni `type: module` en `package.json`.
- Todo lo de la web que sea solo de la app se condiciona con `window.Capacitor?.isNativePlatform?.()`; en el navegador el comportamiento no cambia.
- Archivos del repo con fin de línea CRLF: al editar, verificar con `grep` que el cambio quedó.
- `node tests.js` debe pasar. Si cambia un archivo de `ARCHIVOS` de `sw.js`, actualizar `const VERSION` con la huella que pide la prueba.
- Commits con el correo ya configurado y la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Textos y comentarios en español, al estilo del código vecino (comentarios breves, nombres en español).

---

### Task 1: Una sola lista de archivos de la app (`copiar-app.mjs`)

**Files:**
- Create: `copiar-app.mjs`
- Modify: `.github/workflows/pages.yml` (paso «Copiar solo los archivos de la app»)
- Modify: `.gitignore`

**Interfaces:**
- Produces: `node copiar-app.mjs <carpeta>` borra `<carpeta>` y copia en ella los archivos de la app. Task 3 lo usa con `www`.

- [ ] **Step 1: Guardar la lista actual para comparar**

```bash
git ls-files | grep -Ev '^(docs/|\.github/|tests\.(js|html)$|firestore\.rules$|database\.rules\.json$|\.gitignore$)' | sort > /tmp/antes.txt
```

- [ ] **Step 2: Crear `copiar-app.mjs`**

```js
// Copia los archivos de la app a la carpeta indicada: `_site` (GitHub Pages) o `www` (app Android con Capacitor).
// Quedan fuera las pruebas, los documentos, las reglas de Firebase y lo del proyecto Android.
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

const destino = process.argv[2];
if (!destino) throw new Error('Uso: node copiar-app.mjs <carpeta>');
const FUERA = /^(docs\/|\.github\/|app-android\/|assets\/|tests\.(js|html)$|firestore\.rules$|database\.rules\.json$|\.gitignore$|package(-lock)?\.json$|capacitor\.config\.json$|copiar-app\.mjs$)/;

rmSync(destino, { recursive: true, force: true });
for (const archivo of execSync('git ls-files', { encoding: 'utf8' }).split('\n')) {
  if (!archivo || FUERA.test(archivo)) continue;
  mkdirSync(join(destino, dirname(archivo)), { recursive: true });
  copyFileSync(archivo, join(destino, archivo));
}
```

- [ ] **Step 3: Comparar con la lista anterior**

```bash
node copiar-app.mjs /tmp/sitio && (cd /tmp/sitio && find . -type f | sed 's|^\./||' | sort) > /tmp/despues.txt && diff /tmp/antes.txt /tmp/despues.txt
```
Expected: la única diferencia es `copiar-app.mjs` (aún sin `git add`, no aparece en ninguna) → sin diferencias. Si hay diferencias, corregir `FUERA`.

- [ ] **Step 4: El flujo de Pages usa el script**

En `.github/workflows/pages.yml`, reemplazar el `run` del paso «Copiar solo los archivos de la app» por:

```yaml
        run: |
          node copiar-app.mjs _site
          touch _site/.nojekyll
          ls -R _site | head -50
```

- [ ] **Step 5: Ignorar lo generado**

Añadir al final de `.gitignore`:

```
node_modules/
www/
app-android/keystore.properties
```

- [ ] **Step 6: Pruebas y commit**

Run: `node tests.js` → todo ✅.

```bash
git add copiar-app.mjs .github/workflows/pages.yml .gitignore
git commit -m "Una sola lista de archivos de la app para Pages y Capacitor"
```

---

### Task 2: La web dentro de la app (service worker y Google nativo)

**Files:**
- Modify: `main.js:275` (registro del service worker)
- Modify: `games/nube.js` (`entrar`, `vincularGoogle`, `borrarCuenta`)
- Modify: `sw.js` (`const VERSION`)

**Interfaces:**
- Consumes: en la app, `window.Capacitor.Plugins.FirebaseAuthentication.signInWithGoogle()` → `{ credential: { idToken } }` (lo instala Task 3; con `skipNativeAuth: true` no abre sesión nativa). Si el usuario cierra la ventana, rechaza con un error cuyo mensaje contiene «cancel».
- Produces: misma API de `nube.js` que hoy (`entrar()`, `vincularGoogle()` → `'vinculada' | 'otra' | 'cancelada'`, `borrarCuenta()`).

- [ ] **Step 1: `main.js` no registra el service worker en la app**

Reemplazar:

```js
// Funcionamiento sin conexión. Solo va en localhost o HTTPS; si falla, la app sigue igual.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
```

por:

```js
// Funcionamiento sin conexión. Solo va en localhost o HTTPS; si falla, la app sigue igual.
// En la app Android los archivos ya vienen dentro: sin service worker.
if ('serviceWorker' in navigator && !window.Capacitor?.isNativePlatform?.()) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
```

- [ ] **Step 2: `games/nube.js`: credencial de Google con la ventana nativa**

Justo antes del comentario `// Ventana de Google para entrar; …` añadir:

```js
// En la app Android, Google se abre con la ventana nativa (plugin) y la sesión se abre aquí con su idToken.
const nativa = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins.FirebaseAuthentication : null;

// Credencial de Google desde la ventana nativa, o null si el usuario la cerró.
async function credencialNativa() {
  try {
    const { credential } = await nativa.signInWithGoogle();
    return au.GoogleAuthProvider.credential(credential.idToken);
  } catch (e) {
    if (/cancel/i.test(e.message)) return null;
    throw e;
  }
}
```

- [ ] **Step 3: `entrar()` usa la credencial nativa en la app**

Al inicio del cuerpo de `entrar()` (antes de `const google = …`):

```js
  if (nativa) {
    const credencial = await credencialNativa();
    if (credencial) await au.signInWithCredential(auth, credencial);
    return;
  }
```

- [ ] **Step 4: `vincularGoogle()` en la app**

Reemplazar la función entera por:

```js
export async function vincularGoogle() {
  const google = new au.GoogleAuthProvider();
  let credencial;
  try {
    if (nativa) {
      credencial = await credencialNativa();
      if (!credencial) return 'cancelada';
      await au.linkWithCredential(auth.currentUser, credencial);
    } else {
      await au.linkWithPopup(auth.currentUser, google);
    }
    return 'vinculada';
  } catch (e) {
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return 'cancelada';
    if (e.code !== 'auth/credential-already-in-use') throw e;
    await borrarTodo(auth.currentUser.uid).catch(() => {});
    await au.deleteUser(auth.currentUser).catch(() => {}); // el invitado ya no sirve
    await au.signInWithCredential(auth, credencial ?? au.GoogleAuthProvider.credentialFromError(e));
    return 'otra';
  }
}
```

(El comentario de arriba de la función se mantiene.)

- [ ] **Step 5: `borrarCuenta()` en la app**

Reemplazar la línea:

```js
    await au.reauthenticateWithPopup(u, new au.GoogleAuthProvider());
```

por:

```js
    if (nativa) await au.reauthenticateWithCredential(u, await credencialNativa());
    else await au.reauthenticateWithPopup(u, new au.GoogleAuthProvider());
```

- [ ] **Step 6: Verificar que los cambios quedaron (CRLF)**

```bash
grep -n "credencialNativa\|isNativePlatform" main.js games/nube.js
```
Expected: 1 en main.js; en nube.js la definición `nativa`, la función y 3 usos de `credencialNativa()`.

- [ ] **Step 7: Huella del service worker y pruebas**

Run: `node tests.js`. La prueba de `sw.js` falla con «pon const VERSION = '…'; en sw.js»: poner esa línea en `sw.js` y volver a correr → todo ✅.

- [ ] **Step 8: En el navegador nada cambia**

Con `python -m http.server 8754` en la raíz, abrir `http://localhost:8754/` en Chrome: carga sin errores de consola, el service worker se registra (`navigator.serviceWorker.getRegistration()` no es `undefined`) y el botón «Entrar con Google» sigue abriendo la ventana emergente. Parar el servidor solo por su PID:
`ps -ef | grep "http.server 8754" | grep -v grep | awk '{print $2}' | xargs -r kill`

- [ ] **Step 9: Commit**

```bash
git add main.js games/nube.js sw.js
git commit -m "App Android: sin service worker y Google con la ventana nativa"
```

---

### Task 3: Proyecto Capacitor en `app-android/`

**Files:**
- Create: `package.json`, `package-lock.json`, `capacitor.config.json`, `assets/logo.png`, `app-android/**` (generado)
- Modify: `app-android/variables.gradle`, `app-android/app/build.gradle` (tras generarlos)

**Interfaces:**
- Consumes: `node copiar-app.mjs www` (Task 1); el plugin `FirebaseAuthentication` que usa `games/nube.js` (Task 2).
- Produces: `npm run app` (copia la web y sincroniza Android); `app-android/app/build/outputs/apk/debug/app-debug.apk`.

- [ ] **Step 1: `package.json`**

```json
{
  "name": "pal-rato",
  "private": true,
  "scripts": {
    "app": "node copiar-app.mjs www && cap sync android"
  }
}
```

(Sin `"type"`.) Luego:

```bash
npm install @capacitor/core@8 @capacitor/android@8 @capacitor/app@8 @capacitor-firebase/authentication@8
npm install -D @capacitor/cli@8
```

Si `@capacitor-firebase/authentication@8` no existe, usar la última versión cuyo `peerDependencies` acepte `@capacitor/core` 8 (`npm view @capacitor-firebase/authentication peerDependencies`). Si pide `firebase` como dependencia par y npm la instala sola, se deja (no se usa desde la web).

- [ ] **Step 2: `capacitor.config.json`**

```json
{
  "appId": "io.github.cgutierrezrojas.juegomental",
  "appName": "Pa'l Rato",
  "webDir": "www",
  "backgroundColor": "#fff7ec",
  "android": { "path": "app-android" },
  "plugins": {
    "FirebaseAuthentication": { "skipNativeAuth": true, "providers": ["google.com"] }
  }
}
```

- [ ] **Step 3: Generar el proyecto nativo**

```bash
node copiar-app.mjs www
npx cap add android
```
Expected: se crea `app-android/` (no `android/`). Verificar: `test -f app-android/app/build.gradle && git status --short android | wc -l` → el segundo número es `0` (no se tocó `android/`).

- [ ] **Step 4: Proveedor Google del plugin**

En `app-android/variables.gradle`, dentro de `ext { … }`, añadir:

```gradle
    rgcfaIncludeGoogle = true
```

- [ ] **Step 5: Versión y firma en `app-android/app/build.gradle`**

En `defaultConfig`: `versionCode 2` y `versionName "2.0"`.

Antes del bloque `android {`:

```gradle
// Firma de la versión para Play: app-android/keystore.properties (no se sube; lo escribe el dueño de la llave).
def llave = rootProject.file('keystore.properties')
def firma = new Properties()
if (llave.exists()) llave.withInputStream { firma.load(it) }
```

Dentro de `android {`, antes de `buildTypes`:

```gradle
    signingConfigs {
        if (llave.exists()) {
            release {
                storeFile file(firma['storeFile'])
                storePassword firma['storePassword']
                keyAlias firma['keyAlias']
                keyPassword firma['keyPassword']
            }
        }
    }
```

Y dentro de `buildTypes { release { … } }`:

```gradle
            if (llave.exists()) signingConfig signingConfigs.release
```

- [ ] **Step 6: Íconos y pantalla de inicio**

```bash
mkdir -p assets
npx --yes sharp-cli -i icon.svg -o assets/logo.png resize 1024 1024
npx --yes @capacitor/assets generate --android --androidProject app-android --iconBackgroundColor '#fff7ec' --iconBackgroundColorDark '#fff7ec' --splashBackgroundColor '#fff7ec' --splashBackgroundColorDark '#fff7ec'
```
Si `sharp-cli` falla con el SVG, generar el PNG de 1024 px de `icon.svg` con Chrome sin interfaz (`--headless --screenshot --window-size=1024,1024`). Verificar que existen `app-android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` y un `drawable*/splash.png`.

- [ ] **Step 7: Java para compilar**

Ver la versión de Gradle en `app-android/gradle/wrapper/gradle-wrapper.properties`. Gradle < 9.1 no corre en Java 25 (el de Android Studio). Si hace falta:

```powershell
winget install --id EclipseAdoptium.Temurin.21.JDK --silent --accept-package-agreements --accept-source-agreements
```
Usar ese JDK solo para compilar (no cambiar `JAVA_HOME` del sistema): `JAVA_HOME="<ruta del JDK 21>"` delante del comando. El SDK de Android está en `C:\Users\ADMIN\Android\Sdk`; si Gradle no lo encuentra, `app-android/local.properties` (ignorado por el `.gitignore` que genera Capacitor) con `sdk.dir=C\:\\Users\\ADMIN\\Android\\Sdk`.

- [ ] **Step 8: Compilar la versión de prueba**

```bash
npm run app
cd app-android && JAVA_HOME="<JDK 21>" ./gradlew assembleDebug
```
Expected: `BUILD SUCCESSFUL` y `app-android/app/build/outputs/apk/debug/app-debug.apk`. Sin `google-services.json` todavía se compila (el proyecto de Capacitor solo aplica google-services si el archivo existe); el inicio con Google se prueba en Task 4.

- [ ] **Step 9: Pruebas, revisar lo que se sube y commit**

Run: `node tests.js` → todo ✅. `git status --short` no debe listar `node_modules/`, `www/`, `app-android/build`, `app-android/app/build`, `local.properties` ni nada de `android/`.

```bash
git add package.json package-lock.json capacitor.config.json assets app-android
git commit -m "App Android con Capacitor: proyecto en app-android, Google nativo, íconos y firma"
```

---

### Task 4: Pasos del dueño y prueba en el celular (controlador + usuario, sin subagente)

- [ ] **Step 1: El usuario escribe `app-android/keystore.properties`**

```
storeFile=C:/Users/ADMIN/Desktop/juego-mental/android/signing.keystore
storePassword=…
keyAlias=…
keyPassword=…
```

- [ ] **Step 2: Huellas SHA-1** (el usuario corre los comandos; la contraseña de debug es `android`)

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore "C:\Users\ADMIN\Desktop\juego-mental\android\signing.keystore"
```

- [ ] **Step 3: Firebase** › Configuración del proyecto › Agregar app › Android: paquete `io.github.cgutierrezrojas.juegomental`, nombre «Pa'l Rato», agregar las dos SHA-1; descargar `google-services.json` a `app-android/app/`. Commit del archivo.

- [ ] **Step 4: Prueba en el celular** (depuración USB; `adb devices` lo lista)

`npm run app`, `./gradlew installDebug` y comprobar: abre sin barra del navegador; en modo avión abre y se juega; atrás vuelve como en la web y en el inicio cierra la app; entrar con Google; salir y entrar como invitado → vincular con Google; un duelo y el chat con otra cuenta.

- [ ] **Step 5: `.aab` firmado**

`./gradlew bundleRelease` → `app-android/app/build/outputs/bundle/release/app-release.aab`.
