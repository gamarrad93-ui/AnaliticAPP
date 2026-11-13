/**
 * Cuatro modelos de calibración sobre los mismos datos (x, y):
 *   a) lineal:                 y = m·x + b
 *   b) lineal por el origen:   y = m·x
 *   c) cuadrático:             y = a·x² + m·x + b
 *   d) lineal ponderado 1/x²:  y = m·x + b, pesos wᵢ = 1/xᵢ² (se omiten los x = 0)
 *
 * R² centrado en todos (1 − SSres/SStot), para que sean comparables entre sí; en el ponderado,
 * R² ponderado (como statsmodels WLS). R² ajustado = 1 − (1 − R²)(n − 1)/(n − p).
 * s_y/x = √(SSres/(n − p)); en el ponderado, con pesos normalizados (Σw = n).
 */
import { fitModel } from './calibrationModels';

export type FourId = 'lineal' | 'origen' | 'cuadratico' | 'ponderado';

export const FOUR_ORDER: FourId[] = ['lineal', 'origen', 'cuadratico', 'ponderado'];

export const FOUR_LABELS: Record<FourId, string> = {
  lineal: 'Lineal',
  origen: 'Lineal por el origen',
  cuadratico: 'Cuadrático',
  ponderado: 'Lineal ponderado (1/x²)',
};

export const FOUR_FORMS: Record<FourId, string> = {
  lineal: 'y = mx + b',
  origen: 'y = mx',
  cuadratico: 'y = ax² + bx + c',
  ponderado: 'y = mx + b (pesos 1/x²)',
};

export interface ResidualPattern {
  /** número de rachas de signo de los residuos */
  runs: number;
  corrLinear: number;
  corrCurvature: number;
  flagged: boolean;
  text: string;
}

export interface FourFit {
  id: FourId;
  /** y = a·x² + m·x + b */
  a: number;
  m: number;
  b: number;
  p: number;
  n: number;
  used: boolean[];
  /** R² del propio ajuste (en el ponderado, R² ponderado) */
  r2: number;
  r2adj: number;
  /**
   * R² y R² ajustado en base común: residuos sin ponderar (y − ŷ) en TODOS los puntos.
   * Es lo que se usa para comparar los cuatro modelos entre sí.
   */
  r2Common: number;
  r2adjCommon: number;
  syx: number;
  /** residuos y − ŷ para TODOS los puntos (también los excluidos del ajuste) */
  residuals: number[];
  pattern: ResidualPattern;
  excludedZero: number;
}

export const predict = (f: FourFit, x: number) => f.a * x * x + f.m * x + f.b;

function corr(u: number[], v: number[]): number {
  const n = u.length;
  if (n < 3) return 0;
  const mu = u.reduce((s, x) => s + x, 0) / n;
  const mv = v.reduce((s, x) => s + x, 0) / n;
  let suv = 0;
  let suu = 0;
  let svv = 0;
  for (let i = 0; i < n; i++) {
    suv += (u[i] - mu) * (v[i] - mv);
    suu += (u[i] - mu) ** 2;
    svv += (v[i] - mv) ** 2;
  }
  return suu === 0 || svv === 0 ? 0 : suv / Math.sqrt(suu * svv);
}

/**
 * Patrón de residuos (ordenados por x): pocas rachas de signo (ej. + + − − − + +) o una correlación fuerte
 * con x o con (x − x̄)² indican falta de ajuste (tendencia o curvatura).
 */
export function residualPattern(x: number[], r: number[]): ResidualPattern {
  const idx = x.map((_, i) => i).sort((i, j) => x[i] - x[j]);
  const scale = Math.max(...r.map(Math.abs), 1e-300);
  const signs = idx.map((i) => (Math.abs(r[i]) < 1e-9 * scale ? 0 : Math.sign(r[i]))).filter((s) => s !== 0);
  let runs = signs.length ? 1 : 0;
  for (let k = 1; k < signs.length; k++) if (signs[k] !== signs[k - 1]) runs++;
  const xm = x.reduce((s, v) => s + v, 0) / x.length;
  const cl = corr(x, r);
  const cc = corr(x.map((v) => (v - xm) ** 2), r);
  const reasons: string[] = [];
  if (x.length >= 5 && runs <= 2) reasons.push(`sólo ${runs} racha${runs === 1 ? '' : 's'} de signo`);
  if (Math.abs(cc) > 0.8) reasons.push('forma de U (curvatura)');
  if (Math.abs(cl) > 0.8) reasons.push('tendencia con x');
  const flagged = reasons.length > 0;
  return {
    runs,
    corrLinear: cl,
    corrCurvature: cc,
    flagged,
    text: flagged ? `patrón en los residuos: ${reasons.join(', ')}` : `residuos al azar (${runs} rachas de signo)`,
  };
}

function finish(id: FourId, x: number[], y: number[], a: number, m: number, b: number, p: number, used: boolean[], r2: number, syx: number, excludedZero = 0): FourFit {
  const n = used.filter(Boolean).length;
  const residuals = x.map((xi, i) => y[i] - (a * xi * xi + m * xi + b));
  const N = x.length;
  const ym = y.reduce((s, v) => s + v, 0) / N;
  const r2Common = 1 - residuals.reduce((s, r) => s + r * r, 0) / y.reduce((s, v) => s + (v - ym) ** 2, 0);
  return {
    id,
    a,
    m,
    b,
    p,
    n,
    used,
    r2,
    r2adj: 1 - ((1 - r2) * (n - 1)) / (n - p),
    r2Common,
    r2adjCommon: 1 - ((1 - r2Common) * (N - 1)) / (N - p),
    syx,
    residuals,
    // patrón con los residuos sin ponderar de todos los puntos (los mismos del gráfico de barras)
    pattern: residualPattern(x, residuals),
    excludedZero,
  };
}

function centeredR2(y: number[], yh: number[]): number {
  const ym = y.reduce((s, v) => s + v, 0) / y.length;
  const ss = y.reduce((s, v, i) => s + (v - yh[i]) ** 2, 0);
  const st = y.reduce((s, v) => s + (v - ym) ** 2, 0);
  return 1 - ss / st;
}

export function fitLinear(x: number[], y: number[]): FourFit {
  const f = fitModel(x, y, 'lin');
  const yh = x.map((xi) => f.a + f.b * xi);
  const ss = y.reduce((s, v, i) => s + (v - yh[i]) ** 2, 0);
  return finish('lineal', x, y, 0, f.b, f.a, 2, x.map(() => true), centeredR2(y, yh), Math.sqrt(ss / (x.length - 2)));
}

export function fitOrigin(x: number[], y: number[]): FourFit {
  const sxy = x.reduce((s, xi, i) => s + xi * y[i], 0);
  const sxx = x.reduce((s, xi) => s + xi * xi, 0);
  if (sxx === 0) throw new Error('Todos los x son 0.');
  const m = sxy / sxx;
  const yh = x.map((xi) => m * xi);
  const ss = y.reduce((s, v, i) => s + (v - yh[i]) ** 2, 0);
  return finish('origen', x, y, 0, m, 0, 1, x.map(() => true), centeredR2(y, yh), Math.sqrt(ss / (x.length - 1)));
}

export function fitQuadratic(x: number[], y: number[]): FourFit {
  const f = fitModel(x, y, 'quad');
  const yh = x.map((xi) => f.a + f.b * xi + f.c * xi * xi);
  const ss = y.reduce((s, v, i) => s + (v - yh[i]) ** 2, 0);
  return finish('cuadratico', x, y, f.c, f.b, f.a, 3, x.map(() => true), centeredR2(y, yh), Math.sqrt(ss / (x.length - 3)));
}

/** Mínimos cuadrados ponderados con wᵢ = 1/xᵢ² (x = 0 se omite). */
export function fitWeighted(x: number[], y: number[]): FourFit {
  const used = x.map((xi) => xi !== 0);
  const xs = x.filter((_, i) => used[i]);
  const ys = y.filter((_, i) => used[i]);
  const n = xs.length;
  if (n < 3) throw new Error('El ajuste ponderado necesita al menos 3 puntos con x ≠ 0.');
  const raw = xs.map((xi) => 1 / (xi * xi));
  const sw = raw.reduce((s, v) => s + v, 0);
  const w = raw.map((v) => (v * n) / sw); // normalizados: Σw = n
  const xw = xs.reduce((s, xi, i) => s + w[i] * xi, 0) / n;
  const yw = ys.reduce((s, yi, i) => s + w[i] * yi, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += w[i] * (xs[i] - xw) * (ys[i] - yw);
    sxx += w[i] * (xs[i] - xw) ** 2;
  }
  const m = sxy / sxx;
  const b = yw - m * xw;
  const r = ys.map((yi, i) => yi - (m * xs[i] + b));
  const ssw = r.reduce((s, ri, i) => s + w[i] * ri * ri, 0);
  const stw = ys.reduce((s, yi, i) => s + w[i] * (yi - yw) ** 2, 0);
  return finish('ponderado', x, y, 0, m, b, 2, used, 1 - ssw / stw, Math.sqrt(ssw / (n - 2)), x.length - n);
}

export function fitFour(x: number[], y: number[]): FourFit[] {
  const out: FourFit[] = [];
  for (const f of [fitLinear, fitOrigin, fitQuadratic, fitWeighted]) {
    try {
      out.push(f(x, y));
    } catch {
      /* modelo no ajustable con estos datos */
    }
  }
  return out;
}

/** Concentración para una señal y0 con cada modelo (en el cuadrático, la raíz dentro del rango). */
export function inverseFour(f: FourFit, y0: number, xmax: number): number | null {
  if (f.a === 0) return f.m !== 0 ? (y0 - f.b) / f.m : null;
  const disc = f.m * f.m - 4 * f.a * (f.b - y0);
  if (disc < 0) return null;
  const r1 = (-f.m + Math.sqrt(disc)) / (2 * f.a);
  const r2 = (-f.m - Math.sqrt(disc)) / (2 * f.a);
  const cands = [r1, r2].filter((r) => r >= -0.1 * xmax && r <= 1.5 * xmax);
  if (!cands.length) return null;
  const lin = f.m !== 0 ? (y0 - f.b) / f.m : 0;
  return cands.reduce((p, r) => (Math.abs(r - lin) < Math.abs(p - lin) ? r : p));
}

/** Diferencia de R² ajustado por debajo de la cual se prefiere el modelo más simple (menos parámetros). */
export const PARSIMONY_TOL = 0.0005;

/**
 * Mejor modelo: mayor R² ajustado (base común) entre los que NO muestran patrón en los residuos
 * (si todos lo muestran, entre todos). Si un modelo más simple queda a menos de PARSIMONY_TOL,
 * se prefiere el más simple. Devuelve la explicación en castellano.
 */
export function chooseBest(fits: FourFit[]): { id: FourId; reason: string } | null {
  if (!fits.length) return null;
  const clean = fits.filter((f) => !f.pattern.flagged);
  const pool = clean.length ? clean : fits;
  const top = pool.reduce((p, f) => (f.r2adjCommon > p.r2adjCommon ? f : p));
  const simpler = pool
    .filter((f) => f.p < top.p && top.r2adjCommon - f.r2adjCommon < PARSIMONY_TOL)
    .sort((a, b) => a.p - b.p || b.r2adjCommon - a.r2adjCommon)[0];
  const best = simpler ?? top;
  const fmt = (v: number) => v.toFixed(4).replace('.', ',');
  const name = (f: FourFit) => FOUR_LABELS[f.id].toLowerCase();
  let reason = simpler
    ? `Se elige el modelo ${name(best)}: su R² ajustado (${fmt(best.r2adjCommon)}) es prácticamente igual al del ${name(top)} (${fmt(top.r2adjCommon)}, diferencia < ${String(PARSIMONY_TOL).replace('.', ',')}) y tiene menos parámetros, así que se prefiere el más simple.`
    : `Se elige el modelo ${name(best)} porque tiene el mayor R² ajustado (${fmt(best.r2adjCommon)})`;
  if (!simpler) reason += clean.length ? ` entre los modelos cuyos residuos se distribuyen al azar.` : '; todos los modelos muestran algún patrón en los residuos, así que conviene revisar el rango lineal.';
  reason += ` Sus residuos: ${best.pattern.text}.`;
  const discarded = fits.filter((f) => f.pattern.flagged).map((f) => `${FOUR_LABELS[f.id]} (${f.pattern.text})`);
  if (discarded.length && clean.length) reason += ` Se descartan: ${discarded.join('; ')}.`;
  reason += ' El R² ajustado penaliza los parámetros extra, y todos los R² se comparan con los residuos sin ponderar de todos los estándares.';
  return { id: best.id, reason };
}
