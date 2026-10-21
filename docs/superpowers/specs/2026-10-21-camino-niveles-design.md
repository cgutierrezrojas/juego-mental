# Juego Mental — F1: camino de niveles

Fecha: 2026-10-21

Primera de cuatro mejoras para que la app sea más interactiva y fácil de entender. El orden es: Niveles, final de partida, menú y ayuda de la primera vez. El usuario eligió en el compañero visual la opción A, un camino de niveles, con los retos de hoy siempre visibles como en la opción B. Aprobó la maqueta y este diseño.

## Pantalla (modo Niveles)

De arriba abajo:

1. **Total:** "⭐ 101 · 📅🔥 2". La racha solo sale si es mayor que 0.
2. **📅 Retos de hoy:** son los 3 diarios, en 3 botones azules siempre visibles, y sustituyen a la pestaña "Hoy".
   - Cada botón muestra el nivel, el icono del reto y las estrellas.
   - Los superados (⭐ o más) aparecen rellenos.
3. **Cartel del mundo:** "◀ Mundo 6 · 🏃 Maratón ▶".
   - Debajo lleva una línea con la explicación de la variante y el progreso del mundo (niveles con ⭐ de 10).
   - Sin variante, la línea dice solo "2/10".
   - ◀ y ▶ funcionan como ahora: ▶ llega como mucho al mundo más alto desbloqueado.
4. **Camino:**
   - Muestra los 10 niveles del mundo de abajo arriba, en zigzag, unidos por una línea discontinua.
   - Los niveles hechos van en verde con sus estrellas.
   - El actual (tu siguiente nivel) es más grande, late y lleva 🧑.
   - Los bloqueados van apagados con 🔒.
   - El jefe (nivel 10.º) es más grande y dorado, con 👑.
5. **Botón grande:** "▶ Jugar nivel N" juega siempre tu siguiente nivel.

**Explicaciones de las variantes** (`DESCRIPCION_VARIANTE` en `niveles.js`):

| Variante | Explicación |
|---|---|
| Maratón | "Más tiempo, más aciertos" |
| Relámpago | "Menos tiempo, menos aciertos" |
| Precisión | "La mitad de los niveles, sin fallar" |

## Tarjeta del nivel

- **Cuándo sale:** al tocar un nivel libre del camino o un reto de hoy, se abre un `<dialog>` modal anclado abajo.
- **Nivel normal:**
  - "Nivel 52 · ⏱ Normal" y, si tiene variante, también su nombre;
  - las estrellas que tienes y las 3 metas;
  - el botón "▶ Jugar", que pasa a "▶ Jugar por ⭐⭐⭐" si ya tienes alguna estrella y te faltan.
- **Reto de hoy:** la tarjeta va en azul con "📅 Reto de hoy 2/3 · Nivel 52", el aviso "Supera los 3 hoy para mantener tu 📅🔥 N" (o "…para empezar una racha" si es 0) y el botón "▶ Jugar reto 2".
- **Cerrar:** con ✕, Esc o tocando fuera. Al cerrar, el foco vuelve al botón que la abrió.

## Comportamiento

- **Al abrir la pantalla:** se ve el mundo de tu siguiente nivel y el camino se desplaza hasta él (`scrollIntoView`, al centro).
- **Animación de mundo nuevo:** el cartel hace una animación de entrada cuando el mundo mostrado es nuevo. Es nuevo cuando tu siguiente nivel es su primer nivel, es decir, acabas de superar el jefe anterior.
- **Movimiento reducido:** con `prefers-reduced-motion` no hay latido ni animación.
- **Estado:**
  - Tocar un nivel deja `vistaHoy = false` y `nivelElegido = n`.
  - Tocar un reto deja `vistaHoy = true` y `diarioElegido = i`.
  - El botón grande deja `vistaHoy = false` y `nivelElegido = siguiente`.
  - El final de partida, "Siguiente nivel" y "Siguiente diario" siguen igual.
- **Accesibilidad:**
  - El orden del DOM es 1→10 y el camino lo invierte con `flex-direction: column-reverse`.
  - Cada nivel y cada reto mantienen su `aria-label` ("Nivel 52, Normal, 2 de 3 estrellas").
  - Las filas son `role="group"`.
  - El `<dialog>` atrapa el foco de forma nativa.

## Organización

- **`games/niveles.js`:** se añade `DESCRIPCION_VARIANTE`.
- **`main.js`:**
  - `pintarNiveles` dibuja los retos de hoy, el cartel, el camino y el botón;
  - una función abre la tarjeta del nivel;
  - se quitan la pestaña Hoy y el objetivo fijo.
- **`index.html`:** el `<dialog id="tarjeta-nivel">`.
- **`styles.css`:**
  - el camino en zigzag con `nth-child` y su línea;
  - el nodo actual con latido, el del jefe, los hechos y los bloqueados;
  - los retos de hoy, el cartel y su animación;
  - la tarjeta abajo, con los dos temas.

## Pruebas

- **`tests.js`:** hay una descripción para cada variante.
- **Chrome (CDP), a 390 px:**
  - al abrir se ve el mundo actual con el camino centrado en tu nivel;
  - tocar un nivel abre la tarjeta y Esc la cierra devolviendo el foco;
  - un reto de hoy se juega y guarda sus estrellas;
  - el botón grande juega el siguiente nivel;
  - no hay desplazamiento horizontal;
  - se ve bien en los temas claro y oscuro.
