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
import { NUM_NIVELES, configNivel, desbloqueado, nuevoProgreso } from './games/niveles.js';

probar('niveles: configuración de los niveles 1, 11 y 20', () => {
  const c = (id, n) => { const x = configNivel(id, n); return `${x.meta}/${x.segundos}/${x.aciertosIniciales}/${x.dificultad}`; };
  assert(c('calculo', 1) === '6/30/0/normal' && c('calculo', 11) === '11/30/10/normal' && c('calculo', 20) === '16/30/19/normal');
  for (const id of ['series', 'sobra']) {
    assert(c(id, 1) === '6/60/0/normal' && c(id, 11) === '11/60/10/normal' && c(id, 20) === '16/60/19/normal', `${id}: ${c(id, 1)} ${c(id, 11)} ${c(id, 20)}`);
  }
  assert(configNivel('series', 4).texto === '8 aciertos en 60 s');
  assert(c('atencion', 1) === '7/30/0/normal' && c('atencion', 10) === '16/30/0/normal' && c('atencion', 11) === '17/30/0/dificil' && c('atencion', 20) === '26/30/0/dificil');
  assert(configNivel('memoria', 1).meta === 3 && configNivel('memoria', 11).meta === 9 && configNivel('memoria', 20).meta === 14);
  assert(configNivel('memoria', 10).dificultad === 'normal' && configNivel('memoria', 11).dificultad === 'dificil');
  assert(c('topos', 1) === '11/30/0/facil' && c('topos', 6) === '16/30/0/facil' && c('topos', 7) === '17/30/0/normal' && c('topos', 14) === '24/30/0/dificil' && c('topos', 20) === '30/30/0/dificil');
  assert(configNivel('calculo', 4).texto === '8 aciertos en 30 s' && configNivel('memoria', 4).texto === 'secuencia de 5 colores' && configNivel('topos', 4).texto === '14 puntos en 30 s');
  assert(configNivel('rayo', 1) === null && configNivel('puzzle', 1) === null);
});

probar('niveles: las metas nunca bajan de un nivel al siguiente', () => {
  for (const id of ['calculo', 'atencion', 'series', 'sobra', 'memoria', 'topos']) {
    for (let n = 2; n <= NUM_NIVELES; n++) assert(configNivel(id, n).meta >= configNivel(id, n - 1).meta, `${id} nivel ${n}`);
  }
});

probar('niveles: desbloqueo y progreso', () => {
  assert(desbloqueado(0, 1) && !desbloqueado(0, 2), 'sin superar nada solo está el 1');
  assert(desbloqueado(3, 1) && desbloqueado(3, 4) && !desbloqueado(3, 5));
  assert(nuevoProgreso(3, 4, true) === 4, 'superar el siguiente sube');
  assert(nuevoProgreso(3, 2, true) === 3, 'superar uno más bajo no cambia');
  assert(nuevoProgreso(3, 4, false) === 3, 'no superado no cambia');
});
