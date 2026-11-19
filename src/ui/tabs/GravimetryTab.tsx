/**
 * Pestaña: Gravimetría (masa molar y factor gravimétrico).
 */
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { tryParse, prettyFormula } from '../../chem/gravimetria/formula';
import { gravimetricFactor, type FactorResult } from '../../chem/gravimetria/factor';
import { CLASSIC_FACTORS } from '../../chem/gravimetria/biblioteca';
import { fmtFixed, fmtSig, parseNumber, texNum } from '../../chem/numeric/format';
import { Alert, NumField, SelectField, Stat, Toggle } from '../components/fields';
import { ChartCard } from '../components/ChartCard';
import { Procedure } from '../components/Procedure';
import { useChartTheme } from '../display';
import { texFormula, useLibrary } from '../gravimetria/shared';

/** a y b: enteros sin decimales; si no, 4 cifras. */
const fmtCoef = (v: number) => (Number.isInteger(v) ? String(v) : fmtSig(v, 4));

const PALETTE = ['#0f6fc6', '#009dd9', '#0bd0d9', '#10cf9b', '#7cca62', '#a3a3a3', '#f59e0b', '#ef4444'];

function readParams() {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  return { t: q.get('t'), q: q.get('q') };
}

export default function GravimetryTab() {
  const th = useChartTheme();
  const params = useMemo(readParams, []);
  // la biblioteca sólo alimenta las sugerencias de fórmulas de "Lo que tengo / Lo que quiero"
  const lib = useLibrary();

  // ---- masa molar ----
  const [mmText, setMmText] = useState(params.t ?? 'BaSO4');
  const mm = tryParse(mmText);

  // ---- factor ----
  const [have, setHave] = useState(params.t ?? 'BaSO4');
  const [want, setWant] = useState(params.q ?? 'S');
  const [elem, setElem] = useState('');
  const [manual, setManual] = useState(false);
  const [aRaw, setARaw] = useState('1');
  const [bRaw, setBRaw] = useState('1');
  const auto = useMemo(() => {
    try {
      return { ok: true as const, r: gravimetricFactor(have, want, { element: elem || undefined }) };
    } catch (e) {
      const ph = tryParse(have);
      const pw = tryParse(want);
      return { ok: false as const, error: !ph.ok ? `Lo que tengo: ${ph.error}` : !pw.ok ? `Lo que quiero: ${pw.error}` : (e as Error).message };
    }
  }, [have, want, elem]);
  const aMan = parseNumber(aRaw);
  const bMan = parseNumber(bRaw);
  let factor: FactorResult | null = auto.ok ? auto.r : null;
  let manualErr: string | null = null;
  if (factor && manual) {
    if (aMan == null || bMan == null || aMan <= 0 || bMan <= 0) manualErr = 'a y b tienen que ser números mayores que cero.';
    else factor = gravimetricFactor(have, want, { element: elem || undefined, a: aMan, b: bMan });
  }
  const noCommon = factor && !factor.element && !manual;
  const F = factor && !noCommon && !manualErr ? factor.F : null;
  const startManual = (on: boolean) => {
    if (on && auto.ok) {
      setARaw(String(auto.r.a));
      setBRaw(String(auto.r.b));
    }
    setManual(on);
  };
  const loadPair = (w: string, s: string) => {
    setHave(w);
    setWant(s);
    setElem('');
    setManual(false);
  };
  const wantP = prettyFormula(want);
  const haveP = prettyFormula(have);

  return (
    <div className="space-y-4">
      <section className="card">
        <p className="text-sm">
          Masa molar y factor gravimétrico. Las fórmulas aceptan paréntesis, hidratos (· o .) y cargas (se ignoran).
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* ---------- masa molar ---------- */}
        <section className="card min-w-0 space-y-3">
          <h2 className="card-title">1. Masa molar</h2>
          <div>
            <label className="label" htmlFor="mm-in">Fórmula</label>
            <input id="mm-in" className={`input font-mono ${mm.ok ? '' : 'input-error'}`} value={mmText} onChange={(e) => setMmText(e.target.value)} placeholder="ej. MgNH4PO4·6H2O" autoComplete="off" spellCheck={false} />
            {!mm.ok && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{mm.error}</p>}
          </div>
          {mm.ok && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Stat label={`M(${prettyFormula(mmText)})`} value={`${fmtFixed(mm.f.M, 2)} g/mol`} sub={`${fmtFixed(mm.f.M, 4)} g/mol`} />
                <Stat label="Elementos" value={mm.f.parts.length} />
              </div>
              <div className="overflow-x-auto">
                <table className="table-basic">
                  <thead><tr><th>Elemento</th><th>Átomos</th><th>Ar</th><th>Masa (g/mol)</th><th>%</th></tr></thead>
                  <tbody>
                    {mm.f.parts.map((p) => (
                      <tr key={p.el}><td>{p.el}</td><td className="font-mono">{fmtCoef(p.n)}</td><td className="font-mono">{String(p.Ar).replace('.', ',')}</td><td className="font-mono">{fmtFixed(p.mass, 3)}</td><td className="font-mono">{fmtFixed(p.pct, 2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ChartCard title={`Composición de ${prettyFormula(mmText)} (% m/m)`} filename="composicion.png">
                <ResponsiveContainer width="100%" height={Math.max(120, 34 * mm.f.parts.length + 40)}>
                  <BarChart data={mm.f.parts.map((p) => ({ el: p.el, pct: p.pct }))} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
                    <CartesianGrid stroke={th.grid} horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: th.fontSize - 1, fill: th.axis }} stroke={th.axis} />
                    <YAxis type="category" dataKey="el" width={36} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} />
                    <Tooltip formatter={(v: number) => [`${fmtFixed(v, 2)} %`, 'masa']} contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} cursor={{ fill: th.grid, fillOpacity: 0.4 }} />
                    <Bar dataKey="pct" isAnimationActive={false}>
                      {mm.f.parts.map((p, i) => <Cell key={p.el} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <Procedure steps={[{ text: 'Se suman los pesos atómicos (valores estándar abreviados IUPAC) multiplicados por la cantidad de átomos.', tex: `M = ${mm.f.parts.map((p) => `${fmtCoef(p.n).replace(",", "{,}")}\\times ${String(p.Ar).replace('.', '{,}')}`).join(' + ')} = ${texNum(mm.f.M, 6)}\\ \\mathrm{g/mol}` }]} />
            </>
          )}
        </section>

        {/* ---------- factor ---------- */}
        <section className="card min-w-0 space-y-3">
          <h2 className="card-title">2. Factor gravimétrico</h2>
          <datalist id="grav-lib">
            {lib.entries.map((e) => <option key={e.id} value={e.formula}>{e.name}</option>)}
          </datalist>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="f-have">Lo que tengo (forma pesada)</label>
              <input id="f-have" list="grav-lib" className="input font-mono" value={have} onChange={(e) => { setHave(e.target.value); setElem(''); }} autoComplete="off" spellCheck={false} />
            </div>
            <div>
              <label className="label" htmlFor="f-want">Lo que quiero (sustancia buscada)</label>
              <input id="f-want" list="grav-lib" className="input font-mono" value={want} onChange={(e) => { setWant(e.target.value); setElem(''); }} autoComplete="off" spellCheck={false} />
            </div>
          </div>
          {!auto.ok && <Alert kind="error">{auto.error}</Alert>}
          {auto.ok && auto.r.common.length > 1 && (
            <SelectField label="Elemento común (hay más de uno: elegí cuál se conserva)" value={auto.r.element ?? ''} onChange={setElem} options={auto.r.common.map((e) => ({ value: e, label: e }))} />
          )}
          {auto.ok && (
            <Toggle label="Corregir a y b a mano" checked={manual} onChange={startManual} />
          )}
          {manual && (
            <div className="grid grid-cols-2 gap-3">
              <NumField label="a (moles de lo buscado)" value={aRaw} onChange={setARaw} />
              <NumField label="b (moles de lo pesado)" value={bRaw} onChange={setBRaw} />
            </div>
          )}
          {manualErr && <Alert kind="error">{manualErr}</Alert>}
          {noCommon && <Alert kind="warn">{haveP} y {wantP} no tienen ningún elemento en común. Corregí a y b a mano si sabés la relación estequiométrica.</Alert>}
          {factor && F != null && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat label={`F (${haveP} → ${wantP})`} value={fmtSig(F, 5)} />
                <Stat label="a / b" value={`${fmtCoef(factor.a)} / ${fmtCoef(factor.b)}`} sub={factor.element && !manual ? `elemento común: ${factor.element}` : 'a mano'} />
                <Stat label="M pesada / M buscada" value={`${fmtFixed(factor.weighed.M, 2)} / ${fmtFixed(factor.sought.M, 2)}`} sub="g/mol" />
              </div>
              <div className="overflow-x-auto rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
                <Procedure
                  defaultOpen
                  steps={[
                    {
                      text: factor.element && !manual
                        ? `Se iguala el ${factor.element}: ${fmtCoef(factor.b)} mol de ${haveP} tienen los mismos átomos de ${factor.element} que ${fmtCoef(factor.a)} mol de ${wantP}.`
                        : 'a y b ingresados a mano.',
                      tex: [
                        `F = \\frac{a\\,M(${texFormula(want)})}{b\\,M(${texFormula(have)})}`,
                        `F = \\frac{${fmtCoef(factor.a).replace(',', '{,}')}\\times ${texNum(factor.sought.M, 6)}}{${fmtCoef(factor.b).replace(',', '{,}')}\\times ${texNum(factor.weighed.M, 6)}} = ${texNum(F, 5)}`,
                      ],
                    },
                  ]}
                />
              </div>
            </>
          )}
          <details className="rounded-lg border border-slate-200 dark:border-slate-800">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">Tabla de factores clásicos (tocá una fila para usarla)</summary>
            <div className="max-h-80 overflow-auto">
              <table className="table-basic">
                <thead><tr><th>Pesada</th><th>Buscada</th><th>a/b</th><th>F</th></tr></thead>
                <tbody>
                  {CLASSIC_FACTORS.map(([w, s]) => {
                    const r = gravimetricFactor(w, s);
                    return (
                      <tr key={w + s} className="cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-950/40" onClick={() => loadPair(w, s)}>
                        <td className="font-mono">{prettyFormula(w)}</td><td className="font-mono">{prettyFormula(s)}</td><td className="font-mono">{r.a}/{r.b}</td><td className="font-mono">{fmtSig(r.F, 5)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
