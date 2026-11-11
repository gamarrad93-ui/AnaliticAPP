/**
 * Propagación de incertidumbres (aproximación lineal de primer orden, GUM):
 *   s_f² = Σ (∂f/∂x_i)² · s_i²       (variables independientes)
 * Las derivadas parciales se calculan numéricamente con diferencias centrales de alta precisión
 * (extrapolación de Richardson), por lo que sirve para cualquier fórmula que escriba el usuario.
 */
import { evaluate, parseExpression, variablesOf } from './expression';

export interface PropagationTerm {
  name: string;
  value: number;
  u: number;
  derivative: number;
  /** contribución (∂f/∂x · s)² */
  contribution: number;
  /** porcentaje de la varianza total */
  percent: number;
}

export interface PropagationResult {
  value: number;
  u: number;
  relU: number; // %
  terms: PropagationTerm[];
}

/** Derivada parcial numérica (diferencias centrales + Richardson). */
export function partialDerivative(f: (x: number) => number, x: number): number {
  const h = Math.max(Math.abs(x), 1e-8) * 1e-3;
  const D = (hh: number) => (f(x + hh) - f(x - hh)) / (2 * hh);
  const d1 = D(h);
  const d2 = D(h / 2);
  return (4 * d2 - d1) / 3;
}

export function propagate(formula: string, values: Record<string, { value: number; u: number }>): PropagationResult {
  const tree = parseExpression(formula);
  const names = [...variablesOf(tree)];
  const base: Record<string, number> = {};
  for (const nm of names) {
    if (!values[nm]) throw new Error(`Falta el valor de "${nm}"`);
    base[nm] = values[nm].value;
  }
  const value = evaluate(tree, base);
  if (!Number.isFinite(value)) throw new Error('La fórmula no da un resultado finito con esos valores (¿división por cero, raíz o logaritmo de un negativo?).');
  const terms: PropagationTerm[] = names.map((nm) => {
    const d = partialDerivative((xv) => evaluate(tree, { ...base, [nm]: xv }), base[nm]);
    const c = (d * values[nm].u) ** 2;
    return { name: nm, value: base[nm], u: values[nm].u, derivative: d, contribution: c, percent: 0 };
  });
  const total = terms.reduce((s, t) => s + t.contribution, 0);
  terms.forEach((t) => (t.percent = total > 0 ? (100 * t.contribution) / total : 0));
  const u = Math.sqrt(total);
  return { value, u, relU: (100 * u) / Math.abs(value), terms };
}
