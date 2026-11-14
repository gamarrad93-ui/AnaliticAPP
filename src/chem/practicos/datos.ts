/**
 * Datos de referencia por defecto (editables en el panel de Ajustes del Profesor).
 *  - V20 del material del Lab QA 2026 (códigos terminados en -26; valores confirmados por el docente).
 *  - Masas molares (g/mol), calculadas con los pesos atómicos estándar IUPAC (ver TESTS.md).
 *  - Tabla Z(T, P) de ISO 4787 para vidrio borosilicato 3.3.
 */
import { waterDensity } from '../lab/volumetric';
import type { Ajustes, MaterialRef, TablaZ } from './tipos';

export const SUFIJO_CODIGO = '-26';

export const MATERIALES_2026: MaterialRef[] = [
  { codigo: 'PA501', tipo: 'pipeta', nominal: 5, v20: 4.99 },
  { codigo: 'PA502', tipo: 'pipeta', nominal: 5, v20: 5.00 },
  { codigo: 'PA503', tipo: 'pipeta', nominal: 5, v20: 4.96 },
  { codigo: 'PA504', tipo: 'pipeta', nominal: 5, v20: 4.99 },
  { codigo: 'PA505', tipo: 'pipeta', nominal: 5, v20: 4.99 },
  { codigo: 'PA506', tipo: 'pipeta', nominal: 5, v20: 4.97 },
  { codigo: 'PA507', tipo: 'pipeta', nominal: 5, v20: 5.01 },
  { codigo: 'PA508', tipo: 'pipeta', nominal: 5, v20: 5.01 },
  { codigo: 'PA509', tipo: 'pipeta', nominal: 5, v20: 5.01 },
  { codigo: 'PA510', tipo: 'pipeta', nominal: 5, v20: 5.00 },
  { codigo: 'PA511', tipo: 'pipeta', nominal: 5, v20: 4.96 },
  { codigo: 'PA512', tipo: 'pipeta', nominal: 5, v20: 5.01 },
  { codigo: 'PA513', tipo: 'pipeta', nominal: 5, v20: 5.02 },
  { codigo: 'PA514', tipo: 'pipeta', nominal: 5, v20: 5.00 },
  { codigo: 'PA515', tipo: 'pipeta', nominal: 5, v20: 5.00 },
  { codigo: 'PA516', tipo: 'pipeta', nominal: 5, v20: 4.96 },
  { codigo: 'PA517', tipo: 'pipeta', nominal: 5, v20: 5.01 },
  { codigo: 'PA518', tipo: 'pipeta', nominal: 5, v20: 5.00 },
  { codigo: 'PA519', tipo: 'pipeta', nominal: 5, v20: 4.99 },
  { codigo: 'PA520', tipo: 'pipeta', nominal: 5, v20: 5.01 },
  { codigo: 'PA1001', tipo: 'pipeta', nominal: 10, v20: 9.97 },
  { codigo: 'PA1002', tipo: 'pipeta', nominal: 10, v20: 9.94 },
  { codigo: 'PA1003', tipo: 'pipeta', nominal: 10, v20: 9.98 },
  { codigo: 'PA1004', tipo: 'pipeta', nominal: 10, v20: 9.99 },
  { codigo: 'PA1005', tipo: 'pipeta', nominal: 10, v20: 10.02 },
  { codigo: 'PA1006', tipo: 'pipeta', nominal: 10, v20: 9.92 },
  { codigo: 'PA1007', tipo: 'pipeta', nominal: 10, v20: 9.99 },
  { codigo: 'PA1008', tipo: 'pipeta', nominal: 10, v20: 10.01 },
  { codigo: 'PA1009', tipo: 'pipeta', nominal: 10, v20: 10.00 },
  { codigo: 'PA1010', tipo: 'pipeta', nominal: 10, v20: 9.95 },
  { codigo: 'PA1011', tipo: 'pipeta', nominal: 10, v20: 10.01 },
  { codigo: 'PA1012', tipo: 'pipeta', nominal: 10, v20: 9.97 },
  { codigo: 'PA1013', tipo: 'pipeta', nominal: 10, v20: 10.04 },
  { codigo: 'PA1014', tipo: 'pipeta', nominal: 10, v20: 10.02 },
  { codigo: 'PA1015', tipo: 'pipeta', nominal: 10, v20: 10.04 },
  { codigo: 'PA1016', tipo: 'pipeta', nominal: 10, v20: 10.00 },
  { codigo: 'PA1017', tipo: 'pipeta', nominal: 10, v20: 9.99 },
  { codigo: 'PA1018', tipo: 'pipeta', nominal: 10, v20: 10.03 },
  { codigo: 'PA1019', tipo: 'pipeta', nominal: 10, v20: 10.01 },
  { codigo: 'PA1020', tipo: 'pipeta', nominal: 10, v20: 10.01 },
  { codigo: 'MA5001', tipo: 'matraz', nominal: 50, v20: 49.94 },
  { codigo: 'MA5002', tipo: 'matraz', nominal: 50, v20: 49.93 },
  { codigo: 'MA5003', tipo: 'matraz', nominal: 50, v20: 50.02 },
  { codigo: 'MA5004', tipo: 'matraz', nominal: 50, v20: 49.93 },
  { codigo: 'MA5005', tipo: 'matraz', nominal: 50, v20: 53.01 },
  { codigo: 'MA5006', tipo: 'matraz', nominal: 50, v20: 50.03 },
  { codigo: 'MA5007', tipo: 'matraz', nominal: 50, v20: 49.95 },
  { codigo: 'MA5008', tipo: 'matraz', nominal: 50, v20: 49.94 },
  { codigo: 'MA5009', tipo: 'matraz', nominal: 50, v20: 50.22 },
  { codigo: 'MA5010', tipo: 'matraz', nominal: 50, v20: 49.95 },
  { codigo: 'MA5011', tipo: 'matraz', nominal: 50, v20: 50.02 },
  { codigo: 'MA5012', tipo: 'matraz', nominal: 50, v20: 49.90 },
  { codigo: 'MA5013', tipo: 'matraz', nominal: 50, v20: 51.81 },
  { codigo: 'MA5014', tipo: 'matraz', nominal: 50, v20: 50.01 },
  { codigo: 'MA5015', tipo: 'matraz', nominal: 50, v20: 49.97 },
  { codigo: 'MA5016', tipo: 'matraz', nominal: 50, v20: 50.01 },
  { codigo: 'MA5017', tipo: 'matraz', nominal: 50, v20: 49.96 },
  { codigo: 'MA5018', tipo: 'matraz', nominal: 50, v20: 49.95 },
  { codigo: 'MA5019', tipo: 'matraz', nominal: 50, v20: 49.97 },
  { codigo: 'MA5020', tipo: 'matraz', nominal: 50, v20: 50.01 },
  { codigo: 'MA10001', tipo: 'matraz', nominal: 100, v20: 99.78 },
  { codigo: 'MA10002', tipo: 'matraz', nominal: 100, v20: 99.91 },
  { codigo: 'MA10003', tipo: 'matraz', nominal: 100, v20: 99.80 },
  { codigo: 'MA10004', tipo: 'matraz', nominal: 100, v20: 99.79 },
  { codigo: 'MA10005', tipo: 'matraz', nominal: 100, v20: 100.06 },
  { codigo: 'MA10006', tipo: 'matraz', nominal: 100, v20: 99.80 },
  { codigo: 'MA10007', tipo: 'matraz', nominal: 100, v20: 99.85 },
  { codigo: 'MA10008', tipo: 'matraz', nominal: 100, v20: 99.87 },
  { codigo: 'MA10009', tipo: 'matraz', nominal: 100, v20: 99.94 },
  { codigo: 'MA10010', tipo: 'matraz', nominal: 100, v20: 99.83 },
  { codigo: 'MA10011', tipo: 'matraz', nominal: 100, v20: 99.85 },
  { codigo: 'MA10012', tipo: 'matraz', nominal: 100, v20: 99.86 },
  { codigo: 'MA10013', tipo: 'matraz', nominal: 100, v20: 100.01 },
  { codigo: 'MA10014', tipo: 'matraz', nominal: 100, v20: 99.83 },
  { codigo: 'MA10015', tipo: 'matraz', nominal: 100, v20: 100.01 },
  { codigo: 'MA10016', tipo: 'matraz', nominal: 100, v20: 99.95 },
  { codigo: 'MA10017', tipo: 'matraz', nominal: 100, v20: 99.82 },
  { codigo: 'MA10018', tipo: 'matraz', nominal: 100, v20: 99.97 },
  { codigo: 'MA10019', tipo: 'matraz', nominal: 100, v20: 99.87 },
  { codigo: 'MA10020', tipo: 'matraz', nominal: 100, v20: 99.97 },
  { codigo: 'B1001', tipo: 'bureta', nominal: 10, tramos: [2.03, 4.04, 6.03, 8.02, 10.01] },
  { codigo: 'B1002', tipo: 'bureta', nominal: 10, tramos: [2.04, 4.06, 6.03, 8.06, 10.04] },
  { codigo: 'B1003', tipo: 'bureta', nominal: 10, tramos: [2.00, 4.02, 6.02, 8.00, 10.00] },
  { codigo: 'B1004', tipo: 'bureta', nominal: 10, tramos: [2.03, 4.02, 6.03, 8.03, 10.02] },
  { codigo: 'B1005', tipo: 'bureta', nominal: 10, tramos: [2.04, 4.00, 6.02, 8.02, 10.01] },
  { codigo: 'B1006', tipo: 'bureta', nominal: 10, tramos: [2.00, 4.01, 6.01, 8.03, 10.03] },
  { codigo: 'B1007', tipo: 'bureta', nominal: 10, tramos: [2.02, 4.02, 6.03, 8.02, 10.01] },
  { codigo: 'B1008', tipo: 'bureta', nominal: 10, tramos: [2.01, 4.01, 6.02, 8.01, 10.00] },
  { codigo: 'B1009', tipo: 'bureta', nominal: 10, tramos: [2.02, 4.02, 6.01, 8.02, 10.00] },
  { codigo: 'B1010', tipo: 'bureta', nominal: 10, tramos: [2.01, 3.99, 6.00, 8.02, 10.02] },
  { codigo: 'B1011', tipo: 'bureta', nominal: 10, tramos: [1.99, 3.99, 5.96, 7.96, 9.93] },
  { codigo: 'B1012', tipo: 'bureta', nominal: 10, tramos: [2.01, 4.01, 6.02, 8.01, 10.00] },
  { codigo: 'B1013', tipo: 'bureta', nominal: 10, tramos: [2.00, 4.01, 6.02, 8.02, 10.02] },
  { codigo: 'B1014', tipo: 'bureta', nominal: 10, tramos: [2.01, 4.02, 6.02, 8.01, 10.02] },
  { codigo: 'B1015', tipo: 'bureta', nominal: 10, tramos: [2.01, 4.01, 6.01, 8.04, 10.02] },
  { codigo: 'B1016', tipo: 'bureta', nominal: 10, tramos: [2.02, 4.02, 6.02, 8.03, 10.04] },
  { codigo: 'B1017', tipo: 'bureta', nominal: 10, tramos: [2.02, 4.02, 6.02, 8.01, 10.01] },
  { codigo: 'B1018', tipo: 'bureta', nominal: 10, tramos: [1.99, 4.02, 6.01, 8.02, 10.01] },
  { codigo: 'B1019', tipo: 'bureta', nominal: 10, tramos: [2.01, 4.01, 6.01, 8.02, 10.01] },
  { codigo: 'B1020', tipo: 'bureta', nominal: 10, tramos: [2.00, 3.99, 6.00, 7.99, 10.00] },
];

/** Masas molares por defecto (g/mol). */
export const MASAS_MOLARES: Record<string, number> = {
  Na2CO3: 105.99,
  H2C2O4_2H2O: 126.07,
  citrico_H2O: 210.14,
  NiSO4_6H2O: 262.85,
  MgSO4_7H2O: 246.47,
  KIO3: 214.0,
};

export const NOMBRES_MM: Record<string, string> = {
  Na2CO3: 'Na₂CO₃',
  H2C2O4_2H2O: 'H₂C₂O₄·2H₂O',
  citrico_H2O: 'Ácido cítrico monohidrato (C₆H₈O₇·H₂O)',
  NiSO4_6H2O: 'NiSO₄·6H₂O',
  MgSO4_7H2O: 'MgSO₄·7H₂O',
  KIO3: 'KIO₃',
};

/**
 * Densidad del aire (g/mL), fórmula aproximada CIPM usada en ISO 4787 / EURAMET cg-19:
 *   ρA = (0,34848·p − 0,009·h·e^(0,061·t)) / (273,15 + t)   [kg/m³; p en hPa, h en %]
 */
export function airDensity(t: number, pHpa: number, h = 50): number {
  return (0.34848 * pHpa - 0.009 * h * Math.exp(0.061 * t)) / (273.15 + t) / 1000;
}

/**
 * Factor Z de ISO 4787 (mL/g) para pesas de acero (ρB = 8,0 g/mL) y vidrio borosilicato 3.3
 * (γ = 1,0 × 10⁻⁵ °C⁻¹), con la temperatura del agua t (°C) y la presión p (hPa):
 *   V20 = m · Z,   Z = 1/(ρW − ρA) · (1 − ρA/ρB) · [1 − γ(t − 20)]
 */
export function zIso4787(t: number, pHpa: number, rhoB = 8.0, gamma = 1e-5): number {
  const rA = airDensity(t, pHpa);
  return (1 / (waterDensity(t) - rA)) * (1 - rA / rhoB) * (1 - gamma * (t - 20));
}

/** Tabla Z por defecto: 15–30 °C (cada 1 °C) × 800–1050 hPa, con 5 decimales. */
export function tablaZPorDefecto(): TablaZ {
  const T = Array.from({ length: 16 }, (_, i) => 15 + i);
  const P = [800, 850, 900, 950, 1000, 1013, 1050];
  const Z = T.map((t) => P.map((p) => Math.round(zIso4787(t, p) * 1e5) / 1e5));
  return { T, P, Z };
}

export function ajustesPorDefecto(): Ajustes {
  return {
    tolValores: { modo: 'relativa', valor: 0.1 },
    tolDispersion: { modo: 'relativa', valor: 5 },
    masasMolares: { ...MASAS_MOLARES },
    tablaZ: tablaZPorDefecto(),
    materiales: MATERIALES_2026.map((m) => ({ ...m, tramos: m.tramos ? [...m.tramos] : undefined })),
    criterioIterativo: false,
  };
}
