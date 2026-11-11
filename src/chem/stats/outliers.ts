/**
 * Detección de valores atípicos: Q de Dixon y test de Grubbs.
 */
import { mean, sd } from './descriptive';
import { tInv } from './distributions';

/**
 * Valores críticos de Q (r10 = brecha / rango) para n = 3…10.
 * Fuente: D. B. Rorabacher, Anal. Chem. 1991, 63, 139–146 (Tabla II, prueba bilateral).
 * Son los mismos valores que trae Harris y Skoog/West (Q90, Q95, Q99).
 */
export const DIXON_Q: Record<number, { 90: number; 95: number; 99: number }> = {
  3: { 90: 0.941, 95: 0.970, 99: 0.994 },
  4: { 90: 0.765, 95: 0.829, 99: 0.926 },
  5: { 90: 0.642, 95: 0.710, 99: 0.821 },
  6: { 90: 0.560, 95: 0.625, 99: 0.740 },
  7: { 90: 0.507, 95: 0.568, 99: 0.680 },
  8: { 90: 0.468, 95: 0.526, 99: 0.634 },
  9: { 90: 0.437, 95: 0.493, 99: 0.598 },
  10: { 90: 0.412, 95: 0.466, 99: 0.568 },
};

export interface DixonResult {
  suspect: number;
  side: 'menor' | 'mayor';
  gap: number;
  range: number;
  Q: number;
  Qcrit: number;
  reject: boolean;
}

/** Q de Dixon para el valor más alejado (se evalúan ambos extremos y se informa el de Q mayor). */
export function dixonQ(x: number[], confidence: 90 | 95 | 99 = 95): DixonResult {
  const n = x.length;
  if (n < 3 || n > 10) throw new Error('La prueba Q de Dixon se aplica a 3–10 datos.');
  const s = [...x].sort((a, b) => a - b);
  const range = s[n - 1] - s[0];
  const qLow = range === 0 ? 0 : (s[1] - s[0]) / range;
  const qHigh = range === 0 ? 0 : (s[n - 1] - s[n - 2]) / range;
  const low = qLow >= qHigh;
  const Q = low ? qLow : qHigh;
  const Qcrit = DIXON_Q[n][confidence];
  return {
    suspect: low ? s[0] : s[n - 1],
    side: low ? 'menor' : 'mayor',
    gap: low ? s[1] - s[0] : s[n - 1] - s[n - 2],
    range,
    Q,
    Qcrit,
    reject: Q > Qcrit,
  };
}

/**
 * G crítico de Grubbs (un valor atípico), calculado a partir de la distribución t:
 *   G_crit = ((n−1)/√n) · √( t² / (n − 2 + t²) )
 * con t = t(α/(2n); n−2) para la prueba bilateral (ISO 5725-2 / NIST e-Handbook 1.3.5.17).
 */
export function grubbsCritical(n: number, alpha = 0.05, twoSided = true): number {
  const p = twoSided ? alpha / (2 * n) : alpha / n;
  const t = tInv(1 - p, n - 2);
  return ((n - 1) / Math.sqrt(n)) * Math.sqrt((t * t) / (n - 2 + t * t));
}

export interface GrubbsResult {
  suspect: number;
  mean: number;
  sd: number;
  G: number;
  Gcrit: number;
  reject: boolean;
}

export function grubbs(x: number[], alpha = 0.05): GrubbsResult {
  const n = x.length;
  if (n < 3) throw new Error('El test de Grubbs requiere al menos 3 datos.');
  const m = mean(x);
  const s = sd(x);
  let suspect = x[0];
  for (const v of x) if (Math.abs(v - m) > Math.abs(suspect - m)) suspect = v;
  const G = s === 0 ? 0 : Math.abs(suspect - m) / s;
  const Gcrit = grubbsCritical(n, alpha, true);
  return { suspect, mean: m, sd: s, G, Gcrit, reject: G > Gcrit };
}
