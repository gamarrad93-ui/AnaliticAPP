/**
 * Pruebas de estadística. Los valores de referencia se calcularon con numpy 2 / scipy
 * (scipy.stats.linregress, t.ppf, f.ppf, ttest_*) y con ejemplos resueltos de
 * Miller & Miller, "Statistics and Chemometrics for Analytical Chemistry".
 */
import { describe, it, expect } from 'vitest';
import { linearRegression, detectionLimits, inversePrediction, standardAddition } from '../stats/regression';
import { tCritTwoSided, fInv, tInv } from '../stats/distributions';
import { summarize, tTestOneSample, tTestTwoSample, tTestPaired, fTest } from '../stats/descriptive';
import { dixonQ, grubbs, grubbsCritical, DIXON_Q } from '../stats/outliers';
import { propagate } from '../stats/propagation';
import { countSigFigs, formatWithUncertainty } from '../stats/sigfigs';
import { parseNumber, fmtSig, fmtFixed } from '../numeric/format';

describe('Regresión lineal (ejemplo de fluorescencia de Miller & Miller)', () => {
  const x = [0, 2, 4, 6, 8, 10, 12];
  const y = [2.1, 5.0, 9.0, 12.6, 17.3, 21.0, 24.7];
  const r = linearRegression(x, y);
  it('pendiente, ordenada y errores coinciden con scipy.stats.linregress', () => {
    expect(r.slope).toBeCloseTo(1.930357142857143, 12);
    expect(r.intercept).toBeCloseTo(1.5178571428571406, 12);
    expect(r.sSlope).toBeCloseTo(0.040900264457004606, 12);
    expect(r.sIntercept).toBeCloseTo(0.29493600135953485, 12);
    expect(r.r).toBeCloseTo(0.99887956534852, 12);
    expect(r.syx).toBeCloseTo(0.43284771324005317, 12);
  });
  it('valores del libro (redondeados): b = 1,93; a = 1,52; r = 0,9989; s_y/x = 0,433', () => {
    expect(r.slope.toFixed(2)).toBe('1.93');
    expect(r.intercept.toFixed(2)).toBe('1.52');
    expect(r.r.toFixed(4)).toBe('0.9989');
    expect(r.syx.toFixed(3)).toBe('0.433');
  });
  it('residuos suman 0', () => {
    expect(Math.abs(r.residuals.reduce((a, b) => a + b, 0))).toBeLessThan(1e-12);
  });
  it('concentración de desconocidos: y0 = 2,9 → 0,72 ± (s 0,26); y0 = 13,5 → 6,21 (s 0,24); y0 = 23,0 → 11,13 (s 0,26)', () => {
    const cases: [number, number, number][] = [
      [2.9, 0.7160037002775218, 0.2645697709699052],
      [13.5, 6.207215541165588, 0.23975422270299107],
      [23.0, 11.128584643848288, 0.2631932592546461],
    ];
    for (const [y0, x0, s] of cases) {
      const p = inversePrediction(r, y0, 1);
      expect(p.x0).toBeCloseTo(x0, 10);
      expect(p.sx0).toBeCloseTo(s, 10);
    }
  });
  it('LOD = 3,3·s/b y LOQ = 10·s/b', () => {
    const l = detectionLimits(r);
    expect(l.lod).toBeCloseTo((3.3 * 0.43284771324005317) / 1.930357142857143, 10);
    expect(l.loq).toBeCloseTo((10 * 0.43284771324005317) / 1.930357142857143, 10);
  });
});

describe('Adición estándar (ejemplo de Miller & Miller: plata por AAS)', () => {
  const x = [0, 5, 10, 15, 20, 25, 30];
  const y = [0.32, 0.41, 0.52, 0.6, 0.7, 0.77, 0.89];
  it('x_E = 17,3 ng/mL; s = 0,749; IC 95 % = ±1,92 (scipy)', () => {
    const sa = standardAddition(linearRegression(x, y));
    expect(sa.xE).toBeCloseTo(17.260536398467433, 9);
    expect(sa.sxE).toBeCloseTo(0.7478706360498604, 9);
    expect(sa.halfWidth).toBeCloseTo(1.9224626724355482, 6);
  });
});

describe('Valores críticos de t (scipy.stats.t.ppf)', () => {
  const t95: [number, number][] = [[1, 12.706204736174694], [2, 4.302652729749462], [3, 3.1824463052837078], [4, 2.7764451051977934], [5, 2.5705818356363146], [6, 2.4469118511449786], [9, 2.262157162798205], [10, 2.228138851986274], [20, 2.085963447265864], [30, 2.0422724563012378]];
  const t99: [number, number][] = [[1, 63.656741162871526], [2, 9.924843200918287], [4, 4.604094871349992], [5, 4.032142983555228], [10, 3.16927267261695], [30, 2.7499956535672254]];
  it('95 % bilateral', () => t95.forEach(([nu, v]) => expect(tCritTwoSided(0.95, nu)).toBeCloseTo(v, 8)));
  it('99 % bilateral', () => t99.forEach(([nu, v]) => expect(tCritTwoSided(0.99, nu)).toBeCloseTo(v, 7)));
  it('simetría', () => expect(tInv(0.025, 5)).toBeCloseTo(-2.5705818356363146, 8));
});

describe('Valores críticos de F (scipy.stats.f.ppf)', () => {
  const cases: [number, number, number, number][] = [
    [4, 4, 9.604529884722858, 6.3882329086958665],
    [5, 5, 7.146381828732832, 5.050329057632645],
    [6, 6, 5.819756578960778, 4.283865713822639],
    [3, 5, 7.763589482018544, 5.409451318056488],
    [9, 9, 4.025994158282978, 3.178893104458269],
    [10, 10, 3.716791864597366, 2.9782370160823213],
  ];
  it('0,975 (bilateral 95 %) y 0,95 (unilateral)', () => {
    for (const [d1, d2, bil, uni] of cases) {
      expect(fInv(0.975, d1, d2)).toBeCloseTo(bil, 7);
      expect(fInv(0.95, d1, d2)).toBeCloseTo(uni, 7);
    }
  });
});

describe('Pruebas t y F (comparadas con scipy)', () => {
  const a = [10.2, 10.5, 10.3, 10.6, 10.4];
  const b = [10.8, 10.9, 10.6, 11.0, 10.7];
  it('t de una muestra contra 10,0: t = 5,657; p = 0,00481', () => {
    const r = tTestOneSample(a, 10.0);
    expect(r.statistic).toBeCloseTo(5.656854249492385, 9);
    expect(r.pValue).toBeCloseTo(0.004812678330044206, 9);
    expect(r.significant).toBe(true);
  });
  it('t de dos muestras (varianzas iguales): |t| = 4,000; p = 0,00395', () => {
    const r = tTestTwoSample(a, b, true);
    expect(r.statistic).toBeCloseTo(4.0, 9);
    expect(r.pValue).toBeCloseTo(0.003949772803445323, 9);
  });
  it('t de Welch: gl = 8, p = 0,00395', () => {
    const r = tTestTwoSample(a, b, false);
    expect(r.df).toBeCloseTo(8, 9);
    expect(r.pValue).toBeCloseTo(0.00394977280344532, 9);
  });
  it('t apareado: |t| = 7,303; p = 0,00187', () => {
    const r = tTestPaired(a, b);
    expect(r.statistic).toBeCloseTo(7.302967433402155, 9);
    expect(r.pValue).toBeCloseTo(0.0018695076007749863, 9);
  });
  it('F con varianzas iguales → F = 1, no significativo', () => {
    const r = fTest(a, b);
    expect(r.statistic).toBeCloseTo(1, 9);
    expect(r.significant).toBe(false);
  });
  it('intervalo de confianza de la media', () => {
    const s = summarize(a, 0.95);
    expect(s.mean).toBeCloseTo(10.4, 12);
    expect(s.sd).toBeCloseTo(0.158113883, 8);
    expect(s.halfWidth).toBeCloseTo(2.7764451051977934 * 0.158113883 / Math.sqrt(5), 7);
  });
});

describe('Valores atípicos', () => {
  it('tabla de Q de Dixon (Rorabacher 1991) — valores clave', () => {
    expect(DIXON_Q[3][95]).toBe(0.970);
    expect(DIXON_Q[4][95]).toBe(0.829);
    expect(DIXON_Q[10][95]).toBe(0.466);
  });
  it('Q de Dixon: 0,1014 0,1013 0,1015 0,1040 → Q = 0,926 > 0,829, se descarta 0,1040', () => {
    const r = dixonQ([0.1014, 0.1013, 0.1015, 0.104]);
    expect(r.suspect).toBe(0.104);
    expect(r.Q).toBeCloseTo(0.0025 / 0.0027, 10);
    expect(r.reject).toBe(true);
  });
  it('G crítico de Grubbs (bilateral α = 0,05) = tabla ASTM E178 / scipy', () => {
    const ref: [number, number][] = [[3, 1.1543048513440386], [4, 1.48125], [5, 1.7150373123433635], [6, 1.8871451177839336], [7, 2.0199685076795975], [8, 2.1266450871954667], [9, 2.2150042233255336], [10, 2.2899540844796036], [12, 2.4115595184316527], [15, 2.54830777174334], [20, 2.7082456458057584]];
    for (const [n, g] of ref) expect(grubbsCritical(n)).toBeCloseTo(g, 8);
  });
  it('Grubbs: detecta un valor claramente atípico', () => {
    const r = grubbs([10.1, 10.2, 10.0, 10.1, 10.2, 11.5]);
    expect(r.suspect).toBe(11.5);
    expect(r.reject).toBe(true);
  });
});

describe('Propagación de errores', () => {
  it('suma: s = √(sa² + sb²)', () => {
    const r = propagate('a + b', { a: { value: 10, u: 0.3 }, b: { value: 5, u: 0.4 } });
    expect(r.value).toBe(15);
    expect(r.u).toBeCloseTo(0.5, 8);
  });
  it('producto/cociente: errores relativos en cuadratura', () => {
    const r = propagate('m/(M*V)', { m: { value: 0.5, u: 0.0002 }, M: { value: 204.22, u: 0 }, V: { value: 0.1, u: 0.0001 } });
    const rel = Math.sqrt((0.0002 / 0.5) ** 2 + (0.0001 / 0.1) ** 2);
    expect(r.u / r.value).toBeCloseTo(rel, 8);
  });
  it('logaritmo: pH = −log(h), s_pH = 0,434·s_h/h', () => {
    const r = propagate('-log(h)', { h: { value: 1e-3, u: 1e-5 } });
    expect(r.value).toBeCloseTo(3, 10);
    expect(r.u).toBeCloseTo(0.4342944819 * 0.01, 7);
  });
  it('potencia: y = x^3 → s_y/y = 3·s_x/x', () => {
    const r = propagate('x^3', { x: { value: 2, u: 0.01 } });
    expect(r.u / r.value).toBeCloseTo(0.015, 8);
  });
});

describe('Cifras significativas y formato', () => {
  it('cuenta cifras', () => {
    expect(countSigFigs('0,00250')!.count).toBe(3);
    expect(countSigFigs('1,020')!.count).toBe(4);
    expect(countSigFigs('6,02e23')!.count).toBe(3);
    expect(countSigFigs('1500')!.ambiguous).toBe(true);
    expect(countSigFigs('1500,')!.count).toBe(4);
  });
  it('resultado con incertidumbre', () => {
    expect(formatWithUncertainty(0.10234, 0.00056).text).toBe('0,1023 ± 0,0006');
    expect(formatWithUncertainty(12.3456, 0.0123).text).toBe('12,346 ± 0,012');
    expect(formatWithUncertainty(1234.5, 23).text).toBe('1235 ± 23');
  });
  it('lee números con coma o punto', () => {
    expect(parseNumber('0,1')).toBe(0.1);
    expect(parseNumber('0.1')).toBe(0.1);
    expect(parseNumber('1,5e-3')).toBe(0.0015);
    expect(parseNumber('1,5×10^-3')).toBeCloseTo(0.0015, 15);
    expect(parseNumber('1.234,5')).toBe(1234.5);
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('')).toBeNull();
  });
  it('muestra con coma decimal', () => {
    expect(fmtFixed(8.7295, 2)).toBe('8,73');
    expect(fmtSig(1.738e-5, 3)).toBe('1,74 × 10⁻⁵');
    expect(fmtSig(0.1, 3)).toBe('0,100');
  });
});
