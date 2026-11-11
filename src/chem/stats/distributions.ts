/**
 * Distribuciones estadísticas (t de Student, F de Fisher) calculadas con funciones especiales.
 * Así los valores críticos salen de fórmulas exactas en lugar de tablas transcriptas a mano
 * (y se comparan contra tablas publicadas en las pruebas).
 *
 * Referencias de los algoritmos: Numerical Recipes (3ª ed.), cap. 6.
 */
import { bisect } from '../numeric/solve';

/** ln Γ(x) (aproximación de Lanczos, error relativo < 1e-14). */
export function lnGamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Fracción continua para la beta incompleta (algoritmo de Lentz). */
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 300;
  const EPS = 1e-16;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Beta incompleta regularizada I_x(a, b). */
export function betaInc(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lnBt = lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x);
  const bt = Math.exp(lnBt);
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Función de distribución acumulada de t de Student con ν grados de libertad. */
export function tCDF(t: number, nu: number): number {
  const x = nu / (nu + t * t);
  const tail = 0.5 * betaInc(x, nu / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
}

/** Valor p bilateral para un estadístico t. */
export function tPValueTwoSided(t: number, nu: number): number {
  return betaInc(nu / (nu + t * t), nu / 2, 0.5);
}

/** Cuantil de t: valor t tal que P(T ≤ t) = p. */
export function tInv(p: number, nu: number): number {
  if (p === 0.5) return 0;
  if (p < 0.5) return -tInv(1 - p, nu);
  let hi = 1;
  while (tCDF(hi, nu) < p) hi *= 2;
  return bisect((t) => tCDF(t, nu) - p, 0, hi, 1e-12);
}

/** t crítico bilateral para un nivel de confianza (ej. 0,95). */
export function tCritTwoSided(confidence: number, nu: number): number {
  return tInv(1 - (1 - confidence) / 2, nu);
}

/** CDF de F con (d1, d2) grados de libertad. */
export function fCDF(f: number, d1: number, d2: number): number {
  if (f <= 0) return 0;
  return betaInc((d1 * f) / (d1 * f + d2), d1 / 2, d2 / 2);
}

/** Cuantil de F. */
export function fInv(p: number, d1: number, d2: number): number {
  let hi = 1;
  while (fCDF(hi, d1, d2) < p) hi *= 2;
  return bisect((f) => fCDF(f, d1, d2) - p, 0, hi, 1e-12);
}
