/**
 * Solubilidad de sales poco solubles M_aX_b (comportamiento ideal, 25 °C).
 */
import { alphas, KW } from '../acidbase/equilibrium';
import { getSystem } from '../data/acids';
import { bisect } from '../numeric/solve';

/** Solubilidad molar en agua pura: Ksp = (a·s)^a (b·s)^b. */
export function solubilityPure(Ksp: number, a: number, b: number): number {
  return Math.pow(Ksp / (Math.pow(a, a) * Math.pow(b, b)), 1 / (a + b));
}

/**
 * Solubilidad con ion común (concentraciones agregadas CM del catión y CX del anión):
 *   Ksp = (CM + a·s)^a · (CX + b·s)^b   → se resuelve s exactamente (bisección en log s).
 */
export function solubilityCommonIon(Ksp: number, a: number, b: number, CM: number, CX: number): number {
  const f = (logS: number) => {
    const s = Math.pow(10, logS);
    return a * Math.log10(CM + a * s) + b * Math.log10(CX + b * s) - Math.log10(Ksp);
  };
  return Math.pow(10, bisect(f, -40, 3, 1e-13));
}

/**
 * Fracción del anión en la forma totalmente desprotonada a un pH dado (α_X).
 * Para hidróxidos (anionBase = 'OH') no aplica: se usa [OH⁻] directamente.
 */
export function anionAlpha(anionBase: string | undefined, pH: number): number {
  if (!anionBase || anionBase === 'OH') return 1;
  const sys = getSystem(anionBase);
  if (!sys) return 1;
  const a = alphas(-pH, sys.pKa);
  return a[a.length - 1];
}

/**
 * Solubilidad a pH fijo (solución regulada).
 *  - Sal de anión básico: Ksp' = Ksp/α_X^b → s = (Ksp' / (a^a b^b))^(1/(a+b))
 *  - Hidróxido M(OH)_b: s = [M] / a con [M]^a = Ksp / [OH⁻]^b
 * (No se considera la hidrólisis del catión ni complejos hidroxo: es el modelo de curso.)
 */
export function solubilityAtPH(Ksp: number, a: number, b: number, anionBase: string | undefined, pH: number): number {
  if (anionBase === 'OH') {
    const OH = KW / Math.pow(10, -pH);
    return Math.pow(Ksp / Math.pow(OH, b), 1 / a) / a;
  }
  const al = anionAlpha(anionBase, pH);
  return solubilityPure(Ksp / Math.pow(al, b), a, b);
}

export interface PrecipitationCheck {
  CM: number; // concentraciones luego de mezclar
  CX: number;
  Q: number;
  precipitates: boolean;
  /** si precipita: mol/L que precipitan, y concentraciones en equilibrio */
  precipitated: number;
  Meq: number;
  Xeq: number;
  /** % del ion limitante que precipita */
  percent: number;
}

/** ¿Precipita? Se mezclan V1 mL de catión (C1) con V2 mL de anión (C2). */
export function willPrecipitate(Ksp: number, a: number, b: number, C1: number, V1: number, C2: number, V2: number): PrecipitationCheck {
  const Vt = V1 + V2;
  const CM = (C1 * V1) / Vt;
  const CX = (C2 * V2) / Vt;
  const Q = Math.pow(CM, a) * Math.pow(CX, b);
  if (Q <= Ksp) return { CM, CX, Q, precipitates: false, precipitated: 0, Meq: CM, Xeq: CX, percent: 0 };
  // Se resuelve para la concentración remanente r del ion limitante (en escala log, robusto
  // aunque precipite casi todo): p = (C_lim − r)/coef y el otro ion queda en C − coef'·p.
  const limitingIsM = CM / a <= CX / b;
  const Clim = limitingIsM ? CM : CX;
  const cl = limitingIsM ? a : b;
  const co = limitingIsM ? b : a;
  const Cother = limitingIsM ? CX : CM;
  const g = (logR: number) => {
    const r = Math.pow(10, logR);
    const p = (Clim - r) / cl;
    const other = Math.max(Cother - co * p, 1e-300);
    return cl * logR + co * Math.log10(other) - Math.log10(Ksp);
  };
  const r = Math.pow(10, bisect(g, -300, Math.log10(Clim), 1e-13));
  const p = (Clim - r) / cl;
  const other = Cother - co * p;
  const Meq = limitingIsM ? r : other;
  const Xeq = limitingIsM ? other : r;
  const percent = (100 * (Clim - r)) / Clim;
  return { CM, CX, Q, precipitates: true, precipitated: p, Meq, Xeq, percent };
}
