/**
 * Pruebas de la sección "Entregas de prácticos": datos de referencia, bureta, tabla Z,
 * criterios de promediabilidad, cálculos de P1–P3 (ejemplos resueltos a mano en TESTS.md),
 * corrección con tolerancia y diagnóstico de errores típicos.
 */
import { describe, expect, it } from 'vitest';
import { tCritTwoSided } from '../stats/distributions';
import { DIXON_Q, grubbsCritical } from '../stats/outliers';
import { ajustesPorDefecto, MASAS_MOLARES, MATERIALES_2026, zIso4787 } from '../practicos/datos';
import { buscarMaterial, corregirBureta, interpolarZ, normalizarCodigo, tramoMasCercano } from '../practicos/material';
import { promediablesPorCriterio, tratamiento } from '../practicos/estadistica';
import { practica } from '../practicos/practicas';
import { coincide, corregir } from '../practicos/correccion';
import { generarEjemplos } from '../practicos/ejemplos';
import type { Entrega } from '../practicos/tipos';

const aj = ajustesPorDefecto();

describe('Datos de referencia', () => {
  it('tabla Lab QA 2026: 100 materiales, V20 confirmados', () => {
    expect(MATERIALES_2026).toHaveLength(100);
    expect(buscarMaterial(aj.materiales, 'pa1005-26')?.v20).toBe(10.02);
    expect(buscarMaterial(aj.materiales, 'MA5005')?.v20).toBe(53.01);
    expect(buscarMaterial(aj.materiales, 'B1011')?.tramos).toEqual([1.99, 3.99, 5.96, 7.96, 9.93]);
    expect(normalizarCodigo(' b1001-26 ')).toBe('B1001');
  });

  it('masas molares coinciden con los pesos atómicos IUPAC', () => {
    // H 1,008; C 12,011; O 15,999; Na 22,990; Mg 24,305; S 32,06; K 39,098; Ni 58,693; I 126,90
    const A = { H: 1.008, C: 12.011, O: 15.999, Na: 22.99, Mg: 24.305, S: 32.06, K: 39.098, Ni: 58.693, I: 126.9 };
    const mm = (f: Partial<Record<keyof typeof A, number>>) => Object.entries(f).reduce((s, [k, n]) => s + A[k as keyof typeof A] * n!, 0);
    expect(MASAS_MOLARES.Na2CO3).toBeCloseTo(mm({ Na: 2, C: 1, O: 3 }), 1);
    expect(Math.abs(MASAS_MOLARES.H2C2O4_2H2O - mm({ C: 2, H: 6, O: 6 }))).toBeLessThan(0.01);
    expect(MASAS_MOLARES.citrico_H2O).toBeCloseTo(mm({ C: 6, H: 10, O: 8 }), 1);
    expect(Math.abs(MASAS_MOLARES.NiSO4_6H2O - mm({ Ni: 1, S: 1, O: 10, H: 12 }))).toBeLessThan(0.015);
    expect(MASAS_MOLARES.MgSO4_7H2O).toBeCloseTo(mm({ Mg: 1, S: 1, O: 11, H: 14 }), 1);
    expect(MASAS_MOLARES.KIO3).toBeCloseTo(mm({ K: 1, I: 1, O: 3 }), 1);
  });

  it('t de Student (95 %, bilateral) igual a las tablas', () => {
    const tabla = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262];
    tabla.forEach((t, i) => expect(tCritTwoSided(0.95, i + 1)).toBeCloseTo(t, 3));
  });

  it('Q de Dixon 95 % (Rorabacher 1991) y G de Grubbs 95 % (ASTM E178)', () => {
    expect([3, 4, 5, 6, 7, 8, 9, 10].map((n) => DIXON_Q[n][95])).toEqual([0.97, 0.829, 0.71, 0.625, 0.568, 0.526, 0.493, 0.466]);
    const G = [1.155, 1.481, 1.715, 1.887, 2.02, 2.126, 2.215, 2.29];
    G.forEach((g, i) => expect(Math.abs(grubbsCritical(i + 3, 0.05) - g)).toBeLessThan(0.001));
  });
});

describe('Factor Z (ISO 4787)', () => {
  it('coincide con la tabla de Harris a 1 atm (15–30 °C)', () => {
    const harris = [1.002, 1.0021, 1.0023, 1.0025, 1.0027, 1.0029, 1.0031, 1.0033, 1.0035, 1.0038, 1.004, 1.0043, 1.0046, 1.0048, 1.0051, 1.0054];
    harris.forEach((z, i) => expect(Math.abs(zIso4787(15 + i, 1013.25) - z)).toBeLessThan(1.5e-4));
  });
  it('interpolación bilineal en la tabla', () => {
    const { Z, fueraDeRango } = interpolarZ(aj.tablaZ, 20, 1013);
    expect(Z).toBeCloseTo(1.0029, 4);
    expect(fueraDeRango).toBe(false);
    const mid = interpolarZ(aj.tablaZ, 22.5, 1013).Z;
    expect(mid).toBeGreaterThan(interpolarZ(aj.tablaZ, 22, 1013).Z);
    expect(mid).toBeLessThan(interpolarZ(aj.tablaZ, 23, 1013).Z);
    expect(interpolarZ(aj.tablaZ, 40, 1013).fueraDeRango).toBe(true);
  });
  it('a menor presión Z es menor (menos empuje del aire)', () => {
    expect(zIso4787(20, 900)).toBeLessThan(zIso4787(20, 1013));
  });
});

describe('Corrección de bureta (tramo más cercano)', () => {
  const B1001 = [2.03, 4.04, 6.03, 8.02, 10.01];
  it('elige el tramo de nominal más cercano', () => {
    expect(tramoMasCercano(0.5)).toBe(0);
    expect(tramoMasCercano(4.9)).toBe(1);
    expect(tramoMasCercano(7.2)).toBe(3);
    expect(tramoMasCercano(9.1)).toBe(4);
    expect(tramoMasCercano(12)).toBe(4);
    expect(tramoMasCercano(5)).toBe(2); // empate → tramo mayor
  });
  it('G corregido = G + (V20 − nominal)', () => {
    const c = corregirBureta(8.01, B1001);
    expect(c.tramo).toBe(3);
    expect(c.correccion).toBeCloseTo(0.02, 10);
    expect(c.corregido).toBeCloseTo(8.03, 10);
    expect(corregirBureta(8.4, [1.99, 3.99, 5.96, 7.96, 9.93]).corregido).toBeCloseTo(8.36, 10);
  });
});

describe('Criterio de promediabilidad', () => {
  it('Q de Dixon descarta el valor alejado', () => {
    const r = promediablesPorCriterio([0.1012, 0.1013, 0.1011, 0.103], 'dixon');
    expect(r.mascara).toEqual([true, true, true, false]);
  });
  it('Grubbs conserva datos homogéneos', () => {
    expect(promediablesPorCriterio([10.01, 10.02, 10.0, 10.03, 10.02], 'grubbs').mascara.every(Boolean)).toBe(true);
  });
  it('con n < 3 se promedian todos', () => {
    expect(promediablesPorCriterio([1, 2], 'dixon').mascara).toEqual([true, true]);
  });
  it('tratamiento: x̄, s, CV y t·s/√n', () => {
    const t = tratamiento([0.1, 0.102, 0.101]);
    expect(t.media).toBeCloseTo(0.101, 10);
    expect(t.s).toBeCloseTo(0.001, 10);
    expect(t.cv).toBeCloseTo(0.990099, 5);
    expect(t.compAleatorio).toBeCloseTo((4.302653 * 0.001) / Math.sqrt(3), 7);
  });
});

/* --- Ejemplos resueltos a mano (ver TESTS.md) --- */

function entrega(p: string, parcial: Partial<Entrega>): Entrega {
  return {
    id: 'x',
    practica: p as Entrega['practica'],
    creada: '',
    alumno: { nombre: 'Prueba', grupo: '', fecha: '' },
    materiales: {},
    reactivos: {},
    muestra: '',
    datos: {},
    filas: [],
    criterio: { tipo: 'dixon', texto: '' },
    resultados: {},
    observaciones: '',
    ...parcial,
  };
}
const mat = (codigo: string, tol = '0,02') => ({ codigo, vNominal: '', tolerancia: tol, v20: '', tramos: [] });
const re = (assay: string) => ({ lote: '', assay, fechaPreparacion: '', fechaVencimiento: '' });
const fila = (datos: Record<string, string>) => ({ datos, promediable: true, resultados: {} });

describe('P2: HCl con Na₂CO₃', () => {
  it('ejemplo a mano: m = 0,0425 g, assay 99,8 %, G = 8,01 mL (B1001) → 0,09967 mol/L', () => {
    const e = entrega('p2', {
      materiales: { bureta: mat('B1001') },
      reactivos: { patron: re('99,8') },
      filas: [fila({ m: '0,0425', G: '8,01' }), fila({ m: '0.0418', G: '7,88' })],
    });
    const c = practica('p2')!.calcular(e, aj);
    expect(c.errores).toEqual([]);
    expect(c.filas[0].Gc).toBeCloseTo(8.03, 10);
    expect(c.filas[0].C).toBeCloseTo((2 * 0.0425 * 0.998 * 1000) / (105.99 * 8.03), 10);
    expect(c.filas[0].C).toBeCloseTo(0.099671, 5);
    // 7,88 → tramo 0–8 (+0,02) → 7,90
    expect(c.filas[1].Gc).toBeCloseTo(7.9, 10);
  });
});

describe('P3: NaOH con ácido oxálico (alícuota)', () => {
  it('ejemplo a mano: m = 0,5104 g, MA10005 (100,06), PA1013 (10,04), G = 8,03 (B1005) → 0,10042 mol/L', () => {
    const e = entrega('p3', {
      materiales: { bureta: mat('B1005'), matraz: mat('MA10005'), pipeta: mat('PA1013') },
      reactivos: { patron: re('99,5') },
      datos: { m: '0,5104' },
      filas: [fila({ G: '8,03' }), fila({ G: '8,05' })],
    });
    const c = practica('p3')!.calcular(e, aj);
    expect(c.errores).toEqual([]);
    expect(c.filas[0].Gc).toBeCloseTo(8.05, 10);
    expect(c.filas[0].C).toBeCloseTo((2 * 0.5104 * 0.995 * (10.04 / 100.06) * 1000) / (126.07 * 8.05), 10);
    expect(c.filas[0].C).toBeCloseTo(0.100423, 5);
  });
});

describe('P1: verificación de material', () => {
  it('pipeta PA1005: V20 = m·Z y criterios con la tolerancia escrita', () => {
    const masas = ['9,9851', '9,9862', '9,9840', '9,9858', '9,9855'];
    const e = entrega('p1', {
      materiales: { material: mat('PA1005', '0,02') },
      datos: { T: '20', P: '1013', tramo: '' },
      criterio: { tipo: 'grubbs', texto: '' },
      filas: masas.map((m) => fila({ mi: '50', mf: String(50 + Number(m.replace(',', '.'))) })),
    });
    const c = practica('p1')!.calcular(e, aj);
    expect(c.errores).toEqual([]);
    const Z = c.intermedios.Z;
    expect(Z).toBeCloseTo(1.0029, 4);
    expect(c.filas[0].V20).toBeCloseTo(9.9851 * Z, 6);
    const r = c.resumen;
    expect(r.vref).toBe(10.02);
    expect(r.crit1Limite).toBeCloseTo(0.02 / 3, 10);
    const crit2 = Math.abs((r.media as number) - 10.02) + (r.compAleatorio as number);
    expect(r.crit2Valor).toBeCloseTo(crit2, 10);
    expect(r.crit2Cumple).toBe(crit2 <= 0.02);
  });
  it('bureta: Vref = V20 del tramo elegido', () => {
    const e = entrega('p1', {
      materiales: { material: mat('B1003') },
      datos: { T: '22', P: '1013', tramo: '8' },
      filas: ['7,975', '7,978', '7,972'].map((m) => fila({ mi: '40', mf: String(40 + Number(m.replace(',', '.'))) })),
    });
    const c = practica('p1')!.calcular(e, aj);
    expect(c.resumen.vref).toBe(8.0);
  });
});

describe('Corrección y diagnóstico', () => {
  it('modos de tolerancia', () => {
    expect(coincide(0.1004, 0.100423, { modo: 'relativa', valor: 0.1 })).toBe(true);
    expect(coincide(0.1006, 0.100423, { modo: 'relativa', valor: 0.1 })).toBe(false);
    expect(coincide(8.04, 8.05, { modo: 'absoluta', valor: 0.01 })).toBe(true);
    expect(coincide(0.1004, 0.100423, { modo: 'cifras', valor: 4 })).toBe(true);
    expect(coincide(0.1006, 0.100423, { modo: 'cifras', valor: 4 })).toBe(false);
  });

  const ej = generarEjemplos(aj);
  const diag = (id: string) => {
    const e = ej.find((x) => x.id === id)!;
    return corregir(practica(e.practica)!, e, aj);
  };

  it('los alumnos de ejemplo "correctos" tienen todo bien', () => {
    for (const id of ['ej-p1-1', 'ej-p1-4', 'ej-p2-1', 'ej-p3-1']) {
      const c = diag(id);
      expect(c.calculo.errores).toEqual([]);
      expect(c.aciertos).toBe(c.total);
    }
  });

  it.each([
    ['ej-p1-2', 'factor Z a 20 °C'],
    ['ej-p1-3', 'volumen nominal en lugar del V20'],
    ['ej-p2-2', 'No corrigió la lectura de la bureta'],
    ['ej-p2-3', 'Incluyó un valor no promediable'],
    ['ej-p2-4', 'Relación estequiométrica equivocada'],
    ['ej-p3-2', 'volumen nominal en lugar del V20'],
    ['ej-p3-3', 'tramo equivocado'],
    ['ej-p3-4', 'factor de alícuota'],
  ])('%s → diagnóstico principal: %s', (id, texto) => {
    const c = diag(id);
    expect(c.aciertos).toBeLessThan(c.total);
    expect(c.diagnosticos[0].etiqueta).toContain(texto);
  });

  it('detecta promediables marcados que no coinciden con el criterio', () => {
    const c = diag('ej-p2-3');
    const prom = c.campos.find((x) => x.seccion === 'promediables')!;
    expect(prom.ok).toBe(false);
  });
});
