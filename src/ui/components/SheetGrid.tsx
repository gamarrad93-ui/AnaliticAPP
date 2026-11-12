/**
 * Planilla de varias columnas para cargar determinaciones (como las planillas de informe del curso).
 *  - Enter avanza a la celda siguiente (a la derecha; al final de la fila, baja y crea una fila nueva).
 *  - Flechas ↑ ↓ cambian de fila. Se puede pegar un bloque desde Excel.
 *  - Columnas calculadas (sólo lectura) al final de cada fila.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { parseNumber } from '../../chem/numeric/format';

export interface SheetColumn {
  key: string;
  label: ReactNode;
  /** ancho mínimo aproximado en rem */
  width?: number;
}

export type SheetRow = Record<string, string>;

export interface ComputedColumn {
  label: ReactNode;
  render: (rowIndex: number) => ReactNode;
}

function splitCells(line: string): string[] {
  if (line.includes('\t')) return line.split('\t');
  if (line.includes(';')) return line.split(';');
  return line.trim().split(/\s+/);
}

export function emptyRow(cols: SheetColumn[]): SheetRow {
  return Object.fromEntries(cols.map((c) => [c.key, '']));
}

/** Convierte filas de texto a números; devuelve null en las columnas vacías o inválidas. */
export function parseRow(row: SheetRow): Record<string, number | null> {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, parseNumber(v)]));
}

export function SheetGrid(props: {
  columns: SheetColumn[];
  rows: SheetRow[];
  onChange: (rows: SheetRow[]) => void;
  computed?: ComputedColumn[];
  /** resaltar filas (ej. promediables) */
  rowClass?: (i: number) => string;
  rowLabel?: (i: number) => string;
}) {
  const { columns, rows, onChange } = props;
  const refs = useRef(new Map<string, HTMLInputElement>());
  const pending = useRef<string | null>(null);
  useEffect(() => {
    if (pending.current) {
      const el = refs.current.get(pending.current);
      if (el) {
        el.focus();
        el.select();
      }
      pending.current = null;
    }
  });
  const focus = (r: number, c: number) => {
    const key = `${r}-${c}`;
    const el = refs.current.get(key);
    if (el) {
      el.focus();
      el.select();
    } else pending.current = key;
  };
  const setCell = (r: number, key: string, v: string) => onChange(rows.map((row, i) => (i === r ? { ...row, [key]: v } : row)));
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (c < columns.length - 1) return focus(r, c + 1);
      if (r === rows.length - 1) onChange([...rows, emptyRow(columns)]);
      focus(r + 1, 0);
    } else if (e.key === 'ArrowDown' && r < rows.length - 1) {
      e.preventDefault();
      focus(r + 1, c);
    } else if (e.key === 'ArrowUp' && r > 0) {
      e.preventDefault();
      focus(r - 1, c);
    }
  };
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>, r: number, c: number) => {
    const text = e.clipboardData.getData('text');
    if (!/[\t\n;]/.test(text.trim()) && !/\S\s+\S/.test(text.trim())) return;
    e.preventDefault();
    let lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
    const first = splitCells(lines[0] ?? '').map((s) => s.trim());
    if (first.every((s) => parseNumber(s) == null)) lines = lines.slice(1); // encabezado
    const out = [...rows];
    lines.forEach((line, i) => {
      const cells = splitCells(line).map((s) => s.trim());
      const idx = r + i;
      while (out.length <= idx) out.push(emptyRow(columns));
      const row = { ...out[idx] };
      cells.forEach((v, j) => {
        const col = columns[c + j];
        if (col) row[col.key] = v;
      });
      out[idx] = row;
    });
    onChange(out);
  };
  const remove = (r: number) => {
    const out = rows.filter((_, i) => i !== r);
    onChange(out.length ? out : [emptyRow(columns)]);
  };
  const cellCls = (s: string) => {
    const bad = s.trim() !== '' && parseNumber(s) == null;
    return `w-full min-w-[5.5rem] rounded-md border px-2 py-1.5 font-mono text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/30 dark:bg-slate-950 ${
      bad ? 'border-red-500 bg-red-50 dark:bg-red-950/40' : 'border-slate-300 bg-white dark:border-slate-700'
    }`;
  };
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="px-2 py-1.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">#</th>
              {columns.map((c) => (
                <th key={c.key} className="px-1 py-1.5 text-left text-xs font-semibold">
                  {c.label}
                </th>
              ))}
              {props.computed?.map((c, i) => (
                <th key={`c${i}`} className="bg-brand-50 px-2 py-1.5 text-left text-xs font-semibold text-brand-900 dark:bg-brand-950 dark:text-brand-200">
                  {c.label}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className={props.rowClass?.(r) ?? ''}>
                <td className="whitespace-nowrap px-2 text-xs text-slate-500">{props.rowLabel ? props.rowLabel(r) : r + 1}</td>
                {columns.map((c, ci) => (
                  <td key={c.key} className="px-1 py-0.5">
                    <input
                      ref={(el) => {
                        if (el) refs.current.set(`${r}-${ci}`, el);
                        else refs.current.delete(`${r}-${ci}`);
                      }}
                      aria-label={`${typeof c.label === 'string' ? c.label : c.key}, fila ${r + 1}`}
                      inputMode="decimal"
                      enterKeyHint="next"
                      autoComplete="off"
                      className={cellCls(row[c.key] ?? '')}
                      value={row[c.key] ?? ''}
                      onChange={(e) => setCell(r, c.key, e.target.value)}
                      onKeyDown={(e) => onKeyDown(e, r, ci)}
                      onPaste={(e) => onPaste(e, r, ci)}
                    />
                  </td>
                ))}
                {props.computed?.map((c, i) => (
                  <td key={`c${i}`} className="whitespace-nowrap bg-brand-50/60 px-2 font-mono text-sm dark:bg-brand-950/40">
                    {c.render(r)}
                  </td>
                ))}
                <td className="px-1 text-center">
                  <button className="rounded px-1.5 text-slate-400 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950" onClick={() => remove(r)} aria-label={`Borrar fila ${r + 1}`} title={`Borrar fila ${r + 1}`}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="btn mt-2"
        onClick={() => {
          onChange([...rows, emptyRow(columns)]);
          focus(rows.length, 0);
        }}
      >
        + Agregar determinación
      </button>
    </div>
  );
}
