/**
 * Pestaña: Estadística analítica.
 */
import { useMemo, useState } from 'react';
import { parseList } from '../../chem/numeric/table';
import { summarize, tTestOneSample, tTestPaired, tTestTwoSample, fTest, type TestResult } from '../../chem/stats/descriptive';
import { DIXON_Q, dixonQ, grubbs, grubbsCritical } from '../../chem/stats/outliers';
import { tCritTwoSided, fInv } from '../../chem/stats/distributions';
import { propagate } from '../../chem/stats/propagation';
import { parseExpression, variablesOf } from '../../chem/stats/expression';
import { countSigFigs, formatWithUncertainty, roundSig } from '../../chem/stats/sigfigs';
import { fmtFixed, fmtSig, parseNumber, texNum } from '../../chem/numeric/format';
import { Alert, NumField, Segmented, SelectField, Stat, Toggle } from '../components/fields';
import { Procedure } from '../components/Procedure';

type Sub = 'desc' | 'out' | 't' | 'f' | 'prop' | 'cs' | 'tablas';
type Conf = '0.90' | '0.95' | '0.99';

function ListField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const p = parseList(value);
  return (
    <div>
      <label className="label">{label}</label>
      <textarea className={`input h-24 font-mono text-sm ${p.bad.length ? 'input-error' : ''}`} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
      {p.bad.length > 0 ? (
        <p className="mt-1 text-sm text-red-700 dark:text-red-400">No se pudo leer: {p.bad.join(', ')}</p>
      ) : (
        <p className="mt-1 text-xs text-slate-500">{p.values.length} dato(s). {hint ?? 'Separá con punto y coma, espacios o un dato por línea (podés pegar una columna de Excel).'}</p>
      )}
    </div>
  );
}

function ConfPicker({ conf, setConf }: { conf: Conf; setConf: (c: Conf) => void }) {
  return (
    <div>
      <span className="label">Nivel de confianza</span>
      <Segmented ariaLabel="Nivel de confianza" value={conf} onChange={setConf} options={[{ value: '0.90', label: '90 %' }, { value: '0.95', label: '95 %' }, { value: '0.99', label: '99 %' }]} />
    </div>
  );
}

function Verdict({ sig, yes, no }: { sig: boolean; yes: string; no: string }) {
  return <Alert kind={sig ? 'warn' : 'ok'}>{sig ? yes : no}</Alert>;
}

export default function StatsTab() {
  const [sub, setSub] = useState<Sub>('desc');
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Segmented
          ariaLabel="Herramienta"
          value={sub}
          onChange={setSub}
          options={[
            { value: 'desc', label: 'Media e IC' },
            { value: 'out', label: 'Atípicos (Q, Grubbs)' },
            { value: 't', label: 'Pruebas t' },
            { value: 'f', label: 'Prueba F' },
            { value: 'prop', label: 'Propagación de errores' },
            { value: 'cs', label: 'Cifras significativas' },
            { value: 'tablas', label: 'Tablas' },
          ]}
        />
      </div>
      {sub === 'desc' && <Descriptive />}
      {sub === 'out' && <Outliers />}
      {sub === 't' && <TTests />}
      {sub === 'f' && <FTestPanel />}
      {sub === 'prop' && <Propagation />}
      {sub === 'cs' && <SigFigs />}
      {sub === 'tablas' && <Tables />}
    </div>
  );
}

/* ---------------- Descriptiva ---------------- */
function Descriptive() {
  const [txt, setTxt] = useState('10,08; 10,11; 10,09; 10,10; 10,12');
  const [conf, setConf] = useState<Conf>('0.95');
  const p = parseList(txt);
  const ok = p.values.length >= 2 && p.bad.length === 0;
  const s = ok ? summarize(p.values, Number(conf)) : null;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <div className="card space-y-3">
        <ListField label="Datos (réplicas)" value={txt} onChange={setTxt} />
        <ConfPicker conf={conf} setConf={setConf} />
      </div>
      <div className="min-w-0 space-y-4">
        {!ok && <Alert kind="error">Ingresá al menos 2 datos numéricos.</Alert>}
        {s && (
          <>
            <div className="card grid grid-cols-2 gap-2 md:grid-cols-4">
              <Stat label="n" value={s.n} />
              <Stat label="Media x̄" value={fmtSig(s.mean, 6)} />
              <Stat label="Desviación estándar s" value={fmtSig(s.sd, 4)} />
              <Stat label="DER (RSD)" value={`${fmtSig(s.rsd, 3)} %`} />
              <Stat label="Mediana" value={fmtSig(s.median, 6)} />
              <Stat label="Rango" value={`${fmtSig(s.min, 5)} – ${fmtSig(s.max, 5)}`} />
              <Stat label={`t (${Math.round(s.confidence * 100)} %, gl = ${s.n - 1})`} value={fmtFixed(s.tCrit, 3)} />
              <Stat label={`IC ${Math.round(s.confidence * 100)} % de la media`} value={formatWithUncertainty(s.mean, s.halfWidth).text} sub={`[${fmtSig(s.ci[0], 6)} ; ${fmtSig(s.ci[1], 6)}]`} />
            </div>
            <Procedure
              steps={[
                { title: 'Media y desviación estándar muestral', tex: [`\\bar x = \\frac{\\sum x_i}{n} = ${texNum(s.mean, 6)}`, `s = \\sqrt{\\frac{\\sum (x_i-\\bar x)^2}{n-1}} = ${texNum(s.sd, 4)},\\qquad \\mathrm{DER} = \\frac{s}{\\bar x}\\cdot 100 = ${texNum(s.rsd, 3)}\\,\\%`] },
                { title: 'Intervalo de confianza de la media', tex: `\\mu = \\bar x \\pm \\frac{t\\,s}{\\sqrt n} = ${texNum(s.mean, 6)} \\pm \\frac{${texNum(s.tCrit, 4)}\\times ${texNum(s.sd, 4)}}{\\sqrt{${s.n}}} = ${texNum(s.mean, 6)} \\pm ${texNum(s.halfWidth, 3)}` },
              ]}
            />
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Atípicos ---------------- */
function Outliers() {
  const [txt, setTxt] = useState('0,1014; 0,1013; 0,1015; 0,1040');
  const [qconf, setQconf] = useState<'90' | '95' | '99'>('95');
  const [galpha, setGalpha] = useState<'0.05' | '0.01'>('0.05');
  const p = parseList(txt);
  const n = p.values.length;
  let q: ReturnType<typeof dixonQ> | null = null;
  let qErr: string | null = null;
  try {
    if (p.bad.length === 0) q = dixonQ(p.values, Number(qconf) as 90 | 95 | 99);
  } catch (e) {
    qErr = (e as Error).message;
  }
  let g: ReturnType<typeof grubbs> | null = null;
  try {
    if (p.bad.length === 0 && n >= 3) g = { ...grubbs(p.values, Number(galpha)) };
  } catch {
    g = null;
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <div className="card space-y-3">
        <ListField label="Datos" value={txt} onChange={setTxt} />
        <SelectField label="Confianza para Q" value={qconf} onChange={setQconf} options={[{ value: '90', label: '90 %' }, { value: '95', label: '95 %' }, { value: '99', label: '99 %' }]} />
        <SelectField label="Nivel α para Grubbs" value={galpha} onChange={setGalpha} options={[{ value: '0.05', label: 'α = 0,05 (95 %)' }, { value: '0.01', label: 'α = 0,01 (99 %)' }]} />
        <Alert kind="info">Descartar datos es una decisión delicada: aplicá una sola prueba, una sola vez, y sólo si hay razones experimentales para sospechar.</Alert>
      </div>
      <div className="min-w-0 space-y-4">
        <section className="card space-y-2">
          <h3 className="card-title">Prueba Q de Dixon</h3>
          {qErr && <Alert kind="warn">{qErr}</Alert>}
          {q && (
            <>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Stat label="Valor sospechoso" value={fmtSig(q.suspect, 6)} sub={`extremo ${q.side}`} />
                <Stat label="Q calculado" value={fmtFixed(q.Q, 3)} sub={`brecha ${fmtSig(q.gap, 3)} / rango ${fmtSig(q.range, 3)}`} />
                <Stat label={`Q crítico (n = ${n}, ${qconf} %)`} value={fmtFixed(q.Qcrit, 3)} />
              </div>
              <Verdict sig={q.reject} yes={`Q > Q crítico: se puede descartar ${fmtSig(q.suspect, 6)} con ${qconf} % de confianza.`} no={`Q ≤ Q crítico: no hay evidencia para descartar ${fmtSig(q.suspect, 6)}; se conserva.`} />
            </>
          )}
        </section>
        <section className="card space-y-2">
          <h3 className="card-title">Test de Grubbs (un valor atípico, bilateral)</h3>
          {n < 3 && <Alert kind="warn">Se necesitan al menos 3 datos.</Alert>}
          {g && (
            <>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Stat label="Valor sospechoso" value={fmtSig(g.suspect, 6)} />
                <Stat label="Media / s" value={`${fmtSig(g.mean, 5)} / ${fmtSig(g.sd, 3)}`} />
                <Stat label="G calculado" value={fmtFixed(g.G, 3)} />
                <Stat label={`G crítico (n = ${n}, α = ${galpha.replace('.', ',')})`} value={fmtFixed(g.Gcrit, 3)} />
              </div>
              <Verdict sig={g.reject} yes={`G > G crítico: ${fmtSig(g.suspect, 6)} es un valor atípico.`} no={`G ≤ G crítico: ${fmtSig(g.suspect, 6)} no es atípico; se conserva.`} />
            </>
          )}
        </section>
        <Procedure
          steps={[
            { title: 'Q de Dixon (r₁₀)', tex: ['Q = \\frac{|x_{\\text{sospechoso}} - x_{\\text{vecino}}|}{x_{\\max} - x_{\\min}}', ...(q ? [`Q = \\frac{${texNum(q.gap, 4)}}{${texNum(q.range, 4)}} = ${texNum(q.Q, 4)}\\quad\\text{vs}\\quad Q_{crit} = ${texNum(q.Qcrit, 3)}`] : [])], text: 'Valores críticos: Rorabacher, Anal. Chem. 1991, 63, 139 (válido para 3 ≤ n ≤ 10).' },
            { title: 'Grubbs', tex: ['G = \\frac{|x_{\\text{sospechoso}} - \\bar x|}{s},\\qquad G_{crit} = \\frac{n-1}{\\sqrt n}\\sqrt{\\frac{t^2_{\\alpha/(2n),\\,n-2}}{n-2+t^2_{\\alpha/(2n),\\,n-2}}}', ...(g ? [`G = ${texNum(g.G, 4)}\\quad\\text{vs}\\quad G_{crit} = ${texNum(g.Gcrit, 4)}`] : [])], text: 'G crítico calculado exactamente a partir de la distribución t (ISO 5725-2, NIST e-Handbook 1.3.5.17); coincide con las tablas ASTM E178.' },
          ]}
        />
      </div>
    </div>
  );
}

/* ---------------- Pruebas t ---------------- */
function TestOutput({ r, conf, h0 }: { r: TestResult; conf: number; h0: string }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="t calculado" value={fmtFixed(r.statistic, 3)} />
        <Stat label={`t crítico (${Math.round(conf * 100)} %, bilateral)`} value={fmtFixed(r.critical, 3)} sub={`gl = ${Number.isInteger(r.df) ? r.df : fmtFixed(r.df, 2)}`} />
        <Stat label="Valor p" value={r.pValue < 1e-4 ? fmtSig(r.pValue, 2) : fmtFixed(r.pValue, 4)} />
      </div>
      <Verdict sig={r.significant} yes={`|t| > t crítico (p < ${fmtFixed(1 - conf, 2)}): la diferencia es estadísticamente significativa. Se rechaza H₀ (${h0}).`} no={`|t| ≤ t crítico: la diferencia NO es significativa al ${Math.round(conf * 100)} %. No se rechaza H₀ (${h0}).`} />
    </>
  );
}

function TTests() {
  const [kind, setKind] = useState<'one' | 'two' | 'paired'>('one');
  const [a, setA] = useState('10,2; 10,5; 10,3; 10,6; 10,4');
  const [b, setB] = useState('10,8; 10,9; 10,6; 11,0; 10,7');
  const [mu, setMu] = useState('10,0');
  const [conf, setConf] = useState<Conf>('0.95');
  const [autoPool, setAutoPool] = useState(true);
  const [pooled, setPooled] = useState(true);
  const c = Number(conf);
  const pa = parseList(a);
  const pb = parseList(b);
  const muV = parseNumber(mu);
  let res: TestResult | null = null;
  let err: string | null = null;
  let fRes: ReturnType<typeof fTest> | null = null;
  if (pa.bad.length || pb.bad.length) err = 'Hay datos que no se pudieron leer.';
  else if (kind === 'one') {
    if (pa.values.length < 2) err = 'Se necesitan al menos 2 datos.';
    else if (muV == null) err = 'Escribí el valor de referencia.';
    else res = tTestOneSample(pa.values, muV, c);
  } else if (kind === 'two') {
    if (pa.values.length < 2 || pb.values.length < 2) err = 'Cada grupo necesita al menos 2 datos.';
    else {
      fRes = fTest(pa.values, pb.values, 0.95);
      const usePooled = autoPool ? !fRes.significant : pooled;
      res = tTestTwoSample(pa.values, pb.values, usePooled, c);
    }
  } else {
    if (pa.values.length !== pb.values.length) err = 'En la prueba apareada ambos grupos deben tener la misma cantidad de datos (uno por muestra).';
    else if (pa.values.length < 2) err = 'Se necesitan al menos 2 pares.';
    else res = tTestPaired(pa.values, pb.values, c);
  }
  const usedPooled = kind === 'two' && res ? 'sPooled' in res.details : false;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <div className="card space-y-3">
        <SelectField label="Tipo de prueba" value={kind} onChange={setKind} options={[{ value: 'one', label: 'Una muestra vs valor de referencia' }, { value: 'two', label: 'Dos muestras independientes' }, { value: 'paired', label: 'Datos apareados' }]} />
        <ListField label={kind === 'one' ? 'Datos' : kind === 'paired' ? 'Método A (una medida por muestra)' : 'Grupo 1'} value={a} onChange={setA} />
        {kind === 'one' ? (
          <NumField label="Valor de referencia μ₀ (ej. valor certificado)" value={mu} onChange={setMu} error={muV == null ? 'Número inválido.' : null} />
        ) : (
          <ListField label={kind === 'paired' ? 'Método B (mismas muestras, mismo orden)' : 'Grupo 2'} value={b} onChange={setB} />
        )}
        {kind === 'two' && (
          <div className="space-y-2">
            <Toggle label="Elegir automáticamente según la prueba F" checked={autoPool} onChange={setAutoPool} />
            {!autoPool && <Segmented ariaLabel="Varianzas" value={pooled ? 'p' : 'w'} onChange={(v) => setPooled(v === 'p')} options={[{ value: 'p', label: 'Varianzas iguales' }, { value: 'w', label: 'Welch' }]} />}
          </div>
        )}
        <ConfPicker conf={conf} setConf={setConf} />
      </div>
      <div className="min-w-0 space-y-4">
        {err && <Alert kind="error">{err}</Alert>}
        {fRes && (
          <Alert kind="info">
            Prueba F previa (95 %): F = {fmtFixed(fRes.statistic, 3)}, F crítico = {fmtFixed(fRes.critical, 3)} → {fRes.significant ? 'varianzas distintas: se usa t de Welch.' : 'varianzas comparables: se usa la desviación estándar combinada.'}
            {!autoPool && ' (elección manual activa)'}
          </Alert>
        )}
        {res && (
          <section className="card space-y-3">
            <TestOutput r={res} conf={c} h0={kind === 'one' ? 'μ = μ₀' : kind === 'two' ? 'μ₁ = μ₂' : 'la media de las diferencias es 0'} />
            <Procedure
              steps={
                kind === 'one'
                  ? [{ tex: [`t = \\frac{|\\bar x - \\mu_0|\\sqrt n}{s} = \\frac{|${texNum(res.details.mean, 6)} - ${texNum(muV!, 6)}|\\sqrt{${res.details.n}}}{${texNum(res.details.sd, 4)}} = ${texNum(res.statistic, 4)}`, `gl = n - 1 = ${res.df}`] }]
                  : kind === 'paired'
                    ? [{ text: 'Se calculan las diferencias dᵢ = Aᵢ − Bᵢ y se aplica la prueba de una muestra contra 0.', tex: [`\\bar d = ${texNum(res.details.meanDiff, 5)},\\quad s_d = ${texNum(res.details.sdDiff, 4)}`, `t = \\frac{|\\bar d|\\sqrt n}{s_d} = ${texNum(res.statistic, 4)},\\quad gl = ${res.df}`] }]
                    : usedPooled
                      ? [{ tex: [`s_p = \\sqrt{\\frac{(n_1-1)s_1^2 + (n_2-1)s_2^2}{n_1+n_2-2}} = ${texNum(res.details.sPooled, 4)}`, `t = \\frac{|\\bar x_1 - \\bar x_2|}{s_p\\sqrt{1/n_1 + 1/n_2}} = ${texNum(res.statistic, 4)},\\quad gl = ${res.df}`] }]
                      : [{ tex: [`t = \\frac{|\\bar x_1 - \\bar x_2|}{\\sqrt{s_1^2/n_1 + s_2^2/n_2}} = ${texNum(res.statistic, 4)}`, `gl = \\frac{(s_1^2/n_1 + s_2^2/n_2)^2}{\\frac{(s_1^2/n_1)^2}{n_1-1}+\\frac{(s_2^2/n_2)^2}{n_2-1}} = ${texNum(res.df, 4)}\\ \\text{(Welch)}`] }]
              }
            />
          </section>
        )}
      </div>
    </div>
  );
}

/* ---------------- Prueba F ---------------- */
function FTestPanel() {
  const [a, setA] = useState('10,2; 10,5; 10,3; 10,6; 10,4');
  const [b, setB] = useState('10,1; 10,9; 10,2; 11,0; 10,5');
  const [conf, setConf] = useState<Conf>('0.95');
  const pa = parseList(a);
  const pb = parseList(b);
  const ok = pa.values.length >= 2 && pb.values.length >= 2 && !pa.bad.length && !pb.bad.length;
  const r = ok ? fTest(pa.values, pb.values, Number(conf)) : null;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <div className="card space-y-3">
        <ListField label="Grupo 1" value={a} onChange={setA} />
        <ListField label="Grupo 2" value={b} onChange={setB} />
        <ConfPicker conf={conf} setConf={setConf} />
      </div>
      <div className="min-w-0 space-y-4">
        {!ok && <Alert kind="error">Cada grupo necesita al menos 2 datos válidos.</Alert>}
        {r && (
          <section className="card space-y-3">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Stat label="s₁²" value={fmtSig(r.details.var1, 4)} />
              <Stat label="s₂²" value={fmtSig(r.details.var2, 4)} />
              <Stat label="F = s²mayor / s²menor" value={fmtFixed(r.statistic, 3)} sub={`gl = ${r.dfNum}, ${r.dfDen}`} />
              <Stat label={`F crítico (bilateral ${Math.round(Number(conf) * 100)} %)`} value={fmtFixed(r.critical, 3)} sub={`p = ${fmtFixed(r.pValue, 4)}`} />
            </div>
            <Verdict sig={r.significant} yes="F > F crítico: las precisiones (varianzas) son significativamente distintas." no="F ≤ F crítico: no hay diferencia significativa entre las varianzas." />
            <Procedure steps={[{ text: 'Prueba bilateral: ¿las varianzas son distintas? (si la pregunta es "¿el método 1 es MÁS preciso?", corresponde la prueba unilateral; ver Tablas).', tex: `F = \\frac{s^2_{\\text{mayor}}}{s^2_{\\text{menor}}} = ${texNum(r.statistic, 4)},\\qquad F_{crit} = F_{1-\\alpha/2}(${r.dfNum},${r.dfDen}) = ${texNum(r.critical, 4)}` }]} />
          </section>
        )}
      </div>
    </div>
  );
}

/* ---------------- Propagación ---------------- */
function Propagation() {
  const [formula, setFormula] = useState('m / (M * V)');
  const [vals, setVals] = useState<Record<string, { v: string; u: string }>>({ m: { v: '0,5106', u: '0,0002' }, M: { v: '204,22', u: '0,01' }, V: { v: '0,02500', u: '0,00003' } });
  let names: string[] = [];
  let parseErr: string | null = null;
  try {
    names = [...variablesOf(parseExpression(formula))];
  } catch (e) {
    parseErr = (e as Error).message;
  }
  const get = (n: string) => vals[n] ?? { v: '', u: '0' };
  const set = (n: string, k: 'v' | 'u', x: string) => setVals({ ...vals, [n]: { ...get(n), [k]: x } });
  const result = useMemo(() => {
    if (parseErr || names.length === 0) return null;
    const inp: Record<string, { value: number; u: number }> = {};
    for (const n of names) {
      const v = parseNumber(get(n).v);
      const u = parseNumber(get(n).u);
      if (v == null || u == null || u < 0) return { error: `Revisá el valor y la incertidumbre de "${n}".` };
      inp[n] = { value: v, u };
    }
    try {
      return { r: propagate(formula, inp) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [formula, vals, parseErr, names.join(',')]);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,420px)_1fr]">
      <div className="card space-y-3">
        <NumField label="Fórmula" value={formula} onChange={setFormula} error={parseErr} hint="Operaciones: + − * / ^ ( ). Funciones: sqrt, ln, log, exp. Dentro de la fórmula usá punto decimal para números (ej. 0.5*x)." />
        {names.length > 0 && (
          <table className="table-basic">
            <thead><tr><th>Variable</th><th>Valor</th><th>± incertidumbre (s)</th></tr></thead>
            <tbody>
              {names.map((n) => (
                <tr key={n}>
                  <td className="font-mono font-semibold">{n}</td>
                  <td><input className="input font-mono" inputMode="decimal" value={get(n).v} onChange={(e) => set(n, 'v', e.target.value)} aria-label={`valor de ${n}`} /></td>
                  <td><input className="input font-mono" inputMode="decimal" value={get(n).u} onChange={(e) => set(n, 'u', e.target.value)} aria-label={`incertidumbre de ${n}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="min-w-0 space-y-4">
        {result && 'error' in result && <Alert kind="error">{result.error}</Alert>}
        {result && 'r' in result && result.r && (
          <section className="card space-y-3">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Stat label="Resultado" value={fmtSig(result.r.value, 6)} />
              <Stat label="Incertidumbre s" value={fmtSig(result.r.u, 3)} />
              <Stat label="Relativa" value={`${fmtSig(result.r.relU, 3)} %`} />
              <Stat label="Expresión correcta" value={formatWithUncertainty(result.r.value, result.r.u).text} />
            </div>
            <table className="table-basic">
              <thead><tr><th>Variable</th><th>∂f/∂x</th><th>(∂f/∂x · s)²</th><th>Aporte</th></tr></thead>
              <tbody>
                {result.r.terms.map((t) => (
                  <tr key={t.name}>
                    <td className="font-mono">{t.name}</td><td className="font-mono">{fmtSig(t.derivative, 4)}</td><td className="font-mono">{fmtSig(t.contribution, 3)}</td>
                    <td><div className="flex items-center gap-2"><div className="h-2 rounded bg-teal-600" style={{ width: `${Math.max(1, t.percent)}%`, maxWidth: '8rem' }} /><span className="whitespace-nowrap font-mono">{fmtFixed(t.percent, 1)} %</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Procedure
              steps={[
                { title: 'Ley de propagación (primer orden, variables independientes)', tex: 's_f^2 = \\sum_i \\left(\\frac{\\partial f}{\\partial x_i}\\right)^2 s_i^2' },
                { title: 'Derivadas parciales (numéricas, diferencias centrales con extrapolación de Richardson)', tex: result.r.terms.map((t) => `\\frac{\\partial f}{\\partial ${t.name}} = ${texNum(t.derivative, 5)},\\quad \\left(\\frac{\\partial f}{\\partial ${t.name}}\\,s_{${t.name}}\\right)^2 = ${texNum(t.contribution, 4)}`) },
                { tex: `s_f = \\sqrt{${result.r.terms.map((t) => texNum(t.contribution, 3)).join(' + ')}} = ${texNum(result.r.u, 4)}` },
              ]}
            />
          </section>
        )}
      </div>
    </div>
  );
}

/* ---------------- Cifras significativas ---------------- */
function SigFigs() {
  const [num, setNum] = useState('0,002500');
  const [rnum, setRnum] = useState('3,14159');
  const [rn, setRn] = useState('3');
  const [val, setVal] = useState('0,10234');
  const [unc, setUnc] = useState('0,00056');
  const info = countSigFigs(num);
  const rv = parseNumber(rnum);
  const rk = parseNumber(rn);
  const v = parseNumber(val);
  const u = parseNumber(unc);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <section className="card space-y-3">
        <h3 className="card-title">Contar cifras significativas</h3>
        <NumField label="Número (tal como está escrito)" value={num} onChange={setNum} error={info ? null : 'No es un número válido.'} />
        {info && (
          <>
            <Stat label="Cifras significativas" value={info.count} />
            <p className="text-sm">{info.explanation}</p>
            {info.ambiguous && <Alert kind="warn">Ambiguo: escribilo en notación científica para dejar claro cuántas cifras son significativas.</Alert>}
          </>
        )}
      </section>
      <section className="card space-y-3">
        <h3 className="card-title">Redondear</h3>
        <NumField label="Número" value={rnum} onChange={setRnum} error={rv == null ? 'No es un número válido.' : null} />
        <NumField label="Cantidad de cifras significativas" value={rn} onChange={setRn} error={rk == null || !Number.isInteger(rk) || rk < 1 || rk > 15 ? 'Entero entre 1 y 15.' : null} />
        {rv != null && rk != null && Number.isInteger(rk) && rk >= 1 && rk <= 15 && <Stat label="Resultado" value={fmtSig(roundSig(rv, rk), rk)} />}
      </section>
      <section className="card space-y-3">
        <h3 className="card-title">Resultado ± incertidumbre</h3>
        <NumField label="Valor" value={val} onChange={setVal} error={v == null ? 'No es un número válido.' : null} />
        <NumField label="Incertidumbre" value={unc} onChange={setUnc} error={u == null || u <= 0 ? 'Número positivo.' : null} />
        {v != null && u != null && u > 0 && (
          <>
            <Stat label="Expresión correcta" value={formatWithUncertainty(v, u).text} />
            <p className="text-sm text-slate-600 dark:text-slate-400">Regla: la incertidumbre se informa con 1 cifra significativa (2 si empieza con 1 o 2), y el valor se redondea en la misma posición decimal.</p>
          </>
        )}
      </section>
      <section className="card md:col-span-3">
        <h3 className="card-title">Reglas para operaciones</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li><strong>Suma y resta:</strong> el resultado conserva tantos decimales como el dato con menos decimales.</li>
          <li><strong>Multiplicación y división:</strong> tantas cifras significativas como el dato con menos cifras significativas.</li>
          <li><strong>Logaritmos:</strong> la cantidad de decimales del log (mantisa) es igual a la cantidad de cifras significativas del número. Ej.: [H⁺] = 2,0 × 10⁻³ (2 cifras) → pH = 2,70 (2 decimales).</li>
          <li><strong>Antilogaritmos:</strong> al revés: pH = 4,76 (2 decimales) → [H⁺] = 1,7 × 10⁻⁵ (2 cifras).</li>
          <li>Redondeá sólo el resultado final; en los pasos intermedios conservá al menos una cifra extra.</li>
        </ul>
      </section>
    </div>
  );
}

/* ---------------- Tablas ---------------- */
function Tables() {
  const gls = [...Array.from({ length: 30 }, (_, i) => i + 1), 40, 50, 60, 120];
  const fDf = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];
  const [fType, setFType] = useState<'uni' | 'bil'>('bil');
  const p = fType === 'bil' ? 0.975 : 0.95;
  return (
    <div className="space-y-4">
      <Alert kind="info">
        Los valores de t, F y G se <strong>calculan</strong> con funciones exactas (función beta incompleta) y se verificaron contra scipy.stats y las tablas publicadas (ver TESTS.md). La tabla Q es la de Rorabacher (1991), verificada además por simulación Monte Carlo.
      </Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card overflow-x-auto">
          <h3 className="card-title">t de Student (bilateral)</h3>
          <table className="table-basic">
            <thead><tr><th>gl</th><th>90 %</th><th>95 %</th><th>99 %</th></tr></thead>
            <tbody>
              {gls.map((g) => (
                <tr key={g}><td>{g}</td>{[0.9, 0.95, 0.99].map((c) => <td key={c} className="font-mono">{fmtFixed(tCritTwoSided(c, g), 3)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </section>
        <div className="space-y-4">
          <section className="card overflow-x-auto">
            <h3 className="card-title">Q de Dixon (r₁₀)</h3>
            <table className="table-basic">
              <thead><tr><th>n</th><th>90 %</th><th>95 %</th><th>99 %</th></tr></thead>
              <tbody>
                {Object.entries(DIXON_Q).map(([n, q]) => (
                  <tr key={n}><td>{n}</td><td className="font-mono">{fmtFixed(q[90], 3)}</td><td className="font-mono">{fmtFixed(q[95], 3)}</td><td className="font-mono">{fmtFixed(q[99], 3)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="card overflow-x-auto">
            <h3 className="card-title">G crítico de Grubbs (bilateral)</h3>
            <table className="table-basic">
              <thead><tr><th>n</th><th>α = 0,05</th><th>α = 0,01</th></tr></thead>
              <tbody>
                {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 25, 30].map((n) => (
                  <tr key={n}><td>{n}</td><td className="font-mono">{fmtFixed(grubbsCritical(n, 0.05), 3)}</td><td className="font-mono">{fmtFixed(grubbsCritical(n, 0.01), 3)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
      <section className="card overflow-x-auto">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">F crítico (95 %) — filas: gl del denominador; columnas: gl del numerador</h3>
          <Segmented ariaLabel="Tipo de prueba F" value={fType} onChange={setFType} options={[{ value: 'bil', label: 'Bilateral (F₀,₉₇₅)' }, { value: 'uni', label: 'Unilateral (F₀,₉₅)' }]} />
        </div>
        <table className="table-basic">
          <thead><tr><th>gl₂ \ gl₁</th>{fDf.map((d) => <th key={d}>{d}</th>)}</tr></thead>
          <tbody>
            {fDf.map((d2) => (
              <tr key={d2}><td className="font-semibold">{d2}</td>{fDf.map((d1) => <td key={d1} className="font-mono">{fmtFixed(fInv(p, d1, d2), d1 === 1 && d2 === 1 ? 0 : 2)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
