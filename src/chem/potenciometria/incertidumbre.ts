/**
 * Incertidumbre combinada por propagación (GUM, primer orden) con factor de cobertura k.
 * Usa el motor general de propagación (derivadas parciales numéricas).
 */
import { propagate, type PropagationResult } from '../stats/propagation';

export interface Expanded extends PropagationResult {
  k: number;
  U: number;
}

export function combinedUncertainty(formula: string, values: Record<string, { value: number; u: number }>, k = 2): Expanded {
  const r = propagate(formula, values);
  return { ...r, k, U: k * r.u };
}

/**
 * Práctico 11: H3PO4 en bebida cola, valorado hasta el 1er punto equivalente (H3PO4 + OH⁻ → H2PO4⁻ + H2O, 1:1).
 *   c(ppm) = c(NaOH)·G(mL)·M(H3PO4)·1000 / m(muestra, g)
 * Incertidumbres de la tabla del práctico: G ±0,1 mL; M ±0,00042 g/mol; m ±0,0002 g; c(NaOH) la calculada en la estandarización.
 * Verificado contra el PDF de la cuaderneta 2026 (pág. 39): el documento escribe
 *   c (mg/kg) = c(NaOH) (mol/L)·Gb (L)·MM (g/mol) / m (g) · 10⁶, que es la misma ecuación con Gb en mL,
 *   y u(c) = c·√[(u_cNaOH/cNaOH)² + (u_Gb/Gb)² + (u_MM/MM)² + (u_m/m)²].
 * El documento informa (c ± u) ppm, sin factor de cobertura.
 */
export const P11_FORMULA = 'cNaOH * G * MM * 1000 / m';

export const P11_UNCERTAINTIES = { G: 0.1, MM: 0.00042, m: 0.0002 } as const;
export const P11_MM = 97.9956;
