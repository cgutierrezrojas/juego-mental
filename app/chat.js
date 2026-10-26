// 💬 Mensajes entre amigos, bloquear y denunciar.
import { idChat, hayNoLeidos } from '../games/chat.js';
import { el } from '../games/comun.js';
import { amigosDe } from '../games/amigos.js';
import { E } from './estado.js';
import { mostrar, $ } from './ui.js';
import { abrirAmigos } from './amigos.js';

// 💬 Mensajes entre amigos (lógica pura en games/chat.js), con bloquear y denunciar.

export function pararChat() {
  E.chatAbierto?.parar();
  E.chatAbierto = null;
}

export function abrirChat(amigo) {
  pararChat();
  const id = idChat(E.usuario.uid, amigo.uid);
  E.chatAbierto = { id, amigo, mensajes: [], parar: () => {} };
  mostrar('chat');
  $('chat-titulo').textContent = `💬 ${amigo.apodo}`;
  $('chat-mensajes').replaceChildren();
  $('chat-estado').textContent = '';
  $('chat-texto').value = '';
  E.chatAbierto.parar = E.nube.escucharChat(id, (m) => {
    if (E.chatAbierto?.id !== id) return;
    E.chatAbierto.mensajes.push(m);
    const burbuja = el('p', m.de === E.usuario.uid ? 'burbuja mia' : 'burbuja', m.texto);
    const hora = m.cuando ? new Date(m.cuando).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    burbuja.append(el('small', '', hora));
    $('chat-mensajes').append(burbuja);
    burbuja.scrollIntoView({ block: 'end' });
    E.nube.marcarLeido(E.usuario.uid, id);
  }, () => ($('chat-estado').textContent = 'No se pudieron cargar los mensajes (¿sin conexión?).'));
  E.nube.marcarLeido(E.usuario.uid, id);
  $('chat-texto').focus();
}

// Bloquear: se guarda el bloqueo, se deshace la amistad y deja de poder ver mi estado.
export async function bloquearA(amigo) {
  try {
    await E.nube.bloquear(E.usuario.uid, amigo.uid, amigo.apodo);
    const { amigos, recibidas, enviadas } = amigosDe(await E.nube.misSolicitudes(E.usuario.uid), E.usuario.uid);
    for (const s of [...amigos, ...recibidas, ...enviadas].filter((x) => x.uid === amigo.uid)) await E.nube.borrarSolicitud(s.id).catch(() => {});
    pararChat();
    abrirAmigos(`🚫 Has bloqueado a ${amigo.apodo}.`);
  } catch {
    $('chat-estado').textContent = 'No se pudo bloquear (¿sin conexión?).';
  }
}

// Marca con • el botón 💬 de los amigos con mensajes sin leer.
export async function marcarNoLeidos(amigo, boton) {
  try {
    const id = idChat(E.usuario.uid, amigo.uid);
    const [ultimo, leido] = await Promise.all([E.nube.ultimoMensaje(id), E.nube.leidoHasta(E.usuario.uid, id)]);
    if (hayNoLeidos(ultimo, leido, E.usuario.uid)) {
      boton.classList.add('con-nuevos');
      boton.setAttribute('aria-label', `Mensajes con ${amigo.apodo} (hay mensajes nuevos)`);
    }
  } catch {
    // sin permiso o sin conexión: sin marca
  }
}
