/**
 * Fórmulas de la Cuaderneta de Laboratorio de QA I (2026): diagramación (cuánto tomar para un
 * gasto de bureta dado) y cálculo del resultado de cada determinación.
 * Convención: G en mL, C en mol/L, masas en g, Assay en %.
 */

export const MM = {
  Na2CO3: 105.99,
  H2C2O4_2H2O: 126.07,
  citrico_H2O: 210.14,
  MgSO4_7H2O: 246.47,
  EDTA_Na2_2H2O: 372.24,
  NiSO4_6H2O: 262.85,
  KMnO4: 158.04,
  H2O2: 34.02,
  Na2S2O3_5H2O: 248.19,
  KIO3: 214.0,
  I2: 253.8,
  KBr: 119.0,
  H3PO4: 97.99,
  HCl: 36.46,
  Fe: 55.845,
  sal_Mohr: 392.14,
  FeSO4_7H2O: 278.01,
  paracetamol: 151.16,
};

/** Balanza analítica d = 0,0001 g: por debajo de ~0,1 g el error relativo de pesada supera 0,1–0,2 %. */
export const MIN_MASS_DIRECT = 0.1;

/**
 * Masa de sólido para gastar G mL de titulante de concentración Ct.
 * ratio = mol de sólido por mol de titulante (ej. Na2CO3 con HCl: 1/2).
 */
export function massForGasto(G: number, Ct: number, ratio: number, MMs: number, assay = 100): number {
  return ((G / 1000) * Ct * ratio * MMs) / (assay / 100);
}

/** Volumen (mL) de una disolución de concentración Cs para gastar G mL de titulante Ct. */
export function volumeForGasto(G: number, Ct: number, ratio: number, Cs: number): number {
  return (G * Ct * ratio) / Cs;
}

/** Si la masa es chica, propone preparar una disolución y tomar una alícuota. */
export function aliquotSuggestion(m: number, flask = 100, pipette = 10) {
  return { massStock: (m * flask) / pipette, flask, pipette };
}

/** Volumen de reactivo concentrado (mL) para preparar V mL de concentración C. */
export function concentratedVolume(C: number, V: number, MMs: number, purity: number, density: number): number {
  return (C * (V / 1000) * MMs) / ((purity / 100) * density);
}

/* ---------------- Resultados por determinación ---------------- */

/** P2: C(HCl) = 2·m·(Assay/100)·1000 / (MM·G) */
export const cHClvsNa2CO3 = (m: number, G: number, assay = 100) => (2 * m * (assay / 100) * 1000) / (MM.Na2CO3 * G);

/** P3: C(NaOH) = 2·m·(Assay/100)·(Vp/Vm)·1000 / (MM·G) (toma en volumen; Vp = Vm si es directa) */
export const cNaOHvsOxalico = (m: number, G: number, assay = 100, Vp = 1, Vm = 1) => (2 * m * (assay / 100) * (Vp / Vm) * 1000) / (MM.H2C2O4_2H2O * G);

/** P4: %m-m ácido cítrico·H2O = C·G·MM·(Vm/Vp) / (3·1000·m) · 100 */
export const pctCitrico = (C: number, G: number, m: number, Vp = 1, Vm = 1) => ((C * G * MM.citrico_H2O * (Vm / Vp)) / (3 * 1000 * m)) * 100;

/** P5: C(Na2CO3) = C_HCl·G1/V_T ; C(NaHCO3) = C_HCl·(G2 − 2·G1)/V_T (G2 = gasto total hasta heliantina) */
export const alcalinidad = (C: number, G1: number, G2: number, VT: number) => ({ Na2CO3: (C * G1) / VT, NaHCO3: (C * (G2 - 2 * G1)) / VT });

/** P6: %m-m NiSO4·6H2O = MM·C_Mg·(GB − GR)/1000 / m0 · 100 */
export const pctNiquel = (CMg: number, GB: number, GR: number, m0: number) => ((MM.NiSO4_6H2O * CMg * (GB - GR)) / 1000 / m0) * 100;

/** P7: C(KMnO4) = (2/5)·m·(Assay/100)·(Vp/Vm)·1000 / (MM·G) */
export const cKMnO4 = (m: number, G: number, assay = 100, Vp = 1, Vm = 1) => (0.4 * m * (assay / 100) * (Vp / Vm) * 1000) / (MM.H2C2O4_2H2O * G);

/**
 * P7: C(H2O2) en volúmenes = (5/2)·C_KMnO4·G / V_original_en_la_alícuota · 11,2
 * con V_original_en_la_alícuota = Vorig·Valic/Vmatraz (dilución de la muestra).
 */
export const volH2O2 = (CK: number, G: number, Vorig: number, Vmatraz: number, Valic: number) => ((2.5 * CK * G) / ((Vorig * Valic) / Vmatraz)) * 11.2;

/** 1 volumen ≡ 1/11,2 mol/L de H2O2 → g/100 mL */
export const vol2gPer100mL = (vol: number) => ((vol / 11.2) * MM.H2O2) / 10;

/** P8: C(Na2S2O3) = 6·m(KIO3)·(Assay/100)·(Vp/Vm)·1000/(MM·G) */
export const cTiosulfato = (m: number, G: number, assay = 100, Vp = 1, Vm = 1) => (6 * m * (assay / 100) * (Vp / Vm) * 1000) / (MM.KIO3 * G);

/** P8: C(I2) = C_S2O3·G / (2·V_toma) */
export const cI2 = (CS: number, G: number, Vtoma: number) => (CS * G) / (2 * Vtoma);

/** P9 (Volhard): C(Br⁻) = C_SCN·(G_blanco − G_retro)/V_toma */
export const cBromuro = (CSCN: number, GB: number, GR: number, Vtoma: number) => (CSCN * (GB - GR)) / Vtoma;

/** P10: % humedad = (m_húmeda − m_seca)/m_húmeda·100 a partir de las masas con cápsula */
export const pctHumedad = (m0: number, mSH: number, mSS: number) => ((mSH - mSS) / (mSH - m0)) * 100;

/** P11: ppm (mg/kg) de H3PO4 = C_NaOH·G·MM·1000 / m_muestra (1er PE, relación 1:1) */
export const ppmH3PO4 = (C: number, G: number, m: number) => (C * G * MM.H3PO4 * 1000) / m;

/* ---------------- Esquemas de dilución ---------------- */

export interface DilutionStep {
  pipette: number;
  flask: number;
}
export interface DilutionScheme {
  steps: DilutionStep[];
  factor: number; // concentración final / inicial
  finalConc: number;
}

/**
 * Busca esquemas de 1 o 2 diluciones con el material disponible que lleven Cini lo más cerca
 * posible de Ctarget (error relativo). Devuelve los mejores ordenados.
 */
export function suggestDilutions(Cini: number, Ctarget: number, pipettes: number[], flasks: number[], maxSteps = 2, top = 3): DilutionScheme[] {
  const out: DilutionScheme[] = [];
  const singles: DilutionStep[] = [];
  for (const p of pipettes) for (const f of flasks) if (p < f) singles.push({ pipette: p, flask: f });
  const push = (steps: DilutionStep[]) => {
    const factor = steps.reduce((acc, s) => acc * (s.pipette / s.flask), 1);
    out.push({ steps, factor, finalConc: Cini * factor });
  };
  for (const s of singles) push([s]);
  if (maxSteps >= 2) for (const a of singles) for (const b of singles) push([a, b]);
  const score = (d: DilutionScheme) => Math.abs(Math.log(d.finalConc / Ctarget)) + 0.02 * d.steps.length;
  return out.sort((x, y) => score(x) - score(y)).slice(0, top);
}

/* ---------------- Espectrofotometría ---------------- */

/** Rango de concentraciones (mol/L) para un rango de absorbancias, con Beer: C = A/(ε·b) */
export function beerRange(Amin: number, Amax: number, epsilon: number, b = 1) {
  return { Cmin: Amin / (epsilon * b), Cmax: Amax / (epsilon * b) };
}
