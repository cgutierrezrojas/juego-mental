// 🪙 Fichas por desafíos y bono del día (reglas puras en games/premios.js).
import { guardar } from '../games/comun.js';
import { fechaLocal } from '../games/estadisticas.js';
import { premio, bono, hoyDe, ANUNCIO } from '../games/premios.js';
import { leerJSON } from './datos.js';

const NOMBRE = { tudia: 'completar Tu día', palabra: 'la palabra del día', diario: 'un nivel diario' };

// `cartas:fichas` = { fichas, max }; la primera vez salen de las que había en el 21.
export function leerFichas() {
  const v = leerJSON('cartas:21');
  return { fichas: v.fichas ?? 100, max: v.max ?? 100, ...leerJSON('cartas:fichas') };
}

function sumarFichas(n) {
  const f = leerFichas();
  f.fichas += n;
  f.max = Math.max(f.max, f.fichas);
  guardar('cartas:fichas', JSON.stringify({ fichas: f.fichas, max: f.max }));
}

// Apunta un desafío cumplido; devuelve el aviso («🪙 +50 fichas por la palabra del día») o '' si no da nada.
export function darPremio(tipo) {
  const { registro, fichas } = premio(leerJSON('cartas:premios'), tipo, fechaLocal());
  guardar('cartas:premios', JSON.stringify(registro));
  if (!fichas) return '';
  sumarFichas(fichas);
  return `🪙 +${fichas} fichas por ${NOMBRE[tipo]}`;
}

export function cobrarBono() {
  const { registro, fichas } = bono(leerJSON('cartas:premios'), fechaLocal());
  guardar('cartas:premios', JSON.stringify(registro));
  if (fichas) sumarFichas(fichas);
  return fichas;
}

export const desafiosDeHoy = () => hoyDe(leerJSON('cartas:premios'), fechaLocal());

export function cobrarAnuncio() {
  sumarFichas(ANUNCIO);
  return ANUNCIO;
}
