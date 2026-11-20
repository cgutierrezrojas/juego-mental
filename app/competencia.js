// 🏆 Competencia: 🕹️ Desafío de hoy (un juego del Arcade, misma partida para todos, 3 intentos) y 🏆 Torneo de la semana
// (un juego del Arcade o de Mentales, intentos ilimitados). Reglas puras en games/competencia.js.
// Local: `compe:dia` = { fecha, intentos, mejor, pendiente? } y `compe:torneo` = { semana, juego, mejor, partidas, pendiente? }.
// Nube: `diario/{fecha}_arcade/jugadores/{uid}` y `torneo/{semana}/jugadores/{uid}` (ver firestore.rules).
import { el, guardar, leer } from '../games/comun.js';
import { fechaLocal } from '../games/estadisticas.js';
import { semanaDe, semanaAnterior, diasRestantes } from '../games/liga.js';
import { semillaDelDia } from '../games/minas.js';
import { MONTOS } from '../games/premios.js';
import { juegoDelDia, juegoDeLaSemana, haceDias, premioTorneo, sumarMedalla, anotarIntento, anotarMarca, quedan, mejora, INTENTOS, MENOS_ES_MEJOR, PREMIOS_TORNEO, POR_PARTICIPAR } from '../games/competencia.js';
import { leerJSON } from './datos.js';
import { E } from './estado.js';
import { $, mostrar, confeti } from './ui.js';
import { INFO_JUEGOS } from './juegos.js';
import { filaPublica, nombreConAvatar, avisarPerfil } from './perfil.js';
import { soyAdmin, botonesModeracion } from './liga.js';
import { darPremio, sumarFichas } from './premios.js';
import { boton } from './cartas.js';
import { abrirJuegoArcade } from './arcade.js';
import { jugar } from './partida.js';

const leerDia = () => leerJSON('compe:dia');
const leerTorneo = () => leerJSON('compe:torneo');
export const marca = (juego, v) => `${v} ${INFO_JUEGOS[juego].unidad ?? 'pts'}`;
export const desafioJugadoHoy = () => leerDia().fecha === fechaLocal() && leerDia().intentos > 0;

const subiendo = {}; // 'dia' | 'torneo' → subida en curso (el ranking la espera un rato para salir con tu fila)

// Sube la fila (con cuenta y apodo). Queda `pendiente` hasta que responda: si falla, se reintenta al abrir la Competencia;
// permission-denied (las reglas no la admiten, por ejemplo porque otro celular ya subió más intentos) no se reintenta.
function subir(tipo) {
  const clave = 'compe:' + tipo;
  const r = leerJSON(clave);
  const apodo = leer('nube:apodo');
  if (r.mejor == null) return;
  r.pendiente = true; // aunque aún no haya cuenta o apodo: abrirCompetencia la sube cuando los haya
  guardar(clave, JSON.stringify(r));
  if (!E.nube || !E.usuario || !apodo) return;
  const base = { apodo, actualizado: Date.now(), ...filaPublica() };
  const promesa = tipo === 'dia'
    ? E.nube.guardarDiario(`${r.fecha}_arcade`, E.usuario.uid, { ...base, valor: Math.min(r.mejor, 10000000), intentos: r.intentos, juego: juegoDelDia(r.fecha) })
    : E.nube.guardarTorneo(r.semana, E.usuario.uid, { ...base, valor: r.mejor, juego: r.juego });
  subiendo[tipo] = promesa.then(() => true, (e) => e?.code === 'permission-denied').then((listo) => {
    delete subiendo[tipo];
    const ahora = leerJSON(clave);
    // si mientras tanto cambió (otro intento), esa subida nueva es la que manda
    if (!listo || ahora.mejor !== r.mejor || ahora.intentos !== r.intentos || ahora.fecha !== r.fecha || ahora.semana !== r.semana) return;
    delete ahora.pendiente;
    guardar(clave, JSON.stringify(ahora));
  });
}

// Si desde otro celular ya se usaron intentos hoy, se traen (así no hay más de 3). Devuelve true si cambió algo.
async function traerDia() {
  const hoy = fechaLocal();
  const fila = await E.nube.leerDiario(`${hoy}_arcade`, E.usuario.uid).catch(() => null);
  if (!fila) return false;
  const r = leerDia();
  const local = r.fecha === hoy ? r : { fecha: hoy, intentos: 0, mejor: null };
  if (fila.intentos <= local.intentos && (local.mejor ?? -1) >= fila.valor) return false;
  guardar('compe:dia', JSON.stringify({ ...local, intentos: Math.max(local.intentos, fila.intentos), mejor: Math.max(local.mejor ?? 0, fila.valor) }));
  return true;
}

// 🕹️ Un intento del desafío: se gasta al pulsar ▶ Jugar; al terminar se apunta la mejor marca, se sube y se dan las fichas.
function jugarDesafio() {
  const fecha = fechaLocal();
  const juego = juegoDelDia(fecha);
  let empezado = false;
  abrirJuegoArcade(juego, {
    semilla: semillaDelDia(fecha, 'arcade'),
    competencia: {
      etiqueta: () => (empezado ? `🕹️ Desafío · intento ${leerDia().intentos}/${INTENTOS}` : `🕹️ Desafío · quedan ${quedan(leerDia(), fecha)}`),
      texto: `🕹️ Desafío de hoy: todos juegan la misma partida. Tienes ${INTENTOS} intentos y cuenta el mejor.`,
      empezar: () => {
        const r = anotarIntento(leerDia(), fecha);
        if (!r) return false;
        guardar('compe:dia', JSON.stringify(r));
        empezado = true;
        return true;
      },
      terminar: (puntos) => {
        const antes = leerDia().mejor;
        const r = anotarMarca(leerDia(), puntos);
        guardar('compe:dia', JSON.stringify(r));
        subir('dia');
        const q = INTENTOS - r.intentos;
        const linea = `🕹️ ${marca(juego, puntos)}${antes != null && puntos > antes ? ' · ¡mejoraste!' : ''} · tu mejor: ${marca(juego, r.mejor)} · ${q ? `te queda${q > 1 ? 'n' : ''} ${q}` : 'sin intentos hasta mañana'}`;
        return [linea, darPremio('arcadedia')].filter(Boolean).join('\n');
      },
      volver: abrirCompetencia,
    },
  });
}

// 🏆 Una partida del torneo: Arcade con la semilla de la semana; Mentales en Normal y sin semilla.
function jugarTorneo() {
  const fecha = fechaLocal();
  const semana = semanaDe(fecha);
  const juego = juegoDeLaSemana(fecha);
  const terminar = (puntos) => {
    const antes = leerTorneo();
    const r = antes.semana === semana ? antes : { semana, juego, mejor: null, partidas: 0 };
    r.partidas = (r.partidas ?? 0) + 1;
    const mejoro = mejora(juego, puntos, r.mejor);
    if (mejoro) r.mejor = puntos;
    guardar('compe:torneo', JSON.stringify(r));
    if (mejoro) subir('torneo');
    if (mejoro) return `🏆 ¡Nueva mejor marca del torneo: ${marca(juego, puntos)}!`;
    return r.mejor != null ? `🏆 Tu mejor marca del torneo sigue siendo ${marca(juego, r.mejor)}` : '';
  };
  if (INFO_JUEGOS[juego].arcade) {
    return abrirJuegoArcade(juego, {
      semilla: semillaDelDia(semana, 'torneo'),
      competencia: {
        etiqueta: () => {
          const t = leerTorneo();
          return t.semana === semana && t.mejor != null ? `🏆 Torneo · mejor ${t.mejor}` : '🏆 Torneo';
        },
        texto: '🏆 Torneo de la semana: todos juegan la misma partida. Juega las veces que quieras; cuenta tu mejor marca.',
        empezar: () => true,
        terminar,
        volver: abrirCompetencia,
      },
    });
  }
  E.actual = INFO_JUEGOS[juego];
  E.eleccion = { modo: 'normal', dificultad: 'normal' };
  E.enDuelo = null; // por si quedó un duelo a medias: esta partida es del torneo
  E.enVivo = null;
  E.enCompetencia = { titulo: '🏆 Torneo de la semana', terminar, volver: abrirCompetencia };
  jugar();
}

// Top 20 con tu puesto y los botones ⚠️/🚫 (como la liga), o el aviso de entrar con la cuenta. Se rellena al llegar de la nube.
// `cargar()` → filas; `puesto(valor)` → número; `mio` = tu marca o null; `pendiente()` → si tu marca aún no se sube; `espera` = subida en curso.
export function cajaRanking(titulo, { juego, cargar, puesto, mio, pendiente, espera }) {
  const caja = el('div', 'caja-dia');
  caja.append(el('h3', 'categoria', titulo));
  if (!E.nube || !E.usuario) {
    caja.append(el('p', 'sin-datos', 'Entra con tu cuenta para competir'));
    return caja;
  }
  const lista = el('ol', 'ranking-dia');
  const tu = el('p', 'tu-dia', 'Cargando…');
  caja.append(lista, tu);
  const pintar = async () => {
    // Sin conexión, Firestore deja la escritura en cola sin fallar: no se espera más de 5 s.
    await Promise.race([espera, new Promise((listo) => setTimeout(listo, 5000))]);
    const uid = E.usuario.uid;
    const [filas, esAdmin] = await Promise.all([cargar(), soyAdmin()]);
    lista.replaceChildren(...(filas.length ? filas.map((f) => {
      const li = el('li', f.uid === uid ? 'propia' : '');
      li.append(nombreConAvatar(f), el('span', 'valor', marca(juego, f.valor)));
      if (f.uid !== uid) {
        const acciones = el('span', 'acciones');
        acciones.append(...botonesModeracion(f, esAdmin, () => pintar().catch(() => {})));
        li.append(acciones);
      }
      return li;
    }) : [el('li', 'sin-datos', 'Aún nadie ha jugado. ¡Sé el primero!')]));
    let texto;
    if (!leer('nube:apodo')) texto = 'No apareces: ponte un apodo en 📊 › ☁️ Nube.';
    else if (mio == null) texto = 'Juega para aparecer.';
    else {
      texto = `Tu marca: ${marca(juego, mio)}`;
      if (!filas.some((f) => f.uid === uid)) texto += pendiente() ? ' · ⚠️ Aún no se sube tu marca (¿sin conexión?); se reintenta sola' : ` · puesto ${await puesto(mio)}`;
    }
    tu.textContent = texto;
  };
  pintar().catch(() => (tu.textContent = 'No se pudo cargar el ranking (¿sin conexión?).'));
  return caja;
}

function tarjeta(titulo, juego, lineas, texto, alPulsar, activo) {
  const J = INFO_JUEGOS[juego];
  const caja = el('div', 'tarjeta-compe');
  caja.append(el('h3', '', titulo), el('p', 'juego-compe', `${J.icono} ${J.nombre}`), ...lineas.map((l) => el('small', '', l)));
  const b = boton(texto, 'grande color', alPulsar);
  b.style.setProperty('--c', 'var(--rojo)');
  b.disabled = !activo;
  caja.append(b);
  return caja;
}

function pintar() {
  const hoy = fechaLocal();
  const semana = semanaDe(hoy);
  const jd = juegoDelDia(hoy);
  const jt = juegoDeLaSemana(hoy);
  const d = leerDia();
  const t = leerTorneo();
  const intentos = d.fecha === hoy ? d.intentos : 0;
  const mejorDia = d.fecha === hoy ? d.mejor : null;
  const mejorTorneo = t.semana === semana ? t.mejor : null;
  const horas = 24 - new Date().getHours();
  const dias = diasRestantes(hoy);
  const menos = MENOS_ES_MEJOR.includes(jt);
  $('competencia-contenido').replaceChildren(
    tarjeta('🕹️ Desafío de hoy', jd, [
      `Intentos: ${intentos}/${INTENTOS}${mejorDia != null ? ` · tu mejor: ${marca(jd, mejorDia)}` : ''}`,
      `Termina en ${horas} h · 🪙 ${MONTOS.arcadedia} fichas por jugarlo`,
    ], intentos < INTENTOS ? `▶ Jugar (intento ${intentos + 1}/${INTENTOS})` : 'Sin intentos: vuelve mañana', jugarDesafio, intentos < INTENTOS),
    cajaRanking('🕹️ Ranking del desafío', {
      juego: jd,
      cargar: () => E.nube.topDiario(`${hoy}_arcade`, false, 20),
      puesto: (v) => E.nube.puestoDiario(`${hoy}_arcade`, v, false),
      mio: mejorDia,
      pendiente: () => Boolean(leerDia().pendiente),
      espera: subiendo.dia,
    }),
    tarjeta('🏆 Torneo de la semana', jt, [
      `${t.semana === semana ? t.partidas : 0} partidas${mejorTorneo != null ? ` · tu mejor: ${marca(jt, mejorTorneo)}` : ''}${menos ? ' · menos es mejor' : ''}`,
      `Termina en ${dias} día${dias > 1 ? 's' : ''} · 🥇 ${PREMIOS_TORNEO[0]} · 🥈 ${PREMIOS_TORNEO[1]} · 🥉 ${PREMIOS_TORNEO[2]} · 🪙 ${POR_PARTICIPAR} por participar`,
    ], '▶ Jugar', jugarTorneo, true),
    cajaRanking('🏆 Ranking del torneo', {
      juego: jt,
      cargar: () => E.nube.topTorneo(semana, menos, 20),
      puesto: (v) => E.nube.puestoTorneo(semana, v, menos),
      mio: mejorTorneo,
      pendiente: () => Boolean(leerTorneo().pendiente),
      espera: subiendo.torneo,
    }),
  );
}

export function abrirCompetencia() {
  mostrar('competencia');
  $('btn-competencia-volver').onclick = () => mostrar('inicio');
  for (const tipo of ['dia', 'torneo']) if (leerJSON('compe:' + tipo).pendiente && !subiendo[tipo]) subir(tipo);
  pintar();
  if (E.nube && E.usuario) traerDia().then((cambio) => cambio && !$('competencia').hidden && pintar());
}

const PUESTO = { 1: '🥇 ¡Quedaste 1.º', 2: '🥈 ¡Quedaste 2.º', 3: '🥉 ¡Quedaste 3.º' };

// Al empezar una semana nueva se mira el torneo de la anterior (una sola vez por semana, `compe:premio`):
// podio 500/300/150 fichas y medalla en `perfil:torneos`; si participaste y no quedaste, 25. No cuenta para el tope diario.
let revisando = null; // revisión en curso: dos llamadas seguidas no pagan el premio dos veces
export function comprobarTorneo() {
  return (revisando ??= revisar().finally(() => (revisando = null)));
}

async function revisar() {
  const hoy = fechaLocal();
  const anterior = semanaAnterior(hoy);
  if (!E.nube || !E.usuario || leer('compe:premio') === anterior) return;
  const juego = juegoDeLaSemana(haceDias(hoy, 7));
  try {
    const uid = E.usuario.uid;
    const [podio, mia] = await Promise.all([E.nube.topTorneo(anterior, MENOS_ES_MEJOR.includes(juego), 3), E.nube.leerTorneo(anterior, uid)]);
    guardar('compe:premio', anterior);
    const puesto = podio.findIndex((f) => f.uid === uid) + 1;
    const fichas = premioTorneo(puesto, Boolean(mia));
    if (!fichas) return;
    sumarFichas(fichas);
    const nombre = INFO_JUEGOS[juego].nombre;
    if (puesto) {
      guardar('perfil:torneos', JSON.stringify(sumarMedalla(leerJSON('perfil:torneos'), puesto)));
      confeti();
      avisarPerfil([`${PUESTO[puesto]} en el torneo de ${nombre}! +${fichas} fichas`]);
    } else {
      avisarPerfil([`🏆 Gracias por jugar el torneo de ${nombre}: +${fichas} fichas`]);
    }
  } catch {
    // sin conexión: se mira la próxima vez
  }
}
