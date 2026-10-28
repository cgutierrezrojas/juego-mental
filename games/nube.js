// Nube con Firebase: sesión con Google, progreso en `usuarios/{uid}` y ranking en `ranking/{uid}`.
import { semanaDe } from './liga.js';
// El SDK se carga desde gstatic solo cuando hay configuración; si falla (sin conexión), la app sigue sin nube.

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
let auth;
let db;
let au; // módulo firebase-auth
let fs; // módulo firebase-firestore
let rt; // módulo firebase-database (estados en línea), solo si la configuración trae databaseURL
let base; // la Realtime Database
let desfase = 0; // diferencia entre el reloj del servidor y el de este celular (ms)

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
    rt.onValue(rt.ref(base, '.info/serverTimeOffset'), (d) => (desfase = d.val() ?? 0));
  }
  au.getRedirectResult(auth).catch(() => {}); // por si se entró con redirección
  au.onAuthStateChanged(auth, alCambiar);
}

// Ventana de Google para entrar; si el navegador la bloquea, se entra con redirección (recarga la página).
export async function entrar() {
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
  try {
    await au.linkWithPopup(auth.currentUser, google);
    return 'vinculada';
  } catch (e) {
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return 'cancelada';
    if (e.code !== 'auth/credential-already-in-use') throw e;
    await borrarTodo(auth.currentUser.uid).catch(() => {});
    await au.signInWithCredential(auth, au.GoogleAuthProvider.credentialFromError(e));
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
// Borra todo lo de esta persona en la nube: progreso, ranking, perfil y solicitudes de amistad.
export async function borrarTodo(uid) {
  const solicitudes = await misSolicitudes(uid).catch(() => []);
  await Promise.all([
    fs.deleteDoc(documento('usuarios', uid)),
    quitarRanking(uid),
    fs.deleteDoc(documento('perfiles', uid)),
    fs.deleteDoc(fs.doc(db, 'liga', semanaDe(new Date().toISOString().slice(0, 10)), 'jugadores', uid)),
    ...solicitudes.map((s) => borrarSolicitud(s.id)),
  ]);
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

export async function buscarPorCodigo(codigo) {
  const [perfil] = await buscarEn('perfiles', fs.where('codigo', '==', codigo), fs.limit(1));
  return perfil ?? null;
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

// --- Estados en línea (Realtime Database: `estado/{uid}` y `amigos/{uid}`, que dice quién puede verlo) ---

let refEstado = null;
let estadoDeseado = 'conectado';
let dejarDeEscuchar = null;

export const hayEstados = () => Boolean(rt);

// Al conectarse, deja preparado "desconectado" para cuando se cierre la app o se pierda la conexión.
export function iniciarEstados(uid) {
  if (!rt) return;
  dejarDeEscuchar?.();
  refEstado = rt.ref(base, `estado/${uid}`);
  dejarDeEscuchar = rt.onValue(rt.ref(base, '.info/connected'), (conectado) => {
    if (!conectado.val()) return;
    rt.onDisconnect(refEstado).set({ estado: 'desconectado', cuando: rt.serverTimestamp() })
      .then(() => ponerEstado(estadoDeseado))
      .catch(() => {});
  });
}

export function ponerEstado(estado) {
  estadoDeseado = estado;
  if (refEstado) rt.set(refEstado, { estado, cuando: rt.serverTimestamp() }).catch(() => {});
}

// Antes de cerrar sesión (después ya no se puede escribir).
export async function pararEstados() {
  dejarDeEscuchar?.();
  dejarDeEscuchar = null;
  if (refEstado) await rt.set(refEstado, { estado: 'desconectado', cuando: rt.serverTimestamp() }).catch(() => {});
  refEstado = null;
}

// Avisa con alCambiar(estado) cada vez que cambia el estado de un amigo. Devuelve la función para dejar de escuchar.
// Si aún no hay permiso (el amigo no ha abierto la app desde que sois amigos), se reintenta cada 20 s.
export function verEstado(uid, alCambiar) {
  if (!rt) return () => {};
  let parar = () => {};
  let espera;
  const escuchar = () => {
    parar = rt.onValue(rt.ref(base, `estado/${uid}`), (d) => alCambiar(d.val()?.estado ?? 'desconectado'), () => {
      alCambiar('desconectado');
      espera = setTimeout(escuchar, 20000);
    });
  };
  escuchar();
  return () => {
    clearTimeout(espera);
    parar();
  };
}

// Lista de amigos que pueden ver mi estado.
export function guardarAmigosEstados(uid, uids) {
  if (!rt) return Promise.resolve();
  return rt.set(rt.ref(base, `amigos/${uid}`), Object.fromEntries(uids.map((u) => [u, true]))).catch(() => {});
}

// --- Duelos en vivo (`vivo/{sala}` e `invitaciones/{uid}/{sala}`; ver games/vivo.js y database.rules.json) ---

export const ahoraServidor = () => Date.now() + desfase;

// Crea la sala y avisa al amigo. Devuelve el id de la sala.
export async function crearSalaVivo(sala) {
  const ref = rt.push(rt.ref(base, 'vivo'));
  await rt.set(ref, sala);
  await rt.set(rt.ref(base, `invitaciones/${sala.invitado}/${ref.key}`), {
    de: sala.anfitrion, nombre: sala.nombres[sala.anfitrion], juegos: sala.juegos, dificultad: sala.dificultad, cuando: rt.serverTimestamp(),
  });
  return ref.key;
}

export const verSala = (id, alCambiar) => rt.onValue(rt.ref(base, `vivo/${id}`), (d) => alCambiar(d.val()), () => alCambiar(null));
export const cambiarSala = (id, cambios) => rt.update(rt.ref(base, `vivo/${id}`), cambios);
export const borrarSala = (id) => rt.remove(rt.ref(base, `vivo/${id}`)).catch(() => {});
// Si se cierra la app o se pierde la conexión en mitad de la partida, consta como que se fue.
export const prepararAbandono = (id, uid) => rt.onDisconnect(rt.ref(base, `vivo/${id}/fuera/${uid}`)).set(true).catch(() => {});
export const cancelarAbandono = (id, uid) => rt.onDisconnect(rt.ref(base, `vivo/${id}/fuera/${uid}`)).cancel().catch(() => {});

export const escucharInvitaciones = (uid, alLlegar) =>
  rt.onChildAdded(rt.ref(base, `invitaciones/${uid}`), (d) => alLlegar(d.key, d.val()), () => {});
export const borrarInvitacion = (uid, sala) => rt.remove(rt.ref(base, `invitaciones/${uid}/${sala}`)).catch(() => {});

// --- Mensajes entre amigos (`chats/{idChat}/mensajes`), leídos, bloqueos y denuncias (ver database.rules.json) ---

// Avisa de los últimos 50 mensajes y de cada uno nuevo. Devuelve la función para dejar de escuchar.
export function escucharChat(id, alLlegar, alFallar) {
  const consulta = rt.query(rt.ref(base, `chats/${id}/mensajes`), rt.limitToLast(50));
  return rt.onChildAdded(consulta, (d) => alLlegar({ id: d.key, ...d.val() }), alFallar);
}

export const enviarMensaje = (id, de, texto) => rt.push(rt.ref(base, `chats/${id}/mensajes`), { de, texto, cuando: rt.serverTimestamp() });

export async function ultimoMensaje(id) {
  let ultimo = null;
  (await rt.get(rt.query(rt.ref(base, `chats/${id}/mensajes`), rt.limitToLast(1)))).forEach((d) => {
    ultimo = d.val();
  });
  return ultimo;
}

export const marcarLeido = (uid, id) => rt.set(rt.ref(base, `leidos/${uid}/${id}`), rt.serverTimestamp()).catch(() => {});
export const leidoHasta = async (uid, id) => (await rt.get(rt.ref(base, `leidos/${uid}/${id}`))).val() ?? 0;

// Bloqueos: `bloqueos/{uid}/{otro}` = apodo del bloqueado (para poder desbloquearlo desde la lista).
export const bloquear = (uid, otro, apodo) => rt.set(rt.ref(base, `bloqueos/${uid}/${otro}`), apodo);
export const desbloquear = (uid, otro) => rt.remove(rt.ref(base, `bloqueos/${uid}/${otro}`));
export const bloqueados = async (uid) => (rt ? (await rt.get(rt.ref(base, `bloqueos/${uid}`))).val() ?? {} : {});

// Denuncia: solo se puede escribir; se revisa desde la consola de Firebase.
export const denunciar = (datos) => rt.push(rt.ref(base, 'denuncias'), { ...datos, cuando: rt.serverTimestamp() });

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

export async function crearMesa(mesa) {
  const ref = rt.push(rt.ref(base, 'mesas'));
  await rt.set(ref, { ...mesa, creada: rt.serverTimestamp(), actualizada: rt.serverTimestamp() });
  const { x, o } = mesa.jugadores;
  await rt.set(rt.ref(base, `misMesas/${x}/${ref.key}`), { juego: mesa.juego, rival: o, nombreRival: mesa.nombres[o] });
  await rt.set(rt.ref(base, `misMesas/${o}/${ref.key}`), { juego: mesa.juego, rival: x, nombreRival: mesa.nombres[x] });
  return ref.key;
}

export const verMesa = (id, alCambiar) => rt.onValue(rt.ref(base, `mesas/${id}`), (d) => alCambiar(d.val()), () => alCambiar(null));
export const leerMesa = async (id) => (await rt.get(rt.ref(base, `mesas/${id}`))).val();
export const jugarMesa = (id, estado, ganador) => rt.update(rt.ref(base, `mesas/${id}`), { estado, ...(ganador ? { ganador } : {}), actualizada: rt.serverTimestamp() });
export const rendirseMesa = (id, uid, ganador) => rt.update(rt.ref(base, `mesas/${id}`), { [`rendido/${uid}`]: true, ganador, actualizada: rt.serverTimestamp() });
export const misMesasDe = async (uid) => (rt ? (await rt.get(rt.ref(base, `misMesas/${uid}`))).val() ?? {} : {});
export const quitarDeMisMesas = (uid, id) => rt.remove(rt.ref(base, `misMesas/${uid}/${id}`)).catch(() => {});
export const borrarMesa = (id) => rt.remove(rt.ref(base, `mesas/${id}`)).catch(() => {});
