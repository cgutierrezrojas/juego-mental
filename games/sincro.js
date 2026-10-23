// Nube: cuándo subir o bajar el progreso, y qué se publica en el ranking. Todo puro.
import { esClaveDelJuego } from './copia.js';

// Rango permitido de cada récord (Normal·Normal) en el ranking; lo mismo comprueban las reglas de Firestore.
export const LIMITES = {
  calculo: [1, 300], mayor: [1, 300], distinto: [1, 300], series: [1, 300], sobra: [1, 300], balanza: [1, 300],
  atencion: [1, 300], topos: [1, 300], memoria: [1, 100], puzzle: [1, 10000], rayo: [80, 5000], parejas: [6, 1000],
};

const DE_PROGRESO = ['record:', 'historial:', 'estrellas:', 'niveles:', 'diarios:'];

// ¿Hay progreso de verdad (no solo ajustes o avisos vistos)? `datos`: { clave: valor }.
export const tieneProgreso = (datos) => Object.keys(datos).some((clave) => DE_PROGRESO.some((p) => clave.startsWith(p)));

// Qué hacer al tener sesión: 'subir', 'bajar', 'preguntar' o 'nada'.
// `vinculado`: este celular ya sincronizó con esta cuenta; `cambioLocal` y `actualizadoNube`: ms del último cambio.
export function decidirSincro({ hayLocal, hayNube, vinculado, cambioLocal, actualizadoNube }) {
  if (!hayNube) return hayLocal ? 'subir' : 'nada';
  if (!hayLocal) return 'bajar';
  if (!vinculado) return 'preguntar';
  if (actualizadoNube > cambioLocal) return 'bajar';
  if (cambioLocal > actualizadoNube) return 'subir';
  return 'nada';
}

// Lo que se publica en el ranking: total de ⭐ (niveles + diarios) y récords Normal·Normal dentro de sus límites.
export function datosRanking(datos) {
  let estrellas = 0;
  const records = {};
  const lista = (texto) => {
    try {
      const valor = JSON.parse(texto);
      return valor && typeof valor === 'object' ? valor : null;
    } catch {
      return null;
    }
  };
  const suma = (numeros) => (Array.isArray(numeros) ? numeros.reduce((s, e) => s + (Number(e) || 0), 0) : 0);
  for (const [clave, valor] of Object.entries(datos)) {
    if (!esClaveDelJuego(clave)) continue;
    const [tipo, id, ...resto] = clave.split(':');
    if (tipo === 'estrellas') estrellas += suma(lista(valor));
    if (tipo === 'diarios') for (const dia of Object.values(lista(valor) ?? {})) estrellas += suma(dia?.estrellas);
    if (tipo === 'record' && !resto.length && id in LIMITES) {
      const n = Number(valor);
      const [min, max] = LIMITES[id];
      if (Number.isInteger(n) && n >= min && n <= max) records[id] = n;
    }
  }
  return { estrellas, records };
}
