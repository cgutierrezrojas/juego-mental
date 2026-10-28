# Pa'l Rato — S2: 🎲 Mesa (Gato y Conecta 4)

Fecha: 2026-10-28

Es la segunda parte de la sala de juegos. Crea un motor de partidas por turnos que reutilizarán S3 a S6. El usuario lo aprobó.

## Juegos

- **⭕ Gato (tres en raya):**
  - tablero de 3×3 y empieza ❌;
  - gana quien hace 3 en raya (fila, columna o diagonal);
  - si se llena el tablero sin línea, es empate.
- **🔴 Conecta 4:**
  - 7 columnas por 6 filas; la ficha cae a la casilla libre más baja de la columna;
  - empieza 🔴 y gana quien hace 4 en raya en horizontal, vertical o diagonal;
  - si se llena el tablero sin línea, es empate.

El tablero se guarda como un **texto**: una letra por casilla (`x`, `o` o `.`), con las filas de arriba abajo. Así se guarda tal cual en la Realtime Database, que no guarda bien las listas con huecos.

## Modos

1. **🤖 Contra la máquina** (empiezas tú):
   - **Fácil:** juega al azar.
   - **Normal:** gana si puede, si no bloquea, y si no juega al azar. En Conecta 4 evita además dejarte la victoria servida.
   - **Difícil:** en el Gato usa minimax completo, así que nunca pierde. En Conecta 4 usa minimax con poda alfa-beta a 5 jugadas, con una valoración que puntúa los grupos de 2 y 3 y prefiere la columna central.
   - **Récord local:** `mesa:maquina` guarda `{ juego: { dificultad: { v, d, e } } }` y se muestra al elegir el modo.
2. **📱 Dos jugadores en un celular:** pasándose el teléfono, sin guardar nada.
3. **👥 Contra un amigo** (de la lista de amigos):
   - **Una sola partida sirve en vivo y por turnos:** se ve al momento si los dos están en ella, y si no se juega al abrirla.
   - **Turnos:** quien crea la partida juega con ❌ y empieza.
   - **Caducidad:** una partida sin movimientos en 7 días se da por caducada y se quita de la lista.
   - **Rendirse:** el que se rinde pierde.
   - **Revancha:** crea una partida nueva contra el mismo amigo.

## Datos (Realtime Database)

- **`mesas/{id}`:**
  - `juego`, `jugadores: { x: uid, o: uid }`, `nombres: { uid: apodo }`;
  - `estado: { celdas, turno }`, `ganador` (`'x'`, `'o'`, `'empate'` o ausente);
  - `rendido: { uid: true }`, `creada` y `actualizada`.
- **`misMesas/{uid}/{id}`:** `{ juego, rival, nombreRival }`, el índice para listar las partidas de cada uno. Quien crea la partida escribe el suyo y el del amigo.
- **Reglas:**
  - lee la mesa solo quien juega en ella;
  - crearla exige ser ❌ y ser amigo del rival, es decir, que la lista de amigos del rival te incluya; borrarla, ser uno de los dos;
  - `estado` lo escribe solo el jugador al que le toca;
  - `ganador`, `actualizada` y `rendido/{uid}` los escriben los jugadores (`rendido`, cada uno el suyo);
  - en `misMesas/{uid}` escribe su dueño, o un amigo que no esté bloqueado.
- **Resultados con amigos:** `mesa:resultados` (`{ id: 'v' | 'd' | 'e' }`) se apunta una vez y cuenta para:
  - las victorias, que son las mismas que las de los duelos: logros ⚔️ y 🏆;
  - la liga: +3 por victoria y +1 por empate.
- **Liga en cualquier modo:** terminar una partida en cualquier modo suma +1 como partida.

## Pantallas

- **🎲 Mesa** (`#mesa`, la página de la sección):
  - ← para volver al inicio;
  - "Tus partidas con amigos": "Tu turno" o "Turno de X", el resultado si ha terminado, y se abre al tocarla;
  - las baldosas de los juegos.
- **Elegir modo** (`#mesa-modo`): el juego, sus reglas en una línea y los modos.
  - 🤖 Contra la máquina, con la dificultad (caritas) y el récord.
  - 📱 Dos en este celular.
  - 👥 Contra un amigo, con la lista de amigos.
- **Tablero** (`#mesa-tablero`):
  - arriba, los dos jugadores con su ficha, y el que tiene el turno resaltado;
  - el tablero;
  - un texto de estado ("Tu turno", "Turno de Ana", "Piensa la máquina…", "🏆 ¡Ganaste!"…);
  - los botones: 🔄 Revancha (o jugar otra), 🏳️ Rendirse (contra un amigo, mientras no ha terminado) y Volver.
  - **Gato:** botones de 3×3.
  - **Conecta 4:** 7 botones de columna, cada uno con su pila de 6 casillas. La ficha cae con una animación, salvo con movimiento reducido.
  - **Accesibilidad:** cada casilla o columna tiene su `aria-label` ("Fila 2, columna 3, vacía"), y el estado se anuncia con `aria-live`.
- **Avisos:** el número de ⚔️ en la barra suma las partidas de mesa en tu turno.
- **Inicio:** la baldosa 🎲 Mesa deja de estar en "Próximamente" y muestra "2 juegos".

## Organización

| Archivo | Contenido |
|---|---|
| `games/gato.js`, `games/conecta4.js` (puros) | `{ id, nombre, inicial(), validas(e), aplicar(e, jugada), ganador(e), ia(e, nivel, rnd) }` |
| `app/mesa.js` | el motor de la interfaz: secciones, modos, tablero, partidas con amigos y resultados; cada juego aporta además `pintar(e, alJugar)` |
| `games/nube.js` | `crearMesa`, `verMesa`, `jugarMesa`, `misMesasDe`, `rendirseMesa`, `borrarMesa` |
| `database.rules.json` | las reglas de `mesas` y `misMesas` |

## Pruebas

- **`tests.js`**, para los dos juegos:
  - ganador por fila, columna y diagonal, y empate;
  - las jugadas válidas, y que aplicar no cambia el original;
  - la máquina:
    - el Gato difícil nunca pierde (contra todas las respuestas posibles);
    - la normal gana o bloquea cuando toca;
    - el Conecta 4 difícil gana a la fácil en 20 partidas de 20.
- **Chrome:** contra la máquina, a dos en un celular, y contra un amigo con dos cuentas (vivo, turnos, rendirse, revancha, reglas).
