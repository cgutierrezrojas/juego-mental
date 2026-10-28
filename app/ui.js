// Piezas de interfaz comunes: pantallas, preguntas, avisos de ayuda, confeti, tema y compartir.
import { pararMesa } from './mesa.js';
import { pintarInicio } from './inicio.js';
import { pintarLigaMenu } from './liga.js';
import { leer, el, guardar } from '../games/comun.js';
import { activo } from '../games/efectos.js';
import { pintarEntreno, pintarProgreso, pintarSugerencia } from './menu.js';
import { pintarAvisoDuelos } from './duelos.js';
import { dejarDeEscuchar, ponerEstado } from './amigos.js';
import { pararChat } from './chat.js';
import { revisarInvitacionPendiente } from './vivo.js';
import { subir } from './cuenta.js';
import { E } from './estado.js';

export const $ = (id) => document.getElementById(id);

// Ventana propia en lugar de confirm()/prompt(), que muestran la dirección de la web ("… dice").
// Con `campo` (texto inicial) pide un texto y devuelve lo escrito; sin él, devuelve true. Si se cancela, null.
export function preguntar({ titulo, texto, boton, campo = null }) {
  const dialogo = $('dialogo-pregunta');
  const entrada = $('pregunta-campo');
  if (dialogo.open) return Promise.resolve(null); // ya hay otra pregunta abierta
  $('pregunta-titulo').textContent = titulo;
  $('pregunta-texto').textContent = texto;
  $('pregunta-si').textContent = boton;
  entrada.hidden = campo === null;
  entrada.value = campo ?? '';
  dialogo.returnValue = '';
  dialogo.showModal();
  if (campo !== null) entrada.select();
  return new Promise((responder) => {
    dialogo.addEventListener('close', () => {
      if (dialogo.returnValue !== 'si') responder(null);
      else responder(campo === null ? true : entrada.value);
    }, { once: true });
  });
}

// Ayuda de la primera vez: un aviso encima de lo que explica (resaltado), hasta que se cierra con ✕.
export const AYUDAS = {
  inicio: { objetivo: '#secciones', texto: "👋 ¡Bienvenido a Pa'l Rato! Elige una sección para jugar. Abajo tienes tus duelos, amigos, el ranking y tu perfil." },
  menu: { objetivo: '#entreno', texto: '👋 ¡Bienvenido! Empieza por ☀️ Tu día: 3 juegos para entrenar cada día y mantener tu racha 🔥. Toca cualquier juego para ver sus modos.' },
  modos: { objetivo: '#previa-modos', texto: 'Elige un modo y una dificultad. 🪜 Niveles es un camino sin fin con estrellas y 3 retos nuevos cada día.' },
  niveles: { objetivo: '.camino', texto: '🧑 marca tu nivel. Toca un nivel para ver su objetivo, o juega el siguiente con el botón grande.' },
  final: { objetivo: '#final-barra', texto: 'La barra muestra cuánto te faltó: las ⭐ en Niveles, y tu media 📊 y tu récord 🏆 en los demás modos.' },
};
export const AYUDA_DE_PANTALLA = { inicio: 'inicio', menu: 'menu', final: 'final' }; // la previa elige la suya al pintarse

// Quita el aviso que hubiera y, si `sitio` no se ha visto aún y lo que explica está a la vista, lo muestra.
export function mostrarAyuda(sitio) {
  document.querySelector('.ayuda')?.remove();
  document.querySelector('.resaltado')?.classList.remove('resaltado');
  if (!sitio || leer('ayuda:' + sitio)) return;
  const objetivo = document.querySelector(AYUDAS[sitio].objetivo);
  if (!objetivo || objetivo.hidden) return;
  const aviso = el('div', 'ayuda');
  aviso.setAttribute('role', 'note');
  const cerrar = el('button', '', '✕');
  cerrar.setAttribute('aria-label', 'Cerrar la ayuda');
  cerrar.onclick = () => {
    guardar('ayuda:' + sitio, '1');
    mostrarAyuda(null);
  };
  aviso.append(el('p', '', AYUDAS[sitio].texto), cerrar);
  objetivo.before(aviso);
  objetivo.classList.add('resaltado');
}

export function mostrar(id) {
  for (const s of document.querySelectorAll('main > section')) s.hidden = s.id !== id;
  $('btn-salir').hidden = id !== 'juego';
  $('btn-ayuda').hidden = id === 'juego';
  if (id !== 'final') {
    E.temporizadores.forEach(clearTimeout);
    E.temporizadores = [];
  }
  // Barra inferior: oculta en la partida; resalta el botón de la pantalla actual.
  $('navegacion').hidden = id === 'juego';
  const pestana = {
    inicio: 'nav-inicio', menu: 'nav-inicio', mesa: 'nav-inicio', 'mesa-modo': 'nav-inicio', 'mesa-tablero': 'nav-inicio', duelos: 'btn-duelos', 'nuevo-duelo': 'btn-duelos', duelo: 'btn-duelos', vivo: 'btn-duelos',
    amigos: 'btn-amigos', chat: 'btn-amigos', ranking: 'btn-ranking', estadisticas: 'btn-estadisticas',
  }[id];
  for (const b of document.querySelectorAll('#navegacion button')) b.setAttribute('aria-current', b.id === pestana ? 'page' : 'false');
  if (id === 'inicio') {
    pintarInicio();
    pintarSugerencia();
    pintarAvisoDuelos();
  }
  if (id === 'menu') {
    pintarEntreno();
    pintarProgreso();
    pintarLigaMenu();
  }
  if (id !== 'previa') mostrarAyuda(AYUDA_DE_PANTALLA[id]);
  if (id !== 'amigos') dejarDeEscuchar();
  if (id !== 'chat') pararChat();
  if (id !== 'mesa-tablero') pararMesa();
  if (id !== 'juego') revisarInvitacionPendiente();
  if (id !== 'juego' && E.estadoApp !== 'conectado') ponerEstado('conectado');
  if (id === 'inicio' || id === 'menu' || id === 'final') subir().catch(() => {}); // sin conexión: se reintenta la próxima vez
}

// Lluvia de confeti con los colores del tema. Cada pieza se borra al acabar de caer.
export function confeti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // el sistema pide menos movimiento
  const colores = ['--rojo', '--azul', '--verde', '--amarillo', '--acento'];
  for (let i = 0; i < 40; i++) {
    const pieza = el('div', 'confeti');
    pieza.style.left = Math.random() * 100 + 'vw';
    pieza.style.background = `var(${colores[i % colores.length]})`;
    pieza.style.animationDelay = Math.random() * 0.5 + 's';
    pieza.style.animationDuration = 1.2 + Math.random() * 0.8 + 's';
    pieza.onanimationend = () => pieza.remove();
    document.body.append(pieza);
  }
}

// Tema: el <script> del <head> ya puso data-tema; aquí se cambia con el botón ☀️/🌙.
export function pintarTema() {
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  $('btn-tema').textContent = oscuro ? '☀️' : '🌙';
  document.querySelector('meta[name="theme-color"]').content = oscuro ? '#0b0f2a' : '#fff7ec';
}

// Ajustes 🔊 y 📳 (se guardan en efectos.js).
export function pintarAjustes() {
  $('btn-sonido').textContent = activo('sonido') ? '🔊' : '🔇';
  $('btn-sonido').setAttribute('aria-pressed', activo('sonido'));
  $('btn-vibracion').classList.toggle('apagado', !activo('vibracion'));
  $('btn-vibracion').setAttribute('aria-pressed', activo('vibracion'));
}

export async function compartirTexto(texto, alCopiar) {
  if (navigator.share) {
    try {
      await navigator.share({ text: texto });
    } catch {
      // se canceló
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(texto);
    alCopiar?.();
  } catch {
    // sin portapapeles
  }
}
