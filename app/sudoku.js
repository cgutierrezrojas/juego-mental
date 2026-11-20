// 🔢 Sudoku en pantalla (reglas puras en games/sudoku.js). La partida normal a medias se guarda solo en este celular
// (`sudoku-partida` = { nivel, semilla, t, notas, segundos }); la del día no, porque el intento se gasta al empezar.
import { el, leer, guardar, enPausa } from '../games/comun.js';
import { sonar } from '../games/efectos.js';
import * as S from '../games/sudoku.js';
import { semillaNueva } from '../games/semilla.js';
import { mostrar, $, confeti, preguntar } from './ui.js';
import { boton } from './cartas.js';
import { leerFichas, sumarFichas } from './premios.js';
import { finDePartida } from './anuncios.js';
import { ligaAnotar } from './liga.js';
import { anotarPerfil } from './perfil.js';
import { abrirModos, anotarRecord, apuntarDia, leerPuzzle, reloj, NOMBRE_NIVEL } from './puzzles.js';

export const COSTO_PISTA = 20;
const CLAVE = 'sudoku-partida';

// p: { nivel, semilla, delDia, dadas, solucion, t, notas: [81 textos con candidatos], segundos, elegida, conNotas, fin, tic }
let p = null;

const guardarPartida = () => {
  if (p && !p.delDia && !p.fin) guardar(CLAVE, JSON.stringify({ nivel: p.nivel, semilla: p.semilla, t: p.t, notas: p.notas, segundos: p.segundos }));
};

// La partida a medias ({ nivel, semilla, t, notas, segundos }) o null.
export function partidaSudoku() {
  try {
    const g = JSON.parse(leer(CLAVE));
    return g?.t?.length === 81 && S.PISTAS[g.nivel] ? g : null;
  } catch {
    return null;
  }
}

export function pararSudoku() {
  if (!p) return;
  clearInterval(p.tic);
  guardarPartida();
  p = null;
}

// `nivel` null + `seguir`: retoma la guardada. `semilla` para una nueva; `delDia`: sin pista ni guardado.
export function jugarSudoku(nivel, { semilla, delDia = false, seguir = false } = {}) {
  pararSudoku();
  const g = seguir ? partidaSudoku() : null;
  if (g) ({ nivel, semilla } = g);
  const { dadas, solucion } = S.generar(semilla, nivel);
  p = { nivel, semilla, delDia, dadas, solucion, t: g?.t ?? dadas, notas: g?.notas ?? Array(81).fill(''), segundos: g?.segundos ?? 0, elegida: -1, conNotas: false, fin: false };
  if (!delDia) guardarPartida();
  mostrar('puzzle-juego');
  // El reloj corre solo con esta pantalla delante: se para al salir (pararSudoku) y con la app en segundo plano.
  p.tic = setInterval(() => {
    if (!p || p.fin || enPausa()) return;
    p.segundos++;
    $('sudoku-tiempo').textContent = `⏱ ${reloj(p.segundos)}`;
    if (p.segundos % 10 === 0) guardarPartida();
  }, 1000);
  pintar();
}

function pintar() {
  const titulo = p.delDia ? '📅 Sudoku del día' : `🔢 Sudoku ${NOMBRE_NIVEL[p.nivel]}`;
  $('puzzle-marcador').replaceChildren(el('span', '', titulo), el('span', '', `⏱ ${reloj(p.segundos)}`));
  $('puzzle-marcador').lastChild.id = 'sudoku-tiempo';
  $('puzzle-tapete').replaceChildren(rejilla(), ...(p.fin ? [] : teclado()));
  if (p.fin) return;
  $('puzzle-botones').replaceChildren(boton('← Salir', '', salir));
  $('puzzle-botones').firstChild.setAttribute('aria-label', 'Volver a Sudoku');
}

function rejilla() {
  const malas = S.choques(p.t);
  const valor = p.elegida >= 0 ? p.t[p.elegida] : '0';
  const caja = el('div', 'sudoku');
  caja.setAttribute('role', 'grid');
  caja.setAttribute('aria-label', 'Tablero de Sudoku');
  for (let i = 0; i < 81; i++) {
    const v = p.t[i];
    const c = el('button', 'casilla-sudoku');
    const f = Math.floor(i / 9), k = i % 9;
    if (p.dadas[i] !== '0') c.classList.add('dada');
    if (i === p.elegida) c.classList.add('elegida');
    else if (v !== '0' && v === valor) c.classList.add('igual');
    if (malas.has(i)) c.classList.add('choque');
    if (k % 3 === 2 && k < 8) c.classList.add('borde-der');
    if (f % 3 === 2 && f < 8) c.classList.add('borde-abajo');
    if (v !== '0') c.textContent = v;
    else if (p.notas[i]) {
      c.classList.add('con-notas');
      for (let n = 1; n <= 9; n++) c.append(el('span', '', p.notas[i].includes(String(n)) ? String(n) : ''));
    }
    c.setAttribute('aria-label', `Fila ${f + 1}, columna ${k + 1}: ${v !== '0' ? v : p.notas[i] ? `notas ${[...p.notas[i]].join(' ')}` : 'vacía'}${p.dadas[i] !== '0' ? ' (dada)' : ''}${malas.has(i) ? ', choca' : ''}`);
    if (p.fin) c.disabled = true;
    else c.onclick = () => {
      p.elegida = i;
      pintar();
    };
    caja.append(c);
  }
  return caja;
}

function teclado() {
  const cuenta = {};
  for (const v of p.t) cuenta[v] = (cuenta[v] ?? 0) + 1;
  const numeros = el('div', 'teclado-sudoku');
  for (let n = 1; n <= 9; n++) {
    const b = boton(String(n), cuenta[n] >= 9 ? 'completo' : '', () => escribir(String(n)));
    b.setAttribute('aria-label', p.conNotas ? `Nota ${n}` : `Escribir ${n}`);
    numeros.append(b);
  }
  const { fichas } = leerFichas();
  const notas = boton('✏️ Notas', '', () => {
    p.conNotas = !p.conNotas;
    pintar();
  });
  notas.setAttribute('aria-pressed', String(p.conNotas));
  const pistaB = boton(`💡 Pista ${COSTO_PISTA}🪙`, '', usarPista);
  pistaB.disabled = p.delDia || fichas < COSTO_PISTA;
  pistaB.setAttribute('aria-label', p.delDia ? 'Pista: no se puede en el del día' : `Pista por ${COSTO_PISTA} fichas; tienes ${fichas}`);
  const otros = el('div', 'acciones-sudoku');
  otros.append(boton('⌫', '', () => escribir('0')), notas, pistaB);
  otros.firstChild.setAttribute('aria-label', 'Borrar');
  const aviso = el('p', 'sin-datos fichas-sudoku', p.delDia ? '📅 Del día: sin pistas' : `🪙 Tienes ${fichas} fichas`);
  return [numeros, otros, aviso];
}

// '0' borra el número y las notas.
function escribir(n) {
  const i = p.elegida;
  if (p.fin || i < 0 || p.dadas[i] !== '0') return;
  if (p.conNotas && n !== '0') {
    if (p.t[i] !== '0') return;
    const actual = p.notas[i];
    p.notas[i] = actual.includes(n) ? actual.replace(n, '') : [...actual + n].sort().join('');
  } else {
    p.t = p.t.slice(0, i) + n + p.t.slice(i + 1);
    p.notas[i] = '';
    sonar('tic');
  }
  despues();
}

function usarPista() {
  if (p.fin || p.delDia || leerFichas().fichas < COSTO_PISTA) return;
  const i = S.pista(p.t, p.solucion);
  if (i < 0) return;
  sumarFichas(-COSTO_PISTA);
  p.t = p.t.slice(0, i) + p.solucion[i] + p.t.slice(i + 1);
  p.notas[i] = '';
  p.elegida = i;
  despues();
}

function despues() {
  if (S.resuelto(p.t, p.solucion)) return resolver();
  guardarPartida();
  pintar();
}

function resolver() {
  p.fin = true;
  clearInterval(p.tic);
  const s = p.segundos;
  let linea;
  if (p.delDia) {
    apuntarDia('sudoku', s);
    linea = '📅 Tu marca de hoy queda apuntada.';
  } else {
    guardar(CLAVE, '');
    const nuevo = anotarRecord('sudoku', p.nivel, s);
    linea = nuevo ? '🏆 ¡Nuevo récord!' : `🏆 Récord: ${reloj(leerPuzzle('sudoku')[p.nivel].mejor)}`;
  }
  ligaAnotar('partida', 1, 'puzzles');
  anotarPerfil('victoria', 1, 'puzzles');
  finDePartida();
  sonar('record');
  confeti();
  p.elegida = -1;
  pintar();
  $('puzzle-tapete').append(el('p', 'turno-trivia', `🎉 ¡Resuelto en ${reloj(s)}!`), el('p', 'sin-datos', linea));
  const { nivel, delDia } = p;
  $('puzzle-botones').replaceChildren(
    ...(delDia ? [] : [boton(`Otro ${NOMBRE_NIVEL[nivel]}`, 'color', () => jugarSudoku(nivel, { semilla: semillaNueva() }))]),
    boton('Volver', '', () => abrirModos('sudoku')),
  );
  $('puzzle-botones').firstChild.style.setProperty('--c', 'var(--verde)');
}

async function salir() {
  if (p?.delDia) {
    const si = await preguntar({ titulo: '¿Salir del Sudoku del día?', texto: 'El intento de hoy ya se gastó: si sales, queda sin marca.', boton: 'Salir' });
    if (!si) return;
  }
  abrirModos('sudoku'); // mostrar() para la partida y la guarda
}
