/**
 * Pestaña: Gravimetría (masa molar, biblioteca, factor gravimétrico, cálculo con réplicas, peso constante).
 */
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { tryParse, prettyFormula } from '../../chem/gravimetria/formula';
import { gravimetricFactor, gravimetricResult, type FactorResult } from '../../chem/gravimetria/factor';
import { CLASSIC_FACTORS } from '../../chem/gravimetria/biblioteca';
import { EJEMPLO_PESADAS_CRISOL, EJEMPLO_SULFATO } from '../../chem/gravimetria/ejemplo';
import { wetToDry } from '../../chem/gravimetria/humedad';
import { fmtFixed, fmtSig, parseNumber, texNum } from '../../chem/numeric/format';
import { Alert, NumField, SelectField, Segmented, Stat, Toggle } from '../components/fields';
import { ChartCard } from '../components/ChartCard';
import { Procedure } from '../components/Procedure';
import { SheetGrid, emptyRow, parseRow, type SheetColumn, type SheetRow } from '../components/SheetGrid';
import { exportCsv } from '../components/exporters';
import { useChartTheme } from '../display';
import { ConstantWeightCard, ReplicateSummary, texFormula, useLibrary } from '../gravimetria/shared';

/** a y b: enteros sin decimales; si no, 4 cifras. */
const fmtCoef = (v: number) => (Number.isInteger(v) ? String(v) : fmtSig(v, 4));

const PALETTE = ['#0f6fc6', '#009dd9', '#0bd0d9', '#10cf9b', '#7cca62', '#a3a3a3', '#f59e0b', '#ef4444'];

function readParams() {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  return { t: q.get('t'), q: q.get('q'), h: q.get('h'), ej: q.get('ej') };
}

type Mode = 'crisol' | 'directo';

export default function GravimetryTab() {
  const th = useChartTheme();
  const params = useMemo(readParams, []);
  const lib = useLibrary();
  const example = params.ej === 'sulfato';

  // ---- masa molar ----
  const [mmText, setMmText] = useState(params.t ?? 'BaSO4');
  const mm = tryParse(mmText);

  // ---- factor ----
  const [have, setHave] = useState(params.t ?? (example ? 'BaSO4' : 'BaSO4'));
  const [want, setWant] = useState(params.q ?? (example ? 'SO3' : 'S'));
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

  // ---- calculadora con réplicas ----
  const [mode, setMode] = useState<Mode>('crisol');
  const colsCrisol: SheetColumn[] = [
    { key: 'crisol', label: 'Crisol vacío (g)' },
    { key: 'lleno', label: 'Crisol + precipitado (g)' },
    { key: 'muestra', label: 'Masa de muestra (g)' },
    { key: 'alic', label: 'Factor de alícuota (opcional)' },
  ];
  const colsDirect: SheetColumn[] = [
    { key: 'ppt', label: 'Masa de precipitado (g)' },
    { key: 'muestra', label: 'Masa de muestra (g)' },
    { key: 'alic', label: 'Factor de alícuota (opcional)' },
  ];
  const cols = mode === 'crisol' ? colsCrisol : colsDirect;
  const [rowsCrisol, setRowsCrisol] = useState<SheetRow[]>(() => (example ? EJEMPLO_SULFATO.map((r) => ({ ...r })) : [emptyRow(colsCrisol), emptyRow(colsCrisol), emptyRow(colsCrisol)]));
  const [rowsDirect, setRowsDirect] = useState<SheetRow[]>(() => [emptyRow(colsDirect), emptyRow(colsDirect), emptyRow(colsDirect)]);
  const rows = mode === 'crisol' ? rowsCrisol : rowsDirect;
  const setRows = mode === 'crisol' ? setRowsCrisol : setRowsDirect;
  const [hRaw, setHRaw] = useState(params.h ?? '');
  const H = hRaw.trim() === '' ? null : parseNumber(hRaw);
  const hErr = hRaw.trim() !== '' && (H == null || H < 0 || H >= 100) ? 'La humedad tiene que estar entre 0 y 100 %.' : null;

  const results = rows.map((row) => {
    const v = parseRow(row);
    const ppt = mode === 'crisol' ? (v.lleno != null && v.crisol != null ? v.lleno - v.crisol : null) : v.ppt;
    const alic = row.alic.trim() === '' ? 1 : v.alic;
    if (ppt == null || v.muestra == null || alic == null || F == null || v.muestra <= 0 || ppt < 0 || alic <= 0) return { ppt, res: null as null | { mSought: number; pct: number; pctBS: number | null } };
    const r = gravimetricResult({ precipitate: ppt, sample: v.muestra, F, aliquotFactor: alic });
    return { ppt, res: { ...r, pctBS: H != null && !hErr ? wetToDry(r.pct, H) : null } };
  });
  const pcts = results.flatMap((r) => (r.res ? [r.res.pct] : []));
  const pctsBS = results.flatMap((r) => (r.res?.pctBS != null ? [r.res.pctBS] : []));
  const wantP = prettyFormula(want);
  const haveP = prettyFormula(have);

  const loadExample = () => {
    loadPair('BaSO4', 'SO3');
    setMode('crisol');
    setRowsCrisol(EJEMPLO_SULFATO.map((r) => ({ ...r })));
    setHRaw('9,014');
  };

  const csv = () =>
    exportCsv(
      [
        ['Forma pesada', have, 'Sustancia buscada', want, 'F', F ?? ''],
        ['Humedad de la muestra (% b.h.)', H ?? ''],
        [],
        [...cols.map((c) => String(c.label)), 'Precipitado (g)', `m ${want} (g)`, `% ${want} (m/m)`, `% ${want} b.s.`],
        ...rows.map((row, i) => [...cols.map((c) => row[c.key]), results[i].ppt ?? '', results[i].res?.mSought ?? '', results[i].res?.pct ?? '', results[i].res?.pctBS ?? '']),
      ],
      'gravimetria.csv',
    );

  // ---- biblioteca ----
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newName, setNewName] = useState('');
  const [newFormula, setNewFormula] = useState('');
  const newParsed = newFormula.trim() ? tryParse(newFormula) : null;
  const filtered = lib.entries.filter((e) => {
    const s = search.trim().toLowerCase();
    return !s || e.name.toLowerCase().includes(s) || e.formula.toLowerCase().includes(s) || prettyFormula(e.formula).toLowerCase().includes(s);
  });
  const groups = ['Formas pesadas', 'Sustancias buscadas', 'Agregadas por mí'] as const;

  return (
    <div className="space-y-4">
      <section className="card flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          Masa molar, factor gravimétrico y cálculo del % m/m con réplicas. Las fórmulas aceptan paréntesis, hidratos (· o .) y cargas (se ignoran).
        </p>
        <button className="btn" onClick={loadExample}>Cargar ejemplo: sulfato como BaSO₄ → % SO₃</button>
      </section>
      {example && <Alert kind="info">Ejemplo cargado desde "Humedad y base seca": sulfato pesado como BaSO₄, informado como % SO₃ en base húmeda y en base seca.</Alert>}

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

      {/* ---------- calculadora ---------- */}
      <section className="card min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="card-title mb-0">3. Cálculo con réplicas: {haveP} → % {wantP}</h2>
          <Segmented value={mode} onChange={setMode} options={[{ value: 'crisol', label: 'Crisol vacío y lleno' }, { value: 'directo', label: 'Masa del precipitado' }]} ariaLabel="Cómo cargar el precipitado" />
        </div>
        {F == null && <Alert kind="warn">Primero definí un factor gravimétrico válido (sección 2).</Alert>}
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Factor de alícuota = V del matraz / V de la alícuota precipitada (ej. 250/25 = 10). Dejalo vacío si se precipitó toda la muestra. Enter pasa a la celda siguiente; podés pegar desde Excel.
        </p>
        <SheetGrid
          columns={cols}
          rows={rows}
          onChange={setRows}
          computed={[
            ...(mode === 'crisol' ? [{ label: 'Precipitado (g)', render: (i: number) => (results[i].ppt != null ? fmtFixed(results[i].ppt!, 4) : '') }] : []),
            { label: `m ${wantP} (g)`, render: (i: number) => (results[i].res ? fmtFixed(results[i].res!.mSought, 4) : '') },
            { label: `% ${wantP}`, render: (i: number) => (results[i].res ? fmtFixed(results[i].res!.pct, 2) : '') },
            ...(H != null && !hErr ? [{ label: `% ${wantP} b.s.`, render: (i: number) => (results[i].res?.pctBS != null ? fmtFixed(results[i].res!.pctBS!, 2) : '') }] : []),
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-[16rem_1fr] sm:items-end">
          <NumField label="Humedad de la muestra (opcional)" value={hRaw} onChange={setHRaw} unit="% b.h." error={hErr} hint="Para informar también en base seca." />
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={csv}>⬇ CSV</button>
            <a className="btn" href="#humedad">💧 Calcular la humedad</a>
          </div>
        </div>
        <ReplicateSummary values={pcts} label={`% ${wantP} (m/m, base húmeda / tal cual)`} />
        {pctsBS.length > 0 && <ReplicateSummary values={pctsBS} label={`% ${wantP} en base seca`} />}
        {F != null && results.some((r) => r.res) && (() => {
          const i = results.findIndex((r) => r.res);
          const r = results[i];
          const v = parseRow(rows[i]);
          const alic = rows[i].alic.trim() === '' ? 1 : v.alic!;
          return (
            <Procedure
              steps={[
                ...(mode === 'crisol' ? [{ title: `Réplica ${i + 1}: masa de precipitado`, tex: `m_{pp} = ${texNum(v.lleno!, 6)} - ${texNum(v.crisol!, 6)} = ${texNum(r.ppt!, 4)}\\ \\mathrm{g}` }] : []),
                { title: `Masa de ${wantP}`, tex: `m = m_{pp}\\cdot F\\cdot f_{al} = ${texNum(r.ppt!, 4)}\\times ${texNum(F, 5)}${alic !== 1 ? `\\times ${texNum(alic, 4)}` : ''} = ${texNum(r.res!.mSought, 4)}\\ \\mathrm{g}` },
                { title: 'Porcentaje', tex: `\\%\\,${texFormula(want)} = \\frac{${texNum(r.res!.mSought, 4)}}{${texNum(v.muestra!, 4)}}\\times 100 = ${texNum(r.res!.pct, 4)}\\ \\%` },
                ...(r.res!.pctBS != null ? [{ title: 'Base seca', tex: `X_{bs} = \\frac{X_{bh}}{1 - H/100} = \\frac{${texNum(r.res!.pct, 4)}}{1 - ${texNum(H!, 4)}/100} = ${texNum(r.res!.pctBS!, 4)}\\ \\%` }] : []),
                { title: 'Réplicas', text: 'Promedio, desviación estándar s, CV = s/x̄·100 e intervalo x̄ ± t·s/√n con t de Student al 95 % y n − 1 grados de libertad.' },
              ]}
            />
          );
        })()}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <ConstantWeightCard title="4. Peso constante del crisol" initial={example ? EJEMPLO_PESADAS_CRISOL : ''} />

        {/* ---------- biblioteca ---------- */}
        <section className="card min-w-0 space-y-3">
          <h2 className="card-title">5. Biblioteca de sustancias</h2>
          <input className="input" placeholder="Buscar por nombre o fórmula (ej. hierro, SO4)…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar en la biblioteca" />
          <div className="max-h-[28rem] space-y-3 overflow-auto pr-1">
            {groups.map((g) => {
              const items = filtered.filter((e) => e.group === g);
              if (!items.length) return null;
              return (
                <div key={g}>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{g}</div>
                  <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                    {items.map((e) => {
                      const p = tryParse(e.formula);
                      return (
                        <li key={e.id} className="flex flex-wrap items-center gap-2 px-2 py-1.5 text-sm">
                          <div className="min-w-[10rem] flex-1">
                            {editing === e.id ? (
                              <input className="input font-mono" value={editText} onChange={(ev) => setEditText(ev.target.value)} autoFocus aria-label="Fórmula" />
                            ) : (
                              <span className="font-mono font-semibold">{prettyFormula(e.formula)}</span>
                            )}{' '}
                            <span className="text-slate-600 dark:text-slate-400">{e.name}{e.edited ? ' (fórmula editada)' : ''}</span>
                            <span className="ml-1 font-mono text-xs text-slate-500">{p.ok ? `${fmtFixed(p.f.M, 2)} g/mol` : '⚠ fórmula inválida'}</span>
                          </div>
                          {editing === e.id ? (
                            <>
                              <button className="btn" disabled={!tryParse(editText).ok} onClick={() => { lib.setFormula(e.id, editText); setEditing(null); }}>Guardar</button>
                              <button className="btn" onClick={() => setEditing(null)}>Cancelar</button>
                            </>
                          ) : (
                            <>
                              <button className="btn px-2 py-1 text-xs" onClick={() => { setHave(e.formula); setElem(''); }} title="Usar como forma pesada">Tengo</button>
                              <button className="btn px-2 py-1 text-xs" onClick={() => { setWant(e.formula); setElem(''); }} title="Usar como sustancia buscada">Quiero</button>
                              <button className="btn px-2 py-1 text-xs" onClick={() => setMmText(e.formula)} title="Ver masa molar">M</button>
                              <button className="btn px-2 py-1 text-xs" onClick={() => { setEditing(e.id); setEditText(e.formula); }} aria-label={`Editar ${e.name}`}>✎</button>
                              {e.edited && <button className="btn px-2 py-1 text-xs" onClick={() => lib.restore(e.id)} title="Volver a la fórmula original">↺</button>}
                              {e.custom && <button className="btn px-2 py-1 text-xs" onClick={() => lib.remove(e.id)} aria-label={`Borrar ${e.name}`}>🗑</button>}
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-sm text-slate-600">No hay coincidencias.</p>}
          </div>
          <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
            <div className="text-sm font-semibold">Agregar una sustancia</div>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <label className="label" htmlFor="nl-name">Nombre</label>
                <input id="nl-name" className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ej. Sulfato de sodio" />
              </div>
              <div>
                <label className="label" htmlFor="nl-f">Fórmula</label>
                <input id="nl-f" className={`input font-mono ${newParsed && !newParsed.ok ? 'input-error' : ''}`} value={newFormula} onChange={(e) => setNewFormula(e.target.value)} placeholder="ej. Na2SO4" spellCheck={false} />
              </div>
              <button
                className="btn btn-primary"
                disabled={!newParsed?.ok}
                onClick={() => {
                  lib.add(newName.trim() || newFormula.trim(), newFormula.trim());
                  setNewName('');
                  setNewFormula('');
                }}
              >
                Agregar
              </button>
            </div>
            {newParsed && !newParsed.ok && <p className="text-sm text-red-700 dark:text-red-400">{newParsed.error}</p>}
            <p className="text-xs text-slate-500 dark:text-slate-400">Lo que agregues o edites queda guardado en este navegador.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
