/**
 * Cuatro modelos de calibración. Referencias: numpy.polyfit, numpy.linalg.lstsq y statsmodels (OLS)
 * sobre el ejemplo de fluorescencia de Miller & Miller (verificado a mano).
 */
import { describe, it, expect } from 'vitest';
import { fitLinear, fitOrigin, fitQuadratic, fitQuadraticOrigin, fitFour, inverseFour, chooseBest, residualPattern } from '../stats/fourModels';

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
  it('d) cuadrático sin ordenada (referencia numpy.linalg.lstsq)', () => {
    const f = fitQuadraticOrigin(x, y);
    expect(f.a).toBeCloseTo(-0.021121651785714565, 11);
    expect(f.m).toBeCloseTo(2.310212053571431, 11);
    expect(f.b).toBe(0);
    expect(f.r2).toBeCloseTo(0.9882493378495608, 12);
    expect(f.r2adj).toBeCloseTo(0.985899205419473, 12);
    expect(f.syx).toBeCloseTo(0.9914703186970062, 12);
  });
  it('base común: el R² de comparación es el R² centrado de cada modelo', () => {
    for (const f of fitFour(x, y)) expect(f.r2Common).toBeCloseTo(f.r2, 12);
  });
  it('con corrección por blanco (y − 2,1): lineal y cuadrático sin ordenada (numpy)', () => {
    const yc = y.map((v) => v - 2.1);
    const l = fitLinear(x, yc);
    expect(l.m).toBeCloseTo(1.9303571428571427, 12);
    expect(l.b).toBeCloseTo(-0.5821428571428562, 12);
    const q = fitQuadraticOrigin(x, yc);
    expect(q.a).toBeCloseTo(0.01989397321428561, 11);
    expect(q.m).toBeCloseTo(1.6703683035714294, 11);
    expect(q.r2).toBeCloseTo(0.9981021876152679, 12);
    expect(q.syx).toBeCloseTo(0.3984512427601946, 12);
  });
  it('datos lineales de libro: se elige el lineal (el cuadrático no mejora lo suficiente)', () => {
    expect(chooseBest(fitFour(x, y))!.id).toBe('lineal');
  });
  it('los residuos del lineal suman 0 y fitFour devuelve los 4', () => {
    expect(Math.abs(fitLinear(x, y).residuals.reduce((a, b) => a + b, 0))).toBeLessThan(1e-12);
    expect(fitFour(x, y).map((f) => f.id)).toEqual(['lineal', 'origen', 'cuadratico', 'cuadratico0']);
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

import { blankCorrect } from '../stats/blank';
describe('Corrección por blanco', () => {
  it('resta la señal del blanco y deja un único (0; 0)', () => {
    const r = blankCorrect([0, 0, 2, 4], [0.02, 0.04, 0.23, 0.43]);
    expect(r.blank).toBeCloseTo(0.03, 12);
    expect(r.nBlank).toBe(2);
    expect(r.x).toEqual([0, 2, 4]);
    expect(r.y[0]).toBe(0);
    expect(r.y[1]).toBeCloseTo(0.2, 12);
    expect(r.y[2]).toBeCloseTo(0.4, 12);
  });
  it('sin blanco (ningún x = 0) no cambia los datos', () => {
    const r = blankCorrect([1, 2], [3, 4]);
    expect(r.blank).toBeNull();
    expect(r.y).toEqual([3, 4]);
  });
  it('la pendiente del lineal no cambia; la ordenada baja en el valor del blanco', () => {
    const r = blankCorrect(x, y);
    const a = fitLinear(x, y);
    const b = fitLinear(r.x, r.y);
    expect(b.m).toBeCloseTo(a.m, 12);
    expect(b.b).toBeCloseTo(a.b - 2.1, 12);
  });
});
