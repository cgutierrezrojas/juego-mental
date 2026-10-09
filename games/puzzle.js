// Puzzle 3×3: ordena las fichas del 1 al 8 con los menos movimientos posibles. Sin límite de tiempo.
import { azar, el } from './comun.js';
import { destello, sonar } from './efectos.js';

export const RESUELTO = [1, 2, 3, 4, 5, 6, 7, 8, 0]; // 0 = hueco

// Casillas que tocan a la casilla i (arriba, abajo, izquierda, derecha) en el tablero 3×3.
function vecinas(i) {
  const v = [i - 3, i + 3];
  if (i % 3 > 0) v.push(i - 1);
  if (i % 3 < 2) v.push(i + 1);
  return v.filter((c) => c >= 0 && c < 9);
}

// Mueve la ficha de la casilla i al hueco. Devuelve un tablero nuevo, o null si no está junto al hueco.
export function mover(tablero, i) {
  const hueco = tablero.indexOf(0);
  if (!vecinas(hueco).includes(i)) return null;
  const nuevo = [...tablero];
  [nuevo[hueco], nuevo[i]] = [nuevo[i], nuevo[hueco]];
  return nuevo;
}

export const resuelto = (tablero) => tablero.every((v, i) => v === RESUELTO[i]);

// 100 movimientos válidos al azar desde el resuelto: siempre tiene solución.
export function barajarPuzzle(rnd = Math.random) {
  let tablero = RESUELTO;
  do {
    for (let k = 0; k < 100; k++) {
      const opciones = vecinas(tablero.indexOf(0));
      tablero = mover(tablero, opciones[azar(opciones.length, rnd)]);
    }
  } while (resuelto(tablero));
  return tablero;
}

export function start(pantalla, alTerminar) {
  let tablero = barajarPuzzle();
  let movimientos = 0;
  let terminado = false;
  let id;

  const contador = el('span', '', 'Movimientos: 0');
  const marcador = el('div', 'marcador');
  marcador.append(el('span', '', 'Ordena del 1 al 8'), contador);
  const rejilla = el('div', 'puzzle');
  pantalla.append(marcador, rejilla);

  function pintar() {
    rejilla.replaceChildren(...tablero.map((v, i) => {
      if (!v) return el('div', 'hueco');
      const b = el('button', 'grande color', v);
      b.style.setProperty('--c', 'var(--azul)');
      b.onclick = () => tocar(i, b);
      return b;
    }));
  }

  function tocar(i, boton) {
    if (terminado) return;
    const nuevo = mover(tablero, i);
    if (!nuevo) return destello(boton, false);
    tablero = nuevo;
    movimientos++;
    contador.textContent = `Movimientos: ${movimientos}`;
    sonar('tic');
    pintar();
    if (resuelto(tablero)) {
      terminado = true;
      sonar('acierto');
      id = setTimeout(() => alTerminar(movimientos), 600);
    }
  }

  pintar();
  return () => {
    terminado = true;
    clearTimeout(id);
  };
}
