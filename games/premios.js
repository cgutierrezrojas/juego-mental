// Fichas del casino (21 y Bacará) por desafíos del día. Todo puro.
// Registro (`cartas:premios`): { fecha, ganadas, hechos: ['tudia', 'palabra'], diarios }.

export const MONTOS = { tudia: 100, palabra: 50, diario: 10, arcadedia: 30 };
export const TOPE = 250; // fichas al día por desafíos
export const TOPE_DIARIOS = 10; // niveles diarios que dan fichas cada día
export const ANUNCIO = 100; // por ver un anuncio con premio (solo en la app)

// El registro de `fecha`: si es de otro día, empieza de cero .
const delDia = (r, fecha) => (r?.fecha === fecha ? r : { fecha, ganadas: 0, hechos: [], diarios: 0 });

// Premio por un desafío cumplido: lo que cabe hasta el tope, una vez al día (los diarios, hasta TOPE_DIARIOS).
export function premio(registro, tipo, fecha) {
  const r = delDia(registro, fecha);
  const diario = tipo === 'diario';
  if (diario ? r.diarios >= TOPE_DIARIOS : r.hechos.includes(tipo)) return { registro: r, fichas: 0 };
  const fichas = Math.max(0, Math.min(MONTOS[tipo], TOPE - r.ganadas));
  return {
    registro: { ...r, ganadas: r.ganadas + fichas, hechos: diario ? r.hechos : [...r.hechos, tipo], diarios: r.diarios + (diario ? 1 : 0) },
    fichas,
  };
}

// Lo de hoy, para la lista de desafíos.
export function hoyDe(registro, fecha) {
  const r = delDia(registro, fecha);
  return { tudia: r.hechos.includes('tudia'), palabra: r.hechos.includes('palabra'), diarios: r.diarios, ganadas: r.ganadas };
}
