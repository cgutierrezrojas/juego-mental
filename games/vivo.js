// Duelos en vivo por rondas: qué juegos valen, en qué ronda va la sala y quién gana. Todo puro.
// Sala (Realtime Database `vivo/{id}`): { anfitrion, invitado, nombres, juegos, dificultad, victoria, estado,
// inicios: { ronda: ms }, puntos: { uid: aciertos de la ronda en curso }, fin: { ronda: { uid: puntos } }, fuera: { uid: true } }.
import { resultadoPara } from './duelos.js';

// Solo juegos con reloj: los dos terminan cada ronda a la vez.
export const JUEGOS_VIVO = ['calculo', 'mayor', 'menos', 'distinto', 'series', 'sobra', 'balanza', 'atencion', 'topos'];

export const rivalDe = (sala, uid) => (sala.anfitrion === uid ? sala.invitado : sala.anfitrion);

// Primera ronda que aún no han terminado los dos (o el número de rondas, si ya acabaron todas).
export function rondaActual(sala) {
  const fin = sala.fin ?? {};
  const ambos = (r) => fin[r]?.[sala.anfitrion] !== undefined && fin[r]?.[sala.invitado] !== undefined;
  let r = 0;
  while (r < sala.juegos.length && ambos(r)) r++;
  return r;
}

// La sala con la forma de un duelo por turnos, para reutilizar su marcador: resultados = { uid: { juego: puntos } }.
export function comoDuelo(sala) {
  const resultados = { [sala.anfitrion]: {}, [sala.invitado]: {} };
  sala.juegos.forEach((juego, r) => {
    for (const uid of [sala.anfitrion, sala.invitado]) {
      const puntos = sala.fin?.[r]?.[uid];
      if (puntos !== undefined) resultados[uid][juego] = puntos;
    }
  });
  return { jugadores: [sala.anfitrion, sala.invitado], juegos: sala.juegos, victoria: sala.victoria ?? 'juegos', resultados };
}

// Resultado para `uid`: 'v', 'd', 'e' o null si aún no ha terminado. `juegos`: { id: { referencia, menorEsMejor } }.
// Quien se va (o pierde la conexión) antes de terminar todas las rondas, pierde.
export function resultadoVivo(sala, uid, juegos) {
  const rival = rivalDe(sala, uid);
  const termino = (u) => sala.juegos.every((_, r) => sala.fin?.[r]?.[u] !== undefined);
  if (sala.fuera?.[rival] && !termino(rival)) return 'v';
  if (sala.fuera?.[uid] && !termino(uid)) return 'd';
  if (rondaActual(sala) < sala.juegos.length) return null;
  return resultadoPara(comoDuelo(sala), uid, juegos);
}
