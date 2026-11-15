/**
 * Tratamiento de datos de una valoración potenciométrica (tabla del informe y punto de equivalencia).
 *   Ḡᵢ = (Gᵢ + Gᵢ₊₁)/2                 d1ᵢ = (yᵢ₊₁ − yᵢ)/(Gᵢ₊₁ − Gᵢ)
 *   Ḡ̄ᵢ = (Ḡᵢ + Ḡᵢ₊₁)/2                 d2ᵢ = (d1ᵢ₊₁ − d1ᵢ)/(Ḡᵢ₊₁ − Ḡᵢ)
 * y = pH o E (mV).
 */
export interface ReportRow {
  G: number;
  y: number;
  /** entre esta fila y la siguiente */
  Gbar: number | null;
  d1: number | null;
  Gbb: number | null;
  d2: number | null;
}

export interface CleanData {
  G: number[];
  y: number[];
  warnings: string[];
}

/** Ordena por G y descarta volúmenes repetidos (no se puede derivar con ΔG = 0). */
export function cleanData(G: number[], y: number[]): CleanData {
  const pairs = G.map((g, i) => [g, y[i]] as const).filter(([g, v]) => Number.isFinite(g) && Number.isFinite(v));
  const warnings: string[] = [];
  const sorted = [...pairs].sort((a, b) => a[0] - b[0]);
  if (sorted.some((p, i) => i > 0 && p[0] < pairs[i - 1]?.[0])) warnings.push('Los volúmenes no estaban en orden creciente: se ordenaron.');
  const out: (readonly [number, number])[] = [];
  for (const p of sorted) {
    if (out.length && p[0] === out[out.length - 1][0]) {
      warnings.push(`Volumen repetido (${String(p[0]).replace('.', ',')} mL): se usó solo la primera lectura.`);
      continue;
    }
    out.push(p);
  }
  return { G: out.map((p) => p[0]), y: out.map((p) => p[1]), warnings };
}

export function reportTable(G: number[], y: number[]): ReportRow[] {
  const n = G.length;
  const rows: ReportRow[] = G.map((g, i) => ({ G: g, y: y[i], Gbar: null, d1: null, Gbb: null, d2: null }));
  for (let i = 0; i < n - 1; i++) {
    rows[i].Gbar = (G[i] + G[i + 1]) / 2;
    rows[i].d1 = (y[i + 1] - y[i]) / (G[i + 1] - G[i]);
  }
  for (let i = 0; i < n - 2; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    rows[i].Gbb = (a.Gbar! + b.Gbar!) / 2;
    rows[i].d2 = (b.d1! - a.d1!) / (b.Gbar! - a.Gbar!);
  }
  return rows;
}

export interface GraphicalResult {
  G: number;
  /** pendiente común de las dos tangentes paralelas */
  slope: number;
  /** ordenadas al origen: rama antes del salto, rama después, recta media */
  cBefore: number;
  cAfter: number;
  cMid: number;
}

export interface EquivalenceEstimate {
  /** índice de la fila con el máximo de |d1| */
  k: number;
  /** 1) máximo de la 1ª derivada: Ḡ en el máximo */
  Gmax1: number;
  d1max: number;
  /** 1 bis) refinado con una parábola por el máximo y sus vecinos (null si no hay vecinos) */
  Gparabola: number | null;
  /** 2) cruce de cero de la 2ª derivada (interpolación lineal) */
  Gd2: number | null;
  d2a: { Gbb: number; d2: number } | null;
  d2b: { Gbb: number; d2: number } | null;
  /** 3) método gráfico (tangentes paralelas y recta media) */
  graphical: GraphicalResult | null;
  /** y en el punto de equivalencia (interpolado en la curva, con Gd2 o Gmax1) */
  yAtPE: number;
}

function interpY(G: number[], y: number[], g: number): number {
  for (let i = 0; i < G.length - 1; i++) {
    if (g >= G[i] && g <= G[i + 1]) return y[i] + ((y[i + 1] - y[i]) * (g - G[i])) / (G[i + 1] - G[i]);
  }
  return g < G[0] ? y[0] : y[y.length - 1];
}

/** Recta de pendiente fija m por mínimos cuadrados: c = media(y − m·x). */
const interceptFor = (xs: number[], ys: number[], m: number) => xs.reduce((s, x, i) => s + ys[i] - m * x, 0) / xs.length;

function slopeOf(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  return sxx > 0 ? sxy / sxx : 0;
}

/**
 * Método gráfico de las tangentes paralelas: se trazan dos rectas paralelas tangentes a las ramas
 * de la curva antes y después del salto, y la recta equidistante entre ambas corta la curva en el PE.
 * Ramas = hasta 3 puntos inmediatamente fuera del salto (donde |d1| ≥ 10 % del máximo local).
 */
export function graphicalMethod(G: number[], y: number[], rows: ReportRow[], k: number): GraphicalResult | null {
  const peak = Math.abs(rows[k].d1!);
  let lo = k;
  let hi = k;
  while (lo > 0 && rows[lo - 1].d1 != null && Math.abs(rows[lo - 1].d1!) >= 0.1 * peak) lo--;
  while (hi < rows.length - 2 && rows[hi + 1].d1 != null && Math.abs(rows[hi + 1].d1!) >= 0.1 * peak) hi++;
  // el salto va del punto lo al punto hi+1
  const bIdx = [lo - 2, lo - 1, lo].filter((i) => i >= 0);
  const aIdx = [hi + 1, hi + 2, hi + 3].filter((i) => i < G.length);
  if (bIdx.length < 2 || aIdx.length < 2) return null;
  const mB = slopeOf(bIdx.map((i) => G[i]), bIdx.map((i) => y[i]));
  const mA = slopeOf(aIdx.map((i) => G[i]), aIdx.map((i) => y[i]));
  const slope = (mB + mA) / 2;
  const cBefore = interceptFor(bIdx.map((i) => G[i]), bIdx.map((i) => y[i]), slope);
  const cAfter = interceptFor(aIdx.map((i) => G[i]), aIdx.map((i) => y[i]), slope);
  const cMid = (cBefore + cAfter) / 2;
  // intersección de la recta media con la curva (poligonal) dentro del salto
  for (let i = Math.max(0, lo - 1); i <= Math.min(G.length - 2, hi + 1); i++) {
    const f0 = y[i] - (slope * G[i] + cMid);
    const f1 = y[i + 1] - (slope * G[i + 1] + cMid);
    if (f0 === 0) return { G: G[i], slope, cBefore, cAfter, cMid };
    if (f0 * f1 < 0) {
      const g = G[i] + (f0 * (G[i + 1] - G[i])) / (f0 - f1);
      return { G: g, slope, cBefore, cAfter, cMid };
    }
  }
  return null;
}

/**
 * Puntos de equivalencia: máximos locales de |d1| que superen `minFraction` del máximo global
 * (para no confundir ruido con saltos). Sirve para ácidos polipróticos (varios saltos).
 */
export function equivalencePoints(G: number[], y: number[], minFraction = 0.15): { rows: ReportRow[]; points: EquivalenceEstimate[] } {
  const rows = reportTable(G, y);
  const d1 = rows.map((r) => (r.d1 == null ? null : Math.abs(r.d1)));
  const gmax = Math.max(0, ...d1.filter((v): v is number => v != null));
  const peaks: number[] = [];
  for (let i = 0; i < d1.length; i++) {
    const v = d1[i];
    if (v == null || v < minFraction * gmax || v === 0) continue;
    const left = i > 0 ? d1[i - 1] ?? -Infinity : -Infinity;
    const right = d1[i + 1] ?? -Infinity;
    if (v >= left && v > right) peaks.push(i);
  }
  // un pico por salto: si dos picos están separados por un valle poco profundo, quedarse con el mayor
  const merged: number[] = [];
  for (const p of peaks) {
    const last = merged[merged.length - 1];
    if (last != null) {
      const valley = Math.min(...d1.slice(last, p + 1).map((v) => v ?? Infinity));
      if (valley > 0.5 * Math.min(d1[last]!, d1[p]!)) {
        if (d1[p]! > d1[last]!) merged[merged.length - 1] = p;
        continue;
      }
    }
    merged.push(p);
  }
  const points = merged.map((k): EquivalenceEstimate => {
    const r = rows[k];
    const sign = Math.sign(r.d1!) || 1;
    // parábola por (Ḡ, d1) en k−1, k, k+1
    let Gparabola: number | null = null;
    if (k > 0 && rows[k + 1]?.d1 != null) {
      const [x0, x1, x2] = [rows[k - 1].Gbar!, r.Gbar!, rows[k + 1].Gbar!];
      const [y0, y1, y2] = [rows[k - 1].d1!, r.d1!, rows[k + 1].d1!];
      const den = (x0 - x1) * (x0 - x2) * (x1 - x2);
      const A = (x2 * (y1 - y0) + x1 * (y0 - y2) + x0 * (y2 - y1)) / den;
      const B = (x2 * x2 * (y0 - y1) + x1 * x1 * (y2 - y0) + x0 * x0 * (y1 - y2)) / den;
      if (A * sign < 0) {
        const xv = -B / (2 * A);
        if (xv >= x0 && xv <= x2) Gparabola = xv;
      }
    }
    // cruce de cero de d2 (en el sentido del salto: sign·d2 pasa de + a −) cerca del pico
    let Gd2: number | null = null;
    let d2a: EquivalenceEstimate['d2a'] = null;
    let d2b: EquivalenceEstimate['d2b'] = null;
    for (const i of [k - 1, k]) {
      const a = rows[i];
      const b = rows[i + 1];
      if (!a || !b || a.d2 == null || b.d2 == null) continue;
      if (sign * a.d2 > 0 && sign * b.d2 <= 0) {
        Gd2 = a.Gbb! + (a.d2 * (b.Gbb! - a.Gbb!)) / (a.d2 - b.d2);
        d2a = { Gbb: a.Gbb!, d2: a.d2 };
        d2b = { Gbb: b.Gbb!, d2: b.d2 };
        break;
      }
    }
    const graphical = graphicalMethod(G, y, rows, k);
    return { k, Gmax1: r.Gbar!, d1max: r.d1!, Gparabola, Gd2, d2a, d2b, graphical, yAtPE: interpY(G, y, Gd2 ?? r.Gbar!) };
  });
  return { rows, points };
}
