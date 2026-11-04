# S6b: 🎭 Charadas, 🪜 Escalera de palabras y 💰 La gran escalera — diseño

Segunda parte de 🔤 Palabras (ver S6a). Las dos ideas de concurso son propias: solo se toma la idea general (adivinar con letras que se destapan; subir una escalera de preguntas con ayudas), sin nombres, marcas ni formato de programas reales.

## 🎭 Charadas (en Palabras)

- Juego de fiesta en un celular. Antes: el tema (Animales, Comida, Oficios, Lugares, Deportes, **Acciones** y **Objetos** —nuevos, en `games/diccionario.js` solo para charadas— o 🎲 Mezcla) y «▶ Empezar».
- Cuenta 3-2-1 y luego **60 segundos**. Se muestra una palabra grande (con tilde) para ponerla en la frente con el celular en horizontal.
- **Inclinar hacia abajo** (la pantalla mira al suelo) = ✅ acierto; **hacia arriba** = ⏭ paso. Hay que volver a la posición recta antes de la siguiente. Siempre se puede **tocar** la mitad derecha (acierto) o la izquierda (paso).
- En iPhone el sensor pide permiso (`DeviceOrientationEvent.requestPermission`) al pulsar «Empezar»; si no hay sensor o se niega, se juega con toques (y se avisa).
- Sonido y vibración en cada acierto y paso; color verde o naranja de fondo un instante.
- Al terminar: total de aciertos y la lista de palabras con ✅ / ⏭; «🔄 Siguiente jugador» (mismo tema, palabras nuevas sin repetir en la sesión) y «Volver».
- Sin récord, ranking ni retos. Liga: +1 por ronda.
- `games/charadas.js` (puro): `nueva(tema, rnd)` con la lista barajada, `marcar(e, 'acierto' | 'paso')`, `inclinacion(beta, gamma, orientacion)` → 'abajo' | 'arriba' | 'recto'.

## 🪜 Escalera de palabras (en Palabras)

- 10 palabras con su definición, de largo creciente: 4, 5, 6, 7, 7, 8, 8, 9, 10 y 11 letras.
- Se ven la definición y las casillas. **Cada 2,5 s se destapa una letra al azar.** El jugador escribe en las casillas ocultas (las destapadas se saltan) con el teclado con Ñ y «Enviar».
- Acierto: **10 puntos por cada letra que seguía oculta**. Fallo, o se destapan todas: −1 ❤️ (hay 3) y se ve la palabra. Pasa a la siguiente; sin vidas o tras la 10.ª, fin.
- Definiciones propias en `games/definiciones.js`: al menos 20 por largo (4 a 11 letras), `{ palabra, definicion }`, palabras sin tildes y con Ñ (se muestran con tilde).
- Récord `record:escalera` (ranking, 1–10000) y retos (misma semilla = mismas palabras y mismo orden de letras destapadas).
- `games/escalera.js` (puro): `nueva(semilla)`, `destapar(e)`, `responder(e, texto)`.

## 💰 La gran escalera (en ❓ Trivia)

- 15 preguntas de 4 opciones del banco de la Trivia: 5 fáciles, 5 medias y 5 difíciles, en ese orden.
- Escalones: 100, 200, 300, 500, **1000**, 2000, 4000, 8000, 16000, **32000**, 64000, 125000, 250000, 500000, 1000000. Los marcados son seguros.
- **30 segundos** por pregunta. Fallar o quedarse sin tiempo: te llevas el último seguro alcanzado. Antes de responder se puede **🏳️ plantarse** y llevarse lo ganado.
- Ayudas, una vez cada una: **50:50** (quita dos incorrectas), **👥 El público** (barras; la correcta recibe más votos cuanto más fácil: 65 %, 50 % y 38 % de media), **🔄 Cambiar pregunta** (otra del mismo nivel) y **⏱ Más tiempo** (+30 s).
- Al acertar: la escalera se ilumina en el nuevo escalón. Al terminar: lo ganado, el récord y los botones de siempre (Otra vez, Retar a un amigo, Volver).
- Récord `record:granescalera` (ranking, 1–1000000) y retos (misma semilla = mismas preguntas, mismas de cambio y mismo público).
- `games/granescalera.js` (puro): `nueva(semilla, banco)`, `responder(e, i)`, `plantarse(e)`, `ayuda(e, tipo)`, `sinTiempo(e)`. La pantalla va en `app/granescalera.js`, con su tarjeta en la página de Trivia.

## Común

- `JUEGOS_PALABRAS` suma charadas y escalera; `granescalera` va en `INFO_JUEGOS` (sección trivia) para duelos y ranking.
- `LIMITES` (games/sincro.js) y `firestore.rules`: `escalera` 1–10000, `granescalera` 1–1000000. **El usuario debe publicar las reglas.**
- Pruebas en `tests.js`: inclinación, charadas sin repetir; escalera (destapar, puntos por ocultas, fallo y vidas, misma semilla); gran escalera (escalones, seguros, plantarse, sin tiempo, 50:50 deja la correcta, público suma 100, cambiar pregunta del mismo nivel, misma semilla); definiciones sin tildes, del largo pedido y sin repetir. Chrome en claro y oscuro a 390 px (charadas también en horizontal) y un reto con dos cuentas.
