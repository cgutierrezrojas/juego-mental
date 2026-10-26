// Lista de juegos, categorías del entrenamiento, habilidades e iconos.
// Cada juego: { id, nombre, categoria, icono, color, habilidad, referencia, instrucciones, juego } y, si hace falta, `unidad`
// (texto tras la puntuación) y `menorEsMejor` (récord = puntuación más baja). `habilidad` es la barra del perfil a la que cuenta y `referencia` la puntuación que vale 100 en esa barra.
// `juego` es un módulo con start(pantalla, alTerminar), que devuelve una función parar(); `color` es el nombre de su variable CSS.
// `modos`: los que tiene ese juego (por defecto solo 'normal'); `sinDificultad`: no se elige Fácil/Normal/Difícil.
// `duracion`: subtítulo de la baldosa Normal en la previa (por defecto "60 s"). `color` es el de su habilidad.
// Para añadir un juego: crear el archivo en games/, importarlo aquí arriba y añadir su entrada aquí.
// Sin `categoria`, el juego no entra en el entrenamiento diario.
import * as calculo from '../games/calculo.js';
import * as atencion from '../games/atencion.js';
import * as memoria from '../games/memoria.js';
import * as series from '../games/series.js';
import * as sobra from '../games/sobra.js';
import * as puzzle from '../games/puzzle.js';
import * as rayo from '../games/rayo.js';
import * as topos from '../games/topos.js';
import * as mayor from '../games/mayor.js';
import * as menos from '../games/menos.js';
import * as distinto from '../games/distinto.js';
import * as balanza from '../games/balanza.js';
import * as parejas from '../games/parejas.js';

export const JUEGOS = [
  { id: 'calculo', nombre: 'Cálculo', categoria: 'Clásicos', icono: '➕', color: 'rojo', habilidad: 'Cálculo', referencia: 30, modos: ['normal', 'rapido', 'sinfallo', 'niveles'], instrucciones: 'Resuelve todas las operaciones que puedas en 60 segundos.', juego: calculo },
  { id: 'atencion', nombre: 'Atención', categoria: 'Clásicos', icono: '👁', color: 'azul', habilidad: 'Atención', referencia: 40, modos: ['normal', 'rapido', 'sinfallo', 'niveles'], instrucciones: 'Toca el color de la tinta, no lo que dice la palabra.', juego: atencion },
  { id: 'memoria', nombre: 'Memoria', categoria: 'Clásicos', icono: '🧠', color: 'verde', habilidad: 'Memoria', referencia: 12, modos: ['normal', 'niveles'], duracion: 'hasta fallar', instrucciones: 'Mira la secuencia de colores y repítela. Cada ronda, uno más.', juego: memoria },
  { id: 'series', nombre: 'Series', categoria: 'Lógica', icono: '🔢', color: 'amarillo', habilidad: 'Lógica', referencia: 20, modos: ['normal', 'rapido', 'sinfallo', 'niveles'], instrucciones: '¿Qué número sigue? Descubre la regla de cada serie. 60 segundos.', juego: series },
  { id: 'sobra', nombre: '¿Cuál sobra?', categoria: 'Lógica', icono: '🔍', color: 'amarillo', habilidad: 'Lógica', referencia: 20, modos: ['normal', 'rapido', 'sinfallo', 'niveles'], instrucciones: 'Tres números siguen una regla y uno no: toca el que sobra. 60 segundos.', juego: sobra },
  { id: 'puzzle', nombre: 'Puzzle', categoria: 'Lógica', icono: '🧩', color: 'amarillo', habilidad: 'Lógica', referencia: 30, unidad: 'movimientos', menorEsMejor: true, modos: ['normal', 'niveles'], duracion: 'sin tiempo', instrucciones: 'Ordena las fichas del 1 al 8 con los menos movimientos posibles.', juego: puzzle },
  { id: 'rayo', nombre: 'Rayo', categoria: 'Reacción', icono: '⚡', color: 'morado', habilidad: 'Reacción', referencia: 250, unidad: 'ms', menorEsMejor: true, sinDificultad: true, modos: ['normal', 'niveles'], duracion: '5 intentos', instrucciones: 'Cuando se ponga verde, ¡toca! 5 intentos; cuenta tu tiempo medio.', juego: rayo },
  { id: 'topos', nombre: 'Topos', categoria: 'Reacción', icono: '🔨', color: 'morado', habilidad: 'Reacción', referencia: 40, modos: ['normal', 'niveles'], duracion: '30 s', instrucciones: 'Toca cada topo antes de que se esconda. Tocar una casilla vacía resta. 30 segundos.', juego: topos },
  { id: 'mayor', nombre: '¿Cuál da más?', categoria: 'Clásicos', icono: '⬆️', color: 'rojo', habilidad: 'Cálculo', referencia: 35, modos: ['normal', 'rapido', 'sinfallo', 'niveles'], instrucciones: 'Toca la operación que da más. 60 segundos.', juego: mayor },
  { id: 'menos', nombre: '¿Cuál da menos?', categoria: 'Clásicos', icono: '⬇️', color: 'rojo', habilidad: 'Cálculo', referencia: 35, modos: ['normal', 'rapido', 'sinfallo', 'niveles'], instrucciones: 'Toca la operación que da menos. 60 segundos.', juego: menos },
  { id: 'distinto', nombre: 'El distinto', categoria: 'Clásicos', icono: '🎯', color: 'azul', habilidad: 'Atención', referencia: 25, modos: ['normal', 'rapido', 'sinfallo', 'niveles'], instrucciones: 'Toca el cuadrado de color distinto. 60 segundos.', juego: distinto },
  { id: 'balanza', nombre: 'Balanza', categoria: 'Lógica', icono: '🏋️', color: 'amarillo', habilidad: 'Lógica', referencia: 15, modos: ['normal', 'rapido', 'sinfallo', 'niveles'], instrucciones: 'Deduce cuánto pesa la fruta que se pregunta. 60 segundos.', juego: balanza },
  { id: 'parejas', nombre: 'Parejas', categoria: 'Clásicos', icono: '🃏', color: 'verde', habilidad: 'Memoria', referencia: 9, unidad: 'intentos', menorEsMejor: true, modos: ['normal', 'niveles'], duracion: 'sin tiempo', instrucciones: 'Encuentra todas las parejas de cartas con los menos intentos posibles.', juego: parejas },
];

export const CATEGORIAS = ['Clásicos', 'Lógica', 'Reacción'];
// Ids de los juegos de cada categoría, en el orden de CATEGORIAS (para el entrenamiento diario).
// Hasta el 24-10-2026 el entrenamiento elegía entre los 8 juegos originales; desde el 25, entre los 12.
// Los días pasados siguen pidiendo lo mismo, así las rachas no cambian. Para añadir juegos: otro corte igual.
export const ORIGINALES = ['calculo', 'atencion', 'memoria', 'series', 'sobra', 'puzzle', 'rayo', 'topos'];
export const porCategoria = (juegos) => CATEGORIAS.map((c) => juegos.filter((j) => j.categoria === c).map((j) => j.id));
export const CATEGORIAS_ANTES = porCategoria(JUEGOS.filter((j) => ORIGINALES.includes(j.id)));
export const CATEGORIAS_AHORA = porCategoria(JUEGOS);
export const idsPorCategoria = (fecha) => (fecha < '2026-10-25' ? CATEGORIAS_ANTES : CATEGORIAS_AHORA);

export const HABILIDADES = ['Memoria', 'Cálculo', 'Atención', 'Lógica', 'Reacción'];

// Icono de cada modo en su baldosa y carita de cada dificultad.
export const ICONO_MODO = { normal: '⏱', rapido: '⚡', sinfallo: '❤️', niveles: '🪜' };
export const CARA = { facil: '🙂', normal: '😐', dificil: '😈' };

// Menú: tarjetas agrupadas por habilidad (los grupos sin juegos no se dibujan).
export const ICONO_HABILIDAD = { Memoria: '🧠', Cálculo: '➕', Atención: '👁', Lógica: '🧩', Reacción: '⚡' };

// ⚔️ Duelos por turnos (reglas puras en games/duelos.js). Necesitan sesión en la nube y apodo.
export const INFO_JUEGOS = Object.fromEntries(JUEGOS.map((j) => [j.id, j]));
