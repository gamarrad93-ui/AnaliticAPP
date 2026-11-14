/**
 * Factor gravimétrico F = a·M(buscada) / (b·M(pesada)).
 * a y b salen de igualar los átomos del elemento común: b·n(pesada) = a·n(buscada).
 */
import { parseFormula, type ParsedFormula } from './formula';

/** Mejor fracción p/q ≈ x con q ≤ maxDen (fracciones continuas). */
export function toFraction(x: number, maxDen = 1000): [number, number] {
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = x;
  for (let it = 0; it < 30; it++) {
    const a = Math.floor(b);
    const h2 = a * h1 + h0;
    const k2 = a * k1 + k0;
    if (k2 > maxDen) break;
    h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    if (Math.abs(x - h1 / k1) < 1e-9) break;
    b = 1 / (b - a);
    if (!isFinite(b)) break;
  }
  return [h1, k1];
}

/** Elementos comunes, en el orden de la sustancia buscada. Se descartan O e H salvo que sean los únicos. */
export function commonElements(weighed: ParsedFormula, sought: ParsedFormula): string[] {
  const all = [...sought.counts.keys()].filter((el) => weighed.counts.has(el));
  const main = all.filter((el) => el !== 'O' && el !== 'H');
  return main.length ? main : all;
}

/** a, b enteros mínimos para el elemento común `el`. */
export function coefficients(weighed: ParsedFormula, sought: ParsedFormula, el: string): { a: number; b: number } {
  const nW = weighed.counts.get(el);
  const nS = sought.counts.get(el);
  if (!nW || !nS) throw new Error(`${el} no está en las dos fórmulas.`);
  const [a, b] = toFraction(nW / nS);
  return { a, b };
}

export interface FactorResult {
  weighed: ParsedFormula;
  sought: ParsedFormula;
  common: string[];
  element: string | null;
  a: number;
  b: number;
  F: number;
}

export function gravimetricFactor(weighedFormula: string, soughtFormula: string, opts: { element?: string; a?: number; b?: number } = {}): FactorResult {
  const weighed = parseFormula(weighedFormula);
  const sought = parseFormula(soughtFormula);
  const common = commonElements(weighed, sought);
  const element = opts.element && common.includes(opts.element) ? opts.element : common[0] ?? null;
  let a = 1, b = 1;
  if (element) ({ a, b } = coefficients(weighed, sought, element));
  if (opts.a != null) a = opts.a;
  if (opts.b != null) b = opts.b;
  if (!(a > 0) || !(b > 0)) throw new Error('a y b tienen que ser mayores que cero.');
  return { weighed, sought, common, element, a, b, F: (a * sought.M) / (b * weighed.M) };
}

/** Cálculo de una réplica gravimétrica. */
export function gravimetricResult(p: { precipitate: number; sample: number; F: number; aliquotFactor?: number }) {
  const f = p.aliquotFactor ?? 1;
  const mSought = p.precipitate * p.F * f;
  return { mSought, pct: (mSought / p.sample) * 100 };
}
