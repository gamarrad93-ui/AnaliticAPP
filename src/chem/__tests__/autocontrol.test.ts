import { describe, expect, it } from 'vitest';
import { AUTOCONTROL, PUNTAJE_PREGUNTAS_PREVIAS } from '../../data/autocontrol';

describe('Preguntas de autocontrol', () => {
  it('12 prácticos con preguntas (el 10 no tiene en la cuaderneta)', () => {
    expect(AUTOCONTROL.map((a) => a.practico)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13]);
  });
  it('ids únicos, letras en orden y respuesta borrador en todas', () => {
    const ids = AUTOCONTROL.flatMap((a) => a.preguntas.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of AUTOCONTROL) {
      const letras = a.preguntas.map((p) => p.letra);
      expect(letras).toEqual([...letras].sort());
      for (const p of a.preguntas) expect(p.borrador.length, p.id).toBeGreaterThan(20);
    }
  });
  it('cantidad de preguntas por práctico (según la cuaderneta)', () => {
    expect(Object.fromEntries(AUTOCONTROL.map((a) => [a.practico, a.preguntas.length]))).toEqual({ 1: 9, 2: 7, 3: 9, 4: 5, 5: 5, 6: 8, 7: 8, 8: 10, 9: 9, 11: 13, 12: 11, 13: 4 });
  });
  it('puntaje de Preguntas Previas del Teórico 1', () => expect(PUNTAJE_PREGUNTAS_PREVIAS).toEqual({ individual: 5, grupal: 7, total: 12 }));
});
