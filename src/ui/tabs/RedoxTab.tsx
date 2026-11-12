/**
 * Pestaña: Titulaciones redox (curva E vs V exacta).
 */
import { useDeferredValue, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COUPLES, REDOX_INDICATORS, REDOX_PRESETS, REFERENCES, getCouple } from '../../chem/data/redox';
import { NERNST_K, coupleState, equivalenceVolume, potentialAt, redoxCurve, textbookEquivalencePotential, volumeAtPotential, type RedoxTitration } from '../../chem/redox/redox';
import { verdictFromError } from '../../chem/acidbase/indicatorCheck';
import { fmtFixed, fmtSig, fmtTick, niceTicks, texNum } from '../../chem/numeric/format';
import { Alert, NumField, SelectField, Stat } from '../components/fields';
import { ChartCard } from '../components/ChartCard';
import { Procedure } from '../components/Procedure';
import { checkNum, useNum } from '../hooks';
import { useChartTheme } from '../display';
import { exportCsv } from '../components/exporters';
import { VERDICT_CLS, VERDICT_LABEL } from './TitrationTab';

export default function RedoxTab() {
  const th = useChartTheme();
  const [presetId, setPresetId] = useState('fe-ce');
  const p0 = REDOX_PRESETS[0];
  const [aId, setAId] = useState(p0.analyte);
  const [aForm, setAForm] = useState<'red' | 'ox'>(p0.analyteForm);
  const [tId, setTId] = useState(p0.titrant);
  const Ca = useNum(fmtTick(p0.Ca));
  const Va = useNum(String(p0.Va));
  const Ct = useNum(fmtTick(p0.Ct));
  const pH = useNum('0');
  const Iconc = useNum('0,1');
  const [refId, setRefId] = useState('ENH');
  const [indId, setIndId] = useState('ferroina');
  const [Vsel, setVsel] = useState<number | null>(null);

  const applyPreset = (id: string) => {
    setPresetId(id);
    const p = REDOX_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setAId(p.analyte);
    setAForm(p.analyteForm);
    setTId(p.titrant);
    Ca.setRaw(fmtTick(p.Ca));
    Va.setRaw(String(p.Va).replace('.', ','));
    Ct.setRaw(fmtTick(p.Ct));
    pH.setRaw(String(p.pH));
    if (p.logI != null) Iconc.setRaw(fmtSig(10 ** p.logI, 3));
    setVsel(null);
    setIndId(p.id === 'fe-cr2o7' ? 'dfas' : p.id === 'i3-s2o3' ? 'azulmetileno' : 'ferroina');
  };

  const A = getCouple(aId)!;
  const T = getCouple(tId)!;
  const ref = REFERENCES.find((r) => r.id === refId)!;
  const usesI = A.id === 'I3' || T.id === 'I3';
  const usesH = A.m > 0 || T.m > 0;
  const errs = {
    Ca: checkNum(Ca.value, Ca.raw, { positive: true, max: 10 }),
    Va: checkNum(Va.value, Va.raw, { positive: true, max: 10000 }),
    Ct: checkNum(Ct.value, Ct.raw, { positive: true, max: 10 }),
    pH: usesH ? checkNum(pH.value, pH.raw, { min: -1, max: 14 }) : null,
    I: usesI ? checkNum(Iconc.value, Iconc.raw, { positive: true, max: 10 }) : null,
  };
  const sameCouple = aId === tId;
  const anyErr = Object.values(errs).some(Boolean) || sameCouple;

  const setup = useMemo<RedoxTitration | null>(() => {
    if (anyErr) return null;
    const logI = usesI ? Math.log10(Iconc.value!) : 0;
    const withF = (c: typeof A) => (c.id === 'I3' ? { ...c, logF: 3 * logI } : c);
    return { analyte: withF(A), analyteForm: aForm, Ca: Ca.value!, Va: Va.value!, titrant: withF(T), Ct: Ct.value!, logH: usesH ? -pH.value! : 0 };
  }, [anyErr, A, T, aForm, Ca.value, Va.value, Ct.value, pH.value, Iconc.value, usesI, usesH]);
  const dSetup = useDeferredValue(setup);

  const res = useMemo(() => {
    if (!dSetup) return null;
    const Veq = equivalenceVolume(dSetup);
    const Vmax = Number((Veq * 2).toPrecision(2));
    const curve = redoxCurve(dSetup, Vmax).map((p) => ({ V: p.V, E: p.E - ref.E }));
    const Eeq = potentialAt(dSetup, Veq);
    const indRes = REDOX_INDICATORS.map((ind) => {
      const Vend = volumeAtPotential(dSetup, ind.E0, Vmax);
      const err = Vend == null ? null : ((Vend - Veq) / Veq) * 100;
      return { ind, Vend, err, verdict: err == null ? ('no-vira' as const) : verdictFromError(err) };
    });
    return { Veq, Vmax, curve, Eeq, indRes };
  }, [dSetup, ref.E]);

  const ind = REDOX_INDICATORS.find((i) => i.id === indId)!;
  const V = res ? Math.min(Vsel ?? res.Veq * 0.5, res.Vmax) : 0;
  const EV = res && dSetup ? potentialAt(dSetup, V) : NaN;
  const textbook = dSetup && A.p === 1 && T.p === 1 ? textbookEquivalencePotential(dSetup) : null;
  const selInd = res?.indRes.find((r) => r.ind.id === indId);
  const preset = REDOX_PRESETS.find((p) => p.id === presetId);
  const coupleOpts = COUPLES.map((c) => ({ value: c.id, label: `${c.reaction} (E°′ = ${fmtFixed(c.E0, 3)} V)` }));
  const yTicks = res ? niceTicks(Math.floor(Math.min(...res.curve.map((p) => p.E)) * 10) / 10, Math.ceil(Math.max(...res.curve.map((p) => p.E)) * 10) / 10, 7) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
      <div className="space-y-4">
        <section className="card space-y-3">
          <h2 className="card-title">Sistema</h2>
          <SelectField label="Ejemplo" value={presetId} onChange={applyPreset} options={[...REDOX_PRESETS.map((p) => ({ value: p.id, label: p.name })), { value: 'custom', label: 'Personalizado (elegir cuplas)' }]} />
          {preset && <p className="text-sm text-slate-600 dark:text-slate-400">{preset.note}</p>}
          <SelectField label="Cupla del analito" value={aId} onChange={(v) => { setAId(v); setPresetId('custom'); }} options={coupleOpts} />
          <SelectField label="El analito está como" value={aForm} onChange={(v) => { setAForm(v); setPresetId('custom'); }} options={[{ value: 'red', label: `Forma reducida (${A.red}) → se titula con un oxidante` }, { value: 'ox', label: `Forma oxidada (${A.ox}) → se titula con un reductor` }]} />
          <NumField label={`Concentración de ${aForm === 'red' ? A.red : A.ox}`} value={Ca.raw} onChange={Ca.setRaw} unit="mol/L" error={errs.Ca} />
          <NumField label="Volumen de analito" value={Va.raw} onChange={Va.setRaw} unit="mL" error={errs.Va} />
          <SelectField label="Cupla del titulante" value={tId} onChange={(v) => { setTId(v); setPresetId('custom'); }} options={coupleOpts} />
          <NumField label={`Concentración de ${aForm === 'red' ? T.ox : T.red} (titulante)`} value={Ct.raw} onChange={Ct.setRaw} unit="mol/L" error={errs.Ct} />
          {usesH && <NumField label="pH del medio (constante)" value={pH.raw} onChange={pH.setRaw} error={errs.pH} hint="pH 0 equivale a [H⁺] = 1 M." />}
          {usesI && <NumField label="[I⁻] libre (KI en exceso)" value={Iconc.raw} onChange={Iconc.setRaw} unit="mol/L" error={errs.I} />}
          {sameCouple && <Alert kind="error">El analito y el titulante deben ser cuplas distintas.</Alert>}
        </section>
        <section className="card space-y-3">
          <SelectField label="Electrodo de referencia (eje de potencial)" value={refId} onChange={setRefId} options={REFERENCES.map((r) => ({ value: r.id, label: `${r.name}${r.E ? ` (+${fmtFixed(r.E, 3)} V vs ENH)` : ''}` }))} />
          <SelectField label="Indicador redox" value={indId} onChange={setIndId} options={REDOX_INDICATORS.map((i) => ({ value: i.id, label: `${i.name} (E° = ${fmtFixed(i.E0, 2)} V)` }))} />
          <div className="flex items-center gap-2 text-sm">
            <span className="h-4 w-8 rounded" style={{ background: ind.redHex }} />{ind.redColor} (red.) → <span className="h-4 w-8 rounded" style={{ background: ind.oxHex }} />{ind.oxColor} (ox.)
          </div>
        </section>
      </div>

      <div className="min-w-0 space-y-4">
        {res && dSetup && (
          <>
            <ChartCard
              title={`Curva de titulación redox: E (V vs ${ref.id}) vs volumen`}
              filename="curva-redox.png"
              actions={<button className="btn" onClick={() => exportCsv([['V (mL)', `E (V vs ${ref.id})`], ...res.curve.map((p) => [p.V, p.E])], 'curva-redox.csv')}>⬇ CSV</button>}
            >
              <ResponsiveContainer width="100%" height={th.height}>
                <LineChart data={res.curve} margin={{ top: 24, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid stroke={th.grid} />
                  <XAxis dataKey="V" type="number" domain={[0, res.Vmax]} ticks={niceTicks(0, res.Vmax)} tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                    label={{ value: 'V de titulante (mL)', position: 'insideBottom', offset: -18, fontSize: th.fontSize, fill: th.axis }} />
                  <YAxis type="number" domain={[yTicks[0], yTicks[yTicks.length - 1]]} ticks={yTicks} tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                    label={{ value: `E (V vs ${ref.id})`, angle: -90, position: 'insideLeft', fontSize: th.fontSize, fill: th.axis }} />
                  <ReferenceArea y1={ind.E0 - NERNST_K / ind.n - ref.E} y2={ind.E0 - ref.E} fill={ind.redHex} fillOpacity={0.3} ifOverflow="hidden" />
                  <ReferenceArea y1={ind.E0 - ref.E} y2={ind.E0 + NERNST_K / ind.n - ref.E} fill={ind.oxHex} fillOpacity={0.3} ifOverflow="hidden" />
                  <ReferenceLine x={res.Veq} stroke={th.accent} strokeDasharray="6 4" label={{ value: 'PE', position: 'top', fontSize: th.fontSize - 2, fill: th.accent }} />
                  <Tooltip formatter={(v: number) => [`${fmtFixed(v, 3)} V`, 'E']} labelFormatter={(v: number) => `V = ${fmtFixed(v, 2)} mL`} contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} />
                  <Line dataKey="E" dot={false} stroke={th.main} strokeWidth={th.strokeWidth} isAnimationActive={false} />
                  <ReferenceDot x={V} y={EV - ref.E} r={th.projector ? 9 : 6} fill={th.accent} stroke={th.bg} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-600 dark:text-slate-400">Banda de color: zona de viraje del indicador (E° ± 0,059/n V). En V = 0 el potencial no está definido (todavía no hay forma oxidada/reducida del analito).</p>
            </ChartCard>

            <section className="card">
              <label className="label" htmlFor="vred">Volumen: <strong className="font-mono">{fmtFixed(V, 2)} mL</strong> → E = <strong className="font-mono">{fmtFixed(EV - ref.E, 3)} V vs {ref.id}</strong></label>
              <input id="vred" type="range" min={res.Vmax / 1000} max={res.Vmax} step={res.Vmax / 2000} value={V} onChange={(e) => setVsel(Number(e.target.value))} className="w-full accent-brand-700" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="btn" onClick={() => setVsel(res.Veq / 2)}>Ir a ½PE</button>
                <button className="btn" onClick={() => setVsel(res.Veq)}>Ir a PE</button>
                <button className="btn" onClick={() => setVsel(res.Veq * 2 > res.Vmax ? res.Vmax : res.Veq * 2)}>Ir a 2×PE</button>
              </div>
            </section>

            <section className="card grid grid-cols-2 gap-2 md:grid-cols-4">
              <Stat label="V de equivalencia" value={`${fmtFixed(res.Veq, 3)} mL`} />
              <Stat label={`E en la equivalencia (exacto)`} value={`${fmtFixed(res.Eeq - ref.E, 3)} V`} sub={`vs ${ref.id}`} />
              {textbook != null && <Stat label="Fórmula de libro" value={`${fmtFixed(textbook - ref.E, 3)} V`} sub="(n₁E₁ + n₂E₂)/(n₁+n₂)" />}
              {selInd && <Stat label={`Error con ${ind.name.split(' (')[0].toLowerCase()}`} value={selInd.err == null ? '—' : `${selInd.err >= 0 ? '+' : ''}${fmtSig(selInd.err, 2)} %`} sub={<span className={`chip ${VERDICT_CLS[selInd.verdict]}`}>{VERDICT_LABEL[selInd.verdict]}</span>} />}
            </section>

            <section className="card overflow-x-auto">
              <h3 className="card-title">¿Qué indicador redox sirve?</h3>
              <table className="table-basic">
                <thead><tr><th>Indicador</th><th>E° (V vs ENH)</th><th>V final</th><th>Error</th><th>Veredicto</th></tr></thead>
                <tbody>
                  {res.indRes.map((r) => (
                    <tr key={r.ind.id} className={r.ind.id === indId ? 'bg-brand-50 dark:bg-brand-950/40' : ''}>
                      <td><button className="text-left hover:underline" onClick={() => setIndId(r.ind.id)}>{r.ind.name}</button></td>
                      <td className="font-mono">{fmtFixed(r.ind.E0, 2)}</td>
                      <td className="font-mono">{r.Vend == null ? '—' : `${fmtFixed(r.Vend, 3)} mL`}</td>
                      <td className="font-mono">{r.err == null ? '—' : `${r.err >= 0 ? '+' : ''}${fmtSig(r.err, 2)} %`}</td>
                      <td><span className={`chip ${VERDICT_CLS[r.verdict]}`}>{VERDICT_LABEL[r.verdict]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Punto final = volumen en que E alcanza el E° del indicador. Los E° de indicadores dependen del medio (Skoog). Otros indicadores: el MnO₄⁻ es autoindicador; en yodometría se usa almidón (complejo azul con I₃⁻), que no depende del potencial.
              </p>
            </section>

            <Procedure steps={redoxSteps(dSetup, V, EV, res.Veq)} />
          </>
        )}
      </div>
    </div>
  );
}

function redoxSteps(t: RedoxTitration, V: number, E: number, Veq: number) {
  const nernst = (c: typeof t.analyte) => {
    const red = c.p === 0 ? '' : `[\\text{Red}]${c.p > 1 ? `^{${c.p}}` : ''}`;
    const F = c.logF ? `\\cdot 10^{${fmtFixed(c.logF, 2).replace(',', '{,}')}}` : '';
    const H = c.m ? `[\\mathrm{H^+}]^{${c.m}}` : '';
    return `E = ${texNum(c.E0, 4)} - \\frac{${NERNST_K.toString().replace('.', '{,}')}}{${c.n}}\\log\\frac{${red || '1'}${F}}{[\\text{Ox}]${H}}`;
  };
  const Vt = t.Va + V;
  const tForm = t.analyteForm === 'red' ? 'ox' : 'red';
  const CA = ((t.analyteForm === 'ox' || t.analyte.p === 0 ? t.Ca : t.Ca / t.analyte.p) * t.Va) / Vt;
  const CT = ((tForm === 'ox' || t.titrant.p === 0 ? t.Ct : t.Ct / t.titrant.p) * V) / Vt;
  const a = coupleState(t.analyte, CA, E, t.logH);
  const b = coupleState(t.titrant, CT, E, t.logH);
  return [
    { title: 'Ecuación de Nernst de cada cupla (25 °C)', tex: [`\\text{Analito: } ${nernst(t.analyte)}`, `\\text{Titulante: } ${nernst(t.titrant)}`] },
    {
      title: 'Balance de electrones (condición que fija E)',
      text: 'En todo punto, los electrones cedidos por el reductor = los ganados por el oxidante. Ambas cuplas están en equilibrio al mismo potencial E. Se resuelve E con el método de Brent.',
      tex: t.analyteForm === 'red' ? 'n_A\\,[\\text{Ox}_A] = n_T\\,[\\text{Red}_T]/p_T' : 'n_T\\,[\\text{Ox}_T] = n_A\\,[\\text{Red}_A]/p_A',
    },
    {
      title: `Valores en V = ${fmtFixed(V, 2)} mL`,
      tex: [
        `E = ${texNum(E, 5)}\\ \\mathrm{V\\ vs\\ ENH}`,
        `[\\text{Ox}_A] = ${texNum(a.ox, 4)},\\ [\\text{Red}_A]/p = ${texNum(a.redOxUnits, 4)}\\ \\mathrm{M}`,
        `[\\text{Ox}_T] = ${texNum(b.ox, 4)},\\ [\\text{Red}_T]/p = ${texNum(b.redOxUnits, 4)}\\ \\mathrm{M}`,
      ],
    },
    { title: 'Volumen de equivalencia', tex: `n_A\\,C_A\\,V_A = n_T\\,C_T\\,V_{eq} \\Rightarrow V_{eq} = ${texNum(Veq, 5)}\\ \\mathrm{mL}` },
    { title: 'Potencial de equivalencia (fórmula de libro, cuplas con p = 1)', tex: 'E_{eq} = \\frac{n_A E^{\\circ\\prime}_A + n_T E^{\\circ\\prime}_T}{n_A + n_T} - \\frac{0{,}05916\\,(m_A+m_T)}{n_A+n_T}\\,\\mathrm{pH}' },
  ];
}
