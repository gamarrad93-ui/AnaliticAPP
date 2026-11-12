/**
 * Pruebas de las herramientas de laboratorio (Cuaderneta QA I 2026).
 */
import { describe, it, expect } from 'vitest';
import { evaluateReplicates, largestConcordantSubset, largestSubsetUnderCV } from '../lab/promediables';
import { zFactor, waterDensity, conformity } from '../lab/volumetric';
import { derivativeTable, findEndpoints } from '../lab/potentiometric';
import { fitModel, inverseModel } from '../stats/calibrationModels';
import { titrationCurve } from '../acidbase/titration';
import { getSystem } from '../data/acids';

describe('Criterios de promediabilidad', () => {
  it('concordancia: el grupo más grande dentro de 5,0 mg', () => {
    const m = [4.9871, 4.9895, 4.9902, 4.9760, 4.9883];
    const idx = largestConcordantSubset(m, 0.005);
    expect(idx).toEqual([0, 1, 2, 4]);
  });
  it('σr conocido (HCl, σr = 0,00030 M): Ir = 0,00084; CAI = 1,96·σr/√n', () => {
    const c = [0.2512, 0.2507, 0.2509, 0.2531, 0.2510];
    const r = evaluateReplicates(c, { kind: 'sigma', sigmaR: 0.0003 });
    expect(r.ir).toBeCloseTo(0.00084, 10);
    expect(r.included).toEqual([true, true, true, false, true]);
    expect(r.cai).toBeCloseTo((1.96 * 0.0003) / Math.sqrt(4), 12);
    expect(r.mean).toBeCloseTo((0.2512 + 0.2507 + 0.2509 + 0.251) / 4, 12);
  });
  it('Dixon: descarta el anómalo y usa t·s/√n', () => {
    const v = [99.1, 99.3, 99.2, 101.5, 99.4, 99.2];
    const r = evaluateReplicates(v, { kind: 'dixon' });
    expect(r.dixon!.reject).toBe(true);
    expect(r.included[3]).toBe(false);
    expect(r.n).toBe(5);
    expect(r.factor).toBeCloseTo(2.7764451051977934, 8);
  });
  it('CV < 1 %: elige el grupo más grande que cumple', () => {
    const v = [0.0391, 0.0393, 0.0392, 0.0420];
    expect(largestSubsetUnderCV(v, 1, 3)).toEqual([0, 1, 2]);
  });
});

describe('Verificación de material volumétrico (V20)', () => {
  it('densidad del agua (Tanaka) a 20 °C = 0,998207 g/mL', () => expect(waterDensity(20)).toBeCloseTo(0.998207, 6));
  it('Z coincide con la tabla de Harris: 1,0020 (15 °C), 1,0029 (20 °C), 1,0040 (25 °C)', () => {
    expect(zFactor(15)).toBeCloseTo(1.002, 4);
    expect(zFactor(20)).toBeCloseTo(1.0029, 4);
    expect(zFactor(25)).toBeCloseTo(1.004, 4);
  });
  it('criterios de conformidad', () => {
    const c = conformity(5.004, 0.003, 5, 5, 0.015, 2.776);
    expect(c.capacityOk).toBe(true);
    expect(c.accuracyValue).toBeCloseTo(0.004 + (2.776 * 0.003) / Math.sqrt(5), 10);
    expect(c.accuracyOk).toBe(true);
  });
});

describe('Valoración potenciométrica: derivadas', () => {
  it('encuentra los dos puntos finales del H3PO4 en una curva simulada', () => {
    const sys = getSystem('fosforico')!;
    // 0,0013 M de H3PO4 en 20 mL con NaOH 0,01 M: PE1 = 2,6 mL; PE2 = 5,2 mL
    const s = { analyte: [{ kind: 'weak' as const, C: 0.0013, system: sys, hAdded: 3 }], Va: 20, titrant: { kind: 'strong-base' as const, C: 0.01, n: 1 } };
    const curve = titrationCurve(s, 8, 400);
    const V: number[] = [];
    const pH: number[] = [];
    for (let v = 0; v <= 8.0001; v += 0.1) {
      const p = curve.reduce((a, b) => (Math.abs(b.V - v) < Math.abs(a.V - v) ? b : a));
      V.push(Number(v.toFixed(2)));
      pH.push(p.pH);
    }
    const eps = findEndpoints(derivativeTable(V, pH));
    expect(eps.length).toBeGreaterThanOrEqual(1);
    expect(Math.abs(eps[0].V - 2.6)).toBeLessThan(0.15);
  });
  it('tabla: V̄ y ΔpH/ΔV', () => {
    const t = derivativeTable([0, 1, 2], [3, 4, 6]);
    expect(t[1].Vbar).toBe(0.5);
    expect(t[1].d1).toBe(1);
    expect(t[2].d1).toBe(2);
    expect(t[2].d2).toBe(1);
  });
});

describe('Modelos de calibración (ejercicio de Cr de la cuaderneta; referencia numpy.linalg.lstsq)', () => {
  const C = [0, 0.5, 1, 2.5, 5, 7.5, 10];
  const A = [0.0248, 0.05446666666666666, 0.09533333333333334, 0.2544, 0.4883333333333333, 0.7556666666666666, 0.9203333333333333];
  it('lineal con ordenada', () => {
    const m = fitModel(C, A, 'lin');
    expect(m.a).toBeCloseTo(0.017137964458804698, 12);
    expect(m.b).toBeCloseTo(0.09333462574044155, 12);
    expect(m.r2).toBeCloseTo(0.9963735191394644, 12);
    expect(m.sres).toBeCloseTo(0.023680218165465165, 12);
  });
  it('lineal sin ordenada', () => {
    const m = fitModel(C, A, 'lin0');
    expect(m.b).toBeCloseTo(0.09574075055187636, 12);
    expect(m.r2).toBeCloseTo(0.9978274602986298, 12);
  });
  it('cuadrático con ordenada', () => {
    const m = fitModel(C, A, 'quad');
    expect(m.a).toBeCloseTo(0.005495491806661261, 12);
    expect(m.b).toBeCloseTo(0.10524563980499263, 12);
    expect(m.c).toBeCloseTo(-0.0012405010020959083, 12);
    expect(m.r2).toBeCloseTo(0.9975420453955611, 12);
  });
  it('cuadrático sin ordenada', () => {
    const m = fitModel(C, A, 'quad0');
    expect(m.b).toBeCloseTo(0.10761683702682212, 12);
    expect(m.c).toBeCloseTo(-0.0014335990548539526, 12);
    expect(m.r2).toBeCloseTo(0.9988657312747433, 12);
    expect(m.sres).toBeCloseTo(0.019832869707037612, 12);
  });
  it('inversa: con el cuadrático, A calculada → concentración de vuelta', () => {
    const m = fitModel(C, A, 'quad0');
    const x = 4.2;
    const yv = m.b * x + m.c * x * x;
    expect(inverseModel(m, yv, 10)).toBeCloseTo(4.2, 10);
  });
});

import * as P from '../lab/practicas';
describe('Fórmulas de la cuaderneta (verificadas a mano)', () => {
  it('P2: masa de Na2CO3 para gastar 8 mL de HCl 0,250 M = 0,1060 g', () => {
    expect(P.massForGasto(8, 0.25, 1 / 2, P.MM.Na2CO3)).toBeCloseTo(0.10599, 5);
  });
  it('P2: volumen de HCl conc. (37 %, 1,18 g/mL) para 1000 mL 0,250 M = 20,9 mL', () => {
    expect(P.concentratedVolume(0.25, 1000, P.MM.HCl, 37, 1.18)).toBeCloseTo(20.88, 2);
  });
  it('P2: resultado: 0,1060 g y 8,00 mL → 0,2500 M (ida y vuelta)', () => {
    expect(P.cHClvsNa2CO3(P.massForGasto(8, 0.25, 0.5, P.MM.Na2CO3), 8)).toBeCloseTo(0.25, 12);
  });
  it('P3: ácido oxálico para 8 mL de NaOH 0,1 M = 0,0504 g → conviene alícuota', () => {
    const m = P.massForGasto(8, 0.1, 1 / 2, P.MM.H2C2O4_2H2O);
    expect(m).toBeCloseTo(0.05043, 5);
    expect(m < P.MIN_MASS_DIRECT).toBe(true);
    expect(P.aliquotSuggestion(m, 100, 10).massStock).toBeCloseTo(0.5043, 4);
  });
  it('P4: % ácido cítrico: 0,05604 g puros gastan 8,00 mL de NaOH 0,1 M → 100 %', () => {
    const m = P.massForGasto(8, 0.1, 1 / 3, P.MM.citrico_H2O);
    expect(P.pctCitrico(0.1, 8, m)).toBeCloseTo(100, 10);
  });
  it('P5: V_T = 5,0 mL da G1 = 3 mL y G2 = 8 mL (0,075 M CO3²⁻, 0,050 M HCO3⁻, HCl 0,125 M)', () => {
    const VT = P.volumeForGasto(3, 0.125, 1, 0.075);
    expect(VT).toBeCloseTo(5, 12);
    const r = P.alcalinidad(0.125, 3, 8, VT);
    expect(r.Na2CO3).toBeCloseTo(0.075, 12);
    expect(r.NaHCO3).toBeCloseTo(0.05, 12);
  });
  it('P6: 0,1000 g de NiSO4·6H2O, blanco 8 mL y retro 2 mL → C(Mg) = 0,0634 M y 100 %', () => {
    const CMg = 0.1 / P.MM.NiSO4_6H2O / 0.006;
    expect(CMg).toBeCloseTo(0.06341, 5);
    expect(P.pctNiquel(CMg, 8, 2, 0.1)).toBeCloseTo(100, 10);
  });
  it('P7: H2O2 10 vol → 0,893 M; con KMnO4 0,02 M y 8 mL se necesitan 0,448 mL de muestra', () => {
    const C = 10 / 11.2;
    const V = P.volumeForGasto(8, 0.02, 5 / 2, C);
    expect(V).toBeCloseTo(0.448, 3);
    expect(P.volH2O2(0.02, 8, V, 1, 1)).toBeCloseTo(10, 10);
    expect(P.volH2O2(0.02, 8, 10, 100, V * 10)).toBeCloseTo(10, 10);
    expect(P.vol2gPer100mL(10)).toBeCloseTo(3.0375, 4);
  });
  it('P8: KIO3 para 8 mL de tiosulfato 0,05 M = 0,01427 g; I2 1 % p-v → 5,08 mL', () => {
    const m = P.massForGasto(8, 0.05, 1 / 6, P.MM.KIO3);
    expect(m).toBeCloseTo(0.014267, 6);
    expect(P.cTiosulfato(m, 8)).toBeCloseTo(0.05, 12);
    const CI2 = 10 / P.MM.I2;
    expect(P.volumeForGasto(8, 0.05, 1 / 2, CI2)).toBeCloseTo(5.076, 3);
    expect(P.cI2(0.05, 8, P.volumeForGasto(8, 0.05, 0.5, CI2))).toBeCloseTo(CI2, 12);
  });
  it('P9 (Volhard): blanco 10,00 mL AgNO3; toma 5,00 mL de KBr 0,15 M', () => {
    expect(P.volumeForGasto(8, 0.125, 1, 0.1)).toBeCloseTo(10, 12);
    expect(P.volumeForGasto(6, 0.125, 1, 0.15)).toBeCloseTo(5, 12);
    expect(P.cBromuro(0.125, 8, 2, 5)).toBeCloseTo(0.15, 12);
  });
  it('P10: ejemplo de la cuaderneta: 3,2989 g → 2,7690 g = 16,1 % de humedad', () => {
    expect(P.pctHumedad(35.2432, 38.5421, 38.0122)).toBeCloseTo(16.06, 2);
  });
  it('P11: 21,23 g de cola con 600 ppm gastan 13,00 mL de NaOH 0,01 M', () => {
    const m = (0.01 * 13 * P.MM.H3PO4 * 1000) / 600;
    expect(m).toBeCloseTo(21.23, 2);
    expect(P.ppmH3PO4(0.01, 13, m)).toBeCloseTo(600, 10);
  });
  it('P13: rango de Beer (A 0,020–0,700; ε = 11 100) = 1,80 × 10⁻⁶ – 6,31 × 10⁻⁵ M (0,10–3,52 ppm Fe)', () => {
    const r = P.beerRange(0.02, 0.7, 11100);
    expect(r.Cmin).toBeCloseTo(1.8018e-6, 9);
    expect(r.Cmax * P.MM.Fe * 1000).toBeCloseTo(3.522, 3);
  });
  it('esquema de dilución: 25 100 ppm → ~2 ppm con pipetas/matraces del laboratorio', () => {
    const s = P.suggestDilutions(25100, 1.8, [1, 2, 3, 5, 10], [25, 50, 100])[0];
    expect(Math.abs(Math.log(s.finalConc / 1.8))).toBeLessThan(0.35);
  });
});
