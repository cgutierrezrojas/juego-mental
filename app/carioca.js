// ♦️ Carioca en la pantalla: elegir la partida (clásica, corta o personalizada), la mesa con los juegos bajados y la mano.
// Las reglas están en games/carioca.js; los modos, turnos y la partida con amigos, en app/cartas-mesa.js.
import { el, guardar } from '../games/comun.js';
import * as C from '../games/carioca.js';
import * as R from '../games/rummy.js';
import { leerJSON } from './datos.js';
import { $ } from './ui.js';
import { naipe, boton, temblar } from './cartas.js';
import { fila } from './cartas-mesa.js';

// --- La partida: clásica, corta o personalizada (sus ajustes en `cartas:carioca-ajustes`) ---

let tipo = 'clasica';
const ajustes = () => {
  const a = leerJSON('cartas:carioca-ajustes');
  return { contratos: (a.contratos ?? C.CORTA).filter((id) => C.CONTRATOS[id]), comprar: !!a.comprar, comodin: !!a.comodin };
};
const guardarAjustes = (a) => guardar('cartas:carioca-ajustes', JSON.stringify(a));

function opciones() {
  const editor = el('div', 'editor-carioca');
  const pintarEditor = () => {
    if (tipo !== 'personalizada') {
      const lista = tipo === 'clasica' ? C.CLASICA : C.CORTA;
      return editor.replaceChildren(el('p', 'sin-datos', lista.map((id, i) => `${i + 1}. ${C.CONTRATOS[id].nombre}`).join(' · ')));
    }
    const a = ajustes();
    const rondas = el('ol', 'rondas-carioca');
    a.contratos.forEach((id, i) => {
      const li = el('li', '', C.CONTRATOS[id].nombre);
      const quitar = boton('✕', 'quitar-ronda', () => {
        const ahora = ajustes();
        ahora.contratos.splice(i, 1);
        guardarAjustes(ahora);
        pintarEditor();
      });
      quitar.setAttribute('aria-label', `Quitar la ronda ${i + 1}`);
      quitar.disabled = a.contratos.length <= 1;
      li.append(quitar);
      rondas.append(li);
    });
    const catalogo = el('div', 'catalogo-carioca');
    for (const [id, c] of Object.entries(C.CONTRATOS)) {
      const b = boton(`+ ${c.nombre}`, '', () => {
        const ahora = ajustes();
        ahora.contratos.push(id);
        guardarAjustes(ahora);
        pintarEditor();
      });
      b.disabled = a.contratos.length >= C.MAX_RONDAS;
      catalogo.append(b);
    }
    // Reglas extra: cada botón se prende y se apaga solo.
    const extras = el('div', 'opciones-ajuste');
    extras.setAttribute('role', 'group');
    extras.setAttribute('aria-label', 'Reglas extra');
    for (const [texto, clave] of [['🛒 Comprar', 'comprar'], ['🃏 Cambiar el comodín', 'comodin']]) {
      const b = boton(texto, '', () => {
        const nuevo = { ...ajustes(), [clave]: !ajustes()[clave] };
        guardarAjustes(nuevo);
        b.setAttribute('aria-pressed', String(nuevo[clave]));
      });
      b.setAttribute('aria-pressed', String(a[clave]));
      extras.append(b);
    }
    editor.replaceChildren(el('p', 'sin-datos', `Tus rondas (${a.contratos.length} de máximo ${C.MAX_RONDAS}):`), rondas, catalogo, extras,
      el('p', 'sin-datos', 'Comprar solo vale con 3 o 4 jugadores (contra 2 o 3 máquinas).'));
  };
  const tipos = fila('Partida', [['Clásica', 'Partida clásica', tipo === 'clasica', 'clasica'], ['Corta', 'Partida corta', tipo === 'corta', 'corta'], ['Personalizada', 'Partida personalizada', tipo === 'personalizada', 'personalizada']]
    .map(([t, etiqueta, elegido, id]) => [t, etiqueta, elegido, () => {
      tipo = id;
      pintarEditor();
    }]));
  pintarEditor();
  return [el('h3', 'categoria', '🎯 Partida'), tipos, editor];
}

// --- La mesa ---

let elegida = null; // índice en la mano de la carta tocada
let punta = null; // { k, opciones }: la carta cabe en las dos puntas de la escala `k` y hay que elegir
let previa = null; // índice de la forma de bajar que se está mostrando (null: ninguna)
let porNumero = false;
let visto = null; // el estado que se dibujó la última vez (al cambiar, se olvida lo elegido)

const ordenMano = (mano) => mano.map((c, i) => i).sort((a, b) => {
  const [x, y] = [mano[a], mano[b]];
  if (R.esComodin(x) !== R.esComodin(y)) return R.esComodin(x) ? 1 : -1;
  return porNumero ? x.v - y.v || x.p.localeCompare(y.p) : x.p.localeCompare(y.p) || x.v - y.v;
});

const filaJuego = (juego, chica = true) => {
  const caja = el('div', `cartas-juego-carioca${chica ? ' chica' : ''}`);
  caja.append(...juego.cartas.map((c) => naipe(c)));
  for (const n of caja.children) n.tabIndex = -1;
  return caja;
};

function pintar(e, quien, miTurno, actuar, { nombres, repintar }) {
  if (e !== visto) {
    elegida = null;
    previa = null;
    punta = null;
    visto = e;
  }
  const mano = e.manos[quien];
  const contrato = C.contrato(e);
  const tocarMesa = miTurno && e.fase === 'jugar' && e.bajados[quien] && !e.bajoAhora;

  const rivales = el('div', 'rivales-cartas');
  e.manos.forEach((m, i) => {
    if (i === quien) return;
    const r = el('div', `rival-cartas${e.turno === i ? ' turno' : ''}`);
    r.append(el('strong', '', nombres[i]), el('span', '', `🂠 ${m.length} · ${e.bajados[i] ? '✅ bajó' : 'sin bajar'} · ${e.puntos[i]} pts`));
    rivales.append(r);
  });

  // Juegos bajados: con una carta elegida, se iluminan los que la aceptan; tocarlos la agrega (o cambia el comodín).
  const mesa = el('div', 'mesa-carioca');
  if (!e.mesa.length) mesa.append(el('span', 'sin-datos', 'Todavía nadie bajó.'));
  e.mesa.forEach((juego, k) => {
    const c = elegida !== null ? mano[elegida] : null;
    const opciones = tocarMesa && c ? R.opcionesAgregar(juego, c) : [];
    const entra = opciones.length > 0;
    const cambia = tocarMesa && c && e.extras.comodin && R.cambiar(juego, c);
    const b = el('button', `juego-carioca${entra || cambia ? ' sirve' : ''}`);
    b.append(el('small', '', `${nombres[juego.dueno]} · ${R.NOMBRE_JUEGO[juego.tipo]}`), filaJuego(juego));
    b.setAttribute('aria-label', `${R.NOMBRE_JUEGO[juego.tipo]} de ${nombres[juego.dueno]}`);
    b.onclick = () => {
      if (opciones.length > 1) {
        punta = { k, opciones };
        return repintar();
      }
      if (entra) return actuar(C.agregar(e, elegida, k));
      if (cambia) return actuar(C.cambiar(e, elegida, k));
      temblar(b);
    };
    mesa.append(b);
  });

  const centro = el('div', 'centro-ocho centro-carioca');
  const robando = miTurno && e.fase === 'robar';
  const mazo = naipe(null, false);
  mazo.tabIndex = 0;
  mazo.setAttribute('aria-label', `Mazo (${e.mazo.length}): robar`);
  mazo.onclick = () => (robando && C.puedeRobar(e, 'mazo') ? actuar(C.robar(e, 'mazo')) : temblar(mazo));
  const arriba = e.pozo.at(-1);
  const pozo = arriba ? naipe(arriba) : el('div', 'hueco-carta', 'Pozo');
  pozo.setAttribute('aria-label', arriba ? `Pozo: tomar ${C.nombre(arriba)}` : 'Pozo vacío');
  pozo.onclick = () => (robando && arriba ? actuar(C.robar(e, 'pozo')) : temblar(pozo));
  centro.append(mazo, pozo);

  const manoCaja = el('div', 'mano-cartas mano-carioca');
  manoCaja.setAttribute('aria-label', 'Tus cartas');
  for (const i of ordenMano(mano)) {
    const n = naipe(mano[i]);
    if (i === elegida) n.classList.add('elegida');
    n.setAttribute('aria-pressed', String(i === elegida));
    n.onclick = () => {
      if (!miTurno || e.fase !== 'jugar') return temblar(n);
      elegida = elegida === i ? null : i;
      previa = null;
      punta = null;
      repintar();
    };
    manoCaja.append(n);
  }

  const ultimo = e.aviso ? `${nombres[e.aviso.j]}: ${e.aviso.t}. ` : '';
  let ayuda = `⏳ Turno de ${nombres[e.turno]}`;
  if (miTurno) {
    ayuda = {
      robar: '▶ Tu turno: roba del mazo o toma la del pozo',
      comprar: `▶ ¿Compras ${arriba ? C.nombre(arriba) : ''}? (te llevas además una del mazo)`,
      jugar: e.bajados[quien] ? (tocarMesa ? '▶ Agrega cartas a los juegos o bota una' : '▶ Bota una carta') : `▶ Baja ${contrato.nombre.toLowerCase()} o bota una carta`,
    }[e.fase];
  }
  const tapete = [rivales, mesa, centro, el('p', 'ultimo-cartas', ultimo + ayuda), manoCaja];

  const botones = [];
  if (miTurno && e.fase === 'robar') {
    botones.push(boton('🂠 Robar del mazo', 'color', () => actuar(C.robar(e, 'mazo'))));
    if (arriba) botones.push(boton(`Tomar ${C.nombre(arriba)}`, '', () => actuar(C.robar(e, 'pozo'))));
  }
  if (miTurno && e.fase === 'comprar') botones.push(boton(`🛒 Comprar ${C.nombre(arriba)}`, 'color', () => actuar(C.comprar(e, true))), boton('No compro', '', () => actuar(C.comprar(e, false))));
  if (miTurno && e.fase === 'jugar' && punta) {
    // La carta (un comodín) cabe en las dos puntas: se elige dónde y ahí se queda.
    const { k, opciones } = punta;
    const juego = e.mesa[k];
    const valor = (o) => {
      const v = o.lado === 'abajo' ? o.juego.inicio : R.valorEn(juego.inicio, juego.cartas.length);
      return C.nombre({ v, p: juego.cartas.find((x) => !R.esComodin(x)).p });
    };
    tapete.splice(tapete.length - 1, 0, el('p', 'turno-trivia', `¿Dónde pones ${C.nombre(mano[elegida])}?`));
    for (const o of opciones) botones.push(boton(`${o.lado === 'abajo' ? '⬅️' : '➡️'} ${C.nombre(mano[elegida])} como ${valor(o)}`, 'color', () => actuar(C.agregar(e, elegida, k, Math.random, o.lado))));
    botones.push(boton('Cancelar', '', () => {
      punta = null;
      repintar();
    }));
  } else if (miTurno && e.fase === 'jugar') {
    const formas = previa !== null ? C.formasDeBajar(e) : [];
    const puede = !e.bajados[quien] && C.puedeBajar(e);
    if (puede && formas[previa]) {
      const titulo = formas.length > 1 ? `Así bajarías (forma ${previa + 1} de ${formas.length}):` : 'Así bajarías:';
      tapete.splice(tapete.length - 1, 0, el('p', 'turno-trivia', titulo), ...formas[previa].juegos.map((j) => filaJuego(j, false)));
      botones.push(boton('✅ Bajar', 'color', () => actuar(C.bajar(e, Math.random, previa))));
      if (formas.length > 1) botones.push(boton('🔄 Otra forma', '', () => {
        previa = (previa + 1) % formas.length;
        repintar();
      }));
      botones.push(boton('Cancelar', '', () => {
        previa = null;
        repintar();
      }));
    } else {
      if (puede) botones.push(boton(`⬇️ Bajar ${contrato.nombre.toLowerCase()}`, 'color', () => {
        previa = 0;
        repintar();
      }));
      const botar = boton(elegida !== null ? `🗑️ Botar ${C.nombre(mano[elegida])}` : '🗑️ Botar (elige una carta)', '', () => actuar(C.botar(e, elegida)));
      botar.disabled = elegida === null;
      botones.push(botar);
    }
  }
  botones.push(boton(porNumero ? 'Ordenar por palo' : 'Ordenar por número', '', () => {
    porNumero = !porNumero;
    repintar();
  }));

  return {
    marcador: [el('span', '', `♦️ ${e.ronda}/${e.contratos.length}: ${contrato.nombre}`), el('span', '', `${nombres[quien]}: ${e.puntos[quien]} pts`)],
    tapete,
    botones,
  };
}

function resumen(e, nombres) {
  const r = e.resumen;
  const tabla = el('table', 'tabla-escoba');
  const filaT = (celdas, tag = 'td') => {
    const tr = el('tr');
    tr.append(...celdas.map((c) => el(tag, '', String(c))));
    return tr;
  };
  tabla.append(filaT(['', 'Ronda', 'Total'], 'th'), ...nombres.map((n, i) => filaT([n, `+${r.sumas[i]}`, e.puntos[i]])));
  const quien = r.j === null ? 'Nadie ganó la ronda: el mazo se acabó 3 veces.' : `${nombres[r.j] === 'Tú' ? '🎉 Ganaste' : `Gana ${nombres[r.j]}`} la ronda ${r.ronda}`;
  return [el('p', 'turno-trivia', quien), tabla, el('p', 'sin-datos', 'Gana la partida quien termina con menos puntos.')];
}

export const CARIOCA = {
  id: 'carioca', nombre: 'Carioca', icono: '♦️', maxMaquinas: 3, menosGana: true, pausa: 500,
  meta: (e) => e.contratos.length,
  metaTexto: (e) => `${e.contratos.length} rondas`,
  reglas: 'Dos barajas y 4 comodines, 12 cartas. En tu turno robas (del mazo o la del pozo), bajas el contrato de la ronda cuando lo tienes (tríos: justo 3 del mismo número; escalas: justo 4 seguidas del mismo palo, pueden dar la vuelta por el As; con «🔄 Otra forma» eliges cuáles y dónde va el comodín), desde el turno siguiente agregas a los juegos de la mesa (tuyos o de otros; las escalas crecen por las puntas) y botas una. El comodín se queda donde lo pones. Gana la ronda quien se queda sin cartas; los demás suman lo que tienen (As 20, figuras 10, comodín 30). Gana quien termina con menos puntos.',
  nueva: (n) => C.nueva(n, tipo === 'clasica' ? {} : tipo === 'corta' ? { contratos: C.CORTA } : ajustes()),
  maquina: (e, nv) => C.accion(e, C.maquina(e, nv)),
  opciones,
  pintar,
  resumen,
};
