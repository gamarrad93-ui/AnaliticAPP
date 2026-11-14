/**
 * Pestaña: Curvas de calibración (mínimos cuadrados) y método de adición estándar.
 */
import { useDeferredValue, useMemo, useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { DataGrid, emptyGrid, gridFromText, gridToPoints } from '../components/DataGrid';
import { detectionLimits, inversePrediction, linearRegression, standardAddition, type Regression } from '../../chem/stats/regression';
import { parseList } from '../../chem/numeric/table';
import { FourModelsSection } from '../components/FourModels';
import { fmtFixed, fmtSig, fmtTick, niceTicks, texNum } from '../../chem/numeric/format';
import { formatWithUncertainty } from '../../chem/stats/sigfigs';
import { Alert, NumField, Segmented, Stat, Toggle } from '../components/fields';
import { blankCorrect } from '../../chem/stats/blank';
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

/** Ejercicio 3 del Práctico de Curvas de Calibración (cuaderneta 2026): Cr por AAS, promedio de 3 lecturas. */
const EXAMPLE_CR = `C Cr (ppm)\tA (promedio)
0,0\t0,0248
0,5\t0,05447
1,0\t0,09533
2,5\t0,2544
5,0\t0,4883
7,5\t0,7557
10,0\t0,9203`;

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
  const [gridCal, setGridCal] = useState(() => gridFromText(EXAMPLE_CAL));
  const [gridSA, setGridSA] = useState(() => gridFromText(EXAMPLE_SA));
  const grid = mode === 'cal' ? gridCal : gridSA;
  const setGrid = mode === 'cal' ? setGridCal : setGridSA;
  const [xUnit, setXUnit] = useState('');
  const [conf, setConf] = useState<Conf>('0.95');
  const dil = useNum('1');
  const [y0raw, setY0raw] = useState('13,5');
  // corrección por blanco: se resta la señal promedio de los puntos con x = 0
  const [blankCorr, setBlankCorr] = useState(false);
  const dilErr = mode === 'sa' ? checkNum(dil.value, dil.raw, { positive: true }) : null;

  const dGrid = useDeferredValue(grid);
  const table = useMemo(() => gridToPoints(dGrid), [dGrid]);
  const xLabel = grid.xName.trim() || 'x';
  const yLabel = grid.yName.trim() || 'y';
  const unit = xUnit || (xLabel.match(/\(([^)]+)\)/)?.[1] ?? '');

  const fit = useMemo(() => {
    const x0 = table.rows.map((r) => r[0]);
    const y0 = table.rows.map((r) => r[1]);
    // con la casilla marcada (sólo en curva de calibración) los modelos se ajustan a los datos corregidos
    const bc = mode === 'cal' && blankCorr ? blankCorrect(x0, y0) : null;
    const x = bc ? bc.x : x0;
    const y = bc ? bc.y : y0;
    const blank = bc?.blank ?? null;
    const nBlank = bc?.nBlank ?? 0;
    type Fit = { error: string } | { x: number[]; y: number[]; reg: Regression; blank: number | null; nBlank: number };
    if (x.length < 3) return { error: 'Ingresá al menos 3 pares (x, y). Podés pegar dos columnas desde Excel o Google Sheets.' } as Fit;
    try {
      return { x, y, reg: linearRegression(x, y), blank, nBlank } as Fit;
    } catch (e) {
      return { error: (e as Error).message } as Fit;
    }
  }, [table, mode, blankCorr]);
  const blank = 'reg' in fit ? fit.blank : null;
  const blankApplied = mode === 'cal' && blankCorr && blank != null;
  const yLabelFit = blankApplied ? `${yLabel} − blanco` : yLabel;

  const confidence = Number(conf);
  const reg = 'reg' in fit ? fit.reg : null;
  const sa = reg && mode === 'sa' ? standardAddition(reg, confidence) : null;
  const y0list = parseList(y0raw);
  const y0raw_mean = y0list.values.length && !y0list.bad.length ? y0list.values.reduce((a, b) => a + b, 0) / y0list.values.length : null;
  // a la señal de la muestra también se le resta el blanco
  const y0mean = y0raw_mean != null && blankApplied ? y0raw_mean - blank! : y0raw_mean;
  const lim = reg && mode === 'cal' ? detectionLimits(reg) : null;
  const pred = reg && mode === 'cal' && y0mean != null ? inversePrediction(reg, y0mean, y0list.values.length, confidence) : null;

  // datos para graficar
  const chart = useMemo(() => {
    if (!reg || !('reg' in fit)) return null;
    const xmin = Math.min(...fit.x, mode === 'sa' && sa ? -sa.xE : Infinity, 0);
    const xmax = Math.max(...fit.x);
    const pad = (xmax - xmin) * 0.05;
    const x1 = mode === 'sa' ? xmin - pad : Math.min(xmin, 0);
    const x2 = xmax + pad;
    return {
      points: fit.x.map((x, i) => ({ x, y: fit.y[i], res: reg.residuals[i] })),
      line: [{ x: x1, fit: reg.intercept + reg.slope * x1 }, { x: x2, fit: reg.intercept + reg.slope * x2 }],
      domain: [x1, x2] as [number, number],
    };
  }, [reg, fit, mode, sa]);

  const warnings: string[] = [];
  if (reg) {
    if (reg.n < 5) warnings.push('Se recomiendan al menos 5 o 6 estándares para una calibración confiable.');
    if (reg.r < 0.99 && mode === 'cal') warnings.push('r < 0,99: revisá la linealidad en el gráfico de residuos (r alto no garantiza linealidad, pero r bajo indica problemas).');
    if (pred && 'x' in fit && (pred.x0 < Math.min(...fit.x) || pred.x0 > Math.max(...fit.x))) warnings.push('La concentración de la desconocida cae fuera del rango de los estándares: es una extrapolación y no es confiable.');
    if (pred && lim && pred.x0 < lim.loq) warnings.push(`La concentración de la desconocida está por debajo del LOQ (${fmtSig(lim.loq, 3)}): se detecta pero no se cuantifica con buena precisión.`);
  }

  const steps: Step[] = reg ? buildSteps(reg, sa, mode, lim, pred, confidence) : [];
  if (blankApplied && 'reg' in fit)
    steps.unshift({
      title: 'Corrección por blanco',
      text: `Se promediaron ${fit.nBlank} lectura(s) del blanco y se restó ese valor a todas las señales (estándares y muestra). Los blancos quedan como el punto (0; 0).`,
      tex: `\\bar y_{blanco} = ${texNum(blank!, 5)},\\qquad y_i' = y_i - \\bar y_{blanco}`,
    });

  return (
    <div className="space-y-4">
      <Segmented ariaLabel="Método" value={mode} onChange={setMode} options={[{ value: 'cal', label: 'Curva de calibración' }, { value: 'sa', label: 'Adición estándar' }]} />
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <div className="space-y-4">
          <section className="card space-y-3">
            <h2 className="card-title">Datos</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {mode === 'cal' ? 'Concentración de cada estándar y su señal.' : 'Concentración agregada en cada solución y su señal.'} <strong>Enter</strong> pasa a la celda siguiente. También podés pegar dos columnas desde Excel o Google Sheets. Los nombres de las columnas se editan tocándolos.
            </p>
            <DataGrid value={grid} onChange={setGrid} />
            {table.invalid.length > 0 && <Alert kind="warn">Fila(s) {table.invalid.join(', ')}: hay un valor que no es un número (se ignora{table.invalid.length > 1 ? 'n' : ''}).</Alert>}
            {mode === 'cal' && (
              <div className="space-y-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                <Toggle label={<strong>Corrección por blanco</strong>} checked={blankCorr} onChange={setBlankCorr} />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Se promedian las señales de los puntos con concentración 0 (blancos), ese valor se resta a todas las señales (también a la muestra) y los blancos quedan como un único punto (0; 0). Los cuatro modelos se ajustan a los datos corregidos.
                </p>
                {blankCorr && blank != null && 'reg' in fit && (
                  <Alert kind="info">Blanco = <strong className="font-mono">{fmtSig(blank, 4)}</strong> (promedio de {fit.nBlank} lectura{fit.nBlank > 1 ? 's' : ''}); se restó a todas las señales.</Alert>
                )}
                {blankCorr && blank == null && 'reg' in fit && <Alert kind="warn">No hay ningún punto con concentración 0: no se puede corregir por blanco. Agregá el blanco a la tabla.</Alert>}
              </div>
            )}
            {table.incomplete.length > 0 && <Alert kind="warn">Fila(s) {table.incomplete.join(', ')}: falta completar x o y (se ignora{table.incomplete.length > 1 ? 'n' : ''}).</Alert>}
            <div className="flex flex-wrap gap-2">
              <button
                className="btn"
                onClick={() => {
                  setGrid(gridFromText(mode === 'cal' ? EXAMPLE_CAL : EXAMPLE_SA));
                  if (mode === 'cal') setY0raw('13,5');
                }}
              >
                Cargar ejemplo
              </button>
              {mode === 'cal' && (
                <button
                  className="btn"
                  onClick={() => {
                    setGrid(gridFromText(EXAMPLE_CR));
                    setY0raw('0,5159; 0,5201; 0,5099'); // absorbancias de la muestra del ejercicio
                  }}
                >
                  Ejemplo: Cr por absorción atómica
                </button>
              )}
              <button className="btn" onClick={() => setGrid(emptyGrid())}>Vaciar tabla</button>
            </div>
            <NumField label="Unidad de concentración (opcional)" value={xUnit} onChange={setXUnit} placeholder={unit || 'mg/L'} />
            <div>
              <span className="label">Nivel de confianza</span>
              <Segmented ariaLabel="Nivel de confianza" value={conf} onChange={setConf} options={[{ value: '0.90', label: '90 %' }, { value: '0.95', label: '95 %' }, { value: '0.99', label: '99 %' }]} />
            </div>
          </section>
          {mode === 'cal' && (
            <section className="card space-y-3">
              <h2 className="card-title">Muestra desconocida</h2>
              <NumField
                label="Señal medida (una o varias réplicas)"
                value={y0raw}
                onChange={setY0raw}
                error={y0list.bad.length ? `No se pudo leer: ${y0list.bad.join(', ')}` : null}
                hint="Para varias réplicas separá con punto y coma: 13,5; 13,4; 13,6. Dejalo vacío si no hay muestra."
              />
              {blankApplied && y0raw_mean != null && <p className="text-sm">Señal corregida: {fmtSig(y0raw_mean, 4)} − {fmtSig(blank!, 4)} = <strong className="font-mono">{fmtSig(y0mean!, 4)}</strong></p>}
            </section>
          )}
          {mode === 'sa' && (
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
                {mode === 'cal' && <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">Modelo lineal (mínimos cuadrados ordinarios): parámetros con sus errores, LOD/LOQ y la concentración de la desconocida con su intervalo de confianza. La comparación con los otros modelos está más abajo.</p>}
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
              </section>

              {mode === 'cal' && 'x' in fit && (
                <FourModelsSection
                  x={fit.x}
                  y={fit.y}
                  xLabel={xLabel}
                  yLabel={yLabelFit}
                  y0={y0mean}
                  unit={unit}
                  extraCsvRows={[
                    [],
                    ['Corrección por blanco', blankApplied ? `sí (blanco = ${blank})` : 'no'],
                    ['Modelo lineal: s_y/x', reg.syx],
                    ['LOD (3,3·s/b)', lim?.lod ?? ''],
                    ['LOQ (10·s/b)', lim?.loq ?? ''],
                    ...(pred ? [['x0 (lineal)', pred.x0], ['s_x0', pred.sx0], [`IC ${Math.round(confidence * 100)} % +/-`, pred.halfWidth]] : []),
                  ]}
                />
              )}

              {mode === 'sa' && (<>
              <ChartCard
                title="Adición estándar (extrapolación a y = 0)"
                filename="adicion-estandar.png"
                actions={
                  <button
                    className="btn"
                    onClick={() => exportCsv([[xLabel, yLabel, 'y ajustada', 'residuo'], ...chart.points.map((p, i) => [p.x, p.y, reg.fitted[i], p.res]), [], ['pendiente', reg.slope], ['s pendiente', reg.sSlope], ['ordenada', reg.intercept], ['s ordenada', reg.sIntercept], ['r', reg.r], ['R2', reg.r2], ...(sa ? [['xE', sa.xE], ['s_xE', sa.sxE], ['IC +/-', sa.halfWidth]] : [])], 'adicion-estandar.csv')}
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
              </>)}
              <Procedure steps={steps} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function buildSteps(
  reg: Regression,
  sa: ReturnType<typeof standardAddition> | null,
  mode: Mode,
  lim: ReturnType<typeof detectionLimits> | null,
  pred: ReturnType<typeof inversePrediction> | null,
  conf: number,
): Step[] {
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
  ];
  if (mode === 'cal') {
    if (lim) steps.push({ title: 'Límites de detección y cuantificación', tex: `\\mathrm{LOD} = \\frac{3{,}3\\,s_{y/x}}{b} = ${t(lim.lod, 3)},\\qquad \\mathrm{LOQ} = \\frac{10\\,s_{y/x}}{b} = ${t(lim.loq, 3)}` });
    if (pred)
      steps.push({
        title: `Concentración de la desconocida (media de m = ${pred.m} réplica(s)) e intervalo de confianza`,
        tex: [
          `x_0 = \\frac{y_0 - a}{b} = \\frac{${t(pred.y0)} - ${t(reg.intercept)}}{${t(reg.slope)}} = ${t(pred.x0)}`,
          `s_{x_0} = \\frac{s_{y/x}}{b}\\sqrt{\\frac{1}{m}+\\frac{1}{n}+\\frac{(y_0-\\bar y)^2}{b^2 S_{xx}}} = ${t(pred.sx0, 4)}`,
          `t_{${Math.round(conf * 100)}\\%,\\,${reg.df}} = ${t(pred.t, 4)}\\quad\\Rightarrow\\quad x_0 \\pm t\\,s_{x_0} = ${t(pred.x0, 4)} \\pm ${t(pred.halfWidth, 3)}`,
        ],
      });
    steps.push({
      title: 'Los otros tres modelos',
      text: 'Por el origen: m = Σxy/Σx². Cuadrático: mínimos cuadrados con columnas 1, x, x². Ponderado: pesos wᵢ = 1/xᵢ² normalizados a Σw = n (se omiten los x = 0).',
      tex: [
        'm_w = \\frac{\\sum w_i (x_i-\\bar x_w)(y_i-\\bar y_w)}{\\sum w_i (x_i-\\bar x_w)^2},\\quad b_w = \\bar y_w - m_w\\,\\bar x_w,\\quad \\bar x_w = \\frac{\\sum w_i x_i}{n}',
        'R^2_{aj} = 1 - (1-R^2)\\,\\frac{n-1}{n-p}',
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
  return steps;
}
