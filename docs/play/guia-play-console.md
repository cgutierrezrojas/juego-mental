# Guía para Play Console · Pa'l Rato

Respuestas sacadas del código de la app (noviembre de 2026). El paquete es `com.techmbc.palrato`.

## 1. Paquete a subir

- `app-android/app/build/outputs/bundle/release/app-release.aab` (versionCode 2, versión 2.0). Se genera con `./gradlew bundleRelease` dentro de `app-android`.
- Súbelo primero a **Prueba interna**. Así obtienes la huella de firma de Play (paso 2) antes de publicar.
- Si Play pregunta por **servicios en primer plano** (FOREGROUND_SERVICE): la app no los usa directamente; los declaran las librerías de Google (anuncios y Firebase). Responde que no hay un servicio propio en primer plano.

## 2. Huella de firma de Play → Firebase (CRÍTICO para el login con Google)

1. En Play Console, abre **Prueba y lanzamiento › Configuración › Integridad de la app › Firma de apps**. Copia el **SHA-1** y el **SHA-256** del «certificado de la clave de firma de apps».
2. En Firebase, ve a **Configuración del proyecto › Tus apps** y elige la app Android `com.techmbc.palrato`. Pulsa **Agregar huella digital** y pega las dos huellas.
3. Descarga el `google-services.json` nuevo y déjalo en `app-android/app/` (reemplaza el actual). Después hay que volver a compilar.

Sin este paso, el botón «Entrar con Google» falla en la versión que se descarga de Play. La que se instala por cable sí funciona, porque usa tu llave.

## 3. Ficha de la tienda

**Nombre (máx. 30):** `Pa'l Rato: Juegos y Duelos`

**Descripción breve (máx. 80):** `Juegos mentales, cartas, trivia, arcade y palabras. ¡Reta a tus amigos!`

**Descripción completa:**

```
Pa'l Rato es una sala de juegos para pasar el rato, solo o con tus amigos.

🧠 MENTALES
Cálculo, memoria, atención, lógica y más: 16 juegos con niveles sin fin, estrellas y retos diarios. Entrena cada día con «Tu día» y mantén tu racha.

🎲 MESA
Gato y cuatro en línea contra la máquina, a dos en un celular o contra un amigo.

❓ TRIVIA
Ruleta de preguntas con 6 categorías y coronas, modo fiesta para jugar en grupo y La gran escalera. Además, puedes proponer tus propias preguntas.

🃏 CARTAS
Solitario, 21, Bacará, Ocho locos, Escoba, Carioca y Burako, contra la máquina o con amigos. Las fichas son de mentira: no se compran ni se cambian por dinero.

🏎️ ARCADE
Bloques (con cuatro modalidades), Serpiente, Saltar, Autos y Ladrillos.

🔤 PALABRAS
Palabra del día, Ahorcado, Sopa de letras, Escalera de palabras y Charadas para jugar en grupo.

⚔️ CON AMIGOS
Duelos por turnos y en vivo, mensajes, ranking y liga semanal con medallas.

Juega sin cuenta o entra con Google para guardar tu progreso en la nube.
```

No nombres juegos de otras marcas (Tetris, Preguntados, Wordle, ¿Quién quiere ser millonario?, Conecta 4) ni en la ficha ni en las palabras clave.

**Categoría:** Juegos › Casual. **Etiquetas:** Juegos de palabras, Trivia, Cartas, Rompecabezas, Arcade.
**Correo de contacto:** contacto@techmbc.com. **Sitio web:** https://mbc-tech.com.
**Política de privacidad:** https://cgutierrezrojas.github.io/juego-mental/privacidad.html

**Gráficos:**
- Ícono de 512 × 512: `icon-512.png`.
- Gráfico destacado de 1024 × 500: `docs/play/grafico-destacado.png`.
- Capturas del teléfono (mínimo 2): `img/capturas/` (Inicio, Mentales, Palabra, Carioca, Gran escalera). Conviene sumar 2 o 3 nuevas de Bloques y del ranking, sacadas del celular.

## 4. Contenido de la app (Política › Contenido de la app)

| Formulario | Respuesta |
|---|---|
| Acceso a la app | Toda la funcionalidad está disponible sin credenciales especiales (se puede jugar sin cuenta o como invitado). |
| Anuncios | **Sí**, la app contiene anuncios (AdMob). |
| Público objetivo | **18 años o más** (por los juegos de casino con fichas; además, así la app queda fuera del programa Familias). |
| App de noticias, salud, finanzas o gobierno | No. |
| Funciones de COVID / préstamos | No. |
| ID de publicidad | **Sí**, se usa para **publicidad** (AdMob). |

### Clasificación de contenido (cuestionario IARC)

- **Categoría:** Juego.
- **Violencia, miedo, sexo, lenguaje vulgar, drogas:** No. La violencia del arcade es abstracta: autos que chocan con obstáculos.
- **Apuestas simuladas:** **Sí** (21 y Bacará con fichas). **Apuestas con dinero real:** No. **Se pueden comprar fichas:** No.
- **Interacción entre usuarios:** **Sí**. Hay chat entre amigos, apodos visibles en el ranking y preguntas que proponen los jugadores. Hay moderación: denunciar, bloquear y filtro de apodos.
- **Comparte la ubicación del usuario:** No.
- **Compras digitales:** Sí, cuando exista «Quitar anuncios». Si aún no existe, responde No y actualízalo después.

Resultado probable: PEGI 12 / ESRB Teen, por las apuestas simuladas.

### Seguridad de los datos

General:
- **¿Recopila o comparte datos?** Sí.
- **¿Los datos están cifrados en tránsito?** Sí.
- **¿Se puede pedir que se borren?** Sí. Desde la app (☁️ Nube › Borrar mi cuenta) o en https://cgutierrezrojas.github.io/juego-mental/privacidad.html#borrar.
- **¿Es obligatorio recopilarlos?** Las cuentas son opcionales: márcalos como **opcionales**, salvo los de los anuncios, que son obligatorios en Android.

| Tipo de dato | ¿Se recopila? | ¿Se comparte? | Para qué | ¿Opcional? |
|---|---|---|---|---|
| Información personal › Dirección de correo | Sí (si entra con Google) | No | Gestión de la cuenta | Sí |
| Información personal › IDs de usuario | Sí (uid, código de amigo, apodo) | No | Funcionalidad de la app, gestión de la cuenta | Sí |
| Mensajes › Otros mensajes en la app | Sí (chat entre amigos) | No | Funcionalidad de la app | Sí |
| Actividad en la app › Interacciones con la app | Sí (progreso, récords, ranking, liga y duelos) | Sí (AdMob) | Funcionalidad de la app, publicidad, analítica | No |
| Actividad en la app › Otro contenido generado por el usuario | Sí (preguntas propuestas y denuncias) | No | Funcionalidad de la app | Sí |
| Ubicación › Aproximada | Sí (AdMob, por la IP) | Sí | Publicidad, prevención de fraude | No |
| ID de dispositivo u otros | Sí (ID de publicidad) | Sí (AdMob) | Publicidad, analítica, prevención de fraude | No |
| Información y rendimiento de la app › Registros de fallos y Diagnóstico | Sí (AdMob y Firebase) | Sí | Analítica, prevención de fraude | No |

## 5. AdMob

1. En **Privacidad y mensajería**, crea y publica el mensaje **RGPD** (Europa) y el de **regulaciones estatales de EE. UU.** La app ya lo muestra cuando corresponde y tiene el botón «🔒 Privacidad de los anuncios».
2. Cuando la app esté publicada, vincula la app de AdMob con su ficha de Play (**Apps › Configuración de la app › Agregar tienda**).
3. `app-ads.txt` en https://mbc-tech.com/app-ads.txt con la línea:
   `google.com, pub-1309497986646033, DIRECT, f08c47fec0942fa0`
4. **Antes de pasar a producción:** cambia `prueba: true` a `prueba: false` en `anuncios-config.js` y vuelve a compilar. Déjalo en `true` mientras sea prueba interna o cerrada.

## 6. Orden sugerido

1. Crear la app en Play Console (nombre, idioma español, juego gratuito).
2. Subir el `.aab` a **Prueba interna** e invitarte como tester.
3. Huella SHA-1/SHA-256 → Firebase y nuevo `google-services.json` → recompilar y subir versionCode 3.
4. Llenar Ficha, Contenido de la app, Clasificación y Seguridad de los datos (secciones 3 y 4).
5. Probar desde Play: entrar con Google, anuncios, duelo y chat.
6. Mensajes de AdMob, `prueba: false`, versionCode nuevo → **Producción**.
7. Ya publicada: vincular AdMob con la ficha y revisar app-ads.txt.
