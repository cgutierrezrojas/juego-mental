// Estado compartido de la app (lo que antes eran variables sueltas de main.js). Se lee y se cambia como E.campo.


export const E = {
  actual: null,
  parar: null, // detiene el juego en curso (la devuelve start)
  inicio: 0, // cuándo empezó el juego en curso (tras la cuenta atrás), para medir su duración
  eleccion: { modo: 'normal', dificultad: 'normal' }, // modo y dificultad elegidos para el juego abierto
  nivelElegido: 1, // nivel seleccionado en el modo Niveles
  vistaHoy: false, // en Niveles: pestaña 📅 Hoy (los 3 diarios) en vez de los mundos
  diarioElegido: 0, // diario seleccionado (0–2) en los retos de hoy
  mundoVisto: 1, // mundo que se ve en el camino (◀ ▶)
  nube: null, // ☁️ módulo games/nube.js, cuando ha cargado
  usuario: null, // usuario con sesión, o null
  estadoNube: '', // texto de estado del bloque Nube
  sesionLista: false, // ya se sabe si hay sesión (Firebase respondió)
  temporizadores: [], // sonidos y confeti pendientes del final; se cancelan al salir de él
  textoCompartir: '', // resultado de la última partida, para 📤 Compartir
  enDuelo: null, // { id, juego, rival, numero, total } mientras se juega un juego de un duelo
  jugando: null, // { nivel, fecha, diario } del nivel en curso; se fija al empezar (puede acabar pasada la medianoche)
  dueloEnlace: new URLSearchParams(location.search).get('duelo'), // duelo recibido por enlace (?duelo=ID)
  avisoDuelosCuando: 0, // última consulta del aviso del menú (para no preguntar a la nube en cada vuelta)
  nuevoDuelo: null, // opciones del duelo que se está creando
  estadoApp: 'conectado', // lo que estoy haciendo (lo que se publica, salvo en modo invisible)
  escuchas: [], // estados de amigos que se escuchan mientras está abierta la pantalla de amigos
  enVivo: null, // { id, rival, ronda, total } mientras se juega una ronda en vivo
  salaVivo: null, // { id, sala, parar, programadas, misPuntos } de la sala abierta
  invitacionPendiente: null, // reto recibido mientras se jugaba otra cosa
  retoVivo: null,
  chatAbierto: null, // { id, amigo, parar, mensajes } de la conversación abierta
};
