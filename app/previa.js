// Pantalla de un juego: modos, dificultad, camino de niveles y tarjeta de nivel.
import { siguienteNivel, mundoDe, configNivel, ICONO_RETO, NOMBRE_RETO, NIVELES_POR_MUNDO, varianteDe, NOMBRE_VARIANTE, DESCRIPCION_VARIANTE, nivelLibre, rachaDiaria } from '../games/niveles.js';
import { claveRecord, etiqueta, MODOS, DIFICULTADES } from '../games/modos.js';
import { fechaLocal, racha } from '../games/estadisticas.js';
import { el, guardar } from '../games/comun.js';
import { leerEleccion, leerEstrellas, leerRecord, conUnidad, diariosConHoy, textoEstrellas, estrellasDelJuego, nivelJugado, diariosHechos } from './datos.js';
import { mostrar, $, mostrarAyuda } from './ui.js';
import { E } from './estado.js';
import { pintarHistorial } from './estadisticas.js';
import { ICONO_MODO, CARA } from './juegos.js';

export function abrirPrevia(j) {
  E.actual = j;
  E.eleccion = leerEleccion(j);
  E.enDuelo = null;
  E.enVivo = null;
  E.nivelElegido = siguienteNivel(leerEstrellas(j.id));
  E.mundoVisto = mundoDe(E.nivelElegido);
  E.vistaHoy = false;
  pintarPrevia(j);
  mostrar('previa');
  document.querySelector('.camino .actual')?.scrollIntoView({ block: 'center' }); // el camino empieza en tu nivel
}

// Nombre, instrucciones, botones de modo/dificultad y, según el modo, récord y gráfica o la cuadrícula de niveles.
export function pintarPrevia(j) {
  $('previa-cabecera').style.setProperty('--c', `var(--${j.color})`);
  $('previa-icono').textContent = j.icono;
  $('previa-nombre').textContent = j.nombre;
  $('previa-instrucciones').textContent = j.instrucciones;
  pintarModos(j);
  const enNiveles = E.eleccion.modo === 'niveles';
  $('btn-jugar').textContent = '▶ Jugar';
  $('previa-record-linea').hidden = enNiveles;
  $('previa-historial').hidden = enNiveles;
  $('previa-niveles').hidden = !enNiveles;
  if (enNiveles) return pintarNiveles(j);
  mostrarAyuda('modos');
  const record = leerRecord(claveRecord(j.id, E.eleccion.modo, E.eleccion.dificultad));
  $('previa-record').textContent = record ? conUnidad(j, record) : '—';
  pintarHistorial(j);
}

// Modo Niveles: total, 📅 retos de hoy, cartel del mundo (◀ ▶) y camino de sus 10 niveles (de abajo arriba).
// Tocar un nivel o un reto abre su tarjeta; el botón grande juega siempre el siguiente nivel.
export function pintarNiveles(j) {
  const estrellas = leerEstrellas(j.id);
  const hoy = fechaLocal();
  const diarios = diariosConHoy(j.id);
  const delDia = diarios[hoy];
  const siguiente = siguienteNivel(estrellas);
  const grupo = (titulo, clase) => {
    const caja = el('div', clase);
    caja.setAttribute('role', 'group');
    caja.setAttribute('aria-label', titulo);
    return caja;
  };

  const retos = grupo('Retos de hoy', 'retos-hoy');
  delDia.niveles.forEach((n, i) => {
    const e = delDia.estrellas[i] || 0;
    const reto = configNivel(j.id, n).reto;
    const b = el('button', e > 0 ? 'hecho' : '');
    b.append(el('span', '', `${n} ${ICONO_RETO[reto]}`), el('small', '', textoEstrellas(e)));
    b.setAttribute('aria-label', `Reto de hoy ${i + 1}, nivel ${n}, ${NOMBRE_RETO[reto]}, ${e} de 3 estrellas`);
    b.onclick = () => {
      E.vistaHoy = true;
      E.diarioElegido = i;
      abrirTarjeta(j);
    };
    retos.append(b);
  });

  // Cartel: ◀ nombre y variante (explicada) ▶; ▶ llega hasta el mundo más alto desbloqueado.
  const mundo = E.mundoVisto;
  const primero = (mundo - 1) * NIVELES_POR_MUNDO + 1;
  const hechos = estrellas.slice(primero - 1, primero - 1 + NIVELES_POR_MUNDO).filter((e) => e > 0).length;
  const variante = varianteDe(j.id, mundo);
  const cartel = grupo('Mundo', 'cartel');
  if (siguiente === primero && siguiente > 1) cartel.classList.add('nuevo'); // recién abierto: entra con animación
  const flecha = (texto, clase, etiqueta, destino, apagada) => {
    const b = el('button', clase, texto);
    b.setAttribute('aria-label', etiqueta);
    b.disabled = apagada;
    b.onclick = () => {
      E.mundoVisto = destino;
      pintarNiveles(j);
      // El foco se queda en la flecha; si se ha apagado, pasa a la otra.
      const otra = clase === 'anterior' ? 'siguiente' : 'anterior';
      const misma = $('previa-niveles').querySelector(`.cartel .${clase}`);
      (misma.disabled ? $('previa-niveles').querySelector(`.cartel .${otra}`) : misma).focus();
    };
    return b;
  };
  const nombre = el('div', 'nombre-mundo');
  nombre.append(
    el('strong', '', `Mundo ${mundo}${variante ? ` · ${NOMBRE_VARIANTE[variante]}` : ''}`),
    el('small', '', `${variante ? `${DESCRIPCION_VARIANTE[variante]} · ` : ''}${hechos}/${NIVELES_POR_MUNDO}`),
  );
  cartel.append(
    flecha('◀', 'anterior', 'Mundo anterior', mundo - 1, mundo === 1),
    nombre,
    flecha('▶', 'siguiente', 'Mundo siguiente', mundo + 1, mundo >= mundoDe(siguiente)),
  );

  const camino = grupo(`Niveles del mundo ${mundo}`, 'camino');
  for (let n = primero; n < primero + NIVELES_POR_MUNDO; n++) {
    const libre = nivelLibre(estrellas, n);
    const e = estrellas[n - 1] || 0;
    const reto = configNivel(j.id, n).reto; // el reto real en este juego (los que no cambian nada salen como Normal)
    const clases = [n === siguiente ? 'actual' : e > 0 ? 'hecho' : '', reto === 'jefe' ? 'jefe' : ''].join(' ').trim();
    const b = el('button', clases);
    b.append(el('span', '', libre ? `${n}` : `🔒${n}`), el('small', '', libre ? `${ICONO_RETO[reto]}${textoEstrellas(e)}` : ''));
    if (n === siguiente) {
      b.setAttribute('aria-current', 'step'); // tu siguiente nivel (no solo por el color)
      const yo = el('span', 'yo', '🧑');
      yo.setAttribute('aria-hidden', 'true');
      b.append(yo);
    }
    b.disabled = !libre;
    b.setAttribute('aria-label', libre ? `Nivel ${n}, ${NOMBRE_RETO[reto]}, ${e} de 3 estrellas` : `Nivel ${n}, bloqueado`);
    b.onclick = () => {
      E.vistaHoy = false;
      E.nivelElegido = n;
      abrirTarjeta(j);
    };
    camino.append(b);
  }

  const racha = rachaDiaria(diarios, hoy);
  const total = el('p', 'total-estrellas', `⭐ ${estrellasDelJuego(j.id)}${racha ? ` · 📅🔥 ${racha}` : ''}`);
  $('previa-niveles').replaceChildren(total, el('h3', 'categoria', '📅 Retos de hoy'), retos, cartel, camino);
  $('btn-jugar').textContent = `▶ Jugar nivel ${siguiente}`;
  mostrarAyuda('niveles'); // también al cambiar de mundo, que redibuja el camino
}

// Tarjeta (diálogo) del nivel o reto elegido: objetivo, tus estrellas y botón para jugarlo.
export function abrirTarjeta(j) {
  const n = nivelJugado();
  const cfg = configNivel(j.id, n);
  const deVariante = cfg.variante ? ` · ${NOMBRE_VARIANTE[cfg.variante]}` : '';
  let titulo;
  let e;
  let extra = '';
  let boton;
  if (E.vistaHoy) {
    const diarios = diariosConHoy(j.id);
    const racha = rachaDiaria(diarios, fechaLocal());
    e = diarios[fechaLocal()].estrellas[E.diarioElegido] || 0;
    titulo = `📅 Reto de hoy ${E.diarioElegido + 1}/3 · Nivel ${n}`;
    extra = racha ? `Supera los 3 hoy para mantener tu 📅🔥 ${racha}` : 'Supera los 3 hoy para empezar una racha 📅🔥';
    boton = `▶ Jugar reto ${E.diarioElegido + 1}`;
  } else {
    e = leerEstrellas(j.id)[n - 1] || 0;
    titulo = `Nivel ${n}`;
    boton = e > 0 && e < 3 ? '▶ Jugar por ⭐⭐⭐' : '▶ Jugar';
  }
  $('tarjeta-titulo').textContent = `${titulo}${deVariante} · ${NOMBRE_RETO[cfg.reto]}`;
  $('tarjeta-texto').textContent = [`Tienes ${textoEstrellas(e)}`, cfg.texto, extra].filter(Boolean).join('\n');
  $('tarjeta-jugar').textContent = boton;
  $('tarjeta-nivel').classList.toggle('diaria', E.vistaHoy);
  $('tarjeta-nivel').showModal();
}

// Subtítulo de la baldosa de un modo: duración, vidas o nivel alcanzado.
export function subtituloModo(j, modo) {
  if (modo === 'rapido') return '30 s';
  if (modo === 'sinfallo') return '1 vida';
  if (modo === 'niveles') return `⭐ ${estrellasDelJuego(j.id)} · 📅 ${diariosHechos(j.id)}/3`;
  return j.duracion ?? '60 s';
}

// Modo en baldosas 2×2 (si el juego tiene más de uno) y dificultad como interruptor con caritas
// (salvo en Niveles, donde la pone el nivel, y en Rayo).
export function pintarModos(j) {
  const grupo = (titulo, clase, opciones, elegido, alElegir) => {
    const caja = el('div', clase);
    caja.setAttribute('role', 'group');
    caja.setAttribute('aria-label', titulo);
    for (const [valor, contenido] of opciones) {
      const b = el('button');
      b.append(...contenido);
      b.setAttribute('aria-pressed', valor === elegido);
      b.onclick = () => {
        alElegir(valor);
        $('previa-modos').querySelector(`[aria-label="${titulo}"] button[aria-pressed="true"]`)?.focus();
      };
      caja.append(b);
    }
    return [el('h3', 'categoria', titulo), caja];
  };
  const partes = [];
  const modos = j.modos ?? ['normal'];
  if (modos.length > 1) {
    const baldosa = (m) => [m, [el('span', 'icono-modo', ICONO_MODO[m]), el('span', '', MODOS[m]), el('small', '', subtituloModo(j, m))]];
    partes.push(...grupo('Modo', 'baldosas', modos.map(baldosa), E.eleccion.modo, (modo) => elegir(j, { ...E.eleccion, modo })));
  }
  if (!j.sinDificultad && E.eleccion.modo !== 'niveles') {
    const opciones = Object.entries(DIFICULTADES).map(([d, nombre]) => [d, [`${CARA[d]} ${nombre}`]]);
    partes.push(...grupo('Dificultad', 'segmento', opciones, E.eleccion.dificultad, (dificultad) => elegir(j, { ...E.eleccion, dificultad })));
  }
  $('previa-modos').replaceChildren(...partes);
}

export function elegir(j, e) {
  E.eleccion = e;
  guardar('eleccion:' + j.id, `${e.modo}|${e.dificultad}`);
  pintarPrevia(j);
}

// Lo que recibe start: la elección o, en Niveles, la configuración del nivel elegido.
export function opcionesDeJuego() {
  if (E.eleccion.modo !== 'niveles') return E.eleccion;
  E.jugando = { nivel: nivelJugado(), fecha: fechaLocal(), diario: E.vistaHoy ? E.diarioElegido : null };
  const nivel = configNivel(E.actual.id, E.jugando.nivel);
  return { modo: 'niveles', dificultad: nivel.dificultad, nivel };
}
