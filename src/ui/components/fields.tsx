/** Campos de entrada reutilizables (aceptan coma o punto decimal). */
import { useId, useState, type ReactNode } from 'react';

export function NumField(props: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  unit?: ReactNode;
  error?: string | null;
  hint?: ReactNode;
  placeholder?: string;
  className?: string;
  /** campo bloqueado: muestra un valor calculado */
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={props.className}>
      <label htmlFor={id} className="label">
        {props.label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          className={`input font-mono ${props.error ? 'input-error' : ''} ${props.disabled ? 'cursor-not-allowed bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : ''}`}
          disabled={props.disabled}
          value={props.value}
          placeholder={props.placeholder}
          onChange={(e) => props.onChange(e.target.value)}
          aria-invalid={!!props.error}
          aria-describedby={props.error ? `${id}-err` : undefined}
        />
        {props.unit && <span className="shrink-0 text-sm text-slate-600 dark:text-slate-400">{props.unit}</span>}
      </div>
      {props.error ? (
        <p id={`${id}-err`} className="mt-1 text-sm text-red-700 dark:text-red-400">
          {props.error}
        </p>
      ) : props.hint ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{props.hint}</p>
      ) : null}
    </div>
  );
}

/** Texto sin tildes ni mayúsculas, y subíndices como dígitos, para buscar. */
export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .toLowerCase();
}

/** ¿La opción coincide con la búsqueda? Todas las palabras tienen que aparecer (en la etiqueta o el grupo). */
export function matchesSearch(label: string, query: string, group = ''): boolean {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const hay = normalizeSearch(`${label} ${group}`);
  return words.every((w) => hay.includes(w));
}

export function SelectField<T extends string>(props: {
  label: ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; group?: string }[];
  className?: string;
  /** agrega un buscador arriba de la lista que va descartando las opciones que no coinciden */
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const filtering = !!props.searchable && query.trim() !== '';
  const options = filtering ? props.options.filter((o) => matchesSearch(o.label, query, o.group)) : props.options;
  const groups = [...new Set(options.map((o) => o.group ?? ''))];
  const onQuery = (q: string) => {
    setQuery(q);
    // si la opción elegida ya no coincide, se elige la primera que coincida
    if (q.trim() === '') return;
    const m = props.options.filter((o) => matchesSearch(o.label, q, o.group));
    if (m.length && !m.some((o) => o.value === props.value)) props.onChange(m[0].value);
  };
  return (
    <div className={props.className}>
      <label htmlFor={id} className="label">
        {props.label}
      </label>
      {props.searchable && (
        <div className="relative mb-1.5">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>🔍</span>
          <input
            type="search"
            className="input pl-8"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={props.searchPlaceholder ?? 'Buscar…'}
            aria-label={`Buscar: ${typeof props.label === 'string' ? props.label : ''}`}
            autoComplete="off"
            spellCheck={false}
          />
          {filtering && (
            <p className={`mt-1 text-xs ${options.length ? 'text-slate-500 dark:text-slate-400' : 'text-red-700 dark:text-red-400'}`}>
              {options.length === 0 ? 'No hay coincidencias.' : options.length === 1 ? '1 coincidencia.' : `${options.length} coincidencias.`}
            </p>
          )}
        </div>
      )}
      <select id={id} className="input" value={props.value} onChange={(e) => props.onChange(e.target.value as T)} disabled={filtering && options.length === 0}>
        {groups.map((g) =>
          g ? (
            <optgroup key={g} label={g}>
              {options.filter((o) => o.group === g).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ) : (
            options.filter((o) => !o.group).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          ),
        )}
      </select>
    </div>
  );
}

export function Toggle(props: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm">
      <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      {props.label}
    </label>
  );
}

export function Segmented<T extends string>(props: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; ariaLabel?: string }) {
  return (
    <div role="radiogroup" aria-label={props.ariaLabel} className="inline-flex flex-wrap rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
      {props.options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={props.value === o.value}
          onClick={() => props.onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${props.value === o.value ? 'bg-brand-700 text-white dark:bg-brand-600' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat(props: { label: ReactNode; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{props.label}</div>
      <div className="stat-value">{props.value}</div>
      {props.sub && <div className="text-xs text-slate-600 dark:text-slate-400">{props.sub}</div>}
    </div>
  );
}

export function Alert(props: { kind?: 'error' | 'warn' | 'info' | 'ok'; children: ReactNode }) {
  const k = props.kind ?? 'info';
  const cls = {
    error: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
    warn: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
    info: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200',
    ok: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  }[k];
  return <div className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>{props.children}</div>;
}
