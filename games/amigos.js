// Amigos: código de amigo y quién es amigo de quién a partir de las solicitudes. Todo puro.

// Letras y números sin los que se confunden (0/O, 1/I/L).
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// Código fijo de cada persona, sacado de su uid: "K7Q-29F".
export function codigoAmigo(uid) {
  let h = 2166136261;
  for (const c of uid) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += ALFABETO[h % ALFABETO.length];
    h = Math.floor(h / ALFABETO.length) || Math.imul(h ^ i, 2654435761) >>> 0;
  }
  return `${codigo.slice(0, 3)}-${codigo.slice(3)}`;
}

// Lo que escribe la persona ("k7q 29f", "K7Q29F"…) en el formato del código, o null si no lo parece.
export function normalizarCodigo(texto) {
  const limpio = String(texto ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (limpio.length !== 6 || [...limpio].some((c) => !ALFABETO.includes(c))) return null;
  return `${limpio.slice(0, 3)}-${limpio.slice(3)}`;
}

// Solicitudes ({ id, de, para, nombreDe, nombrePara, estado }) → amigos, recibidas y enviadas para `uid`.
export function amigosDe(solicitudes, uid) {
  const resultado = { amigos: [], recibidas: [], enviadas: [] };
  for (const s of solicitudes) {
    const soyYo = s.de === uid;
    if (!soyYo && s.para !== uid) continue;
    const otro = { uid: soyYo ? s.para : s.de, apodo: soyYo ? s.nombrePara : s.nombreDe, id: s.id };
    if (s.estado === 'aceptada') resultado.amigos.push(otro);
    else if (soyYo) resultado.enviadas.push(otro);
    else resultado.recibidas.push(otro);
  }
  resultado.amigos.sort((a, b) => a.apodo.localeCompare(b.apodo));
  return resultado;
}
