// 🏅 Liga semanal: puntos de la semana (se reinician cada lunes), clasificación y medallas del podio.
import { leer, guardar, el } from '../games/comun.js';
import { fechaLocal } from '../games/estadisticas.js';
import { semanaDe, semanaAnterior, diasRestantes, puntosLiga, anotarLiga } from '../games/liga.js';
import { amigosDe } from '../games/amigos.js';
import { CONFIG } from '../firebase-config.js';
import { E } from './estado.js';
import { leerJSON, apuntarLogros } from './datos.js';
import { $, confeti } from './ui.js';

export const semanaActual = () => semanaDe(fechaLocal());
const registro = (semana) => leerJSON('liga:' + semana);
export const misPuntosLiga = () => puntosLiga(registro(semanaActual()));
const MEDALLA = { 1: '🥇', 2: '🥈', 3: '🥉' };

// Suma a la semana en curso: 'partida', 'estrellas' (n), 'entreno', 'victoria' o 'empate'.
export function ligaAnotar(tipo, n = 1) {
  if (tipo === 'estrellas' && n <= 0) return;
  const semana = semanaActual();
  guardar('liga:' + semana, JSON.stringify(anotarLiga(registro(semana), tipo, fechaLocal(), n)));
}

// Fila que se publica (si hay apodo): `liga/{semana}/jugadores/{uid}`.
export const filaLiga = (apodo, actualizado) => ({ apodo, puntos: misPuntosLiga(), actualizado });

// Menú: puntos de la semana y días que quedan (o el aviso de una medalla recién ganada).
export function pintarLigaMenu() {
  const boton = $('btn-liga');
  boton.hidden = !CONFIG;
  const dias = diasRestantes(fechaLocal());
  boton.replaceChildren(
    el('span', '', E.avisoLiga || `🏅 Liga semanal: ${misPuntosLiga()} pts`),
    el('small', '', `termina en ${dias} día${dias > 1 ? 's' : ''}`),
  );
}

// Al empezar una semana nueva, se mira si quedaste en el podio de la anterior (una sola vez por semana).
export async function comprobarPodio() {
  const anterior = semanaAnterior(fechaLocal());
  if (!E.nube || !E.usuario || leer('liga:revisada') === anterior) return;
  try {
    const podio = await E.nube.topLiga(anterior, 3);
    guardar('liga:revisada', anterior);
    const puesto = podio.findIndex((f) => f.uid === E.usuario.uid && f.puntos > 0) + 1;
    if (!puesto) return;
    guardar('liga:medallas', JSON.stringify({ ...leerJSON('liga:medallas'), [anterior]: puesto }));
    apuntarLogros();
    E.avisoLiga = `${MEDALLA[puesto]} ¡Quedaste ${puesto}.º en la liga de la semana pasada!`;
    pintarLigaMenu();
    confeti();
  } catch {
    // sin conexión: se mira la próxima vez
  }
}

// Clasificación de la liga en la pantalla 🏆 Ranking: todos (top 20 y tu puesto) o solo tus amigos.
export async function pintarRankingLiga(soloAmigos) {
  const semana = semanaActual();
  const uid = E.usuario.uid;
  const dias = diasRestantes(fechaLocal());
  const fila = (f) => {
    const li = el('li', f.uid === uid ? 'propia' : '');
    li.append(el('span', '', f.apodo), el('span', 'valor', `${f.puntos} pts`));
    return li;
  };
  let filas;
  if (soloAmigos) {
    const { amigos } = amigosDe(await E.nube.misSolicitudes(uid), uid);
    filas = (await E.nube.filasLiga(semana, [uid, ...amigos.map((a) => a.uid)])).filter(Boolean).sort((a, b) => b.puntos - a.puntos);
  } else {
    filas = await E.nube.topLiga(semana, 20);
  }
  $('ranking-lista').replaceChildren(...(filas.length ? filas.map(fila) : [el('li', 'sin-datos', 'Aún nadie ha sumado puntos esta semana. ¡Sé el primero!')]));
  const mios = misPuntosLiga();
  let tu = `Semana ${semana.slice(-2)} · termina en ${dias} día${dias > 1 ? 's' : ''} · tus puntos: ${mios}`;
  if (!leer('nube:apodo')) tu = 'No apareces en la liga: ponte un apodo en 📊 › ☁️ Nube.';
  else if (!soloAmigos && mios && !filas.some((f) => f.uid === uid)) tu += ` · puesto ${await E.nube.puestoLiga(semana, mios)}`;
  $('ranking-tu').textContent = tu;
}
