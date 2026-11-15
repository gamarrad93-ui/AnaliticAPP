/**
 * Pool de problemas de las Revisiones Prácticas 2026 (1ª y 2ª), con los criterios estadísticos
 * oficiales tal cual figuran en la letra de cada prueba. Archivo pensado para que el docente lo
 * revise y edite: los textos entre comillas son copia literal del documento.
 *
 * Los parámetros de simulación (gasto objetivo, concentraciones nominales, etc.) no son
 * sugerencias del documento: son los valores por defecto del simulador y se pueden cambiar.
 */

export type RP = 1 | 2;

export type Tecnica =
  | 'Volumetría ácido-base'
  | 'Complejometría'
  | 'Permanganimetría'
  | 'Yodimetría / yodometría'
  | 'Argentometría'
  | 'Potenciometría'
  | 'Espectrofotometría';

/** Criterios de la 1ª RP (tabla de la letra). σR del agente valorante; anómalos y CV para el analito. */
export interface CriteriosRP1 {
  tipo: 'rp1';
  /** σR para la concentración del agente valorante (mol/L); null = no figura en la tabla */
  sigmaR: number | null;
  /**
   * CV máximo (%) para el agente valorante cuando la tabla no trae σR (valoraciones con EDTA).
   * No figura en la letra: lo indicó el docente (15/11/2026). Se aplica junto con la ausencia de
   * anómalos (Dixon o Grubbs), igual que para el analito.
   */
  cvValorante?: number;
  /** texto literal del criterio para el analito */
  textoAnalito: string;
  /** CV máximo del analito (%) */
  cvMax: number;
}

/** Criterios de la 2ª RP (punto 5.4 de la letra), comunes a todos los problemas. */
export interface CriteriosRP2 {
  tipo: 'rp2';
  /** volumétricos o espectrofotométricos */
  medida: 'volumetrica' | 'espectrofotometrica' | 'potenciometrica';
}

export interface ProblemaRP {
  id: string;
  rp: RP;
  numero: number;
  /** "Problema analítico" (literal) */
  titulo: string;
  /** "Contenido aprox de analito" (literal) */
  contenido: string;
  tecnica: Tecnica;
  tema: string;
  criterios: CriteriosRP1 | CriteriosRP2;
  /** "Sugerencias de diagramación" de la letra (solo donde existen, literal) */
  sugerencias?: string[];
}

export interface InfoRP {
  rp: RP;
  nombre: string;
  /** minutos para la diagramación según la letra */
  minutosDiagramacion: number;
  /** qué debe contener la diagramación (literal) */
  diagramacionDebeContener: string[];
  reactivos: string[];
  /** criterios estadísticos generales (literal) */
  tratamientoDatos: string[];
  evaluacion: { diagramacion: number; experimental: number; informe: number; total: number };
}

export const INFO_RP: Record<RP, InfoRP> = {
  1: {
    rp: 1,
    nombre: '1ª Revisión Práctica',
    minutosDiagramacion: 20,
    diagramacionDebeContener: [
      'La diagramación de la estandarización del patrón secundario',
      'La diagramación de la determinación del analito en la muestra',
      'Reacción de valoración (ya sea del patrón secundario o del analito)',
      'Cálculos previos (toma de patrón primario y muestra)',
      'Detección del PF elegido (justificando el indicador seleccionado para tal fin)',
      'Cómo gestionar los desechos generados',
    ],
    reactivos: [
      'Reactivos valorantes: HCl aprox. 0,25 mol L-1, NaOH aprox. 0,10 mol L-1, KMnO4 aprox. 0,02 mol L-1, EDTA aprox. 0,02 mol L-1',
      'Patrones primarios: H2C2O4.2H2O, Na2CO3 (anhidro), MgSO4.7H2O',
      'Reactivos indicadores: Heliantina, Rojo de metilo, Fenolftaleína, Timolftaleína, Verde de bromocresol, Azul de bromotimol, NET',
      'Reactivos auxiliares: Buffer pH = 10, H2SO4 1:4, Etanol absoluto',
    ],
    tratamientoDatos: [
      'El/la estudiante realizará tantas determinaciones (tanto en la estandarización del patrón como en la determinación del analito en la muestra) como para obtener como mínimo tres valores concordantes según los criterios que se detallan en la Tabla.',
    ],
    evaluacion: { diagramacion: 5, experimental: 5, informe: 2, total: 12 },
  },
  2: {
    rp: 2,
    nombre: '2ª Revisión Práctica',
    minutosDiagramacion: 25,
    diagramacionDebeContener: [
      'Todos los cálculos previos, incluyendo, si corresponde, el planteo correcto de curva de calibración adecuada',
      'Los patrones primarios para realizar las valoraciones o las curvas de calibración',
      'Las ecuaciones químicas involucradas en la determinación',
      'Otros reactivos y disoluciones necesarios para realizar la determinación',
      'Todas las condiciones de medida instrumental cuando sea necesario',
      'El tratamiento de los residuos generados',
    ],
    reactivos: [
      'KIO3 (s) (PP), Na2S2O3.5H2O (s), KI (s), I2 0,1 ó 0,05 M, Sol. Almidón (1%), H2SO4 1:4',
      'NaCl (s) (PP), AgNO3 (ac) 0,1 M, Fe(NO3)3 0,5M, KSCN (ac) 0,125 M, diclorofluoresceína (1%), HNO3 1:2',
      'NaOH 0,01M, H2C2O4.2H2O (s, PP)',
      'Paracetamol patrón, HCl 0,1 M.',
      'Sal de Mohr, calidad patrón primario. Soluciones de 1,10-fenantrolina al 0,1%, Buffer acetato 1,2 M pH=4, solución de hidroxilamina.HCl, 100 g/L .',
    ],
    tratamientoDatos: [
      'Para la estandarización de los patrones secundarios, se realizarán 3 valoraciones y se promediarán aquellos resultados cuyo CV sea menor a (ideal: 0,5; aceptable: 1%)',
      'Para los analitos problema, se realizará un número de valoraciones no menor a 3, y se promediarán aquellos valores que no superen un CV de (ideal: 1%, aceptable: 2%), y/o que no presenten valores anómalos.',
      'Para las curvas de calibración se trabajará con 1 sola solución de patrón por nivel de concentración.',
      'El criterio de promediabilidad para las concentraciones determinadas por espectrofotometría es de CV menor a 10%.',
      'Para las muestras en medidas espectrofotométricas, se llevará a cabo un triplicado genuino.',
      'Para la valoración potenciométrica, se realizará la curva, y se determinará el gasto del PE por los métodos vistos en el práctico. Se calculará la incertidumbre de la concentración por propagación de incertidumbre, tal como se realizó en el práctico.',
    ],
    evaluacion: { diagramacion: 5, experimental: 5, informe: 2, total: 12 },
  },
};

/** Umbrales numéricos de la 2ª RP (de la letra). */
export const CRITERIOS_RP2 = {
  estandarizacion: { cvIdeal: 0.5, cvAceptable: 1, n: 3 },
  analito: { cvIdeal: 1, cvAceptable: 2, nMin: 3 },
  espectrofotometria: { cvMax: 10 },
} as const;

const DG = 'Ausencia de Anómalos según test de DIXON o GRUBBS';
const c1 = (sigmaR: number | null, cvMax: number, cvValorante?: number): CriteriosRP1 => ({ tipo: 'rp1', sigmaR, textoAnalito: `${DG}, CV < ${String(cvMax)}%`, cvMax, ...(cvValorante != null ? { cvValorante } : {}) });

export const PROBLEMAS: ProblemaRP[] = [
  // ---------------- 1ª Revisión Práctica ----------------
  { id: '1-01', rp: 1, numero: 1, titulo: 'Determinación del % m-m de una muestra de NaHCO3', contenido: '>95%', tecnica: 'Volumetría ácido-base', tema: 'Sal de ácido débil con HCl', criterios: c1(0.0003, 1) },
  { id: '1-02', rp: 1, numero: 2, titulo: 'Valoración de una disolución problema de NH3', contenido: '1,0 mol L-1', tecnica: 'Volumetría ácido-base', tema: 'Base débil con HCl', criterios: c1(0.0003, 2) },
  { id: '1-03', rp: 1, numero: 3, titulo: 'Valoración de una disolución problema de H3PO4', contenido: '0,5 mol L-1', tecnica: 'Volumetría ácido-base', tema: 'Ácido poliprótico con NaOH', criterios: c1(0.0003, 1) },
  { id: '1-04', rp: 1, numero: 4, titulo: 'Determinación del % m-m de una muestra de NaH2PO4.H2O', contenido: 'Aprox. 100%', tecnica: 'Volumetría ácido-base', tema: 'Anfótero con NaOH', criterios: c1(0.0003, 2) },
  { id: '1-05', rp: 1, numero: 5, titulo: 'Determinación del % m-m de una muestra de Na2HPO4.12H2O', contenido: 'Aprox. 100%', tecnica: 'Volumetría ácido-base', tema: 'Anfótero con HCl', criterios: c1(0.0003, 2) },
  { id: '1-06', rp: 1, numero: 6, titulo: 'Determinación del % m-m de una muestra de ZnSO4.7H2O', contenido: 'Aprox. 100%', tecnica: 'Complejometría', tema: 'Metal con EDTA', criterios: c1(null, 2, 2) },
  { id: '1-07', rp: 1, numero: 7, titulo: 'Determinación de la dureza total de una muestra de agua.', contenido: '1060 mg CaCO3 / L', tecnica: 'Complejometría', tema: 'Dureza con EDTA', criterios: c1(null, 2, 2) },
  { id: '1-08', rp: 1, numero: 8, titulo: 'Determinación del % m-m de una muestra de Na2C2O4', contenido: '>95%', tecnica: 'Permanganimetría', tema: 'Oxalato con KMnO4', criterios: c1(0.000051, 2) },
  { id: '1-09', rp: 1, numero: 9, titulo: 'Determinación del % m-m de una muestra de sal de Mohr (Fe(NH4)2(SO4)2.6H2O)', contenido: '>95%', tecnica: 'Permanganimetría', tema: 'Fe(II) con KMnO4', criterios: c1(0.000051, 2) },
  { id: '1-10', rp: 1, numero: 10, titulo: 'Determinación del % m-m de una muestra de ácido tartárico', contenido: '>95%', tecnica: 'Volumetría ácido-base', tema: 'Ácido diprótico con NaOH', criterios: c1(0.0003, 2) },
  { id: '1-11', rp: 1, numero: 11, titulo: 'Determinación del % m-m de una muestra de ácido benzoico', contenido: '>98%', tecnica: 'Volumetría ácido-base', tema: 'Ácido monoprótico con NaOH', criterios: c1(0.0003, 2) },
  { id: '1-12', rp: 1, numero: 12, titulo: 'Determinación del % m-m de una muestra de ácido maleico', contenido: '>98%', tecnica: 'Volumetría ácido-base', tema: 'Ácido diprótico con NaOH', criterios: c1(0.0003, 2) },
  { id: '1-13', rp: 1, numero: 13, titulo: 'Determinación del % m-m de una muestra de ácido malónico', contenido: '>98%', tecnica: 'Volumetría ácido-base', tema: 'Ácido diprótico con NaOH', criterios: c1(0.0003, 2) },
  { id: '1-14', rp: 1, numero: 14, titulo: 'Determinación del % m-m de una muestra de ácido succínico', contenido: '>98%', tecnica: 'Volumetría ácido-base', tema: 'Ácido diprótico con NaOH', criterios: c1(0.0003, 2) },
  // ---------------- 2ª Revisión Práctica ----------------
  {
    id: '2-01', rp: 2, numero: 1, titulo: 'Determinación yodimétrica del % (m/m) de ácido ascórbico por retrovaloración.', contenido: '>95%', tecnica: 'Yodimetría / yodometría', tema: 'Retrovaloración con blanco', criterios: { tipo: 'rp2', medida: 'volumetrica' },
    sugerencias: [
      'Plantearla en la modalidad BLANCO – RETRO, y realizar los balances de moles adecuados.',
      'Proponer una toma de disolución de I2 0,1 M de 10,00 mL (o de I2 0,05 M de 20,00 mL, según la concentración disponible)',
      'Calcular qué concentración de Na2S2O3 es necesaria para obtener un G = 8,00 mL en la valoración blanco. Plantear la preparación de un volumen adecuado de dicha disolución para realizar 3 blancos y 3 retro (mínimo)',
      'Calcular la toma de Ac. Ascórbico para obtener un G = 2,00 mL en la retro.',
      'Considerar que se deberá estandarizar la solución de Na2S2O3 tal como se hizo en clase. Considerar también que se utilizará KI en un 50% de exceso.',
    ],
  },
  {
    id: '2-02', rp: 2, numero: 2, titulo: 'Cuantificación yodométrica de la concentración de Cl2 en una muestra de NaClO comercial.', contenido: '40 g Cl2/ L', tecnica: 'Yodimetría / yodometría', tema: 'Yodometría de un oxidante', criterios: { tipo: 'rp2', medida: 'volumetrica' },
    sugerencias: [
      'Considerar que la cantidad declarada por el fabricante es 40 g de CLORO (Cl2) / L.',
      'Considerar, para proponer una relación estequiométrica entre CLORO e HIPOCLORITO, que en cualquier disolución de Cl2 se establece el siguiente equilibrio: Cl2 + H2O ⇋ ClO- + Cl- + 2H+',
      'Plantear el balance de moles de la valoración yodométrica (fue visto en el teórico correspondiente).',
      'Proponer una toma de disolución problema de 1,00 mL y a partir de allí calcular una concentración de Na2S2O3 adecuada para un G = 8,00 mL. Plantear la preparación de un volumen adecuado. Considerar que se deberá estandarizar la solución de Na2S2O3 tal como se hizo en clase. Considerar también que se utilizará KI en un 50% de exceso.',
      'Calcular qué masa de KI (1,5 veces en exceso) y qué volumen de H2SO4 1:4 (3,6 M) se requieren para la valoración de la disolución problema.',
    ],
  },
  { id: '2-03', rp: 2, numero: 3, titulo: 'Determinación argentométrica del % (m/m) de una muestra de MgCl2.6H2O (método de Fajans)', contenido: '>98%', tecnica: 'Argentometría', tema: 'Fajans', criterios: { tipo: 'rp2', medida: 'volumetrica' } },
  {
    id: '2-04', rp: 2, numero: 4, titulo: 'Determinación argentométrica de la concentración de una disolución de KSCN (método de Volhard, modalidad directa)', contenido: '0,125 M', tecnica: 'Argentometría', tema: 'Volhard directo', criterios: { tipo: 'rp2', medida: 'volumetrica' },
    sugerencias: [
      'Se estandarizará el AgNO3 0,1 M con NaCl (PP) utilizando el método de Fajans.',
      'Se valorará la solución de KSCN 0,125 M con AgNO3 0,1 M, utilizando el método de Volhard, directo.',
      'Considerar la posibilidad de utilizar dos buretas distintas de 10,00 mL para cada etapa.',
    ],
  },
  { id: '2-05', rp: 2, numero: 5, titulo: 'Valoración potenciométrica de una disolución de ácido cítrico 0,1 M', contenido: '0,1 M', tecnica: 'Potenciometría', tema: 'Ácido triprótico con NaOH', criterios: { tipo: 'rp2', medida: 'potenciometrica' } },
  { id: '2-06', rp: 2, numero: 6, titulo: 'Cuantificación espectrofotométrica de paracetamol en una disolución problema', contenido: '1 g / 250 mL', tecnica: 'Espectrofotometría', tema: 'UV con curva de calibración', criterios: { tipo: 'rp2', medida: 'espectrofotometrica' } },
  { id: '2-07', rp: 2, numero: 7, titulo: 'Cuantificación de Fe2+ por desarrollo de color en una disolución problema', contenido: '125 mg de FeSO4.7H2O / mL', tecnica: 'Espectrofotometría', tema: 'Desarrollo de color con 1,10-fenantrolina', criterios: { tipo: 'rp2', medida: 'espectrofotometrica' } },
];

export const getProblema = (id: string) => PROBLEMAS.find((p) => p.id === id);
