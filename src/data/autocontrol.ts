/**
 * Preguntas de autocontrol de cada práctico, copiadas de la cuaderneta de laboratorio 2026.
 *
 * IMPORTANTE: la cuaderneta trae solo las preguntas. Las respuestas modelo (`borrador`) son
 * BORRADORES A VALIDAR POR EL DOCENTE: el docente puede corregirlas aquí mismo y, cuando una
 * quede revisada, marcar `validada: true`.
 *
 * `legible: false` = la pregunta tiene una ecuación o figura que no se pudo extraer del documento
 * (ver PENDIENTES.md); se muestra el texto disponible. Hoy no queda ninguna: las 4 que había se
 * verificaron contra el PDF de la cuaderneta (págs. 11, 14, 15 y 40).
 * `figura` = imagen de la cuaderneta que acompaña a la pregunta (ruta dentro de `public/`).
 */

export interface PreguntaAutocontrol {
  id: string;
  letra: string;
  pregunta: string;
  borrador: string;
  validada?: boolean;
  legible?: boolean;
  figura?: string;
}

export interface AutocontrolPractico {
  practico: number;
  titulo: string;
  preguntas: PreguntaAutocontrol[];
}

/** Puntaje de las Preguntas Previas según el Teórico 1 (sobre 12 puntos por práctica). */
export const PUNTAJE_PREGUNTAS_PREVIAS = { individual: 5, grupal: 7, total: 12 } as const;

const q = (practico: number, letra: string, pregunta: string, borrador: string, extra: Partial<PreguntaAutocontrol> = {}): PreguntaAutocontrol => ({
  id: `${practico}${letra}`,
  letra,
  pregunta,
  borrador,
  ...extra,
});

export const AUTOCONTROL: AutocontrolPractico[] = [
  {
    practico: 1,
    titulo: 'Verificación de la Calibración de Material Volumétrico',
    preguntas: [
      q(1, 'a', '¿Cuáles son las fuentes de error sistemático y aleatorio en el uso de una pipeta aforada?',
        'Sistemáticos: error de calibración del fabricante (dentro de la tolerancia), temperatura distinta de la de calibración, enrase sistemáticamente mal hecho (paralaje), no respetar el tiempo de espera o soplar una pipeta que no es de soplado, pipeta sucia (gotas adheridas). Aleatorios: pequeñas variaciones en el enrase y en el escurrido de una medida a otra, fluctuaciones de temperatura y de la lectura de la balanza al verificar.'),
      q(1, 'b', '¿Qué entiende por tolerancia del material volumétrico? ¿Cómo se relaciona con la calidad del material de vidrio?',
        'Es el error máximo permitido entre el volumen nominal y el real que garantiza el fabricante (por norma). El material clase A tiene tolerancias más estrechas (aprox. la mitad) que el clase B; a mejor calidad, menor tolerancia.'),
      q(1, 'c', '¿Cómo se calcula el volumen de verificación del material volumétrico? ¿Qué factores de corrección se deben tener en cuenta?',
        'Se pesa el agua que vierte (o contiene) el material y se convierte la masa en volumen a 20 °C: V20 = m·Z, donde Z corrige por la densidad del agua a la temperatura de trabajo, el empuje del aire (densidad del aire y de las pesas) y la dilatación del vidrio respecto de 20 °C.'),
      q(1, 'd', '¿Qué es el tiempo de espera de una pipeta o una bureta?',
        'Es el tiempo que se espera, una vez terminado el escurrido, para que el líquido adherido a las paredes termine de bajar antes de enrasar o de retirar la pipeta. Forma parte de la calibración: si no se respeta, el volumen vertido es menor que el nominal.'),
      q(1, 'e', '¿Por qué toma el matraz Erlenmeyer con una banda de papel?',
        'Para no transferirle grasa, humedad ni calor de los dedos, que cambiarían su masa (y la evaporación) y darían errores en la pesada.'),
      q(1, 'f', '¿Cómo verifica la ausencia de suciedad en el interior del material de vidrio?',
        'El agua destilada debe escurrir formando una película continua y uniforme; si quedan gotas adheridas a las paredes, el material está sucio (grasa) y hay que volver a lavarlo.'),
      q(1, 'g', '¿Por qué tapa el matraz Erlenmeyer con un tapón de goma?',
        'Para evitar la evaporación del agua entre la descarga y la pesada, que daría una masa (y un volumen) menor.'),
      q(1, 'h', '¿Por qué no deben quedar gotas en el interior del cuello del matraz?',
        'Porque se evaporan con más facilidad y pueden quedar en el tapón o perderse al manipularlo, cambiando la masa registrada; además indican que el agua no se descargó correctamente en el fondo.'),
      q(1, 'i', 'Es adecuada una pipeta aforada para transferir una porción de una muestra muy viscosa (ej. un jarabe). ¿Por qué? En caso negativo ¿qué alternativas existen para realizar una toma de dicha muestra?',
        'No: el líquido viscoso escurre lento y queda adherido a las paredes, así que el volumen vertido no es el calibrado. Alternativas: tomar la muestra por pesada (masa, y si hace falta convertir con la densidad), o usar una pipeta de desplazamiento positivo.'),
    ],
  },
  {
    practico: 2,
    titulo: 'Preparación y Estandarización de HCl aprox. 0,250M',
    preguntas: [
      q(2, 'a', 'Deducir la ecuación: C(HCl) (mol/L) = 2·m(Na2CO3) (g)·(Assay(Na2CO3) (%)/100) / [MM(Na2CO3) (g/mol)·G (L)]',
        'Reacción hasta el 2º punto equivalente: Na2CO3 + 2 HCl → 2 NaCl + CO2 + H2O, así que n(HCl) = 2·n(Na2CO3). n(Na2CO3) = m·(Assay/100)/MM y n(HCl) = C·G, con G en litros. Igualando: C(HCl) = 2·m·(Assay/100)/(MM·G). Si el gasto se usa en mL, queda multiplicado por 1000.'),
      q(2, 'b', 'Busque en la bibliografía recomendada la curva de valoración de la práctica. Identifique hasta qué punto equivalente se valora en la clase.',
        'La curva de Na2CO3 con HCl tiene dos saltos: el 1º (HCO3⁻, pH ≈ 8,3) y el 2º (H2CO3/CO2, pH ≈ 4). En la clase se valora hasta el 2º punto equivalente, que es el más nítido, con un indicador de viraje ácido (heliantina o similar).'),
      q(2, 'c', '¿Qué tipo de sustancia es un indicador ácido – base?',
        'Es un ácido o una base orgánica débil cuyas formas ácida y básica tienen colores distintos; cambia de color en un intervalo de pH alrededor de su pKa.'),
      q(2, 'd', '¿Cómo se clasifican los indicadores ácido-base?',
        'Según el intervalo de pH de viraje (zona ácida, neutra o básica) y según su estructura química (ftaleínas, sulfoftaleínas, azoderivados), además de si son de uno o dos colores.'),
      q(2, 'e', '¿Por qué el pH del matraz de valoración antes del agregado de ácido desde la bureta, es mayor a 7?',
        'Porque el CO3²⁻ es una base (se hidroliza: CO3²⁻ + H2O ⇌ HCO3⁻ + OH⁻), así que una solución de Na2CO3 es básica (pH ≈ 11).'),
      q(2, 'f', '¿Cómo gestionará los desechos de esta práctica?',
        'Son soluciones salinas ácidas o neutras (NaCl, restos de HCl): se controla el pH, se neutralizan si hace falta y se descartan en la pileta con abundante agua.'),
      q(2, 'g', 'En caso de no contar con Na2CO3, ¿con qué otros patrones primarios se podría realizar esta valoración?',
        'Con otras bases patrón primario, por ejemplo bórax (Na2B4O7·10H2O) o TRIS (tris(hidroximetil)aminometano).'),
    ],
  },
  {
    practico: 3,
    titulo: 'Estandarización de NaOH aprox. 0,1M',
    preguntas: [
      q(3, 'a', 'La curva de titulación de la valoración de la práctica es la siguiente: Correlacione los puntos A a F con los siguientes números (una misma letra puede corresponder a más de un número): 1. Exceso de NaOH, 2. Primer punto equivalente, 3. Solución Buffer H2C2O4 / HC2O4-, 4. Solución de NaHC2O4, 5. Solución de H2C2O4, 6. Solución Buffer HC2O4-/ C2O42-, 7. Segundo Punto equivalente, 8. Solución de Na2C2O4',
        'A = solución de H2C2O4, antes de agregar NaOH (5). B = buffer H2C2O4/HC2O4⁻ (3). C = primer punto equivalente, solución de NaHC2O4 (2 y 4): es el salto chico, a la mitad del gasto del segundo. D = buffer HC2O4⁻/C2O4²⁻ (6). E = segundo punto equivalente, solución de Na2C2O4 (7 y 8): es el salto grande. F = exceso de NaOH (1).',
        { figura: 'autocontrol/p3-curva.png' }),
      q(3, 'b', '¿Por qué no valora hasta el primer punto equivalente?',
        'Porque los pKa del ácido oxálico (≈ 1,25 y 4,27) están cerca: el primer salto es muy poco nítido y no se detecta bien con un indicador. El segundo salto es grande y se ve claramente con fenolftaleína.'),
      q(3, 'c', 'Calcule el pH en el segundo punto equivalente (considere la especie presente en dicho punto y qué reacción sufre).',
        'En el 2º PE hay C2O4²⁻, una base débil: C2O4²⁻ + H2O ⇌ HC2O4⁻ + OH⁻, con Kb = Kw/Ka2 ≈ 1,9·10⁻¹⁰. [OH⁻] ≈ √(Kb·C); para C ≈ 0,03 mol/L, pOH ≈ 5,6 y pH ≈ 8,4 (zona básica).'),
      q(3, 'd', 'Deducir la ecuación: C(NaOH) (mol/L) = 2·m(PP) (g)·(Assay (%)/100)·(V toma / V sol,PP) / [Gb (L)·MM(PP) (g/mol)]',
        'Al valorar hasta el 2º punto equivalente, 2 NaOH + H2C2O4 → Na2C2O4 + 2 H2O, así que n(NaOH) = 2·n(H2C2O4). Los moles de patrón primario (PP) en el matraz de valoración son n(PP) = m(PP)·(Assay/100)/MM(PP)·(V toma/V sol,PP): el último factor es la fracción de la solución de PP que se toma con la pipeta (vale 1 si el PP se pesa directo en el Erlenmeyer). Como n(NaOH) = C·Gb, con Gb en litros: C(NaOH) = 2·m(PP)·(Assay/100)·(V toma/V sol,PP)/(Gb·MM(PP)).'),
      q(3, 'e', '¿Por qué puede detectar el 2do punto equivalente con Fenolftaleína?',
        'Porque el pH del 2º punto equivalente (≈ 8,4) cae dentro del intervalo de viraje de la fenolftaleína (8,3–10) y el salto de pH es grande.'),
      q(3, 'f', '¿Qué precaución se debe tener con las soluciones patrón secundario de NaOH?',
        'Protegerlas del CO2 del aire (que la carbonata y cambia su concentración) y guardarlas en frascos de plástico, porque el NaOH ataca el vidrio. Hay que estandarizarlas periódicamente.'),
      q(3, 'g', '¿Por qué es importante agregar sólo una gota de Fenolftaleína y no una cantidad cualquiera?',
        'El indicador es un ácido débil y consume titulante; además, un exceso hace el viraje menos nítido. Con poca cantidad el error de indicador es despreciable.'),
      q(3, 'h', '¿Cómo gestionará los desechos de esta práctica?',
        'Son soluciones de oxalato de sodio levemente básicas: se neutralizan (control de pH) y se descartan en la pileta con abundante agua.'),
      q(3, 'i', 'En caso de no contar con H2C2O4.2H2O, ¿con qué otros patrones primarios se podría realizar esta valoración?',
        'Con ftalato ácido de potasio (KHP), que es el patrón primario ácido más usado, o con ácido benzoico o ácido sulfámico.'),
    ],
  },
  {
    practico: 4,
    titulo: 'Determinación del %m-m de una muestra de ácido cítrico monohidrato',
    preguntas: [
      q(4, 'a', 'Explicar la forma de la curva de valoración del ácido cítrico con NaOH.',
        'El ácido cítrico es triprótico con pKa cercanos (≈ 3,1; 4,8; 6,4), por eso las zonas buffer se superponen y no aparecen saltos intermedios nítidos: la curva sube suavemente y muestra un único salto claro en el tercer punto equivalente (citrato, zona básica).'),
      q(4, 'b', '¿Hasta qué punto equivalente valora en esta práctica? ¿Por qué?',
        'Hasta el tercero (se valoran los 3 protones), porque es el único salto nítido; los dos primeros no se distinguen por la cercanía de los pKa.'),
      q(4, 'c', 'Calcule el pH teórico de una solución de ácido cítrico preparada de la misma forma en que lo realizó en la práctica.',
        'Se trata como ácido débil dominado por la primera disociación: [H⁺] ≈ √(Ka1·C) (o resolviendo la cuadrática). Por ejemplo, para C ≈ 0,02 mol/L y Ka1 ≈ 7,4·10⁻⁴, pH ≈ 2,5. El valor exacto depende de la concentración de la diagramación (se puede calcular en la pestaña Especies y buffers).'),
      q(4, 'd', 'Calcule el pH en el punto equivalente.',
        'En el 3º PE hay citrato (Cit³⁻), base débil con Kb = Kw/Ka3 ≈ 2,5·10⁻⁸: [OH⁻] ≈ √(Kb·C). Para C ≈ 0,01–0,02 mol/L resulta pH ≈ 9–9,5.'),
      q(4, 'e', 'Justifique la elección del reactivo indicador escogido en la diagramación.',
        'Fenolftaleína, porque el pH del punto equivalente (≈ 9) cae en su intervalo de viraje (8,3–10) y el salto es suficiente para un viraje nítido.'),
    ],
  },
  {
    practico: 5,
    titulo: 'Determinación de alcalinidad de una muestra de sales básicas',
    preguntas: [
      q(5, 'a', 'Utilizando la app https://ph.lattelog.com/onetitrage construya la curva de valoración de la práctica. Describa sus puntos característicos (especies predominantes en ellos). Busque la información necesaria en las tablas de datos.',
        'Mezcla Na2CO3 + NaHCO3 valorada con HCl: inicio (CO3²⁻ y HCO3⁻, pH ≈ 10–11); zona buffer CO3²⁻/HCO3⁻; 1er PE (todo como HCO3⁻, pH ≈ 8,3); zona buffer HCO3⁻/H2CO3; 2º PE (H2CO3/CO2, pH ≈ 4); luego exceso de HCl.'),
      q(5, 'b', 'Estime los pH de los dos puntos equivalentes, en función de las especies que predominan en los mismos.',
        '1er PE: anfótero HCO3⁻, pH ≈ (pKa1 + pKa2)/2 ≈ (6,35 + 10,33)/2 ≈ 8,3. 2º PE: ácido débil H2CO3, [H⁺] ≈ √(Ka1·C), pH ≈ 3,9–4,3 según la concentración.'),
      q(5, 'c', 'Estime el pH de la solución problema con los datos dados en la diagramación de la práctica. (busque los Ka del sistema ácido carbónico en tablas de Ka)',
        'Es un buffer CO3²⁻/HCO3⁻: pH ≈ pKa2 + log(C(CO3²⁻)/C(HCO3⁻)), con pKa2 = 10,33 y las concentraciones de la diagramación.'),
      q(5, 'd', 'Deduzca las ecuaciones del punto 9 del apartado “4.3 Procedimiento”',
        'Hasta el 1er PE (fenolftaleína, G1) solo reacciona CO3²⁻ → HCO3⁻: n(Na2CO3) = C(HCl)·G1. Hasta el 2º PE (heliantina, G2 total) reaccionan todo el carbonato (2 H⁺) y el bicarbonato original (1 H⁺): C·G2 = 2·n(Na2CO3) + n(NaHCO3), de donde n(NaHCO3) = C·(G2 − 2·G1). Dividiendo por el volumen de muestra se obtienen las concentraciones.'),
      q(5, 'e', 'Busque reactivos indicadores alternativos para la detección de los puntos equivalentes.',
        '1er PE (pH ≈ 8,3): fenolftaleína o azul de timol (2º viraje). 2º PE (pH ≈ 4): heliantina (naranja de metilo), verde de bromocresol o rojo de metilo.'),
    ],
  },
  {
    practico: 6,
    titulo: 'Determinación complejométrica del %m-m de NiSO4.6H2O en una muestra',
    preguntas: [
      q(6, 'a', '¿Cuál es el patrón primario utilizado en la práctica? ¿Cómo se conserva y por qué?',
        'MgSO4·7H2O. Se conserva en frasco bien cerrado y sin calentar, porque puede perder o ganar agua de hidratación (eflorescencia), lo que cambiaría su masa molar efectiva.'),
      q(6, 'b', 'Deduzca la ecuación del punto 15 de la parte 4.3, a partir del esquema general de la retrovaloración de la práctica.',
        'Se agrega un volumen conocido de EDTA en exceso: n(EDTA total) = n(Ni²⁺) + n(EDTA en exceso). El exceso se valora con Mg²⁺: n(exceso) = C(Mg)·G_retro, y el EDTA total se conoce por el blanco: n(total) = C(Mg)·G_blanco. Entonces n(Ni) = C(Mg)·(G_B − G_R) y %m-m = MM·C(Mg)·(G_B − G_R)/1000/m0·100.'),
      q(6, 'c', 'Razone y diagrame la curva de titulación correspondiente a la titulación del EDTA con el Mg2+ (considere que coloca en la bureta al Mg2+ en lugar de al EDTA)',
        'Graficando pMg vs volumen de Mg²⁺: al principio hay EDTA libre y casi no hay Mg²⁺ (pMg alto); a medida que se agrega Mg²⁺ se forma MgY²⁻ y pMg baja lentamente; en el punto equivalente pMg cae bruscamente; después, el exceso de Mg²⁺ fija pMg bajo. Es la curva "invertida" de la valoración usual.'),
      q(6, 'd', '¿Por qué utiliza un buffer de pH = 10 en esta práctica?',
        'Porque a pH 10 la fracción de EDTA como Y⁴⁻ es alta y la constante condicional de MgY²⁻ es suficientemente grande para un punto final nítido, y porque el NET funciona como indicador a ese pH (azul libre / rojo vino complejado).'),
      q(6, 'e', 'Mencione formas de lograr selectividad en la valoración de una mezcla de metales.',
        'Controlar el pH (valorar a pH bajo los metales con Kf muy grandes), usar agentes enmascarantes (CN⁻, F⁻, trietanolamina), desenmascarar selectivamente, separar previamente (precipitación, extracción) o usar indicadores selectivos.'),
      q(6, 'f', 'Suponga que debe valorar un determinado catión metálico que precipita al pH de trabajo ¿Cómo solucionaría este problema? ¿Qué precauciones debe tener?',
        'Agregar un complejante auxiliar (por ejemplo NH3 o tartrato) que lo mantenga en solución pero que forme un complejo menos estable que con EDTA, o usar retrovaloración (agregar el EDTA en exceso antes de ajustar el pH). Cuidar que el complejante auxiliar no esté en tal exceso que disminuya demasiado la constante condicional.'),
      q(6, 'g', '¿Cómo es la estequiometría de la reacción Mg2+ + EDTA? ¿Y la del Ni2+ + EDTA?',
        'En ambos casos 1:1 (el EDTA forma complejos 1:1 con todos los metales, independientemente de la carga): Mg²⁺ + Y⁴⁻ → MgY²⁻ y Ni²⁺ + Y⁴⁻ → NiY²⁻.'),
      q(6, 'h', 'Sin consultar tablas de Kf para los complejos Metal-EDTA, y en virtud de lo que hará en la práctica, razone y deduzca qué complejo es más estable al pH de trabajo: MgY2- o NiY2-',
        'NiY²⁻: en la retrovaloración el Mg²⁺ valora solo el EDTA libre sin desplazar al Ni²⁺ del NiY²⁻; eso solo es posible si NiY²⁻ es mucho más estable que MgY²⁻.'),
    ],
  },
  {
    practico: 7,
    titulo: 'Valoración de una solución de H2O2 con KMnO4 previamente estandarizado',
    preguntas: [
      q(7, 'a', '¿Por qué calienta la solución luego de agregar 1 mL de KMnO4 sobre la solución de H2C2O4?',
        'La reacción MnO4⁻ + oxalato es lenta a temperatura ambiente. Al calentar (≈ 60–70 °C) se acelera; además el Mn²⁺ que se forma la autocataliza, por eso se agrega primero una porción de KMnO4.'),
      q(7, 'b', '¿Por qué enrasa con la parte superior del menisco?',
        'Porque la solución de KMnO4 es tan intensamente coloreada que no se ve la parte inferior del menisco.'),
      q(7, 'c', '¿Cómo se define la unidad “volúmenes” para el H2O2?',
        'Son los litros de O2 (en condiciones normales, 0 °C y 1 atm) que libera 1 L de solución al descomponerse: 2 H2O2 → 2 H2O + O2. Por ejemplo, "10 volúmenes" ≈ 3 % m/v.'),
      q(7, 'd', '¿Por qué se requiere agregar H2SO4 al medio de valoración cuando se utiliza KMnO4?',
        'Para que el MnO4⁻ se reduzca a Mn²⁺ (5 electrones), lo que requiere H⁺. En medio poco ácido se forma MnO2 (pardo) y cambia la estequiometría. Se usa H2SO4 y no HCl porque el Cl⁻ se oxidaría.'),
      q(7, 'e', '¿Cómo se identifica el punto final de esta valoración?',
        'El KMnO4 es autoindicador: el punto final es el primer color rosado pálido que persiste unos 30 segundos, por la primera gota de MnO4⁻ en exceso.'),
      q(7, 'f', 'Deducir las ecuaciones de la parte 4.3, con las cuales calcula las concentraciones de la disolución patrón secundario y la muestra problema.',
        'Estandarización: 2 MnO4⁻ + 5 H2C2O4 + 6 H⁺ → 2 Mn²⁺ + 10 CO2 + 8 H2O, así que C(KMnO4) = (2/5)·m·(Assay/100)·1000/(MM·G). Muestra: 2 MnO4⁻ + 5 H2O2 + 6 H⁺ → 2 Mn²⁺ + 5 O2 + 8 H2O, así que n(H2O2) = (5/2)·C(KMnO4)·G, corrigiendo por la dilución y la alícuota; los volúmenes = mol de H2O2 por litro × 11,2 (L de O2 por mol de H2O2, a 0 °C y 1 atm).'),
      q(7, 'g', 'Calcular el ∆E0 para la reacción entre el KMnO4 y el H2O2.',
        'E°(MnO4⁻/Mn²⁺) = 1,51 V y E°(O2/H2O2) = 0,68 V: ΔE° = 1,51 − 0,68 = 0,83 V. Es muy positivo, así que la reacción es cuantitativa (K muy grande).'),
      q(7, 'h', 'Si el H2O2 usualmente se utiliza como oxidante, ¿por qué en esta instancia actúa como reductor?',
        'El H2O2 tiene el oxígeno en estado −1, intermedio entre −2 y 0, así que puede oxidarse o reducirse. Frente a un oxidante más fuerte, como el MnO4⁻ (E° mayor), actúa como reductor y se oxida a O2.'),
    ],
  },
  {
    practico: 8,
    titulo: 'Valoración de una solución de I2 de uso tópico (yodopovidona)',
    preguntas: [
      q(8, 'a', '¿Qué es el anión triyoduro? ¿Es lo mismo que yoduro? ¿Cómo se forma?',
        'Es I3⁻, que se forma al disolver I2 en presencia de I⁻: I2 + I⁻ ⇌ I3⁻. No es lo mismo que yoduro (I⁻). Así se aumenta la solubilidad del I2 en agua y se reduce su volatilidad.'),
      q(8, 'b', '¿Qué es una YODI-metría? ¿Qué es una YODO-metría?',
        'Yodimetría: valoración directa con una solución patrón de I2 (I3⁻) como oxidante sobre un analito reductor. Yodometría: método indirecto en el que el analito oxidante libera I2 a partir de un exceso de I⁻, y el I2 formado se valora con tiosulfato.'),
      q(8, 'c', 'Mencione cómo se prepara y se conserva una solución de I2',
        'Se disuelve I2 en una solución concentrada de KI (forma I3⁻) y luego se diluye. Se conserva en frasco de vidrio color caramelo, bien tapado, al abrigo de la luz y del calor, y se estandariza antes de usar.'),
      q(8, 'd', 'Escriba todas las reacciones químicas involucradas en la valoración del Na2S2O3 con KIO3 / KI y deduzca la relación estequiométrica entre n (yodato) y n (tiosulfato).',
        'IO3⁻ + 5 I⁻ + 6 H⁺ → 3 I2 + 3 H2O; luego I2 + 2 S2O3²⁻ → 2 I⁻ + S4O6²⁻. Por cada IO3⁻ se forman 3 I2, que consumen 6 S2O3²⁻: n(S2O3²⁻) = 6·n(IO3⁻).'),
      q(8, 'e', 'Exprese la C (Na2S2O3) en función del Gb y de la masa de KIO3 empleada.',
        'C(Na2S2O3) = 6·m(KIO3)·(Assay/100)·1000 / (MM(KIO3)·Gb), corrigiendo por alícuota si el KIO3 se tomó de una solución.'),
      q(8, 'f', 'Imagine que el laboratorio no cuenta con KIO3. ¿Hay alternativas químicas para realizar la presente práctica?',
        'Sí: otros patrones primarios oxidantes que liberen I2 a partir de I⁻, como el K2Cr2O7 o el KBrO3, o el propio I2 sublimado como patrón.'),
      q(8, 'g', 'Calcule cuál es la masa mínima de KI necesaria durante la valoración del Na2S2O3.',
        'Por estequiometría se necesitan 5 mol de I⁻ por mol de IO3⁻: m(KI) mín = 5·n(KIO3)·166,0 g/mol. En la práctica se usa en exceso (por ejemplo 50 %) para formar I3⁻ y asegurar que la reacción sea completa.'),
      q(8, 'h', '¿Es la reacción entre I2 y Na2S2O3 adecuada para ser utilizada en una valoración? Justifique calculando su Keq.',
        'Sí. E°(I2/I⁻) = 0,54 V y E°(S4O6²⁻/S2O3²⁻) = 0,08 V; con n = 2: log K = 2·(0,54 − 0,08)/0,0592 ≈ 15,5, K ≈ 10¹⁵. Es cuantitativa, rápida y de estequiometría definida (en medio neutro o levemente ácido).'),
      q(8, 'i', 'Escriba la reacción química correspondiente a la valoración de la muestra problema (considere al I2 como analito, no a la yodopovidona).',
        'I2 + 2 S2O3²⁻ → 2 I⁻ + S4O6²⁻ (o I3⁻ + 2 S2O3²⁻ → 3 I⁻ + S4O6²⁻).'),
      q(8, 'j', '¿Qué indicador usa en la práctica? ¿Por qué se usa dicho indicador? ¿En qué momento lo agrega?',
        'Almidón: forma con el I3⁻ un complejo azul muy intenso, sensible a concentraciones muy bajas de yodo. Se agrega cerca del punto final (cuando la solución está amarillo pálido), porque con mucho I2 el complejo se disocia lentamente y daría un punto final tardío.'),
    ],
  },
  {
    practico: 9,
    titulo: 'Valoración argentométrica de una solución de KBr - aprox. 0,15 M',
    preguntas: [
      q(9, 'a', 'Defina Valoración de precipitación. Defina Argentometría.',
        'Valoración de precipitación: aquella en la que el titulante forma con el analito un compuesto poco soluble. Argentometría: valoración de precipitación que usa Ag⁺ (AgNO3) como reactivo, en general para haluros, SCN⁻ y otros aniones.'),
      q(9, 'b', '¿Cómo se define Kps? ¿La Kps está relacionada con la solubilidad de un compuesto iónico?',
        'Es la constante del equilibrio de disolución de un sólido iónico poco soluble: para MaXb, Kps = [M]^a·[X]^b. Sí: a partir de Kps se calcula la solubilidad (por ejemplo, s = √Kps para sales 1:1), aunque solo se pueden comparar directamente sales con la misma estequiometría.'),
      q(9, 'c', '¿Es posible aplicar la metodología de la clase de hoy para valorar una solución problema de NaCl de igual concentración? En caso contrario proponga alternativas.',
        'En Volhard por retroceso con cloruro hay un problema: el AgCl es más soluble que el AgSCN y se redisuelve al valorar el exceso de Ag⁺ con SCN⁻ (error por defecto). Alternativas: filtrar el AgCl o recubrirlo (nitrobenceno o dietil éter) antes de valorar, o usar Mohr o Fajans.'),
      q(9, 'd', '¿En qué se basa la detección del punto final en la práctica de hoy?',
        'Método de Volhard: el Fe³⁺ forma con el primer exceso de SCN⁻ el complejo FeSCN²⁺, rojo, que indica el punto final (en medio HNO3).'),
      q(9, 'e', '¿Qué otras formas conoce para detectar el punto final en una Argentometría?',
        'Mohr (CrO4²⁻ forma Ag2CrO4 rojo ladrillo), Fajans (indicadores de adsorción como la fluoresceína o la diclorofluoresceína) y potenciometría con electrodo de Ag o selectivo.'),
      q(9, 'f', '¿Cuál es la solubilidad de AgSCN a 25 oC? ¿Y la del AgBr?',
        'Con Kps(AgSCN) ≈ 1,1·10⁻¹² y Kps(AgBr) ≈ 5,0·10⁻¹³: s = √Kps ≈ 1,0·10⁻⁶ mol/L para AgSCN y ≈ 7·10⁻⁷ mol/L para AgBr. Los valores de Kps conviene tomarlos de las tablas del curso.'),
      q(9, 'g', '¿Cómo prepararía una solución valorada de KSCN? ¿Y una solución valorada de AgNO3?',
        'El KSCN es higroscópico: se prepara una solución aproximada y se estandariza contra AgNO3 patrón (Volhard). El AgNO3 puede ser patrón primario (secado y pesado exacto) o estandarizarse con NaCl patrón primario (Mohr o Fajans); se guarda en frasco color caramelo.'),
      q(9, 'h', 'Calcular la pAg en el punto equivalente del blanco de la clase de hoy.',
        'En el punto equivalente de la valoración de Ag⁺ con SCN⁻, [Ag⁺] = [SCN⁻] = √Kps(AgSCN) ≈ 1,0·10⁻⁶, así que pAg ≈ 6,0.'),
      q(9, 'i', 'Proponga dos maneras de dosificar las siguientes especies: MgCl2, HBr, FeCl2, NH4SCN, Na2C2O4, Na2S, K2CO3',
        'MgCl2: Cl⁻ por argentometría (Mohr/Fajans) y Mg²⁺ con EDTA. HBr: ácido-base con NaOH y Br⁻ por Volhard. FeCl2: Fe²⁺ con KMnO4 o K2Cr2O7 y Cl⁻ por argentometría. NH4SCN: SCN⁻ con AgNO3 (Volhard directo) y NH4⁺ por destilación o método del formol. Na2C2O4: KMnO4 y ácido-base con HCl. Na2S: yodometría y precipitación con Ag⁺. K2CO3: ácido-base con HCl y gravimetría como CO2 o BaCO3.'),
    ],
  },
  {
    practico: 11,
    titulo: 'Valoración potenciométrica de H3PO4 en gaseosa',
    preguntas: [
      q(11, 'a', 'Mencione ventajas y desventajas de las técnicas electroanalíticas.',
        'Ventajas: equipos de bajo costo, sirven con muestras coloreadas o turbias, buena sensibilidad y selectividad (electrodos selectivos), se pueden automatizar y miden actividades. Desventajas: requieren calibración frecuente, los electrodos se ensucian o envejecen, hay interferencias de otros iones, potenciales de unión líquida, y dependen de la temperatura y la fuerza iónica.'),
      q(11, 'b', 'Diagramar una celda potenciométrica indicando sus partes constituyentes.',
        'Electrodo de referencia | puente salino (unión líquida) | solución del analito | electrodo indicador, conectados a un potenciómetro (pH-metro) de alta impedancia. Se mide E celda = E indicador − E referencia + E unión.'),
      q(11, 'c', '¿Qué caracteristicas generales tiene un electrodo de referencia? ¿Cuáles son los más comunes?',
        'Debe tener un potencial conocido, estable, reproducible e independiente de la composición de la muestra, y ser reversible. Los más comunes son el de Ag/AgCl (KCl saturado o 3 M) y el de calomel saturado (Hg/Hg2Cl2/KCl).'),
      q(11, 'd', '¿Qué caracteristicas generales tiene un electrodo indicador? ¿Qué tipos existen?',
        'Su potencial depende de la actividad del analito (respuesta nernstiana), en forma rápida, reproducible y selectiva. Tipos: metálicos de 1ª especie (Ag/Ag⁺), de 2ª especie (Ag/AgCl/Cl⁻), redox inertes (Pt, Au) y de membrana o selectivos de iones (vidrio para pH, membrana cristalina, líquida o polimérica).'),
      q(11, 'e', '¿En qué consiste un electrodo de membrana de vidrio? ¿Qué parte del mismo es sensible al pH?',
        'Es un tubo con un bulbo de vidrio especial muy delgado que contiene una solución interna de HCl (aprox. 0,1 M) saturada en AgCl y un alambre de Ag/AgCl de referencia interna. Lo sensible al pH son las capas hidratadas (gel) de las dos superficies de la membrana de vidrio.'),
      q(11, 'f', '¿Cómo está compuesta y cómo funciona una membrana de vidrio que separa dos soluciones de diferente [H+]?',
        'Es un silicato con cationes (Na⁺, Li⁺, Ca²⁺). En cada superficie se forma una capa hidratada donde el H⁺ se intercambia con los cationes del vidrio. Si la actividad de H⁺ es distinta a cada lado, se desarrolla una diferencia de potencial (potencial de frontera) que depende de log(a_externa/a_interna): ≈ 59 mV por unidad de pH a 25 °C. Dentro del vidrio la carga la transportan los cationes alcalinos.'),
      q(11, 'g', 'Explique la siguiente ecuación para un electrodo de membrana de vidrio: Eind = Eb + E Ag/AgCl + E asim',
        'El potencial del electrodo indicador es la suma del potencial de frontera de la membrana (Eb, que depende del pH externo), el potencial del electrodo de referencia interno Ag/AgCl (constante) y el potencial de asimetría (pequeño, por diferencias entre las dos caras del vidrio; se corrige al calibrar).'),
      q(11, 'h', 'Explique la siguiente ecuación para una celda potenciométrica para medida de pH: Emedido = Eind – Eref + Ej',
        'El potencial que mide el pH-metro es la diferencia entre el electrodo indicador (vidrio) y el de referencia externo, más el potencial de unión líquida (Ej) en el contacto entre el puente salino y la muestra. Eref y Ej se suponen constantes y se absorben en la calibración.'),
      q(11, 'i', 'Explique la siguiente ecuación: Ag(s)|AgCl(s)|Cl−(ac, sat)‖H+(ac, exterior) ⋮ H+(ac, interior, 0,1M), Cl−(ac, sat)|AgCl(s)|Ag(s)',
        'Es la notación de la celda completa de medida de pH: a la izquierda el electrodo de referencia externo Ag/AgCl, la doble barra es la unión líquida, la línea punteada es la membrana de vidrio que separa la muestra (H⁺ externo) de la solución interna (H⁺ 0,1 M con Cl⁻), y a la derecha el electrodo de referencia interno Ag/AgCl. La única variable es el H⁺ externo.'),
      q(11, 'j', 'Escriba la ecuación general que vincula el Emedido con el pH.',
        'E medido = K − (2,303·R·T/F)·pH, es decir E = K − 0,05916·pH (V) a 25 °C. K agrupa todos los términos constantes y se determina al calibrar con buffers.'),
      q(11, 'k', 'Describa los errores que aparecen en las medidas potenciométricas de pH y por qué se originan.',
        'Error alcalino (a pH alto el electrodo responde al Na⁺: lee pH menores), error ácido (a pH muy bajo lee pH mayores), variaciones del potencial de unión líquida, errores de los buffers de calibración, temperatura (cambia la pendiente), deshidratación o envejecimiento de la membrana y respuesta lenta en soluciones de baja fuerza iónica.'),
      q(11, 'l', 'Indique ventajas y desventajas de las valoraciones potenciométricas.',
        'Ventajas: sirven con muestras coloreadas o turbias, no necesitan indicador, permiten ver varios puntos equivalentes y valorar ácidos débiles o mezclas, y son más exactas que el viraje visual. Desventajas: son más lentas (hay que esperar que se estabilice cada lectura), necesitan equipo calibrado y más tratamiento de datos.'),
      q(11, 'm', '¿Cómo se hallan los puntos equivalentes en las valoraciones potenciométricas?',
        'Con la curva pH vs volumen: por el punto de inflexión (método gráfico de las tangentes), por el máximo de la 1ª derivada ΔpH/ΔV o por el cruce de cero de la 2ª derivada (interpolación lineal). También existe el método de Gran.'),
    ],
  },
  {
    practico: 12,
    titulo: 'Dosificación espectrofotométrica de Paracetamol en jarabe',
    preguntas: [
      q(12, 'a', '¿Qué es una curva de calibración y por qué debe realizar una en una determinación espectrométrica?',
        'Es la relación experimental entre la señal (absorbancia) y la concentración, obtenida con patrones de concentración conocida. Es necesaria porque el método es relativo: la absortividad depende del instrumento, de la longitud de onda y de las condiciones, así que hay que medirla en las mismas condiciones que la muestra.'),
      q(12, 'b', '¿Con qué criterios selecciona la ecuación de mejor ajuste los puntos experimentales de la curva de calibración?',
        'Se elige el modelo más simple que describe bien los datos: residuos chicos y distribuidos al azar (sin tendencia), coeficiente de determinación (R² o R² ajustado) alto, desviación estándar de los residuos (s_y/x) baja y, si corresponde, ordenada que no difiera significativamente de cero.'),
      q(12, 'c', '¿Qué se entiende por rango lineal y rango dinámico de un método analítico?',
        'Rango lineal: intervalo de concentraciones en el que la señal es proporcional a la concentración. Rango dinámico: intervalo desde el límite de cuantificación hasta donde la respuesta deja de ser útil (puede incluir una zona no lineal).'),
      q(12, 'd', '¿Cómo calcula una concentración de analito a partir de la información proporcionada curva de calibración?',
        'Se mide la absorbancia de la muestra, se despeja la concentración con la función de calibración (en el modelo lineal, x = (y − b)/m) y se multiplica por los factores de dilución aplicados a la muestra.'),
      q(12, 'e', '¿Cómo está compuesto un instrumento para medidas de absorción molecular de radiación electromagnética?',
        'Fuente de radiación (deuterio para el UV, tungsteno para el visible), selector de longitud de onda (monocromador), compartimento con la cubeta de muestra, detector (fotodiodo o fototubo) y sistema de lectura o procesamiento.'),
      q(12, 'f', '¿En qué se basa una medida espectrométrica de absorción molecular?',
        'Las moléculas absorben radiación de energías definidas (transiciones electrónicas). Se mide cuánto se atenúa un haz al atravesar la muestra (transmitancia T = P/P0) y se calcula la absorbancia A = −log T, que es proporcional a la concentración (ley de Beer).'),
      q(12, 'g', '¿En qué rango de longitudes de onda / frecuencias se realiza la espectrometría de absorción UV-Visible?',
        'Aproximadamente de 190 a 800 nm: UV entre ≈ 190 y 400 nm y visible entre ≈ 400 y 800 nm.'),
      q(12, 'h', '¿Qué es un espectro de absorción? ¿Qué se grafica? ¿Qué información brinda?',
        'Es la absorbancia (o la absortividad) en función de la longitud de onda. Muestra a qué longitudes de onda absorbe la sustancia y con qué intensidad, sirve para identificarla y para elegir la longitud de onda de trabajo.'),
      q(12, 'i', '¿Con qué criterio se selecciona la longitud de onda más adecuada para una medida espectrométrica de absorción molecular?',
        'Se elige un máximo de absorción (λmáx): ahí la sensibilidad es mayor y la absorbancia varía poco ante pequeños errores de longitud de onda. Además, conviene que no absorban otros componentes de la matriz.'),
      q(12, 'j', '¿Qué establece la Ley de Beer?',
        'Que la absorbancia es proporcional al camino óptico y a la concentración del absorbente: A = ε·b·c (ε es la absortividad molar, b el camino óptico en cm y c la concentración en mol/L).'),
      q(12, 'k', '¿Qué desviaciones presenta la Ley de Beer?',
        'Reales (a concentraciones altas, más de ~0,01 M, por interacciones entre moléculas y cambios del índice de refracción), químicas (equilibrios de asociación, disociación o reacción del absorbente que dependen de la concentración o del pH) e instrumentales (radiación no monocromática, luz parásita, cubetas desparejas).'),
    ],
  },
  {
    practico: 13,
    titulo: 'Dosificación espectrofotométrica de Fe(II) por desarrollo de color',
    preguntas: [
      q(13, 'a', '¿En qué consiste un desarrollo de color y en qué casos lo aplica?',
        'Consiste en hacer reaccionar el analito con un reactivo que forma un compuesto o complejo intensamente coloreado (alta absortividad), y medir su absorbancia en el visible. Se aplica cuando el analito no absorbe o absorbe poco, o para ganar sensibilidad y selectividad (por ejemplo metales a nivel de ppm).'),
      q(13, 'b', '¿Qué tipo de compuesto forma el Fe2+ con la 1,10-fenantrolina?',
        'Un complejo de coordinación de transferencia de carga, Fe(fen)3²⁺ (ferroína), rojo-naranja, con máximo de absorción a 510 nm y ε ≈ 11.100 L·mol⁻¹·cm⁻¹.'),
      q(13, 'c', 'Explique el rol de la hidroxilamina clorhidrato en esta práctica.',
        'Es un reductor suave que lleva todo el hierro a Fe²⁺ (y evita que el O2 lo oxide), porque solo el Fe(II) forma el complejo coloreado con fenantrolina: 2 Fe³⁺ + 2 NH2OH + 2 OH⁻ → 2 Fe²⁺ + N2 + 4 H2O.'),
      q(13, 'd', '¿Cuál es el patrón primario con el cual construye la curva de calibración?',
        'Sal de Mohr, Fe(NH4)2(SO4)2·6H2O, de calidad patrón primario.'),
    ],
  },
];

export const getAutocontrol = (practico: number) => AUTOCONTROL.find((a) => a.practico === practico);
