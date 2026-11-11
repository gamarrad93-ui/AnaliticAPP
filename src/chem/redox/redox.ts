/**
 * Titulaciones redox EXACTAS.
 *
 * Cada cupla:  Ox + m H⁺ + n e⁻ ⇌ p Red        (Nernst, 25 °C, k = 0,05916 V)
 *   E = E°' − (k/n)·log( [Red]^p · F / ([Ox]·[H⁺]^m) )
 * F reúne especies de concentración constante (ej. I⁻ en exceso: F = [I⁻]³).
 *
 * Balance de electrones: los electrones que pierde el reductor = los que gana el oxidante.
 * Para cada V se busca el único E (método de Brent) que lo cumple.
 * Supuestos: [H⁺] constante (medio ácido en exceso), comportamiento ideal, potenciales formales.
 */
import { brent, bisect } from '../numeric/solve';

export const NERNST_K = 0.05916; // V, 2,303·RT/F a 25 °C

export interface Couple {
  /** potencial formal (V vs ENH) */
  E0: number;
  n: number;
  /** coeficiente de H⁺ en la semirreacción (0 si no participa) */
  m: number;
  /** coeficiente de Red; 0 si Red está en gran exceso y se incluye en F */
  p: number;
  /** log10 del producto de especies constantes del lado de Red (ej. 3·log[I⁻]) */
  logF?: number;
}

/**
 * Para una cupla con concentración total C (expresada en "unidades de Ox") y un potencial E,
 * devuelve [Ox] y la cantidad reducida (en unidades de Ox).
 */
export function coupleState(c: Couple, C: number, E: number, logH: number): { ox: number; redOxUnits: number } {
  // log([Red]^p / [Ox]) = n(E° − E)/k + m·log[H+] − logF
  const logR = (c.n * (c.E0 - E)) / NERNST_K + c.m * logH - (c.logF ?? 0);
  if (c.p === 0) {
    // 1/[Ox] = R → [Ox] = 1/R, limitado a C
    const ox = Math.min(C, Math.pow(10, -logR));
    return { ox, redOxUnits: C - ox };
  }
  // incógnita L = log10 r, con r = (C − x)/x; [Red] = p·C·r/(1+r), [Ox] = C/(1+r)
  const g = (L: number) => {
    const r = Math.pow(10, L);
    const log1r = L > 15 ? L : Math.log10(1 + r);
    return c.p * (Math.log10(c.p * C) + L - log1r) - (Math.log10(C) - log1r) - logR;
  };
  let L: number;
  if (c.p === 1) L = logR; // r = R exactamente
  else {
    let lo = -80;
    let hi = 80;
    if (g(lo) > 0) L = lo;
    else if (g(hi) < 0) L = hi;
    else L = brent(g, lo, hi, 1e-12);
  }
  // formas estables (sin ∞/∞) de C/(1+r) y C·r/(1+r)
  const ox = L > 0 ? (C * Math.pow(10, -L)) / (1 + Math.pow(10, -L)) : C / (1 + Math.pow(10, L));
  const red = L < 0 ? (C * Math.pow(10, L)) / (1 + Math.pow(10, L)) : C / (1 + Math.pow(10, -L));
  return { ox, redOxUnits: red };
}

export interface RedoxTitration {
  /** cupla del analito y si está inicialmente reducido ('red') u oxidado ('ox') */
  analyte: Couple;
  analyteForm: 'red' | 'ox';
  /** concentración del analito tal como se agrega (mol/L de la especie agregada) */
  Ca: number;
  Va: number; // mL
  titrant: Couple;
  Ct: number; // mol/L de la especie agregada
  /** pH del medio (para cuplas con H⁺); por defecto [H⁺] = 1 M */
  logH: number;
}

/** Convierte mol/L de la especie agregada a "unidades de Ox" de la cupla. */
function toOxUnits(c: Couple, C: number, form: 'red' | 'ox'): number {
  return form === 'ox' || c.p === 0 ? C : C / c.p;
}

/** Balance de electrones a potencial E (mmol de e⁻ cedidos − ganados) para V mL agregados. */
function electronBalance(t: RedoxTitration, V: number, E: number): number {
  const Vt = t.Va + V;
  const titrantForm = t.analyteForm === 'red' ? 'ox' : 'red';
  const CA = (toOxUnits(t.analyte, t.Ca, t.analyteForm) * t.Va) / Vt;
  const CT = (toOxUnits(t.titrant, t.Ct, titrantForm) * V) / Vt;
  const a = coupleState(t.analyte, CA, E, t.logH);
  const b = coupleState(t.titrant, CT, E, t.logH);
  if (t.analyteForm === 'red') {
    // analito reductor: cede n_A·[Ox_A]; titulante oxidante: gana n_T·[Red_T]
    return t.analyte.n * a.ox - t.titrant.n * b.redOxUnits;
  }
  // analito oxidante: gana n_A·[Red_A]; titulante reductor: cede n_T·[Ox_T]
  return t.titrant.n * b.ox - t.analyte.n * a.redOxUnits;
}

/** Potencial exacto (V vs ENH) tras agregar V mL. Para V = 0 no está definido. */
export function potentialAt(t: RedoxTitration, V: number): number {
  if (V <= 0) return NaN;
  // el balance (e⁻ cedidos − e⁻ ganados) siempre crece con E: a mayor potencial,
  // más reductor oxidado y menos oxidante reducido → raíz única
  const f = (E: number) => electronBalance(t, V, E);
  const lo = -3;
  const hi = 4;
  if (f(lo) > 0) return lo;
  if (f(hi) < 0) return hi;
  return brent(f, lo, hi, 1e-12);
}

/** Volumen de equivalencia: n_A·mol_A(Ox units) = n_T·mol_T(Ox units). */
export function equivalenceVolume(t: RedoxTitration): number {
  const titrantForm = t.analyteForm === 'red' ? 'ox' : 'red';
  const eA = t.analyte.n * toOxUnits(t.analyte, t.Ca, t.analyteForm) * t.Va;
  const eT = t.titrant.n * toOxUnits(t.titrant, t.Ct, titrantForm);
  return eA / eT;
}

/**
 * Potencial de equivalencia con la fórmula de libro (válida para p = 1 en ambas cuplas):
 *   E_eq = (n_A E_A + n_T E_T)/(n_A + n_T) + k·(m_A + m_T)/(n_A+n_T)·log[H⁺]
 */
export function textbookEquivalencePotential(t: RedoxTitration): number {
  const { analyte: A, titrant: T } = t;
  return (A.n * A.E0 + T.n * T.E0) / (A.n + T.n) + (NERNST_K * (A.m + T.m) * t.logH) / (A.n + T.n);
}

/** Volumen en que el potencial alcanza E (bisección; la curva es monótona). */
export function volumeAtPotential(t: RedoxTitration, E: number, Vmax: number): number | null {
  const sign = t.analyteForm === 'red' ? 1 : -1;
  const f = (V: number) => sign * (potentialAt(t, V) - E);
  const a = Vmax * 1e-6;
  if (f(a) * f(Vmax) > 0) return null;
  return bisect(f, a, Vmax, 1e-10);
}

export interface RedoxPoint {
  V: number;
  E: number;
}

/** Curva E vs V con muestreo denso cerca de la equivalencia. */
export function redoxCurve(t: RedoxTitration, Vmax: number): RedoxPoint[] {
  const Veq = equivalenceVolume(t);
  const vs = new Set<number>();
  for (let i = 1; i <= 300; i++) vs.add((Vmax * i) / 300);
  for (const f of [0.001, 0.002, 0.005, 0.01, 0.02, 0.03, 0.05, 0.08, 0.1, 0.15, 0.2]) {
    vs.add(Veq * (1 - f));
    vs.add(Veq * (1 + f));
  }
  for (let i = -50; i <= 50; i++) vs.add(Veq * (1 + i * 0.0004));
  vs.add(Veq);
  return [...vs]
    .filter((v) => v > 0 && v <= Vmax)
    .sort((a, b) => a - b)
    .map((V) => ({ V, E: potentialAt(t, V) }));
}
