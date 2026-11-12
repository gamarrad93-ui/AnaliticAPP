/**
 * Verificación de material volumétrico (método gravimétrico, ISO 4787).
 *
 *   V20 = m · Z(T),   Z = [1/(ρ_agua(T) − ρ_aire)] · (1 − ρ_aire/ρ_pesas) · [1 − γ(T − 20)]
 *
 * ρ_agua: ecuación de Tanaka et al. (Metrologia 38, 2001). ρ_aire = 0,0012 g/mL,
 * ρ_pesas = 8,0 g/mL, γ = 1,0 × 10⁻⁵ °C⁻¹ (vidrio borosilicato 3.3).
 * Con estos valores Z coincide con la tabla de Harris (1,0029 mL/g a 20 °C; 1,0040 a 25 °C).
 */

export function waterDensity(t: number): number {
  const a1 = -3.983035;
  const a2 = 301.797;
  const a3 = 522528.9;
  const a4 = 69.34881;
  const a5 = 999.97495;
  return (a5 * (1 - ((t + a1) ** 2 * (t + a2)) / (a3 * (t + a4)))) / 1000; // g/mL
}

export function zFactor(t: number, rhoAir = 0.0012, rhoWeights = 8.0, gamma = 1e-5): number {
  return (1 / (waterDensity(t) - rhoAir)) * (1 - rhoAir / rhoWeights) * (1 - gamma * (t - 20));
}

/** Tolerancias habituales (mL) de material clase A (ISO 648 pipetas, ISO 385 buretas). */
export const TOLERANCES: { id: string; label: string; nominal: number; tol: number }[] = [
  { id: 'pip1', label: 'Pipeta aforada 1 mL clase A', nominal: 1, tol: 0.008 },
  { id: 'pip2', label: 'Pipeta aforada 2 mL clase A', nominal: 2, tol: 0.01 },
  { id: 'pip5', label: 'Pipeta aforada 5 mL clase A', nominal: 5, tol: 0.015 },
  { id: 'pip10', label: 'Pipeta aforada 10 mL clase A', nominal: 10, tol: 0.02 },
  { id: 'pip25', label: 'Pipeta aforada 25 mL clase A', nominal: 25, tol: 0.03 },
  { id: 'bur10', label: 'Bureta 10 mL clase A (tramo 0–8 mL)', nominal: 8, tol: 0.02 },
  { id: 'bur25', label: 'Bureta 25 mL clase A', nominal: 25, tol: 0.03 },
];

export interface Conformity {
  /** s/√n ≤ tol/3 (capacidad del sistema de medida) */
  capacityOk: boolean;
  capacityValue: number;
  /** |V20 − Vnom| + t·s/√n ≤ tol (control de exactitud) */
  accuracyOk: boolean;
  accuracyValue: number;
}

export function conformity(meanV20: number, s: number, n: number, nominal: number, tol: number, t: number): Conformity {
  const sem = s / Math.sqrt(n);
  const acc = Math.abs(meanV20 - nominal) + t * sem;
  return { capacityOk: sem <= tol / 3, capacityValue: sem, accuracyOk: acc <= tol, accuracyValue: acc };
}
