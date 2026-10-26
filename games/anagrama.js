// Anagramas: ¿qué palabra forman estas letras desordenadas? 60 segundos.
import { barajar } from './comun.js';
import { jugarConOpciones } from './opciones.js';

// Palabras sin tildes ni eñes (para que no haya dudas al desordenarlas), por número de letras.
export const PALABRAS = {
  4: 'GATO CASA MESA LUNA SOPA PATO ROSA NUBE LAGO FARO MAPA VASO TREN BOTE CAMA DEDO FOCA HIJO JUGO LORO MANO NIDO OLLA PALO PERA RANA SAPO TELA TORO VELA AZUL MIEL FLOR RUTA TAZA LOBO COCO DADO KIWI MONO PUMA',
  5: 'PERRO LIBRO PLAYA CIELO FRUTA BARCO CAMPO CARTA COCHE DULCE FUEGO GLOBO HUEVO JUEGO LECHE MUNDO NIEVE NOCHE PAPEL PIANO PLATO PUNTO QUESO RELOJ RUEDA SILLA SUELO TIGRE VERDE VIAJE ZORRO BOLSA CEBRA GORRO LLAVE MANGO MONTE NARIZ OVEJA PERLA PULPO TORRE',
  6: 'CAMINO CEREZA CIUDAD COHETE CUERDA ESPEJO ESTUFA GUANTE HELADO PALOMA PATATA PELOTA PINTOR PLANTA PUERTA SEMANA TOMATE ZAPATO CORONA DIENTE ESCUDO GRANJA MEDUSA MONEDA NEVERA PARQUE PIRATA SALERO TIJERA VERANO',
  7: 'CABALLO MANZANA MOCHILA NARANJA PESCADO VENTANA BOTELLA GALLETA TORTUGA RODILLA MAESTRO BALLENA BANDERA CARRERA CEBOLLA CUCHARA ESPALDA FAMILIA HORMIGA LECHUGA NOTICIA PALMERA PLANETA',
};

const ordenada = (palabra) => [...palabra].sort().join('');

// Con los aciertos, palabras más largas (4 a 7 letras). Las otras 3 opciones no usan las mismas letras.
export function generarAnagrama(aciertos, rnd = Math.random) {
  const largo = aciertos < 5 ? 4 : aciertos < 10 ? 5 : aciertos < 16 ? 6 : 7;
  const lista = PALABRAS[largo].split(' ');
  const [palabra] = barajar(lista, rnd);
  const otras = barajar(lista.filter((w) => ordenada(w) !== ordenada(palabra)), rnd).slice(0, 3);
  let letras;
  do letras = barajar([...palabra], rnd).join('');
  while (letras === palabra);
  return { letras: [...letras].join(' '), palabra, opciones: barajar([palabra, ...otras], rnd) };
}

export function start(pantalla, alTerminar, opciones = {}) {
  return jugarConOpciones(pantalla, alTerminar, (aciertos) => {
    const { letras, palabra, opciones: palabras } = generarAnagrama(aciertos);
    return { texto: letras, opciones: palabras, correcta: palabra, pista: `Era ${palabra}` };
  }, 'anagrama', opciones);
}
