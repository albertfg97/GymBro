// Guías pedagógicas del entrenador, por ejercicio (clave = id del ejercicio).
// Cada guía tiene:
//   steps   -> pasos claros que se muestran en pantalla y se leen en voz alta
//   watch   -> errores comunes / precauciones
//   coach   -> mensaje motivador breve
//   gifUrl  -> (opcional) animación de referencia del ejercicio.
//
// Los pasos de varios ejercicios provienen de exercises-dataset (hasaneyldrm/
// exercises-dataset, basado en ExerciseDB v1), licencia MIT para el texto.
// Las animaciones (GIF) son © Gym visual (https://gymvisual.com/) y NO se
// redistribuyen: se referencian desde el repositorio upstream (igual que hace
// openGym). Su reutilización comercial requiere permiso del titular de los
// derechos. Ver NOTICE / README.

const UPSTREAM = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';

module.exports = {
  1: {
    steps: [
      'Ponte de pie, con la mirada al frente y la espalda recta.',
      'Da pasos largos y firmes manteniendo un ritmo constante.',
      'Mueve los brazos acompasando el caminar.',
      'Respira rítmicamente: dos pasos al inhalar y dos pasos al exhalar.',
    ],
    watch: ['No arrastres los pies ni camines a saltos descontrolados.'],
    coach: 'Mantén un ritmo cómodo que puedas sostener varios minutos.',
  },
  2: {
    steps: [
      'Pies al ancho de los hombros, brazos relajados.',
      'Eleve una rodilla hasta la cadera y alterna con la otra.',
      'Mueve los brazos girando al ritmo de las rodillas.',
      'Mantén el torso erguido sin balancearte.',
    ],
    watch: ['No encojas los hombros hacia las orejas.'],
    coach: 'Ajusta la velocidad para mantener una cadencia constante.',
  },
  3: {
    steps: [
      'Ponte de pie con los pies juntos y los brazos a los costados.',
      'Salta separando los pies y levantando los brazos por encima de la cabeza.',
      'Al aterrizar, salta rápidamente de vuelta a la posición inicial.',
      'Repite el número de repeticiones deseado.',
    ],
    watch: ['Flexiona un poco las rodillas al aterrizar.'],
    coach: 'Repite con fluidez y encuentra un buen ritmo.',
    gifUrl: UPSTREAM + 'videos/3224-1g5bPpA.gif',
  },
  4: {
    steps: [
      'Comienza de pie con los pies separados a la altura de los hombros.',
      'Baja el cuerpo hacia una posición de sentadilla flexionando las rodillas y colocando las manos en el suelo frente a ti.',
      'Lleva los pies hacia atrás de una patada hasta una posición de flexión de brazos.',
      'Realiza una flexión de brazos, manteniendo el cuerpo en línea recta.',
      'Salta con los pies de vuelta a la posición de sentadilla.',
      'Salta hacia arriba explosivamente, llevando los brazos por encima de la cabeza.',
      'Aterriza suavemente y baja de inmediato a una posición de sentadilla para comenzar la siguiente repetición.',
    ],
    watch: ['Mantén el abdomen firme y la espalda alineada.'],
    coach: 'Es intenso: si te falta el aire, ve más despacio.',
    gifUrl: UPSTREAM + 'videos/1160-dK9394r.gif',
  },
  5: {
    steps: [
      'Mantén las manos a la altura de la cadera como si llevaras una cuerda.',
      'Salta con los pies juntos girando las muñecas en círculo.',
      'Aterriza con las rodillas blandas y sobre la punta de los pies.',
      'Mantén una cadencia de salto constante.',
    ],
    watch: ['No saltes demasiado alto; el ritmo es lo importante.'],
    coach: 'Imagina la cuerda y encuentra tu ritmo.',
  },
  6: {
    steps: [
      'Comienza en una posición de plancha alta con las manos un poco más separadas que la anchura de los hombros y los pies juntos.',
      'Activa el core y baja el cuerpo hacia el suelo flexionando los codos, manteniendo el cuerpo en línea recta.',
      'Haz una pausa cuando el pecho esté justo por encima del suelo y luego empújate de vuelta a la posición inicial estirando los brazos.',
      'Repite el número de repeticiones deseado.',
    ],
    watch: ['No dejes caer la cadera ni metas la cabeza hacia delante.'],
    coach: 'Si te cuesta, apoya las rodillas en el suelo.',
    gifUrl: UPSTREAM + 'videos/0662-I4hDWkc.gif',
  },
  7: {
    steps: [
      'Ponte de pie con los pies separados a la altura de los hombros, los dedos de los pies ligeramente hacia afuera.',
      'Baja el cuerpo flexionando las rodillas y empujando las caderas hacia atrás como si te sentaras en una silla.',
      'Mantén el pecho hacia arriba y la espalda recta durante todo el movimiento.',
      'Baja hasta que los muslos queden paralelos al suelo o hasta donde puedas llegar cómodamente.',
      'Haz una pausa por un momento en la parte inferior, luego empuja con los talones para regresar a la posición inicial.',
      'Repite el número de repeticiones deseado.',
    ],
    watch: ['No dejes que las rodillas pasen muy por delante de las puntas.'],
    coach: 'Mantén la espalda recta y el pecho firme.',
    gifUrl: UPSTREAM + 'videos/3119-75Bgtjy.gif',
  },
  8: {
    steps: [
      'Apóyate en antebrazos y puntas de los pies, con los codos bajo los hombros.',
      'Extiende el cuerpo hasta quedar también apoyado sobre las puntas.',
      'Forma una línea recta de la cabeza a los talones.',
      'Contrae abdomen, cadera y glúteos, y aguanta.',
    ],
    watch: ['No arquees la espalda ni dejes caer la cadera.'],
    coach: 'Respira de forma continua y sostén la posición.',
    gifUrl: UPSTREAM + 'videos/0464-CosupLu.gif',
  },
  9: {
    steps: [
      'Ponte de pie con los pies separados a la altura de los hombros.',
      'Da un paso adelante con la pierna derecha, bajando el cuerpo a una posición de zancada.',
      'Mantén el torso erguido y la rodilla delantera alineada con el tobillo.',
      'Empújate con el pie derecho y lleva el pie izquierdo hacia adelante, entrando en una posición de zancada con la pierna izquierda.',
      'Continúa alternando las piernas y avanzando, manteniendo un ritmo controlado y constante.',
      'Repite el número de repeticiones deseado.',
    ],
    watch: ['La rodilla delantera debe ir alineada en la punta del pie.'],
    coach: 'Mantén el torso erguido y firme durante todo el paso.',
    gifUrl: UPSTREAM + 'videos/1460-IZVHb27.gif',
  },
  10: {
    steps: [
      'Siéntate en el borde de un banco con las manos agarrando el borde, los dedos apuntando hacia adelante.',
      'Camina con los pies hacia adelante, deslizando los glúteos fuera del banco, y estira los brazos.',
      'Flexiona los codos y baja el cuerpo hacia el suelo, manteniendo la espalda cerca del banco.',
      'Empuja con las palmas para estirar los brazos y regresar a la posición inicial.',
      'Repite el número de repeticiones deseado.',
    ],
    watch: ['Mantén los codos apuntando hacia atrás, cerca del cuerpo.'],
    coach: 'Baja lento y sube con firmeza.',
    gifUrl: UPSTREAM + 'videos/0812-VuoerH0.gif',
  },
  11: {
    steps: [
      'Desde arrodillado, siéntate sobre los talones.',
      'Inclina el torso hacia delante y estira los brazos por el suelo.',
      'Deja la frente en el suelo y respira relajándote.',
    ],
    watch: ['No fuerces; apoya un cojín bajo la frente si no llegas.'],
    coach: 'Relaja los hombros y deja caer el peso con la gravedad.',
  },
  12: {
    steps: [
      'Apóyate en el suelo con manos y rodillas.',
      'Sube la cadera hacia arriba formando una V invertida.',
      'Empuja con las manos y estira bien la espalda.',
      'Mantén las piernas algo flexionadas si hace falta.',
    ],
    watch: ['No arquees la zona lumbar de forma exagerada.'],
    coach: 'Respira profundo y suelta la tensión de los hombros.',
  },
  13: {
    steps: [
      'Da un paso largo hacia delante con una pierna.',
      'Gira el pie trasero hacia afuera y lleva la cadera hacia delante.',
      'Flexiona la pierna delantera con firmeza.',
      'Eleva los brazos por encima de la cabeza mirando al frente.',
    ],
    watch: ['Mantén la cadera orientada hacia delante.'],
    coach: 'Respira y alarga el pecho hacia arriba.',
  },
  14: {
    steps: [
      'De pie, eleva los brazos por encima de la cabeza.',
      'Inclina el tronco hacia delante y apoya las manos en el suelo.',
      'Retrocede a la plancha de forma fluida.',
      'Vuelve a la posición de pie alzando de nuevo los brazos.',
    ],
    watch: ['Mantén cada postura coordinada con la respiración.'],
    coach: 'Fluye como una sola secuencia natural.',
  },
  15: {
    steps: [
      'Ponte de pie y desplaza tu peso a una pierna.',
      'Apoya la planta del pie sobre la pierna contraria.',
      'Fija la mirada en un punto a la altura de la frente.',
      'Eleva los brazos a discreción para sumar equilibrio.',
    ],
    watch: ['Si pierdes el equilibrio, apoya la punta de un dedo.'],
    coach: 'Mira a un punto fijo y concéntrate.',
  },
  16: {
    steps: [
      'Ponte de pie frente a una pared con los pies separados a la altura de las caderas.',
      'Coloca las manos en la pared para mayor apoyo.',
      'Activa el core y levanta la rodilla derecha hacia el pecho, mientras mantienes el pie izquierdo en el suelo.',
      'Cambia rápidamente de pierna, llevando la rodilla izquierda hacia el pecho y bajando el pie derecho de nuevo.',
      'Continúa alternando las piernas con un movimiento de carrera, llevando las rodillas lo más alto posible.',
      'Mantén un ritmo rápido y la parte superior del cuerpo estable durante todo el ejercicio.',
    ],
    watch: ['Mantén la espalda recta y no te encorves.'],
    coach: 'Eleva con fuerza las rodillas y mantén la cadencia.',
    gifUrl: UPSTREAM + 'videos/3636-ealLwvX.gif',
  },
  17: {
    steps: [
      'Comienza en una posición de plancha alta con las manos justo debajo de los hombros y el cuerpo en línea recta.',
      'Activa el core y lleva la rodilla derecha hacia el pecho, luego cambia rápidamente y lleva la rodilla izquierda hacia el pecho.',
      'Continúa alternando las piernas con un movimiento de carrera, manteniendo las caderas bajas y el core activado.',
      'Mantén un ritmo constante y respira de forma regular durante todo el ejercicio.',
      'Repite el número de repeticiones deseado.',
    ],
    watch: ['No subas la cadera; mantén la posición de plancha firme.'],
    coach: 'Pies rápidos, cuerpo firme.',
    gifUrl: UPSTREAM + 'videos/0630-RJgzwny.gif',
  },
  18: {
    steps: [
      'Ponte de pie con los pies separados a la altura de los hombros.',
      'Baja el cuerpo hacia una posición de sentadilla flexionando las rodillas y empujando las caderas hacia atrás.',
      'Salta de forma explosiva desde el suelo, extendiendo las caderas, las rodillas y los tobillos.',
      'Mientras estás en el aire, lleva rápidamente los brazos hacia adelante para mantener el equilibrio.',
      'Aterriza suavemente sobre la punta de los pies y pasa de inmediato a la siguiente repetición.',
      'Repite el número de repeticiones deseado.',
    ],
    watch: ['Aterriza primero con la punta y controla la caída.'],
    coach: 'Sé explosivo, pero con control.',
    gifUrl: UPSTREAM + 'videos/0514-LIlE5Tn.gif',
  },
  19: {
    steps: [
      'Ponte de pie con los pies separados a la altura de los hombros.',
      'Dobla ligeramente las rodillas y salta hacia la derecha, aterrizando sobre el pie derecho.',
      'Al aterrizar, balancea la pierna izquierda detrás de la pierna derecha y toca el suelo con los dedos del pie izquierdo.',
      'Salta inmediatamente hacia la izquierda, aterrizando sobre el pie izquierdo.',
      'Al aterrizar, balancea la pierna derecha detrás de la pierna izquierda y toca el suelo con los dedos del pie derecho.',
      'Continúa alternando los lados, saltando y tocando el suelo con cada pierna.',
      'Repite el número de repeticiones deseado.',
    ],
    watch: ['No inclines el torso hacia delante al aterrizar.'],
    coach: 'Ligero y ágil en cada salto.',
    gifUrl: UPSTREAM + 'videos/3361-zfNHMN9.gif',
  },
  20: {
    steps: [
      'Muévete a un ritmo suave y sin saltos excesivos.',
      'Respira de forma pausada al caminar despacio.',
      'Deja que la tensión vaya bajando de forma natural.',
    ],
    watch: ['No cortes el movimiento de golpe.'],
    coach: 'Recupera el aliento y prepara el cuerpo.',
  },
  21: {
    steps: [
      'Da un paso al lado con un pie y junta el otro.',
      'Acompáñalo con un balanceo suave de las caderas.',
      'Repite el paso hacia el otro lado con cadencia.',
      'Añade brazos relajados para acompañar el ritmo.',
    ],
    watch: ['Mantén los hombros relajados y la espalda recta.'],
    coach: 'Encuentra el ritmo y muévete con soltura.',
  },
  22: {
    steps: [
      'Marca el paso al ritmo de la música.',
      'Mueve la cadera y el torso de forma relajada.',
      'Acompaña los brazos con el movimiento.',
    ],
    watch: ['Evita movimientos bruscos que puedan lastimar.'],
    coach: 'Relájate y deja que la música te guíe.',
  },
  23: {
    steps: [
      'Empieza con pasos laterales sencillos.',
      'Alterna en un lado y el otro al ritmo.',
      'Acompaña el movimiento con los brazos.',
    ],
    watch: ['Hidrátate si el ritmo es muy intenso.'],
    coach: 'Mantén el cuerpo en movimiento y el ánimo arriba.',
  },
  24: {
    steps: [
      'Imagina una onda que sube por tu cuerpo.',
      'Empieza por la cabeza y desciende por el pecho.',
      'Acompáñalo con la cadera en la ondulación.',
    ],
    watch: ['Mantén las rodillas blandas en el movimiento.'],
    coach: 'Que sea suave y fluido, sin rigidez.',
  },
  25: {
    steps: [
      'Escucha la pista y déjate llevar por el ritmo.',
      'Muévete libremente por el espacio.',
      'Aprovecha los brazos y la cadera para expresarte.',
    ],
    watch: ['Ten cuidado con tu espacio y con lo que te rodea.'],
    coach: 'Muévete con libertad, es tu momento.',
  },
  26: {
    steps: [
      'Inhala por la nariz contando mentalmente hasta cuatro.',
      'Retén la respiración suavemente durante siete segundos.',
      'Exhala por la boca durante ocho segundos.',
      'Repite el ciclo completo varias veces.',
    ],
    watch: ['Si retener te cuesta, ajusta la duración con calma.'],
    coach: 'Concéntrate solo en tu respiración y deja el resto de lado.',
  },
  27: {
    steps: [
      'Cierra los ojos y respira con calma.',
      'Recorre mentalmente tu cuerpo desde los pies hasta la cabeza.',
      'Nota cada zona sin juzgarla, simplemente observando.',
    ],
    watch: ['Tómate el tiempo para cada parte del cuerpo.'],
    coach: 'Relájate y conecta con cada sensación.',
  },
  28: {
    steps: [
      'Cierra los ojos y evoca un lugar tranquilo.',
      'Recuerda la calma que sentiste en ese lugar.',
      'Permanece con esa sensación y la respiración natural.',
    ],
    watch: ['Disfruta el proceso, no te apresures.'],
    coach: 'Guarda esa imagen para la serenidad.',
  },
  29: {
    steps: [
      'Siéntate cómodamente y respira.',
      'Recorre mentalmente tres cosas por las que estás agradecido.',
      'Sostén tu atención en cada una y siente la gratitud.',
    ],
    watch: ['Concéntrate en lo positivo de tu día.'],
    coach: 'Siente la gratitud y conéctate contigo.',
  },
  30: {
    steps: [
      'Inhala de forma natural, dejando fluir el abdomen.',
      'Expulsa el aire con pequeños soplos rápidos y rítmicos.',
      'Repite el patrón con un ritmo constante.',
    ],
    watch: ['Si sientes mareo, para y vuelve a la respiración normal.'],
    coach: 'Una técnica enérgica: hazla con moderación.',
  },
};
