import { describe, expect, it } from 'vitest';
import { parseFormula, prettyFormula, tryParse } from '../gravimetria/formula';
import { gravimetricFactor, gravimetricResult, toFraction } from '../gravimetria/factor';
import { constantWeight } from '../gravimetria/pesoConstante';
import { changeMoisture, dryToWet, hDryToWet, hWetToDry, moisture, wetToDry } from '../gravimetria/humedad';
import { BUILTIN_LIBRARY, CLASSIC_FACTORS } from '../gravimetria/biblioteca';

const F = (w: string, s: string) => gravimetricFactor(w, s).F;

describe('Masa molar (lector de fórmulas)', () => {
  it('M(BaSO4) ≈ 233,39', () => expect(parseFormula('BaSO4').M).toBeCloseTo(233.39, 2));
  it('hidratos con ·, . y *', () => {
    const a = parseFormula('MgNH4PO4·6H2O').M;
    expect(a).toBeCloseTo(245.40, 2);
    expect(parseFormula('MgNH4PO4.6H2O').M).toBeCloseTo(a, 10);
    expect(parseFormula('MgNH4PO4*6H2O').M).toBeCloseTo(a, 10);
    expect(parseFormula('CaSO4·0,5H2O').M).toBeCloseTo(145.14, 2);
    expect(parseFormula('CuSO4·5H2O').M).toBeCloseTo(249.68, 2);
  });
  it('paréntesis anidados y corchetes', () => {
    expect(parseFormula('Ni(C4H7N2O2)2').M).toBeCloseTo(288.91, 1);
    expect(parseFormula('(NH4)3PO4·12MoO3').M).toBeCloseTo(1876.3, 0);
    expect(parseFormula('K4[Fe(CN)6]').M).toBeCloseTo(368.34, 1);
    expect(parseFormula('Ca3(PO4)2').counts.get('O')).toBe(8);
  });
  it('subíndices Unicode y cargas ignoradas', () => {
    expect(parseFormula('SO₄²⁻').M).toBeCloseTo(96.06, 2);
    expect(parseFormula('SO4 2-').M).toBeCloseTo(96.06, 2);
    expect(parseFormula('SO4^2-').M).toBeCloseTo(96.06, 2);
    expect(parseFormula('PO4(3-)').M).toBeCloseTo(94.97, 2);
    expect(parseFormula('Cl-').M).toBeCloseTo(35.45, 2);
    expect(parseFormula('NH4+').M).toBeCloseTo(18.04, 2);
  });
  it('composición porcentual suma 100', () => {
    const f = parseFormula('Fe2O3');
    expect(f.parts.reduce((s, p) => s + p.pct, 0)).toBeCloseTo(100, 10);
    expect(f.parts.find((p) => p.el === 'Fe')!.pct).toBeCloseTo(69.94, 2);
  });
  it('errores claros', () => {
    for (const bad of ['', 'Xx2', 'Ba(SO4', 'BaSO4)', 'baso4', 'BaSO4·', 'Ba$']) expect(tryParse(bad).ok).toBe(false);
  });
  it('toda la biblioteca se puede leer', () => {
    for (const e of BUILTIN_LIBRARY) expect(tryParse(e.formula).ok, e.formula).toBe(true);
  });
  it('fórmula linda', () => {
    expect(prettyFormula('MgNH4PO4.6H2O')).toBe('MgNH₄PO₄·6H₂O');
    expect(prettyFormula('SO4 2-')).toBe('SO₄²⁻');
  });
});

describe('Factor gravimétrico', () => {
  it('valores pedidos (≈ con 4 decimales: diferencia < 0,0001)', () => {
    const near = (v: number, t: number) => expect(Math.abs(v - t)).toBeLessThan(1e-4 + 1e-12);
    near(F('BaSO4', 'S'), 0.1374);
    near(F('Fe2O3', 'Fe'), 0.6994);
    near(F('Mg2P2O7', 'P2O5'), 0.6377);
    near(F('AgCl', 'Cl'), 0.2474);
    near(F('Ni(C4H7N2O2)2', 'Ni'), 0.2032);
  });
  it('a y b automáticos', () => {
    expect(gravimetricFactor('Fe2O3', 'Fe')).toMatchObject({ element: 'Fe', a: 2, b: 1 });
    expect(gravimetricFactor('Fe3O4', 'Fe2O3')).toMatchObject({ a: 3, b: 2 });
    expect(gravimetricFactor('Mg2P2O7', 'MgO')).toMatchObject({ a: 2, b: 1 });
    expect(gravimetricFactor('BaSO4', 'SO3').element).toBe('S'); // no elige O
    expect(gravimetricFactor('K2PtCl6', 'K2O')).toMatchObject({ a: 1, b: 1 });
    expect(gravimetricFactor('Bi2O3', 'Bi')).toMatchObject({ a: 2, b: 1 });
    expect(gravimetricFactor('(NH4)3PO4·12MoO3', 'P2O5')).toMatchObject({ a: 1, b: 2 });
  });
  it('varios elementos comunes y corrección manual', () => {
    const r = gravimetricFactor('K2PtCl6', 'KCl');
    expect(r.common).toEqual(['K', 'Cl']);
    expect(gravimetricFactor('K2PtCl6', 'KCl', { element: 'Cl' })).toMatchObject({ a: 6, b: 1 });
    expect(gravimetricFactor('BaSO4', 'S', { a: 2, b: 1 }).F).toBeCloseTo(2 * 0.13737, 4);
  });
  it('sólo O en común → usa O', () => expect(gravimetricFactor('CaO', 'O2').element).toBe('O'));
  it('fracciones', () => expect(toFraction(1.5)).toEqual([3, 2]));
  it('todos los factores clásicos tienen elemento común', () => {
    for (const [w, s] of CLASSIC_FACTORS) expect(gravimetricFactor(w, s).element, `${w}→${s}`).not.toBeNull();
  });
  it('cálculo de una réplica con alícuota', () => {
    const r = gravimetricResult({ precipitate: 0.4321, sample: 0.5, F: F('BaSO4', 'SO3'), aliquotFactor: 1 });
    expect(r.pct).toBeCloseTo(29.646, 2);
    expect(gravimetricResult({ precipitate: 0.2, sample: 1, F: 0.5, aliquotFactor: 250 / 25 }).mSought).toBeCloseTo(1, 12);
  });
});

describe('Peso constante', () => {
  it('≤ 0,3 mg entre pesadas consecutivas', () => {
    const c = constantWeight([25.1250, 25.1238, 25.1236, 25.1235]);
    expect(c.reachedAt).toBe(2);
    expect(c.final).toBe(25.1236);
    expect(c.diffsMg[1]).toBeCloseTo(-1.2, 6);
    expect(constantWeight([25.1250, 25.1238]).reachedAt).toBeNull();
    expect(constantWeight([25.1250, 25.1238], 2).reachedAt).toBe(1);
  });
});

describe('Humedad y base seca', () => {
  it('10,000 g → 8,000 g', () => {
    const m = moisture(10, 8);
    expect(m.hBH).toBeCloseTo(20, 10);
    expect(m.hBS).toBeCloseTo(25, 10);
    expect(m.dry).toBeCloseTo(80, 10);
  });
  it('5,00 % b.h. con H = 20 % → 6,25 % b.s. (y vuelta)', () => {
    expect(wetToDry(5, 20)).toBeCloseTo(6.25, 10);
    expect(dryToWet(6.25, 20)).toBeCloseTo(5, 10);
  });
  it('humedad b.h. ↔ b.s.', () => {
    expect(hWetToDry(20)).toBeCloseTo(25, 10);
    expect(hDryToWet(25)).toBeCloseTo(20, 10);
  });
  it('cambio de humedad', () => {
    expect(changeMoisture(5, 20, 0)).toBeCloseTo(6.25, 10);
    expect(changeMoisture(10, 8, 12)).toBeCloseTo(10 * 88 / 92, 10);
  });
  it('errores', () => {
    expect(() => moisture(8, 10)).toThrow();
    expect(() => wetToDry(5, 100)).toThrow();
  });
});
