// Nube con Firebase: sesión con Google, progreso en `usuarios/{uid}` y ranking en `ranking/{uid}`.
import { semanaDe } from './liga.js';
import { idChat } from './chat.js';
import { codigoAmigo, enLinea } from './amigos.js';
// El SDK se carga desde gstatic solo cuando hay configuración; si falla (sin conexión), la app sigue sin nube.

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
let auth;
let db;
let au; // módulo firebase-auth
let fs; // módulo firebase-firestore
let rt; // módulo firebase-database (estados en línea), solo si la configuración trae databaseURL
let base; // la Realtime Database
let desfase = 0; // diferencia entre el reloj del servidor y el de este celular (ms)

// Realtime Database solo conectada mientras algo la usa (el plan gratis admite 100 conexiones a la vez).
// El SDK no cierra solo la conexión: al quedar sin uso, se desconecta a los 30 s.
let enUso = 0;
let apagar;
function usar() {
  clearTimeout(apagar);
  if (enUso++ === 0) rt.goOnline(base);
  let suelto = false;
  return () => {
    if (suelto) return;
    suelto = true;
    if (--enUso === 0) apagar = setTimeout(() => enUso === 0 && rt.goOffline(base), 30000);
  };
}
// Una lectura o escritura suelta: conectada hasta que termina.
async function conRed(f) {
  const soltar = usar();
  try {
    return await f();
  } finally {
    soltar();
  }
}
// Una escucha: conectada hasta que se deja de escuchar.
function escuchando(deshacer) {
  const soltar = usar();
  return () => {
    deshacer();
    soltar();
  };
}

// Arranca Firebase y avisa con alCambiar(usuario | null) cada vez que se entra o se sale.
export async function iniciar(config, alCambiar) {
  const [app, modAuth, modFirestore] = await Promise.all([
    import(SDK + 'firebase-app.js'),
    import(SDK + 'firebase-auth.js'),
    import(SDK + 'firebase-firestore.js'),
  ]);
  au = modAuth;
  fs = modFirestore;
  const firebase = app.initializeApp(config);
  auth = au.getAuth(firebase);
  db = fs.getFirestore(firebase);
  if (config.databaseURL) {
    rt = await import(SDK + 'firebase-database.js');
    base = rt.getDatabase(firebase);
    rt.goOffline(base);
    rt.onValue(rt.ref(base, '.info/serverTimeOffset'), (d) => (desfase = d.val() ?? 0));
  }
  au.getRedirectResult(auth).catch(() => {}); // por si se entró con redirección
  au.onAuthStateChanged(auth, alCambiar);
}

// En la app Android, Google se abre con la ventana nativa (plugin) y la sesión se abre aquí con su idToken.
const nativa = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins.FirebaseAuthentication : null;

// Credencial de Google desde la ventana nativa, o null si el usuario la cerró.
async function credencialNativa() {
  try {
    const { credential } = await nativa.signInWithGoogle();
    return au.GoogleAuthProvider.credential(credential.idToken);
  } catch (e) {
    if (/cancel/i.test(e.message)) return null;
    throw e;
  }
}

// Ventana de Google para entrar; si el navegador la bloquea, se entra con redirección (recarga la página).
export async function entrar() {
  if (nativa) {
    const credencial = await credencialNativa();
    if (credencial) await au.signInWithCredential(auth, credencial);
    return;
  }
  const google = new au.GoogleAuthProvider();
  try {
    await au.signInWithPopup(auth, google);
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      await au.signInWithRedirect(auth, google);
    } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      throw e;
    }
  }
}

export const salir = () => au.signOut(auth);
export const entrarInvitado = () => au.signInAnonymously(auth);
export const usuarioActual = () => auth.currentUser;

// Convierte la cuenta de invitado en la de Google sin perder nada (mismo uid): 'vinculada'.
// Si esa cuenta de Google ya existía, se borra lo del invitado en la nube y se entra con ella: 'otra'.
export async function vincularGoogle() {
  const google = new au.GoogleAuthProvider();
  let credencial;
  try {
    if (nativa) {
      credencial = await credencialNativa();
      if (!credencial) return 'cancelada';
      await au.linkWithCredential(auth.currentUser, credencial);
    } else {
      await au.linkWithPopup(auth.currentUser, google);
    }
    return 'vinculada';
  } catch (e) {
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return 'cancelada';
    if (e.code !== 'auth/credential-already-in-use') throw e;
    await borrarTodo(auth.currentUser.uid).catch(() => {});
    await au.deleteUser(auth.currentUser).catch(() => {}); // el invitado ya no sirve
    await au.signInWithCredential(auth, credencial ?? au.GoogleAuthProvider.credentialFromError(e));
    return 'otra';
  }
}

const documento = (coleccion, uid) => fs.doc(db, coleccion, uid);

// { datos, actualizado } o null si aún no hay nada en la nube.
export async function leerProgreso(uid) {
  const d = await fs.getDoc(documento('usuarios', uid));
  return d.exists() ? d.data() : null;
}

export const guardarProgreso = (uid, datos, actualizado) => fs.setDoc(documento('usuarios', uid), { datos, actualizado });
export const guardarRanking = (uid, fila) => fs.setDoc(documento('ranking', uid), fila);
export const quitarRanking = (uid) => fs.deleteDoc(documento('ranking', uid));
// Borra todo lo de esta persona en la nube: progreso, ranking, perfil, ligas, solicitudes, propuestas, duelos
// y, en la Realtime Database, amigos, bloqueos, leídos, mesas y conversaciones.
// Quedan solo las denuncias (se revisan y borran a mano) y las salas en vivo a medias (se borran al terminar).
export async function borrarTodo(uid) {
  const [solicitudes, propuestas, duelos, invitado] = await Promise.all([
    misSolicitudes(uid), misPropuestas(uid), misDuelos(uid), invitaciones(uid),
  ]);
  // Todas las semanas desde que existe la liga (octubre de 2026).
  const semanas = new Set();
  for (let f = Date.now(); f > Date.UTC(2026, 9, 18); f -= 7 * 86400000) semanas.add(semanaDe(new Date(f).toISOString().slice(0, 10)));
  const misInvitaciones = async (campo) => (await fs.getDocs(fs.query(fs.collection(db, 'invitacionesVivo'), fs.where(campo, '==', uid)))).docs.map((d) => d.id);
  const invitacionesVivo = rt ? [...await misInvitaciones('de'), ...await misInvitaciones('para')] : [];
  const otros = solicitudes.map((s) => (s.de === uid ? s.para : s.de));
  if (rt) await borrarTiempoReal(uid, otros);
  await Promise.all([
    fs.deleteDoc(documento('usuarios', uid)),
    quitarRanking(uid),
    fs.deleteDoc(documento('perfiles', uid)),
    fs.deleteDoc(documento('estados', uid)),
    ...invitacionesVivo.map((id) => borrarInvitacion(id)),
    ...[...semanas].map((s) => fs.deleteDoc(jugadorLiga(s, uid))),
    ...solicitudes.map((s) => borrarSolicitud(s.id)),
    ...propuestas.map((p) => fs.deleteDoc(fs.doc(db, 'propuestas', p.id))),
    ...[...new Set([...duelos, ...invitado].map((d) => d.id))].map((id) => borrarDuelo(id)), // sin repetir: borrar dos veces falla
  ]);
}

async function borrarTiempoReal(uid, otros) {
  return conRed(async () => {
    const hijos = async (ruta) => Object.keys((await rt.get(rt.ref(base, ruta))).val() ?? {});
    const [amigos, mesas] = await Promise.all([hijos(`amigos/${uid}`), hijos(`misMesas/${uid}`)]);
    await pararEstados();
    const quitar = (ruta) => rt.remove(rt.ref(base, ruta));
    await Promise.all([
      ...['amigos', 'leidos', 'bloqueos'].map((n) => quitar(`${n}/${uid}`)),
      ...mesas.map((id) => quitar(`misMesas/${uid}/${id}`)),
      ...[...new Set([...amigos, ...otros])].map((o) => quitar(`chats/${idChat(uid, o)}`)),
      // la mesa puede haberla borrado ya el rival
      ...mesas.map((id) => quitar(`mesas/${id}`).catch(() => {})),
    ]);
  });
}

// Borra los datos y la cuenta. Si Google pide haber entrado hace poco, vuelve a preguntar la cuenta y reintenta.
export async function borrarCuenta() {
  const u = auth.currentUser;
  await borrarTodo(u.uid);
  try {
    await au.deleteUser(u);
  } catch (e) {
    if (e.code !== 'auth/requires-recent-login') throw e;
    if (nativa) await au.reauthenticateWithCredential(u, await credencialNativa());
    else await au.reauthenticateWithPopup(u, new au.GoogleAuthProvider());
    await au.deleteUser(u);
  }
}

// Mejores filas del ranking por `campo` ('estrellas' o 'records.<id>'); en "menos es mejor", de menor a mayor.
export async function top(campo, menorEsMejor, cuantos = 20) {
  const consulta = fs.query(fs.collection(db, 'ranking'), fs.orderBy(campo, menorEsMejor ? 'asc' : 'desc'), fs.limit(cuantos));
  return (await fs.getDocs(consulta)).docs.map((d) => ({ uid: d.id, ...d.data() }));
}

// Puesto que tendría `valor` en el ranking de `campo` (1 = el mejor).
export async function puesto(campo, valor, menorEsMejor) {
  const consulta = fs.query(fs.collection(db, 'ranking'), fs.where(campo, menorEsMejor ? '<' : '>', valor));
  return (await fs.getCountFromServer(consulta)).data().count + 1;
}

// --- ✍️ Preguntas de los jugadores (`propuestas`, `preguntas` y `admins`; ver app/trivia.js y firestore.rules) ---

export const proponer = (datos) => fs.addDoc(fs.collection(db, 'propuestas'), { ...datos, estado: 'pendiente', creada: Date.now() });
export const misPropuestas = (uid) => buscarEn('propuestas', fs.where('de', '==', uid), fs.limit(50));
export const propuestasPendientes = () => buscarEn('propuestas', fs.where('estado', '==', 'pendiente'), fs.limit(50));
export const esAdmin = async (uid) => (await fs.getDoc(documento('admins', uid))).exists();
export const preguntasAprobadas = async () => (await fs.getDocs(fs.collection(db, 'preguntas'))).docs.map((d) => d.data());

// Aprobar copia la pregunta a `preguntas` (con el mismo id) y marca la propuesta; rechazar solo la marca.
export async function revisarPropuesta(p, aprobar) {
  const lote = fs.writeBatch(db);
  if (aprobar) lote.set(fs.doc(db, 'preguntas', p.id), { c: p.c, d: p.d, p: p.p, o: p.o });
  lote.update(fs.doc(db, 'propuestas', p.id), { estado: aprobar ? 'aprobada' : 'rechazada' });
  await lote.commit();
}

// --- Duelos (`duelos/{id}`; ver games/duelos.js y las reglas en firestore.rules) ---

const conId = (d) => ({ id: d.id, ...d.data() });

export async function crearDuelo(datos) {
  const ref = await fs.addDoc(fs.collection(db, 'duelos'), datos);
  return ref.id;
}

export async function leerDuelo(id) {
  const d = await fs.getDoc(fs.doc(db, 'duelos', id));
  return d.exists() ? conId(d) : null;
}

const buscarEn = async (coleccion, ...filtros) => (await fs.getDocs(fs.query(fs.collection(db, coleccion), ...filtros))).docs.map(conId);
const buscar = (...filtros) => buscarEn('duelos', ...filtros);

// ponytail: sin orden en la consulta (evita índices compuestos); se ordena al pintar. Basta para pocos duelos por persona.
export const misDuelos = (uid) => buscar(fs.where('jugadores', 'array-contains', uid), fs.limit(60));
export const invitaciones = (uid) => buscar(fs.where('invitado', '==', uid), fs.limit(20));
export const duelosAlAzar = () => buscar(fs.where('azar', '==', true), fs.where('abierto', '==', true), fs.limit(20));

// Entra como segundo jugador; falla si ya no está disponible (otro se adelantó, caducó…).
export function unirseDuelo(id, uid, apodo) {
  const ref = fs.doc(db, 'duelos', id);
  return fs.runTransaction(db, async (t) => {
    const d = await t.get(ref);
    const duelo = d.data();
    if (!d.exists() || duelo.jugadores.length !== 1 || !duelo.abierto || duelo.jugadores.includes(uid) || Date.now() > duelo.caduca) {
      throw new Error('Este duelo ya no está disponible');
    }
    t.update(ref, { jugadores: [...duelo.jugadores, uid], [`nombres.${uid}`]: apodo, abierto: false });
  });
}

export const anotarDuelo = (id, uid, juego, puntos) => fs.updateDoc(fs.doc(db, 'duelos', id), { [`resultados.${uid}.${juego}`]: puntos });
export const borrarDuelo = (id) => fs.deleteDoc(fs.doc(db, 'duelos', id));

// --- Amigos (`perfiles/{uid}` con apodo y código; `solicitudes/{de_para}`: pendiente o aceptada) ---

export const guardarPerfil = (uid, apodo, codigo) => fs.setDoc(documento('perfiles', uid), { apodo, codigo });

// Apodo del perfil en la nube ('' si no hay): para recuperarlo en un celular nuevo.
export async function leerApodo(uid) {
  const d = await fs.getDoc(documento('perfiles', uid));
  return d.exists() ? d.data().apodo ?? '' : '';
}

// El código sale del uid: solo vale el perfil cuyo uid da ese código (otro podría copiarlo en su perfil).
export async function buscarPorCodigo(codigo) {
  const perfiles = await buscarEn('perfiles', fs.where('codigo', '==', codigo), fs.limit(10));
  return perfiles.find((p) => codigoAmigo(p.id) === codigo) ?? null;
}

export async function misSolicitudes(uid) {
  const [enviadas, recibidas] = await Promise.all([
    buscarEn('solicitudes', fs.where('de', '==', uid)),
    buscarEn('solicitudes', fs.where('para', '==', uid)),
  ]);
  return [...enviadas, ...recibidas];
}

export const enviarSolicitud = (de, para, nombreDe, nombrePara) =>
  fs.setDoc(fs.doc(db, 'solicitudes', `${de}_${para}`), { de, para, nombreDe, nombrePara, estado: 'pendiente', creada: Date.now() });
export const aceptarSolicitud = (id) => fs.updateDoc(fs.doc(db, 'solicitudes', id), { estado: 'aceptada' });
export const borrarSolicitud = (id) => fs.deleteDoc(fs.doc(db, 'solicitudes', id));

// --- Estados en línea (`estados/{uid}` en Firestore: { estado, cuando }; lo leen su dueño y sus amigos) ---

let miEstado = null; // { uid, estado } mientras hay sesión
let latido;

export const hayEstados = () => Boolean(rt);

const escribirEstado = () =>
  miEstado && fs.setDoc(documento('estados', miEstado.uid), { estado: miEstado.estado, cuando: fs.serverTimestamp() }, { merge: true }).catch(() => {});

// Publica el estado y lo repite cada 3 min mientras la app está a la vista (si no, a los 5 min se ve desconectado).
export function iniciarEstados(uid) {
  if (!rt) return;
  miEstado = { uid, estado: 'conectado' };
  clearInterval(latido);
  latido = setInterval(() => !document.hidden && escribirEstado(), 3 * 60000);
}

export function ponerEstado(estado) {
  if (!miEstado) return;
  miEstado.estado = estado;
  escribirEstado();
}

// Antes de cerrar sesión (después ya no se puede escribir).
export async function pararEstados() {
  clearInterval(latido);
  if (miEstado) {
    miEstado.estado = 'desconectado';
    await escribirEstado();
  }
  miEstado = null;
}

// Avisa con alCambiar(estado) al cambiar el de un amigo, y cada minuto (para notar que se le pasó el tiempo).
// Si aún no se puede leer (el documento puede no existir aún si el amigo no ha abierto la app desde entonces), se reintenta cada 20 s.
export function verEstado(uid, alCambiar) {
  if (!rt) return () => {};
  let dato = null;
  let parar = () => {};
  let espera;
  const avisar = () => alCambiar(enLinea(dato, Date.now()));
  const escuchar = () => {
    parar = fs.onSnapshot(documento('estados', uid), (d) => {
      dato = d.exists() ? { estado: d.data().estado, cuando: d.data().cuando?.toMillis() } : null;
      avisar();
    }, () => {
      dato = null;
      avisar();
      espera = setTimeout(escuchar, 20000);
    });
  };
  escuchar();
  const reloj = setInterval(avisar, 60000);
  return () => {
    clearTimeout(espera);
    clearInterval(reloj);
    parar();
  };
}

// Quiénes pueden escribirme o retarme (Realtime Database, por sus reglas); el estado (Firestore) se lee por amistad.
export function guardarAmigosEstados(uid, uids) {
  if (!rt) return Promise.resolve();
  return conRed(() => rt.set(rt.ref(base, `amigos/${uid}`), Object.fromEntries(uids.map((u) => [u, true])))).catch(() => {});
}

// --- Duelos en vivo (sala en `vivo/{sala}` de Realtime Database, invitación en `invitacionesVivo/{sala}` de Firestore; ver games/vivo.js, database.rules.json y firestore.rules) ---

export const ahoraServidor = () => Date.now() + desfase;

// Crea la sala y avisa al amigo (`invitacionesVivo/{sala}` en Firestore). Devuelve el id de la sala.
export async function crearSalaVivo(sala) {
  const id = await conRed(async () => {
    const ref = rt.push(rt.ref(base, 'vivo'));
    await rt.set(ref, sala);
    return ref.key;
  });
  await fs.setDoc(fs.doc(db, 'invitacionesVivo', id), {
    de: sala.anfitrion, para: sala.invitado, nombre: sala.nombres[sala.anfitrion], juegos: sala.juegos, dificultad: sala.dificultad, cuando: fs.serverTimestamp(),
  }).catch(async (e) => {
    await borrarSala(id);
    throw e;
  });
  return id;
}

export const verSala = (id, alCambiar) => escuchando(rt.onValue(rt.ref(base, `vivo/${id}`), (d) => alCambiar(d.val()), () => alCambiar(null)));
export const cambiarSala = (id, cambios) => conRed(() => rt.update(rt.ref(base, `vivo/${id}`), cambios));
export const borrarSala = (id) => conRed(() => rt.remove(rt.ref(base, `vivo/${id}`))).catch(() => {});
// Si se cierra la app o se pierde la conexión en mitad de la partida, consta como que se fue.
export const prepararAbandono = (id, uid) => conRed(() => rt.onDisconnect(rt.ref(base, `vivo/${id}/fuera/${uid}`)).set(true)).catch(() => {});
export const cancelarAbandono = (id, uid) => conRed(() => rt.onDisconnect(rt.ref(base, `vivo/${id}/fuera/${uid}`)).cancel()).catch(() => {});

export const escucharInvitaciones = (uid, alLlegar) =>
  fs.onSnapshot(fs.query(fs.collection(db, 'invitacionesVivo'), fs.where('para', '==', uid)), (s) => {
    for (const c of s.docChanges()) if (c.type === 'added') alLlegar(c.doc.id, { ...c.doc.data(), cuando: c.doc.data().cuando?.toMillis() ?? 0 });
  }, () => {});
export const borrarInvitacion = (sala) => fs.deleteDoc(fs.doc(db, 'invitacionesVivo', sala)).catch(() => {});

// --- Mensajes entre amigos (`chats/{idChat}/mensajes`), leídos, bloqueos y denuncias (ver database.rules.json) ---

// Avisa de los últimos 50 mensajes y de cada uno nuevo. Devuelve la función para dejar de escuchar.
export function escucharChat(id, alLlegar, alFallar) {
  const consulta = rt.query(rt.ref(base, `chats/${id}/mensajes`), rt.limitToLast(50));
  return escuchando(rt.onChildAdded(consulta, (d) => alLlegar({ id: d.key, ...d.val() }), alFallar));
}

export const enviarMensaje = (id, de, texto) => conRed(() => rt.push(rt.ref(base, `chats/${id}/mensajes`), { de, texto, cuando: rt.serverTimestamp() }));

export async function ultimoMensaje(id) {
  let ultimo = null;
  (await conRed(() => rt.get(rt.query(rt.ref(base, `chats/${id}/mensajes`), rt.limitToLast(1))))).forEach((d) => {
    ultimo = d.val();
  });
  return ultimo;
}

export const marcarLeido = (uid, id) => conRed(() => rt.set(rt.ref(base, `leidos/${uid}/${id}`), rt.serverTimestamp())).catch(() => {});
export const leidoHasta = async (uid, id) => (await conRed(() => rt.get(rt.ref(base, `leidos/${uid}/${id}`)))).val() ?? 0;

// Bloqueos: `bloqueos/{uid}/{otro}` = apodo del bloqueado (para poder desbloquearlo desde la lista).
export const bloquear = (uid, otro, apodo) => conRed(() => rt.set(rt.ref(base, `bloqueos/${uid}/${otro}`), apodo));
export const desbloquear = (uid, otro) => conRed(() => rt.remove(rt.ref(base, `bloqueos/${uid}/${otro}`)));
export const bloqueados = async (uid) => (rt ? (await conRed(() => rt.get(rt.ref(base, `bloqueos/${uid}`)))).val() ?? {} : {});

// Denuncia: solo se puede escribir; se revisa desde la consola de Firebase.
export const denunciar = (datos) => conRed(() => rt.push(rt.ref(base, 'denuncias'), { ...datos, cuando: rt.serverTimestamp() }));

// --- Liga semanal (`liga/{semana}/jugadores/{uid}`: { apodo, puntos, actualizado }) ---

const jugadorLiga = (semana, uid) => fs.doc(db, 'liga', semana, 'jugadores', uid);
export const guardarLiga = (semana, uid, fila) => fs.setDoc(jugadorLiga(semana, uid), fila);

export async function topLiga(semana, cuantos = 20) {
  const consulta = fs.query(fs.collection(db, 'liga', semana, 'jugadores'), fs.orderBy('puntos', 'desc'), fs.limit(cuantos));
  return (await fs.getDocs(consulta)).docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function puestoLiga(semana, puntos) {
  const consulta = fs.query(fs.collection(db, 'liga', semana, 'jugadores'), fs.where('puntos', '>', puntos));
  return (await fs.getCountFromServer(consulta)).data().count + 1;
}

// Filas de varias personas (por ejemplo, tus amigos); null para quien no ha jugado esta semana.
export const filasLiga = (semana, uids) =>
  Promise.all(uids.map(async (uid) => {
    const d = await fs.getDoc(jugadorLiga(semana, uid));
    return d.exists() ? { uid, ...d.data() } : null;
  }));


// --- 🎲 Mesa con amigos (`mesas/{id}` y el índice `misMesas/{uid}/{id}`; ver app/mesa.js y database.rules.json) ---

export const crearMesa = (mesa) => conRed(async () => {
  const ref = rt.push(rt.ref(base, 'mesas'));
  await rt.set(ref, { ...mesa, creada: rt.serverTimestamp(), actualizada: rt.serverTimestamp() });
  const { x, o } = mesa.jugadores;
  await rt.set(rt.ref(base, `misMesas/${x}/${ref.key}`), { juego: mesa.juego, rival: o, nombreRival: mesa.nombres[o] });
  await rt.set(rt.ref(base, `misMesas/${o}/${ref.key}`), { juego: mesa.juego, rival: x, nombreRival: mesa.nombres[x] });
  return ref.key;
});

export const verMesa = (id, alCambiar) => escuchando(rt.onValue(rt.ref(base, `mesas/${id}`), (d) => alCambiar(d.val()), () => alCambiar(null)));
export const leerMesa = async (id) => (await conRed(() => rt.get(rt.ref(base, `mesas/${id}`)))).val();
export const jugarMesa = (id, estado, ganador) => conRed(() => rt.update(rt.ref(base, `mesas/${id}`), { estado, ...(ganador ? { ganador } : {}), actualizada: rt.serverTimestamp() }));
export const rendirseMesa = (id, uid, ganador) => conRed(() => rt.update(rt.ref(base, `mesas/${id}`), { [`rendido/${uid}`]: true, ganador, actualizada: rt.serverTimestamp() }));
export const misMesasDe = async (uid) => (rt ? (await conRed(() => rt.get(rt.ref(base, `misMesas/${uid}`)))).val() ?? {} : {});
export const quitarDeMisMesas = (uid, id) => conRed(() => rt.remove(rt.ref(base, `misMesas/${uid}/${id}`))).catch(() => {});
export const borrarMesa = (id) => conRed(() => rt.remove(rt.ref(base, `mesas/${id}`))).catch(() => {});
