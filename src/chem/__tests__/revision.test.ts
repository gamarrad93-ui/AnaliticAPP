import { describe, expect, it } from 'vitest';
import { PROBLEMAS, INFO_RP, getProblema } from '../../data/revision-practica';
import { M, masaOAlicuota, solucion, sortear, tomaVolumen } from '../revision/motor';
import { codigoSorteo, leerCodigo } from '../revision/azar';
import { quitarAnomalo, veredictoRP1, veredictoRP2 } from '../revision/veredicto';
import { DIXON_Q, grubbsCritical } from '../stats/outliers';

const val = (s: ReturnType<typeof solucion>, re: RegExp) => s.calculos.find((c) => re.test(c.label))!.valor;

describe('Pool de problemas', () => {
  it('14 problemas en la 1ª RP y 7 en la 2ª', () => {
    expect(PROBLEMAS.filter((p) => p.rp === 1)).toHaveLength(14);
    expect(PROBLEMAS.filter((p) => p.rp === 2)).toHaveLength(7);
  });
  it('tiempos de diagramación de la letra', () => {
    expect(INFO_RP[1].minutosDiagramacion).toBe(20);
    expect(INFO_RP[2].minutosDiagramacion).toBe(25);
  });
  it('todos los problemas tienen solución de referencia sin errores', () => {
    for (const p of PROBLEMAS) {
      const s = solucion(p);
      expect(s.calculos.length, p.id).toBeGreaterThan(0);
      for (const c of s.calculos) expect(Number.isFinite(c.valor), `${p.id} ${c.label}`).toBe(true);
    }
  });
});

describe('1ª RP — problema 1 (NaHCO3), verificado a mano', () => {
  // HCl 0,25 M, G = 8,00 mL → n = 2,000e-3 mol
  // Na2CO3: m = 2,000e-3/2 · 105,99 = 0,10599 g
  // NaHCO3 (pureza 95 %): m = 2,000e-3 · 84,007 / 0,95 = 0,17686 g
  const s = solucion(getProblema('1-01')!);
  it('masas', () => {
    expect(val(s, /Na2CO3/)).toBeCloseTo(0.10599, 4);
    expect(val(s, /Masa de muestra/)).toBeCloseTo(0.17686, 4);
  });
  it('pH en el PE en zona ácida (heliantina)', () => {
    expect(s.pHeq![0].pH).toBeGreaterThan(3.5);
    expect(s.pHeq![0].pH).toBeLessThan(5);
  });
});

describe('1ª RP — tomas de volumen', () => {
  it('NH3 1,0 M con HCl 0,25 M → dilución y alícuota con G ≈ 8 mL', () => {
    const t = tomaVolumen(1.0, 0.25, 1, 8);
    expect(Math.abs(t.G - 8)).toBeLessThan(0.5);
  });
  it('dureza 1060 mg CaCO3/L con EDTA 0,02 M', () => {
    const s = solucion(getProblema('1-07')!);
    // n EDTA = 1,6e-4 mol → 16,01 mg CaCO3 → 15,10 mL de agua
    expect(val(s, /Volumen exacto/)).toBeCloseTo(15.1, 1);
  });
  it('masas chicas → solución y alícuotas', () => {
    expect(masaOAlicuota(0.0063)).toMatchObject({ directa: false, matraz: 250, alicuota: 10 });
    expect(masaOAlicuota(0.2).directa).toBe(true);
  });
});

describe('2ª RP — valores verificados a mano (coinciden con la planilla P1–P7)', () => {
  it('P1 ácido ascórbico: Na2S2O3 0,25 M; KIO3 0,07133 g; ác. ascórbico 0,13209 g', () => {
    const s = solucion(getProblema('2-01')!);
    expect(val(s, /Concentración de Na2S2O3/)).toBeCloseTo(0.25, 10);
    expect(val(s, /Masa de KIO3/)).toBeCloseTo(0.071333, 4);
    expect(val(s, /ácido ascórbico/)).toBeCloseTo(0.13209, 4);
  });
  it('P2 NaClO: Na2S2O3 0,14104 M; KIO3 0,04024 g; KI 0,2810 g; H2SO4 0,2351 mL', () => {
    const s = solucion(getProblema('2-02')!);
    expect(val(s, /Concentración de Na2S2O3/)).toBeCloseTo(0.14104, 4);
    expect(val(s, /Masa de KIO3/)).toBeCloseTo(0.040244, 4);
    expect(val(s, /Masa de KI \(1,5/)).toBeCloseTo(0.28096, 3);
    expect(val(s, /H2SO4/)).toBeCloseTo(0.23507, 3);
  });
  it('P3 MgCl2·6H2O: NaCl 0,04675 g; muestra 0,08298 g', () => {
    const s = solucion(getProblema('2-03')!);
    expect(val(s, /NaCl por valoración/)).toBeCloseTo(0.046752, 5);
    expect(val(s, /Masa de muestra/)).toBeCloseTo(0.08298, 4);
  });
  it('P4 KSCN: alícuota 6,40 mL', () => expect(val(solucion(getProblema('2-04')!), /Alícuota de KSCN/)).toBeCloseTo(6.4, 10));
  it('P5 cítrico: G = 30 mL; oxálico 0,006303 g', () => {
    const s = solucion(getProblema('2-05')!);
    expect(s.gastos.find((g) => /cítrico/.test(g.etapa))!.G).toBeCloseTo(30, 10);
    expect(val(s, /H2C2O4·2H2O por valoración/)).toBeCloseTo(0.0063035, 5);
  });
  it('P6 paracetamol: 4000 mg/L, factor 400', () => {
    const s = solucion(getProblema('2-06')!);
    expect(val(s, /aproximada/)).toBeCloseTo(4000, 6);
    expect(val(s, /Factor/)).toBeCloseTo(400, 6);
  });
  it('P7 Fe: 25 112 mg/L, factor 12 556', () => {
    const s = solucion(getProblema('2-07')!);
    expect(val(s, /aproximada de Fe/)).toBeCloseTo((125 * 1000 * M('Fe')) / M('FeSO4·7H2O'), 6);
    expect(Math.abs(val(s, /aproximada de Fe/) - 25111.5)).toBeLessThan(2);
  });
});

describe('Sorteo con semilla', () => {
  it('el mismo código da el mismo problema', () => {
    const a = sortear('1-07', 4821);
    const b = sortear('1-07', 4821);
    expect(a).toEqual(b);
    expect(sortear('1-07', 4822)).not.toEqual(a);
  });
  it('código legible', () => {
    expect(codigoSorteo('2-03', 123)).toBe('2-03-123');
    expect(leerCodigo('2-3-123')).toEqual({ problemaId: '2-03', seed: 123 });
    expect(leerCodigo('basura')).toBeNull();
  });
  it('valores realistas', () => {
    for (const p of PROBLEMAS) for (let k = 1; k <= 20; k++) {
      const s = sortear(p.id, k);
      expect(s.replicasAnalito.length).toBeGreaterThanOrEqual(3);
      if (s.declarado.minimo) expect(s.real.analito).toBeGreaterThan(s.declarado.valor);
      if (s.titulante) expect(Math.abs(s.real.Ct! / s.titulante.C - 1)).toBeLessThanOrEqual(0.04);
    }
  });
});

describe('Veredicto con los criterios oficiales', () => {
  it('1ª RP: σR, Dixon y CV', () => {
    const p = getProblema('1-01')!;
    if (p.criterios.tipo !== 'rp1') throw new Error();
    const v = veredictoRP1(p.criterios, [0.2512, 0.2515, 0.2509, 0.2540], [99.1, 99.3, 99.2, 97.0]);
    // Ir = 2,8·0,0003 = 0,00084 → 0,2509–0,2515 concuerdan; 0,2540 no
    expect(v.titulante.incluidos).toEqual([true, true, true, false]);
    expect(v.titulante.estado).toBe('cumple');
    expect(v.titulante.cai).toBeCloseTo((1.96 * 0.0003) / Math.sqrt(3), 12);
    // Dixon: Q = (99,1 − 97,0)/(99,3 − 97,0) = 0,913 > 0,829 (n = 4) → se descarta 97,0
    expect(v.analito.incluidos).toEqual([true, true, true, false]);
    expect(v.analito.estado).toBe('cumple');
  });
  it('1ª RP sin σR en la tabla (EDTA) → anómalos y CV < 2 % para el valorante', () => {
    const p = getProblema('1-06')!;
    if (p.criterios.tipo !== 'rp1') throw new Error();
    // EDTA: la tabla no trae σR; criterio indicado por el docente = sin anómalos (Dixon o Grubbs) y CV < 2 %
    expect(p.criterios.cvValorante).toBe(2);
    expect(veredictoRP1(p.criterios, [0.02, 0.0201, 0.0199], [99, 99.5, 99.2]).titulante.estado).toBe('cumple');
    expect(veredictoRP1(p.criterios, [0.02, 0.0201, 0.0199], [99, 99.5, 99.2], 'grubbs').titulante.estado).toBe('cumple');
    expect(veredictoRP1(p.criterios, [0.0200, 0.0210, 0.0190], [99, 99.5, 99.2]).titulante.estado).toBe('no-cumple');
    const conAnomalo = veredictoRP1(p.criterios, [0.02000, 0.02001, 0.01999, 0.02002, 0.02300], [99, 99.5, 99.2]).titulante;
    expect(conAnomalo.estado).toBe('cumple');
    expect(conAnomalo.incluidos).toEqual([true, true, true, true, false]);
    expect(veredictoRP1({ ...p.criterios, cvValorante: undefined }, [0.02, 0.0201, 0.0199], [99, 99.5, 99.2]).titulante.estado).toBe('sin-criterio');
  });
  it('2ª RP: estandarización ideal/aceptable y analito', () => {
    const p = getProblema('2-03')!;
    if (p.criterios.tipo !== 'rp2') throw new Error();
    expect(veredictoRP2(p.criterios, [0.1001, 0.1002, 0.1000], [98.5, 98.9, 98.7]).titulante!.estado).toBe('ideal');
    expect(veredictoRP2(p.criterios, [0.1000, 0.1010, 0.1008], [98.5, 98.9, 98.7]).titulante!.estado).toBe('aceptable');
    expect(veredictoRP2(p.criterios, [0.100, 0.103, 0.097], [98.5, 98.9, 98.7]).titulante!.estado).toBe('no-cumple');
    expect(veredictoRP2(p.criterios, [0.1001, 0.1002, 0.1000], [98.5, 98.9, 98.7]).analito.estado).toBe('ideal');
  });
  it('2ª RP espectrofotometría: CV < 10 %', () => {
    const p = getProblema('2-06')!;
    if (p.criterios.tipo !== 'rp2') throw new Error();
    expect(veredictoRP2(p.criterios, [], [10.1, 10.5, 9.8]).analito.estado).toBe('cumple');
    expect(veredictoRP2(p.criterios, [], [8, 10.5, 12]).analito.estado).toBe('no-cumple');
  });
  it('Grubbs', () => expect(quitarAnomalo([10.0, 10.1, 10.05, 10.02, 11.5], 'grubbs').idx).toEqual([0, 1, 2, 3]));
});

describe('Valores críticos (contra tablas publicadas)', () => {
  it('Q de Dixon 95 % (Rorabacher 1991): n = 3…10', () => {
    expect([3, 4, 5, 6, 7, 8, 9, 10].map((n) => DIXON_Q[n][95])).toEqual([0.970, 0.829, 0.710, 0.625, 0.568, 0.526, 0.493, 0.466]);
  });
  it('G crítico de Grubbs bilateral α = 0,05 (ASTM E178 / NIST)', () => {
    const tabla: [number, number][] = [[3, 1.1543], [4, 1.4812], [5, 1.7150], [6, 1.8871], [7, 2.0200], [8, 2.1266], [10, 2.2900]];
    for (const [n, g] of tabla) expect(grubbsCritical(n, 0.05)).toBeCloseTo(g, 3);
  });
});
