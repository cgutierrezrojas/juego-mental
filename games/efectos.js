// Respuesta al jugador: anillo, sonidos (generados con la Web Audio API, sin archivos) y vibración.
// Nada se toca al cargar el módulo, así también funciona en `node tests.js`.
import { leer, guardar } from './comun.js';

// --- Ajustes 🔊 y 📳 ('sonido' y 'vibracion'): encendidos salvo que se hayan apagado ("0") ---

export const encendido = (valor) => valor !== '0';

export function activo(ajuste) {
  return encendido(leer('ajuste:' + ajuste));
}

export function alternar(ajuste) {
  guardar('ajuste:' + ajuste, activo(ajuste) ? '0' : '1');
}

// Safari en iPhone no deja vibrar a las páginas web.
export const puedeVibrar = () => typeof navigator !== 'undefined' && 'vibrate' in navigator;

// --- Sonido ---

let audio = null; // se crea la primera vez que suena algo (siempre tras un toque del jugador)
const sonando = new Set(); // notas en curso, para poder cortarlas con callar()

// Una nota: frecuencia en Hz, duración y retraso en segundos.
function nota(frecuencia, duracion, retraso = 0, forma = 'sine') {
  if (!activo('sonido')) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const inicio = audio.currentTime + retraso;
    const oscilador = audio.createOscillator();
    const volumen = audio.createGain();
    oscilador.type = forma;
    oscilador.frequency.value = frecuencia;
    volumen.gain.setValueAtTime(0.2, inicio);
    volumen.gain.exponentialRampToValueAtTime(0.001, inicio + duracion); // se apaga suave, sin chasquido
    oscilador.connect(volumen).connect(audio.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + duracion);
    sonando.add(oscilador);
    oscilador.onended = () => sonando.delete(oscilador);
  } catch {
    // sin Web Audio: se juega en silencio
  }
}

// Corta en seco todo lo que esté sonando (al salir a mitad de partida).
export function callar() {
  for (const oscilador of sonando) {
    try {
      oscilador.stop();
    } catch {
      // ya estaba parado
    }
  }
  sonando.clear();
}

export function sonar(tipo) {
  if (tipo === 'acierto') nota(880, 0.12);
  else if (tipo === 'fallo') nota(160, 0.3, 0, 'square');
  else if (tipo === 'tic') nota(600, 0.08);
  else if (tipo === 'record') [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => nota(f, 0.2, i * 0.12));
}

// Notas de Simon, en el orden de sus colores: rojo, azul, verde, amarillo.
const NOTAS_SIMON = [329.63, 277.18, 440, 164.81];

export function tono(i, duracion = 0.4) {
  nota(NOTAS_SIMON[i], duracion, 0, 'triangle');
}

// --- Vibración ---

export function vibrar(patron) {
  if (activo('vibracion') && puedeVibrar()) navigator.vibrate(patron);
}

// --- Destello: anillo verde (ok) o rojo (mal) + sonido + vibración ---

export function destello(elemento, ok, conSonido = true) {
  elemento.classList.remove('ok', 'mal');
  void elemento.offsetWidth; // fuerza al navegador a reiniciar la animación
  elemento.classList.add(ok ? 'ok' : 'mal');
  if (conSonido) sonar(ok ? 'acierto' : 'fallo');
  vibrar(ok ? 30 : [60, 40, 60]);
}
