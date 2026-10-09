// Pruebas de la lógica pura. Se ejecutan con `node tests.js` o abriendo tests.html.
import { azar, barajar, leer, temporizador, esRecord } from './games/comun.js';
import { encendido } from './games/efectos.js';

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
import { generarOperacion } from './games/calculo.js';
import { generarOpciones } from './games/opciones.js';

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

// --- memoria.js ---
import { alargar, pausa } from './games/memoria.js';

probar('simon: alargar añade un color 0-3 sin modificar la original', () => {
  const original = [2, 0];
  const nueva = alargar(original);
  assert(original.join() === '2,0', 'modificó la original');
  assert(nueva.length === 3 && nueva[0] === 2 && nueva[1] === 0, `${nueva}`);
  assert(nueva[2] >= 0 && nueva[2] < 4, `${nueva}`);
  assert(alargar([], () => 0.999)[0] === 3);
});

probar('simon: la secuencia crece de 1 en 1 desde 1', () => {
  let s = [];
  for (let i = 1; i <= 10; i++) {
    s = alargar(s);
    assert(s.length === i, `longitud ${s.length}`);
  }
});

probar('simon: velocidad igual hasta la ronda 4, más rápida desde la 5, con mínimo', () => {
  assert(pausa(1) === pausa(4), 'cambió antes de la ronda 5');
  assert(pausa(5) < pausa(4), 'no acelera en la ronda 5');
  assert(pausa(10) < pausa(5), 'no sigue acelerando');
  assert(pausa(100) >= 250, 'demasiado rápida');
});

// --- almacenamiento ---

probar('leer devuelve null si la clave no existe (o no hay localStorage)', () => {
  assert(leer('prueba:no-existe') === null);
});

probar('cálculo: la correcta sale en cada posición (ordenadas) en torno a 1/4 de las veces', () => {
  const veces = [0, 0, 0, 0];
  const n = 8000;
  for (let i = 0; i < n; i++) {
    const ordenadas = generarOpciones(50).sort((a, b) => a - b);
    veces[ordenadas.indexOf(50)]++;
  }
  for (const v of veces) assert(v / n > 0.2 && v / n < 0.3, `reparto ${veces}`);
});

// --- comun: parar ---

probar('temporizador: después de parar() no avisa ni termina', () => {
  let avisos = 0;
  let fin = false;
  const reloj = temporizador(60, () => avisos++, () => { fin = true; });
  reloj.parar();
  const antes = avisos;
  reloj.restar(100);
  assert(!fin, 'llamó a alFin tras parar');
  assert(avisos === antes, 'llamó a alCambiar tras parar');
});

// --- efectos.js ---

probar('ajustes: sonido y vibración encendidos salvo que se hayan apagado', () => {
  assert(encendido(null) === true, 'sin nada guardado debe estar encendido');
  assert(encendido('1') === true);
  assert(encendido('0') === false);
});

// --- récords ---

probar('récords: mayor es mejor, menor es mejor, sin récord y puntuación 0', () => {
  assert(esRecord(10, 5) === true);
  assert(esRecord(5, 10) === false);
  assert(esRecord(5, 5) === false, 'empatar no es récord');
  assert(esRecord(200, 250, true) === true);
  assert(esRecord(300, 250, true) === false);
  assert(esRecord(300, 0, true) === true, 'sin récord guardado, cualquier puntuación lo bate');
  assert(esRecord(7, 0) === true);
  assert(esRecord(0, 0) === false, '0 nunca es récord');
  assert(esRecord(0, 5, true) === false, '0 nunca es récord, tampoco en menor es mejor');
});

// --- series.js ---
import { generarSerie } from './games/series.js';

// ¿Qué tipos de serie encajan con estos 5 números?
function tiposDeSerie(s) {
  const d = s.slice(1).map((n, i) => n - s[i]);
  const tipos = [];
  if (d.every((x) => x === d[0] && x > 0)) tipos.push('suma');
  if (d.every((x) => x === d[0] && x < 0)) tipos.push('resta');
  if (s[0] > 0 && [2, 3].some((r) => s.slice(1).every((n, i) => n === s[i] * r))) tipos.push('multiplica');
  if (d[0] === d[2] && d[1] === d[3] && d[0] !== d[1]) tipos.push('alterna');
  if (s.every((n, i) => Math.sqrt(n) === Math.sqrt(s[0]) + i)) tipos.push('cuadrados');
  if (s.slice(2).every((n, i) => n === s[i] + s[i + 1])) tipos.push('fibonacci');
  return tipos;
}

probar('series: 5 enteros >= 0 que siguen un tipo permitido en cada tramo', () => {
  const permitidos = [
    [0, ['suma']],
    [7, ['suma', 'resta', 'multiplica']],
    [12, ['resta', 'multiplica', 'alterna', 'cuadrados']],
    [20, ['multiplica', 'alterna', 'cuadrados', 'fibonacci']],
  ];
  for (const [aciertos, tipos] of permitidos) {
    for (let i = 0; i < 500; i++) {
      const { numeros } = generarSerie(aciertos);
      assert(numeros.length === 5, `${numeros}`);
      assert(numeros.every((n) => Number.isInteger(n) && n >= 0), `negativo o no entero: ${numeros}`);
      assert(tiposDeSerie(numeros).some((t) => tipos.includes(t)), `aciertos ${aciertos}: ${numeros} no es ${tipos}`);
    }
  }
});

// --- sobra.js ---
import { REGLAS, reglasDisponibles, distinto, generarRonda as rondaSobra } from './games/sobra.js';

probar('sobra: 3 cumplen la regla, el que sobra no, y ninguna otra regla señala a otro', () => {
  for (const [aciertos, max] of [[0, 20], [7, 50], [12, 100]]) {
    const nombres = reglasDisponibles(aciertos).map((r) => r.nombre);
    for (let i = 0; i < 500; i++) {
      const { numeros, sobra, regla } = rondaSobra(aciertos);
      assert(numeros.length === 4 && new Set(numeros).size === 4, `${numeros}`);
      assert(numeros.every((n) => Number.isInteger(n) && n >= 1 && n <= max), `fuera de rango: ${numeros}`);
      assert(nombres.includes(regla.nombre), `regla ${regla.nombre} no disponible con ${aciertos} aciertos`);
      assert(numeros.filter(regla.cumple).length === 3 && !regla.cumple(sobra), `${numeros} / ${regla.nombre}`);
      for (const r of REGLAS) assert([null, sobra].includes(distinto(r, numeros)), `ambiguo: ${numeros} con ${r.nombre}`);
    }
  }
});

probar('sobra: reglas por tramo y "distinto"', () => {
  assert(reglasDisponibles(0).map((r) => r.nombre).join() === 'pares,impares');
  assert(reglasDisponibles(5).length === 4);
  assert(reglasDisponibles(10).length === 6);
  const pares = REGLAS.find((r) => r.nombre === 'pares');
  assert(distinto(pares, [2, 4, 6, 9]) === 9);
  assert(distinto(pares, [1, 3, 5, 8]) === 8, 'también es raro el único que sí cumple');
  assert(distinto(pares, [2, 4, 7, 9]) === null);
});
