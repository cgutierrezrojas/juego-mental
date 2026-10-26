// 👥 Amigos y estados.
import { leer, el, guardar } from '../games/comun.js';
import { codigoAmigo, amigosDe, normalizarCodigo } from '../games/amigos.js';
import { perfil } from '../games/estadisticas.js';
import { E } from './estado.js';
import { asegurarDuelista, abrirNuevoDuelo } from './duelos.js';
import { mostrar, $, compartirTexto, preguntar } from './ui.js';
import { abrirChat, marcarNoLeidos } from './chat.js';
import { abrirRetoVivo } from './vivo.js';

// 👥 Amigos y estados (lógica pura en games/amigos.js). Necesitan sesión y apodo, como los duelos.
export const NOMBRE_ESTADO = { conectado: '🟢 Conectado', jugando: '🎮 Jugando', ausente: '🌙 Ausente', desconectado: '⚫ Desconectado' };

export function ponerEstado(estado) {
  E.estadoApp = estado;
  if (E.nube && E.usuario) E.nube.ponerEstado(leer('ajuste:invisible') === '1' ? 'desconectado' : estado);
}

export function dejarDeEscuchar() {
  E.escuchas.forEach((dejar) => dejar());
  E.escuchas = [];
}

// Perfil público (apodo y código de amigo): se guarda al entrar y al cambiar el apodo.
export async function actualizarPerfil() {
  const apodo = leer('nube:apodo');
  if (E.nube && E.usuario && apodo) await E.nube.guardarPerfil(E.usuario.uid, apodo, codigoAmigo(E.usuario.uid)).catch(() => {});
}

// Amigos y solicitudes; de paso, actualiza quién puede ver mi estado.
export async function cargarAmigos() {
  const datos = amigosDe(await E.nube.misSolicitudes(E.usuario.uid), E.usuario.uid);
  E.nube.guardarAmigosEstados(E.usuario.uid, datos.amigos.map((a) => a.uid));
  return datos;
}

export async function abrirAmigos(aviso = '') {
  if (!(await asegurarDuelista())) return;
  mostrar('amigos');
  pintarAmigos(aviso);
}

export async function pintarAmigos(aviso = '') {
  dejarDeEscuchar();
  const caja = $('amigos-contenido');
  caja.replaceChildren(el('p', 'sin-datos', 'Cargando…'));
  try {
    const { amigos, recibidas: todasRecibidas, enviadas } = await cargarAmigos();
    const bloqueos = await E.nube.bloqueados(E.usuario.uid).catch(() => ({}));
    const recibidas = todasRecibidas.filter((r) => !bloqueos[r.uid]); // un bloqueado no puede pedirte amistad
    const boton = (texto, alPulsar, clase = '') => {
      const b = el('button', clase, texto);
      b.onclick = alPulsar;
      return b;
    };
    const fila = (...hijos) => {
      const f = el('div', 'fila-amigo');
      f.append(...hijos);
      return f;
    };
    const partes = aviso ? [el('p', 'aviso-duelo', aviso)] : [];

    const codigo = codigoAmigo(E.usuario.uid);
    const tuyo = el('div', 'tu-codigo');
    tuyo.append(el('span', '', 'Tu código de amigo'), el('strong', '', codigo));
    const estadoCopia = el('p', 'estado-duelo', '');
    partes.push(
      tuyo,
      boton('📤 Compartir mi código', () => compartirTexto(
        `👥 Agrégame en Juego Mental con mi código ${codigo}: https://cgutierrezrojas.github.io/juego-mental/`,
        () => (estadoCopia.textContent = '✓ Código copiado'),
      )),
      boton('➕ Agregar por código', agregarPorCodigo),
      estadoCopia,
    );

    if (E.nube.hayEstados()) {
      const invisible = leer('ajuste:invisible') === '1';
      const modos = el('div', 'opciones-duelo');
      modos.setAttribute('role', 'group');
      modos.setAttribute('aria-label', 'Tu estado');
      for (const [valor, texto] of [['0', '🟢 Automático'], ['1', '👻 Invisible']]) {
        const b = boton(texto, () => {
          guardar('ajuste:invisible', valor);
          ponerEstado(E.estadoApp);
          pintarAmigos();
        });
        b.setAttribute('aria-pressed', (valor === '1') === invisible);
        modos.append(b);
      }
      partes.push(el('h3', 'categoria', 'Tu estado'), modos, el('p', 'sin-datos', invisible ? 'Tus amigos te ven desconectado.' : 'Tus amigos ven si estás conectado, jugando o ausente.'));
    }

    if (recibidas.length) {
      partes.push(el('h3', 'categoria', '📨 Quieren ser tus amigos'));
      for (const r of recibidas) {
        partes.push(fila(
          el('span', 'nombre-amigo', r.apodo),
          boton('Aceptar', async () => {
            await E.nube.aceptarSolicitud(r.id).catch(() => {});
            pintarAmigos(`✓ ${r.apodo} ya es tu amigo.`);
          }, 'color'),
          boton('Rechazar', async () => {
            await E.nube.borrarSolicitud(r.id).catch(() => {});
            pintarAmigos();
          }),
        ));
      }
    }
    if (enviadas.length) {
      partes.push(el('h3', 'categoria', '⏳ Esperando respuesta'));
      for (const e of enviadas) {
        partes.push(fila(el('span', 'nombre-amigo', e.apodo), boton('Cancelar', async () => {
          await E.nube.borrarSolicitud(e.id).catch(() => {});
          pintarAmigos();
        })));
      }
    }

    partes.push(el('h3', 'categoria', `👥 Tus amigos (${amigos.length})`));
    if (!amigos.length) partes.push(el('p', 'sin-datos', 'Aún no tienes amigos. Comparte tu código o agrega a alguien desde el ranking o un duelo.'));
    for (const a of amigos) {
      const estado = el('span', 'estado-amigo', E.nube.hayEstados() ? '⚫' : '');
      estado.setAttribute('role', 'img');
      estado.setAttribute('aria-label', NOMBRE_ESTADO.desconectado);
      if (E.nube.hayEstados()) {
        E.escuchas.push(E.nube.verEstado(a.uid, (e) => {
          estado.textContent = NOMBRE_ESTADO[e].split(' ')[0];
          vivo.disabled = e !== 'conectado';
          estado.setAttribute('aria-label', NOMBRE_ESTADO[e]);
          estado.title = NOMBRE_ESTADO[e];
        }));
      }
      const mensajes = boton('💬', () => abrirChat(a));
      mensajes.setAttribute('aria-label', `Mensajes con ${a.apodo}`);
      mensajes.hidden = !E.nube.hayEstados();
      if (E.nube.hayEstados()) marcarNoLeidos(a, mensajes);
      const vivo = boton('⚡', () => abrirRetoVivo(a));
      vivo.setAttribute('aria-label', `Retar en vivo a ${a.apodo} (tiene que estar conectado)`);
      vivo.disabled = true;
      vivo.hidden = !E.nube.hayEstados();
      const retar = boton('⚔️', () => abrirNuevoDuelo({ uid: a.uid, apodo: a.apodo }));
      retar.setAttribute('aria-label', `Desafiar a ${a.apodo}`);
      const quitar = boton('✕', async () => {
        const seguro = await preguntar({ titulo: 'Quitar amigo', texto: `${a.apodo} dejará de estar en tu lista de amigos.`, boton: 'Quitar' });
        if (!seguro) return;
        await E.nube.borrarSolicitud(a.id).catch(() => {});
        pintarAmigos();
      });
      quitar.setAttribute('aria-label', `Quitar a ${a.apodo}`);
      partes.push(fila(estado, el('span', 'nombre-amigo', a.apodo), mensajes, vivo, retar, quitar));
    }
    const listaBloqueos = Object.entries(bloqueos);
    if (listaBloqueos.length) {
      partes.push(el('h3', 'categoria', '🚫 Bloqueados'));
      for (const [uid, apodo] of listaBloqueos) {
        partes.push(fila(el('span', 'nombre-amigo', `${apodo}`), boton('Desbloquear', async () => {
          await E.nube.desbloquear(E.usuario.uid, uid).catch(() => {});
          pintarAmigos(`${apodo} ya no está bloqueado (para volver a ser amigos, agrégalo de nuevo).`);
        })));
      }
    }
    caja.replaceChildren(...partes);
  } catch {
    caja.replaceChildren(el('p', 'sin-datos', 'No se pudieron cargar tus amigos (¿sin conexión?).'));
  }
}

export async function agregarPorCodigo() {
  const texto = await preguntar({ titulo: '➕ Agregar por código', texto: 'Escribe el código de amigo de la otra persona (por ejemplo K7Q-29F).', boton: 'Buscar', campo: '' });
  if (texto === null) return;
  const codigo = normalizarCodigo(texto);
  if (!codigo) return pintarAmigos('Ese código no parece válido: son 6 letras o números, como K7Q-29F.');
  if (codigo === codigoAmigo(E.usuario.uid)) return pintarAmigos('Ese es tu propio código 🙂');
  try {
    const perfil = await E.nube.buscarPorCodigo(codigo);
    if (!perfil) return pintarAmigos(`No hay nadie con el código ${codigo}.`);
    agregarAmigo(perfil.id, perfil.apodo);
  } catch {
    pintarAmigos('No se pudo buscar (¿sin conexión?).');
  }
}

// Envía una solicitud de amistad (o acepta la que esa persona ya me había enviado) y abre la pantalla de amigos.
export async function agregarAmigo(uid, apodo) {
  if (!(await asegurarDuelista())) return;
  try {
    const { amigos, recibidas, enviadas } = await cargarAmigos();
    let aviso;
    const suya = recibidas.find((r) => r.uid === uid);
    const bloqueos = await E.nube.bloqueados(E.usuario.uid).catch(() => ({}));
    if (bloqueos[uid]) aviso = `Tienes bloqueado a ${apodo}: desbloquéalo antes en la lista de bloqueados.`;
    else if (amigos.some((a) => a.uid === uid)) aviso = `${apodo} ya es tu amigo.`;
    else if (enviadas.some((e) => e.uid === uid)) aviso = `Ya le enviaste una solicitud a ${apodo}.`;
    else if (suya) {
      await E.nube.aceptarSolicitud(suya.id);
      aviso = `✓ ${apodo} ya es tu amigo.`;
    } else {
      await E.nube.enviarSolicitud(E.usuario.uid, uid, leer('nube:apodo'), apodo);
      aviso = `📨 Solicitud enviada a ${apodo}.`;
    }
    abrirAmigos(aviso);
  } catch {
    abrirAmigos('No se pudo enviar la solicitud (¿sin conexión?).');
  }
}
