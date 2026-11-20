// ⚔️ Truco en la pantalla: el rival, las bazas jugadas (rival arriba, tú abajo), tu mano (tocar una carta la juega) y los
// botones de cantos y respuestas. Las reglas y la máquina están en games/truco.js; los modos y turnos, en app/cartas-mesa.js.
import { el } from '../games/comun.js';
import * as T from '../games/truco.js';
import { CREDITO } from '../games/escoba.js';
import { boton, temblar } from './cartas.js';
import { naipeEs } from './cartas-mesa.js';

// A 24: las primeras 12 son «malas» y las otras 12 «buenas» (los puntos pueden pasar de 24 al final; se topan).
const tope = (x) => Math.min(x, T.META);
const malasBuenas = (x) => {
  const [n, t] = tope(x) <= 12 ? [tope(x), 'mala'] : [tope(x) - 12, 'buena'];
  return `${n} ${t}${n === 1 ? '' : 's'}`;
};

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function nombreAccion(a, e) {
  if (a.quiero !== undefined) return a.quiero ? 'Quiero' : 'No quiero';
  if (a.mazo) return 'Irse al mazo';
  // Con un truco esperando, cantar envido es «el envido está primero».
  if (a.canto === 'envido' && e.truco.pendiente && e.envido.estado === null) return 'Envido (está primero)';
  return T.CANTOS[a.canto];
}

function pintar(e, quien, miTurno, actuar, { nombres }) {
  const otro = 1 - quien;
  const ops = miTurno ? T.acciones(e) : [];
  const jugar = (a) => actuar(T.accion(e, a));

  const rival = el('div', `rival-cartas${e.turno === otro ? ' turno' : ''}`);
  rival.append(el('strong', '', nombres[otro]), el('span', '', `🂠 ${e.manos[otro].length} · ${malasBuenas(e.puntos[otro])}`));

  const bazas = el('div', 'bazas-truco');
  bazas.setAttribute('aria-label', 'Bazas');
  e.bazas.forEach((b, i) => {
    const caja = el('div', 'baza-truco');
    const carta = (c) => (c ? naipeEs(c) : el('div', 'hueco-carta'));
    const gana = b.gana === null ? '' : b.gana === 'parda' ? '🤝 Parda' : `✔ ${nombres[b.gana]}`;
    caja.append(el('small', '', `Baza ${i + 1}`), carta(b.c[otro]), carta(b.c[quien]), el('small', b.gana === quien ? 'gana-truco' : '', gana));
    caja.querySelectorAll('.naipe').forEach((n) => (n.tabIndex = -1));
    bazas.append(caja);
  });

  const mano = el('div', 'mano-cartas mano-truco');
  mano.setAttribute('aria-label', 'Tus cartas');
  e.manos[quien].forEach((c, i) => {
    const n = naipeEs(c);
    n.onclick = () => (ops.some((a) => igual(a, { carta: i })) ? jugar({ carta: i }) : temblar(n));
    mano.append(n);
  });

  const ultimo = e.aviso ? `${nombres[e.aviso.j]}: ${e.aviso.t}. ` : '';
  const cantado = e.envido.estado === 'pendiente' ? T.CANTOS[e.envido.cantos.at(-1)] : e.truco.pendiente ? T.CANTOS[['truco', 'retruco', 'vale4'][e.truco.cantado - 1]] : null;
  let ayuda = `⏳ Turno de ${nombres[e.turno]}`;
  if (miTurno) ayuda = cantado ? `▶ Te cantaron ${cantado}: responde` : `▶ Tu turno: juega una carta${ops.some((a) => a.canto) ? ' o canta' : ''}`;

  const botones = ops.filter((a) => a.carta === undefined).map((a) => boton(nombreAccion(a, e), a.quiero || a.canto ? 'color' : '', () => jugar(a)));
  // Quién es mano, lo querido del truco y los tantos del envido, si ya se jugó.
  const info = [`Mano: ${nombres[e.mano]}`];
  if (e.truco.nivel) info.push(`${T.CANTOS[['truco', 'retruco', 'vale4'][e.truco.nivel - 1]]} querido`);
  if (e.envido.tantos) info.push(`Envido: ${nombres[quien]} ${e.envido.tantos[quien]}, ${nombres[otro]} ${e.envido.tantos[otro]}`);

  return {
    marcador: [el('span', '', `⚔️ Ronda ${e.ronda}`), el('span', '', `${nombres[quien]}: ${malasBuenas(e.puntos[quien])}`)],
    tapete: [rival, bazas, el('p', 'sin-datos', info.join(' · ')), el('p', 'ultimo-cartas', ultimo + ayuda), mano],
    botones,
  };
}

function resumen(e, nombres) {
  const r = e.resumen;
  const para = (j) => (nombres[j] === 'Tú' ? 'ti' : nombres[j]);
  const lineas = r.lineas.map((l) => el('p', 'fila-chinchon', `${l.t} para ${para(l.j)}`));
  const van = e.puntos.map((x, j) => `${nombres[j]}: ${malasBuenas(x)}`).join(' · ');
  return [el('p', 'turno-trivia', `⚔️ Fin de la ronda ${r.ronda}`), ...lineas, el('p', 'sin-datos', van)];
}

export const TRUCO = {
  id: 'truco', nombre: 'Truco', icono: '⚔️', maxMaquinas: 1,
  niveles: ['facil', 'normal', 'dificil'],
  meta: () => T.META,
  metaTexto: () => 'A 24 puntos',
  credito: CREDITO,
  reglas: 'Truco chileno, 1 contra 1, baraja española de 40 y 3 cartas cada uno. Se juegan hasta 3 bazas: gana la ronda quien gana 2. De mayor a menor: 1 de espadas, 1 de bastos, 7 de espadas, 7 de oros, los 3, los 2, 1 de copas y de oros, reyes, caballos, sotas, 7 de copas y de bastos, 6, 5 y 4. En la primera baza se puede cantar Envido (2), Real envido (3) o Falta envido: gana el de más tanto (dos del mismo palo: 20 + sus números; figuras 0). En cualquier momento, Truco (2), Retruco (3) y Vale cuatro (4); lo no querido da al que cantó el valor anterior. Gana el primero en llegar a 24 (12 malas y 12 buenas).',
  nueva: () => T.nueva(),
  maquina: (e, nv) => T.accion(e, T.maquina(e, nv)),
  puntos: (e) => e.puntos.map(tope),
  pintar,
  resumen,
};
