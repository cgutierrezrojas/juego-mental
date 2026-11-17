// 🚢 Batalla naval en Mesa: colocar la flota, los dos tableros y, a dos en un celular, la pantalla de pasar el celular.
import { el as crear } from '../games/comun.js';
import { LADO, FLOTA, casillasDe, flotaAlAzar, girar, mover, vencedor } from '../games/naval.js';

// el() de comun solo admite texto: este además acepta hijos.
const el = (tag, clase = '', ...hijos) => { const e = crear(tag, clase); e.append(...hijos); return e; };

const RESPUESTA = { a: '🌊 Agua', t: '💥 ¡Tocado!' };
export const textoRespuesta = (r) => RESPUESTA[r] ?? `🔥 ¡Hundido! (barco de ${r.slice(1)})`;

// Pantalla de colocar: 🎲 al azar, tocar un barco lo gira, tocar barco y luego casilla lo mueve. Resuelve con la flota o null.
export function colocarFlota(contenedor, titulo) {
  return new Promise((resolver) => {
    let barcos = flotaAlAzar();
    let elegido = null;
    const pintar = (aviso = '') => {
      const dueno = new Map(barcos.flatMap((b, k) => casillasDe(b).map((i) => [i, k])));
      const rejilla = el('div', 'tablero-naval grande');
      for (let i = 0; i < LADO * LADO; i++) {
        const k = dueno.get(i);
        const b = el('button', `casilla-naval${k !== undefined ? ' barco' : ''}${k !== undefined && k === elegido ? ' elegido' : ''}`);
        b.setAttribute('aria-label', `Fila ${Math.floor(i / LADO) + 1}, columna ${(i % LADO) + 1}${k !== undefined ? `, barco de ${barcos[k].l}` : ''}`);
        b.onclick = () => {
          if (k !== undefined && k === elegido) { const g = girar(barcos, k); if (g) barcos = g; else return pintar('No cabe girado ahí.'); elegido = null; return pintar(); }
          if (k !== undefined) { elegido = k; return pintar('Toca una casilla para moverlo, o tócalo otra vez para girarlo.'); }
          if (elegido !== null) { const m = mover(barcos, elegido, i); if (m) { barcos = m; elegido = null; return pintar(); } return pintar('No cabe ahí (los barcos no pueden tocarse).'); }
        };
        rejilla.append(b);
      }
      const azar = el('button', '', '🎲 Al azar');
      azar.onclick = () => { barcos = flotaAlAzar(); elegido = null; pintar(); };
      const listo = el('button', 'color grande', '✅ Listo');
      listo.style.setProperty('--c', 'var(--verde)');
      listo.onclick = () => resolver(barcos);
      const cancelar = el('button', '', 'Cancelar');
      cancelar.onclick = () => resolver(null);
      contenedor.replaceChildren(el('h3', 'categoria', titulo), el('p', 'sin-datos', aviso || `Tu flota: ${FLOTA.join(', ')}. Los barcos no pueden tocarse.`), rejilla, el('div', 'fila-botones', azar, listo, cancelar));
    };
    pintar();
  });
}

function rejilla(tiros, barcos, clic) {
  const resp = new Map(tiros);
  const ocupadas = new Set((barcos ?? []).flatMap(casillasDe));
  const r = el('div', `tablero-naval${clic ? ' grande' : ''}`);
  for (let i = 0; i < LADO * LADO; i++) {
    const t = resp.get(i);
    const b = el(clic ? 'button' : 'span', `casilla-naval${ocupadas.has(i) ? ' barco' : ''}${t ? ` tiro-${t[0]}` : ''}`, t ? (t === 'a' ? '·' : '✕') : '');
    if (clic) {
      b.disabled = !!t || !clic.puedo;
      b.setAttribute('aria-label', `Fila ${Math.floor(i / LADO) + 1}, columna ${(i % LADO) + 1}${t ? `, ${textoRespuesta(t)}` : ''}`);
      b.onclick = () => clic.jugar(i);
    }
    r.append(b);
  }
  return r;
}

// Vista de quien mira: arriba la flota rival (donde disparas), abajo la tuya con los tiros recibidos.
export function tableroNaval({ partida, puedo, jugar }) {
  const e = partida.estado;
  const yo = partida.modo === 'local' ? e.turno : partida.yo;
  const rival = yo === 'x' ? 'o' : 'x';
  if (partida.modo === 'local' && partida.tapado && !vencedor(e)) {
    const ya = el('button', 'color grande', '👀 Ya lo tengo');
    ya.style.setProperty('--c', 'var(--verde)');
    ya.onclick = () => { partida.tapado = false; partida.repintar(); };
    return el('div', 'tapa-naval', el('p', '', partida.ultimoTexto ?? ''), el('h3', '', `📱 Pasa el celular a Jugador ${e.turno === 'x' ? 1 : 2}`), ya);
  }
  const misBarcos = e.barcos?.[yo] ?? partida.misBarcos;
  const ultimo = e.tiros[yo].at(-1);
  return el('div', 'naval',
    el('h3', 'categoria', '🎯 Flota rival'),
    rejilla(e.tiros[yo], vencedor(e) ? e.barcos?.[rival] ?? e.revelado?.[rival]?.barcos : null, { puedo, jugar }),
    el('p', 'sin-datos', ultimo ? `Tu último tiro: ${textoRespuesta(ultimo[1])}` : 'Toca una casilla para disparar.'),
    el('h3', 'categoria', '🚢 Tu flota'),
    rejilla(e.tiros[rival], misBarcos, null));
}
