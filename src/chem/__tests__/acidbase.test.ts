import { describe, it, expect } from 'vitest';
import { alphas, solvePH, bufferCapacity, KW, type Component } from '../acidbase/equilibrium';
import { pHAt, volumeAtPH, equivalencePoints, titrationCurve, analyteVolumeForTitrantVolume, stoichiometricEquivalences, type TitrationSetup } from '../acidbase/titration';
import { designBuffer } from '../acidbase/buffer';
import { evaluateIndicator } from '../acidbase/indicatorCheck';
import { getIndicator } from '../data/indicators';
import { SYSTEMS, getSystem } from '../data/acids';

const acetic = getSystem('acetico')!;
const phosphoric = getSystem('fosforico')!;
const HAc = (C: number): Component => ({ kind: 'weak', C, system: acetic, hAdded: 1 });
const NaOH = (C: number): Component => ({ kind: 'strong-base', C, n: 1 });
const HCl = (C: number): Component => ({ kind: 'strong-acid', C, n: 1 });

describe('pH de soluciones simples', () => {
  it('HCl 0,1 M → pH 1,00', () => {
    expect(solvePH([HCl(0.1)])).toBeCloseTo(1.0, 4);
  });
  it('NaOH 0,01 M → pH 12,00', () => {
    expect(solvePH([NaOH(0.01)])).toBeCloseTo(12.0, 4);
  });
  it('HCl 1,0 × 10⁻⁸ M → pH 6,98 (no 8: se incluye la autoionización del agua)', () => {
    expect(solvePH([HCl(1e-8)])).toBeCloseTo(6.978, 3);
  });
  it('agua pura → pH 7,00', () => {
    expect(solvePH([])).toBeCloseTo(7.0, 6);
  });
  it('ácido acético 0,1 M (pKa 4,76) → pH ≈ 2,88', () => {
    const pH = solvePH([HAc(0.1)]);
    expect(pH).toBeCloseTo(2.88, 2);
    // comparación con la cuadrática exacta (despreciando sólo [OH-], que es ~1e-11)
    const Ka = 10 ** -4.76;
    const h = (-Ka + Math.sqrt(Ka * Ka + 4 * Ka * 0.1)) / 2;
    expect(pH).toBeCloseTo(-Math.log10(h), 6);
  });
  it('acetato de sodio 0,05 M → pH ≈ 8,72 (exacto con pKa 4,76: 8,7295)', () => {
    const pH = solvePH([{ kind: 'weak', C: 0.05, system: acetic, hAdded: 0 }]);
    // pOH = ½(pKb − log C) = ½(9,24 + 1,301) = 5,2705 → pH 8,7295. Los libros que usan pKa 4,74 dan 8,72.
    expect(Math.abs(pH - 8.72)).toBeLessThan(0.015);
    expect(pH).toBeCloseTo(8.7295, 3);
  });
  it('NH3 0,1 M (pKa NH4+ 9,25) → pH 11,12', () => {
    const pH = solvePH([{ kind: 'weak', C: 0.1, system: getSystem('amonio')!, hAdded: 0 }]);
    expect(pH).toBeCloseTo(11.12, 2);
  });
  it('NaH2PO4 0,1 M (anfótero) → pH ≈ (pKa1+pKa2)/2 = 4,68 (aprox.)', () => {
    const pH = solvePH([{ kind: 'weak', C: 0.1, system: phosphoric, hAdded: 2 }]);
    // la fórmula exacta da algo menor que 4,68 por la disociación del H3PO4 (pKa1 bajo)
    expect(Math.abs(pH - 4.68)).toBeLessThan(0.1);
  });
  it('buffer acético/acetato 0,1/0,1 M → pH = pKa (4,76)', () => {
    const pH = solvePH([HAc(0.1), { kind: 'weak', C: 0.1, system: acetic, hAdded: 0 }]);
    expect(pH).toBeCloseTo(4.76, 2);
  });
  it('no se rompe con concentraciones extremas', () => {
    expect(solvePH([HCl(10)])).toBeCloseTo(-1, 3);
    expect(solvePH([NaOH(5)])).toBeCloseTo(14 + Math.log10(5), 3);
    expect(Number.isFinite(solvePH([HAc(1e-12)]))).toBe(true);
  });
});

describe('Fracciones de especies (α)', () => {
  it('suman 1 a todo pH, para todos los sistemas de la biblioteca', () => {
    for (const sys of SYSTEMS) {
      for (let pH = -1; pH <= 15; pH += 0.1) {
        const sum = alphas(-pH, sys.pKa).reduce((a, b) => a + b, 0);
        expect(Math.abs(sum - 1)).toBeLessThan(1e-12);
      }
    }
  });
  it('en pH = pKa las dos especies vecinas valen 0,5 (monoprótico)', () => {
    const a = alphas(-4.76, [4.76]);
    expect(a[0]).toBeCloseTo(0.5, 10);
    expect(a[1]).toBeCloseTo(0.5, 10);
  });
  it('H3PO4 a pH 7,20: α(H2PO4-) ≈ α(HPO4 2-)', () => {
    const a = alphas(-7.2, phosphoric.pKa);
    expect(a[1]).toBeCloseTo(a[2], 3);
  });
});

describe('Titulación: 25 mL ácido acético 0,1 M con NaOH 0,1 M', () => {
  const s: TitrationSetup = { analyte: [HAc(0.1)], Va: 25, titrant: NaOH(0.1) };
  const { eq, half } = equivalencePoints(s);
  it('equivalencia en 25,00 mL', () => {
    expect(eq).toHaveLength(1);
    expect(eq[0].V).toBeCloseTo(25, 10);
  });
  it('pH en la equivalencia ≈ 8,72 (exacto: 8,7295)', () => {
    expect(Math.abs(eq[0].pH - 8.72)).toBeLessThan(0.015);
  });
  it('semiequivalencia (12,5 mL): pH = pKa = 4,76', () => {
    expect(half[0].V).toBeCloseTo(12.5, 10);
    expect(half[0].pH).toBeCloseTo(4.76, 2);
  });
  it('pH inicial ≈ 2,88', () => {
    expect(pHAt(s, 0)).toBeCloseTo(2.88, 2);
  });
  it('el punto final es nítido', () => {
    expect(eq[0].sharpness).toBe('nitido');
  });
  it('la fórmula inversa V(pH) coincide con el cálculo directo pH(V)', () => {
    for (const V of [1, 5, 12.5, 20, 24.9, 25, 25.1, 30, 45]) {
      const pH = pHAt(s, V);
      expect(volumeAtPH(s, pH)!).toBeCloseTo(V, 6);
    }
  });
  it('la curva es monótona creciente y la derivada tiene su máximo en 25 mL', () => {
    const c = titrationCurve(s, 50);
    for (let i = 1; i < c.length; i++) expect(c[i].pH).toBeGreaterThanOrEqual(c[i - 1].pH - 1e-9);
    let best = c[0];
    for (const p of c) if ((p.d1 ?? 0) > (best.d1 ?? 0)) best = p;
    expect(Math.abs(best.V - 25)).toBeLessThan(0.05);
  });
  it('fenolftaleína: error de titulación pequeño y "excelente"', () => {
    const r = evaluateIndicator(s, getIndicator('fenolftaleina')!, eq, 50);
    expect(Math.abs(r.errorPct!)).toBeLessThan(0.1);
    expect(r.verdict).toBe('excelente');
  });
  it('naranja de metilo: no sirve (vira mucho antes)', () => {
    const r = evaluateIndicator(s, getIndicator('naranja-metilo')!, eq, 50);
    expect(r.verdict).toBe('no-recomendado');
  });
});

describe('Titulación ácido fuerte – base fuerte', () => {
  const s: TitrationSetup = { analyte: [HCl(0.1)], Va: 50, titrant: NaOH(0.1) };
  it('equivalencia en 50 mL con pH 7,00', () => {
    const { eq } = equivalencePoints(s);
    expect(eq[0].V).toBeCloseTo(50, 10);
    expect(eq[0].pH).toBeCloseTo(7.0, 6);
  });
  it('pH a 49,9 mL y 50,1 mL (valores de libro: 4,00 y 10,00)', () => {
    expect(pHAt(s, 49.9)).toBeCloseTo(4.0, 2);
    expect(pHAt(s, 50.1)).toBeCloseTo(10.0, 2);
  });
});

describe('Titulación de base débil con ácido fuerte (NH3 con HCl)', () => {
  const s: TitrationSetup = { analyte: [{ kind: 'weak', C: 0.1, system: getSystem('amonio')!, hAdded: 0 }], Va: 25, titrant: HCl(0.1) };
  it('equivalencia en 25 mL, pH ácido (≈ 5,27)', () => {
    const { eq, half, direction } = equivalencePoints(s);
    expect(direction).toBe('acid');
    expect(eq[0].V).toBeCloseTo(25, 10);
    expect(eq[0].pH).toBeCloseTo(5.28, 1);
    expect(half[0].pH).toBeCloseTo(9.25, 2);
  });
});

describe('Ácido fosfórico (triprótico) con NaOH', () => {
  const s: TitrationSetup = { analyte: [{ kind: 'weak', C: 0.1, system: phosphoric, hAdded: 3 }], Va: 25, titrant: NaOH(0.1) };
  const { eq } = equivalencePoints(s);
  it('tres equivalencias estequiométricas: 25, 50, 75 mL', () => {
    expect(eq.map((e) => e.V)).toEqual([25, 50, 75].map((v) => expect.closeTo(v, 8)));
  });
  it('la 1ª y 2ª se detectan; la 3ª no (pKa3 = 12,35)', () => {
    expect(eq[0].sharpness).not.toBe('no-detectable');
    expect(eq[1].sharpness).not.toBe('no-detectable');
    expect(eq[2].sharpness).toBe('no-detectable');
  });
  it('pH en 1ª equivalencia ≈ 4,7 y en la 2ª ≈ 9,7', () => {
    expect(Math.abs(eq[0].pH - 4.7)).toBeLessThan(0.15);
    expect(Math.abs(eq[1].pH - 9.7)).toBeLessThan(0.15);
  });
});

describe('Mezcla HCl + ácido acético con NaOH', () => {
  const s: TitrationSetup = { analyte: [HCl(0.05), HAc(0.05)], Va: 20, titrant: NaOH(0.1) };
  it('primero se titula el HCl (10 mL) y luego el acético (20 mL)', () => {
    const { eq } = equivalencePoints(s);
    expect(eq[0].V).toBeCloseTo(10, 8);
    expect(eq[1].V).toBeCloseTo(20, 8);
  });
});

describe('Diseñador de buffers', () => {
  it('acetato pH 4,76, C = 0,1 M: mezcla casi 50/50', () => {
    const d = designBuffer(acetic, 4.76, 0.1);
    expect(d.feasible).toBe(true);
    expect(d.xBase / d.C).toBeCloseTo(0.5, 2);
  });
  it('el buffer diseñado da exactamente el pH buscado', () => {
    for (const [pH, C] of [[7.0, 0.05], [7.4, 0.1], [6.5, 0.02]] as const) {
      const d = designBuffer(phosphoric, pH, C);
      const real = solvePH([
        { kind: 'weak', C: d.xAcid, system: phosphoric, hAdded: d.pair.hAcid },
        { kind: 'weak', C: d.xBase, system: phosphoric, hAdded: d.pair.hBase },
      ]);
      expect(real).toBeCloseTo(pH, 8);
    }
  });
  it('fosfato pH 7,2 elige pKa2', () => {
    expect(designBuffer(phosphoric, 7.2, 0.1).pair.k).toBe(1);
  });
  it('capacidad buffer: máximo de β en pH ≈ pKa, valor ≈ 2,303·C/4', () => {
    const comps: Component[] = [HAc(0.1)];
    const beta = bufferCapacity(comps, 4.76);
    const h = 10 ** -4.76;
    expect(beta).toBeCloseTo(Math.LN10 * (0.1 / 4 + h + KW / h), 8);
  });
});

describe('Cálculo inverso: volumen de analito para un gasto de bureta dado', () => {
  it('acético 0,1 M con NaOH 0,1 M: para gastar 8 mL hay que tomar 8 mL', () => {
    expect(analyteVolumeForTitrantVolume([HAc(0.1)], NaOH(0.1), 8)).toBeCloseTo(8, 12);
  });
  it('HCl 0,05 M con NaOH 0,1 M: gastar 8 mL → 16 mL de analito', () => {
    expect(analyteVolumeForTitrantVolume([HCl(0.05)], NaOH(0.1), 8)).toBeCloseTo(16, 12);
  });
  it('H3PO4 0,1 M con NaOH 0,1 M: 8 mL en el PE1 → 8 mL; 8 mL en el PE2 → 4 mL', () => {
    const H3PO4: Component = { kind: 'weak', C: 0.1, system: phosphoric, hAdded: 3 };
    expect(analyteVolumeForTitrantVolume([H3PO4], NaOH(0.1), 8, 1)).toBeCloseTo(8, 12);
    expect(analyteVolumeForTitrantVolume([H3PO4], NaOH(0.1), 8, 2)).toBeCloseTo(4, 12);
    expect(analyteVolumeForTitrantVolume([H3PO4], NaOH(0.1), 8, 4)).toBeNull();
  });
  it('ida y vuelta: con el Va calculado, la equivalencia cae exactamente en el gasto pedido', () => {
    const comps = [HCl(0.05), HAc(0.05)];
    const Va = analyteVolumeForTitrantVolume(comps, NaOH(0.1), 8, 2)!;
    expect(stoichiometricEquivalences({ analyte: comps, Va, titrant: NaOH(0.1) })[1]).toBeCloseTo(8, 12);
    expect(equivalencePoints({ analyte: comps, Va, titrant: NaOH(0.1) }).eq[1].V).toBeCloseTo(8, 12);
  });
  it('titulante sin reacción → null', () => {
    expect(analyteVolumeForTitrantVolume([HCl(0.1)], HCl(0.1), 8)).toBeNull();
  });
});
