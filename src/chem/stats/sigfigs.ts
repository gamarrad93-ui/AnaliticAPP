/**
 * Ayudante de cifras significativas.
 */

export interface SigFigInfo {
  count: number;
  /** true si hay ceros finales sin coma decimal (ambiguo, ej. "1500") */
  ambiguous: boolean;
  explanation: string;
}

/** Cuenta las cifras significativas de un número escrito como texto (coma o punto decimal). */
export function countSigFigs(raw: string): SigFigInfo | null {
  let s = raw.trim().replace(/\s/g, '').replace(/−/g, '-');
  s = s.replace(/[×x*·]10\^?/i, 'e');
  const m = s.match(/^[+-]?([0-9]*[.,]?[0-9]*)(e[+-]?\d+)?$/i);
  if (!m || !/[0-9]/.test(m[1])) return null;
  const mant = m[1].replace(',', '.');
  const hasPoint = mant.includes('.');
  const digits = mant.replace('.', '');
  const firstNonZero = digits.search(/[1-9]/);
  if (firstNonZero === -1) {
    // número cero: cuentan los ceros después de la coma
    const dec = hasPoint ? mant.split('.')[1].length : 1;
    return { count: Math.max(1, dec), ambiguous: !hasPoint, explanation: 'El cero se informa con tantas cifras como decimales se escriben.' };
  }
  let sig = digits.slice(firstNonZero);
  let ambiguous = false;
  let explanation = 'Los ceros a la izquierda no son significativos; todos los demás dígitos sí.';
  if (!hasPoint) {
    const trimmed = sig.replace(/0+$/, '');
    if (trimmed.length !== sig.length) {
      ambiguous = true;
      explanation = 'Los ceros finales sin coma decimal son ambiguos (pueden o no ser significativos). Conviene usar notación científica. Se cuentan sólo los dígitos seguros.';
      sig = trimmed;
    }
  }
  return { count: sig.length, ambiguous, explanation };
}

/** Redondea a n cifras significativas. */
export function roundSig(x: number, n: number): number {
  if (x === 0 || !Number.isFinite(x)) return x;
  return Number(x.toPrecision(n));
}

/** Posición decimal (potencia de 10) de la última cifra significativa de x con n cifras. */
function lastDigitExp(x: number, n: number): number {
  return Math.floor(Math.log10(Math.abs(x))) - n + 1;
}

export interface ResultWithUncertainty {
  value: number;
  u: number;
  decimals: number; // decimales a mostrar (puede ser negativo → redondeo a decenas, etc.)
  uSig: number;
  text: string;
}

/**
 * Expresa "valor ± incertidumbre" correctamente: la incertidumbre con 1 cifra significativa
 * (o 2 si su primera cifra es 1 o 2) y el valor redondeado a la misma posición decimal.
 */
export function formatWithUncertainty(value: number, u: number): ResultWithUncertainty {
  const uAbs = Math.abs(u);
  if (uAbs === 0 || !Number.isFinite(uAbs)) {
    return { value, u, decimals: 0, uSig: 0, text: String(value).replace('.', ',') };
  }
  const first = Number(uAbs.toPrecision(1).replace(/[^1-9]/g, '')[0]);
  const uSig = first <= 2 ? 2 : 1;
  let uR = roundSig(uAbs, uSig);
  let exp = lastDigitExp(uR, uSig);
  // si el redondeo subió de orden (ej. 0,096 → 0,10), recalcular
  if (roundSig(uR, uSig) !== uR) uR = roundSig(uR, uSig);
  exp = lastDigitExp(uR, uSig);
  const decimals = -exp;
  const factor = Math.pow(10, exp);
  const vR = Math.round(value / factor) * factor;
  const fmtD = (x: number) => (decimals > 0 ? x.toFixed(decimals) : x.toFixed(0)).replace('.', ',');
  return { value: vR, u: uR, decimals, uSig, text: `${fmtD(vR)} ± ${fmtD(uR)}` };
}
