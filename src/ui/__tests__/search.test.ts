import { describe, expect, it } from 'vitest';
import { matchesSearch } from '../components/fields';

describe('Buscador de las listas', () => {
  it('ignora tildes, mayúsculas y subíndices', () => {
    expect(matchesSearch('Ácido acético (CH₃COOH)', 'acetico')).toBe(true);
    expect(matchesSearch('Ácido acético (CH₃COOH)', 'ch3cooh')).toBe(true);
    expect(matchesSearch('Amoníaco (NH₃)', 'AMONIACO')).toBe(true);
  });
  it('todas las palabras tienen que aparecer', () => {
    expect(matchesSearch('Ácido fosfórico (H₃PO₄)', 'acido fosf')).toBe(true);
    expect(matchesSearch('Ácido fosfórico (H₃PO₄)', 'acido citrico')).toBe(false);
  });
  it('busca también en el grupo', () => expect(matchesSearch('Ácido acético (CH₃COOH)', 'débiles', 'Ácidos débiles')).toBe(true));
});
