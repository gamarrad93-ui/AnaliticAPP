/**
 * Valoración potenciométrica: tabla de derivadas como en la cuaderneta (Práctico 11).
 *   V̄ᵢ = (Vᵢ + Vᵢ₋₁)/2,  D1ᵢ = ΔpH/ΔV
 *   V̿ᵢ = (V̄ᵢ + V̄ᵢ₋₁)/2,  D2ᵢ = ΔD1/ΔV̄
 * Punto final: donde D2 cambia de signo (+ → −), por interpolación lineal; coincide con el máximo de D1.
 */
export interface DerivRow {
  V: number;
  pH: number;
  Vbar?: number;
  d1?: number;
  Vbb?: number;
  d2?: number;
}

export function derivativeTable(V: number[], pH: number[]): DerivRow[] {
  const rows: DerivRow[] = V.map((v, i) => ({ V: v, pH: pH[i] }));
  for (let i = 1; i < rows.length; i++) {
    const dV = rows[i].V - rows[i - 1].V;
    if (dV === 0) continue;
    rows[i].Vbar = (rows[i].V + rows[i - 1].V) / 2;
    rows[i].d1 = (rows[i].pH - rows[i - 1].pH) / dV;
  }
  for (let i = 2; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    if (a.Vbar == null || b.Vbar == null || a.d1 == null || b.d1 == null || b.Vbar === a.Vbar) continue;
    b.Vbb = (a.Vbar + b.Vbar) / 2;
    b.d2 = (b.d1 - a.d1) / (b.Vbar - a.Vbar);
  }
  return rows;
}

export interface Endpoint {
  /** volumen por cruce de cero de la 2ª derivada */
  V: number;
  /** volumen del máximo de la 1ª derivada */
  Vmax1: number;
  d1max: number;
}

/**
 * Puntos finales: cada cruce de D2 de + a − asociado a un máximo local de D1
 * mayor que `minFraction` del máximo global (para ignorar ruido).
 */
export function findEndpoints(rows: DerivRow[], minFraction = 0.15): Endpoint[] {
  const d1rows = rows.filter((r) => r.d1 != null);
  const gmax = Math.max(...d1rows.map((r) => Math.abs(r.d1!)), 0);
  const out: Endpoint[] = [];
  const d2rows = rows.filter((r) => r.d2 != null);
  for (let k = 1; k < d2rows.length; k++) {
    const a = d2rows[k - 1];
    const b = d2rows[k];
    if (a.d2! > 0 && b.d2! <= 0) {
      const V = a.Vbb! + ((0 - a.d2!) * (b.Vbb! - a.Vbb!)) / (b.d2! - a.d2!);
      // máximo de D1 alrededor
      const near = d1rows.filter((r) => r.Vbar! >= a.Vbb! - 1e-12 && r.Vbar! <= b.Vbb! + 1e-12);
      const peak = near.reduce((p, r) => (Math.abs(r.d1!) > Math.abs(p.d1!) ? r : p), near[0] ?? d1rows[0]);
      if (peak && Math.abs(peak.d1!) >= minFraction * gmax) out.push({ V, Vmax1: peak.Vbar!, d1max: peak.d1! });
    }
  }
  return out;
}
