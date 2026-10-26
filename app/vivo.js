// ⚡ Duelos en vivo por rondas.
import { ligaAnotar } from './liga.js';
import { el, leer, guardar } from '../games/comun.js';
import { JUEGOS_VIVO, resultadoVivo, rondaActual, comoDuelo, rivalDe } from '../games/vivo.js';
import { DIFICULTADES } from '../games/modos.js';
import { elegirJuegos, marcador } from '../games/duelos.js';
import { sonar } from '../games/efectos.js';
import { E } from './estado.js';
import { mostrar, $, confeti } from './ui.js';
import { HABILIDADES, INFO_JUEGOS, ICONO_HABILIDAD, CARA } from './juegos.js';
import { abrirAmigos } from './amigos.js';
import { leerJSON, apuntarLogros } from './datos.js';
import { jugar } from './partida.js';

// ⚡ Duelos en vivo por rondas con un amigo conectado (reglas puras en games/vivo.js; sala en la Realtime Database).
export const PAUSA_RONDAS = 8000; // entre una ronda y la siguiente

export function salirDeSala() {
  E.salaVivo?.parar();
  E.salaVivo = null;
}

// Elegir juegos (1 a 5, una ronda cada uno), dificultad y cómo se gana.
export function abrirRetoVivo(amigo) {
  salirDeSala(); // un reto anterior (rechazado, cancelado…) ya no debe repintar esta pantalla
  E.retoVivo = { amigo, forma: 'azar', habilidad: 'Cálculo', elegidos: [], dificultad: 'normal', victoria: 'juegos' };
  mostrar('vivo');
  pintarRetoVivo();
}

export function pintarRetoVivo() {
  const r = E.retoVivo;
  const grupo = (titulo, opciones, elegido, alElegir) => {
    const caja = el('div', 'opciones-duelo');
    caja.setAttribute('role', 'group');
    caja.setAttribute('aria-label', titulo);
    for (const [valor, texto] of opciones) {
      const b = el('button', '', texto);
      b.setAttribute('aria-pressed', Array.isArray(elegido) ? elegido.includes(valor) : valor === elegido);
      b.onclick = () => {
        alElegir(valor);
        pintarRetoVivo();
        $('vivo-contenido').querySelector(`[aria-label^="${titulo.split(' (')[0]}"] button[aria-pressed="true"]`)?.focus(); // el título puede llevar un contador
      };
      caja.append(b);
    }
    return [el('h3', 'categoria', titulo), caja];
  };
  const enviar = el('button', 'grande color', `⚡ Retar a ${r.amigo.apodo}`);
  enviar.style.setProperty('--c', 'var(--acento)');
  enviar.disabled = r.forma === 'elegir' && !r.elegidos.length;
  enviar.onclick = () => enviarRetoVivo(enviar);
  // Como en los duelos por turnos: 3 al azar, 3 de una habilidad o de 1 a 5 a mano (solo juegos con reloj).
  const conVivo = HABILIDADES.filter((h) => JUEGOS_VIVO.some((id) => INFO_JUEGOS[id].habilidad === h));
  const partesJuegos = grupo('Juegos (una ronda cada uno)', [['azar', '🎲 3 al azar'], ['habilidad', '🧠 Habilidad'], ['elegir', '✋ Elegir']], r.forma, (v) => (r.forma = v));
  if (r.forma === 'habilidad') partesJuegos.push(...grupo('Habilidad', conVivo.map((h) => [h, `${ICONO_HABILIDAD[h]} ${h}`]), r.habilidad, (v) => (r.habilidad = v)));
  if (r.forma === 'elegir') {
    partesJuegos.push(...grupo(`Elige de 1 a 5 (${r.elegidos.length}/5)`, JUEGOS_VIVO.map((id) => [id, `${INFO_JUEGOS[id].icono} ${INFO_JUEGOS[id].nombre}`]), r.elegidos, (id) => {
      if (r.elegidos.includes(id)) r.elegidos = r.elegidos.filter((x) => x !== id);
      else if (r.elegidos.length < 5) r.elegidos.push(id);
    }));
  }
  $('vivo-contenido').replaceChildren(
    el('p', 'titulo-duelo', `⚡ En vivo contra ${r.amigo.apodo}`),
    el('p', 'sin-datos', 'Jugáis a la vez, una ronda por juego, y veis el marcador del otro en directo. Solo juegos con reloj.'),
    ...partesJuegos,
    ...grupo('Dificultad', Object.entries(DIFICULTADES).map(([d, nombre]) => [d, `${CARA[d]} ${nombre}`]), r.dificultad, (v) => (r.dificultad = v)),
    ...grupo('Cómo se gana', [['juegos', 'Ronda a ronda'], ['puntos', 'Suma de puntos']], r.victoria, (v) => (r.victoria = v)),
    enviar,
    el('p', 'estado-duelo', ''),
  );
}

export async function enviarRetoVivo(boton) {
  const r = E.retoVivo;
  boton.disabled = true;
  const candidatos = r.forma === 'habilidad' ? JUEGOS_VIVO.filter((id) => INFO_JUEGOS[id].habilidad === r.habilidad) : JUEGOS_VIVO;
  const juegos = r.forma === 'elegir' ? r.elegidos : elegirJuegos(candidatos);
  try {
    const id = await E.nube.crearSalaVivo({
      anfitrion: E.usuario.uid,
      invitado: r.amigo.uid,
      nombres: { [E.usuario.uid]: leer('nube:apodo'), [r.amigo.uid]: r.amigo.apodo },
      juegos,
      dificultad: r.dificultad,
      victoria: r.victoria,
      estado: 'invitando',
    });
    entrarEnSala(id);
  } catch {
    boton.disabled = false;
    $('vivo-contenido').querySelector('.estado-duelo').textContent = `No se pudo enviar el reto. ¿${r.amigo.apodo} sigue siendo tu amigo y hay conexión?`;
  }
}

// Escucha la sala: espera, inicio sincronizado de cada ronda, marcador en directo y resultado.
export function entrarEnSala(id) {
  salirDeSala();
  E.salaVivo = { id, sala: null, programadas: new Set(), misPuntos: 0, parar: () => {} };
  E.salaVivo.parar = E.nube.verSala(id, (sala) => {
    if (!E.salaVivo || E.salaVivo.id !== id) return;
    E.salaVivo.sala = sala;
    if (sala?.estado === 'aceptada' && !resultadoVivo(sala, E.usuario.uid, INFO_JUEGOS)) programarRonda(sala);
    if (E.enVivo && sala) pintarMarcadorVivo(sala);
    if (!$('vivo').hidden) pintarSalaVivo();
  });
  mostrar('vivo');
  pintarSalaVivo();
}

// Cuando los dos acaban una ronda, el anfitrión fija el inicio de la siguiente; cada uno la empieza a esa hora.
export function programarRonda(sala) {
  const r = rondaActual(sala);
  if (r >= sala.juegos.length) return;
  if (!sala.inicios?.[r]) {
    if (r > 0 && sala.anfitrion === E.usuario.uid) E.nube.cambiarSala(E.salaVivo.id, { [`inicios/${r}`]: E.nube.ahoraServidor() + PAUSA_RONDAS }).catch(() => {});
    return;
  }
  if (E.salaVivo.programadas.has(r) || sala.fin?.[r]?.[E.usuario.uid] !== undefined) return;
  E.salaVivo.programadas.add(r);
  const id = E.salaVivo.id;
  // jugar() hace su cuenta atrás de 3 s: se llama 3 s antes del inicio común.
  setTimeout(() => E.salaVivo?.id === id && jugarVivo(r), Math.max(0, sala.inicios[r] - E.nube.ahoraServidor() - 3000));
}

// Rondas jugadas: "Ronda 1 · ➕ Cálculo: Tú 15 · Ana 12 ✓".
export function lineasRondas(sala, rival) {
  const { porJuego } = marcador(comoDuelo(sala), E.usuario.uid, INFO_JUEGOS);
  return porJuego.filter((p) => p.mio !== undefined || p.suyo !== undefined).map((p, i) => {
    const j = INFO_JUEGOS[p.id];
    const gana = { yo: ' · ✓ tuya', rival: ` · ✓ de ${rival}`, empate: ' · empate' }[p.gana] ?? '';
    return el('p', 'ronda-vivo', `Ronda ${i + 1} · ${j.icono} ${j.nombre}: Tú ${p.mio ?? '…'} · ${rival} ${p.suyo ?? '…'}${gana}`);
  });
}

export function pintarSalaVivo() {
  const { id, sala } = E.salaVivo ?? {};
  const caja = $('vivo-contenido');
  const boton = (texto, clase, alPulsar) => {
    const b = el('button', clase, texto);
    if (clase.includes('color')) b.style.setProperty('--c', 'var(--acento)');
    b.onclick = alPulsar;
    return b;
  };
  if (!sala) return caja.replaceChildren(el('p', 'sin-datos', 'Este reto ya no existe.'), boton('Volver a Amigos', '', () => abrirAmigos()));
  const rival = sala.nombres?.[rivalDe(sala, E.usuario.uid)] ?? 'tu rival';
  const total = sala.juegos.length;
  const juegos = sala.juegos.map((j) => INFO_JUEGOS[j].icono).join(' ');
  const titulo = el('p', 'titulo-duelo', `⚡ ${total} ronda${total > 1 ? 's' : ''} ${juegos} · ${DIFICULTADES[sala.dificultad]}`);
  const resultado = resultadoVivo(sala, E.usuario.uid, INFO_JUEGOS);
  if (resultado) return pintarResultadoVivo(sala, resultado, titulo, rival, boton);
  if (sala.estado === 'rechazada') {
    return caja.replaceChildren(titulo, el('p', 'aviso-duelo', `${rival} no puede jugar ahora.`), boton('Volver a Amigos', '', () => {
      salirDeSala();
      E.nube.borrarSala(id);
      abrirAmigos();
    }));
  }
  if (sala.estado === 'invitando') {
    return caja.replaceChildren(titulo, el('p', 'aviso-duelo', `⏳ Esperando a que ${rival} acepte…`), boton('Cancelar reto', '', () => {
      E.nube.borrarInvitacion(sala.invitado, id);
      E.nube.borrarSala(id);
      salirDeSala();
      abrirAmigos();
    }));
  }
  const r = rondaActual(sala);
  const siguiente = INFO_JUEGOS[sala.juegos[r]];
  let aviso;
  if (r === 0 && !sala.fin?.[0]) aviso = `¡${rival} aceptó! Empezáis a la vez en unos segundos…`;
  else if (sala.fin?.[r]?.[E.usuario.uid] !== undefined) aviso = `⏳ Esperando a que ${rival} termine la ronda ${r + 1}…`;
  else aviso = `Siguiente: ronda ${r + 1}/${total} · ${siguiente.icono} ${siguiente.nombre}. Empieza en unos segundos…`;
  caja.replaceChildren(titulo, ...lineasRondas(sala, rival), el('p', 'aviso-duelo', aviso));
}

export function pintarResultadoVivo(sala, resultado, titulo, rival, boton) {
  const id = E.salaVivo.id;
  const clave = `vivo-${id}`;
  const resultados = leerJSON('duelos:resultados');
  if (!resultados[clave]) {
    resultados[clave] = resultado;
    ligaAnotar({ v: 'victoria', e: 'empate' }[resultado]);
    guardar('duelos:resultados', JSON.stringify(resultados));
    apuntarLogros();
    if (resultado === 'v') {
      confeti();
      sonar('record');
    }
    E.nube.cancelarAbandono(id, E.usuario.uid);
    // El anfitrión borra la sala un rato después (el rival ya ha tenido tiempo de verla).
    if (sala.anfitrion === E.usuario.uid) setTimeout(() => E.nube.borrarSala(id), 60000);
  }
  const textos = { v: '🏆 ¡Ganaste el duelo en vivo!', d: 'Perdiste esta vez. ¡A por la revancha!', e: '🤝 Empate' };
  const m = marcador(comoDuelo(sala), E.usuario.uid, INFO_JUEGOS, true);
  const rivalSeFue = sala.fuera?.[rivalDe(sala, E.usuario.uid)] && rondaActual(sala) < sala.juegos.length;
  const yoMeFui = sala.fuera?.[E.usuario.uid] && rondaActual(sala) < sala.juegos.length;
  let detalle = `Tú ${m.mio} · ${rival} ${m.suyo}${sala.victoria === 'puntos' ? ' (puntos)' : ''}`;
  if (rivalSeFue) detalle = `${rival} se fue antes de terminar.`;
  if (yoMeFui) detalle = 'Te fuiste antes de terminar.';
  $('vivo-contenido').replaceChildren(
    titulo,
    el('p', `resultado-duelo resultado-${resultado}`, textos[resultado]),
    el('p', 'marcador-final-vivo', detalle),
    ...lineasRondas(sala, rival),
    boton('Volver a Amigos', '', () => {
      salirDeSala();
      abrirAmigos();
    }),
  );
}

// Reto recibido: se muestra al momento (o al terminar la partida en curso).
export function recibirInvitacion(id, invitacion) {
  if (!invitacion || E.nube.ahoraServidor() - (invitacion.cuando ?? 0) > 120000) {
    E.nube.borrarInvitacion(E.usuario.uid, id); // reto viejo: ya no vale
    return;
  }
  if (!$('juego').hidden || $('dialogo-vivo').open) {
    E.invitacionPendiente = { id, invitacion };
    return;
  }
  const juegos = (invitacion.juegos ?? []).map((j) => `${INFO_JUEGOS[j]?.icono ?? ''} ${INFO_JUEGOS[j]?.nombre ?? j}`).join(', ');
  const rondas = invitacion.juegos?.length ?? 1;
  $('vivo-texto').textContent = `${invitacion.nombre} te reta en vivo: ${rondas} ronda${rondas > 1 ? 's' : ''} (${juegos}) en ${DIFICULTADES[invitacion.dificultad]}.`;
  $('vivo-aceptar').onclick = async () => {
    $('dialogo-vivo').close();
    E.nube.borrarInvitacion(E.usuario.uid, id);
    try {
      await E.nube.cambiarSala(id, { estado: 'aceptada', 'inicios/0': E.nube.ahoraServidor() + 6000 });
      entrarEnSala(id);
    } catch {
      abrirAmigos('Ese reto ya no está disponible.');
    }
  };
  $('vivo-rechazar').onclick = () => {
    $('dialogo-vivo').close();
    E.nube.borrarInvitacion(E.usuario.uid, id);
    E.nube.cambiarSala(id, { estado: 'rechazada' }).catch(() => {});
  };
  $('dialogo-vivo').showModal();
  sonar('tic');
}

export function revisarInvitacionPendiente() {
  if (!E.invitacionPendiente || !$('juego').hidden) return;
  const { id, invitacion } = E.invitacionPendiente;
  E.invitacionPendiente = null;
  recibirInvitacion(id, invitacion);
}

// Empieza la ronda `r`: modo Normal con la dificultad del reto; cada acierto se publica al momento.
export function jugarVivo(r) {
  const { id, sala } = E.salaVivo;
  E.actual = INFO_JUEGOS[sala.juegos[r]];
  E.eleccion = { modo: 'normal', dificultad: E.actual.sinDificultad ? 'normal' : sala.dificultad };
  E.enDuelo = null;
  E.enVivo = { id, rival: sala.nombres?.[rivalDe(sala, E.usuario.uid)] ?? 'Rival', ronda: r, total: sala.juegos.length };
  E.salaVivo.misPuntos = 0;
  E.nube.prepararAbandono(id, E.usuario.uid);
  E.nube.cambiarSala(id, { [`puntos/${E.usuario.uid}`]: 0 }).catch(() => {});
  jugar();
  pintarMarcadorVivo(sala);
}

export function pintarMarcadorVivo(sala) {
  const marcadorVivo = $('marcador-vivo');
  marcadorVivo.hidden = !E.enVivo;
  if (!E.enVivo) return;
  const rival = rivalDe(sala, E.usuario.uid);
  const final = sala.fin?.[E.enVivo.ronda]?.[rival];
  const suyo = sala.fuera?.[rival] && final === undefined ? 'se fue' : final ?? sala.puntos?.[rival] ?? 0;
  const ronda = E.enVivo.total > 1 ? `Ronda ${E.enVivo.ronda + 1}/${E.enVivo.total} · ` : '';
  marcadorVivo.textContent = `⚡ ${ronda}Tú ${E.salaVivo?.misPuntos ?? 0} · ${E.enVivo.rival} ${suyo}`;
}

export function verResultadoVivo() {
  E.enVivo = null;
  $('marcador-vivo').hidden = true;
  mostrar('vivo');
  pintarSalaVivo();
}
