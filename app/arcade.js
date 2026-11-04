// 🏎️ Arcade: página de la sección y la pantalla de juego común (bucle de cuadros fijos, controles, dibujo, récords y retos).
// La lógica de cada juego es pura y está en games/serpiente.js, saltar.js, autos.js y ladrillos.js; aquí solo se dibuja.
// Récord en `record:<id>` (sube al ranking como los juegos mentales) y partidas en `arcade:<id>`.
import { el, leer, guardar, esRecord } from '../games/comun.js';
import { sonar } from '../games/efectos.js';
import { semillaNueva } from '../games/semilla.js';
import { PLAZO } from '../games/duelos.js';
import { amigosDe } from '../games/amigos.js';
import * as S from '../games/serpiente.js';
import * as J from '../games/saltar.js';
import * as A from '../games/autos.js';
import * as L from '../games/ladrillos.js';
import { E } from './estado.js';
import { leerJSON } from './datos.js';
import { $, mostrar, confeti } from './ui.js';
import { ligaAnotar } from './liga.js';
import { JUEGOS_ARCADE } from './juegos.js';
import { asegurarDuelista, anotarEnDuelo, volverAlDuelo, abrirDuelo } from './duelos.js';

const CUADRO = 1000 / 60;

// --- Dibujo de cada juego (en coordenadas del mundo; el canvas ya está escalado) ---

const emoji = (ctx, texto, x, y, tam) => {
  ctx.font = `${tam}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, x, y);
};

function dibujarSerpiente(ctx, e, c) {
  const t = S.N;
  const lado = 400 / t;
  for (let x = 0; x < t; x++) for (let y = 0; y < t; y++) {
    ctx.fillStyle = (x + y) % 2 ? c.casilla : c.casilla2;
    ctx.fillRect(x * lado, y * lado, lado, lado);
  }
  if (e.fruta) emoji(ctx, '🍎', (e.fruta[0] + 0.5) * lado, (e.fruta[1] + 0.55) * lado, lado * 0.8);
  if (e.dorada) {
    ctx.globalAlpha = e.dorada.t < 90 && Math.floor(e.dorada.t / 10) % 2 ? 0.35 : 1; // parpadea antes de irse
    emoji(ctx, '⭐', (e.dorada.x + 0.5) * lado, (e.dorada.y + 0.55) * lado, lado * 0.85);
    ctx.globalAlpha = 1;
  }
  e.cuerpo.forEach(([x, y], i) => {
    ctx.fillStyle = i ? c.verde : c.texto;
    ctx.beginPath();
    ctx.roundRect(x * lado + 2, y * lado + 2, lado - 4, lado - 4, i ? 5 : 8);
    ctx.fill();
  });
  // Ojos en la dirección de la cabeza.
  const [hx, hy] = e.cuerpo[0];
  const [dx, dy] = S.DIRS[e.dir];
  ctx.fillStyle = c.fondo;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc((hx + 0.5 + dx * 0.18 + dy * s * 0.2) * lado, (hy + 0.5 + dy * 0.18 + dx * s * 0.2) * lado, lado * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
}

function dibujarSaltar(ctx, e, c) {
  const suelo = J.ALTO - 20;
  ctx.fillStyle = c.casilla2;
  ctx.fillRect(0, 0, J.ANCHO, J.ALTO);
  ctx.fillStyle = c.texto;
  ctx.fillRect(0, suelo, J.ANCHO, 2);
  // Rayitas del suelo que pasan (dan la sensación de velocidad).
  ctx.globalAlpha = 0.35;
  for (let x = -(e.dist % 40); x < J.ANCHO; x += 40) ctx.fillRect(x, suelo + 8, 14, 2);
  ctx.globalAlpha = 1;
  for (const o of e.obstaculos) {
    if (o.tipo === 'pajaro') emoji(ctx, '🐦', o.x + o.w / 2, suelo - o.y - o.h / 2, 24);
    else for (let x = o.x; x < o.x + o.w - 2; x += 20) emoji(ctx, '🌵', x + 10, suelo - o.h / 2 + 2, o.h * 1.15);
  }
  ctx.save();
  ctx.translate(J.JUGADOR.x + J.JUGADOR.w / 2, suelo - e.y - J.JUGADOR.h / 2);
  ctx.scale(-1, 1); // el emoji mira a la izquierda: se da vuelta para que corra hacia la derecha
  emoji(ctx, '🦘', 0, 0, 38);
  ctx.restore();
}

const COLORES_AUTO = ['rojo', 'azul', 'morado', 'amarillo'];
function dibujarAutos(ctx, e, c) {
  ctx.fillStyle = c.asfalto;
  ctx.fillRect(0, 0, A.ANCHO, A.ALTO);
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.6;
  for (const x of [A.PISTA, A.PISTA * 2]) for (let y = (e.dist % 60) - 60; y < A.ALTO; y += 60) ctx.fillRect(x - 2, y, 4, 32);
  ctx.globalAlpha = 1;
  const auto = (x, y, color, propio) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - A.AUTO.w / 2, y, A.AUTO.w, A.AUTO.h, 12);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillRect(x - A.AUTO.w / 2 + 8, y + (propio ? 16 : A.AUTO.h - 30), A.AUTO.w - 16, 14); // parabrisas
  };
  for (const o of e.cosas) {
    if (o.tipo === 'moneda') emoji(ctx, '🪙', A.centro(o.carril), o.y + 15, 28);
    else auto(A.centro(o.carril), o.y, c[COLORES_AUTO[o.color]], false);
  }
  auto(e.x, A.Y_JUGADOR, c.verde, true);
}

function dibujarLadrillos(ctx, e, c) {
  ctx.fillStyle = c.casilla2;
  ctx.fillRect(0, 0, L.ANCHO, L.ALTO);
  const colores = [c.rojo, c.acento, c.amarillo, c.verde, c.azul, c.morado];
  for (const l of e.ladrillos) {
    ctx.fillStyle = colores[l.fila];
    ctx.beginPath();
    ctx.roundRect(l.col * L.LADRILLO.w + 2, L.LADRILLO.arriba + l.fila * L.LADRILLO.h + 2, L.LADRILLO.w - 4, L.LADRILLO.h - 4, 4);
    ctx.fill();
  }
  ctx.fillStyle = c.texto;
  ctx.beginPath();
  ctx.roundRect(e.paleta - L.PALETA.w / 2, L.PALETA.y, L.PALETA.w, L.PALETA.h, 5);
  ctx.fill();
  const b = e.bola ?? { x: e.paleta, y: L.PALETA.y - L.R };
  ctx.beginPath();
  ctx.arc(b.x, b.y, L.R, 0, Math.PI * 2);
  ctx.fill();
  emoji(ctx, '❤️'.repeat(e.vidas), L.ANCHO - 40, 22, 16);
}

// Cada juego: su módulo, el tamaño del mundo, cómo se dibuja, qué entrada recibe y cómo se juega.
const JUEGOS = {
  serpiente: { M: S, ancho: 400, alto: 400, dibujar: dibujarSerpiente, controles: 'deslizar', ayuda: 'Desliza el dedo sobre el tablero (o usa las flechas) para girar. Come 🍎 (+1) y ⭐ (+5, se va pronto); no choques con el borde ni contigo. Cada 5 frutas va más rápido.' },
  saltar: { M: J, ancho: J.ANCHO, alto: J.ALTO, dibujar: dibujarSaltar, controles: 'tocar', ayuda: 'Toca la pantalla (o espacio) para saltar; tócala otra vez en el aire para un doble salto. Esquiva los cactus y los pájaros bajos. Cuanto más lejos, más rápido.' },
  autos: { M: A, ancho: A.ANCHO, alto: A.ALTO, dibujar: dibujarAutos, controles: 'lados', ayuda: 'Toca la mitad izquierda o derecha (o las flechas) para cambiar de pista. Esquiva el tráfico y junta 🪙 (+10). Cuanto más lejos, más rápido.' },
  ladrillos: { M: L, ancho: L.ANCHO, alto: L.ALTO, dibujar: dibujarLadrillos, controles: 'arrastrar', ayuda: 'Mueve la paleta con el dedo (o las flechas) para que la pelota no caiga y rompa los ladrillos (los de arriba valen más). 3 vidas; cada pared nueva va más rápida.' },
};

// --- Página ---

export function abrirArcade() {
  pararArcade();
  mostrar('arcade');
  $('arcade-juegos').replaceChildren(...JUEGOS_ARCADE.map((j) => {
    const b = el('button', 'tarjeta color');
    b.style.setProperty('--c', 'var(--acento)');
    b.append(el('span', 'icono', j.icono), el('span', '', j.nombre));
    b.onclick = () => abrirJuegoArcade(j.id);
    return b;
  }));
  const filas = JUEGOS_ARCADE.filter((j) => leerJSON(`arcade:${j.id}`).partidas).map((j) => `${j.icono} ${j.nombre}: récord ${Number(leer(`record:${j.id}`)) || 0} · ${leerJSON(`arcade:${j.id}`).partidas} partida${leerJSON(`arcade:${j.id}`).partidas > 1 ? "s" : ""}`);
  $('arcade-records').replaceChildren(...(filas.length ? [el('h3', 'categoria', '🏆 Tus récords'), ...filas.map((f) => el('p', 'sin-datos', f))] : []));
}

// --- Partida ---

// p: { id, J, info, e, semilla, duelo (si se juega un reto), entrada, dedo, teclas, pausa, cuadro, acum, ultimo, colores }
let p = null;

export function pararArcade() {
  if (!p) return;
  cancelAnimationFrame(p.cuadro);
  window.removeEventListener('keydown', p.alTeclear);
  window.removeEventListener('keyup', p.alSoltar);
  document.removeEventListener('visibilitychange', p.alOcultar);
  p = null;
}

// Antes de jugar: cómo se juega y ▶ Jugar. `duelo`: { semilla } si es un reto.
export function abrirJuegoArcade(id, duelo = null) {
  pararArcade();
  const info = JUEGOS_ARCADE.find((j) => j.id === id);
  mostrar('arcade-juego');
  const record = Number(leer(`record:${id}`)) || 0;
  $('arcade-marcador').replaceChildren(el('span', '', `${info.icono} ${info.nombre}`), el('span', '', duelo ? '⚔️ Reto' : `🏆 ${record}`));
  $('arcade-tapete').replaceChildren(el('p', 'sin-datos', JUEGOS[id].ayuda), ...(duelo ? [el('p', 'sin-datos', `⚔️ Juegas la misma partida que ${E.enDuelo?.rival ?? 'tu rival'}: gana quien hace más puntos.`)] : []));
  $('arcade-aviso').textContent = '';
  $('arcade-botones').replaceChildren(boton('▶ Jugar', 'color', () => jugar(id, duelo)), boton('Volver', '', () => (duelo ? volverAlDuelo() : abrirArcade())));
}

const boton = (texto, clase, alPulsar) => {
  const b = el('button', clase, texto);
  if (clase.includes('color')) b.style.setProperty('--c', 'var(--acento)');
  b.onclick = alPulsar;
  return b;
};

function colores() {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(`--${n}`).trim();
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  return {
    fondo: v('fondo'), texto: v('texto'), acento: v('acento'), rojo: v('rojo'), azul: v('azul'), verde: v('verde'), amarillo: v('amarillo'), morado: v('morado'),
    casilla: oscuro ? '#141a40' : '#f3e6cf', casilla2: oscuro ? '#10153a' : '#fbf1e0', asfalto: oscuro ? '#1b1f3f' : '#5b5f66',
  };
}

const TECLAS = { ArrowUp: 'arriba', ArrowDown: 'abajo', ArrowLeft: 'izquierda', ArrowRight: 'derecha', w: 'arriba', s: 'abajo', a: 'izquierda', d: 'derecha', ' ': 'arriba' };

function jugar(id, duelo) {
  pararArcade();
  const G = JUEGOS[id];
  const semilla = duelo?.semilla ?? semillaNueva();
  p = { id, G, info: JUEGOS_ARCADE.find((j) => j.id === id), e: G.M.nuevo(semilla), semilla, duelo, entrada: null, dedo: null, teclas: new Set(), pausa: false, acum: 0, ultimo: 0, colores: colores() };
  const lienzo = el('canvas', `lienzo-arcade lienzo-${id}`);
  lienzo.setAttribute('role', 'img');
  lienzo.setAttribute('aria-label', `${p.info.nombre}: ${G.ayuda}`);
  lienzo.style.aspectRatio = `${G.ancho} / ${G.alto}`;
  $('arcade-tapete').replaceChildren(lienzo);
  $('arcade-aviso').textContent = '';
  $('arcade-botones').replaceChildren(boton('⏸ Pausa', '', alternarPausa), boton('Salir', '', () => (duelo ? terminar() : abrirArcade())));
  controles(lienzo);
  ajustar(lienzo);
  p.lienzo = lienzo;
  marcador();
  p.cuadro = requestAnimationFrame(bucle);
}

// Tamaño real del canvas (nítido en pantallas densas) y escala al mundo del juego.
function ajustar(lienzo) {
  const ancho = lienzo.clientWidth || 360;
  const dpr = window.devicePixelRatio || 1;
  lienzo.width = Math.round(ancho * dpr);
  lienzo.height = Math.round((ancho * p.G.alto) / p.G.ancho * dpr);
  p.ctx = lienzo.getContext('2d');
  p.ctx.setTransform((ancho * dpr) / p.G.ancho, 0, 0, (ancho * dpr) / p.G.ancho, 0, 0);
}

function controles(lienzo) {
  const mundo = (ev) => {
    const r = lienzo.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * p.G.ancho, y: ((ev.clientY - r.top) / r.height) * p.G.alto };
  };
  let inicio = null;
  lienzo.onpointerdown = (ev) => {
    if (!p || p.pausa) return;
    ev.preventDefault();
    const m = mundo(ev);
    if (p.G.controles === 'tocar') p.entrada = 'arriba';
    if (p.G.controles === 'lados') p.entrada = m.x < p.G.ancho / 2 ? 'izquierda' : 'derecha';
    if (p.G.controles === 'arrastrar') p.dedo = m.x;
    inicio = m;
  };
  lienzo.onpointermove = (ev) => {
    if (!p || !inicio) return;
    const m = mundo(ev);
    if (p.G.controles === 'arrastrar') p.dedo = m.x;
    if (p.G.controles === 'deslizar') {
      const [dx, dy] = [m.x - inicio.x, m.y - inicio.y];
      if (Math.hypot(dx, dy) < 18) return;
      p.entrada = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'derecha' : 'izquierda') : dy > 0 ? 'abajo' : 'arriba';
      inicio = m; // se puede seguir deslizando para girar otra vez
    }
  };
  lienzo.onpointerup = lienzo.onpointercancel = () => (inicio = null);
  p.alTeclear = (ev) => {
    const t = TECLAS[ev.key.length === 1 ? ev.key.toLowerCase() : ev.key];
    if (!t || !p || ev.target.closest?.('input, textarea')) return;
    ev.preventDefault();
    if (ev.repeat) return;
    if (p.G.controles === 'arrastrar') p.teclas.add(t);
    else if (p.G.controles !== 'tocar' || t === 'arriba') p.entrada = t;
  };
  p.alSoltar = (ev) => p?.teclas.delete(TECLAS[ev.key.length === 1 ? ev.key.toLowerCase() : ev.key]);
  p.alOcultar = () => document.hidden && p && !p.pausa && !p.e.fin && alternarPausa();
  window.addEventListener('keydown', p.alTeclear);
  window.addEventListener('keyup', p.alSoltar);
  document.addEventListener('visibilitychange', p.alOcultar);
}

// La entrada de este cuadro para el juego.
function entrada() {
  if (p.G.controles === 'arrastrar') {
    if (p.teclas.size) {
      p.dedo = null;
      return p.teclas.has('izquierda') ? 'izquierda' : p.teclas.has('derecha') ? 'derecha' : null;
    }
    return p.dedo === null ? null : { x: p.dedo };
  }
  const t = p.entrada;
  p.entrada = null;
  return p.G.controles === 'tocar' ? t === 'arriba' : t;
}

function bucle(ahora) {
  if (!p) return;
  if (!p.ultimo) p.ultimo = ahora;
  p.acum = Math.min(p.acum + (ahora - p.ultimo), CUADRO * 6); // tras un tirón no se intenta recuperar todo
  p.ultimo = ahora;
  const antes = p.e.puntos;
  while (!p.pausa && p.acum >= CUADRO && !p.e.fin) {
    p.G.M.paso(p.e, entrada());
    p.acum -= CUADRO;
  }
  if (p.e.puntos !== antes) marcador();
  p.G.dibujar(p.ctx, p.e, p.colores);
  if (p.pausa) cartel('⏸ Pausa');
  if (p.e.fin) return terminar();
  p.cuadro = requestAnimationFrame(bucle);
}

function cartel(texto) {
  const { ctx, G } = p;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, G.ancho, G.alto);
  ctx.fillStyle = '#ffffff';
  emoji(ctx, texto, G.ancho / 2, G.alto / 2, 30);
}

function marcador() {
  const record = Number(leer(`record:${p.id}`)) || 0;
  $('arcade-marcador').replaceChildren(el('span', '', `${p.info.icono} ${p.e.puntos} pts`), el('span', '', p.duelo ? '⚔️ Reto' : `🏆 ${Math.max(record, p.e.puntos)}`));
}

function alternarPausa() {
  if (!p || p.e.fin) return;
  p.pausa = !p.pausa;
  p.ultimo = 0;
  p.acum = 0;
  $('arcade-botones').firstChild.textContent = p.pausa ? '▶ Seguir' : '⏸ Pausa';
}

function terminar() {
  const { id, e, info, duelo, semilla } = p;
  cancelAnimationFrame(p.cuadro);
  p.G.dibujar(p.ctx, e, p.colores);
  cartel(e.fin ? '💥' : '🏁');
  const puntos = e.puntos;
  const record = Number(leer(`record:${id}`)) || 0;
  const nuevo = !duelo && esRecord(puntos, record);
  if (nuevo) guardar(`record:${id}`, String(puntos));
  const x = leerJSON(`arcade:${id}`);
  guardar(`arcade:${id}`, JSON.stringify({ partidas: (x.partidas ?? 0) + 1 }));
  ligaAnotar('partida');
  if (duelo) anotarEnDuelo(puntos);
  sonar(nuevo ? 'record' : 'fallo');
  if (nuevo) confeti();
  pararArcade();
  $('arcade-aviso').textContent = duelo ? `⚔️ ${puntos} puntos anotados en el reto.` : nuevo ? `🏆 ¡Nuevo récord: ${puntos}!` : `${puntos} puntos · récord ${record}`;
  if (duelo) return $('arcade-botones').replaceChildren(boton('⚔️ Volver al duelo', 'color', volverAlDuelo));
  const amigos = el('div', 'opciones-duelo');
  $('arcade-botones').replaceChildren(boton('🔄 Otra vez', 'color', () => jugar(id, null)), boton('⚔️ Retar a un amigo', '', () => elegirAmigo(id, semilla, puntos, amigos)), boton('Volver', '', abrirArcade));
  $('arcade-tapete').append(amigos);
}

// --- Retos: un duelo de un solo juego con la semilla de esta partida ---

async function elegirAmigo(id, semilla, puntos, caja) {
  if (!(await asegurarDuelista())) return;
  caja.replaceChildren(el('span', 'sin-datos', 'Cargando tus amigos…'));
  try {
    const { amigos } = amigosDe(await E.nube.misSolicitudes(E.usuario.uid), E.usuario.uid);
    if (!amigos.length) return caja.replaceChildren(el('span', 'sin-datos', 'Aún no tienes amigos: agrégalos en 👥 Amigos.'));
    caja.replaceChildren(el('p', 'sin-datos', `¿A quién retas a superar tus ${puntos} puntos?`), ...amigos.map((a) => boton(`👥 ${a.apodo}`, '', () => retar(id, semilla, puntos, a, caja))));
  } catch {
    caja.replaceChildren(el('span', 'sin-datos', 'No se pudieron cargar tus amigos (¿sin conexión?).'));
  }
}

async function retar(id, semilla, puntos, amigo, caja) {
  caja.replaceChildren(el('span', 'sin-datos', 'Creando el reto…'));
  try {
    const ahora = Date.now();
    const duelo = await E.nube.crearDuelo({
      anfitrion: E.usuario.uid, jugadores: [E.usuario.uid], nombres: { [E.usuario.uid]: leer('nube:apodo') }, invitado: amigo.uid, abierto: true, azar: false,
      juegos: [id], dificultad: 'normal', victoria: 'puntos', creado: ahora, caduca: ahora + PLAZO, resultados: {}, semilla,
    });
    E.enDuelo = { id: duelo, juego: id };
    anotarEnDuelo(puntos);
    E.enDuelo = null;
    abrirDuelo(duelo, `📨 Reto enviado a ${amigo.apodo}: jugará la misma partida y tiene 48 horas.`);
  } catch {
    caja.replaceChildren(el('span', 'sin-datos', 'No se pudo crear el reto (¿sin conexión?).'));
  }
}
