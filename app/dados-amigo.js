// 🎲 Cacho y Generala contra un amigo con «dados justos» (games/justo.js). La semilla secreta y el historial de lo que
// escribí quedan en este celular, en `dadosjusto:<idMesa>` ({ s, hist }); a la mesa van los sellos, los números públicos,
// `estado.k` (tiradas pedidas) y, con cada tirada, `log/k` con la hora del servidor (ver database.rules.json).
// `hist` = [estado con el que me llegó el turno, ...lo que escribí después]: como en la Batalla naval (app/mesa.js), cada
// estado que me devuelve el turno debe ser una de mis escrituras (alguna se perdió) o pasos legítimos del rival.
// Cada juego da en `J.amigo`: M (su módulo puro: nuevaAmigo, pasosAmigo, tiradasAmigo), auto(e, misDados) (lo que se
// escribe solo: publicar la tirada, empezar la ronda, revelar) y vista(q) (lo que se pinta).
import { leer, guardar } from '../games/comun.js';
import * as J from '../games/justo.js';
import { trampaPorRendicion } from '../games/naval.js';
import { E } from './estado.js';

const FICHA = ['x', 'o'];
const json = (x) => JSON.parse(JSON.stringify(x));
const clave = (id) => 'dadosjusto:' + id;
function leerMio(id) {
  try { return JSON.parse(leer(clave(id)) || 'null'); } catch { return null; }
}
const guardarMio = (id, mio) => guardar(clave(id), JSON.stringify(mio));
export function borrarMio(id) {
  try { localStorage.removeItem(clave(id)); } catch { /* sin localStorage */ }
}

// A la mesa: `k` va aparte, para que las reglas lo revisen.
export function aNube(e) {
  const { k, ...resto } = e;
  return { turno: FICHA[e.turno], datos: JSON.stringify(resto), k };
}
// De la mesa; null si no se puede leer (solo lo escribe un tramposo).
function deNube(estado) {
  try {
    const e = JSON.parse(estado.datos);
    // (el turno de la mesa, que es el que miran las reglas, debe ser el del estado)
    return e?.amigo === true && Number.isInteger(estado.k) && (e.turno === 0 || e.turno === 1) && FICHA[e.turno] === estado.turno ? { ...e, k: estado.k } : null;
  } catch {
    return null;
  }
}

// Partida nueva (quien reta): el estado para la mesa; guardarNueva(id, mio) cuando la mesa ya tiene id.
export async function crear(M) {
  const s = J.nuevaSemilla();
  const e = json(M.nuevaAmigo(await J.sellar(s)));
  return { e, mio: { s, hist: [e] } };
}
export const guardarNueva = guardarMio;

// Llega la mesa: `q.e` es siempre lo de la nube (o lo último legible); lo que se guarda o suelta en la Generala vive
// aparte (q.guardados) hasta tirar, y se olvida si cambia el estado.
export function alCambiar(q, mesa) {
  const e = deNube(mesa.estado);
  q.mesa = mesa;
  q.ilegible = !e;
  if (e && !J.igual(e, q.e)) {
    q.e = e;
    q.guardados = null;
  }
}

// Ganador de la mesa que corresponde al final del juego.
const esperado = (e) => (e.ganador === 'empate' ? 'empate' : FICHA[e.ganador] ?? null);

// Lo que se puede jugar a mano: mi turno, con todo lo automático hecho.
export function puedo(q) {
  const e = q.e;
  if (!e || q.ocupado || q.trampaRival || q.sinSemilla || q.mesa?.ganador || e.turno !== q.yo || e.ganador !== null) return false;
  return !!(e.sellos?.o && e.r?.x && e.r?.o) && !e.pide && !e.revelar && !(e.k < e.ronda);
}

// La hora del servidor de la tirada k. En una escritura mía, el evento local trae primero la hora estimada por el celular;
// la del servidor llega antes de la confirmación. Por eso (ya confirmada la escritura) se lee de la nube y debe coincidir
// con la última foto de la mesa que llegó al oyente; si no, se espera a la siguiente (o se reintenta en un rato).
// Solo se recuerda cuando coinciden.
async function cuandoDe(q, k) {
  if (q.cuandos?.[k] !== undefined) return q.cuandos[k];
  const c = (await E.nube.leerMesa(q.id).catch(() => null))?.log?.[k]?.cuando;
  if (typeof c !== 'number' || c !== q.mesa?.log?.[k]?.cuando) {
    if (!q.reintento) q.reintento = setTimeout(() => { q.reintento = null; q.reintentar?.(); }, 1500);
    return null;
  }
  (q.cuandos ??= {})[k] = c;
  return c;
}
// Mis dados de la tirada k (n dados), o null si aún no hay hora.
async function misDados(q, mio, k, n) {
  const cuando = await cuandoDe(q, k);
  return cuando === null ? null : J.dadosDe(mio.s, q.e.r[FICHA[1 - q.yo]] + ':' + cuando, k, n);
}

// Cada cosa que escribo se anota en `hist` antes de enviarla; al llegar a la nube, se recorta lo de antes.
async function escribir(q, est, g = null) {
  const mio = leerMio(q.id);
  est = json(est);
  (mio.hist ??= []).push(est); // (una semilla traída de una copia llega sin hist)
  guardarMio(q.id, mio);
  const k0 = q.mesa?.estado?.k ?? 0;
  // Con cada tirada nueva, en log/k quedan también lo guardado y quién tira: después ya no se puede cambiar.
  const tirada = est.k > k0 ? { k: est.k, g: J.mascara(est.guardados), j: FICHA[q.yo] } : null;
  try {
    await E.nube.jugarMesa(q.id, aNube(est), g, tirada);
  } catch {
    q.aviso = 'No se pudo enviar (¿sin conexión?).';
    return false;
  }
  q.aviso = null;
  const ahora = leerMio(q.id);
  const hist = J.recortar(ahora?.hist, est);
  if (hist !== ahora?.hist) guardarMio(q.id, { ...ahora, hist });
  return true;
}

// Trampa: se cierra a mi favor (con el estado tal cual está en la mesa) sin revelar nada.
async function cerrarPorTrampa(q) {
  q.trampaRival = true;
  try {
    await E.nube.jugarMesa(q.id, q.mesa.estado, FICHA[q.yo]);
  } catch {
    q.trampaRival = undefined; // se reintenta con la próxima actualización
  }
  return false;
}

// Revisa la mesa y escribe lo que toque sin preguntar. Devuelve si escribió (hay que volver a revisar).
async function revisar(q, A, sigue) {
  const { M } = A, yo = q.yo, rival = 1 - yo, F = FICHA[yo], mesa = q.mesa, e = q.e;
  let mio = leerMio(q.id);
  const cuadra = () => !mio?.hist || J.siguePartida(mio.hist, e, yo, (w, x, y) => J.jugadaRival(w, x, y, (a, b) => M.pasosAmigo(a, b, mesa.log)));
  if (mesa.ganador) {
    // Revisión final (una vez): rendiciones, el último cambio del rival, quién ganó y sus dados contra su semilla.
    if (q.trampaRival !== undefined) return false;
    const rendido = mesa.rendido ?? {};
    let trampa = trampaPorRendicion(mesa.ganador, F, !!rendido[mesa.jugadores[F]], !!rendido[mesa.jugadores[FICHA[rival]]]);
    if (trampa === null) trampa = q.ilegible || !e || !cuadra() || mesa.ganador !== esperado(e) || !(await J.rivalHonesto(e, rival, mesa.log, M.tiradasAmigo(e, mesa.log)));
    q.trampaRival = trampa;
    return false;
  }
  if (q.ilegible) return mesa.estado.turno === F ? cerrarPorTrampa(q) : false; // con mi turno es trampa; si no, se ignora
  if (!e) return false;
  if (!mio && e.sellos?.[F]) {
    q.sinSemilla = true; // datos borrados: solo puede rendirse
    return false;
  }
  // Cacho: mis dados de la ronda, para verlos aunque no sea mi turno.
  if (mio && A.mios && e.k === e.ronda && e.ganador === null && q.misDados?.k !== e.k) {
    const d = await misDados(q, mio, e.k, e.jugadores[yo].dados.length);
    if (d && q.e === e) q.misDados = { k: e.k, d };
  }
  if (e.turno !== yo) return false; // turno del rival (o mi propio eco): se revisa cuando me lo devuelva
  if (!mio) {
    // Invitado que aún no sella: sella su semilla y publica su número.
    mio = { s: J.nuevaSemilla(), hist: [e] };
    guardarMio(q.id, mio);
    return escribir(q, { ...e, sellos: { ...e.sellos, o: await J.sellar(mio.s) }, r: { ...e.r, o: J.nuevaSemilla() }, turno: 0 });
  }
  if (!cuadra()) return cerrarPorTrampa(q);
  mio.hist = mio.hist?.some((h) => J.igual(h, e)) ? J.recortar(mio.hist, e) : [e]; // aceptado: es la nueva base
  guardarMio(q.id, mio);
  // Mi sello o mi número no llegaron a la mesa (falló el envío): se vuelven a mandar antes que nada.
  if (!e.sellos?.[F]) return escribir(q, { ...e, sellos: { ...e.sellos, o: await J.sellar(mio.s) }, r: { ...e.r, o: e.r?.o ?? J.nuevaSemilla() }, turno: 0 });
  if (!e.r?.[F]) return escribir(q, { ...e, r: { ...e.r, [F]: J.nuevaSemilla() } });
  if (e.ganador !== null) {
    if (e.s?.[F]) return false;
    const final = { ...e, s: { ...e.s, [F]: mio.s }, turno: rival };
    // Antes de revelar, reviso mis propias tiradas con el registro de la nube: si no cuadran (no debería pasar), mejor
    // avisar que dejar que el rival me marque trampa sin saber por qué.
    const log = (await E.nube.leerMesa(q.id).catch(() => null))?.log;
    if (!(await J.rivalHonesto(final, yo, log, M.tiradasAmigo(final, log)))) {
      q.aviso = '⚠️ Tus tiradas no cuadran con el registro de la mesa: aún no se revela tu semilla. Vuelve a abrir la partida más tarde.';
      return false;
    }
    if (!e.s?.[FICHA[rival]]) return escribir(q, final); // revelo primero y le paso el turno para que cierre
    // Cierro yo: reviso su semilla y todas sus tiradas.
    const honesto = await J.rivalHonesto(final, rival, log, M.tiradasAmigo(final, log));
    if (!sigue()) return false;
    if (!honesto) return cerrarPorTrampa(q);
    q.trampaRival = false;
    if (!(await escribir(q, final, esperado(e)))) q.trampaRival = undefined;
    return false;
  }
  const nuevo = await A.auto(e, (k, n) => misDados(q, mio, k, n));
  return nuevo ? escribir(q, nuevo) : false;
}

// Una revisión a la vez (como en la naval): si llega otra actualización mientras tanto, se repite al terminar.
// `jugada`: un estado que viene de la pantalla (mi jugada), que se escribe primero.
export async function correr(q, A, sigue, pintar, jugada = null) {
  if (q.ocupado) {
    if (!jugada) q.otraVez = true;
    return;
  }
  q.ocupado = true;
  q.reintentar = () => correr(q, A, sigue, pintar);
  try {
    if (jugada) {
      pintar();
      await escribir(q, jugada);
    }
    for (let n = 0; n < 20 && sigue(); n++) {
      q.otraVez = false;
      if (!(await revisar(q, A, sigue)) && !q.otraVez) break;
    }
  } finally {
    q.ocupado = false;
  }
  if (sigue()) pintar();
}

// Mi jugada desde la pantalla (sobre la vista). En la Generala, guardar o soltar un dado no se escribe: queda aquí hasta tirar.
export function jugar(q, A, nuevo, sigue, pintar) {
  if (!nuevo || !puedo(q)) return false;
  const limpio = json(A.limpiar ? A.limpiar(nuevo) : nuevo);
  if (J.igual({ ...limpio, guardados: 0 }, { ...q.e, guardados: 0 })) {
    q.guardados = limpio.guardados;
    pintar();
    return true;
  }
  correr(q, A, sigue, pintar, limpio);
  return true;
}
