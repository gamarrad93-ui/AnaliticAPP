/** Calibración del pH-metro: ajuste lineal E = E0 + m·pH y comparación con la pendiente de Nernst. */
export const R_GAS = 8.314462618; // J/(mol·K)
export const FARADAY = 96485.33212; // C/mol

/** Pendiente teórica de Nernst en mV/pH (negativa): −ln10·R·T/F. */
export function nernstSlope(tempC: number): number {
  return (-Math.LN10 * R_GAS * (tempC + 273.15) * 1000) / FARADAY;
}

export interface PhCalibration {
  slope: number;
  intercept: number;
  r2: number;
  residuals: number[];
  theoretical: number;
  pctSlope: number;
  /** pH al que E = 0 mV */
  pHatZero: number;
  passes: boolean;
  threshold: number;
}

export function calibratePhMeter(pH: number[], E: number[], tempC = 25, thresholdPct = 95): PhCalibration {
  const n = pH.length;
  if (n < 2) throw new Error('Hacen falta al menos dos buffers.');
  const mx = pH.reduce((a, b) => a + b, 0) / n;
  const my = E.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (pH[i] - mx) * (E[i] - my);
    sxx += (pH[i] - mx) ** 2;
    syy += (E[i] - my) ** 2;
  }
  if (sxx === 0) throw new Error('Los pH de los buffers tienen que ser distintos.');
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const residuals = pH.map((p, i) => E[i] - (intercept + slope * p));
  const ssr = residuals.reduce((s, r) => s + r * r, 0);
  const r2 = syy > 0 ? 1 - ssr / syy : 1;
  const theoretical = nernstSlope(tempC);
  const pctSlope = (slope / theoretical) * 100;
  return { slope, intercept, r2, residuals, theoretical, pctSlope, pHatZero: -intercept / slope, passes: pctSlope >= thresholdPct, threshold: thresholdPct };
}
