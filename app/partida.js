// La partida: cuenta atrás, final con estrellas, barra y frases.
import { ligaAnotar } from './liga.js';
import { el, guardar, esRecord } from '../games/comun.js';
import { sonar } from '../games/efectos.js';
import { barraFinal, fraseEstrellas, fraseRecord } from '../games/final.js';
import { fechaLocal, entrenoCompleto } from '../games/estadisticas.js';
import { configNivel, estrellasDe, diarioCompleto, NOMBRE_RETO, rachaDiaria, conEstrellas } from '../games/niveles.js';
import { claveRecord, esDe, etiqueta } from '../games/modos.js';
import { $, mostrar, confeti } from './ui.js';
import { ponerEstado } from './amigos.js';
import { opcionesDeJuego } from './previa.js';
import { E } from './estado.js';
import { idsPorCategoria } from './juegos.js';
import { historiales, guardarPartida, leerDiarios, guardarDiarios, leerEstrellas, leerRecord, leerHistorial, conUnidad, apuntarLogros } from './datos.js';
import { anotarEnDuelo } from './duelos.js';

// Cuenta atrás 3-2-1 y después empieza el juego. Mientras, ✕ la cancela con parar().
export function jugar() {
  const tablero = $('tablero');
  mostrar('juego');
  ponerEstado('jugando');
  let n = 3;
  let id;
  E.parar = () => clearTimeout(id);

  function paso() {
    if (n === 0) {
      tablero.replaceChildren();
      E.inicio = Date.now();
      E.parar = E.actual.juego.start(tablero, terminar, opcionesDeJuego());
      return;
    }
    tablero.replaceChildren(el('div', 'cuenta', n));
    sonar('tic');
    n--;
    id = setTimeout(paso, 1000);
  }

  paso();
}

// Barra del final: se llena hasta la puntuación y marca cada valor (`etiquetas[i]` encima, el número debajo).
export function pintarBarra(puntos, valores, etiquetas, menorEsMejor) {
  const barra = $('final-barra');
  barra.hidden = !valores.length;
  if (!valores.length) return;
  const { relleno, marcas } = barraFinal(puntos, valores, menorEsMejor);
  const lleno = el('div', 'relleno');
  lleno.style.setProperty('--p', `${relleno * 100}%`);
  const partes = [lleno];
  marcas.forEach((posicion, i) => {
    const marca = el('span', 'marca');
    marca.style.left = `${posicion * 100}%`;
    marca.append(el('span', '', etiquetas[i]), el('small', '', `${valores[i]}`));
    partes.push(marca);
  });
  barra.replaceChildren(...partes);
}

export function terminar(puntos) {
  E.parar = null;
  const hoy = fechaLocal();
  const entrenoAntes = entrenoCompleto(hoy, idsPorCategoria, historiales());
  const enNiveles = E.eleccion.modo === 'niveles';
  const partida = { fecha: hoy, cuando: Date.now(), puntos, ms: Date.now() - E.inicio, ...E.eleccion };
  const nivel = enNiveles ? E.jugando.nivel : 0;
  if (enNiveles) Object.assign(partida, { dificultad: configNivel(E.actual.id, nivel).dificultad, nivel });
  guardarPartida(E.actual.id, partida);
  ligaAnotar('partida');
  // ¿Esta partida es la que completa el entrenamiento de hoy?
  const entrenoHoy = !entrenoAntes && entrenoCompleto(hoy, idsPorCategoria, historiales());
  let celebrar = entrenoHoy;
  if (entrenoHoy) ligaAnotar('entreno');
  $('final-puntos').textContent = puntos;
  $('final-entreno').hidden = !entrenoHoy;
  let titular = '';
  let frase = '';
  let unidad = E.actual.unidad ?? '';
  let espera = 0; // en Niveles, la celebración espera a que caigan las estrellas

  if (enNiveles) {
    // Niveles: sin récord; se guarda la mejor marca de estrellas (del nivel o del diario)
    // y el botón grande pasa a "Siguiente nivel" / "Siguiente diario" o "Reintentar".
    const cfg = configNivel(E.actual.id, nivel);
    const conseguidas = estrellasDe(puntos, cfg.metas, E.actual.menorEsMejor);
    unidad = cfg.unidad;
    titular = conseguidas ? '¡Superado!' : 'No superado';
    const valida = !E.actual.menorEsMejor || puntos > 0; // en "menos es mejor", 0 no es una marca válida
    frase = valida ? fraseEstrellas(puntos, cfg.metas, conseguidas, cfg.unidad, E.actual.menorEsMejor) : '';
    let siguiente = conseguidas > 0;
    if (E.jugando.diario !== null) {
      // Se guarda en el día en que empezó la partida.
      const diarios = leerDiarios(E.actual.id);
      const dia = diarios[E.jugando.fecha];
      const antes = diarioCompleto(dia);
      ligaAnotar('estrellas', conseguidas - (dia.estrellas[E.jugando.diario] || 0)); // solo las nuevas
      dia.estrellas[E.jugando.diario] = Math.max(dia.estrellas[E.jugando.diario] || 0, conseguidas);
      guardarDiarios(E.actual.id, diarios);
      $('final-modo').textContent = `📅 Diario ${E.jugando.diario + 1}/3 · Nivel ${nivel} · ${NOMBRE_RETO[cfg.reto]}`;
      if (!antes && diarioCompleto(dia)) frase += `\n¡Diarios de hoy completos! 📅🔥 ${rachaDiaria(diarios, hoy)}`;
      const pendiente = dia.estrellas.findIndex((e) => !(e > 0));
      siguiente &&= pendiente !== -1;
      if (siguiente) E.diarioElegido = pendiente;
      $('btn-repetir').textContent = siguiente ? '▶ Siguiente diario' : '↻ Reintentar';
    } else {
      ligaAnotar('estrellas', conseguidas - (leerEstrellas(E.actual.id)[nivel - 1] || 0)); // solo las nuevas
      guardar('estrellas:' + E.actual.id, JSON.stringify(conEstrellas(leerEstrellas(E.actual.id), nivel, conseguidas)));
      $('final-modo').textContent = `🪜 Nivel ${nivel} · ${NOMBRE_RETO[cfg.reto]}`;
      if (siguiente) E.nivelElegido++;
      $('btn-repetir').textContent = siguiente ? '▶ Siguiente nivel' : '↻ Reintentar';
    }
    // Superado con 1 o 2 ⭐ y el botón grande ya pasa al siguiente: también se puede repetir este por las 3.
    $('btn-mejorar').hidden = !(siguiente && conseguidas < 3);
    // Estrellas: las conseguidas caen una a una, cada una con su sonido.
    const estrellas = $('final-estrellas');
    estrellas.hidden = false;
    estrellas.setAttribute('aria-label', `${conseguidas} de 3 estrellas`);
    [...estrellas.children].forEach((s, i) => s.classList.toggle('ganada', i < conseguidas));
    for (let i = 0; i < conseguidas; i++) E.temporizadores.push(setTimeout(() => sonar('acierto'), 300 + i * 350));
    espera = conseguidas ? 300 + conseguidas * 350 : 0;
    pintarBarra(puntos, valida ? cfg.metas : [], ['⭐', '⭐⭐', '⭐⭐⭐'], E.actual.menorEsMejor);
    celebrar ||= conseguidas > 0;
  } else {
    // Otros modos: récord, y la barra compara con tu media (últimas 10 de antes) y tu récord anterior.
    const clave = claveRecord(E.actual.id, E.eleccion.modo, E.eleccion.dificultad);
    const anterior = leerRecord(clave);
    const nuevo = esRecord(puntos, anterior, E.actual.menorEsMejor);
    if (nuevo) guardar(clave, puntos);
    const previas = leerHistorial(E.actual.id).filter((p) => esDe(p, E.eleccion.modo, E.eleccion.dificultad)).slice(0, -1)
      .filter((p) => !E.actual.menorEsMejor || p.puntos > 0).slice(-10);
    const valores = [];
    const etiquetas = [];
    if (previas.length) {
      valores.push(Math.round(previas.reduce((s, p) => s + p.puntos, 0) / previas.length));
      etiquetas.push('📊');
    }
    if (anterior) {
      valores.push(anterior);
      etiquetas.push('🏆');
    }
    pintarBarra(puntos, valores, etiquetas, E.actual.menorEsMejor);
    titular = nuevo ? '🏆 ¡Nuevo récord!' : '';
    frase = anterior || nuevo ? fraseRecord(puntos, anterior, E.actual.unidad ?? 'puntos', E.actual.menorEsMejor) : '';
    $('final-modo').textContent = etiqueta(E.eleccion.modo, E.eleccion.dificultad);
    $('final-estrellas').hidden = true;
    $('btn-repetir').textContent = '↻ Repetir';
    $('btn-mejorar').hidden = true;
    celebrar ||= nuevo;
  }

  // Texto para 📤 Compartir: juego, modo o nivel, resultado y la invitación con el enlace.
  const resultado = enNiveles
    ? `${$('final-modo').textContent}: ${[...$('final-estrellas').children].map((s) => (s.classList.contains('ganada') ? '⭐' : '☆')).join('')} (${puntos} ${unidad})`
    : `${$('final-modo').textContent}: ${conUnidad(E.actual, puntos)}${titular ? ` · ${titular}` : ''}`;
  E.textoCompartir = `${E.actual.icono} ${E.actual.nombre} — ${resultado}\n¿Me superas? Juega a Pa'l Rato: https://cgutierrezrojas.github.io/juego-mental/`;
  if (E.enVivo) {
    E.nube.cambiarSala(E.enVivo.id, { [`fin/${E.enVivo.ronda}/${E.usuario.uid}`]: puntos }).catch(() => {});
    const quedan = E.enVivo.ronda + 1 < E.enVivo.total;
    $('final-modo').textContent = `⚡ En vivo vs ${E.enVivo.rival}${E.enVivo.total > 1 ? ` · ronda ${E.enVivo.ronda + 1}/${E.enVivo.total}` : ''}`;
    $('btn-repetir').textContent = quedan ? '⚡ Ver el marcador' : '⚡ Ver el resultado';
    $('btn-mejorar').hidden = true;
  }
  if (E.enDuelo) {
    anotarEnDuelo(puntos);
    $('final-modo').textContent = `⚔️ Duelo${E.enDuelo.rival ? ` vs ${E.enDuelo.rival}` : ''} · juego ${E.enDuelo.numero}/${E.enDuelo.total}`;
    $('btn-repetir').textContent = '⚔️ Volver al duelo';
    $('btn-mejorar').hidden = true;
  }
  const logros = apuntarLogros();
  $('final-logros').textContent = logros.map((l) => `🏅 ¡Logro desbloqueado! ${l.icono} ${l.nombre}`).join('\n');
  $('final-logros').hidden = !logros.length;
  celebrar ||= logros.length > 0;
  $('final-titular').textContent = titular;
  $('final-titular').hidden = !titular;
  $('final-titular').classList.toggle('mal', titular === 'No superado');
  $('final-barra').classList.toggle('metas', enNiveles); // etiquetas de estrellas, más pequeñas
  $('final-unidad').textContent = unidad;
  $('final-nivel').textContent = frase;
  $('final-nivel').hidden = !frase;
  mostrar('final');
  if (celebrar) {
    E.temporizadores.push(setTimeout(() => {
      confeti();
      sonar('record');
    }, espera));
  }
}
