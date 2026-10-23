// Copia de seguridad del progreso: qué claves son del juego y cómo se escribe y se lee el archivo. Todo puro.

// El dominio (cgutierrezrojas.github.io) lo comparten otras webs: solo se copian las claves con estos prefijos.
const PREFIJOS = ['record:', 'historial:', 'estrellas:', 'niveles:', 'diarios:', 'eleccion:', 'ajuste:', 'contador:', 'ayuda:'];

export const esClaveDelJuego = (clave) => PREFIJOS.some((p) => clave.startsWith(p));

// `datos`: pares [clave, valor] del almacenamiento. Devuelve el texto JSON del archivo.
export function crearCopia(datos, fecha) {
  const progreso = Object.fromEntries(datos.filter(([clave]) => esClaveDelJuego(clave)));
  return JSON.stringify({ app: 'juego-mental', version: 1, fecha, datos: progreso });
}

// Texto del archivo → { clave: valor } solo con claves del juego y valores de texto. Si no es una copia válida, lanza un error.
export function leerCopia(texto) {
  let copia;
  try {
    copia = JSON.parse(texto);
  } catch {
    throw new Error('El archivo no es una copia de Juego Mental');
  }
  if (copia?.app !== 'juego-mental' || !copia.datos || typeof copia.datos !== 'object') {
    throw new Error('El archivo no es una copia de Juego Mental');
  }
  return Object.fromEntries(Object.entries(copia.datos).filter(([clave, valor]) => esClaveDelJuego(clave) && typeof valor === 'string'));
}
