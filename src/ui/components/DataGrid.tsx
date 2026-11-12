/**
 * Tabla editable de dos columnas (x, y) tipo planilla.
 *  - Enter: de x pasa a y; de y pasa a x de la fila siguiente (crea una fila nueva si hace falta).
 *  - Flechas ↑ ↓: cambian de fila en la misma columna.
 *  - Pegar desde Excel / Google Sheets: llena la tabla a partir de la celda donde se pega.
 *  - Celdas inválidas en rojo; filas incompletas en amarillo.
 */
import { useEffect, useRef } from 'react';
import { parseNumber } from '../../chem/numeric/format';

export interface GridRow {
  x: string;
  y: string;
}

export interface GridData {
  xName: string;
  yName: string;
  rows: GridRow[];
}

const emptyRow = (): GridRow => ({ x: '', y: '' });

/** Divide una línea pegada en celdas (tab, punto y coma o espacios). */
function splitCells(line: string): string[] {
  if (line.includes('\t')) return line.split('\t');
  if (line.includes(';')) return line.split(';');
  return line.trim().split(/\s+/);
}

/** Convierte texto (ej. pegado de Excel) en una tabla; si la 1ª línea es texto, es el encabezado. */
export function gridFromText(text: string, defaults = { xName: 'Concentración', yName: 'Señal' }): GridData {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  let xName = defaults.xName;
  let yName = defaults.yName;
  const rows: GridRow[] = [];
  lines.forEach((line, i) => {
    const cells = splitCells(line).map((c) => c.trim());
    if (i === 0 && cells.every((c) => parseNumber(c) == null)) {
      xName = cells[0] ?? xName;
      yName = cells[1] ?? yName;
      return;
    }
    rows.push({ x: cells[0] ?? '', y: cells[1] ?? '' });
  });
  rows.push(emptyRow());
  return { xName, yName, rows };
}

export function emptyGrid(n = 6): GridData {
  return { xName: 'Concentración', yName: 'Señal', rows: Array.from({ length: n }, emptyRow) };
}

/** Pares numéricos válidos y números de fila (desde 1) con problemas. Las filas vacías se ignoran. */
export function gridToPoints(g: GridData): { rows: number[][]; incomplete: number[]; invalid: number[] } {
  const rows: number[][] = [];
  const incomplete: number[] = [];
  const invalid: number[] = [];
  g.rows.forEach((r, i) => {
    const xs = r.x.trim();
    const ys = r.y.trim();
    if (!xs && !ys) return;
    if (!xs || !ys) {
      incomplete.push(i + 1);
      return;
    }
    const x = parseNumber(xs);
    const y = parseNumber(ys);
    if (x == null || y == null) invalid.push(i + 1);
    else rows.push([x, y]);
  });
  return { rows, incomplete, invalid };
}

export function DataGrid({ value, onChange }: { value: GridData; onChange: (g: GridData) => void }) {
  const refs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocus = useRef<string | null>(null);

  // después de agregar una fila, enfocar la celda pedida
  useEffect(() => {
    if (pendingFocus.current) {
      const el = refs.current.get(pendingFocus.current);
      if (el) {
        el.focus();
        el.select();
      }
      pendingFocus.current = null;
    }
  });

  const focus = (r: number, c: 0 | 1) => {
    const key = `${r}-${c}`;
    const el = refs.current.get(key);
    if (el) {
      el.focus();
      el.select();
    } else pendingFocus.current = key;
  };

  const setCell = (r: number, c: 0 | 1, v: string) => {
    const rows = value.rows.map((row, i) => (i === r ? { ...row, [c === 0 ? 'x' : 'y']: v } : row));
    onChange({ ...value, rows });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: 0 | 1) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (c === 0) return focus(r, 1);
      if (r === value.rows.length - 1) onChange({ ...value, rows: [...value.rows, emptyRow()] });
      focus(r + 1, 0);
    } else if (e.key === 'ArrowDown' && r < value.rows.length - 1) {
      e.preventDefault();
      focus(r + 1, c);
    } else if (e.key === 'ArrowUp' && r > 0) {
      e.preventDefault();
      focus(r - 1, c);
    }
  };

  /** Pegar varias celdas: se reparten desde la celda actual hacia abajo/derecha. */
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>, r: number, c: 0 | 1) => {
    const text = e.clipboardData.getData('text');
    if (!/[\t\n;]/.test(text.trim()) && !/\S\s+\S/.test(text.trim())) return; // un solo valor: pegado normal
    e.preventDefault();
    let lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
    let { xName, yName } = value;
    const first = splitCells(lines[0] ?? '').map((s) => s.trim());
    if (first.length && first.every((s) => parseNumber(s) == null)) {
      // encabezado pegado: se usa como nombre de columnas
      if (c === 0) {
        xName = first[0] ?? xName;
        yName = first[1] ?? yName;
      } else yName = first[0] ?? yName;
      lines = lines.slice(1);
    }
    const rows = [...value.rows];
    lines.forEach((line, i) => {
      const cells = splitCells(line).map((s) => s.trim());
      const idx = r + i;
      while (rows.length <= idx) rows.push(emptyRow());
      if (c === 0) rows[idx] = { x: cells[0] ?? '', y: cells[1] ?? rows[idx].y };
      else rows[idx] = { ...rows[idx], y: cells[0] ?? '' };
    });
    if (rows[rows.length - 1].x || rows[rows.length - 1].y) rows.push(emptyRow());
    onChange({ xName, yName, rows });
  };

  const removeRow = (r: number) => {
    const rows = value.rows.filter((_, i) => i !== r);
    onChange({ ...value, rows: rows.length ? rows : [emptyRow()] });
  };

  const cellCls = (s: string, rowIncomplete: boolean) => {
    const bad = s.trim() !== '' && parseNumber(s) == null;
    return `w-full rounded-md border px-2 py-1.5 font-mono text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/30 dark:bg-slate-950 ${
      bad ? 'border-red-500 bg-red-50 dark:bg-red-950/40' : rowIncomplete && s.trim() === '' ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40' : 'border-slate-300 bg-white dark:border-slate-700'
    }`;
  };

  return (
    <div>
      <div className="max-h-[26rem] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="w-8 px-1 py-1 text-center text-xs font-semibold text-slate-500">#</th>
              <th className="px-1 py-1">
                <input aria-label="Nombre de la columna x" className="w-full rounded bg-transparent px-1 py-1 font-semibold outline-none focus:bg-white dark:focus:bg-slate-900" value={value.xName} onChange={(e) => onChange({ ...value, xName: e.target.value })} />
              </th>
              <th className="px-1 py-1">
                <input aria-label="Nombre de la columna y" className="w-full rounded bg-transparent px-1 py-1 font-semibold outline-none focus:bg-white dark:focus:bg-slate-900" value={value.yName} onChange={(e) => onChange({ ...value, yName: e.target.value })} />
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {value.rows.map((row, r) => {
              const incomplete = (row.x.trim() === '') !== (row.y.trim() === '');
              return (
                <tr key={r}>
                  <td className="px-1 text-center text-xs text-slate-500">{r + 1}</td>
                  {([0, 1] as const).map((c) => (
                    <td key={c} className="px-1 py-0.5">
                      <input
                        ref={(el) => {
                          if (el) refs.current.set(`${r}-${c}`, el);
                          else refs.current.delete(`${r}-${c}`);
                        }}
                        aria-label={`${c === 0 ? value.xName : value.yName}, fila ${r + 1}`}
                        inputMode="decimal"
                        enterKeyHint="next"
                        autoComplete="off"
                        className={cellCls(c === 0 ? row.x : row.y, incomplete)}
                        value={c === 0 ? row.x : row.y}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        onKeyDown={(e) => onKeyDown(e, r, c)}
                        onPaste={(e) => onPaste(e, r, c)}
                      />
                    </td>
                  ))}
                  <td className="px-1 text-center">
                    <button className="rounded px-1.5 text-slate-400 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950" onClick={() => removeRow(r)} title={`Borrar fila ${r + 1}`} aria-label={`Borrar fila ${r + 1}`}>
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        className="btn mt-2"
        onClick={() => {
          onChange({ ...value, rows: [...value.rows, emptyRow()] });
          focus(value.rows.length, 0);
        }}
      >
        + Agregar fila
      </button>
    </div>
  );
}
