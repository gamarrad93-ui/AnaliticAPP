/**
 * Los cuatro modelos de calibración que pide la cuaderneta (Prácticos 12 y 13, ejercicio de Cr):
 *   lineal con ordenada:     y = a + b·x
 *   lineal sin ordenada:     y = b·x
 *   cuadrático con ordenada: y = a + b·x + c·x²
 *   cuadrático sin ordenada: y = b·x + c·x²
 * Ajuste por mínimos cuadrados (ecuaciones normales). R² como Excel: centrado si hay ordenada,
 * sin centrar (1 − SSres/Σy²) si la recta pasa por el origen.
 */
export type ModelId = 'lin' | 'lin0' | 'quad' | 'quad0';

export const MODEL_LABELS: Record<ModelId, string> = {
  lin: 'Lineal con ordenada (y = a + b·x)',
  lin0: 'Lineal sin ordenada (y = b·x)',
  quad: 'Cuadrático con ordenada (y = a + b·x + c·x²)',
  quad0: 'Cuadrático sin ordenada (y = b·x + c·x²)',
};

export interface ModelFit {
  id: ModelId;
  /** coeficientes a (ordenada), b (lineal), c (cuadrático); 0 si el modelo no lo tiene */
  a: number;
  b: number;
  c: number;
  r2: number;
  /** desviación estándar de los residuos √(SSres/(n − p)) */
  sres: number;
  residuals: number[];
  fitted: number[];
  p: number;
}

function solve(M: number[][], v: number[]): number[] {
  const n = v.length;
  const A = M.map((row, i) => [...row, v[i]]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    [A[i], A[piv]] = [A[piv], A[i]];
    if (A[i][i] === 0) throw new Error('Datos insuficientes para este modelo.');
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = A[r][i] / A[i][i];
      for (let c = i; c <= n; c++) A[r][c] -= f * A[i][c];
    }
  }
  return A.map((row, i) => row[n] / row[i]);
}

export function fitModel(x: number[], y: number[], id: ModelId): ModelFit {
  const cols: ((xi: number) => number)[] = [];
  if (id === 'lin' || id === 'quad') cols.push(() => 1);
  cols.push((xi) => xi);
  if (id === 'quad' || id === 'quad0') cols.push((xi) => xi * xi);
  const p = cols.length;
  if (x.length <= p) throw new Error(`Se necesitan al menos ${p + 1} puntos para el modelo ${MODEL_LABELS[id]}.`);
  const XtX = cols.map((f) => cols.map((g) => x.reduce((s, xi) => s + f(xi) * g(xi), 0)));
  const Xty = cols.map((f) => x.reduce((s, xi, i) => s + f(xi) * y[i], 0));
  const beta = solve(XtX, Xty);
  let k = 0;
  const a = id === 'lin' || id === 'quad' ? beta[k++] : 0;
  const b = beta[k++];
  const c = id === 'quad' || id === 'quad0' ? beta[k++] : 0;
  const fitted = x.map((xi) => a + b * xi + c * xi * xi);
  const residuals = y.map((yi, i) => yi - fitted[i]);
  const ss = residuals.reduce((s, r) => s + r * r, 0);
  const ym = y.reduce((s, v) => s + v, 0) / y.length;
  const sst = id === 'lin' || id === 'quad' ? y.reduce((s, v) => s + (v - ym) ** 2, 0) : y.reduce((s, v) => s + v * v, 0);
  return { id, a, b, c, r2: 1 - ss / sst, sres: Math.sqrt(ss / (x.length - p)), residuals, fitted, p };
}

export function fitAllModels(x: number[], y: number[]): ModelFit[] {
  return (['lin', 'lin0', 'quad', 'quad0'] as ModelId[]).flatMap((id) => {
    try {
      return [fitModel(x, y, id)];
    } catch {
      return [];
    }
  });
}

/** Concentración a partir de una señal con el modelo elegido (raíz dentro del rango, para cuadráticos). */
export function inverseModel(m: ModelFit, yv: number, xmax: number): number | null {
  if (m.c === 0) return m.b !== 0 ? (yv - m.a) / m.b : null;
  const A = m.c;
  const B = m.b;
  const C = m.a - yv;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const r1 = (-B + Math.sqrt(disc)) / (2 * A);
  const r2 = (-B - Math.sqrt(disc)) / (2 * A);
  const cands = [r1, r2].filter((r) => r >= -0.1 * xmax && r <= 1.5 * xmax);
  if (!cands.length) return null;
  const lin = B !== 0 ? -C / B : 0;
  return cands.reduce((p, r) => (Math.abs(r - lin) < Math.abs(p - lin) ? r : p));
}
