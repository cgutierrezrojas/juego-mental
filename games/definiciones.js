// 🪜 Definiciones de la Escalera de palabras, por largo (4 a 11 letras). Palabra sin tildes y con Ñ;
// 'ARBOL:ÁRBOL' guarda la forma con tilde para mostrarla.

const def = (texto) => texto.trim().split('\n').map((linea) => {
  const [palabra, ...resto] = linea.trim().split(' ');
  const [sin, con] = palabra.split(':');
  return { palabra: sin, tilde: con ?? sin, definicion: resto.join(' ') };
});

export const DEFINICIONES = def(`
GATO Felino doméstico que maúlla.
LUNA Satélite natural de la Tierra.
MESA Mueble con patas y una tabla encima para comer o trabajar.
NUBE Masa de vapor de agua que flota en el cielo.
ROSA Flor con espinas, símbolo del amor.
FARO Torre con una luz que guía a los barcos de noche.
PATO Ave acuática que dice «cuac».
TREN Vehículo de varios vagones que corre sobre rieles.
MIEL Sustancia dulce que fabrican las abejas.
LAGO Gran masa de agua dulce rodeada de tierra.
DEDO Cada una de las cinco partes en que termina la mano.
SOPA Comida líquida que se toma con cuchara.
VELA Cilindro de cera con una mecha que da luz.
LORO Ave de colores que puede imitar la voz humana.
NIDO Lo que construyen las aves para poner sus huevos.
OLLA Recipiente hondo para cocinar en el fuego.
REMO Pala larga para mover un bote.
SAPO Anfibio parecido a la rana, de piel rugosa.
ISLA Tierra rodeada de agua por todas partes.
TAZA Recipiente con asa para tomar café o té.
PERRO Animal doméstico que ladra.
LIBRO Conjunto de hojas impresas y encuadernadas para leer.
PLAYA Orilla del mar cubierta de arena.
RELOJ Aparato que marca la hora.
NIEVE Agua helada que cae del cielo en copos blancos.
QUESO Alimento que se hace cuajando la leche.
PIANO Instrumento musical de teclas blancas y negras.
TIGRE Gran felino anaranjado con rayas negras.
SILLA Asiento con respaldo para una persona.
GLOBO Bolsa de goma que se infla con aire.
FUEGO Calor y luz que salen de algo que se quema.
BARCO Vehículo grande que navega sobre el agua.
ARBOL:ÁRBOL Planta grande con tronco, ramas y hojas.
LLAVE Pieza de metal que abre y cierra una cerradura.
CEBRA Animal africano parecido al caballo, con rayas blancas y negras.
NARIZ Parte de la cara que sirve para oler.
LECHE Líquido blanco que dan las vacas.
HUEVO Lo que ponen las gallinas y de donde puede nacer un pollito.
CAMPO Terreno fuera de la ciudad, con cultivos y animales.
OTOÑO Estación del año en que se caen las hojas.
ESPEJO Superficie que refleja la imagen de lo que tiene delante.
PELOTA Objeto redondo que se usa para jugar.
TOMATE Fruto rojo que se usa en ensaladas y salsas.
VERANO La estación más calurosa del año.
CAMINO Franja de tierra por donde se va de un lugar a otro.
HELADO Postre frío y cremoso.
TIJERA Herramienta de dos hojas cruzadas para cortar.
PIRATA Ladrón que asalta barcos en el mar.
ABUELO El padre de tu padre o de tu madre.
CEREZA Fruta pequeña, roja y redonda, con hueso.
MONEDA Pieza de metal que sirve como dinero.
CORONA Adorno que llevan los reyes en la cabeza.
ESTUFA Aparato que calienta una habitación.
CUERDA Hilos trenzados que sirven para atar.
DIENTE Pieza dura de la boca que sirve para morder.
PALOMA Ave de las plazas, símbolo de la paz.
GRANJA Finca con animales y cultivos.
VOLCAN:VOLCÁN Montaña que puede expulsar lava.
JIRAFA El animal de cuello más largo.
NEVERA Aparato que mantiene fríos los alimentos.
CABALLO Animal que se monta y relincha.
MANZANA Fruta roja, verde o amarilla que se come con cáscara.
MOCHILA Bolsa que se lleva colgada en la espalda.
NARANJA Fruta cítrica de la que se hace un jugo muy común.
VENTANA Abertura en la pared para que entren la luz y el aire.
TORTUGA Reptil lento que lleva su caparazón a cuestas.
BALLENA El animal más grande del mundo; vive en el mar.
BANDERA Tela con colores y figuras que representa a un país.
CUCHARA Cubierto con el que se toma la sopa.
HORMIGA Insecto pequeño que vive en colonias y trabaja sin parar.
PLANETA Cuerpo celeste que gira alrededor de una estrella.
PALMERA Árbol alto de las playas, con grandes hojas en la copa.
CAMELLO Animal del desierto con dos jorobas.
GALLETA Masa dulce, pequeña y crujiente, horneada.
LECHUGA Verdura de hojas verdes para ensaladas.
ESCUELA Lugar adonde van los niños a aprender.
TIBURON:TIBURÓN Pez grande con dientes muy afilados.
CANGURO Animal australiano que salta y lleva a su cría en una bolsa.
BOMBERO Persona que apaga incendios.
CARTERO Persona que reparte las cartas.
ESTRELLA Punto de luz que brilla en el cielo de noche.
CASTILLO Fortaleza con torres donde vivían los reyes.
DESIERTO Lugar seco y arenoso donde casi no llueve.
TELEFONO:TELÉFONO Aparato para hablar con alguien que está lejos.
MARTILLO Herramienta para clavar clavos.
GUITARRA Instrumento de seis cuerdas que se rasguea.
ALMOHADA Cojín donde apoyas la cabeza para dormir.
ELEFANTE Animal enorme con trompa y colmillos.
MARIPOSA Insecto de alas de colores que antes fue oruga.
PARAGUAS Objeto que te protege de la lluvia.
CUADERNO Libro de hojas en blanco para escribir.
HOSPITAL Lugar donde se atiende a los enfermos.
PANADERO Persona que hace el pan.
TORMENTA Lluvia fuerte con truenos y relámpagos.
MEDICINA Lo que se toma para curarse de una enfermedad.
CUCHILLO Cubierto con filo para cortar.
SEMAFORO:SEMÁFORO Aparato de luces que ordena el tránsito.
MOSQUITO Insecto pequeño que zumba y pica.
COCINERO Persona que prepara la comida.
FANTASMA Espíritu que, en los cuentos, asusta en las casas viejas.
PINGUINO:PINGÜINO Ave blanca y negra que no vuela y vive en el frío.
CHOCOLATE Dulce hecho con cacao.
ZAPATILLA Calzado deportivo y cómodo.
SERPIENTE Reptil sin patas que se arrastra.
PRIMAVERA Estación del año en que florecen las plantas.
LAGARTIJA Reptil pequeño que toma el sol en las piedras.
BICICLETA Vehículo de dos ruedas que se mueve con pedales.
TELEVISOR Aparato para ver programas y películas.
ZANAHORIA Verdura naranja que comen los conejos.
CARRETERA Camino ancho y pavimentado para autos.
AUTOMOVIL:AUTOMÓVIL Vehículo de cuatro ruedas con motor.
COCODRILO Reptil de río con una mandíbula enorme.
ESQUELETO Conjunto de todos los huesos del cuerpo.
TERREMOTO Movimiento fuerte y repentino de la tierra.
ENFERMERA Persona que cuida a los enfermos en el hospital.
JARDINERO Persona que cuida las plantas de un jardín.
BOLIGRAFO:BOLÍGRAFO Utensilio con tinta para escribir.
CUCARACHA Insecto oscuro y rápido que se esconde en las cocinas.
PERIODICO:PERIÓDICO Publicación diaria con las noticias.
PASAPORTE Documento para viajar a otros países.
PELUQUERO Persona que corta el pelo.
MURCIELAGO:MURCIÉLAGO Mamífero que vuela de noche y duerme colgado.
CUMPLEAÑOS Día en que se celebra que naciste.
MAQUILLAJE Productos para pintarse la cara.
AEROPUERTO Lugar donde despegan y aterrizan los aviones.
BIBLIOTECA Lugar con muchos libros para leer o pedir prestados.
ASTRONAUTA Persona que viaja al espacio.
MEDIANOCHE Las doce de la noche.
SUPERHEROE:SUPERHÉROE Personaje con poderes que salva a la gente.
FOTOGRAFIA:FOTOGRAFÍA Imagen tomada con una cámara.
PANTALONES Prenda que cubre cada pierna por separado.
CARPINTERO Persona que trabaja la madera.
ABECEDARIO Todas las letras en orden.
SACAPUNTAS Utensilio para afilar lápices.
DINOSAURIO Reptil gigante que vivió hace millones de años.
CALENDARIO Hoja o libro con los días y meses del año.
MICROONDAS Aparato que calienta la comida en poco tiempo.
CAMPAMENTO Lugar al aire libre donde se acampa con carpas.
BALONCESTO Deporte en que se encesta un balón en un aro.
CEMENTERIO Lugar donde se entierra a los muertos.
COMPUTADOR Máquina para trabajar, jugar y navegar por internet.
HELICOPTERO:HELICÓPTERO Aparato que vuela con unas hélices en el techo.
MANTEQUILLA Grasa de la leche que se unta en el pan.
HAMBURGUESA Pan redondo con carne molida en medio.
RINOCERONTE Animal grande con uno o dos cuernos sobre la nariz.
VETERINARIO Médico de los animales.
UNIVERSIDAD Lugar donde se estudia una carrera después del colegio.
RESTAURANTE Lugar donde se paga por comer.
CALEFACCION:CALEFACCIÓN Sistema que calienta una casa entera.
FERROCARRIL Camino de rieles por donde van los trenes.
ADIVINANZAS Acertijos que hay que resolver.
MATEMATICAS:MATEMÁTICAS Ciencia de los números y las formas.
DESPERTADOR Reloj que suena para despertarte.
ANIVERSARIO Día en que se cumplen años de algo importante.
INVERNADERO Lugar cubierto donde se cultivan plantas protegidas del frío.
GUARDARROPA Lugar donde se guardan los abrigos.
CONSTRUCTOR Persona o empresa que levanta edificios.
MICROSCOPIO Aparato para ver cosas diminutas.
INSTRUMENTO Objeto con el que se toca música.
ESPECTACULO:ESPECTÁCULO Función de teatro, circo o música para un público.
CUMPLEAÑERO Persona que está de cumpleaños.
`);
