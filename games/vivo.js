// Duelos en vivo: qué juegos valen y quién gana una sala. Todo puro.
// Sala (Realtime Database `vivo/{id}`): { anfitrion, invitado, nombres, juego, dificultad, estado, inicio, puntos, fin, fuera }.

// Solo juegos con reloj: los dos terminan a la vez.
export const JUEGOS_VIVO = ['calculo', 'mayor', 'menos', 'distinto', 'series', 'sobra', 'balanza', 'atencion', 'topos'];

export const rivalDe = (sala, uid) => (sala.anfitrion === uid ? sala.invitado : sala.anfitrion);

// Resultado para `uid`: 'v', 'd', 'e' o null si aún no se sabe.
// Quien se va (o pierde la conexión) antes de terminar, pierde.
export function resultadoVivo(sala, uid) {
  const rival = rivalDe(sala, uid);
  const fin = sala.fin ?? {};
  const fuera = sala.fuera ?? {};
  const termino = (u) => fin[u] !== undefined;
  if (fuera[rival] && !termino(rival)) return 'v';
  if (fuera[uid] && !termino(uid)) return 'd';
  if (!termino(uid) || !termino(rival)) return null;
  if (fin[uid] === fin[rival]) return 'e';
  return fin[uid] > fin[rival] ? 'v' : 'd';
}
