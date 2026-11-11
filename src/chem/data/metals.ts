/**
 * Constantes de formación con EDTA (log Kf, 25 °C, μ = 0,1 M) y constantes acumuladas
 * de complejos con NH₃. Fuente: Harris, "Quantitative Chemical Analysis", tablas de EDTA
 * y apéndice I (constantes de formación acumuladas). Editables en la interfaz.
 */
export interface Metal {
  id: string;
  name: string;
  logKf: number;
  /** log β1..βn con NH₃ (si se tabula) */
  nh3?: number[];
  note?: string;
}

export const METALS: Metal[] = [
  { id: 'Ca', name: 'Ca²⁺', logKf: 10.65, note: 'Indicador: calmagita o NET a pH 10; murexida o calcón a pH 12–13 (Mg precipita como Mg(OH)₂).' },
  { id: 'Mg', name: 'Mg²⁺', logKf: 8.79, note: 'Indicador: negro de eriocromo T (NET) a pH 10.' },
  { id: 'Zn', name: 'Zn²⁺', logKf: 16.5, nh3: [2.18, 4.43, 6.74, 8.7], note: 'Se titula en buffer NH₃/NH₄⁺ pH 10 (el NH₃ evita que precipite Zn(OH)₂). Indicador: NET.' },
  { id: 'Cu', name: 'Cu²⁺', logKf: 18.78, nh3: [4.04, 7.47, 10.27, 11.75], note: 'Indicador: murexida o PAN.' },
  { id: 'Ni', name: 'Ni²⁺', logKf: 18.4, nh3: [2.72, 4.89, 6.55, 7.67, 8.34, 8.31], note: 'Indicador: murexida.' },
  { id: 'Cd', name: 'Cd²⁺', logKf: 16.5, nh3: [2.55, 4.56, 5.9, 6.74] },
  { id: 'Co', name: 'Co²⁺', logKf: 16.45 },
  { id: 'Pb', name: 'Pb²⁺', logKf: 18.0, note: 'Indicador: naranja de xilenol (pH 5–6).' },
  { id: 'Mn', name: 'Mn²⁺', logKf: 13.89 },
  { id: 'Fe2', name: 'Fe²⁺', logKf: 14.3 },
  { id: 'Fe3', name: 'Fe³⁺', logKf: 25.1, note: 'Se puede titular en medio ácido (pH 1–2). Indicador: ácido salicílico o tirón.' },
  { id: 'Al', name: 'Al³⁺', logKf: 16.4, note: 'Reacción lenta: se usa retrotitulación.' },
  { id: 'Hg', name: 'Hg²⁺', logKf: 21.5 },
  { id: 'Ba', name: 'Ba²⁺', logKf: 7.88 },
  { id: 'Sr', name: 'Sr²⁺', logKf: 8.72 },
  { id: 'Ag', name: 'Ag⁺', logKf: 7.2 },
];

/**
 * pKa del EDTA (H₆Y²⁺ … Y⁴⁻), 25 °C, μ = 0,1 M (Harris).
 * Los dos primeros corresponden a los grupos amonio-carboxilato muy ácidos.
 */
export const EDTA_PKA = [0.0, 1.5, 2.0, 2.69, 6.13, 10.37];
export const EDTA_SPECIES = ['H₆Y²⁺', 'H₅Y⁺', 'H₄Y', 'H₃Y⁻', 'H₂Y²⁻', 'HY³⁻', 'Y⁴⁻'];

export function getMetal(id: string) {
  return METALS.find((m) => m.id === id);
}

/** Productos de solubilidad (25 °C). Valores típicos de tabla (Skoog, apéndice 2); pueden variar entre libros. */
export interface SaltData {
  id: string;
  formula: string;
  cation: string;
  anion: string;
  /** estequiometría M_a X_b */
  a: number;
  b: number;
  Ksp: number;
  /** sistema ácido-base del anión (id en acids.ts) si es base débil; 'OH' para hidróxidos */
  anionBase?: string;
  M?: number; // masa molar g/mol
}

export const SALTS: SaltData[] = [
  { id: 'AgCl', formula: 'AgCl', cation: 'Ag⁺', anion: 'Cl⁻', a: 1, b: 1, Ksp: 1.82e-10, M: 143.32 },
  { id: 'AgBr', formula: 'AgBr', cation: 'Ag⁺', anion: 'Br⁻', a: 1, b: 1, Ksp: 5.0e-13, M: 187.77 },
  { id: 'AgI', formula: 'AgI', cation: 'Ag⁺', anion: 'I⁻', a: 1, b: 1, Ksp: 8.3e-17, M: 234.77 },
  { id: 'AgSCN', formula: 'AgSCN', cation: 'Ag⁺', anion: 'SCN⁻', a: 1, b: 1, Ksp: 1.1e-12, M: 165.95 },
  { id: 'Ag2CrO4', formula: 'Ag₂CrO₄', cation: 'Ag⁺', anion: 'CrO₄²⁻', a: 2, b: 1, Ksp: 1.2e-12, anionBase: 'cromico', M: 331.73 },
  { id: 'Ag2CO3', formula: 'Ag₂CO₃', cation: 'Ag⁺', anion: 'CO₃²⁻', a: 2, b: 1, Ksp: 8.1e-12, anionBase: 'carbonico', M: 275.75 },
  { id: 'BaSO4', formula: 'BaSO₄', cation: 'Ba²⁺', anion: 'SO₄²⁻', a: 1, b: 1, Ksp: 1.1e-10, anionBase: 'sulfurico', M: 233.39 },
  { id: 'BaCO3', formula: 'BaCO₃', cation: 'Ba²⁺', anion: 'CO₃²⁻', a: 1, b: 1, Ksp: 5.0e-9, anionBase: 'carbonico', M: 197.34 },
  { id: 'BaCrO4', formula: 'BaCrO₄', cation: 'Ba²⁺', anion: 'CrO₄²⁻', a: 1, b: 1, Ksp: 2.1e-10, anionBase: 'cromico', M: 253.32 },
  { id: 'CaCO3', formula: 'CaCO₃ (calcita)', cation: 'Ca²⁺', anion: 'CO₃²⁻', a: 1, b: 1, Ksp: 4.5e-9, anionBase: 'carbonico', M: 100.09 },
  { id: 'CaC2O4', formula: 'CaC₂O₄', cation: 'Ca²⁺', anion: 'C₂O₄²⁻', a: 1, b: 1, Ksp: 1.7e-9, anionBase: 'oxalico', M: 128.1 },
  { id: 'CaF2', formula: 'CaF₂', cation: 'Ca²⁺', anion: 'F⁻', a: 1, b: 2, Ksp: 3.9e-11, anionBase: 'fluorhidrico', M: 78.07 },
  { id: 'CaSO4', formula: 'CaSO₄', cation: 'Ca²⁺', anion: 'SO₄²⁻', a: 1, b: 1, Ksp: 2.4e-5, anionBase: 'sulfurico', M: 136.14 },
  { id: 'CaOH2', formula: 'Ca(OH)₂', cation: 'Ca²⁺', anion: 'OH⁻', a: 1, b: 2, Ksp: 6.5e-6, anionBase: 'OH', M: 74.09 },
  { id: 'MgOH2', formula: 'Mg(OH)₂', cation: 'Mg²⁺', anion: 'OH⁻', a: 1, b: 2, Ksp: 7.1e-12, anionBase: 'OH', M: 58.32 },
  { id: 'ZnOH2', formula: 'Zn(OH)₂', cation: 'Zn²⁺', anion: 'OH⁻', a: 1, b: 2, Ksp: 3.0e-16, anionBase: 'OH', M: 99.42 },
  { id: 'CuOH2', formula: 'Cu(OH)₂', cation: 'Cu²⁺', anion: 'OH⁻', a: 1, b: 2, Ksp: 4.8e-20, anionBase: 'OH', M: 97.56 },
  { id: 'FeOH3', formula: 'Fe(OH)₃', cation: 'Fe³⁺', anion: 'OH⁻', a: 1, b: 3, Ksp: 2e-39, anionBase: 'OH', M: 106.87 },
  { id: 'AlOH3', formula: 'Al(OH)₃', cation: 'Al³⁺', anion: 'OH⁻', a: 1, b: 3, Ksp: 3e-34, anionBase: 'OH', M: 78.0 },
  { id: 'PbCl2', formula: 'PbCl₂', cation: 'Pb²⁺', anion: 'Cl⁻', a: 1, b: 2, Ksp: 1.7e-5, M: 278.1 },
  { id: 'PbI2', formula: 'PbI₂', cation: 'Pb²⁺', anion: 'I⁻', a: 1, b: 2, Ksp: 7.9e-9, M: 461.0 },
  { id: 'PbSO4', formula: 'PbSO₄', cation: 'Pb²⁺', anion: 'SO₄²⁻', a: 1, b: 1, Ksp: 1.6e-8, anionBase: 'sulfurico', M: 303.26 },
  { id: 'Hg2Cl2', formula: 'Hg₂Cl₂', cation: 'Hg₂²⁺', anion: 'Cl⁻', a: 1, b: 2, Ksp: 1.2e-18, M: 472.09 },
];

export function getSalt(id: string) {
  return SALTS.find((s) => s.id === id);
}
