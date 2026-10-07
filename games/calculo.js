// Cálculo: 60 segundos para resolver operaciones eligiendo entre 4 respuestas.
import { azar, barajar, el, destello, temporizador } from './comun.js';

const entre = (min, max, rnd) => min + azar(max - min + 1, rnd);

function suma(max, rnd) {
  const a = entre(1, max, rnd);
  const b = entre(1, max, rnd);
  return { texto: `${a} + ${b}`, resultado: a + b };
}

function resta(max, rnd) {
  const a = entre(1, max, rnd);
  const b = entre(1, a, rnd); // b <= a, así el resultado nunca es negativo
  return { texto: `${a} − ${b}`, resultado: a - b };
}

function multiplicacion(min, max, rnd) {
  const a = entre(min, max, rnd);
  const b = entre(min, max, rnd);
  return { texto: `${a} × ${b}`, resultado: a * b };
}

// La dificultad sube con los aciertos de la partida.
export function generarOperacion(aciertos, rnd = Math.random) {
  const tipos =
    aciertos < 5 ? [() => suma(10, rnd)] :
    aciertos < 10 ? [() => suma(20, rnd), () => resta(20, rnd)] :
    aciertos < 15 ? [() => suma(20, rnd), () => resta(20, rnd), () => multiplicacion(2, 9, rnd)] :
    [() => suma(100, rnd), () => resta(100, rnd), () => multiplicacion(2, 12, rnd)];
  return tipos[azar(tipos.length, rnd)]();
}

// La correcta y 3 distractores a ±5 como mucho, distintos y no negativos, en orden aleatorio.
export function generarOpciones(resultado, rnd = Math.random) {
  const cercanos = [];
  for (let d = -5; d <= 5; d++) {
    if (d !== 0 && resultado + d >= 0) cercanos.push(resultado + d);
  }
  return barajar([resultado, ...barajar(cercanos, rnd).slice(0, 3)], rnd);
}

export function start(pantalla, alTerminar) {
  let aciertos = 0;
  let operacion;

  const tiempo = el('span');
  const puntos = el('span', '', 'Aciertos: 0');
  const marcador = el('div', 'marcador');
  marcador.append(tiempo, puntos);
  const enunciado = el('div', 'enunciado');
  const rejilla = el('div', 'rejilla');
  pantalla.append(marcador, enunciado, rejilla);

  const reloj = temporizador(60, (s) => { tiempo.textContent = `⏱ ${s}`; }, () => alTerminar(aciertos));

  function nueva() {
    operacion = generarOperacion(aciertos);
    enunciado.textContent = operacion.texto;
    rejilla.replaceChildren(...generarOpciones(operacion.resultado).map((n) => {
      const b = el('button', 'grande', n);
      b.onclick = () => responder(n);
      return b;
    }));
  }

  function responder(n) {
    const ok = n === operacion.resultado;
    destello(enunciado, ok);
    if (ok) {
      aciertos++;
      puntos.textContent = `Aciertos: ${aciertos}`;
    } else {
      reloj.restar(3);
    }
    nueva();
  }

  nueva();
}
