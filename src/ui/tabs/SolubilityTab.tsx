/**
 * Pestaña: Solubilidad (Ksp, ion común, efecto del pH, ¿precipita?).
 */
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SALTS, getSalt } from '../../chem/data/metals';
import { getSystem } from '../../chem/data/acids';
import { anionAlpha, solubilityAtPH, solubilityCommonIon, solubilityPure, willPrecipitate } from '../../chem/solubility/solubility';
import { fmtFixed, fmtSig, fmtTick, texNum } from '../../chem/numeric/format';
import { Alert, NumField, SelectField, Stat } from '../components/fields';
import { ChartCard } from '../components/ChartCard';
import { Procedure } from '../components/Procedure';
import { checkNum, useNum } from '../hooks';
import { useChartTheme } from '../display';

export default function SolubilityTab() {
  const th = useChartTheme();
  const [saltId, setSaltId] = useState('CaF2');
  const salt = getSalt(saltId)!;
  const Ksp = useNum(fmtSig(salt.Ksp, 3));
  const CMadd = useNum('0');
  const CXadd = useNum('0,01');
  const pH = useNum('3');
  const C1 = useNum('0,001');
  const V1 = useNum('10');
  const C2 = useNum('0,001');
  const V2 = useNum('10');
  const onSalt = (id: string) => {
    setSaltId(id);
    Ksp.setRaw(fmtSig(getSalt(id)!.Ksp, 3));
  };
  const e = {
    K: checkNum(Ksp.value, Ksp.raw, { positive: true }),
    CM: checkNum(CMadd.value, CMadd.raw, { min: 0, max: 20 }),
    CX: checkNum(CXadd.value, CXadd.raw, { min: 0, max: 20 }),
    pH: checkNum(pH.value, pH.raw, { min: 0, max: 14 }),
    C1: checkNum(C1.value, C1.raw, { positive: true, max: 20 }),
    V1: checkNum(V1.value, V1.raw, { positive: true }),
    C2: checkNum(C2.value, C2.raw, { positive: true, max: 20 }),
    V2: checkNum(V2.value, V2.raw, { positive: true }),
  };
  const K = e.K ? null : Ksp.value!;
  const { a, b } = salt;
  const s0 = K != null ? solubilityPure(K, a, b) : null;
  const sCI = K != null && !e.CM && !e.CX ? solubilityCommonIon(K, a, b, CMadd.value!, CXadd.value!) : null;
  const sPH = K != null && !e.pH ? solubilityAtPH(K, a, b, salt.anionBase, pH.value!) : null;
  const prec = K != null && !e.C1 && !e.V1 && !e.C2 && !e.V2 ? willPrecipitate(K, a, b, C1.value!, V1.value!, C2.value!, V2.value!) : null;
  const pHcurve = useMemo(() => {
    if (K == null || !salt.anionBase) return null;
    const out: { pH: number; logS: number }[] = [];
    for (let p = 0; p <= 14.0001; p += 0.05) out.push({ pH: Number(p.toFixed(2)), logS: Math.log10(solubilityAtPH(K, a, b, salt.anionBase, p)) });
    return out;
  }, [K, a, b, salt.anionBase]);
  const ciCurve = useMemo(() => {
    if (K == null) return null;
    const out: { logC: number; logS: number }[] = [];
    for (let l = -7; l <= 0.0001; l += 0.05) out.push({ logC: Number(l.toFixed(2)), logS: Math.log10(solubilityCommonIon(K, a, b, 0, 10 ** l)) });
    return out;
  }, [K, a, b]);
  const sys = salt.anionBase && salt.anionBase !== 'OH' ? getSystem(salt.anionBase) : null;
  const toGL = (s: number) => (salt.M ? `${fmtSig(s * salt.M, 3)} g/L` : '');

  return (
    <div className="space-y-4">
      <section className="card grid gap-3 md:grid-cols-3">
        <SelectField label="Sal poco soluble" value={saltId} onChange={onSalt} options={SALTS.map((s) => ({ value: s.id, label: `${s.formula} (Ksp = ${fmtSig(s.Ksp, 2)})` }))} />
        <NumField label="Ksp (editable)" value={Ksp.raw} onChange={Ksp.setRaw} error={e.K} hint="Valores típicos de tabla (25 °C). Pueden variar entre libros." />
        {s0 != null && <Stat label="Solubilidad en agua pura" value={`${fmtSig(s0, 3)} M`} sub={toGL(s0)} />}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* ---- Ion común ---- */}
        <section className="card space-y-3">
          <h2 className="card-title">Efecto del ion común</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumField label={`${salt.cation} agregado`} value={CMadd.raw} onChange={CMadd.setRaw} unit="M" error={e.CM} />
            <NumField label={`${salt.anion} agregado`} value={CXadd.raw} onChange={CXadd.setRaw} unit="M" error={e.CX} />
          </div>
          {sCI != null && s0 != null && (
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Solubilidad con ion común" value={`${fmtSig(sCI, 3)} M`} sub={toGL(sCI)} />
              <Stat label="Disminuye" value={`${fmtSig(s0 / sCI, 3)} veces`} />
            </div>
          )}
          {ciCurve && (
            <ChartCard title={`log s vs log [${salt.anion}] agregado`} filename="ion-comun.png">
              <ResponsiveContainer width="100%" height={Math.round(th.height * 0.65)}>
                <LineChart data={ciCurve} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid stroke={th.grid} />
                  <XAxis dataKey="logC" type="number" domain={[-7, 0]} ticks={[-7, -6, -5, -4, -3, -2, -1, 0]} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                    label={{ value: `log C(${salt.anion})`, position: 'insideBottom', offset: -18, fontSize: th.fontSize, fill: th.axis }} />
                  <YAxis tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} label={{ value: 'log s', angle: -90, position: 'insideLeft', fontSize: th.fontSize, fill: th.axis }} />
                  <Tooltip formatter={(v: number) => [fmtFixed(v, 2), 'log s']} labelFormatter={(v: number) => `log C = ${fmtFixed(v, 2)}`} contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} />
                  <Line dataKey="logS" dot={false} stroke={th.main} strokeWidth={th.strokeWidth} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
          {sCI != null && K != null && (
            <Procedure steps={[{ text: 'Se resuelve exactamente (sin suponer que s es despreciable frente al ion agregado).', tex: [`K_{sp} = (C_M + ${a > 1 ? a : ''}s)^{${a}}\\,(C_X + ${b > 1 ? b : ''}s)^{${b}} = ${texNum(K, 3)}`, `s = ${texNum(sCI, 4)}\\ \\mathrm{M}`] }]} />
          )}
        </section>

        {/* ---- pH ---- */}
        <section className="card space-y-3">
          <h2 className="card-title">Efecto del pH</h2>
          <NumField label="pH (solución regulada)" value={pH.raw} onChange={pH.setRaw} error={e.pH} />
          {!salt.anionBase && <Alert kind="info">{salt.anion} es la base conjugada de un ácido fuerte: la solubilidad de {salt.formula} prácticamente no depende del pH (sin considerar complejos).</Alert>}
          {sPH != null && salt.anionBase && s0 != null && (
            <div className="grid grid-cols-2 gap-2">
              <Stat label={`Solubilidad a pH ${pH.raw}`} value={`${fmtSig(sPH, 3)} M`} sub={toGL(sPH)} />
              {salt.anionBase !== 'OH' && <Stat label={`α(${salt.anion})`} value={fmtSig(anionAlpha(salt.anionBase, pH.value!), 3)} />}
            </div>
          )}
          {pHcurve && sPH != null && (
            <ChartCard title={`log s vs pH — ${salt.formula}`} filename="solubilidad-pH.png">
              <ResponsiveContainer width="100%" height={Math.round(th.height * 0.65)}>
                <LineChart data={pHcurve} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid stroke={th.grid} />
                  <XAxis dataKey="pH" type="number" domain={[0, 14]} ticks={[0, 2, 4, 6, 8, 10, 12, 14]} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                    label={{ value: 'pH', position: 'insideBottom', offset: -18, fontSize: th.fontSize, fill: th.axis }} />
                  <YAxis domain={[(m: number) => Math.floor(m), (m: number) => Math.min(2, Math.ceil(m))]} allowDataOverflow tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis}
                    label={{ value: 'log s (M)', angle: -90, position: 'insideLeft', fontSize: th.fontSize, fill: th.axis }} />
                  {sys?.pKa.filter((p) => p > 0).map((p, i) => <ReferenceLine key={`pk${i}`} x={p} stroke={th.muted} strokeDasharray="4 4" label={{ value: `pKa ${fmtFixed(p, 2)}`, position: 'insideTopRight', fontSize: th.fontSize - 3, fill: th.muted }} />)}
                  <Tooltip formatter={(v: number) => [fmtFixed(v, 2), 'log s']} labelFormatter={(v: number) => `pH ${fmtFixed(v, 2)}`} contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} />
                  <Line dataKey="logS" dot={false} stroke={th.main} strokeWidth={th.strokeWidth} isAnimationActive={false} />
                  <ReferenceDot x={pH.value!} y={Math.log10(sPH)} r={6} fill={th.accent} stroke={th.bg} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {salt.anionBase === 'OH' ? 'Hidróxido: s = (Ksp/[OH⁻]ᵇ)^(1/a)/a. Modelo simple: no incluye complejos hidroxo ni anfoterismo (ej. Al(OH)₄⁻, Zn(OH)₄²⁻), que vuelven a aumentar la solubilidad a pH alto.' : 'Al bajar el pH el anión se protona, baja [anión libre] y se disuelve más sal: K′sp = Ksp/αᵇ.'}
              </p>
            </ChartCard>
          )}
          {sPH != null && K != null && salt.anionBase && (
            <Procedure
              steps={[
                salt.anionBase === 'OH'
                  ? { tex: [`[\\mathrm{OH^-}] = 10^{-(14 - \\mathrm{pH})},\\quad [M] = \\left(\\frac{K_{sp}}{[\\mathrm{OH^-}]^{${b}}}\\right)^{1/${a}}`, `s = ${texNum(sPH, 4)}\\ \\mathrm{M}`] }
                  : { tex: [`\\alpha_X = ${texNum(anionAlpha(salt.anionBase, pH.value!), 4)}\\ \\text{(fracción del anión sin protonar)}`, `K'_{sp} = \\frac{K_{sp}}{\\alpha_X^{${b}}} = ${texNum(K / anionAlpha(salt.anionBase, pH.value!) ** b, 4)}`, `s = \\left(\\frac{K'_{sp}}{${a ** a * b ** b}}\\right)^{1/${a + b}} = ${texNum(sPH, 4)}\\ \\mathrm{M}`] },
              ]}
            />
          )}
        </section>
      </div>

      {/* ---- ¿Precipita? ---- */}
      <section className="card space-y-3">
        <h2 className="card-title">¿Precipita? (mezcla de dos soluciones)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumField label={`Concentración de ${salt.cation}`} value={C1.raw} onChange={C1.setRaw} unit="M" error={e.C1} />
          <NumField label="Volumen" value={V1.raw} onChange={V1.setRaw} unit="mL" error={e.V1} />
          <NumField label={`Concentración de ${salt.anion}`} value={C2.raw} onChange={C2.setRaw} unit="M" error={e.C2} />
          <NumField label="Volumen" value={V2.raw} onChange={V2.setRaw} unit="mL" error={e.V2} />
        </div>
        {prec && K != null && (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Stat label={`[${salt.cation}] al mezclar`} value={`${fmtSig(prec.CM, 3)} M`} />
              <Stat label={`[${salt.anion}] al mezclar`} value={`${fmtSig(prec.CX, 3)} M`} />
              <Stat label="Producto iónico Q" value={fmtSig(prec.Q, 3)} sub={`Ksp = ${fmtSig(K, 3)}`} />
              {prec.precipitates && <Stat label="Precipita del ion limitante" value={`${fmtSig(prec.percent, 4)} %`} sub={`quedan ${fmtSig(prec.Meq, 3)} M de ${salt.cation} y ${fmtSig(prec.Xeq, 3)} M de ${salt.anion}`} />}
            </div>
            <Alert kind={prec.precipitates ? 'warn' : 'ok'}>{prec.precipitates ? `Q > Ksp: SÍ precipita ${salt.formula}.` : `Q ≤ Ksp: NO precipita (la solución no está sobresaturada).`}</Alert>
            <Procedure steps={[{ tex: [`Q = [M]^{${a}}[X]^{${b}} = (${texNum(prec.CM, 3)})^{${a}}(${texNum(prec.CX, 3)})^{${b}} = ${texNum(prec.Q, 3)}`, ...(prec.precipitates ? [`(C_M - ${a > 1 ? a : ''}p)^{${a}}(C_X - ${b > 1 ? b : ''}p)^{${b}} = K_{sp} \\Rightarrow p = ${texNum(prec.precipitated, 4)}\\ \\mathrm{M\\ precipitado}`] : [])] }]} />
          </>
        )}
      </section>
    </div>
  );
}
