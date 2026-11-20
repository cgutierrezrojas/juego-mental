// 🧩 Puzzles: la página de la sección (Sudoku y Buscaminas infinito), los modos de cada juego con su récord y el 📅 Del día.
// Récords en `puzzles:<juego>` = { facil: { mejor, veces }, normal, dificil, dia: { fecha, valor } } (se copian a la nube).
import { el, guardar } from '../games/comun.js';
import { fechaLocal } from '../games/estadisticas.js';
import { semillaDelDia } from '../games/minas.js';
import { semillaNueva } from '../games/semilla.js';
import { leerJSON } from './datos.js';
import { mostrar, $ } from './ui.js';
import { boton } from './cartas.js';
import { jugarSudoku, pararSudoku, partidaSudoku } from './sudoku.js';

export const JUEGOS_PUZZLES = 2; // para la cuenta del inicio (Sudoku y Buscaminas)

const NIVELES = [['facil', '🙂 Fácil'], ['normal', '😐 Normal'], ['dificil', '😈 Difícil']];
export const NOMBRE_NIVEL = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' };

// `marca(valor)`: cómo se escribe el récord; `mejor(a, b)`: el mejor de dos. `jugar(nivel, { semilla, delDia })`.
// `guardada()`: la partida a medias ({ nivel, segundos }) o null; `seguir()` la retoma.
const pronto = () => ($('puzzles-aviso').textContent = '💣 El Buscaminas llega pronto.');
export const JUEGOS = {
  sudoku: { icono: '🔢', nombre: 'Sudoku', marca: (s) => reloj(s), menorEsMejor: true, jugar: jugarSudoku, guardada: partidaSudoku, seguir: () => jugarSudoku(null, { seguir: true }) },
  minas: { icono: '💣', nombre: 'Buscaminas', marca: (n) => `${n} pts`, menorEsMejor: false, jugar: pronto, guardada: () => null },
};

export const reloj = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export const leerPuzzle = (juego) => leerJSON('puzzles:' + juego);

// Al terminar una partida normal: suma una vez y guarda el mejor. Devuelve true si es récord nuevo.
export function anotarRecord(juego, nivel, valor) {
  const r = leerPuzzle(juego);
  const antes = r[nivel] ?? { veces: 0 };
  const J = JUEGOS[juego];
  const nuevo = antes.mejor == null || (J.menorEsMejor ? valor < antes.mejor : valor > antes.mejor);
  r[nivel] = { veces: (antes.veces ?? 0) + 1, mejor: nuevo ? valor : antes.mejor };
  guardar('puzzles:' + juego, JSON.stringify(r));
  return nuevo;
}

// 📅 Del día: el intento se gasta al empezar (`valor: null`); al terminar se apunta el resultado.
export const yaJugadoHoy = (juego) => leerPuzzle(juego).dia?.fecha === fechaLocal();
export function apuntarDia(juego, valor) {
  const r = leerPuzzle(juego);
  r.dia = { fecha: fechaLocal(), valor };
  guardar('puzzles:' + juego, JSON.stringify(r));
}
function jugarDia(juego) {
  if (yaJugadoHoy(juego)) return;
  apuntarDia(juego, null);
  JUEGOS[juego].jugar('normal', { semilla: semillaDelDia(fechaLocal(), juego), delDia: true });
}

export const pararPuzzles = () => pararSudoku();

// El ← de la cabecera vuelve al inicio desde la lista y a la lista desde los modos.
function cabecera(titulo, volver, etiqueta) {
  $('puzzles-titulo').textContent = titulo;
  const b = $('btn-puzzles-volver');
  b.onclick = volver;
  b.setAttribute('aria-label', etiqueta);
}

export function abrirPuzzles() {
  mostrar('puzzles');
  cabecera('🧩 Puzzles', () => mostrar('inicio'), 'Volver al inicio');
  $('puzzles-aviso').textContent = '';
  const rejilla = el('div', 'rejilla');
  rejilla.append(...Object.entries(JUEGOS).map(([id, J]) => {
    const b = boton('', 'tarjeta color', () => abrirModos(id));
    b.style.setProperty('--c', 'var(--verde)');
    b.append(el('span', 'icono', J.icono), el('span', '', J.nombre));
    return b;
  }));
  $('puzzles-contenido').replaceChildren(el('h3', 'categoria', 'Juegos'), rejilla);
}

// Los cuatro modos con su récord. Si hay una partida a medias, antes pregunta si se sigue.
export function abrirModos(juego) {
  const J = JUEGOS[juego];
  mostrar('puzzles');
  cabecera(`${J.icono} ${J.nombre}`, abrirPuzzles, 'Volver a Puzzles');
  $('puzzles-aviso').textContent = '';
  const r = leerPuzzle(juego);
  const modo = (texto, detalle, alPulsar) => {
    const b = boton('', 'color', alPulsar);
    b.style.setProperty('--c', 'var(--verde)');
    b.append(el('span', '', texto), el('small', '', detalle));
    return b;
  };
  const elegir = (nivel) => () => (J.guardada() ? preguntaSeguir(juego, nivel) : J.jugar(nivel, { semilla: semillaNueva() }));
  const botones = NIVELES.map(([nivel, texto]) => {
    const x = r[nivel];
    return modo(texto, x?.mejor != null ? `🏆 ${J.marca(x.mejor)} · ${x.veces} vez${x.veces > 1 ? 'es' : ''}` : 'Sin récord', elegir(nivel));
  });
  const hoy = yaJugadoHoy(juego);
  const dia = modo('📅 Del día', hoy ? `Ya jugado hoy: ${r.dia.valor == null ? 'sin terminar' : J.marca(r.dia.valor)}` : 'El mismo para todos · un intento', () => jugarDia(juego));
  dia.disabled = hoy;
  const lista = el('div', 'modos-puzzle');
  lista.append(...botones, dia);
  $('puzzles-contenido').replaceChildren(lista);
}

function preguntaSeguir(juego, nivel) {
  const J = JUEGOS[juego];
  const g = J.guardada();
  $('puzzles-aviso').textContent = '';
  const fila = el('div', 'modos-puzzle');
  fila.append(
    boton('▶ Seguir', 'grande color', J.seguir),
    boton(`Empezar otra (${NOMBRE_NIVEL[nivel]})`, '', () => J.jugar(nivel, { semilla: semillaNueva() })),
    boton('Volver', '', () => abrirModos(juego)),
  );
  fila.firstChild.style.setProperty('--c', 'var(--verde)');
  $('puzzles-contenido').replaceChildren(
    el('h3', '', '¿Seguir la partida?'),
    el('p', 'sin-datos', `Tienes un ${J.nombre} ${NOMBRE_NIVEL[g.nivel]} a medias (⏱ ${reloj(g.segundos)}). Si empiezas otra, se pierde.`),
    fila,
  );
}

// Para 📊 Estadísticas: una fila por juego y nivel con récord.
export const filasRecords = () => Object.entries(JUEGOS).flatMap(([id, J]) => {
  const r = leerPuzzle(id);
  return NIVELES.filter(([nv]) => r[nv]?.mejor != null).map(([nv]) => `${J.icono} ${J.nombre} ${NOMBRE_NIVEL[nv]}: ${J.marca(r[nv].mejor)}`);
});
