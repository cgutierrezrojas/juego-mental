# Pedir cuenta y avisar sin internet — diseño

Observación del usuario al probar la app Android (2026-11-06): sin cuenta, Duelos, Amigos y Ranking llevan a «Tú» con un aviso que habla de duelos aunque se tocara otra cosa; sin internet, esos menús se quedan pegados.

Hoy todos los accesos sociales pasan por `asegurarDuelista()` (`app/duelos.js`): Duelos, Amigos, Ranking, Liga, Mesa/Trivia/Cartas contra amigos y retos. El arreglo va ahí.

## Ventana de cuenta

Un `<dialog id="dialogo-cuenta">` en `index.html` (título, texto, botones), que pinta `app/cuenta.js`.

`asegurarDuelista(accion = 'jugar con tus amigos')` comprueba en este orden (si alguna falla, muestra la ventana y devuelve `false`):

1. **Sin internet** (`!navigator.onLine`): «📶 Sin conexión» / «Conéctate a internet para {accion}. Los juegos de un jugador funcionan sin conexión.» / **Entendido**.
2. **La nube no cargó** (`E.nubeFallo`, la marca `main.js` cuando falla la carga) y ya hay internet: «📶 Ya hay conexión» / «Toca Conectar para cargar tus amigos, duelos y ranking. Tu progreso está guardado.» / **Conectar** (`location.reload()`) y **Ahora no**. Chrome no reintenta un `import()` que falló, por eso se recarga en vez de reintentar.
3. **La nube aún carga** (`!E.nube || !E.sesionLista`): «☁️ Conectando…» / «Conectando con la nube. Inténtalo en unos segundos.» / **Entendido**.
4. **Sin sesión** (`!E.usuario`): «Entra para {accion}» / «Con una cuenta guardas tu progreso en la nube, juegas con amigos y apareces en el ranking.» / **Entrar con Google (recomendado)**, **Seguir como invitado**, **Ahora no**. Si al pulsar queda con sesión, la ventana se cierra y `asegurarDuelista` sigue (apodo si falta, como hoy) y devuelve `true`: se llega a donde se iba. Si falla, el error se muestra dentro de la ventana (mismos textos que el recuadro ☁️ de «Tú»). Cerrar la ventana de Google sin elegir deja la ventana abierta.

Textos de `accion`: Duelos «jugar duelos», Amigos «ver a tus amigos», Ranking y Liga «ver el ranking»; el resto, el valor por defecto.

«Tú» se abre siempre (estadísticas y logros son locales). En su recuadro ☁️, si `E.nubeFallo` y hay internet, se añade el botón **Conectar**.

## Primera vez

No se obliga a tener cuenta. La sugerencia del menú (`pintarSugerencia`, sale tras cerrar la bienvenida) cambia su botón: sin sesión, **Crear cuenta** abre la ventana de cuenta (paso 4, con `accion` «guardar tu progreso»); como invitado sigue llevando a ☁️ Nube para vincular.

## Fuera de alcance

Si se corta la señal estando ya dentro de Amigos o de un duelo, no se avisa (se añade si se nota en el uso).

## Pruebas

Chrome (CDP): sin sesión, tocar Amigos → ventana «Entra para ver a tus amigos»; «Seguir como invitado» → apodo → pantalla Amigos. Con `navigator.onLine` falso (emulación sin red) → ventana «Sin conexión». Con `E.nubeFallo` → «Ya hay conexión» y Conectar recarga. «Ahora no» y el botón atrás cierran sin cambiar de pantalla. Celular: modo avión → tocar Amigos → aviso; quitar modo avión → Conectar → carga.
