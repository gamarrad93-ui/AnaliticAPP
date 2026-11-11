/** Estadística descriptiva y pruebas de significación más usadas en Química Analítica. */
import { tCritTwoSided, tPValueTwoSided, fCDF, fInv } from './distributions';

export function mean(x: number[]): number {
  return x.reduce((a, b) => a + b, 0) / x.length;
}

/** Desviación estándar muestral (n − 1). */
export function sd(x: number[]): number {
  if (x.length < 2) return NaN;
  const m = mean(x);
  return Math.sqrt(x.reduce((a, v) => a + (v - m) ** 2, 0) / (x.length - 1));
}

export function variance(x: number[]): number {
  const s = sd(x);
  return s * s;
}

export interface Summary {
  n: number;
  mean: number;
  sd: number;
  rsd: number; // %
  sem: number; // desviación estándar de la media
  tCrit: number;
  ci: [number, number];
  halfWidth: number;
  confidence: number;
  min: number;
  max: number;
  median: number;
}

export function summarize(x: number[], confidence = 0.95): Summary {
  const n = x.length;
  const m = mean(x);
  const s = sd(x);
  const sem = s / Math.sqrt(n);
  const t = tCritTwoSided(confidence, n - 1);
  const sorted = [...x].sort((a, b) => a - b);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return {
    n,
    mean: m,
    sd: s,
    rsd: (s / Math.abs(m)) * 100,
    sem,
    tCrit: t,
    ci: [m - t * sem, m + t * sem],
    halfWidth: t * sem,
    confidence,
    min: sorted[0],
    max: sorted[n - 1],
    median,
  };
}

export interface TestResult {
  statistic: number;
  df: number;
  critical: number;
  pValue: number;
  significant: boolean;
  details: Record<string, number>;
}

/** t de una muestra: ¿la media difiere de un valor de referencia μ0? (bilateral) */
export function tTestOneSample(x: number[], mu0: number, confidence = 0.95): TestResult {
  const n = x.length;
  const m = mean(x);
  const s = sd(x);
  const t = (Math.abs(m - mu0) * Math.sqrt(n)) / s;
  const df = n - 1;
  const crit = tCritTwoSided(confidence, df);
  return { statistic: t, df, critical: crit, pValue: tPValueTwoSided(t, df), significant: t > crit, details: { mean: m, sd: s, n } };
}

/**
 * t de dos muestras independientes.
 *  - pooled = true: varianzas iguales (desviación estándar combinada, gl = n1+n2−2)
 *  - pooled = false: Welch (gl de Welch-Satterthwaite)
 */
export function tTestTwoSample(x1: number[], x2: number[], pooled = true, confidence = 0.95): TestResult {
  const n1 = x1.length;
  const n2 = x2.length;
  const m1 = mean(x1);
  const m2 = mean(x2);
  const v1 = variance(x1);
  const v2 = variance(x2);
  let t: number;
  let df: number;
  const details: Record<string, number> = { mean1: m1, mean2: m2, sd1: Math.sqrt(v1), sd2: Math.sqrt(v2), n1, n2 };
  if (pooled) {
    const sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
    t = Math.abs(m1 - m2) / (sp * Math.sqrt(1 / n1 + 1 / n2));
    df = n1 + n2 - 2;
    details.sPooled = sp;
  } else {
    const a = v1 / n1;
    const b = v2 / n2;
    t = Math.abs(m1 - m2) / Math.sqrt(a + b);
    df = (a + b) ** 2 / (a * a / (n1 - 1) + (b * b) / (n2 - 1));
  }
  const crit = tCritTwoSided(confidence, df);
  return { statistic: t, df, critical: crit, pValue: tPValueTwoSided(t, df), significant: t > crit, details };
}

/** t para datos apareados: se analizan las diferencias d_i = x1_i − x2_i. */
export function tTestPaired(x1: number[], x2: number[], confidence = 0.95): TestResult {
  const d = x1.map((v, i) => v - x2[i]);
  const r = tTestOneSample(d, 0, confidence);
  return { ...r, details: { meanDiff: mean(d), sdDiff: sd(d), n: d.length } };
}

/**
 * Prueba F para comparar varianzas (bilateral): F = s²mayor / s²menor.
 * F crítico = F(1 − α/2; gl_mayor, gl_menor).
 */
export function fTest(x1: number[], x2: number[], confidence = 0.95): TestResult & { dfNum: number; dfDen: number } {
  const v1 = variance(x1);
  const v2 = variance(x2);
  const big = v1 >= v2;
  const F = big ? v1 / v2 : v2 / v1;
  const dfNum = (big ? x1.length : x2.length) - 1;
  const dfDen = (big ? x2.length : x1.length) - 1;
  const alpha = 1 - confidence;
  const crit = fInv(1 - alpha / 2, dfNum, dfDen);
  const p = Math.min(1, 2 * (1 - fCDF(F, dfNum, dfDen)));
  return { statistic: F, df: dfNum, dfNum, dfDen, critical: crit, pValue: p, significant: F > crit, details: { var1: v1, var2: v2 } };
}
