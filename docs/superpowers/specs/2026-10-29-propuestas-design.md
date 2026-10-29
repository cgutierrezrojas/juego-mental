# S3c: ✍️ Preguntas de los jugadores — diseño

Los jugadores proponen preguntas; solo el dueño de la app las aprueba o rechaza; las aprobadas se suman al banco de todos.

## Proponer

- ❓ Trivia → **✍️ Proponer pregunta** (pide sesión con apodo, como los duelos: `asegurarDuelista`).
- Formulario: categoría (6), dificultad (Fácil / Normal / Difícil), pregunta (10–110 letras), respuesta correcta y 3 incorrectas (1–26 letras, las 4 distintas). No puede repetir una pregunta del banco (`problemaPregunta` en `games/preguntas.js`).
- Debajo, «Tus propuestas»: ⏳ Pendiente / ✅ Aprobada / ❌ Rechazada.

## Revisar

- Solo si existe `admins/{tu uid}` (se crea a mano en la consola de Firebase; nadie puede escribirlo desde la app). El correo y el uid no quedan en el repositorio.
- ❓ Trivia muestra **🛡️ Revisar propuestas (N)**: cada pendiente con categoría, dificultad, texto, respuestas (la correcta marcada) y apodo; **✅ Aprobar** / **❌ Rechazar**.
- Aprobar = en un lote, crea `preguntas/{id}` con `{ c, d, p, o }` y marca la propuesta `aprobada`. Rechazar = la marca `rechazada`.

## Datos (Firestore)

- `propuestas/{id}`: `{ de, apodo, c, d, p, o, estado: 'pendiente' | 'aprobada' | 'rechazada', creada }`.
  - Crear: con sesión, `de` = uno mismo, `estado` pendiente, forma y tamaños válidos.
  - Leer: su autor o un admin. Actualizar (solo `estado`): un admin. Borrar: su autor o un admin.
- `preguntas/{id}`: `{ c, d, p, o }`. Leer: cualquiera. Escribir: solo un admin.
- `admins/{uid}`: leer solo el propio documento; escribir nadie.
- `borrarTodo` borra también las propuestas de la persona.

## Banco

- `agregarPreguntas(lista)` suma al banco (`PREGUNTAS`) las válidas que no estén.
- Al abrir ❓ Trivia se descargan las aprobadas y se guardan en `trivia-extra` (sin prefijo `trivia:`: no se sincroniza); al cargar la app se suman desde ahí, así que sirven sin conexión. Las usan la Ruleta, la Fiesta, la partida contra un amigo y la Trivia rápida.

## Pruebas

`tests.js`: `problemaPregunta` (cada error y una válida) y `agregarPreguntas` (no duplica, ignora inválidas). Chrome contra Firebase real con dos cuentas (una con `admins`): proponer, ver «Tus propuestas», reglas (un no-admin no puede aprobar ni crear preguntas ni leer propuestas ajenas), aprobar, rechazar y que la aprobada salga en el banco.
