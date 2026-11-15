import { describe, expect, it } from 'vitest';
import { cleanData, equivalencePoints, reportTable } from '../potenciometria/tabla';
import { calibratePhMeter, nernstSlope } from '../potenciometria/calibracion';
import { combinedUncertainty, P11_FORMULA, P11_MM, P11_UNCERTAINTIES } from '../potenciometria/incertidumbre';
import { pHAt, type TitrationSetup } from '../acidbase/titration';
import { getSystem } from '../data/acids';

/** Valoración sintética como indica el procedimiento: de a 1,0 mL y de a 0,2 mL desde 4 mL antes hasta 4 mL después del gasto esperado. */
function synthetic(s: TitrationSetup, Gexp: number, Gend: number): { G: number[]; pH: number[] } {
  const G: number[] = [];
  for (let g = 0; g <= Gend + 1e-9; ) {
    G.push(Math.round(g * 100) / 100);
    g += g >= Gexp - 4 - 1e-9 && g < Gexp + 4 - 1e-9 ? 0.2 : 1.0;
  }
  return { G, pH: G.map((g) => pHAt(s, g)) };
}

const acetic: TitrationSetup = { analyte: [{ kind: 'weak', C: 0.1, system: getSystem('acetico')!, hAdded: 1 }], Va: 25, titrant: { kind: 'strong-base', C: 0.1, n: 1 } };

describe('Potenciometría: tabla y punto de equivalencia', () => {
  it('tabla del informe (columnas como en la cuaderneta)', () => {
    const r = reportTable([0, 1, 2, 4], [3, 4, 6, 7]);
    expect(r[0]).toMatchObject({ Gbar: 0.5, d1: 1, Gbb: 1, d2: 1 });
    expect(r[1]).toMatchObject({ Gbar: 1.5, d1: 2, Gbb: 2.25 });
    expect(r[1].d2).toBeCloseTo((0.5 - 2) / (3 - 1.5), 12);
    expect(r[3]).toMatchObject({ Gbar: null, d1: null, d2: null });
  });
  it('25,00 mL de CH3COOH 0,1 M con NaOH 0,1 M', () => {
    const { G, pH } = synthetic(acetic, 25, 30);
    const { points } = equivalencePoints(G, pH);
    expect(points.length).toBe(1);
    const p = points[0];
    expect(Math.abs(p.Gd2! - 25)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(p.Gmax1 - 25)).toBeLessThanOrEqual(0.2);
    expect(Math.abs(p.Gparabola! - 25)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(p.graphical!.G - 25)).toBeLessThanOrEqual(0.2);
    expect(p.yAtPE).toBeGreaterThan(8);
  });
  it('en mV (E baja cuando el pH sube) da el mismo PE', () => {
    const { G, pH } = synthetic(acetic, 25, 30);
    const E = pH.map((v) => 400 - 59.16 * v);
    const p = equivalencePoints(G, E).points[0];
    const q = equivalencePoints(G, pH).points[0];
    expect(p.Gd2!).toBeCloseTo(q.Gd2!, 9);
    expect(p.Gmax1).toBe(q.Gmax1);
  });
  it('ácido fosfórico: dos saltos', () => {
    const s: TitrationSetup = { analyte: [{ kind: 'weak', C: 0.05, system: getSystem('fosforico')!, hAdded: 3 }], Va: 20, titrant: { kind: 'strong-base', C: 0.1, n: 1 } };
    const G: number[] = [];
    for (let g = 0; g <= 24.0001; g += 0.2) G.push(Math.round(g * 100) / 100);
    const pts = equivalencePoints(G, G.map((g) => pHAt(s, g))).points;
    expect(pts.length).toBe(2);
    expect(Math.abs(pts[0].Gd2! - 10)).toBeLessThan(0.2);
    expect(Math.abs(pts[1].Gd2! - 20)).toBeLessThan(0.2);
  });
  it('limpieza de datos', () => {
    const c = cleanData([2, 1, 1, 3], [5, 4, 4.1, 6]);
    expect(c.G).toEqual([1, 2, 3]);
    expect(c.y).toEqual([4, 5, 6]);
    expect(c.warnings.length).toBe(2);
  });
});

describe('Calibración del pH-metro', () => {
  it('Nernst a 25 °C = −59,16 mV/pH', () => expect(nernstSlope(25)).toBeCloseTo(-59.16, 2));
  it('buffers con −59,16 mV/pH exacto → 100,0 %', () => {
    const pH = [4.01, 7.0, 10.01];
    const theo = nernstSlope(25);
    const c = calibratePhMeter(pH, pH.map((p) => 12 + theo * (p - 7)), 25);
    expect(c.pctSlope).toBeCloseTo(100, 6);
    expect(c.r2).toBeCloseTo(1, 12);
    expect(c.passes).toBe(true);
    expect(c.pHatZero).toBeCloseTo(7 + 12 / -theo, 9);
  });
  it('pendiente baja → no cumple', () => {
    const c = calibratePhMeter([4.01, 7, 10.01], [160, 0, -160], 25);
    expect(c.pctSlope).toBeCloseTo((160 * 2 / 6) / 59.16 * 100, 0);
    expect(c.passes).toBe(false);
  });
  it('la pendiente teórica cambia con la temperatura', () => expect(nernstSlope(20)).toBeCloseTo(-58.17, 2));
});

describe('Incertidumbre (Práctico 11)', () => {
  it('coincide con la suma de incertidumbres relativas al cuadrado', () => {
    const v = { cNaOH: { value: 0.01012, u: 0.00005 }, G: { value: 13.1, u: P11_UNCERTAINTIES.G }, MM: { value: P11_MM, u: P11_UNCERTAINTIES.MM }, m: { value: 21.2345, u: P11_UNCERTAINTIES.m } };
    const r = combinedUncertainty(P11_FORMULA, v, 2);
    const c = (0.01012 * 13.1 * P11_MM * 1000) / 21.2345;
    expect(r.value).toBeCloseTo(c, 9);
    const rel = Math.sqrt((0.00005 / 0.01012) ** 2 + (0.1 / 13.1) ** 2 + (0.00042 / P11_MM) ** 2 + (0.0002 / 21.2345) ** 2);
    expect(r.u).toBeCloseTo(c * rel, 9);
    expect(r.U).toBeCloseTo(2 * c * rel, 9);
    expect(r.terms.reduce((s, t) => s + t.percent, 0)).toBeCloseTo(100, 9);
  });
  it('es la ecuación de la cuaderneta (pág. 39): c = c(NaOH)·Gb(L)·MM/m·10⁶, con las incertidumbres de su tabla', () => {
    const cNaOH = 0.01012, GmL = 13.1, m = 21.2345;
    const doc = ((cNaOH * (GmL / 1000) * 97.9956) / m) * 1e6;
    const r = combinedUncertainty(P11_FORMULA, { cNaOH: { value: cNaOH, u: 0.00005 }, G: { value: GmL, u: 0.1 }, MM: { value: 97.9956, u: 0.00042 }, m: { value: m, u: 0.0002 } }, 1);
    expect(r.value).toBeCloseTo(doc, 9);
    expect(r.U).toBeCloseTo(r.u, 12);
    expect(P11_UNCERTAINTIES).toEqual({ G: 0.1, MM: 0.00042, m: 0.0002 });
    expect(P11_MM).toBe(97.9956);
  });
});
