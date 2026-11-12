/**
 * Criterios de promediabilidad y expresión del resultado, tal como los usa la
 * Cuaderneta de Laboratorio de Química Analítica I (Tecnólogo Químico, 2026).
 *
 *  - 'concordancia': se promedian los valores cuyo rango ≤ un límite (ej. 5,0 mg en V20).
 *  - 'sigma':  σr conocido. Ir = 2,8·σr (≈ 1,96·√2·σr); se promedian los valores cuyo rango ≤ Ir.
 *              Incertidumbre (CAI) = 1,96·σr/√n.
 *  - 'dixon':  test Q de Dixon (α = 0,05) para descartar un valor anómalo; CAI = t(95 %, n−1)·s/√n.
 *  - 'cv':     se promedian (al menos `minN`) valores con CV < límite; CAI = t(95 %, n−1)·s/√n.
 */
import { mean, sd } from '../stats/descriptive';
import { tCritTwoSided } from '../stats/distributions';
import { dixonQ } from '../stats/outliers';

export type Criterion =
  | { kind: 'concordancia'; maxRange: number; minN?: number; unit?: string }
  | { kind: 'sigma'; sigmaR: number; minN?: number }
  | { kind: 'dixon'; minN?: number }
  | { kind: 'cv'; maxCV: number; minN?: number };

export interface LabResult {
  /** true = valor promediable */
  included: boolean[];
  n: number;
  mean: number;
  s: number;
  cv: number; // %
  /** componente aleatorio de la incertidumbre (CAI) */
  cai: number;
  /** factor usado: 1,96 (σr conocido) o t de Student */
  factor: number;
  /** explicación del criterio aplicado, en castellano */
  criterionText: string;
  /** avisos (pocos valores, Dixon no aplicable, etc.) */
  warnings: string[];
  /** detalle de Dixon si se aplicó */
  dixon?: { suspect: number; Q: number; Qcrit: number; reject: boolean };
  /** Ir si corresponde */
  ir?: number;
}

/**
 * Subconjunto más grande de valores cuyo rango (máx − mín) ≤ maxRange.
 * Se recorre la lista ordenada con una ventana; ante empate de tamaño se elige la de menor rango.
 * Devuelve índices en el orden original.
 */
export function largestConcordantSubset(values: number[], maxRange: number): number[] {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  let best: { lo: number; hi: number } | null = null;
  let hi = 0;
  const tol = maxRange * 1e-9 + 1e-15;
  for (let lo = 0; lo < order.length; lo++) {
    if (hi < lo) hi = lo;
    while (hi + 1 < order.length && order[hi + 1].v - order[lo].v <= maxRange + tol) hi++;
    const size = hi - lo + 1;
    const range = order[hi].v - order[lo].v;
    if (!best || size > best.hi - best.lo + 1 || (size === best.hi - best.lo + 1 && range < order[best.hi].v - order[best.lo].v)) {
      best = { lo, hi };
    }
  }
  if (!best) return [];
  return order.slice(best.lo, best.hi + 1).map((o) => o.i).sort((a, b) => a - b);
}

function cvOf(x: number[]): number {
  return x.length < 2 ? 0 : (sd(x) / Math.abs(mean(x))) * 100;
}

/** Subconjunto más grande (valores consecutivos al ordenar) con CV < maxCV. */
export function largestSubsetUnderCV(values: number[], maxCV: number, minN = 2): number[] {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  for (let size = order.length; size >= Math.max(2, minN); size--) {
    let bestStart = -1;
    let bestCV = Infinity;
    for (let start = 0; start + size <= order.length; start++) {
      const cv = cvOf(order.slice(start, start + size).map((o) => o.v));
      if (cv < maxCV && cv < bestCV) {
        bestCV = cv;
        bestStart = start;
      }
    }
    if (bestStart >= 0) return order.slice(bestStart, bestStart + size).map((o) => o.i).sort((a, b) => a - b);
  }
  return [];
}

const fmt = (x: number) => String(Number(x.toPrecision(3))).replace('.', ',');

/** Aplica el criterio de la cuaderneta y calcula el resultado (promedio ± CAI, IC 95 %). */
export function evaluateReplicates(values: number[], c: Criterion): LabResult {
  const warnings: string[] = [];
  const n0 = values.length;
  let idx: number[] = values.map((_, i) => i);
  let criterionText = '';
  let dixon: LabResult['dixon'];
  let ir: number | undefined;
  const minN = c.minN ?? 3;

  if (c.kind === 'concordancia') {
    idx = largestConcordantSubset(values, c.maxRange);
    criterionText = `Se promedian los valores que concuerdan dentro de ${fmt(c.maxRange)}${c.unit ? ' ' + c.unit : ''} (mínimo ${minN}).`;
  } else if (c.kind === 'sigma') {
    ir = 2.8 * c.sigmaR;
    idx = largestConcordantSubset(values, ir);
    criterionText = `σr = ${fmt(c.sigmaR)} → Ir = 2,8·σr = ${fmt(ir)}. Se promedian los valores cuya diferencia es ≤ Ir.`;
  } else if (c.kind === 'dixon') {
    criterionText = 'Test Q de Dixon (α = 0,05) para descartar un valor anómalo; se promedian los restantes.';
    if (n0 >= 3 && n0 <= 10) {
      const r = dixonQ(values, 95);
      dixon = { suspect: r.suspect, Q: r.Q, Qcrit: r.Qcrit, reject: r.reject };
      if (r.reject) {
        const k = values.indexOf(r.suspect);
        idx = idx.filter((i) => i !== k);
      }
    } else {
      warnings.push('El test Q de Dixon se aplica a 3–10 valores: no se aplicó.');
    }
  } else {
    idx = largestSubsetUnderCV(values, c.maxCV, minN);
    criterionText = `Se promedian al menos ${minN} valores cuyo CV sea menor a ${fmt(c.maxCV)} %.`;
    if (idx.length === 0) warnings.push(`No hay ${minN} valores con CV < ${fmt(c.maxCV)} %: revisar las determinaciones.`);
  }

  const inc = values.map((_, i) => idx.includes(i));
  const sel = idx.map((i) => values[i]);
  const n = sel.length;
  if (n < minN) warnings.push(`Hay ${n} valor(es) promediable(s); la cuaderneta pide al menos ${minN}.`);
  const m = n ? mean(sel) : NaN;
  const s = n >= 2 ? sd(sel) : NaN;
  let factor: number;
  let cai: number;
  if (c.kind === 'sigma') {
    factor = 1.96;
    cai = n ? (1.96 * c.sigmaR) / Math.sqrt(n) : NaN;
  } else {
    factor = n >= 2 ? tCritTwoSided(0.95, n - 1) : NaN;
    cai = n >= 2 ? (factor * s) / Math.sqrt(n) : NaN;
  }
  return { included: inc, n, mean: m, s, cv: n >= 2 ? (s / Math.abs(m)) * 100 : NaN, cai, factor, criterionText, warnings, dixon, ir };
}
