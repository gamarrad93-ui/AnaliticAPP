/**
 * Lectura y escritura de números en formato uruguayo (coma decimal).
 * Se acepta también el punto como separador decimal al ingresar datos.
 */

/**
 * Convierte un texto a número. Acepta:
 *  "0,1"  "0.1"  "1e-3"  "1,5e-3"  "1,5E-3"  "1,5×10^-3"  "1,5x10-3"  "-2"  " 3 "
 * Devuelve null si el texto no es un número válido.
 */
export function parseNumber(raw: string): number | null {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/\s+/g, '').replace(/−/g, '-');
  if (s === '') return null;
  // notación "×10^-3", "x10^-3", "*10^-3", "·10-3"
  s = s.replace(/[×x*·]10\^?/i, 'e');
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // el último separador es el decimal; el otro es de miles
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    if ((s.match(/,/g) || []).length > 1) return null;
    s = s.replace(',', '.');
  }
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

const SUP: Record<string, string> = {
  '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
};

/** Exponente con superíndices: -5 -> "⁻⁵" */
export function superscript(n: number): string {
  return String(n).split('').map((c) => SUP[c] ?? c).join('');
}

/**
 * Formatea con un número fijo de decimales y coma decimal.
 * fmtFixed(8.7234, 2) -> "8,72"
 */
export function fmtFixed(x: number, decimals: number): string {
  if (!Number.isFinite(x)) return '—';
  const s = x.toFixed(decimals);
  return (s === '-0' || /^-0\.0*$/.test(s) ? s.slice(1) : s).replace('.', ',');
}

/**
 * Formatea con cifras significativas, usando notación científica (× 10ⁿ)
 * cuando el número es muy grande o muy chico. Coma decimal.
 * fmtSig(0.0001738, 3) -> "1,74 × 10⁻⁴"
 */
export function fmtSig(x: number, sig = 4): string {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const ax = Math.abs(x);
  const exp = Math.floor(Math.log10(ax));
  if (exp < -3 || exp >= 6) {
    let m = x / Math.pow(10, exp);
    let e = exp;
    let ms = m.toFixed(sig - 1);
    if (Math.abs(Number(ms)) >= 10) {
      e += 1;
      m = x / Math.pow(10, e);
      ms = m.toFixed(sig - 1);
    }
    return `${ms.replace('.', ',')} × 10${superscript(e)}`;
  }
  const decimals = Math.max(0, sig - 1 - exp);
  return fmtFixed(Number(x.toPrecision(sig)), decimals);
}

/** Formato "inteligente": usa decimales fijos si se indican, si no cifras significativas. */
export function fmt(x: number, opts: { sig?: number; dec?: number } = {}): string {
  if (opts.dec != null) return fmtFixed(x, opts.dec);
  return fmtSig(x, opts.sig ?? 4);
}

/** Versión para LaTeX (KaTeX): coma decimal con {,} y notación \times 10^{n}. */
export function texNum(x: number, sig = 4): string {
  if (!Number.isFinite(x)) return '\\text{—}';
  const s = fmtSig(x, sig);
  const m = s.match(/^(.*) × 10(.*)$/);
  const fixComma = (t: string) => t.replace(',', '{,}');
  if (m) {
    const expStr = m[2]
      .split('')
      .map((c) => Object.keys(SUP).find((k) => SUP[k] === c) ?? c)
      .join('');
    return `${fixComma(m[1])}\\times 10^{${expStr}}`;
  }
  return fixComma(s);
}
