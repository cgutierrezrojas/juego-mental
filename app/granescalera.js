// 💰 La gran escalera (en ❓ Trivia): 15 preguntas, premios que suben, seguros, plantarse y 4 ayudas.
// La lógica es pura (games/granescalera.js); aquí se dibuja, se cuenta el tiempo y se termina.
// Usa solo el banco propio de preguntas (`BASE`), para que un reto dé las mismas a los dos.
import { el, leer, guardar, esRecord } from '../games/comun.js';
import { sonar } from '../games/efectos.js';
import { semillaNueva } from '../games/semilla.js';
import { PREGUNTAS, BASE } from '../games/preguntas.js';
import * as G from '../games/granescalera.js';
import { E } from './estado.js';
import { leerJSON } from './datos.js';
import { $, mostrar, confeti } from './ui.js';
import { ligaAnotar } from './liga.js';
import { anotarEnDuelo, volverAlDuelo } from './duelos.js';
import { elegirAmigo } from './retos.js';
import { abrirTrivia } from './trivia.js';

const AYUDA = 'Responde 15 preguntas, cada vez más difíciles, y sube por los premios hasta 1.000.000. Tienes 30 segundos por pregunta. Si fallas, te llevas el último seguro (1.000 o 32.000); antes de responder puedes plantarte y llevarte lo ganado. Tienes 4 ayudas de un solo uso.';
const AYUDAS = [['mitad', '50:50'], ['publico', '👥 Público'], ['cambiar', '🔄 Cambiar'], ['tiempo', '⏱ +30 s']];
const LETRAS = ['A', 'B', 'C', 'D'];
const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // 1.000, 32.000

const boton = (texto, clase, alPulsar) => {
  const b = el('button', clase, texto);
  if (clase.includes('color')) b.style.setProperty('--c', 'var(--azul)');
  b.onclick = alPulsar;
  return b;
};

// p: { e, semilla, duelo, restantes, reloj, espera, bloqueado }
let p = null;

export function pararGranEscalera() {
  if (!p) return;
  clearInterval(p.reloj);
  clearTimeout(p.espera);
  p = null;
}

// Antes de jugar. `duelo`: { semilla } si es un reto.
export function abrirGranEscalera(duelo = null) {
  pararGranEscalera();
  mostrar('granescalera');
  const record = Number(leer('record:granescalera')) || 0;
  $('granescalera-marcador').replaceChildren(el('span', '', '💰 La gran escalera'), el('span', '', duelo ? '⚔️ Reto' : `🏆 ${miles(record)}`));
  $('granescalera-contenido').replaceChildren(
    el('p', 'sin-datos', AYUDA),
    ...(duelo ? [el('p', 'sin-datos', `⚔️ Juegas las mismas preguntas que ${E.enDuelo?.rival ?? 'tu rival'}: gana quien se lleva más.`)] : []),
  );
  $('granescalera-aviso').textContent = '';
  $('granescalera-botones').replaceChildren(
    boton('▶ Jugar', 'color', () => jugar(duelo?.semilla ?? semillaNueva(), duelo)),
    boton('Volver', '', () => (duelo ? volverAlDuelo() : abrirTrivia())),
  );
}

function jugar(semilla, duelo) {
  pararGranEscalera();
  p = { e: G.nueva(semilla, PREGUNTAS.slice(0, BASE)), semilla, duelo, restantes: G.SEGUNDOS, bloqueado: false };
  $('granescalera-aviso').textContent = '';
  pintar();
  p.reloj = setInterval(() => {
    if (p.bloqueado) return;
    p.restantes--;
    marcador();
    if (p.restantes <= 5 && p.restantes > 0) sonar('tic');
    if (p.restantes <= 0) {
      G.sinTiempo(p.e);
      revelar(null);
    }
  }, 1000);
}

function marcador() {
  const { e } = p;
  $('granescalera-marcador').replaceChildren(
    el('span', '', `💰 ${e.nivel + 1}/15 · por ${miles(G.PREMIOS[e.nivel])}`),
    el('span', p.restantes <= 10 ? 'urgente' : '', `⏱ ${Math.max(0, p.restantes)}`),
  );
}

function pintar() {
  const { e } = p;
  const q = G.actual(e);
  marcador();
  // La escalera: 15 escalones (los seguros marcados) con el actual resaltado.
  const escalones = el('ol', 'escalones');
  G.PREMIOS.forEach((premio, i) => {
    const li = el('li', [i === e.nivel ? 'actual' : '', i < e.nivel ? 'pasado' : '', G.SEGUROS.includes(i) ? 'seguro' : ''].join(' ').trim(), miles(premio));
    li.title = `Pregunta ${i + 1}`;
    escalones.append(li);
  });
  const opciones = el('div', 'opciones-escalera');
  q.opciones.forEach((o, i) => {
    const b = boton(`${LETRAS[i]}. ${o}`, 'opcion-escalera', () => elegir(i));
    if (e.quitadas.includes(i)) {
      b.disabled = true;
      b.classList.add('quitada');
    }
    opciones.append(b);
  });
  const ayudas = el('div', 'opciones-duelo');
  for (const [tipo, texto] of AYUDAS) {
    const b = boton(texto, '', () => usarAyuda(tipo));
    b.disabled = !e.ayudas[tipo];
    ayudas.append(b);
  }
  const partes = [escalones, el('p', 'pregunta-escalera', q.p), opciones, ayudas];
  if (e.votos) {
    const barras = el('div', 'publico-escalera');
    e.votos.forEach((v, i) => {
      const fila = el('div', 'barra-palabra');
      const b = el('span', '', `${v}%`);
      b.style.width = `${Math.max(12, v)}%`;
      fila.append(el('span', '', LETRAS[i]), b);
      barras.append(fila);
    });
    partes.push(barras);
  }
  $('granescalera-contenido').replaceChildren(...partes);
  const llevas = e.nivel ? G.PREMIOS[e.nivel - 1] : 0;
  $('granescalera-botones').replaceChildren(boton(`🏳️ Plantarse con ${miles(llevas)}`, '', plantarse));
}

function usarAyuda(tipo) {
  if (p.bloqueado) return;
  G.ayuda(p.e, tipo);
  if (tipo === 'tiempo') p.restantes += G.MAS_TIEMPO;
  if (tipo === 'cambiar') p.restantes = G.SEGUNDOS;
  sonar('tic');
  pintar();
}

function elegir(i) {
  if (p.bloqueado) return;
  const nivel = p.e.nivel;
  G.responder(p.e, i);
  const acerto = p.e.nivel > nivel || p.e.resultado === 'gano';
  if (acerto && !p.e.fin) {
    p.bloqueado = true;
    marcarOpciones(i, true);
    sonar('acierto');
    $('granescalera-aviso').textContent = `✅ ¡Correcto! Llevas ${miles(p.e.ganado)}.`;
    p.espera = setTimeout(() => {
      p.bloqueado = false;
      p.restantes = G.SEGUNDOS;
      $('granescalera-aviso').textContent = '';
      pintar();
    }, 1400);
    return;
  }
  revelar(i);
}

// Pinta la elegida (o ninguna, si se acabó el tiempo) y la correcta.
function marcarOpciones(elegida, acerto) {
  const botones = $('granescalera-contenido').querySelectorAll('.opcion-escalera');
  const correcta = p.e.resultado === 'fallo' || p.e.resultado === 'tiempo' ? G.actual(p.e).correcta : elegida;
  botones.forEach((b, i) => {
    b.disabled = true;
    if (i === correcta) b.classList.add('ok');
    else if (i === elegida && !acerto) b.classList.add('mal');
  });
}

function revelar(elegida) {
  p.bloqueado = true;
  clearInterval(p.reloj);
  marcarOpciones(elegida, p.e.resultado === 'gano');
  p.espera = setTimeout(terminar, 1600);
}

function plantarse() {
  if (p.bloqueado) return;
  G.plantarse(p.e);
  terminar();
}

function terminar() {
  const { e, duelo, semilla } = p;
  const puntos = e.ganado;
  pararGranEscalera();
  const record = Number(leer('record:granescalera')) || 0;
  const nuevo = !duelo && puntos > 0 && esRecord(puntos, record);
  if (nuevo) guardar('record:granescalera', String(puntos));
  const x = leerJSON('trivia:granescalera');
  guardar('trivia:granescalera', JSON.stringify({ partidas: (x.partidas ?? 0) + 1 }));
  ligaAnotar('partida');
  if (duelo) anotarEnDuelo(puntos);
  sonar(nuevo || e.resultado === 'gano' ? 'record' : 'fallo');
  if (nuevo || e.resultado === 'gano') confeti();
  const porque = { gano: '🏆 ¡Llegaste a la cima!', fallo: '❌ Respuesta incorrecta.', tiempo: '⏱ Se acabó el tiempo.', plantado: '🏳️ Te plantaste.' }[e.resultado];
  $('granescalera-marcador').replaceChildren(el('span', '', `💰 ${miles(puntos)}`), el('span', '', duelo ? '⚔️ Reto' : `🏆 ${miles(Math.max(record, puntos))}`));
  $('granescalera-aviso').textContent = `${porque} Te llevas ${miles(puntos)}.${duelo ? ' Anotado en el reto.' : nuevo ? ' ¡Nuevo récord!' : ''}`;
  if (duelo) return $('granescalera-botones').replaceChildren(boton('⚔️ Volver al duelo', 'color', volverAlDuelo));
  const amigos = el('div', 'opciones-duelo');
  $('granescalera-contenido').append(amigos);
  $('granescalera-botones').replaceChildren(
    boton('🔄 Otra vez', 'color', () => jugar(semillaNueva(), null)),
    boton('⚔️ Retar a un amigo', '', () => elegirAmigo(amigos, { id: 'granescalera', semilla, puntos })),
    boton('Volver', '', abrirTrivia),
  );
}
