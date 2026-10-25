// Mensajes entre amigos: id de la conversación, texto válido y si hay algo sin leer. Todo puro.

export const MAX_MENSAJE = 300;

// La misma conversación para los dos, sea quien sea quien la abre: "uidMenor_uidMayor".
export const idChat = (a, b) => [a, b].sort().join('_');

// Texto listo para enviar (sin espacios de más) o null si está vacío o es demasiado largo.
export function mensajeValido(texto) {
  const limpio = String(texto ?? '').replace(/\s+/g, ' ').trim();
  return limpio && limpio.length <= MAX_MENSAJE ? limpio : null;
}

// ¿El último mensaje es del otro y llegó después de la última vez que leí? (`leido` en ms, 0 si nunca).
export const hayNoLeidos = (ultimo, leido, uid) => Boolean(ultimo) && ultimo.de !== uid && (ultimo.cuando ?? 0) > leido;
