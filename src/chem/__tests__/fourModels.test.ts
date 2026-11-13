/**
 * Cuatro modelos de calibración. Referencias: numpy.polyfit y statsmodels (OLS, WLS)
 * sobre el ejemplo de fluorescencia de Miller & Miller (verificado a mano).
 */
import { describe, it, expect } from 'vitest';
import { fitLinear, fitOrigin, fitQuadratic, fitWeighted, fitFour, inverseFour, chooseBest, residualPattern } from '../stats/fourModels';

const x = [0, 2, 4, 6, 8, 10, 12];
const y = [2.1, 5.0, 9.0, 12.6, 17.3, 21.0, 24.7];

describe('Cuatro modelos de calibración (referencia numpy/statsmodels)', () => {
  it('a) lineal: m, b, R², R² ajustado, s_y/x', () => {
    const f = fitLinear(x, y);
    expect(f.m).toBeCloseTo(1.9303571428571427, 12);
    expect(f.b).toBeCloseTo(1.5178571428571443, 12);
    expect(f.r2).toBeCloseTo(0.9977603860708479, 12);
    expect(f.r2adj).toBeCloseTo(0.9973124632850175, 12);
    expect(f.syx).toBeCloseTo(0.43284771324005267, 12);
  });
  it('b) por el origen: m = Σxy/Σx², R² centrado', () => {
    const f = fitOrigin(x, y);
    expect(f.m).toBeCloseTo(2.1054945054945056, 12);
    expect(f.b).toBe(0);
    expect(f.r2).toBeCloseTo(0.9858969805178086, 12);
    expect(f.r2adj).toBeCloseTo(0.9858969805178086, 12);
    expect(f.syx).toBeCloseTo(0.9915485354577953, 12);
  });
  it('c) cuadrático', () => {
    const f = fitQuadratic(x, y);
    expect(f.a).toBeCloseTo(0.013988095238095518, 11);
    expect(f.m).toBeCloseTo(1.7624999999999975, 11);
    expect(f.b).toBeCloseTo(1.797619047619052, 11);
    expect(f.r2).toBeCloseTo(0.9983890945686872, 12);
    expect(f.r2adj).toBeCloseTo(0.9975836418530308, 12);
    expect(f.syx).toBeCloseTo(0.41042950789676624, 12);
  });
  it('d) ponderado 1/x² (sin x = 0): igual a statsmodels WLS', () => {
    const f = fitWeighted(x, y);
    expect(f.excludedZero).toBe(1);
    expect(f.n).toBe(6);
    expect(f.b).toBeCloseTo(1.02079208, 7);
    expect(f.m).toBeCloseTo(1.98672717, 7);
    expect(f.r2).toBeCloseTo(0.9992395054897212, 12);
    expect(f.r2adj).toBeCloseTo(0.9990493818621515, 12);
    expect(f.syx).toBeCloseTo(0.15450419783055996, 12);
    expect(f.residuals[0]).toBeCloseTo(1.0792079207920837, 10);
    expect(f.residuals[3]).toBeCloseTo(-0.3411551155115511, 10);
  });
  it('base común: en los no ponderados coincide con su R²; en el ponderado usa todos los puntos', () => {
    const fs = fitFour(x, y);
    for (const f of fs.filter((f) => f.id !== 'ponderado')) expect(f.r2Common).toBeCloseTo(f.r2, 12);
    const w = fs.find((f) => f.id === 'ponderado')!;
    const ym = y.reduce((s, v) => s + v, 0) / y.length;
    const ss = w.residuals.reduce((s, r) => s + r * r, 0);
    expect(w.r2Common).toBeCloseTo(1 - ss / y.reduce((s, v) => s + (v - ym) ** 2, 0), 12);
    expect(w.r2Common).toBeLessThan(w.r2); // el blanco excluido empeora el ajuste en base común
  });
  it('datos lineales de libro: se elige el lineal (el cuadrático no mejora lo suficiente)', () => {
    expect(chooseBest(fitFour(x, y))!.id).toBe('lineal');
  });
  it('los residuos del lineal suman 0 y fitFour devuelve los 4', () => {
    expect(Math.abs(fitLinear(x, y).residuals.reduce((a, b) => a + b, 0))).toBeLessThan(1e-12);
    expect(fitFour(x, y).map((f) => f.id)).toEqual(['lineal', 'origen', 'cuadratico', 'ponderado']);
  });
  it('concentración de una señal con cada modelo (ida y vuelta)', () => {
    for (const f of fitFour(x, y)) {
      const x0 = 7.3;
      const y0 = f.a * x0 * x0 + f.m * x0 + f.b;
      expect(inverseFour(f, y0, 12)).toBeCloseTo(x0, 10);
    }
  });
  it('patrón de residuos: una U se detecta; el ruido al azar no', () => {
    const xx = [1, 2, 3, 4, 5, 6, 7];
    expect(residualPattern(xx, [2, 0.5, -1, -1.5, -1, 0.5, 2]).flagged).toBe(true);
    expect(residualPattern(xx, [0.1, -0.2, 0.15, -0.05, 0.12, -0.1, 0.02]).flagged).toBe(false);
  });
  it('mejor modelo con datos curvos: el cuadrático (el lineal muestra forma de U)', () => {
    const xc = [0, 1, 2, 3, 4, 5, 6];
    const yc = xc.map((v, i) => 0.05 + 0.2 * v - 0.012 * v * v + [0.001, -0.001, 0.0005, 0, -0.0008, 0.0012, -0.0004][i]);
    const best = chooseBest(fitFour(xc, yc))!;
    expect(best.id).toBe('cuadratico');
    expect(best.reason).toMatch(/R² ajustado/);
  });
});
