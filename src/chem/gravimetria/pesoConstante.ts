/** Peso constante: dos pesadas consecutivas que difieren a lo sumo `tolMg` (por defecto 0,3 mg). */
export interface ConstantWeight {
  diffsMg: (number | null)[];
  /** índice de la pesada con la que se alcanzó peso constante (o null) */
  reachedAt: number | null;
  final: number | null;
  tolMg: number;
}

export function constantWeight(masses: number[], tolMg = 0.3): ConstantWeight {
  const diffsMg = masses.map((m, i) => (i === 0 ? null : (m - masses[i - 1]) * 1000));
  let reachedAt: number | null = null;
  for (let i = 1; i < masses.length; i++) {
    if (Math.abs(diffsMg[i]!) <= tolMg + 1e-9) {
      reachedAt = i;
      break;
    }
  }
  return { diffsMg, reachedAt, final: reachedAt != null ? masses[reachedAt] : null, tolMg };
}
