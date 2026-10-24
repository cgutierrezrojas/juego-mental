# Juego Mental — D1: duelos por turnos

Fecha: 2026-10-24

Primera parte de la ronda de duelos. Las siguientes son D2 (amigos y estados), D3 (duelos en vivo) y D4 (mensajes). El usuario aprobó la maqueta de cuatro pantallas: menú, bandeja, crear y duelo.

## Reglas

- **Crear un duelo:** se eligen los juegos, la dificultad, cómo se gana y el rival.
  - **Juegos:** 3 al azar, 3 al azar de una habilidad (o los que tenga, si son menos), o de 1 a 5 elegidos a mano.
  - **Dificultad:** Fácil, Normal o Difícil. Todo se juega en modo Normal.
  - **Cómo se gana:** **juego a juego**, donde gana cada juego la mejor puntuación (la más baja en Rayo, Puzzle y Parejas), o por **suma de puntos**, que suma el `nivel` de 0 a 100 de cada juego, el mismo del perfil.
  - **Rival:**
    - **enlace** (`?duelo=ID`): lo acepta quien lo abra;
    - **al azar:** si hay un duelo al azar abierto de otra persona, te unes a él y jugáis sus juegos; si no, el tuyo queda abierto;
    - **desde el ranking:** con un botón ⚔️ en cada fila, la otra persona lo ve como invitación.
- **Apodo:** para hacer duelos hace falta sesión (Google o invitado) y apodo. Si no hay apodo, se pide.
- **Plazo:** 48 horas desde la creación. Cada juego se juega **una vez** y también cuenta para el historial normal.
- **Sin ventaja:** la puntuación del rival en un juego se ve solo cuando has jugado el tuyo, o cuando el duelo ha terminado.
- **Fin:** cuando los dos han jugado todo, o cuando caduca con dos jugadores. En ese caso lo no jugado cuenta como perdido: en "juego a juego", gana el juego quien lo jugó; en "suma", cuenta 0. Si caduca sin rival, queda como "caducado".
- **Estadísticas:** victorias, derrotas y empates en `duelos:resultados` (`{ id: 'v' | 'd' | 'e' }`), que se apuntan una vez al verlos terminados. Se guardan en la copia y en la nube, y alimentan los logros ⚔️ (1 victoria) y 🏆 (10).

## Datos (Firestore `duelos/{id}`)

`{ anfitrion, jugadores: [uid…], nombres: { uid: apodo }, invitado: uid | null, abierto, azar, juegos: [id…], dificultad, victoria: 'juegos' | 'puntos', creado, caduca, resultados: { uid: { juego: puntos } } }`

**Reglas:**

- **Leer:** cualquiera con sesión.
- **Crear:** solo como anfitrión, con un solo jugador, de 1 a 5 juegos, sin resultados y un plazo de 48 h como máximo.
- **Unirse:** si hay un solo jugador, está abierto, no es tuyo, no ha caducado, y está sin invitado o el invitado eres tú. Solo cambian `jugadores` (+ tú), `nombres` y `abierto` (pasa a false).
- **Anotar:** solo un jugador, y solo en `resultados.<su uid>`, añadiendo un juego del duelo que aún no tenía (no se puede cambiar ni repetir), con un valor numérico.
- **Borrar:** el anfitrión, mientras no haya rival.

**Local:**

- `duelos:jugados` (`{ id: { juego: puntos } }`) guarda lo jugado aunque falle la subida, se reintenta al abrir el duelo y evita repetir.
- `duelos:ocultos` guarda las invitaciones rechazadas.

## Pantallas

- **Menú:** botón "⚔️ Duelos" con el aviso "N tu turno" (tu turno más invitaciones). Sin CONFIG no aparece. Sin sesión, lleva a ☁️ Nube con el aviso "Entra para jugar duelos".
- **Bandeja (`#duelos`):**
  - **Balance:** victorias, derrotas y empates.
  - **"➕ Nuevo duelo".**
  - **Grupos:** Invitaciones (Aceptar o Rechazar), Tu turno, Esperando al rival y Terminados (los últimos 10, con ganaste, perdiste, empate o caducado).
- **Nuevo duelo (`#nuevo-duelo`):** los botones de la maqueta y "⚔️ Crear y desafiar". Con enlace, se comparte al crear.
- **Duelo (`#duelo`):**
  - **Marcador:** "Tú vs rival".
  - **Datos:** modo de victoria, dificultad y tiempo restante.
  - **Juegos:** una fila por juego con tu puntuación, la del rival (o 🔒) y ✓ en el ganador.
  - **Botones:** "▶ Jugar <siguiente juego>", y "📤 Compartir enlace" mientras falte rival.
  - **Duelo ajeno:** si te llega un duelo de otra persona que espera rival, aparece "⚔️ Aceptar duelo".
- **Al terminar un juego del duelo:**
  - el final muestra "⚔️ Duelo vs X · juego i/n";
  - el botón grande es "⚔️ Volver al duelo";
  - no aparecen "Por ⭐⭐⭐" ni el récord del modo.
- **Enlace `?duelo=ID`:** al tener sesión, se abre ese duelo. Sin sesión, lleva a ☁️ Nube.

## Organización

| Archivo | Contenido |
|---|---|
| `games/duelos.js` (puro) | `PLAZO`, `elegirJuegos`, `marcador`, `estadoDuelo`, `resultadoPara`, `verRival` |
| `games/nube.js` | `crearDuelo`, `leerDuelo`, `misDuelos`, `invitaciones`, `duelosAlAzar`, `unirseDuelo`, `anotarDuelo`, `borrarDuelo` |
| `main.js` | pantallas, flujo de juego y estadísticas |
| `index.html`, `styles.css` | las tres secciones y el botón del menú |
| `firestore.rules` | las reglas de `duelos` |

## Pruebas

- **`tests.js`:**
  - `elegirJuegos`: distintos, la cantidad y menos si no hay;
  - `marcador`: juego a juego, con "menos es mejor", empate, suma y caducado;
  - `estadoDuelo`: todos los estados;
  - `verRival`.
- **Contra el Firebase del usuario**, con dos invitados en dos navegadores:
  - crear con enlace, unirse, jugar los dos y ver el ganador;
  - comprobar que las reglas impiden repetir un juego.
