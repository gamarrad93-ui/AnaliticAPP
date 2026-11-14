/** Piezas comunes de Gravimetría y Humedad: biblioteca guardada en el navegador, peso constante, resumen de réplicas. */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BUILTIN_LIBRARY, type LibEntry } from '../../chem/gravimetria/biblioteca';
import { constantWeight } from '../../chem/gravimetria/pesoConstante';
import { summarize } from '../../chem/stats/descriptive';
import { parseList } from '../../chem/numeric/table';
import { fmtFixed, fmtSig, parseNumber } from '../../chem/numeric/format';
import { Alert, NumField, Stat } from '../components/fields';

const KEY = 'analiticapp.gravimetria.biblioteca.v1';

interface Stored {
  custom: LibEntry[];
  overrides: Record<string, string>;
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Stored;
      return { custom: Array.isArray(s.custom) ? s.custom : [], overrides: s.overrides ?? {} };
    }
  } catch {
    /* sin almacenamiento: se usa la biblioteca de fábrica */
  }
  return { custom: [], overrides: {} };
}

/** Biblioteca editable: las de fábrica (con fórmula corregible) + las agregadas por el usuario. */
export function useLibrary() {
  const [st, setSt] = useState<Stored>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch {
      /* ignorar */
    }
  }, [st]);
  const entries = useMemo<(LibEntry & { edited: boolean; custom: boolean })[]>(
    () => [
      ...BUILTIN_LIBRARY.map((e) => ({ ...e, formula: st.overrides[e.id] ?? e.formula, edited: e.id in st.overrides, custom: false })),
      ...st.custom.map((e) => ({ ...e, edited: false, custom: true })),
    ],
    [st],
  );
  return {
    entries,
    add: (name: string, formula: string) =>
      setSt((s) => ({ ...s, custom: [...s.custom, { id: `c:${Date.now()}`, name, formula, group: 'Agregadas por mí' }] })),
    remove: (id: string) => setSt((s) => ({ ...s, custom: s.custom.filter((e) => e.id !== id) })),
    setFormula: (id: string, formula: string) =>
      setSt((s) =>
        id.startsWith('c:')
          ? { ...s, custom: s.custom.map((e) => (e.id === id ? { ...e, formula } : e)) }
          : { ...s, overrides: { ...s.overrides, [id]: formula } },
      ),
    restore: (id: string) =>
      setSt((s) => {
        const o = { ...s.overrides };
        delete o[id];
        return { ...s, overrides: o };
      }),
  };
}

/** Tarjeta de peso constante: pesadas sucesivas, diferencia en mg y aviso. */
export function ConstantWeightCard(props: { initial?: string; title?: string; onUse?: (mass: number) => void; useLabel?: ReactNode; extra?: ReactNode }) {
  const [text, setText] = useState(props.initial ?? '');
  const [tol, setTol] = useState('0,3');
  useEffect(() => {
    if (props.initial != null) setText(props.initial);
  }, [props.initial]);
  const { values, bad } = parseList(text);
  const tolV = parseNumber(tol);
  const cw = tolV != null && tolV > 0 ? constantWeight(values, tolV) : null;
  return (
    <section className="card min-w-0 space-y-3">
      <h3 className="card-title">⚖️ {props.title ?? 'Peso constante'}</h3>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div>
          <label className="label" htmlFor="cw-text">Pesadas sucesivas (g), una por línea</label>
          <textarea id="cw-text" className="input h-28 font-mono" value={text} onChange={(e) => setText(e.target.value)} placeholder={'26,6551\n26,6519\n26,6513'} />
        </div>
        <NumField label="Diferencia máxima" value={tol} onChange={setTol} unit="mg" error={tolV == null || tolV <= 0 ? 'Tiene que ser mayor que cero.' : null} hint="Entre dos pesadas consecutivas." />
      </div>
      {bad.length > 0 && <Alert kind="error">No entiendo: {bad.join(', ')}</Alert>}
      {cw && values.length > 0 && (
        <>
          <table className="table-basic">
            <thead>
              <tr><th>Pesada</th><th>Masa (g)</th><th>Diferencia con la anterior (mg)</th><th /></tr>
            </thead>
            <tbody>
              {values.map((m, i) => {
                const d = cw.diffsMg[i];
                const ok = d != null && Math.abs(d) <= cw.tolMg + 1e-9;
                return (
                  <tr key={i} className={cw.reachedAt === i ? 'bg-emerald-50 font-semibold dark:bg-emerald-950/40' : ''}>
                    <td>{i + 1}</td>
                    <td className="font-mono">{fmtFixed(m, 4)}</td>
                    <td className="font-mono">{d == null ? '—' : `${d > 0 ? '+' : d < 0 ? '−' : ''}${fmtFixed(Math.abs(d), 1)}`}</td>
                    <td>{d == null ? '' : ok ? '✓' : '✗'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {cw.reachedAt != null ? (
            <Alert kind="ok">
              Peso constante alcanzado en la pesada {cw.reachedAt + 1}: <strong>{fmtFixed(cw.final!, 4)} g</strong> (diferencia ≤ {fmtSig(cw.tolMg, 2)} mg).
              {props.onUse && (
                <button className="btn ml-2 mt-1" onClick={() => props.onUse!(cw.final!)}>
                  {props.useLabel ?? 'Usar este valor'}
                </button>
              )}
            </Alert>
          ) : values.length > 1 ? (
            <Alert kind="warn">Todavía no hay peso constante: seguí secando/calcinando y volvé a pesar.</Alert>
          ) : null}
          {props.extra}
        </>
      )}
    </section>
  );
}

/** Resumen de réplicas: x̄, s, CV y x̄ ± t·s/√n. */
export function ReplicateSummary(props: { values: number[]; label: string; unit?: string; decimals?: number }) {
  const v = props.values.filter((x) => isFinite(x));
  if (v.length === 0) return null;
  const d = props.decimals ?? 2;
  const u = props.unit ?? '%';
  if (v.length === 1) return <Stat label={props.label} value={`${fmtFixed(v[0], d)} ${u}`} sub="Una sola réplica: cargá más para el intervalo de confianza." />;
  const s = summarize(v);
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold">{props.label}</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Promedio x̄" value={`${fmtFixed(s.mean, d)} ${u}`} sub={`n = ${s.n}`} />
        <Stat label="s" value={fmtSig(s.sd, 2)} />
        <Stat label="CV" value={`${fmtSig(s.rsd, 2)} %`} />
        <Stat label="x̄ ± t·s/√n (95 %)" value={`${fmtFixed(s.mean, d)} ± ${fmtSig(s.halfWidth, 2)}`} sub={`t = ${fmtFixed(s.tCrit, 3)}`} />
      </div>
    </div>
  );
}

/** Fórmula química a TeX (subíndices, punto de hidratación, carga). */
export function texFormula(f: string): string {
  let t = f.trim();
  let charge = '';
  const m = /^(.*?)(?:\s+|\^)\(?(\d*)([+-])\)?$/.exec(t) ?? /^(.*?[A-Za-z)\]])([+-])$/.exec(t);
  if (m) {
    if (m.length === 4) {
      t = m[1];
      charge = `^{${m[2]}${m[3]}}`;
    } else {
      t = m[1];
      charge = `^{${m[2]}}`;
    }
  }
  t = t.replace(/[·.*•]/g, '\\cdot ').replace(/([A-Za-z)\]])(\d+)/g, '$1_{$2}');
  return `\\mathrm{${t}}${charge}`;
}
