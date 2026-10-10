// Juegos de 4 opciones (Cálculo, Series, ¿Cuál sobra?): 60 segundos, un enunciado y 4 botones.
// Acertar suma un acierto; fallar resta 3 segundos y la partida sigue. Puntuación = aciertos.
import { azar, barajar, el, temporizador, pintarReloj } from './comun.js';
import { destello } from './efectos.js';
import { aciertosSegun } from './modos.js';

// Números enteros de `desde` a `hasta`, ambos incluidos (vacío si desde > hasta).
const rango = (desde, hasta) => Array.from({ length: Math.max(0, hasta - desde + 1) }, (_, i) => desde + i);

// La correcta y 3 distractores a ±5 como mucho, distintos y no negativos, en orden aleatorio.
// Se elige al azar cuántos quedan por debajo de la correcta (0 a 3), así la correcta puede ser
// la más baja, la más alta o una del medio con la misma probabilidad. Con resultados pequeños
// no caben tantos por debajo y se ponen los que caben.
export function generarOpciones(resultado, rnd = Math.random) {
  const debajo = Math.min(azar(4, rnd), resultado);
  const menores = barajar(rango(Math.max(0, resultado - 5), resultado - 1), rnd).slice(0, debajo);
  const mayores = barajar(rango(resultado + 1, resultado + 5), rnd).slice(0, 3 - debajo);
  return barajar([resultado, ...menores, ...mayores], rnd);
}

// `generar(aciertos)` devuelve { texto, opciones, correcta } y, si quiere, `pista`:
// un texto que se enseña bajo el enunciado cuando se falla esa ronda.
// `opciones.modo`: 'normal' (60 s), 'rapido' (30 s) o 'sinfallo' (sin reloj; el primer fallo termina).
// `opciones.dificultad`: ajusta los aciertos que ve `generar` (ver aciertosSegun).
// `opciones.nivel` (modo Niveles): reloj de `nivel.segundos`, preguntas desde `nivel.aciertosIniciales`
// y la partida termina al llegar a `nivel.meta` aciertos.
export function jugarConOpciones(pantalla, alTerminar, generar, claseEnunciado = '', opciones = {}) {
  const { modo = 'normal', dificultad = 'normal', nivel = null } = opciones;
  let aciertos = 0;
  let ronda;
  let terminado = false;
  let id;

  const tiempo = el('span');
  const puntos = el('span', '', nivel ? `Aciertos: 0/${nivel.meta}` : 'Aciertos: 0');
  const marcador = el('div', 'marcador');
  marcador.append(tiempo, puntos);
  const enunciado = el('div', `enunciado ${claseEnunciado}`.trim());
  const pista = el('p', 'pista');
  const rejilla = el('div', 'rejilla');
  pantalla.append(marcador, enunciado, pista, rejilla);

  let reloj = null;
  const segundos = nivel ? nivel.segundos : modo === 'rapido' ? 30 : 60;
  if (modo === 'sinfallo') tiempo.textContent = '❌ Hasta fallar';
  else reloj = temporizador(segundos, (s) => pintarReloj(tiempo, s), () => alTerminar(aciertos));

  function nueva() {
    ronda = generar(aciertosSegun(aciertos, dificultad) + (nivel?.aciertosIniciales ?? 0));
    enunciado.textContent = ronda.texto;
    rejilla.replaceChildren(...ronda.opciones.map((n) => {
      const b = el('button', 'grande', n);
      b.onclick = () => responder(n);
      return b;
    }));
  }

  function responder(n) {
    if (terminado) return;
    const ok = n === ronda.correcta;
    destello(enunciado, ok);
    pista.textContent = ok ? '' : ronda.pista ?? '';
    if (ok) {
      aciertos++;
      puntos.textContent = nivel ? `Aciertos: ${aciertos}/${nivel.meta}` : `Aciertos: ${aciertos}`;
      if (nivel && aciertos >= nivel.meta) {
        // Meta del nivel alcanzada: se para el reloj y se termina tras el destello.
        terminado = true;
        reloj?.parar();
        id = setTimeout(() => alTerminar(aciertos), 400);
        return;
      }
    } else if (reloj) {
      reloj.restar(3);
    } else {
      // Hasta fallar: se deja ver el anillo rojo (y la pista) y se termina.
      terminado = true;
      id = setTimeout(() => alTerminar(aciertos), 600);
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
