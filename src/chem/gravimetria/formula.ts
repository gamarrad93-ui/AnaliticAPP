/**
 * Lector de fórmulas químicas: paréntesis/corchetes anidados, hidratos (· . * •) con coeficiente,
 * subíndices Unicode, y cargas ignoradas (SO4 2-, SO4^2-, PO4(3-), Cl-, Fe³⁺).
 */
import { ATOMIC_WEIGHTS } from './elementos';

export interface ElementPart {
  el: string;
  n: number;
  Ar: number;
  mass: number;
  pct: number;
}

export interface ParsedFormula {
  input: string;
  /** fórmula limpia (sin carga) */
  clean: string;
  counts: Map<string, number>;
  M: number;
  parts: ElementPart[];
}

export class FormulaError extends Error {}

const SUB: Record<string, string> = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻';

/** Saca la carga final (si la hay). */
export function stripCharge(s: string): string {
  let t = s.trim();
  t = t.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁺⁻]$/, ''); // Fe³⁺, SO₄²⁻
  t = t.replace(/\s*\^\s*\(?\d*[+-]\)?\s*$/, ''); // SO4^2-
  t = t.replace(/\(\s*\d*[+-]\s*\)\s*$/, ''); // PO4(3-)
  t = t.replace(/\s+\d*[+-]$/, ''); // SO4 2-
  t = t.replace(/[+-]+$/, ''); // Cl-, Na+
  return t.trim();
}

const CLOSE: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

export function parseFormula(input: string): ParsedFormula {
  let s = input.trim();
  if (!s) throw new FormulaError('Escribí una fórmula (ej. BaSO4 o MgNH4PO4·6H2O).');
  s = [...s].map((c) => SUB[c] ?? c).join('');
  s = stripCharge(s);
  if ([...s].some((c) => SUP.includes(c))) throw new FormulaError('No entiendo los superíndices dentro de la fórmula.');
  s = s.replace(/\s+/g, '');
  if (!s) throw new FormulaError('La fórmula está vacía.');
  let i = 0;
  const isSep = (c: string) => c === '·' || c === '.' || c === '*' || c === '•' || c === '∙';
  const readNum = (allowDec: boolean): number | null => {
    const m = (allowDec ? /^\d+(?:[.,]\d+)?/ : /^\d+/).exec(s.slice(i));
    if (!m) return null;
    i += m[0].length;
    return Number(m[0].replace(',', '.'));
  };
  const add = (into: Map<string, number>, from: Map<string, number>, k: number) => {
    for (const [el, n] of from) into.set(el, (into.get(el) ?? 0) + n * k);
  };
  const group = (closer: string | null): Map<string, number> => {
    const out = new Map<string, number>();
    while (i < s.length) {
      const c = s[i];
      if (closer && c === closer) return out;
      if (CLOSE[c]) {
        i++;
        const inner = group(CLOSE[c]);
        if (s[i] !== CLOSE[c]) throw new FormulaError(`Falta cerrar "${c}" con "${CLOSE[c]}".`);
        i++;
        add(out, inner, readNum(false) ?? 1);
      } else if (/[A-Z]/.test(c)) {
        let sym = c;
        i++;
        if (i < s.length && /[a-z]/.test(s[i])) sym += s[i++];
        if (ATOMIC_WEIGHTS[sym] == null) {
          // "Co" vs "CO": si las dos letras no forman un elemento, avisar
          throw new FormulaError(`"${sym}" no es un símbolo de elemento. Revisá mayúsculas y minúsculas (ej. Co es cobalto, CO es carbono + oxígeno).`);
        }
        add(out, new Map([[sym, 1]]), readNum(false) ?? 1);
      } else if (isSep(c)) {
        if (closer) throw new FormulaError('El punto de hidratación (·) no puede ir dentro de un paréntesis.');
        return out;
      } else if (')]}'.includes(c)) {
        throw new FormulaError(`Hay un "${c}" de más.`);
      } else if (/[a-z]/.test(c)) {
        throw new FormulaError(`Los símbolos empiezan con mayúscula: revisá "${c}".`);
      } else if (/\d/.test(c)) {
        throw new FormulaError('Hay un número en un lugar inesperado.');
      } else {
        throw new FormulaError(`No entiendo el carácter "${c}".`);
      }
    }
    if (closer) throw new FormulaError(`Falta cerrar un paréntesis con "${closer}".`);
    return out;
  };
  const counts = new Map<string, number>();
  let first = true;
  while (i < s.length || first) {
    if (!first) i++; // saltar separador
    first = false;
    const coef = readNum(true) ?? 1;
    const start = i;
    const g = group(null);
    if (i === start || g.size === 0) throw new FormulaError('Falta una parte de la fórmula (¿un "·" sin nada después?).');
    add(counts, g, coef);
    if (i >= s.length) break;
  }
  let M = 0;
  for (const [el, n] of counts) M += n * ATOMIC_WEIGHTS[el];
  const parts = [...counts].map(([el, n]) => {
    const Ar = ATOMIC_WEIGHTS[el];
    return { el, n, Ar, mass: n * Ar, pct: (n * Ar * 100) / M };
  });
  return { input, clean: s, counts, M, parts };
}

/** Versión que no tira error. */
export function tryParse(input: string): { ok: true; f: ParsedFormula } | { ok: false; error: string } {
  try {
    return { ok: true, f: parseFormula(input) };
  } catch (e) {
    return { ok: false, error: e instanceof FormulaError ? e.message : 'Fórmula inválida.' };
  }
}

/** Fórmula con subíndices y punto medio, para mostrar. */
export function prettyFormula(s: string): string {
  const t = s.trim();
  const m = /^(.*?)(\s*\^?\s*\(?(\d*)([+-])\)?)$/.exec(t);
  let body = t;
  let charge = '';
  if (m && m[1] && (/\s|\^|\(/.test(m[2]) || m[3] === '')) {
    body = m[1];
    const supd: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    charge = [...m[3]].map((d) => supd[d]).join('') + (m[4] === '+' ? '⁺' : '⁻');
  }
  const subd = '₀₁₂₃₄₅₆₇₈₉';
  let out = '';
  for (let k = 0; k < body.length; k++) {
    const c = body[k];
    const prev = body[k - 1];
    // dígitos después de letra o paréntesis → subíndice; al inicio o tras "·" → coeficiente
    if (/\d/.test(c) && prev && /[A-Za-z)\]}₀-₉]/.test(prev)) out += subd[Number(c)];
    else if ((c === '.' || c === '*') && k > 0) out += '·';
    else out += c;
  }
  return out + charge;
}
