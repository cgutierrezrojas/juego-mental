# Móvil y sostenible: conexiones del plan gratis, Capacitor, anuncios y compras — diseño

Pa'l Rato se enfoca en el celular (Android primero; iPhone después) sin perder la versión web (PC y iPhone por Safari). Un solo código web: la app Android pasa de TWA a **Capacitor** para tener AdMob, compras y, más adelante, notificaciones. Firebase sigue en el plan gratis (Spark) hasta que los ingresos paguen Blaze.

Orden: **A** (conexiones) → **B** (Capacitor) → **C** (anuncios y compras) → **D** (notificaciones, con Blaze).

## A. Conexiones dentro del plan gratis

**Problema.** Spark permite 100 conexiones simultáneas a Realtime Database. Hoy cada usuario con sesión queda conectado siempre: estado en línea (`iniciarEstados`, onDisconnect) e invitaciones en vivo (`escucharInvitaciones`). Además, el SDK web de Realtime Database **no cierra solo** la conexión por inactividad (en 10.12.2 solo se interrumpe con `goOffline` o si el servidor la corta): una vez abierta, queda abierta.

**Diseño.**

1. **Estado en Firestore:** `estados/{uid}` = `{ estado, cuando }`, legible por el dueño y sus amigos (se comprueba con `sonAmigos`).
   - `estado`: conectado | jugando | ausente | desconectado. `cuando`: hora del servidor.
   - Se escribe al cambiar de estado y cada **3 min** mientras la app está a la vista (latido). Al ocultarse: «ausente» (como hoy). Al cerrar sesión: «desconectado».
   - Quien lo mira lo da por **desconectado si `cuando` tiene más de 5 min**; se recalcula cada minuto mientras la pantalla de Amigos está abierta.
   - Modo invisible: igual que hoy (se publica «desconectado»).
   - Reglas: lee el dueño o un amigo (`sonAmigos`); escribe solo el dueño; campos exactos; `estado` de la lista; `cuando == request.time`.
2. **Invitaciones en vivo en Firestore:** `invitacionesVivo/{sala}` = `{ de, para, nombre, juegos, dificultad, cuando }`.
   - Se crea después de la sala (como hoy). El invitado escucha `where('para', '==', uid)` con `onSnapshot`; las de más de 2 min se borran sin mostrarse (como hoy).
   - Reglas: crear si `de == auth.uid`, `sonAmigos(de, para)`, nombre 1–20, juegos lista de 1–5, `cuando == request.time`, campos exactos; leer y borrar `de` o `para`; no se actualizan.
   - Los bloqueos viven en Realtime Database y Firestore no puede leerlos: la app **ignora y borra** las invitaciones de alguien bloqueado. La sala en Realtime Database sigue exigiendo amistad y no estar bloqueado, así que una invitación falsa no lleva a ninguna parte.
3. **Realtime Database solo cuando se usa.** Al iniciar: `goOffline`. Un contador en `games/nube.js`:
   - `usar()` suma uno y, si estaba en 0, `goOnline`; devuelve `soltar()`, que resta uno y, si queda en 0, hace `goOffline` **30 s después** (si sigue en 0), para no conectar y desconectar a cada rato.
   - Las escuchas (sala en vivo, chat, mesa) usan la conexión mientras escuchan. Las lecturas y escrituras sueltas (`get`, `set`, `remove`, `push`, `update`) la usan hasta que terminan.
   - Todo pasa por `games/nube.js`; el resto de la app no cambia.
   - `ahoraServidor()` (que usa el desfase de Realtime Database) sigue igual: el desfase llega al conectarse, y los duelos en vivo siempre están conectados. Para las invitaciones se compara con la hora de Firestore (`cuando` del documento) contra `Date.now()`, con margen de 2 min como hoy.
4. **Se quita** de Realtime Database `estado/` (reglas, datos y borrado) y `invitaciones/`. **Se mantiene** `amigos/{uid}`: lo usan las reglas de chat, vivo e invitaciones de sala.
5. **Borrar cuenta:** también borra `estados/{uid}` y las `invitacionesVivo` donde soy `de` o `para`.
6. **Privacidad:** el texto del estado sigue siendo cierto («solo ven tus amigos»); se aclara que el estado se guarda con la hora de la última vez.

**Resultado:** las 100 conexiones cuentan solo a quienes están en chat, mesa o duelo en vivo (y 30 s después). Costo en Firestore: ~20 escrituras por hora de uso por persona (cuota gratis: 20.000 al día) y una lectura por cambio de estado de cada amigo mirado.

**Pruebas.**
- `tests.js`: `enLinea(estado, cuando, ahora)` (puro, en `games/amigos.js`): pasa a desconectado tras 5 min; invisible.
- Navegador (CDP) con dos cuentas: estado visible para el amigo y no para un extraño; invitación en vivo de ida y vuelta (aceptar y rechazar); duelo en vivo completo; chat; mesa; borrar cuenta deja todo limpio.
- Conexión: tras 30 s sin usar Realtime Database, no queda ningún WebSocket abierto a `firebaseio.com` / `firebasedatabase.app`; al abrir un chat, se abre uno.
- Ataques de reglas: leer el estado de un no-amigo, escribir campos extra, `cuando` falso, crear invitación a un no-amigo o a nombre de otro: todo denegado.
- **El usuario publica `firestore.rules` y `database.rules.json`.**

## B. App Android con Capacitor

**Estructura.**
- `npm` entra al proyecto solo para Capacitor (`package.json` en la raíz; `node_modules/` ignorado). La web sigue sin paso de compilación.
- `copiar-app.js` (Node, en la raíz): copia a la carpeta que se le indique los archivos de la app (`git ls-files` menos docs, pruebas, reglas, `.github/`, `.gitignore`, `package*.json`, `capacitor.config.json`, `copiar-app.js`, `assets/` y `app-android/`). **Una sola lista**: el flujo de Pages pasa a usar `node copiar-app.js _site` y Capacitor `node copiar-app.js www`. `www/` va ignorada.
- `capacitor.config.json`: `appId` `com.techmbc.palrato` (dominio de la empresa del dueño; cambiado el 2026-11-06 antes de subir a Play, porque el paquete no se puede cambiar después), `appName` «Pa'l Rato», `webDir` `www`, `android.path` `app-android`. La web va **dentro** de la app (sin `server.url`): abre sin señal.
- Proyecto nativo en `app-android/` (nunca en `android/`, que guarda la llave y no se sube ni se lee). Se sube al repo sin secretos.
- Íconos y pantalla de inicio con `@capacitor/assets` desde `assets/icon-only.png` (1024 px, generado de `icon.svg`) y el color de fondo de la app.

**Cambios en la web (solo dentro de Capacitor, `window.Capacitor?.isNativePlatform()`).**
- `main.js`: no registra el service worker.
- Botón atrás: con `@capacitor/app` instalado y sin escucha propia, Android va atrás en el historial del WebView o cierra la app. La app ya maneja atrás con `history`/`popstate` (`app/ui.js`), así que **no hace falta código**.
- `games/nube.js`: Google con el plugin `@capacitor-firebase/authentication` (`skipNativeAuth: true`, proveedor `google.com`): la ventana nativa de Google entrega un `idToken` y la sesión se abre en el SDK web de siempre con `GoogleAuthProvider.credential(idToken)`:
  - `entrar()` → `signInWithCredential`.
  - `vincularGoogle()` → `linkWithCredential`; si la cuenta ya existe (`auth/credential-already-in-use`), mismo camino de hoy pero con esa credencial.
  - `borrarCuenta()` → `reauthenticateWithCredential`.
  - Si el usuario cierra la ventana de Google: se trata como cancelado (`entrar` no hace nada, `vincularGoogle` devuelve `'cancelada'`).
  - Se usa con `Capacitor.Plugins.FirebaseAuthentication`, sin compilador (así se enchufará AdMob en C).

**Versión y firma.**
- Primera versión en Play (la TWA no se subió): `versionCode` 2 (por si quedó algún 1 de la TWA), `versionName` «2.0».
- `app-android/app/build.gradle` lee `app-android/keystore.properties` (ignorado; `storeFile`, `storePassword`, `keyAlias`, `keyPassword`) **si existe**; lo escribe el usuario apuntando a su llave. Sin él, solo se compila la versión de prueba.
- `google-services.json` (en `app-android/app/`) solo trae identificadores públicos, como `firebase-config.js`: se sube al repo.
- Java: Capacitor 8 pide JDK 21. Si el Gradle del proyecto no acepta el Java 25 de Android Studio, se instala Temurin 21 y se compila con él.

**Requisitos del usuario.**
1. Escribir `app-android/keystore.properties`.
2. Sacar las huellas SHA-1 (debug y la de su llave) con `keytool` (comando que se le da).
3. Firebase › Configuración del proyecto › Agregar app Android con el paquete y las huellas; descargar `google-services.json` a `app-android/app/`. Más adelante, la huella de firma de Play.
4. Celular con depuración USB (o emulador).

**Pruebas.** `node tests.js`; compilar la versión de prueba, instalarla y comprobar: abre sin barra del navegador y sin señal, atrás igual que en la web, entrar con Google, vincular un invitado, duelo y chat. Al final, `.aab` firmado.

## C. Anuncios y «Quitar anuncios»

- `@capacitor-community/admob`: **video con premio** opcional (por ejemplo, una pista o una vida extra donde ya existan) e **intersticial** como mucho cada 3 partidas terminadas, nunca en duelos en vivo ni a mitad de partida. Formulario de consentimiento (UMP) donde lo exija la ley.
- Compra única «Quitar anuncios» con Google Play Billing (plugin de compras); se guarda en el dispositivo y en `usuarios/{uid}` para recuperarla en otro celular.
- En la web, sin anuncios por ahora (AdSense queda como opción).
- Privacidad y la ficha de Play («Contiene anuncios», seguridad de datos) se actualizan.
- **Requisitos del usuario:** cuenta de AdMob (gratis) con la app creada y sus IDs de anuncio; producto «quitar_anuncios» creado en Play Console; perfil de pagos en Play Console.

## D. Notificaciones (cuando haya Blaze)

- Avisar «te toca en el duelo» o «te retaron» con la app cerrada necesita quien envíe el mensaje: Cloud Functions (solo en Blaze). Se diseña cuando se pase a Blaze con tope de gasto; ahí también entran las validaciones de puntajes en el servidor.
