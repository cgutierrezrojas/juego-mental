# Ronda 3 🎲 Dados — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:subagent-driven-development. Pasos con casillas (`- [ ]`).

**Objetivo:** crear la sección 🎲 Dados con el Cacho chileno y la Generala clásica.
- Se juegan contra la máquina (Fácil, Normal y Difícil), entre varios en un celular, y contra un amigo con «dados justos».

**Arquitectura:**
- Reglas puras en `games/`, con el azar inyectado (`{s}` de `games/semilla.js`).
- Se reutiliza el motor de turnos de `app/cartas-mesa.js`, generalizado con la sección, los niveles y N jugadores en un celular.
- Una página propia de la sección: `app/dados.js`.
- Para el modo amigo, un módulo puro `games/justo.js` (semillas selladas y dados derivados con HMAC), con la comprobación exacta de transiciones de la ronda 2.

**Spec (fuente de las reglas y valores exactos):** `docs/superpowers/specs/2026-11-17-dados-ronda3-design.md`. Cada tarea indica qué secciones leer.

## Restricciones globales

- **Idioma:** español en el texto visible, los comentarios y los mensajes de commit, como el resto del código.
- **Commits:**
  - correo `203862735+cgutierrezrojas@users.noreply.github.com`, con `git -c user.email=... commit`;
  - el mensaje termina con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, nunca con otro modelo.
- **Rama:** todo se hace en `dados`. No se fusiona ni se sube.
- **sw.js:** cada archivo nuevo de la app va en `ARCHIVOS`. Después, se pone la `VERSION` exacta que indique `node tests.js`.
- **No leer:** `android/` ni `app-android/keystore.properties`. No poner en el repo ni el correo del usuario ni el UID del administrador.
- **Servidor de pruebas:** `python -m http.server 8754` en la raíz. Se detiene **solo por PID**, desde PowerShell:
  `Get-CimInstance Win32_Process -Filter "Name like 'python%'" | Where-Object { $_.CommandLine -match 'http\.server 8754' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`.
  Nunca se matan todos los procesos de python.
- **Driver CDP:** `C:/Users/ADMIN/AppData/Local/Temp/claude/c--Users-ADMIN-Desktop-juego-mental/108c02ba-0e81-45cd-86a7-284219213cd5/scratchpad/cdp360.mjs`.
  - Uso: `node cdp360.mjs http://localhost:8754/ prueba.js captura.png [claro|oscuro]`.
  - La prueba es una función `async () => {...}` que se evalúa en la página.
  - Si la primera carga sale vieja (por el SW), se corre otra vez.
  - Los scripts nuevos van en esa carpeta.
  - Las capturas se miran siempre con Read, en claro y en oscuro, a 360 px.
- **Módulos puros:**
  - nunca modifican la entrada;
  - el azar entra por el generador `{s}` (`games/semilla.js`) o por `rnd`;
  - las máquinas se exportan como `maquina(e, nivel, rnd)`, con `nivel` igual a `'facil'`, `'normal'` o `'dificil'`.
- **Tiempo de la máquina:** como mucho ~300 ms por jugada en un celular de gama media, o sea unos 60 ms en un computador. Si no alcanza, se simplifica y se anota con un comentario `ponytail:`.
- **Diálogos nuevos:** un `<dialog>` nuevo va en las listas de estilos de diálogos de `styles.css`, porque si no sale blanco en el tema oscuro.
- **Integración:** cada partida terminada de un jugador llama a `ligaAnotar('partida', 1, 'dados')` y a `finDePartida()`, como en los juegos de cartas. Ganar a la máquina llama a `anotarPerfil('victoria', 1, 'dados')`.

---

### Tarea 1: Sección 🎲 Dados y motor de turnos generalizado

**Leer:** la spec, secciones «Arquitectura» e «Integración»; `app/cartas-mesa.js` completo; `app/cartas.js` (`pantalla`, `boton`, `alSalir`, `abrirCartas`); `app/inicio.js`; `app/juegos.js` (`SECCIONES`); `games/perfil.js` (`SECCIONES_MISION`, `NOMBRE_SECCION`); `app/ui.js` (mapa de secciones, `PARTIDAS`); `games/copia.js`; `games/sincro.js`; `index.html` (secciones `#cartas` y `#cartas-juego`).

**Hacer:**

1. **`app/juegos.js`:**
   - Agregar a `SECCIONES`, después de Mesa: `{ id: 'dados', nombre: 'Dados', icono: '🎲', color: 'naranja' o el color libre que mejor contraste, descripcion: 'cacho y generala' }`.
   - Mesa pasa a `icono: '♟️'`. Revisa dónde más aparece `🎲 Mesa` (`index.html`, `<h2>`) y cámbialo.
2. **`games/perfil.js`:** agregar `'dados'` a `SECCIONES_MISION` y a `NOMBRE_SECCION`. Ajusta los tests de misiones que dependan de la lista.
3. **`index.html`:** una sección `#dados` con la misma estructura que `#cartas`:
   - cabecera con `←` y `<h2>🎲 Dados</h2>`;
   - `#dados-partidas`;
   - `<h3>` «Juegos»;
   - `#dados-juegos` con la clase `rejilla`.
4. **`app/dados.js`:**
   - `abrirDados()` muestra `#dados` y pinta una tarjeta por cada juego con `seccion: 'dados'` de `JUEGOS_MESA_CARTAS`; al tocarla llama a `abrirJuegoMesa(id)`.
   - Muestra las partidas con amigos de esos juegos, reutilizando la lógica de `pintarPartidasCartas` filtrada por sección.
   - Conectarlo en `ABRIR` de `app/inicio.js` y en el `←`.
5. **Generalizar `app/cartas-mesa.js`** (los cuatro juegos de cartas no deben cambiar de comportamiento):
   - **`J.seccion`:** `'cartas'` por defecto.
     - El «Volver» de la pantalla de modos y de la partida usa `abrirCartas` o `abrirDados` según la sección.
     - `ligaAnotar`, `anotarPerfil` y los récords usan esa sección.
     - La clave del récord pasa a ser `${seccion}:${id}` más el sufijo de nivel. Las de cartas siguen siendo `cartas:<id>` y `cartas:<id>-dificil`; las de dados son `dados:<id>`, `dados:<id>-facil` y `dados:<id>-dificil`.
   - **`J.niveles`:** por defecto `{ normal, dificil }`. Los dados declaran `{ facil, normal, dificil }`, y la fila de nivel muestra los del juego.
   - **`J.maxLocal`:** por defecto 2.
     - Si es mayor que 2, la pantalla de modos muestra «Cuántos juegan» (de 2 a `maxLocal`), y `empezar(J, 'local', n)` usa los nombres `Jugador 1…N`.
     - La pantalla para pasar el celular (`vista`) debe funcionar con N jugadores locales. Revisa `pintar()` y corrígelo si hoy supone 2.
   - **La pantalla de juego:** se reutiliza `#cartas-juego` / `pantalla()`. El mapa de `app/ui.js`, que dice a qué sección pertenece la pantalla visible para el botón atrás y la barra, debe devolver `'dados'` cuando la partida abierta es de dados. Usa un dato en `p`, o una clase o atributo en la pantalla; lo más simple que funcione.
6. **Prefijos:** agregar `dados:` a `PREFIJOS` en `games/copia.js`, y en `games/sincro.js` `DE_PROGRESO` si los récords `cartas:` están ahí.
7. **CSS:** un componente de dado reutilizable, `.dado`, con las caras 1–6 dibujadas con puntos en CSS (`data-cara="1..6"`) y los estados `.guardado`, `.tapado`, `.cuenta` (resaltado al revelar) y `.rodando` (una animación corta que respete `prefers-reduced-motion`). Usa variables de tema para que se vea en claro y oscuro.
   - Exporta desde `app/dados.js` un `dado(cara, clases)`, que devuelve un elemento, para las tareas siguientes.
8. **sw.js:** `app/dados.js` en `ARCHIVOS` y la VERSION al día.

**Prueba:**
- `node tests.js` todo ✅.
- CDP `r3-seccion.js`:
  - el inicio muestra 7 secciones, con «🎲 Dados» y «♟️ Mesa»;
  - al tocar Dados se abre `#dados`;
  - el atrás vuelve al inicio;
  - Cartas sigue igual: abrir el Ocho locos contra la máquina y jugar una carta.
- Una página temporal que muestre los dados 1–6 en todos sus estados, o un `document.body.append` en el script, con captura en claro y en oscuro.

**Commit:** «Dados: sección nueva, motor de turnos con sección, niveles y N jugadores locales».

---

### Tarea 2: Generala — reglas puras, máquina y tests

**Leer:** la spec, secciones «🎲 Generala clásica» y «🤖 Máquinas → Generala»; `games/semilla.js`; un juego puro de cartas como referencia (`games/ocho.js`, solo la forma).

**Hacer:**
1. **`games/dados.js`:** `PINTAS` (nombres As…Sexto con su número), `tirar(g, n)` que devuelve `{ g, dados }` usando el generador, y `contar(dados, cara)`.
2. **`games/generala.js`:**
   - `CASILLAS` (11);
   - `nueva(n, semilla)`, con el estado según la spec y el turno 0;
   - `tirar(e)`: la primera tirada tira los 5 y las siguientes solo los no guardados; como máximo 3 tiradas;
   - `alternarGuardado(e, i)`: solo después de la primera tirada;
   - `posibles(e)`: el puntaje que daría cada casilla libre con los dados actuales, teniendo en cuenta lo servido (`tiradas === 1`) y la doble solo si Generala vale 50;
   - `anotar(e, casilla)`: anota o tacha (0), pasa al siguiente jugador y reinicia los dados; si es generala servida, termina con ese ganador;
   - `ganador(e)`: índice, `'empate'` o `null`; el motor de cartas espera un índice o `null`, así que define con el motor cómo se representa el empate (revisa cómo lo hacen los juegos de cartas; si ninguno empata, agrégalo de forma mínima);
   - `accion(e, a)`, que aplica una acción de la máquina, y `maquina(e, nivel, rnd)`, que devuelve `{ tipo: 'tirar', guardar: [bool×5] } | { tipo: 'anotar', casilla }`.
3. **Máquinas** según la spec. En la Difícil, el valor esperado se calcula enumerando los resultados de los dados no guardados con memo por multiconjunto ordenado; mide el tiempo.

**Tests en `tests.js`** (antes del bloque de `sw.js`):
- puntajes de cada casilla con manos fijas: escalera 1-5 y 2-6, full, póker, generala; las versiones servidas; doble solo con Generala en 50; tachar vale 0;
- la generala servida gana al instante;
- 3 tiradas como máximo;
- guardar no está permitido antes de la primera tirada;
- el final, con el ganador y el empate;
- la máquina siempre hace una acción válida en los 3 niveles durante partidas completas de 1 a 4 jugadores;
- `anotar` no modifica la entrada.

**Commit:** «Generala: reglas puras, máquina con valor esperado y pruebas».

---

### Tarea 3: Generala en la sección Dados

**Leer:** la spec, «🎲 Generala clásica → Pantalla»; los juegos de `JUEGOS_MESA_CARTAS` (forma de `OCHO`, `pintar(e, quien, miTurno, actuar)`, `resumen`); el `dado()` de `app/dados.js` (Tarea 1).

**Hacer:**
- `app/dados-generala.js`, con el objeto del juego para `JUEGOS_MESA_CARTAS`:
  - `{ id: 'generala', nombre: 'Generala', icono: '🎲', seccion: 'dados', niveles: {facil, normal, dificil}, maxMaquinas: 3, maxLocal: 4, reglas, nueva, maquina, pintar, … }`.
- **`pintar`:**
  - dados grandes, con toque para guardar;
  - botón «🎲 Tirar (quedan N)»;
  - la tabla de todos los jugadores, con los posibles de la tirada actual en la columna de quien juega;
  - tocar una casilla anota, con `preguntar` si vale 0;
  - animación `.rodando` al tirar;
  - en el turno de la máquina, cada acción con una pausa visible (`pausa`) para que se vea qué guarda y dónde anota.
- **Registrarlo** en `JUEGOS_MESA_CARTAS`; aparece en la página Dados y no en Cartas.
- **Integración:** liga, `finDePartida`, `anotarPerfil` (victoria a la máquina) y el récord `dados:generala` con su nivel. Con la Tarea 1 debería salir sola: compruébalo.

**Prueba:**
- CDP `r3-generala.js`:
  - contra 1 máquina, juega 2 turnos completos (tirar, guardar, tirar, anotar) y espera los turnos de la máquina;
  - a 3 en un celular, aparece la pantalla de pasar y el turno de «Jugador 2»;
  - `errores: []`.
- Capturas en claro y en oscuro a 360 px: la tabla de 4 jugadores debe caber, con scroll horizontal interno si hace falta pero nunca en la página.
- `node tests.js`.

**Commit:** «Generala en Dados: tabla, guardar dados y máquina».

---

### Tarea 4: Cacho — reglas puras, máquina y tests

**Leer:** la spec, secciones «🎲 Cacho chileno» y «🤖 Máquinas → Cacho».

**Hacer:** `games/cacho.js` con:
- `nueva(n, semilla)`;
- `apuestaMinima(e)` y `esValida(e, apuesta)`, con las reglas de subir, pasar a ases (`ceil(n/2)`), salir de ases (`2n+1`), la apertura no en ases salvo con 1 dado, y el obligo (pinta fija, sin comodines);
- `apostar(e, {n, pinta})`, `dudar(e)` y `calzar(e)`: revelan, quitan o devuelven un dado (con tope 5), dejan el resumen de la ronda en `e.resumen` (dados de todos, total, quién gana o pierde) para el `resumen` del motor, eligen quién empieza (salta a los eliminados), activan el obligo cuando corresponde (una sola vez por jugador) y vuelven a tirar;
- `ganador(e)`;
- `accion(e, a)` y `maquina(e, nivel, rnd)` según la spec.

**Tests:**
- apuestas válidas e inválidas, incluidos los cambios a ases y desde ases, y la apertura;
- dudar cuando hay justo `n` (pierde quien dudó) y cuando hay `n−1` (pierde quien apostó);
- calzar exacto (recupera, con tope 5) y fallido;
- los ases cuentan, salvo en obligo;
- el obligo se activa una vez y bloquea el cambio de pinta;
- turno inicial tras una eliminación;
- final;
- la máquina siempre hace una acción válida en partidas completas de 2 a 6 jugadores;
- no hay mutación.

**Commit:** «Cacho chileno: reglas puras, máquina y pruebas».

---

### Tarea 5: Cacho en la sección Dados

**Leer:** la spec, «🎲 Cacho chileno → Pantalla»; la Tarea 3 como referencia.

**Hacer:**
- `app/dados-cacho.js`, con el objeto `{ id: 'cacho', nombre: 'Cacho', icono: '🥤' o el que se vea mejor, seccion: 'dados', niveles: {facil, normal, dificil}, maxMaquinas: 5, maxLocal: 6, … }`.
- **`pintar`:**
  - tu cacho, con toque para tapar o destapar tus dados;
  - los cachos de los demás, con su cantidad de dados;
  - la apuesta vigente en grande;
  - un selector de cantidad (− / +) y de pinta (6 botones con dados), que solo permite apuestas válidas y empieza en la mínima;
  - los botones «Subir», «🤨 Dudo» y «🎯 Calzo», con el calzo deshabilitado si no se puede;
  - el aviso «¡Obligo!» cuando corresponde.
- **`resumen`:** todos los dados destapados, con los que cuentan resaltados (`.cuenta`), el total contra lo apostado, y quién perdió o ganó un dado.
- **A varios en un celular:** la pantalla de pasar entre turnos, sin mostrar los dados de nadie hasta tocar «Ya lo tengo».
- Registrarlo en `JUEGOS_MESA_CARTAS`.

**Prueba:**
- CDP `r3-cacho.js`:
  - contra 2 máquinas: apostar, esperar a las máquinas, y en algún momento dudar y ver el resumen;
  - a 3 en un celular: la pantalla de pasar no muestra dados;
  - `errores: []`.
- Capturas en claro y en oscuro a 360 px.
- `node tests.js`.

**Commit:** «Cacho en Dados: cachos, apuestas, dudo y calzo».

---

### Tarea 6: Simulaciones de las máquinas de dados

**Hacer:** un script `scratchpad/r3-simular.mjs` que mida:
- **Generala:** Difícil contra Normal en 200 partidas 1 contra 1, alternando quién empieza.
- **Cacho:** Difícil contra Normal en 200 partidas 1 contra 1.
- **Tiempos:** el máximo y el promedio de ms por jugada de cada nivel.

**Criterio:** la Difícil debe ganar al menos el 60 % y nunca pasar de ~60 ms en el computador.
- Si no se cumple, ajusta las heurísticas o los pesos, como mucho 3 intentos.
- Si sigue sin cumplirse, informa los números reales.

**Commit** con los ajustes que se hagan: «Dados: máquinas comprobadas con simulaciones».

---

### Tarea 7: «Dados justos» — módulo puro y comprobación exacta

**Leer:** la spec, «3b: contra un amigo con dados justos»; `games/naval.js` (`sellar`, `nuevaSal`, `igual`, `siguePartida` y su uso en `app/mesa.js`: `escribir`, `confirmarNaval`, `alEnviado`, `leerNaval`).

**Hacer:** `games/justo.js`, puro, con `crypto.subtle`:
- `nuevaSemilla()`, que devuelve 16 bytes en hex;
- `sellar(s)`, que devuelve SHA-256 en hex;
- `dadosDe(s, rRival, k, cuantos)`, que devuelve un arreglo de valores 1–6 derivados de `HMAC-SHA-256(s, rRival + ':' + k)` sin sesgo (descarta los bytes ≥ 252);
- `verificarSemilla(sello, s)`.
- Extraer o generalizar la comprobación exacta de transiciones para reutilizarla. Por ejemplo, `siguePartida(hist, e, yo, unaJugadaRival)`, donde el juego aporta la función que decide si `e` es una jugada legítima del rival desde W. Sin cambiar el comportamiento de la naval: sus tests deben seguir pasando.

**Tests:**
- determinismo: la misma semilla y el mismo número dan los mismos dados;
- distribución aproximadamente uniforme (10.000 dados, cada cara entre 15 % y 18,5 %);
- la verificación detecta un sello falso;
- la transición exacta acepta lo legítimo y rechaza lo alterado.

**Commit:** «Dados justos: semillas selladas, dados con HMAC y transición exacta común».

---

### Tarea 8: Cacho y Generala contra un amigo

**Leer:** la spec, «3b» completa; `app/cartas-mesa.js` (`retarAmigo`, `abrirAmigo`, `actuar`); `app/mesa.js` (todo el flujo de la naval con un amigo, como patrón de `alActualizar`, `escribir`, `hist`, `trampaRival` y el borrado de la clave local al final); `games/justo.js` (Tarea 7); `database.rules.json` (`mesas/$id/estado`).

**Hacer:**
1. **Reglas de RTDB:** `'cacho'` y `'generala'` en la lista de juegos con `datos`. Pruébalo en el emulador (`scratchpad/fb/prueba.mjs`; la Tarea 1 de la ronda 2 dejó su `firebase.json` con database en el puerto 9000; usar `unset VSCODE_CWD` y JDK21 en `/c/Users/ADMIN/jdk21/jdk-21.0.13+9`).
2. **Modo amigo para los juegos de dados en el motor de cartas:** un gancho por juego (`alActualizar` o equivalente), como en la naval:
   - **Inicio:** x crea la mesa con `sello_x` y guarda localmente `dados:<id>` con la semilla y el historial. Luego o publica `sello_o` y `r_o`, y x publica `r_x`. El juego no empieza hasta tener las cuatro cosas.
   - **Generala:** quien tira calcula sus dados con `dadosDe(s_yo, r_rival, k)` y los publica.
   - **Cacho:** los dados de cada jugador nunca van en el estado compartido. Al dudar o calzar se entra en la fase «revelar»: cada uno publica en su turno sus dados de la ronda, y el resultado se calcula cuando están los dos. Ojo con las reglas de RTDB: solo escribe quien tiene el turno, así que la fase revelar pasa el turno.
   - **En cada actualización:** la comprobación exacta de transición (Tarea 7), con el historial local confirmado por el servidor, como `confirmarNaval`.
   - **Final:** ambos publican su semilla. Cada uno verifica el sello del rival y recalcula todos sus dados (las revelaciones del Cacho y las tiradas de la Generala). Si algo no cuadra: «⚠️ Tu rival hizo trampa» y se anota `v`. Si la clave local falta (datos borrados), solo queda rendirse. Al anotar el final, se borra `dados:<id>`.
   - **Copias de seguridad:** al restaurar una copia o bajar la nube, no se pisan las claves `dados:<id>` locales y se quita `hist` a las importadas, igual que `restaurado()` de la ronda 2. Generaliza esa función si ayuda.
3. **«Tus partidas con amigos»** en la página Dados, y el aviso ⚔️ como en las demás mesas.

**Tests:**
- unitarios de las funciones puras nuevas (las transiciones legítimas de cada juego);
- CDP con nube falsa en memoria (patrón de `scratchpad/r4-naval-amigo-falso.js`):
  - una partida honesta de cada juego, ganando cada uno;
  - trampas detectadas: dados publicados que no cuadran con la semilla, sello cambiado, una revelación del Cacho falsa, estado alterado;
  - escrituras perdidas que no se marcan como trampa.

**Commit(s)** con las convenciones. El informe debe recordar que el usuario tiene que publicar `database.rules.json`.

---

### Tarea 9 (después de que el usuario publique las reglas): prueba real con dos cuentas

Adaptar `scratchpad/r5-naval-real.js` a Cacho y Generala:
- una partida honesta de cada juego;
- una partida con trampa: dados que no cuadran con la semilla.

Al final, limpiar todo en Firebase (mesas, misMesas, amistad y cuentas de prueba).
