// Pruebas de la lógica pura. Se ejecutan con `node tests.js` o abriendo tests.html.
import { azar, barajar } from './games/comun.js';

function probar(nombre, fn) {
  let linea;
  try {
    fn();
    linea = `✅ ${nombre}`;
  } catch (e) {
    linea = `❌ ${nombre}: ${e.message}`;
    if (typeof process !== 'undefined') process.exitCode = 1;
  }
  if (typeof document !== 'undefined') document.getElementById('resultados').textContent += linea + '\n';
  else console.log(linea);
}

function assert(condicion, mensaje = 'falló') {
  if (!condicion) throw new Error(mensaje);
}

// --- comun.js ---

probar('azar da enteros entre 0 y n-1', () => {
  for (let i = 0; i < 1000; i++) {
    const n = azar(4);
    assert(Number.isInteger(n) && n >= 0 && n < 4, `salió ${n}`);
  }
  assert(azar(4, () => 0) === 0);
  assert(azar(4, () => 0.999) === 3);
});

probar('barajar conserva los elementos y no modifica la original', () => {
  const original = [1, 2, 3, 4, 5];
  const b = barajar(original);
  assert(original.join() === '1,2,3,4,5', 'modificó la original');
  assert([...b].sort().join() === '1,2,3,4,5', `quedó ${b}`);
});

// --- calculo.js ---
import { generarOperacion, generarOpciones } from './games/calculo.js';

probar('cálculo: 0-4 aciertos solo sumas de 1 a 10', () => {
  for (let i = 0; i < 500; i++) {
    const op = generarOperacion(0);
    const m = op.texto.match(/^(\d+) \+ (\d+)$/);
    assert(m, `operación inesperada: ${op.texto}`);
    const [a, b] = [Number(m[1]), Number(m[2])];
    assert(a >= 1 && a <= 10 && b >= 1 && b <= 10, op.texto);
    assert(op.resultado === a + b, op.texto);
  }
});

probar('cálculo: 5-9 aciertos sumas y restas hasta 20, resultado >= 0', () => {
  for (let i = 0; i < 500; i++) {
    const op = generarOperacion(7);
    const m = op.texto.match(/^(\d+) ([+−]) (\d+)$/);
    assert(m, `operación inesperada: ${op.texto}`);
    const [a, b] = [Number(m[1]), Number(m[3])];
    assert(a <= 20 && b <= 20, op.texto);
    assert(op.resultado === (m[2] === '+' ? a + b : a - b), op.texto);
    assert(op.resultado >= 0, op.texto);
  }
});

probar('cálculo: 10-14 aciertos incluye multiplicaciones de 2 a 9', () => {
  let hayMulti = false;
  for (let i = 0; i < 500; i++) {
    const op = generarOperacion(12);
    const m = op.texto.match(/^(\d+) × (\d+)$/);
    if (!m) continue;
    hayMulti = true;
    const [a, b] = [Number(m[1]), Number(m[2])];
    assert(a >= 2 && a <= 9 && b >= 2 && b <= 9, op.texto);
    assert(op.resultado === a * b, op.texto);
  }
  assert(hayMulti, 'no salió ninguna multiplicación');
});

probar('cálculo: 15+ aciertos números hasta 100 y multiplicaciones hasta 12×12', () => {
  for (let i = 0; i < 500; i++) {
    const op = generarOperacion(20);
    const m = op.texto.match(/^(\d+) ([+−×]) (\d+)$/);
    assert(m, `operación inesperada: ${op.texto}`);
    const [a, b] = [Number(m[1]), Number(m[3])];
    const max = m[2] === '×' ? 12 : 100;
    assert(a <= max && b <= max, op.texto);
    assert(op.resultado >= 0, op.texto);
  }
});

probar('cálculo: 4 opciones distintas, no negativas, cercanas, con la correcta', () => {
  for (const resultado of [0, 1, 2, 7, 50, 144]) {
    for (let i = 0; i < 100; i++) {
      const opciones = generarOpciones(resultado);
      assert(opciones.length === 4, `${opciones}`);
      assert(new Set(opciones).size === 4, `repetidas: ${opciones}`);
      assert(opciones.includes(resultado), `falta ${resultado}: ${opciones}`);
      assert(opciones.every((n) => n >= 0 && Math.abs(n - resultado) <= 5), `${opciones}`);
    }
  }
});

// --- atencion.js ---
import { COLORES, generarRonda, puntuacion } from './games/atencion.js';

probar('stroop: 4 colores', () => {
  assert(COLORES.map((c) => c.nombre).join() === 'ROJO,AZUL,VERDE,AMARILLO');
});

probar('stroop: palabra y tinta coinciden en torno a 1/4 de las veces', () => {
  let coinciden = 0;
  const veces = 8000;
  for (let i = 0; i < veces; i++) {
    const r = generarRonda();
    assert(r.palabra >= 0 && r.palabra < 4 && r.tinta >= 0 && r.tinta < 4, JSON.stringify(r));
    if (r.palabra === r.tinta) coinciden++;
  }
  const p = coinciden / veces;
  assert(p > 0.2 && p < 0.3, `proporción ${p}`);
});

probar('stroop: puntuación = aciertos - errores, mínimo 0', () => {
  assert(puntuacion(10, 3) === 7);
  assert(puntuacion(2, 5) === 0);
  assert(puntuacion(0, 0) === 0);
});
