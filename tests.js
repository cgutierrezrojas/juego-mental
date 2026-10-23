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

// --- niveles.js ---
import {
  NUM_NIVELES, retoDe, configNivel, estrellasDe, nivelLibre, conEstrellas, totalEstrellas, desdeAntiguo, siguienteNivel,
  mundoDe, varianteDe, VARIANTES, DESCRIPCION_VARIANTE, nivelesDelDia, diarioCompleto, rachaDiaria, podarDiarios, estrellasDiarias,
} from './games/niveles.js';

const TODOS_LOS_JUEGOS = ['calculo', 'atencion', 'memoria', 'series', 'sobra', 'puzzle', 'rayo', 'topos', 'mayor', 'distinto', 'balanza', 'parejas'];

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
import { esClaveDelJuego, crearCopia, leerCopia } from './games/copia.js';

probar('copia de seguridad: solo claves del juego, ida y vuelta', () => {
  assert(esClaveDelJuego('record:calculo') && esClaveDelJuego('diarios:mayor') && !esClaveDelJuego('otra-web:x'));
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

// --- sincro.js ---
import { tieneProgreso, decidirSincro, datosRanking } from './games/sincro.js';

probar('nube: cuándo subir, bajar o preguntar', () => {
  assert(tieneProgreso({ 'record:calculo': '5' }) && !tieneProgreso({ 'ajuste:tema': 'oscuro', 'ayuda:menu': '1' }));
  const d = (o) => decidirSincro({ hayLocal: true, hayNube: true, vinculado: true, cambioLocal: 10, actualizadoNube: 10, ...o });
  assert(d({ hayNube: false }) === 'subir' && d({ hayNube: false, hayLocal: false }) === 'nada');
  assert(d({ hayLocal: false }) === 'bajar');
  assert(d({ vinculado: false }) === 'preguntar' && d({ vinculado: false, actualizadoNube: 99 }) === 'preguntar');
  assert(d({ actualizadoNube: 20 }) === 'bajar' && d({ cambioLocal: 20 }) === 'subir' && d({}) === 'nada');
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

// --- mayor.js ---
import { generarPar } from './games/mayor.js';

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
