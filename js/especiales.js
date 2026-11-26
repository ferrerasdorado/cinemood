// CineMood · Especiales
// (Parte de index.html; se carga como script clásico: todo comparte el mismo ámbito global.)

    // ══ ESPECIALES NUEVOS ══
    const XMEN_SAGA = [
      {n:1,imp:'c',tmdb_id:36657,era:'Un futuro cercano',eraCap:'línea temporal original',rel:[[2,'c','La historia sigue en «X-Men 2».'],[7,'a','Este reparto vuelve en «Días del futuro pasado».']],t:'X-Men',y:2000,tipo:'movie',tag:'La que empezó todo',p:'Rogue y Lobezno llegan a la escuela de Xavier mientras Magneto prepara su plan contra la humanidad. Presenta a los X-Men que vuelven en «Vengadores: Doomsday».'},
      {n:2,imp:'c',tmdb_id:36658,era:'Un futuro cercano',rel:[[3,'c','La trilogía se cierra en «La decisión final».']],t:'X-Men 2',y:2003,tipo:'movie',tag:'La mejor de la trilogía',p:'Un militar obsesionado con los mutantes obliga a Xavier y Magneto a unir fuerzas. Siembra el regreso de Jean Grey y el pasado de Lobezno.'},
      {n:3,imp:'i',tmdb_id:36668,era:'Un futuro cercano',rel:[[6,'c','Lobezno sigue en «Lobezno inmortal».'],[7,'c','El futuro sombrío de «Días del futuro pasado» viene de aquí.']],t:'X-Men: La decisión final',y:2006,tipo:'movie',tag:'Cierre de la trilogía',p:'Una «cura» para la mutación divide a los mutantes y Jean Grey regresa como Fénix. Floja, pero cierra la trilogía y prepara «Días del futuro pasado».'},
      {n:4,imp:'o',tmdb_id:2080,era:'1845–1979',rel:[[1,'i','Explica el pasado de Lobezno antes de llegar a la escuela de Xavier.']],t:'X-Men orígenes: Lobezno',y:2009,tipo:'movie',tag:'Precuela de Logan',p:'El pasado de Lobezno, su hermano Víctor y el programa Arma X que le dio el adamantium. Prescindible: lo esencial ya se intuye en la trilogía.'},
      {n:5,imp:'c',tmdb_id:49538,era:'1962',eraCap:'los X-Men jóvenes',rel:[[7,'c','Los jóvenes Charles y Erik vuelven en «Días del futuro pasado».']],t:'X-Men: Primera generación',y:2011,tipo:'movie',tag:'Los orígenes de Charles y Erik',p:'Charles y Erik se conocen y forman a los primeros mutantes en plena crisis de los misiles de Cuba. Arranca el reparto joven (McAvoy, Fassbender, Lawrence).'},
      {n:6,imp:'o',tmdb_id:76170,era:'Tras «La decisión final»',rel:[[7,'i','Su escena poscréditos lleva directamente a «Días del futuro pasado».']],t:'Lobezno inmortal',y:2013,tipo:'movie',tag:'Logan en Japón',p:'Lobezno, atormentado por lo ocurrido, viaja a Japón y pierde su capacidad de curarse. Historia propia; solo su poscréditos conecta con la saga.'},
      {n:7,imp:'c',tmdb_id:127585,era:'1973 y 2023',eraCap:'la historia se reescribe',rel:[[9,'c','La nueva línea temporal sigue en «Apocalipsis».'],[10,'a','Lobezno y Xavier reaparecen, ya mayores, en «Logan».']],t:'X-Men: Días del futuro pasado',y:2014,tipo:'movie',tag:'El gran puente',p:'Lobezno viaja al pasado para evitar un futuro apocalíptico: une a los dos repartos y reescribe la línea temporal. La más importante de la saga.'},
      {n:8,imp:'o',tmdb_id:293660,era:'2016',rel:[[11,'c','La historia de Wade sigue en «Deadpool 2».']],t:'Deadpool',y:2016,tipo:'movie',tag:'Comedia gamberra',p:'Un mercenario se somete a un experimento que lo deja desfigurado e inmortal, y rompe la cuarta pared sin parar. Spin-off: no hace falta para seguir a los X-Men.'},
      {n:9,imp:'i',tmdb_id:246655,era:'1983',rel:[[12,'c','La etapa joven se cierra en «Fénix Oscura».']],t:'X-Men: Apocalipsis',y:2016,tipo:'movie',tag:'Línea temporal nueva',p:'El primer mutante despierta tras milenios y los jóvenes Cíclope, Jean y Tormenta se unen al equipo.'},
      {n:10,imp:'c',tmdb_id:263115,era:'2029',eraCap:'el final de Lobezno',rel:[[13,'i','«Deadpool y Lobezno» juega con el final de este Lobezno.']],t:'Logan',y:2017,tipo:'movie',tag:'La despedida',p:'Un Logan envejecido cuida de un Xavier enfermo y protege a una niña con sus mismos poderes. Un western crepuscular y la mejor de la saga.'},
      {n:11,imp:'o',tmdb_id:383498,era:'2018',rel:[[13,'c','«Deadpool y Lobezno» es su continuación directa.']],t:'Deadpool 2',y:2018,tipo:'movie',tag:'Más Deadpool',p:'Deadpool forma su propio equipo para proteger a un chico mutante de un soldado que viene del futuro.'},
      {n:12,imp:'o',tmdb_id:320288,era:'1992',rel:[],t:'X-Men: Fénix Oscura',y:2019,tipo:'movie',tag:'Cierre de la etapa joven',p:'Jean Grey absorbe una fuerza cósmica que la vuelve imparable y divide al equipo. Cierra la etapa joven, pero es de las más flojas.'},
      {n:13,imp:'i',tmdb_id:533535,era:'2024',eraCap:'el salto al UCM',rel:[[null,'i','Los X-Men de Fox vuelven en «Vengadores: Doomsday» (diciembre de 2026).']],t:'Deadpool y Lobezno',y:2024,tipo:'movie',tag:'El puente con el UCM',p:'La AVT recluta a Deadpool, que arrastra a un Lobezno de otra realidad en una aventura multiversal. Lleva a los mutantes de Fox al Universo Marvel.'}
    ];

    const FAST_FURIOUS = [
      {n:1,era:'Los inicios',nota:'',t:'A todo gas',y:2001,tipo:'movie',tag:'El origen',p:'Un policía infiltrado entra en el mundo de las carreras ilegales de Los Ángeles y en la familia de Dom Toretto.'},
      {n:2,nota:'',t:'2 Fast 2 Furious',y:2003,tipo:'movie',tag:'Brian en Miami',p:'Brian O’Conner, ya fuera de la policía, colabora con aduanas para atrapar a un narcotraficante en Miami.'},
      {n:3,nota:'',t:'Fast & Furious: Aún más rápido',y:2009,tipo:'movie',tag:'Vuelve la familia',p:'Dom y Brian se reencuentran para vengar una muerte y atrapar a un narco en la frontera con México.'},
      {n:4,era:'La era de los atracos',nota:'',t:'Fast & Furious 5',y:2011,tipo:'movie',tag:'El salto al cine de atracos',p:'La saga se convierte en cine de golpes: un robo gigante en Río de Janeiro con Hobbs pisándoles los talones.'},
      {n:5,nota:'',t:'Fast & Furious 6',y:2013,tipo:'movie',tag:'Contra Shaw',p:'La familia ayuda a Hobbs a desmantelar una banda de mercenarios a cambio de borrar su historial.'},
      {n:6,era:'Tokio',nota:'se estrenó tercera, va después de la sexta',t:'A todo gas: Tokyo Race',y:2006,tipo:'movie',tag:'La trampa cronológica',p:'Un chico estadounidense descubre el drift en Tokio. Se estrenó en 2006, pero sucede aquí: su final enlaza con la séptima.'},
      {n:7,era:'La guerra con Shaw',nota:'',t:'Fast & Furious 7',y:2015,tipo:'movie',tag:'La despedida de Paul Walker',p:'Deckard Shaw busca venganza contra la familia. Cierra con un homenaje emotivo a Paul Walker.'},
      {n:8,nota:'',t:'Fast & Furious 8',y:2017,tipo:'movie',tag:'Dom cambia de bando',p:'Una ciberterrorista obliga a Dom a traicionar a su propia familia.'},
      {n:9,nota:'spin-off, opcional',t:'Fast & Furious: Hobbs & Shaw',y:2019,tipo:'movie',tag:'Spin-off',p:'Hobbs y Shaw, enemigos íntimos, se alían para frenar a un soldado mejorado genéticamente.'},
      {n:10,era:'El final de la saga',nota:'',t:'Fast & Furious 9',y:2021,tipo:'movie',tag:'El hermano de Dom',p:'Aparece Jakob, el hermano olvidado de Dom, al servicio de una conspiración internacional.'},
      {n:11,nota:'',t:'Fast & Furious X',y:2023,tipo:'movie',tag:'Primera parte del final',p:'El hijo de un antiguo enemigo vuelve a por la familia. Arranca el desenlace de la saga.'}
    ];

    const TIERRA_MEDIA = [
      {n:1,era:'Segunda Edad',nota:'',t:'El Señor de los Anillos: Los anillos de poder',y:2022,tipo:'tv',tag:'Precuela',p:'La forja de los anillos y el regreso de Sauron, miles de años antes de Bilbo y Frodo.'},
      {n:2,era:'2758 T.E.',eraCap:'Tercera Edad',nota:'unos 180 años antes de El Hobbit',t:'El Señor de los Anillos: La guerra de los Rohirrim',y:2024,tipo:'movie',tag:'Anime',p:'Película de animación sobre Helm Mano de Hierro, el legendario rey de Rohan.'},
      {n:3,era:'2941 T.E.',nota:'',t:'El Hobbit: Un viaje inesperado',y:2012,tipo:'movie',tag:'Comienza la aventura',p:'Bilbo se une a trece enanos y a Gandalf para recuperar el reino perdido de Erebor.'},
      {n:4,nota:'',t:'El Hobbit: La desolación de Smaug',y:2013,tipo:'movie',tag:'El dragón',p:'La compañía llega a la Montaña Solitaria, donde duerme el dragón Smaug.'},
      {n:5,nota:'',t:'El Hobbit: La batalla de los Cinco Ejércitos',y:2014,tipo:'movie',tag:'Cierre de la trilogía',p:'Enanos, elfos, hombres y orcos chocan por el tesoro de Erebor.'},
      {n:6,era:'3009 T.E.',nota:'próximo estreno: 15 de diciembre de 2027',t:'El Señor de los Anillos: La caza de Gollum',y:2027,tipo:'movie',tmdb_id:1090869,tag:'Próximamente · 15 de diciembre de 2027',p:'Aragorn persigue a Gollum para averiguar qué sabe del Anillo, años antes de «La comunidad del anillo». Dirige y vuelve a interpretar a Gollum Andy Serkis.'},
      {n:7,era:'3018 T.E.',nota:'',t:'El Señor de los Anillos: La comunidad del anillo',y:2001,tipo:'movie',tag:'Imprescindible',p:'Frodo hereda el Anillo Único y parte con ocho compañeros para destruirlo.'},
      {n:8,era:'3019 T.E.',nota:'',t:'El Señor de los Anillos: Las dos torres',y:2002,tipo:'movie',tag:'La comunidad, dividida',p:'Los caminos se separan: Frodo y Sam hacia Mordor, el resto hacia la guerra de Rohan.'},
      {n:9,nota:'',t:'El Señor de los Anillos: El retorno del Rey',y:2003,tipo:'movie',tag:'11 Óscar',p:'La batalla por la Tierra Media llega a su final. Ganó los 11 Óscar a los que estaba nominada.'}
    ];

    const HARRY_POTTER = [
      {n:1,era:'1926',nota:'',t:'Animales fantásticos y dónde encontrarlos',y:2016,tipo:'movie',tag:'Precuela',p:'Newt Scamander llega a Nueva York con una maleta llena de criaturas mágicas que se escapan.'},
      {n:2,era:'1927',nota:'',t:'Animales fantásticos: Los crímenes de Grindelwald',y:2018,tipo:'movie',tag:'El ascenso de Grindelwald',p:'Un joven Dumbledore recluta a Newt para frenar al mago oscuro Grindelwald.'},
      {n:3,era:'1932',nota:'',t:'Animales fantásticos: Los secretos de Dumbledore',y:2022,tipo:'movie',tag:'Cierre de la precuela',p:'Dumbledore y Newt intentan impedir que Grindelwald se haga con el poder del mundo mágico.'},
      {n:4,era:'1991',nota:'',t:'Harry Potter y la piedra filosofal',y:2001,tipo:'movie',tag:'Primer año',p:'Harry descubre que es mago y empieza su primer curso en Hogwarts.'},
      {n:5,era:'1992',nota:'',t:'Harry Potter y la cámara secreta',y:2002,tipo:'movie',tag:'Segundo año',p:'Alguien abre la Cámara de los Secretos y los alumnos empiezan a aparecer petrificados.'},
      {n:6,era:'1993',nota:'',t:'Harry Potter y el prisionero de Azkaban',y:2004,tipo:'movie',tag:'Tercer año',p:'Un peligroso preso escapa de Azkaban y parece ir a por Harry. La más querida por muchos fans.'},
      {n:7,era:'1994',nota:'',t:'Harry Potter y el cáliz de fuego',y:2005,tipo:'movie',tag:'Cuarto año',p:'Harry es elegido para el Torneo de los Tres Magos y Voldemort regresa.'},
      {n:8,era:'1995',nota:'',t:'Harry Potter y la Orden del Fénix',y:2007,tipo:'movie',tag:'Quinto año',p:'El Ministerio niega el regreso de Voldemort y Harry forma un grupo secreto de defensa.'},
      {n:9,era:'1996',nota:'',t:'Harry Potter y el misterio del príncipe',y:2009,tipo:'movie',tag:'Sexto año',p:'Dumbledore prepara a Harry para la batalla final explorando el pasado de Voldemort.'},
      {n:10,era:'1997',nota:'',t:'Harry Potter y las Reliquias de la Muerte - Parte 1',y:2010,tipo:'movie',tag:'La búsqueda',p:'Harry, Ron y Hermione abandonan Hogwarts para buscar los horrocruxes.'},
      {n:11,era:'1998',nota:'con epílogo 19 años después',t:'Harry Potter y las Reliquias de la Muerte - Parte 2',y:2011,tipo:'movie',tag:'La batalla de Hogwarts',p:'El enfrentamiento final entre Harry y Voldemort.'},
      {n:12,era:'Nueva adaptación',nota:'serie de HBO · se estrena el 25 de diciembre de 2026',t:'Harry Potter',y:2026,tipo:'tv',tmdb_id:224377,tag:'Próximamente · 25 de diciembre de 2026',p:'Nueva adaptación de los libros en forma de serie de HBO, con una temporada por libro y un reparto nuevo. Vuelve a contar la historia desde el principio.'}
    ];

    const MONSTERVERSE = [
      {n:1,era:'1973',nota:'con prólogo en 1944',t:'Kong: La Isla Calavera',y:2017,tipo:'movie',tag:'Presenta a Kong',p:'Una expedición militar y científica llega a una isla inexplorada donde reina un simio gigante.'},
      {n:2,era:'2014',nota:'',t:'Godzilla',y:2014,tipo:'movie',tag:'Presenta a Godzilla',p:'Godzilla despierta para enfrentarse a dos criaturas que amenazan a la humanidad.'},
      {n:3,era:'2015',nota:'con flashbacks a los años 50',t:'Monarch: El legado de los monstruos',y:2023,tipo:'tv',tag:'Serie',p:'La historia de la organización Monarch a través de dos generaciones de una misma familia.'},
      {n:4,era:'2019',nota:'',t:'Godzilla: Rey de los monstruos',y:2019,tipo:'movie',tag:'Los titanes despiertan',p:'Monarch se enfrenta a la aparición de titanes por todo el planeta, con Ghidorah a la cabeza.'},
      {n:5,era:'2024',nota:'',t:'Godzilla vs. Kong',y:2021,tipo:'movie',tag:'El gran choque',p:'Los dos titanes se enfrentan mientras se descubre el origen de su mundo bajo tierra.'},
      {n:6,nota:'unos años más tarde',t:'Godzilla y Kong: El nuevo imperio',y:2024,tipo:'movie',tag:'Alianza',p:'Godzilla y Kong unen fuerzas contra una amenaza oculta en la Tierra Hueca.'}
    ];

    const JOHN_WICK = [
      {n:1,era:'1975',nota:'',t:'The Continental',y:2023,tipo:'tv',tag:'Miniserie precuela',p:'Un joven Winston Scott toma el control del hotel Continental en la Nueva York de los 70.'},
      {n:2,era:'Presente',nota:'',t:'John Wick',y:2014,tipo:'movie',tag:'Imprescindible',p:'Un exasesino retirado vuelve a las andadas cuando unos matones le roban el coche y matan a su perro.'},
      {n:3,nota:'poco después',t:'John Wick: Pacto de sangre',y:2017,tipo:'movie',tag:'El mundo se amplía',p:'Una vieja deuda obliga a John a aceptar un encargo en Roma que lo convierte en objetivo.'},
      {n:4,nota:'justo después',t:'John Wick: Parabellum',y:2019,tipo:'movie',tag:'Excomulgado',p:'Con una recompensa sobre su cabeza, John huye por medio mundo de todos los asesinos.'},
      {n:5,nota:'entre Parabellum y la cuarta',t:'Ballerina',y:2025,tipo:'movie',tag:'Spin-off',p:'Una asesina formada por la Ruska Roma busca venganza por la muerte de su padre.'},
      {n:6,nota:'',t:'John Wick 4',y:2023,tipo:'movie',tag:'El final',p:'John se enfrenta a la Mesa Alta para conseguir su libertad, de Osaka a París.'}
    ];

    const FINCHER = [
      {n:1,t:'Alien 3',y:1992,tipo:'movie',tag:'Debut accidentado',p:'Su primera película, rodada entre peleas con el estudio. Ripley aterriza en un planeta prisión.'},
      {n:2,t:'Seven',y:1995,tipo:'movie',tag:'La que lo cambió todo',p:'Dos detectives persiguen a un asesino que mata según los siete pecados capitales. Final inolvidable.'},
      {n:3,t:'The Game',y:1997,tipo:'movie',tag:'Thriller de puzle',p:'Un millonario recibe un regalo de cumpleaños: un juego que empieza a apoderarse de su vida.'},
      {n:4,t:'El club de la lucha',y:1999,tipo:'movie',tag:'Culto absoluto',p:'Un oficinista con insomnio y un vendedor de jabón fundan un club de peleas clandestino.'},
      {n:5,t:'La habitación del pánico',y:2002,tipo:'movie',tag:'Encierro',p:'Una madre y su hija se refugian en una habitación blindada mientras unos ladrones asaltan su casa.'},
      {n:6,t:'Zodiac',y:2007,tipo:'movie',tag:'Obsesión',p:'La caza real del asesino del Zodiaco, contada desde la obsesión de quienes lo persiguieron durante años.'},
      {n:7,t:'El curioso caso de Benjamin Button',y:2008,tipo:'movie',tag:'Fábula',p:'Un hombre nace anciano y rejuvenece con los años. Su película más romántica.'},
      {n:8,t:'La red social',y:2010,tipo:'movie',tag:'Su obra maestra para muchos',p:'El nacimiento de Facebook y las traiciones que lo acompañaron, con guion de Aaron Sorkin.'},
      {n:9,t:'Millennium: Los hombres que no amaban a las mujeres',y:2011,tipo:'movie',tag:'Versión americana',p:'Un periodista y una hacker investigan una desaparición de hace cuarenta años.'},
      {n:10,t:'Perdida',y:2014,tipo:'movie',tag:'Thriller de pareja',p:'Una mujer desaparece el día de su aniversario y todas las miradas apuntan a su marido.'},
      {n:11,t:'Mindhunter',y:2017,tipo:'tv',tag:'Serie',p:'Dos agentes del FBI entrevistan a asesinos en serie en los años 70 para entender cómo piensan.'},
      {n:12,t:'Mank',y:2020,tipo:'movie',tag:'Homenaje al cine clásico',p:'En blanco y negro, la historia del guionista de “Ciudadano Kane”.'},
      {n:13,t:'El asesino',y:2023,tipo:'movie',tag:'Frialdad pura',p:'Un asesino a sueldo metódico ve cómo todo se tuerce tras fallar un encargo.'}
    ];

    const VILLENEUVE = [
      {n:1,t:'Polytechnique',y:2009,tipo:'movie',tag:'Etapa canadiense',p:'En blanco y negro, la reconstrucción de la masacre de la Escuela Politécnica de Montreal en 1989.'},
      {n:2,t:'Incendies',y:2010,tipo:'movie',tag:'La que lo dio a conocer',p:'Dos hermanos viajan a Oriente Próximo para cumplir la última voluntad de su madre y descubrir su pasado.'},
      {n:3,t:'Prisioneros',y:2013,tipo:'movie',tag:'Thriller asfixiante',p:'Un padre desesperado se toma la justicia por su mano cuando desaparece su hija.'},
      {n:4,t:'Enemy',y:2013,tipo:'movie',tag:'Enigma',p:'Un profesor descubre a un actor idéntico a él. Una película que pide segundo visionado.'},
      {n:5,t:'Sicario',y:2015,tipo:'movie',tag:'Narcotráfico',p:'Una agente del FBI entra en una operación secreta contra los cárteles en la frontera con México.'},
      {n:6,t:'La llegada',y:2016,tipo:'movie',tag:'Ciencia ficción adulta',p:'Una lingüista intenta comunicarse con unos extraterrestres recién llegados a la Tierra.'},
      {n:7,t:'Blade Runner 2049',y:2017,tipo:'movie',tag:'Secuela a la altura',p:'Treinta años después, un nuevo blade runner descubre un secreto que puede cambiarlo todo.'},
      {n:8,t:'Dune',y:2021,tipo:'movie',tag:'Épica',p:'Paul Atreides llega a Arrakis, el planeta desierto del que depende todo el universo.'},
      {n:9,t:'Dune: Parte dos',y:2024,tipo:'movie',tag:'Culminación',p:'Paul se une a los Fremen para vengar a su familia y cambiar el destino de Arrakis.'}
    ];

    const HITCHCOCK = [
      {n:1,t:'39 escalones',y:1935,tipo:'movie',tag:'Etapa británica',p:'Un hombre acusado de un crimen que no cometió huye mientras desenmascara una red de espías.'},
      {n:2,t:'Alarma en el expreso',y:1938,tipo:'movie',tag:'Misterio en un tren',p:'Una anciana desaparece en pleno viaje en tren y nadie, salvo una joven, recuerda haberla visto.'},
      {n:3,t:'Rebeca',y:1940,tipo:'movie',tag:'Óscar a la mejor película',p:'Una joven se casa con un viudo rico y vive a la sombra de su difunta primera esposa.'},
      {n:4,t:'La sombra de una duda',y:1943,tipo:'movie',tag:'Su favorita',p:'Una chica empieza a sospechar que su querido tío es un asesino.'},
      {n:5,t:'Encadenados',y:1946,tipo:'movie',tag:'Espías y romance',p:'Una mujer se infiltra entre nazis en Brasil por encargo de un agente del que está enamorada.'},
      {n:6,t:'La soga',y:1948,tipo:'movie',tag:'Falso plano secuencia',p:'Dos jóvenes celebran una fiesta con el cadáver de su víctima escondido en la sala.'},
      {n:7,t:'Extraños en un tren',y:1951,tipo:'movie',tag:'Intercambio de crímenes',p:'Dos desconocidos hablan de intercambiar asesinatos. Uno de ellos se lo toma en serio.'},
      {n:8,t:'Crimen perfecto',y:1954,tipo:'movie',tag:'Juego de ingenio',p:'Un marido planea el asesinato perfecto de su esposa, pero algo sale mal.'},
      {n:9,t:'La ventana indiscreta',y:1954,tipo:'movie',tag:'Voyeurismo',p:'Un fotógrafo escayolado espía a sus vecinos y cree haber presenciado un asesinato.'},
      {n:10,t:'Vértigo',y:1958,tipo:'movie',tag:'Obsesión',p:'Un detective con vértigo se obsesiona con una mujer misteriosa. Considerada una de las mejores películas de la historia.'},
      {n:11,t:'Con la muerte en los talones',y:1959,tipo:'movie',tag:'Aventura de espías',p:'Un publicista confundido con un espía huye por todo Estados Unidos. La avioneta, icónica.'},
      {n:12,t:'Psicosis',y:1960,tipo:'movie',tag:'Terror que lo cambió todo',p:'Una secretaria que ha robado dinero se detiene en un motel regentado por un joven extraño.'},
      {n:13,t:'Los pájaros',y:1963,tipo:'movie',tag:'Terror inexplicable',p:'Las aves de un pueblo costero empiezan a atacar a la gente sin motivo aparente.'},
      {n:14,t:'Marnie, la ladrona',y:1964,tipo:'movie',tag:'Psicológico',p:'Un hombre se casa con una ladrona compulsiva e intenta descubrir el trauma que la mueve.'},
      {n:15,t:'Frenesí',y:1972,tipo:'movie',tag:'Vuelta a Londres',p:'Un hombre inocente es acusado de los crímenes del “asesino de la corbata”.'}
    ];

    const VIAJES_TIEMPO = [
      {n:1,t:'El tiempo en sus manos',y:1960,tipo:'movie',tag:'Clásico',p:'Un inventor victoriano construye una máquina del tiempo y viaja al año 802.701.'},
      {n:2,t:'Regreso al futuro',y:1985,tipo:'movie',tag:'La gran referencia',p:'Marty McFly viaja a 1955 y pone en peligro su propia existencia.'},
      {n:3,t:'Regreso al futuro: Parte II',y:1989,tipo:'movie',tag:'Al futuro',p:'Marty y Doc viajan a 2015 y desatan un presente alternativo.'},
      {n:4,t:'Regreso al futuro: Parte III',y:1990,tipo:'movie',tag:'Al Oeste',p:'Marty viaja a 1885 para rescatar a Doc en pleno Lejano Oeste.'},
      {n:5,t:'Atrapado en el tiempo',y:1993,tipo:'movie',tag:'Bucle temporal',p:'Un hombre del tiempo revive una y otra vez el mismo Día de la Marmota.'},
      {n:6,t:'Doce monos',y:1995,tipo:'movie',tag:'Distopía',p:'Un preso del futuro es enviado al pasado para averiguar el origen de un virus que arrasó la humanidad.'},
      {n:7,t:'Primer',y:2004,tipo:'movie',tag:'La más compleja',p:'Dos ingenieros inventan por accidente una máquina del tiempo. Rodada con 7.000 dólares.'},
      {n:8,t:'El efecto mariposa',y:2004,tipo:'movie',tag:'Consecuencias',p:'Un joven descubre que puede volver a su pasado y cambiarlo, pero cada cambio empeora el presente.'},
      {n:9,t:'Los cronocrímenes',y:2007,tipo:'movie',tag:'Joya española',p:'Un hombre queda atrapado en un bucle temporal de una sola tarde. Dirigida por Nacho Vigalondo.'},
      {n:10,t:'Código fuente',y:2011,tipo:'movie',tag:'Ocho minutos',p:'Un soldado revive los últimos ocho minutos de un pasajero para descubrir quién puso una bomba en un tren.'},
      {n:11,t:'Looper',y:2012,tipo:'movie',tag:'Asesinos del futuro',p:'Un sicario mata a víctimas enviadas desde el futuro, hasta que le mandan a su yo mayor.'},
      {n:12,t:'Cuestión de tiempo',y:2013,tipo:'movie',tag:'Romántica',p:'Un joven descubre que puede viajar a su propio pasado y lo usa para enamorar a una chica.'},
      {n:13,t:'Al filo del mañana',y:2014,tipo:'movie',tag:'Bucle de acción',p:'Un soldado muere en combate y vuelve a despertar el día anterior, una y otra vez.'},
      {n:14,t:'Predestination',y:2014,tipo:'movie',tag:'Paradoja',p:'Un agente temporal persigue a un terrorista en una historia que se muerde la cola.'},
      {n:15,t:'El ministerio del tiempo',y:2015,tipo:'tv',tag:'Serie española',p:'Una institución secreta protege la historia de España de quienes intentan cambiarla.'},
      {n:16,t:'Dark',y:2017,tipo:'tv',tag:'Serie alemana',p:'La desaparición de unos niños revela un ciclo temporal de 33 años en un pueblo alemán.'},
      {n:17,t:'Muñeca rusa',y:2019,tipo:'tv',tag:'Bucle con humor',p:'Una mujer muere una y otra vez en la noche de su cumpleaños y vuelve siempre a la misma fiesta.'},
      {n:18,t:'Tenet',y:2020,tipo:'movie',tag:'Tiempo invertido',p:'Un agente aprende a moverse en un mundo donde algunos objetos viajan hacia atrás en el tiempo.'},
      {n:19,t:'Palm Springs',y:2020,tipo:'movie',tag:'Comedia en bucle',p:'Dos invitados de una boda quedan atrapados en el mismo día y deciden disfrutarlo.'}
    ];

    const ATRACOS = [
      {n:1,t:'Rififí',y:1955,tipo:'movie',tag:'El origen del género',p:'Una banda planea el robo de una joyería en París. Su secuencia del golpe, en silencio total, es legendaria.'},
      {n:2,t:'Atraco a las tres',y:1962,tipo:'movie',tag:'Comedia española',p:'Los empleados de una sucursal bancaria deciden atracar su propio banco.'},
      {n:3,t:'Un trabajo en Italia',y:1969,tipo:'movie',tag:'Clásico británico',p:'Un ladrón organiza un robo de oro en Turín usando el tráfico de la ciudad. Con los Mini más famosos del cine.'},
      {n:4,t:'Tarde de perros',y:1975,tipo:'movie',tag:'Atraco real',p:'Un atraco a un banco de Brooklyn se convierte en un circo mediático. Basada en hechos reales.'},
      {n:5,t:'Reservoir Dogs',y:1992,tipo:'movie',tag:'El atraco que no vemos',p:'Tras un golpe fallido, los atracadores sospechan que hay un traidor entre ellos.'},
      {n:6,t:'Heat',y:1995,tipo:'movie',tag:'La cumbre del género',p:'Un ladrón profesional y el policía que lo persigue, frente a frente. De Niro y Pacino.'},
      {n:7,t:'Ocean\'s Eleven',y:2001,tipo:'movie',tag:'Elegancia',p:'Danny Ocean reúne a once especialistas para robar tres casinos de Las Vegas a la vez.'},
      {n:8,t:'Plan oculto',y:2006,tipo:'movie',tag:'Golpe perfecto',p:'Un atraco a un banco de Manhattan que esconde mucho más de lo que parece.'},
      {n:9,t:'The Bank Job',y:2008,tipo:'movie',tag:'Hechos reales',p:'Una banda de poca monta asalta las cajas de seguridad de un banco londinense y destapa secretos muy incómodos.'},
      {n:10,t:'The Town',y:2010,tipo:'movie',tag:'Boston',p:'Un atracador de bancos se enamora de la directora de la sucursal que acaba de asaltar.'},
      {n:11,t:'Comanchería',y:2016,tipo:'movie',tag:'Western moderno',p:'Dos hermanos atracan sucursales del banco que quiere quedarse con su rancho familiar.'},
      {n:12,t:'Baby Driver',y:2017,tipo:'movie',tag:'Al ritmo de la música',p:'Un joven conductor de fugas sincroniza cada huida con la canción que suena en sus auriculares.'},
      {n:13,t:'Logan Lucky',y:2017,tipo:'movie',tag:'Comedia de atracos',p:'Dos hermanos con mala suerte planean robar durante una carrera de NASCAR.'},
      {n:14,t:'La casa de papel',y:2017,tipo:'tv',tag:'Fenómeno español',p:'Un genio criminal y ocho atracadores asaltan la Fábrica Nacional de Moneda y Timbre.'},
      {n:15,t:'El robo del siglo',y:2020,tipo:'movie',tag:'Argentina, hechos reales',p:'La historia real del asalto al Banco Río de Acassuso, uno de los golpes más ingeniosos de la historia.'},
      {n:16,t:'Lupin',y:2021,tipo:'tv',tag:'Serie francesa',p:'Un ladrón de guante blanco inspirado en Arsène Lupin busca vengar a su padre.'}
    ];

    const BELICO = [
      {n:1,t:'Senderos de gloria',y:1957,tipo:'movie',tag:'Primera Guerra Mundial',p:'Un coronel defiende a tres soldados acusados de cobardía tras una ofensiva suicida.'},
      {n:2,t:'El puente sobre el río Kwai',y:1957,tipo:'movie',tag:'Prisioneros',p:'Unos soldados británicos presos de los japoneses son obligados a construir un puente estratégico.'},
      {n:3,t:'La gran evasión',y:1963,tipo:'movie',tag:'Fuga',p:'Prisioneros aliados planean una fuga masiva de un campo alemán. Basada en hechos reales.'},
      {n:4,t:'El cazador',y:1978,tipo:'movie',tag:'Vietnam',p:'Tres amigos de un pueblo de Pensilvania viven la guerra de Vietnam y sus secuelas.'},
      {n:5,t:'Apocalypse Now',y:1979,tipo:'movie',tag:'Vietnam',p:'Un capitán remonta un río camboyano para eliminar a un coronel que ha enloquecido.'},
      {n:6,t:'El submarino',y:1981,tipo:'movie',tag:'Segunda Guerra Mundial',p:'La claustrofóbica vida a bordo de un submarino alemán.'},
      {n:7,t:'Platoon',y:1986,tipo:'movie',tag:'Vietnam',p:'Un joven recluta descubre el horror de la guerra entre dos sargentos enfrentados.'},
      {n:8,t:'La chaqueta metálica',y:1987,tipo:'movie',tag:'Vietnam',p:'Del brutal entrenamiento de marines al combate en Hue.'},
      {n:9,t:'La lista de Schindler',y:1993,tipo:'movie',tag:'Holocausto',p:'Un empresario alemán salva a más de mil judíos empleándolos en su fábrica.'},
      {n:10,t:'Salvar al soldado Ryan',y:1998,tipo:'movie',tag:'Desembarco de Normandía',p:'Tras el Día D, un pelotón busca a un soldado cuyos hermanos han muerto en combate.'},
      {n:11,t:'La delgada línea roja',y:1998,tipo:'movie',tag:'Guadalcanal',p:'Terrence Malick convierte la batalla de Guadalcanal en una reflexión poética sobre la guerra.'},
      {n:12,t:'Hermanos de sangre',y:2001,tipo:'tv',tag:'Serie',p:'La compañía Easy desde su entrenamiento hasta el final de la Segunda Guerra Mundial.'},
      {n:13,t:'Black Hawk derribado',y:2001,tipo:'movie',tag:'Somalia',p:'La batalla de Mogadiscio de 1993, contada casi en tiempo real.'},
      {n:14,t:'Cartas desde Iwo Jima',y:2006,tipo:'movie',tag:'El otro bando',p:'La batalla de Iwo Jima vista desde el lado japonés, por Clint Eastwood.'},
      {n:15,t:'Malditos bastardos',y:2009,tipo:'movie',tag:'Historia reescrita',p:'Un grupo de soldados judíos americanos siembra el terror entre los nazis en la Francia ocupada.'},
      {n:16,t:'Hasta el último hombre',y:2016,tipo:'movie',tag:'Okinawa',p:'Un médico objetor de conciencia salva a decenas de compañeros sin tocar un arma.'},
      {n:17,t:'Dunkerque',y:2017,tipo:'movie',tag:'Evacuación',p:'La evacuación de Dunkerque contada desde tierra, mar y aire.'},
      {n:18,t:'1917',y:2019,tipo:'movie',tag:'Falso plano secuencia',p:'Dos soldados cruzan territorio enemigo para entregar un mensaje que puede salvar 1.600 vidas.'},
      {n:19,t:'Sin novedad en el frente',y:2022,tipo:'movie',tag:'Primera Guerra Mundial',p:'Un joven alemán se alista con entusiasmo y descubre la realidad de las trincheras.'}
    ];

    const WESTERN = [
      {n:1,t:'La diligencia',y:1939,tipo:'movie',tag:'El western moderno',p:'Un grupo de desconocidos cruza territorio apache en diligencia. Lanzó a John Wayne.'},
      {n:2,t:'Río Rojo',y:1948,tipo:'movie',tag:'Conducción de ganado',p:'Un ganadero tiránico y su hijo adoptivo se enfrentan durante una gran conducción de reses.'},
      {n:3,t:'Solo ante el peligro',y:1952,tipo:'movie',tag:'En tiempo real',p:'Un sheriff se queda solo para enfrentarse a una banda que llega en el tren del mediodía.'},
      {n:4,t:'Centauros del desierto',y:1956,tipo:'movie',tag:'Obra maestra',p:'Un veterano busca durante años a su sobrina secuestrada por los comanches.'},
      {n:5,t:'Río Bravo',y:1959,tipo:'movie',tag:'Clásico de Hawks',p:'Un sheriff, un borracho y un anciano custodian a un preso en un pueblo hostil.'},
      {n:6,t:'Los siete magníficos',y:1960,tipo:'movie',tag:'Remake del Oeste',p:'Siete pistoleros defienden un pueblo mexicano de los bandidos.'},
      {n:7,t:'El hombre que mató a Liberty Valance',y:1962,tipo:'movie',tag:'Leyenda y verdad',p:'Un senador revela la verdad sobre el hombre que mató al forajido más temido.'},
      {n:8,t:'El bueno, el feo y el malo',y:1966,tipo:'movie',tag:'Spaghetti western',p:'Tres pistoleros buscan un tesoro enterrado en plena Guerra de Secesión.'},
      {n:9,t:'Hasta que llegó su hora',y:1968,tipo:'movie',tag:'Ópera del Oeste',p:'Un misterioso hombre de la armónica busca venganza mientras llega el ferrocarril.'},
      {n:10,t:'Dos hombres y un destino',y:1969,tipo:'movie',tag:'Forajidos con encanto',p:'Butch Cassidy y Sundance Kid huyen tras sus últimos robos.'},
      {n:11,t:'Grupo salvaje',y:1969,tipo:'movie',tag:'Violencia crepuscular',p:'Una banda de forajidos envejecidos prepara un último golpe en la frontera mexicana.'},
      {n:12,t:'Sin perdón',y:1992,tipo:'movie',tag:'El western definitivo',p:'Un viejo pistolero vuelve a matar por una recompensa. Clint Eastwood desmonta el mito.'},
      {n:13,t:'Tombstone',y:1993,tipo:'movie',tag:'Wyatt Earp',p:'Wyatt Earp y Doc Holliday contra los Cowboys en el OK Corral.'},
      {n:14,t:'Deadwood',y:2004,tipo:'tv',tag:'Serie',p:'La vida en un campamento minero sin ley en la Dakota de 1876.'},
      {n:15,t:'El tren de las 3:10',y:2007,tipo:'movie',tag:'Remake',p:'Un ranchero arruinado acepta escoltar a un forajido hasta el tren que lo llevará a la cárcel.'},
      {n:16,t:'Valor de ley',y:2010,tipo:'movie',tag:'Los Coen',p:'Una niña contrata a un viejo alguacil para vengar la muerte de su padre.'},
      {n:17,t:'Django desencadenado',y:2012,tipo:'movie',tag:'Tarantino',p:'Un esclavo liberado y un cazarrecompensas buscan a su esposa en una plantación de Misisipi.'},
      {n:18,t:'El poder del perro',y:2021,tipo:'movie',tag:'Western psicológico',p:'Un ranchero carismático y cruel atormenta a la nueva esposa de su hermano y a su hijo.'}
    ];

    const PIXAR = [
      {n:1,t:'Toy Story',y:1995,tipo:'movie',tag:'Donde empezó todo',p:'El primer largometraje hecho íntegramente por ordenador. Woody y Buzz cambiaron la animación para siempre.'},
      {n:2,t:'Bichos, una aventura en miniatura',y:1998,tipo:'movie',tag:'Fábula de hormigas',p:'Una hormiga torpe recluta a unos artistas de circo creyendo que son guerreros.'},
      {n:3,t:'Toy Story 2',y:1999,tipo:'movie',tag:'Secuela a la altura',p:'Woody es robado por un coleccionista y descubre su pasado como estrella de la tele.'},
      {n:4,t:'Monstruos, S.A.',y:2001,tipo:'movie',tag:'Sustos con corazón',p:'Sulley y Mike viven de asustar niños hasta que una niña se cuela en su mundo.'},
      {n:5,t:'Buscando a Nemo',y:2003,tipo:'movie',tag:'Aventura oceánica',p:'Un pez payaso sobreprotector cruza el océano para encontrar a su hijo.'},
      {n:6,t:'Los Increíbles',y:2004,tipo:'movie',tag:'Superhéroes en familia',p:'Una familia de superhéroes retirados vuelve a la acción. Brad Bird en estado de gracia.'},
      {n:7,t:'Cars',y:2006,tipo:'movie',tag:'Ruta 66',p:'Un coche de carreras arrogante queda atrapado en un pueblo olvidado de la Ruta 66.'},
      {n:8,t:'Ratatouille',y:2007,tipo:'movie',tag:'Obra maestra',p:'Una rata con talento para la cocina se alía con un pinche torpe en un restaurante de París.'},
      {n:9,t:'WALL·E',y:2008,tipo:'movie',tag:'Casi sin palabras',p:'Un robot solitario limpia una Tierra abandonada hasta que aparece EVA. Media película sin diálogos.'},
      {n:10,t:'Up',y:2009,tipo:'movie',tag:'Los diez primeros minutos',p:'Un viudo ata miles de globos a su casa para cumplir una promesa. Prepara pañuelos.'},
      {n:11,t:'Toy Story 3',y:2010,tipo:'movie',tag:'El cierre perfecto',p:'Andy se va a la universidad y los juguetes acaban en una guardería. Un final que emociona a cualquiera.'},
      {n:12,t:'Cars 2',y:2011,tipo:'movie',tag:'Espías sobre ruedas',p:'Mate se ve envuelto en una trama de espionaje durante un gran premio mundial.'},
      {n:13,t:'Brave (Indomable)',y:2012,tipo:'movie',tag:'Escocia',p:'Una princesa escocesa rechaza su destino y desata una maldición sobre su familia.'},
      {n:14,t:'Monstruos University',y:2013,tipo:'movie',tag:'Precuela',p:'Cómo se conocieron Mike y Sulley en la universidad, cuando no se soportaban.'},
      {n:15,t:'Del revés (Inside Out)',y:2015,tipo:'movie',tag:'Emociones',p:'Alegría, Tristeza y compañía gestionan la cabeza de una niña que acaba de mudarse.'},
      {n:16,t:'El viaje de Arlo',y:2015,tipo:'movie',tag:'Dinosaurios',p:'¿Y si el meteorito no hubiera caído? Un joven dinosaurio y un niño salvaje cruzan el Oeste.'},
      {n:17,t:'Buscando a Dory',y:2016,tipo:'movie',tag:'Secuela',p:'Dory, la de la memoria de pez, busca a la familia que había olvidado.'},
      {n:18,t:'Cars 3',y:2017,tipo:'movie',tag:'Retirada',p:'Rayo McQueen se enfrenta a una nueva generación de coches mucho más rápidos.'},
      {n:19,t:'Coco',y:2017,tipo:'movie',tag:'Día de Muertos',p:'Un niño que sueña con ser músico viaja a la Tierra de los Muertos. De las más emocionantes del estudio.'},
      {n:20,t:'Los Increíbles 2',y:2018,tipo:'movie',tag:'Secuela',p:'Elastigirl sale a salvar el mundo mientras Mr. Increíble se queda con los niños (y con Jack-Jack).'},
      {n:21,t:'Toy Story 4',y:2019,tipo:'movie',tag:'Forky',p:'Woody acompaña a Bonnie y a Forky, un tenedor que no entiende por qué es un juguete.'},
      {n:22,t:'Onward',y:2020,tipo:'movie',tag:'Fantasía urbana',p:'Dos hermanos elfos intentan pasar un día más con su padre fallecido gracias a la magia.'},
      {n:23,t:'Soul',y:2020,tipo:'movie',tag:'Jazz y existencia',p:'Un profesor de música sueña con tocar jazz y acaba en un lugar previo a la vida.'},
      {n:24,t:'Luca',y:2021,tipo:'movie',tag:'Verano en Italia',p:'Un monstruo marino descubre la vida en la superficie en un pueblo de la Riviera italiana.'},
      {n:25,t:'Red',y:2022,tipo:'movie',tag:'Adolescencia',p:'Una niña de 13 años se convierte en un panda rojo gigante cada vez que se emociona.'},
      {n:26,t:'Lightyear',y:2022,tipo:'movie',tag:'Spin-off',p:'La película de ciencia ficción en la que se basa el juguete de Buzz Lightyear.'},
      {n:27,t:'Elemental',y:2023,tipo:'movie',tag:'Fuego y agua',p:'En una ciudad de elementos, una chica de fuego y un chico de agua se hacen amigos.'},
      {n:28,t:'Del revés 2 (Inside Out 2)',y:2024,tipo:'movie',tag:'Llega la Ansiedad',p:'Riley entra en la adolescencia y aparecen emociones nuevas que quieren tomar el mando.'},
      {n:29,t:'Elio',y:2025,tipo:'movie',tag:'Ciencia ficción',p:'Un niño fascinado por el espacio acaba representando a la Tierra ante una federación alienígena.'},
      {n:30,t:'Hoppers',y:2026,tipo:'movie',tag:'Original',p:'Una chica traslada su mente a un castor robótico para comunicarse con los animales.'},
      {n:31,t:'Toy Story 5',y:2026,tipo:'movie',tag:'Juguetes contra pantallas',p:'Los juguetes se enfrentan a su rival más moderno: la tecnología.'}
    ];
    const GHIBLI = [
      {n:1,t:'Nausicaä del Valle del Viento',y:1984,tipo:'movie',tag:'Antes de Ghibli',p:'Hayao Miyazaki. Su éxito permitió fundar el estudio al año siguiente: ecología y aventura en un mundo postapocalíptico.'},
      {n:2,t:'El castillo en el cielo',y:1986,tipo:'movie',tag:'La primera oficial',p:'Hayao Miyazaki. Dos niños buscan una isla flotante perseguidos por piratas aéreos y militares.'},
      {n:3,t:'La tumba de las luciérnagas',y:1988,tipo:'movie',tag:'Devastadora',p:'Isao Takahata. Dos hermanos intentan sobrevivir en el Japón de la Segunda Guerra Mundial.'},
      {n:4,t:'Mi vecino Totoro',y:1988,tipo:'movie',tag:'El emblema del estudio',p:'Hayao Miyazaki. Dos hermanas se mudan al campo y conocen a los espíritus del bosque.'},
      {n:5,t:'Nicky, la aprendiz de bruja',y:1989,tipo:'movie',tag:'Crecer',p:'Hayao Miyazaki. Una bruja de 13 años monta un servicio de reparto a domicilio en una ciudad junto al mar.'},
      {n:6,t:'Recuerdos del ayer',y:1991,tipo:'movie',tag:'Nostalgia',p:'Isao Takahata. Una mujer de 27 años viaja al campo y recuerda su infancia.'},
      {n:7,t:'Porco Rosso',y:1992,tipo:'movie',tag:'Aviadores',p:'Hayao Miyazaki. Un piloto convertido en cerdo caza piratas aéreos en el Adriático de entreguerras.'},
      {n:8,t:'Puedo escuchar el mar',y:1993,tipo:'movie',tag:'Película para televisión',p:'Tomomi Mochizuki. Un triángulo amoroso de instituto contado con mucha delicadeza.'},
      {n:9,t:'Pompoko',y:1994,tipo:'movie',tag:'Fábula ecologista',p:'Isao Takahata. Los tanukis usan sus poderes para frenar la urbanización de su bosque.'},
      {n:10,t:'Susurros del corazón',y:1995,tipo:'movie',tag:'Vocación',p:'Yoshifumi Kondō. Una estudiante que quiere escribir descubre quién ha leído antes todos sus libros.'},
      {n:11,t:'La princesa Mononoke',y:1997,tipo:'movie',tag:'Épica',p:'Hayao Miyazaki. La guerra entre los dioses del bosque y los humanos, sin buenos ni malos.'},
      {n:12,t:'Mis vecinos los Yamada',y:1999,tipo:'movie',tag:'Comedia familiar',p:'Isao Takahata. Viñetas de la vida cotidiana de una familia, con estilo de tira cómica.'},
      {n:13,t:'El viaje de Chihiro',y:2001,tipo:'movie',tag:'Óscar',p:'Hayao Miyazaki. Una niña queda atrapada en un balneario para espíritus. Óscar a la mejor película de animación.'},
      {n:14,t:'Haru en el reino de los gatos',y:2002,tipo:'movie',tag:'Spin-off',p:'Hiroyuki Morita. Una chica salva a un gato y acaba invitada (a la fuerza) a su reino.'},
      {n:15,t:'El castillo ambulante',y:2004,tipo:'movie',tag:'Fantasía romántica',p:'Hayao Miyazaki. Una joven convertida en anciana encuentra refugio en el castillo del mago Howl.'},
      {n:16,t:'Cuentos de Terramar',y:2006,tipo:'movie',tag:'Debut de Gorō Miyazaki',p:'Gorō Miyazaki. Adaptación libre de las novelas de Ursula K. Le Guin.'},
      {n:17,t:'Ponyo en el acantilado',y:2008,tipo:'movie',tag:'Para los más pequeños',p:'Hayao Miyazaki. Un pez que quiere ser niña y un niño que la protege, con un maremoto de por medio.'},
      {n:18,t:'Arrietty y el mundo de los diminutos',y:2010,tipo:'movie',tag:'Diminutos',p:'Hiromasa Yonebayashi. Una familia de personas diminutas vive bajo el suelo de una casa.'},
      {n:19,t:'La colina de las amapolas',y:2011,tipo:'movie',tag:'Yokohama, 1963',p:'Gorō Miyazaki. Dos estudiantes luchan por salvar el viejo club de su instituto.'},
      {n:20,t:'El viento se levanta',y:2013,tipo:'movie',tag:'Biográfica',p:'Hayao Miyazaki. La vida del ingeniero que diseñó los cazas japoneses de la guerra.'},
      {n:21,t:'El cuento de la princesa Kaguya',y:2013,tipo:'movie',tag:'Acuarela en movimiento',p:'Isao Takahata. Una niña nacida de un tallo de bambú. Su despedida del cine.'},
      {n:22,t:'El recuerdo de Marnie',y:2014,tipo:'movie',tag:'Misterio',p:'Hiromasa Yonebayashi. Una chica solitaria conoce a una misteriosa niña en una mansión junto a la marisma.'},
      {n:23,t:'La tortuga roja',y:2016,tipo:'movie',tag:'Coproducción europea',p:'Michaël Dudok de Wit. Un náufrago en una isla desierta, sin una sola palabra de diálogo.'},
      {n:24,t:'Earwig y la bruja',y:2020,tipo:'movie',tag:'Primera en 3D',p:'Gorō Miyazaki. Una huérfana es adoptada por una bruja egoísta.'},
      {n:25,t:'El chico y la garza',y:2023,tipo:'movie',tag:'Óscar',p:'Hayao Miyazaki. Un niño que ha perdido a su madre sigue a una garza parlante a otro mundo.'}
    ];
    const ALMODOVAR = [
      {n:1,t:'Pepi, Luci, Bom y otras chicas del montón',y:1980,tipo:'movie',tag:'Debut',p:'Su primer largo: punk, Movida y cero complejos.'},
      {n:2,t:'Laberinto de pasiones',y:1982,tipo:'movie',tag:'La Movida',p:'Una ninfómana y un príncipe árabe gay en el Madrid más desmadrado.'},
      {n:3,t:'Entre tinieblas',y:1983,tipo:'movie',tag:'Monjas',p:'Una cantante se esconde en un convento de monjas muy poco convencional.'},
      {n:4,t:'¿Qué he hecho yo para merecer esto!!',y:1984,tipo:'movie',tag:'Comedia negra',p:'Carmen Maura, ama de casa al límite en un bloque de La Concepción.'},
      {n:5,t:'Matador',y:1986,tipo:'movie',tag:'Deseo y muerte',p:'Un torero retirado y una abogada unidos por una atracción mortal.'},
      {n:6,t:'La ley del deseo',y:1987,tipo:'movie',tag:'Primera de El Deseo',p:'Un director de cine, su hermana transexual y un amante obsesivo.'},
      {n:7,t:'Mujeres al borde de un ataque de nervios',y:1988,tipo:'movie',tag:'Nominada al Óscar',p:'El gazpacho, el ático y Carmen Maura. Su salto internacional.'},
      {n:8,t:'¡Átame!',y:1989,tipo:'movie',tag:'Polémica',p:'Antonio Banderas secuestra a Victoria Abril para que se enamore de él.'},
      {n:9,t:'Tacones lejanos',y:1991,tipo:'movie',tag:'Melodrama',p:'Una madre cantante y una hija que nunca la ha perdonado.'},
      {n:10,t:'Kika',y:1993,tipo:'movie',tag:'Comedia',p:'Una maquilladora optimista, una reportera sensacionalista y Victoria Abril de Gaultier.'},
      {n:11,t:'La flor de mi secreto',y:1995,tipo:'movie',tag:'Madurez',p:'Una escritora de novela rosa en plena crisis sentimental. El inicio de su etapa más serena.'},
      {n:12,t:'Carne trémula',y:1997,tipo:'movie',tag:'Thriller',p:'Un disparo une para siempre a cinco personas. Libremente basada en Ruth Rendell.'},
      {n:13,t:'Todo sobre mi madre',y:1999,tipo:'movie',tag:'Óscar',p:'Una madre busca al padre de su hijo en Barcelona. Óscar a la mejor película extranjera.'},
      {n:14,t:'Hable con ella',y:2002,tipo:'movie',tag:'Óscar al guion',p:'Dos hombres cuidan a dos mujeres en coma. Óscar al mejor guion original.'},
      {n:15,t:'La mala educación',y:2004,tipo:'movie',tag:'Cine negro',p:'Dos amigos de un colegio religioso se reencuentran años después.'},
      {n:16,t:'Volver',y:2006,tipo:'movie',tag:'La Mancha',p:'Penélope Cruz, el fantasma de una madre y un pueblo de viento solano.'},
      {n:17,t:'Los abrazos rotos',y:2009,tipo:'movie',tag:'Cine dentro del cine',p:'Un director ciego recuerda el amor que le costó la vista.'},
      {n:18,t:'La piel que habito',y:2011,tipo:'movie',tag:'Thriller perturbador',p:'Un cirujano obsesionado con crear una piel perfecta. Banderas, veinte años después.'},
      {n:19,t:'Los amantes pasajeros',y:2013,tipo:'movie',tag:'Comedia loca',p:'Un avión con problemas y una tripulación dispuesta a todo para entretener al pasaje.'},
      {n:20,t:'Julieta',y:2016,tipo:'movie',tag:'Alice Munro',p:'Una madre busca a la hija que la abandonó hace doce años.'},
      {n:21,t:'Dolor y gloria',y:2019,tipo:'movie',tag:'Autobiográfica',p:'Banderas como un director en declive que repasa su vida. De lo mejor de su carrera.'},
      {n:22,t:'Madres paralelas',y:2021,tipo:'movie',tag:'Memoria histórica',p:'Dos madres primerizas que dan a luz el mismo día, y las fosas del pasado.'},
      {n:23,t:'La habitación de al lado',y:2024,tipo:'movie',tag:'León de Oro',p:'Su primer largo en inglés: Tilda Swinton y Julianne Moore ante el final de la vida.'}
    ];
    const MISION_IMPOSIBLE = [
      {n:1,t:'Misión: Imposible',y:1996,tipo:'movie',tag:'Brian De Palma',p:'Ethan Hunt, acusado de traidor, tiene que limpiar su nombre. Incluye el famoso descenso en la cámara de Langley.'},
      {n:2,t:'Misión: Imposible 2',y:2000,tipo:'movie',tag:'John Woo',p:'Palomas, cámara lenta y motos: Ethan persigue un virus mortal.'},
      {n:3,t:'Misión: Imposible III',y:2006,tipo:'movie',tag:'J.J. Abrams',p:'Philip Seymour Hoffman, el mejor villano de la saga, pone en peligro la vida privada de Ethan.'},
      {n:4,t:'Misión imposible: Protocolo fantasma',y:2011,tipo:'movie',tag:'El Burj Khalifa',p:'Con la FMI desactivada, el equipo actúa por su cuenta. La escalada del rascacielos es historia del cine de acción.'},
      {n:5,t:'Misión: Imposible - Nación secreta',y:2015,tipo:'movie',tag:'Llega Ilsa Faust',p:'Ethan se enfrenta al Sindicato, una red de exagentes. Empieza la etapa de Christopher McQuarrie.'},
      {n:6,t:'Misión: Imposible - Fallout',y:2018,tipo:'movie',tag:'La mejor de la saga',p:'Una misión fallida deja plutonio suelto. Persecuciones por París y helicópteros en Cachemira.'},
      {n:7,t:'Misión: Imposible - Sentencia mortal parte uno',y:2023,tipo:'movie',tag:'La Entidad',p:'Una inteligencia artificial descontrolada y una llave que todos quieren.'},
      {n:8,t:'Misión: Imposible - Sentencia final',y:2025,tipo:'movie',tag:'El desenlace',p:'Ethan y su equipo intentan detener a la Entidad antes de que sea tarde.'}
    ];
    const INDIANA_JONES = [
      {n:1,era:'1908',nota:'hasta 1920',t:'Las aventuras del joven Indiana Jones',y:1992,tipo:'tv',tag:'Serie precuela',p:'La infancia y juventud de Indy por medio mundo, con personajes históricos de por medio.'},
      {n:2,era:'1935',nota:'',t:'Indiana Jones y el templo maldito',y:1984,tipo:'movie',tag:'Precuela',p:'Indy, Willie y Tapón se topan con una secta en la India. La más oscura de la trilogía.'},
      {n:3,era:'1936',nota:'',t:'En busca del arca perdida',y:1981,tipo:'movie',tag:'Imprescindible',p:'Indy compite con los nazis por el Arca de la Alianza. Aventura en estado puro.'},
      {n:4,era:'1938',nota:'',t:'Indiana Jones y la última cruzada',y:1989,tipo:'movie',tag:'Con su padre',p:'Indy y su padre (Sean Connery) buscan el Santo Grial.'},
      {n:5,era:'1957',nota:'',t:'Indiana Jones y el reino de la calavera de cristal',y:2008,tipo:'movie',tag:'Guerra Fría',p:'Indy, ya veterano, se enfrenta a los soviéticos en busca de una calavera misteriosa.'},
      {n:6,era:'1969',nota:'',t:'Indiana Jones y el dial del destino',y:2023,tipo:'movie',tag:'La despedida',p:'El último viaje de Indy, con un artefacto de Arquímedes que puede cambiar la historia.'}
    ];
    const JURASSIC = [
      {n:1,era:'1993',nota:'',t:'Parque Jurásico',y:1993,tipo:'movie',tag:'Imprescindible',p:'Spielberg resucita a los dinosaurios. Treinta años después sigue impresionando.'},
      {n:2,era:'1997',nota:'',t:'El mundo perdido: Jurassic Park',y:1997,tipo:'movie',tag:'Isla Sorna',p:'Un segundo parque, el centro de cría, y un tiranosaurio suelto por San Diego.'},
      {n:3,era:'2001',nota:'',t:'Parque Jurásico III',y:2001,tipo:'movie',tag:'Rescate',p:'El doctor Grant vuelve a la isla engañado para buscar a un niño perdido.'},
      {n:4,era:'2015',nota:'',t:'Jurassic World',y:2015,tipo:'movie',tag:'El parque abre',p:'El parque por fin funciona, hasta que un dinosaurio creado en laboratorio se escapa.'},
      {n:5,nota:'durante y después de Jurassic World',t:'Jurassic World: Campamento Cretácico',y:2020,tipo:'tv',tag:'Serie animada',p:'Seis adolescentes atrapados en la isla mientras el parque se viene abajo.'},
      {n:6,era:'2018',nota:'',t:'Jurassic World: El reino caído',y:2018,tipo:'movie',tag:'El volcán',p:'Un volcán amenaza la isla y alguien quiere vender los dinosaurios al mejor postor.'},
      {n:7,nota:'después de El reino caído',t:'Jurassic World: Teoría del caos',y:2024,tipo:'tv',tag:'Serie animada',p:'Los chicos del campamento, ya mayores, descubren una conspiración con dinosaurios sueltos por el mundo.'},
      {n:8,era:'2022',nota:'',t:'Jurassic World: Dominion',y:2022,tipo:'movie',tag:'Reencuentro',p:'Dinosaurios por todo el planeta y el regreso del reparto original.'},
      {n:9,nota:'cinco años después',t:'Jurassic World: El renacer',y:2025,tipo:'movie',tag:'Nueva etapa',p:'Una misión secreta a una isla prohibida en busca de ADN de dinosaurio.'}
    ];
    const MATRIX = [
      {n:1,t:'Matrix',y:1999,tipo:'movie',tag:'Imprescindible',p:'Neo descubre que el mundo es una simulación. Cambió el cine de acción y la ciencia ficción.'},
      {n:2,t:'Matrix Reloaded',y:2003,tipo:'movie',tag:'Zion',p:'La guerra contra las máquinas llega a la última ciudad humana.'},
      {n:3,t:'Animatrix',y:2003,tipo:'movie',tag:'Cortos animados',p:'Nueve cortos de animación que cuentan cómo empezó la guerra y enlazan con las películas.'},
      {n:4,t:'Matrix Revolutions',y:2003,tipo:'movie',tag:'El final de la trilogía',p:'La batalla final entre humanos y máquinas, y el duelo entre Neo y Smith.'},
      {n:5,t:'Matrix Resurrections',y:2021,tipo:'movie',tag:'Regreso',p:'Veinte años después, Neo vuelve a dudar de la realidad.'}
    ];
    const MAD_MAX = [
      {n:1,t:'Mad Max',y:1979,tipo:'movie',tag:'El origen',p:'Un policía de carretera busca venganza contra una banda de moteros.'},
      {n:2,t:'Mad Max 2: El guerrero de la carretera',y:1981,tipo:'movie',tag:'El páramo',p:'Max, convertido en vagabundo, ayuda a una comunidad que defiende su gasolina.'},
      {n:3,t:'Mad Max: Más allá de la cúpula del trueno',y:1985,tipo:'movie',tag:'Bartertown',p:'Max llega a una ciudad gobernada por Tina Turner y acaba en la Cúpula del Trueno.'},
      {n:4,t:'Furiosa: De la saga Mad Max',y:2024,tipo:'movie',tag:'Precuela de Furia',p:'La historia de Furiosa, desde que es secuestrada de niña hasta convertirse en guerrera.'},
      {n:5,t:'Mad Max: Furia en la carretera',y:2015,tipo:'movie',tag:'Obra maestra',p:'Una persecución de dos horas por el desierto. Seis Óscar.'}
    ];
    const BATMAN = [
      {n:1,t:'Batman',y:1966,tipo:'movie',tag:'Adam West',p:'La película de la serie de los 60: color, onomatopeyas y el repelente de tiburones.'},
      {n:2,t:'Batman',y:1989,tipo:'movie',tag:'Tim Burton',p:'Michael Keaton y el Joker de Jack Nicholson en una Gotham gótica.'},
      {n:3,t:'Batman vuelve',y:1992,tipo:'movie',tag:'Tim Burton',p:'El Pingüino y Catwoman ponen Gotham patas arriba en plena Navidad.'},
      {n:4,t:'Batman: La serie animada',y:1992,tipo:'tv',tag:'Animación de culto',p:'Para muchos, la mejor versión del personaje. Aquí nació Harley Quinn.'},
      {n:5,t:'Batman: La máscara del fantasma',y:1993,tipo:'movie',tag:'Película animada',p:'Película de la serie animada: un nuevo justiciero y el amor perdido de Bruce Wayne.'},
      {n:6,t:'Batman Forever',y:1995,tipo:'movie',tag:'Joel Schumacher',p:'Val Kilmer, Jim Carrey como Enigma y la llegada de Robin.'},
      {n:7,t:'Batman y Robin',y:1997,tipo:'movie',tag:'De culto (para mal)',p:'George Clooney, Mr. Frío y los famosos pezones del traje.'},
      {n:8,t:'Batman Begins',y:2005,tipo:'movie',tag:'Christopher Nolan',p:'Christian Bale y el origen más realista del murciélago.'},
      {n:9,t:'El caballero oscuro',y:2008,tipo:'movie',tag:'Imprescindible',p:'El Joker de Heath Ledger. Para muchos, la mejor película de superhéroes.'},
      {n:10,t:'El caballero oscuro: La leyenda renace',y:2012,tipo:'movie',tag:'Bane',p:'El cierre de la trilogía de Nolan, con Gotham tomada por Bane.'},
      {n:11,t:'Batman v Superman: El amanecer de la justicia',y:2016,tipo:'movie',tag:'Ben Affleck',p:'Un Batman veterano y desencantado contra Superman.'},
      {n:12,t:'Batman: La LEGO película',y:2017,tipo:'movie',tag:'Parodia',p:'Batman en versión LEGO, riéndose de todas las anteriores.'},
      {n:13,t:'The Batman',y:2022,tipo:'movie',tag:'Robert Pattinson',p:'Un Batman detective en su segundo año, tras la pista del Acertijo.'},
      {n:14,t:'El Pingüino',y:2024,tipo:'tv',tag:'Secuela de The Batman',p:'Colin Farrell como Oz Cobb, en su ascenso en el hampa de Gotham.'},
      {n:15,t:'The Batman: Parte II',y:2028,tipo:'movie',tmdb_id:806704,tag:'Próximamente · 17 de febrero de 2028',p:'Robert Pattinson vuelve como Batman en la continuación de «The Batman». Se estrena el 17 de febrero de 2028.'}
    ];
    const PESADILLAS = [
      {n:1,era:'Halloween',eraCap:'Michael Myers',t:'La noche de Halloween',y:1978,tipo:'movie',tag:'El original',p:'John Carpenter inventa el slasher moderno: Michael Myers vuelve a Haddonfield.'},
      {n:2,t:'Halloween II',y:1981,tipo:'movie',tag:'Esa misma noche',p:'Continúa justo donde acaba la primera, en el hospital.'},
      {n:3,t:'Halloween III: El día de la bruja',y:1982,tipo:'movie',tag:'Sin Michael Myers',p:'Un experimento: otra historia con máscaras malditas. Hoy es de culto.'},
      {n:4,t:'Halloween 4: El regreso de Michael Myers',y:1988,tipo:'movie',tag:'Regreso',p:'Diez años después, Michael va a por su sobrina.'},
      {n:5,t:'Halloween 5: La venganza de Michael Myers',y:1989,tipo:'movie',tag:'Secuela',p:'Michael sigue persiguiendo a la pequeña Jamie.'},
      {n:6,t:'Halloween: La maldición de Michael Myers',y:1995,tipo:'movie',tag:'Secta',p:'Explica el origen del mal de Michael con una secta de por medio.'},
      {n:7,t:'Halloween H20: 20 años después',y:1998,tipo:'movie',tag:'Vuelve Laurie',p:'Jamie Lee Curtis regresa, ignorando las entregas 4, 5 y 6.'},
      {n:8,t:'Halloween: Resurrección',y:2002,tipo:'movie',tag:'Reality show',p:'Un grupo de jóvenes graba un reality en la casa de los Myers.'},
      {n:9,t:'Halloween: El origen',y:2007,tipo:'movie',tag:'Rob Zombie',p:'Remake que cuenta la infancia de Michael con mucha más crudeza.'},
      {n:10,t:'Halloween II',y:2009,tipo:'movie',tag:'Rob Zombie',p:'Secuela del remake: Laurie intenta superar el trauma.'},
      {n:11,t:'La noche de Halloween',y:2018,tipo:'movie',tag:'Secuela directa de 1978',p:'Ignora todas las demás: Laurie lleva 40 años preparándose para el regreso de Michael.'},
      {n:12,t:'Halloween Kills',y:2021,tipo:'movie',tag:'Esa misma noche',p:'El pueblo entero sale a cazar a Michael.'},
      {n:13,t:'Halloween: El final',y:2022,tipo:'movie',tag:'El cierre',p:'El último enfrentamiento entre Laurie y Michael.'},
      {n:14,era:'Scream',eraCap:'Ghostface',t:'Scream (Vigila quién llama)',y:1996,tipo:'movie',tag:'Wes Craven',p:'Un asesino que conoce las reglas de las películas de terror. Revitalizó el género.'},
      {n:15,t:'Scream 2',y:1997,tipo:'movie',tag:'Secuela',p:'Sidney en la universidad, y un nuevo Ghostface imitando la película basada en sus crímenes.'},
      {n:16,t:'Scream 3',y:2000,tipo:'movie',tag:'Hollywood',p:'Los asesinatos llegan al rodaje de «Puñalada 3».'},
      {n:17,t:'Scream 4',y:2011,tipo:'movie',tag:'Diez años después',p:'Sidney vuelve a Woodsboro y Ghostface también.'},
      {n:18,t:'Scream',y:2022,tipo:'movie',tag:'Nueva generación',p:'Una nueva protagonista y el regreso de Sidney, Gale y Dewey.'},
      {n:19,t:'Scream VI',y:2023,tipo:'movie',tag:'Nueva York',p:'Las hermanas Carpenter se mudan a Nueva York y Ghostface las sigue.'},
      {n:20,t:'Scream 7',y:2026,tipo:'movie',tag:'Vuelve Sidney',p:'Ghostface amenaza a la hija de Sidney Prescott.'},
      {n:21,era:'Saw',eraCap:'Jigsaw',t:'Saw',y:2004,tipo:'movie',tag:'El juego empieza',p:'Dos hombres despiertan encadenados en un baño. Un giro final que hizo historia.'},
      {n:22,t:'Saw II',y:2005,tipo:'movie',tag:'Secuela',p:'Un grupo atrapado en una casa con gas nervioso y Jigsaw ya identificado.'},
      {n:23,t:'Saw III',y:2006,tipo:'movie',tag:'La aprendiz',p:'Jigsaw, moribundo, prepara un último juego con su aprendiz.'},
      {n:24,t:'Saw IV',y:2007,tipo:'movie',tag:'El legado',p:'Tras la muerte de Jigsaw, los juegos continúan.'},
      {n:25,t:'Saw V',y:2008,tipo:'movie',tag:'El heredero',p:'Se revela quién sigue los pasos de Jigsaw.'},
      {n:26,t:'Saw VI',y:2009,tipo:'movie',tag:'Seguros médicos',p:'Jigsaw, desde la tumba, castiga a un ejecutivo de una aseguradora.'},
      {n:27,t:'Saw VII 3D',y:2010,tipo:'movie',tag:'Cierre original',p:'El final de la etapa original, con el regreso de un viejo conocido.'},
      {n:28,t:'Jigsaw',y:2017,tipo:'movie',tag:'¿Ha vuelto?',p:'Diez años después de su muerte, aparecen cadáveres con la firma de Jigsaw.'},
      {n:29,t:'Spiral: Saw',y:2021,tipo:'movie',tag:'Spin-off',p:'Chris Rock investiga a un imitador que va a por policías corruptos.'},
      {n:30,t:'Saw X',y:2023,tipo:'movie',tag:'Entre Saw y Saw II',p:'John Kramer viaja a México para una cura milagrosa que resulta ser una estafa.'}
    ];

    // ── Filmografía al día: directores cuyos especiales pueden generarse desde TMDB ──
    const _ESP_PERSONAS = {tarantino:['Quentin Tarantino'], coen:['Joel Coen','Ethan Coen'], nolan:['Christopher Nolan'], scorsese:['Martin Scorsese'],
      kubrick:['Stanley Kubrick'], spielberg:['Steven Spielberg'], fincher:['David Fincher'], villeneuve:['Denis Villeneuve'], hitchcock:['Alfred Hitchcock']};

    // ── IDs de TMDB fijados para los títulos de los especiales ──
    // Clave «título normalizado|año|tipo» → [id de TMDB, fecha de estreno]. Se genera con exportarIdsEspeciales().
    const ESPECIALES_TMDB_IDS = {
      "10 cosas que odio de ti|1999|movie":[4951,"1999-03-30"],
      "12 anos de esclavitud|2013|movie":[76203,"2013-10-18"],
      "13th|2016|movie":[407806,"2016-10-07"],
      "1917|2019|movie":[530915,"2019-12-25"],
      "2 fast 2 furious|2003|movie":[584,"2003-06-05"],
      "2001: una odisea del espacio|1968|movie":[62,"1968-04-02"],
      "28 dias despues|2002|movie":[170,"2002-10-31"],
      "39 escalones|1935|movie":[260,"1935-06-06"],
      "500 dias juntos|2009|movie":[19913,"2009-07-17"],
      "a proposito de llewyn davis|2013|movie":[86829,"2013-10-18"],
      "a todo gas: tokyo race|2006|movie":[9615,"2006-06-03"],
      "a todo gas|2001|movie":[9799,"2001-06-22"],
      "abre los ojos|1997|movie":[1902,"1997-12-19"],
      "adios, pequena, adios|2007|movie":[4771,"2007-09-18"],
      "aftersun|2022|movie":[965150,"2022-10-21"],
      "agatha, ¿quien si no?|2024|tv":[138501,"2024-09-18"],
      "agente 007 contra el dr. no|1962|movie":[646,"1962-10-07"],
      "agente carter|2015|tv":[61550,"2015-01-06"],
      "ahora me ves|2013|movie":[75656,"2013-05-29"],
      "ahsoka|2023|tv":[114461,"2023-08-22"],
      "al filo del manana|2014|movie":[137113,"2014-05-27"],
      "al servicio secreto de su majestad|1969|movie":[668,"1969-12-18"],
      "alarma en el expreso|1938|movie":[940,"1938-10-07"],
      "alguien volo sobre el nido del cuco|1975|movie":[510,"1975-11-19"],
      "alien 3|1992|movie":[8077,"1992-05-22"],
      "alien, el octavo pasajero|1979|movie":[348,"1979-05-25"],
      "alien: covenant|2017|movie":[126889,"2017-05-09"],
      "alien: resurreccion|1997|movie":[8078,"1997-11-12"],
      "alien: romulus|2024|movie":[945961,"2024-08-13"],
      "aliens: el regreso|1986|movie":[679,"1986-07-18"],
      "alta tension|1987|movie":[708,"1987-06-29"],
      "amadeus|1984|movie":[279,"1984-09-19"],
      "amelie|2001|movie":[194,"2001-04-25"],
      "american beauty|1999|movie":[14,"1999-09-15"],
      "american psycho|2000|movie":[1359,"2000-04-13"],
      "amy|2015|movie":[331781,"2015-07-02"],
      "anchorman: la leyenda de ron burgundy|2004|movie":[8699,"2004-06-28"],
      "andor|2022|tv":[83867,"2022-09-21"],
      "animales fantasticos y donde encontrarlos|2016|movie":[259316,"2016-11-16"],
      "animales fantasticos: los crimenes de grindelwald|2018|movie":[338952,"2018-11-14"],
      "animales fantasticos: los secretos de dumbledore|2022|movie":[338953,"2022-04-06"],
      "animatrix|2003|movie":[55931,"2003-05-09"],
      "anora|2024|movie":[1064213,"2024-10-14"],
      "ant-man y la avispa: quantumania|2023|movie":[640146,"2023-02-15"],
      "ant-man y la avispa|2018|movie":[363088,"2018-07-04"],
      "ant-man|2015|movie":[102899,"2015-07-14"],
      "antes del amanecer|1995|movie":[76,"1995-01-27"],
      "apocalypse now|1979|movie":[28,"1979-05-19"],
      "aquaman y el reino perdido|2023|movie":[572802,"2023-12-20"],
      "aquaman|2018|movie":[297802,"2018-12-07"],
      "argo|2012|movie":[68734,"2012-10-11"],
      "arizona baby|1987|movie":[378,"1987-03-13"],
      "arrietty y el mundo de los diminutos|2010|movie":[51739,"2010-07-16"],
      "as bestas|2022|movie":[848685,"2022-07-20"],
      "aterriza como puedas|1980|movie":[813,"1980-06-27"],
      "atomica|2017|movie":[341013,"2017-07-26"],
      "atraccion fatal|1987|movie":[10998,"1987-09-18"],
      "atraco a las tres|1962|movie":[71767,"1962-12-10"],
      "atraco perfecto|1956|movie":[247,"1956-06-06"],
      "atrapado en el tiempo|1993|movie":[137,"1993-02-11"],
      "atrapame si puedes|2002|movie":[640,"2002-12-16"],
      "ave, cesar!|2016|movie":[270487,"2016-02-05"],
      "aves de presa|2020|movie":[495764,"2020-02-05"],
      "baby driver|2017|movie":[339403,"2017-06-28"],
      "bailando con lobos|1990|movie":[581,"1990-11-09"],
      "bajo la piel|2013|movie":[97370,"2013-08-29"],
      "ballerina|2025|movie":[541671,"2025-06-04"],
      "barbarella|1968|movie":[8069,"1968-10-10"],
      "barry lyndon|1975|movie":[3175,"1975-12-16"],
      "barton fink|1991|movie":[290,"1991-08-01"],
      "batman begins|2005|movie":[272,"2005-06-10"],
      "batman forever|1995|movie":[414,"1995-06-16"],
      "batman v superman: el amanecer de la justicia|2016|movie":[209112,"2016-03-23"],
      "batman vuelve|1992|movie":[364,"1992-06-19"],
      "batman y robin|1997|movie":[415,"1997-06-20"],
      "batman: la lego pelicula|2017|movie":[324849,"2017-02-08"],
      "batman: la mascara del fantasma|1993|movie":[14919,"1993-12-25"],
      "batman: la serie animada|1992|tv":[2098,"1992-09-05"],
      "batman|1966|movie":[2661,"1966-07-30"],
      "batman|1989|movie":[268,"1989-06-21"],
      "ben-hur|1959|movie":[665,"1959-11-18"],
      "better call saul|2015|tv":[60059,"2015-02-08"],
      "bichos, una aventura en miniatura|1998|movie":[9487,"1998-11-25"],
      "bienvenidos al norte|2008|movie":[8265,"2008-02-20"],
      "bienvenidos al sur|2010|movie":[48415,"2010-10-01"],
      "birdman|2014|movie":[194662,"2014-10-17"],
      "black adam|2022|movie":[436270,"2022-10-19"],
      "black hawk derribado|2001|movie":[855,"2001-12-28"],
      "black mirror|2011|tv":[42009,"2011-12-04"],
      "black panther: wakanda forever|2022|movie":[505642,"2022-11-09"],
      "black panther|2018|movie":[284054,"2018-02-13"],
      "black swan|2010|movie":[44214,"2010-12-03"],
      "blackfish|2013|movie":[158999,"2013-06-07"],
      "blade runner 2049|2017|movie":[335984,"2017-10-04"],
      "blade runner|1982|movie":[78,"1982-06-25"],
      "blancanieves|2012|movie":[127864,"2012-09-28"],
      "blue beetle|2023|movie":[565770,"2023-08-16"],
      "booksmart|2019|movie":[505600,"2019-05-24"],
      "brave (indomable)|2012|movie":[62177,"2012-06-21"],
      "braveheart|1995|movie":[197,"1995-05-24"],
      "breaking bad|2008|tv":[1396,"2008-01-20"],
      "bruja escarlata y vision|2021|tv":[85271,"2021-01-15"],
      "buscando a dory|2016|movie":[127380,"2016-06-16"],
      "buscando a nemo|2003|movie":[12,"2003-05-30"],
      "buscando a sugar man|2012|movie":[84334,"2012-06-30"],
      "busqueda implacable|2008|movie":[8681,"2008-02-18"],
      "caballero luna|2022|tv":[92749,"2022-03-30"],
      "campeones|2018|movie":[456929,"2018-04-06"],
      "cantando bajo la lluvia|1952|movie":[872,"1952-04-10"],
      "capitan america: brave new world|2025|movie":[822119,"2025-02-12"],
      "capitan america: civil war|2016|movie":[271110,"2016-04-27"],
      "capitan america: el primer vengador|2011|movie":[1771,"2011-07-22"],
      "capitan america: el soldado de invierno|2014|movie":[100402,"2014-03-20"],
      "capitana marvel|2019|movie":[299537,"2019-03-06"],
      "carne tremula|1997|movie":[267,"1997-10-10"],
      "carros de fuego|1981|movie":[9443,"1981-05-15"],
      "cars 2|2011|movie":[49013,"2011-06-11"],
      "cars 3|2017|movie":[260514,"2017-06-15"],
      "cars|2006|movie":[920,"2006-06-08"],
      "cartas desde iwo jima|2006|movie":[1251,"2006-12-09"],
      "casablanca|1942|movie":[289,"1943-01-15"],
      "casino royale|2006|movie":[36557,"2006-11-14"],
      "casino|1995|movie":[524,"1995-11-22"],
      "cazafantasmas|1984|movie":[620,"1984-06-08"],
      "celda 211|2009|movie":[33273,"2009-11-06"],
      "centauros del desierto|1956|movie":[3114,"1956-05-16"],
      "chernobyl|2019|tv":[87108,"2019-05-06"],
      "chicago|2002|movie":[1574,"2002-12-10"],
      "chinatown|1974|movie":[829,"1974-06-20"],
      "cisne negro|2010|movie":[44214,"2010-12-03"],
      "ciudadano kane|1941|movie":[15,"1941-04-17"],
      "coco|2017|movie":[354912,"2017-10-27"],
      "coda|2021|movie":[776503,"2021-08-13"],
      "codigo fuente|2011|movie":[45612,"2011-03-30"],
      "coherence|2013|movie":[220289,"2014-04-06"],
      "colateral|2004|movie":[1538,"2004-08-04"],
      "comancheria|2016|movie":[338766,"2016-08-11"],
      "como perder a un chico en 10 dias|2003|movie":[9919,"2003-02-07"],
      "con air: convictos en el aire|1997|movie":[1701,"1997-06-05"],
      "con faldas y a lo loco|1959|movie":[239,"1959-03-19"],
      "con la muerte en los talones|1959|movie":[213,"1959-08-06"],
      "contact|1997|movie":[686,"1997-07-11"],
      "contratiempo|2016|movie":[411088,"2017-01-06"],
      "crash|2005|movie":[1640,"2005-05-06"],
      "creature commandos|2024|tv":[219543,"2024-12-05"],
      "crimen perfecto|1954|movie":[521,"1954-05-29"],
      "cuando harry encontro a sally|1989|movie":[639,"1989-07-12"],
      "cuatro bodas y un funeral|1994|movie":[712,"1994-03-09"],
      "cuentos de terramar|2006|movie":[37933,"2006-07-29"],
      "cuestion de tiempo|2013|movie":[122906,"2013-06-27"],
      "daredevil: born again|2025|tv":[202555,"2025-03-04"],
      "daredevil|2015|tv":[61889,"2015-04-10"],
      "dark|2017|tv":[70523,"2017-12-01"],
      "deadpool 2|2018|movie":[383498,"2018-05-15"],
      "deadpool y lobezno|2024|movie":[533535,"2024-07-24"],
      "deadpool|2016|movie":[293660,"2016-02-09"],
      "deadwood|2004|tv":[1406,"2004-03-21"],
      "death proof|2007|movie":[1991,"2007-05-22"],
      "definitivamente, quizas|2008|movie":[8390,"2008-02-08"],
      "dejame entrar|2008|movie":[13310,"2008-10-24"],
      "del reves (inside out)|2015|movie":[150540,"2015-06-17"],
      "del reves 2 (inside out 2)|2024|movie":[1022789,"2024-06-11"],
      "desde rusia con amor|1963|movie":[657,"1963-10-10"],
      "diamantes para la eternidad|1971|movie":[681,"1971-12-14"],
      "diario de una pasion|2004|movie":[11036,"2004-06-25"],
      "dirty dancing|1987|movie":[88,"1987-08-21"],
      "distrito 9|2009|movie":[17654,"2009-08-05"],
      "divorcio a la italiana|1961|movie":[20271,"1961-12-20"],
      "django desencadenado|2012|movie":[68718,"2012-12-25"],
      "doce hombres sin piedad|1957|movie":[389,"1957-04-10"],
      "doce monos|1995|movie":[63,"1995-12-29"],
      "doctor strange en el multiverso de la locura|2022|movie":[453395,"2022-05-04"],
      "doctor strange|2016|movie":[284052,"2016-10-25"],
      "dolor y gloria|2019|movie":[519010,"2019-03-22"],
      "donnie darko|2001|movie":[141,"2001-01-19"],
      "dos hombres y un destino|1969|movie":[642,"1969-09-23"],
      "dos tontos muy tontos|1994|movie":[8467,"1994-12-16"],
      "dredd|2012|movie":[49049,"2012-09-07"],
      "dune: parte dos|2024|movie":[693134,"2024-02-27"],
      "dune|2021|movie":[438631,"2021-09-15"],
      "dunkerque|2017|movie":[374720,"2017-07-19"],
      "e.t., el extraterrestre|1982|movie":[601,"1982-06-11"],
      "earwig y la bruja|2020|movie":[683127,"2021-02-03"],
      "echo|2024|tv":[122226,"2024-01-09"],
      "el acorazado potemkin|1925|movie":[643,"1925-12-24"],
      "el acto de matar|2012|movie":[123678,"2012-11-01"],
      "el apartamento|1960|movie":[284,"1960-06-21"],
      "el aro|2002|movie":[565,"2002-10-18"],
      "el asesino|2023|movie":[800158,"2023-10-25"],
      "el aviador|2004|movie":[2567,"2004-12-17"],
      "el bebe de rosemary|1968|movie":[805,"1968-06-12"],
      "el bueno, el feo y el malo|1966|movie":[429,"1966-12-23"],
      "el caballero oscuro: la leyenda renace|2012|movie":[49026,"2012-07-17"],
      "el caballero oscuro|2008|movie":[155,"2008-07-16"],
      "el cartero (il postino)|1994|movie":[11010,"1994-09-22"],
      "el caso bourne|2002|movie":[2501,"2002-06-14"],
      "el castillo ambulante|2004|movie":[4935,"2004-09-09"],
      "el castillo en el cielo|1986|movie":[10515,"1986-08-02"],
      "el cazador|1978|movie":[11778,"1978-12-08"],
      "el chico y la garza|2023|movie":[508883,"2023-07-14"],
      "el club de la lucha|1999|movie":[550,"1999-10-15"],
      "el color purpura|1985|movie":[873,"1985-12-18"],
      "el crepusculo de los dioses|1950|movie":[599,"1950-08-10"],
      "el cuento de la criada|2017|tv":[69478,"2017-04-26"],
      "el cuento de la princesa kaguya|2013|movie":[149871,"2013-11-23"],
      "el curioso caso de benjamin button|2008|movie":[4922,"2008-12-25"],
      "el dia de la bestia|1995|movie":[10722,"1995-10-20"],
      "el diario de bridget jones|2001|movie":[634,"2001-04-13"],
      "el dilema de las redes|2020|movie":[656690,"2020-01-26"],
      "el discurso del rey|2010|movie":[45269,"2010-11-26"],
      "el efecto mariposa|2004|movie":[1954,"2004-01-17"],
      "el escuadron suicida|2021|movie":[436969,"2021-07-28"],
      "el exorcista|1973|movie":[9552,"1973-12-26"],
      "el faro|2019|movie":[503919,"2019-10-18"],
      "el fuego de la venganza|2004|movie":[9509,"2004-04-23"],
      "el fugitivo|1993|movie":[5503,"1993-08-06"],
      "el gran lebowski|1998|movie":[115,"1998-03-06"],
      "el hobbit: la batalla de los cinco ejercitos|2014|movie":[122917,"2014-12-10"],
      "el hobbit: la desolacion de smaug|2013|movie":[57158,"2013-12-11"],
      "el hobbit: un viaje inesperado|2012|movie":[49051,"2012-12-12"],
      "el hombre de acero|2013|movie":[49521,"2013-06-12"],
      "el hombre de al lado|2009|movie":[47383,"2009-11-13"],
      "el hombre de la pistola de oro|1974|movie":[682,"1974-12-04"],
      "el hombre que mato a liberty valance|1962|movie":[11697,"1962-04-13"],
      "el hombre que nunca estuvo alli|2001|movie":[10778,"2001-10-26"],
      "el hoyo|2019|movie":[619264,"2019-11-08"],
      "el imperio del sol|1987|movie":[10110,"1987-12-09"],
      "el increible hulk|2008|movie":[1724,"2008-06-12"],
      "el irlandes|2019|movie":[398978,"2019-11-01"],
      "el juego|1997|movie":[2649,"1997-09-12"],
      "el laberinto del fauno|2006|movie":[1417,"2006-10-11"],
      "el lado bueno de las cosas|2012|movie":[82693,"2012-11-16"],
      "el lobo de wall street|2013|movie":[106646,"2013-12-25"],
      "el manana nunca muere|1997|movie":[714,"1997-12-11"],
      "el ministerio del tiempo|2015|tv":[62099,"2015-02-24"],
      "el mundo nunca es suficiente|1999|movie":[36643,"1999-11-17"],
      "el mundo perdido: jurassic park|1997|movie":[330,"1997-05-23"],
      "el orfanato|2007|movie":[6537,"2007-05-20"],
      "el paciente ingles|1996|movie":[409,"1996-11-14"],
      "el padrino|1972|movie":[238,"1972-03-14"],
      "el pinguino|2024|tv":[194764,"2024-09-19"],
      "el poder del perro|2021|movie":[600583,"2021-10-25"],
      "el puente sobre el rio kwai|1957|movie":[826,"1957-10-11"],
      "el recuerdo de marnie|2014|movie":[242828,"2014-07-19"],
      "el resplandor|1980|movie":[694,"1980-05-23"],
      "el robo del siglo|2020|movie":[609242,"2020-01-16"],
      "el senor de los anillos: el retorno del rey|2003|movie":[122,"2003-12-17"],
      "el senor de los anillos: la comunidad del anillo|2001|movie":[120,"2001-12-18"],
      "el senor de los anillos: la guerra de los rohirrim|2024|movie":[839033,"2024-12-05"],
      "el senor de los anillos: las dos torres|2002|movie":[121,"2002-12-18"],
      "el senor de los anillos: los anillos de poder|2022|tv":[84773,"2022-09-01"],
      "el sexto sentido|1999|movie":[745,"1999-08-06"],
      "el silencio de los corderos|1991|movie":[274,"1991-02-14"],
      "el submarino|1981|movie":[387,"1981-09-17"],
      "el tiempo en sus manos|1960|movie":[2134,"1960-05-25"],
      "el tren de las 3:10|2007|movie":[5176,"2007-09-06"],
      "el truco final|2006|movie":[1124,"2006-10-19"],
      "el ultimatum de bourne|2007|movie":[2503,"2007-08-03"],
      "el ultimo emperador|1987|movie":[746,"1987-10-04"],
      "el viaje de arlo|2015|movie":[105864,"2015-11-14"],
      "el viaje de chihiro|2001|movie":[129,"2001-07-20"],
      "el viento se levanta|2013|movie":[149870,"2013-07-20"],
      "elemental|2023|movie":[976573,"2023-06-14"],
      "elf|2003|movie":[10719,"2003-11-07"],
      "elio|2025|movie":[1022787,"2025-06-18"],
      "en busca del arca perdida|1981|movie":[85,"1981-06-12"],
      "en tierra hostil|2009|movie":[12162,"2008-10-10"],
      "encadenados|1946|movie":[303,"1946-08-21"],
      "encuentros en la tercera fase|1977|movie":[840,"1977-12-14"],
      "enemigo|2013|movie":[181886,"2013-09-08"],
      "enemy|2013|movie":[181886,"2013-09-08"],
      "entre tinieblas|1983|movie":[8220,"1983-10-03"],
      "erase una vez en... hollywood|2019|movie":[466272,"2019-07-24"],
      "eraserhead|1977|movie":[985,"1977-09-28"],
      "escape de nueva york|1981|movie":[1103,"1981-05-23"],
      "escondidos en brujas|2008|movie":[8321,"2008-02-08"],
      "escuadron suicida|2016|movie":[297761,"2016-08-03"],
      "espartaco|1960|movie":[967,"1960-10-13"],
      "estacion zombie: busan|2016|movie":[396535,"2016-07-20"],
      "eternals|2021|movie":[524434,"2021-11-03"],
      "eterno resplandor de una mente sin recuerdos|2004|movie":[38,"2004-03-19"],
      "everything everywhere all at once|2022|movie":[545611,"2022-03-24"],
      "ex machina|2014|movie":[264660,"2015-01-21"],
      "expediente warren|2013|movie":[138843,"2013-07-18"],
      "extranos en un tren|1951|movie":[845,"1951-06-27"],
      "eyes wide shut|1999|movie":[345,"1999-07-16"],
      "fahrenheit 9/11|2004|movie":[1777,"2004-06-25"],
      "falcon y el soldado de invierno|2021|tv":[88396,"2021-03-19"],
      "fargo|1996|movie":[275,"1996-03-08"],
      "fargo|2014|tv":[60622,"2014-04-15"],
      "fast & furious 5|2011|movie":[51497,"2011-04-20"],
      "fast & furious 6|2013|movie":[82992,"2013-05-21"],
      "fast & furious 7|2015|movie":[168259,"2015-04-01"],
      "fast & furious 8|2017|movie":[337339,"2017-04-12"],
      "fast & furious 9|2021|movie":[385128,"2021-05-19"],
      "fast & furious x|2023|movie":[385687,"2023-05-17"],
      "fast & furious: aun mas rapido|2009|movie":[13804,"2009-04-02"],
      "fast & furious: hobbs & shaw|2019|movie":[384018,"2019-07-31"],
      "flash|2023|movie":[298618,"2023-06-13"],
      "fleabag|2016|tv":[67070,"2016-07-21"],
      "following|1998|movie":[11660,"1999-04-02"],
      "forrest gump|1994|movie":[13,"1994-06-23"],
      "fractura|2019|movie":[568091,"2019-09-22"],
      "free solo|2018|movie":[515042,"2018-09-28"],
      "frenesi|1972|movie":[573,"1972-05-25"],
      "full monty|1997|movie":[9427,"1997-08-13"],
      "furiosa: de la saga mad max|2024|movie":[786892,"2024-05-22"],
      "gandhi|1982|movie":[783,"1982-12-01"],
      "gente corriente|1980|movie":[16619,"1980-09-19"],
      "ghost, mas alla del amor|1990|movie":[251,"1990-07-13"],
      "gladiator|2000|movie":[98,"2000-05-04"],
      "godzilla vs. kong|2021|movie":[399566,"2021-03-24"],
      "godzilla y kong: el nuevo imperio|2024|movie":[823464,"2024-03-27"],
      "godzilla: rey de los monstruos|2019|movie":[373571,"2019-05-29"],
      "godzilla|2014|movie":[124905,"2014-05-14"],
      "goldeneye|1995|movie":[710,"1995-11-16"],
      "goldfinger|1964|movie":[658,"1964-09-20"],
      "gravity|2013|movie":[49047,"2013-10-03"],
      "green book|2018|movie":[490132,"2018-11-16"],
      "green room|2015|movie":[313922,"2016-04-15"],
      "grupo salvaje|1969|movie":[576,"1969-06-19"],
      "guardianes de la galaxia vol. 2|2017|movie":[283995,"2017-04-25"],
      "guardianes de la galaxia vol. 3|2023|movie":[447365,"2023-05-03"],
      "guardianes de la galaxia: especial felices fiestas|2022|movie":[774752,"2022-11-24"],
      "guardianes de la galaxia|2014|movie":[118340,"2014-07-30"],
      "hable con ella|2002|movie":[64,"2002-03-15"],
      "halloween 4: el regreso de michael myers|1988|movie":[11357,"1988-10-21"],
      "halloween 5: la venganza de michael myers|1989|movie":[11361,"1989-10-12"],
      "halloween h20: 20 anos despues|1998|movie":[11675,"1998-08-05"],
      "halloween iii: el dia de la bruja|1982|movie":[10676,"1982-10-22"],
      "halloween ii|1981|movie":[11281,"1981-10-30"],
      "halloween ii|2009|movie":[24150,"2009-08-28"],
      "halloween kills|2021|movie":[610253,"2021-10-14"],
      "halloween: el final|2022|movie":[616820,"2022-10-12"],
      "halloween: el origen|2007|movie":[2082,"2007-08-31"],
      "halloween: la maldicion de michael myers|1995|movie":[10987,"1995-09-29"],
      "halloween: resurreccion|2002|movie":[11442,"2002-07-01"],
      "harry potter y el caliz de fuego|2005|movie":[674,"2005-11-16"],
      "harry potter y el misterio del principe|2009|movie":[767,"2009-07-15"],
      "harry potter y el prisionero de azkaban|2004|movie":[673,"2004-05-31"],
      "harry potter y la camara secreta|2002|movie":[672,"2002-11-13"],
      "harry potter y la orden del fenix|2007|movie":[675,"2007-07-08"],
      "harry potter y la piedra filosofal|2001|movie":[671,"2001-11-16"],
      "harry potter y las reliquias de la muerte - parte 1|2010|movie":[12444,"2010-11-17"],
      "harry potter y las reliquias de la muerte - parte 2|2011|movie":[12445,"2011-07-12"],
      "haru en el reino de los gatos|2002|movie":[15370,"2002-07-19"],
      "hasta el ultimo hombre|2016|movie":[324786,"2016-10-07"],
      "hasta que llego su hora|1968|movie":[335,"1968-12-21"],
      "heathers: escuela de jovenes asesinos|1988|movie":[2640,"1989-03-31"],
      "heat|1995|movie":[949,"1995-12-15"],
      "hereditary|2018|movie":[493922,"2018-06-07"],
      "hermanos de sangre|2001|tv":[4613,"2001-09-09"],
      "her|2013|movie":[152601,"2013-12-18"],
      "hoppers|2026|movie":[1327819,"2026-03-04"],
      "hot fuzz|2007|movie":[4638,"2007-02-14"],
      "icarus|2017|movie":[432976,"2017-06-03"],
      "identidad|2003|movie":[2832,"2003-04-25"],
      "incendies|2010|movie":[46738,"2010-09-17"],
      "indiana jones y el dial del destino|2023|movie":[335977,"2023-06-25"],
      "indiana jones y el reino de la calavera de cristal|2008|movie":[217,"2008-05-21"],
      "indiana jones y el templo maldito|1984|movie":[87,"1984-05-23"],
      "indiana jones y la ultima cruzada|1989|movie":[89,"1989-05-24"],
      "infiltrados|2006|movie":[1422,"2006-10-04"],
      "insidious|2010|movie":[49018,"2011-03-31"],
      "insomnia|2002|movie":[320,"2002-05-24"],
      "interstellar|2014|movie":[157336,"2014-11-04"],
      "intocable|2011|movie":[77338,"2011-11-02"],
      "invasion secreta|2023|tv":[114472,"2023-06-21"],
      "iron fist|2017|tv":[62127,"2017-03-17"],
      "iron man 2|2010|movie":[10138,"2010-04-28"],
      "iron man 3|2013|movie":[68721,"2013-04-18"],
      "iron man|2008|movie":[1726,"2008-04-30"],
      "ironheart|2025|tv":[114471,"2025-06-24"],
      "it follows|2014|movie":[270303,"2015-02-04"],
      "jackie brown|1997|movie":[184,"1997-12-25"],
      "jessica jones|2015|tv":[38472,"2015-11-20"],
      "jigsaw|2017|movie":[298250,"2017-10-25"],
      "jodorowsky's dune|2013|movie":[191720,"2013-08-30"],
      "john wick 4|2023|movie":[603692,"2023-03-21"],
      "john wick: pacto de sangre|2017|movie":[324552,"2017-02-08"],
      "john wick: parabellum|2019|movie":[458156,"2019-05-15"],
      "john wick|2014|movie":[245891,"2014-10-16"],
      "jojo rabbit|2019|movie":[515001,"2019-10-18"],
      "juego de tronos|2011|tv":[1399,"2011-04-17"],
      "julie & julia|2009|movie":[24803,"2009-08-06"],
      "julieta|2016|movie":[332872,"2016-04-08"],
      "jungla de cristal|1988|movie":[562,"1988-07-15"],
      "jurassic world: campamento cretacico|2020|tv":[93741,"2020-09-18"],
      "jurassic world: dominion|2022|movie":[507086,"2022-06-01"],
      "jurassic world: el reino caido|2018|movie":[351286,"2018-06-06"],
      "jurassic world: el renacer|2025|movie":[1234821,"2025-06-23"],
      "jurassic world: teoria del caos|2024|tv":[237512,"2024-05-24"],
      "jurassic world|2015|movie":[135397,"2015-06-06"],
      "kika|1993|movie":[8223,"1993-10-29"],
      "kill bill: volumen 1|2003|movie":[24,"2003-10-10"],
      "kill bill: volumen 2|2004|movie":[393,"2004-04-16"],
      "kingsman: servicio secreto|2014|movie":[207703,"2015-01-24"],
      "kong: la isla calavera|2017|movie":[293167,"2017-03-08"],
      "kramer contra kramer|1979|movie":[12102,"1979-12-07"],
      "la 40 anos virgen|2005|movie":[6957,"2005-08-11"],
      "la balada de buster scruggs|2018|movie":[537996,"2018-11-09"],
      "la boda de mi mejor amiga|2011|movie":[55721,"2011-05-13"],
      "la boda de mi mejor amigo|1997|movie":[8874,"1997-06-19"],
      "la bruja|2015|movie":[310131,"2015-01-27"],
      "la cabana en el bosque|2012|movie":[22970,"2012-04-12"],
      "la casa de papel|2017|tv":[71446,"2017-05-02"],
      "la cena de los idiotas|1998|movie":[9421,"1998-04-15"],
      "la chaqueta metalica|1987|movie":[600,"1987-06-26"],
      "la chica del tren|2016|movie":[346685,"2016-10-05"],
      "la colina de las amapolas|2011|movie":[83389,"2011-07-16"],
      "la comunidad|2000|movie":[11477,"2000-09-29"],
      "la cosa|1982|movie":[1091,"1982-06-25"],
      "la delgada linea roja|1998|movie":[8741,"1998-12-23"],
      "la diligencia|1939|movie":[995,"1939-03-02"],
      "la espia que me amo|1977|movie":[691,"1977-07-07"],
      "la familia belier|2014|movie":[304410,"2014-12-17"],
      "la flor de mi secreto|1995|movie":[4307,"1995-09-22"],
      "la forma del agua|2017|movie":[399055,"2017-12-01"],
      "la fuerza del carino|1983|movie":[11050,"1983-11-20"],
      "la gran evasion|1963|movie":[5925,"1963-07-03"],
      "la guerra de los mundos|2005|movie":[74,"2005-06-28"],
      "la habitacion de al lado|2024|movie":[1088514,"2024-10-07"],
      "la habitacion del panico|2002|movie":[4547,"2002-03-29"],
      "la habitacion|2015|movie":[264644,"2015-10-16"],
      "la huerfana|2009|movie":[21208,"2009-07-24"],
      "la la land|2016|movie":[313369,"2016-12-01"],
      "la ley del deseo|1987|movie":[4043,"1987-02-07"],
      "la liga de la justicia de zack snyder|2021|movie":[791373,"2021-03-18"],
      "la lista de schindler|1993|movie":[424,"1993-12-15"],
      "la llegada|2016|movie":[329865,"2016-11-10"],
      "la mala educacion|2004|movie":[140,"2004-03-19"],
      "la maldicion del hombre lobo|2022|movie":[894205,"2022-09-25"],
      "la marcha de los pinguinos|2005|movie":[1667,"2005-01-26"],
      "la matanza de texas|1974|movie":[30497,"1974-10-11"],
      "la naranja mecanica|1971|movie":[185,"1971-10-28"],
      "la noche de halloween|1978|movie":[948,"1978-10-25"],
      "la noche de halloween|2018|movie":[424139,"2018-10-18"],
      "la ola|2008|movie":[7735,"2008-03-13"],
      "la piel que habito|2011|movie":[63311,"2011-08-17"],
      "la princesa mononoke|1997|movie":[128,"1997-07-12"],
      "la profecia|1976|movie":[794,"1976-06-25"],
      "la red social|2010|movie":[37799,"2010-10-01"],
      "la redada asesina|2011|movie":[94329,"2012-03-22"],
      "la soga|1948|movie":[1580,"1948-02-01"],
      "la sombra de una duda|1943|movie":[21734,"1943-01-15"],
      "la tortuga roja|2016|movie":[337703,"2016-03-27"],
      "la tumba de las luciernagas|1988|movie":[12477,"1988-04-16"],
      "la ventana indiscreta|1954|movie":[567,"1954-08-01"],
      "la vida de brian|1979|movie":[583,"1979-08-17"],
      "la vida es bella|1997|movie":[637,"1997-12-20"],
      "laberinto de pasiones|1982|movie":[8219,"1982-09-29"],
      "las aventuras del joven indiana jones|1992|tv":[661,"1992-03-04"],
      "leon: el profesional|1994|movie":[101,"1994-09-14"],
      "licencia para matar|1989|movie":[709,"1989-06-13"],
      "lightyear|2022|movie":[718789,"2022-06-15"],
      "lincoln|2012|movie":[72976,"2012-11-09"],
      "lo que el pulpo me enseno|2020|movie":[682110,"2020-09-04"],
      "lo que el viento se llevo|1939|movie":[770,"1939-12-15"],
      "lobezno inmortal|2013|movie":[76170,"2013-07-24"],
      "locamente millonarios|2018|movie":[455207,"2018-08-15"],
      "locke|2013|movie":[210479,"2013-09-02"],
      "loco por mary|1998|movie":[544,"1998-07-15"],
      "loco y estupido amor|2011|movie":[50646,"2011-07-29"],
      "logan lucky|2017|movie":[399170,"2017-08-17"],
      "logan|2017|movie":[263115,"2017-02-28"],
      "loki|2021|tv":[84958,"2021-06-09"],
      "lolita|1962|movie":[802,"1962-06-13"],
      "looper|2012|movie":[59967,"2012-09-26"],
      "los 4 fantasticos: primeros pasos|2025|movie":[617126,"2025-07-23"],
      "los abrazos rotos|2009|movie":[8088,"2009-03-18"],
      "los amantes pasajeros|2013|movie":[144789,"2013-03-08"],
      "los asesinos de la luna|2023|movie":[466420,"2023-10-18"],
      "los cronocrimenes|2007|movie":[14139,"2007-11-01"],
      "los fabelman|2022|movie":[804095,"2022-11-11"],
      "los increibles 2|2018|movie":[260513,"2018-06-14"],
      "los increibles|2004|movie":[9806,"2004-10-27"],
      "los odiosos ocho|2015|movie":[273248,"2015-12-25"],
      "los ojos de wakanda|2025|tv":[241388,"2025-08-01"],
      "los otros|2001|movie":[1933,"2001-08-02"],
      "los pajaros|1963|movie":[571,"1963-03-28"],
      "los siete magnificos|1960|movie":[966,"1960-10-12"],
      "los soprano|1999|tv":[1398,"1999-01-10"],
      "los sospechosos de siempre|1995|movie":[629,"1995-07-19"],
      "los vengadores|2012|movie":[24428,"2012-04-25"],
      "los visitantes|1993|movie":[11687,"1993-01-27"],
      "luca|2021|movie":[508943,"2021-06-17"],
      "luke cage|2016|tv":[62126,"2016-09-30"],
      "lupin|2021|tv":[96677,"2021-01-08"],
      "mad max 2: el guerrero de la carretera|1981|movie":[8810,"1981-12-24"],
      "mad max: furia en la carretera|2015|movie":[76341,"2015-05-13"],
      "mad max: mas alla de la cupula del trueno|1985|movie":[9355,"1985-06-29"],
      "mad max|1979|movie":[9659,"1979-04-12"],
      "mad men|2007|tv":[1104,"2007-07-19"],
      "madres paralelas|2021|movie":[766798,"2021-10-08"],
      "malas calles|1973|movie":[203,"1973-10-14"],
      "malditos bastardos|2009|movie":[16869,"2009-08-02"],
      "man on wire|2008|movie":[14048,"2008-08-01"],
      "mank|2020|movie":[614560,"2020-11-13"],
      "mar adentro|2004|movie":[1913,"2004-09-03"],
      "marnie, la ladrona|1964|movie":[506,"1964-07-17"],
      "marvel zombis|2025|tv":[138505,"2025-09-24"],
      "matador|1986|movie":[8047,"1986-03-07"],
      "matrix reloaded|2003|movie":[604,"2003-05-15"],
      "matrix resurrections|2021|movie":[624860,"2021-12-16"],
      "matrix revolutions|2003|movie":[605,"2003-11-05"],
      "matrix|1999|movie":[603,"1999-03-31"],
      "maxima velocidad|1994|movie":[1637,"1994-06-09"],
      "memento|2000|movie":[77,"2000-10-11"],
      "memorias de africa|1985|movie":[606,"1985-12-20"],
      "metropolis|1927|movie":[19,"1927-01-10"],
      "mi vecino totoro|1988|movie":[8392,"1988-04-16"],
      "midsommar|2019|movie":[530385,"2019-07-03"],
      "miedo y asco en las vegas|1998|movie":[1878,"1998-05-22"],
      "millennium: los hombres que no amaban a las mujeres|2011|movie":[65754,"2011-12-14"],
      "million dollar baby|2004|movie":[70,"2004-12-05"],
      "mindhunter|2017|tv":[67744,"2017-10-13"],
      "minority report|2002|movie":[180,"2002-06-20"],
      "mis vecinos los yamada|1999|movie":[16198,"1999-07-17"],
      "mision imposible: protocolo fantasma|2011|movie":[56292,"2011-12-07"],
      "mision: imposible - fallout|2018|movie":[353081,"2018-07-25"],
      "mision: imposible - nacion secreta|2015|movie":[177677,"2015-07-28"],
      "mision: imposible - sentencia final|2025|movie":[575265,"2025-05-17"],
      "mision: imposible - sentencia mortal parte uno|2023|movie":[575264,"2023-07-08"],
      "mision: imposible 2|2000|movie":[955,"2000-05-24"],
      "mision: imposible iii|2006|movie":[956,"2006-04-25"],
      "mision: imposible|1996|movie":[954,"1996-05-22"],
      "monarch: el legado de los monstruos|2023|tv":[202411,"2023-11-16"],
      "monstruos university|2013|movie":[62211,"2013-06-19"],
      "monstruos, s.a.|2001|movie":[585,"2001-11-01"],
      "moonlight|2016|movie":[376867,"2016-10-21"],
      "moonraker|1979|movie":[698,"1979-06-26"],
      "moon|2009|movie":[17431,"2009-06-12"],
      "ms. marvel|2022|tv":[92782,"2022-06-08"],
      "muere otro dia|2002|movie":[36669,"2002-11-17"],
      "muerte entre las flores|1990|movie":[379,"1990-09-21"],
      "mujeres al borde de un ataque de nervios|1988|movie":[4203,"1988-03-25"],
      "mulholland drive|2001|movie":[1018,"2001-06-06"],
      "muneca rusa|2019|tv":[84977,"2019-02-01"],
      "munich|2005|movie":[612,"2005-12-23"],
      "nadie|2021|movie":[615457,"2021-03-18"],
      "nausicaa del valle del viento|1984|movie":[81,"1984-03-11"],
      "nicky, la aprendiz de bruja|1989|movie":[16859,"1989-07-29"],
      "nightcrawler|2014|movie":[242582,"2014-10-23"],
      "no es pais para viejos|2007|movie":[6977,"2007-11-09"],
      "nomadland|2020|movie":[581734,"2021-01-29"],
      "notting hill|1999|movie":[509,"1999-05-21"],
      "nunca me abandones|2010|movie":[42188,"2010-03-18"],
      "o brother, where art thou?|2000|movie":[134,"2000-08-30"],
      "o.j.: made in america|2016|tv":[66738,"2016-06-11"],
      "obi-wan kenobi|2022|tv":[92830,"2022-05-26"],
      "ocean's eleven|2001|movie":[161,"2001-12-07"],
      "ocho apellidos vascos|2014|movie":[236737,"2014-03-14"],
      "octopussy|1983|movie":[700,"1983-06-05"],
      "ojo de halcon|2021|tv":[88329,"2021-11-24"],
      "oldboy|2003|movie":[670,"2003-11-21"],
      "onward|2020|movie":[508439,"2020-02-29"],
      "operacion trueno|1965|movie":[660,"1965-12-11"],
      "oppenheimer|2023|movie":[872585,"2023-07-19"],
      "orgullo y prejuicio|2005|movie":[4348,"2005-09-16"],
      "origen|2010|movie":[27205,"2010-07-15"],
      "oss 117: el cairo, nido de espias|2006|movie":[15152,"2006-04-19"],
      "pacificador|2022|tv":[110492,"2022-01-13"],
      "paddington|2014|movie":[116149,"2014-11-23"],
      "palm springs|2020|movie":[587792,"2020-07-10"],
      "pan y tulipanes|2000|movie":[552,"2000-03-03"],
      "pandillas de nueva york|2002|movie":[3131,"2002-12-14"],
      "panorama para matar|1985|movie":[707,"1985-05-24"],
      "parasitos|2019|movie":[496243,"2019-05-30"],
      "parque jurasico iii|2001|movie":[331,"2001-07-18"],
      "parque jurasico|1993|movie":[329,"1993-06-11"],
      "paseando a miss daisy|1989|movie":[403,"1989-12-13"],
      "peaky blinders|2013|tv":[60574,"2013-09-12"],
      "peloton|1986|movie":[792,"1986-12-19"],
      "perdicion|1944|movie":[996,"1944-07-06"],
      "perdida|2014|movie":[210577,"2014-10-01"],
      "perdiendo el norte|2015|movie":[264729,"2015-03-03"],
      "perfectos desconocidos|2016|movie":[381341,"2016-02-11"],
      "perfectos desconocidos|2017|movie":[435126,"2017-12-01"],
      "perros de reserva|1992|movie":[500,"1992-09-02"],
      "pesadilla en elm street|1984|movie":[377,"1984-11-09"],
      "plan oculto|2006|movie":[388,"2006-03-17"],
      "platoon|1986|movie":[792,"1986-12-19"],
      "poltergeist|1982|movie":[609,"1982-06-04"],
      "polytechnique|2009|movie":[22302,"2009-02-06"],
      "pompoko|1994|movie":[15283,"1994-07-16"],
      "ponyo en el acantilado|2008|movie":[12429,"2008-07-19"],
      "porco rosso|1992|movie":[11621,"1992-07-18"],
      "posesion infernal|1981|movie":[764,"1983-01-16"],
      "predestination|2014|movie":[206487,"2014-08-28"],
      "primer|2004|movie":[14337,"2004-10-08"],
      "prisioneros|2013|movie":[146233,"2013-09-19"],
      "prometheus|2012|movie":[70981,"2012-05-30"],
      "psicosis|1960|movie":[539,"1960-06-22"],
      "puedo escuchar el mar|1993|movie":[21057,"1993-10-09"],
      "puente de espias|2015|movie":[296098,"2015-10-15"],
      "pulp fiction|1994|movie":[680,"1994-09-10"],
      "quantum of solace|2008|movie":[10764,"2008-10-29"],
      "rain man|1988|movie":[380,"1988-12-12"],
      "ratatouille|2007|movie":[2062,"2007-06-28"],
      "ready player one|2018|movie":[333339,"2018-03-28"],
      "rebeca|1940|movie":[223,"1940-03-23"],
      "recuerdos del ayer|1991|movie":[15080,"1991-07-20"],
      "red|2022|movie":[508947,"2022-03-10"],
      "regreso al futuro: parte iii|1990|movie":[196,"1990-05-25"],
      "regreso al futuro: parte ii|1989|movie":[165,"1989-11-22"],
      "regreso al futuro|1985|movie":[105,"1985-07-03"],
      "relatos salvajes|2014|movie":[265195,"2014-08-21"],
      "resacon en las vegas|2009|movie":[18785,"2009-06-02"],
      "reservoir dogs|1992|movie":[500,"1992-09-02"],
      "rififi|1955|movie":[934,"1955-04-13"],
      "rio bravo|1959|movie":[301,"1959-03-08"],
      "rio rojo|1948|movie":[3089,"1948-09-17"],
      "rogue one: una historia de star wars|2016|movie":[330459,"2016-12-14"],
      "rompenieves|2013|movie":[110415,"2013-08-01"],
      "rrr|2022|movie":[579974,"2022-03-24"],
      "salvar al soldado ryan|1998|movie":[857,"1998-07-24"],
      "sangre facil|1984|movie":[11368,"1985-01-18"],
      "saw iii|2006|movie":[214,"2006-10-26"],
      "saw ii|2005|movie":[215,"2005-10-28"],
      "saw iv|2007|movie":[663,"2007-10-25"],
      "saw vii 3d|2010|movie":[41439,"2010-10-22"],
      "saw vi|2009|movie":[22804,"2009-10-22"],
      "saw v|2008|movie":[11917,"2008-10-23"],
      "saw x|2023|movie":[951491,"2023-09-27"],
      "saw|2004|movie":[176,"2004-10-01"],
      "scarface: el precio del poder|1983|movie":[111,"1983-12-09"],
      "scream (vigila quien llama)|1996|movie":[4232,"1996-12-20"],
      "scream 2|1997|movie":[4233,"1997-12-12"],
      "scream 3|2000|movie":[4234,"2000-02-04"],
      "scream 4|2011|movie":[41446,"2011-04-13"],
      "scream 7|2026|movie":[1159559,"2026-02-25"],
      "scream vi|2023|movie":[934433,"2023-03-08"],
      "scream|1996|movie":[4232,"1996-12-20"],
      "scream|2022|movie":[646385,"2022-01-12"],
      "sed de mal|1958|movie":[1480,"1958-03-30"],
      "senderos de gloria|1957|movie":[975,"1957-10-25"],
      "seven|1995|movie":[807,"1995-09-22"],
      "shakespeare in love|1998|movie":[1934,"1998-12-11"],
      "shang-chi y la leyenda de los diez anillos|2021|movie":[566525,"2021-09-01"],
      "she-hulk: abogada hulka|2022|tv":[92783,"2022-08-18"],
      "sherlock|2010|tv":[19885,"2010-07-25"],
      "showgirls|1995|movie":[10802,"1995-09-22"],
      "shutter island|2010|movie":[11324,"2010-02-14"],
      "sicario|2015|movie":[273481,"2015-09-17"],
      "silencio|2016|movie":[68730,"2016-12-23"],
      "sin novedad en el frente|2022|movie":[49046,"2022-10-07"],
      "sin perdon|1992|movie":[33,"1992-08-07"],
      "sin tiempo para morir|2021|movie":[370172,"2021-09-29"],
      "sinister|2012|movie":[82507,"2012-10-04"],
      "skyfall|2012|movie":[37724,"2012-10-24"],
      "slumdog millionaire|2008|movie":[12405,"2008-11-12"],
      "solo ante el peligro|1952|movie":[288,"1952-06-09"],
      "solo para sus ojos|1981|movie":[699,"1981-06-24"],
      "solo se vive dos veces|1967|movie":[667,"1967-06-13"],
      "solo: una historia de star wars|2018|movie":[348350,"2018-05-15"],
      "soul|2020|movie":[508442,"2020-12-25"],
      "spectre|2015|movie":[206647,"2015-10-26"],
      "spider-man: brand new day|2026|movie":[969681,"2026-07-29"],
      "spider-man: homecoming|2017|movie":[315635,"2017-07-05"],
      "spider-man: lejos de casa|2019|movie":[429617,"2019-06-28"],
      "spider-man: no way home|2021|movie":[634649,"2021-12-15"],
      "spiral: saw|2021|movie":[602734,"2021-05-12"],
      "spotlight|2015|movie":[314365,"2015-11-06"],
      "star wars rebels|2014|tv":[60554,"2014-10-13"],
      "star wars: episodio i - la amenaza fantasma|1999|movie":[1893,"1999-05-19"],
      "star wars: episodio ii - el ataque de los clones|2002|movie":[1894,"2002-05-15"],
      "star wars: episodio iii - la venganza de los sith|2005|movie":[1895,"2005-05-17"],
      "star wars: episodio iv - una nueva esperanza|1977|movie":[11,"1977-05-25"],
      "star wars: episodio ix - el ascenso de skywalker|2019|movie":[181812,"2019-12-18"],
      "star wars: episodio v - el imperio contraataca|1980|movie":[1891,"1980-05-20"],
      "star wars: episodio vi - el retorno del jedi|1983|movie":[1892,"1983-05-25"],
      "star wars: episodio vii - el despertar de la fuerza|2015|movie":[140607,"2015-12-15"],
      "star wars: episodio viii - los ultimos jedi|2017|movie":[181808,"2017-12-13"],
      "star wars: la guerra de los clones|2008|tv":[4194,"2008-10-03"],
      "stargate atlantis|2004|tv":[2290,"2004-07-15"],
      "stargate origins|2018|tv":[72925,"2018-02-14"],
      "stargate sg-1|1997|tv":[4629,"1997-07-27"],
      "stargate universe|2009|tv":[5148,"2009-10-02"],
      "stargate: arca de la verdad|2008|movie":[13001,"2008-03-11"],
      "stargate: continuum|2008|movie":[12914,"2008-07-29"],
      "stargate|1994|movie":[2164,"1994-10-28"],
      "stranger things|2016|tv":[66732,"2016-07-15"],
      "succession|2018|tv":[76331,"2018-06-03"],
      "superbad|2007|movie":[8363,"2007-08-17"],
      "superman|2025|movie":[1061474,"2025-07-09"],
      "susurros del corazon|1995|movie":[37797,"1995-07-15"],
      "swiss army man|2016|movie":[347031,"2016-06-24"],
      "tacones lejanos|1991|movie":[8222,"1991-10-23"],
      "tales of the jedi|2022|tv":[203085,"2022-10-26"],
      "tarde de perros|1975|movie":[968,"1975-09-21"],
      "taxi driver|1976|movie":[103,"1976-02-09"],
      "telefono rojo, ¿volamos hacia moscu?|1964|movie":[935,"1964-01-29"],
      "tenet|2020|movie":[577922,"2020-08-22"],
      "terciopelo azul|1986|movie":[793,"1986-09-19"],
      "terminator 2: el juicio final|1991|movie":[280,"1991-07-03"],
      "terminator 3|2003|movie":[296,"2003-07-02"],
      "terminator: destino oscuro|2019|movie":[290859,"2019-10-23"],
      "terminator: genesis|2015|movie":[87101,"2015-06-23"],
      "terminator: la salvacion|2009|movie":[534,"2009-05-20"],
      "terminator|1984|movie":[218,"1984-10-26"],
      "tesis|1996|movie":[9299,"1996-04-11"],
      "the artist|2011|movie":[74643,"2011-10-12"],
      "the bank job|2008|movie":[8848,"2008-02-28"],
      "the batman|2022|movie":[414906,"2022-03-01"],
      "the bear|2022|tv":[136315,"2022-06-23"],
      "the book of boba fett|2021|tv":[115036,"2021-12-29"],
      "the continental|2023|tv":[72710,"2023-09-22"],
      "the crown|2016|tv":[65494,"2016-11-04"],
      "the defenders|2017|tv":[62285,"2017-08-18"],
      "the game|1997|movie":[2649,"1997-09-12"],
      "the mandalorian|2019|tv":[82856,"2019-11-12"],
      "the marvels|2023|movie":[609681,"2023-11-08"],
      "the punisher: one last kill|2026|movie":[1439930,"2026-05-12"],
      "the punisher|2017|tv":[67178,"2017-11-17"],
      "the rocky horror picture show|1975|movie":[36685,"1975-08-14"],
      "the town|2010|movie":[23168,"2010-09-15"],
      "the wire|2002|tv":[1438,"2002-06-02"],
      "thor: el mundo oscuro|2013|movie":[76338,"2013-10-30"],
      "thor: love and thunder|2022|movie":[616037,"2022-07-06"],
      "thor: ragnarok|2017|movie":[284053,"2017-10-24"],
      "thor|2011|movie":[10195,"2011-04-27"],
      "thunderbolts|2025|movie":[986056,"2025-04-30"],
      "tiburon|1975|movie":[578,"1975-06-20"],
      "tiempos modernos|1936|movie":[3082,"1936-02-05"],
      "titanic|1997|movie":[597,"1997-12-18"],
      "toc toc|2017|movie":[437033,"2017-09-01"],
      "todo sobre mi madre|1999|movie":[99,"1999-04-16"],
      "tombstone|1993|movie":[11969,"1993-12-25"],
      "toro salvaje|1980|movie":[1578,"1980-11-14"],
      "toy story 2|1999|movie":[863,"1999-10-30"],
      "toy story 3|2010|movie":[10193,"2010-06-16"],
      "toy story 4|2019|movie":[301528,"2019-06-19"],
      "toy story 5|2026|movie":[1084244,"2026-06-17"],
      "toy story|1995|movie":[862,"1995-11-22"],
      "trainspotting|1996|movie":[627,"1996-02-23"],
      "tropic thunder: una guerra muy perra|2008|movie":[7446,"2008-08-09"],
      "true detective|2014|tv":[46648,"2014-01-12"],
      "tyler rake|2020|movie":[545609,"2020-04-23"],
      "un lugar tranquilo|2018|movie":[447332,"2018-04-03"],
      "un monstruo viene a verme|2016|movie":[258230,"2016-10-07"],
      "un tipo serio|2009|movie":[12573,"2009-10-02"],
      "un trabajo en italia|1969|movie":[10536,"1969-06-02"],
      "una batalla tras otra|2025|movie":[1054867,"2025-09-23"],
      "una mente maravillosa|2001|movie":[453,"2001-12-14"],
      "una verdad incomoda|2006|movie":[1781,"2006-05-24"],
      "uno de los nuestros|1990|movie":[769,"1990-09-12"],
      "up|2009|movie":[14160,"2009-05-28"],
      "valor de ley|2010|movie":[44264,"2010-12-22"],
      "vengadores: endgame|2019|movie":[299534,"2019-04-24"],
      "vengadores: infinity war|2018|movie":[299536,"2018-04-25"],
      "vengadores: la era de ultron|2015|movie":[99861,"2015-04-22"],
      "veronica|2017|movie":[441701,"2017-08-25"],
      "vertigo|1958|movie":[426,"1958-05-28"],
      "videodrome|1983|movie":[837,"1983-02-04"],
      "viuda negra|2021|movie":[497698,"2021-07-07"],
      "vive y deja morir|1973|movie":[253,"1973-06-27"],
      "volver|2006|movie":[219,"2006-03-17"],
      "wall·e|2008|movie":[10681,"2008-06-26"],
      "west side story|2021|movie":[511809,"2021-12-08"],
      "whiplash|2014|movie":[244786,"2014-10-10"],
      "wonder man|2026|tv":[198178,"2026-01-27"],
      "wonder woman 1984|2020|movie":[464052,"2020-12-16"],
      "wonder woman|2017|movie":[297762,"2017-05-30"],
      "x-men 2|2003|movie":[36658,"2003-04-24"],
      "x-men origenes: lobezno|2009|movie":[2080,"2009-04-28"],
      "x-men: apocalipsis|2016|movie":[246655,"2016-05-18"],
      "x-men: dias del futuro pasado|2014|movie":[127585,"2014-05-15"],
      "x-men: fenix oscura|2019|movie":[320288,"2019-06-05"],
      "x-men: la decision final|2006|movie":[36668,"2006-05-24"],
      "x-men: primera generacion|2011|movie":[49538,"2011-06-01"],
      "x-men|2000|movie":[36657,"2000-07-13"],
      "yesterday|2019|movie":[515195,"2019-06-26"],
      "yo soy groot|2022|tv":[232125,"2022-08-10"],
      "zodiac|2007|movie":[1949,"2007-03-02"],
      "zombies party|2004|movie":[747,"2004-04-09"],
      "zoolander|2001|movie":[9398,"2001-09-28"],
      "¡atame!|1989|movie":[2469,"1990-01-22"],
      "¡huye!|2017|movie":[419430,"2017-02-24"],
      "¡shazam! la furia de los dioses|2023|movie":[594767,"2023-03-15"],
      "¡shazam!|2019|movie":[287947,"2019-03-29"],
      "¿que he hecho yo para merecer esto!!|1984|movie":[8221,"1984-10-25"],
      "¿que pasaria si...?|2021|tv":[91363,"2021-08-11"]
    };

    // ── Vista de cada especial: orden (cronológico / estreno) y lista (selección / completa) ──
    const ESP_VISTA_LS = 'cm:espVista';
    function _espVistaLeer(){ try{ const o = JSON.parse(localStorage.getItem(ESP_VISTA_LS)||'{}'); return (o && typeof o==='object') ? o : {}; }catch(e){ return {}; } }
    function espCambiarVista(campo, valor){
      const esp = window.especialActual; if(!esp) return;
      const m = _espVistaLeer(); m[esp.id] = {...(m[esp.id]||{}), [campo]:valor};
      try{ localStorage.setItem(ESP_VISTA_LS, JSON.stringify(m)); }catch(e){}
      abrirEspecial(esp.id);
    }
    // Listas generadas: Todo, solo películas o solo series (se renumeran al filtrar)
    function _espFiltrarTipo(esp, tipo){
      const tipoVista = (tipo==='movie' || tipo==='tv') ? tipo : 'todo';
      let items = tipoVista==='todo' ? esp.items : _numerar(esp.items.filter(x=>x.tipo===tipoVista));
      if(esp.limite) items = items.slice(0, esp.limite);
      const nombre = esp.soloPeliculas ? 'películas' : {todo:'títulos', movie:'películas', tv:'series'}[tipoVista];
      return {...esp, items, tipoVista, sub:`${items.length} ${nombre} · ${esp.items.subtitulo || esp.sub}`};
    }
    // Misma lista ordenada por fecha de estreno; se quitan las eras de la historia y se numera por posición
    function _espEnOrdenEstreno(esp){
      const items = esp.items.map((x,k)=>({x,k}))
        .sort((a,b)=>_fechaClave(a.x).localeCompare(_fechaClave(b.x)) || a.k-b.k)
        .map(({x})=>{ const {era, eraCap, nota, ...resto} = x; return resto; });
      return {...esp, items, ordenVista:'estreno',
        sub: esp.sub.replace('orden cronológico','orden de estreno'),
        bannerTitulo: esp.bannerTitulo.replace('orden cronológico','orden de estreno'),
        bannerSub: `Los mismos ${items.length} títulos, en el orden en que se estrenaron.`};
    }

    // ── Listas que se generan con TMDB ──
    async function _tmdbJson(ruta){ return (await fetch(`${TMDB_PROXY}?path=${ruta}`)).json(); }
    function _itemDesdeTmdb(r, tipo, tag){
      const f = r.release_date || r.first_air_date || '';
      return {t:r.title||r.name||'', y:f?Number(f.slice(0,4)):'', f, tipo, tmdb_id:r.id, tag:tag||'', p:r.overview||'', poster:r.poster_path||'', voto:r.vote_average||0, g:r.genre_ids||[]};
    }
    function _numerar(items){ return items.map((x,i)=>({...x, n:i+1})); }
    async function _espEstrenosMes(){
      const hoy = new Date(), a = hoy.getFullYear(), m = String(hoy.getMonth()+1).padStart(2,'0');
      const ini = `${a}-${m}-01`, fin = `${a}-${m}-${String(new Date(a, hoy.getMonth()+1, 0).getDate()).padStart(2,'0')}`;
      const [p1, p2, s1] = await Promise.all([
        _tmdbJson(`/discover/movie&language=es-ES&region=ES&with_release_type=2|3|4&release_date.gte=${ini}&release_date.lte=${fin}&sort_by=popularity.desc&page=1`),
        _tmdbJson(`/discover/movie&language=es-ES&region=ES&with_release_type=2|3|4&release_date.gte=${ini}&release_date.lte=${fin}&sort_by=popularity.desc&page=2`),
        _tmdbJson(`/discover/tv&language=es-ES&watch_region=ES&with_watch_monetization_types=flatrate&first_air_date.gte=${ini}&first_air_date.lte=${fin}&sort_by=popularity.desc&page=1`)
      ]);
      const ids = new Set();
      const pelis = [...(p1.results||[]), ...(p2.results||[])].filter(r=>r.poster_path && !ids.has(r.id) && ids.add(r.id)).slice(0,25).map(r=>_itemDesdeTmdb(r,'movie','Estreno en España'));
      const series = (s1.results||[]).filter(r=>r.poster_path).slice(0,12).map(r=>_itemDesdeTmdb(r,'tv','Serie nueva'));
      return _numerar([...pelis, ...series]);
    }
    // Cartelera del país según TMDB (now_playing con región): esta sí cambia de un país a otro
    async function _espEnCines(pais){
      const paginas = await Promise.all([1,2,3].map(n=>_tmdbJson(`/movie/now_playing&language=es-ES&region=${pais}&page=${n}`)));
      const vistos = new Set();
      const pelis = paginas.flatMap(d=>d.results||[]).filter(r=>r.poster_path && !vistos.has(r.id) && vistos.add(r.id))
        .sort((a,b)=>(b.popularity||0)-(a.popularity||0));
      return _numerar(pelis.map(r=>_itemDesdeTmdb(r, 'movie', 'En cines')));
    }
    // Principales plataformas de suscripción de cada país (ids de proveedor de TMDB)
    const _PLATAFORMAS_PAIS = {
      ES:[8,119,337,1899,149,350,76,63],          // Netflix, Prime Video, Disney+, Max, Movistar Plus+, Apple TV+, SkyShowtime, Filmin
      US:[8,9,337,1899,15,350,531,386]            // Netflix, Prime Video, Disney+, Max, Hulu, Apple TV+, Paramount+, Peacock
    };
    // Popularidad de TMDB (mundial) limitada a lo que está incluido en esas plataformas en el país
    async function _espPopular(pais){
      const base = `&language=es-ES&watch_region=${pais}&with_watch_providers=${_PLATAFORMAS_PAIS[pais].join('|')}&with_watch_monetization_types=flatrate&sort_by=popularity.desc&vote_count.gte=20`;
      const paginas = await Promise.all(['movie','tv'].flatMap(t=>[1,2,3].map(async n=>({t, res:(await _tmdbJson(`/discover/${t}${base}&page=${n}`)).results||[]}))));
      const vistos = new Set();
      const filas = paginas.flatMap(({t,res})=>res.filter(r=>r.poster_path && !vistos.has(t+r.id) && vistos.add(t+r.id)).map(r=>({r,t})));
      return _numerar(filas.sort((a,b)=>(b.r.popularity||0)-(a.r.popularity||0))
        .map(({r,t})=>_itemDesdeTmdb(r, t, t==='movie' ? 'Película' : 'Serie')));
    }
    // Todas las películas que ha dirigido (o dirigen, en el caso de los Coen), incluidas las que están por estrenar.
    // Conserva el texto y la etiqueta de la lista hecha a mano cuando el título coincide.
    async function _espFilmografia(esp){
      const listas = await Promise.all(esp.personas.map(async nombre=>{
        const res = (await _tmdbJson(`/search/person&language=es-ES&query=${encodeURIComponent(nombre)}`)).results||[];
        const persona = res.find(r=>r.known_for_department==='Directing') || res[0];
        if(!persona) return [];
        return ((await _tmdbJson(`/person/${persona.id}/movie_credits&language=es-ES`)).crew||[]).filter(c=>c.job==='Director' && !c.video);
      }));
      const vistos = new Set();
      const creditos = listas.flat().filter(c=>!vistos.has(c.id) && vistos.add(c.id));
      // Se pide la ficha de cada una (queda en caché para los pósters) para descartar cortos (menos de 60 min)
      window._detalleIdCache = window._detalleIdCache || {};
      const fichas = await _fetchEnLotes(creditos, async c=>{
        const k = `movie:${c.id}`;
        try{ const d = window._detalleIdCache[k] || await _tmdbJson(`/movie/${c.id}&language=es-ES`); if(d && d.id) window._detalleIdCache[k] = d; return d; }catch(e){ return null; }
      }, 8);
      const hoy = new Date().toISOString().slice(0,10);
      const enCamino = ['In Production','Post Production','Planned'];
      const curadas = esp.items;
      const items = fichas.filter(d=>d && d.id && (
          (d.release_date && d.release_date<=hoy && !(d.runtime>0 && d.runtime<60)) ||
          (d.release_date && d.release_date>hoy) || (!d.release_date && enCamino.includes(d.status))))
        .sort((a,b)=>(a.release_date||'9999').localeCompare(b.release_date||'9999'))
        .map(d=>{
          const it = _itemDesdeTmdb(d,'movie', (!d.release_date || d.release_date>hoy) ? 'Próximamente' : '');
          const c = curadas.find(x=>x.tmdb_id===d.id) || curadas.find(x=>normalizarTitulo(x.t)===normalizarTitulo(it.t) && Math.abs((x.y||0)-(it.y||0))<=1);
          return c ? {...it, tag:c.tag||it.tag, p:c.p||it.p} : it;
        });
      return _numerar(items);
    }
    // Carga (con caché de 3 h) los títulos de un especial generado
    async function _espCargarGenerado(clave, fn){
      window._espGenerados = window._espGenerados || {};
      const c = window._espGenerados[clave];
      if(c && Date.now()-c.ts < 3*3600*1000) return c.items;
      const items = await fn();
      window._espGenerados[clave] = {ts:Date.now(), items};
      return items;
    }

    // ── Herramienta (una sola vez, con la sesión iniciada): en la consola del navegador, await exportarIdsEspeciales()
    // Busca en TMDB cada título de los especiales sin id fijo y descarga «especiales-ids.json» con los ids,
    // las fechas de estreno y una lista de dudosos (sin resultado exacto o con otro año) para revisarlos.
    async function exportarIdsEspeciales(){
      const unicos = new Map();
      ESPECIALES.forEach(e=>e.items.forEach(it=>{ if(!it.tmdb_id && !unicos.has(_claveIdResuelto(it))) unicos.set(_claveIdResuelto(it), {t:it.t, y:it.y, tipo:it.tipo, lista:e.id}); }));
      const pendientes = [...unicos.entries()], ids = {}, dudosos = [];
      let hechos = 0;
      await _fetchEnLotes(pendientes, async ([clave, it])=>{
        // Si el servidor corta por exceso de peticiones, espera y reintenta (hasta 4 veces) en lugar de dar el título por no encontrado
        const buscar = async extra=>{
          for(let intento=0;;intento++){
            try{
              const r = await _tmdbJson(`/search/${it.tipo}&language=es-ES&query=${encodeURIComponent(it.t)}${extra}`);
              if(Array.isArray(r.results)) return r.results;
              throw new Error('respuesta sin resultados');
            }catch(e){
              if(intento>=4) throw e;
              await new Promise(res=>setTimeout(res, 1500*(intento+1)));
            }
          }
        };
        try{
          const campoAno = it.tipo==='movie' ? 'primary_release_year' : 'first_air_date_year';
          let res = await buscar(`&${campoAno}=${it.y}`), motivos = [];
          if(!res.length){ res = await buscar(''); motivos.push('sin resultados con ese año'); }
          const norm = normalizarTitulo(it.t);
          const exacto = res.find(r=>[r.title, r.name, r.original_title, r.original_name].some(x=>x && normalizarTitulo(x)===norm));
          const r = exacto || res[0];
          if(!r){ dudosos.push({...it, motivo:'no encontrado'}); return; }
          const fecha = r.release_date || r.first_air_date || '';
          const anoReal = Number(fecha.slice(0,4)) || null;
          if(!exacto) motivos.push('el título no coincide exactamente');
          if(anoReal && Math.abs(anoReal-it.y)>1) motivos.push(`año ${anoReal}`);
          ids[clave] = [r.id, fecha];
          if(motivos.length) dudosos.push({...it, encontrado:r.title||r.name, anoEncontrado:anoReal, tmdb_id:r.id, motivo:motivos.join('; ')});
        }catch(e){ dudosos.push({...it, motivo:'error: '+e.message}); }
        finally{ if(++hechos%40===0) console.log(`IDs de especiales: ${hechos}/${pendientes.length}`); }
      }, 3);
      const blob = new Blob([JSON.stringify({generado:new Date().toISOString(), total:pendientes.length, ids, dudosos}, null, 1)], {type:'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'especiales-ids.json'; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
      return {total:pendientes.length, encontrados:Object.keys(ids).length, dudosos:dudosos.length};
    }

    function refrescarChecksEspecialAbierto(){
      const esp = window.especialActual;
      if(!esp) return;
      const vistosSet = window.vistosNormSet || new Set();
      const idsSet = window.idsVistosSet || new Set();
      esp.items.forEach((it,i)=>{
        const btn = document.getElementById(`esp-visto-${i}`);
        if(!btn) return;
        const resuelto = window.especialTmdbCache && window.especialTmdbCache[i];
        const yaVista = resuelto
          ? idsSet.has(`${resuelto.id}-${it.tipo}`)
          : vistosSet.has(`${normalizarTitulo(it.t)}|${it.tipo}`);
        btn.classList.toggle('activo', yaVista);
        btn.innerHTML = yaVista ? '<span>✅</span><span>Vista</span>' : '<span>⬜</span><span>Marcar vista</span>';
      });
    }
    function normalizarTitulo(t){ return (t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); }
    async function refrescarVistosNormalizados(){
      if(!sesionActual){ window.vistosNormSet = new Set(); return; }
      const { data, error } = await sb.from('mi_biblioteca').select('titulo,tipo').eq('user_id', sesionActual.user.id).eq('visto', true);
      window.vistosNormSet = (!error && data) ? new Set(data.map(x=>`${normalizarTitulo(x.titulo)}|${x.tipo}`)) : new Set();
    }

    // v2: clave estable por contenido (título+año+tipo) en vez de por índice de la lista —
    // así, si la lista curada cambia de orden o de tamaño, la caché no queda desalineada.
    function _claveIdResuelto(it){ return `${normalizarTitulo(it.t)}|${it.y}|${it.tipo}`; }
    function _guardarIdResuelto(it, id, tipo){
      window.especialIdsResueltos[_claveIdResuelto(it)] = { id, tipo };
      try{ localStorage.setItem('especialIdsResueltos_v2', JSON.stringify(window.especialIdsResueltos)); }catch(e){}
    }
    const ESP_OCULTOS = new Set(['bond','terminator','mision-imposible','matrix','joyas-ocultas','clasicos-siempre','series-imprescindibles']);
    const ESP_VISIBLES = new Set(['ucm','xmen']); // de los que trae la app, solo Marvel; además, las colecciones que crees tú
    const _espVisible = e => ESP_VISIBLES.has(e.id) || String(e.id).startsWith('col-');
    function renderEspecialesTiles(){
      const vistosSet = window.vistosNormSet || new Set();
      const SECCIONES = [
        {cat:'saga',titulo:'Maratones'}
      ];
      const ordenAlfabetico = arr => [...arr].sort((a,b)=>a.titulo.localeCompare(b.titulo,'es',{sensitivity:'base'}));
      const idsSet = window.idsVistosSet || new Set();
      const contarVistos = e => (vistosSet.size||idsSet.size) ? e.items.filter((it,i)=>{
          const r = it.tmdb_id ? {id:it.tmdb_id, tipo:it.tipo} : window.especialIdsResueltos[_claveIdResuelto(it)];
          return (r && idsSet.size) ? idsSet.has(`${r.id}-${r.tipo}`) : vistosSet.has(`${normalizarTitulo(it.t)}|${it.tipo}`);
        }).length : 0;
      const tile = e => {
        const total = e.items.length;
        const vistos = contarVistos(e);
        const pct = total ? Math.round(vistos/total*100) : 0;
        return `
        <div class="especial-tile" data-esp-id="${e.id}" onclick="abrirEspecial('${e.id}')" style="--esp-c:${e.color||'var(--acento)'};--esp-bg:${e.colorBg||'#1b1d1c'}">
          <span class="especial-tile-emoji">${e.emoji}</span>
          <div class="especial-tile-titulo">${e.titulo}</div>
          <div class="especial-tile-sub">${e.sub}</div>
          ${vistosSet.size && total?`
          <div class="especial-progreso-texto" style="color:${e.colorSoft||'#61635e'}">${vistos}/${total} vistas</div>
          <div class="especial-progreso-bar"><div class="especial-progreso-fill" style="width:${pct}%;background:${e.color||'#b52c29'}"></div></div>
          `:''}
        </div>`;
      };
      // "En curso": especiales empezados y sin terminar; primero los abiertos más recientemente (máx. 6)
      // Sagas: basta 1 visto. Directores/temáticas: 2, o 1 si has abierto esa lista (evita que una película compartida las meta todas).
      window._espContarVistos = contarVistos;
      const enCurso = calcularEnCurso(contarVistos);
      window._enCursoIds = new Set(enCurso.map(e=>e.id));
      const man = enCursoManualLeer();
      const filaEnCurso = enCurso.length ? `
          <div class="section-label" style="margin-top:4px">En curso</div>
          <div class="especiales-scroll esp-en-curso">${enCurso.map(e=>tile(e).replace('<span class="especial-tile-emoji">',
            `<button type="button" class="encurso-quitar" onclick="event.stopPropagation();enCursoQuitar('${e.id}')" aria-label="Quitar de En curso" title="Quitar de En curso">✕</button>${man.fijados.includes(e.id)?'<span class="encurso-pin" title="Añadido por ti">📌</span>':''}<span class="especial-tile-emoji">`)).join('')}</div>` : '';
      const cols = (window.misColecciones||[]).map(col=>_espDesdeColeccion('col-'+col.id)).filter(Boolean);
      const filaCols = `
          <div class="section-label" style="margin-top:4px">Mis colecciones</div>
          <div class="especiales-scroll">${cols.map(e=>tile(e).replace('class="especial-tile"','class="especial-tile col-tile"').replace(`onclick="abrirEspecial('${e.id}')"`, `onclick="abrirEspecial('${e.id}')"${e.fondo?` style="background-image:linear-gradient(160deg, rgba(10,10,10,0.62), rgba(10,10,10,0.93)), url(https://image.tmdb.org/t/p/w500${e.fondo});background-size:cover;background-position:center"`:''}`)).join('')}
            <div class="especial-tile col-nueva-tile" onclick="abrirColOverlay('crear')"><span class="especial-tile-emoji">＋</span><div class="especial-tile-titulo">Nueva colección</div><div class="especial-tile-sub">Tu propia lista, en el orden que quieras</div></div>
          </div>`;
      document.getElementById('especiales-secciones').innerHTML = filaCols + filaEnCurso.replace('margin-top:4px','margin-top:20px') + SECCIONES.map(sec=>{
        const items = ordenAlfabetico(ESPECIALES.filter(e=>e.categoria===sec.cat && _espVisible(e)));
        if(!items.length) return '';
        return `
          <div class="section-label" style="margin-top:20px">${sec.titulo}</div>
          <div class="especiales-scroll">${items.map(tile).join('')}</div>`;
      }).join('');
      _resolverImagenesHeroEspeciales();
    }

    async function _resolverImagenHeroEspecial(especial){
      const key = `especialHeroImg_v1_${especial.id}`;
      try{
        const cached = localStorage.getItem(key);
        if(cached!==null) return cached==='__none__' ? null : cached;
      }catch(e){}
      const it = especial.items && especial.items[0];
      let ruta = null;
      if(it){
        try{
          if(it.tmdb_id){
            const d = await fetch(`${TMDB_PROXY}?path=/${it.tipo}/${it.tmdb_id}&language=es-ES`).then(r=>r.json());
            ruta = d.backdrop_path || d.poster_path || null;
          } else {
            let r = await fetch(`${TMDB_PROXY}?path=/search/${it.tipo}&language=es-ES&query=${encodeURIComponent(it.t)}${it.y?`&year=${it.y}`:''}`).then(r=>r.json());
            let cand = (r.results||[])[0];
            if(!cand && it.y){
              r = await fetch(`${TMDB_PROXY}?path=/search/${it.tipo}&language=es-ES&query=${encodeURIComponent(it.t)}`).then(r=>r.json());
              cand = (r.results||[]).sort((a,b)=>(b.popularity||0)-(a.popularity||0))[0];
            }
            ruta = cand?.backdrop_path || cand?.poster_path || null;
          }
        }catch(e){ ruta = null; }
      }
      try{ localStorage.setItem(key, ruta || '__none__'); }catch(e){}
      return ruta;
    }
    async function _resolverImagenesHeroEspeciales(){
      const tiles = [...document.querySelectorAll('.especial-tile[data-esp-id]')];
      await _fetchEnLotes(tiles, async (tileEl)=>{
        const especial = ESPECIALES.find(e=>e.id===tileEl.dataset.espId);
        if(!especial || especial.dinamico) return; // los generados no tienen lista fija de la que sacar la imagen
        const ruta = await _resolverImagenHeroEspecial(especial);
        if(ruta && document.body.contains(tileEl)){
          tileEl.style.backgroundImage = tileEl.closest('.esp-bonita') ? `url(https://image.tmdb.org/t/p/w780${ruta})` : `linear-gradient(160deg, rgba(10,10,10,0.62), rgba(10,10,10,0.93)), url(https://image.tmdb.org/t/p/w500${ruta})`;
          tileEl.style.backgroundSize = 'cover';
          tileEl.style.backgroundPosition = 'center';
        }
      }, 6);
    }
