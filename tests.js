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

async function probarAsync(nombre, fn) {
  let linea;
  try { await fn(); linea = `✅ ${nombre}`; } catch (e) { linea = `❌ ${nombre}: ${e.message}`; if (typeof process !== 'undefined') process.exitCode = 1; }
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

// --- puzzle.js ---
import { RESUELTO, mover, resuelto, barajarPuzzle } from './games/puzzle.js';

probar('puzzle: mover solo fichas junto al hueco; resuelto reconoce el orden', () => {
  assert(resuelto(RESUELTO));
  // Hueco en la esquina inferior derecha (índice 8): se pueden mover el 5 y el 7.
  assert(mover(RESUELTO, 5).join() === '1,2,3,4,5,0,7,8,6', 'arriba del hueco');
  assert(mover(RESUELTO, 7).join() === '1,2,3,4,5,6,7,0,8', 'izquierda del hueco');
  assert(mover(RESUELTO, 0) === null && mover(RESUELTO, 4) === null && mover(RESUELTO, 6) === null, 'no vecinas');
  assert(RESUELTO.join() === '1,2,3,4,5,6,7,8,0', 'mover no modifica el original');
  // De la fila de abajo no se salta a la siguiente fila: con el hueco en 3, el 2 no es vecino.
  assert(mover([1, 2, 3, 0, 4, 5, 6, 7, 8], 2) === null);
  assert(!resuelto(mover(RESUELTO, 5)));
});

probar('puzzle: barajar da las 9 piezas y nunca el puzzle resuelto', () => {
  for (let i = 0; i < 200; i++) {
    const t = barajarPuzzle();
    assert([...t].sort().join() === '0,1,2,3,4,5,6,7,8', `${t}`);
    assert(!resuelto(t), 'salió resuelto');
  }
});

// --- rayo.js ---
import { media, espera } from './games/rayo.js';

probar('rayo: media redondeada y espera entre 1,5 y 4 s', () => {
  assert(media([300, 310, 320]) === 310);
  assert(media([250, 251]) === 251, 'redondea 250.5 hacia arriba');
  assert(espera(() => 0) === 1500);
  assert(espera(() => 0.99999) === 4000);
  for (let i = 0; i < 1000; i++) {
    const ms = espera();
    assert(Number.isInteger(ms) && ms >= 1500 && ms <= 4000, `${ms}`);
  }
});

// --- topos.js ---
import { duracionTopo } from './games/topos.js';

probar('topos: cada topo dura 1 s y 25 ms menos por acierto, mínimo 0,45 s', () => {
  assert(duracionTopo(0) === 1000);
  assert(duracionTopo(10) === 750);
  assert(duracionTopo(22) === 450);
  assert(duracionTopo(100) === 450);
});

// --- estadisticas.js ---
import {
  anotar, fechaLocal, diaAnterior, entrenoDelDia, jugadosEn, entrenoCompleto,
  racha, mejorRacha, entrenosCompletados, nivel, perfil, puntosGrafica,
} from './games/estadisticas.js';

probar('estadísticas: anotar recorta a 100 y no modifica el original', () => {
  const h = Array.from({ length: 100 }, (_, i) => ({ puntos: i }));
  const nuevo = anotar(h, { puntos: 100 });
  assert(h.length === 100 && nuevo.length === 100, `${h.length} / ${nuevo.length}`);
  assert(nuevo[0].puntos === 1 && nuevo[99].puntos === 100);
  assert(anotar([], { puntos: 5 }).length === 1);
});

probar('estadísticas: fechas locales y día anterior', () => {
  assert(fechaLocal(new Date(2026, 0, 5, 23, 30)) === '2026-01-05');
  assert(diaAnterior('2026-03-01') === '2026-02-28');
  assert(diaAnterior('2026-01-01') === '2025-12-31');
  assert(diaAnterior('2026-10-09') === '2026-10-08');
});

// Categorías de prueba y un ayudante que completa el entrenamiento de un día.
const CATS = [['calculo', 'atencion', 'memoria'], ['series', 'sobra', 'puzzle'], ['rayo', 'topos']];
function completar(historiales, fecha) {
  for (const id of entrenoDelDia(fecha, CATS)) (historiales[id] ??= []).push({ fecha, cuando: 0, puntos: 1, ms: 0 });
  return historiales;
}

probar('estadísticas: entrenamiento del día fijo por fecha, uno por categoría, variado', () => {
  const a = entrenoDelDia('2026-10-09', CATS);
  assert(a.join() === entrenoDelDia('2026-10-09', CATS).join(), 'misma fecha, mismo resultado');
  assert(a.length === 3 && CATS.every((ids, i) => ids.includes(a[i])), `${a}`);
  const distintos = new Set();
  const reaccion = [];
  let dia = '2026-10-31';
  for (let i = 0; i < 30; i++, dia = diaAnterior(dia)) {
    distintos.add(entrenoDelDia(dia, CATS).join());
    reaccion.push(entrenoDelDia(dia, CATS)[2]);
  }
  assert(distintos.size >= 5, `solo ${distintos.size} combinaciones en 30 días`);
  assert(reaccion.some((x, i) => i > 0 && x === reaccion[i - 1]), 'Reacción no debe alternar día a día');
});

probar('estadísticas: jugados y entrenamiento completo', () => {
  const h = completar({}, '2026-10-09');
  assert(entrenoCompleto('2026-10-09', CATS, h));
  assert(!entrenoCompleto('2026-10-08', CATS, h));
  const uno = entrenoDelDia('2026-10-09', CATS)[0];
  assert(jugadosEn('2026-10-09', { [uno]: [{ fecha: '2026-10-09' }] }).has(uno));
  assert(!entrenoCompleto('2026-10-09', CATS, { [uno]: [{ fecha: '2026-10-09' }] }), 'con uno solo no está completo');
});

probar('estadísticas: racha, mejor racha y entrenamientos completados', () => {
  const h = {};
  for (const f of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-06', '2026-10-07', '2026-10-08']) completar(h, f);
  assert(racha('2026-10-08', CATS, h) === 3, 'hoy completo: 06, 07, 08');
  assert(racha('2026-10-09', CATS, h) === 3, 'hoy sin hacer: cuenta hasta ayer');
  assert(racha('2026-10-10', CATS, h) === 0, 'ayer sin hacer: racha perdida');
  assert(racha('2026-10-04', CATS, h) === 3, '01, 02, 03');
  assert(mejorRacha(CATS, h) === 3);
  completar(h, '2026-10-09');
  assert(racha('2026-10-09', CATS, h) === 4);
  assert(mejorRacha(CATS, h) === 4);
  assert(entrenosCompletados(CATS, h) === 7);
  // Un día con partidas pero sin completar no suma ni corta la cuenta de días completos.
  (h.calculo ??= []).push({ fecha: '2026-10-05', cuando: 0, puntos: 1, ms: 0 });
  assert(entrenosCompletados(CATS, h) === 7 && mejorRacha(CATS, h) === 4);
  assert(racha('2026-10-01', CATS, {}) === 0 && mejorRacha(CATS, {}) === 0);
});

probar('estadísticas: nivel de una partida (0–100)', () => {
  assert(nivel(15, 30) === 50);
  assert(nivel(45, 30) === 100, 'tope 100');
  assert(nivel(500, 250, true) === 50, 'menor es mejor');
  assert(nivel(200, 250, true) === 100);
  assert(nivel(0, 30) === 0 && nivel(0, 250, true) === 0);
});

probar('estadísticas: perfil por habilidad', () => {
  const juegos = [
    { id: 'series', habilidad: 'Lógica', referencia: 20 },
    { id: 'puzzle', habilidad: 'Lógica', referencia: 30, menorEsMejor: true },
    { id: 'rayo', habilidad: 'Reacción', referencia: 250, menorEsMejor: true },
  ];
  const historiales = {
    // 7 partidas de Lógica mezcladas; cuentan las 5 más recientes por `cuando`.
    series: [10, 20, 30, 40].map((c, i) => ({ cuando: c, puntos: [0, 20, 10, 20][i] })), // niveles 0, 100, 50, 100
    puzzle: [5, 15, 25].map((c, i) => ({ cuando: c, puntos: [30, 60, 30][i] })), // niveles 100, 50, 100
    rayo: [],
  };
  // Por `cuando`: 5→100, 10→0, 15→50, 20→100, 25→100, 30→50, 40→100. Últimas 5: 50,100,100,50,100 → 80.
  const p = perfil(juegos, historiales, ['Lógica', 'Reacción', 'Memoria']);
  assert(p.map((x) => `${x.habilidad}:${x.valor}`).join() === 'Lógica:80,Reacción:null,Memoria:null', JSON.stringify(p));
});

probar('estadísticas: puntos de la gráfica (mejor arriba)', () => {
  assert(puntosGrafica([1, 3], 100, 40) === '0,40 100,0', 'mayor es mejor: el 3 arriba');
  assert(puntosGrafica([300, 200], 100, 40, true) === '0,40 100,0', 'menor es mejor: el 200 arriba');
  assert(puntosGrafica([7], 100, 40) === '0,20 100,20', 'una partida: plana a media altura');
  assert(puntosGrafica([5, 5, 5], 100, 40) === '0,20 50,20 100,20', 'todas iguales: plana');
  assert(puntosGrafica([], 100, 40) === '');
});

// --- modos.js ---
import { claveRecord, esDe, filtrar, aciertosSegun, etiqueta } from './games/modos.js';

probar('modos: clave de récord y etiqueta', () => {
  assert(claveRecord('calculo') === 'record:calculo');
  assert(claveRecord('calculo', 'normal', 'normal') === 'record:calculo', 'Normal + Normal conserva la clave de siempre');
  assert(claveRecord('calculo', 'rapido', 'normal') === 'record:calculo:rapido:normal');
  assert(claveRecord('puzzle', 'normal', 'dificil') === 'record:puzzle:normal:dificil');
  assert(etiqueta('normal', 'normal') === '');
  assert(etiqueta('rapido', 'dificil') === 'Rápido · Difícil');
  assert(etiqueta('normal', 'facil') === 'Normal · Fácil');
  assert(etiqueta('sinfallo', 'normal') === 'Sin fallar · Normal');
});

probar('modos: la dificultad ajusta los aciertos que ven los generadores', () => {
  assert(aciertosSegun(3, 'facil') === 3 && aciertosSegun(25, 'facil') === 9, 'Fácil topa en 9');
  assert(aciertosSegun(7, 'normal') === 7);
  assert(aciertosSegun(0, 'dificil') === 10 && aciertosSegun(6, 'dificil') === 16);
});

probar('modos: partidas antiguas cuentan como Normal + Normal; filtrar por modo y dificultad', () => {
  assert(esDe({ puntos: 1 }, 'normal', 'normal'), 'sin campos = Normal + Normal');
  assert(!esDe({ puntos: 1 }, 'rapido', 'normal'));
  assert(esDe({ modo: 'rapido', dificultad: 'facil' }, 'rapido', 'facil'));
  assert(!esDe({ modo: 'rapido', dificultad: 'facil' }, 'rapido', 'normal'));
  const h = {
    calculo: [{ puntos: 1 }, { puntos: 2, modo: 'rapido', dificultad: 'normal' }, { puntos: 3, modo: 'normal', dificultad: 'normal' }],
    rayo: [{ puntos: 300, modo: 'normal', dificultad: 'dificil' }],
  };
  const n = filtrar(h, 'normal', 'normal');
  assert(n.calculo.map((p) => p.puntos).join() === '1,3' && n.rayo.length === 0, JSON.stringify(n));
  assert(h.calculo.length === 3, 'no modifica el original');
});

// --- dificultad en Memoria, Puzzle y Topos ---

probar('memoria: velocidad según la dificultad (sin dificultad, la de siempre)', () => {
  assert(pausa(1, 'facil') === 800 && pausa(1, 'normal') === 600 && pausa(1, 'dificil') === 400);
  assert(pausa(1) === 600 && pausa(10) === pausa(10, 'normal'));
  assert(pausa(100, 'facil') === 350 && pausa(100, 'normal') === 250 && pausa(100, 'dificil') === 180, 'mínimos');
  assert(pausa(6, 'dificil') < pausa(4, 'dificil'), 'también acelera en difícil');
});

probar('topos: duración según la dificultad (sin dificultad, la de siempre)', () => {
  assert(duracionTopo(0, 'facil') === 1300 && duracionTopo(0, 'normal') === 1000 && duracionTopo(0, 'dificil') === 750);
  assert(duracionTopo(10) === 750 && duracionTopo(10, 'normal') === 750);
  assert(duracionTopo(100, 'facil') === 600 && duracionTopo(100, 'dificil') === 350, 'mínimos');
  assert(duracionTopo(4, 'dificil') === 650);
});

probar('puzzle: más movimientos al barajar = más desordenado', () => {
  const fuera = (t) => t.filter((v, i) => v !== 0 && v !== RESUELTO[i]).length;
  let poco = 0;
  let mucho = 0;
  for (let i = 0; i < 300; i++) {
    const a = barajarPuzzle(Math.random, 20);
    const b = barajarPuzzle(Math.random, 300);
    assert(!resuelto(a) && !resuelto(b), 'salió resuelto');
    poco += fuera(a);
    mucho += fuera(b);
  }
  assert(poco < mucho, `media con 20: ${poco / 300}, con 300: ${mucho / 300}`);
});

probar('entrenamiento: con una función de fecha, los días pasados no cambian al añadir juegos', () => {
  const antes = [['a', 'b'], ['c', 'd'], ['e']];
  const ahora = [['a', 'b', 'x', 'y'], ['c', 'd', 'z'], ['e']];
  const porFecha = (f) => (f < '2026-10-25' ? antes : ahora);
  for (const dia of ['2026-10-01', '2026-10-24']) assert(entrenoDelDia(dia, porFecha).join() === entrenoDelDia(dia, antes).join(), dia);
  const nuevos = new Set();
  for (let d = 25; d <= 31; d++) for (const id of entrenoDelDia(`2026-10-${d}`, porFecha)) nuevos.add(id);
  assert(['x', 'y', 'z'].some((id) => nuevos.has(id)), 'desde el corte salen los juegos nuevos');
});

// --- niveles.js ---
import {
  NUM_NIVELES, retoDe, configNivel, estrellasDe, nivelLibre, conEstrellas, totalEstrellas, desdeAntiguo, siguienteNivel,
  mundoDe, varianteDe, VARIANTES, DESCRIPCION_VARIANTE, nivelesDelDia, diarioCompleto, rachaDiaria, podarDiarios, estrellasDiarias,
} from './games/niveles.js';

const TODOS_LOS_JUEGOS = ['calculo', 'atencion', 'memoria', 'series', 'sobra', 'puzzle', 'rayo', 'topos', 'mayor', 'menos', 'distinto', 'balanza', 'parejas', 'verdad', 'anagrama', 'cuenta'];

probar('niveles: patrón de retos', () => {
  const esperado = { 1: 'normal', 3: 'contrarreloj', 5: 'sinfallo', 7: 'contrarreloj', 10: 'jefe', 13: 'contrarreloj', 15: 'sinfallo', 20: 'jefe', 44: 'normal', 50: 'jefe' };
  for (const [n, reto] of Object.entries(esperado)) assert(retoDe(Number(n)) === reto, `nivel ${n}: ${retoDe(Number(n))}`);
});

probar('niveles: configuración de algunos niveles', () => {
  const c = (id, n) => { const x = configNivel(id, n); return `${x.metas.join('/')}|${x.segundos}|${x.aciertosIniciales}|${x.dificultad}|${x.sinFallar}|${x.reto}`; };
  assert(c('calculo', 1) === '5/7/8|30|0|normal|false|normal', c('calculo', 1));
  assert(c('calculo', 3) === '5/7/8|23|2|normal|false|contrarreloj', c('calculo', 3));
  assert(c('calculo', 5) === '4/5/6|30|4|normal|true|sinfallo', c('calculo', 5));
  assert(c('calculo', 10) === '9/12/14|30|9|normal|false|jefe', c('calculo', 10));
  assert(c('calculo', 50) === '20/25/30|30|20|normal|false|jefe', c('calculo', 50));
  assert(configNivel('series', 1).segundos === 60);
  assert(configNivel('memoria', 1).metas.join() === '3,4,5');
  assert(configNivel('memoria', 2).dificultad === 'normal' && configNivel('memoria', 3).dificultad === 'dificil' && configNivel('memoria', 21).dificultad === 'dificil');
  assert(configNivel('memoria', 5).sinFallar === false, 'Memoria no tiene Sin fallar');
  assert(configNivel('rayo', 1).metas.join() === '447,402,358' && configNivel('rayo', 10).metas.join() === '378,340,302');
  assert(configNivel('puzzle', 1).metas.join() === '31,28,25' && configNivel('puzzle', 1).desorden === 14);
  assert(configNivel('parejas', 1).parejas === 4 && configNivel('parejas', 1).metas.join() === '9,8,7' && configNivel('parejas', 50).parejas === 8);
  assert(configNivel('topos', 1).dificultad === 'facil' && configNivel('topos', 11).dificultad === 'normal' && configNivel('topos', 31).dificultad === 'dificil');
  assert(configNivel('topos', 5).metas.join() === '8,10,12' && configNivel('topos', 5).sinFallar);
  assert(configNivel('calculo', 1).texto === '⭐ 5 · ⭐⭐ 7 · ⭐⭐⭐ 8 aciertos en 30 s', configNivel('calculo', 1).texto);
  assert(configNivel('rayo', 1).texto === '⭐ ≤447 · ⭐⭐ ≤402 · ⭐⭐⭐ ≤358 ms', configNivel('rayo', 1).texto);
  assert(configNivel('distinto', 1).segundos === 45 && configNivel('balanza', 1).segundos === 75);
  assert(configNivel('puzzle', 3).reto === 'normal' && configNivel('rayo', 5).reto === 'normal' && configNivel('memoria', 5).reto === 'normal', 'un reto sin efecto se juega como Normal');
  assert(configNivel('memoria', 3).reto === 'contrarreloj' && configNivel('memoria', 23).reto === 'normal', 'en Memoria el contrarreloj solo cuenta si no era ya Difícil');
  assert(configNivel('puzzle', 10).metas.join() === '32,29,26' && configNivel('memoria', 10).metas.join() === '6,8,9');
  assert(configNivel('no-existe', 1) === null);
});

probar('niveles: los 12 juegos tienen 50 niveles con 3 metas ordenadas y distintas', () => {
  for (const id of TODOS_LOS_JUEGOS) {
    for (let n = 1; n <= NUM_NIVELES; n++) {
      const x = configNivel(id, n);
      assert(x, `${id} ${n}`);
      const [a, b, c] = x.metas;
      const menor = ['puzzle', 'rayo', 'parejas'].includes(id);
      assert(menor ? a > b && b > c : a < b && b < c, `${id} ${n}: ${x.metas}`);
      assert(x.tope === c);
      if (id === 'parejas') assert(c >= x.parejas, `parejas ${n}: ${x.metas} con ${x.parejas} parejas`);
    }
  }
});

probar('niveles: estrellas y progreso', () => {
  assert(estrellasDe(4, [5, 7, 8]) === 0 && estrellasDe(5, [5, 7, 8]) === 1 && estrellasDe(7, [5, 7, 8]) === 2 && estrellasDe(20, [5, 7, 8]) === 3);
  const ms = [446, 401, 357];
  assert(estrellasDe(450, ms, true) === 0 && estrellasDe(446, ms, true) === 1 && estrellasDe(380, ms, true) === 2 && estrellasDe(300, ms, true) === 3);
  assert(estrellasDe(0, ms, true) === 0, '0 no es una marca válida');
  const e = desdeAntiguo(3);
  assert(e.length === NUM_NIVELES && totalEstrellas(e) === 3 && e[2] === 1 && e[3] === 0);
  assert(nivelLibre(e, 1) && nivelLibre(e, 4) && !nivelLibre(e, 5));
  assert(siguienteNivel(e) === 4 && siguienteNivel(desdeAntiguo(0)) === 1 && siguienteNivel(desdeAntiguo(50)) === 51);
  const e2 = conEstrellas(e, 2, 3);
  assert(e2[1] === 3 && e[1] === 1, 'no modifica el original');
  assert(conEstrellas(e2, 2, 1)[1] === 3, 'las estrellas de un nivel no bajan');
});

probar('niveles: mundos sin fin con variantes', () => {
  assert(mundoDe(1) === 1 && mundoDe(10) === 1 && mundoDe(11) === 2 && mundoDe(51) === 6);
  const v = [5, 6, 7, 8, 9].map((m) => varianteDe('calculo', m)).join();
  assert(v === ',maraton,relampago,precision,maraton', v);
  assert(varianteDe('memoria', 6) === null && varianteDe('rayo', 7) === null, 'sin reloj no hay variante');
  const c = (id, n) => { const x = configNivel(id, n); return `${x.metas.join('/')}|${x.segundos}|${x.sinFallar}|${x.reto}|${x.variante}|${x.mundo}`; };
  assert(c('calculo', 50) === '20/25/30|30|false|jefe|null|5', c('calculo', 50));
  assert(c('calculo', 51) === '27/34/41|45|false|normal|maraton|6', c('calculo', 51));
  assert(c('calculo', 61) === '14/18/21|23|false|normal|relampago|7', c('calculo', 61));
  assert(c('calculo', 63) === '11/14/17|17|false|contrarreloj|relampago|7', c('calculo', 63));
  assert(c('calculo', 71) === '13/17/20|30|true|sinfallo|precision|8', c('calculo', 71));
  assert(c('calculo', 72) === '19/24/29|30|false|normal|precision|8', c('calculo', 72));
  assert(c('calculo', 301) === '17/22/26|23|false|normal|relampago|31', c('calculo', 301));
  assert(c('rayo', 60) === '265/239/212|0|false|jefe|null|6', c('rayo', 60));
  assert(c('memoria', 55) === '14/18/21|0|false|normal|null|6', c('memoria', 55));
  for (const id of TODOS_LOS_JUEGOS) {
    for (let n = 1; n <= 400; n++) {
      const x = configNivel(id, n);
      const [a, b, c3] = x.metas;
      const menor = ['puzzle', 'rayo', 'parejas'].includes(id);
      assert(a > 0 && (menor ? a > b && b > c3 : a < b && b < c3), `${id} ${n}: ${x.metas}`);
      if (id === 'parejas') assert(c3 >= x.parejas, `parejas ${n}: ${x.metas}`);
    }
  }
  const todas = Array(50).fill(2);
  assert(VARIANTES.every((v) => typeof DESCRIPCION_VARIANTE[v] === 'string' && DESCRIPCION_VARIANTE[v].length > 0), 'cada variante tiene su explicación');
  assert(siguienteNivel(todas) === 51 && siguienteNivel([1, 1, 0]) === 3 && siguienteNivel([...todas, 1, 3]) === 53);
});

probar('niveles: diarios y su racha', () => {
  assert(nivelesDelDia(1).join() === '1,3,5' && nivelesDelDia(17).join() === '15,17,19');
  assert(!diarioCompleto(undefined) && !diarioCompleto({ niveles: [1, 3, 5], estrellas: [1, 0, 3] }) && diarioCompleto({ niveles: [1, 3, 5], estrellas: [1, 2, 3] }));
  const lleno = { niveles: [1, 3, 5], estrellas: [1, 1, 1] };
  const medio = { niveles: [1, 3, 5], estrellas: [3, 0, 0] };
  const d = { '2026-10-18': lleno, '2026-10-19': lleno, '2026-10-20': lleno, '2026-10-21': medio };
  assert(rachaDiaria(d, '2026-10-21') === 3, 'hoy a medias cuenta desde ayer');
  assert(rachaDiaria({ ...d, '2026-10-21': lleno }, '2026-10-21') === 4);
  assert(rachaDiaria(d, '2026-10-23') === 0, 'un día sin jugar la corta');
  assert(rachaDiaria({ '2026-02-28': lleno, '2026-03-01': lleno }, '2026-03-01') === 2, 'cambio de mes');
  assert(estrellasDiarias(d) === 12 && estrellasDiarias({}) === 0);
  const muchos = Object.fromEntries(Array.from({ length: 70 }, (_, i) => [`2026-01-${String(i + 1).padStart(3, '0')}`, lleno]));
  const podado = podarDiarios(muchos);
  assert(Object.keys(podado).length === 60 && !('2026-01-001' in podado) && '2026-01-070' in podado);
});

// --- final.js ---
import { barraFinal, fraseEstrellas, fraseRecord } from './games/final.js';

probar('final: barra de metas', () => {
  const redondo = (b) => [b.relleno, ...b.marcas].map((x) => Math.round(x * 100)).join();
  assert(redondo(barraFinal(16, [12, 15, 18])) === '67,40,60,80', redondo(barraFinal(16, [12, 15, 18])));
  assert(redondo(barraFinal(447, [447, 402, 358], true)) === '40,40,60,80', 'menos es mejor: a la derecha, mejor');
  assert(barraFinal(0, [12, 15, 18]).relleno === 0 && barraFinal(99, [12, 15, 18]).relleno === 1, 'se recorta a 0–1');
  const iguales = barraFinal(20, [20, 20]);
  assert(iguales.marcas[0] === iguales.marcas[1] && iguales.relleno > 0 && iguales.relleno < 1, JSON.stringify(iguales));
  assert(barraFinal(5, [0]).relleno === 1, 'marca 0 no divide entre 0');
});

probar('final: frases', () => {
  assert(fraseEstrellas(16, [12, 15, 18], 2, 'aciertos') === 'Te faltaron 2 aciertos para ⭐⭐⭐');
  assert(fraseEstrellas(17, [12, 15, 18], 2, 'aciertos') === 'Te faltó 1 acierto para ⭐⭐⭐');
  assert(fraseEstrellas(4, [5, 7, 8], 0, 'colores') === 'Te faltó 1 color para ⭐');
  assert(fraseEstrellas(414, [447, 402, 358], 1, 'ms', true) === 'Te faltó bajar 12 ms para ⭐⭐');
  assert(fraseEstrellas(20, [12, 15, 18], 3, 'aciertos') === '¡Las 3 estrellas!');
  assert(fraseRecord(23, 21, 'puntos') === '🏆 2 puntos mejor que tu récord anterior');
  assert(fraseRecord(23, 0, 'puntos') === '¡Tu primer récord!');
  assert(fraseRecord(21, 21, 'puntos') === '¡Igualaste tu récord (21)!');
  assert(fraseRecord(18, 21, 'puntos') === 'A 3 puntos de tu récord (21)');
  assert(fraseRecord(250, 240, 'ms', true) === 'A 10 ms de tu récord (240)');
  assert(fraseRecord(239, 240, 'ms', true) === '🏆 1 ms mejor que tu récord anterior');
});

// --- copia.js ---
import { esClaveDelJuego, crearCopia, leerCopia, restaurado } from './games/copia.js';

probar('copia de seguridad: solo claves del juego, ida y vuelta', () => {
  assert(esClaveDelJuego('record:calculo') && esClaveDelJuego('perfil:xp') && esClaveDelJuego('diarios:mayor') && !esClaveDelJuego('otra-web:x'));
  const texto = crearCopia([['record:calculo', '23'], ['estrellas:mayor', '[3,2]'], ['otra-web:x', 'no']], '2026-10-23');
  const copia = JSON.parse(texto);
  assert(copia.app === 'juego-mental' && copia.version === 1 && copia.fecha === '2026-10-23');
  assert(!('otra-web:x' in copia.datos), 'no copia claves de otras webs');
  const datos = leerCopia(texto);
  assert(datos['record:calculo'] === '23' && datos['estrellas:mayor'] === '[3,2]' && Object.keys(datos).length === 2);
  const raro = leerCopia(JSON.stringify({ app: 'juego-mental', datos: { 'record:x': 5, 'malo:y': 'z', 'ajuste:tema': 'oscuro' } }));
  assert(Object.keys(raro).join() === 'ajuste:tema', 'descarta valores que no son texto y claves ajenas');
  for (const malo of ['no es json', '{"app":"otra","datos":{}}', 'null', '{"app":"juego-mental"}']) {
    let fallo = false;
    try { leerCopia(malo); } catch { fallo = true; }
    assert(fallo, `debería rechazar ${malo}`);
  }
});

probar('copia: al restaurar, las flotas de Batalla naval de este celular se quedan y las traídas llegan sin hist', () => {
  const aqui = JSON.stringify({ barcos: [1], sal: 'a', hist: [{ turno: 'x' }, { turno: 'o' }] });
  const vieja = JSON.stringify({ barcos: [9], sal: 'b', hist: [{ turno: 'x' }] });
  const r = restaurado({ 'naval:m1': aqui, 'record:x': '1', 'naval:m3': aqui }, { 'naval:m1': vieja, 'naval:m2': vieja, 'naval:m4': 'null', 'naval:m5': '{roto', 'record:y': '2' });
  assert(r['naval:m1'] === aqui, 'no pisa la flota de la partida en curso');
  assert(r['naval:m3'] === aqui, 'no borra una flota que la copia no trae');
  assert(r['naval:m2'] === JSON.stringify({ barcos: [9], sal: 'b' }), 'la traída llega sin hist');
  assert(!('naval:m4' in r) && !('naval:m5' in r), 'descarta flotas rotas');
  assert(r['record:y'] === '2' && !('record:x' in r), 'el resto se sustituye como antes');
  // Igual con la semilla de los dados (`dadosjusto:<id>`), que no se confunde con los récords `dados:<juego>`.
  const semilla = JSON.stringify({ s: 'a1', hist: [{ k: 1 }] });
  const r2 = restaurado({ 'dadosjusto:m1': semilla, 'dados:cacho': '{}' }, { 'dadosjusto:m1': '{"s":"b2"}', 'dadosjusto:m2': JSON.stringify({ s: 'c3', hist: [] }), 'dadosjusto:m3': '{}', 'dados:generala': '{}' });
  assert(r2['dadosjusto:m1'] === semilla && r2['dadosjusto:m2'] === '{"s":"c3"}' && !('dadosjusto:m3' in r2), 'semillas de los dados');
  assert(r2['dados:generala'] === '{}' && !('dados:cacho' in r2) && esClaveDelJuego('dadosjusto:m1'));
});

// --- sincro.js ---
import { tieneProgreso, decidirSincro, datosRanking } from './games/sincro.js';

probar('nube: cuándo subir, bajar o preguntar', () => {
  assert(tieneProgreso({ 'record:calculo': '5' }) && !tieneProgreso({ 'ajuste:tema': 'oscuro', 'ayuda:menu': '1' }));
  assert(tieneProgreso({ 'perfil:xp': '10' })); // solo subir de nivel también es progreso que no se debe pisar
  const d = (o) => decidirSincro({ hayLocal: true, hayNube: true, vinculado: true, cambioLocal: 10, actualizadoNube: 10, subido: 10, ...o });
  assert(d({ hayNube: false }) === 'subir' && d({ hayNube: false, hayLocal: false }) === 'nada');
  assert(d({ hayLocal: false }) === 'bajar');
  assert(d({ vinculado: false }) === 'preguntar' && d({ vinculado: false, actualizadoNube: 99 }) === 'preguntar');
  assert(d({ actualizadoNube: 20 }) === 'bajar' && d({ cambioLocal: 20 }) === 'subir' && d({}) === 'nada');
  // Otro celular subió (aunque su reloj vaya atrasado) y en este también se jugó: se pregunta, no se pisa.
  assert(d({ actualizadoNube: 5, cambioLocal: 20 }) === 'preguntar' && d({ actualizadoNube: 30, cambioLocal: 20 }) === 'preguntar');
  assert(d({ actualizadoNube: 5 }) === 'bajar');
});

probar('nube: datos del ranking', () => {
  const datos = {
    'estrellas:calculo': '[3,2,1]',
    'estrellas:mayor': 'roto',
    'diarios:mayor': JSON.stringify({ '2026-10-22': { niveles: [1, 3, 5], estrellas: [3, 1, 0] } }),
    'record:calculo': '23',
    'record:calculo:rapido:normal': '40', // otro modo: no cuenta
    'record:rayo': '50', // imposible (< 80 ms)
    'record:parejas': '9',
    'otra-web:record:x': '1',
  };
  const r = datosRanking(datos);
  assert(r.estrellas === 10, `estrellas ${r.estrellas}`);
  assert(JSON.stringify(r.records) === '{"calculo":23,"parejas":9}', JSON.stringify(r.records));
});

// --- logros.js ---
import { LOGROS, progreso, logrosNuevos } from './games/logros.js';

probar('logros: progreso y nuevos', () => {
  assert(new Set(LOGROS.map((l) => l.id)).size === LOGROS.length, 'ids únicos');
  const r = { partidas: 12, estrellas: 34, jefes: 1, mejorRacha: 2 };
  const estrellas50 = LOGROS.find((l) => l.id === 'estrellas-50');
  assert(JSON.stringify(progreso(estrellas50, r)) === '{"valor":34,"conseguido":false}');
  assert(progreso(LOGROS.find((l) => l.id === 'partidas-10'), r).valor === 10, 'no pasa de la meta');
  const nuevos = logrosNuevos(r, { primera: '2026-10-20' }).map((l) => l.id).join();
  assert(nuevos === 'partidas-10,jefe-1', nuevos);
  assert(logrosNuevos({}, {}).length === 0, 'sin datos, ninguno');
});

// --- duelos.js ---
import { PLAZO, elegirJuegos, marcador, estadoDuelo, resultadoPara, verRival } from './games/duelos.js';

const INFO = { calculo: { referencia: 30 }, rayo: { referencia: 250, menorEsMejor: true }, topos: { referencia: 40 } };
const duelo = (o) => ({ jugadores: ['a', 'b'], juegos: ['calculo', 'rayo', 'topos'], victoria: 'juegos', caduca: 1000, resultados: {}, ...o });

probar('duelos: elegir juegos', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  for (let i = 0; i < 50; i++) {
    const tres = elegirJuegos(ids);
    assert(tres.length === 3 && new Set(tres).size === 3 && tres.every((x) => ids.includes(x)), tres.join());
  }
  assert(elegirJuegos(['x', 'y']).length === 2, 'si hay menos, todos');
  assert(PLAZO === 172800000);
});

probar('duelos: marcador juego a juego y por suma', () => {
  const d = duelo({ resultados: { a: { calculo: 20, rayo: 300, topos: 30 }, b: { calculo: 18, rayo: 250, topos: 30 } } });
  const m = marcador(d, 'a', INFO);
  assert(m.porJuego.map((p) => p.gana).join() === 'yo,rival,empate', m.porJuego.map((p) => p.gana).join());
  assert(m.mio === 1 && m.suyo === 1 && resultadoPara(d, 'a', INFO) === 'e' && resultadoPara(d, 'b', INFO) === 'e');
  const s = marcador({ ...d, victoria: 'puntos' }, 'a', INFO);
  // a: 67 + 83 + 75 = 225 · b: 60 + 100 + 75 = 235
  assert(s.mio === 225 && s.suyo === 235, `${s.mio} ${s.suyo}`);
  assert(resultadoPara({ ...d, victoria: 'puntos' }, 'b', INFO) === 'v');
  const caducado = duelo({ resultados: { a: { calculo: 5 }, b: {} } });
  assert(marcador(caducado, 'a', INFO).mio === 0, 'sin terminar, lo no jugado no cuenta');
  assert(marcador(caducado, 'a', INFO, true).mio === 1 && resultadoPara(caducado, 'b', INFO) === 'd', 'al terminar, gana quien jugó');
  // En "menos es mejor", 0 (no terminó) pierde contra cualquier marca.
  const abandono = marcador(duelo({ resultados: { a: { calculo: 20, rayo: 0, topos: 30 }, b: { calculo: 20, rayo: 900, topos: 30 } } }), 'a', INFO);
  assert(abandono.porJuego[1].gana === 'rival', abandono.porJuego[1].gana);
  // Reto del Arcade: sin `referencia`, cuentan los puntos tal cual.
  const reto = duelo({ juegos: ['saltar'], victoria: 'puntos', resultados: { a: { saltar: 62 }, b: { saltar: 7 } } });
  const r = marcador(reto, 'a', { saltar: { nombre: 'Saltar' } }, true);
  assert(r.mio === 62 && r.suyo === 7 && resultadoPara(reto, 'b', { saltar: {} }) === 'd', `${r.mio} ${r.suyo}`);
});

probar('duelos: estados', () => {
  const lleno = { calculo: 1, rayo: 300, topos: 1 };
  assert(estadoDuelo(duelo({ jugadores: ['a'] }), 'a', 0) === 'tu-turno');
  assert(estadoDuelo(duelo({ jugadores: ['a'], resultados: { a: lleno } }), 'a', 0) === 'esperando');
  assert(estadoDuelo(duelo({ jugadores: ['a'] }), 'b', 0) === 'invitacion');
  assert(estadoDuelo(duelo({ jugadores: ['a'] }), 'a', 2000) === 'caducado');
  assert(estadoDuelo(duelo({ resultados: { a: lleno } }), 'a', 0) === 'esperando');
  assert(estadoDuelo(duelo({ resultados: { a: lleno } }), 'b', 0) === 'tu-turno');
  assert(estadoDuelo(duelo({ resultados: { a: lleno, b: lleno } }), 'b', 0) === 'terminado');
  assert(estadoDuelo(duelo(), 'a', 2000) === 'terminado', 'caducado con rival: terminado');
  assert(estadoDuelo(duelo(), 'c', 0) === 'ajeno');
  assert(!verRival(duelo(), 'a', 'calculo', false) && verRival(duelo({ resultados: { a: { calculo: 3 } } }), 'a', 'calculo', false) && verRival(duelo(), 'a', 'calculo', true));
});

// --- amigos.js ---
import { codigoAmigo, normalizarCodigo, amigosDe, enLinea, apodoOfensivo } from './games/amigos.js';

probar('amigos: código de amigo y solicitudes', () => {
  const c = codigoAmigo('uidDePrueba123');
  assert(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/.test(c) && c === codigoAmigo('uidDePrueba123'), c);
  assert(codigoAmigo('otro-uid') !== c, 'uids distintos, códigos distintos');
  const vistos = new Set(Array.from({ length: 2000 }, (_, i) => codigoAmigo(`uid${i}`)));
  assert(vistos.size > 1990, `pocas colisiones: ${vistos.size}`);
  assert(normalizarCodigo(c.toLowerCase().replace('-', ' ')) === c && normalizarCodigo('ABC') === null && normalizarCodigo('AB0-DEF') === null);
  const s = [
    { id: '1', de: 'yo', para: 'ana', nombreDe: 'Yo', nombrePara: 'Ana', estado: 'aceptada' },
    { id: '2', de: 'leo', para: 'yo', nombreDe: 'Leo', nombrePara: 'Yo', estado: 'pendiente' },
    { id: '3', de: 'yo', para: 'sol', nombreDe: 'Yo', nombrePara: 'Sol', estado: 'pendiente' },
    { id: '4', de: 'bea', para: 'yo', nombreDe: 'Bea', nombrePara: 'Yo', estado: 'aceptada' },
    { id: '5', de: 'x', para: 'z', nombreDe: 'X', nombrePara: 'Z', estado: 'aceptada' },
  ];
  const r = amigosDe(s, 'yo');
  assert(r.amigos.map((a) => a.apodo).join() === 'Ana,Bea' && r.recibidas[0].uid === 'leo' && r.enviadas[0].uid === 'sol', JSON.stringify(r));
});

probar('amigos: apodos ofensivos (con trucos) sí; palabras normales no', () => {
  for (const t of ['Put4', 'Put4madre', 'P.U.T.A', 'weon123', 'MIERDAAA', 'Ana_ctm', 'Coño', 'conchetumareee', 'Hueona']) assert(apodoOfensivo(t), t);
  for (const t of ['Computadora', 'Disputa', 'Juan Pérez', 'Ñoño', 'Pollito', 'Perrita', 'Invitado-12345', 'Cono Sur']) assert(!apodoOfensivo(t), t);
});

probar('enLinea: el estado vale 5 minutos; después, desconectado', () => {
  const ahora = 10_000_000;
  assert(enLinea({ estado: 'jugando', cuando: ahora - 60000 }, ahora) === 'jugando');
  assert(enLinea({ estado: 'ausente', cuando: ahora - 299000 }, ahora) === 'ausente');
  assert(enLinea({ estado: 'conectado', cuando: ahora - 301000 }, ahora) === 'desconectado');
  assert(enLinea({ estado: 'conectado' }, ahora) === 'desconectado');
  assert(enLinea(null, ahora) === 'desconectado');
});

// --- vivo.js ---
import { JUEGOS_VIVO, rivalDe, rondaActual, comoDuelo, resultadoVivo } from './games/vivo.js';

probar('duelos en vivo: rondas y resultado', () => {
  assert(JUEGOS_VIVO.every((id) => [...TODOS_LOS_JUEGOS, 'trivia'].includes(id)) && !JUEGOS_VIVO.includes('puzzle'), 'solo juegos con reloj');
  const INFO_VIVO = { calculo: { referencia: 30 }, mayor: { referencia: 35 }, topos: { referencia: 40 } };
  const sala = (o) => ({ anfitrion: 'a', invitado: 'b', juegos: ['calculo', 'mayor', 'topos'], victoria: 'juegos', ...o });
  assert(rivalDe(sala(), 'a') === 'b' && rivalDe(sala(), 'b') === 'a');
  assert(rondaActual(sala()) === 0 && rondaActual(sala({ fin: { 0: { a: 5 } } })) === 0);
  assert(rondaActual(sala({ fin: { 0: { a: 5, b: 3 }, 1: { a: 1, b: 2 } } })) === 2);
  assert(resultadoVivo(sala({ fin: { 0: { a: 5, b: 3 } } }), 'a', INFO_VIVO) === null, 'faltan rondas');
  const fin = { 0: { a: 5, b: 3 }, 1: { a: 1, b: 2 }, 2: { a: 20, b: 9 } };
  assert(JSON.stringify(comoDuelo(sala({ fin })).resultados.b) === '{"calculo":3,"mayor":2,"topos":9}');
  assert(resultadoVivo(sala({ fin }), 'a', INFO_VIVO) === 'v' && resultadoVivo(sala({ fin }), 'b', INFO_VIVO) === 'd');
  assert(resultadoVivo(sala({ fin: { 0: { a: 4, b: 4 } }, juegos: ['calculo'] }), 'b', INFO_VIVO) === 'e');
  assert(resultadoVivo(sala({ fuera: { b: true } }), 'a', INFO_VIVO) === 'v' && resultadoVivo(sala({ fuera: { b: true } }), 'b', INFO_VIVO) === 'd', 'quien se va pierde');
  assert(resultadoVivo(sala({ fin, fuera: { b: true } }), 'a', INFO_VIVO) === 'v', 'irse después de terminar no cambia el resultado');
  const puntos = sala({ victoria: 'puntos', juegos: ['calculo'], fin: { 0: { a: 30, b: 15 } } });
  assert(resultadoVivo(puntos, 'b', INFO_VIVO) === 'd', 'suma de puntos');
});

// --- chat.js ---
import { MAX_MENSAJE, idChat, mensajeValido, hayNoLeidos } from './games/chat.js';

probar('mensajes: conversación, texto válido y no leídos', () => {
  assert(idChat('zeta', 'alfa') === 'alfa_zeta' && idChat('alfa', 'zeta') === 'alfa_zeta');
  assert(mensajeValido('  hola   que tal  ') === 'hola que tal' && mensajeValido('   ') === null && mensajeValido(null) === null);
  assert(mensajeValido('x'.repeat(MAX_MENSAJE)) && mensajeValido('x'.repeat(MAX_MENSAJE + 1)) === null);
  assert(hayNoLeidos({ de: 'ana', cuando: 10 }, 5, 'yo') && !hayNoLeidos({ de: 'ana', cuando: 10 }, 10, 'yo'));
  assert(!hayNoLeidos({ de: 'yo', cuando: 10 }, 0, 'yo') && !hayNoLeidos(null, 0, 'yo'));
});

// --- liga.js ---
import { MAX_PARTIDAS_DIA, semanaDe, semanaAnterior, diasRestantes, puntosLiga, anotarLiga } from './games/liga.js';

probar('liga: semanas ISO, días restantes y puntos', () => {
  assert(semanaDe('2026-10-25') === '2026-W43' && semanaDe('2026-10-26') === '2026-W44', semanaDe('2026-10-25') + ' ' + semanaDe('2026-10-26'));
  assert(semanaDe('2021-01-03') === '2020-W53' && semanaDe('2026-12-31') === '2026-W53' && semanaDe('2027-01-04') === '2027-W01');
  assert(semanaAnterior('2026-10-26') === '2026-W43' && semanaAnterior('2027-01-04') === '2026-W53');
  assert(diasRestantes('2026-10-26') === 7 && diasRestantes('2026-10-25') === 1 && diasRestantes('2026-10-29') === 4);
  let r = {};
  for (let i = 0; i < 12; i++) r = anotarLiga(r, 'partida', '2026-10-26');
  r = anotarLiga(r, 'partida', '2026-10-27');
  r = anotarLiga(r, 'estrellas', '2026-10-27', 4);
  r = anotarLiga(anotarLiga(anotarLiga(r, 'entreno'), 'victoria'), 'empate');
  assert(puntosLiga(r) === MAX_PARTIDAS_DIA + 1 + 4 + 5 + 3 + 1, `puntos ${puntosLiga(r)}`);
  assert(puntosLiga() === 0 && puntosLiga({}) === 0);
});

// --- verdad.js, anagrama.js y cuenta.js ---
import { VERDADERO, FALSO, generarAfirmacion } from './games/verdad.js';
import { PALABRAS, generarAnagrama } from './games/anagrama.js';
import { generarCuenta } from './games/cuenta.js';

probar('juegos nuevos: verdadero o falso, anagramas y cuenta rápida', () => {
  let ciertas = 0;
  for (const aciertos of [0, 8, 20]) {
    for (let i = 0; i < 300; i++) {
      const { texto, cierta } = generarAfirmacion(aciertos);
      const [operacion, mostrado] = texto.split(' = ');
      const real = Function(`return ${operacion.replace('−', '-').replace('×', '*')}`)();
      assert(cierta === (real === Number(mostrado)) && Number(mostrado) >= 0, texto);
      if (cierta) ciertas++;
    }
  }
  assert(ciertas > 300 && ciertas < 600, `más o menos la mitad ciertas: ${ciertas}`);
  assert(VERDADERO !== FALSO);
  for (const [largo, lista] of Object.entries(PALABRAS)) assert(lista.split(' ').every((w) => w.length === Number(largo)), largo);
  const ordenada = (w) => [...w].sort().join('');
  for (const aciertos of [0, 6, 12, 20]) {
    for (let i = 0; i < 200; i++) {
      const r = generarAnagrama(aciertos);
      const letras = r.letras.replaceAll(' ', '');
      assert(letras !== r.palabra && ordenada(letras) === ordenada(r.palabra), r.letras);
      assert(r.opciones.length === 4 && r.opciones.includes(r.palabra) && r.opciones.filter((w) => ordenada(w) === ordenada(r.palabra)).length === 1, r.opciones.join());
    }
  }
  for (const aciertos of [0, 10, 30]) {
    for (let i = 0; i < 200; i++) {
      const { casillas, objetivo, cuantas } = generarCuenta(aciertos);
      assert(casillas.length === Math.min(30, 8 + aciertos) && cuantas >= 1 && cuantas === casillas.filter((f) => f === objetivo).length);
    }
  }
});

// --- app/juegos.js: secciones ---
import { SECCIONES, JUEGOS } from './app/juegos.js';

probar('secciones: cada juego en una sección válida', () => {
  const ids = SECCIONES.map((s) => s.id);
  assert(new Set(ids).size === ids.length && SECCIONES.every((s) => s.nombre && s.icono && s.color && s.descripcion));
  assert(JUEGOS.every((j) => ids.includes(j.seccion)), JUEGOS.filter((j) => !ids.includes(j.seccion)).map((j) => j.id).join());
  assert(JUEGOS.filter((j) => j.seccion === 'mentales').length === 16);
});

// --- gato.js y conecta4.js (🎲 Mesa) ---
import { gato } from './games/gato.js';
import { conecta4, filaLibre } from './games/conecta4.js';

probar('mesa: gato, reglas y máquina', () => {
  const e = (celdas, turno = 'x') => ({ celdas, turno });
  assert(gato.ganador(e('xxx......')) === 'x' && gato.ganador(e('o..o..o..')) === 'o' && gato.ganador(e('x...x...x')) === 'x');
  assert(gato.ganador(e('xoxxoooxx')) === 'empate' && gato.ganador(gato.inicial()) === null);
  const ini = gato.inicial();
  const despues = gato.aplicar(ini, 4);
  assert(despues.celdas === '....x....' && despues.turno === 'o' && ini.celdas === '.........', 'aplicar no cambia el original');
  assert(gato.validas(despues).length === 8 && !gato.validas(despues).includes(4));
  assert(gato.ia(e('xx.oo....', 'x'), 'normal') === 2, 'gana si puede');
  assert(gato.ia(e('xx..o....', 'o'), 'normal') === 2, 'bloquea');
  // La difícil nunca pierde: se prueban todas las respuestas posibles del rival (empezando el rival y empezando ella).
  const nuncaPierde = (estado, maquina) => {
    const g = gato.ganador(estado);
    if (g) return g !== (maquina === 'x' ? 'o' : 'x');
    if (estado.turno === maquina) return nuncaPierde(gato.aplicar(estado, gato.ia(estado, 'dificil')), maquina);
    return gato.validas(estado).every((i) => nuncaPierde(gato.aplicar(estado, i), maquina));
  };
  assert(nuncaPierde(gato.inicial(), 'o') && nuncaPierde(gato.inicial(), 'x'), 'el gato difícil nunca pierde');
});

probar('mesa: conecta 4, reglas y máquina', () => {
  let e = conecta4.inicial();
  for (const c of [3, 3, 3]) e = conecta4.aplicar(e, c);
  assert(e.celdas[5 * 7 + 3] === 'x' && e.celdas[4 * 7 + 3] === 'o' && e.celdas[3 * 7 + 3] === 'x' && filaLibre(e, 3) === 2, 'la ficha cae');
  const fila = (cols) => cols.reduce((s, c) => conecta4.aplicar(s, c), conecta4.inicial());
  assert(conecta4.ganador(fila([0, 0, 1, 1, 2, 2, 3])) === 'x', 'horizontal');
  assert(conecta4.ganador(fila([0, 1, 0, 1, 0, 1, 0])) === 'x', 'vertical');
  assert(conecta4.ganador(fila([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3])) === 'x', 'diagonal');
  let llena = conecta4.inicial();
  for (let i = 0; i < 42; i++) llena = conecta4.aplicar(llena, conecta4.validas(llena)[0]);
  assert(conecta4.validas(llena).length === 0);
  // Normal: gana y bloquea.
  assert(conecta4.ia(fila([0, 5, 1, 5, 2, 6]), 'normal') === 3, 'gana con la cuarta');
  assert(conecta4.ia(fila([0, 6, 1, 6, 2]), 'normal') === 3, 'bloquea la cuarta');
  // Difícil contra fácil: gana siempre (alternando quién empieza).
  let victorias = 0;
  for (let partida = 0; partida < 20; partida++) {
    let s = conecta4.inicial();
    const dificil = partida % 2 ? 'x' : 'o';
    while (!conecta4.ganador(s)) s = conecta4.aplicar(s, conecta4.ia(s, s.turno === dificil ? 'dificil' : 'facil'));
    if (conecta4.ganador(s) === dificil) victorias++;
  }
  assert(victorias === 20, `difícil ganó ${victorias}/20`);
});

// --- mayor.js y menos.js ---
import { generarPar } from './games/mayor.js';
import { generarParMenor } from './games/menos.js';

probar('¿cuál da menos?: la correcta es la de menor resultado', () => {
  for (const aciertos of [0, 10, 20]) {
    for (let i = 0; i < 300; i++) {
      const { a, b, menor } = generarParMenor(aciertos);
      assert(a.resultado !== b.resultado && menor === (a.resultado < b.resultado ? a.texto : b.texto));
    }
  }
});

probar('mayor o menor: nunca empatan y la correcta es la de mayor resultado', () => {
  for (const aciertos of [0, 7, 12, 20]) {
    for (let i = 0; i < 300; i++) {
      const { a, b, mayor } = generarPar(aciertos);
      assert(a.resultado !== b.resultado, `${a.texto} / ${b.texto}`);
      assert(mayor === (a.resultado > b.resultado ? a.texto : b.texto));
    }
  }
});

// --- distinto.js ---
import { generarRonda as rondaDistinto } from './games/distinto.js';

probar('el distinto: tamaño de la cuadrícula, casilla y diferencia de color', () => {
  for (const [a, lado] of [[0, 2], [3, 2], [4, 3], [8, 3], [9, 4], [14, 4], [15, 5], [30, 5]]) {
    assert(rondaDistinto(a).lado === lado, `aciertos ${a}`);
  }
  const luz = (c) => Number(c.match(/(\d+)%\)$/)[1]);
  for (const a of [0, 10, 18, 40]) {
    for (let i = 0; i < 200; i++) {
      const r = rondaDistinto(a);
      assert(r.distinto >= 0 && r.distinto < r.lado * r.lado, `${r.distinto}`);
      assert(Math.abs(luz(r.color) - luz(r.colorDistinto)) === Math.max(4, 22 - a), `${r.color} / ${r.colorDistinto}`);
    }
  }
});

// --- balanza.js ---
import { generarBalanza } from './games/balanza.js';

probar('balanza: ecuaciones coherentes y respuesta = peso de la fruta preguntada', () => {
  for (const [a, n] of [[0, 1], [7, 2], [12, 3]]) {
    for (let i = 0; i < 300; i++) {
      const { ecuaciones, pregunta, respuesta, pesos } = generarBalanza(a);
      assert(ecuaciones.length === n, `aciertos ${a}: ${ecuaciones.length} ecuaciones`);
      for (const e of ecuaciones) assert(e.total === e.frutas.reduce((s, f) => s + pesos[f], 0), JSON.stringify(e));
      assert(respuesta === pesos[pregunta]);
      assert(Object.values(pesos).every((p) => p >= 1 && p <= 9), JSON.stringify(pesos));
    }
  }
});

// --- parejas.js ---
import { repartir, SIMBOLOS } from './games/parejas.js';

probar('parejas: cada símbolo aparece exactamente dos veces', () => {
  for (const n of [4, 6, 8]) {
    for (let i = 0; i < 100; i++) {
      const cartas = repartir(n);
      assert(cartas.length === 2 * n);
      const cuenta = {};
      for (const s of cartas) cuenta[s] = (cuenta[s] ?? 0) + 1;
      assert(Object.keys(cuenta).length === n && Object.values(cuenta).every((x) => x === 2), JSON.stringify(cuenta));
      assert(cartas.every((s) => SIMBOLOS.includes(s)));
    }
  }
});

// --- preguntas.js y ruleta.js (❓ Trivia) ---
import { PREGUNTAS, CATEGORIAS_TRIVIA, pregunta, problemaPregunta, agregarPreguntas } from './games/preguntas.js';
import * as ruleta from './games/ruleta.js';

probar('trivia: 50 preguntas por categoría, 4 opciones distintas, dificultad 1–3 y sin repetidas', () => {
  for (const c of CATEGORIAS_TRIVIA) assert(PREGUNTAS.filter((q) => q.c === c.id).length === 50, c.id);
  assert(PREGUNTAS.every((q) => CATEGORIAS_TRIVIA.some((c) => c.id === q.c)));
  for (const q of PREGUNTAS) {
    assert(q.o.length === 4 && new Set(q.o).size === 4, q.p);
    assert([1, 2, 3].includes(q.d), q.p);
    assert(q.p.length <= 110 && q.o.every((o) => o.length <= 26), q.p);
  }
  assert(new Set(PREGUNTAS.map((q) => q.p)).size === PREGUNTAS.length, 'textos repetidos');
  const q = pregunta((x) => x.c === 'geo' && x.d === 3);
  assert(q.c === 'geo' && q.d === 3 && q.opciones.includes(q.correcta) && q.correcta === q.o[0]);
});

probar('ruleta: barra, corona, vidas, ganar y perder', () => {
  let e = ruleta.inicial();
  for (let i = 0; i < 3; i++) e = ruleta.responder(e, true);
  assert(ruleta.tocaCorona(e) && e.barra === 3);
  e = ruleta.responderCorona(e, 'geo', true);
  assert(e.coronas.join() === 'geo' && e.barra === 0 && e.vidas === 3);
  assert(ruleta.sinCorona(e, ['geo', 'ocio']).join() === 'ocio');
  e = ruleta.responder(ruleta.responder(e, true), false);
  assert(e.barra === 0 && e.vidas === 2 && e.fallos === 1);
  e = ruleta.responderCorona({ ...e, barra: 3 }, 'ocio', false);
  assert(e.vidas === 1 && e.coronas.length === 1 && e.barra === 0);
  assert(ruleta.resultado(e) === null);
  assert(ruleta.resultado(ruleta.responder(e, false)) === 'pierde');
  assert(ruleta.resultado({ ...e, coronas: ['a', 'b', 'c', 'd', 'e', 'f'] }) === 'gana');
  const fiesta = ruleta.responder(ruleta.inicial(undefined, null), false);
  assert(fiesta.vidas === null && ruleta.resultado(fiesta) === null);
});

probar('ruleta: ajustes, corona de varias preguntas y comodines', () => {
  assert(ruleta.esClasica(ruleta.ajustesDe(null)) && ruleta.esClasica({}));
  const raro = ruleta.ajustesDe({ barra: 9, corona: 2, vidas: null, comodines: { mitad: 2, cambiar: 7 } });
  assert(raro.barra === 3 && raro.corona === 2 && raro.vidas === null && raro.comodines.mitad === 2 && raro.comodines.cambiar === 0);
  assert(!ruleta.esClasica(raro));
  const a = { ...ruleta.ajustesDe({ barra: 1, corona: 2, coronas: 3, vidas: null, comodines: { segunda: 1 } }) };
  let e = ruleta.responder(ruleta.inicial(a), true, a);
  assert(ruleta.tocaCorona(e, a) && e.vidas === null && e.comodines.segunda === 1);
  e = ruleta.responderCorona(e, 'geo', true, a);
  assert(e.progreso === 1 && e.coronas.length === 0 && e.barra === 1);
  e = ruleta.responderCorona(e, 'geo', false, a);
  assert(e.progreso === 0 && e.barra === 0 && e.vidas === null && e.fallos === 1);
  e = ruleta.responderCorona({ ...e, progreso: 1 }, 'geo', true, a);
  assert(e.coronas.join() === 'geo' && e.progreso === 0 && e.barra === 0);
  assert(ruleta.resultado({ ...e, coronas: ['a', 'b', 'c'] }, a) === 'gana' && ruleta.resultado(e, a) === null);
  e = ruleta.usar(ruleta.usar(e, 'segunda'), 'segunda');
  assert(e.comodines.segunda === 0);
});

probar('ruleta: estado en la nube ida y vuelta', () => {
  const a = ruleta.ajustesDe({ comodines: { mitad: 2 } });
  const e = ruleta.inicial(a, null);
  const nube = JSON.parse(JSON.stringify(ruleta.aNube(e))); // JSON quita el null de vidas, como la Realtime Database
  assert(JSON.stringify(ruleta.deNube(nube, a)) === JSON.stringify(e));
  const otra = { ...e, coronas: ['geo', 'ocio'], barra: 2, aciertos: 5 };
  assert(JSON.stringify(ruleta.deNube(ruleta.aNube(otra), a)) === JSON.stringify(otra));
  assert(ruleta.deNube(undefined, a).comodines.mitad === 2);
});

probar('trivia: preguntas propuestas (validar y sumar al banco)', () => {
  const ok = { c: 'geo', d: 2, p: '¿Pregunta de prueba que no está en el banco?', o: ['Sí', 'No', 'Quizás', 'Nunca'] };
  assert(problemaPregunta(ok) === '');
  assert(problemaPregunta({ ...ok, c: 'nada' }).includes('categoría'));
  assert(problemaPregunta({ ...ok, d: 4 }).includes('dificultad'));
  assert(problemaPregunta({ ...ok, p: '¿Qué?' }).includes('entre 10'));
  assert(problemaPregunta({ ...ok, o: ['a', 'b', 'c'] }).includes('4 respuestas'));
  assert(problemaPregunta({ ...ok, o: ['a', 'b', 'c', 'x'.repeat(27)] }).includes('4 respuestas'));
  assert(problemaPregunta({ ...ok, o: ['Lima', 'lima ', 'Quito', 'Bogotá'] }).includes('distintas'));
  assert(problemaPregunta({ ...ok, p: PREGUNTAS[0].p.toUpperCase() }).includes('ya está'));
  const banco = [...PREGUNTAS];
  agregarPreguntas([ok, ok, { ...ok, p: 'x' }, null && ok], banco);
  assert(banco.length === PREGUNTAS.length + 1 && banco.at(-1).p === ok.p);
  agregarPreguntas('nada', banco);
  assert(banco.length === PREGUNTAS.length + 1);
});

// --- cartas.js, solitario.js, veintiuno.js ---
import { baraja, nombreCarta } from './games/cartas.js';
import * as sol from './games/solitario.js';
import * as bj from './games/veintiuno.js';

const carta = (texto) => ({ v: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(texto.slice(0, -1)) + 1, p: texto.slice(-1) });
const cartas = (texto) => texto.split(' ').map(carta);

probar('cartas: baraja de 52 distintas', () => {
  const b = baraja();
  assert(b.length === 52 && new Set(b.map(nombreCarta)).size === 52);
});

probar('solitario: repartir, robar y mover', () => {
  const e = sol.repartir(3);
  assert(e.columnas.map((c) => c.length).join() === '1,2,3,4,5,6,7' && e.mazo.length === 24);
  assert(e.columnas.every((c) => c.at(-1).a && c.slice(0, -1).every((x) => !x.a)));
  let r = sol.robar(e);
  assert(r.descarte.length === 3 && r.mazo.length === 21 && nombreCarta(r.descarte.at(-1)) === nombreCarta(e.mazo.at(-3)), 'de a 3 queda arriba la tercera');
  for (let i = 0; i < 7; i++) r = sol.robar(r);
  assert(!r.mazo.length && r.descarte.length === 24);
  r = sol.robar(r);
  assert(JSON.stringify(r.mazo) === JSON.stringify(e.mazo), 'el mazo vuelve en el mismo orden');
  assert(sol.robar({ ...e, mazo: [], descarte: [] }) === null);
  // 6♥ sobre 7♠ sí; sobre 7♦ no; a una columna vacía solo un Rey; a la pila solo el As primero.
  const t = { robo: 1, mazo: [], descarte: [carta('6♥')], pilas: [[], [], [], []], movimientos: 0,
    columnas: [[{ ...carta('9♣'), a: false }, { ...carta('7♠'), a: true }], [{ ...carta('7♦'), a: true }], [], [{ ...carta('A♥'), a: true }], [], [], []] };
  assert(sol.puede(t, { de: 'descarte' }, { a: 'col', i: 0 }) && !sol.puede(t, { de: 'descarte' }, { a: 'col', i: 1 }));
  assert(!sol.puede(t, { de: 'descarte' }, { a: 'col', i: 2 }) && !sol.puede(t, { de: 'descarte' }, { a: 'pila', i: 0 }));
  assert(sol.destinoMejor(t, { de: 'col', i: 3, k: 0 }).a === 'pila', 'el As va a la pila');
  assert(sol.mover(t, { de: 'col', i: 0, k: 1 }, { a: 'col', i: 2 }) === null, '7♠ no va a una columna vacía');
  assert(!sol.cartasDe(t, { de: 'col', i: 0, k: 0 }), 'boca abajo no se toma');
  const m = sol.mover(t, { de: 'descarte' }, { a: 'col', i: 0 });
  assert(m.columnas[0].length === 3 && !m.descarte.length && m.movimientos === 1);
  assert(m.columnas[0].at(-1).a === true, 'la carta del mazo queda boca arriba en la columna');
  assert(t.descarte.length === 1, 'no cambia el estado original');
  assert(sol.mover(m, { de: 'col', i: 3, k: 0 }, { a: 'pila', i: 0 }) === null, 'el A♥ no va a la pila de ♠');
  const p = sol.mover(m, { de: 'col', i: 3, k: 0 }, { a: 'pila', i: 1 });
  assert(p.pilas[1].length === 1 && sol.mover(p, { de: 'pila', i: 1 }, { a: 'col', i: 3 }) === null, 'el As no baja a una columna vacía');
});

probar('solitario: destapar, pista y terminar solo', () => {
  const t = { robo: 1, mazo: [], descarte: [], pilas: [[], [], [], []], movimientos: 0,
    columnas: [[{ ...carta('9♣'), a: false }, { ...carta('6♥'), a: true }], [{ ...carta('7♠'), a: true }], [], [], [], [], []] };
  const p = sol.pista(t);
  assert(p.o.i === 0 && p.d.i === 1, 'la pista destapa el 9♣');
  const m = sol.mover(t, p.o, p.d);
  assert(m.columnas[0][0].a && m.columnas[1].length === 2);
  assert(sol.pista({ ...t, columnas: [[], [], [], [], [], [], []], mazo: [carta('2♠')] }).robar);
  const fin = { robo: 1, mazo: [], descarte: [], pilas: [[], [], [], []], movimientos: 0, columnas: [[], [], [], [], [], [], []] };
  ['♠', '♥', '♦', '♣'].forEach((p, i) => { fin.columnas[i] = Array.from({ length: 13 }, (_, k) => ({ v: 13 - k, p, a: true })); });
  assert(sol.puedeTerminar(fin) && !sol.puedeTerminar(sol.repartir()));
  const g = sol.terminar(fin);
  assert(sol.ganado(g) && g.movimientos === 52 && !sol.ganado(fin));
});

probar('21: puntos, blackjack, doblar, separar y pagos', () => {
  assert(bj.puntos(cartas('A♠ K♥')).total === 21 && bj.puntos(cartas('A♠ A♥ 9♦')).total === 21);
  assert(bj.puntos(cartas('A♠ 6♥')).blanda && !bj.puntos(cartas('A♠ 6♥ 9♦')).blanda && bj.puntos(cartas('A♠ 6♥ 9♦')).total === 16);
  // El zapato se reparte desde el final: yo, yo, banca, banca y luego lo que se pida (relleno de 2♣).
  const z = (texto) => [...Array(20).fill(carta('2♣')), ...cartas(texto).reverse()];
  let m = bj.repartir(z('A♠ K♥ 9♦ 8♣'), 10);
  assert(m.fin && bj.resultado(m, m.manos[0]) === 'blackjack' && bj.cobro(m) === 25);
  m = bj.repartir(z('10♠ 6♥ 9♦ 8♣ 5♥'), 10); // 16 contra 17
  assert(!m.fin && bj.puedeDoblar(m, 10) && !bj.puedeDoblar(m, 5));
  const d = bj.doblar(m);
  assert(d.fin && d.manos[0].apuesta === 20 && bj.resultado(d, d.manos[0]) === 'gana' && bj.cobro(d) === 40);
  const plantado = bj.plantarse(m);
  assert(plantado.fin && bj.resultado(plantado, plantado.manos[0]) === 'pierde' && bj.cobro(plantado) === 0);
  const pasado = bj.pedir(bj.repartir(z('10♠ 6♥ 9♦ 8♣ K♥'), 10));
  assert(pasado.fin && bj.cobro(pasado) === 0 && bj.puntos(pasado.banca).total === 17, 'te pasas y la banca no pide');
  const sigue = bj.pedir(bj.repartir(z('10♠ 3♥ 9♦ 8♣ 2♥'), 10));
  assert(!sigue.fin && !bj.puedeDoblar(sigue, 100), 'con 3 cartas ya no se dobla');
  // La banca pide hasta 17: 9+5=14 → pide un 3 → 17 y se planta.
  const b = bj.plantarse(bj.repartir(z('10♠ 8♥ 9♦ 5♣ 3♥'), 10));
  assert(bj.puntos(b.banca).total === 17 && bj.resultado(b, b.manos[0]) === 'gana');
  assert(bj.cobro(bj.plantarse(bj.repartir(z('10♠ 8♥ 10♦ 8♣'), 10))) === 10, 'empate devuelve la apuesta');
  // Separar 8-8: dos manos; con ases, una carta cada uno y se acaba; su 21 no es blackjack.
  m = bj.repartir(z('8♠ 8♥ 10♦ 7♣ 3♥ 10♣'), 10);
  assert(bj.puedeSeparar(m, 10) && !bj.puedeSeparar(m, 5));
  const s = bj.separar(m);
  assert(s.manos.length === 2 && !s.fin && !bj.puedeSeparar(s, 100));
  const s2 = bj.plantarse(bj.plantarse(s));
  assert(s2.fin && bj.cobro(s2) === 20, '11 y 18 contra 17: gana una, pierde otra');
  const sa = bj.separar(bj.repartir(z('A♠ A♥ 10♦ 7♣ K♥ 5♣'), 10));
  assert(sa.fin && bj.resultado(sa, sa.manos[0]) === 'gana' && bj.cobro(sa) === 20, 'As+K separado paga 1 a 1');
  assert(bj.puedeSeparar(bj.repartir(z('K♠ Q♥ 10♦ 7♣'), 10), 10), 'K y Q valen igual');
  // La banca con blackjack gana al repartir; el zapato corto se baraja de nuevo.
  m = bj.repartir(z('10♠ 9♥ A♦ K♣'), 10);
  assert(m.fin && bj.cobro(m) === 0);
  assert(bj.repartir(cartas('2♠ 3♠'), 10).zapato.length === 48);
});

import * as bac from './games/bacara.js';

probar('bacará: puntos, tercera carta y pagos', () => {
  assert(bac.punto(cartas('7♠ 8♥')) === 5 && bac.punto(cartas('K♠ Q♥')) === 0 && bac.punto(cartas('A♠ 8♥')) === 9);
  // Reparto: jugador, jugador, banca, banca y luego terceras (relleno de 2♣).
  const z = (texto) => [...Array(20).fill(carta('2♣')), ...cartas(texto).reverse()];
  let m = bac.jugar(z('9♠ K♥ 3♦ 4♣'));
  assert(m.jugador.length === 2 && m.banca.length === 2 && m.ganador === 'jugador' && m.motivos[0].includes('Natural'));
  m = bac.jugar(z('6♠ K♥ 3♦ 2♣')); // jugador 6 se planta; banca 5 pide (2♣) → 7
  assert(m.jugador.length === 2 && m.banca.length === 3 && m.ganador === 'banca');
  m = bac.jugar(z('2♠ K♥ 3♦ 3♣ 8♥')); // jugador 2 pide un 8 → 0; banca 6 con tercera 8 se planta
  assert(m.jugador.length === 3 && m.banca.length === 2 && m.ganador === 'banca');
  m = bac.jugar(z('2♠ K♥ 3♦ K♣ 8♥')); // banca 3 con tercera 8 no pide
  assert(m.banca.length === 2);
  m = bac.jugar(z('2♠ K♥ 4♦ K♣ 7♥ 3♠')); // banca 4 con tercera 7 pide → 7; jugador 9 gana
  assert(m.banca.length === 3 && m.ganador === 'jugador');
  m = bac.jugar(z('7♠ K♥ 7♦ K♣'));
  assert(m.ganador === 'empate' && m.jugador.length === 2 && m.banca.length === 2);
  assert(bac.cobro(10, 'jugador', 'jugador') === 20 && bac.cobro(10, 'banca', 'banca') === 19 && bac.cobro(10, 'empate', 'empate') === 90);
  assert(bac.cobro(10, 'banca', 'empate') === 10 && bac.cobro(10, 'empate', 'banca') === 0 && bac.cobro(10, 'jugador', 'banca') === 0);
});

import * as ocho from './games/ocho.js';

probar('ocho locos: jugar, especiales, robar, pasar y rondas', () => {
  const e = ocho.nueva(3);
  assert(e.manos.every((m) => m.length === 5) && e.mazo.length === 52 - 16 && e.turno === 1);
  // Estado a mano: arriba 5♥; turno del 0.
  const base = (manos, extra = {}) => ({ n: 3, manos: manos.map(cartas), mazo: cartas('3♣ 4♣ 9♣ 10♣ 6♠'), pila: cartas('5♥'), palo: '♥', sentido: 1, turno: 0, robar: 0, robadas: 0, puntos: [0, 0, 0], ronda: 1, ganador: null, resumen: null, aviso: null, ...extra });
  let s = base(['5♠ 9♥ 8♣ K♦', 'A♠ 2♣', '7♦ 7♣']);
  assert(ocho.jugables(s).join() === '0,1,2', 'mismo número, mismo palo o un 8');
  assert(ocho.jugar(s, 3) === null && ocho.jugar(s, 2) === null, 'K♦ no vale; el 8 necesita palo');
  let t = ocho.jugar(s, 2, '♠');
  assert(t.palo === '♠' && t.turno === 1 && ocho.jugables(t).join() === '0');
  // 2: el siguiente roba 2 o responde con otro 2.
  s = base(['2♥ 9♥', '2♣ A♠', '7♦ 7♣']);
  t = ocho.jugar(s, 0);
  assert(t.robar === 2 && ocho.jugables(t).join() === '0', 'solo puede responder con un 2');
  t = ocho.jugar(t, 0);
  assert(t.robar === 4 && t.turno === 2 && !ocho.jugables(t).length && ocho.puedeRobar(t));
  t = ocho.robar(t);
  assert(t.manos[2].length === 6 && t.robar === 0 && t.turno === 0, 'roba 4 y pierde el turno');
  // J salta; Q invierte (a dos, vuelve a jugar).
  s = base(['J♥ 9♥', 'A♠', '7♦']);
  assert(ocho.jugar(s, 0).turno === 2);
  s = base(['Q♥ 9♥', 'A♠', '7♦']);
  t = ocho.jugar(s, 0);
  assert(t.turno === 2 && t.sentido === -1 && ocho.jugar(t, 0) === null);
  assert(ocho.jugar({ ...base(['Q♥ 9♥', 'A♠']), n: 2, puntos: [0, 0] }, 0).turno === 0, 'a dos la Q repite');
  // Sin jugada: roba hasta 3 y pasa.
  s = base(['K♣', 'A♠', '7♦'], { mazo: cartas('J♠ 10♠ 9♠ 6♠') });
  assert(!ocho.puedePasar(s) && ocho.puedeRobar(s));
  t = ocho.robar(ocho.robar(ocho.robar(s)));
  assert(t.manos[0].length === 4 && t.robadas === 3 && !ocho.puedeRobar(t) && ocho.puedePasar(t));
  t = ocho.pasar(t);
  assert(t.turno === 1 && t.robadas === 0);
  assert(ocho.robar(s).manos[0].length === 2 && ocho.jugables(ocho.robar(ocho.robar(base(['K♣', 'A♠', '7♦'], { mazo: cartas('5♣ 6♠') })))).length === 1, 'la carta robada que sirve se puede jugar');
  // Mazo vacío: se baraja la pila menos la de arriba.
  s = base(['K♣', 'A♠', '7♦'], { mazo: [], pila: cartas('3♣ 4♣ 5♥') });
  t = ocho.robar(s);
  assert(t.pila.length === 1 && t.manos[0].length === 2 && t.mazo.length === 1);
  // Cerrar ronda: suma lo de los demás (8 = 50, 2 = 20, K = 10, A = 1).
  s = base(['9♥', '8♠ 2♣', 'K♦ A♠'], { puntos: [120, 0, 0] });
  t = ocho.jugar(s, 0);
  assert(t.puntos[0] === 201 && t.ganador === 0 && t.resumen.suma === 81);
  s = base(['9♥', 'A♠', '3♦'], { puntos: [0, 0, 0] });
  t = ocho.jugar(s, 0);
  assert(t.ganador === null && t.ronda === 2 && t.puntos[0] === 4 && t.manos[0].length === 5 && t.resumen.j === 0);
  // La máquina guarda el 8, tira lo que más vale y elige su palo.
  s = base(['8♣ 3♥ K♥', 'A♠', '7♦']);
  assert(ocho.maquina(s).jugar === 2);
  s = base(['8♣ 3♠ 4♠ 6♦', 'A♠', '7♦']);
  assert(JSON.stringify(ocho.maquina(s)) === JSON.stringify({ jugar: 0, palo: '♠' }));
  assert(ocho.maquina(base(['K♣', 'A♠', '7♦'])).robar);
  // Una partida entera entre máquinas termina.
  let p = ocho.nueva(4);
  for (let i = 0; i < 20000 && p.ganador === null; i++) p = ocho.accion(p, ocho.maquina(p));
  assert(p.ganador !== null && p.puntos[p.ganador] >= 300, 'la partida termina');
  // Difícil: recuerda el palo que le faltaba al que robó y se lo deja; con un 8 pide ese palo.
  s = base(['K♣', 'A♠', '7♦'], { mazo: cartas('J♠ 10♠ 9♠ 6♠') });
  assert(ocho.robar(s).sinPalo[0].join() === '♥', 'robó sin tener ♥');
  t = base(['8♥ 4♣ 5♦', '9♠ 10♠'], { n: 2, puntos: [0, 0], sinPalo: [[], []] });
  t.pila = cartas('3♣');
  t.palo = '♣';
  assert(ocho.maquina(t, 'dificil').jugar === 1, 'guarda el 8');
  t = base(['8♥ 5♦ 6♣', '9♠ 10♠'], { n: 2, puntos: [0, 0], sinPalo: [[], ['♦']] });
  t.pila = cartas('3♥');
  t.palo = '♥';
  assert(JSON.stringify(ocho.maquina(t, 'dificil')) === JSON.stringify({ jugar: 0, palo: '♦' }), 'pide el palo que le falta');
  p = ocho.nueva(3);
  for (let i = 0; i < 20000 && p.ganador === null; i++) p = ocho.accion(p, ocho.maquina(p, 'dificil'));
  assert(p.ganador !== null, 'una partida entre difíciles termina');
});

import * as esc from './games/escoba.js';

probar('escoba: llevarse 15, escoba, repartir y puntos', () => {
  // Cartas como '7o 5c R e' (o oros, c copas, e espadas, b bastos; S C R = 8 9 10).
  const PAL = { o: 'oros', c: 'copas', e: 'espadas', b: 'bastos' };
  const es = (t) => t.split(' ').filter(Boolean).map((x) => ({ v: { S: 8, C: 9, R: 10 }[x[0]] ?? Number(x[0]), p: PAL[x.at(-1)] }));
  const base = (manos, mesa, extra = {}) => ({ n: 2, manos: manos.map(es), mesa: es(mesa), mazo: es('1b 2b 3b 4b 5b 6b'), llevadas: [[], []], escobas: [0, 0], ultimo: null, turno: 0, puntos: [0, 0], ronda: 1, ganador: null, aviso: null, resumen: null, ...extra });
  const e = esc.nueva();
  assert(e.manos.every((m) => m.length === 3) && e.mazo.length + e.mesa.length + e.llevadas.flat().length === 34 && e.turno === 0);
  // 5 sobre 4 + 6 o sobre R: dos formas; sin forma queda en la mesa.
  let s = base(['5o 2c', '1e'], '4c 6e Rb 2o');
  assert(JSON.stringify(esc.opciones(s, 0)) === '[[0,1],[2]]' && !esc.opciones(s, 1).length);
  let t = esc.jugar(s, 0, 1);
  assert(t.llevadas[0].length === 2 && t.mesa.length === 3 && t.turno === 1 && t.ultimo === 0 && !t.escobas[0]);
  assert(esc.jugar(s, 0, 5) === null, 'forma inexistente');
  t = esc.jugar(s, 1);
  assert(t.mesa.length === 5 && !t.llevadas[0].length, 'sin 15 queda en la mesa');
  // Escoba: dejar la mesa vacía.
  t = esc.jugar(base(['So', '1e 2e'], '3c 4c'), 0);
  assert(t.escobas[0] === 1 && !t.mesa.length && t.aviso.t.startsWith('¡escoba!'));
  // Manos vacías: se reparten 3 más.
  t = esc.jugar(base(['1o', ''], 'Rb'), 0);
  assert(t.manos.every((m) => m.length === 3) && !t.mazo.length);
  // Fin de ronda: la mesa va al último que se llevó; más cartas, oros, sietes y el 7 de oros.
  s = base(['3c', ''], '2b', { mazo: [], llevadas: [es('7o 7c 5o 3o'), es('1e 2e')], ultimo: 0, escobas: [1, 0], puntos: [10, 3] });
  t = esc.jugar(s, 0);
  const pts = Object.fromEntries(t.resumen.filas.map((f) => [f.t, f.pts.join()]));
  assert(t.llevadas[0].length === 6 && pts['🧹 Escobas'] === '1,0' && pts['🂠 Más cartas'] === '1,0' && pts['🪙 Más oros'] === '1,0');
  assert(pts['7️⃣ Más sietes'] === '1,0' && pts['✨ 7 de oros'] === '1,0' && t.puntos.join() === '15,3' && t.ganador === 0);
  t = esc.jugar({ ...s, puntos: [0, 0] }, 0);
  assert(t.ganador === null && t.ronda === 2 && t.resumen.suma.join() === '5,0' && t.manos[0].length === 3);
  // La máquina: escoba antes que nada; si no se lleva nada, no deja la mesa entre 5 y 14.
  assert(esc.maquina(base(['1c 5o', ''], 'Rb')).jugar === 1, '5 + R = escoba');
  assert(esc.maquina(base(['7c 7o', ''], 'Sc')).jugar === 1, 'escoba con el 7 de oros');
  assert(esc.maquina(base(['1c 2b', ''], '3c')).jugar === 0, 'el 2 dejaría 5 en la mesa (escoba con un R)');
  // Una partida entera entre máquinas termina.
  let p = esc.nueva();
  for (let i = 0; i < 20000 && p.ganador === null; i++) p = esc.accion(p, esc.maquina(p));
  assert(p.ganador !== null && p.puntos[p.ganador] >= 15, 'la partida termina');
  assert(JSON.stringify(esc.nueva()).length < 8000, 'cabe en la regla de la base');
  // Difícil: escoba si puede; sin llevarse nada, no deja la mesa en 5–14 (escoba fácil para el otro).
  assert(esc.maquina(base(['1c 5o', ''], 'Rb'), 'dificil').jugar === 1);
  assert(esc.maquina(base(['1c 2b', '4e'], '3c'), 'dificil').jugar === 0);
  p = esc.nueva();
  for (let i = 0; i < 20000 && p.ganador === null; i++) p = esc.accion(p, esc.maquina(p, 'dificil'));
  assert(p.ganador !== null, 'una partida entre difíciles termina');
});

import * as rm from './games/rummy.js';

probar('rummy: tríos, escalas con vuelta, comodines, agregar, cambiar y bajar', () => {
  // '*' es un comodín.
  const cs = (t) => t.split(' ').map((x) => (x === '*' ? { ...rm.COMODIN } : carta(x)));
  const nombres = (j) => j.cartas.map((c) => (c.v ? `${['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.v - 1]}${c.p}` : '*')).join(' ');
  assert(rm.armar('T', cs('7♥ 7♠ 7♥')) && rm.armar('T', cs('7♥ 7♠ *')) && !rm.armar('T', cs('7♥ * *')) && !rm.armar('T', cs('7♥ 8♠ 7♦')));
  assert(!rm.armar('T', cs('7♥ 7♠')), 'trío de 3 o más');
  let j = rm.armar('E', cs('6♥ 4♥ 5♥ 7♥'));
  assert(j && j.inicio === 4 && nombres(j) === '4♥ 5♥ 6♥ 7♥');
  assert(nombres(rm.armar('E', cs('A♥ K♥ Q♥ 2♥'))) === 'Q♥ K♥ A♥ 2♥', 'da la vuelta por el As');
  assert(nombres(rm.armar('E', cs('4♥ * 6♥ 7♥'))) === '4♥ * 6♥ 7♥');
  assert(!rm.armar('E', cs('4♥ * * 7♥ 8♥')), 'dos comodines seguidos no');
  assert(!rm.armar('E', cs('4♥ 5♠ 6♥ 7♥')) && !rm.armar('E', cs('4♥ 5♥ 6♥')) && !rm.armar('E', cs('4♥ 4♥ 5♥ 6♥')));
  assert(rm.armar('S', cs('A♥ 2♠ 3♦ 4♣ 5♥ 6♥ 7♠ 8♦ * 10♣ J♥ Q♠ *')) && !rm.armar('R', cs('A♥ 2♠ 3♦ 4♣ 5♥ 6♥ 7♠ 8♦ 9♣ 10♣ J♥ Q♠ K♠')));
  assert(rm.armar('R', cs('A♣ 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ 8♣ 9♣ 10♣ J♣ Q♣ K♣')) && !rm.armar('R', cs('A♣ 2♣ 3♣ 4♣ 5♣ 6♣ 7♣ 8♣ * 10♣ J♣ Q♣ K♣')));
  // Agregar y cambiar el comodín.
  j = rm.armar('E', cs('4♥ * 6♥ 7♥'));
  assert(nombres(rm.agregar(j, carta('8♥'))) === '4♥ * 6♥ 7♥ 8♥' && !rm.agregar(j, carta('9♥')) && !rm.agregar(j, carta('8♠')));
  const c = rm.cambiar(j, carta('5♥'));
  assert(nombres(c.juego) === '4♥ 5♥ 6♥ 7♥' && rm.esComodin(c.comodin) && !rm.cambiar(j, carta('5♠')));
  const t = rm.cambiar(rm.armar('T', cs('9♦ 9♣ *')), carta('9♥'));
  assert(t && !t.juego.cartas.some(rm.esComodin) && rm.agregar(t.juego, carta('9♠')).cartas.length === 4);
  assert(rm.puntos(cs('A♥ K♠ * 7♦')) === 67);
  // Bajar: la forma que deja menos puntos.
  let b = rm.mejorBajada(cs('7♥ 7♠ 7♦ K♣ K♥ 2♠ 3♠ 4♠ 9♦ * 5♣ 6♦'), ['T', 'T']);
  assert(b && b.usados.length === 6 && b.juegos.every((x) => x.tipo === 'T'), 'dos tríos con el comodín');
  assert(b.usados.map((i) => i).includes(9), 'usa el comodín para el trío de K');
  assert(!rm.mejorBajada(cs('7♥ 7♠ 7♦ 4♠ 5♠ 6♠ 8♠ 2♥ 9♦ 10♣ J♣ Q♦'), ['T', 'E']), 'un solo 7♠ no alcanza para los dos');
  b = rm.mejorBajada(cs('7♥ 7♠ 7♦ 4♠ 5♠ 6♠ 8♠ 7♠ 9♦ 10♣ J♣ Q♦'), ['T', 'E']);
  assert(b && nombres(b.juegos[1]) === '5♠ 6♠ 7♠ 8♠' && b.juegos[0].cartas.length === 3, 'un 7♠ en el trío y el otro en la escala (de 4 justas)');
  // El comodín se queda donde se puso: la escala crece por las puntas sin reacomodarse.
  j = { ...rm.armar('E', cs('5♥ 6♥ 7♥ 8♥')) };
  let op = rm.opcionesAgregar(j, { ...rm.COMODIN });
  assert(op.map((o) => o.lado).join() === 'abajo,arriba' && nombres(op[0].juego) === '* 5♥ 6♥ 7♥ 8♥' && op[0].juego.inicio === 4, 'comodín: elige la punta');
  const conComodin = op[1].juego; // 5 6 7 8 *(9)
  assert(nombres(rm.agregar(conComodin, carta('10♥'))) === '5♥ 6♥ 7♥ 8♥ * 10♥' && !rm.agregar(conComodin, carta('9♥')), 'el comodín no se corre');
  assert(rm.opcionesAgregar(conComodin, { ...rm.COMODIN }).map((o) => o.lado).join() === 'abajo', 'dos comodines seguidos no');
  assert(nombres(rm.agregar(rm.armar('E', cs('Q♥ K♥ A♥ 2♥')), carta('J♥'))) === 'J♥ Q♥ K♥ A♥ 2♥', 'crece por abajo dando la vuelta');
  // Al bajar, cada lugar del comodín es una forma distinta.
  const lugares = rm.bajadas(cs('5♥ 6♥ 7♥ * 2♣ 9♦ J♠'), ['E']).map((f) => nombres(f.juegos[0]));
  assert(lugares.includes('* 5♥ 6♥ 7♥') && lugares.includes('5♥ 6♥ 7♥ *'), lugares.join(' / '));
  // Al bajar: tríos de 3 y escalas de 4 justas; se puede elegir entre las formas, sin comodín primero.
  let fs = rm.bajadas(cs('7♥ 7♠ 7♦ 7♣ K♣ K♥ * 9♦'), ['T', 'T']);
  assert(fs.every((f) => f.juegos.every((x) => x.cartas.length === 3)), 'tríos de 3');
  assert(fs[0].juegos.some((x) => x.cartas.some(rm.esComodin)) && fs.length > 1, 'el de K necesita el comodín; hay varias formas para los 7');
  fs = rm.bajadas(cs('3♥ 4♥ 5♥ 6♥ 7♥ 8♥ 9♦ 9♣ 9♠ 2♣ 2♦ K♠'), ['T', 'E']);
  const escalas = fs.map((f) => nombres(f.juegos[1]));
  assert(escalas.includes('3♥ 4♥ 5♥ 6♥') && escalas.includes('5♥ 6♥ 7♥ 8♥') && escalas[0] === '5♥ 6♥ 7♥ 8♥', 'puede elegir qué escala de 4 baja; la mejor deja menos puntos');
  assert(new Set(fs.map((f) => f.juegos.map(nombres).join('|'))).size === fs.length, 'sin formas repetidas');
  assert(!rm.mejorBajada(cs('7♥ 7♠ 7♦ 4♠ 5♠ 6♠ 2♥ 9♦ 10♣ J♣ Q♦ K♦'), ['T', 'T']));
  b = rm.mejorBajada(cs('3♥ 4♥ 5♥ 6♥ 9♥ 10♥ J♥ Q♥ 2♣ 2♦ 2♠ K♠'), ['E', 'E']);
  assert(b && b.usados.length === 8, 'dos escalas del mismo palo');
  b = rm.mejorBajada(cs('A♥ 2♠ 3♦ 4♣ 5♥ 6♥ 7♠ 8♦ 9♣ 10♣ J♥ * K♠ 4♦'), ['S']);
  assert(b && b.juegos[0].cartas.length === 13 && !b.usados.includes(13), 'escala sucia');
});

import * as car from './games/carioca.js';

probar('carioca: robar, bajar, agregar, comprar, cambiar comodín y puntos', () => {
  const cs = (t) => t.split(' ').filter(Boolean).map((x) => (x === '*' ? { ...rm.COMODIN } : carta(x)));
  const base = (manos, extra = {}) => ({ n: manos.length, contratos: ['2T', 'TE'], extras: { comprar: false, comodin: false }, ronda: 1, reparte: manos.length - 1, turno: 0, fase: 'robar',
    manos: manos.map(cs), mazo: cs('2♣ 3♣ 4♣ 5♣ 6♣ 7♣'), pozo: cs('9♥'), mesa: [], bajados: manos.map(() => false), bajoAhora: false, compras: manos.map(() => 0), oferta: null, vueltas: 0,
    puntos: manos.map(() => 0), ganadas: manos.map(() => 0), ganador: null, aviso: null, resumen: null, ...extra });
  const e = car.nueva(2);
  assert(e.manos.every((m) => m.length === 12) && e.pozo.length === 1 && e.mazo.length === 83 && e.turno === 0 && e.fase === 'robar');
  // Robar del pozo y botar.
  let s = base(['7♥ 7♠ 7♦ K♣ K♥ K♠ 2♦ 4♠', 'A♠ A♥']);
  assert(car.botar(s, 0) === null, 'primero se roba');
  let t = car.robar(s, 'pozo');
  assert(t.manos[0].length === 9 && !t.pozo.length && t.fase === 'jugar');
  // Bajar 2 tríos: en el mismo turno no se agrega; en el siguiente sí.
  t = car.bajar(t);
  assert(t.bajados[0] && t.mesa.length === 2 && t.manos[0].length === 3 && t.bajoAhora);
  t = car.botar(t, 0);
  assert(t.turno === 1 && t.fase === 'robar' && !t.bajoAhora);
  // Elegir otra forma de bajar: tres 7 y dos K con 4 sietes → el trío de 7 sin el 7♣ también vale.
  s = base(['7♥ 7♠ 7♦ 7♣ K♣ K♥ K♠ 2♦', 'A♠ A♥'], { fase: 'jugar' });
  const formas = car.formasDeBajar(s);
  assert(formas.length > 1 && car.bajar(s, Math.random, 1).mesa.map((x) => x.cartas.length).join() === '3,3', 'baja la forma elegida, con tríos de 3');
  assert(car.accion(s, { bajar: true, forma: 1 }).manos[0].length === 2 && car.bajar(s, Math.random, 99) === null);
  s = base(['7♣ 2♦', 'A♠'], { fase: 'jugar', bajados: [true, false], bajoAhora: true, mesa: [{ ...rm.armar('T', cs('7♥ 7♠ 7♦')), dueno: 0 }] });
  assert(car.agregar(s, 0, 0) === null, 'en el turno de bajar no se agrega');
  t = car.agregar({ ...s, bajoAhora: false }, 0, 0);
  assert(t.mesa[0].cartas.length === 4 && t.manos[0].length === 1);
  assert(car.agregar({ ...s, bajoAhora: false, bajados: [false, false] }, 0, 0) === null, 'sin bajar no se agrega');
  // Agregar la última carta gana la ronda: suman los demás (As 20, figuras 10, comodín 30).
  s = base(['7♣', 'A♠ K♥ * 5♦'], { fase: 'jugar', bajados: [true, false], mesa: [{ ...rm.armar('T', cs('7♥ 7♠ 7♦')), dueno: 0 }] });
  t = car.agregar(s, 0, 0);
  assert(t.resumen.j === 0 && t.resumen.sumas.join() === '0,65' && t.ronda === 2 && t.manos[0].length === 12, 'cierra la ronda y reparte');
  // Última ronda: gana quien tiene menos puntos.
  t = car.agregar({ ...s, ronda: 2, puntos: [100, 10] }, 0, 0);
  assert(t.ganador === 1 && t.puntos.join() === '100,75');
  t = car.agregar({ ...s, ronda: 2, puntos: [10, 0], ganadas: [0, 0] }, 0, 0);
  assert(t.puntos.join() === '10,65' && t.ganador === 0);
  // Escala sucia: quien la baja gana la ronda aunque le sobren cartas.
  s = base(['A♥ 2♠ 3♦ 4♣ 5♥ 6♥ 7♠ 8♦ 9♣ 10♣ J♥ * K♠ 4♦', '5♠'], { contratos: ['S'], fase: 'jugar' });
  t = car.bajar(s);
  assert(t.ganador === 0 && t.resumen.sumas.join() === '0,5');
  // Comprar (3 jugadores): el siguiente roba del mazo; el otro compra la botada y se lleva una de castigo.
  s = base(['2♦ 3♦', '4♦ 5♦', '9♥ 9♠'], { extras: { comprar: true, comodin: false }, turno: 1 });
  t = car.robar(s, 'mazo');
  assert(t.fase === 'comprar' && t.turno === 2 && t.oferta.cola.join() === '2');
  let u = car.comprar(t, true);
  assert(u.manos[2].length === 4 && u.compras[2] === 1 && u.turno === 1 && u.fase === 'jugar' && u.manos[1].length === 3);
  u = car.comprar(t, false);
  assert(u.manos[2].length === 2 && u.turno === 1 && u.manos[1].length === 3);
  assert(car.robar(base(['2♦', '4♦', '9♥'], { turno: 1 }), 'mazo').fase === 'jugar', 'sin la regla no se compra');
  // Cambiar el comodín (regla extra), después de bajar.
  s = base(['5♥ 2♣', 'A♠'], { fase: 'jugar', bajados: [true, false], mesa: [{ ...rm.armar('E', cs('4♥ * 6♥ 7♥')), dueno: 1 }] });
  assert(car.cambiar(s, 0, 0) === null, 'sin la regla no');
  t = car.cambiar({ ...s, extras: { comprar: false, comodin: true } }, 0, 0);
  assert(t && rm.esComodin(t.manos[0][0]) && !t.mesa[0].cartas.some(rm.esComodin));
  // El mazo se rebarajó 3 veces: la ronda termina sin ganador.
  s = base(['2♦ 3♦', '4♦'], { fase: 'jugar', vueltas: 3 });
  t = car.botar(s, 0);
  assert(t.ronda === 2 && t.resumen.j === null && t.resumen.sumas.join() === '3,4' && t.ganadas.join() === '0,0');
  // Partidas cortas enteras entre máquinas (normal y difícil) terminan y caben en la base.
  for (const nivel of ['normal', 'dificil']) {
    let p = car.nueva(3, { contratos: car.CORTA, comprar: true, comodin: true });
    for (let i = 0; i < 8000 && p.ganador === null; i++) p = car.accion(p, car.maquina(p, nivel));
    assert(p.ganador !== null && JSON.stringify(p).length < 8000, `partida ${nivel}`);
  }
});

import * as bk from './games/burako.js';

probar('burako: escaleras, piernas, comodines, muerto, cierre y puntos', () => {
  // '7r' = 7 rojo (r, a azul, m amarillo, n negro); '*' = comodín.
  const COL = { r: 'rojo', a: 'azul', m: 'amarillo', n: 'negro' };
  const fs = (t) => t.split(' ').filter(Boolean).map((x) => (x === '*' ? { ...rm.COMODIN } : { v: +x.slice(0, -1), p: COL[x.at(-1)] }));
  const vs = (j) => j.cartas.map((c) => (c.v ? c.v : '*')).join(' ');
  // Juegos.
  assert(vs(rm.armar('L', fs('5r 3r 4r'))) === '3 4 5' && !rm.armar('L', fs('3r 4a 5r')) && !rm.armar('L', fs('3r 4r')));
  assert(vs(rm.armar('L', fs('1r 12r 13r'))) === '12 13 1' && vs(rm.armar('L', fs('1r 2r 3r'))) === '1 2 3', 'el 1 abajo o arriba');
  assert(!rm.armar('L', fs('13r 1r 2r 3r')), 'sin vuelta');
  assert(vs(rm.armar('L', fs('3r * 5r'))) === '3 * 5' && !rm.armar('L', fs('3r * * 6r')), 'un comodín');
  let j = rm.armar('L', fs('3r 2a 5r'));
  assert(j && j.sucio && vs(j) === '3 2 5', 'un 2 de otro color es comodín');
  j = rm.armar('L', fs('1r 2r 3r'));
  assert(j && !j.sucio, 'el 2 en su lugar es natural');
  assert(rm.armar('L', fs('2r 3r 4r 2n')).sucio && !rm.armar('L', fs('2a 3r 4r 2n')), 'dos 2 de otro color no');
  assert(rm.armar('P', fs('7r 7r 7a')) && rm.armar('P', fs('7r * 7a')).sucio && !rm.armar('P', fs('7r * 2a')) && !rm.armar('P', fs('2r 2a 2n')));
  assert(bk.valor({ v: 1 }) + bk.valor({ v: 2 }) + bk.valor({ v: 7 }) + bk.valor({ v: 8 }) + bk.valor({ v: 0 }) === 100);
  const e = bk.nueva(4);
  assert(e.manos.every((m) => m.length === 11) && e.muertos.every((m) => m.length === 11) && e.pozo.length === 1 && e.mazo.length === 106 - 44 - 22 - 1);
  const base = (manos, extra = {}) => ({ n: manos.length, ronda: 1, reparte: manos.length - 1, turno: 0, fase: 'jugar', manos: manos.map(fs), mazo: fs('9n 9n 9n'), pozo: fs('4a 6m'),
    muertos: [fs('5n 5n'), fs('6n 6n')], mesa: [[], []], puntos: [0, 0], ganador: null, aviso: null, resumen: null, ...extra });
  // Robar: el pozo entero.
  let t = bk.robar({ ...base(['1r']), fase: 'robar' }, 'pozo');
  assert(t.manos[0].length === 3 && !t.pozo.length && t.fase === 'jugar');
  // Bajar y agregar (solo a los juegos del equipo).
  t = bk.bajar(base(['3r 4r 5r 9a 10a']), [0, 1, 2]);
  assert(t.mesa[0].length === 1 && t.manos[0].length === 2);
  assert(bk.bajar(base(['3r 4r 6r 9a']), [0, 1, 2]) === null);
  t = bk.agregar(base(['6r 9a'], { mesa: [[rm.armar('L', fs('3r 4r 5r'))], []] }), [0], 0);
  assert(vs(t.mesa[0][0]) === '3 4 5 6');
  // Quedarse sin fichas: toma el muerto y sigue; si fue al botar, el turno pasa.
  t = bk.bajar(base(['7r 7a 7n', '1r']), [0, 1, 2]);
  assert(t.manos[0].length === 2 && !t.muertos[0] && t.turno === 0);
  t = bk.botar(base(['8r', '1r']), 0);
  assert(t.manos[0].length === 2 && !t.muertos[0] && t.turno === 1);
  // Sin burako no se cierra: le tiene que quedar una para botar.
  const sinMuerto = { muertos: [null, fs('6n 6n')], mesa: [[rm.armar('P', fs('9r 9r 9a 9a 9n 9n'))], []] };
  assert(bk.agregar(base(['9m 4r'], { ...sinMuerto, mesa: [[rm.armar('P', fs('9r 9r 9a 9a 9n'))], []] }), [0], 0) === null, 'quedaría con una sola');
  assert(bk.botar(base(['4r'], sinMuerto), 0) === null);
  // Con burako (7) cierra: +100, el rival resta su atril y el muerto que no tomó.
  t = bk.agregar(base(['9m 4r', '1r 13a'], sinMuerto), [0], 0);
  t = bk.botar(t, 0);
  assert(t.resumen.cierra === 0 && t.ronda === 2, 'cierra la mano');
  const [a, b] = t.resumen.filas;
  assert(a.juegos === 70 && a.burakos === 200 && a.cierre === 100 && a.atril === 0 && a.total === 370, JSON.stringify(a));
  assert(b.muerto === -100 && b.atril === -25 && b.total === -125 && t.puntos.join() === '370,-125', JSON.stringify(b));
  // A 3000 gana el equipo con más.
  t = bk.botar(bk.agregar(base(['9m 4r', '1r'], { ...sinMuerto, puntos: [2700, 2900] }), [0], 0), 0);
  assert(t.ganador === 0 && t.fase === 'fin');
  // Mazo agotado: termina la mano sin cierre.
  t = bk.botar(base(['4r 5r', '1r'], { mazo: [] }), 0);
  assert(t.resumen.cierra === null && t.ronda === 2);
  // Partidas enteras entre máquinas (2 y 4, normal y difícil) terminan y caben en la base.
  for (const [n, nivel] of [[2, 'normal'], [4, 'dificil']]) {
    let p = bk.nueva(n);
    let max = 0;
    for (let i = 0; i < 20000 && p.ganador === null; i++) {
      p = bk.accion(p, bk.maquina(p, nivel));
      max = Math.max(max, JSON.stringify(p).length);
    }
    assert(p.ganador !== null && max < 8000, `partida de ${n} ${nivel}`);
  }
});

import { generador, azar as azarDe } from './games/semilla.js';
import * as sp from './games/serpiente.js';
import * as sl from './games/saltar.js';
import * as au from './games/autos.js';
import * as ld from './games/ladrillos.js';

probar('arcade: semilla, serpiente, saltar, autos y ladrillos', () => {
  const g1 = generador(42), g2 = generador(42);
  assert([1, 2, 3].every(() => azarDe(g1) === azarDe(g2)) && azarDe(generador(1)) !== azarDe(generador(2)), 'misma semilla, misma secuencia');
  // Serpiente: avanza cada `cada` cuadros, come y crece, no da media vuelta, choca con el borde.
  let e = sp.nuevo(5);
  e.fruta = [4, 7];
  for (let i = 0; i < e.cada; i++) sp.paso(e, null);
  assert(e.cuerpo[0].join() === '4,7' && e.cuerpo.length === 4 && e.puntos === 1, 'come la fruta');
  sp.paso(e, 'izquierda');
  assert(!e.cola.length, 'no da media vuelta');
  e = sp.nuevo(5);
  e.fruta = [0, 0];
  for (let i = 0; i < 200 && !e.fin; i++) sp.paso(e, null);
  assert(e.fin && e.cuerpo[0][0] === sp.N - 1, 'choca con el borde');
  // Saltar: salta, doble salto y vuelve al suelo; un cactus encima termina la partida.
  let s = sl.nuevo(3);
  sl.paso(s, true);
  sl.paso(s, true);
  assert(s.saltos === 2 && s.y > 0, 'doble salto');
  sl.paso(s, true);
  assert(s.saltos === 2, 'no hay triple salto');
  for (let i = 0; i < 80; i++) sl.paso(s, false);
  assert(s.y === 0 && s.saltos === 0 && s.puntos > 0);
  s = sl.nuevo(3);
  s.obstaculos.push({ x: sl.JUGADOR.x, y: 0, w: 18, h: 40, tipo: 'cactus' });
  sl.paso(s, false);
  assert(s.fin, 'choca con el cactus');
  // Autos: cambia de pista (sin salirse) y choca con un auto en su pista.
  let a = au.nuevo(9);
  au.paso(a, 'izquierda');
  au.paso(a, 'izquierda');
  assert(a.carril === 0);
  for (let i = 0; i < 20; i++) au.paso(a, null);
  assert(a.x === au.centro(0) && !a.fin);
  a.cosas.push({ carril: 0, y: au.Y_JUGADOR, tipo: 'auto', color: 0 });
  au.paso(a, null);
  assert(a.fin, 'choque');
  a = au.nuevo(9);
  a.cosas.push({ carril: 1, y: au.Y_JUGADOR + 10, tipo: 'moneda' });
  au.paso(a, null);
  assert(a.monedas === 1 && a.puntos >= 10, 'moneda');
  // Ladrillos: rompe un ladrillo (y suma su valor) y pierde una vida si la pelota cae.
  let l = ld.nuevo(4);
  assert(l.ladrillos.length === ld.FILAS * ld.COLS);
  l.bola = { x: 20, y: ld.LADRILLO.arriba + ld.FILAS * ld.LADRILLO.h + 4, vx: 0, vy: -4 };
  ld.paso(l, null);
  assert(l.ladrillos.length === ld.FILAS * ld.COLS - 1 && l.puntos === ld.valor(ld.FILAS - 1) && l.bola.vy > 0, 'rompe y rebota');
  l.bola = { x: 20, y: ld.ALTO + 10, vx: 0, vy: 4 };
  ld.paso(l, null);
  assert(l.vidas === 2 && l.bola === null);
  // Misma semilla y mismas jugadas = misma partida; las partidas sin jugar terminan.
  for (const M of [sp, sl, au, ld]) {
    const [x, y] = [M.nuevo(77), M.nuevo(77)];
    let i = 0;
    for (; i < 60 * 300 && !x.fin; i++) {
      M.paso(x, null);
      M.paso(y, null);
    }
    assert(x.fin && JSON.stringify(x) === JSON.stringify(y), 'misma partida');
  }
});

import * as bl from './games/bloques.js';

probar('arcade: bloques', () => {
  // Misma semilla, mismas piezas; cada bolsa de 7 trae las 7.
  const piezas = (s) => {
    const e = bl.nuevo(s);
    const lista = [e.pieza.t];
    for (let i = 0; i < 13; i++) { bl.paso(e, 'soltar'); lista.push(e.pieza?.t); e.celdas.forEach((f) => f.fill(null)); }
    return lista;
  };
  assert(piezas(7).join() === piezas(7).join() && piezas(7).join() !== piezas(8).join(), 'misma semilla, mismas piezas');
  assert(new Set(piezas(7).slice(0, 7)).size === 7 && new Set(piezas(7).slice(7, 14)).size === 7, 'bolsa de 7');
  // Una línea: fila de abajo llena salvo 4 huecos que tapa una I acostada.
  const conI = (filas, nivel = 1) => {
    const e = bl.nuevo(1);
    for (let f = 0; f < filas; f++) e.celdas[bl.ALTO - 1 - f] = Array.from({ length: bl.ANCHO }, (_, x) => (x < 4 ? null : 'x'));
    e.pieza = { t: 'I', n: 4, c: filas === 4 ? [[0, 0], [0, 1], [0, 2], [0, 3]] : bl.PIEZAS.I.c, x: 0, y: 0 };
    if (filas === 4) for (let f = 0; f < 4; f++) e.celdas[bl.ALTO - 1 - f] = Array.from({ length: bl.ANCHO }, (_, x) => (x === 0 ? null : 'x'));
    e.nivel = nivel;
    const y = bl.filaFinal(e);
    bl.paso(e, 'soltar');
    return { e, caida: y };
  };
  let { e, caida } = conI(1, 2);
  assert(e.lineas === 1 && e.puntos === 100 * 2 + 2 * caida && e.celdas[bl.ALTO - 1].every((c) => !c), 'una línea: 100 × nivel + soltar');
  ({ e, caida } = conI(4));
  assert(e.lineas === 4 && e.puntos === 800 + 2 * caida && e.celdas.every((f) => f.every((c) => !c)), 'cuatro líneas: 800');
  // No gira dentro de una pared ocupada; junto al borde, gira corriéndose.
  e = bl.nuevo(1);
  e.pieza = { t: 'I', n: 4, c: [[1, 0], [1, 1], [1, 2], [1, 3]], x: -1, y: 5 }; // I de pie pegada a la izquierda
  bl.paso(e, 'girar');
  assert(e.pieza.c.every(([x]) => e.pieza.x + x >= 0) && e.pieza.c.every(([, y]) => y === 1), 'gira corriéndose del borde');
  e = bl.nuevo(1);
  e.celdas.forEach((f) => f.fill('x'));
  for (let y = 0; y < bl.ALTO; y++) e.celdas[y][4] = null;
  e.pieza = { t: 'I', n: 4, c: [[0, 0], [0, 1], [0, 2], [0, 3]], x: 4, y: 3 };
  const antes = JSON.stringify(e.pieza.c);
  bl.paso(e, 'girar');
  assert(JSON.stringify(e.pieza.c) === antes, 'sin sitio no gira');
  // Modos: contrarreloj gana a las 40 líneas; 2 minutos acaba a los 7200 cuadros; escombros sube basura.
  e = bl.nuevo(1, 'contrarreloj');
  e.lineas = 39;
  e.celdas[bl.ALTO - 1] = Array.from({ length: bl.ANCHO }, (_, x) => (x < 4 ? null : 'x'));
  e.pieza = { t: 'I', n: 4, c: bl.PIEZAS.I.c, x: 0, y: 0 };
  e.cuadros = 599;
  bl.paso(e, 'soltar');
  assert(e.fin && e.gano && bl.resultado(e) === 100, 'contrarreloj: 40 líneas, marca en décimas');
  e = bl.nuevo(1, 'dosmin');
  e.cuadros = bl.CUADROS_DOSMIN - 1;
  bl.paso(e, null);
  assert(e.fin && e.nivel === 5, '2 minutos');
  e = bl.nuevo(1, 'escombros');
  const basura = () => e.celdas.filter((f) => f.includes('x')).length;
  assert(basura() === 8 && e.celdas.slice(-8).every((f) => f.filter(Boolean).length === bl.ANCHO - 1), 'escombros: 8 filas con un hueco');
  e.cuadros = bl.CADA_BASURA - 1;
  e.pieza = { ...e.pieza, y: 0 };
  bl.paso(e, null);
  assert(basura() === 9 && !e.fin, 'escombros: sube una fila');
  // Fin: la pieza nueva no cabe.
  e = bl.nuevo(1);
  e.celdas.slice(0, 3).forEach((f) => f.fill('x'));
  for (let y = 0; y < bl.ALTO; y++) e.celdas[y][9] = null;
  bl.paso(e, 'soltar');
  assert(e.fin, 'se tapa y termina');
  // Bajar rápido suma 1 por fila.
  e = bl.nuevo(3);
  e.bajando = true;
  for (let i = 0; i < 10; i++) bl.paso(e, null);
  assert(e.puntos === 5 && e.pieza.y === 5, 'bajar rápido');
});

import * as dic from './games/diccionario.js';
import * as pd from './games/palabra.js';
import * as hc from './games/ahorcado.js';
import * as so from './games/sopa.js';

probar('palabras: listas, palabra del día, ahorcado y sopa', () => {
  // Listas: mayúsculas sin tildes (con Ñ), sin repetidas; las soluciones y las válidas, de 5 letras.
  const todas = dic.TEMAS.flatMap((t) => t.palabras);
  assert(todas.every((x) => /^[A-ZÑ]{4,12}$/.test(x)) && new Set(todas).size === todas.length, 'temas');
  assert(dic.TEMAS.every((t) => t.palabras.length >= 40), 'al menos 40 por tema');
  assert(dic.SOLUCIONES.every((x) => /^[A-ZÑ]{5}$/.test(x) && dic.VALIDAS.has(x)) && dic.SOLUCIONES.length >= 365, 'soluciones');
  assert([...dic.VALIDAS].every((x) => /^[A-ZÑ]{5}$/.test(x)), 'válidas');
  assert(dic.mostrar('CAMION') === 'CAMIÓN' && dic.mostrar('PERRO') === 'PERRO');
  // Colores, con letras repetidas: cada 🟨 cuenta solo las que faltan por marcar.
  assert(pd.pista('PERRO', 'PERRO').join('') === 'vvvvv');
  assert(pd.pista('RROPA', 'PERRO').join('') === 'aaaag', pd.pista('RROPA', 'PERRO').join(''));
  assert(pd.pista('ERRAR', 'PERRO').join('') === 'aavgg', 'la última R ya no tiene pareja');
  assert(pd.pista('OSITO', 'PERRO').join('') === 'ggggv', 'una sola O: la que está en su lugar');
  const teclas = pd.colorTeclas(['RROPA', 'PERRO'], 'PERRO');
  assert(teclas.P === 'v' && teclas.A === 'g', 'el teclado guarda el mejor color');
  // El día: 1 el 2026-11-04, igual a cualquier hora; la palabra no cambia en el día.
  assert(pd.numeroDia(new Date(2026, 10, 4, 0, 1)) === 1 && pd.numeroDia(new Date(2026, 10, 4, 23, 59)) === 1 && pd.numeroDia(new Date(2026, 10, 5)) === 2);
  assert(pd.palabraDelDia(1) === pd.palabraDelDia(1) && pd.palabraDelDia(1) !== pd.palabraDelDia(2));
  assert(pd.palabraDelDia(1) === pd.palabraDelDia(1 + dic.SOLUCIONES.length), 'vuelve a empezar');
  // Racha: sigue al acertar el día siguiente, se corta al fallar o al saltarse un día.
  let st = pd.anotar({}, 1, true, 3);
  st = pd.anotar(st, 2, true, 4);
  assert(st.racha === 2 && st.mejor === 2 && st.dist[2] === 1 && st.dist[3] === 1 && st.jugadas === 2);
  assert(pd.rachaActual(st, 3) === 2 && pd.rachaActual(st, 4) === 0, 'saltarse un día la corta');
  st = pd.anotar(st, 4, true, 1);
  assert(st.racha === 1 && st.mejor === 2);
  st = pd.anotar(st, 5, false, 6);
  assert(st.racha === 0 && st.mejor === 2 && st.jugadas === 4);
  assert(pd.textoCompartir(7, ['RROPA', 'PERRO'], 'PERRO') === "Pa'l Rato 🔤 #7 2/6\n🟨🟨🟨🟨⬛\n🟩🟩🟩🟩🟩");
  // Ahorcado: acierto, fallo, letra repetida, puntos y perder.
  let h = hc.nueva(5, 'facil');
  const pal = h.ronda.palabra;
  assert(pal.length >= 4 && pal.length <= 6, 'largo del nivel');
  const falla = [...hc.LETRAS].find((l) => !pal.includes(l));
  hc.probar(h, falla);
  hc.probar(h, falla);
  assert(h.ronda.fallos === 1, 'repetir una letra no cuenta');
  for (const l of new Set(pal)) hc.probar(h, l);
  assert(h.ronda.estado === 'ganada' && h.puntos === 10 + hc.FALLOS - 1 && h.palabras === 1);
  hc.siguiente(h);
  for (const l of [...hc.LETRAS].filter((x) => !h.ronda.palabra.includes(x)).slice(0, hc.FALLOS)) hc.probar(h, l);
  assert(h.ronda.estado === 'perdida' && h.fin, 'al sexto fallo pierde');
  assert(JSON.stringify(hc.nueva(9, 'dificil')) === JSON.stringify(hc.nueva(9, 'dificil')) && hc.nueva(9, 'dificil').ronda.palabra.length >= 8, 'misma semilla');
  // Sopa: las 8 caben y se leen en su lugar; misma semilla = misma sopa; marcar al revés y en diagonal.
  for (const nivel of ['facil', 'normal', 'dificil']) {
    for (let s = 1; s <= 200; s++) {
      const e = so.nueva(s, nivel);
      assert(e.palabras.length === so.CUANTAS && e.filas.length === e.n && e.filas.every((f) => [...f].length === e.n), `${nivel} ${s}`);
      for (const w of e.palabras) assert([...w.palabra].every((l, i) => [...e.filas[w.y + w.dy * i]][w.x + w.dx * i] === l), w.palabra);
    }
  }
  assert(JSON.stringify(so.nueva(3, 'dificil')) === JSON.stringify(so.nueva(3, 'dificil')));
  const e = so.nueva(3, 'dificil');
  const w = e.palabras[0];
  const fin = [w.x + w.dx * (w.palabra.length - 1), w.y + w.dy * (w.palabra.length - 1)];
  assert(so.marcar(e, [w.x, w.y], [w.x, w.y]) === -1, 'una sola letra no');
  assert(so.marcar(e, fin, [w.x, w.y]) === 0 && e.puntos === 100 && e.palabras[0].hallada, 'al revés también vale');
  assert(so.marcar(e, fin, [w.x, w.y]) === -1 && e.puntos === 100, 'no se cuenta dos veces');
  for (const x of e.palabras.slice(1)) so.marcar(e, [x.x, x.y], [x.x + x.dx * (x.palabra.length - 1), x.y + x.dy * (x.palabra.length - 1)]);
  assert(e.fin && e.puntos === 800);
  so.cerrar(e, 30);
  assert(e.puntos === 950, 'bonus por segundos');
  assert(so.linea([0, 0], [3, 3]).length === 4 && so.linea([0, 0], [2, 3]).length === 0 && so.linea([4, 1], [1, 1]).join() === '4,1,3,1,2,1,1,1');
});

import * as ch from './games/charadas.js';
import * as ep from './games/escalera.js';
import * as ge from './games/granescalera.js';
import { DEFINICIONES } from './games/definiciones.js';
import { PREGUNTAS as BANCO, BASE } from './games/preguntas.js';

probar('palabras: charadas, escalera de palabras y la gran escalera', () => {
  // Charadas: la inclinación (vertical u horizontal) y sin repetir las ya usadas.
  assert(ch.inclinacion(0, 90) === 'recto' && ch.inclinacion(5, -88) === 'recto' && ch.inclinacion(90, 0) === 'recto', 'de pie');
  assert(ch.inclinacion(0, 0) === 'arriba' && ch.inclinacion(180, 0) === 'abajo' && ch.inclinacion(-170, 20) === 'abajo');
  assert(ch.inclinacion(0, 55) === null, 'a medio camino, nada');
  const usadas = ch.palabrasDe('deportes').slice(0, 30);
  const c = ch.nueva('deportes', usadas);
  assert(!usadas.includes(ch.actual(c)) && c.palabras.length === ch.palabrasDe('deportes').length, 'primero las no usadas');
  ch.marcar(c, 'acierto');
  ch.marcar(c, 'paso');
  assert(c.aciertos === 1 && c.jugadas.length === 2 && !c.jugadas[1].acierto);
  assert(ch.palabrasDe('acciones').includes('SALTAR LA CUERDA') && ch.palabrasDe('animales').includes('RATÓN'));
  // Definiciones: sin tildes, sin repetir y al menos 20 por largo.
  assert(DEFINICIONES.every((d) => /^[A-ZÑ]+$/.test(d.palabra) && d.definicion.length > 5 && [...d.tilde].length === [...d.palabra].length));
  assert(new Set(DEFINICIONES.map((d) => d.palabra)).size === DEFINICIONES.length);
  for (let l = 4; l <= 11; l++) assert(DEFINICIONES.filter((d) => d.palabra.length === l).length >= 20, `largo ${l}`);
  // Escalera: largos crecientes, destapar, puntos por las ocultas, fallo y vidas, misma semilla.
  let e = ep.nueva(11);
  assert(e.palabras.map((w) => w.palabra.length).join() === ep.LARGOS.join() && new Set(e.palabras.map((w) => w.palabra)).size === 10);
  assert(JSON.stringify(ep.nueva(11)) === JSON.stringify(e), 'misma semilla');
  ep.destapar(e);
  ep.destapar(e);
  assert(ep.visibles(e).length === 2);
  ep.responder(e, ep.actual(e).palabra);
  assert(e.estado === 'acertada' && e.puntos === 10 * (4 - 2));
  ep.siguiente(e);
  ep.responder(e, 'XXXXX');
  assert(e.estado === 'fallada' && e.vidas === 2 && !e.fin);
  ep.siguiente(e);
  for (let k = 0; k < 6; k++) ep.destapar(e);
  assert(e.estado === 'fallada' && e.vidas === 1, 'se destaparon todas');
  ep.siguiente(e);
  ep.responder(e, 'NO');
  assert(e.fin && e.vidas === 0);
  e = ep.nueva(2);
  for (let k = 0; k < 10; k++) {
    ep.responder(e, ep.actual(e).palabra);
    ep.siguiente(e);
  }
  assert(e.fin && e.puntos === 10 * ep.LARGOS.reduce((a, b) => a + b, 0), 'las 10 sin letras destapadas');
  // Gran escalera: 5 + 5 + 5 por dificultad, escalones, seguros, plantarse, sin tiempo, ayudas y misma semilla.
  const banco = BANCO.slice(0, BASE);
  let g = ge.nueva(8, banco);
  assert(g.preguntas.map((q) => q.d).join('') === '111112222233333' && new Set(g.preguntas.map((q) => q.p)).size === 15);
  assert(JSON.stringify(ge.nueva(8, banco)) === JSON.stringify(g), 'misma semilla');
  assert(g.preguntas.every((q) => q.publico.reduce((a, b) => a + b, 0) === 100 && !q.quita.includes(q.correcta) && q.opciones[q.correcta] === banco.find((x) => x.p === q.p).o[0]));
  for (let k = 0; k < 6; k++) ge.responder(g, ge.actual(g).correcta);
  assert(g.nivel === 6 && g.ganado === 2000);
  ge.ayuda(g, 'mitad');
  assert(g.quitadas.length === 2 && !g.quitadas.includes(ge.actual(g).correcta) && !g.ayudas.mitad);
  ge.responder(g, g.quitadas[0]);
  assert(!g.fin, 'una quitada no se puede elegir');
  const antes = ge.actual(g).p;
  ge.ayuda(g, 'cambiar');
  assert(ge.actual(g).p !== antes && ge.actual(g).d === 2 && !g.quitadas.length);
  ge.ayuda(g, 'publico');
  assert(g.votos && g.votos.reduce((a, b) => a + b, 0) === 100);
  ge.responder(g, (ge.actual(g).correcta + 1) % 4);
  assert(g.fin && g.resultado === 'fallo' && g.ganado === 1000, 'cae al seguro de 1000');
  g = ge.nueva(9, banco);
  ge.responder(g, ge.actual(g).correcta);
  ge.sinTiempo(g);
  assert(g.resultado === 'tiempo' && g.ganado === 0);
  g = ge.nueva(9, banco);
  for (let k = 0; k < 3; k++) ge.responder(g, ge.actual(g).correcta);
  ge.plantarse(g);
  assert(g.resultado === 'plantado' && g.ganado === 300);
  g = ge.nueva(9, banco);
  for (let k = 0; k < 15; k++) ge.responder(g, ge.actual(g).correcta);
  assert(g.resultado === 'gano' && g.ganado === 1000000);
  assert(ge.seguro(4) === 0 && ge.seguro(5) === 1000 && ge.seguro(10) === 32000);
});

// --- premios.js ---
import { premio, hoyDe, TOPE, ANUNCIO } from './games/premios.js';

assert(ANUNCIO === 100, 'el anuncio da 100 fichas');

probar('premios: montos y una vez al día', () => {
  let r = {};
  let p = premio(r, 'tudia', '2026-11-05');
  assert(p.fichas === 100, `tudia dio ${p.fichas}`);
  r = p.registro;
  assert(premio(r, 'tudia', '2026-11-05').fichas === 0, 'tudia dos veces');
  p = premio(r, 'palabra', '2026-11-05');
  assert(p.fichas === 50);
  r = p.registro;
  assert(premio(r, 'palabra', '2026-11-05').fichas === 0, 'palabra dos veces');
  const h = hoyDe(r, '2026-11-05');
  assert(h.tudia && h.palabra && h.ganadas === 150 && h.diarios === 0);
});

probar('premios: niveles diarios hasta 10 y tope de 250', () => {
  let r = {};
  let total = 0;
  for (let i = 0; i < 12; i++) {
    const p = premio(r, 'diario', '2026-11-05');
    total += p.fichas;
    r = p.registro;
  }
  assert(total === 100, `diarios dieron ${total}`);
  assert(hoyDe(r, '2026-11-05').diarios === 10);
  r = premio(r, 'tudia', '2026-11-05').registro; // 200
  const p = premio(r, 'palabra', '2026-11-05'); // solo caben 50
  assert(p.fichas === 50 && p.registro.ganadas === TOPE, `palabra dio ${p.fichas}`);
  const q = premio({ ...p.registro, hechos: [] }, 'tudia', '2026-11-05');
  assert(q.fichas === 0, 'pasado el tope no da nada');
});

probar('premios: día nuevo empieza de cero', () => {
  const r = premio({}, 'tudia', '2026-11-05').registro;
  assert(premio(r, 'tudia', '2026-11-05').fichas === 0, 'dos veces el mismo día');
  assert(premio(r, 'tudia', '2026-11-06').fichas === 100, 'otro día');
  assert(premio(null, 'palabra', '2026-11-06').fichas === 50, 'sin registro');
});

// --- perfil.js ---
import { nivelDe, xpDe, marcosDisponibles, AVATARES, cobrarCalendario, diaDeHoy, misionesDe, avanzar } from './games/perfil.js';

probar('perfil: curva de niveles y títulos', () => {
  assert(nivelDe(0).nivel === 1 && nivelDe(0).paraSubir === 100 && nivelDe(0).titulo === 'Novato');
  assert(nivelDe(99).nivel === 1 && nivelDe(100).nivel === 2 && nivelDe(100).enNivel === 0 && nivelDe(100).paraSubir === 120);
  assert(nivelDe(220).nivel === 3, 'nivel 3 con 100+120');
  const xpPara = (n) => { let x = 0; for (let i = 1; i < n; i++) x += 100 + 20 * (i - 1); return x; };
  for (const [n, t] of [[9, 'Novato'], [10, 'Aprendiz'], [20, 'Hábil'], [30, 'Experto'], [40, 'Maestro'], [50, 'Leyenda'], [80, 'Leyenda']]) {
    assert(nivelDe(xpPara(n)).nivel === n && nivelDe(xpPara(n)).titulo === t, `nivel ${n}`);
  }
});

probar('perfil: XP por evento y marcos', () => {
  assert(xpDe('partida') === 10 && xpDe('victoria') === 20 && xpDe('empate') === 10 && xpDe('entreno') === 30 && xpDe('estrellas', 3) === 15 && xpDe('otro') === 0);
  const ids = marcosDisponibles(15).map((m) => m.id);
  assert(ids.includes('oro') && !ids.includes('esmeralda') && ids[0] === 'ninguno', ids.join());
  assert(AVATARES.length >= 30 && new Set(AVATARES).size === AVATARES.length, 'avatares');
});

probar('perfil: calendario de 7 días', () => {
  let r = null;
  const dias = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'];
  const fichas = dias.map((d) => { const c = cobrarCalendario(r, d); r = c.registro; return c.fichas; });
  assert(fichas.join() === '50,75,100,125,150,200,400,50', fichas.join());
  assert(cobrarCalendario({ dia: 6, fecha: '2026-11-06' }, '2026-11-07').xp === 100, 'día 7 da XP');
  assert(cobrarCalendario(r, '2026-11-08').fichas === 0, 'dos veces el mismo día');
  assert(diaDeHoy(r, '2026-11-08').cobrado && diaDeHoy(r, '2026-11-09').dia === 2);
  assert(cobrarCalendario({ dia: 4, fecha: '2026-11-01' }, '2026-11-03').dia === 1, 'faltar un día vuelve al 1');
  assert(cobrarCalendario({ dia: 1, fecha: '2026-02-28' }, '2026-03-01').dia === 2, 'cambio de mes');
});

probar('perfil: misiones de la semana', () => {
  const a = misionesDe('2026-W46');
  assert(JSON.stringify(a) === JSON.stringify(misionesDe('2026-W46')), 'misma semana, mismas misiones');
  assert(a.map((m) => m.dificultad).join() === 'facil,media,dificil');
  assert(a.map((m) => m.fichas).join() === '100,200,300' && a.map((m) => m.xp).join() === '50,100,150');
  for (let s = 1; s <= 52; s++) {
    const ms = misionesDe(`2027-W${String(s).padStart(2, '0')}`);
    const secs = ms.map((m) => m.seccion).filter(Boolean);
    assert(new Set(secs).size === secs.length, `secciones repetidas en ${s}`);
    for (const m of ms) assert(!m.texto.includes('{'), m.texto);
  }
});

probar('perfil: avance de misiones', () => {
  // Busca una semana con la misión de sección fácil y otra con «4 secciones distintas».
  const semanaCon = (id) => { for (let s = 1; s <= 53; s++) { const w = `2027-W${String(s).padStart(2, '0')}`; if (misionesDe(w).some((m) => m.id === id)) return w; } };
  const w = semanaCon('seccion3');
  const m = misionesDe(w).find((x) => x.id === 'seccion3');
  const otra = ['mentales', 'mesa', 'trivia', 'cartas', 'dados', 'arcade', 'palabras'].find((s) => s !== m.seccion);
  let r = avanzar(null, 'partida', 2, otra, w).registro;
  assert(!r.avance.seccion3, 'otra sección no cuenta');
  r = avanzar(r, 'partida', 2, m.seccion, w).registro;
  assert(r.avance.seccion3 === 2);
  const fin = avanzar(r, 'partida', 1, m.seccion, w);
  assert(fin.cumplidas.some((x) => x.id === 'seccion3') && fin.registro.cobradas.includes('seccion3'), 'se cumple');
  assert(!avanzar(fin.registro, 'partida', 1, m.seccion, w).cumplidas.some((x) => x.id === 'seccion3'), 'no se cobra dos veces');
  const w2 = semanaCon('secciones4');
  let r2 = null;
  for (const s of ['mesa', 'mesa', 'trivia', 'duelos', 'cartas']) r2 = avanzar(r2, 'partida', 1, s, w2).registro;
  assert(r2.secciones.join() === 'mesa,trivia,cartas', r2.secciones.join());
  assert(avanzar(r2, 'partida', 1, 'arcade', w2).cumplidas.some((x) => x.id === 'secciones4'), '4 distintas');
  assert(Object.keys(avanzar(r2, 'partida', 1, 'mesa', '2099-W01').registro.avance).length <= 3, 'semana nueva empieza de cero');
  assert(avanzar(r2, 'partida', 1, 'mesa', '2099-W01').registro.secciones.join() === 'mesa');
});

// --- damas.js (🎲 Mesa) ---
import { damas, jugadas as jugadasDamas } from './games/damas.js';

probar('damas: salida, comer obligatorio y máximo', () => {
  const ini = damas.inicial();
  assert(ini.celdas.length === 64 && ini.turno === 'x' && ini.sinComer === 0);
  assert([...ini.celdas].filter((c) => c === 'x').length === 12 && [...ini.celdas].filter((c) => c === 'o').length === 12);
  assert(damas.validas(ini).length === 7, `salida: ${damas.validas(ini).length}`);
  // Tablero a medida: '.' vacía. Pieza x en 45 (fila 5, col 5); o en 36 (fila 4, col 4) → debe comer 45-27.
  const vacio = '.'.repeat(64).split('');
  const tab = (piezas, turno = 'x') => { const c = [...vacio]; for (const [i, p] of Object.entries(piezas)) c[i] = p; return { celdas: c.join(''), turno, sinComer: 0 }; };
  let e = tab({ 45: 'x', 36: 'o', 1: 'o', 62: 'x' });
  assert(damas.validas(e).join() === '45-27', `obligatorio: ${damas.validas(e)}`);
  // Mayoría: x en 61 puede comer 1 (54, cae en 47) o x en 45 puede comer 2 (36 y luego 20) → solo la de 2.
  e = tab({ 61: 'x', 54: 'o', 45: 'x', 36: 'o', 20: 'o', 3: 'o' });
  assert(damas.validas(e).join() === '45-27-13', `máximo: ${damas.validas(e)}`);
  const d = damas.aplicar(e, '45-27-13');
  assert(d.celdas[13] === 'x' && d.celdas[36] === '.' && d.celdas[20] === '.' && d.celdas[45] === '.' && d.turno === 'o');
  // Peón no come hacia atrás: x en 27, o en 36 (detrás) → no hay captura.
  e = tab({ 27: 'x', 36: 'o', 7: 'o' });
  assert(!damas.validas(e).some((j) => j.startsWith('27-45')), 'peón come atrás');
});

probar('damas: dama voladora, coronar y final', () => {
  const vacio = '.'.repeat(64).split('');
  const tab = (piezas, turno = 'x', sinComer = 0) => { const c = [...vacio]; for (const [i, p] of Object.entries(piezas)) c[i] = p; return { celdas: c.join(''), turno, sinComer }; };
  // Dama en 63 con o en 27 (misma diagonal, lejos) → puede comer cayendo en 18, 9 o 0.
  let e = tab({ 63: 'X', 27: 'o', 7: 'o' });
  assert(damas.validas(e).sort().join() === '63-0,63-18,63-9', `voladora: ${damas.validas(e)}`);
  // Corona al terminar en la fila 0.
  e = tab({ 10: 'x', 60: 'o' });
  const c = damas.aplicar(e, '10-1');
  assert(c.celdas[1] === 'X', 'corona');
  // Sin piezas o sin jugadas: gana el otro.
  assert(damas.ganador(tab({ 10: 'x' }, 'o')) === 'x');
  // Empate: 30 jugadas seguidas solo de damas sin comer.
  e = tab({ 63: 'X', 0: 'O' }, 'x', 29);
  assert(damas.ganador(e) === null);
  const m = damas.aplicar(e, damas.validas(e)[0]);
  assert(m.sinComer === 30 && damas.ganador(m) === 'empate', `sinComer ${m.sinComer}`);
  // Mover un peón reinicia el contador.
  e = tab({ 45: 'x', 63: 'X', 0: 'O' }, 'x', 20);
  assert(damas.aplicar(e, '45-36').sinComer === 0);
});

probar('damas: la máquina juega válido en los 3 niveles', () => {
  let e = damas.inicial();
  for (let k = 0; k < 12 && !damas.ganador(e); k++) {
    const nivel = ['facil', 'normal', 'dificil'][k % 3];
    const j = damas.ia(e, nivel);
    assert(damas.validas(e).includes(j), `${nivel}: ${j}`);
    e = damas.aplicar(e, j);
  }
  assert(jugadasDamas(damas.inicial()).every((j) => j.comidas.length === 0));
});

// --- reversi.js (🎲 Mesa) ---
import { reversi, contar as contarReversi } from './games/reversi.js';

probar('reversi: salida, volteo, pase y final', () => {
  const ini = reversi.inicial();
  assert(ini.turno === 'x' && ini.celdas[27] === 'o' && ini.celdas[28] === 'x' && ini.celdas[35] === 'x' && ini.celdas[36] === 'o');
  assert(reversi.validas(ini).sort((a, b) => a - b).join() === '19,26,37,44', `salida: ${reversi.validas(ini)}`);
  const e = reversi.aplicar(ini, 19);
  assert(e.celdas[19] === 'x' && e.celdas[27] === 'x' && e.turno === 'o' && contarReversi(e).x === 4 && contarReversi(e).o === 1);
  // Volteo en dos direcciones a la vez: x juega en 0 con o en 1 y 9, x en 2 y 18.
  const vacio = '.'.repeat(64).split('');
  const tab = (piezas, turno) => { const c = [...vacio]; for (const [i, p] of Object.entries(piezas)) c[i] = p; return { celdas: c.join(''), turno }; };
  let t = reversi.aplicar(tab({ 1: 'o', 2: 'x', 9: 'o', 18: 'x', 63: 'o' }, 'x'), 0);
  assert(t.celdas[1] === 'x' && t.celdas[9] === 'x', 'voltea en las dos direcciones');
  // Pase: después de la jugada, o no tiene jugadas pero x sí → sigue x.
  t = reversi.aplicar(tab({ 0: 'x', 1: 'o', 3: 'o', 4: 'x' }, 'x'), 2);
  assert(t.turno === 'x' || reversi.ganador(t), 'pase o final');
  // Final: tablero sin jugadas para nadie → gana quien tiene más.
  const lleno = tab({ 0: 'x', 1: 'x', 2: 'x' }, 'x');
  assert(reversi.validas(lleno).length === 0 && reversi.ganador(lleno) === 'x');
  assert(reversi.ganador(tab({ 0: 'x', 63: 'o' }, 'x')) === 'empate');
  assert(reversi.ganador(ini) === null);
});

probar('reversi: la máquina juega válido y toma esquinas', () => {
  let e = reversi.inicial();
  for (let k = 0; k < 10 && !reversi.ganador(e); k++) {
    const j = reversi.ia(e, ['facil', 'normal', 'dificil'][k % 3]);
    assert(reversi.validas(e).includes(j));
    e = reversi.aplicar(e, j);
  }
  const vacio = '.'.repeat(64).split('');
  vacio[9] = 'o'; vacio[18] = 'x'; vacio[10] = 'o'; vacio[11] = 'x';
  const e2 = { celdas: vacio.join(''), turno: 'x' };
  assert(reversi.validas(e2).includes(0) && reversi.ia(e2, 'normal') === 0, 'esquina');
});

// --- dados.js y generala.js (🎲 Dados) ---
import { tirar as tirarDados, contar as contarDados, PINTAS } from './games/dados.js';
import * as gen from './games/generala.js';

probar('dados: tirar con la misma semilla repite, no modifica el generador y cuenta', () => {
  const g = { s: 5 };
  const a = tirarDados(g, 5), b = tirarDados({ s: 5 }, 5);
  assert(g.s === 5 && a.g !== g && a.dados.length === 5 && a.dados.every((d) => d >= 1 && d <= 6), 'forma');
  assert(a.dados.join() === b.dados.join(), 'repetible');
  assert(contarDados([1, 2, 2, 6, 2], 2) === 3 && PINTAS.length === 6 && PINTAS[0].nombre === 'As' && PINTAS[5].n === 6);
});

// Estado de Generala con una mano fija (tirada nº `t`) para el jugador 0; `tabla` pone casillas ya anotadas.
const conMano = (dados, t = 2, tabla = {}) => {
  const e = gen.nueva(2, 1);
  e.dados = dados; e.tiradas = t;
  Object.assign(e.jugadores[0].tabla, tabla);
  return e;
};

probar('generala: puntajes de cada casilla, servidas, doble y tachar', () => {
  const p = (d, t, tabla) => gen.posibles(conMano(d, t, tabla));
  assert(gen.CASILLAS.length === 11);
  const a = p([3, 3, 1, 3, 6], 2);
  assert(a['3'] === 9 && a['1'] === 1 && a['6'] === 6 && a['2'] === 0 && a.escalera === 0 && a.full === 0 && a.poker === 0 && a.generala === 0 && a.doble === 0, 'sueltos');
  assert(p([1, 2, 3, 4, 5], 2).escalera === 20 && p([6, 2, 3, 4, 5], 2).escalera === 20 && p([1, 2, 3, 4, 6], 2).escalera === 0, 'escalera');
  assert(p([1, 2, 3, 4, 5], 1).escalera === 25 && p([2, 3, 4, 5, 6], 1).escalera === 25, 'escalera servida');
  assert(p([2, 2, 5, 5, 5], 2).full === 30 && p([2, 2, 5, 5, 5], 1).full === 35 && p([2, 2, 2, 2, 5], 2).full === 0 && p([4, 4, 4, 4, 4], 2).full === 0, 'full');
  assert(p([2, 2, 5, 2, 2], 3).poker === 40 && p([2, 2, 5, 2, 2], 1).poker === 45 && p([2, 2, 5, 2, 3], 3).poker === 0, 'póker');
  assert(p([4, 4, 4, 4, 4], 3).generala === 50 && p([4, 4, 4, 4, 4], 3).poker === 40, 'generala');
  assert(p([4, 4, 4, 4, 4], 3).doble === 0, 'doble sin generala anotada');
  assert(p([4, 4, 4, 4, 4], 3, { generala: 0 }).doble === 0, 'doble con la generala tachada');
  assert(p([4, 4, 4, 4, 4], 3, { generala: 50 }).doble === 100 && !('generala' in p([4, 4, 4, 4, 4], 3, { generala: 50 })), 'doble con generala en 50');
  assert(!('1' in p([1, 1, 1, 1, 2], 2, { 1: 3 })), 'solo las libres');
  assert(Object.keys(gen.posibles(conMano([0, 0, 0, 0, 0], 0))).length === 0, 'antes de tirar no hay');
  // Tachar vale 0 y pasa el turno.
  const e = gen.anotar(conMano([1, 2, 4, 4, 6], 3), 'full');
  assert(e.jugadores[0].tabla.full === 0 && e.turno === 1 && e.tiradas === 0 && e.dados.every((d) => d === 0) && e.ganador === null, 'tachar');
});

probar('generala: la generala servida gana al instante', () => {
  const e = gen.anotar(conMano([3, 3, 3, 3, 3], 1), 'generala');
  assert(e.ganador === 0 && gen.ganador(e) === 0 && e.jugadores[0].tabla.generala === 50);
  const g = conMano([3, 3, 3, 3, 3], 1);
  g.turno = 1;
  assert(gen.anotar(g, 'generala').ganador === 1, 'gana el que la sirve');
  assert(gen.anotar(conMano([3, 3, 3, 3, 3], 2), 'generala').ganador === null, 'no servida: sigue');
});

probar('generala: 3 tiradas como máximo y guardar solo después de tirar', () => {
  let e = gen.nueva(2, 3);
  assert(gen.alternarGuardado(e, 0) === null, 'no se guarda antes de tirar');
  assert(gen.anotar(e, '1') === null, 'no se anota antes de tirar');
  e = gen.tirar(e);
  assert(e.tiradas === 1 && e.dados.every((d) => d >= 1 && d <= 6));
  e = gen.alternarGuardado(e, 1); e = gen.alternarGuardado(e, 2);
  const d1 = e.dados.slice();
  e = gen.tirar(e);
  assert(e.dados[1] === d1[1] && e.dados[2] === d1[2] && e.tiradas === 2, 'lo guardado se conserva');
  e = gen.tirar(e);
  assert(e.tiradas === 3 && gen.tirar(e) === null && gen.alternarGuardado(e, 0) === null, 'a la tercera se acaba');
  const sin = gen.tirar(gen.nueva(2, 4));
  assert(gen.tirar({ ...sin, guardados: [true, true, true, true, true] }) === null, 'con todos guardados no se tira');
});

probar('generala: casilla repetida, desconocida y entrada intacta', () => {
  const e = conMano([1, 2, 4, 4, 6], 2);
  const copia = JSON.stringify(e);
  const s = gen.anotar(e, '4');
  assert(s.jugadores[0].tabla['4'] === 8 && s.puntos[0] === 8, 'puntos');
  gen.tirar(e); gen.alternarGuardado(e, 0); gen.posibles(e); gen.accion(e, { tipo: 'tirar', guardar: [true, false, false, false, false] });
  assert(JSON.stringify(e) === copia, 'nada modifica la entrada');
  assert(gen.anotar(conMano([1, 2, 4, 4, 6], 2, { 4: 8 }), '4') === null && gen.anotar(e, 'zzz') === null, 'inválidas');
});

probar('generala: el final con ganador y con empate', () => {
  const casi = (pts0, pts1) => {
    const e = conMano([1, 1, 2, 3, 4], 2);
    for (const c of gen.CASILLAS) { e.jugadores[0].tabla[c] = c === '1' ? null : 0; e.jugadores[1].tabla[c] = 0; }
    e.jugadores[0].tabla.doble = pts0;
    e.jugadores[1].tabla.doble = pts1;
    return e;
  };
  const gana = gen.anotar(casi(10, 0), '1'); // el jugador 0 suma 2 + 10
  assert(gana.ganador === 0 && gen.ganador(gana) === 0 && gana.puntos[0] === 12 && gana.puntos[1] === 0, 'gana el de más puntos');
  assert(gen.anotar(casi(0, 20), '1').ganador === 1, 'gana el otro');
  assert(gen.anotar(casi(10, 12), '1').ganador === 'empate', 'misma suma: empate');
  assert(gen.anotar(conMano([1, 1, 2, 3, 4], 2), '1').ganador === null, 'sigue si faltan casillas');
});

probar('generala: la máquina siempre hace una acción válida en los 3 niveles, de 1 a 4 jugadores', () => {
  for (const nv of ['facil', 'normal', 'dificil']) {
    for (const n of [1, 2, 3, 4]) {
      if (nv === 'dificil' && n > 2) continue; // la Difícil tarda más; con 1 y 2 ya se cubre
      let e = gen.nueva(n, 100 + n), pasos = 0;
      while (e.ganador === null) {
        const a = gen.maquina(e, nv, Math.random);
        e = gen.accion(e, a);
        assert(e, `${nv}/${n}: acción inválida ${JSON.stringify(a)}`);
        assert(++pasos < 2000, 'no termina');
      }
      assert(e.ganador === 'empate' || (e.ganador >= 0 && e.ganador < n), 'ganador');
    }
  }
});

// --- cacho.js (🎲 Dados) ---
import * as cacho from './games/cacho.js';

// Cacho con dados fijos: `dados` = lista de listas; turno `t`; apuesta { n, pinta, de } opcional.
const cachoCon = (dados, t = 0, apuesta = null, extra = {}) => {
  const e = cacho.nueva(dados.length, 7);
  dados.forEach((d, i) => { e.jugadores[i].dados = d; });
  return Object.assign(e, { turno: t, apuesta, apuestas: apuesta ? [apuesta] : [] }, extra);
};
const apuestaOk = (e, n, pinta) => cacho.esValida(e, { n, pinta });

probar('cacho: apuestas válidas e inválidas, ases y apertura', () => {
  const e = cacho.nueva(3, 1);
  assert(e.jugadores.length === 3 && e.jugadores.every((j) => j.dados.length === 5) && e.ronda === 1 && e.ganador === null);
  assert(apuestaOk(e, 1, 2) && !apuestaOk(e, 1, 1) && !apuestaOk(e, 0, 2) && !apuestaOk(e, 16, 2) && !apuestaOk(e, 1, 7) && !apuestaOk(e, 1.5, 2), 'apertura');
  assert(apuestaOk(cachoCon([[1], [2, 2], [3, 3]]), 1, 1), 'abrir en ases con un solo dado');
  const a = (n, pinta) => cachoCon([[1, 2, 3, 4, 5], [2, 3, 4, 5, 6], [1, 1, 2, 3, 4]], 1, { n, pinta, de: 0 });
  assert(apuestaOk(a(3, 4), 4, 2) && apuestaOk(a(3, 4), 3, 5) && !apuestaOk(a(3, 4), 3, 4) && !apuestaOk(a(3, 4), 3, 3) && !apuestaOk(a(3, 4), 2, 6), 'subir');
  assert(apuestaOk(a(7, 5), 4, 1) && !apuestaOk(a(7, 5), 3, 1), 'a ases: ceil(n/2)');
  assert(apuestaOk(a(3, 4), 2, 1) && !apuestaOk(a(3, 4), 1, 1), 'a ases con 3: 2');
  assert(apuestaOk(a(4, 1), 9, 2) && !apuestaOk(a(4, 1), 8, 6), 'de ases: 2n+1');
  assert(apuestaOk(a(4, 1), 5, 1) && !apuestaOk(a(4, 1), 4, 1), 'entre ases: sube la cantidad');
  assert(cacho.apuestaMinima(a(3, 4)).n === 3 && cacho.apuestaMinima(a(3, 4)).pinta === 5 && cacho.apuestaMinima(cacho.nueva(2, 1)).n === 1);
});

probar('cacho: dudar cuando hay justo n pierde quien dudó; con n-1 pierde quien apostó', () => {
  const d = [[2, 2, 3, 4, 5], [2, 6, 6, 6, 6]]; // 3 Dos en total
  let e = cacho.dudar(cachoCon(d, 1, { n: 3, pinta: 2, de: 0 }));
  assert(e.jugadores[1].dados.length === 4 && e.jugadores[0].dados.length === 5, 'justo n: pierde quien dudó');
  assert(e.resumen.tipo === 'dudo' && e.resumen.total === 3 && e.resumen.quien === 1 && e.resumen.delta === -1 && e.resumen.dados[1].join() === '2,6,6,6,6' && e.resumen.ronda === 1 && e.ronda === 2);
  e = cacho.dudar(cachoCon(d, 1, { n: 4, pinta: 2, de: 0 }));
  assert(e.jugadores[0].dados.length === 4 && e.jugadores[1].dados.length === 5 && e.turno === 0, 'n-1: pierde quien apostó y empieza');
  assert(cacho.dudar(cachoCon(d)) === null, 'sin apuesta no se duda');
});

probar('cacho: los ases cuentan, salvo en obligo', () => {
  const d = [[1, 1, 3, 4, 5], [2, 6, 6, 6, 6]];
  assert(cacho.totalDe(d, 6, false) === 6 && cacho.totalDe(d, 6, true) === 4 && cacho.totalDe(d, 1, false) === 2, 'totalDe');
  const e = cacho.dudar(cachoCon(d, 1, { n: 6, pinta: 6, de: 0 })); // con ases: 6, pierde quien dudó
  assert(e.jugadores[1].dados.length === 4 && e.resumen.total === 6);
  const o = cacho.dudar(cachoCon(d, 1, { n: 6, pinta: 6, de: 0 }, { obligo: 0 })); // en obligo: 4 < 6, pierde quien apostó
  assert(o.jugadores[0].dados.length === 4 && o.resumen.total === 4 && o.resumen.obligo === true);
});

probar('cacho: calzar exacto recupera (con tope 5) y fallido pierde', () => {
  let e = cacho.calzar(cachoCon([[2, 2, 3, 4], [2, 6, 6, 6]], 1, { n: 3, pinta: 2, de: 0 }));
  assert(e.jugadores[1].dados.length === 5 && e.resumen.delta === 1 && e.turno === 1, 'recupera y empieza');
  const lleno = [[2, 2, 3, 4, 5], [2, 6, 6, 6, 6]];
  e = cacho.calzar(cachoCon(lleno, 1, { n: 3, pinta: 2, de: 0 }));
  assert(e.jugadores[1].dados.length === 5 && e.resumen.delta === 0, 'tope de 5');
  e = cacho.calzar(cachoCon(lleno, 1, { n: 4, pinta: 2, de: 0 }));
  assert(e.jugadores[1].dados.length === 4 && e.turno === 1, 'fallido');
  assert(cacho.calzar(cachoCon(lleno, 1, { n: 3, pinta: 2, de: 1 })) === null && cacho.calzar(cachoCon(lleno)) === null, 'no sobre la propia ni sin apuesta');
});

probar('cacho: el obligo se activa una sola vez y bloquea el cambio de pinta', () => {
  const e = cacho.dudar(cachoCon([[2, 3], [2, 6, 6, 6, 6]], 1, { n: 4, pinta: 2, de: 0 })); // pierde el 0: queda con 1 dado
  assert(e.jugadores[0].dados.length === 1 && e.obligo === 0 && e.turno === 0 && e.jugadores[0].obligoUsado === true, 'se activa');
  const a = cacho.apostar(e, { n: 1, pinta: 3 });
  assert(a && a.turno === 1 && !apuestaOk(a, 2, 4) && !apuestaOk(a, 1, 4) && apuestaOk(a, 2, 3) && !apuestaOk(a, 2, 1), 'pinta fija y solo sube la cantidad');
  // Ya usado: perder otro dado hasta quedar con 1 no lo repite.
  const u = cachoCon([[5, 5], [3, 3, 3]], 1, { n: 3, pinta: 5, de: 0 });
  u.jugadores[0].obligoUsado = true;
  const r = cacho.resolver(u, 'dudo', [[5, 5], [3, 3, 3]]); // total 2 < 3: pierde el 0 y queda con 1
  assert(r.quien === 0 && r.cuantos[0] === 1 && r.obligo === null, 'no se repite');
  assert(cacho.resolver(cachoCon([[5, 5], [3, 3, 3]], 1, { n: 3, pinta: 5, de: 0 }), 'dudo', [[5, 5], [3, 3, 3]]).obligo === 0, 'la primera vez sí');
  assert(cacho.dudar(cachoCon([[5], [3, 3, 3]], 1, { n: 3, pinta: 5, de: 0 })).obligo === null, 'perder el último dado no es obligo');
});

probar('cacho: turno inicial tras una eliminación y final', () => {
  // El jugador 1 pierde su último dado: empieza el siguiente que tenga dados.
  const e = cacho.dudar(cachoCon([[2, 2, 2], [3], [4, 4]], 2, { n: 1, pinta: 6, de: 1 }));
  assert(e.jugadores[1].dados.length === 0 && e.turno === 2 && e.ganador === null, 'salta al eliminado');
  const f = cacho.dudar(cachoCon([[2, 2, 2], [3], [4, 4]], 0, { n: 1, pinta: 3, de: 1 }));
  assert(f.jugadores[0].dados.length === 2 && f.turno === 0, 'pierde quien dudó y empieza');
  // El que apuesta salta a los eliminados.
  assert(cacho.apostar(cachoCon([[2, 2], [], [4, 4]], 0), { n: 1, pinta: 2 }).turno === 2, 'apostar salta al eliminado');
  // Final.
  const z = cacho.dudar(cachoCon([[2, 2], [3]], 0, { n: 1, pinta: 6, de: 1 }));
  assert(z.ganador === 0 && cacho.ganador(z) === 0 && z.jugadores[1].dados.length === 0 && z.resumen.quien === 1, 'gana el último con dados');
  assert(cacho.apostar(z, { n: 1, pinta: 2 }) === null && cacho.dudar(z) === null, 'terminada');
});

probar('cacho: la máquina siempre hace una acción válida en partidas completas de 2 a 6 jugadores', () => {
  for (const nv of ['facil', 'normal', 'dificil']) {
    for (const n of [2, 3, 4, 5, 6]) {
      let e = cacho.nueva(n, 200 + n), pasos = 0;
      while (e.ganador === null) {
        const a = cacho.maquina(e, nv, Math.random);
        e = cacho.accion(e, a);
        assert(e, `${nv}/${n}: acción inválida ${JSON.stringify(a)}`);
        assert(++pasos < 5000, 'no termina');
        assert(e.ganador !== null || e.jugadores[e.turno].dados.length > 0, 'turno de un eliminado');
      }
      assert(e.jugadores.filter((j) => j.dados.length).length === 1 && e.jugadores[e.ganador].dados.length > 0, 'ganador');
    }
  }
});

probar('cacho: acciones puras (sin mutar la entrada) y accion rechaza lo inválido', () => {
  const e = cachoCon([[2, 2, 3, 4, 5], [2, 6, 6, 6, 6]], 0, { n: 2, pinta: 3, de: 1 });
  const antes = JSON.stringify(e);
  cacho.apostar(e, { n: 3, pinta: 3 }); cacho.dudar(e); cacho.calzar(e); cacho.maquina(e, 'dificil', Math.random); cacho.resolver(e, 'dudo', e.jugadores.map((j) => j.dados));
  assert(JSON.stringify(e) === antes, 'no muta');
  assert(cacho.accion(e, { tipo: 'apostar', n: 1, pinta: 2 }) === null && cacho.accion(e, { tipo: 'x' }) === null && cacho.accion(e, null) === null && cacho.accion(e, { tipo: 'apostar', n: 3, pinta: 3 }));
});

// --- chinchon.js ---
import * as chi from './games/chinchon.js';

// Cartas como '7o 5c Rb' (o oros, c copas, e espadas, b bastos; S C R = sota, caballo, rey = 8 9 10).
const PAL_CHI = { o: 'oros', c: 'copas', e: 'espadas', b: 'bastos' };
const chs = (t) => t.split(' ').filter(Boolean).map((x) => ({ v: { S: 8, C: 9, R: 10 }[x[0]] ?? Number(x[0]), p: PAL_CHI[x.at(-1)] }));
const baseChi = (manos, extra = {}) => ({ n: manos.length, manos: manos.map(chs), mazo: chs('1b 2b 3b 4b 5b 6b'), descarte: chs('7b'), turno: 0, robo: null, robada: null,
  puntos: manos.map(() => 0), fuera: manos.map(() => false), ronda: 1, empieza: 0, vistas: manos.map(() => ({ tomo: [], boto: [] })), ganador: null, aviso: null, resumen: null, ...extra });

probar('chinchón: juegos, mejor forma, cerrar, agregar sueltas, eliminación y mazo', () => {
  const ch = chs;
  const base = baseChi;
  const f = (t) => chi.mejorForma(ch(t));
  assert(chi.PUNTOS(ch('7o')[0]) === 7 && chi.PUNTOS(ch('So')[0]) === 10 && chi.PUNTOS(ch('Co')[0]) === 11 && chi.PUNTOS(ch('Ro')[0]) === 12);
  // Escalas: el 7 sigue con la sota; sin vuelta; del mismo palo.
  assert(f('5o 6o 7o So').pts === 0 && f('5o 6o 7o So').juegos[0].length === 4, '7 → sota');
  assert(f('Ro 1o 2o').pts === 15 && f('6o 7o Co').pts === 24 && f('1o 2c 3o').pts === 6 && f('4o 5o').pts === 9);
  // Tríos y cuartetos.
  assert(f('4o 4c 4e').pts === 0 && f('4o 4c 4e 4b').juegos[0].length === 4);
  // Mejor forma: la que deja menos puntos.
  assert(f('3o 4o 5o 5c 5e').pts === 7, 'trío de 5 y sueltos 3 y 4');
  assert(f('3o 4o 5o 5c 5e 5b').pts === 0 && f('3o 4o 5o 5c 5e 5b').juegos.length === 2, 'escala y trío');
  assert(chi.esChinchon(ch('5o 6o 7o So Co Ro 4o')) && !chi.esChinchon(ch('1o 2o 3o 4o 5o 6o 7c')) && !chi.esChinchon(ch('1o 2o 3o 4o 5o 6o')));
  // Agregar sueltas a juegos ajenos: al trío de 3, alargar escalas por una punta, repitiendo.
  let r = chi.agregarSueltas([ch('5c 5e 5b'), ch('1o 2o 3o')], ch('5o 4o Sb Rb'));
  assert(r.juegos[0].length === 4 && r.juegos[1].length === 4 && r.sueltas.length === 2);
  r = chi.agregarSueltas([ch('1o 2o 3o')], ch('5o 4o'));
  assert(r.juegos[0].map((c) => c.v).join() === '1,2,3,4,5' && !r.sueltas.length, 'repite hasta que no cabe ninguna');
  assert(chi.agregarSueltas([ch('5c 5e 5b 5o')], ch('5c')).sueltas.length === 1, 'el cuarteto no admite más');
  r = chi.agregarSueltas([ch('4c 4e 4b'), ch('1o 2o 3o')], ch('4o 5o'));
  assert(!r.sueltas.length && r.juegos[1].length === 5, 'el 4o alarga la escala para que entre el 5o, no va al trío');
  // Al cerrar, el rival elige la forma que deja menos después de agregar: con el trío de 4 (y no la escala 4o 5o 6o) el 6o y
  // el 5o alargan la escala 7o S C del que cerró y le quedan solo los reyes.
  const t2 = chi.cerrar(baseChi(['7o So Co 5c 5e 5b 2c Rb', '4o 4c 4e 5o 6o Rc Re'], { robo: 'mazo' }), 7);
  assert(t2.resumen.filas[1].pts === 24 && t2.puntos[1] === 24, `el rival suma ${t2.resumen.filas[1].pts}`);
  // Reparto.
  const e = chi.nueva(3);
  assert(e.manos.every((m) => m.length === 7) && e.descarte.length === 1 && e.mazo.length === 40 - 22 && e.turno === 0 && e.empieza === 0 && e.ronda === 1);
  // Robar y botar; no botar la recién tomada del descarte; el turno pasa.
  let s = base(['1o 2o 3o 5c 5e 5b 2c', 'Ro'], { descarte: ch('7b Rb') });
  assert(chi.botar(s, 0) === null && !chi.cerrables(s).length, 'primero se roba');
  let t = chi.robar(s, 'descarte');
  assert(t.manos[0].length === 8 && t.robo === 'descarte' && t.robada.v === 10 && t.descarte.length === 1 && t.vistas[0].tomo.length === 1 && t.aviso.j === 0);
  assert(chi.robar(t, 'mazo') === null && chi.botar(t, 7) === null, 'no se bota la recién robada');
  assert(!chi.cerrables(t).length && chi.cerrar(t, 7) === null, 'ni se cierra botándola');
  const u = chi.botar(t, 6);
  assert(u.turno === 1 && u.robo === null && u.descarte.at(-1).v === 2 && u.vistas[0].boto.length === 1 && u.manos[0].length === 7);
  // Mazo agotado: se baraja el descarte salvo la de arriba.
  t = chi.robar(base(['1o 2o', '3o'], { mazo: [], descarte: ch('4c 5c 6c') }), 'mazo');
  assert(t.manos[0].length === 3 && t.descarte.length === 1 && t.descarte[0].v === 6 && t.mazo.length === 1);
  assert(chi.robar(base(['1o', '3o'], { mazo: [] }), 'mazo') === null);
  // Cerrar con 3 o menos: el otro ordena y agrega el 4o a la escala del que cerró.
  const rival = 'Cb Rc Re Ro 4o Cc Sb';
  s = base(['1o 2o 3o 5c 5e 5b 2c Rb', rival], { robo: 'mazo' });
  assert(chi.cerrables(s).join() === '7');
  const antes = JSON.stringify(s);
  t = chi.cerrar(s, 7);
  assert(JSON.stringify(s) === antes, 'cerrar no muta');
  assert(t.puntos.join() === '2,32' && t.resumen.cerro === 0 && !t.resumen.chinchon && t.resumen.filas[1].sueltas.length === 3 && t.resumen.filas[1].pts === 32);
  assert(t.ganador === null && t.ronda === 2 && t.empieza === 1 && t.turno === 1 && t.manos.every((m) => m.length === 7) && t.mazo.length === 25 && t.robo === null);
  // Con 0 sueltas: −10. Con chinchón: gana la partida.
  t = chi.cerrar(base(['1o 2o 3o 5c 5e 5b 5o Rb', rival], { robo: 'mazo' }), 7);
  assert(t.puntos[0] === -10 && t.resumen.filas[0].pts === -10);
  t = chi.cerrar(base(['1o 2o 3o 4o 5o 6o 7o Rb', rival], { robo: 'mazo' }), 7);
  assert(t.ganador === 0 && t.resumen.chinchon && t.aviso.j === 0);
  // Con 4 no se cierra.
  s = base(['1o 2o 3o 5c 5e 5b 4c Rb', rival], { robo: 'mazo' });
  assert(!chi.cerrables(s).length && chi.cerrar(s, 7) === null);
  assert(chi.cerrables(base(['1o 2o 3o 5c 5e 5b 3c Rb', rival], { robo: 'mazo' })).join() === '7');
  // Eliminación al pasar de 100 (100 justo sigue).
  const cierra = (manos, puntos, extra) => chi.cerrar(base(['1o 2o 3o 5c 5e 5b 2c Rb', ...manos], { robo: 'mazo', puntos, ...extra }), 7);
  t = cierra([rival], [0, 80]);
  assert(t.ganador === 0 && t.fuera[1], 'a dos, termina');
  t = cierra([rival], [0, 68]);
  assert(t.ganador === null && t.puntos[1] === 100 && !t.fuera[1]);
  t = cierra([rival], [99, 80]);
  assert(t.ganador === 0 && t.puntos.join() === '101,112', 'los dos pasan: gana el que tiene menos');
  t = cierra([rival, '7c 7e 7o Sc Cc Rc 4b'], [0, 80, 0]);
  assert(t.ganador === null && t.fuera.join() === 'false,true,false' && t.puntos.join() === '2,112,4' && t.empieza === 2 && t.turno === 2 && !t.manos[1].length);
  assert(chi.botar(base(['1o 2o', '', '3o'], { robo: 'mazo', fuera: [false, true, false] }), 0).turno === 2, 'el eliminado no juega');
  t = cierra(['', '7c 7e 7o Sc Cc Rc 4b'], [0, 101, 98], { fuera: [false, true, false] });
  assert(t.ganador === 0 && t.puntos[2] === 102);
  // Nada modifica la entrada.
  s = base(['1o 2o 3o 5c 5e 5b 2c', 'Ro'], { descarte: ch('7b Rb') });
  const foto = JSON.stringify(s);
  chi.robar(s, 'descarte'); chi.robar(s, 'mazo'); chi.botar(chi.robar(s, 'mazo'), 0); chi.nueva(2);
  assert(JSON.stringify(s) === foto, 'no muta');
  assert(chi.accion(s, { robar: 'x' }) === null && chi.accion(s, { botar: 0 }) === null && chi.accion(s, {}) === null);
});

probar('chinchón: la máquina en sus tres niveles', () => {
  const ch = chs;
  const m = (manos, nivel, extra, rnd = () => 0.9) => chi.maquina(baseChi(manos, extra), nivel, rnd);
  // Fácil: del descarte solo si forma juego; bota la suelta más alta (o, la mitad de las veces, cualquiera); cierra en cuanto puede.
  assert(m(['1o 2o 5c Re Rb Ce 7c', 'Ro'], 'facil', { descarte: ch('3o') }).robar === 'descarte');
  assert(m(['1o 2o 5c Re Rb Ce 7c', 'Ro'], 'facil', { descarte: ch('4c') }).robar === 'mazo');
  assert(m(['1o 2o 3o 5c 4e Re Ce 7c', 'Ro'], 'facil', { robo: 'mazo' }).botar === 5);
  assert(m(['1o 2o 3o 5c 4e Re Ce 7c', 'Ro'], 'facil', { robo: 'mazo' }, () => 0).botar === 3, 'al azar: la primera suelta');
  assert(m(['1o 2o 3o 4o 5o 6o 1c Rb', 'Ro'], 'facil', { robo: 'mazo' }).cerrar === 7);
  // Normal: cierra, salvo que le falte una carta para el chinchón.
  assert(m(['1o 2o 3o 5c 5e 5b 2c Rb', 'Ro'], 'normal', { robo: 'mazo' }).cerrar === 7);
  assert(m(['1o 2o 3o 4o 5o 6o 1c Rb', 'Ro'], 'normal', { robo: 'mazo' }).botar === 7, 'espera el chinchón');
  assert(m(['1o 2o 3o 4o 5o 6o 7o Rb', 'Ro'], 'normal', { robo: 'mazo' }).cerrar === 7, 'chinchón');
  assert(m(['1o 2o 3o 5c 5e 5b Cb Rc', 'Ro'], 'normal', { robo: 'mazo' }).botar === 7, 'bota la que más vale');
  // Difícil: cierra en cuanto puede (esperar el −10 pierde); recuerda el descarte; no le da al rival lo que junta del descarte.
  assert(m(['1o 2o 3o 5c 5e 5b 1c Rb', 'Ro'], 'dificil', { robo: 'mazo' }).cerrar === 7);
  assert(m(['1o 2o 3o 5c 5e 5b 5o Rb', 'Ro'], 'dificil', { robo: 'mazo' }).cerrar === 7, '−10');
  // Dos parejas iguales (6-7 de espadas y de bastos); el 5 y la sota de bastos ya salieron: la Difícil suelta la pareja muerta.
  const mano8 = ['1o 1e 1c 6e 7e 6b 7b 4o', 'Ro'];
  assert(m(mano8, 'dificil', { robo: 'mazo', descarte: ch('5b Sb') }).botar === 6, 'muerta la de bastos');
  assert(m(mano8, 'dificil', { robo: 'mazo', descarte: ch('5e Se') }).botar === 4, 'muerta la de espadas');
  const vistas = [{ tomo: [], boto: [] }, { tomo: ch('Ro'), boto: [] }];
  assert(m(['1o 2o 3o 5c 5e 5b Cb Rc', 'Ro'], 'dificil', { robo: 'mazo', vistas }).botar === 6, 'el rival junta reyes');
  // Partidas enteras entre máquinas, con semilla, para cada nivel y de 2 a 4: terminan sin acciones inválidas; la Difícil es rápida.
  let lento = 0;
  for (const nivel of ['facil', 'normal', 'dificil']) for (const n of [2, 3, 4]) {
    const g = generador(n * 7 + nivel.length);
    const rnd = () => azarDe(g);
    let p = chi.nueva(n, rnd);
    let jugadas = 0;
    for (; jugadas < 20000 && p.ganador === null; jugadas++) {
      const t0 = performance.now();
      const a = chi.maquina(p, nivel, rnd);
      lento = Math.max(lento, performance.now() - t0);
      const q = chi.accion(p, a, rnd);
      assert(q, `acción inválida (${nivel}, ${n})`);
      p = q;
    }
    assert(p.ganador !== null && (!p.fuera[p.ganador] || p.fuera.every(Boolean)), `partida ${nivel} a ${n}`);
    assert(JSON.stringify(p).length < 8000, 'cabe en la base');
  }
  assert(lento < 60, `la peor jugada tarda ${lento.toFixed(1)} ms`);
});

// Duelo entre dos niveles con semilla fija, alternando quién empieza: cuántas partidas gana `a`.
const dueloCartas = (J, a, b, partidas, semilla) => {
  let gana = 0;
  for (let k = 0; k < partidas; k++) {
    const g = generador(semilla + k);
    const rnd = () => azarDe(g);
    const nv = k % 2 ? [b, a] : [a, b];
    let p = J.nueva(2, rnd);
    for (let i = 0; i < 20000 && p.ganador === null; i++) p = J.accion(p, J.maquina(p, nv[p.turno], rnd), rnd);
    if (p.ganador !== null && nv[p.ganador] === a) gana++;
  }
  return gana / partidas;
};

probar('chinchón: la Difícil le gana a la Fácil más del 55 % (simulación con semilla)', () => {
  const r = dueloCartas(chi, 'dificil', 'facil', 20, 500);
  assert(r > 0.55, `${(100 * r).toFixed(0)} %`);
});

// --- truco.js ---
import * as tru from './games/truco.js';

// Estado armado a mano: manos fijas (como en el Chinchón: '1e 7o Rb'), primera baza vacía, mano el jugador 0.
const truBase = (manos, extra = {}) => ({ n: 2, manos: manos.map(chs), bazas: [{ c: [null, null], gana: null, sale: extra.mano ?? 0 }], mano: 0, turno: 0, juega: 0,
  puntos: [0, 0], ronda: 1, envido: { cantos: [], quien: null, estado: null }, truco: { nivel: 0, cantado: 0, quien: null, quiero: null, pendiente: false },
  notas: [], ganador: null, aviso: null, resumen: null, ...extra });
// Aplica las acciones en orden; cada una debe ser válida. 'envido' → canto, 'Q' / 'NQ' → quiero / no quiero, 0–2 → carta, 'mazo'.
const truA = (x) => (x === 'Q' ? { quiero: true } : x === 'NQ' ? { quiero: false } : x === 'mazo' ? { mazo: true } : typeof x === 'number' ? { carta: x } : { canto: x });
const truJugar = (e, ...as) => as.reduce((s, x, k) => {
  const t = tru.accion(s, truA(x), () => 0.5);
  assert(t, `acción ${k} (${x}) inválida`);
  return t;
}, e);
const truHay = (e, x) => tru.acciones(e).some((a) => JSON.stringify(a) === JSON.stringify(truA(x)));

probar('truco: jerarquía y tanto del envido', () => {
  const grupos = ['1e', '1b', '7e', '7o', '3o 3c 3e 3b', '2o 2c 2e 2b', '1c 1o', 'Ro Rc Re Rb', 'Co Cc Ce Cb', 'So Sc Se Sb', '7c 7b', '6o 6c 6e 6b', '5o 5c 5e 5b', '4o 4c 4e 4b'];
  assert(grupos.join(' ').split(' ').length === 40, 'las 40 cartas');
  const rangos = grupos.map((g) => chs(g).map(tru.JERARQUIA));
  rangos.forEach((r, k) => {
    assert(r.every((x) => x === r[0]), `iguales: ${grupos[k]}`);
    if (k) assert(rangos[k - 1][0] > r[0], `${grupos[k - 1]} gana a ${grupos[k]}`);
  });
  const t = (x) => tru.tanto(chs(x));
  assert(t('7o 6o Re') === 33 && t('So Co 1o') === 21 && t('Re Se 4b') === 20 && t('1o 2o 3o') === 25, 'con pareja: 20 + números, figuras 0');
  assert(t('7o 5c 3e') === 7 && t('Ro Ce Sb') === 0 && t('6b Rc 5e') === 6, 'sin pareja: la más alta');
});

probar('truco: envido querido y no querido, falta envido y quién puede cantarlo', () => {
  // J0 tiene 33 (7o 6o), J1 tiene 3 (sin pareja).
  const pts = (...as) => truJugar(truBase(['7o 6o 4c', '1e 2b 3c']), ...as).puntos.join();
  assert(pts('envido', 'Q') === '2,0' && pts('envido', 'envido', 'Q') === '4,0' && pts('envido', 'real', 'Q') === '5,0');
  assert(pts('envido', 'envido', 'real', 'Q') === '7,0' && pts('real', 'Q') === '3,0');
  assert(pts('envido', 'NQ') === '1,0' && pts('envido', 'envido', 'NQ') === '0,2' && pts('envido', 'real', 'NQ') === '0,2');
  assert(pts('envido', 'envido', 'real', 'NQ') === '4,0' && pts('falta', 'NQ') === '1,0' && pts('real', 'NQ') === '1,0');
  assert(pts('envido', 'real', 'falta', 'NQ') === '5,0', 'falta no querida: lo querido antes');
  // Falta envido: lo que le falta al que va ganando (15) para llegar a 24.
  assert(truJugar(truBase(['7o 6o 4c', '1e 2b 3c'], { puntos: [10, 15] }), 'envido', 'falta', 'Q').puntos.join() === '19,15');
  // Gana el de mayor tanto; empate: la mano. El juego calcula y guarda los tantos; la ronda sigue con quien debía jugar.
  let s = truJugar(truBase(['1e 2b 3c', '7o 6o 4c']), 'envido', 'Q');
  assert(s.puntos.join() === '0,2' && s.envido.tantos.join() === '3,33' && s.envido.estado === 'querido' && s.turno === 0 && s.resumen === null && s.notas[0].j === 1);
  s = truJugar(truBase(['7o 6o 4c', '7c 6c 4o'], { mano: 1, turno: 1, juega: 1 }), 'envido', 'Q');
  assert(s.puntos.join() === '0,2', 'empate: gana la mano');
  // Cadena: un segundo envido solo después del primero; después del real, solo falta; después de la falta, nada.
  const b = truBase(['7o 6o 4c', '1e 2b 3c']);
  s = truJugar(b, 'envido', 'envido');
  assert(!truHay(s, 'envido') && truHay(s, 'real') && truHay(s, 'falta') && truHay(s, 'Q'));
  s = truJugar(b, 'real');
  assert(!truHay(s, 'envido') && !truHay(s, 'real') && truHay(s, 'falta'));
  s = truJugar(b, 'falta');
  assert(tru.acciones(s).length === 2 && truHay(s, 'Q') && truHay(s, 'NQ'));
  // La falta puede ganar la partida en medio de la ronda.
  s = truJugar(truBase(['7o 6o 4c', '1e 2b 3c'], { puntos: [20, 5] }), 'falta', 'Q');
  assert(s.puntos.join() === '24,5' && s.ganador === 0 && s.resumen.ronda === 1 && s.resumen.lineas.length === 1 && !tru.acciones(s).length);
  // Quién canta: el mano antes de tirar; el pie después de que el mano tiró (su carta cuenta para el tanto); uno por ronda.
  assert(truHay(b, 'envido'));
  s = truJugar(b, 0);
  assert(s.turno === 1 && truHay(s, 'envido'));
  s = truJugar(truBase(['1e 2b 3c', '7o 6o 4c']), 0, 'envido', 'Q');
  assert(s.puntos.join() === '0,2' && s.turno === 1 && !truHay(s, 'envido') && !truHay(s, 'real'));
  s = truJugar(b, 0, 0);
  assert(s.bazas.length === 2 && !truHay(s, 'envido'), 'solo en la primera baza');
  s = truJugar(b, 0, 'truco');
  assert(s.turno === 0 && !truHay(s, 'envido'), 'el mano ya tiró: no puede decir que el envido está primero');
});

probar('truco: el envido está primero; truco, retruco y vale cuatro; solo sube quien tiene el quiero', () => {
  // J0 gana todas las bazas. Tantos: J0 28 (1e 7e), J1 29 (4c 5c).
  const b = truBase(['1e 1b 7e', '4c 4o 5c']);
  let s = truJugar(b, 'truco');
  assert(s.turno === 1 && s.truco.pendiente && truHay(s, 'envido') && truHay(s, 'retruco') && !truHay(s, 'mazo') && !truHay(s, 0));
  s = truJugar(s, 'envido');
  assert(s.turno === 0 && !truHay(s, 'retruco') && !truHay(s, 0));
  s = truJugar(s, 'Q');
  assert(s.puntos.join() === '0,2' && s.turno === 1 && s.truco.pendiente, 'resuelto el envido, el truco sigue pendiente');
  assert(truHay(s, 'Q') && truHay(s, 'retruco') && !truHay(s, 'envido'));
  s = truJugar(s, 'Q');
  assert(s.turno === 0 && s.truco.nivel === 1 && s.truco.quiero === 1 && !truHay(s, 'retruco') && truHay(s, 0), 'J0 no tiene el quiero');
  s = truJugar(s, 0);
  assert(s.turno === 1 && truHay(s, 'retruco'), 'J1 sí');
  s = truJugar(s, 0, 0, 0);
  assert(s.puntos.join() === '2,2' && s.resumen.ronda === 1 && s.resumen.lineas.length === 2 && s.resumen.lineas[1].j === 0);
  assert(s.ronda === 2 && s.mano === 1 && s.turno === 1 && s.manos.every((m) => m.length === 3) && s.truco.cantado === 0 && s.envido.estado === null);
  const pts = (...as) => truJugar(b, ...as).puntos.join();
  assert(pts('truco', 'NQ') === '1,0' && pts('truco', 'retruco', 'NQ') === '0,2' && pts('truco', 'Q', 0, 'retruco', 'vale4', 'NQ') === '3,0');
  assert(pts('truco', 'Q', 0, 0, 0, 0) === '2,0' && pts('truco', 'retruco', 'Q', 0, 0, 0, 0) === '3,0' && pts(0, 0, 0, 0) === '1,0');
  s = truJugar(b, 'truco', 'Q', 0, 'retruco', 'vale4', 'Q');
  assert(s.truco.nivel === 3 && s.turno === 1 && !truHay(s, 'vale4'));
  assert(truJugar(s, 0, 0, 0).puntos.join() === '4,0');
  // Cualquiera puede cantar el primer truco en su turno.
  assert(truHay(truJugar(b, 0), 'truco') && !truHay(truJugar(b, 'truco', 'retruco'), 'retruco'));
});

probar('truco: pardas, irse al mazo y final a 24', () => {
  const g = tru.ganaRonda;
  assert(g(['parda', 1], 0) === 1 && g(['parda', 'parda', 0], 1) === 0 && g(['parda', 'parda', 'parda'], 1) === 1, 'primera parda');
  assert(g([0, 'parda'], 1) === 0 && g([1, 0, 'parda'], 0) === 1 && g([0, 1, 1], 0) === 1 && g([0, 0], 1) === 0, 'parda después');
  assert(g(['parda'], 0) === null && g([0, 1], 0) === null && g(['parda', 'parda'], 0) === null && g([0], 0) === null);
  // Parda en la primera: sale el que salió; la segunda decide.
  let s = truJugar(truBase(['3o 4o 5o', '3c 6c 7c']), 0, 0);
  assert(s.bazas[0].gana === 'parda' && s.bazas[1].sale === 0 && s.turno === 0);
  s = truJugar(s, 0, 0);
  assert(s.puntos.join() === '0,1' && s.ronda === 2);
  // Al mazo: lo que vale el truco, más 1 si fue en la primera baza sin envido cantado.
  const b = truBase(['1e 1b 7e', '4c 4o 5c']);
  assert(truJugar(b, 'mazo').puntos.join() === '0,2' && truJugar(b, 'envido', 'NQ', 'mazo').puntos.join() === '1,1');
  assert(truJugar(b, 'truco', 'Q', 0, 0, 'mazo').puntos.join() === '0,2');
  s = truJugar(b, 'truco');
  assert(!truHay(s, 'mazo') && tru.accion(s, { mazo: true }) === null, 'con un canto pendiente se responde');
  // Final a 24.
  s = truJugar(truBase(['1e 1b 7e', '4c 4o 5c'], { puntos: [23, 5] }), 0, 0, 0, 0);
  assert(s.puntos.join() === '24,5' && s.ganador === 0 && s.resumen.ronda === 1 && !tru.acciones(s).length && tru.accion(s, { carta: 0 }) === null);
});

probar('truco: accion solo acepta lo de acciones(e) y no modifica la entrada', () => {
  const g = generador(42);
  const rnd = () => azarDe(g);
  const todas = [null, {}, { mazo: true }, { quiero: true }, { quiero: false }, { carta: 0 }, { carta: 1 }, { carta: 2 }, { carta: 3 }, { canto: 'x' },
    ...['envido', 'real', 'falta', 'truco', 'retruco', 'vale4'].map((canto) => ({ canto }))];
  let p = tru.nueva(2, rnd);
  for (let k = 0; k < 3000 && p.ganador === null; k++) {
    const ops = tru.acciones(p).map((a) => JSON.stringify(a));
    const foto = JSON.stringify(p);
    for (const a of todas) assert(!!tru.accion(p, a, rnd) === ops.includes(JSON.stringify(a)), `${JSON.stringify(a)} con ${ops}`);
    assert(JSON.stringify(p) === foto, 'no muta');
    p = tru.accion(p, JSON.parse(ops[Math.floor(rnd() * ops.length)]), rnd);
  }
  assert(p.ganador !== null && Math.max(...p.puntos) >= 24);
});

probar('truco: la máquina en sus tres niveles', () => {
  // Fácil: envido con 30 o más; acepta la mitad de las veces.
  assert(tru.maquina(truBase(['7o 6o 4c', '1e 2b 3c']), 'facil', () => 0.5).canto === 'envido');
  const cantado = truJugar(truBase(['4c 5o 6e', '1e 2b 3c']), 'truco');
  assert(tru.maquina(cantado, 'facil', () => 0.3).quiero === true && tru.maquina(cantado, 'facil', () => 0.7).quiero === false);
  // Normal: la más baja que gana la baza, o la más baja si no puede.
  const jugando = (rival, mano) => truBase(['4o 4e', mano], { bazas: [{ c: [chs(rival)[0], null], gana: null, sale: 0 }], turno: 1, juega: 1,
    envido: { cantos: [], quien: null, estado: 'no' }, truco: { nivel: 3, cantado: 3, quien: 0, quiero: 1, pendiente: false } });
  assert(tru.maquina(jugando('3o', '2c 1e Rb 7b'), 'normal').carta === 1 && tru.maquina(jugando('3o', '2c 1b 1e'), 'normal').carta === 1);
  assert(tru.maquina(jugando('1e', '2c 3o 4b'), 'normal').carta === 2);
  // Normal y Difícil, con el envido ya jugado y azar fijo: con las tres mejores cartas suben a retruco; con las tres peores no quieren.
  const sinEnvido = { envido: { cantos: [], quien: null, estado: 'no' } };
  const fuerte = truJugar(truBase(['4c 5o 6e', '1e 1b 7e'], sinEnvido), 'truco');
  const debil = truJugar(truBase(['1e 1b 7e', '4c 5o 6e'], sinEnvido), 'truco');
  for (const nv of ['normal', 'dificil']) {
    const g = generador(3);
    const rnd = () => azarDe(g);
    const af = tru.maquina(fuerte, nv, rnd), ad = tru.maquina(debil, nv, rnd);
    assert(af.canto === 'retruco' && tru.accion(fuerte, af, rnd), `${nv}: sube con lo mejor`);
    assert(ad.quiero === false && tru.accion(debil, ad, rnd), `${nv}: no quiere con lo peor`);
  }
  // Partidas enteras entre máquinas, con semilla, por nivel: terminan en 24 o más sin acciones inválidas; ninguna jugada pasa de 60 ms.
  let lento = 0;
  for (const nivel of ['facil', 'normal', 'dificil']) {
    const g = generador(7 + nivel.length);
    const rnd = () => azarDe(g);
    let p = tru.nueva(2, rnd);
    for (let jugadas = 0; jugadas < 5000 && p.ganador === null; jugadas++) {
      const t0 = performance.now();
      const a = tru.maquina(p, nivel, rnd);
      lento = Math.max(lento, performance.now() - t0);
      const q = tru.accion(p, a, rnd);
      assert(q, `acción inválida (${nivel})`);
      p = q;
    }
    assert(p.ganador !== null && p.puntos[p.ganador] >= 24, `partida ${nivel}`);
    assert(JSON.stringify(p).length < 8000, 'cabe en la base');
  }
  assert(lento < 60, `la peor jugada tarda ${lento.toFixed(1)} ms`);
});

probar('truco: la Difícil le gana a la Fácil más del 55 % (simulación con semilla)', () => {
  const r = dueloCartas(tru, 'dificil', 'facil', 50, 500);
  assert(r > 0.55, `${(100 * r).toFixed(0)} %`);
});

// --- sw.js: VERSION es la huella de los archivos; si alguno cambia, hay que ponerla al día para que llegue a todos ---
if (globalThis.process?.versions?.node) {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  probar('sw.js: versión al día con los archivos', () => {
    const sw = readFileSync('sw.js', 'utf8');
    const archivos = sw.match(/const ARCHIVOS = \[([\s\S]*?)\];/)[1].match(/'[^']+'/g).map((a) => a.slice(1, -1));
    const h = createHash('sha256');
    for (const a of archivos) if (a !== './') h.update(a).update(readFileSync(a).toString('latin1').replace(/\r/g, ''));
    const huella = h.digest('hex').slice(0, 10);
    assert(sw.includes(`const VERSION = '${huella}';`), `pon const VERSION = '${huella}'; en sw.js`);
  });
}

// --- cajas.js (🎲 Mesa) ---
import { cajas, lineas as lineasCajas, ladosDe, contar as contarCajas } from './games/cajas.js';

probar('cajas: líneas, turno extra, doble cierre y final', () => {
  assert(lineasCajas(3) === 24 && lineasCajas(4) === 40 && lineasCajas(5) === 60);
  const ini = cajas.inicial({ n: 3 });
  assert(ini.n === 3 && ini.celdas.length === 24 + 9 && ini.turno === 'x' && cajas.validas(ini).length === 24);
  assert(cajas.inicial({}).n === 4, 'por defecto 4');
  // Caja (0,0) en 3×3: lados top 0, bottom 3, left 12, right 13.
  assert(ladosDe(3, 0, 0).join() === '0,3,12,13', ladosDe(3, 0, 0).join());
  let e = ini;
  for (const l of [0, 3, 12]) e = cajas.aplicar(e, l); // x, o, x
  assert(e.turno === 'o');
  e = cajas.aplicar(e, 13); // o cierra la caja → sigue o
  assert(e.celdas[24] === 'o' && e.turno === 'o' && contarCajas(e).o === 1);
  // Doble cierre: cajas (0,0) y (0,1) comparten la línea 13.
  let d = cajas.inicial({ n: 3 });
  for (const l of [0, 3, 12, 1, 4, 14]) d = cajas.aplicar(d, l);
  const quien = d.turno;
  d = cajas.aplicar(d, 13);
  assert(d.celdas[24] === quien && d.celdas[25] === quien && d.turno === quien, 'cierra dos');
  // Final.
  let f = cajas.inicial({ n: 3 });
  while (!cajas.ganador(f)) f = cajas.aplicar(f, cajas.validas(f)[0]);
  const n = contarCajas(f);
  assert(n.x + n.o === 9 && cajas.ganador(f) === (n.x > n.o ? 'x' : 'o'));
});

probar('cajas: la máquina cierra, evita la tercera línea y resuelve el final', () => {
  let e = cajas.inicial({ n: 3 });
  for (const l of [0, 3, 12]) e = cajas.aplicar(e, l); // turno o, caja (0,0) con 3 lados
  assert(cajas.ia(e, 'normal') === 13, 'cierra');
  let s = cajas.inicial({ n: 3 });
  s = cajas.aplicar(s, 0); s = cajas.aplicar(s, 3); // caja (0,0) con 2 lados
  const j = cajas.ia(s, 'normal');
  assert(j !== 12 && j !== 13, 'no da la tercera línea');
  let p = cajas.inicial({ n: 3 });
  while (!cajas.ganador(p)) p = cajas.aplicar(p, cajas.ia(p, ['facil', 'normal', 'dificil'][p.celdas.split('-').length % 3]));
  assert(cajas.ganador(p));
});

// --- naval.js (🎲 Mesa) ---
import * as N from './games/naval.js';

probar('naval: flotas válidas, girar, mover y respuestas', () => {
  for (let k = 0; k < 50; k++) assert(N.flotaValida(N.flotaAlAzar()), 'al azar válida');
  const f = [{ c: 0, l: 5, v: false }, { c: 20, l: 4, v: false }, { c: 40, l: 3, v: false }, { c: 60, l: 3, v: false }, { c: 80, l: 2, v: false }];
  assert(N.flotaValida(f));
  assert(!N.flotaValida([...f.slice(0, 4), { c: 71, l: 2, v: false }]), 'tocando en diagonal no vale'); // 71 toca a 60-62 en diagonal
  assert(!N.flotaValida([...f.slice(0, 4), { c: 99, l: 2, v: false }]), 'se sale');
  assert(N.girar(f, 4) === null || N.flotaValida(N.girar(f, 4)));
  assert(N.mover(f, 4, 88) && N.mover(f, 4, 88)[4].c === 88);
  assert(N.mover(f, 4, 1) === null, 'encima de otro');
  assert(N.respuesta(f, [], 9) === 'a' && N.respuesta(f, [], 80) === 't' && N.respuesta(f, [80], 81) === 'h2');
});

probar('naval: partida contra la máquina hasta el final', () => {
  let e = N.inicial({ barcos: { x: N.flotaAlAzar(), o: N.flotaAlAzar() } });
  assert(e.turno === 'x' && N.validas(e).length === 100);
  let k = 0;
  while (!N.ganador(e) && k++ < 400) e = N.aplicar(e, N.ia(e, ['facil', 'normal', 'dificil'][k % 3]));
  assert(N.ganador(e) && N.vencedor(e) === N.ganador(e), 'termina');
  assert(e.tiros[N.ganador(e)].filter(([, r]) => r[0] === 'h').length === 5);
});

await probarAsync('naval: amigo con sello, respuesta automática y revisión', async () => {
  const bx = N.flotaAlAzar(), bo = N.flotaAlAzar();
  const sx = N.nuevaSal(), so = N.nuevaSal();
  let e = N.inicial({ amigo: true });
  assert(e.turno === 'o' && !e.barcos && e.pendiente === null);
  e = { ...e, sellos: { x: await N.sellar(bx, sx), o: await N.sellar(bo, so) } };
  e = N.aplicar(e, 0); // o dispara a x
  assert(e.pendiente === 0 && e.turno === 'x' && N.validas(e).length === 0, 'hay que responder antes');
  e = N.responder(e, bx);
  assert(e.pendiente === null && e.tiros.o.length === 1 && e.tiros.o[0][1] === N.respuesta(bx, [], 0) && e.turno === 'x');
  // Juego completo: cada uno responde con su flota verdadera.
  const flota = { x: bx, o: bo };
  while (!N.vencedor(e)) { e = N.aplicar(e, N.ia(e, 'normal')); e = N.responder(e, flota[e.turno]); }
  const v = N.vencedor(e);
  assert(N.ganador(e) === null, 'sin revelar no hay ganador');
  e = { ...e, revelado: { x: { barcos: bx, sal: sx }, o: { barcos: bo, sal: so } } };
  assert(N.ganador(e) === v);
  assert(await N.verificar(e, 'x') && await N.verificar(e, 'o'), 'honestos pasan');
  // Mentira: x revela otra flota → falla el sello.
  assert(!(await N.verificar({ ...e, revelado: { ...e.revelado, x: { barcos: N.flotaAlAzar(), sal: sx } } }, 'x')), 'detecta flota cambiada');
  // Mentira en una respuesta (un «agua» cambiado por «tocado») → falla la coherencia.
  const k = e.tiros.o.findIndex(([, r]) => r === 'a');
  const t = e.tiros.o.map(([c, r], i) => [c, i === k ? 't' : r]);
  assert(k >= 0 && N.coherente(bx, e.tiros.o) && !N.coherente(bx, t), 'detecta respuesta falsa');
});

probar('naval: siguePartida acepta solo mis escrituras (o parte) o una jugada honesta del rival', () => {
  const f = [{ c: 0, l: 5, v: false }, { c: 20, l: 4, v: false }, { c: 40, l: 3, v: false }, { c: 60, l: 3, v: false }, { c: 80, l: 2, v: false }];
  const ok = (h, e, m) => assert(N.siguePartida(h, e, 'x'), m);
  const no = (h, e, m) => assert(!N.siguePartida(h, e, 'x'), m);
  // B: me llega el turno con su tiro al 33; W1: respondo; W2: disparo al 9 y le paso el turno.
  const B = { turno: 'x', tiros: { x: [[5, 't']], o: [[0, 't'], [99, 'a']] }, pendiente: 33, sellos: { x: 's1', o: 's2' }, revelado: {} };
  const W1 = N.responder(B, f), W2 = N.aplicar(W1, 9), hist = [B, W1, W2];
  const jugada = (cambios = {}) => ({ ...W2, tiros: { ...W2.tiros, x: [...W2.tiros.x, [9, 'a']] }, pendiente: 50, turno: 'x', ...cambios });
  ok(hist, jugada(), 'jugada honesta del rival');
  ok(hist, { revelado: {}, sellos: { o: 's2', x: 's1' }, pendiente: 50, turno: 'x', tiros: { o: W2.tiros.o, x: [[5, 't'], [9, 'a']] } }, 'el orden de las claves no importa');
  ok(hist, B, 'se perdieron mi respuesta y mi tiro');
  ok(hist, W1, 'se perdió solo mi tiro');
  ok(hist, W2, 'mi propio estado');
  no(hist, jugada({ tiros: { x: [[5, 't'], [9, 'a']], o: [[0, 't'], [33, 'a']] } }), 'responde pero borra un agua de sus tiros');
  no(hist, { ...W2, tiros: { x: W2.tiros.x, o: [[0, 't'], [33, 'a']] }, pendiente: 60, turno: 'x' }, 'exploit: borra un agua, no responde y dispara');
  no(hist, { ...W2, pendiente: 50, turno: 'x' }, 'no responde mi tiro y dispara');
  no(hist, { ...W1, pendiente: 50 }, 'borra mi tiro y dispara');
  no(hist, jugada({ tiros: { x: [[5, 't'], [9, 'a']], o: [[0, 't'], [99, 'a'], [33, 'h5']] } }), 'respuesta mía falsificada');
  no(hist, jugada({ tiros: { x: [[9, 'a']], o: W2.tiros.o } }), 'acierto mío borrado');
  no(hist, jugada({ tiros: { x: [[5, 't'], [8, 'a']], o: W2.tiros.o } }), 'responde a otra casilla');
  no(hist, jugada({ tiros: { x: [[5, 't'], [9, 'a'], [10, 'a']], o: W2.tiros.o } }), 'dos respuestas');
  no(hist, jugada({ tiros: { x: [[5, 't'], [9, 'zz']], o: W2.tiros.o } }), 'respuesta mal formada');
  no(hist, jugada({ sellos: { x: 's1', o: 'otro' } }), 'sello del rival cambiado');
  no(hist, jugada({ sellos: { o: 's2' } }), 'mi sello borrado');
  no(hist, jugada({ revelado: { x: {} } }), 'revelado a mi nombre puesto por el rival');
  no(hist, jugada({ revelado: { o: { barcos: f, sal: 'cd' } } }), 'revela sin haber perdido');
  no(hist, jugada({ pendiente: 33 }), 'tiro repetido');
  no(hist, jugada({ pendiente: 100 }), 'tiro fuera del tablero');
  no(hist, jugada({ turno: 'o' }), 'no me pasa el turno');
  no(hist, jugada({ barcos: { x: f } }), 'campo de más');
  no([B, W1], jugada(), 'el rival no puede jugar si mi último estado no le pasó el turno');
  // Mi tiro ya llegó a la nube (hist recortado a W2): volver a B o a W1 es que el rival se niega a responder.
  no([W2], B, 'vuelve a B (borra su último agua) cuando mi tiro ya llegó');
  no([W2], W1, 'borra mi tiro cuando ya llegó');
  ok([W2], jugada(), 'jugada honesta tras confirmar');
  // Primera jugada del invitado: sella y dispara sobre mi estado inicial.
  const ini = { ...N.inicial({ amigo: true }), sellos: { x: 's1' } };
  ok([ini], { ...ini, sellos: { x: 's1', o: 's2' }, pendiente: 0, turno: 'x' }, 'el invitado sella y dispara');
  no([ini], { ...ini, pendiente: 0, turno: 'x' }, 'dispara sin sellar');
  // Final: mi tiro hunde su último barco (perdió: revela y me pasa el turno).
  const casi = { ...W2, tiros: { ...W2.tiros, x: [[1, 'h5'], [2, 'h4'], [3, 'h3'], [4, 'h3']] } };
  const respFinal = { ...casi, tiros: { ...casi.tiros, x: [...casi.tiros.x, [9, 'h2']] }, pendiente: null, turno: 'x' };
  ok([casi], { ...respFinal, revelado: { o: { barcos: f, sal: 'cd' } } }, 'perdió: revela y me pasa el turno');
  no([casi], respFinal, 'pierde sin revelar');
  // Final: perdí, revelé y le pasé el turno; él revela y cierra.
  const perdi = { turno: 'o', tiros: { x: [[5, 'a']], o: [[1, 'h5'], [2, 'h4'], [3, 'h3'], [4, 'h3'], [6, 'h2']] }, pendiente: null, sellos: { x: 's1', o: 's2' }, revelado: { x: { barcos: f, sal: 'ab' } } };
  ok([perdi], { ...perdi, revelado: { ...perdi.revelado, o: { barcos: f, sal: 'cd' } } }, 'ganó: revela y cierra');
  no([perdi], { ...perdi, revelado: { x: { barcos: f, sal: 'zz' }, o: { barcos: f, sal: 'cd' } } }, 'cambia lo que revelé');
  no([{ ...perdi, revelado: {} }], { ...perdi, revelado: { o: { barcos: f, sal: 'cd' } } }, 'cierra sin que yo haya revelado');
  assert(N.trampaPorRendicion('o', 'x', true, false) === false, 'me rendí');
  assert(N.trampaPorRendicion('x', 'x', false, true) === false, 'se rindió el rival y gano yo');
  assert(N.trampaPorRendicion('o', 'x', false, true) === true, 'el rival se rinde y se da la victoria');
  assert(N.trampaPorRendicion('x', 'x', false, false) === null, 'sin rendición se revisa');
});

probar('naval: igual no depende del orden de las claves (eco de la nube en Damas)', () => {
  assert(N.igual({ celdas: 'x', sinComer: 0, turno: 'o' }, { celdas: 'x', turno: 'o', sinComer: 0 }));
  assert(!N.igual({ a: [1, 2] }, { a: [2, 1] }) && !N.igual({ a: 1 }, { a: 1, b: 2 }) && !N.igual(null, {}));
});

probar('naval: tiros repetidos no hacen ganar ni pasan la revisión', () => {
  const f = [{ c: 0, l: 5, v: false }, { c: 20, l: 4, v: false }, { c: 40, l: 3, v: false }, { c: 60, l: 3, v: false }, { c: 80, l: 2, v: false }];
  let e = N.inicial({ amigo: true });
  e = N.aplicar(e, 80); e = N.responder(e, f);
  e = { ...e, turno: 'o' };
  e = N.aplicar(e, 81); e = N.responder(e, f); // h2
  for (let k = 0; k < 4; k++) { e = { ...e, turno: 'o', pendiente: 81 }; e = N.responder({ ...e, turno: 'x' }, f); }
  assert(e.tiros.o.length === 2, 'responder ignora el repetido');
  const falso = [[80, 't'], [81, 'h2'], [81, 'h2'], [81, 'h2'], [81, 'h2'], [81, 'h2']];
  assert(N.vencedor({ tiros: { x: [], o: falso } }) === null, 'repetidos no suman');
  assert(!N.coherente(f, falso), 'coherente rechaza repetidos');
  assert(!N.coherente(f, [[100, 'a']]) && !N.coherente(f, [[1.5, 'a']]), 'fuera de rango');
  assert(N.aplicar(N.inicial({ barcos: { x: f, o: f } }), 100).tiros.x.length === 0, 'aplicar ignora lo inválido');
});

// --- justo.js: dados justos con un amigo ---
import * as J from './games/justo.js';

await probarAsync('justo: mismos dados con la misma semilla y número; otros con otra k, otro número u otra semilla', async () => {
  const s = J.nuevaSemilla(), r = J.nuevaSemilla();
  assert(/^[0-9a-f]{32}$/.test(s) && s !== r, 'semilla de 16 bytes en hex');
  const a = await J.dadosDe(s, r, 3, 5), b = await J.dadosDe(s, r, 3, 5);
  assert(a.length === 5 && a.every((d) => Number.isInteger(d) && d >= 1 && d <= 6) && J.igual(a, b), JSON.stringify([a, b]));
  const otros = [await J.dadosDe(s, r, 4, 5), await J.dadosDe(s, J.nuevaSemilla(), 3, 5), await J.dadosDe(J.nuevaSemilla(), r, 3, 5)];
  assert(otros.some((o) => !J.igual(o, a)), 'cambia con k, número o semilla');
  // Vector fijo: el resultado no puede cambiar entre versiones (las partidas guardadas se recalculan al final).
  // HMAC('00', 'ff:1') empieza 29 71 c8 6b 23; el de 'ff:3', ff 7c 0d 51 ad 08: el ff (≥ 252) se descarta.
  assert(J.igual(await J.dadosDe('00', 'ff', 1, 5), [6, 6, 3, 6, 6]) && J.igual(await J.dadosDe('00', 'ff', 3, 5), [5, 2, 4, 6, 3]), 'vectores fijos');
  assert(await J.sellar('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'SHA-256 de «abc»');
  // Muchos dados: se pasa de los 32 bytes de un HMAC y se sigue con el contador, sin repetir el bloque.
  const muchos = await J.dadosDe(s, r, 0, 80);
  assert(muchos.length === 80 && !J.igual(muchos.slice(0, 30), muchos.slice(30, 60)), 'extiende con contador');
  assert(J.igual(muchos.slice(0, 5), await J.dadosDe(s, r, 0, 5)), 'los primeros no dependen de cuántos');
});

await probarAsync('justo: 10.000 dados, cada cara entre 15 % y 18,5 %', async () => {
  const s = J.nuevaSemilla(), r = J.nuevaSemilla(), cuenta = [0, 0, 0, 0, 0, 0, 0];
  for (let k = 0; k < 2000; k++) for (const d of await J.dadosDe(s, r, k, 5)) cuenta[d]++;
  for (let c = 1; c <= 6; c++) assert(cuenta[c] >= 1500 && cuenta[c] <= 1850, `cara ${c}: ${cuenta[c]}`);
});

await probarAsync('justo: el sello detecta una semilla cambiada y un sello falso', async () => {
  const s = J.nuevaSemilla(), sello = await J.sellar(s);
  assert(/^[0-9a-f]{64}$/.test(sello) && sello === await J.sellar(s));
  assert(await J.verificarSemilla(sello, s), 'honesto');
  assert(!(await J.verificarSemilla(sello, J.nuevaSemilla())), 'otra semilla');
  assert(!(await J.verificarSemilla(await J.sellar(J.nuevaSemilla()), s)), 'sello falso');
  assert(!(await J.verificarSemilla(sello, undefined)) && !(await J.verificarSemilla(undefined, s)), 'faltan datos');
  // Un dado publicado que no cuadra con la semilla revelada se nota al recalcular.
  const r = J.nuevaSemilla(), publicados = await J.dadosDe(s, r, 2, 5);
  const cambiado = publicados.map((d, i) => (i ? d : (d % 6) + 1));
  assert(J.igual(await J.dadosDe(s, r, 2, 5), publicados) && !J.igual(await J.dadosDe(s, r, 2, 5), cambiado), 'dado cambiado');
});

probar('justo: siguePartida acepta mis escrituras o una jugada legítima del rival, y nada más', () => {
  // Juego de juguete: el rival suma 1 a `n` y me pasa el turno.
  const suma = (w, e, yo) => w.turno !== yo && J.igual(e, { ...w, n: w.n + 1, turno: yo });
  const B = { n: 0, turno: 'x' }, W1 = { n: 1, turno: 'x' }, W2 = { n: 2, turno: 'o' }, hist = [B, W1, W2];
  assert(J.siguePartida(hist, { turno: 'x', n: 3 }, 'x', suma), 'jugada legítima (orden de claves aparte)');
  assert(hist.every((h) => J.siguePartida(hist, h, 'x', suma)), 'mis escrituras (alguna perdida)');
  assert(!J.siguePartida(hist, { n: 4, turno: 'x' }, 'x', suma), 'dos jugadas');
  assert(!J.siguePartida(hist, { n: 3, turno: 'x', extra: 1 }, 'x', suma), 'campo de más');
  assert(!J.siguePartida([B, W1], { n: 2, turno: 'x' }, 'x', suma), 'no era su turno');
  // Al confirmar W2 se recorta el historial: volver a B ya no vale.
  const h2 = J.recortar(hist, W2);
  assert(J.igual(h2, [W2]) && J.recortar(hist, B) === hist && J.recortar(hist, { n: 9 }) === hist && J.recortar(undefined, B) === undefined);
  assert(!J.siguePartida(h2, B, 'x', suma) && J.siguePartida(h2, { n: 3, turno: 'x' }, 'x', suma));
});

// --- Cacho y Generala con un amigo: dados justos con la hora del servidor (log/k) ---
const jsn = (x) => JSON.parse(JSON.stringify(x));
const FICHAS = ['x', 'o'];
let LOG = null; // el registro (log/k) de la partida que se revisa
const P_gen = (w, e) => gen.pasosAmigo(w, e, LOG), P_cacho = (w, e) => cacho.pasosAmigo(w, e, LOG);
// Una partida honesta entre dos celulares, sin red: `jugar(e, t, dadosDe)` da la siguiente escritura del juego de `t`.
// Devuelve el final, el registro y cada llegada de turno: [W (lo último que escribió quien recibe), e, quien].
async function partidaAmigo(M, jugar) {
  const semillas = [J.nuevaSemilla(), J.nuevaSemilla()], log = {};
  let ahora = 1700000000000, e = jsn(M.nuevaAmigo(await J.sellar(semillas[0])));
  const base = [e, null], llegadas = [];
  const dadosDe = (t, k, n) => J.dadosDe(semillas[t], e.r[FICHAS[1 - t]] + ':' + log[k].cuando, k, n);
  for (let n = 0; !(e.ganador !== null && e.s.x && e.s.o); n++) {
    if (n > 3000) throw new Error('no termina');
    const t = e.turno, F = FICHAS[t];
    let s;
    if (!e.sellos.o) s = { ...e, sellos: { ...e.sellos, o: await J.sellar(semillas[1]) }, r: { o: J.nuevaSemilla() }, turno: 0 };
    else if (!e.r.x) s = { ...e, r: { ...e.r, x: J.nuevaSemilla() } };
    else if (e.ganador !== null) s = { ...e, s: { ...e.s, [F]: semillas[t] }, turno: 1 - t };
    else s = await jugar(e, t, dadosDe);
    if (!s) throw new Error('jugada nula: ' + JSON.stringify(e).slice(0, 300));
    if (s.k === e.k + 1) log[s.k] = { cuando: (ahora += 1234), g: J.mascara(s.guardados), j: FICHAS[t] };
    else assert(s.k === e.k, 'k sube de a 1');
    e = jsn(s);
    assert(JSON.stringify(e).length < 8000, 'datos de la mesa < 8000 caracteres');
    assert(JSON.stringify(e).length < 8000, 'datos de la mesa < 8000 (tamaño ' + JSON.stringify(e).length + ')');
    if (e.turno !== t) {
      base[t] = e;
      if (base[e.turno]) llegadas.push([base[e.turno], e, e.turno]);
    }
  }
  LOG = log;
  return { e, log, llegadas, semillas };
}
const jugarGenerala = async (e, t, dadosDe) => {
  if (e.pide) return gen.publicar(e, await dadosDe(t, e.k, gen.sueltos(e).filter(Boolean).length));
  const a = gen.maquina(e, 'normal');
  return gen.accion(e, a) ?? gen.anotar(e, Object.keys(gen.posibles(e))[0]);
};
const vistaCacho = async (e, t, dadosDe) => ({ ...e, jugadores: await Promise.all(e.jugadores.map(async (j, i) => (i === t ? { ...j, dados: await dadosDe(t, e.k, j.dados.length) } : j))) });
const jugarCacho = async (e, t, dadosDe) => {
  if (e.k < e.ronda) return cacho.empezarRonda(e);
  const v = await vistaCacho(e, t, dadosDe);
  if (e.revelar) return cacho.revelar(e, v.jugadores[t].dados);
  return cacho.ocultar(cacho.accion(v, cacho.maquina(v, 'normal')) ?? cacho.dudar(v));
};
const honestos = async (M, { e, log }) => [await J.rivalHonesto(e, 0, log, M.tiradasAmigo(e, log)), await J.rivalHonesto(e, 1, log, M.tiradasAmigo(e, log))];

await probarAsync('generala amigo: partidas honestas; cada vuelta de turno es una jugada legítima y al final todo cuadra', async () => {
  let cambiados = 0;
  for (let i = 0; i < 4; i++) {
    const p = await partidaAmigo(gen, jugarGenerala);
    assert(p.llegadas.every(([w, e, yo]) => J.jugadaRival(w, e, yo, P_gen)), 'una vuelta de turno no cuadra');
    // Si cambia lo guardado después de pedir una tirada (log/k dice otra cosa), la vuelta de turno no cuadra.
    for (const [w, e, yo] of p.llegadas) {
      const i = e.hechas.findIndex((h, x) => x >= w.hechas.length && h.t > 1 && h.j !== yo);
      if (i < 0) continue;
      LOG = { ...p.log, [i + 1]: { ...p.log[i + 1], g: J.mascara(e.hechas[i].g.map((x) => !x)) } };
      cambiados++;
      assert(!J.jugadaRival(w, e, yo, P_gen), 'guardados cambiados tras la tirada');
      LOG = p.log;
    }
    assert((await honestos(gen, p)).every(Boolean), 'final honesto');
    assert(p.e.k === p.e.hechas.length && p.e.hechas.length >= 2 && Object.keys(p.log).length === p.e.k, 'una k por tirada');
  }
  assert(cambiados > 0, 'se probó cambiar lo guardado');
});

await probarAsync('generala amigo: se notan dados cambiados, k quemada, volver a tirar, sello cambiado, tabla alterada y hora falsa', async () => {
  let p;
  do p = await partidaAmigo(gen, jugarGenerala); while (p.llegadas.length < 6); // (sin generala servida al principio)
  const [w, e, yo] = p.llegadas.find(([, e]) => e.ganador === null && e.hechas.length > 2);
  const rival = 1 - yo;
  assert(J.jugadaRival(w, e, yo, P_gen), 'honesta');
  assert(!J.jugadaRival(w, { ...e, k: e.k + 1 }, yo, P_gen), 'k quemada (sin su tirada)');
  const otraVez = jsn(e); otraVez.k++; otraVez.hechas.push({ ...otraVez.hechas.at(-1), t: 1 }); // «vuelve a tirar» la última
  assert(!J.jugadaRival(w, otraVez, yo, P_gen), 'volver a tirar');
  assert(!J.jugadaRival(w, { ...e, sellos: { ...e.sellos, [FICHAS[rival]]: 'a'.repeat(64) } }, yo, P_gen), 'sello cambiado');
  const tabla = jsn(e); tabla.jugadores[yo].tabla['1'] = 99;
  assert(!J.jugadaRival(w, tabla, yo, P_gen), 'mi tabla alterada');
  assert(!J.jugadaRival(w, { ...e, r: { ...e.r, [FICHAS[yo]]: 'b'.repeat(32) } }, yo, P_gen), 'mi número cambiado');
  // Lo guardado se cambia después de pedir la tirada (ya con la hora del servidor): no cuadra con log/k.
  const i2 = e.hechas.findIndex((h, i) => i >= w.hechas.length && h.t > 1);
  if (i2 >= 0) {
    const g2 = e.hechas[i2].g.map((x) => !x);
    const otroLog = { ...LOG, [i2 + 1]: { ...LOG[i2 + 1], g: J.mascara(g2) } };
    const antes = LOG; LOG = otroLog;
    assert(!J.jugadaRival(w, e, yo, P_gen) && gen.tiradasAmigo(p.e, otroLog) === null, 'guardados distintos de log/k');
    LOG = antes;
  }
  const jOtro = { ...LOG, [e.k]: { ...LOG[e.k], j: FICHAS[yo] } };
  assert(gen.tiradasAmigo(p.e, jOtro) === null, 'log/k de otro jugador');
  // Al final: un dado tirado que no salió de la semilla, una hora falsa o una semilla que no es la del sello.
  const k = p.e.hechas.findIndex((h) => h.j === 1 && h.t === 1);
  const dado = jsn(p.e); dado.hechas[k].d[0] = (dado.hechas[k].d[0] % 6) + 1;
  assert(!(await J.rivalHonesto(dado, 1, p.log, gen.tiradasAmigo(dado, LOG))), 'dado cambiado');
  assert(await J.rivalHonesto(p.e, 0, p.log, gen.tiradasAmigo(p.e, LOG)), 'el otro sigue honesto');
  const hora = { ...p.log, [k + 1]: { cuando: p.log[k + 1].cuando + 1 } };
  assert(!(await J.rivalHonesto(p.e, 1, hora, gen.tiradasAmigo(p.e, LOG))), 'hora distinta');
  assert(!(await J.rivalHonesto({ ...p.e, s: { ...p.e.s, o: J.nuevaSemilla() } }, 1, p.log, gen.tiradasAmigo(p.e, LOG))), 'semilla falsa');
  assert(gen.tiradasAmigo({ ...p.e, k: p.e.k + 1 }, LOG) === null, 'k sin tirada al final');
  const guardado = jsn(p.e), h2 = guardado.hechas.findIndex((h) => h.t > 1 && h.g.some(Boolean));
  if (h2 >= 0) { const x = guardado.hechas[h2].g.indexOf(true); guardado.hechas[h2].d[x] = (guardado.hechas[h2].d[x] % 6) + 1; assert(gen.tiradasAmigo(guardado, LOG) === null, 'dado guardado cambiado'); }
});

probar('generala amigo: tirar solo pide (k + 1), publicar pone los sueltos y no se anota ni se guarda con la tirada pedida', () => {
  let e = { ...gen.nuevaAmigo('s'), turno: 0, sellos: { x: 's', o: 's' }, r: { x: 'a', o: 'b' } };
  const p1 = gen.tirar(e);
  assert(p1.k === 1 && p1.pide && p1.tiradas === 0 && !gen.tirar(p1) && !gen.anotar(p1, '1') && !gen.alternarGuardado(p1, 0));
  assert(!gen.publicar(p1, [1, 2, 3]) && !gen.publicar(p1, [1, 2, 3, 4, 7]), 'cinco dados de 1 a 6');
  e = gen.publicar(p1, [1, 2, 3, 4, 5]);
  assert(e.tiradas === 1 && !e.pide && J.igual(e.hechas, [{ j: 0, t: 1, g: [false, false, false, false, false], d: [1, 2, 3, 4, 5] }]));
  const p2 = gen.tirar(gen.alternarGuardado(e, 4));
  assert(p2.k === 2 && J.igual(gen.sueltos(p2), [true, true, true, true, false]));
  e = gen.publicar(p2, [6, 6, 6, 6]);
  LOG = { 1: { g: '00000', j: 'x' }, 2: { g: '00001', j: 'x' } };
  assert(J.igual(e.dados, [6, 6, 6, 6, 5]) && e.hechas[1].t === 2 && J.igual(gen.tiradasAmigo(e, LOG), [{ k: 1, j: 0, d: [1, 2, 3, 4, 5] }, { k: 2, j: 0, d: [6, 6, 6, 6] }]));
});

await probarAsync('cacho amigo: partidas honestas; cada vuelta de turno es una jugada legítima y al final todo cuadra', async () => {
  const ganadores = new Set();
  for (let i = 0; i < 6 || (ganadores.size < 2 && i < 16); i++) {
    const p = await partidaAmigo(cacho, jugarCacho);
    ganadores.add(p.e.ganador);
    assert(p.llegadas.every(([w, e, yo]) => J.jugadaRival(w, e, yo, P_cacho)), 'una vuelta de turno no cuadra');
    assert((await honestos(cacho, p)).every(Boolean), 'final honesto');
    assert(p.e.k === p.e.reveladas.length && p.e.k === p.e.ronda - 1, 'una k por ronda');
    assert(p.llegadas.every(([, e]) => e.jugadores.every((j) => j.dados.every((d) => d === 0))), 'los dados nunca van en la mesa');
  }
  assert(ganadores.size === 2, 'gana cada uno alguna vez');
});

await probarAsync('cacho amigo: se notan una revelación falsa, k quemada, cuántos dados cambiados y el sello cambiado', async () => {
  const p = await partidaAmigo(cacho, jugarCacho);
  // Una vuelta en que el rival reveló y cerró la ronda (y quizá empezó la siguiente y apostó).
  const [w, e, yo] = p.llegadas.find(([w, e]) => w.revelar && e.ronda > w.ronda && e.ganador === null);
  const rival = 1 - yo;
  assert(J.jugadaRival(w, e, yo, P_cacho), 'honesta');
  assert(!J.jugadaRival(w, { ...e, k: e.k + 1 }, yo, P_cacho), 'k quemada');
  const cuantos = jsn(e); cuantos.jugadores[yo].dados.pop();
  assert(!J.jugadaRival(w, cuantos, yo, P_cacho), 'me quita un dado');
  const corto = jsn(e); corto.reveladas[w.ronda - 1][rival] = corto.reveladas[w.ronda - 1][rival].slice(1);
  assert(!J.jugadaRival(w, corto, yo, P_cacho), 'revela menos dados de los que tiene');
  assert(!J.jugadaRival(w, { ...e, sellos: { ...e.sellos, [FICHAS[rival]]: 'a'.repeat(64) } }, yo, P_cacho), 'sello cambiado');
  const [w2, e2, yo2] = p.llegadas.find(([, e]) => e.apuesta && !e.revelar);
  const ap = jsn(e2); ap.apuesta.n += 50; ap.apuestas[ap.apuestas.length - 1].n += 50;
  assert(!J.jugadaRival(w2, ap, yo2, P_cacho), 'apuesta imposible');
  // Revelación falsa: pasa la revisión de cada turno (no hay cómo saberlo), pero no la del final.
  const falsa = jsn(p.e); falsa.reveladas[0][1] = falsa.reveladas[0][1].map((d) => (d % 6) + 1);
  assert(!(await J.rivalHonesto(falsa, 1, p.log, cacho.tiradasAmigo(falsa, LOG))) && await J.rivalHonesto(falsa, 0, p.log, cacho.tiradasAmigo(falsa, LOG)), 'revelación falsa');
  assert(cacho.tiradasAmigo({ ...p.e, k: p.e.k + 1 }, LOG) === null, 'k sin ronda al final');
});

probar('cacho amigo: dudar pasa a revelar (primero quien apostó) y la ronda se cierra con los dados revelados', () => {
  let e = { ...cacho.nuevaAmigo('s'), turno: 0, sellos: { x: 's', o: 's' }, r: { x: 'a', o: 'b' } };
  assert(!cacho.apostar(e, { n: 2, pinta: 3 }), 'sin empezar la ronda no se apuesta');
  e = cacho.empezarRonda(e);
  assert(e.k === 1 && !cacho.empezarRonda(e));
  e = cacho.dudar(cacho.apostar(e, { n: 3, pinta: 4 }));
  assert(e.revelar.tipo === 'dudo' && e.revelar.por === 1 && e.turno === 0 && !cacho.apostar(e, { n: 4, pinta: 4 }) && !cacho.dudar(e));
  assert(!cacho.revelar(e, [1, 2, 3]), 'cinco dados');
  e = cacho.revelar(e, [4, 4, 2, 2, 2]);
  assert(e.turno === 1 && J.igual(e.revelar.dados, [[4, 4, 2, 2, 2], null]));
  e = cacho.revelar(e, [1, 5, 5, 5, 5]); // hay 3 (con el as): la apuesta era cierta, pierde quien dudó
  assert(e.revelar === null && e.resumen.total === 3 && e.jugadores[1].dados.length === 4 && J.igual(e.jugadores[1].dados, [0, 0, 0, 0]));
  LOG = { 1: { g: '00000', j: 'x' } };
  assert(e.ronda === 2 && e.k === 1 && e.turno === 1 && J.igual(cacho.tiradasAmigo(e, LOG), [{ k: 1, j: 0, d: [4, 4, 2, 2, 2] }, { k: 1, j: 1, d: [1, 5, 5, 5, 5] }]));
});

// ---- Sudoku (reglas puras) ----
import * as su from './games/sudoku.js';

const sudokuValido = (s) => {
  const ok = (idx) => idx.map((i) => s[i]).sort().join('') === '123456789';
  for (let k = 0; k < 9; k++) {
    if (!ok([...Array(9)].map((_, j) => k * 9 + j))) return false;
    if (!ok([...Array(9)].map((_, j) => j * 9 + k))) return false;
    const f = Math.floor(k / 3) * 3, c = (k % 3) * 3;
    if (!ok([...Array(9)].map((_, j) => (f + Math.floor(j / 3)) * 9 + c + (j % 3)))) return false;
  }
  return true;
};
const pistasDe = (t) => [...t].filter((c) => c !== '0').length;

probar('sudoku: misma semilla da las mismas dadas', () => {
  assert(su.generar(7, 'normal').dadas === su.generar(7, 'normal').dadas);
  assert(su.generar(7, 'normal').dadas !== su.generar(8, 'normal').dadas);
});
for (const nivel of ['facil', 'normal', 'dificil']) {
  probar(`sudoku ${nivel}: solución única, válida, coherente y con las pistas del nivel`, () => {
    for (const semilla of [1, 2, 3]) {
      const { dadas, solucion } = su.generar(semilla, nivel);
      assert(su.soluciones(dadas) === 1, 'única');
      assert(sudokuValido(solucion), 'solución válida');
      assert([...dadas].every((c, i) => c === '0' || c === solucion[i]), 'coherente');
      const p = pistasDe(dadas);
      assert(p >= su.PISTAS[nivel] && p <= su.PISTAS[nivel] + 4, `pistas ${p}`);
    }
  });
}
probar('sudoku: soluciones corta en el tope y detecta tableros imposibles', () => {
  assert(su.soluciones('0'.repeat(81)) === 2);
  assert(su.soluciones('0'.repeat(81), 3) === 3);
  assert(su.soluciones('11' + '0'.repeat(79)) === 0);
});
probar('sudoku: choques detecta fila, columna y caja, y no marca la solución', () => {
  const v = (...pares) => { const a = Array(81).fill('0'); for (const [i, n] of pares) a[i] = n; return a.join(''); };
  assert(su.choques(v([0, '5'], [8, '5'])).size === 2, 'fila');
  assert(su.choques(v([0, '5'], [72, '5'])).size === 2, 'columna');
  assert(su.choques(v([0, '5'], [20, '5'])).size === 2, 'caja');
  assert(su.choques(v([0, '5'], [10, '6'], [80, '5'])).size === 0, 'sin choque');
  assert(su.choques(su.generar(4, 'facil').solucion).size === 0 && su.choques('0'.repeat(81)).size === 0);
});
probar('sudoku: resuelto y pista', () => {
  const { dadas, solucion } = su.generar(5, 'facil');
  assert(su.resuelto(solucion, solucion) && !su.resuelto(dadas, solucion));
  assert(!su.resuelto(solucion.slice(0, 80) + (solucion[80] === '1' ? '2' : '1'), solucion));
  const i = [...dadas].findIndex((c) => c === '0');
  assert(su.pista(dadas, solucion) === i);
  assert(su.pista(solucion, solucion) === -1);
  const mal = solucion.slice(0, 3) + (solucion[3] === '1' ? '2' : '1') + solucion.slice(4);
  assert(su.pista(mal, solucion) === 3);
});
probar('sudoku: generar un Difícil tarda menos de 1,5 s en promedio', () => {
  const t0 = Date.now();
  for (let s = 100; s < 105; s++) su.generar(s, 'dificil');
  const ms = (Date.now() - t0) / 5;
  if (typeof console !== 'undefined') console.log(`   (difícil: ${ms.toFixed(0)} ms por tablero)`);
  assert(ms < 1500, `${ms} ms`);
});

// ---- Buscaminas infinito (reglas puras) ----
import * as mi from './games/minas.js';

const vecinasDe = (x, y) => { const r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) r.push([x + dx, y + dy]); return r; };
const numDe = (s, n, x, y) => vecinasDe(x, y).filter(([a, b]) => mi.hayMina(s, n, a, b)).length;
// primera casilla segura y cerrada con valor > 0 (o con minas vecinas) lejos del origen
const buscar = (e, f) => { for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) if (!e.abiertas[`${x},${y}`] && e.abiertas[`${x},${y}`] !== 0 && f(x, y)) return [x, y]; return null; };

probar('minas: hayMina es determinista y el 3×3 del origen nunca tiene minas', () => {
  for (const n of ['facil', 'normal', 'dificil']) for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) assert(!mi.hayMina(9, n, x, y));
  assert(mi.hayMina(3, 'normal', 40, 7) === mi.hayMina(3, 'normal', 40, 7));
  let difiere = false;
  for (let x = 5; x < 60; x++) if (mi.hayMina(1, 'normal', x, 9) !== mi.hayMina(2, 'normal', x, 9)) difiere = true;
  assert(difiere, 'otra semilla, otro mapa');
});
probar('minas: la densidad observada en 200×200 lejos del origen es la esperada (±2 pp)', () => {
  for (const n of ['facil', 'normal', 'dificil']) {
    let m = 0;
    for (let x = 0; x < 200; x++) for (let y = 0; y < 200; y++) if (mi.hayMina(11, n, 1000 + x, 1000 + y)) m++;
    const esp = mi.densidad(n, 1100, 1100);
    assert(Math.abs(m / 40000 - esp) < 0.02, `${n}: ${m / 40000} vs ${esp}`);
  }
  assert(mi.densidad('normal', 0, 0) === 0.17 && Math.abs(mi.densidad('normal', 50, -3) - 0.19) < 1e-9 && Math.abs(mi.densidad('facil', 9999, 0) - 0.2) < 1e-9);
});
probar('minas: la expansión inicial coincide con una BFS de referencia', () => {
  for (const [s, n] of [[1, 'facil'], [2, 'normal'], [3, 'dificil']]) {
    const e = mi.nueva(s, n);
    const vis = new Set(['0,0']), cola = [[0, 0]];
    while (cola.length) {
      const [x, y] = cola.shift();
      if (numDe(s, n, x, y) !== 0) continue;
      for (const [a, b] of vecinasDe(x, y)) if (!vis.has(`${a},${b}`)) { vis.add(`${a},${b}`); cola.push([a, b]); }
    }
    assert(Object.keys(e.abiertas).sort().join('|') === [...vis].sort().join('|'), `${n}: región`);
    assert(Object.entries(e.abiertas).every(([k, v]) => { const [x, y] = k.split(',').map(Number); return v === numDe(s, n, x, y); }), `${n}: números`);
    assert(e.boom === null && !e.fin && e.seguidas === 0);
  }
});
probar('minas: abrir marca boom en una mina, ignora bandera/abierta/boom/fin y no muta la entrada', () => {
  const e = mi.nueva(5, 'dificil');
  const [mx, my] = buscar(e, (x, y) => mi.hayMina(5, 'dificil', x, y));
  const antes = JSON.stringify(e);
  const b = mi.abrir(e, mx, my);
  assert(JSON.stringify(e) === antes, 'no muta');
  assert(b.boom === `${mx},${my}` && b.abiertas[`${mx},${my}`] === undefined);
  assert(JSON.stringify(mi.abrir(b, 40, 40)) === JSON.stringify(b), 'con boom no abre');
  const c = mi.bandera(e, mx, my);
  assert(JSON.stringify(mi.abrir(c, mx, my)) === JSON.stringify(c), 'con bandera no abre');
  assert(JSON.stringify(mi.bandera(c, mx, my).banderas) === '{}', 'bandera alterna');
  const [sx, sy] = buscar(e, (x, y) => !mi.hayMina(5, 'dificil', x, y));
  const d = mi.abrir(e, sx, sy);
  assert(d.abiertas[`${sx},${sy}`] === numDe(5, 'dificil', sx, sy) && JSON.stringify(e) === antes);
  const t = mi.terminar(d);
  assert(t.fin && JSON.stringify(mi.abrir(t, mx, my)) === JSON.stringify(t) && JSON.stringify(mi.bandera(t, sx, sy)) === JSON.stringify(t));
  assert(mi.seguir(d) === d, 'seguir sin boom');
});
probar('minas: acorde abre las vecinas o da boom', () => {
  // un número 1 con su mina marcada y el resto cerrado
  let e = mi.nueva(7, 'normal'), hallado = null;
  for (const k of Object.keys(e.abiertas)) {
    const [x, y] = k.split(',').map(Number);
    if (e.abiertas[k] !== 1) continue;
    const cerr = vecinasDe(x, y).filter(([a, b]) => e.abiertas[`${a},${b}`] === undefined);
    if (cerr.length >= 2 && cerr.some(([a, b]) => mi.hayMina(7, 'normal', a, b))) { hallado = { x, y, cerr }; break; }
  }
  assert(hallado, 'hay un 1 con vecinas cerradas');
  const { x, y, cerr } = hallado;
  const [mx, my] = cerr.find(([a, b]) => mi.hayMina(7, 'normal', a, b));
  assert(JSON.stringify(mi.acorde(e, x, y)) === JSON.stringify(e), 'sin banderas no hace nada');
  const ok = mi.acorde(mi.bandera(e, mx, my), x, y);
  assert(ok.boom === null && cerr.every(([a, b]) => (a === mx && b === my) || ok.abiertas[`${a},${b}`] !== undefined), 'abre las demás');
  const [fx, fy] = cerr.find(([a, b]) => !mi.hayMina(7, 'normal', a, b));
  const mal = mi.acorde(mi.bandera(e, fx, fy), x, y);
  assert(mal.boom !== null, 'bandera equivocada: boom');
  const ex = mi.acorde(mi.seguir({ ...e, boom: `${mx},${my}` }), x, y);
  assert(ex.boom === null && ex.explotadas[`${mx},${my}`], 'la explotada cuenta como bandera');
});
probar('minas: acorde para en la primera mina (no abre las vecinas que siguen)', () => {
  // un número v con v banderas equivocadas: todas las seguras antes de la primera mina marcadas y una segura después sin marcar
  let caso = null;
  for (let sem = 1; sem < 60 && !caso; sem++) {
    const e = mi.nueva(sem, 'dificil');
    for (const k of Object.keys(e.abiertas)) {
      const v = e.abiertas[k], [x, y] = k.split(',').map(Number);
      if (!v) continue;
      const cerr = vecinasDe(x, y).filter(([a, b]) => e.abiertas[`${a},${b}`] === undefined);
      const m = cerr.findIndex(([a, b]) => mi.hayMina(sem, 'dificil', a, b));
      if (m < 0) continue;
      const seguras = cerr.filter(([a, b]) => !mi.hayMina(sem, 'dificil', a, b));
      const antes = seguras.filter((c) => cerr.indexOf(c) < m), despues = seguras.filter((c) => cerr.indexOf(c) > m);
      if (antes.length > v || antes.length + despues.length < v + 1) continue;
      const marcar = [...antes, ...despues.slice(0, v - antes.length)];
      caso = { e: marcar.reduce((r, [a, b]) => mi.bandera(r, a, b), e), x, y, mina: cerr[m] };
      break;
    }
  }
  assert(caso, 'hay un caso');
  const r = mi.acorde(caso.e, caso.x, caso.y);
  assert(r.boom === caso.mina.join(','), 'boom en la primera mina');
  assert(Object.keys(r.abiertas).length === Object.keys(caso.e.abiertas).length, 'no abre nada tras el boom');
});
probar('minas: nueva guarda en inicio las casillas de la apertura gratis', () => {
  for (const [s, n] of [[1, 'facil'], [2, 'normal'], [3, 'dificil']]) {
    const e = mi.nueva(s, n);
    assert(e.inicio === Object.keys(e.abiertas).length && e.inicio >= 1, `${n}: inicio`);
    assert(mi.abrir(e, 40, 40).inicio === e.inicio && mi.terminar(e).inicio === e.inicio, `${n}: se conserva`);
  }
});
probar('minas: seguir, costoSeguir, terminar y puntaje', () => {
  assert(mi.costoSeguir(0) === 50 && mi.costoSeguir(1) === 100 && mi.costoSeguir(2) === 200);
  const e = mi.nueva(5, 'dificil');
  const [mx, my] = buscar(e, (x, y) => mi.hayMina(5, 'dificil', x, y));
  const b = mi.abrir(e, mx, my), s = mi.seguir(b);
  assert(s.boom === null && s.explotadas[`${mx},${my}`] && s.seguidas === 1 && b.boom !== null, 'seguir sin mutar');
  const base = Object.keys(e.abiertas).length;
  assert(mi.puntaje(e) === base);
  assert(mi.puntaje(mi.bandera(e, mx, my)) === base + 5, 'bandera correcta');
  const [sx, sy] = buscar(e, (x, y) => !mi.hayMina(5, 'dificil', x, y));
  assert(mi.puntaje(mi.bandera(e, sx, sy)) === base, 'bandera incorrecta');
  assert(mi.puntaje(s) === base, 'explotada no suma');
});
probar('minas: semillaDelDia es estable y distingue fecha y juego', () => {
  const a = mi.semillaDelDia('2026-11-20', 'minas');
  assert(Number.isInteger(a) && a === mi.semillaDelDia('2026-11-20', 'minas'));
  assert(a !== mi.semillaDelDia('2026-11-21', 'minas') && a !== mi.semillaDelDia('2026-11-20', 'sudoku'));
});

// --- competencia.js (🏆 Competencia) ---
import * as co from './games/competencia.js';
import * as prem6 from './games/premios.js';
import * as copia6 from './games/copia.js';
import * as juegos6 from './app/juegos.js';

probar('competencia: juego del día rota cada día desde el 20-11-2026', () => {
  assert(co.juegoDelDia('2026-11-20') === 'serpiente' && co.juegoDelDia('2026-11-21') === 'saltar' && co.juegoDelDia('2026-11-24') === 'bloques');
  assert(co.juegoDelDia('2026-11-25') === 'serpiente' && co.juegoDelDia('2026-11-19') === 'bloques', 'da la vuelta (también hacia atrás)');
  assert(co.JUEGO_DIA.every((id) => juegos6.JUEGOS_ARCADE.some((j) => j.id === id)), 'todos del Arcade');
});
probar('competencia: juego de la semana cambia cada lunes desde el 16-11-2026', () => {
  assert(co.juegoDeLaSemana('2026-11-16') === 'serpiente' && co.juegoDeLaSemana('2026-11-22') === 'serpiente', 'lunes a domingo');
  assert(co.juegoDeLaSemana('2026-11-23') === 'calculo' && co.juegoDeLaSemana('2026-11-15') === 'topos', 'semana siguiente y anterior');
  assert(co.juegoDeLaSemana(co.haceDias('2026-11-16', -7 * 13)) === 'serpiente', 'vuelta de 13 semanas');
  assert(co.juegoDeLaSemana('2027-01-04') === 'series', 'cruza el año (7 semanas después)');
  assert(co.haceDias('2026-11-23', 7) === '2026-11-16' && co.haceDias('2026-01-01', 1) === '2025-12-31');
  assert(co.JUEGOS_TORNEO.every((id) => juegos6.INFO_JUEGOS[id]), 'todos existen');
});
probar('competencia: 3 intentos por día y la mejor marca', () => {
  let r = null;
  for (let i = 1; i <= 3; i++) {
    r = co.anotarIntento(r, '2026-11-20');
    assert(r.intentos === i && r.fecha === '2026-11-20', `intento ${i}`);
    r = co.anotarMarca(r, [50, 20, 80][i - 1]);
  }
  assert(r.mejor === 80 && co.quedan(r, '2026-11-20') === 0);
  assert(co.anotarIntento(r, '2026-11-20') === null, 'no hay cuarto');
  const otro = co.anotarIntento(r, '2026-11-21');
  assert(otro.intentos === 1 && otro.mejor === null && co.quedan(r, '2026-11-21') === 3, 'día nuevo');
  assert(co.anotarMarca(co.anotarIntento(null, '2026-11-20'), 0).mejor === 0, '0 es marca en el desafío');
});
probar('competencia: mejora con «menos es mejor» en puzzle y rayo', () => {
  assert(co.mejora('autos', 10, null) && co.mejora('autos', 11, 10) && !co.mejora('autos', 10, 10) && !co.mejora('autos', 9, 10));
  assert(co.mejora('puzzle', 30, null) && co.mejora('puzzle', 29, 30) && !co.mejora('puzzle', 31, 30));
  assert(co.mejora('rayo', 250, 300) && !co.mejora('rayo', 300, 250));
  assert(!co.mejora('autos', 0, null) && !co.mejora('puzzle', 0, 30), '0 no es marca en el torneo');
});
probar('competencia: premios del torneo y medallero', () => {
  assert([1, 2, 3].map((p) => co.premioTorneo(p, true)).join() === '500,300,150');
  assert(co.premioTorneo(0, true) === 25 && co.premioTorneo(0, false) === 0 && co.premioTorneo(4, true) === 25);
  let t = co.sumarMedalla(undefined, 1);
  t = co.sumarMedalla(co.sumarMedalla(co.sumarMedalla(t, 3), 1), 0);
  assert(t.oro === 2 && t.plata === 0 && t.bronce === 1);
});
probar('competencia: 30 fichas por el desafío, una vez al día; claves compe: en la copia', () => {
  const a = prem6.premio(null, 'arcadedia', '2026-11-20');
  assert(a.fichas === 30 && prem6.premio(a.registro, 'arcadedia', '2026-11-20').fichas === 0);
  assert(copia6.esClaveDelJuego('compe:dia') && copia6.esClaveDelJuego('compe:torneo') && copia6.esClaveDelJuego('compe:premio'));
});
