// 🥤 Cacho en la pantalla: tu cacho (un toque tapa o destapa tus dados), los cachos de los demás, la apuesta vigente y el selector de apuesta.
// Las reglas y la máquina están en games/cacho.js; los modos, turnos y la pantalla de pasar el celular, en app/cartas-mesa.js.
import { el } from '../games/comun.js';
import * as C from '../games/cacho.js';
import { PINTAS } from '../games/dados.js';
import { boton } from './cartas.js';
import { dado } from './dados.js';

// Con el nombre «Tú» el verbo va en segunda persona: yo(nombre, 'pierdes', 'pierde').
const yo = (nombre, tu, otro) => (nombre === 'Tú' ? tu : otro);
const nomPinta = (n) => PINTAS[n - 1].nombre;

// La máquina decide con su nivel; si algo fallara (no debería), duda o apuesta la mínima.
function maquina(e, nivel) {
  return C.accion(e, C.maquina(e, nivel, Math.random)) ?? C.dudar(e) ?? C.apostar(e, C.apuestaMinima(e));
}

// Estado de la pantalla (solo vive aquí): dados tapados y apuesta elegida; se reinician en cada turno nuevo.
let ui = { clave: '', tapado: false, n: 1, pinta: 2 };

// Siguiente cantidad (con paso 1 o -1) que admite alguna pinta válida; la pinta se conserva si sigue valiendo.
function mover(e, paso) {
  for (let n = ui.n + paso; n >= 1 && n <= C.totalDados(e); n += paso) {
    const ok = PINTAS.map((p) => p.n).filter((pinta) => C.esValida(e, { n, pinta }));
    if (ok.length) { ui.n = n; if (!ok.includes(ui.pinta)) ui.pinta = ok[0]; return; }
  }
}

function pintar(e, quien, miTurno, actuar, { nombres, repintar }) {
  const clave = `${e.ronda}:${e.turno}:${e.apuestas.length}:${quien}`;
  if (ui.clave !== clave) {
    const m = C.apuestaMinima(e) ?? { n: 1, pinta: 2 };
    ui = { clave, tapado: false, n: m.n, pinta: m.pinta };
  }
  const nombre = nombres[e.turno];

  // Los cachos de los demás: solo cuántos dados tienen.
  const rivales = el('div', 'rivales-cacho');
  e.jugadores.forEach((j, i) => {
    if (i === quien) return;
    const r = el('div', `rival-cacho${i === e.turno ? ' turno' : ''}`);
    r.append(el('strong', '', nombres[i]));
    const fila = el('span', 'fila-dados');
    for (let k = 0; k < j.dados.length; k++) fila.append(dado(1, 'tapado mini'));
    if (!j.dados.length) fila.append(el('small', '', 'fuera'));
    r.append(fila);
    rivales.append(r);
  });

  // Mi cacho: un toque lo tapa o lo destapa.
  const mio = el('button', 'cacho-mio');
  mio.setAttribute('aria-label', ui.tapado ? 'Tus dados tapados: toca para destapar' : 'Tus dados: toca para taparlos');
  e.jugadores[quien].dados.forEach((d) => mio.append(ui.tapado ? dado(d, 'tapado') : dado(d)));
  if (!e.jugadores[quien].dados.length) mio.append(el('small', '', 'Sin dados'));
  mio.onclick = () => { ui.tapado = !ui.tapado; repintar(); };

  const ap = e.apuesta;
  const apuesta = el('div', 'apuesta-cacho');
  if (ap) apuesta.append(el('small', '', ap.de === quien ? 'Tu apuesta' : `Apuesta de ${nombres[ap.de]}`), el('strong', '', `${ap.n} ×`), dado(ap.pinta), el('span', '', nomPinta(ap.pinta)));
  else apuesta.append(el('small', '', 'Nadie ha apostado: abre la ronda'));

  const aviso = e.obligo !== null
    ? el('p', 'aviso-obligo', `¡Obligo! ${nombres[e.obligo]} ${yo(nombres[e.obligo], 'juegas', 'juega')} con un solo dado: pinta fija, los ases no son comodín.`)
    : el('p', 'ultimo-cartas', miTurno ? `▶ ${nombre === 'Tú' ? 'Tu turno' : `Turno de ${nombre}`}` : `⏳ Turno de ${nombre}`);

  const tapete = [rivales, el('p', 'sin-datos', `Tus dados (toca para ${ui.tapado ? 'destapar' : 'tapar'})`), mio, apuesta, aviso];
  const botones = [];
  if (miTurno) {
    const cant = el('div', 'selector-cacho');
    const menos = boton('−', '', () => { mover(e, -1); repintar(); });
    const mas = boton('+', '', () => { mover(e, 1); repintar(); });
    menos.setAttribute('aria-label', 'Menos');
    mas.setAttribute('aria-label', 'Más');
    cant.append(menos, el('strong', '', String(ui.n)), mas);
    const pintas = el('div', 'pintas-cacho');
    PINTAS.forEach((p) => {
      const b = el('button', `pinta-cacho${ui.pinta === p.n ? ' elegida' : ''}`);
      b.append(dado(p.n));
      b.setAttribute('aria-label', p.nombre);
      b.disabled = !C.esValida(e, { n: ui.n, pinta: p.n });
      b.onclick = () => { ui.pinta = p.n; repintar(); };
      pintas.append(b);
    });
    tapete.push(cant, pintas);
    botones.push(boton(`⬆ Subir a ${ui.n} × ${nomPinta(ui.pinta)}`, 'color', () => actuar(C.apostar(e, { n: ui.n, pinta: ui.pinta }))));
    if (ap) {
      botones.push(boton('🤨 Dudo', '', () => actuar(C.dudar(e))));
      const calzo = boton('🎯 Calzo', '', () => actuar(C.calzar(e)));
      calzo.disabled = !C.calzar(e);
      botones.push(calzo);
    }
  }
  return { marcador: [el('span', '', '🥤 Cacho'), el('span', '', `${nombres[quien]}: ${e.jugadores[quien].dados.length} 🎲`)], tapete, botones };
}

// Fin de ronda: todos los dados destapados, los que cuentan resaltados.
function resumen(e, nombres) {
  const r = e.resumen, cuenta = (d) => d === r.apuesta.pinta || (!r.obligo && r.apuesta.pinta !== 1 && d === 1);
  const cab = el('p', 'turno-trivia', `${nombres[r.por]} ${r.tipo === 'dudo' ? yo(nombres[r.por], 'dudas', 'duda') : yo(nombres[r.por], 'calzas', 'calza')}: ${r.apuesta.n} × ${nomPinta(r.apuesta.pinta)}`);
  const cuantos = el('p', 'ultimo-cartas', `Había ${r.total}${r.obligo ? ' (obligo: sin comodín)' : ''}.`);
  const quien = nombres[r.quien];
  const efecto = el('p', 'turno-trivia', r.delta < 0 ? `${quien} ${yo(quien, 'pierdes', 'pierde')} un dado` : r.delta > 0 ? `🎯 ${yo(quien, '¡Calzaste!', '¡Calzó!')} ${quien} ${yo(quien, 'ganas', 'gana')} un dado` : `🎯 ${yo(quien, '¡Calzaste!', '¡Calzó!')} ${quien} ${yo(quien, 'ya tienes', 'ya tiene')} 5 dados`);
  const lista = el('div', 'rivales-cacho');
  r.dados.forEach((ds, i) => {
    const f = el('div', 'rival-cacho');
    f.append(el('strong', '', nombres[i]));
    const fila = el('span', 'fila-dados');
    ds.forEach((d) => fila.append(dado(d, `mini${cuenta(d) ? ' cuenta' : ''}`)));
    if (!ds.length) fila.append(el('small', '', 'fuera'));
    f.append(fila);
    lista.append(f);
  });
  return [cab, lista, cuantos, efecto];
}

export const CACHO = {
  id: 'cacho', nombre: 'Cacho', icono: '🥤', seccion: 'dados', niveles: ['facil', 'normal', 'dificil'], maxMaquinas: 5, maxLocal: 6, pausa: 1100,
  verTexto: '▶ Ya lo tengo',
  reglas: 'Cada uno tiene 5 dados bajo su cacho. Por turnos se apuesta cuántos dados de una pinta hay entre todos y se sube la apuesta (más dados, o los mismos con una pinta mayor). Los ases son comodines. Si no crees la apuesta anterior, dudas: quien se equivoca pierde un dado. Calzar es decir que la apuesta es exacta: si aciertas ganas un dado (hasta 5). Con un solo dado, una vez, se juega «obligo». Gana el último con dados.',
  nueva: (n) => { ui.clave = ''; return C.nueva(n); }, // partida nueva: sin tapado ni selector de la anterior
  maquina,
  pintar,
  resumen,
  metaTexto: (e) => `${C.totalDados(e)} dados en juego`,
  puntos: (e) => e.jugadores.map((j) => j.dados.length),
  // Con un amigo (app/dados-amigo.js): en la mesa solo está cuántos dados tiene cada uno; los míos se calculan aquí
  // con mi semilla (q.misDados) y se revelan solos al dudar o calzar.
  amigo: {
    M: C,
    mios: true,
    limpiar: C.ocultar,
    async auto(e, misDados) {
      if (e.k < e.ronda) return C.empezarRonda(e);
      if (!e.revelar || e.revelar.dados[e.turno]) return null;
      const d = await misDados(e.k, e.jugadores[e.turno].dados.length);
      return d && C.revelar(e, d);
    },
    vista: (q) => (q.misDados?.k === q.e.k ? { ...q.e, jugadores: q.e.jugadores.map((j, i) => (i === q.yo ? { ...j, dados: q.misDados.d } : j)) } : q.e),
  },
};
