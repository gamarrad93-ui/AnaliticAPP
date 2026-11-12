/**
 * Panel "Ver procedimiento": muestra las ecuaciones y valores intermedios
 * usados por el motor de cálculo, para que el docente pueda auditarlos.
 */
import { useState, type ReactNode } from 'react';
import { Tex } from './Tex';

export interface Step {
  title?: ReactNode;
  text?: ReactNode;
  tex?: string | string[];
}

export function Procedure({ steps, title = 'Ver procedimiento', defaultOpen = false }: { steps: Step[]; title?: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/60 dark:border-brand-900 dark:bg-brand-950/30">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-brand-900 dark:text-brand-200"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>📐 {title}</span>
        <span aria-hidden>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ol className="space-y-3 px-4 pb-4">
          {steps.map((s, i) => (
            <li key={i} className="rounded-lg bg-white p-3 text-sm dark:bg-slate-900">
              {s.title && <div className="mb-1 font-semibold">{i + 1}. {s.title}</div>}
              {s.text && <div className="mb-1 text-slate-700 dark:text-slate-300">{s.text}</div>}
              {s.tex && (Array.isArray(s.tex) ? s.tex : [s.tex]).map((t, j) => <Tex key={j} block>{t}</Tex>)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
