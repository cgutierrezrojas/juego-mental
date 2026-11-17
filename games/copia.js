// Copia de seguridad del progreso: qué claves son del juego y cómo se escribe y se lee el archivo. Todo puro.

// El dominio (cgutierrezrojas.github.io) lo comparten otras webs: solo se copian las claves con estos prefijos.
const PREFIJOS = ['record:', 'historial:', 'estrellas:', 'niveles:', 'diarios:', 'eleccion:', 'ajuste:', 'contador:', 'ayuda:', 'logros:', 'duelos:', 'liga:', 'mesa:', 'trivia:', 'cartas:', 'arcade:', 'palabra:', 'perfil:', 'naval:'];

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
    throw new Error("El archivo no es una copia de Pa'l Rato");
  }
  if (copia?.app !== 'juego-mental' || !copia.datos || typeof copia.datos !== 'object') {
    throw new Error("El archivo no es una copia de Pa'l Rato");
  }
  return Object.fromEntries(Object.entries(copia.datos).filter(([clave, valor]) => esClaveDelJuego(clave) && typeof valor === 'string'));
}

// Lo que queda guardado al restaurar `nuevos` (copia o nube) sobre `actuales` (ambos { clave: valor }).
// Las flotas de 🚢 Batalla naval con amigos (`naval:<id>`) que ya están en este celular no se tocan; las que llegan de
// fuera se guardan sin `hist`: puede ser de un turno ya pasado y haría ver trampa a un rival honesto (sin él solo se
// revisan sus respuestas y, al final, lo que revela).
export function restaurado(actuales, nuevos) {
  const esNaval = (clave) => clave.startsWith('naval:');
  const r = Object.fromEntries(Object.entries(actuales).filter(([clave]) => esNaval(clave)));
  for (const [clave, valor] of Object.entries(nuevos)) {
    if (!esNaval(clave)) r[clave] = valor;
    else if (!(clave in r)) {
      try {
        const { hist, ...flota } = JSON.parse(valor);
        if (flota.barcos) r[clave] = JSON.stringify(flota);
      } catch {
        // flota rota: no se trae
      }
    }
  }
  return r;
}
