/**
 * Cuplas redox (potenciales formales en el medio indicado) e indicadores redox.
 * Fuente: Skoog, West, Holler, Crouch, "Fundamentos de Química Analítica", apéndice 5 y tabla de indicadores;
 * Harris, "Quantitative Chemical Analysis", apéndice H.
 */
import type { Couple } from '../redox/redox';

export interface CoupleData extends Couple {
  id: string;
  name: string;
  ox: string;
  red: string;
  reaction: string;
  medium: string;
}

export const COUPLES: CoupleData[] = [
  { id: 'Fe', name: 'Fe³⁺/Fe²⁺', ox: 'Fe³⁺', red: 'Fe²⁺', reaction: 'Fe³⁺ + e⁻ ⇌ Fe²⁺', E0: 0.68, n: 1, m: 0, p: 1, medium: 'H₂SO₄ 1 M (E° = 0,771 V)' },
  { id: 'Ce', name: 'Ce⁴⁺/Ce³⁺', ox: 'Ce⁴⁺', red: 'Ce³⁺', reaction: 'Ce⁴⁺ + e⁻ ⇌ Ce³⁺', E0: 1.44, n: 1, m: 0, p: 1, medium: 'H₂SO₄ 1 M' },
  { id: 'MnO4', name: 'MnO₄⁻/Mn²⁺', ox: 'MnO₄⁻', red: 'Mn²⁺', reaction: 'MnO₄⁻ + 8H⁺ + 5e⁻ ⇌ Mn²⁺ + 4H₂O', E0: 1.51, n: 5, m: 8, p: 1, medium: 'E° estándar; depende de [H⁺]⁸' },
  { id: 'Cr2O7', name: 'Cr₂O₇²⁻/Cr³⁺', ox: 'Cr₂O₇²⁻', red: 'Cr³⁺', reaction: 'Cr₂O₇²⁻ + 14H⁺ + 6e⁻ ⇌ 2Cr³⁺ + 7H₂O', E0: 1.33, n: 6, m: 14, p: 2, medium: 'E° estándar; depende de [H⁺]¹⁴' },
  { id: 'I3', name: 'I₃⁻/I⁻', ox: 'I₃⁻ (I₂)', red: 'I⁻', reaction: 'I₃⁻ + 2e⁻ ⇌ 3I⁻', E0: 0.536, n: 2, m: 0, p: 0, medium: 'I⁻ en exceso (KI); [I⁻] constante' },
  { id: 'S4O6', name: 'S₄O₆²⁻/S₂O₃²⁻', ox: 'S₄O₆²⁻', red: 'S₂O₃²⁻', reaction: 'S₄O₆²⁻ + 2e⁻ ⇌ 2S₂O₃²⁻', E0: 0.08, n: 2, m: 0, p: 2, medium: 'E° estándar' },
  { id: 'Sn', name: 'Sn⁴⁺/Sn²⁺', ox: 'Sn⁴⁺', red: 'Sn²⁺', reaction: 'Sn⁴⁺ + 2e⁻ ⇌ Sn²⁺', E0: 0.139, n: 2, m: 0, p: 1, medium: 'HCl 1 M' },
  { id: 'C2O4', name: 'CO₂/H₂C₂O₄', ox: '2CO₂', red: 'H₂C₂O₄', reaction: '2CO₂ + 2H⁺ + 2e⁻ ⇌ H₂C₂O₄', E0: -0.49, n: 2, m: 2, p: 1, medium: 'E° estándar (reacción lenta: se titula en caliente)' },
];

export function getCouple(id: string) {
  return COUPLES.find((c) => c.id === id);
}

export interface RedoxPreset {
  id: string;
  name: string;
  analyte: string; // id de cupla
  analyteForm: 'red' | 'ox';
  titrant: string;
  Ca: number;
  Va: number;
  Ct: number;
  pH: number;
  logI?: number; // log[I⁻] si corresponde
  note: string;
}

export const REDOX_PRESETS: RedoxPreset[] = [
  { id: 'fe-ce', name: 'Fe²⁺ con Ce⁴⁺ (H₂SO₄ 1 M)', analyte: 'Fe', analyteForm: 'red', titrant: 'Ce', Ca: 0.05, Va: 50, Ct: 0.1, pH: 0, note: 'Fe²⁺ + Ce⁴⁺ → Fe³⁺ + Ce³⁺ (1:1).' },
  { id: 'fe-mno4', name: 'Fe²⁺ con MnO₄⁻ (permanganimetría)', analyte: 'Fe', analyteForm: 'red', titrant: 'MnO4', Ca: 0.1, Va: 25, Ct: 0.02, pH: 0, note: '5Fe²⁺ + MnO₄⁻ + 8H⁺ → 5Fe³⁺ + Mn²⁺ + 4H₂O. El MnO₄⁻ es autoindicador (rosa persistente).' },
  { id: 'fe-cr2o7', name: 'Fe²⁺ con Cr₂O₇²⁻ (dicromatometría)', analyte: 'Fe', analyteForm: 'red', titrant: 'Cr2O7', Ca: 0.1, Va: 25, Ct: 0.01667, pH: 0, note: '6Fe²⁺ + Cr₂O₇²⁻ + 14H⁺ → 6Fe³⁺ + 2Cr³⁺ + 7H₂O. Indicador: difenilaminosulfonato.' },
  { id: 'i3-s2o3', name: 'I₂ (I₃⁻) con S₂O₃²⁻ (yodometría)', analyte: 'I3', analyteForm: 'ox', titrant: 'S4O6', Ca: 0.025, Va: 25, Ct: 0.1, pH: 7, logI: -1, note: 'I₃⁻ + 2S₂O₃²⁻ → 3I⁻ + S₄O₆²⁻. Indicador: almidón (se agrega cerca del punto final).' },
];

export interface RedoxIndicator {
  id: string;
  name: string;
  E0: number;
  n: number;
  oxColor: string;
  redColor: string;
  oxHex: string;
  redHex: string;
  medium: string;
}

/**
 * Indicadores redox generales: E°′ de transición (V vs ENH) en el medio indicado y colores de las formas
 * oxidada y reducida. Valores verificados en tablas de química analítica (ver TESTS.md).
 * Intervalo de viraje: E°′ ± 0,0592/n V.
 */
export const REDOX_INDICATORS: RedoxIndicator[] = [
  { id: 'nitroferroina', name: 'Nitroferroína (5-nitro-1,10-fenantrolina Fe(II))', E0: 1.25, n: 1, oxColor: 'celeste pálido', redColor: 'rojo-violeta', oxHex: '#7dd3fc', redHex: '#be185d', medium: 'H₂SO₄ 1 M' },
  { id: 'ferroina', name: 'Ferroína (1,10-fenantrolina Fe(II))', E0: 1.11, n: 1, oxColor: 'celeste pálido', redColor: 'rojo', oxHex: '#7dd3fc', redHex: '#dc2626', medium: 'H₂SO₄ 1 M' },
  { id: 'dimetilferroina', name: '5,6-Dimetilferroína', E0: 0.97, n: 1, oxColor: 'celeste pálido', redColor: 'rojo', oxHex: '#7dd3fc', redHex: '#dc2626', medium: 'H₂SO₄ 1 M' },
  { id: 'bipiridina', name: '2,2′-Bipiridina Fe(II)', E0: 0.97, n: 1, oxColor: 'celeste pálido', redColor: 'rojo', oxHex: '#7dd3fc', redHex: '#dc2626', medium: 'ácido diluido' },
  { id: 'dfas', name: 'Ácido difenilaminosulfónico', E0: 0.85, n: 2, oxColor: 'rojo-violeta', redColor: 'incoloro', oxHex: '#9333ea', redHex: '#e5e7eb', medium: 'ácido diluido' },
  { id: 'difenilamina', name: 'Difenilamina', E0: 0.76, n: 2, oxColor: 'violeta', redColor: 'incoloro', oxHex: '#7c3aed', redHex: '#e5e7eb', medium: 'ácido diluido' },
  { id: 'azulmetileno', name: 'Azul de metileno', E0: 0.53, n: 2, oxColor: 'azul', redColor: 'incoloro', oxHex: '#2563eb', redHex: '#e5e7eb', medium: 'ácido 1 M (pH 0)' },
  { id: 'indigo', name: 'Índigo tetrasulfonato', E0: 0.36, n: 2, oxColor: 'azul', redColor: 'incoloro', oxHex: '#1d4ed8', redHex: '#e5e7eb', medium: 'ácido 1 M (pH 0)' },
];

/**
 * Indicadores que NO son redox clásicos (su color no depende del potencial del sistema):
 *  - almidón: complejo azul con I₃⁻ (específico para yodo);
 *  - KMnO₄: autoindicador (el primer exceso de MnO₄⁻ da color rosa).
 */
export interface SpecialRedoxIndicator {
  id: string;
  name: string;
  note: string;
  /** cuplas con las que se puede usar */
  couples: string[];
}

export const SPECIAL_REDOX_INDICATORS: SpecialRedoxIndicator[] = [
  {
    id: 'almidon',
    name: 'Almidón (específico para I₂)',
    note: 'No es un indicador redox: forma un complejo azul intenso con I₃⁻. En la valoración de I₂ con tiosulfato se agrega cerca del punto final (cuando la solución es amarillo pálido) y el punto final es la desaparición del azul.',
    couples: ['I3'],
  },
  {
    id: 'kmno4',
    name: 'KMnO₄ (autoindicador)',
    note: 'El propio titulante indica el punto final: el MnO₄⁻ es violeta intenso y el Mn²⁺ prácticamente incoloro, así que el primer exceso (≈ 2 × 10⁻⁶ M) da un rosa tenue que persiste 30 s.',
    couples: ['MnO4'],
  },
];

/** Concentración de MnO₄⁻ en exceso que ya se percibe como rosa tenue (mol/L). */
export const KMNO4_VISIBLE_EXCESS = 2e-6;

/** Electrodos de referencia (potencial vs ENH a 25 °C). */
export const REFERENCES = [
  { id: 'ENH', name: 'ENH (hidrógeno)', E: 0 },
  { id: 'ECS', name: 'Calomel saturado (ECS)', E: 0.241 },
  { id: 'AgCl', name: 'Ag/AgCl (KCl saturado)', E: 0.197 },
];
