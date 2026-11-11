/**
 * Evaluación de indicadores para una titulación dada.
 * Criterio (explicado también en la interfaz):
 *  - pH de punto final = punto medio del intervalo de viraje (editable).
 *  - Se calcula el volumen exacto en que la curva alcanza ese pH y el error de titulación
 *    respecto del punto de equivalencia más cercano.
 *  - |error| ≤ 0,1 %  → "Excelente";  ≤ 0,5 % → "Aceptable";  mayor → "No recomendado".
 */
import type { Indicator } from '../data/indicators';
import { endpointVolume, titrationError, type EquivalencePoint, type TitrationSetup } from './titration';

export type Verdict = 'excelente' | 'aceptable' | 'no-recomendado' | 'no-vira';

export interface IndicatorResult {
  indicator: Indicator;
  pHend: number;
  Vend: number | null;
  eq: EquivalencePoint | null;
  errorPct: number | null;
  /** volumen entre el inicio y el fin del viraje (mL): cuanto menor, más neto el cambio de color */
  transitionWidth: number | null;
  verdict: Verdict;
}

export function verdictFromError(err: number): Verdict {
  const a = Math.abs(err);
  if (a <= 0.1) return 'excelente';
  if (a <= 0.5) return 'aceptable';
  return 'no-recomendado';
}

export function evaluateIndicator(
  s: TitrationSetup,
  ind: Indicator,
  eqPoints: EquivalencePoint[],
  Vmax: number,
  pHend = (ind.low + ind.high) / 2,
): IndicatorResult {
  const Vend = endpointVolume(s, pHend, Vmax);
  if (Vend == null || eqPoints.length === 0) {
    return { indicator: ind, pHend, Vend: null, eq: null, errorPct: null, transitionWidth: null, verdict: 'no-vira' };
  }
  let best = eqPoints[0];
  for (const e of eqPoints) if (Math.abs(e.V - Vend) < Math.abs(best.V - Vend)) best = e;
  const err = titrationError(Vend, best.V);
  const v1 = endpointVolume(s, ind.low, Vmax);
  const v2 = endpointVolume(s, ind.high, Vmax);
  const width = v1 != null && v2 != null ? Math.abs(v2 - v1) : null;
  return { indicator: ind, pHend, Vend, eq: best, errorPct: err, transitionWidth: width, verdict: verdictFromError(err) };
}
