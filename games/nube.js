// Nube con Firebase: sesión con Google, progreso en `usuarios/{uid}` y ranking en `ranking/{uid}`.
// El SDK se carga desde gstatic solo cuando hay configuración; si falla (sin conexión), la app sigue sin nube.

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
let auth;
let db;
let au; // módulo firebase-auth
let fs; // módulo firebase-firestore

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

const documento = (coleccion, uid) => fs.doc(db, coleccion, uid);

// { datos, actualizado } o null si aún no hay nada en la nube.
export async function leerProgreso(uid) {
  const d = await fs.getDoc(documento('usuarios', uid));
  return d.exists() ? d.data() : null;
}

export const guardarProgreso = (uid, datos, actualizado) => fs.setDoc(documento('usuarios', uid), { datos, actualizado });
export const guardarRanking = (uid, fila) => fs.setDoc(documento('ranking', uid), fila);
export const quitarRanking = (uid) => fs.deleteDoc(documento('ranking', uid));
export const borrarTodo = (uid) => Promise.all([fs.deleteDoc(documento('usuarios', uid)), quitarRanking(uid)]);

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
