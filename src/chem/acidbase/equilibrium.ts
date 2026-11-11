/**
 * Motor ácido-base EXACTO.
 *
 * Idea central: toda solución se describe como una lista de componentes.
 * Para cada valor de [H+] se calcula la carga neta de la solución;
 * el pH verdadero es el único [H+] que hace la carga neta = 0
 * (balance de carga + balances de masa, sin aproximaciones).
 *
 * Supuestos: 25 °C, Kw = 1,0 × 10⁻¹⁴, comportamiento ideal (actividad = concentración).
 */
import { brent, log10SumExp } from '../numeric/solve';

export const PKW = 14.0;
export const KW = Math.pow(10, -PKW);

/**
 * Sistema ácido-base débil (poliprótico) H_nA.
 * - pKa: valores en orden creciente (pKa1 < pKa2 < ...)
 * - zFull: carga de la especie totalmente protonada (0 para HnA, +1 para NH4+, +2 para H2en²⁺)
 * La especie j (j = protones perdidos, 0..n) tiene carga zFull − j.
 */
export interface ProticSystem {
  pKa: number[];
  zFull: number;
}

/** Un componente disuelto en la solución. */
export type Component =
  /** ácido fuerte que libera n protones por fórmula (HCl n=1). Aporta n·C de anión. */
  | { kind: 'strong-acid'; C: number; n: number }
  /** base fuerte que libera n OH⁻ por fórmula (NaOH n=1, Ba(OH)₂ n=2). Aporta n·C de catión. */
  | { kind: 'strong-base'; C: number; n: number }
  /**
   * Especie débil del sistema `system`, agregada en la forma que tiene `hAdded` protones ácidos
   * (ej. H3PO4 → hAdded 3; NaH2PO4 → 2; Na2CO3 → 0; NH3 → 0; NH4Cl → 1).
   * Los contraiones (Na⁺, Cl⁻, K⁺) se tratan como espectadores.
   */
  | { kind: 'weak'; C: number; system: ProticSystem; hAdded: number };

/**
 * Fracciones molares α_j de cada especie de un sistema poliprótico a un [H+] dado.
 * Índice j = número de protones perdidos (α_0 = forma totalmente protonada).
 * Se calcula en escala logarítmica para no desbordar con pH extremos.
 *
 *   α_j ∝ [H+]^(n−j) · K1·K2·…·Kj
 */
export function alphas(logH: number, pKa: number[]): number[] {
  const n = pKa.length;
  const logTerms: number[] = [];
  let sumPKa = 0;
  for (let j = 0; j <= n; j++) {
    if (j > 0) sumPKa += pKa[j - 1];
    logTerms.push((n - j) * logH - sumPKa);
  }
  const logDen = log10SumExp(logTerms);
  return logTerms.map((t) => Math.pow(10, t - logDen));
}

/** Número medio de protones unidos (n̄H) = Σ (n − j)·α_j */
export function meanBoundProtons(logH: number, pKa: number[]): number {
  const a = alphas(logH, pKa);
  const n = pKa.length;
  let s = 0;
  for (let j = 0; j <= n; j++) s += (n - j) * a[j];
  return s;
}

/**
 * Contribución de un componente al balance de carga (en mol/L de carga), incluyendo sus
 * contraiones espectadores. Equivale a la "condición protónica":
 *   débil:        C · (n̄H − hAdded)
 *   ácido fuerte: −n·C   (el anión, ej. Cl⁻)
 *   base fuerte:  +n·C   (el catión, ej. Na⁺)
 */
export function componentCharge(c: Component, logH: number): number {
  switch (c.kind) {
    case 'strong-acid':
      return -c.n * c.C;
    case 'strong-base':
      return c.n * c.C;
    case 'weak':
      return c.C * (meanBoundProtons(logH, c.system.pKa) - c.hAdded);
  }
}

/** Carga neta total de la solución: [H+] − [OH−] + Σ contribuciones. */
export function netCharge(components: Component[], logH: number): number {
  const h = Math.pow(10, logH);
  let q = h - KW / h;
  for (const c of components) q += componentCharge(c, logH);
  return q;
}

/**
 * pH exacto de una mezcla: resuelve netCharge = 0 en log[H+] con el método de Brent.
 * La función es estrictamente creciente en [H+], así que la raíz es única.
 */
export function solvePH(components: Component[]): number {
  const f = (logH: number) => netCharge(components, logH);
  let lo = -20;
  let hi = 3;
  // la carga es negativa con [H+] muy bajo y positiva con [H+] muy alto
  if (f(lo) > 0) return -lo;
  if (f(hi) < 0) return -hi;
  const logH = brent(f, lo, hi, 1e-13);
  return -logH;
}

/** Concentraciones de cada especie de un sistema débil a cierto pH. */
export function speciesConcentrations(C: number, pKa: number[], pH: number): number[] {
  return alphas(-pH, pKa).map((a) => a * C);
}

/**
 * Capacidad buffer exacta β = dC_base/dpH (mol L⁻¹ por unidad de pH)
 *   β = ln10 · ( [H+] + [OH−] + Σ C · Var(protones unidos) )
 * donde Var = Σ (n−j)²α_j − (n̄H)².
 */
export function bufferCapacity(components: Component[], pH: number): number {
  const h = Math.pow(10, -pH);
  let s = h + KW / h;
  for (const c of components) {
    if (c.kind !== 'weak') continue;
    const a = alphas(-pH, c.system.pKa);
    const n = c.system.pKa.length;
    let m1 = 0;
    let m2 = 0;
    for (let j = 0; j <= n; j++) {
      m1 += (n - j) * a[j];
      m2 += (n - j) * (n - j) * a[j];
    }
    s += c.C * (m2 - m1 * m1);
  }
  return Math.LN10 * s;
}

/** Diluye un componente (multiplica su concentración por un factor). */
export function scaleComponent(c: Component, factor: number): Component {
  return { ...c, C: c.C * factor } as Component;
}
