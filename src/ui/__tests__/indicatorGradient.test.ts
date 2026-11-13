import { describe, it, expect } from 'vitest';
import { indicatorGradientStops, displayColor } from '../components/indicatorGradient';
import { INDICATORS, getIndicator } from '../../chem/data/indicators';

describe('Fondo de color del indicador (degradé alineado al eje de pH)', () => {
  it('fenolftaleína 8,3–10,0 en eje 0–14: paradas en las fracciones exactas del eje', () => {
    const s = indicatorGradientStops(8.3, 10, '#aaa', '#bbb');
    expect(s.map((x) => x.offset)).toEqual([0, (14 - 10) / 14, (14 - 8.3) / 14, 1]);
    expect(s.map((x) => x.color)).toEqual(['#bbb', '#bbb', '#aaa', '#aaa']);
  });
  it('arriba del viraje: color básico; abajo: color ácido', () => {
    const s = indicatorGradientStops(3.1, 4.4, 'red', 'yellow');
    expect(s[0].color).toBe('yellow');
    expect(s[3].color).toBe('red');
  });
  it('si cambia el dominio del eje, las paradas siguen el pH real', () => {
    const s = indicatorGradientStops(6.2, 7.6, 'a', 'b', 2, 12);
    expect(s[1].offset).toBeCloseTo((12 - 7.6) / 10, 12);
    expect(s[2].offset).toBeCloseTo((12 - 6.2) / 10, 12);
  });
  it('viraje fuera del dominio se recorta a [0, 1]', () => {
    const s = indicatorGradientStops(10.1, 12, 'a', 'b', 0, 11);
    expect(s[1].offset).toBe(0);
  });
  it('todos los indicadores dan paradas ordenadas', () => {
    for (const i of INDICATORS) {
      const o = indicatorGradientStops(i.low, i.high, i.acidHex, i.baseHex).map((x) => x.offset);
      for (let k = 1; k < o.length; k++) expect(o[k]).toBeGreaterThanOrEqual(o[k - 1]);
    }
  });
  it('"incoloro" se muestra como gris muy claro', () => {
    const f = getIndicator('fenolftaleina')!;
    expect(displayColor(f.acidHex, f.acidColor)).toBe('#f1f5f9');
    expect(displayColor(f.baseHex, f.baseColor)).toBe(f.baseHex);
  });
});
