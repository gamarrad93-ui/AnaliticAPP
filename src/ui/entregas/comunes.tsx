/** Piezas de interfaz compartidas por las vistas Alumno y Profesor. */
import { useEffect, useState } from 'react';
import { fmtSig } from '../../chem/numeric/format';
import { parseNumber } from '../../chem/numeric/format';
import type { Paso } from '../../chem/practicos/motor';
import { Tex } from '../components/Tex';

/** Campo de texto corto (números con coma o punto). */
export function Celda(props: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  placeholder?: string;
  ancho?: string;
  label?: string;
  numerico?: boolean;
  list?: string;
}) {
  return (
    <input
      aria-label={props.label}
      inputMode={props.numerico === false ? undefined : 'decimal'}
      autoComplete="off"
      list={props.list}
      className={`input px-2 py-1 font-mono text-sm ${props.ancho ?? ''} ${props.error ? 'input-error' : ''}`}
      value={props.value}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
      aria-invalid={props.error || undefined}
    />
  );
}

/** Número editable que se confirma al salir del campo (para los ajustes). */
export function NumEditable(props: { value: number; onCommit: (v: number) => void; label: string; ancho?: string }) {
  const [txt, setTxt] = useState(String(props.value).replace('.', ','));
  useEffect(() => setTxt(String(props.value).replace('.', ',')), [props.value]);
  const v = parseNumber(txt);
  return (
    <input
      aria-label={props.label}
      inputMode="decimal"
      className={`input px-2 py-1 font-mono text-sm ${props.ancho ?? 'w-24'} ${v == null ? 'input-error' : ''}`}
      value={txt}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={() => {
        if (v != null && v !== props.value) props.onCommit(v);
        else setTxt(String(props.value).replace('.', ','));
      }}
    />
  );
}

export function fmtValor(v: number | boolean | string | undefined, sig = 5): string {
  if (typeof v === 'boolean') return v ? 'Cumple' : 'No cumple';
  if (typeof v === 'string') return v;
  if (v == null || !Number.isFinite(v)) return '—';
  return fmtSig(v, sig);
}

/** Panel "Ver procedimiento" con ecuaciones (KaTeX), textos y tablas de valores intermedios. */
export function PasosView({ pasos, titulo = 'Ver procedimiento' }: { pasos: Paso[]; titulo?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/60 dark:border-brand-900 dark:bg-brand-950/30">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-brand-900 dark:text-brand-200"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>📐 {titulo}</span>
        <span aria-hidden>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ol className="space-y-3 px-4 pb-4">
          {pasos.map((s, i) => (
            <li key={i} className="rounded-lg bg-white p-3 text-sm dark:bg-slate-900">
              <div className="mb-1 font-semibold">
                {i + 1}. {s.titulo}
              </div>
              {s.texto && <div className="mb-1 text-slate-700 dark:text-slate-300">{s.texto}</div>}
              {s.tex?.map((t, j) => (
                <Tex key={j} block>
                  {t}
                </Tex>
              ))}
              {s.tabla && (
                <div className="mt-2 overflow-x-auto">
                  <table className="table-basic">
                    <thead>
                      <tr>
                        {s.tabla.cabecera.map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.tabla.filas.map((f, k) => (
                        <tr key={k}>
                          {f.map((c, m) => (
                            <td key={m} className="font-mono">
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export const NOMBRE_CRITERIO = { dixon: 'Q de Dixon (95 %)', grubbs: 'Test de Grubbs (95 %)', otro: 'Otro' } as const;
