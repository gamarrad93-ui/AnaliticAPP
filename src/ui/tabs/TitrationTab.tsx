/**
 * Pestaña: Titulaciones ácido-base.
 * Todo el cálculo viene de src/chem (motor exacto); acá sólo se arma la interfaz.
 */
import { useDeferredValue, useId, useMemo, useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { getCompound, TITRANTS, type Compound } from '../../chem/data/acids';
import { INDICATORS, getIndicator } from '../../chem/data/indicators';
import { compoundToComponent, genericSpecies, parsePKaList, speciesNamesOf } from '../../chem/acidbase/fromLibrary';
import { KW, alphas, netCharge, type Component, type ProticSystem } from '../../chem/acidbase/equilibrium';
import { analyteVolumeForTitrantVolume, equivalencePoints, mixtureAt, pHAt, stoichiometricEquivalences, titrationCurve, type TitrationSetup } from '../../chem/acidbase/titration';
import { evaluateIndicator, type Verdict } from '../../chem/acidbase/indicatorCheck';
import { fmtFixed, fmtSig, fmtTick, niceTicks, texNum } from '../../chem/numeric/format';
import { Alert, NumField, Segmented, SelectField, Stat, Toggle } from '../components/fields';
import { AnalyteSelect, CUSTOM_ACID, CUSTOM_BASE } from '../components/AnalyteSelect';
import { ChartCard } from '../components/ChartCard';
import { Procedure, type Step } from '../components/Procedure';
import { checkNum, useNum } from '../hooks';
import { useChartTheme } from '../display';
import { exportCsv } from '../components/exporters';
import { indicatorGradientDefs, IndicatorLegend } from '../components/indicatorGradient';

const SHARP_LABEL = { nitido: 'Nítido', 'poco-nitido': 'Poco nítido', 'no-detectable': 'No detectable' } as const;
const SHARP_CLS = {
  nitido: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
  'poco-nitido': 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  'no-detectable': 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
} as const;
export const VERDICT_LABEL: Record<Verdict, string> = {
  excelente: '✔ Excelente',
  aceptable: '≈ Aceptable',
  'no-recomendado': '✘ No recomendado',
  'no-vira': '— No vira en el rango',
};
export const VERDICT_CLS: Record<Verdict, string> = {
  excelente: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
  aceptable: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  'no-recomendado': 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100',
  'no-vira': 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
};

/** Arma un componente a partir de la selección (biblioteca o personalizado). */
function useAnalyte(defaultId: string, defaultC: string) {
  const [id, setId] = useState(defaultId);
  const C = useNum(defaultC);
  const [pkaRaw, setPkaRaw] = useState('3,0; 7,0');
  const compound = id === CUSTOM_ACID || id === CUSTOM_BASE ? null : getCompound(id) ?? null;
  const parsed = parsePKaList(pkaRaw);
  let component: Component | null = null;
  let names: string[] = [];
  let label = '';
  const cErr = checkNum(C.value, C.raw, { positive: true, max: 20 });
  if (!cErr && C.value != null) {
    if (compound) {
      component = compoundToComponent(compound, C.value);
      names = speciesNamesOf(compound);
      label = `${compound.name} (${compound.formula})`;
    } else if (!parsed.error) {
      const sys: ProticSystem = { pKa: parsed.values, zFull: id === CUSTOM_BASE ? parsed.values.length : 0 };
      component = { kind: 'weak', C: C.value, system: sys, hAdded: id === CUSTOM_BASE ? 0 : parsed.values.length };
      names = genericSpecies(sys, id === CUSTOM_BASE ? 'B' : 'A');
      label = id === CUSTOM_BASE ? 'Base personalizada' : 'Ácido personalizado';
    }
  }
  return { id, setId, C, cErr, pkaRaw, setPkaRaw, pkaErr: compound ? null : parsed.error, compound, component, names, label, custom: !compound };
}

type AnalyteState = ReturnType<typeof useAnalyte>;

function AnalyteInputs({ a, title }: { a: AnalyteState; title: string }) {
  return (
    <div className="space-y-3">
      <AnalyteSelect label={title} value={a.id} onChange={a.setId} />
      {a.custom && (
        <NumField
          label={a.id === CUSTOM_BASE ? 'pKa del ácido conjugado (BH⁺, BH₂²⁺…)' : 'Valores de pKa'}
          value={a.pkaRaw}
          onChange={a.setPkaRaw}
          error={a.pkaErr}
          hint="Separá con punto y coma: 2,15; 7,20; 12,35"
        />
      )}
      <NumField label="Concentración" value={a.C.raw} onChange={a.C.setRaw} unit="mol/L" error={a.cErr} />
    </div>
  );
}

/** Parámetros opcionales en la URL (#titulaciones?a=Na2CO3&ca=0,05&va=20&t=HCl&ct=0,25&ind=…&pe=2), usados por "Prácticos". */
function urlParams() {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const num = (k: string) => (q.get(k) ? q.get(k)!.replace('.', ',') : null);
  return {
    a: q.get('a') && getCompound(q.get('a')!) ? q.get('a')! : null,
    ca: num('ca'),
    a2: q.get('a2') && getCompound(q.get('a2')!) ? q.get('a2')! : null,
    ca2: num('ca2'),
    va: num('va'),
    t: q.get('t') && TITRANTS.some((x) => x.id === q.get('t')) ? q.get('t')! : null,
    ct: num('ct'),
    ind: q.get('ind') && getIndicator(q.get('ind')!) ? q.get('ind')! : null,
    pe: q.get('pe') ? Number(q.get('pe')) : null,
  };
}

export default function TitrationTab() {
  const th = useChartTheme();
  const gradId = 'ind-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [U] = useState(urlParams);
  const a1 = useAnalyte(U.a ?? 'CH3COOH', U.ca ?? '0,1');
  const a2 = useAnalyte(U.a2 ?? 'HCl', U.ca2 ?? '0,05');
  const [mix, setMix] = useState(!!U.a2);
  const Va = useNum(U.va ?? '25');
  // ¿Qué fija el usuario? el volumen de analito (se calcula el gasto) o el gasto de bureta (se calcula el analito)
  const [fixMode, setFixMode] = useState<'analito' | 'gasto'>('analito');
  const Vg = useNum('8');
  const [peRef, setPeRef] = useState(U.pe ?? 1);
  const [titrantId, setTitrantId] = useState(U.t ?? 'NaOH');
  const Ct = useNum(U.ct ?? '0,1');
  const [autoV, setAutoV] = useState(true);
  const VmaxIn = useNum('50');
  const [showD1, setShowD1] = useState(false);
  const [indId, setIndId] = useState(U.ind ?? 'fenolftaleina');
  const ind = getIndicator(indId)!;
  const pHendIn = useNum(fmtFixed((ind.low + ind.high) / 2, 2));
  const [sliderV, setSliderV] = useState<number | null>(null);

  const CtErr = checkNum(Ct.value, Ct.raw, { positive: true, max: 20 });
  const titrant0 = getCompound(titrantId)!;

  // Componentes del analito (independientes del volumen)
  const comps = useMemo(() => {
    const c: Component[] = [];
    const names: string[][] = [];
    if (a1.component) {
      c.push(a1.component);
      names.push(a1.names);
    }
    if (mix && a2.component) {
      c.push(a2.component);
      names.push(a2.names);
    }
    return c.length === (mix ? 2 : 1) ? { c, names } : null;
  }, [a1.component, a2.component, mix, a1.names, a2.names]);

  // Volúmenes de equivalencia por mL de analito (los PE son proporcionales a Va)
  const perMl = useMemo(
    () => (comps && Ct.value && !CtErr ? stoichiometricEquivalences({ analyte: comps.c, Va: 1, titrant: compoundToComponent(titrant0, Ct.value) }) : []),
    [comps, Ct.value, CtErr, titrant0],
  );
  const k = Math.min(peRef, Math.max(1, perMl.length));
  const VgErr = fixMode === 'gasto' ? checkNum(Vg.value, Vg.raw, { positive: true, max: 10000 }) : null;
  const VaComputed =
    fixMode === 'gasto' && !VgErr && Vg.value != null && comps && Ct.value && !CtErr
      ? analyteVolumeForTitrantVolume(comps.c, compoundToComponent(titrant0, Ct.value), Vg.value, k)
      : null;
  const VaErr =
    fixMode === 'analito'
      ? checkNum(Va.value, Va.raw, { positive: true, max: 10000 })
      : VaComputed != null && VaComputed > 10000
        ? 'Haría falta más de 10 L de analito: revisá las concentraciones.'
        : null;
  const VaEff = fixMode === 'analito' ? Va.value : VaComputed;
  const VgShown = fixMode === 'analito' && Va.value != null && perMl[k - 1] ? Va.value * perMl[k - 1] : null;

  /** Al cambiar de modo, el valor calculado pasa a ser el valor escrito (así nada "salta"). */
  const switchMode = (m: 'analito' | 'gasto') => {
    if (m === fixMode) return;
    if (m === 'gasto' && VgShown != null) Vg.setRaw(fmtTick(Number(VgShown.toPrecision(4))));
    if (m === 'analito' && VaComputed != null) Va.setRaw(fmtTick(Number(VaComputed.toPrecision(4))));
    setFixMode(m);
    setSliderV(null);
  };
  const VmaxErr = autoV ? null : checkNum(VmaxIn.value, VmaxIn.raw, { positive: true, max: 100000 });
  const pHendErr = checkNum(pHendIn.value, pHendIn.raw, { min: -1, max: 15 });
  const titrant = getCompound(titrantId)!;

  // --- armado del problema (se difiere para no trabar la escritura) ---
  const setupInput = useMemo(() => {
    const ok = comps && !VaErr && !VgErr && !CtErr && !VmaxErr && VaEff && Ct.value;
    if (!ok) return null;
    const s: TitrationSetup = { analyte: comps.c, Va: VaEff!, titrant: compoundToComponent(titrant, Ct.value!) };
    return { s, names: comps.names, VmaxManual: autoV ? null : VmaxIn.value };
  }, [comps, VaEff, Ct.value, titrant, autoV, VmaxIn.value, VaErr, VgErr, CtErr, VmaxErr]);
  const deferred = useDeferredValue(setupInput);

  const result = useMemo(() => {
    if (!deferred) return null;
    const { s, names, VmaxManual } = deferred;
    const eqInfo = equivalencePoints(s, names);
    if (eqInfo.eq.length === 0) return { error: 'Este titulante no reacciona con el analito. Para titular un ácido elegí una base (NaOH, KOH…), y para una base elegí un ácido (HCl…).' } as const;
    const lastEq = eqInfo.eq[eqInfo.eq.length - 1].V;
    const Vmax = VmaxManual ?? Number((lastEq * 1.4).toPrecision(2));
    if (lastEq > 1e5) return { error: 'El volumen de equivalencia es enorme (más de 100 L). Revisá las concentraciones.' } as const;
    const curve = titrationCurve(s, Vmax);
    const indResults = INDICATORS.map((i) => evaluateIndicator(s, i, eqInfo.eq.filter((e) => e.sharpness !== 'no-detectable'), Vmax));
    return { s, eqInfo, Vmax, curve, indResults };
  }, [deferred]);

  const ok = result && !('error' in result) ? result : null;
  const V = ok ? Math.min(sliderV ?? ok.eqInfo.eq[Math.min(k, ok.eqInfo.eq.length) - 1].V, ok.Vmax) : 0;
  const pHV = ok ? pHAt(ok.s, V) : NaN;

  const selInd = useMemo(() => {
    if (!ok || pHendIn.value == null || pHendErr) return null;
    return evaluateIndicator(ok.s, ind, ok.eqInfo.eq.filter((e) => e.sharpness !== 'no-detectable'), ok.Vmax, pHendIn.value);
  }, [ok, ind, pHendIn.value, pHendErr]);

  const onIndicator = (id: string) => {
    setIndId(id);
    const i = getIndicator(id)!;
    pHendIn.setRaw(fmtFixed((i.low + i.high) / 2, 2));
  };

  const steps = useMemo<Step[]>(() => {
    if (!ok) return [];
    const base = buildSteps(ok.s, V, pHV, ok.eqInfo, deferred!.names, titrant);
    if (fixMode !== 'gasto' || Vg.value == null || !perMl[k - 1]) return base;
    return [
      {
        title: `Volumen de analito para gastar ${fmtSig(Vg.value, 4)} mL en el PE${perMl.length > 1 ? k : ''}`,
        text: 'Los volúmenes de equivalencia son proporcionales al volumen de analito (mmol de analito = C·Vₐ). Se calcula el gasto que daría 1 mL de analito y se despeja Vₐ.',
        tex: [
          `V_{PE${perMl.length > 1 ? k : ''}}\ \text{por mL de analito} = ${texNum(perMl[k - 1], 5)}\ \mathrm{mL/mL}`,
          `V_a = \frac{V_{\text{gasto}}}{${texNum(perMl[k - 1], 5)}} = \frac{${texNum(Vg.value, 4)}}{${texNum(perMl[k - 1], 5)}} = ${texNum(ok.s.Va, 5)}\ \mathrm{mL}`,
        ],
      },
      ...base,
    ];
  }, [ok, V, pHV, deferred, titrant, fixMode, Vg.value, perMl, k]);

  const anyErr = a1.cErr || a1.pkaErr || (mix && (a2.cErr || a2.pkaErr)) || VaErr || VgErr || CtErr || VmaxErr;
  const gastoNoPE = fixMode === 'gasto' && comps && Ct.value && !CtErr && perMl.length === 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
      {/* ---------- Entradas ---------- */}
      <div className="space-y-4">
        <section className="card space-y-3">
          <h2 className="card-title">Analito</h2>
          <AnalyteInputs a={a1} title="Sustancia a titular" />
          <div>
            <span className="label">¿Qué fijás?</span>
            <Segmented
              ariaLabel="Qué volumen fijás"
              value={fixMode}
              onChange={switchMode}
              options={[
                { value: 'analito', label: 'Volumen de analito' },
                { value: 'gasto', label: 'Gasto de bureta' },
              ]}
            />
          </div>
          <NumField
            label={fixMode === 'analito' ? 'Volumen de analito' : 'Volumen de analito a tomar (calculado)'}
            value={fixMode === 'analito' ? Va.raw : VaComputed != null ? fmtSig(VaComputed, 4) : '—'}
            onChange={Va.setRaw}
            unit="mL"
            error={VaErr}
            disabled={fixMode !== 'analito'}
          />
          <NumField
            label={fixMode === 'gasto' ? `Gasto de bureta deseado (en el PE${perMl.length > 1 ? k : ''})` : `Gasto de bureta en el PE${perMl.length > 1 ? k : ''} (calculado)`}
            value={fixMode === 'gasto' ? Vg.raw : VgShown != null ? fmtSig(VgShown, 4) : '—'}
            onChange={Vg.setRaw}
            unit="mL"
            error={VgErr}
            disabled={fixMode !== 'gasto'}
            hint={fixMode === 'gasto' ? 'Ej.: 8 mL. La app calcula cuánto analito tomar para gastar eso en la bureta.' : 'Elegí "Gasto de bureta" para fijar este valor y calcular el analito.'}
          />
          {perMl.length > 1 && (
            <SelectField
              label="Punto de equivalencia de referencia"
              value={String(k)}
              onChange={(v) => setPeRef(Number(v))}
              options={perMl.map((_, i) => ({ value: String(i + 1), label: `PE${i + 1}` }))}
            />
          )}
          {gastoNoPE && <Alert kind="warn">Este titulante no reacciona con el analito: no se puede calcular el volumen.</Alert>}
          {fixMode === 'gasto' && VaComputed != null && VaComputed < 2 && <Alert kind="warn">Menos de 2 mL de analito es difícil de medir con exactitud: conviene diluir el titulante o elegir un gasto mayor.</Alert>}
          <Toggle label="Mezcla: agregar un segundo componente" checked={mix} onChange={setMix} />
          {mix && <AnalyteInputs a={a2} title="Segundo componente" />}
        </section>
        <section className="card space-y-3">
          <h2 className="card-title">Titulante</h2>
          <SelectField label="Titulante" value={titrantId} onChange={setTitrantId} options={TITRANTS.map((t) => ({ value: t.id, label: `${t.name} (${t.formula})` }))} />
          <NumField label="Concentración del titulante" value={Ct.raw} onChange={Ct.setRaw} unit="mol/L" error={CtErr} />
          <Toggle label="Volumen máximo automático" checked={autoV} onChange={setAutoV} />
          {!autoV && <NumField label="Volumen máximo a graficar" value={VmaxIn.raw} onChange={VmaxIn.setRaw} unit="mL" error={VmaxErr} />}
        </section>
        <section className="card space-y-3">
          <h2 className="card-title">Indicador</h2>
          <SelectField label="Indicador" value={indId} onChange={onIndicator} options={INDICATORS.map((i) => ({ value: i.id, label: `${i.name} (${fmtFixed(i.low, 1)}–${fmtFixed(i.high, 1)})` }))} />
          <div className="flex items-center gap-2 text-sm">
            <span className="h-4 w-8 rounded" style={{ background: ind.acidHex }} title={ind.acidColor} />
            <span>{ind.acidColor}</span>
            <span>→</span>
            <span className="h-4 w-8 rounded" style={{ background: ind.baseHex }} title={ind.baseColor} />
            <span>{ind.baseColor}</span>
          </div>
          <NumField label="pH del punto final (viraje)" value={pHendIn.raw} onChange={pHendIn.setRaw} error={pHendErr} hint="Por defecto, el punto medio del intervalo de viraje." />
        </section>
      </div>

      {/* ---------- Resultados ---------- */}
      <div className="min-w-0 space-y-4">
        {anyErr && <Alert kind="warn">Revisá los datos marcados en rojo.</Alert>}
        {result && 'error' in result && <Alert kind="error">{result.error}</Alert>}
        {ok && (
          <>
            <ChartCard
              title="Curva de titulación: pH vs volumen de titulante"
              filename="curva-titulacion.png"
              actions={
                <>
                  <Toggle label="1ª derivada" checked={showD1} onChange={setShowD1} />
                  <button
                    className="btn"
                    onClick={() => exportCsv([['V (mL)', 'pH', 'dpH/dV'], ...ok.curve.map((p) => [p.V, p.pH, p.d1 ?? ''])], 'curva-titulacion.csv')}
                  >
                    ⬇ CSV
                  </button>
                </>
              }
            >
              <ResponsiveContainer width="100%" height={th.height}>
                <LineChart data={ok.curve} margin={{ top: 24, right: 20, bottom: 30, left: 10 }}>
                  {/* fondo: color del indicador según el pH (degradé SVG alineado al eje 0–14) */}
                  {indicatorGradientDefs({ id: gradId, ind, opacity: th.dark ? 0.32 : 0.38, yMin: 0, yMax: 14 })}
                  <ReferenceArea y1={0} y2={14} fill={`url(#${gradId})`} fillOpacity={1} stroke="none" ifOverflow="hidden" />
                  <CartesianGrid stroke={th.grid} />
                  <XAxis
                    dataKey="V" type="number" domain={[0, ok.Vmax]} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                    ticks={niceTicks(0, ok.Vmax)} tickFormatter={fmtTick}
                    label={{ value: `V de ${titrant.formula} (mL)`, position: 'insideBottom', offset: -18, fontSize: th.fontSize, fill: th.axis }}
                  />
                  <YAxis
                    domain={[0, 14]} ticks={[0, 2, 4, 6, 8, 10, 12, 14]} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                    allowDataOverflow
                    label={{ value: 'pH', angle: -90, position: 'insideLeft', fontSize: th.fontSize, fill: th.axis }}
                  />
                  {ok.eqInfo.eq.map((e) => (
                    <ReferenceLine key={`eq${e.index}`} x={e.V} stroke={th.accent} strokeDasharray="6 4" strokeWidth={1.5}
                      label={{ value: `PE${e.index}`, position: 'top', fontSize: th.fontSize - 2, fill: th.accent }} />
                  ))}
                  {ok.eqInfo.half.map((h) => (
                    <ReferenceDot key={`h${h.index}`} x={h.V} y={h.pH} r={th.projector ? 7 : 5} fill={th.bg} stroke={th.main} strokeWidth={2} />
                  ))}
                  <Tooltip
                    formatter={(v: number) => [fmtFixed(v, 2), 'pH']}
                    labelFormatter={(v: number) => `V = ${fmtFixed(v, 2)} mL`}
                    contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }}
                  />
                  <Line dataKey="pH" type="monotone" dot={false} stroke={th.main} strokeWidth={th.strokeWidth} isAnimationActive={false} />
                  <ReferenceDot x={V} y={pHV} r={th.projector ? 9 : 6} fill={th.accent} stroke={th.bg} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              <IndicatorLegend ind={ind} fmt={(x) => fmtFixed(x, 1)} />
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Fondo: color que toma {ind.name.toLowerCase()} a cada pH (degradé dentro del intervalo de viraje). Líneas punteadas: puntos de equivalencia (PE). Círculos huecos: semiequivalencias.
              </p>
            </ChartCard>

            {showD1 && (
              <ChartCard title="Primera derivada: dpH/dV" filename="primera-derivada.png">
                <ResponsiveContainer width="100%" height={Math.round(th.height * 0.6)}>
                  <LineChart data={ok.curve} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                    <CartesianGrid stroke={th.grid} />
                    <XAxis dataKey="V" type="number" domain={[0, ok.Vmax]} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                      ticks={niceTicks(0, ok.Vmax)} tickFormatter={fmtTick} label={{ value: 'V (mL)', position: 'insideBottom', offset: -18, fontSize: th.fontSize, fill: th.axis }} />
                    <YAxis tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} tickFormatter={fmtTick}
                      label={{ value: 'dpH/dV (mL⁻¹)', angle: -90, position: 'insideLeft', fontSize: th.fontSize, fill: th.axis }} />
                    {ok.eqInfo.eq.map((e) => <ReferenceLine key={e.index} x={e.V} stroke={th.accent} strokeDasharray="6 4" />)}
                    <Tooltip formatter={(v: number) => [fmtSig(v, 3), 'dpH/dV']} labelFormatter={(v: number) => `V = ${fmtFixed(v, 2)} mL`}
                      contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} />
                    <Line dataKey="d1" type="monotone" dot={false} stroke={th.main} strokeWidth={th.strokeWidth} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            <section className="card">
              <label className="label" htmlFor="vslider">Volumen agregado: <strong className="font-mono">{fmtFixed(V, 2)} mL</strong> → pH = <strong className="font-mono">{fmtFixed(pHV, 2)}</strong></label>
              <input id="vslider" type="range" min={0} max={ok.Vmax} step={ok.Vmax / 2000} value={V} onChange={(e) => setSliderV(Number(e.target.value))} className="w-full accent-brand-700" />
              <div className="mt-2 flex flex-wrap gap-2">
                {ok.eqInfo.eq.map((e) => <button key={e.index} className="btn" onClick={() => setSliderV(e.V)}>Ir a PE{e.index}</button>)}
                {ok.eqInfo.half.map((h) => <button key={h.index} className="btn" onClick={() => setSliderV(h.V)}>Ir a ½PE{h.index}</button>)}
              </div>
            </section>

            <section className="card overflow-x-auto">
              <h3 className="card-title">Puntos de equivalencia y semiequivalencia</h3>
              <table className="table-basic">
                <thead>
                  <tr><th>Punto</th><th>Reacción</th><th>V (mL)</th><th>pH</th><th>Salto de pH (98→102 %)</th><th>Detección</th></tr>
                </thead>
                <tbody>
                  {ok.eqInfo.eq.map((e) => (
                    <tr key={e.index}>
                      <td>PE{e.index}</td><td>{e.label}</td><td className="font-mono">{fmtFixed(e.V, 2)}</td><td className="font-mono">{fmtFixed(e.pH, 2)}</td>
                      <td className="font-mono">{fmtFixed(e.jump, 2)}</td>
                      <td><span className={`chip ${SHARP_CLS[e.sharpness]}`}>{SHARP_LABEL[e.sharpness]}</span></td>
                    </tr>
                  ))}
                  {ok.eqInfo.half.map((h) => (
                    <tr key={`h${h.index}`}>
                      <td>½PE{h.index}</td><td>{Number.isFinite(h.pKa) ? `pKa = ${fmtFixed(h.pKa, 2)}` : 'fuerte'}</td>
                      <td className="font-mono">{fmtFixed(h.V, 2)}</td><td className="font-mono">{fmtFixed(h.pH, 2)}</td><td colSpan={2} className="text-xs text-slate-600 dark:text-slate-400">
                        {Number.isFinite(h.pKa) ? `pH − pKa = ${fmtFixed(h.pH - h.pKa, 3)} (cálculo exacto, sin aproximar)` : 'En ácidos/bases fuertes no hay zona reguladora.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Criterio de detección: salto de pH entre el 98 % y el 102 % del tramo. ≥ 1,5 nítido; 0,5–1,5 poco nítido; &lt; 0,5 no detectable con indicador visual.
              </p>
            </section>

            {selInd && (
              <section className="card space-y-2">
                <h3 className="card-title">Error de titulación con {ind.name.toLowerCase()}</h3>
                {selInd.Vend == null || selInd.errorPct == null ? (
                  <Alert kind="warn">La curva no pasa por pH {pHendIn.raw} en este rango de volumen: el indicador no cambia de color (o no hay un punto de equivalencia detectable).</Alert>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Stat label="pH de viraje" value={fmtFixed(selInd.pHend, 2)} />
                    <Stat label="V punto final" value={`${fmtFixed(selInd.Vend, 3)} mL`} />
                    <Stat label={`V equivalencia (PE${selInd.eq!.index})`} value={`${fmtFixed(selInd.eq!.V, 3)} mL`} />
                    <Stat label="Error de titulación" value={`${selInd.errorPct >= 0 ? '+' : ''}${fmtSig(selInd.errorPct, 2)} %`} sub={<span className={`chip ${VERDICT_CLS[selInd.verdict]}`}>{VERDICT_LABEL[selInd.verdict]}</span>} />
                  </div>
                )}
              </section>
            )}

            <section className="card overflow-x-auto">
              <h3 className="card-title">¿Qué indicador sirve?</h3>
              <table className="table-basic">
                <thead><tr><th>Indicador</th><th>Viraje</th><th>Error</th><th>Cambio de color en</th><th>Veredicto</th></tr></thead>
                <tbody>
                  {ok.indResults.map((r) => (
                    <tr key={r.indicator.id} className={r.indicator.id === indId ? 'bg-brand-50 dark:bg-brand-950/40' : ''}>
                      <td>
                        <button className="text-left underline-offset-2 hover:underline" onClick={() => onIndicator(r.indicator.id)}>
                          <span className="mr-1 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: r.indicator.acidHex }} />
                          <span className="mr-1 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: r.indicator.baseHex }} />
                          {r.indicator.name}
                        </button>
                      </td>
                      <td className="font-mono">{fmtFixed(r.indicator.low, 1)}–{fmtFixed(r.indicator.high, 1)}</td>
                      <td className="font-mono">{r.errorPct == null ? '—' : `${r.errorPct >= 0 ? '+' : ''}${fmtSig(r.errorPct, 2)} % (PE${r.eq!.index})`}</td>
                      <td className="font-mono">{r.transitionWidth == null ? '—' : `${fmtSig(r.transitionWidth, 2)} mL`}</td>
                      <td><span className={`chip ${VERDICT_CLS[r.verdict]}`}>{VERDICT_LABEL[r.verdict]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Se toma como pH de viraje el punto medio del intervalo. Error = (V<sub>final</sub> − V<sub>eq</sub>)/V<sub>eq</sub> × 100, respecto del punto de equivalencia detectable más cercano.
                |error| ≤ 0,1 % excelente; ≤ 0,5 % aceptable. "Cambio de color en" = mL entre el inicio y el fin del viraje (menos es más neto).
              </p>
            </section>

            <Procedure steps={steps} />
          </>
        )}
      </div>
    </div>
  );
}

/** Pasos del procedimiento para el volumen seleccionado. */
function buildSteps(
  s: TitrationSetup,
  V: number,
  pH: number,
  eqInfo: ReturnType<typeof equivalencePoints>,
  names: string[][],
  titrant: Compound,
): Step[] {
  const mixture = mixtureAt(s, V);
  const logH = -pH;
  const h = 10 ** logH;
  const residual = netCharge(mixture, logH);
  const steps: Step[] = [];
  steps.push({
    title: 'Planteo: balance de carga + balances de masa (sin aproximaciones)',
    text: 'Para cada volumen V se resuelve una única ecuación en [H⁺]. Para un ácido débil agregado con hᵢ protones, su aporte es Cᵢ·(n̄H − hᵢ), donde n̄H es el número medio de protones unidos (sale de las fracciones α). Los ácidos y bases fuertes aportan su contraión (Cl⁻, Na⁺).',
    tex: '[\\mathrm{H^+}] - \\frac{K_w}{[\\mathrm{H^+}]} + \\sum_i C_i\\,(\\bar n_{H,i} - h_i) + \\sum C_{\\text{catión fuerte}} - \\sum C_{\\text{anión fuerte}} = 0',
  });
  steps.push({
    title: 'Fracciones de cada especie (α)',
    tex: [
      '\\alpha_j = \\frac{[\\mathrm{H^+}]^{\\,n-j}\\,K_1K_2\\cdots K_j}{\\sum_{k=0}^{n}[\\mathrm{H^+}]^{\\,n-k}\\,K_1\\cdots K_k}, \\qquad \\bar n_H = \\sum_j (n-j)\\,\\alpha_j',
    ],
  });
  const dil = mixture.map((c, i) => {
    const what = i < s.analyte.length ? `C_{\\text{analito${s.analyte.length > 1 ? ' ' + (i + 1) : ''}}}` : `C_{\\text{${titrant.formula}}}`;
    const orig = i < s.analyte.length ? s.analyte[i].C : s.titrant.C;
    const vol = i < s.analyte.length ? s.Va : V;
    return `${what} = ${texNum(orig, 4)}\\times\\frac{${texNum(vol, 4)}}{${texNum(s.Va, 4)} + ${texNum(V, 4)}} = ${texNum(c.C, 4)}\\ \\mathrm{M}`;
  });
  steps.push({ title: `Dilución al agregar V = ${fmtFixed(V, 2)} mL`, tex: dil });
  steps.push({
    title: 'Resolución numérica (método de Brent sobre log[H⁺])',
    text: `Se busca la raíz entre pH −3 y 20; la función es estrictamente monótona, así que la solución es única. Residuo del balance de carga en la solución: ${fmtSig(residual, 2)} mol/L (prácticamente cero).`,
    tex: [`[\\mathrm{H^+}] = ${texNum(h, 5)}\\ \\mathrm{M} \\Rightarrow \\mathrm{pH} = ${fmtFixed(pH, 3).replace(',', '{,}')}`, `[\\mathrm{OH^-}] = ${texNum(KW / h, 4)}\\ \\mathrm{M}`],
  });
  const spec: string[] = [];
  mixture.forEach((c, i) => {
    if (c.kind !== 'weak') return;
    const a = alphas(logH, c.system.pKa);
    const nm = names[i] ?? genericSpecies(c.system);
    a.forEach((al, j) => spec.push(`[\\text{${nm[j]}}] = ${texNum(al * c.C, 3)}\\ \\mathrm{M}\\quad (\\alpha = ${texNum(al, 3)})`));
  });
  if (spec.length) steps.push({ title: 'Concentración de cada especie en ese punto', tex: spec });
  const tEq = s.titrant.kind === 'weak' ? 1 : s.titrant.n;
  steps.push({
    title: 'Puntos de equivalencia (estequiometría)',
    text: 'El titulante reacciona primero con el protón más ácido (o la base más fuerte). Cada punto de equivalencia es la suma acumulada de milimoles de sitios dividida por la concentración del titulante.',
    tex: [
      `V_{PE} = \\frac{\\sum \\text{mmol de sitios}}{${tEq > 1 ? tEq + '\\cdot ' : ''}C_t}`,
      ...eqInfo.eq.map((e) => `V_{PE${e.index}} = ${texNum(e.V, 5)}\\ \\mathrm{mL};\\ \\mathrm{pH} = ${fmtFixed(e.pH, 2).replace(',', '{,}')}`),
    ],
  });
  steps.push({
    title: 'Volumen para un pH dado (punto final del indicador): fórmula exacta inversa',
    text: 'Despejando V del balance de carga multiplicado por (Vₐ + V). Qₐ y Qₜ son los aportes de carga del analito y del titulante sin diluir.',
    tex: 'V = -V_a\\,\\frac{[\\mathrm{H^+}] - K_w/[\\mathrm{H^+}] + Q_a}{[\\mathrm{H^+}] - K_w/[\\mathrm{H^+}] + Q_t}',
  });
  return steps;
}
