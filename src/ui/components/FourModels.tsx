/**
 * Calibración: los cuatro modelos lado a lado (2×2; una columna en el celular),
 * tabla comparativa con el mejor modelo y gráfico de residuos de barras agrupadas.
 */
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { FOUR_FORMS, FOUR_LABELS, chooseBest, fitFour, inverseFour, predict, type FourFit, type FourId } from '../../chem/stats/fourModels';
import { fmtFixed, fmtSig, fmtTick, niceTicks } from '../../chem/numeric/format';
import { ChartCard } from './ChartCard';
import { Alert } from './fields';
import { exportCsv } from './exporters';
import { useChartTheme, useDisplay } from '../display';

/** Colores accesibles (Okabe-Ito) para los 4 modelos, también en tema oscuro. */
const MODEL_COLORS: Record<FourId, { light: string; dark: string }> = {
  lineal: { light: '#0072B2', dark: '#56B4E9' },
  origen: { light: '#D55E00', dark: '#FF8C42' },
  cuadratico: { light: '#009E73', dark: '#2EC4A0' },
  cuadratico0: { light: '#CC79A7', dark: '#E39BC5' },
};

const LETTER: Record<FourId, string> = { lineal: 'a', origen: 'b', cuadratico: 'c', cuadratico0: 'd' };

/** Ecuación con coma decimal. */
export function fourEquation(f: FourFit): string {
  const s = (v: number, d = 4) => fmtSig(v, d);
  const term = (v: number, txt: string) => (v < 0 ? ` − ${s(-v)}${txt}` : ` + ${s(v)}${txt}`);
  if (f.id === 'cuadratico') return `y = ${s(f.a)}x²${term(f.m, 'x')}${term(f.b, '')}`;
  if (f.id === 'cuadratico0') return `y = ${s(f.a)}x²${term(f.m, 'x')}`;
  if (f.id === 'origen') return `y = ${s(f.m)}x`;
  return `y = ${s(f.m)}x${term(f.b, '')}`;
}

export function FourModelsSection(props: { x: number[]; y: number[]; xLabel: string; yLabel: string; y0: number | null; unit: string; extraCsvRows?: (string | number)[][] }) {
  const th = useChartTheme();
  const { dark } = useDisplay();
  const { x, y } = props;
  const fits = useMemo(() => fitFour(x, y), [x, y]);
  const best = useMemo(() => chooseBest(fits), [fits]);
  const xmax = Math.max(...x);
  const xmin = Math.min(0, ...x);
  const color = (id: FourId) => (dark ? MODEL_COLORS[id].dark : MODEL_COLORS[id].light);
  const unknown = (f: FourFit) => (props.y0 == null ? null : inverseFour(f, props.y0, xmax));

  const curves = useMemo(() => {
    const out: Record<string, { x: number; fit: number }[]> = {};
    for (const f of fits) {
      const x0 = xmin;
      out[f.id] = Array.from({ length: 61 }, (_, i) => {
        const xv = x0 + ((xmax * 1.03 - x0) * i) / 60;
        return { x: xv, fit: predict(f, xv) };
      });
    }
    return out;
  }, [fits, x, xmax, xmin]);

  // residuos agrupados: una categoría por estándar (su concentración), una barra por modelo
  const residualData = x.map((xi, i) => {
    const row: Record<string, number | string> = { conc: fmtTick(xi) };
    fits.forEach((f) => (row[f.id] = f.residuals[i]));
    return row;
  });

  const csv = () =>
    exportCsv(
      [
        ['Modelo', 'Ecuación', 'a (x²)', 'm (x)', 'b (ordenada)', 'R²', 'R² ajustado', 's_y/x', 'n', 'x desconocida'],
        ...fits.map((f) => [FOUR_LABELS[f.id], fourEquation(f), f.a, f.m, f.b, f.r2Common, f.r2adjCommon, f.syx, f.n, unknown(f) ?? '']),
        [],
        [props.xLabel, props.yLabel, ...fits.map((f) => `ŷ ${FOUR_LABELS[f.id]}`), ...fits.map((f) => `residuo ${FOUR_LABELS[f.id]}`)],
        ...x.map((xi, i) => [xi, y[i], ...fits.map((f) => predict(f, xi)), ...fits.map((f) => f.residuals[i])]),
        [],
        ['Mejor modelo', best ? FOUR_LABELS[best.id] : ''],
        ...(props.extraCsvRows ?? []),
      ],
      'calibracion-4-modelos.csv',
    );

  if (fits.length === 0) return <Alert kind="error">No se pudo ajustar ningún modelo con estos datos.</Alert>;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {fits.map((f) => {
          const isBest = best?.id === f.id;
          const pts = x.map((xi, i) => ({ x: xi, y: y[i] }));
          return (
            <div key={f.id} className={isBest ? 'rounded-2xl ring-4 ring-aguamarina' : ''}>
              <ChartCard
                title={
                  <>
                    {LETTER[f.id]}) {FOUR_LABELS[f.id]}: <span className="font-mono text-sm">{FOUR_FORMS[f.id]}</span>
                    {isBest && <span className="chip ml-2 bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">★ Mejor ajuste</span>}
                  </>
                }
                filename={`calibracion-${f.id}.png`}
              >
                <ResponsiveContainer width="100%" height={Math.round(th.height * 0.7)}>
                  <ComposedChart margin={{ top: 10, right: 15, bottom: 25, left: 0 }}>
                    <CartesianGrid stroke={th.grid} />
                    <XAxis dataKey="x" type="number" domain={[xmin, xmax * 1.03]} allowDataOverflow ticks={niceTicks(xmin, xmax, 6)} tickFormatter={fmtTick} tick={{ fontSize: th.fontSize - 1, fill: th.axis }} stroke={th.axis}
                      label={{ value: props.xLabel, position: 'insideBottom', offset: -15, fontSize: th.fontSize - 1, fill: th.axis }} />
                    <YAxis type="number" tickFormatter={fmtTick} tick={{ fontSize: th.fontSize - 1, fill: th.axis }} stroke={th.axis} width={48} />
                    <Line data={curves[f.id]} dataKey="fit" stroke={color(f.id)} strokeWidth={th.strokeWidth} dot={false} isAnimationActive={false} name="Ajuste" />
                    <Scatter data={pts.filter((_, i) => f.used[i])} dataKey="y" fill={th.text} isAnimationActive={false} name="Estándares" />
                    <Tooltip formatter={(v: number) => fmtSig(v, 4)} labelFormatter={(v: number) => `x = ${fmtSig(v, 4)}`} contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="mt-1 space-y-0.5 text-sm">
                  <div className="font-mono">{fourEquation(f)}</div>
                  <div className="flex flex-wrap gap-x-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                    <span>R² = {fmtFixed(f.r2Common, 5)}</span>
                    <span>R² aj. = {fmtFixed(f.r2adjCommon, 5)}</span>
                    <span>s_y/x = {fmtSig(f.syx, 3)}</span>
                  </div>
                </div>
              </ChartCard>
            </div>
          );
        })}
      </div>

      <section className="card space-y-3 overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="card-title mb-0">Comparación de los cuatro modelos</h3>
          <button className="btn" onClick={csv}>⬇ CSV (4 modelos)</button>
        </div>
        <table className="table-basic">
          <thead>
            <tr><th>Modelo</th><th>Ecuación</th><th>R²</th><th>R² ajustado</th><th>s_y/x</th><th>x desconocida{props.unit ? ` (${props.unit})` : ''}</th><th>Residuos</th></tr>
          </thead>
          <tbody>
            {fits.map((f) => {
              const u = unknown(f);
              return (
                <tr key={f.id} className={best?.id === f.id ? 'bg-emerald-50 font-semibold dark:bg-emerald-950/40' : ''}>
                  <td className="whitespace-nowrap">
                    <span className="mr-1 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: color(f.id) }} />
                    {LETTER[f.id]}) {FOUR_LABELS[f.id]} {best?.id === f.id && '★'}
                  </td>
                  <td className="whitespace-nowrap font-mono">{fourEquation(f)}</td>
                  <td className="font-mono">{fmtFixed(f.r2Common, 5)}</td>
                  <td className="font-mono">{fmtFixed(f.r2adjCommon, 5)}</td>
                  <td className="font-mono">{fmtSig(f.syx, 3)}</td>
                  <td className="font-mono">{props.y0 == null ? '—' : u == null ? 'fuera de rango' : fmtSig(u, 4)}</td>
                  <td className={`min-w-[11rem] ${f.pattern.flagged ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                    {f.pattern.flagged ? `⚠ ${f.pattern.text.replace('patrón en los residuos: ', '')}` : `✓ al azar (${f.pattern.runs} rachas)`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {best && <Alert kind="ok"><strong>Mejor modelo: {FOUR_LABELS[best.id]}.</strong> {best.reason}</Alert>}
        <p className="text-xs text-slate-600 dark:text-slate-400">
          R² centrado (1 − SSres/SStot) en los cuatro modelos, también en los que no tienen ordenada, para que sean comparables. R² ajustado = 1 − (1 − R²)(n − 1)/(n − p), con p = número de parámetros.
          La concentración de la desconocida usa el promedio de las señales ingresadas.
        </p>
      </section>

      <ChartCard title="Residuos (y medida − y ajustada) de los cuatro modelos" filename="residuos-4-modelos.png">
        <ResponsiveContainer width="100%" height={Math.round(th.height * 0.75)}>
          <BarChart data={residualData} margin={{ top: 10, right: 15, bottom: 25, left: 0 }}>
            <CartesianGrid stroke={th.grid} vertical={false} />
            <XAxis dataKey="conc" tick={{ fontSize: th.fontSize - 1, fill: th.axis }} stroke={th.axis}
              label={{ value: props.xLabel, position: 'insideBottom', offset: -15, fontSize: th.fontSize - 1, fill: th.axis }} />
            <YAxis tickFormatter={fmtTick} tick={{ fontSize: th.fontSize - 1, fill: th.axis }} stroke={th.axis} width={52} />
            <ReferenceLine y={0} stroke={th.axis} strokeWidth={1.5} />
            <Tooltip
              formatter={(v: number, name: string) => [fmtSig(v, 4), name]}
              labelFormatter={(l: string) => `${props.xLabel}: ${l}`}
              contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }}
              cursor={{ fill: th.grid, fillOpacity: 0.4 }}
            />
            <Legend verticalAlign="top" wrapperStyle={{ fontSize: th.fontSize - 1 }} />
            {fits.map((f) => (
              <Bar key={f.id} dataKey={f.id} name={`${LETTER[f.id]}) ${FOUR_LABELS[f.id]}`} fill={color(f.id)} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Para cada estándar, una barra por modelo. Un buen modelo tiene residuos chicos que cambian de signo al azar; si un modelo da barras positivas en los extremos y negativas en el medio (o al revés), no describe bien la curvatura.
        </p>
      </ChartCard>
    </>
  );
}
