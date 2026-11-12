/**
 * Pestaña: Diagrama de distribución de especies + diseñador de buffers.
 */
import { useDeferredValue, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SYSTEMS, compoundsForForm, getSystem } from '../../chem/data/acids';
import { alphas, KW, type ProticSystem } from '../../chem/acidbase/equilibrium';
import { bestPair, bufferCapacityCurve, designBuffer } from '../../chem/acidbase/buffer';
import { genericSpecies, parsePKaList } from '../../chem/acidbase/fromLibrary';
import { fmtFixed, fmtSig, fmtTick, texNum } from '../../chem/numeric/format';
import { Alert, NumField, Segmented, SelectField, Stat } from '../components/fields';
import { ChartCard } from '../components/ChartCard';
import { Procedure } from '../components/Procedure';
import { checkNum, useNum } from '../hooks';
import { useChartTheme, useSeriesColors } from '../display';
import { exportCsv } from '../components/exporters';

const CUSTOM = '__custom';
const pkaText = (p: number[]) => p.map((v) => fmtFixed(v, 2)).join('; ');

export default function SpeciesTab() {
  const th = useChartTheme();
  const colors = useSeriesColors();
  const [sysId, setSysId] = useState('fosforico');
  const [pkaRaw, setPkaRaw] = useState(pkaText(getSystem('fosforico')!.pKa));
  const [mode, setMode] = useState<'alpha' | 'log'>('alpha');
  const Clog = useNum('0,1');
  const [pHsel, setPHsel] = useState(7);

  const base = sysId === CUSTOM ? null : getSystem(sysId)!;
  const parsed = parsePKaList(pkaRaw);
  const ClogErr = mode === 'log' ? checkNum(Clog.value, Clog.raw, { positive: true, max: 20 }) : null;

  const onSystem = (id: string) => {
    setSysId(id);
    if (id !== CUSTOM) setPkaRaw(pkaText(getSystem(id)!.pKa));
  };

  // si el usuario editó los pKa, se mantiene el sistema pero con sus valores
  const system: ProticSystem | null = parsed.error ? null : { pKa: parsed.values, zFull: base && base.pKa.length === parsed.values.length ? base.zFull : 0 };
  const names = system ? (base && base.pKa.length === system.pKa.length ? base.species : genericSpecies(system)) : [];
  const edited = base && system && base.pKa.some((p, i) => Math.abs(p - (system.pKa[i] ?? NaN)) > 1e-9);

  const dSystem = useDeferredValue(system);
  const C = Clog.value ?? 0.1;
  const data = useMemo(() => {
    if (!dSystem) return [];
    const out: Record<string, number>[] = [];
    for (let i = 0; i <= 700; i++) {
      const pH = i / 50;
      const a = alphas(-pH, dSystem.pKa);
      const row: Record<string, number> = { pH };
      a.forEach((v, j) => {
        row[`s${j}`] = mode === 'alpha' ? v : Math.log10(v * C);
      });
      if (mode === 'log') {
        row.H = -pH;
        row.OH = pH - 14;
      }
      out.push(row);
    }
    return out;
  }, [dSystem, mode, C]);

  const aSel = system ? alphas(-pHsel, system.pKa) : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="space-y-4">
          <section className="card space-y-3">
            <h2 className="card-title">Sistema ácido-base</h2>
            <SelectField
              label="Ácido / base"
              value={sysId}
              onChange={onSystem}
              options={[...SYSTEMS.map((s) => ({ value: s.id, label: `${s.name} (${s.pKa.length === 1 ? 'monoprótico' : s.pKa.length === 2 ? 'diprótico' : 'triprótico'})` })), { value: CUSTOM, label: 'Personalizado…' }]}
            />
            <NumField label="Valores de pKa (editables)" value={pkaRaw} onChange={setPkaRaw} error={parsed.error} hint="Separá con punto y coma: 2,15; 7,20; 12,35" />
            {edited && <Alert kind="info">Estás usando pKa modificados (no los de la biblioteca).</Alert>}
            <Segmented ariaLabel="Tipo de diagrama" value={mode} onChange={setMode} options={[{ value: 'alpha', label: 'Fracciones α' }, { value: 'log', label: 'log C vs pH' }]} />
            {mode === 'log' && <NumField label="Concentración total" value={Clog.raw} onChange={Clog.setRaw} unit="mol/L" error={ClogErr} />}
          </section>
          {system && (
            <section className="card space-y-2">
              <label className="label" htmlFor="phsel">pH elegido: <strong className="font-mono">{fmtFixed(pHsel, 2)}</strong></label>
              <input id="phsel" type="range" min={0} max={14} step={0.01} value={pHsel} onChange={(e) => setPHsel(Number(e.target.value))} className="w-full accent-brand-700" />
              <table className="table-basic">
                <thead><tr><th>Especie</th><th>α</th><th>%</th></tr></thead>
                <tbody>
                  {aSel.map((a, j) => (
                    <tr key={j}>
                      <td><span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: colors[j % colors.length] }} />{names[j]}</td>
                      <td className="font-mono">{fmtSig(a, 4)}</td>
                      <td className="font-mono">{fmtFixed(a * 100, 2)}</td>
                    </tr>
                  ))}
                  <tr><td className="font-semibold">Suma</td><td className="font-mono font-semibold">{fmtFixed(aSel.reduce((x, y) => x + y, 0), 6)}</td><td /></tr>
                </tbody>
              </table>
            </section>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          {system && (
            <ChartCard
              title={mode === 'alpha' ? 'Diagrama de distribución de especies (α vs pH)' : `Diagrama logarítmico (C = ${Clog.raw} M)`}
              filename="distribucion-especies.png"
              actions={
                <button className="btn" onClick={() => exportCsv([['pH', ...names, ...(mode === 'log' ? ['log[H+]', 'log[OH-]'] : [])], ...data.map((r) => [r.pH, ...names.map((_, j) => r[`s${j}`]), ...(mode === 'log' ? [r.H, r.OH] : [])])], 'distribucion-especies.csv')}>⬇ CSV</button>
              }
            >
              <ResponsiveContainer width="100%" height={th.height}>
                <LineChart data={data} margin={{ top: 24, right: 20, bottom: 10, left: 10 }} onClick={(e) => e?.activeLabel != null && setPHsel(Number(e.activeLabel))}>
                  <CartesianGrid stroke={th.grid} />
                  <XAxis dataKey="pH" type="number" domain={[0, 14]} ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                    label={{ value: 'pH', position: 'insideBottom', offset: -18, fontSize: th.fontSize, fill: th.axis }} />
                  {mode === 'alpha' ? (
                    <YAxis domain={[0, 1]} ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]} tickFormatter={(v) => fmtFixed(v, 1)} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                      label={{ value: 'α (fracción)', angle: -90, position: 'insideLeft', fontSize: th.fontSize, fill: th.axis }} />
                  ) : (
                    <YAxis domain={[-14, 0]} ticks={[-14, -12, -10, -8, -6, -4, -2, 0]} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} allowDataOverflow
                      label={{ value: 'log C', angle: -90, position: 'insideLeft', fontSize: th.fontSize, fill: th.axis }} />
                  )}
                  {system.pKa.map((p, i) => (
                    <ReferenceLine key={`pka${i}`} x={p} stroke={th.muted} strokeDasharray="4 4" label={{ value: `pKa${system.pKa.length > 1 ? i + 1 : ''}`, position: 'top', fontSize: th.fontSize - 2, fill: th.muted }} />
                  ))}
                  <ReferenceLine x={pHsel} stroke={th.accent} strokeWidth={1.5} />
                  <Tooltip
                    formatter={(v: number, name: string) => [mode === 'alpha' ? fmtFixed(v, 4) : fmtFixed(v, 2), name]}
                    labelFormatter={(v: number) => `pH ${fmtFixed(v, 2)}`}
                    contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: th.fontSize, paddingTop: th.fontSize * 2.2 }} />
                  {names.map((nm, j) => (
                    <Line key={`l${j}`} dataKey={`s${j}`} name={nm} type="monotone" dot={false} stroke={colors[j % colors.length]} strokeWidth={th.strokeWidth} isAnimationActive={false} />
                  ))}
                  {mode === 'log' && <Line dataKey="H" name="H⁺" dot={false} stroke={th.muted} strokeDasharray="2 3" strokeWidth={1.5} isAnimationActive={false} />}
                  {mode === 'log' && <Line dataKey="OH" name="OH⁻" dot={false} stroke={th.muted} strokeDasharray="8 3" strokeWidth={1.5} isAnimationActive={false} />}
                  {mode === 'alpha' && aSel.map((a, j) => <ReferenceDot key={`d${j}`} x={pHsel} y={a} r={4} fill={colors[j % colors.length]} stroke={th.bg} />)}
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-600 dark:text-slate-400">Tocá o hacé clic en el gráfico para elegir un pH. Las líneas punteadas verticales marcan los pKa (donde dos especies vecinas valen 50 %).</p>
            </ChartCard>
          )}
          {system && (
            <Procedure
              steps={[
                {
                  title: 'Fracciones de cada especie',
                  text: `Para un sistema con ${system.pKa.length} pKa, cada fracción es un término del denominador D dividido por D. Se calcula en escala logarítmica para evitar desbordes numéricos.`,
                  tex: [
                    'D = \\sum_{k=0}^{n} [\\mathrm{H^+}]^{\\,n-k}\\,K_1K_2\\cdots K_k, \\qquad \\alpha_j = \\frac{[\\mathrm{H^+}]^{\\,n-j}\\,K_1\\cdots K_j}{D}',
                  ],
                },
                {
                  title: `Valores a pH ${fmtFixed(pHsel, 2)}`,
                  tex: [
                    `[\\mathrm{H^+}] = ${texNum(10 ** -pHsel, 4)}`,
                    system.pKa.map((p, i) => `K_{${i + 1}} = 10^{-${fmtFixed(p, 2).replace(',', '{,}')}} = ${texNum(10 ** -p, 4)}`).join(',\\quad '),
                    ...aSel.map((a, j) => `\\alpha(\\text{${names[j]}}) = ${texNum(a, 5)}`),
                    `\\textstyle\\sum \\alpha_j = ${fmtFixed(aSel.reduce((x, y) => x + y, 0), 10).replace(',', '{,}')}`,
                  ],
                },
              ]}
            />
          )}
        </div>
      </div>
      {system && <BufferDesigner system={system} names={names} systemId={edited || sysId === CUSTOM ? null : sysId} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BufferDesigner({ system, names, systemId }: { system: ProticSystem; names: string[]; systemId: string | null }) {
  const th = useChartTheme();
  const pHt = useNum('7,00');
  const Ct = useNum('0,10');
  const Vf = useNum('500');
  const stock = useNum('1,0');
  const pHErr = checkNum(pHt.value, pHt.raw, { min: 0, max: 14 });
  const CErr = checkNum(Ct.value, Ct.raw, { positive: true, max: 5 });
  const VErr = checkNum(Vf.value, Vf.raw, { positive: true, max: 100000 });
  const stockErr = checkNum(stock.value, stock.raw, { positive: true, max: 20 });
  const [pairK, setPairK] = useState<'auto' | `${number}`>('auto');
  const [acidCpd, setAcidCpd] = useState('');
  const [baseCpd, setBaseCpd] = useState('');

  const ok = !pHErr && !CErr && !VErr && pHt.value != null && Ct.value != null && Vf.value != null;
  const pair = useMemo(() => {
    if (!ok) return null;
    const best = bestPair(system, pHt.value!);
    if (pairK === 'auto' || Number(pairK) >= system.pKa.length) return best;
    const k = Number(pairK);
    const n = system.pKa.length;
    return { k, pKa: system.pKa[k], hAcid: n - k, hBase: n - k - 1 };
  }, [ok, system, pHt.value, pairK]);
  const d = pair ? designBuffer(system, pHt.value!, Ct.value!, pair) : null;
  const curve = useMemo(() => (ok ? bufferCapacityCurve(system, Ct.value!) : []), [ok, system, Ct.value]);

  // sugerencias de otros sistemas de la biblioteca (pKa más cercano al pH buscado)
  const suggestions = useMemo(() => {
    if (pHt.value == null) return [];
    const all: { name: string; pKa: number; d: number }[] = [];
    for (const s of SYSTEMS) for (const p of s.pKa) if (p > 0) all.push({ name: s.name, pKa: p, d: Math.abs(p - pHt.value) });
    return all.sort((a, b) => a.d - b.d).slice(0, 4);
  }, [pHt.value]);

  const acidOpts = systemId && d ? compoundsForForm(systemId, d.pair.hAcid) : [];
  const baseOpts = systemId && d ? compoundsForForm(systemId, d.pair.hBase) : [];
  const ac = acidOpts.find((c) => c.id === acidCpd) ?? acidOpts[0];
  const bc = baseOpts.find((c) => c.id === baseCpd) ?? baseOpts[0];
  const VL = (Vf.value ?? 0) / 1000;

  const amount = (cpd: typeof ac, x: number) => {
    if (!cpd) return null;
    const g = x * VL * cpd.M;
    const mL = cpd.liquid ? g / (cpd.liquid.purity / 100) / cpd.liquid.density : null;
    return { g, mL };
  };
  const aAmt = d ? amount(ac, d.xAcid) : null;
  const bAmt = d ? amount(bc, d.xBase) : null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">🧴 Diseñador de buffers</h2>
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="card space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">Usa el sistema elegido arriba ({names.join(' / ')}).</p>
          <NumField label="pH deseado" value={pHt.raw} onChange={pHt.setRaw} error={pHErr} />
          <NumField label="Concentración total del buffer" value={Ct.raw} onChange={Ct.setRaw} unit="mol/L" error={CErr} hint="Suma de forma ácida + forma básica." />
          <NumField label="Volumen a preparar" value={Vf.raw} onChange={Vf.setRaw} unit="mL" error={VErr} />
          {system.pKa.length > 1 && (
            <SelectField
              label="Par conjugado"
              value={pairK}
              onChange={setPairK}
              options={[{ value: 'auto', label: 'Automático (pKa más cercano)' }, ...system.pKa.map((p, k) => ({ value: `${k}` as `${number}`, label: `${names[k]} / ${names[k + 1]} (pKa ${fmtFixed(p, 2)})` }))]}
            />
          )}
          <NumField label="Concentración de NaOH o HCl disponible (método B)" value={stock.raw} onChange={stock.setRaw} unit="mol/L" error={stockErr} />
          {suggestions.length > 0 && (
            <div className="text-sm">
              <div className="label">Sistemas de la biblioteca con pKa cercano:</div>
              <ul className="list-disc pl-5">
                {suggestions.map((s, i) => <li key={i}>{s.name}: pKa {fmtFixed(s.pKa, 2)}</li>)}
              </ul>
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-4">
          {d && pair && (
            <>
              {d.warnings.map((w, i) => <Alert key={i} kind={d.feasible ? 'warn' : 'error'}>{w}</Alert>)}
              {d.feasible && (
                <div className="card space-y-3">
                  <h3 className="card-title">Receta (cálculo exacto, comportamiento ideal)</h3>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Stat label="Par usado" value={`pKa = ${fmtFixed(pair.pKa, 2)}`} sub={`${names[pair.k]} / ${names[pair.k + 1]}`} />
                    <Stat label={`[${names[pair.k]}] agregado`} value={`${fmtSig(d.xAcid, 4)} M`} sub={`${fmtSig(d.xAcid * (Vf.value ?? 0), 4)} mmol`} />
                    <Stat label={`[${names[pair.k + 1]}] agregado`} value={`${fmtSig(d.xBase, 4)} M`} sub={`${fmtSig(d.xBase * (Vf.value ?? 0), 4)} mmol`} />
                    <Stat label="Relación base/ácido (exacta)" value={fmtSig(d.ratioExact, 4)} sub={`Henderson-Hasselbalch: ${fmtSig(d.ratioHH, 4)}`} />
                    <Stat label="Capacidad buffer β" value={`${fmtSig(d.beta, 3)} M/pH`} sub="mol de base fuerte por L para subir 1 unidad de pH (aprox.)" />
                  </div>
                  {systemId && (ac || bc) && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Método A: mezclar las dos formas</h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {ac && (
                          <div className="stat space-y-1">
                            <SelectField label="Forma ácida" value={ac.id} onChange={setAcidCpd} options={acidOpts.map((c) => ({ value: c.id, label: `${c.name} (${fmtFixed(c.M, 2)} g/mol)` }))} />
                            <div className="font-mono text-lg font-semibold">{aAmt && (aAmt.mL != null ? `${fmtSig(aAmt.mL, 3)} mL` : `${fmtSig(aAmt.g, 4)} g`)}</div>
                            {aAmt?.mL != null && ac.liquid && <div className="text-xs">({fmtSig(aAmt.g, 4)} g de {ac.formula}; reactivo {fmtFixed(ac.liquid.purity, 1)} % m/m, d = {fmtFixed(ac.liquid.density, 3)} g/mL)</div>}
                            {ac.note && <div className="text-xs text-slate-600 dark:text-slate-400">{ac.note}</div>}
                          </div>
                        )}
                        {bc && (
                          <div className="stat space-y-1">
                            <SelectField label="Forma básica" value={bc.id} onChange={setBaseCpd} options={baseOpts.map((c) => ({ value: c.id, label: `${c.name} (${fmtFixed(c.M, 2)} g/mol)` }))} />
                            <div className="font-mono text-lg font-semibold">{bAmt && (bAmt.mL != null ? `${fmtSig(bAmt.mL, 3)} mL` : `${fmtSig(bAmt.g, 4)} g`)}</div>
                            {bAmt?.mL != null && bc.liquid && <div className="text-xs">({fmtSig(bAmt.g, 4)} g de {bc.formula}; reactivo {fmtFixed(bc.liquid.purity, 1)} % m/m, d = {fmtFixed(bc.liquid.density, 3)} g/mL)</div>}
                            {bc.note && <div className="text-xs text-slate-600 dark:text-slate-400">{bc.note}</div>}
                          </div>
                        )}
                      </div>
                      <p className="text-sm">Disolver en agua y llevar a <strong>{Vf.raw} mL</strong> en matraz aforado.</p>
                    </div>
                  )}
                  {stock.value != null && !stockErr && (
                    <div className="space-y-1">
                      <h4 className="font-semibold">Método B: partir de una sola forma y ajustar con base o ácido fuerte</h4>
                      <ul className="list-disc space-y-1 pl-5 text-sm">
                        <li>
                          {fmtSig(d.C * (Vf.value ?? 0), 4)} mmol de <strong>{names[pair.k]}</strong>{ac ? ` (${fmtSig(d.C * VL * ac.M, 4)} g de ${ac.formula})` : ''} + <strong className="font-mono">{fmtSig((d.xBase * (Vf.value ?? 0)) / stock.value, 4)} mL</strong> de NaOH {stock.raw} M.
                        </li>
                        <li>
                          o bien {fmtSig(d.C * (Vf.value ?? 0), 4)} mmol de <strong>{names[pair.k + 1]}</strong>{bc ? ` (${fmtSig(d.C * VL * bc.M, 4)} g de ${bc.formula})` : ''} + <strong className="font-mono">{fmtSig((d.xAcid * (Vf.value ?? 0)) / stock.value, 4)} mL</strong> de HCl {stock.raw} M.
                        </li>
                      </ul>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Luego llevar a volumen. Conviene verificar con pHmetro: la fuerza iónica real corre el pH algunas centésimas a décimas.</p>
                    </div>
                  )}
                </div>
              )}
              <ChartCard title={`Capacidad buffer β vs pH (C = ${Ct.raw} M)`} filename="capacidad-buffer.png">
                <ResponsiveContainer width="100%" height={Math.round(th.height * 0.75)}>
                  <LineChart data={curve} margin={{ top: 26, right: 20, bottom: 30, left: 20 }}>
                    <CartesianGrid stroke={th.grid} />
                    <XAxis dataKey="pH" type="number" domain={[0, 14]} ticks={[0, 2, 4, 6, 8, 10, 12, 14]} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                      label={{ value: 'pH', position: 'insideBottom', offset: -18, fontSize: th.fontSize, fill: th.axis }} />
                    <YAxis tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} tickFormatter={fmtTick} domain={[0, (max: number) => Math.min(max, Math.max(0.2, (Ct.value ?? 0.1) * 1.5))]} allowDataOverflow
                      label={{ value: 'β (mol L⁻¹ pH⁻¹)', angle: -90, position: 'insideLeft', offset: -10, fontSize: th.fontSize, fill: th.axis }} />
                    <ReferenceLine x={pHt.value!} stroke={th.accent} strokeWidth={1.5} label={{ value: 'pH buscado', position: 'top', fontSize: th.fontSize - 2, fill: th.accent }} />
                    <Tooltip formatter={(v: number) => [fmtSig(v, 3), 'β']} labelFormatter={(v: number) => `pH ${fmtFixed(v, 2)}`} contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} />
                    <Line dataKey="beta" dot={false} stroke={th.main} strokeWidth={th.strokeWidth} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-slate-600 dark:text-slate-400">Incluye el aporte del agua ([H⁺] + [OH⁻]), por eso β crece en los extremos. Eje recortado para que se vean los máximos del buffer.</p>
              </ChartCard>
              <Procedure
                steps={[
                  {
                    title: 'Balance de carga para el par elegido',
                    text: `Forma ácida con ${pair.hAcid} protones (${names[pair.k]}) y forma básica con ${pair.hBase} (${names[pair.k + 1]}). Los contraiones (Na⁺, K⁺, Cl⁻) son espectadores. x_b es la concentración de forma básica agregada.`,
                    tex: [
                      '[\\mathrm{H^+}] - [\\mathrm{OH^-}] + C\\,(\\bar n_H - h_a) + x_b = 0 \;\\Rightarrow\; x_b = -([\\mathrm{H^+}] - [\\mathrm{OH^-}]) - C\\,(\\bar n_H - h_a)',
                      `[\\mathrm{H^+}] = ${texNum(10 ** -pHt.value!, 4)},\\ [\\mathrm{OH^-}] = ${texNum(KW / 10 ** -pHt.value!, 4)},\\ \\bar n_H = ${texNum(d.nH, 6)},\\ h_a = ${pair.hAcid}`,
                      `x_b = ${texNum(d.xBase, 5)}\\ \\mathrm{M},\\qquad x_a = C - x_b = ${texNum(d.xAcid, 5)}\\ \\mathrm{M}`,
                    ],
                  },
                  {
                    title: 'Comparación con Henderson-Hasselbalch (aproximación)',
                    tex: `\\frac{[\\text{base}]}{[\\text{ácido}]} = 10^{\\,\\mathrm{pH}-\\mathrm{p}K_a} = ${texNum(d.ratioHH, 4)} \\quad\\text{vs. exacto } ${texNum(d.ratioExact, 4)}`,
                  },
                  {
                    title: 'Capacidad buffer exacta',
                    tex: `\\beta = \\ln 10\\left([\\mathrm{H^+}] + [\\mathrm{OH^-}] + C\\left(\\sum (n-j)^2\\alpha_j - \\bar n_H^{\\,2}\\right)\\right) = ${texNum(d.beta, 4)}\\ \\mathrm{mol\\,L^{-1}\\,pH^{-1}}`,
                  },
                  {
                    title: 'Masas',
                    tex: 'm = x \\cdot V\\,(\\mathrm{L}) \\cdot M; \\qquad V_{\\text{líquido}} = \\frac{m}{(\\%/100)\\cdot d}',
                  },
                ]}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
