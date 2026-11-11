/**
 * Titulaciones complejométricas con EDTA (exactas, 1:1).
 *
 *  α(Y⁴⁻) = fracción de EDTA libre como Y⁴⁻ a ese pH  (6 pKa del H₆Y²⁺)
 *  α(M)   = fracción del metal no complejado por un ligando auxiliar L:
 *           α_M = 1 / (1 + β1[L] + β2[L]² + …)
 *  K''f = Kf · α(Y⁴⁻) · α(M)   (constante condicional)
 *
 * Balances: C_M = [M'] + [MY];  C_Y = [Y'] + [MY];  [MY] = K''·[M']·[Y']
 * ⇒ K''[M']² + (1 + K''(C_Y − C_M))[M'] − C_M = 0   (se resuelve en forma estable)
 *  pM = −log(α_M·[M'])
 */
import { alphas } from '../acidbase/equilibrium';
import { EDTA_PKA } from '../data/metals';

export function alphaY4(pH: number): number {
  const a = alphas(-pH, EDTA_PKA);
  return a[a.length - 1];
}

/** α_M para un ligando auxiliar con constantes acumuladas β (log) y [L] libre. */
export function alphaMetal(logBeta: number[] | undefined, L: number): number {
  if (!logBeta || logBeta.length === 0 || L <= 0) return 1;
  let s = 1;
  logBeta.forEach((lb, i) => (s += Math.pow(10, lb) * Math.pow(L, i + 1)));
  return 1 / s;
}

export interface EdtaSetup {
  logKf: number;
  pH: number;
  CM: number; // M del metal
  VM: number; // mL
  CY: number; // M del EDTA
  /** ligando auxiliar: log β y concentración libre (constante) */
  auxLogBeta?: number[];
  auxL?: number;
}

export function conditionalK(s: EdtaSetup): { aY: number; aM: number; Kcond: number } {
  const aY = alphaY4(s.pH);
  const aM = alphaMetal(s.auxLogBeta, s.auxL ?? 0);
  return { aY, aM, Kcond: Math.pow(10, s.logKf) * aY * aM };
}

/** Raíz positiva de a·x² + b·x − c = 0 (c > 0) evitando cancelaciones. */
function posRoot(a: number, b: number, c: number): number {
  if (a === 0) return c / b;
  const d = Math.sqrt(b * b + 4 * a * c);
  return b >= 0 ? (2 * c) / (b + d) : (-b + d) / (2 * a);
}

export interface EdtaPoint {
  V: number;
  pM: number;
  Mfree: number; // [M'] (todo el metal no unido a EDTA)
}

export function edtaPoint(s: EdtaSetup, V: number): EdtaPoint {
  const { aM, Kcond } = conditionalK(s);
  const Vt = s.VM + V;
  const CM = (s.CM * s.VM) / Vt;
  const CY = (s.CY * V) / Vt;
  const Mp = posRoot(Kcond, 1 + Kcond * (CY - CM), CM);
  return { V, Mfree: Mp, pM: -Math.log10(aM * Mp) };
}

export function edtaEquivalence(s: EdtaSetup): number {
  return (s.CM * s.VM) / s.CY;
}

export function edtaCurve(s: EdtaSetup, Vmax: number): EdtaPoint[] {
  const Veq = edtaEquivalence(s);
  const vs = new Set<number>();
  for (let i = 0; i <= 300; i++) vs.add((Vmax * i) / 300);
  for (let i = -60; i <= 60; i++) vs.add(Veq * (1 + i * 0.0005));
  for (const f of [0.01, 0.02, 0.05, 0.1]) {
    vs.add(Veq * (1 - f));
    vs.add(Veq * (1 + f));
  }
  return [...vs].filter((v) => v >= 0 && v <= Vmax).sort((a, b) => a - b).map((V) => edtaPoint(s, V));
}

/** log K' vs pH (curva de Ringbom simplificada) para elegir el pH mínimo de titulación. */
export function logKcondVsPH(logKf: number, from = 0, to = 14, step = 0.1) {
  const out: { pH: number; logK: number }[] = [];
  for (let p = from; p <= to + 1e-9; p += step) out.push({ pH: Number(p.toFixed(2)), logK: logKf + Math.log10(alphaY4(p)) });
  return out;
}

/** pH mínimo para que log K'f ≥ objetivo (por defecto 8). */
export function minimumPH(logKf: number, target = 8): number | null {
  if (logKf + Math.log10(alphaY4(14)) < target) return null;
  let lo = 0;
  let hi = 14;
  if (logKf + Math.log10(alphaY4(0)) >= target) return 0;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (logKf + Math.log10(alphaY4(m)) >= target) hi = m;
    else lo = m;
  }
  return hi;
}
