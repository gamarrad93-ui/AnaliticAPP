/**
 * Bloques comunes de la pestaña "Prácticos" (Cuaderneta de Laboratorio QA I 2026).
 */
import { useMemo, useState, type ReactNode } from 'react';
import { evaluateReplicates, type Criterion, type LabResult } from '../../chem/lab/promediables';
import { formatWithUncertainty } from '../../chem/stats/sigfigs';
import { fmtFixed, fmtSig } from '../../chem/numeric/format';
import { Alert, Stat } from '../components/fields';
import { Procedure, type Step } from '../components/Procedure';
import { SheetGrid, emptyRow, parseRow, type SheetColumn, type SheetRow } from '../components/SheetGrid';

export function PracticeHeader(props: { n: number | string; title: string; objetivos: string[]; reacciones?: string[]; children?: ReactNode }) {
  return (
    <section className="card space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Práctico de laboratorio {props.n}</div>
      <h2 className="font-titulo text-2xl text-brand-700 dark:text-brand-300">{props.title}</h2>
      <ul className="list-disc space-y-0.5 pl-5 text-sm">
        {props.objetivos.map((o, i) => (
          <li key={i}>{o}</li>
        ))}
      </ul>
      {props.reacciones && props.reacciones.length > 0 && (
        <div className="rounded-lg bg-brand-50 px-3 py-2 font-mono text-sm text-brand-900 dark:bg-brand-950 dark:text-brand-100">
          {props.reacciones.map((r, i) => (
            <div key={i}>{r}</div>
          ))}
        </div>
      )}
      {props.children}
    </section>
  );
}

/** Tarjeta de diagramación: datos a la izquierda, resultados a la derecha. */
export function Diagram(props: { title?: string; inputs: ReactNode; outputs: ReactNode; steps?: Step[]; note?: ReactNode }) {
  return (
    <section className="card space-y-3">
      <h3 className="card-title">📝 {props.title ?? 'Diagramación'}</h3>
      <div className="grid gap-4 md:grid-cols-[minmax(240px,320px)_1fr]">
        <div className="space-y-3">{props.inputs}</div>
        <div className="space-y-3">
          {props.outputs}
          {props.note}
        </div>
      </div>
      {props.steps && <Procedure steps={props.steps} />}
    </section>
  );
}

/** Indica si conviene toma en masa o en volumen (balanza d = 0,0001 g). */
export function MassAdvice({ m, stock }: { m: number; stock?: { massStock: number; flask: number; pipette: number } }) {
  if (!Number.isFinite(m)) return null;
  const relErr = (0.0002 / m) * 100; // dos pesadas por diferencia
  if (m >= 0.1)
    return (
      <Alert kind="ok">
        Toma en <strong>masa</strong>: {fmtSig(m, 4)} g en balanza analítica (error relativo de pesada ≈ {fmtSig(relErr, 2)} %).
      </Alert>
    );
  return (
    <Alert kind="warn">
      La masa ({fmtSig(m, 3)} g) es chica: pesarla directamente tendría un error relativo ≈ {fmtSig(relErr, 2)} %. Conviene una <strong>toma en volumen</strong>
      {stock && (
        <>
          : pesar ≈ {fmtSig(stock.massStock, 4)} g, disolver en matraz aforado de {stock.flask},00 mL y tomar alícuotas de {stock.pipette},00 mL con pipeta aforada.
        </>
      )}
    </Alert>
  );
}

export interface ResultDef {
  key: string;
  label: string;
  unit: string;
  sig?: number;
  compute: (r: Record<string, number | null>) => number | null;
  criterion: Criterion;
  /** especificación (farmacopea, RBN…) */
  spec?: { min?: number; max?: number; text: string };
  /** valor declarado (Assay / CoA) para evaluar sesgo con t de una muestra */
  reference?: { value: number; label: string };
}

/** Planilla de determinaciones + tratamiento estadístico como en las planillas de informe. */
export function ReplicateBlock(props: {
  title: string;
  columns: SheetColumn[];
  example: SheetRow[];
  results: ResultDef[];
  formula?: Step[];
  note?: ReactNode;
  /** contenido extra después de la estadística (recibe el resultado de cada ResultDef) */
  after?: (results: (LabResult | null)[]) => ReactNode;
}) {
  const [rows, setRows] = useState<SheetRow[]>(props.example);
  const parsed = rows.map(parseRow);
  const computedByResult = props.results.map((r) => parsed.map((p) => {
    try {
      const v = r.compute(p);
      return v != null && Number.isFinite(v) ? v : null;
    } catch {
      return null;
    }
  }));
  const evals = useMemo(
    () =>
      props.results.map((r, k) => {
        const vals = computedByResult[k];
        const idx = vals.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0);
        if (idx.length < 2) return null;
        const res = evaluateReplicates(idx.map((i) => vals[i]!), r.criterion);
        const included = vals.map(() => false);
        idx.forEach((i, j) => (included[i] = res.included[j]));
        return { res, included };
      }),
    [JSON.stringify(computedByResult), props.results],
  );
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="card-title mb-0">📋 {props.title}</h3>
        <div className="flex gap-2">
          <button className="btn" onClick={() => setRows(props.example)}>Datos de ejemplo</button>
          <button className="btn" onClick={() => setRows(Array.from({ length: 3 }, () => emptyRow(props.columns)))}>Vaciar</button>
        </div>
      </div>
      {props.note}
      <SheetGrid
        columns={props.columns}
        rows={rows}
        onChange={setRows}
        rowLabel={(i) => `Det. ${i + 1}`}
        computed={props.results.map((r, k) => ({
          label: (
            <>
              {r.label} ({r.unit})
            </>
          ),
          render: (i: number) => {
            const v = computedByResult[k][i];
            if (v == null) return <span className="text-slate-400">—</span>;
            const inc = evals[k]?.included[i];
            return (
              <span className={inc ? 'font-semibold' : 'text-slate-400 line-through decoration-1'} title={inc ? 'Promediable' : 'No promediable'}>
                {fmtSig(v, r.sig ?? 5)} {inc ? '✓' : ''}
              </span>
            );
          },
        }))}
      />
      <p className="text-xs text-slate-600 dark:text-slate-400">✓ = valor promediable según el criterio de la cuaderneta. Los valores tachados no se promedian.</p>
      {props.results.map((r, k) => (
        <StatsBlock key={r.key} def={r} result={evals[k]?.res ?? null} />
      ))}
      {props.after?.(evals.map((e) => e?.res ?? null))}
      {props.formula && <Procedure steps={props.formula} />}
    </section>
  );
}

/** Bloque "TRATAMIENTO ESTADÍSTICO" con el mismo formato que la planilla del informe. */
export function StatsBlock({ def, result }: { def: ResultDef; result: LabResult | null }) {
  if (!result) return <Alert kind="info">Cargá al menos 2 determinaciones completas para ver el tratamiento estadístico de {def.label.toLowerCase()}.</Alert>;
  const u = def.unit;
  const r = result;
  const res = Number.isFinite(r.cai) ? formatWithUncertainty(r.mean, r.cai) : null;
  const inSpec = def.spec && r.n ? (def.spec.min == null || r.mean >= def.spec.min) && (def.spec.max == null || r.mean <= def.spec.max) : null;
  return (
    <div className="rounded-xl border border-brand-200 p-3 dark:border-brand-900">
      <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-800 dark:text-brand-200">Tratamiento estadístico · {def.label}</div>
      <p className="mb-2 text-sm">
        <strong>Criterio de promediabilidad:</strong> {r.criterionText}
        {r.dixon && (
          <>
            {' '}Valor sospechoso {fmtSig(r.dixon.suspect, 5)}: Q = {fmtFixed(r.dixon.Q, 3)} {r.dixon.reject ? '>' : '≤'} Q crít = {fmtFixed(r.dixon.Qcrit, 3)} → {r.dixon.reject ? 'se descarta' : 'se conserva'}.
          </>
        )}
      </p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat label={`Promedio (${u})`} value={fmtSig(r.mean, 5)} />
        <Stat label="n" value={r.n} />
        <Stat label={`Desviación estándar (${u})`} value={Number.isFinite(r.s) ? fmtSig(r.s, 3) : '—'} />
        <Stat label="CV (%)" value={Number.isFinite(r.cv) ? fmtSig(r.cv, 2) : '—'} />
        <Stat label="Comp. aleatorio (CAI)" value={Number.isFinite(r.cai) ? `${fmtSig(r.cai, 2)} ${u}` : '—'} sub={r.factor === 1.96 ? '1,96·σr/√n' : `t(95 %; ${r.n - 1}) = ${fmtFixed(r.factor, 3)} · s/√n`} />
      </div>
      {res && (
        <div className="mt-3 rounded-lg bg-brand-700 px-4 py-2 text-center font-mono text-lg text-white dark:bg-brand-800">
          {def.label}: ({res.text}) {u} <span className="text-sm opacity-90">· IC 95 %</span>
        </div>
      )}
      {def.spec && inSpec != null && (
        <div className="mt-2">
          <Alert kind={inSpec ? 'ok' : 'error'}>
            {def.spec.text}: {inSpec ? '✔ CUMPLE' : '✘ NO CUMPLE'} (promedio {fmtSig(r.mean, 4)} {u}).
          </Alert>
        </div>
      )}
      {def.reference && r.n >= 2 && Number.isFinite(r.cai) && (
        <div className="mt-2">
          <Alert kind={Math.abs(r.mean - def.reference.value) <= r.cai ? 'ok' : 'warn'}>
            {def.reference.label} = {fmtSig(def.reference.value, 4)} {u}:{' '}
            {Math.abs(r.mean - def.reference.value) <= r.cai
              ? 'está dentro del intervalo de confianza → no hay evidencia de sesgo.'
              : 'queda fuera del intervalo de confianza → hay evidencia de sesgo (error sistemático).'}
          </Alert>
        </div>
      )}
      {r.warnings.map((w, i) => (
        <div key={i} className="mt-2">
          <Alert kind="warn">{w}</Alert>
        </div>
      ))}
    </div>
  );
}

/** Enlace a la pestaña Titulaciones con un caso precargado. */
export function CurveLink(props: { params: Record<string, string | number>; label?: string }) {
  const q = new URLSearchParams(Object.entries(props.params).map(([k, v]) => [k, String(v)])).toString();
  return (
    <a className="btn btn-primary" href={`#titulaciones?${q}`}>
      📈 {props.label ?? 'Ver la curva de titulación de esta práctica'}
    </a>
  );
}
