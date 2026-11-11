/**
 * Titulaciones de precipitación (argentometría) EXACTAS, con uno o dos haluros.
 *
 * Incógnita: a = [Ag⁺]. Para cada anión Xᵢ (sal 1:1 AgXᵢ):
 *   [Xᵢ⁻] = min(C_Xi, Ksp_i / a)        (si no hay sólido, queda todo disuelto)
 * Balance de plata: C_Ag = a + Σ (C_Xi − [Xᵢ⁻])   (lo precipitado consume Ag y X por igual)
 * f(a) es creciente → raíz única (Brent sobre log a).
 */
import { brent } from '../numeric/solve';

export interface Halide {
  C: number; // mol/L inicial
  Ksp: number;
  name: string;
}

export interface ArgentoSetup {
  halides: Halide[];
  Vx: number; // mL de muestra
  CAg: number; // M de AgNO3
}

export interface ArgentoPoint {
  V: number;
  pAg: number;
  pX: number[];
}

export function argentoPoint(s: ArgentoSetup, V: number): ArgentoPoint {
  const Vt = s.Vx + V;
  const CX = s.halides.map((h) => (h.C * s.Vx) / Vt);
  const CAg = (s.CAg * V) / Vt;
  if (CAg <= 0) return { V, pAg: NaN, pX: CX.map((c) => -Math.log10(c)) };
  const f = (logA: number) => {
    const a = Math.pow(10, logA);
    let prec = 0;
    s.halides.forEach((h, i) => (prec += CX[i] - Math.min(CX[i], h.Ksp / a)));
    return a + prec - CAg;
  };
  const logA = brent(f, -30, Math.log10(CAg) + 1e-9, 1e-13);
  const a = Math.pow(10, logA);
  return { V, pAg: -logA, pX: s.halides.map((h, i) => -Math.log10(Math.min(CX[i], h.Ksp / a))) };
}

/** Volúmenes de equivalencia acumulados (el haluro menos soluble precipita primero). */
export function argentoEquivalences(s: ArgentoSetup): { V: number; name: string; pAg: number }[] {
  const order = s.halides.map((h, i) => ({ h, i })).sort((x, y) => x.h.Ksp - y.h.Ksp);
  let cum = 0;
  return order.map(({ h }) => {
    cum += h.C * s.Vx;
    const V = cum / s.CAg;
    return { V, name: h.name, pAg: argentoPoint(s, V).pAg };
  });
}

export function argentoCurve(s: ArgentoSetup, Vmax: number): ArgentoPoint[] {
  const eqs = argentoEquivalences(s);
  const vs = new Set<number>();
  for (let i = 1; i <= 300; i++) vs.add((Vmax * i) / 300);
  for (const e of eqs) for (let i = -60; i <= 60; i++) vs.add(e.V * (1 + i * 0.0005));
  return [...vs].filter((v) => v > 0 && v <= Vmax).sort((a, b) => a - b).map((V) => argentoPoint(s, V));
}

/**
 * Método de Mohr: el Ag₂CrO₄ (Ksp) empieza a precipitar cuando [Ag⁺]²·[CrO₄²⁻] = Ksp.
 * Devuelve el pAg de punto final (sin corrección por el blanco del indicador).
 */
export function mohrEndpointPAg(CrO4: number, KspAg2CrO4 = 1.2e-12): number {
  return -0.5 * Math.log10(KspAg2CrO4 / CrO4);
}

/** Volumen en que se alcanza un pAg dado (bisección). */
export function volumeAtPAg(s: ArgentoSetup, pAg: number, Vmax: number): number | null {
  const f = (V: number) => argentoPoint(s, V).pAg - pAg; // decreciente
  let lo = Vmax * 1e-6;
  let hi = Vmax;
  if (f(lo) * f(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const m = (lo + hi) / 2;
    if (f(m) > 0) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
