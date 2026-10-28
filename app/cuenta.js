// ☁️ Nube: sesión, sincronización, apodo y ranking.
import { filaLiga, semanaActual, comprobarPodio, pintarRankingLiga } from './liga.js';
import { CONFIG } from '../firebase-config.js';
import { el, leer, guardar } from '../games/comun.js';
import { tieneProgreso, decidirSincro, datosRanking } from '../games/sincro.js';
import { $, preguntar, mostrar } from './ui.js';
import { E } from './estado.js';
import { pintarSugerencia } from './menu.js';
import { ponerEstado, actualizarPerfil, agregarAmigo } from './amigos.js';
import { recibirInvitacion } from './vivo.js';
import { pintarAvisoDuelos, abrirDuelo, asegurarDuelista, abrirNuevoDuelo } from './duelos.js';
import { datosDelJuego, sustituirProgreso, conUnidad } from './datos.js';
import { JUEGOS } from './juegos.js';

// ☁️ Nube (Firebase): sesión con Google, progreso sincronizado y ranking. Sin CONFIG, no aparece nada de esto.

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
  const privacidad = el('a', '', 'Política de privacidad');
  privacidad.href = 'privacidad.html';
  const partes = [el('h3', 'categoria', '☁️ Nube')];
  if (!E.nube) {
    partes.push(el('p', 'sin-datos', E.estadoNube || 'Conectando con la nube…'));
  } else if (!E.usuario) {
    partes.push(
      el('p', 'sin-datos', 'Entra con tu cuenta de Google para guardar tu progreso en la nube y competir en el ranking. O sigue como invitado (con un apodo) desde este celular.'),
      boton('Entrar con Google (recomendado)', () => E.nube.entrar().catch(() => avisarNube('No se pudo entrar. Inténtalo de nuevo.'))),
      boton('Seguir como invitado', () => E.nube.entrarInvitado().catch((e) => avisarNube(
        e.code === 'auth/admin-restricted-operation' || e.code === 'auth/operation-not-allowed'
          ? 'El modo invitado aún no está activado en Firebase.'
          : 'No se pudo entrar como invitado (¿sin conexión?).',
      ))),
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
        await E.nube.pararEstados();
        E.nube.salir();
      }));
    }
    partes.push(boton('Borrar mis datos de la nube', borrarNube));
  }
  partes.push(privacidad);
  caja.replaceChildren(...partes);
}

export function avisarNube(texto) {
  E.estadoNube = texto;
  pintarNube();
}

export async function alCambiarUsuario(u) {
  E.usuario = u;
  E.sesionLista = true;
  E.estadoNube = '';
  pintarSugerencia();
  pintarNube();
  if (u) {
    E.nube.iniciarEstados(u.uid);
    ponerEstado(E.estadoApp);
    if (E.nube.hayEstados()) E.nube.escucharInvitaciones(u.uid, recibirInvitacion);
    await sincronizar();
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
      asegurarDuelista(); // lleva a ☁️ Nube; al entrar se abre el duelo
    }
  }
}

// Al tener sesión: decide si subir, bajar o preguntar (ver decidirSincro).
export async function sincronizar() {
  try {
    avisarNube('Sincronizando…');
    const local = datosDelJuego();
    if (tieneProgreso(local) && !leer('nube:cambio')) guardar('nube:cambio', Date.now()); // progreso de antes de la nube
    const enNube = await E.nube.leerProgreso(E.usuario.uid);
    const decision = decidirSincro({
      hayLocal: tieneProgreso(local),
      hayNube: tieneProgreso(enNube?.datos ?? {}),
      vinculado: leer('nube:uid') === E.usuario.uid,
      cambioLocal: Number(leer('nube:cambio')) || 0,
      actualizadoNube: enNube?.actualizado ?? 0,
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

// Este celular y la nube tienen progreso distinto y aún no se han vinculado: que elija la persona.
export function preguntarSincro(enNube) {
  avisarNube('Elige qué progreso conservar.');
  const dialogo = $('dialogo-nube');
  $('usar-nube').onclick = () => {
    dialogo.close();
    bajar(enNube);
  };
  $('usar-local').onclick = async () => {
    dialogo.close();
    guardar('nube:uid', E.usuario.uid);
    guardar('nube:cambio', Date.now()); // el de este celular pasa a ser el más reciente
    await subir().catch(() => avisarNube('Sin conexión con la nube: se sincronizará más tarde.'));
    pedirApodo(true);
  };
  dialogo.showModal();
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
  if (!E.nube || !E.usuario || leer('nube:uid') !== E.usuario.uid) return;
  const cambio = Number(leer('nube:cambio')) || 0;
  if (cambio > (Number(leer('nube:subido')) || 0)) {
    const datos = datosDelJuego();
    await E.nube.guardarProgreso(E.usuario.uid, datos, cambio);
    const apodo = leer('nube:apodo');
    if (apodo) {
      await E.nube.guardarRanking(E.usuario.uid, { apodo, ...datosRanking(datos), actualizado: cambio });
      await E.nube.guardarLiga(semanaActual(), E.usuario.uid, filaLiga(apodo, cambio));
    }
    guardar('nube:subido', cambio);
  }
  avisarNube(`✓ Sincronizado (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
}

// Apodo del ranking (2–20 caracteres; vacío = no aparecer). `primeraVez`: solo se pregunta una vez por celular.
export async function pedirApodo(primeraVez) {
  if (primeraVez && leer('nube:preguntado')) return;
  guardar('nube:preguntado', '1');
  const propuesta = leer('nube:apodo') || (E.usuario.isAnonymous ? `Invitado-${10000 + Math.floor(Math.random() * 90000)}` : '');
  const texto = await preguntar({
    titulo: '🏆 Tu apodo en el ranking',
    texto: 'De 2 a 20 caracteres. Nunca se muestran tu nombre ni tu correo. Déjalo vacío para no aparecer.',
    boton: 'Guardar',
    campo: propuesta,
  });
  if (texto === null) return; // cancelado: no cambia nada
  const apodo = texto.trim().slice(0, 20);
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
    titulo: 'Borrar mis datos de la nube',
    texto: 'Se borrarán tu progreso guardado en la nube y tu fila del ranking. El progreso de este celular se queda.',
    boton: 'Borrar',
  });
  if (!seguro) return;
  try {
    await E.nube.borrarTodo(E.usuario.uid);
    for (const clave of ['nube:uid', 'nube:subido', 'nube:apodo', 'nube:preguntado']) guardar(clave, '');
    await E.nube.pararEstados();
    await E.nube.salir();
    avisarNube('✓ Tus datos de la nube se han borrado.');
  } catch {
    avisarNube('No se pudieron borrar (¿sin conexión?). Inténtalo de nuevo.');
  }
}

// 🏆 Ranking: "⭐ General" (total de estrellas) o el récord Normal·Normal de un juego; top 20 y tu puesto.
export function abrirRanking(tipo) {
  if (!$('ranking-tipo').options.length) {
    $('ranking-tipo').append(
      new Option('⭐ General (estrellas)', ''),
      new Option('🏅 Liga semanal', 'liga'),
      new Option('🏅 Liga de amigos', 'liga-amigos'),
      ...JUEGOS.map((j) => new Option(`${j.icono} ${j.nombre}`, j.id)),
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
  const j = JUEGOS.find((x) => x.id === tipo);
  const campo = j ? `records.${j.id}` : 'estrellas';
  const menor = Boolean(j?.menorEsMejor);
  const valorDe = (fila) => (j ? fila.records?.[j.id] : fila.estrellas);
  const conSufijo = (v) => (j ? conUnidad(j, v) : `${v} ⭐`);
  $('ranking-lista').replaceChildren(el('li', 'sin-datos', 'Cargando…'));
  $('ranking-tu').textContent = '';
  try {
    const filas = await E.nube.top(campo, menor);
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
              li.append(retar, amigo);
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
