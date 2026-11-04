// ⚔️ Retos a un amigo (Arcade y Palabras): un duelo de un solo juego con la semilla de la partida, para que juegue la misma.
import { el, leer } from '../games/comun.js';
import { PLAZO } from '../games/duelos.js';
import { amigosDe } from '../games/amigos.js';
import { E } from './estado.js';
import { asegurarDuelista, anotarEnDuelo, abrirDuelo } from './duelos.js';

const boton = (texto, alPulsar) => {
  const b = el('button', '', texto);
  b.onclick = alPulsar;
  return b;
};

// Muestra los amigos en `caja`; al elegir uno se crea el reto. `reto`: { id, semilla, dificultad, puntos }.
export async function elegirAmigo(caja, reto) {
  if (!(await asegurarDuelista())) return;
  caja.replaceChildren(el('span', 'sin-datos', 'Cargando tus amigos…'));
  try {
    const { amigos } = amigosDe(await E.nube.misSolicitudes(E.usuario.uid), E.usuario.uid);
    if (!amigos.length) return caja.replaceChildren(el('span', 'sin-datos', 'Aún no tienes amigos: agrégalos en 👥 Amigos.'));
    caja.replaceChildren(el('p', 'sin-datos', `¿A quién retas a superar tus ${reto.puntos} puntos?`), ...amigos.map((a) => boton(`👥 ${a.apodo}`, () => retar(caja, reto, a))));
  } catch {
    caja.replaceChildren(el('span', 'sin-datos', 'No se pudieron cargar tus amigos (¿sin conexión?).'));
  }
}

async function retar(caja, { id, semilla, dificultad = 'normal', puntos }, amigo) {
  caja.replaceChildren(el('span', 'sin-datos', 'Creando el reto…'));
  try {
    const ahora = Date.now();
    const duelo = await E.nube.crearDuelo({
      anfitrion: E.usuario.uid, jugadores: [E.usuario.uid], nombres: { [E.usuario.uid]: leer('nube:apodo') }, invitado: amigo.uid, abierto: true, azar: false,
      juegos: [id], dificultad, victoria: 'puntos', creado: ahora, caduca: ahora + PLAZO, resultados: {}, semilla,
    });
    E.enDuelo = { id: duelo, juego: id };
    anotarEnDuelo(puntos);
    E.enDuelo = null;
    abrirDuelo(duelo, `📨 Reto enviado a ${amigo.apodo}: jugará la misma partida y tiene 48 horas.`);
  } catch {
    caja.replaceChildren(el('span', 'sin-datos', 'No se pudo crear el reto (¿sin conexión?).'));
  }
}
