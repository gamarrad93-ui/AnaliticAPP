/** Generador pseudoaleatorio con semilla (mulberry32): el mismo código da siempre el mismo problema. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normal estándar (Box-Muller) a partir del generador. */
export function normal(r: () => number): number {
  const u = Math.max(r(), 1e-12);
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const uniform = (r: () => number, a: number, b: number) => a + (b - a) * r();

/** Código del sorteo: "1-07-48213" = revisión, problema, semilla. */
export function codigoSorteo(problemaId: string, seed: number): string {
  return `${problemaId}-${seed}`;
}

export function leerCodigo(code: string): { problemaId: string; seed: number } | null {
  const m = /^\s*([12])\s*-\s*(\d{1,2})\s*-\s*(\d{1,9})\s*$/.exec(code);
  if (!m) return null;
  return { problemaId: `${m[1]}-${m[2].padStart(2, '0')}`, seed: Number(m[3]) };
}
