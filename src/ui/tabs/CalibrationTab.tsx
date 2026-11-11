/**
 * Pestaña: Curvas de calibración (mínimos cuadrados) y método de adición estándar.
 */
import { useDeferredValue, useMemo, useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { parseTable, parseList } from '../../chem/numeric/table';
import { detectionLimits, inversePrediction, linearRegression, standardAddition, type Regression } from '../../chem/stats/regression';
import { fmtFixed, fmtSig, fmtTick, niceTicks, texNum } from '../../chem/numeric/format';
import { formatWithUncertainty } from '../../chem/stats/sigfigs';
import { Alert, NumField, Segmented, Stat } from '../components/fields';
import { ChartCard } from '../components/ChartCard';
import { Procedure, type Step } from '../components/Procedure';
import { checkNum, useNum } from '../hooks';
import { useChartTheme } from '../display';
import { exportCsv } from '../components/exporters';

const EXAMPLE_CAL = `Concentración (pg/mL)\tFluorescencia
0\t2,1
2\t5,0
4\t9,0
6\t12,6
8\t17,3
10\t21,0
12\t24,7`;

const EXAMPLE_SA = `Ag agregada (ng/mL)\tAbsorbancia
0\t0,32
5\t0,41
10\t0,52
15\t0,60
20\t0,70
25\t0,77
30\t0,89`;

type Mode = 'cal' | 'sa';
type Conf = '0.90' | '0.95' | '0.99';

export default function CalibrationTab() {
  const th = useChartTheme();
  const [mode, setMode] = useState<Mode>('cal');
  const [textCal, setTextCal] = useState(EXAMPLE_CAL);
  const [textSA, setTextSA] = useState(EXAMPLE_SA);
  const text = mode === 'cal' ? textCal : textSA;
  const setText = mode === 'cal' ? setTextCal : setTextSA;
  const [xUnit, setXUnit] = useState('');
  const [conf, setConf] = useState<Conf>('0.95');
  const [y0raw, setY0raw] = useState('13,5');
  const dil = useNum('1');
  const dilErr = mode === 'sa' ? checkNum(dil.value, dil.raw, { positive: true }) : null;

  const dText = useDeferredValue(text);
  const table = useMemo(() => parseTable(dText), [dText]);
  const header = table.header;
  const xLabel = header?.[0] ?? 'x';
  const yLabel = header?.[1] ?? 'y';
  const unit = xUnit || (xLabel.match(/\(([^)]+)\)/)?.[1] ?? '');

  const fit = useMemo(() => {
    const x = table.rows.map((r) => r[0]);
    const y = table.rows.map((r) => r[1]);
    type Fit = { error: string } | { x: number[]; y: number[]; reg: Regression };
    if (x.length < 3) return { error: 'Ingresá al menos 3 pares (x, y). Podés pegar dos columnas desde Excel o Google Sheets.' } as Fit;
    try {
      return { x, y, reg: linearRegression(x, y) } as Fit;
    } catch (e) {
      return { error: (e as Error).message } as Fit;
    }
  }, [table]);

  const confidence = Number(conf);
  const y0list = parseList(y0raw);
  const reg = 'reg' in fit ? fit.reg : null;
  const lim = reg ? detectionLimits(reg) : null;
  const pred = reg && mode === 'cal' && y0list.values.length > 0 && y0list.bad.length === 0
    ? inversePrediction(reg, y0list.values.reduce((a, b) => a + b, 0) / y0list.values.length, y0list.values.length, confidence)
    : null;
  const sa = reg && mode === 'sa' ? standardAddition(reg, confidence) : null;

  // datos para graficar
  const chart = useMemo(() => {
    if (!reg || !('reg' in fit)) return null;
    const xmin = Math.min(...fit.x, mode === 'sa' && sa ? -sa.xE : Infinity, pred ? pred.x0 : Infinity, 0);
    const xmax = Math.max(...fit.x, pred ? pred.x0 : -Infinity);
    const pad = (xmax - xmin) * 0.05;
    const x1 = mode === 'sa' ? xmin - pad : Math.min(xmin, 0);
    const x2 = xmax + pad;
    return {
      points: fit.x.map((x, i) => ({ x, y: fit.y[i], res: reg.residuals[i] })),
      line: [{ x: x1, fit: reg.intercept + reg.slope * x1 }, { x: x2, fit: reg.intercept + reg.slope * x2 }],
      domain: [x1, x2] as [number, number],
    };
  }, [reg, fit, mode, sa, pred]);

  const warnings: string[] = [];
  if (reg) {
    if (reg.n < 5) warnings.push('Se recomiendan al menos 5 o 6 estándares para una calibración confiable.');
    if (pred && 'reg' in fit && (pred.x0 < Math.min(...fit.x) || pred.x0 > Math.max(...fit.x))) warnings.push('La concentración calculada cae fuera del rango de los estándares: es una extrapolación y no es confiable.');
    if (pred && lim && pred.x0 < lim.loq) warnings.push(`El resultado está por debajo del LOQ (${fmtSig(lim.loq, 3)}): se puede detectar pero no cuantificar con buena precisión.`);
    if (reg.r < 0.99 && mode === 'cal') warnings.push('r < 0,99: revisá la linealidad en el gráfico de residuos (r alto no garantiza linealidad, pero r bajo indica problemas).');
  }

  const steps = reg ? buildSteps(reg, confidence, pred, sa, lim!, mode) : [];

  return (
    <div className="space-y-4">
      <Segmented ariaLabel="Método" value={mode} onChange={setMode} options={[{ value: 'cal', label: 'Curva de calibración' }, { value: 'sa', label: 'Adición estándar' }]} />
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <div className="space-y-4">
          <section className="card space-y-3">
            <h2 className="card-title">Datos</h2>
            <label className="label" htmlFor="xydata">
              {mode === 'cal' ? 'Pegá dos columnas: concentración (x) y señal (y)' : 'Pegá: concentración agregada (x) y señal (y)'}
            </label>
            <textarea id="xydata" className="input h-56 font-mono text-sm" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
            <p className="text-xs text-slate-600 dark:text-slate-400">Se aceptan tabulación (Excel), punto y coma o espacios como separador, y coma o punto decimal. La primera fila puede ser un encabezado.</p>
            {table.skipped.length > 0 && <Alert kind="warn">Se ignoraron {table.skipped.length} línea(s) que no se pudieron leer: {table.skipped.map((s) => `línea ${s.line}`).join(', ')}.</Alert>}
            <div className="flex flex-wrap gap-2">
              <button className="btn" onClick={() => setText(mode === 'cal' ? EXAMPLE_CAL : EXAMPLE_SA)}>Cargar ejemplo</button>
              <button className="btn" onClick={() => setText('')}>Borrar</button>
            </div>
            <NumField label="Unidad de concentración (opcional)" value={xUnit} onChange={setXUnit} placeholder={unit || 'mg/L'} />
            <div>
              <span className="label">Nivel de confianza</span>
              <Segmented ariaLabel="Nivel de confianza" value={conf} onChange={setConf} options={[{ value: '0.90', label: '90 %' }, { value: '0.95', label: '95 %' }, { value: '0.99', label: '99 %' }]} />
            </div>
          </section>
          {mode === 'cal' ? (
            <section className="card space-y-3">
              <h2 className="card-title">Muestra desconocida</h2>
              <NumField
                label="Señal medida (una o varias réplicas)"
                value={y0raw}
                onChange={setY0raw}
                error={y0list.bad.length ? `No se pudo leer: ${y0list.bad.join(', ')}` : y0list.values.length === 0 ? 'Escribí al menos una señal.' : null}
                hint="Para varias réplicas separá con punto y coma: 2,9; 3,0; 2,8"
              />
            </section>
          ) : (
            <section className="card space-y-3">
              <h2 className="card-title">Muestra original</h2>
              <NumField label="Factor de dilución de la muestra" value={dil.raw} onChange={dil.setRaw} error={dilErr} hint="Si se tomaron 10 mL de muestra y se llevaron a 50 mL, el factor es 5." />
            </section>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          {'error' in fit && <Alert kind="error">{fit.error}</Alert>}
          {reg && chart && (
            <>
              {warnings.map((w, i) => <Alert key={i} kind="warn">{w}</Alert>)}
              <section className="card">
                <div className="mb-3 text-center font-mono text-lg">
                  y = ({fmtSig(reg.slope, 4)} ± {fmtSig(reg.sSlope, 2)})·x {reg.intercept >= 0 ? '+' : '−'} ({fmtSig(Math.abs(reg.intercept), 4)} ± {fmtSig(reg.sIntercept, 2)})
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <Stat label="Pendiente b" value={fmtSig(reg.slope, 5)} sub={`s_b = ${fmtSig(reg.sSlope, 3)}`} />
                  <Stat label="Ordenada a" value={fmtSig(reg.intercept, 5)} sub={`s_a = ${fmtSig(reg.sIntercept, 3)}`} />
                  <Stat label="r" value={fmtFixed(reg.r, 5)} sub={`R² = ${fmtFixed(reg.r2, 5)}`} />
                  <Stat label="s_y/x" value={fmtSig(reg.syx, 4)} sub={`n = ${reg.n}; gl = ${reg.df}`} />
                  {lim && <Stat label="LOD (3,3·s_y/x / b)" value={fmtSig(lim.lod, 3)} sub={unit} />}
                  {lim && <Stat label="LOQ (10·s_y/x / b)" value={fmtSig(lim.loq, 3)} sub={unit} />}
                  {pred && (
                    <Stat
                      label={`Desconocida x₀ (IC ${Math.round(confidence * 100)} %)`}
                      value={formatWithUncertainty(pred.x0, pred.halfWidth).text}
                      sub={`s_x₀ = ${fmtSig(pred.sx0, 3)} · t = ${fmtFixed(pred.t, 3)} · m = ${pred.m} ${unit}`}
                    />
                  )}
                  {sa && (
                    <>
                      <Stat label={`x_E en la solución medida (IC ${Math.round(confidence * 100)} %)`} value={formatWithUncertainty(sa.xE, sa.halfWidth).text} sub={`s_xE = ${fmtSig(sa.sxE, 3)} · t = ${fmtFixed(sa.t, 3)} ${unit}`} />
                      {dil.value != null && dil.value !== 1 && (
                        <Stat label="En la muestra original" value={formatWithUncertainty(sa.xE * dil.value, sa.halfWidth * dil.value).text} sub={`× factor ${dil.raw} ${unit}`} />
                      )}
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  LOD y LOQ: criterio ICH Q2(R1) basado en la desviación estándar de la regresión (s_y/x) y la pendiente. Es una estimación; otros criterios (blancos replicados, IUPAC) pueden dar valores distintos.
                </p>
              </section>

              <ChartCard
                title={mode === 'cal' ? 'Curva de calibración' : 'Adición estándar (extrapolación a y = 0)'}
                filename={mode === 'cal' ? 'calibracion.png' : 'adicion-estandar.png'}
                actions={
                  <button
                    className="btn"
                    onClick={() => exportCsv([[xLabel, yLabel, 'y ajustada', 'residuo'], ...chart.points.map((p, i) => [p.x, p.y, reg.fitted[i], p.res]), [], ['pendiente', reg.slope], ['s pendiente', reg.sSlope], ['ordenada', reg.intercept], ['s ordenada', reg.sIntercept], ['r', reg.r], ['R2', reg.r2], ['s_y/x', reg.syx], ['LOD', lim!.lod], ['LOQ', lim!.loq], ...(pred ? [['x0', pred.x0], ['s_x0', pred.sx0], ['IC +/-', pred.halfWidth]] : []), ...(sa ? [['xE', sa.xE], ['s_xE', sa.sxE], ['IC +/-', sa.halfWidth]] : [])], mode === 'cal' ? 'calibracion.csv' : 'adicion-estandar.csv')}
                  >
                    ⬇ CSV
                  </button>
                }
              >
                <ResponsiveContainer width="100%" height={th.height}>
                  <ComposedChart margin={{ top: 32, right: 20, bottom: 30, left: 10 }}>
                    <CartesianGrid stroke={th.grid} />
                    <XAxis dataKey="x" type="number" domain={chart.domain} ticks={niceTicks(chart.domain[0], chart.domain[1])} allowDataOverflow tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                      label={{ value: xLabel, position: 'insideBottom', offset: -18, fontSize: th.fontSize, fill: th.axis }} />
                    <YAxis type="number" tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                      label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: th.fontSize, fill: th.axis }} />
                    {mode === 'sa' && <ReferenceLine y={0} stroke={th.axis} />}
                    {mode === 'sa' && <ReferenceLine x={0} stroke={th.axis} />}
                    <Line data={chart.line} dataKey="fit" stroke={th.main} strokeWidth={th.strokeWidth} dot={false} isAnimationActive={false} name="Recta" />
                    <Scatter data={chart.points} dataKey="y" fill={th.accent} name="Estándares" isAnimationActive={false} />
                    {pred && <ReferenceLine y={pred.y0} stroke={th.muted} strokeDasharray="5 4" />}
                    {pred && <ReferenceLine x={pred.x0} stroke={th.muted} strokeDasharray="5 4" label={{ value: `x₀ = ${fmtSig(pred.x0, 3)}`, position: 'top', fontSize: th.fontSize - 2, fill: th.text }} />}
                    {sa && <ReferenceLine x={-sa.xE} stroke={th.muted} strokeDasharray="5 4" label={{ value: `−x_E = ${fmtSig(-sa.xE, 3)}`, position: 'top', fontSize: th.fontSize - 2, fill: th.text }} />}
                    <Tooltip formatter={(v: number) => fmtSig(v, 4)} labelFormatter={(v: number) => `x = ${fmtSig(v, 4)}`} contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Gráfico de residuos (y − ŷ)" filename="residuos.png">
                <ResponsiveContainer width="100%" height={Math.round(th.height * 0.55)}>
                  <ComposedChart data={chart.points} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                    <CartesianGrid stroke={th.grid} />
                    <XAxis dataKey="x" type="number" domain={['auto', 'auto']} tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                      label={{ value: xLabel, position: 'insideBottom', offset: -18, fontSize: th.fontSize, fill: th.axis }} />
                    <YAxis tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} label={{ value: 'residuo', angle: -90, position: 'insideLeft', fontSize: th.fontSize, fill: th.axis }} />
                    <ReferenceLine y={0} stroke={th.axis} />
                    <Scatter dataKey="res" fill={th.main} isAnimationActive={false} />
                    <Tooltip formatter={(v: number) => fmtSig(v, 3)} contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} />
                  </ComposedChart>
                </ResponsiveContainer>
                <p className="text-xs text-slate-600 dark:text-slate-400">Los residuos deberían distribuirse al azar alrededor de 0. Una forma de "U" o tendencia sugiere falta de linealidad.</p>
              </ChartCard>

              <section className="card overflow-x-auto">
                <h3 className="card-title">Tabla de datos</h3>
                <table className="table-basic">
                  <thead><tr><th>#</th><th>{xLabel}</th><th>{yLabel}</th><th>ŷ</th><th>Residuo</th></tr></thead>
                  <tbody>
                    {chart.points.map((p, i) => (
                      <tr key={i}><td>{i + 1}</td><td className="font-mono">{fmtSig(p.x, 5)}</td><td className="font-mono">{fmtSig(p.y, 5)}</td><td className="font-mono">{fmtSig(reg.fitted[i], 5)}</td><td className="font-mono">{fmtSig(p.res, 3)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <Procedure steps={steps} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function buildSteps(reg: Regression, conf: number, pred: ReturnType<typeof inversePrediction> | null, sa: ReturnType<typeof standardAddition> | null, lim: ReturnType<typeof detectionLimits>, mode: Mode): Step[] {
  const t = (x: number, s = 5) => texNum(x, s);
  const steps: Step[] = [
    {
      title: 'Sumas básicas',
      tex: [
        `n = ${reg.n},\\quad \\bar x = ${t(reg.xMean)},\\quad \\bar y = ${t(reg.yMean)}`,
        `S_{xx} = \\sum (x_i-\\bar x)^2 = ${t(reg.Sxx)},\\quad S_{xy} = \\sum (x_i-\\bar x)(y_i-\\bar y) = ${t(reg.Sxy)}`,
      ],
    },
    {
      title: 'Pendiente, ordenada y correlación (mínimos cuadrados ordinarios)',
      tex: [
        `b = \\frac{S_{xy}}{S_{xx}} = ${t(reg.slope)},\\qquad a = \\bar y - b\\bar x = ${t(reg.intercept)}`,
        `r = \\frac{S_{xy}}{\\sqrt{S_{xx}S_{yy}}} = ${t(reg.r, 6)},\\qquad R^2 = ${t(reg.r2, 6)}`,
      ],
    },
    {
      title: 'Errores',
      tex: [
        `s_{y/x} = \\sqrt{\\frac{\\sum (y_i-\\hat y_i)^2}{n-2}} = ${t(reg.syx)}`,
        `s_b = \\frac{s_{y/x}}{\\sqrt{S_{xx}}} = ${t(reg.sSlope)},\\qquad s_a = s_{y/x}\\sqrt{\\frac{\\sum x_i^2}{n\\,S_{xx}}} = ${t(reg.sIntercept)}`,
      ],
    },
    {
      title: 'Límites de detección y cuantificación (ICH Q2)',
      tex: `\\mathrm{LOD} = \\frac{3{,}3\\,s_{y/x}}{b} = ${t(lim.lod, 3)},\\qquad \\mathrm{LOQ} = \\frac{10\\,s_{y/x}}{b} = ${t(lim.loq, 3)}`,
    },
  ];
  if (mode === 'cal' && pred) {
    steps.push({
      title: `Concentración de la muestra (media de m = ${pred.m} réplica(s)) e intervalo de confianza`,
      tex: [
        `x_0 = \\frac{y_0 - a}{b} = \\frac{${t(pred.y0)} - ${t(reg.intercept)}}{${t(reg.slope)}} = ${t(pred.x0)}`,
        `s_{x_0} = \\frac{s_{y/x}}{b}\\sqrt{\\frac{1}{m}+\\frac{1}{n}+\\frac{(y_0-\\bar y)^2}{b^2 S_{xx}}} = ${t(pred.sx0, 4)}`,
        `t_{${Math.round(conf * 100)}\\%,\\,${reg.df}} = ${t(pred.t, 4)}\\quad\\Rightarrow\\quad x_0 \\pm t\\,s_{x_0} = ${t(pred.x0, 4)} \\pm ${t(pred.halfWidth, 3)}`,
      ],
    });
  }
  if (mode === 'sa' && sa) {
    steps.push({
      title: 'Adición estándar: extrapolación a señal cero',
      tex: [
        `x_E = \\frac{a}{b} = \\frac{${t(reg.intercept)}}{${t(reg.slope)}} = ${t(sa.xE)}`,
        `s_{x_E} = \\frac{s_{y/x}}{b}\\sqrt{\\frac{1}{n}+\\frac{\\bar y^2}{b^2 S_{xx}}} = ${t(sa.sxE, 4)}`,
        `x_E \\pm t\\,s_{x_E} = ${t(sa.xE, 4)} \\pm ${t(sa.halfWidth, 3)}\\quad (t = ${t(sa.t, 4)})`,
      ],
    });
  }
  steps.push({ text: 'Fórmulas según Miller & Miller, "Estadística y Quimiometría para Química Analítica", cap. 5.' });
  return steps;
}
