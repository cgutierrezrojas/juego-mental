// Fichas del casino (21 y Bacará) por desafíos del día y bono diario. Todo puro.
// Registro (`cartas:premios`): { fecha, ganadas, hechos: ['tudia', 'palabra'], diarios, bono: fecha en que se usó }.

export const MONTOS = { tudia: 100, palabra: 50, diario: 10 };
export const TOPE = 250; // fichas al día por desafíos (el bono va aparte)
export const TOPE_DIARIOS = 10; // niveles diarios que dan fichas cada día
export const BONO = 100;

// El registro de `fecha`: si es de otro día, empieza de cero (el bono guarda su propia fecha).
const delDia = (r, fecha) => (r?.fecha === fecha ? r : { fecha, ganadas: 0, hechos: [], diarios: 0, bono: r?.bono ?? null });

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

export function bono(registro, fecha) {
  const r = delDia(registro, fecha);
  return r.bono === fecha ? { registro: r, fichas: 0 } : { registro: { ...r, bono: fecha }, fichas: BONO };
}

// Lo de hoy, para la lista de desafíos.
export function hoyDe(registro, fecha) {
  const r = delDia(registro, fecha);
  return { tudia: r.hechos.includes('tudia'), palabra: r.hechos.includes('palabra'), diarios: r.diarios, ganadas: r.ganadas, bonoUsado: r.bono === fecha };
}
