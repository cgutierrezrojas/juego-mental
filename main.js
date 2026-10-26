// Arranque: une las piezas de app/ (eventos de los botones, menú, tema y ajustes) y registra el service worker.
import { guardar, el } from './games/comun.js';
import { alternar, puedeVibrar, callar } from './games/efectos.js';
import { siguienteNivel } from './games/niveles.js';
import { fechaLocal } from './games/estadisticas.js';
import { crearCopia, leerCopia } from './games/copia.js';
import { CONFIG } from './firebase-config.js';
import { mensajeValido } from './games/chat.js';
import { $, pintarTema, pintarAjustes, mostrarAyuda, mostrar, AYUDAS, AYUDA_DE_PANTALLA, preguntar } from './app/ui.js';
import { HABILIDADES, JUEGOS, ICONO_HABILIDAD } from './app/juegos.js';
import { abrirPrevia, pintarPrevia } from './app/previa.js';
import { apuntarLogros, leerEstrellas, datosGuardados, sustituirProgreso } from './app/datos.js';
import { pintarEntreno, pintarProgreso } from './app/menu.js';
import { jugar } from './app/partida.js';
import { E } from './app/estado.js';
import { volverAlDuelo, anotarEnDuelo, abrirDuelos, abrirNuevoDuelo } from './app/duelos.js';
import { verResultadoVivo, salirDeSala, pintarMarcadorVivo } from './app/vivo.js';
import { pintarEstadisticas } from './app/estadisticas.js';
import { abrirRanking, subir, pintarNube, alCambiarUsuario, avisarNube } from './app/cuenta.js';
import { ponerEstado, abrirAmigos } from './app/amigos.js';
import { bloquearA } from './app/chat.js';

$('btn-tema').onclick = () => {
  const tema = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
  document.documentElement.dataset.tema = tema;
  guardar('ajuste:tema', tema);
  pintarTema();
};
pintarTema();

$('btn-sonido').onclick = () => {
  alternar('sonido');
  pintarAjustes();
};
$('btn-vibracion').onclick = () => {
  alternar('vibracion');
  pintarAjustes();
};
$('btn-vibracion').hidden = !puedeVibrar();
pintarAjustes();
for (const habilidad of HABILIDADES) {
  const juegos = JUEGOS.filter((j) => j.habilidad === habilidad);
  if (!juegos.length) continue;
  const rejilla = el('div', 'rejilla menu-juegos');
  for (const j of juegos) {
    const b = el('button', 'tarjeta color');
    b.dataset.juego = j.id;
    b.style.setProperty('--c', `var(--${j.color})`);
    b.append(el('span', 'icono', j.icono), el('span', '', j.nombre), el('small', 'progreso'), el('span', 'aviso-retos'));
    b.onclick = () => abrirPrevia(j);
    rejilla.append(b);
  }
  $('lista-juegos').append(el('h3', 'categoria', `${ICONO_HABILIDAD[habilidad]} ${habilidad}`), rejilla);
}

apuntarLogros(); // lo conseguido antes de existir los logros se apunta sin celebrarlo
pintarEntreno();
pintarProgreso();
mostrarAyuda('menu');

// En Niveles, el botón grande juega siempre el siguiente nivel (aunque antes se mirara otro en su tarjeta).
$('btn-jugar').onclick = () => {
  if (E.eleccion.modo === 'niveles') {
    E.vistaHoy = false;
    E.nivelElegido = siguienteNivel(leerEstrellas(E.actual.id));
  }
  jugar();
};
$('tarjeta-jugar').onclick = () => {
  $('tarjeta-nivel').close();
  jugar();
};
// Tocar fuera de la tarjeta (en el fondo oscuro) la cierra.
$('tarjeta-nivel').onclick = (e) => {
  if (e.target === e.currentTarget) e.currentTarget.close();
};
$('btn-repetir').onclick = () => (E.enDuelo ? volverAlDuelo() : E.enVivo ? verResultadoVivo() : jugar());
// 📤 Compartir: el menú de compartir del sistema o, si no lo hay, copiar el texto.
$('btn-compartir').onclick = async () => {
  if (navigator.share) {
    try {
      await navigator.share({ text: E.textoCompartir });
    } catch {
      // se canceló
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(E.textoCompartir);
    $('btn-compartir').textContent = '✓ Copiado';
    setTimeout(() => ($('btn-compartir').textContent = '📤 Compartir'), 2000);
  } catch {
    // sin portapapeles: no se puede compartir
  }
};
// Vuelve a jugar el mismo nivel o reto que acaba de terminar (el botón grande ya apunta al siguiente).
$('btn-mejorar').onclick = () => {
  E.vistaHoy = E.jugando.diario !== null;
  if (E.vistaHoy) E.diarioElegido = E.jugando.diario;
  else E.nivelElegido = E.jugando.nivel;
  jugar();
};
for (const b of document.querySelectorAll('.btn-menu')) b.onclick = () => mostrar('menu');

// ❓: vuelve a activar todos los avisos y muestra el de la pantalla actual.
$('btn-ayuda').onclick = () => {
  for (const sitio of Object.keys(AYUDAS)) guardar('ayuda:' + sitio, '');
  const pantalla = [...document.querySelectorAll('main > section')].find((s) => !s.hidden).id;
  if (pantalla === 'previa') pintarPrevia(E.actual);
  else mostrarAyuda(AYUDA_DE_PANTALLA[pantalla]);
  document.querySelector('.ayuda')?.scrollIntoView({ block: 'center' });
};

$('btn-estadisticas').onclick = () => {
  pintarEstadisticas();
  mostrar('estadisticas');
};

// ✕: vuelve al menú sin guardar la puntuación.
$('btn-salir').onclick = async () => {
  if (E.enVivo && E.parar) {
    const salir = await preguntar({ titulo: '¿Salir del duelo en vivo?', texto: 'Si sales, pierdes el duelo.', boton: 'Salir' });
    if (!salir || !E.parar) return;
    E.nube.cambiarSala(E.enVivo.id, { [`fuera/${E.usuario.uid}`]: true }).catch(() => {});
    E.enVivo = null;
    $('marcador-vivo').hidden = true;
    salirDeSala();
  }
  if (E.enDuelo && E.parar) {
    const salir = await preguntar({ titulo: '¿Salir del duelo?', texto: 'Si sales, este juego cuenta como perdido.', boton: 'Salir' });
    if (!salir || !E.parar) return;
    anotarEnDuelo(E.actual.menorEsMejor ? 99999 : 0);
    E.enDuelo = null;
  }
  if (E.parar) E.parar();
  E.parar = null;
  callar();
  mostrar('menu');
};

$('btn-exportar').onclick = async () => {
  const nombre = `juego-mental-${fechaLocal()}.json`;
  const archivo = new File([crearCopia(datosGuardados(), fechaLocal())], nombre, { type: 'application/json' });
  // En el móvil, el menú de compartir deja guardarla en Drive, mandarla por WhatsApp…; en el ordenador, se descarga.
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: 'Copia de Juego Mental' });
      $('copia-estado').textContent = '✓ Copia lista';
    } catch {
      // se canceló el menú de compartir
    }
    return;
  }
  const enlace = el('a');
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
  $('copia-estado').textContent = `✓ Copia guardada como ${nombre}`;
};

$('btn-importar').onclick = () => $('archivo-copia').click();
$('archivo-copia').onchange = async () => {
  const archivo = $('archivo-copia').files[0];
  $('archivo-copia').value = ''; // para poder elegir el mismo archivo otra vez
  if (!archivo) return;
  try {
    const datos = leerCopia(await archivo.text());
    if (!(await preguntar({ titulo: '⬆️ Recuperar copia', texto: 'Tu progreso actual se sustituirá por el de la copia.', boton: 'Recuperar' }))) return;
    sustituirProgreso(datos);
    location.reload();
  } catch (e) {
    $('copia-estado').textContent = `✗ ${e.message}`;
  }
};

// Pide al navegador que no borre los datos por su cuenta (por falta de espacio); borrarlos a mano sigue siendo posible.
navigator.storage?.persist?.().catch(() => {});

$('btn-ranking').onclick = abrirRanking;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) subir().catch(() => {});
  ponerEstado(document.hidden ? 'ausente' : $('juego').hidden ? 'conectado' : 'jugando');
});

if (CONFIG) {
  import('./games/nube.js')
    .then((modulo) => {
      E.nube = modulo;
      pintarNube();
      return modulo.iniciar(CONFIG, alCambiarUsuario);
    })
    .catch(() => {
      E.nube = null;
      avisarNube('No se pudo conectar con la nube (¿sin conexión?). Tu progreso sigue guardado en este celular.');
    });
}
pintarNube();

$('btn-duelos').onclick = abrirDuelos;
$('btn-nuevo-duelo').onclick = () => abrirNuevoDuelo();
for (const b of document.querySelectorAll('.btn-volver-duelos')) b.onclick = abrirDuelos;

$('btn-amigos').onclick = () => abrirAmigos();

addEventListener('respuesta', (e) => {
  if (!E.enVivo || !E.salaVivo || !e.detail) return;
  E.salaVivo.misPuntos++;
  E.nube.cambiarSala(E.salaVivo.id, { [`puntos/${E.usuario.uid}`]: E.salaVivo.misPuntos }).catch(() => {});
  if (E.salaVivo.sala) pintarMarcadorVivo(E.salaVivo.sala);
});

$('chat-form').onsubmit = async (e) => {
  e.preventDefault();
  if (!E.chatAbierto) return;
  const texto = mensajeValido($('chat-texto').value);
  if (!texto) return;
  $('chat-texto').value = '';
  try {
    await E.nube.enviarMensaje(E.chatAbierto.id, E.usuario.uid, texto);
    $('chat-estado').textContent = '';
  } catch {
    $('chat-texto').value = texto;
    $('chat-estado').textContent = 'No se pudo enviar: puede que ya no seáis amigos o que no haya conexión.';
  }
};

$('chat-bloquear').onclick = async () => {
  const { amigo } = E.chatAbierto;
  const seguro = await preguntar({
    titulo: `🚫 Bloquear a ${amigo.apodo}`,
    texto: 'Dejará de ser tu amigo y no podrá escribirte, retarte en vivo ni enviarte solicitudes. Puedes desbloquearlo después en Amigos.',
    boton: 'Bloquear',
  });
  if (seguro) bloquearA(amigo);
};

$('chat-denunciar').onclick = async () => {
  const { id, amigo, mensajes } = E.chatAbierto;
  const motivo = await preguntar({
    titulo: `⚠️ Denunciar a ${amigo.apodo}`,
    texto: 'Cuéntanos qué ha pasado. Se guardará junto con los últimos mensajes de esta conversación para revisarlo.',
    boton: 'Enviar denuncia',
    campo: '',
  });
  if (motivo === null) return;
  try {
    await E.nube.denunciar({
      de: E.usuario.uid,
      contra: amigo.uid,
      chat: id,
      motivo: motivo.trim().slice(0, 500) || '(sin motivo)',
      mensajes: mensajes.slice(-20).map((m) => `${m.de === E.usuario.uid ? 'yo' : amigo.apodo}: ${m.texto}`),
    });
    $('chat-estado').textContent = '✓ Denuncia enviada. Si quieres, también puedes bloquearlo.';
  } catch {
    $('chat-estado').textContent = 'No se pudo enviar la denuncia (¿sin conexión?).';
  }
};

$('chat-volver').onclick = () => abrirAmigos();

// Funcionamiento sin conexión. Solo va en localhost o HTTPS; si falla, la app sigue igual.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
