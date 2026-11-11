/**
 * Pruebas de la fase 2: redox, EDTA, precipitación y solubilidad.
 * Referencias: cálculos a mano con las fórmulas de libro (Skoog, Harris).
 */
import { describe, it, expect } from 'vitest';
import { potentialAt, equivalenceVolume, textbookEquivalencePotential, type RedoxTitration } from '../redox/redox';
import { getCouple } from '../data/redox';
import { alphaY4, edtaPoint, edtaEquivalence, alphaMetal, minimumPH } from '../complex/edta';
import { argentoPoint, argentoEquivalences, mohrEndpointPAg } from '../solubility/precipitation';
import { solubilityPure, solubilityCommonIon, solubilityAtPH, willPrecipitate } from '../solubility/solubility';

const Fe = getCouple('Fe')!;
const Ce = getCouple('Ce')!;
const MnO4 = getCouple('MnO4')!;
const Cr = getCouple('Cr2O7')!;
const I3 = getCouple('I3')!;
const S4O6 = getCouple('S4O6')!;

describe('Redox: 50,00 mL Fe²⁺ 0,0500 M con Ce⁴⁺ 0,1000 M (Skoog)', () => {
  const t: RedoxTitration = { analyte: Fe, analyteForm: 'red', Ca: 0.05, Va: 50, titrant: Ce, Ct: 0.1, logH: 0 };
  it('equivalencia en 25,00 mL', () => expect(equivalenceVolume(t)).toBeCloseTo(25, 10));
  it('E a 5,00 mL = 0,644 V (Nernst del Fe: 0,68 − 0,05916·log 4)', () => {
    expect(potentialAt(t, 5)).toBeCloseTo(0.68 - 0.05916 * Math.log10(4), 5);
  });
  it('E en la equivalencia = (0,68 + 1,44)/2 = 1,06 V', () => {
    expect(potentialAt(t, 25)).toBeCloseTo(1.06, 5);
    expect(textbookEquivalencePotential(t)).toBeCloseTo(1.06, 10);
  });
  it('E a 25,10 mL = 1,44 − 0,05916·log(250) = 1,298 V', () => {
    expect(potentialAt(t, 25.1)).toBeCloseTo(1.44 - 0.05916 * Math.log10(250), 4);
  });
  it('curva creciente', () => {
    let prev = -Infinity;
    for (let V = 1; V <= 50; V += 0.5) {
      const E = potentialAt(t, V);
      expect(E).toBeGreaterThan(prev);
      prev = E;
    }
  });
});

describe('Redox: Fe²⁺ con MnO₄⁻ ([H⁺] = 1 M)', () => {
  const t: RedoxTitration = { analyte: Fe, analyteForm: 'red', Ca: 0.1, Va: 25, titrant: MnO4, Ct: 0.02, logH: 0 };
  it('equivalencia: 25 mL × 0,1 M / (5 × 0,02 M) = 25 mL', () => expect(equivalenceVolume(t)).toBeCloseTo(25, 10));
  it('E_eq = (0,68 + 5·1,51)/6 = 1,372 V; el cálculo exacto coincide', () => {
    expect(textbookEquivalencePotential(t)).toBeCloseTo((0.68 + 5 * 1.51) / 6, 10);
    expect(potentialAt(t, 25)).toBeCloseTo((0.68 + 5 * 1.51) / 6, 5);
  });
  it('a pH 1 el E_eq baja 8·0,05916/6 V', () => {
    const t1 = { ...t, logH: -1 };
    expect(potentialAt(t1, 25)).toBeCloseTo((0.68 + 5 * 1.51) / 6 - (8 * 0.05916) / 6, 5);
  });
});

describe('Redox: Fe²⁺ con Cr₂O₇²⁻ (estequiometría 6:1, 2 Cr³⁺)', () => {
  const t: RedoxTitration = { analyte: Fe, analyteForm: 'red', Ca: 0.1, Va: 25, titrant: Cr, Ct: 0.1 / 6, logH: 0 };
  it('equivalencia en 25 mL', () => expect(equivalenceVolume(t)).toBeCloseTo(25, 8));
  it('después de la equivalencia el potencial lo fija el dicromato (Nernst con [Cr³⁺]²)', () => {
    const V = 30;
    const Vt = 25 + V;
    const crExc = ((0.1 / 6) * 5) / Vt; // mmol en exceso / mL
    const cr3 = (2 * (0.1 / 6) * 25) / Vt;
    const expected = 1.33 - (0.05916 / 6) * Math.log10((cr3 * cr3) / crExc);
    expect(potentialAt(t, V)).toBeCloseTo(expected, 4);
  });
});

describe('Redox: I₃⁻ con S₂O₃²⁻ (yodometría, [I⁻] = 0,1 M)', () => {
  const t: RedoxTitration = { analyte: { ...I3, logF: 3 * -1 }, analyteForm: 'ox', Ca: 0.025, Va: 25, titrant: S4O6, Ct: 0.1, logH: -7 };
  it('equivalencia: 0,625 mmol I₃⁻ necesitan 1,25 mmol S₂O₃²⁻ = 12,5 mL', () => expect(equivalenceVolume(t)).toBeCloseTo(12.5, 10));
  it('antes de la equivalencia: Nernst del yodo con [I⁻] constante', () => {
    const V = 5; // consumidas 0,25 mmol de I3-
    const I3left = (0.625 - 0.25) / 30;
    const expected = 0.536 - (0.05916 / 2) * Math.log10(Math.pow(0.1, 3) / I3left);
    expect(potentialAt(t, V)).toBeCloseTo(expected, 5);
  });
  it('la curva desciende (se agrega reductor)', () => {
    expect(potentialAt(t, 15)).toBeLessThan(potentialAt(t, 10));
  });
});

describe('EDTA', () => {
  it('α(Y⁴⁻) coincide con la tabla de Harris (μ = 0,1)', () => {
    expect(alphaY4(10)).toBeCloseTo(0.30, 2);
    expect(alphaY4(11)).toBeCloseTo(0.81, 2);
    expect(alphaY4(12)).toBeCloseTo(0.98, 2);
    expect(alphaY4(7) / 3.8e-4).toBeCloseTo(1, 1);
  });
  const s = { logKf: 10.65, pH: 10, CM: 0.04, VM: 50, CY: 0.08 };
  it('Ca²⁺ 0,0400 M (50 mL) con EDTA 0,0800 M a pH 10: V_eq = 25 mL', () => expect(edtaEquivalence(s)).toBeCloseTo(25, 10));
  it('pCa antes de la equivalencia (5 mL): (2,0 − 0,4) mmol / 55 mL → 1,536', () => {
    expect(edtaPoint(s, 5).pM).toBeCloseTo(-Math.log10(1.6 / 55), 3);
  });
  it('pCa en la equivalencia: √(C_CaY / K′) → 5,85', () => {
    const K = 10 ** 10.65 * alphaY4(10);
    const C = 2 / 75;
    // exacto (cuadrática) vs aproximación: difieren < 0,001
    expect(edtaPoint(s, 25).pM).toBeCloseTo(-Math.log10(Math.sqrt(C / K)), 2);
  });
  it('pCa después (26 mL): [Ca] = [CaY]/(K′·[Y′])', () => {
    const K = 10 ** 10.65 * alphaY4(10);
    const CaY = 2 / 76;
    const Y = 0.08 / 76;
    expect(edtaPoint(s, 26).pM).toBeCloseTo(-Math.log10(CaY / (K * Y)), 3);
  });
  it('α_M con NH₃: Zn²⁺, [NH₃] = 0,1 M → 1/(1+Σβ[L]ⁿ)', () => {
    const b = [2.18, 4.43, 6.74, 8.7];
    const exp = 1 / (1 + b.reduce((acc, lb, i) => acc + 10 ** lb * 0.1 ** (i + 1), 0));
    expect(alphaMetal(b, 0.1)).toBeCloseTo(exp, 12);
  });
  it('pH mínimo para Ca²⁺ (log K′ ≥ 8) ≈ 7,5–8', () => {
    const p = minimumPH(10.65)!;
    expect(p).toBeGreaterThan(7.3);
    expect(p).toBeLessThan(8.2);
  });
});

describe('Argentometría: 50,00 mL Cl⁻ 0,0500 M con AgNO₃ 0,1000 M (Skoog)', () => {
  const s = { halides: [{ C: 0.05, Ksp: 1.82e-10, name: 'Cl⁻' }], Vx: 50, CAg: 0.1 };
  it('V_eq = 25 mL; pAg_eq = ½·pKsp = 4,87', () => {
    const e = argentoEquivalences(s);
    expect(e[0].V).toBeCloseTo(25, 10);
    expect(e[0].pAg).toBeCloseTo(-0.5 * Math.log10(1.82e-10), 6);
  });
  it('pAg a 10 mL = 8,14', () => {
    expect(argentoPoint(s, 10).pAg).toBeCloseTo(-Math.log10(1.82e-10 / (1.5 / 60)), 4);
  });
  it('pAg a 26 mL = 2,88', () => {
    expect(argentoPoint(s, 26).pAg).toBeCloseTo(-Math.log10(0.1 / 76), 3);
  });
  it('Mohr con CrO₄²⁻ 0,005 M: pAg final ≈ 4,81', () => {
    expect(mohrEndpointPAg(0.005)).toBeCloseTo(-0.5 * Math.log10(1.2e-12 / 0.005), 10);
  });
  it('mezcla I⁻ + Cl⁻: precipita primero AgI', () => {
    const m = { halides: [{ C: 0.05, Ksp: 1.82e-10, name: 'Cl⁻' }, { C: 0.05, Ksp: 8.3e-17, name: 'I⁻' }], Vx: 50, CAg: 0.1 };
    const e = argentoEquivalences(m);
    expect(e[0].name).toBe('I⁻');
    expect(e[0].V).toBeCloseTo(25, 10);
    expect(e[1].V).toBeCloseTo(50, 10);
  });
});

describe('Solubilidad', () => {
  it('AgCl en agua: s = √Ksp = 1,35 × 10⁻⁵ M', () => expect(solubilityPure(1.82e-10, 1, 1)).toBeCloseTo(Math.sqrt(1.82e-10), 15));
  it('CaF₂ en agua: s = (Ksp/4)^(1/3) = 2,14 × 10⁻⁴ M', () => expect(solubilityPure(3.9e-11, 1, 2) / 2.136e-4).toBeCloseTo(1, 3));
  it('AgCl en NaCl 0,1 M: s ≈ Ksp/0,1 (exacto)', () => {
    const s = solubilityCommonIon(1.82e-10, 1, 1, 0, 0.1);
    expect(s * (0.1 + s)).toBeCloseTo(1.82e-10, 20);
    expect(s / 1.82e-9).toBeCloseTo(1, 6);
  });
  it('sin ion común coincide con agua pura', () => {
    expect(solubilityCommonIon(3.9e-11, 1, 2, 0, 0) / solubilityPure(3.9e-11, 1, 2)).toBeCloseTo(1, 8);
  });
  it('CaF₂ es más soluble a pH ácido; a pH alto tiende al valor en agua', () => {
    expect(solubilityAtPH(3.9e-11, 1, 2, 'fluorhidrico', 2)).toBeGreaterThan(5 * solubilityPure(3.9e-11, 1, 2));
    expect(solubilityAtPH(3.9e-11, 1, 2, 'fluorhidrico', 10) / solubilityPure(3.9e-11, 1, 2)).toBeCloseTo(1, 4);
  });
  it('Mg(OH)₂ a pH 10: s = Ksp/[OH⁻]² = 7,1 × 10⁻⁴ M', () => expect(solubilityAtPH(7.1e-12, 1, 2, 'OH', 10)).toBeCloseTo(7.1e-4, 10));
  it('¿precipita? 10 mL AgNO₃ 1e-4 M + 10 mL NaCl 1e-4 M → Q = 2,5e-9 > Ksp, sí', () => {
    const r = willPrecipitate(1.82e-10, 1, 1, 1e-4, 10, 1e-4, 10);
    expect(r.Q).toBeCloseTo(2.5e-9, 20);
    expect(r.precipitates).toBe(true);
    expect(r.Meq * r.Xeq).toBeCloseTo(1.82e-10, 20);
  });
  it('¿precipita? 1e-6 M + 1e-6 M → no', () => {
    expect(willPrecipitate(1.82e-10, 1, 1, 1e-6, 10, 1e-6, 10).precipitates).toBe(false);
  });
  it('Fe(OH)₃: precipitación casi total sin perder precisión', () => {
    const r = willPrecipitate(2e-39, 1, 3, 0.01, 10, 0.1, 10);
    expect(r.Meq * r.Xeq ** 3 / 2e-39).toBeCloseTo(1, 6);
  });
});
