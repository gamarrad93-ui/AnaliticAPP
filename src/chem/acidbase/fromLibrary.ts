/** Convierte entradas de la biblioteca (o personalizadas) en componentes del motor. */
import type { Component, ProticSystem } from './equilibrium';
import { getSystem, type Compound } from '../data/acids';
import { parseNumber } from '../numeric/format';

export function compoundToComponent(c: Compound, C: number): Component {
  if (c.kind === 'strong-acid') return { kind: 'strong-acid', C, n: c.n ?? 1 };
  if (c.kind === 'strong-base') return { kind: 'strong-base', C, n: c.n ?? 1 };
  const sys = getSystem(c.systemId!)!;
  return { kind: 'weak', C, system: sys, hAdded: c.hAdded! };
}

/** Nombres de especies del compuesto (o genéricos). */
export function speciesNamesOf(c: Compound | null, sys?: ProticSystem): string[] {
  if (c?.systemId) return getSystem(c.systemId)!.species;
  if (sys) return genericSpecies(sys);
  return [];
}

/** Nombres genéricos H₃A, H₂A⁻, … según la carga. */
export function genericSpecies(sys: ProticSystem, letter = 'A'): string[] {
  const n = sys.pKa.length;
  const sub = (k: number) => (k <= 1 ? (k === 1 ? 'H' : '') : 'H' + String(k).split('').map((d) => '₀₁₂₃₄₅₆₇₈₉'[+d]).join(''));
  const sup = (z: number) => {
    if (z === 0) return '';
    const s = Math.abs(z) === 1 ? '' : String(Math.abs(z)).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join('');
    return s + (z > 0 ? '⁺' : '⁻');
  };
  const out: string[] = [];
  for (let j = 0; j <= n; j++) out.push(`${sub(n - j)}${letter}${sup(sys.zFull - j)}`);
  return out;
}

/**
 * Lee una lista de pKa escrita por el usuario. Separadores: punto y coma, espacio o barra
 * (la coma es el separador decimal). Ej.: "2,15; 7,20; 12,35".
 */
export function parsePKaList(raw: string): { values: number[]; error: string | null } {
  const parts = raw.split(/[;\s/|]+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return { values: [], error: 'Escribí al menos un pKa.' };
  const values: number[] = [];
  for (const p of parts) {
    const v = parseNumber(p);
    if (v == null) return { values: [], error: `"${p}" no es un número. Separá los pKa con punto y coma (ej. 2,15; 7,20).` };
    if (v < -5 || v > 20) return { values: [], error: `El pKa ${p} está fuera de un rango razonable (−5 a 20).` };
    values.push(v);
  }
  if (values.length > 6) return { values: [], error: 'Máximo 6 valores de pKa.' };
  for (let i = 1; i < values.length; i++) {
    if (values[i] <= values[i - 1]) return { values: [], error: 'Los pKa deben ir en orden creciente (pKa1 < pKa2 < …).' };
  }
  return { values, error: null };
}
