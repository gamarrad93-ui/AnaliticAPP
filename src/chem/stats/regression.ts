/**
 * Regresión lineal por mínimos cuadrados ordinarios (y = a + b·x) y cálculos asociados
 * de calibración (Miller & Miller, "Estadística y Quimiometría para Química Analítica", cap. 5).
 */
import { tCritTwoSided } from './distributions';

export interface Regression {
  n: number;
  slope: number; // b
  intercept: number; // a
  sSlope: number; // s_b
  sIntercept: number; // s_a
  r: number;
  r2: number;
  /** error estándar de la regresión s_y/x = √(Σ residuo² / (n−2)) */
  syx: number;
  xMean: number;
  yMean: number;
  Sxx: number; // Σ(x − x̄)²
  Syy: number;
  Sxy: number;
  residuals: number[];
  fitted: number[];
  df: number;
}

export function linearRegression(x: number[], y: number[]): Regression {
  const n = x.length;
  if (n < 3) throw new Error('Se necesitan al menos 3 puntos para la regresión.');
  const xm = x.reduce((a, b) => a + b, 0) / n;
  const ym = y.reduce((a, b) => a + b, 0) / n;
  let Sxx = 0;
  let Syy = 0;
  let Sxy = 0;
  for (let i = 0; i < n; i++) {
    Sxx += (x[i] - xm) ** 2;
    Syy += (y[i] - ym) ** 2;
    Sxy += (x[i] - xm) * (y[i] - ym);
  }
  if (Sxx === 0) throw new Error('Todos los valores de x son iguales: no se puede ajustar una recta.');
  const b = Sxy / Sxx;
  const a = ym - b * xm;
  const fitted = x.map((xi) => a + b * xi);
  const residuals = y.map((yi, i) => yi - fitted[i]);
  const SSres = residuals.reduce((s, e) => s + e * e, 0);
  const df = n - 2;
  const syx = Math.sqrt(SSres / df);
  const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);
  const sSlope = syx / Math.sqrt(Sxx);
  const sIntercept = syx * Math.sqrt(sumX2 / (n * Sxx));
  const r = Syy === 0 ? 1 : Sxy / Math.sqrt(Sxx * Syy);
  return { n, slope: b, intercept: a, sSlope, sIntercept, r, r2: r * r, syx, xMean: xm, yMean: ym, Sxx, Syy, Sxy, residuals, fitted, df };
}

export interface LimitResult {
  /** LOD = 3,3·s/b ; LOQ = 10·s/b (ICH Q2(R1), s = s_y/x de la recta) */
  lod: number;
  loq: number;
  sUsed: number;
}

export function detectionLimits(reg: Regression, factorLOD = 3.3, factorLOQ = 10): LimitResult {
  return { lod: (factorLOD * reg.syx) / Math.abs(reg.slope), loq: (factorLOQ * reg.syx) / Math.abs(reg.slope), sUsed: reg.syx };
}

export interface InversePrediction {
  y0: number;
  m: number;
  x0: number;
  sx0: number;
  t: number;
  halfWidth: number;
  ci: [number, number];
}

/**
 * Concentración de una muestra a partir de su señal (media de m réplicas):
 *   x0 = (y0 − a)/b
 *   s_x0 = (s_y/x / b) · √( 1/m + 1/n + (y0 − ȳ)² / (b²·Sxx) )
 *   IC = x0 ± t(n−2)·s_x0
 */
export function inversePrediction(reg: Regression, y0: number, m = 1, confidence = 0.95): InversePrediction {
  const b = reg.slope;
  const x0 = (y0 - reg.intercept) / b;
  const sx0 = (reg.syx / Math.abs(b)) * Math.sqrt(1 / m + 1 / reg.n + (y0 - reg.yMean) ** 2 / (b * b * reg.Sxx));
  const t = tCritTwoSided(confidence, reg.df);
  return { y0, m, x0, sx0, t, halfWidth: t * sx0, ci: [x0 - t * sx0, x0 + t * sx0] };
}

export interface StandardAdditionResult {
  /** concentración en la solución medida (x en el que la recta corta y = 0, en valor absoluto) */
  xE: number;
  sxE: number;
  t: number;
  halfWidth: number;
  ci: [number, number];
}

/**
 * Método de adición estándar: x = concentración agregada, y = señal.
 *   x_E = a / b
 *   s_xE = (s_y/x / b) · √( 1/n + ȳ² / (b²·Sxx) )
 */
export function standardAddition(reg: Regression, confidence = 0.95): StandardAdditionResult {
  const b = reg.slope;
  const xE = reg.intercept / b;
  const sxE = (reg.syx / Math.abs(b)) * Math.sqrt(1 / reg.n + reg.yMean ** 2 / (b * b * reg.Sxx));
  const t = tCritTwoSided(confidence, reg.df);
  return { xE, sxE, t, halfWidth: t * sxE, ci: [xE - t * sxE, xE + t * sxE] };
}
