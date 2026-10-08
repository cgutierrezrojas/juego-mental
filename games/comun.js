// Piezas que usan todos los juegos.

// Entero al azar entre 0 y n-1. `rnd` se puede cambiar en las pruebas.
export function azar(n, rnd = Math.random) {
  return Math.floor(rnd() * n);
}

// Copia barajada de la lista (Fisher-Yates).
export function barajar(lista, rnd = Math.random) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = azar(i + 1, rnd);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function el(tag, clase = '', texto = '') {
  const e = document.createElement(tag);
  e.className = clase;
  e.textContent = texto;
  return e;
}

// localStorage puede fallar (modo privado) o no existir (Node): entonces no se guarda y se lee null.
export function leer(clave) {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

export function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // sin localStorage: no se guarda
  }
}

// Destello verde (ok) o rojo (mal) sobre un elemento.
export function destello(elemento, ok) {
  elemento.classList.remove('ok', 'mal');
  void elemento.offsetWidth; // fuerza al navegador a reiniciar la animación
  elemento.classList.add(ok ? 'ok' : 'mal');
}

// Cuenta atrás. Llama a alCambiar(restantes) en cada cambio y a alFin() una sola vez al llegar a 0.
// parar() la detiene sin llamar a alFin.
export function temporizador(segundos, alCambiar, alFin) {
  let restantes = segundos;
  const id = setInterval(() => cambiar(-1), 1000);

  function cambiar(delta) {
    if (restantes <= 0) return;
    restantes = Math.max(0, restantes + delta);
    alCambiar(restantes);
    if (restantes === 0) {
      clearInterval(id);
      alFin();
    }
  }

  alCambiar(restantes);
  return {
    restar: (s) => cambiar(-s),
    // Para el reloj sin llamar a alFin (al salir a mitad de partida).
    parar: () => {
      restantes = 0;
      clearInterval(id);
    },
  };
}
