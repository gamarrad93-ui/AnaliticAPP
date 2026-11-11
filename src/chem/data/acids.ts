/**
 * Biblioteca de ácidos y bases comunes.
 * Valores de pKa a 25 °C (fuerza iónica → 0), tomados de tablas estándar
 * (Harris, "Quantitative Chemical Analysis"; Skoog et al., "Fundamentos de Química Analítica").
 * Pequeñas diferencias (±0,02) entre libros son normales.
 */
import type { ProticSystem } from '../acidbase/equilibrium';

export interface AcidSystemData extends ProticSystem {
  id: string;
  name: string;
  /** Nombres de las especies, de la más protonada a la menos protonada (n+1 elementos). */
  species: string[];
}

export const SYSTEMS: AcidSystemData[] = [
  { id: 'acetico', name: 'Ácido acético / acetato', pKa: [4.76], zFull: 0, species: ['CH₃COOH', 'CH₃COO⁻'] },
  { id: 'formico', name: 'Ácido fórmico / formiato', pKa: [3.75], zFull: 0, species: ['HCOOH', 'HCOO⁻'] },
  { id: 'benzoico', name: 'Ácido benzoico / benzoato', pKa: [4.20], zFull: 0, species: ['C₆H₅COOH', 'C₆H₅COO⁻'] },
  { id: 'lactico', name: 'Ácido láctico / lactato', pKa: [3.86], zFull: 0, species: ['HLac', 'Lac⁻'] },
  { id: 'fluorhidrico', name: 'Ácido fluorhídrico', pKa: [3.17], zFull: 0, species: ['HF', 'F⁻'] },
  { id: 'hipocloroso', name: 'Ácido hipocloroso', pKa: [7.53], zFull: 0, species: ['HClO', 'ClO⁻'] },
  { id: 'cianhidrico', name: 'Ácido cianhídrico', pKa: [9.21], zFull: 0, species: ['HCN', 'CN⁻'] },
  { id: 'borico', name: 'Ácido bórico', pKa: [9.24], zFull: 0, species: ['B(OH)₃', 'B(OH)₄⁻'] },
  { id: 'amonio', name: 'Amonio / amoníaco', pKa: [9.25], zFull: 1, species: ['NH₄⁺', 'NH₃'] },
  { id: 'metilamina', name: 'Metilamonio / metilamina', pKa: [10.64], zFull: 1, species: ['CH₃NH₃⁺', 'CH₃NH₂'] },
  { id: 'piridina', name: 'Piridinio / piridina', pKa: [5.23], zFull: 1, species: ['C₅H₅NH⁺', 'C₅H₅N'] },
  { id: 'tris', name: 'Tris (TRIS-H⁺ / TRIS)', pKa: [8.07], zFull: 1, species: ['TrisH⁺', 'Tris'] },
  { id: 'carbonico', name: 'Ácido carbónico', pKa: [6.35, 10.33], zFull: 0, species: ['H₂CO₃', 'HCO₃⁻', 'CO₃²⁻'] },
  { id: 'oxalico', name: 'Ácido oxálico', pKa: [1.25, 4.27], zFull: 0, species: ['H₂C₂O₄', 'HC₂O₄⁻', 'C₂O₄²⁻'] },
  { id: 'ftalico', name: 'Ácido ftálico (KHP)', pKa: [2.95, 5.41], zFull: 0, species: ['H₂Ft', 'HFt⁻', 'Ft²⁻'] },
  { id: 'succinico', name: 'Ácido succínico', pKa: [4.21, 5.64], zFull: 0, species: ['H₂Suc', 'HSuc⁻', 'Suc²⁻'] },
  { id: 'tartarico', name: 'Ácido tartárico', pKa: [3.04, 4.37], zFull: 0, species: ['H₂Tar', 'HTar⁻', 'Tar²⁻'] },
  { id: 'maleico', name: 'Ácido maleico', pKa: [1.92, 6.27], zFull: 0, species: ['H₂Mal', 'HMal⁻', 'Mal²⁻'] },
  { id: 'sulfurico', name: 'Ácido sulfúrico (1ª disociación fuerte)', pKa: [-3, 1.99], zFull: 0, species: ['H₂SO₄', 'HSO₄⁻', 'SO₄²⁻'] },
  { id: 'glicina', name: 'Glicina', pKa: [2.35, 9.78], zFull: 1, species: ['H₂Gly⁺', 'HGly', 'Gly⁻'] },
  { id: 'etilendiamina', name: 'Etilendiamina', pKa: [6.85, 9.93], zFull: 2, species: ['H₂en²⁺', 'Hen⁺', 'en'] },
  { id: 'fosforico', name: 'Ácido fosfórico', pKa: [2.15, 7.20, 12.35], zFull: 0, species: ['H₃PO₄', 'H₂PO₄⁻', 'HPO₄²⁻', 'PO₄³⁻'] },
  { id: 'citrico', name: 'Ácido cítrico', pKa: [3.13, 4.76, 6.40], zFull: 0, species: ['H₃Cit', 'H₂Cit⁻', 'HCit²⁻', 'Cit³⁻'] },
];

export function getSystem(id: string): AcidSystemData | undefined {
  return SYSTEMS.find((s) => s.id === id);
}

/** Reactivo líquido concentrado (para calcular mL a medir). */
export interface LiquidReagent {
  /** % m/m */
  purity: number;
  /** densidad g/mL */
  density: number;
}

/** Sustancia que se puede pesar/medir y disolver (analito, titulante o reactivo de buffer). */
export interface Compound {
  id: string;
  name: string;
  formula: string;
  kind: 'strong-acid' | 'strong-base' | 'weak';
  /** ácidos/bases fuertes: protones u OH⁻ por fórmula */
  n?: number;
  /** compuestos débiles: id del sistema y número de protones ácidos en la forma agregada */
  systemId?: string;
  hAdded?: number;
  /** masa molar (g/mol) */
  M: number;
  liquid?: LiquidReagent;
  /** comentario breve (ej. hidratos) */
  note?: string;
}

export const COMPOUNDS: Compound[] = [
  // Fuertes
  { id: 'HCl', name: 'Ácido clorhídrico', formula: 'HCl', kind: 'strong-acid', n: 1, M: 36.46, liquid: { purity: 37, density: 1.19 } },
  { id: 'HNO3', name: 'Ácido nítrico', formula: 'HNO₃', kind: 'strong-acid', n: 1, M: 63.01, liquid: { purity: 65, density: 1.39 } },
  { id: 'HClO4', name: 'Ácido perclórico', formula: 'HClO₄', kind: 'strong-acid', n: 1, M: 100.46, liquid: { purity: 70, density: 1.67 } },
  { id: 'NaOH', name: 'Hidróxido de sodio', formula: 'NaOH', kind: 'strong-base', n: 1, M: 40.0 },
  { id: 'KOH', name: 'Hidróxido de potasio', formula: 'KOH', kind: 'strong-base', n: 1, M: 56.11 },
  { id: 'BaOH2', name: 'Hidróxido de bario', formula: 'Ba(OH)₂', kind: 'strong-base', n: 2, M: 171.34 },
  // Débiles (forma ácida)
  { id: 'CH3COOH', name: 'Ácido acético', formula: 'CH₃COOH', kind: 'weak', systemId: 'acetico', hAdded: 1, M: 60.05, liquid: { purity: 99.8, density: 1.049 } },
  { id: 'HCOOH', name: 'Ácido fórmico', formula: 'HCOOH', kind: 'weak', systemId: 'formico', hAdded: 1, M: 46.03, liquid: { purity: 98, density: 1.22 } },
  { id: 'C6H5COOH', name: 'Ácido benzoico', formula: 'C₆H₅COOH', kind: 'weak', systemId: 'benzoico', hAdded: 1, M: 122.12 },
  { id: 'HLac', name: 'Ácido láctico', formula: 'C₃H₆O₃', kind: 'weak', systemId: 'lactico', hAdded: 1, M: 90.08 },
  { id: 'HF', name: 'Ácido fluorhídrico', formula: 'HF', kind: 'weak', systemId: 'fluorhidrico', hAdded: 1, M: 20.01 },
  { id: 'HClO', name: 'Ácido hipocloroso', formula: 'HClO', kind: 'weak', systemId: 'hipocloroso', hAdded: 1, M: 52.46 },
  { id: 'HCN', name: 'Ácido cianhídrico', formula: 'HCN', kind: 'weak', systemId: 'cianhidrico', hAdded: 1, M: 27.03 },
  { id: 'H3BO3', name: 'Ácido bórico', formula: 'H₃BO₃', kind: 'weak', systemId: 'borico', hAdded: 1, M: 61.83 },
  { id: 'H2CO3', name: 'Ácido carbónico (CO₂ disuelto)', formula: 'H₂CO₃', kind: 'weak', systemId: 'carbonico', hAdded: 2, M: 62.03 },
  { id: 'H2C2O4', name: 'Ácido oxálico dihidratado', formula: 'H₂C₂O₄·2H₂O', kind: 'weak', systemId: 'oxalico', hAdded: 2, M: 126.07 },
  { id: 'H2Ft', name: 'Ácido ftálico', formula: 'C₆H₄(COOH)₂', kind: 'weak', systemId: 'ftalico', hAdded: 2, M: 166.13 },
  { id: 'KHP', name: 'Ftalato ácido de potasio (KHP)', formula: 'KHC₈H₄O₄', kind: 'weak', systemId: 'ftalico', hAdded: 1, M: 204.22 },
  { id: 'H2Suc', name: 'Ácido succínico', formula: 'C₄H₆O₄', kind: 'weak', systemId: 'succinico', hAdded: 2, M: 118.09 },
  { id: 'H2Tar', name: 'Ácido tartárico', formula: 'C₄H₆O₆', kind: 'weak', systemId: 'tartarico', hAdded: 2, M: 150.09 },
  { id: 'H2Mal', name: 'Ácido maleico', formula: 'C₄H₄O₄', kind: 'weak', systemId: 'maleico', hAdded: 2, M: 116.07 },
  { id: 'H2SO4', name: 'Ácido sulfúrico', formula: 'H₂SO₄', kind: 'weak', systemId: 'sulfurico', hAdded: 2, M: 98.08, liquid: { purity: 98, density: 1.84 } },
  { id: 'H3PO4', name: 'Ácido fosfórico', formula: 'H₃PO₄', kind: 'weak', systemId: 'fosforico', hAdded: 3, M: 98.0, liquid: { purity: 85, density: 1.69 } },
  { id: 'H3Cit', name: 'Ácido cítrico monohidratado', formula: 'C₆H₈O₇·H₂O', kind: 'weak', systemId: 'citrico', hAdded: 3, M: 210.14 },
  { id: 'Gly', name: 'Glicina', formula: 'H₂NCH₂COOH', kind: 'weak', systemId: 'glicina', hAdded: 1, M: 75.07 },
  // Débiles (sales / bases)
  { id: 'CH3COONa', name: 'Acetato de sodio anhidro', formula: 'CH₃COONa', kind: 'weak', systemId: 'acetico', hAdded: 0, M: 82.03, note: 'Trihidratado: 136,08 g/mol' },
  { id: 'HCOONa', name: 'Formiato de sodio', formula: 'HCOONa', kind: 'weak', systemId: 'formico', hAdded: 0, M: 68.01 },
  { id: 'C6H5COONa', name: 'Benzoato de sodio', formula: 'C₆H₅COONa', kind: 'weak', systemId: 'benzoico', hAdded: 0, M: 144.1 },
  { id: 'NaF', name: 'Fluoruro de sodio', formula: 'NaF', kind: 'weak', systemId: 'fluorhidrico', hAdded: 0, M: 41.99 },
  { id: 'NaClO', name: 'Hipoclorito de sodio', formula: 'NaClO', kind: 'weak', systemId: 'hipocloroso', hAdded: 0, M: 74.44 },
  { id: 'NaCN', name: 'Cianuro de sodio', formula: 'NaCN', kind: 'weak', systemId: 'cianhidrico', hAdded: 0, M: 49.01 },
  { id: 'NH3', name: 'Amoníaco', formula: 'NH₃', kind: 'weak', systemId: 'amonio', hAdded: 0, M: 17.03, liquid: { purity: 25, density: 0.91 } },
  { id: 'NH4Cl', name: 'Cloruro de amonio', formula: 'NH₄Cl', kind: 'weak', systemId: 'amonio', hAdded: 1, M: 53.49 },
  { id: 'CH3NH2', name: 'Metilamina', formula: 'CH₃NH₂', kind: 'weak', systemId: 'metilamina', hAdded: 0, M: 31.06 },
  { id: 'Py', name: 'Piridina', formula: 'C₅H₅N', kind: 'weak', systemId: 'piridina', hAdded: 0, M: 79.1, liquid: { purity: 99.8, density: 0.982 } },
  { id: 'Tris', name: 'Tris (base)', formula: '(HOCH₂)₃CNH₂', kind: 'weak', systemId: 'tris', hAdded: 0, M: 121.14 },
  { id: 'TrisHCl', name: 'Tris-HCl', formula: 'Tris·HCl', kind: 'weak', systemId: 'tris', hAdded: 1, M: 157.6 },
  { id: 'en', name: 'Etilendiamina', formula: 'H₂NCH₂CH₂NH₂', kind: 'weak', systemId: 'etilendiamina', hAdded: 0, M: 60.1, liquid: { purity: 99, density: 0.899 } },
  { id: 'NaHCO3', name: 'Bicarbonato de sodio', formula: 'NaHCO₃', kind: 'weak', systemId: 'carbonico', hAdded: 1, M: 84.01 },
  { id: 'Na2CO3', name: 'Carbonato de sodio', formula: 'Na₂CO₃', kind: 'weak', systemId: 'carbonico', hAdded: 0, M: 105.99 },
  { id: 'Na2C2O4', name: 'Oxalato de sodio', formula: 'Na₂C₂O₄', kind: 'weak', systemId: 'oxalico', hAdded: 0, M: 134.0 },
  { id: 'NaH2PO4', name: 'Dihidrógenofosfato de sodio anhidro', formula: 'NaH₂PO₄', kind: 'weak', systemId: 'fosforico', hAdded: 2, M: 119.98, note: 'Monohidratado: 137,99; dihidratado: 156,01 g/mol' },
  { id: 'Na2HPO4', name: 'Hidrógenofosfato de sodio anhidro', formula: 'Na₂HPO₄', kind: 'weak', systemId: 'fosforico', hAdded: 1, M: 141.96, note: 'Dodecahidratado: 358,14 g/mol' },
  { id: 'Na3PO4', name: 'Fosfato de sodio anhidro', formula: 'Na₃PO₄', kind: 'weak', systemId: 'fosforico', hAdded: 0, M: 163.94 },
  { id: 'KH2PO4', name: 'Dihidrógenofosfato de potasio', formula: 'KH₂PO₄', kind: 'weak', systemId: 'fosforico', hAdded: 2, M: 136.09 },
  { id: 'K2HPO4', name: 'Hidrógenofosfato de potasio', formula: 'K₂HPO₄', kind: 'weak', systemId: 'fosforico', hAdded: 1, M: 174.18 },
  { id: 'NaH2Cit', name: 'Citrato diácido de sodio', formula: 'NaH₂C₆H₅O₇', kind: 'weak', systemId: 'citrico', hAdded: 2, M: 214.11 },
  { id: 'Na2HCit', name: 'Citrato ácido de disodio sesquihidratado', formula: 'Na₂HC₆H₅O₇·1,5H₂O', kind: 'weak', systemId: 'citrico', hAdded: 1, M: 263.11 },
  { id: 'Na3Cit', name: 'Citrato trisódico dihidratado', formula: 'Na₃C₆H₅O₇·2H₂O', kind: 'weak', systemId: 'citrico', hAdded: 0, M: 294.1 },
  { id: 'Na2Ft', name: 'Ftalato de disodio', formula: 'Na₂C₈H₄O₄', kind: 'weak', systemId: 'ftalico', hAdded: 0, M: 210.1 },
  { id: 'NaBOH4', name: 'Borato de sodio (1 B)', formula: 'NaB(OH)₄', kind: 'weak', systemId: 'borico', hAdded: 0, M: 101.83, note: 'El bórax (Na₂B₄O₇·10H₂O, 381,37 g/mol) aporta 2 B(OH)₃ + 2 B(OH)₄⁻ por fórmula' },
  { id: 'Na2Suc', name: 'Succinato de disodio', formula: 'Na₂C₄H₄O₄', kind: 'weak', systemId: 'succinico', hAdded: 0, M: 162.05 },
];

export function getCompound(id: string): Compound | undefined {
  return COMPOUNDS.find((c) => c.id === id);
}

/** Compuestos de un sistema dado, en una forma de protonación concreta. */
export function compoundsForForm(systemId: string, hAdded: number): Compound[] {
  return COMPOUNDS.filter((c) => c.systemId === systemId && c.hAdded === hAdded);
}

/** Titulantes habituales (fuertes). */
export const TITRANTS = COMPOUNDS.filter((c) => c.kind !== 'weak' && ['NaOH', 'KOH', 'HCl', 'HNO3', 'HClO4', 'BaOH2'].includes(c.id));
