// ☁️ Nube: sesión, sincronización, apodo y ranking.
import { filaLiga, semanaActual, comprobarPodio, pintarRankingLiga, soyAdmin, botonesModeracion } from './liga.js';
import { CONFIG } from '../firebase-config.js';
import { el, leer, guardar } from '../games/comun.js';
import { tieneProgreso, decidirSincro, datosRanking } from '../games/sincro.js';
import { $, preguntar, mostrar } from './ui.js';
import { E } from './estado.js';
import { pintarSugerencia } from './menu.js';
import { ponerEstado, actualizarPerfil, agregarAmigo } from './amigos.js';
import { apodoOfensivo } from '../games/amigos.js';
import { hayAnuncios, privacidadAnuncios } from './anuncios.js';
import { recibirInvitacion } from './vivo.js';
import { pintarAvisoDuelos, abrirDuelo, abrirNuevoDuelo } from './duelos.js';
import { datosDelJuego, sustituirProgreso, conUnidad } from './datos.js';
import { JUEGOS, JUEGOS_ARCADE, JUEGOS_PALABRAS, GRAN_ESCALERA } from './juegos.js';

// Los juegos con récord en el ranking.
const CON_RANKING = [...JUEGOS, ...JUEGOS_ARCADE, ...JUEGOS_PALABRAS, GRAN_ESCALERA].filter((j) => !j.sinRanking);

// ☁️ Nube (Firebase): sesión con Google, progreso sincronizado y ranking. Sin CONFIG, no aparece nada de esto.

const hasta = (ms) => new Promise((r) => setTimeout(r, ms));

const errorInvitado =(e) => e.code === 'auth/admin-restricted-operation' || e.code === 'auth/operation-not-allowed'
  ? 'El modo invitado aún no está activado en Firebase.'
  : 'No se pudo entrar como invitado (¿sin conexión?).';

// Tras entrar: espera a que alCambiarUsuario apunte al usuario (si Firebase abrió sesión).
async function conSesion() {
  if (!E.nube.usuarioActual()) return false;
  for (let i = 0; i < 50 && !E.usuario; i++) await new Promise((r) => setTimeout(r, 100));
  return Boolean(E.usuario);
}

// Ventana de cuenta: título, texto y acciones [texto, función, mensaje de error]. Resuelve true si alguna dejó sesión.
function ventanaCuenta(titulo, texto, acciones, cerrarTexto = 'Ahora no') {
  const dialogo = $('dialogo-cuenta');
  const h3 = el('h3', '', titulo);
  h3.id = 'cuenta-titulo';
  const estado = el('p', 'estado-nube', '');
  const botones = acciones.map(([etiqueta, accion, error], i) => {
    const b = el('button', i === 0 ? 'grande color' : '', etiqueta);
    if (i === 0) b.style.setProperty('--c', 'var(--azul)');
    b.onclick = async () => {
      estado.textContent = '';
      try {
        await accion();
        if (await conSesion()) dialogo.close('si');
      } catch (e) {
        estado.textContent = error(e);
      }
    };
    return b;
  });
  const cerrar = el('button', '', cerrarTexto);
  cerrar.onclick = () => dialogo.close();
  dialogo.firstElementChild.replaceChildren(h3, el('p', '', texto), ...botones, cerrar, estado);
  dialogo.returnValue = '';
  dialogo.showModal();
  return new Promise((listo) => dialogo.addEventListener('close', () => listo(dialogo.returnValue === 'si'), { once: true }));
}

// Antes de algo que necesita la nube: avisa si no hay internet o la nube no está, y pide entrar si no hay sesión.
// true si hay sesión (de antes o abierta desde la ventana).
export function pedirCuenta(accion) {
  if (!navigator.onLine) return ventanaCuenta('📶 Sin conexión', `Conéctate a internet para ${accion}. Los juegos de un jugador funcionan sin conexión.`, [], 'Entendido');
  if (E.nubeFallo) return ventanaCuenta('📶 Ya hay conexión', 'Toca Conectar para cargar tus amigos, duelos y ranking. Tu progreso está guardado.', [['Conectar', () => location.reload(), () => '']]);
  if (!E.nube || !E.sesionLista) return ventanaCuenta('☁️ Conectando…', 'Conectando con la nube. Inténtalo en unos segundos.', [], 'Entendido');
  if (E.usuario) return Promise.resolve(true);
  return ventanaCuenta(`Entra para ${accion}`, 'Con una cuenta guardas tu progreso en la nube, juegas con amigos y apareces en el ranking.', [
    ['Entrar con Google (recomendado)', () => E.nube.entrar(), () => 'No se pudo entrar. Inténtalo de nuevo.'],
    ['Seguir como invitado', () => E.nube.entrarInvitado(), errorInvitado],
  ]);
}

// Bloque "☁️ Nube" de 📊: entrar, o la cuenta con su estado, el apodo del ranking y las opciones.
export function pintarNube() {
  const caja = $('nube');
  caja.hidden = !CONFIG;
  if (!CONFIG) return;
  const boton = (texto, alPulsar) => {
    const b = el('button', '', texto);
    b.onclick = alPulsar;
    return b;
  };
  const privacidad = el('a', '', 'Privacidad, normas y créditos');
  privacidad.href = 'privacidad.html';
  const partes = [el('h3', 'categoria', '☁️ Nube')];
  if (!E.nube) {
    partes.push(el('p', 'sin-datos', E.estadoNube || 'Conectando con la nube…'));
    if (E.nubeFallo && navigator.onLine) partes.push(boton('Conectar', () => location.reload()));
  } else if (!E.usuario) {
    partes.push(
      el('p', 'sin-datos', 'Entra con tu cuenta de Google para guardar tu progreso en la nube y competir en el ranking. O sigue como invitado (con un apodo) desde este celular.'),
      boton('Entrar con Google (recomendado)', () => E.nube.entrar().catch(() => avisarNube('No se pudo entrar. Inténtalo de nuevo.'))),
      boton('Seguir como invitado', () => E.nube.entrarInvitado().catch((e) => avisarNube(errorInvitado(e)))),
    );
    if (E.estadoNube) partes.push(el('p', 'estado-nube', E.estadoNube));
  } else {
    const apodo = leer('nube:apodo');
    if (E.usuario.isAnonymous) {
      partes.push(
        el('p', '', '👤 Jugando como invitado'),
        el('p', 'aviso-invitado', 'Tu progreso solo está ligado a este celular: si borras los datos o cambias de celular, lo perderás. Vincula tu cuenta de Google para guardarlo siempre.'),
        boton('Vincular con Google', vincular),
      );
    } else {
      partes.push(el('p', '', `Conectado como ${E.usuario.email}`));
    }
    partes.push(
      el('p', 'estado-nube', E.estadoNube),
      boton('🏆 Ver el ranking', abrirRanking),
      boton(apodo ? `✏️ Apodo en el ranking: ${apodo}` : '✏️ Aparecer en el ranking', () => pedirApodo(false)),
    );
    // Un invitado que sale pierde su cuenta: solo pueden salir las cuentas de Google.
    if (!E.usuario.isAnonymous) {
      partes.push(boton('Salir', async () => {
        await Promise.race([E.nube.pararEstados(), hasta(3000)]); // sin red, Firestore no responde: se sale igual
        E.nube.salir();
      }));
    }
    partes.push(boton('🗑️ Borrar mi cuenta', borrarNube));
  }
  if (hayAnuncios()) partes.push(boton('🔒 Privacidad de los anuncios', () => privacidadAnuncios().catch(() => avisarNube('En tu región no hay opciones de privacidad de anuncios que cambiar.'))));
  partes.push(privacidad);
  caja.replaceChildren(...partes);
}

export function avisarNube(texto) {
  E.estadoNube = texto;
  pintarNube();
}

let dejarInvitaciones = null; // para no escuchar dos veces al salir y volver a entrar

export async function alCambiarUsuario(u) {
  dejarInvitaciones?.();
  dejarInvitaciones = null;
  E.usuario = u;
  E.sesionLista = true;
  if (u) E.estadoNube = ''; // al salir se mantiene el aviso (p. ej. «cuenta borrada»)
  pintarSugerencia();
  pintarNube();
  if (u) {
    E.nube.iniciarEstados(u.uid);
    ponerEstado(E.estadoApp);
    if (E.nube.hayEstados()) dejarInvitaciones = E.nube.escucharInvitaciones(u.uid, recibirInvitacion);
    // Sin red a medias, Firestore puede no responder nunca: no se deja colgado lo que espera la sincronización.
    E.sincro = Promise.race([sincronizar(), hasta(8000)]);
    await E.sincro;
    comprobarPodio();
    actualizarPerfil();
  }
  pintarAvisoDuelos(true);
  if (E.dueloEnlace) {
    if (u) {
      const id = E.dueloEnlace;
      E.dueloEnlace = null;
      history.replaceState(null, '', location.pathname);
      abrirDuelo(id);
    } else {
      pedirCuenta('jugar este duelo'); // al entrar, alCambiarUsuario abre el duelo
    }
  }
}

// Al tener sesión: decide si subir, bajar o preguntar (ver decidirSincro).
export async function sincronizar() {
  try {
    avisarNube('Sincronizando…');
    // El apodo no va con el progreso: en un celular nuevo se recupera del perfil para no volver a pedirlo.
    if (!leer('nube:apodo')) {
      const apodo = await E.nube.leerApodo(E.usuario.uid).catch(() => '');
      if (apodo) {
        guardar('nube:apodo', apodo);
        guardar('nube:preguntado', '1');
      }
    }
    const local = datosDelJuego();
    if (tieneProgreso(local) && !leer('nube:cambio')) guardar('nube:cambio', Date.now()); // progreso de antes de la nube
    const enNube = await E.nube.leerProgreso(E.usuario.uid);
    const decision = decidirSincro({
      hayLocal: tieneProgreso(local),
      hayNube: tieneProgreso(enNube?.datos ?? {}),
      vinculado: leer('nube:uid') === E.usuario.uid,
      cambioLocal: Number(leer('nube:cambio')) || 0,
      actualizadoNube: enNube?.actualizado ?? 0,
      subido: Number(leer('nube:subido')) || 0,
    });
    if (decision === 'preguntar') return preguntarSincro(enNube);
    if (decision === 'bajar') return bajar(enNube);
    guardar('nube:uid', E.usuario.uid);
    await subir();
    await pedirApodo(true);
  } catch {
    avisarNube('Sin conexión con la nube: se sincronizará más tarde.');
  }
}

// Este celular y la nube tienen progreso distinto (aún sin vincular, o ambos cambiaron): que elija la persona.
// Termina al elegir el de este celular (tras el apodo) o al cerrar sin elegir; con el de la nube, la app se recarga.
// Si cierra sin elegir, no se sincroniza nada hasta volver a abrir la app.
export function preguntarSincro(enNube) {
  avisarNube('Elige qué progreso conservar.');
  const dialogo = $('dialogo-nube');
  return new Promise((listo) => {
    let eligio = false;
    $('usar-nube').onclick = () => {
      eligio = true;
      dialogo.close();
      bajar(enNube);
    };
    $('usar-local').onclick = async () => {
      eligio = true;
      dialogo.close();
      guardar('nube:uid', E.usuario.uid);
      guardar('nube:subido', enNube.actualizado); // la nube ya se vio: subir() no vuelve a preguntar
      guardar('nube:cambio', Date.now()); // el de este celular pasa a ser el más reciente
      await subir().catch(() => avisarNube('Sin conexión con la nube: se sincronizará más tarde.'));
      await pedirApodo(true);
      listo();
    };
    dialogo.addEventListener('close', () => {
      if (eligio) return;
      E.sinSincro = true;
      avisarNube('Sin sincronizar: elige qué progreso conservar al volver a abrir la app.');
      listo();
    }, { once: true });
    dialogo.showModal();
  });
}

// Trae el progreso de la nube a este celular y recarga la app con él.
export function bajar(enNube) {
  sustituirProgreso(enNube.datos);
  guardar('nube:cambio', enNube.actualizado);
  guardar('nube:subido', enNube.actualizado);
  guardar('nube:uid', E.usuario.uid);
  location.reload();
}

// Sube el progreso (y la fila del ranking, si hay apodo) si ha cambiado desde la última vez.
export async function subir() {
  if (!E.nube || !E.usuario || E.sinSincro || leer('nube:uid') !== E.usuario.uid) return;
  const cambio = Number(leer('nube:cambio')) || 0;
  const subido = Number(leer('nube:subido')) || 0;
  if (cambio > subido) {
    // Si otro celular subió después de lo último que vio este, no se pisa: se pregunta cuál conservar.
    const enNube = await E.nube.leerProgreso(E.usuario.uid);
    if (enNube && (enNube.actualizado ?? 0) !== subido && tieneProgreso(enNube.datos ?? {})) {
      if (!$('dialogo-nube').open) preguntarSincro(enNube);
      return;
    }
    const datos = datosDelJuego();
    await E.nube.guardarProgreso(E.usuario.uid, datos, cambio);
    const apodo = leer('nube:apodo');
    if (apodo) {
      // Si alguien fue expulsado del ranking, las reglas rechazan su fila: el progreso igual queda subido.
      await Promise.all([
        E.nube.guardarRanking(E.usuario.uid, { apodo, ...datosRanking(datos), actualizado: cambio }),
        E.nube.guardarLiga(semanaActual(), E.usuario.uid, filaLiga(apodo, cambio)),
      ]).catch(() => {});
    }
    guardar('nube:subido', cambio);
  }
  avisarNube(`✓ Sincronizado (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
}

// Apodo del ranking (2–20 caracteres; vacío = no aparecer). `primeraVez`: solo se pregunta una vez por celular.
export async function pedirApodo(primeraVez, aviso = '', propuesta = leer('nube:apodo')) {
  if (primeraVez && leer('nube:preguntado')) return;
  guardar('nube:preguntado', '1');
  const texto = await preguntar({
    titulo: '🏆 Tu apodo en el ranking',
    texto: aviso || 'De 2 a 20 caracteres. Nunca se muestran tu nombre ni tu correo. Déjalo vacío para no aparecer. Al guardarlo aceptas las normas de uso (están en «Privacidad, normas y créditos»): nada de insultos, acoso ni trampas.',
    boton: 'Guardar',
    campo: propuesta || (E.usuario.isAnonymous ? `Invitado-${10000 + Math.floor(Math.random() * 90000)}` : ''),
  });
  if (texto === null) return; // cancelado: no cambia nada
  const apodo = texto.trim().slice(0, 20);
  if (apodoOfensivo(apodo)) return pedirApodo(false, '🚫 Ese apodo no está permitido: elige otro, sin insultos ni groserías.', apodo);
  try {
    if (apodo.length >= 2) {
      guardar('nube:apodo', apodo);
      await E.nube.guardarRanking(E.usuario.uid, { apodo, ...datosRanking(datosDelJuego()), actualizado: Date.now() });
      await E.nube.guardarLiga(semanaActual(), E.usuario.uid, filaLiga(apodo, Date.now()));
      await actualizarPerfil();
    } else {
      guardar('nube:apodo', '');
      await E.nube.quitarRanking(E.usuario.uid);
    }
    pintarNube();
  } catch {
    avisarNube('No se pudo guardar el apodo (¿sin conexión?).');
  }
}

// Invitado → cuenta de Google, sin perder el progreso ni el puesto en el ranking.
export async function vincular() {
  try {
    const resultado = await E.nube.vincularGoogle();
    if (resultado === 'vinculada') {
      E.usuario = E.nube.usuarioActual();
      pintarSugerencia();
      avisarNube('✓ Cuenta de Google vinculada: tu progreso ya está a salvo.');
    }
    // 'otra': esa cuenta de Google ya existía; al entrar con ella se sincroniza (y pregunta si hace falta).
  } catch {
    avisarNube('No se pudo vincular. Inténtalo de nuevo.');
  }
}

export async function borrarNube() {
  const seguro = await preguntar({
    titulo: 'Borrar mi cuenta',
    texto: 'Se borrarán tu cuenta y todo lo tuyo en la nube: progreso, ranking, ligas, amigos, mensajes y duelos. No se puede deshacer. El progreso guardado en este celular se queda.',
    boton: 'Borrar',
  });
  if (!seguro) return;
  try {
    await E.nube.borrarCuenta();
    for (const clave of ['nube:uid', 'nube:subido', 'nube:apodo', 'nube:preguntado']) guardar(clave, '');
    avisarNube('✓ Tu cuenta y tus datos de la nube se han borrado.');
  } catch {
    avisarNube('No se pudo borrar todo (¿sin conexión?). Inténtalo de nuevo.');
  }
}

// 🏆 Ranking: "⭐ General" (total de estrellas) o el récord Normal·Normal de un juego; top 20 y tu puesto.
export function abrirRanking(tipo) {
  if (!$('ranking-tipo').options.length) {
    $('ranking-tipo').append(
      new Option('⭐ General (estrellas)', ''),
      new Option('🏅 Liga semanal', 'liga'),
      new Option('🏅 Liga de amigos', 'liga-amigos'),
      ...CON_RANKING.map((j) => new Option(`${j.icono} ${j.nombre}`, j.id)),
    );
    $('ranking-tipo').onchange = pintarRanking;
  }
  if (typeof tipo === 'string') $('ranking-tipo').value = tipo;
  mostrar('ranking');
  pintarRanking();
}

export async function pintarRanking() {
  const tipo = $('ranking-tipo').value;
  if (tipo === 'liga' || tipo === 'liga-amigos') {
    $('ranking-lista').replaceChildren(el('li', 'sin-datos', 'Cargando…'));
    $('ranking-tu').textContent = '';
    return pintarRankingLiga(tipo === 'liga-amigos').catch(() => $('ranking-lista').replaceChildren(el('li', 'sin-datos', 'No se pudo cargar la liga (¿sin conexión?).')));
  }
  const j = CON_RANKING.find((x) => x.id === tipo);
  const campo = j ? `records.${j.id}` : 'estrellas';
  const menor = Boolean(j?.menorEsMejor);
  const valorDe = (fila) => (j ? fila.records?.[j.id] : fila.estrellas);
  const conSufijo = (v) => (j ? conUnidad(j, v) : `${v} ⭐`);
  $('ranking-lista').replaceChildren(el('li', 'sin-datos', 'Cargando…'));
  $('ranking-tu').textContent = '';
  try {
    const [filas, esAdmin] = await Promise.all([E.nube.top(campo, menor), soyAdmin()]);
    $('ranking-lista').replaceChildren(
      ...(filas.length
        ? filas.map((f) => {
            const li = el('li', f.uid === E.usuario.uid ? 'propia' : '');
            li.append(el('span', '', f.apodo), el('span', 'valor', conSufijo(valorDe(f))));
            if (f.uid !== E.usuario.uid) {
              const retar = el('button', 'retar', '⚔️');
              retar.setAttribute('aria-label', `Desafiar a ${f.apodo}`);
              retar.onclick = () => abrirNuevoDuelo({ uid: f.uid, apodo: f.apodo });
              const amigo = el('button', 'retar', '👥');
              amigo.setAttribute('aria-label', `Agregar a ${f.apodo} como amigo`);
              amigo.onclick = () => agregarAmigo(f.uid, f.apodo);
              const acciones = el('span', 'acciones');
              acciones.append(retar, amigo, ...botonesModeracion(f, esAdmin, pintarRanking));
              li.append(acciones);
            }
            return li;
          })
        : [el('li', 'sin-datos', 'Aún no hay nadie aquí. ¡Sé el primero!')]),
    );
    const mio = valorDe(datosRanking(datosDelJuego()));
    if (!leer('nube:apodo')) $('ranking-tu').textContent = 'No apareces en el ranking: ponte un apodo en 📊 › ☁️ Nube.';
    else if (mio && !filas.some((f) => f.uid === E.usuario.uid)) {
      $('ranking-tu').textContent = `Tú: puesto ${await E.nube.puesto(campo, mio, menor)} (${conSufijo(mio)})`;
    }
  } catch {
    $('ranking-lista').replaceChildren(el('li', 'sin-datos', 'No se pudo cargar el ranking (¿sin conexión?).'));
  }
}
