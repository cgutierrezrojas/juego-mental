# Pa'l Rato — S3a: ❓ Trivia (banco, ruleta, fiesta y ronda rápida)

Fecha: 2026-10-28

Primera de las tres partes de la Trivia, aprobada por el usuario. Le siguen S3b (ruleta contra un amigo, con el modelo de partidas de Mesa) y S3c (preguntas propuestas por los jugadores, con un panel de revisión que solo ve la cuenta del usuario).

## Banco de preguntas (`games/preguntas.js`)

- 300 preguntas en español, 50 por categoría:
  - 🌍 Geografía (`geo`), 📜 Historia (`historia`), 🔬 Ciencia y tecnología (`ciencia`);
  - 🎬 Entretenimiento (`ocio`), 🍔 Comida y vida diaria (`comida`), 🐾 Animales y naturaleza (`animales`).
- Cada pregunta: `{ c, p, o, d }` = categoría, texto, 4 opciones (la primera es la correcta y se barajan al mostrarlas) y dificultad 1 🙂, 2 😐 o 3 😈 (unas 100 de cada una).
- `trivia:recientes` guarda las últimas 100 preguntas que salieron (su texto) para no repetirlas pronto.
- S3c sumará las preguntas aprobadas de los jugadores a este banco.

## Página ❓ Trivia

- Igual que la de Mesa: tres tarjetas, 🎡 Ruleta, 🎉 Fiesta y ⚡ Ronda rápida.
- El inicio cuenta 3 juegos en la sección, que deja de salir como "Próximamente".

## 🎡 Ruleta en solitario

- Una ruleta animada de 6 colores elige la categoría. Para contestar hay 20 s; si se acaba el tiempo, cuenta como fallo.
- Cada acierto llena una barra de 3. Con la barra llena se elige una categoría sin corona y se responde una **pregunta corona** (difícil). Si se acierta, se gana su 👑. Haya acierto o fallo, la barra vuelve a 0.
- Fallar una pregunta vacía la barra y quita una de las 3 ❤️.
- Se gana con las 6 coronas y se pierde sin vidas.
- `trivia:ruleta` = `{ partidas, ganadas, mejor }`, donde `mejor` es la mayor cantidad de coronas. Cuenta para la liga (`partida`) y los logros.
- Las reglas son puras y viven en `games/ruleta.js`: estado inicial, responder, pedir la corona y fin de partida.

## 🎉 Fiesta en un celular

- De 2 a 6 jugadores con nombre. Es la misma ruleta y la misma barra, pero sin vidas.
- Cada jugador sigue mientras acierte; al fallar se pasa el celular, con una pantalla de "Turno de Ana 📱".
- Gana el primero que junta las 6 coronas. No guarda nada.

## ⚡ Ronda rápida

- Es una entrada más en `JUEGOS` (`id: 'trivia'`, `seccion: 'trivia'`, sin `categoria`). Usa `jugarConOpciones`:
  - 60 s, 30 s en ⚡ o ❤️ sin fallar; fallar resta 3 s y la pista muestra la respuesta correcta;
  - las preguntas pasan de fáciles a difíciles según los aciertos;
  - la dificultad elegida desplaza ese avance, como en los demás juegos.
- Gracias a eso trae ranking, duelos por turnos y en vivo, liga y logros sin código nuevo.
- No tiene modo 🪜 Niveles ni entra en el entrenamiento diario.
- Habilidad del perfil: ninguna nueva. No suma a las barras de habilidades.

## Otros

- La copia de seguridad incluye el prefijo `trivia:`.
- `sw.js` incluye los archivos nuevos.

## Pruebas

- `tests.js` comprueba:
  - el banco: 50 por categoría, 4 opciones distintas, dificultades válidas y sin textos repetidos;
  - la ruleta: la barra, la corona, las vidas, ganar y perder.
- En Chrome se prueban la ruleta, la fiesta y la ronda rápida, en tema claro y oscuro y a 390 px de ancho.
