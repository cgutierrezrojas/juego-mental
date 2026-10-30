// 🎴 Bacará (Punto y Banca): todo se reparte solo con la tabla de la tercera carta. Todo puro.
// Mano: { zapato, jugador: [cartas], banca: [cartas], ganador: 'jugador' | 'banca' | 'empate', motivos: [textos] }
import { baraja } from './cartas.js';
import { POCAS } from './veintiuno.js';

// As 1, del 2 al 9 su valor, 10 y figuras 0; solo cuenta la última cifra.
export const punto = (cartas) => cartas.reduce((s, c) => s + (c.v >= 10 ? 0 : c.v), 0) % 10;

// ¿Pide la banca? Si el jugador se plantó, como él (hasta 5); si pidió, según su tercera carta.
function bancaPide(b, tercera) {
  if (tercera === null) return b <= 5;
  const t = punto([tercera]);
  return b <= 2 || (b === 3 && t !== 8) || (b === 4 && t >= 2 && t <= 7) || (b === 5 && t >= 4 && t <= 7) || (b === 6 && (t === 6 || t === 7));
}

export function jugar(zapato, rnd = Math.random) {
  const z = zapato.length < POCAS ? baraja(rnd) : [...zapato];
  const jugador = [z.pop(), z.pop()];
  const banca = [z.pop(), z.pop()];
  const motivos = [];
  if (punto(jugador) >= 8 || punto(banca) >= 8) motivos.push(`¡Natural! ${punto(jugador) >= 8 ? 'El Jugador' : 'La Banca'} tiene ${Math.max(punto(jugador), punto(banca))}: nadie pide.`);
  else {
    let tercera = null;
    if (punto(jugador) <= 5) {
      motivos.push(`El Jugador tiene ${punto(jugador)}: pide carta.`);
      tercera = z.pop();
      jugador.push(tercera);
    } else motivos.push(`El Jugador tiene ${punto(jugador)}: se planta.`);
    const b = punto(banca);
    if (bancaPide(b, tercera)) {
      motivos.push(`La Banca tiene ${b}${tercera ? ` y el Jugador sacó un ${punto([tercera])}` : ''}: pide carta.`);
      banca.push(z.pop());
    } else motivos.push(`La Banca tiene ${b}: se planta.`);
  }
  const [j, b] = [punto(jugador), punto(banca)];
  return { zapato: z, jugador, banca, ganador: j > b ? 'jugador' : b > j ? 'banca' : 'empate', motivos };
}

// Fichas que te devuelven (la apuesta incluida): Jugador 1 a 1, Banca 1 a 1 menos 5 %, Empate 8 a 1; un empate devuelve las otras apuestas.
export function cobro(apuesta, a, ganador) {
  if (a === ganador) return apuesta + (a === 'jugador' ? apuesta : a === 'banca' ? Math.floor(apuesta * 0.95) : apuesta * 8);
  return ganador === 'empate' ? apuesta : 0;
}
