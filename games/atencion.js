// Atención (Stroop): toca el color de la TINTA, no lo que dice la palabra. 60 segundos.
import { azar, barajar, el, temporizador, pintarReloj } from './comun.js';
import { destello } from './efectos.js';

export const COLORES = [
  { nombre: 'ROJO', css: 'var(--rojo)' },
  { nombre: 'AZUL', css: 'var(--azul)' },
  { nombre: 'VERDE', css: 'var(--verde)' },
  { nombre: 'AMARILLO', css: 'var(--amarillo)' },
];

// Palabra y tinta se eligen por separado, así coinciden 1 de cada 4 veces.
export function generarRonda(rnd = Math.random) {
  return { palabra: azar(COLORES.length, rnd), tinta: azar(COLORES.length, rnd) };
}

export function puntuacion(aciertos, errores) {
  return Math.max(0, aciertos - errores);
}

// `opciones.modo`: 'normal' (60 s), 'rapido' (30 s) o 'sinfallo' (sin reloj; el primer fallo termina).
// `opciones.dificultad`: 'facil' (los errores no restan), 'normal' o 'dificil' (los botones cambian de orden en cada ronda).
export function start(pantalla, alTerminar, opciones = {}) {
  const { modo = 'normal', dificultad = 'normal' } = opciones;
  let aciertos = 0;
  let errores = 0;
  let ronda;
  let terminado = false;
  let id;

  const tiempo = el('span');
  const puntos = el('span', '', 'Puntos: 0');
  const marcador = el('div', 'marcador');
  marcador.append(tiempo, puntos);
  const enunciado = el('div', 'enunciado');
  const rejilla = el('div', 'rejilla');
  const botones = COLORES.map((c, i) => {
    const b = el('button', 'grande color', c.nombre);
    b.style.setProperty('--c', c.css);
    b.onclick = () => responder(i);
    return b;
  });
  rejilla.append(...botones);
  pantalla.append(marcador, enunciado, rejilla);

  let reloj = null;
  if (modo === 'sinfallo') tiempo.textContent = '❌ Hasta fallar';
  else reloj = temporizador(modo === 'rapido' ? 30 : 60, (s) => pintarReloj(tiempo, s), () => alTerminar(puntuacion(aciertos, errores)));

  function nueva() {
    ronda = generarRonda();
    enunciado.textContent = COLORES[ronda.palabra].nombre;
    enunciado.style.color = COLORES[ronda.tinta].css;
    if (dificultad === 'dificil') rejilla.replaceChildren(...barajar(botones));
  }

  function responder(i) {
    if (terminado) return;
    const ok = i === ronda.tinta;
    destello(enunciado, ok);
    if (ok) aciertos++;
    else if (dificultad !== 'facil') errores++;
    puntos.textContent = `Puntos: ${puntuacion(aciertos, errores)}`;
    if (!ok && modo === 'sinfallo') {
      terminado = true;
      id = setTimeout(() => alTerminar(puntuacion(aciertos, errores)), 600);
      return;
    }
    nueva();
  }

  nueva();
  return () => {
    terminado = true;
    clearTimeout(id);
    reloj?.parar();
  };
}
