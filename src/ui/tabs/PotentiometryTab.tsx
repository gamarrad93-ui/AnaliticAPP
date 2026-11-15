/**
 * Pestaña: Potenciometría — tratamiento de datos experimentales de una valoración,
 * calibración del pH-metro e incertidumbre por propagación (Práctico 11).
 */
import { useMemo, useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { cleanData, equivalencePoints, type EquivalenceEstimate } from '../../chem/potenciometria/tabla';
import { calibratePhMeter } from '../../chem/potenciometria/calibracion';
import { combinedUncertainty, P11_FORMULA, P11_MM, P11_UNCERTAINTIES } from '../../chem/potenciometria/incertidumbre';
import { parseExpression, variablesOf } from '../../chem/stats/expression';
import { pHAt, type TitrationSetup } from '../../chem/acidbase/titration';
import { getSystem } from '../../chem/data/acids';
import { fmtFixed, fmtSig, fmtTick, niceTicks, parseNumber, texNum } from '../../chem/numeric/format';
import { Alert, NumField, Segmented, Stat } from '../components/fields';
import { ChartCard } from '../components/ChartCard';
import { Procedure } from '../components/Procedure';
import { DataGrid, gridFromText, gridToPoints, type GridData } from '../components/DataGrid';
import { exportCsv } from '../components/exporters';
import { useChartTheme } from '../display';

type Mode = 'pH' | 'E';

/** Datos simulados con el motor ácido-base, con lecturas redondeadas como las de un pH-metro (0,01). */
function simulated(s: TitrationSetup, Gexp: number, Gend: number, fine: number): string {
  const lines = ['G (mL)\tpH'];
  for (let g = 0; g <= Gend + 1e-9; ) {
    const gg = Math.round(g * 100) / 100;
    lines.push(`${String(gg).replace('.', ',')}\t${fmtFixed(pHAt(s, gg), 2)}`);
    g += g >= Gexp - fine - 1e-9 && g < Gexp + fine - 1e-9 ? 0.2 : 1.0;
  }
  return lines.join('\n');
}
const EX_ACETIC = () =>
  simulated({ analyte: [{ kind: 'weak', C: 0.1, system: getSystem('acetico')!, hAdded: 1 }], Va: 25, titrant: { kind: 'strong-base', C: 0.1, n: 1 } }, 25, 30, 4);
const EX_PHOSPHORIC = () =>
  simulated({ analyte: [{ kind: 'weak', C: 0.05, system: getSystem('fosforico')!, hAdded: 3 }], Va: 20, titrant: { kind: 'strong-base', C: 0.1, n: 1 } }, 15, 24, 9);

const f = (v: number | null | undefined, d = 3) => (v == null || !Number.isFinite(v) ? '' : fmtSig(v, d + 1));

export default function PotentiometryTab() {
  const th = useChartTheme();
  const [mode, setMode] = useState<Mode>('pH');
  const [grid, setGrid] = useState<GridData>(() => gridFromText(EX_ACETIC(), { xName: 'G (mL)', yName: 'pH' }));
  const yName = mode === 'pH' ? 'pH' : 'E (mV)';
  const pts = gridToPoints(grid);
  const data = useMemo(() => cleanData(pts.rows.map((r) => r[0]), pts.rows.map((r) => r[1])), [pts.rows]);
  const res = useMemo(() => (data.G.length >= 4 ? equivalencePoints(data.G, data.y) : null), [data]);
  const yLab = mode === 'pH' ? 'pH' : 'E';
  const d1Lab = `Δ${yLab}/ΔG`;
  const d2Lab = `Δ(Δ${yLab}/ΔG)/ΔḠ`;

  const peRows = new Set(res?.points.map((p) => p.k) ?? []);
  const csvRows = () => {
    if (!res) return [];
    return [
      ['G (mL)', yName, 'Ḡ (mL)', d1Lab, 'Ḡ̄ (mL)', d2Lab],
      ...res.rows.map((r) => [r.G, r.y, r.Gbar ?? '', r.d1 ?? '', r.Gbb ?? '', r.d2 ?? '']),
      [],
      ['PE', 'Máx. 1ª derivada (mL)', 'Parábola (mL)', '2ª derivada (mL)', 'Método gráfico (mL)', `${yLab} en el PE`],
      ...res.points.map((p, i) => [`PE${i + 1}`, p.Gmax1, p.Gparabola ?? '', p.Gd2 ?? '', p.graphical?.G ?? '', p.yAtPE]),
    ];
  };
  const exportXlsx = async () => {
    const { default: writeXlsxFile } = await import('write-excel-file/browser');
    const rows = csvRows().map((r, i) =>
      r.map((v) => (typeof v === 'number' ? { value: v, type: Number } : { value: String(v), type: String, fontWeight: i === 0 ? ('bold' as const) : undefined })),
    );
    await writeXlsxFile(rows as never, { columns: [14, 12, 12, 16, 12, 18].map((w) => ({ width: w })) } as never).toFile('valoracion-potenciometrica.xlsx');
  };

  // ---- gráficos ----
  const Gmin = data.G[0] ?? 0;
  const Gmax = data.G[data.G.length - 1] ?? 1;
  const xTicks = niceTicks(Gmin, Gmax, 8);
  const curve = data.G.map((g, i) => ({ x: g, y: data.y[i] }));
  const d1 = res?.rows.filter((r) => r.d1 != null).map((r) => ({ x: r.Gbar!, y: r.d1! })) ?? [];
  const d2 = res?.rows.filter((r) => r.d2 != null).map((r) => ({ x: r.Gbb!, y: r.d2! })) ?? [];
  const peLines = (res?.points ?? []).map((p, i) => <ReferenceLine key={`pe${i}`} x={p.Gd2 ?? p.Gmax1} stroke="#dc2626" strokeDasharray="5 4" label={{ value: `PE${i + 1}`, position: 'top', fontSize: th.fontSize - 2, fill: th.axis }} />);
  const tangents = (p: EquivalenceEstimate) => {
    if (!p.graphical) return [];
    const { slope, cBefore, cAfter, cMid } = p.graphical;
    const span = Math.max(1.5, (Gmax - Gmin) * 0.12);
    const x0 = p.graphical.G - span;
    const x1 = p.graphical.G + span;
    const seg = (c: number) => [{ x: x0, y: slope * x0 + c }, { x: x1, y: slope * x1 + c }];
    return [seg(cBefore), seg(cAfter), seg(cMid)];
  };
  const axis = { tick: { fontSize: th.fontSize - 1, fill: th.axis }, stroke: th.axis };
  const tooltip = <Tooltip formatter={(v: number) => fmtSig(v, 4)} labelFormatter={(v: number) => `G = ${fmtSig(v, 4)} mL`} contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} />;
  const xAxis = (label: string) => (
    <XAxis dataKey="x" type="number" domain={[Gmin, Gmax]} ticks={xTicks} tickFormatter={fmtTick} allowDataOverflow {...axis}
      label={{ value: label, position: 'insideBottom', offset: -15, fontSize: th.fontSize - 1, fill: th.axis }} />
  );

  // ---- calibración ----
  const [buf, setBuf] = useState([
    { pH: '4,01', E: '177,4' },
    { pH: '7,00', E: '0,6' },
    { pH: '10,01', E: '-176,9' },
  ]);
  const [temp, setTemp] = useState('25');
  const [thr, setThr] = useState('95');
  const tempV = parseNumber(temp);
  const thrV = parseNumber(thr);
  const bufV = buf.map((b) => ({ pH: parseNumber(b.pH), E: parseNumber(b.E) })).filter((b) => b.pH != null && b.E != null) as { pH: number; E: number }[];
  let cal: ReturnType<typeof calibratePhMeter> | null = null;
  let calErr: string | null = null;
  try {
    if (tempV == null || thrV == null) throw new Error('Completá la temperatura y el criterio.');
    cal = calibratePhMeter(bufV.map((b) => b.pH), bufV.map((b) => b.E), tempV, thrV);
  } catch (e) {
    calErr = (e as Error).message;
  }

  // ---- incertidumbre ----
  const [formula, setFormula] = useState(P11_FORMULA);
  const [vars, setVars] = useState<Record<string, { value: string; u: string }>>({
    cNaOH: { value: '0,01012', u: '0,00005' },
    G: { value: '13,10', u: fmtSig(P11_UNCERTAINTIES.G, 1) },
    MM: { value: String(P11_MM).replace('.', ','), u: String(P11_UNCERTAINTIES.MM).replace('.', ',') },
    m: { value: '21,2345', u: String(P11_UNCERTAINTIES.m).replace('.', ',') },
  });
  const [kRaw, setKRaw] = useState('2');
  let names: string[] = [];
  let fErr: string | null = null;
  try {
    names = [...variablesOf(parseExpression(formula))];
  } catch (e) {
    fErr = (e as Error).message;
  }
  const kV = parseNumber(kRaw);
  let unc: ReturnType<typeof combinedUncertainty> | null = null;
  if (!fErr && kV != null && kV > 0) {
    const inp: Record<string, { value: number; u: number }> = {};
    let ok = true;
    for (const nm of names) {
      const v = parseNumber(vars[nm]?.value ?? '');
      const u = parseNumber(vars[nm]?.u ?? '');
      if (v == null || u == null || u < 0) ok = false;
      else inp[nm] = { value: v, u };
    }
    if (ok) {
      try {
        unc = combinedUncertainty(formula, inp, kV);
      } catch (e) {
        fErr = (e as Error).message;
      }
    }
  }
  const setVar = (nm: string, key: 'value' | 'u', v: string) => setVars((s) => ({ ...s, [nm]: { value: s[nm]?.value ?? '', u: s[nm]?.u ?? '', [key]: v } }));

  return (
    <div className="space-y-4">
      {/* ================= a) valoración ================= */}
      <section className="card min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="card-title mb-0">1. Datos de la valoración</h2>
          <Segmented value={mode} onChange={(m) => { setMode(m); setGrid((g) => ({ ...g, yName: m === 'pH' ? 'pH' : 'E (mV)' })); }} options={[{ value: 'pH', label: 'G y pH' }, { value: 'E', label: 'G y E (mV)' }]} ariaLabel="Tipo de lectura" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_1fr]">
          <div className="space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">Pegá las dos columnas desde Excel o Google Sheets (gasto de bureta y lectura). Enter pasa a la celda siguiente.</p>
            <DataGrid value={grid} onChange={setGrid} />
            <div className="flex flex-wrap gap-2">
              <button className="btn" onClick={() => { setMode('pH'); setGrid(gridFromText(EX_ACETIC(), { xName: 'G (mL)', yName: 'pH' })); }}>Ejemplo: CH₃COOH</button>
              <button className="btn" onClick={() => { setMode('pH'); setGrid(gridFromText(EX_PHOSPHORIC(), { xName: 'G (mL)', yName: 'pH' })); }}>Ejemplo: H₃PO₄ (2 saltos)</button>
              <button className="btn" onClick={() => setGrid(gridFromText('G (mL)\t' + yName))}>Vaciar</button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Los ejemplos son curvas simuladas con el motor ácido-base (25,00 mL de CH₃COOH 0,1 M y 20,00 mL de H₃PO₄ 0,05 M, con NaOH 0,1 M), con incrementos de 1,0 mL y de 0,2 mL cerca del punto equivalente.</p>
          </div>
          <div className="min-w-0 space-y-3">
            {data.warnings.map((w, i) => <Alert key={i} kind="warn">{w}</Alert>)}
            {pts.invalid.length > 0 && <Alert kind="error">Hay celdas que no son números (filas {pts.invalid.map((i) => i + 1).join(', ')}).</Alert>}
            {!res && <Alert kind="info">Cargá al menos 4 puntos para calcular las derivadas.</Alert>}
            {res && res.points.length === 0 && <Alert kind="warn">No se encontró ningún salto claro en la curva.</Alert>}
            {res && res.points.map((p, i) => (
              <div key={i} className="space-y-1">
                <div className="text-sm font-semibold">PE{i + 1}{res.points.length > 1 ? '' : ' (punto de equivalencia)'}</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label="1) Máximo de la 1ª derivada" value={`${fmtFixed(p.Gmax1, 2)} mL`} sub={p.Gparabola != null ? `refinado con parábola: ${fmtFixed(p.Gparabola, 2)} mL` : `${d1Lab} máx = ${fmtSig(p.d1max, 3)}`} />
                  <Stat label="2) Cero de la 2ª derivada" value={p.Gd2 != null ? `${fmtFixed(p.Gd2, 2)} mL` : '—'} sub="interpolación lineal" />
                  <Stat label="3) Método gráfico" value={p.graphical ? `${fmtFixed(p.graphical.G, 2)} mL` : '—'} sub="tangentes paralelas" />
                  <Stat label={`${yLab} en el PE`} value={fmtFixed(p.yAtPE, mode === 'pH' ? 2 : 1)} />
                </div>
              </div>
            ))}
            {res && res.points[0] && (
              <Procedure
                steps={[
                  { title: 'Tabla de derivadas', tex: [`\\bar G_i = \\frac{G_i + G_{i+1}}{2} \\qquad \\frac{\\Delta ${yLab}}{\\Delta G} = \\frac{${yLab}_{i+1} - ${yLab}_i}{G_{i+1} - G_i}`, `\\bar{\\bar G}_i = \\frac{\\bar G_i + \\bar G_{i+1}}{2} \\qquad \\frac{\\Delta(\\Delta ${yLab}/\\Delta G)}{\\Delta \\bar G} = \\frac{d1_{i+1} - d1_i}{\\bar G_{i+1} - \\bar G_i}`] },
                  ...res.points.flatMap((p, i) => [
                    { title: `PE${i + 1} — máximo de la 1ª derivada`, text: `El mayor valor de |${d1Lab}| (${fmtSig(p.d1max, 4)}) está en Ḡ = ${fmtFixed(p.Gmax1, 3)} mL.${p.Gparabola != null ? ` Con una parábola por ese punto y sus dos vecinos, el máximo queda en ${fmtFixed(p.Gparabola, 3)} mL (refinado).` : ''}` },
                    ...(p.Gd2 != null && p.d2a && p.d2b
                      ? [{ title: `PE${i + 1} — cero de la 2ª derivada`, text: 'Entre los dos puntos donde la 2ª derivada cambia de signo:', tex: `G_{PE} = \\bar{\\bar G}_a + d2_a\\,\\frac{\\bar{\\bar G}_b - \\bar{\\bar G}_a}{d2_a - d2_b} = ${texNum(p.d2a.Gbb, 5)} + (${texNum(p.d2a.d2, 4)})\\,\\frac{${texNum(p.d2b.Gbb, 5)} - ${texNum(p.d2a.Gbb, 5)}}{${texNum(p.d2a.d2, 4)} - (${texNum(p.d2b.d2, 4)})} = ${texNum(p.Gd2, 5)}\\ \\mathrm{mL}` }]
                      : []),
                    ...(p.graphical ? [{ title: `PE${i + 1} — método gráfico`, text: `Se trazan dos rectas paralelas (pendiente ${fmtSig(p.graphical.slope, 3)}) tangentes a las ramas antes y después del salto, y la recta equidistante entre ambas. Su intersección con la curva da G = ${fmtFixed(p.graphical.G, 3)} mL.` }] : []),
                  ]),
                ]}
              />
            )}
          </div>
        </div>
      </section>

      {res && (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            <ChartCard title={`${yLab} vs G`} filename="curva-potenciometrica.png">
              <ResponsiveContainer width="100%" height={th.height * 0.75}>
                <ComposedChart margin={{ top: 18, right: 15, bottom: 25, left: 0 }}>
                  <CartesianGrid stroke={th.grid} />
                  {xAxis('G (mL)')}
                  <YAxis type="number" domain={['auto', 'auto']} tickFormatter={fmtTick} width={44} {...axis} />
                  {tooltip}
                  {res.points.flatMap((p, i) => tangents(p).map((seg, j) => <Line key={`t${i}${j}`} data={seg} dataKey="y" stroke={j === 2 ? '#7c3aed' : th.axis} strokeDasharray={j === 2 ? undefined : '4 3'} strokeWidth={1.2} dot={false} isAnimationActive={false} />))}
                  <Line data={curve} dataKey="y" stroke={th.main} strokeWidth={th.strokeWidth} dot={{ r: 2 }} isAnimationActive={false} name={yLab} />
                  {peLines}
                  {res.points.map((p, i) => <ReferenceDot key={`dot${i}`} x={p.graphical?.G ?? p.Gmax1} y={p.yAtPE} r={5} fill="#7c3aed" stroke="none" />)}
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-600 dark:text-slate-400">Líneas grises punteadas: tangentes paralelas a las ramas. Violeta: recta media; el punto violeta es el PE por el método gráfico.</p>
            </ChartCard>
            <ChartCard title={`1ª derivada (${d1Lab} vs Ḡ)`} filename="derivada-1.png">
              <ResponsiveContainer width="100%" height={th.height * 0.75}>
                <ComposedChart margin={{ top: 18, right: 15, bottom: 25, left: 0 }}>
                  <CartesianGrid stroke={th.grid} />
                  {xAxis('Ḡ (mL)')}
                  <YAxis type="number" tickFormatter={fmtTick} width={44} {...axis} />
                  {tooltip}
                  <Line data={d1} dataKey="y" stroke={th.main} strokeWidth={th.strokeWidth} dot={{ r: 2 }} isAnimationActive={false} />
                  {peLines}
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title={`2ª derivada (${d2Lab} vs Ḡ̄)`} filename="derivada-2.png">
              <ResponsiveContainer width="100%" height={th.height * 0.75}>
                <ComposedChart margin={{ top: 18, right: 15, bottom: 25, left: 0 }}>
                  <CartesianGrid stroke={th.grid} />
                  {xAxis('Ḡ̄ (mL)')}
                  <YAxis type="number" tickFormatter={fmtTick} width={44} {...axis} />
                  {tooltip}
                  <ReferenceLine y={0} stroke={th.axis} strokeWidth={1.5} />
                  <Line data={d2} dataKey="y" stroke={th.main} strokeWidth={th.strokeWidth} dot={{ r: 2 }} isAnimationActive={false} />
                  <Scatter data={res.points.filter((p) => p.Gd2 != null).map((p) => ({ x: p.Gd2!, y: 0 }))} dataKey="y" fill="#dc2626" isAnimationActive={false} />
                  {peLines}
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <section className="card min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="card-title mb-0">2. Tabla del informe</h2>
              <div className="flex gap-2">
                <button className="btn" onClick={() => exportCsv(csvRows(), 'valoracion-potenciometrica.csv')}>⬇ CSV</button>
                <button className="btn" onClick={exportXlsx}>⬇ XLSX</button>
              </div>
            </div>
            <div className="max-h-[32rem] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="table-basic">
                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                  <tr><th>G (mL)</th><th>{yName}</th><th>Ḡ (mL)</th><th>{d1Lab}</th><th>Ḡ̄ (mL)</th><th>{d2Lab}</th></tr>
                </thead>
                <tbody>
                  {res.rows.map((r, i) => (
                    <tr key={i} className={peRows.has(i) ? 'bg-amber-50 font-semibold dark:bg-amber-950/40' : ''}>
                      <td className="font-mono">{fmtFixed(r.G, 2)}</td>
                      <td className="font-mono">{fmtFixed(r.y, mode === 'pH' ? 2 : 1)}</td>
                      <td className="font-mono">{r.Gbar == null ? '' : fmtFixed(r.Gbar, 2)}</td>
                      <td className="font-mono">{f(r.d1)}</td>
                      <td className="font-mono">{r.Gbb == null ? '' : fmtFixed(r.Gbb, 3)}</td>
                      <td className="font-mono">{f(r.d2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Resaltada: fila del máximo de la 1ª derivada de cada salto. Ḡ y la 1ª derivada van entre una fila y la siguiente; Ḡ̄ y la 2ª derivada, entre tres filas consecutivas.</p>
          </section>
        </>
      )}

      {/* ================= b) calibración ================= */}
      <section className="card min-w-0 space-y-3">
        <h2 className="card-title">3. Calibración del pH-metro</h2>
        <div className="grid gap-4 lg:grid-cols-[minmax(240px,360px)_1fr]">
          <div className="space-y-2">
            <table className="table-basic">
              <thead><tr><th>Buffer (pH)</th><th>E (mV)</th></tr></thead>
              <tbody>
                {buf.map((b, i) => (
                  <tr key={i}>
                    <td><input className="input font-mono" value={b.pH} aria-label={`pH del buffer ${i + 1}`} onChange={(e) => setBuf(buf.map((x, j) => (j === i ? { ...x, pH: e.target.value } : x)))} /></td>
                    <td><input className="input font-mono" value={b.E} aria-label={`E del buffer ${i + 1}`} onChange={(e) => setBuf(buf.map((x, j) => (j === i ? { ...x, E: e.target.value } : x)))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="Temperatura" value={temp} onChange={setTemp} unit="°C" error={tempV == null ? 'Número inválido.' : null} />
              <NumField label="Cumple si la pendiente ≥" value={thr} onChange={setThr} unit="%" error={thrV == null ? 'Número inválido.' : null} />
            </div>
          </div>
          <div className="space-y-3">
            {calErr && <Alert kind="error">{calErr}</Alert>}
            {cal && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Stat label="Pendiente experimental" value={`${fmtFixed(cal.slope, 2)} mV/pH`} />
                  <Stat label={`Pendiente de Nernst (${fmtSig(tempV!, 3)} °C)`} value={`${fmtFixed(cal.theoretical, 2)} mV/pH`} sub={`≈ ${fmtFixed(cal.theoretical, 1)}`} />
                  <Stat label="% de pendiente" value={`${fmtFixed(cal.pctSlope, 1)} %`} sub={cal.passes ? `✓ Cumple (≥ ${fmtSig(cal.threshold, 3)} %)` : `✗ No cumple (< ${fmtSig(cal.threshold, 3)} %)`} />
                  <Stat label="Ordenada (E a pH 0)" value={`${fmtFixed(cal.intercept, 1)} mV`} />
                  <Stat label="pH a 0 mV" value={fmtFixed(cal.pHatZero, 2)} />
                  <Stat label="R²" value={fmtFixed(cal.r2, 5)} />
                </div>
                {cal.passes ? <Alert kind="ok">La calibración cumple: el electrodo responde al {fmtFixed(cal.pctSlope, 1)} % de la pendiente teórica.</Alert> : <Alert kind="warn">La pendiente es menor que el {fmtSig(cal.threshold, 3)} % de la teórica: revisar el electrodo o los buffers y volver a calibrar.</Alert>}
                <table className="table-basic">
                  <thead><tr><th>pH</th><th>E medido (mV)</th><th>E ajustado (mV)</th><th>Residuo (mV)</th></tr></thead>
                  <tbody>
                    {bufV.map((b, i) => (
                      <tr key={i}><td className="font-mono">{fmtFixed(b.pH, 2)}</td><td className="font-mono">{fmtFixed(b.E, 1)}</td><td className="font-mono">{fmtFixed(cal!.intercept + cal!.slope * b.pH, 1)}</td><td className="font-mono">{fmtFixed(cal!.residuals[i], 2)}</td></tr>
                    ))}
                  </tbody>
                </table>
                <Procedure
                  steps={[
                    { title: 'Ajuste lineal', tex: `E = ${texNum(cal.intercept, 5)} ${cal.slope < 0 ? '-' : '+'} ${texNum(Math.abs(cal.slope), 5)}\\,\\mathrm{pH}` },
                    { title: 'Pendiente teórica (Nernst)', tex: `-\\frac{\\ln 10\\,R\\,T}{F} = -\\frac{2{,}302585 \\times 8{,}314463 \\times ${texNum(tempV! + 273.15, 6)}}{96485{,}33}\\times 1000 = ${texNum(cal.theoretical, 5)}\\ \\mathrm{mV/pH}` },
                    { title: '% de pendiente', tex: `\\frac{${texNum(cal.slope, 5)}}{${texNum(cal.theoretical, 5)}}\\times 100 = ${texNum(cal.pctSlope, 4)}\\ \\%` },
                    { title: 'pH a 0 mV', tex: `\\mathrm{pH}_{0\\,mV} = -\\frac{b}{m} = ${texNum(cal.pHatZero, 4)}` },
                  ]}
                />
              </>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Pendiente teórica a 25 °C: −59,16 mV/pH (≈ −59,2). El criterio de aceptación se puede cambiar.</p>
      </section>

      {/* ================= c) incertidumbre ================= */}
      <section className="card min-w-0 space-y-3">
        <h2 className="card-title">4. Incertidumbre por propagación (Práctico 11)</h2>
        <p className="text-sm">
          Precargado: H₃PO₄ en bebida cola hasta el 1er punto equivalente, <span className="font-mono">c (ppm) = c(NaOH)·G·M(H₃PO₄)·1000 / m</span>, con las incertidumbres de la tabla del práctico
          (G ± 0,1 mL; M ± 0,00042 g/mol; m ± 0,0002 g; c(NaOH): la de su estandarización). Podés escribir cualquier otra fórmula.
        </p>
        <div>
          <label className="label" htmlFor="unc-f">Fórmula del resultado</label>
          <input id="unc-f" className={`input font-mono ${fErr ? 'input-error' : ''}`} value={formula} onChange={(e) => setFormula(e.target.value)} spellCheck={false} />
          {fErr && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{fErr}</p>}
        </div>
        {!fErr && (
          <div className="overflow-x-auto">
            <table className="table-basic">
              <thead><tr><th>Variable</th><th>Valor</th><th>Incertidumbre u</th><th>Coef. de sensibilidad ∂c/∂x</th><th>u·|∂c/∂x|</th><th>% de la varianza</th></tr></thead>
              <tbody>
                {names.map((nm) => {
                  const t = unc?.terms.find((x) => x.name === nm);
                  return (
                    <tr key={nm}>
                      <td className="font-mono">{nm}</td>
                      <td><input className="input font-mono" value={vars[nm]?.value ?? ''} onChange={(e) => setVar(nm, 'value', e.target.value)} aria-label={`Valor de ${nm}`} /></td>
                      <td><input className="input font-mono" value={vars[nm]?.u ?? ''} onChange={(e) => setVar(nm, 'u', e.target.value)} aria-label={`Incertidumbre de ${nm}`} /></td>
                      <td className="font-mono">{t ? fmtSig(t.derivative, 4) : ''}</td>
                      <td className="font-mono">{t ? fmtSig(Math.sqrt(t.contribution), 3) : ''}</td>
                      <td className="font-mono">{t ? `${fmtFixed(t.percent, 1)} %` : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:items-end">
          <NumField label="Factor de cobertura k" value={kRaw} onChange={setKRaw} error={kV == null || kV <= 0 ? 'Mayor que cero.' : null} />
          <p className="text-xs text-slate-600 dark:text-slate-400">El práctico expresa el resultado como (c ± u). Con k = 1, U = u_c.</p>
        </div>
        {unc && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Resultado" value={fmtSig(unc.value, 5)} />
              <Stat label="u_c (combinada)" value={fmtSig(unc.u, 3)} sub={`${fmtSig(unc.relU, 3)} % relativa`} />
              <Stat label={`U = k·u_c (k = ${fmtSig(unc.k, 3)})`} value={fmtSig(unc.U, 3)} />
              <Stat label="Expresión" value={`${fmtSig(unc.value, 4)} ± ${fmtSig(unc.U, 2)}`} />
            </div>
            <Procedure
              steps={[
                { title: 'Incertidumbre combinada (primer orden)', tex: `u_c = \\sqrt{\\sum_i \\left(\\frac{\\partial c}{\\partial x_i}\\right)^2 u_i^2} = ${texNum(unc.u, 4)}` },
                { text: 'Para un producto o cociente equivale a sumar en cuadratura las incertidumbres relativas:', tex: `\\frac{u_c}{c} = \\sqrt{${unc.terms.map((t) => `\\left(\\frac{u_{${t.name}}}{${t.name}}\\right)^2`).join(' + ')}}` },
                { title: 'Expandida', tex: `U = k\\,u_c = ${texNum(unc.k, 3)}\\times ${texNum(unc.u, 4)} = ${texNum(unc.U, 4)}` },
              ]}
            />
          </>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">Valores precargados: c(NaOH), G y m son ilustrativos (el gasto y la masa salen de la diagramación del práctico: 600 ppm y 13,00 mL de NaOH 0,01 M). Reemplazalos por los tuyos.</p>
      </section>
    </div>
  );
}
