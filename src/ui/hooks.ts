import { useMemo, useState } from 'react';
import { parseNumber } from '../chem/numeric/format';

/** Estado de un campo numérico: texto crudo + valor interpretado. */
export function useNum(initial: string) {
  const [raw, setRaw] = useState(initial);
  const value = useMemo(() => parseNumber(raw), [raw]);
  return { raw, setRaw, value };
}

/** Validación amigable: devuelve un mensaje en español o null. */
export function checkNum(
  v: number | null,
  raw: string,
  opts: { min?: number; max?: number; positive?: boolean; integer?: boolean; name?: string } = {},
): string | null {
  if (raw.trim() === '') return 'Completá este campo.';
  if (v == null) return 'No es un número válido. Podés usar coma o punto decimal (ej. 0,1).';
  if (opts.positive && v <= 0) return 'Tiene que ser mayor que cero.';
  if (opts.integer && !Number.isInteger(v)) return 'Tiene que ser un número entero.';
  if (opts.min != null && v < opts.min) return `El mínimo es ${String(opts.min).replace('.', ',')}.`;
  if (opts.max != null && v > opts.max) return `El máximo es ${String(opts.max).replace('.', ',')}.`;
  return null;
}
