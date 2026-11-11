/**
 * Pestaña: Complejometría (EDTA) y precipitación (argentometría).
 */
import { useDeferredValue, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { METALS, getMetal, getSalt } from '../../chem/data/metals';
import { getSystem } from '../../chem/data/acids';
import { alphas } from '../../chem/acidbase/equilibrium';
import { conditionalK, edtaCurve, edtaEquivalence, edtaPoint, logKcondVsPH, minimumPH, type EdtaSetup } from '../../chem/complex/edta';
import { argentoCurve, argentoEquivalences, mohrEndpointPAg, volumeAtPAg, type ArgentoSetup } from '../../chem/solubility/precipitation';
import { fmtFixed, fmtSig, fmtTick, niceTicks, texNum } from '../../chem/numeric/format';
import { Alert, NumField, Segmented, SelectField, Stat, Toggle } from '../components/fields';
import { ChartCard } from '../components/ChartCard';
import { Procedure } from '../components/Procedure';
import { checkNum, useNum } from '../hooks';
import { useChartTheme, useSeriesColors } from '../display';
import { exportCsv } from '../components/exporters';

export default function ComplexTab() {
  const [sub, setSub] = useState<'edta' | 'ag'>('edta');
  return (
    <div className="space-y-4">
      <Segmented ariaLabel="Tipo" value={sub} onChange={setSub} options={[{ value: 'edta', label: 'Complejometría (EDTA)' }, { value: 'ag', label: 'Precipitación (argentometría)' }]} />
      {sub === 'edta' ? <Edta /> : <Argento />}
    </div>
  );
}

/* ================= EDTA ================= */
function Edta() {
  const th = useChartTheme();
  const [metalId, setMetalId] = useState('Ca');
  const metal = getMetal(metalId)!;
  const logKf = useNum(fmtFixed(metal.logKf, 2));
  const pH = useNum('10');
  const CM = useNum('0,0400');
  const VM = useNum('50');
  const CY = useNum('0,0800');
  const [aux, setAux] = useState(false);
  const NH3tot = useNum('0,10');
  const onMetal = (id: string) => {
    setMetalId(id);
    logKf.setRaw(fmtFixed(getMetal(id)!.logKf, 2));
    if (!getMetal(id)!.nh3) setAux(false);
  };
  const errs = {
    K: checkNum(logKf.value, logKf.raw, { min: 0, max: 40 }),
    pH: checkNum(pH.value, pH.raw, { min: 0, max: 14 }),
    CM: checkNum(CM.value, CM.raw, { positive: true, max: 5 }),
    VM: checkNum(VM.value, VM.raw, { positive: true, max: 10000 }),
    CY: checkNum(CY.value, CY.raw, { positive: true, max: 5 }),
    NH3: aux ? checkNum(NH3tot.value, NH3tot.raw, { positive: true, max: 15 }) : null,
  };
  const ok = !Object.values(errs).some(Boolean);
  // NH3 libre: total × fracción como NH3 al pH dado (se supone constante: buffer en exceso)
  const freeNH3 = ok && aux ? NH3tot.value! * alphas(-pH.value!, getSystem('amonio')!.pKa)[1] : 0;
  const setup: EdtaSetup | null = ok ? { logKf: logKf.value!, pH: pH.value!, CM: CM.value!, VM: VM.value!, CY: CY.value!, auxLogBeta: aux ? metal.nh3 : undefined, auxL: freeNH3 } : null;
  const d = useDeferredValue(setup);
  const res = useMemo(() => {
    if (!d) return null;
    const Veq = edtaEquivalence(d);
    const Vmax = Number((Veq * 1.6).toPrecision(2));
    return { Veq, Vmax, curve: edtaCurve(d, Vmax), k: conditionalK(d), eqP: edtaPoint(d, Veq), ringbom: logKcondVsPH(d.logKf), minPH: minimumPH(d.logKf) };
  }, [d]);
  const logKc = res ? Math.log10(res.k.Kcond) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <div className="space-y-4">
        <section className="card space-y-3">
          <h2 className="card-title">Metal y EDTA</h2>
          <SelectField label="Metal" value={metalId} onChange={onMetal} options={METALS.map((m) => ({ value: m.id, label: `${m.name} (log Kf = ${fmtFixed(m.logKf, 2)})` }))} />
          <NumField label="log Kf (editable)" value={logKf.raw} onChange={logKf.setRaw} error={errs.K} hint="Harris, 25 °C, μ = 0,1 M." />
          <NumField label="pH (regulado)" value={pH.raw} onChange={pH.setRaw} error={errs.pH} />
          <NumField label="Concentración del metal" value={CM.raw} onChange={CM.setRaw} unit="mol/L" error={errs.CM} />
          <NumField label="Volumen de muestra" value={VM.raw} onChange={VM.setRaw} unit="mL" error={errs.VM} />
          <NumField label="Concentración de EDTA" value={CY.raw} onChange={CY.setRaw} unit="mol/L" error={errs.CY} />
          {metal.nh3 && <Toggle label="Agente complejante auxiliar: NH₃ (buffer amoniacal)" checked={aux} onChange={setAux} />}
          {aux && <NumField label="NH₃ + NH₄⁺ total" value={NH3tot.raw} onChange={NH3tot.setRaw} unit="mol/L" error={errs.NH3} hint={`NH₃ libre a ese pH: ${fmtSig(freeNH3, 3)} M (se supone constante).`} />}
          {metal.note && <Alert kind="info">{metal.note}</Alert>}
        </section>
      </div>
      <div className="min-w-0 space-y-4">
        {res && d && (
          <>
            {logKc < 8 && <Alert kind="warn">log K′f = {fmtFixed(logKc, 2)} &lt; 8: el punto final será poco nítido a este pH. {res.minPH != null ? `Conviene trabajar a pH ≥ ${fmtFixed(res.minPH, 1)}.` : ''}</Alert>}
            <section className="card grid grid-cols-2 gap-2 md:grid-cols-4">
              <Stat label="α(Y⁴⁻) a este pH" value={fmtSig(res.k.aY, 3)} />
              {aux && <Stat label="α(M) por NH₃" value={fmtSig(res.k.aM, 3)} />}
              <Stat label="K′f condicional" value={fmtSig(res.k.Kcond, 3)} sub={`log K′f = ${fmtFixed(logKc, 2)}`} />
              <Stat label="V de equivalencia" value={`${fmtFixed(res.Veq, 3)} mL`} />
              <Stat label={`p${metal.name.replace(/[⁺²³]/g, '')} en la equivalencia`} value={fmtFixed(res.eqP.pM, 2)} />
              <Stat label="pH mínimo (log K′ ≥ 8)" value={res.minPH == null ? '—' : fmtFixed(res.minPH, 1)} />
            </section>
            <ChartCard
              title={`Curva de titulación: pM vs V de EDTA`}
              filename="curva-edta.png"
              actions={<button className="btn" onClick={() => exportCsv([['V (mL)', 'pM'], ...res.curve.map((p) => [p.V, p.pM])], 'curva-edta.csv')}>⬇ CSV</button>}
            >
              <ResponsiveContainer width="100%" height={th.height}>
                <LineChart data={res.curve} margin={{ top: 24, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid stroke={th.grid} />
                  <XAxis dataKey="V" type="number" domain={[0, res.Vmax]} ticks={niceTicks(0, res.Vmax)} tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                    label={{ value: 'V de EDTA (mL)', position: 'insideBottom', offset: -18, fontSize: th.fontSize, fill: th.axis }} />
                  <YAxis tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} label={{ value: 'pM', angle: -90, position: 'insideLeft', fontSize: th.fontSize, fill: th.axis }} />
                  <ReferenceLine x={res.Veq} stroke={th.accent} strokeDasharray="6 4" label={{ value: 'PE', position: 'top', fontSize: th.fontSize - 2, fill: th.accent }} />
                  <Tooltip formatter={(v: number) => [fmtFixed(v, 2), 'pM']} labelFormatter={(v: number) => `V = ${fmtFixed(v, 2)} mL`} contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} />
                  <Line dataKey="pM" dot={false} stroke={th.main} strokeWidth={th.strokeWidth} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="log K′f vs pH (¿a qué pH conviene titular?)" filename="logK-vs-pH.png">
              <ResponsiveContainer width="100%" height={Math.round(th.height * 0.6)}>
                <LineChart data={res.ringbom} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid stroke={th.grid} />
                  <XAxis dataKey="pH" type="number" domain={[0, 14]} ticks={[0, 2, 4, 6, 8, 10, 12, 14]} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                    label={{ value: 'pH', position: 'insideBottom', offset: -18, fontSize: th.fontSize, fill: th.axis }} />
                  <YAxis tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} label={{ value: 'log K′f', angle: -90, position: 'insideLeft', fontSize: th.fontSize, fill: th.axis }} />
                  <ReferenceArea y1={8} y2={40} fill={th.main} fillOpacity={0.08} ifOverflow="hidden" />
                  <ReferenceLine y={8} stroke={th.muted} strokeDasharray="4 4" label={{ value: 'log K′ = 8', position: 'insideTopLeft', fontSize: th.fontSize - 2, fill: th.muted }} />
                  <ReferenceLine x={d.pH} stroke={th.accent} />
                  <Tooltip formatter={(v: number) => [fmtFixed(v, 2), 'log K′f']} labelFormatter={(v: number) => `pH ${fmtFixed(v, 1)}`} contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} />
                  <Line dataKey="logK" dot={false} stroke={th.main} strokeWidth={th.strokeWidth} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-600 dark:text-slate-400">Criterio habitual: log K′f ≥ 8 para un punto final nítido (C ≈ 0,01 M). Ojo: a pH alto muchos metales precipitan como hidróxidos (no incluido en este gráfico).</p>
            </ChartCard>
            <Procedure
              steps={[
                { title: 'Fracción de EDTA como Y⁴⁻', text: 'Con los 6 pKa del H₆Y²⁺ (0,0; 1,5; 2,00; 2,69; 6,13; 10,37).', tex: `\\alpha_{Y^{4-}} = \\frac{K_1K_2\\cdots K_6}{[\\mathrm{H^+}]^6 + [\\mathrm{H^+}]^5K_1 + \\cdots + K_1\\cdots K_6} = ${texNum(res.k.aY, 4)}` },
                ...(aux ? [{ title: 'Fracción de metal libre (NH₃ auxiliar)', tex: `\\alpha_M = \\frac{1}{1 + \\beta_1[\\mathrm{NH_3}] + \\beta_2[\\mathrm{NH_3}]^2 + \\cdots} = ${texNum(res.k.aM, 4)},\\quad [\\mathrm{NH_3}] = ${texNum(freeNH3, 3)}` }] : []),
                { title: 'Constante condicional', tex: `K''_f = K_f\\,\\alpha_{Y^{4-}}${aux ? '\\,\\alpha_M' : ''} = 10^{${fmtFixed(d.logKf, 2).replace(',', '{,}')}}\\times ${texNum(res.k.aY, 3)}${aux ? `\\times ${texNum(res.k.aM, 3)}` : ''} = ${texNum(res.k.Kcond, 4)}` },
                { title: 'Cálculo exacto en cada punto (sin dividir en zonas)', tex: ["C_M = [M'] + [MY],\\quad C_Y = [Y'] + [MY],\\quad [MY] = K''[M'][Y']", "\\Rightarrow K''[M']^2 + \\left(1 + K''(C_Y - C_M)\\right)[M'] - C_M = 0", `\\text{En el PE: } [M'] = ${texNum(res.eqP.Mfree, 4)}\\ \\Rightarrow\\ \\mathrm{pM} = ${fmtFixed(res.eqP.pM, 3).replace(',', '{,}')}`] },
              ]}
            />
          </>
        )}
      </div>
    </div>
  );
}

/* ================= Argentometría ================= */
const HALIDES = [
  { id: 'AgCl', name: 'Cl⁻' },
  { id: 'AgBr', name: 'Br⁻' },
  { id: 'AgI', name: 'I⁻' },
  { id: 'AgSCN', name: 'SCN⁻' },
];

function Argento() {
  const th = useChartTheme();
  const colors = useSeriesColors();
  const [x1, setX1] = useState('AgCl');
  const [mix, setMix] = useState(false);
  const [x2, setX2] = useState('AgI');
  const C1 = useNum('0,0500');
  const C2 = useNum('0,0500');
  const Vx = useNum('50');
  const CAg = useNum('0,1000');
  const CrO4 = useNum('0,005');
  const [yMode, setYMode] = useState<'pAg' | 'pX'>('pAg');
  const errs = {
    C1: checkNum(C1.value, C1.raw, { positive: true, max: 5 }),
    C2: mix ? checkNum(C2.value, C2.raw, { positive: true, max: 5 }) : null,
    Vx: checkNum(Vx.value, Vx.raw, { positive: true, max: 10000 }),
    CAg: checkNum(CAg.value, CAg.raw, { positive: true, max: 5 }),
    Cr: checkNum(CrO4.value, CrO4.raw, { positive: true, max: 1 }),
    same: mix && x1 === x2 ? 'Elegí dos aniones distintos.' : null,
  };
  const ok = !Object.values(errs).some(Boolean);
  const salt = (id: string) => getSalt(id)!;
  const setup: ArgentoSetup | null = ok
    ? { halides: [{ C: C1.value!, Ksp: salt(x1).Ksp, name: HALIDES.find((h) => h.id === x1)!.name }, ...(mix ? [{ C: C2.value!, Ksp: salt(x2).Ksp, name: HALIDES.find((h) => h.id === x2)!.name }] : [])], Vx: Vx.value!, CAg: CAg.value! }
    : null;
  const d = useDeferredValue(setup);
  const res = useMemo(() => {
    if (!d) return null;
    const eqs = argentoEquivalences(d);
    const Vmax = Number((eqs[eqs.length - 1].V * 1.4).toPrecision(2));
    const curve = argentoCurve(d, Vmax).map((p) => ({ V: p.V, pAg: p.pAg, ...Object.fromEntries(p.pX.map((v, i) => [`pX${i}`, v])) }));
    return { eqs, Vmax, curve };
  }, [d]);
  const mohr = ok && CrO4.value ? mohrEndpointPAg(CrO4.value, salt('Ag2CrO4').Ksp) : null;
  const mohrV = res && d && mohr != null ? volumeAtPAg(d, mohr, res.Vmax) : null;
  const lastEq = res ? res.eqs[res.eqs.length - 1] : null;
  const mohrErr = mohrV != null && lastEq ? ((mohrV - lastEq.V) / lastEq.V) * 100 : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <div className="space-y-4">
        <section className="card space-y-3">
          <h2 className="card-title">Muestra y titulante</h2>
          <SelectField label="Anión" value={x1} onChange={setX1} options={HALIDES.map((h) => ({ value: h.id, label: `${h.name} (Ksp ${h.id} = ${fmtSig(getSalt(h.id)!.Ksp, 2)})` }))} />
          <NumField label="Concentración del anión" value={C1.raw} onChange={C1.setRaw} unit="mol/L" error={errs.C1} />
          <Toggle label="Mezcla de dos aniones" checked={mix} onChange={setMix} />
          {mix && (
            <>
              <SelectField label="Segundo anión" value={x2} onChange={setX2} options={HALIDES.map((h) => ({ value: h.id, label: `${h.name} (Ksp ${h.id} = ${fmtSig(getSalt(h.id)!.Ksp, 2)})` }))} />
              <NumField label="Concentración del segundo anión" value={C2.raw} onChange={C2.setRaw} unit="mol/L" error={errs.C2} />
            </>
          )}
          {errs.same && <Alert kind="error">{errs.same}</Alert>}
          <NumField label="Volumen de muestra" value={Vx.raw} onChange={Vx.setRaw} unit="mL" error={errs.Vx} />
          <NumField label="Concentración de AgNO₃" value={CAg.raw} onChange={CAg.setRaw} unit="mol/L" error={errs.CAg} />
          <NumField label="Método de Mohr: [CrO₄²⁻] en el punto final" value={CrO4.raw} onChange={CrO4.setRaw} unit="mol/L" error={errs.Cr} hint="Típico: 0,005 M." />
        </section>
      </div>
      <div className="min-w-0 space-y-4">
        {res && d && (
          <>
            <ChartCard
              title={`Curva de precipitación: ${yMode === 'pAg' ? 'pAg' : 'pX'} vs V de AgNO₃`}
              filename="curva-argentometria.png"
              actions={
                <>
                  <Segmented ariaLabel="Eje y" value={yMode} onChange={setYMode} options={[{ value: 'pAg', label: 'pAg' }, { value: 'pX', label: 'pX' }]} />
                  <button className="btn" onClick={() => exportCsv([['V (mL)', 'pAg', ...d.halides.map((h) => `p${h.name}`)], ...res.curve.map((p) => [p.V, p.pAg, ...d.halides.map((_, i) => (p as Record<string, number>)[`pX${i}`])])], 'curva-argentometria.csv')}>⬇ CSV</button>
                </>
              }
            >
              <ResponsiveContainer width="100%" height={th.height}>
                <LineChart data={res.curve} margin={{ top: 24, right: 20, bottom: yMode === 'pX' ? 10 : 30, left: 10 }}>
                  <CartesianGrid stroke={th.grid} />
                  <XAxis dataKey="V" type="number" domain={[0, res.Vmax]} ticks={niceTicks(0, res.Vmax)} tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                    label={{ value: 'V de AgNO₃ (mL)', position: 'insideBottom', offset: -18, fontSize: th.fontSize, fill: th.axis }} />
                  <YAxis tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} label={{ value: yMode, angle: -90, position: 'insideLeft', fontSize: th.fontSize, fill: th.axis }} />
                  {res.eqs.map((e, i) => <ReferenceLine key={`e${i}`} x={e.V} stroke={th.accent} strokeDasharray="6 4" label={{ value: `PE (${e.name})`, position: 'top', fontSize: th.fontSize - 2, fill: th.accent }} />)}
                  {yMode === 'pAg' && mohr != null && <ReferenceLine y={mohr} stroke="#b45309" strokeDasharray="3 3" label={{ value: 'Mohr: aparece Ag₂CrO₄', position: 'insideTopRight', fontSize: th.fontSize - 3, fill: '#b45309' }} />}
                  <Tooltip formatter={(v: number, n: string) => [fmtFixed(v, 2), n]} labelFormatter={(v: number) => `V = ${fmtFixed(v, 2)} mL`} contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} />
                  {yMode === 'pAg' ? (
                    <Line dataKey="pAg" name="pAg" dot={false} stroke={th.main} strokeWidth={th.strokeWidth} isAnimationActive={false} />
                  ) : (
                    d.halides.map((h, i) => <Line key={`x${i}`} dataKey={`pX${i}`} name={`p${h.name}`} dot={false} stroke={colors[i]} strokeWidth={th.strokeWidth} isAnimationActive={false} />)
                  )}
                  {yMode === 'pX' && <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: th.fontSize, paddingTop: th.fontSize * 2 }} />}
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <section className="card grid grid-cols-2 gap-2 md:grid-cols-4">
              {res.eqs.map((e, i) => <Stat key={i} label={`PE${res.eqs.length > 1 ? i + 1 : ''} (${e.name})`} value={`${fmtFixed(e.V, 3)} mL`} sub={`pAg = ${fmtFixed(e.pAg, 2)}`} />)}
              {mohr != null && <Stat label="Mohr: pAg de punto final" value={fmtFixed(mohr, 2)} sub={mohrV != null ? `V = ${fmtFixed(mohrV, 3)} mL` : 'no se alcanza'} />}
              {mohrErr != null && <Stat label="Error de Mohr (sin blanco)" value={`${mohrErr >= 0 ? '+' : ''}${fmtSig(mohrErr, 2)} %`} />}
            </section>
            <section className="card space-y-2 text-sm">
              <h3 className="card-title">Métodos argentométricos</h3>
              <p><strong>Mohr</strong> (directo, pH 7–10): indicador K₂CrO₄; el punto final es la aparición de Ag₂CrO₄ rojo ladrillo. Se calcula arriba con [Ag⁺]² [CrO₄²⁻] = Ksp(Ag₂CrO₄) = {fmtSig(getSalt('Ag2CrO4')!.Ksp, 2)}. En la práctica se corrige con un blanco (hace falta un pequeño exceso de Ag⁺ para ver el color). A pH ácido el cromato pasa a HCrO₄⁻; a pH alcalino precipita AgOH.</p>
              <p><strong>Volhard</strong> (retroceso, medio HNO₃): se agrega exceso conocido de AgNO₃ y se titula el sobrante con SCN⁻ usando Fe³⁺ como indicador (complejo rojo FeSCN²⁺). Para Cl⁻ hay que filtrar el AgCl o recubrirlo (nitrobenceno), porque AgCl es más soluble que AgSCN.</p>
              <p><strong>Fajans</strong> (indicadores de adsorción): fluoresceína o diclorofluoresceína para Cl⁻, eosina para Br⁻, I⁻ y SCN⁻. Después del punto de equivalencia el precipitado adsorbe Ag⁺ en exceso, atrae al indicador aniónico y cambia de color (verde amarillento → rosado).</p>
            </section>
            <Procedure
              steps={[
                { title: 'Planteo exacto (vale antes, en y después de la equivalencia)', tex: ['[\\mathrm{X^-}] = \\min\\left(C_X,\\ \\frac{K_{sp}}{[\\mathrm{Ag^+}]}\\right)', 'C_{Ag} = [\\mathrm{Ag^+}] + \\sum (C_X - [\\mathrm{X^-}])'], text: 'Se resuelve [Ag⁺] con el método de Brent; la función es creciente, la solución es única. Con mezclas, precipita primero la sal con menor Ksp (para sales 1:1).' },
                ...res.eqs.map((e) => ({ title: `Equivalencia (${e.name})`, tex: `V_{eq} = ${texNum(e.V, 5)}\\ \\mathrm{mL};\\quad \\mathrm{pAg} = ${fmtFixed(e.pAg, 3).replace(',', '{,}')}` })),
                ...(mohr != null ? [{ title: 'Punto final de Mohr', tex: `[\\mathrm{Ag^+}] = \\sqrt{\\frac{K_{sp}(\\mathrm{Ag_2CrO_4})}{[\\mathrm{CrO_4^{2-}}]}} = ${texNum(10 ** -mohr, 4)}\\ \\Rightarrow\\ \\mathrm{pAg} = ${fmtFixed(mohr, 3).replace(',', '{,}')}` }] : []),
              ]}
            />
          </>
        )}
      </div>
    </div>
  );
}

