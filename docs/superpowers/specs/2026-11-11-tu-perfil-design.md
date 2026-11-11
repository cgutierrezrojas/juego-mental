# Ronda 1 · Tu perfil — diseño

Nivel de jugador con experiencia, avatar con marco, calendario de premios de 7 días y misiones semanales. El objetivo es que el inicio muestre tu progreso en toda la app y dé motivos para volver cada día y cada semana. Aprobado por el usuario el 2026-11-11.

## Experiencia y niveles (`games/perfil.js`, puro)

**XP por evento:**

| Evento | XP |
|---|---|
| `partida` (cualquier partida terminada) | 10 |
| `victoria` | 20 |
| `empate` | 10 |
| `estrellas` | 5 por estrella nueva |
| `entreno` (Tu día completo) | 30 |
| misión cumplida | 50 / 100 / 150 (fácil / media / difícil) |
| día 7 del calendario | 100 |

**Curva:** para pasar del nivel `n` al `n+1` hacen falta `100 + 20·(n−1)` XP. `nivelDe(xp)` devuelve `{ nivel, titulo, enNivel, paraSubir }`, donde `enNivel` es la XP acumulada dentro del nivel actual.

**Títulos:**

| Niveles | Título |
|---|---|
| 1–9 | Novato |
| 10–19 | Aprendiz |
| 20–29 | Hábil |
| 30–39 | Experto |
| 40–49 | Maestro |
| 50 o más | Leyenda |

**Premios por subir:** +50 fichas por cada nivel nuevo. Si una sola vez sube varios niveles, suman todos.

**Marcos:** el avatar se dibuja con un anillo del color del marco elegido.

| id | Nombre | Nivel |
|---|---|---|
| `ninguno` | Sin marco | 1 |
| `bronce` | Bronce | 5 |
| `plata` | Plata | 10 |
| `oro` | Oro | 15 |
| `esmeralda` | Esmeralda | 20 |
| `rubi` | Rubí | 25 |
| `diamante` | Diamante | 30 |
| `fuego` | Fuego | 40 |
| `arcoiris` | Arcoíris (animado, salvo con movimiento reducido) | 50 |

`marcosDisponibles(nivel)` devuelve los marcos ya ganados.

**Avatares:** `AVATARES` es una lista fija de unos 40 emojis (animales, caras, objetos), todos disponibles desde el inicio. El avatar por defecto es 🙂.

## Calendario de 7 días (reemplaza el bono diario)

**Fichas por día del calendario:** `[50, 75, 100, 125, 150, 200, 400]`. El día 7 da además 100 XP.

**Registro `perfil:calendario`:** `{ dia, fecha }`, con el último día cobrado y la fecha en que se cobró.

**`cobrarCalendario(registro, hoy)`:**
- Si ya cobró hoy, no da nada.
- Si cobró ayer, avanza al día siguiente; después del día 7 vuelve al 1.
- Si no cobró ayer (o nunca), empieza en el día 1.

**`diaDeHoy(registro, hoy)`** dice qué día se cobraría hoy y si ya se cobró, para pintar las tarjetas.

**Dónde se cobra:**
- En la tarjeta 🎁 del inicio y en la pantalla del perfil.
- En el aviso «sin fichas» del 21 y el Bacará, donde estaba el bono. `cobrarBono` y `BONO` desaparecen de `games/premios.js` y `app/premios.js`. Los desafíos del día siguen igual.

## Misiones semanales

**Lista fija (`MISIONES`).** `{seccion}` rota entre las 6 secciones del inicio.

| Dificultad | Misiones |
|---|---|
| Fácil | Juega 5 partidas · Juega 3 partidas de {seccion} · Consigue 3 estrellas en Niveles |
| Media | Juega 10 partidas de {seccion} · Gana 3 veces · Completa Tu día 3 días · Juega en 4 secciones distintas |
| Difícil | Juega 30 partidas · Gana 8 veces · Consigue 15 estrellas en Niveles · Completa Tu día 6 días |

**Premios:** 100, 200 y 300 fichas, más 50, 100 y 150 XP.

**`misionesDe(semana)`:**
- Elige 3 misiones (una fácil, una media y una difícil) con un generador con semilla, a partir de la semana ISO (`semanaDe`, de games/liga.js).
- La misma semana da las mismas misiones a todos.
- Si las dos misiones con sección salen en la misma semana, usan secciones distintas.

**Avance:**
- Se guarda en `perfil:misiones` = `{ semana, avance: { [id]: n }, secciones: [ids], cobradas: [ids] }`. Si la semana cambia, empieza de cero.
- `avanzar(registro, evento, n, seccion, semana)` suma a las misiones que coinciden.
- Una misión cumplida se cobra sola: en el acto da fichas y XP, con un aviso «🎯 Misión cumplida: … +200 fichas».

## Eventos (de dónde sale todo)

**`ligaAnotar(tipo, n, seccion)`** (app/liga.js) recibe un tercer argumento opcional, la sección (`'mentales'`, `'mesa'`, `'trivia'`, `'cartas'`, `'arcade'`, `'palabras'` o `'duelos'`). Además de lo de la liga, llama a `anotarPerfil(tipo, n, seccion)`. Hay que añadir la sección en las unas 18 llamadas que existen.

**Victorias contra la máquina:** no cuentan para la liga, solo para el perfil. Avisan con `anotarPerfil('victoria', 1, seccion)` en tres sitios:
- `apuntarFinal` de app/mesa.js (modo máquina);
- `pintarFin` de app/cartas-mesa.js (modo máquina);
- `ganarSolitario` de app/cartas.js.

**`anotarPerfil`** (app/perfil.js):
- suma la XP;
- avanza las misiones (y cobra las cumplidas);
- si sube de nivel, da las fichas y avisa con confeti y el texto «⬆️ ¡Nivel N! +50 fichas» (y «🖼️ Nuevo marco: Oro» cuando corresponde);
- vuelve a pintar la cabecera si el inicio está a la vista.

## Pantallas

**Inicio** (encima de «Tu día» y la liga):
- Una cabecera con el avatar (con su marco), «Nivel N · Título» y una barra de XP con «enNivel/paraSubir XP».
- Dos tarjetas en fila:
  - **🎁 Día N/7:** con «¡Cobrar X!» o «Vuelve mañana».
  - **🎯 Misiones k/3.**
- Tocar la cabecera o una tarjeta abre el perfil.

**Perfil:** pantalla nueva `#perfil`, a la que también se llega desde 👤 Tú. Muestra:
- el avatar grande y el nivel con su barra;
- la rejilla de avatares para elegir;
- la fila de marcos, donde los bloqueados se ven en gris con su nivel;
- el calendario de 7 casillas: el día de hoy resaltado, los cobrados con ✓ y un botón para cobrar;
- las 3 misiones con su barra de avance y su premio.

Usa los estilos y colores de las tarjetas que ya existen, en tema claro y oscuro.

## Datos y nube

**Claves locales:** `perfil:xp` (número), `perfil:avatar` (`{ a, m }`), `perfil:calendario` y `perfil:misiones`. Se añade `'perfil:'` a `PREFIJOS` en games/copia.js, así se sincronizan con la nube y entran en la copia de seguridad.

**Filas que ven los demás** (además de lo que ya llevan): `avatar` (texto de 1 a 16 caracteres), `marco` (uno de los id de la tabla de marcos) y `nivel` (entero de 1 a 1000). Van en:
- la fila del ranking;
- la fila de la liga;
- el perfil público (`perfiles/{uid}`, que ya tiene apodo y código).

**Dónde se ven:**
- en el ranking y la liga, como avatar con marco junto al apodo y una «Nv N» chica;
- en Amigos, leyendo el perfil público de cada amigo (una lectura por amigo al abrir la lista).

**`firestore.rules`:**
- `filaValida`, la liga y `perfiles` aceptan los 3 campos, que son opcionales: las filas viejas sin ellos siguen valiendo;
- se valida el tamaño, la lista de marcos y el rango del nivel;
- **el usuario publica las reglas** antes de la versión web que envía esos campos (si no, se rechaza la fila del ranking).

**Arranque:** todos empiezan en nivel 1 con 0 XP. No hay XP retroactiva.

## Pruebas (`tests.js`)

- **Curva:** `nivelDe(0)` = nivel 1; `nivelDe(100)` = nivel 2; los títulos cambian en los niveles 10, 20, 30, 40 y 50.
- **Marcos:** `marcosDisponibles(15)` incluye oro y no esmeralda.
- **Calendario:**
  - días seguidos avanzan del 1 al 7 y vuelven al 1;
  - faltar un día vuelve al 1;
  - cobrar dos veces el mismo día da 0.
- **Misiones:**
  - la misma semana da las mismas 3 (una de cada dificultad);
  - las secciones no se repiten;
  - el avance cuenta solo los eventos que coinciden;
  - «4 secciones distintas» cuenta secciones sin repetir;
  - al cambiar de semana se reinicia.
- **XP de cada evento** según la tabla.
- **En el navegador:**
  - jugar partidas y ver subir la barra, el aviso de nivel y el avance de las misiones;
  - cobrar el calendario;
  - elegir avatar y marco;
  - revisar el ranking y la liga con avatar, en tema claro y oscuro.
