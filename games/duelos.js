// Duelos por turnos: elegir los juegos, quién va ganando y en qué estado está cada duelo. Todo puro.
import { barajar } from './comun.js';
import { nivel } from './estadisticas.js';

export const PLAZO = 48 * 60 * 60 * 1000; // 48 horas para jugar

// `cuantos` juegos distintos al azar de `ids` (o todos, si hay menos).
export const elegirJuegos = (ids, cuantos = 3, rnd = Math.random) => barajar(ids, rnd).slice(0, cuantos);

// Marcador desde el punto de vista de `uid`. `juegos`: { id: { referencia, menorEsMejor } }.
// `porJuego`: [{ id, mio, suyo, gana: 'yo' | 'rival' | 'empate' | null }]. Con `final` (duelo terminado),
// un juego que solo jugó uno lo gana quien lo jugó. `mio` / `suyo`: juegos ganados o suma de niveles (0–100 por juego).
export function marcador(duelo, uid, juegos, final = false) {
  const rival = duelo.jugadores.find((j) => j !== uid);
  const mios = duelo.resultados?.[uid] ?? {};
  const suyos = (rival && duelo.resultados?.[rival]) ?? {};
  const porJuego = duelo.juegos.map((id) => {
    const mio = mios[id];
    const suyo = suyos[id];
    let gana = null;
    if (mio !== undefined && suyo !== undefined) {
      const mejor = juegos[id]?.menorEsMejor ? mio < suyo : mio > suyo;
      gana = mio === suyo ? 'empate' : mejor ? 'yo' : 'rival';
    } else if (final && (mio !== undefined || suyo !== undefined)) {
      gana = mio !== undefined ? 'yo' : 'rival';
    }
    return { id, mio, suyo, gana };
  });
  if (duelo.victoria === 'puntos') {
    const suma = (r) => duelo.juegos.reduce((s, id) => (r[id] === undefined ? s : s + nivel(r[id], juegos[id].referencia, juegos[id].menorEsMejor)), 0);
    return { porJuego, mio: suma(mios), suyo: suma(suyos) };
  }
  const ganados = (quien) => porJuego.filter((p) => p.gana === quien).length;
  return { porJuego, mio: ganados('yo'), suyo: ganados('rival') };
}

const completo = (duelo, uid) => Object.keys(duelo.resultados?.[uid] ?? {}).length >= duelo.juegos.length;

// 'invitacion' (te lo ofrecen y aún no eres jugador), 'tu-turno', 'esperando', 'terminado', 'caducado' (sin rival) o 'ajeno'.
export function estadoDuelo(duelo, uid, ahora) {
  const caducado = ahora > duelo.caduca;
  if (duelo.jugadores.length < 2) {
    if (caducado) return 'caducado';
    if (!duelo.jugadores.includes(uid)) return 'invitacion';
  } else {
    if (!duelo.jugadores.includes(uid)) return 'ajeno';
    if (caducado || duelo.jugadores.every((j) => completo(duelo, j))) return 'terminado';
  }
  return completo(duelo, uid) ? 'esperando' : 'tu-turno';
}

// Resultado final para `uid`: 'v' (victoria), 'd' (derrota) o 'e' (empate).
export function resultadoPara(duelo, uid, juegos) {
  const { mio, suyo } = marcador(duelo, uid, juegos, true);
  return mio > suyo ? 'v' : mio < suyo ? 'd' : 'e';
}

// La puntuación del rival en un juego se ve si ya jugaste el tuyo o si el duelo terminó.
export const verRival = (duelo, uid, juego, terminado) => terminado || duelo.resultados?.[uid]?.[juego] !== undefined;
