// Lectura y guardado del progreso: récords, estrellas, diarios, historial, logros y copias.
import { leer, guardar } from '../games/comun.js';
import { DIFICULTADES } from '../games/modos.js';
import { NUM_NIVELES, desdeAntiguo, podarDiarios, nivelesDelDia, siguienteNivel, totalEstrellas, estrellasDiarias, diarioCompleto, NIVELES_POR_MUNDO } from '../games/niveles.js';
import { fechaLocal, mejorRacha, entrenosCompletados, anotar } from '../games/estadisticas.js';
import { logrosNuevos } from '../games/logros.js';
import { esClaveDelJuego } from '../games/copia.js';
import { E } from './estado.js';
import { JUEGOS, idsPorCategoria } from './juegos.js';

export const leerRecord = (clave) => Number(leer(clave)) || 0;

// Última elección de modo y dificultad de un juego ("modo|dificultad"); si no vale para él, Normal + Normal.
export function leerEleccion(j) {
  const [modo, dificultad] = (leer('eleccion:' + j.id) || '').split('|');
  return {
    modo: (j.modos ?? ['normal']).includes(modo) ? modo : 'normal',
    dificultad: !j.sinDificultad && dificultad in DIFICULTADES ? dificultad : 'normal',
  };
}

// Estrellas por nivel de un juego (`estrellas:<id>` = JSON con un número 0–3 por nivel). Si aún no hay,
// el progreso de la versión anterior (`niveles:<id>` = nivel más alto superado) cuenta como 1 ⭐ por nivel.
export function leerEstrellas(id) {
  try {
    const estrellas = JSON.parse(leer('estrellas:' + id));
    // Al menos 50 números y sin huecos: un dato corto o con huecos no debe marcar mundos como completos.
    if (Array.isArray(estrellas)) return Array.from({ length: Math.max(NUM_NIVELES, estrellas.length) }, (_, i) => Number(estrellas[i]) || 0);
  } catch {
    // dato roto: se usa el progreso antiguo
  }
  return desdeAntiguo(Number(leer('niveles:' + id)) || 0);
}

// Niveles diarios de un juego: `diarios:<id>` = JSON { 'AAAA-MM-DD': { niveles: [n, n, n], estrellas: [e, e, e] } }.
export function leerDiarios(id) {
  try {
    const diarios = JSON.parse(leer('diarios:' + id));
    // Solo días válidos: un dato roto no debe romper el menú.
    if (diarios && typeof diarios === 'object') {
      const valido = (d) => d?.niveles?.length === 3 && d.niveles.every((n) => Number.isInteger(n) && n >= 1) && d.estrellas?.length === 3;
      return Object.fromEntries(Object.entries(diarios).filter(([, d]) => valido(d)));
    }
  } catch {
    // dato roto: sin diarios
  }
  return {};
}

export const guardarDiarios = (id, diarios) => guardar('diarios:' + id, JSON.stringify(podarDiarios(diarios)));

// Diarios del juego con los de hoy: se eligen (y se guardan) la primera vez que se piden en el día, según tu nivel.
export function diariosConHoy(id) {
  const diarios = leerDiarios(id);
  const hoy = fechaLocal();
  if (!diarios[hoy]) {
    diarios[hoy] = { niveles: nivelesDelDia(siguienteNivel(leerEstrellas(id))), estrellas: [0, 0, 0] };
    guardarDiarios(id, diarios);
  }
  return diarios;
}

// Cuántos diarios de hoy están superados (0–3).
export const diariosHechos = (id) => (leerDiarios(id)[fechaLocal()]?.estrellas ?? []).filter((e) => e > 0).length;

// Estrellas de los niveles más las de los diarios.
export const estrellasDelJuego = (id) => totalEstrellas(leerEstrellas(id)) + estrellasDiarias(leerDiarios(id));

// Nivel que se juega: el elegido o, en la pestaña Hoy, el del diario elegido.
export const nivelJugado = () => (E.vistaHoy ? diariosConHoy(E.actual.id)[fechaLocal()].niveles[E.diarioElegido] : E.nivelElegido);

// Retos de hoy que te faltan en un juego; solo cuenta si ya lo juegas en Niveles (tiene alguna ⭐).
export const retosPendientes = (j) => (estrellasDelJuego(j.id) > 0 ? 3 - diariosHechos(j.id) : 0);

// 🏅 Logros: datos para comprobarlos, los conseguidos (`logros:conseguidos` = { id: fecha }) y apuntar los nuevos.
export function resumenLogros() {
  const hist = historiales();
  const listas = JUEGOS.map((j) => leerEstrellas(j.id));
  const diasRetos = new Set(JUEGOS.flatMap((j) => Object.entries(leerDiarios(j.id)).filter(([, d]) => diarioCompleto(d)).map(([fecha]) => fecha)));
  return {
    partidas: Number(leer('contador:partidas')) || 0,
    mejorRacha: mejorRacha(idsPorCategoria, hist),
    entrenos: entrenosCompletados(idsPorCategoria, hist),
    juegosJugados: JUEGOS.filter((j) => hist[j.id].length).length,
    estrellas: JUEGOS.reduce((suma, j) => suma + estrellasDelJuego(j.id), 0),
    jefes: listas.reduce((suma, l) => suma + l.filter((e, i) => (i + 1) % NIVELES_POR_MUNDO === 0 && e > 0).length, 0),
    tresEstrellas: listas.flat().filter((e) => e === 3).length,
    pasadoNivel50: listas.some((l) => siguienteNivel(l) > NUM_NIVELES) ? 1 : 0,
    diasRetos: diasRetos.size,
    victorias: balanceDuelos().v,
    podios: Object.keys(leerJSON('liga:medallas')).length,
    oros: Object.values(leerJSON('liga:medallas')).filter((p) => p === 1).length,
  };
}

export function leerLogros() {
  try {
    const conseguidos = JSON.parse(leer('logros:conseguidos'));
    return conseguidos && typeof conseguidos === 'object' ? conseguidos : {};
  } catch {
    return {};
  }
}

// Apunta (con la fecha de hoy) los logros recién conseguidos y los devuelve.
export function apuntarLogros() {
  const conseguidos = leerLogros();
  const nuevos = logrosNuevos(resumenLogros(), conseguidos);
  for (const l of nuevos) conseguidos[l.id] = fechaLocal();
  if (nuevos.length) guardar('logros:conseguidos', JSON.stringify(conseguidos));
  return nuevos;
}

// "245 ms", "12 movimientos" o solo "7" si el juego no tiene unidad.
export const conUnidad = (j, n) => (j.unidad ? `${n} ${j.unidad}` : `${n}`);

// Historial de partidas terminadas: `historial:<id>` = JSON [{ fecha, cuando, puntos, ms, modo, dificultad }]. Si está roto, vacío.
export function leerHistorial(id) {
  try {
    const historial = JSON.parse(leer('historial:' + id));
    // Solo entradas válidas: un dato roto no debe romper el menú ni las gráficas.
    return Array.isArray(historial) ? historial.filter((p) => p && typeof p === 'object' && Number.isFinite(p.puntos)) : [];
  } catch {
    return [];
  }
}

export const historiales = () => Object.fromEntries(JUEGOS.map((j) => [j.id, leerHistorial(j.id)]));

// Anota la partida y suma a los contadores totales (que no se recortan con el historial).
export function guardarPartida(id, partida) {
  guardar('historial:' + id, JSON.stringify(anotar(leerHistorial(id), partida)));
  guardar('contador:partidas', (Number(leer('contador:partidas')) || 0) + 1);
  guardar('contador:ms', (Number(leer('contador:ms')) || 0) + partida.ms);
}

export const textoEstrellas = (e) => `${'⭐'.repeat(e)}${'☆'.repeat(3 - e)}`;

// 💾 Copia de seguridad: guarda el progreso en un archivo (en el móvil, con el menú de compartir) o lo recupera de uno.
export function datosGuardados() {
  try {
    return Object.keys(localStorage).map((clave) => [clave, localStorage.getItem(clave)]);
  } catch {
    return []; // sin localStorage (modo privado): no hay nada que copiar
  }
}

// Cambia todo el progreso del juego por `datos` ({ clave: valor }); las claves que no estén se borran.
export function sustituirProgreso(datos) {
  for (const [clave] of datosGuardados()) if (esClaveDelJuego(clave)) localStorage.removeItem(clave);
  for (const [clave, valor] of Object.entries(datos)) if (esClaveDelJuego(clave) && typeof valor === 'string') guardar(clave, valor);
}

export const datosDelJuego = () => Object.fromEntries(datosGuardados().filter(([clave]) => esClaveDelJuego(clave)));

export function leerJSON(clave) {
  try {
    const valor = JSON.parse(leer(clave));
    return valor && typeof valor === 'object' ? valor : {};
  } catch {
    return {};
  }
}

export function balanceDuelos() {
  const resultados = Object.values(leerJSON('duelos:resultados'));
  const cuenta = (r) => resultados.filter((x) => x === r).length;
  return { v: cuenta('v'), d: cuenta('d'), e: cuenta('e') };
}
