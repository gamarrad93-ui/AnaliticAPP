/**
 * Lectura de tablas pegadas desde Excel / Google Sheets / texto.
 * Columnas separadas por tabulación, punto y coma o espacios. La coma se interpreta como
 * decimal. Si una línea sólo tiene comas (ej. "1.5,2.3"), la coma se toma como separador.
 * Las líneas de encabezado (texto) se saltean.
 */
import { parseNumber } from './format';

export interface ParsedTable {
  rows: number[][];
  skipped: { line: number; text: string }[];
  header: string[] | null;
}

function splitLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t');
  if (line.includes(';')) return line.split(';');
  const ws = line.trim().split(/\s+/);
  if (ws.length > 1) return ws;
  // sin otros separadores: "1.5,2.3" o "1,2" → la coma separa columnas
  if (line.includes(',') && (line.includes('.') || (line.match(/,/g) || []).length === 1)) return line.split(',');
  return [line];
}

export function parseTable(text: string, minCols = 2): ParsedTable {
  const rows: number[][] = [];
  const skipped: { line: number; text: string }[] = [];
  let header: string[] | null = null;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const cells = splitLine(line).map((c) => c.trim()).filter((c) => c !== '');
    const nums = cells.map(parseNumber);
    if (cells.length >= minCols && nums.slice(0, minCols).every((v) => v != null)) {
      rows.push(nums.filter((v): v is number => v != null));
    } else if (rows.length === 0 && header == null && nums.every((v) => v == null)) {
      header = cells;
    } else {
      skipped.push({ line: i + 1, text: line });
    }
  });
  return { rows, skipped, header };
}

/** Lista de números (una columna o separados por ; espacios o saltos de línea). */
export function parseList(text: string): { values: number[]; bad: string[] } {
  const parts = text.split(/[\n;\t]+|\s+/).map((s) => s.trim()).filter(Boolean);
  const values: number[] = [];
  const bad: string[] = [];
  for (const p of parts) {
    const v = parseNumber(p);
    if (v == null) bad.push(p);
    else values.push(v);
  }
  return { values, bad };
}
