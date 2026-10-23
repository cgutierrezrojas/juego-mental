# Juego Mental — G2: nube y ranking (Firebase)

Fecha: 2026-10-23

El usuario quiere guardar el progreso en la nube y compartirlo con otras personas. Eligió **progreso + ranking** con **Firebase** y aprobó el diseño en dos partes. La cuenta de Firebase es suya; la configuración de la web no es secreta, porque la seguridad la ponen las reglas.

## Cuenta y sincronización

- **Entrar es opcional.** Sin cuenta, o si Firebase no carga (por ejemplo, sin conexión), la app funciona igual que ahora.
  - En 📊, el bloque "☁️ Nube" ofrece "Entrar con Google".
  - Se usa `signInWithPopup`. Si el navegador bloquea la ventana, se recurre a `signInWithRedirect`.
- **Datos:** `usuarios/{uid}` contiene `{ datos: { clave: valor }, actualizado: ms }`. Son las mismas claves que la copia de seguridad, las de `esClaveDelJuego`.
- **Marcas locales:** usan el prefijo `nube:`, que no entra en las copias ni se sube.
  - `nube:cambio`: cuándo cambió por última vez el progreso de este celular. Lo actualiza `guardar()` en `comun.js` para las claves del juego.
  - `nube:subido`: el último `nube:cambio` que se subió.
  - `nube:uid`: la cuenta con la que este celular ya está vinculado.
- **Al tener sesión** (al arrancar o tras entrar), se lee la nube y se decide con `decidirSincro`:

| Situación | Decisión |
|---|---|
| La nube está vacía | **subir** (si hay progreso local) o nada |
| Este celular no tiene progreso | **bajar** |
| La cuenta aún no está vinculada en este celular | **preguntar**: "☁️ El de la nube" o "📱 El de este celular" |
| Ya vinculada | gana el más reciente (`actualizado` frente a `nube:cambio`); si son iguales, nada |

  - "Tener progreso" significa tener alguna clave `record:`, `historial:`, `estrellas:`, `niveles:` o `diarios:`.
  - **Bajar:** se sustituyen las claves del juego por las de la nube, se guardan `nube:cambio` y `nube:subido` con su fecha y se recarga la app.
- **Subir:** solo si la cuenta está vinculada y `nube:cambio > nube:subido`.
  - Se sube al mostrar el final o el menú, al ocultar la app (`visibilitychange`) y justo después de vincular.
  - Sin conexión falla en silencio y se reintenta la próxima vez.
- **Salir:** cierra la sesión y conserva el progreso en el celular.
- **Borrar mis datos de la nube:** pide confirmación. Borra `usuarios/{uid}` y `ranking/{uid}` y olvida la vinculación.

## Ranking

- **Apuntarse es opcional y con apodo** (de 2 a 20 caracteres).
  - Se pregunta una vez, tras la primera sincronización (`nube:preguntado`), con `prompt`. Dejarlo vacío significa no aparecer.
  - Se puede cambiar o quitar desde el bloque Nube.
  - Nunca se muestran el nombre real ni el correo.
- **Datos:** `ranking/{uid}` contiene `{ apodo, estrellas, records: { idJuego: n }, actualizado }`.
  - `datosRanking(datos)` los calcula con lo que hay en el celular:
    - **estrellas:** la suma de las listas `estrellas:<id>` más las estrellas de `diarios:<id>`;
    - **records:** `record:<id>` (Normal·Normal), solo los valores dentro de `LIMITES`.
  - Se sube junto con el progreso si hay apodo.
- **Pantalla 🏆 Ranking** (sección `#ranking`), que se abre desde el bloque Nube o con 🏆 en la barra del menú si hay sesión:
  - un `<select>` para elegir "⭐ General" o un juego;
  - el top 20, ordenado con `orderBy('estrellas' | 'records.<id>', desc, o asc en Rayo, Puzzle y Parejas)`;
  - la fila propia resaltada y, si no está en el top, "Tú: puesto N", calculado con `getCountFromServer`.
- **Trampas:** las reglas aceptan solo la forma correcta y valores posibles. Basta para una app entre amigos.

## Reglas de Firestore (`firestore.rules`)

- `usuarios/{uid}`: lo leen y escriben solo su dueño.
- `ranking/{uid}`:
  - lo lee cualquiera con sesión;
  - lo crean o actualizan solo su dueño, con las claves exactas, apodo de texto entre 2 y 20, `estrellas` entero entre 0 y 1.000.000, y cada récord conocido dentro de su límite;
  - lo borra su dueño.

**`LIMITES`** (rango permitido de cada récord):

| Juegos | Rango |
|---|---|
| calculo, mayor, distinto, series, sobra, balanza, atencion, topos | 1–300 |
| memoria | 1–100 |
| puzzle | 1–10.000 |
| rayo | 80–5.000 |
| parejas | 6–1.000 |

## Privacidad

`privacidad.html` explica:

- qué se guarda (correo de la cuenta de Google, progreso y apodo, solo si te apuntas al ranking);
- para qué se guarda (sincronizar y mostrar el ranking);
- dónde se guarda (Firebase, de Google);
- que no se comparte con nadie más;
- cómo borrarlo ("Borrar mis datos de la nube").

Se enlaza desde el bloque Nube.

## Service worker

- Solo atiende peticiones **GET del propio dominio**. Las de Firebase van directas, porque antes intentaba guardar en caché peticiones POST.
- Se añaden a la lista los módulos nuevos: `final.js`, `copia.js`, `sincro.js`, `nube.js` y `firebase-config.js`.

## Organización

| Archivo | Contenido |
|---|---|
| `firebase-config.js` | `export const CONFIG = null` hasta que el usuario dé la suya; con `null`, el bloque Nube no aparece |
| `games/sincro.js` (puro) | `tieneProgreso`, `decidirSincro`, `datosRanking`, `LIMITES` |
| `games/nube.js` | envoltorio de Firebase; carga el SDK 10.12.2 desde gstatic con `import()` dinámico; `iniciar`, `entrar`, `salir`, `leerProgreso`, `guardarProgreso`, `guardarRanking`, `borrarTodo`, `top`, `puesto` |
| `games/comun.js` | `guardar` anota `nube:cambio` |
| `main.js` | bloque Nube, sincronización, diálogo de elegir y pantalla Ranking |
| `index.html` | bloque Nube, sección `#ranking`, diálogo y botón 🏆 |
| `styles.css` | estilos de lo nuevo |
| `firestore.rules` | las reglas, para pegarlas en la consola |
| `privacidad.html` | la política de privacidad |

## Pruebas

- **`tests.js`:**
  - `tieneProgreso`;
  - `decidirSincro`, con las cuatro situaciones y su desempate;
  - `datosRanking`: suma de estrellas, récords dentro y fuera de límites, y claves ajenas.
- **Chrome:**
  - con `CONFIG = null`, el bloque Nube no aparece y no hay errores;
  - el service worker no toca peticiones ajenas.
- **Con el proyecto del usuario:** entrar, subir, bajar en otro navegador, preguntar, ranking y borrar.
