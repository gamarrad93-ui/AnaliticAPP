/**
 * Diseño de soluciones reguladoras (buffers) con cálculo EXACTO (balance de carga),
 * no con Henderson-Hasselbalch (que se muestra sólo como comparación).
 *
 * Par elegido: forma ácida con hA protones y forma básica con hA − 1 protones.
 * Con C = concentración total del sistema, x_b = concentración de la forma básica agregada:
 *    [H+] − [OH−] + C·(n̄H − hA) + x_b = 0
 *    ⇒ x_b = −([H+] − [OH−]) − C·(n̄H − hA)
 *    x_a = C − x_b
 * El mismo número x_b es la concentración de base fuerte (NaOH) a agregar si se parte
 * sólo de la forma ácida (método B).
 */
import { KW, bufferCapacity, meanBoundProtons, type ProticSystem } from './equilibrium';

export interface BufferPair {
  /** índice del pKa usado (0 = pKa1) */
  k: number;
  pKa: number;
  /** protones de la forma ácida y básica del par */
  hAcid: number;
  hBase: number;
}

/** Par conjugado con el pKa más cercano al pH buscado. */
export function bestPair(system: ProticSystem, pH: number): BufferPair {
  const n = system.pKa.length;
  let k = 0;
  system.pKa.forEach((p, i) => {
    if (Math.abs(p - pH) < Math.abs(system.pKa[k] - pH)) k = i;
  });
  // el pKa k corresponde a la pérdida del protón (k+1): forma con n−k protones → n−k−1
  return { k, pKa: system.pKa[k], hAcid: n - k, hBase: n - k - 1 };
}

export interface BufferDesign {
  pair: BufferPair;
  C: number;
  /** concentraciones (mol/L) de forma ácida y básica a mezclar */
  xAcid: number;
  xBase: number;
  /** relación base/ácido exacta y la predicha por Henderson-Hasselbalch */
  ratioExact: number;
  ratioHH: number;
  nH: number;
  /** capacidad buffer exacta a ese pH (mol L⁻¹ pH⁻¹) */
  beta: number;
  feasible: boolean;
  warnings: string[];
}

export function designBuffer(system: ProticSystem, pH: number, C: number, pair = bestPair(system, pH)): BufferDesign {
  const logH = -pH;
  const h = Math.pow(10, logH);
  const nH = meanBoundProtons(logH, system.pKa);
  const xBase = -(h - KW / h) - C * (nH - pair.hAcid);
  const xAcid = C - xBase;
  const warnings: string[] = [];
  const feasible = xBase >= 0 && xAcid >= 0;
  if (!feasible) warnings.push('Con este par conjugado no se puede alcanzar ese pH a esa concentración (haría falta una cantidad negativa de una de las formas).');
  if (Math.abs(pH - pair.pKa) > 1) warnings.push(`El pH buscado está a más de 1 unidad del pKa (${pair.pKa.toFixed(2).replace('.', ',')}): la capacidad reguladora será baja.`);
  const comps = [{ kind: 'weak' as const, C, system, hAdded: pair.hAcid }];
  return {
    pair,
    C,
    xAcid,
    xBase,
    ratioExact: xBase / xAcid,
    ratioHH: Math.pow(10, pH - pair.pKa),
    nH,
    beta: bufferCapacity(comps, pH),
    feasible,
    warnings,
  };
}

/** Curva de capacidad buffer β vs pH para un sistema de concentración total C. */
export function bufferCapacityCurve(system: ProticSystem, C: number, from = 0, to = 14, step = 0.05) {
  const comps = [{ kind: 'weak' as const, C, system, hAdded: 0 }];
  const out: { pH: number; beta: number }[] = [];
  for (let p = from; p <= to + 1e-9; p += step) out.push({ pH: Number(p.toFixed(4)), beta: bufferCapacity(comps, p) });
  return out;
}
