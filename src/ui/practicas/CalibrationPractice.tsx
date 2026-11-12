/**
 * Curva de calibración "a la manera de la cuaderneta" (Prácticos 12 y 13):
 *  - Patrones por duplicado (A1, A2) → promedio; se resta el blanco y el punto (0, 0) es parte de la curva.
 *  - Se comparan los 4 modelos (lineal / cuadrático, con y sin ordenada): inspección visual, R² y residuos.
 *  - Con el modelo elegido se calculan las réplicas de la muestra; promediables si CV < 10 %.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { MODEL_LABELS, fitAllModels, inverseModel, type ModelFit, type ModelId } from '../../chem/stats/calibrationModels';
import { fmtFixed, fmtSig, fmtTick } from '../../chem/numeric/format';
import { SheetGrid, parseRow, type SheetRow } from '../components/SheetGrid';
import { SelectField, Alert } from '../components/fields';
import { useChartTheme, useSeriesColors } from '../display';
import { ReplicateBlock, type ResultDef } from './common';

export interface CalibCurve {
  model: ModelFit | null;
  xmax: number;
}

export function modelEquation(m: ModelFit, xName = 'C'): string {
  const parts: string[] = [];
  if (m.id === 'lin' || m.id === 'quad') parts.push(fmtSig(m.a, 4));
  parts.push(`${fmtSig(m.b, 5)}·${xName}`);
  if (m.c !== 0) parts.push(`${fmtSig(m.c, 4)}·${xName}²`);
  return 'A = ' + parts.join(' + ').replace(/\+ -/g, '− ');
}

export function CalibrationPractice(props: {
  xLabel: string; // ej. "C (mg/L)"
  example: SheetRow[];
  sampleTitle: string;
  sampleColumns: { key: string; label: string }[];
  sampleExample: SheetRow[];
  /** convierte la concentración medida (unidades de la curva) y los datos de la fila en el resultado final */
  sampleResult: Omit<ResultDef, 'compute'> & { fromConc: (cMeasured: number, r: Record<string, number | null>) => number | null };
  extra?: (curve: CalibCurve) => ReactNode;
}) {
  const th = useChartTheme();
  const colors = useSeriesColors();
  const [rows, setRows] = useState<SheetRow[]>(props.example);
  const [modelId, setModelId] = useState<ModelId>('lin0');

  const data = useMemo(() => {
    const pts = rows
      .map(parseRow)
      .filter((r) => r.C != null && (r.A1 != null || r.A2 != null))
      .map((r) => {
        const as = [r.A1, r.A2].filter((v): v is number => v != null);
        return { C: r.C!, A: as.reduce((s, v) => s + v, 0) / as.length };
      });
    const blank = pts.filter((p) => p.C === 0);
    const Ab = blank.length ? blank.reduce((s, p) => s + p.A, 0) / blank.length : 0;
    const corr = pts.map((p) => ({ C: p.C, A: p.A - Ab }));
    if (!corr.some((p) => p.C === 0)) corr.unshift({ C: 0, A: 0 });
    return { Ab, corr, hasBlank: blank.length > 0 };
  }, [rows]);

  const fits = useMemo(() => (data.corr.length >= 3 ? fitAllModels(data.corr.map((p) => p.C), data.corr.map((p) => p.A)) : []), [data]);
  const model = fits.find((f) => f.id === modelId) ?? null;
  const xmax = Math.max(...data.corr.map((p) => p.C), 0);
  const chart = useMemo(() => {
    const n = 60;
    return Array.from({ length: n + 1 }, (_, i) => {
      const x = (xmax * 1.05 * i) / n;
      const row: Record<string, number> = { x };
      fits.forEach((f) => (row[f.id] = f.a + f.b * x + f.c * x * x));
      return row;
    });
  }, [fits, xmax]);

  const sampleDef: ResultDef = {
    ...props.sampleResult,
    compute: (r) => {
      if (!model) return null;
      const as = [r.A1, r.A2].filter((v): v is number => v != null);
      if (!as.length) return null;
      const A = as.reduce((s, v) => s + v, 0) / as.length - data.Ab;
      const c = inverseModel(model, A, xmax);
      return c == null ? null : props.sampleResult.fromConc(c, r);
    },
  };

  return (
    <>
      <section className="card space-y-3">
        <h3 className="card-title">📈 Curva de calibración (patrones por duplicado)</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Cargá la concentración de cada patrón y sus dos lecturas de absorbancia. El blanco (C = 0) se promedia y se resta a todas las señales; el punto (0; 0) queda como un punto más de la curva.
        </p>
        <SheetGrid
          columns={[
            { key: 'C', label: props.xLabel },
            { key: 'A1', label: 'A₁' },
            { key: 'A2', label: 'A₂' },
          ]}
          rows={rows}
          onChange={setRows}
          rowLabel={(i) => `P${i}`}
          computed={[
            {
              label: 'Ā − blanco',
              render: (i) => {
                const r = parseRow(rows[i]);
                const as = [r.A1, r.A2].filter((v): v is number => v != null);
                return as.length ? fmtFixed(as.reduce((s, v) => s + v, 0) / as.length - data.Ab, 4) : '—';
              },
            },
          ]}
        />
        {!data.hasBlank && <Alert kind="warn">No hay un blanco (C = 0): no se resta ninguna señal de blanco.</Alert>}
        {fits.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="table-basic">
                <thead>
                  <tr><th>Modelo</th><th>Ecuación</th><th>R²</th><th>s residuos</th></tr>
                </thead>
                <tbody>
                  {fits.map((f) => (
                    <tr key={f.id} className={f.id === modelId ? 'bg-brand-50 dark:bg-brand-950/40' : ''}>
                      <td><button className="text-left hover:underline" onClick={() => setModelId(f.id)}>{MODEL_LABELS[f.id]}</button></td>
                      <td className="font-mono">{modelEquation(f)}</td>
                      <td className="font-mono">{fmtFixed(f.r2, 5)}</td>
                      <td className="font-mono">{fmtSig(f.sres, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">R² como en Excel: en los modelos sin ordenada se calcula sin centrar (1 − SSres/Σy²), por eso no es comparable directamente con los que tienen ordenada. Elegí el modelo por inspección visual y residuos (aleatorios, sin tendencia).</p>
            </div>
            <SelectField label="Modelo elegido para calcular las muestras" value={modelId} onChange={setModelId} options={fits.map((f) => ({ value: f.id, label: MODEL_LABELS[f.id] }))} />
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-1 text-sm font-semibold">Curva y modelos</div>
                <ResponsiveContainer width="100%" height={Math.round(th.height * 0.75)}>
                  <ComposedChart data={chart} margin={{ top: 10, right: 15, bottom: 30, left: 5 }}>
                    <CartesianGrid stroke={th.grid} />
                    <XAxis dataKey="x" type="number" domain={[0, 'auto']} tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} label={{ value: props.xLabel, position: 'insideBottom', offset: -18, fontSize: th.fontSize, fill: th.axis }} />
                    <YAxis tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} label={{ value: 'A corregida', angle: -90, position: 'insideLeft', fontSize: th.fontSize, fill: th.axis }} />
                    {fits.map((f, i) => (
                      <Line key={f.id} dataKey={f.id} dot={false} stroke={colors[i]} strokeWidth={f.id === modelId ? th.strokeWidth : 1} strokeDasharray={f.id === modelId ? undefined : '4 3'} isAnimationActive={false} name={MODEL_LABELS[f.id]} />
                    ))}
                    <Scatter data={data.corr.map((p) => ({ x: p.C, pts: p.A }))} dataKey="pts" fill={th.accent} isAnimationActive={false} />
                    <Tooltip formatter={(v: number) => fmtSig(v, 4)} labelFormatter={(v: number) => `C = ${fmtSig(v, 4)}`} contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {model && (
                <div>
                  <div className="mb-1 text-sm font-semibold">Residuos del modelo elegido</div>
                  <ResponsiveContainer width="100%" height={Math.round(th.height * 0.75)}>
                    <ComposedChart data={data.corr.map((p, i) => ({ x: p.C, r: model.residuals[i] }))} margin={{ top: 10, right: 15, bottom: 30, left: 5 }}>
                      <CartesianGrid stroke={th.grid} />
                      <XAxis dataKey="x" type="number" tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} label={{ value: props.xLabel, position: 'insideBottom', offset: -18, fontSize: th.fontSize, fill: th.axis }} />
                      <YAxis tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} />
                      <ReferenceLine y={0} stroke={th.axis} />
                      <Scatter dataKey="r" fill={th.main} isAnimationActive={false} />
                      <Tooltip formatter={(v: number) => fmtSig(v, 3)} contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
        {props.extra?.({ model, xmax })}
      </section>
      <ReplicateBlock
        title={props.sampleTitle}
        columns={props.sampleColumns}
        example={props.sampleExample}
        results={[sampleDef]}
        note={model ? <p className="text-sm">Modelo usado: <strong>{MODEL_LABELS[model.id]}</strong> — {modelEquation(model)}. A cada lectura de la muestra se le resta el blanco ({fmtFixed(data.Ab, 4)}).</p> : <Alert kind="warn">Primero cargá la curva de calibración.</Alert>}
      />
    </>
  );
}
