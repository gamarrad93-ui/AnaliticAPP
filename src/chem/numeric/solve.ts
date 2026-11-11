/**
 * Solvers numéricos genéricos (sin dependencias).
 * Se usan para resolver el balance de carga en [H+] y otras ecuaciones de una variable.
 */

/**
 * Método de Brent (combinación de bisección, secante e interpolación cuadrática inversa).
 * Encuentra x en [a, b] tal que f(x) = 0. Requiere que f(a) y f(b) tengan signo opuesto.
 * Converge siempre (como bisección) pero mucho más rápido en funciones suaves.
 */
export function brent(
  f: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-13,
  maxIter = 200,
): number {
  let fa = f(a);
  let fb = f(b);
  if (fa === 0) return a;
  if (fb === 0) return b;
  if (fa * fb > 0) {
    throw new Error('brent: la función no cambia de signo en el intervalo');
  }
  if (Math.abs(fa) < Math.abs(fb)) {
    [a, b] = [b, a];
    [fa, fb] = [fb, fa];
  }
  let c = a;
  let fc = fa;
  let d = b - a;
  let mflag = true;
  for (let i = 0; i < maxIter; i++) {
    if (fb === 0 || Math.abs(b - a) < tol) return b;
    let s: number;
    if (fa !== fc && fb !== fc) {
      // interpolación cuadrática inversa
      s =
        (a * fb * fc) / ((fa - fb) * (fa - fc)) +
        (b * fa * fc) / ((fb - fa) * (fb - fc)) +
        (c * fa * fb) / ((fc - fa) * (fc - fb));
    } else {
      // secante
      s = b - (fb * (b - a)) / (fb - fa);
    }
    const cond1 = (s - (3 * a + b) / 4) * (s - b) >= 0;
    const cond2 = mflag && Math.abs(s - b) >= Math.abs(b - c) / 2;
    const cond3 = !mflag && Math.abs(s - b) >= Math.abs(c - d) / 2;
    const cond4 = mflag && Math.abs(b - c) < tol;
    const cond5 = !mflag && Math.abs(c - d) < tol;
    if (cond1 || cond2 || cond3 || cond4 || cond5) {
      s = (a + b) / 2; // bisección
      mflag = true;
    } else {
      mflag = false;
    }
    const fs = f(s);
    d = c;
    c = b;
    fc = fb;
    if (fa * fs < 0) {
      b = s;
      fb = fs;
    } else {
      a = s;
      fa = fs;
    }
    if (Math.abs(fa) < Math.abs(fb)) {
      [a, b] = [b, a];
      [fa, fb] = [fb, fa];
    }
  }
  return b;
}

/** Bisección simple (robusta) para funciones monótonas. */
export function bisect(f: (x: number) => number, a: number, b: number, tol = 1e-12, maxIter = 300): number {
  let fa = f(a);
  for (let i = 0; i < maxIter; i++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (fm === 0 || (b - a) / 2 < tol) return m;
    if (Math.sign(fm) === Math.sign(fa)) {
      a = m;
      fa = fm;
    } else {
      b = m;
    }
  }
  return (a + b) / 2;
}

/** log10 de una suma de exponentes en base 10 sin desbordar: log10(Σ 10^v_i). */
export function log10SumExp(values: number[]): number {
  let max = -Infinity;
  for (const v of values) if (v > max) max = v;
  if (!isFinite(max)) return max;
  let s = 0;
  for (const v of values) s += Math.pow(10, v - max);
  return max + Math.log10(s);
}
