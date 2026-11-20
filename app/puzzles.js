// 🧩 Puzzles: la página de la sección (Sudoku y Buscaminas infinito), los modos de cada juego con su récord y el 📅 Del día.
// Récords en `puzzles:<juego>` = { facil: { mejor, veces }, normal, dificil, dia: { fecha, valor } } (se copian a la nube).
import { el, guardar, leer } from '../games/comun.js';
import { fechaLocal } from '../games/estadisticas.js';
import { semillaDelDia } from '../games/minas.js';
import { semillaNueva } from '../games/semilla.js';
import { leerJSON } from './datos.js';
import { mostrar, $ } from './ui.js';
import { E } from './estado.js';
import { filaPublica, nombreConAvatar } from './perfil.js';
import { boton } from './cartas.js';
import { jugarSudoku, pararSudoku, partidaSudoku } from './sudoku.js';
import { jugarMinas, pararMinas, partidaMinas } from './minas.js';

export const JUEGOS_PUZZLES = 2; // para la cuenta del inicio (Sudoku y Buscaminas)

const NIVELES = [['facil', '🙂 Fácil'], ['normal', '😐 Normal'], ['dificil', '😈 Difícil']];
export const NOMBRE_NIVEL = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' };

// `marca(valor)`: cómo se escribe el récord; `mejor(a, b)`: el mejor de dos. `jugar(nivel, { semilla, delDia })`.
// `guardada()`: la partida a medias (con `nivel`) o null; `resumen(g)` la describe; `seguir()` la retoma.
export const JUEGOS = {
  sudoku: { icono: '🔢', nombre: 'Sudoku', marca: (s) => reloj(s), menorEsMejor: true, jugar: jugarSudoku, guardada: partidaSudoku, resumen: (g) => `⏱ ${reloj(g.segundos)}`, seguir: () => jugarSudoku(null, { seguir: true }) },
  minas: { icono: '💣', nombre: 'Buscaminas', marca: (n) => `${n} pts`, menorEsMejor: false, jugar: jugarMinas, guardada: partidaMinas, resumen: (g) => `⭐ ${g.abiertas} casillas abiertas`, seguir: () => jugarMinas(null, { seguir: true }) },
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

// 📅 Del día: el intento se gasta al empezar (`valor: null`); al terminar se apunta el resultado y se sube al ranking.
export const yaJugadoHoy = (juego) => leerPuzzle(juego).dia?.fecha === fechaLocal();
export function apuntarDia(juego, valor) {
  const r = leerPuzzle(juego);
  // al terminar se conserva la fecha de cuando empezó (un del día que cruza la medianoche es el de ayer)
  r.dia = { fecha: valor == null ? fechaLocal() : r.dia?.fecha ?? fechaLocal(), valor };
  guardar('puzzles:' + juego, JSON.stringify(r));
  if (valor != null) subirDia(juego);
}

// Ranking del día en Firestore: `diario/{fecha}_{juego}/jugadores/{uid}`.
const idDia = (fecha, juego) => `${fecha}_${juego}`;
const subiendo = {}; // juego → subida en curso (el ranking la espera un rato para salir con tu fila)

// Sube la fila del día si hay cuenta y apodo. Queda `dia.pendiente` hasta que responda: si falla, se reintenta al abrir Puzzles.
function subirDia(juego) {
  const apodo = leer('nube:apodo');
  const r = leerPuzzle(juego);
  const { fecha, valor } = r.dia ?? {};
  if (!E.nube || !E.usuario || !apodo || valor == null) return;
  r.dia.pendiente = true; // por si la app se cierra antes de que responda
  guardar('puzzles:' + juego, JSON.stringify(r));
  const fila = { apodo, valor: juego === 'minas' ? Math.min(valor, 100000) : valor, actualizado: Date.now(), ...filaPublica() };
  subiendo[juego] = E.nube.guardarDiario(idDia(fecha, juego), E.usuario.uid, fila)
    // permission-denied: la fila ya existe (desde otro celular, o llegó la escritura en cola de un intento anterior) o las
    // reglas no la admiten; reintentar no sirve. Si la fila propia está, cuenta como subida.
    .then(() => 'subida', async (e) => {
      if (e?.code !== 'permission-denied') return 'fallo';
      try {
        return (await E.nube.leerDiario(idDia(fecha, juego), E.usuario.uid)) ? 'subida' : 'rechazada';
      } catch {
        return 'fallo';
      }
    })
    .then((fin) => {
      delete subiendo[juego];
      const ahora = leerPuzzle(juego);
      if (fin === 'fallo' || ahora.dia?.fecha !== fecha) return;
      delete ahora.dia.pendiente;
      if (fin === 'rechazada') ahora.dia.rechazada = true;
      guardar('puzzles:' + juego, JSON.stringify(ahora));
    });
}

// Top 20 del día con tu puesto (como la liga), o el aviso de entrar con la cuenta. Se rellena al llegar de la nube.
export function rankingDia(juego) {
  const J = JUEGOS[juego];
  const caja = el('div', 'caja-dia');
  caja.append(el('h3', 'categoria', '📅 Ranking de hoy'));
  if (!E.nube || !E.usuario) {
    caja.append(el('p', 'sin-datos', 'Entra con tu cuenta para el ranking del día'));
    return caja;
  }
  const lista = el('ol', 'ranking-dia');
  const tu = el('p', 'tu-dia', 'Cargando…');
  caja.append(lista, tu);
  (async () => {
    // Sin conexión, Firestore deja la escritura en cola sin fallar: no se espera más de 5 s.
    await Promise.race([subiendo[juego], new Promise((listo) => setTimeout(listo, 5000))]);
    const fecha = fechaLocal();
    const uid = E.usuario.uid;
    const filas = await E.nube.topDiario(idDia(fecha, juego), J.menorEsMejor, 20);
    lista.replaceChildren(...(filas.length ? filas.map((f) => {
      const li = el('li', f.uid === uid ? 'propia' : '');
      li.append(nombreConAvatar(f), el('span', 'valor', J.marca(f.valor)));
      return li;
    }) : [el('li', 'sin-datos', 'Aún nadie lo ha terminado hoy. ¡Sé el primero!')]));
    const d = leerPuzzle(juego).dia;
    const mio = d?.fecha === fecha ? d.valor : null;
    let texto;
    if (!leer('nube:apodo')) texto = 'No apareces: ponte un apodo en 📊 › ☁️ Nube.';
    else if (mio == null) texto = d?.fecha === fecha ? 'Hoy no lo terminaste.' : 'Juégalo para aparecer.';
    else {
      texto = `Tu marca: ${J.marca(mio)}`;
      const ahora = leerPuzzle(juego).dia;
      if (!filas.some((f) => f.uid === uid)) {
        if (ahora?.pendiente) texto += ' · ⚠️ Aún no se sube tu marca (¿sin conexión?); se reintenta sola';
        else if (ahora?.rechazada) texto += ' · No entró al ranking';
        else texto += ` · puesto ${await E.nube.puestoDiario(idDia(fecha, juego), mio, J.menorEsMejor)}`;
      }
    }
    tu.textContent = texto;
  })().catch(() => (tu.textContent = 'No se pudo cargar el ranking del día (¿sin conexión?).'));
  return caja;
}

function jugarDia(juego) {
  if (yaJugadoHoy(juego)) return;
  apuntarDia(juego, null);
  JUEGOS[juego].jugar('normal', { semilla: semillaDelDia(fechaLocal(), juego), delDia: true });
}

export const pararPuzzles = () => {
  pararSudoku();
  pararMinas();
};

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
  for (const id of Object.keys(JUEGOS)) if (leerPuzzle(id).dia?.pendiente && !subiendo[id]) subirDia(id);
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
    return modo(texto, x?.mejor != null ? `🏆 ${J.marca(x.mejor)} · ${x.veces} ${x.veces > 1 ? 'veces' : 'vez'}` : 'Sin récord', elegir(nivel));
  });
  const hoy = yaJugadoHoy(juego);
  const dia = modo('📅 Del día', hoy ? `Ya jugado hoy: ${r.dia.valor == null ? 'sin terminar' : J.marca(r.dia.valor)}` : 'El mismo para todos · un intento', () => jugarDia(juego));
  dia.disabled = hoy;
  const lista = el('div', 'modos-puzzle');
  lista.append(...botones, dia);
  $('puzzles-contenido').replaceChildren(lista, rankingDia(juego));
}

function preguntaSeguir(juego, nivel) {
  const J = JUEGOS[juego];
  const g = J.guardada();
  const fila = el('div', 'modos-puzzle');
  fila.append(
    boton('▶ Seguir', 'grande color', J.seguir),
    boton(`Empezar otra (${NOMBRE_NIVEL[nivel]})`, '', () => J.jugar(nivel, { semilla: semillaNueva() })),
    boton('Volver', '', () => abrirModos(juego)),
  );
  fila.firstChild.style.setProperty('--c', 'var(--verde)');
  $('puzzles-contenido').replaceChildren(
    el('h3', '', '¿Seguir la partida?'),
    el('p', 'sin-datos', `Tienes un ${J.nombre} ${NOMBRE_NIVEL[g.nivel]} a medias (${J.resumen(g)}). Si empiezas otra, se pierde.`),
    fila,
  );
}

// Para 📊 Estadísticas: una fila por juego y nivel con récord.
export const filasRecords = () => Object.entries(JUEGOS).flatMap(([id, J]) => {
  const r = leerPuzzle(id);
  return NIVELES.filter(([nv]) => r[nv]?.mejor != null).map(([nv]) => `${J.icono} ${J.nombre} ${NOMBRE_NIVEL[nv]}: ${J.marca(r[nv].mejor)}`);
});
