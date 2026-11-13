/**
 * Prácticos de laboratorio del 2º semestre (Cuaderneta QA I 2026): 8 a 13.
 */
import { useMemo, useState } from 'react';
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as P from '../../chem/lab/practicas';
import { derivativeTable, findEndpoints } from '../../chem/lab/potentiometric';
import { pHAt } from '../../chem/acidbase/titration';
import { getSystem } from '../../chem/data/acids';
import { fmtFixed, fmtSig, fmtTick, texNum } from '../../chem/numeric/format';
import { formatWithUncertainty } from '../../chem/stats/sigfigs';
import { Alert, NumField, Stat } from '../components/fields';
import { Procedure } from '../components/Procedure';
import { SheetGrid, parseRow, type SheetRow } from '../components/SheetGrid';
import { useChartTheme } from '../display';
import { useNum } from '../hooks';
import { CalibrationPractice, modelEquation } from './CalibrationPractice';
import { Diagram, MassAdvice, PracticeHeader, ReplicateBlock } from './common';

const ok = (...xs: (number | null)[]) => xs.every((x) => x != null && Number.isFinite(x));
const n4 = (x: number) => fmtSig(x, 4);

/* ============ Práctico 8: yodo (yodopovidona) con tiosulfato ============ */
export function P8() {
  const Cs = useNum('0,05');
  const G = useNum('8');
  const Vprep = useNum('100');
  const I2pv = useNum('1');
  const Vm = useNum('100');
  const Vp = useNum('10');
  const okD = ok(Cs.value, G.value, Vprep.value, I2pv.value, Vm.value, Vp.value);
  const mTio = okD ? (Cs.value! * Vprep.value! * P.MM.Na2S2O3_5H2O) / 1000 : NaN;
  const mKIO3 = okD ? P.massForGasto(G.value!, Cs.value!, 1 / 6, P.MM.KIO3) : NaN;
  const CI2 = okD ? (I2pv.value! * 10) / P.MM.I2 : NaN;
  const VI2 = okD ? P.volumeForGasto(G.value!, Cs.value!, 1 / 2, CI2) : NaN;
  const CSin = useNum('0,05012');
  return (
    <div className="space-y-4">
      <PracticeHeader
        n={8}
        title="Valoración de una solución de I₂ de uso tópico (yodopovidona)"
        objetivos={['Preparar Na₂S₂O₃ ≈ 0,05 M y valorarlo por yodometría con KIO₃ / KI (almidón).', 'Valorar la solución problema de I₂ y verificar la especificación USP.']}
        reacciones={['IO₃⁻ + 5 I⁻ + 6 H⁺ → 3 I₂ + 3 H₂O', 'I₂ + 2 S₂O₃²⁻ → 2 I⁻ + S₄O₆²⁻   ⇒ n(KIO₃) = n(S₂O₃²⁻)/6']}
      />
      <Diagram
        inputs={
          <>
            <NumField label="C Na₂S₂O₃ a preparar" value={Cs.raw} onChange={Cs.setRaw} unit="M" />
            <NumField label="Volumen a preparar" value={Vprep.raw} onChange={Vprep.setRaw} unit="mL" />
            <NumField label="Gasto deseado" value={G.raw} onChange={G.setRaw} unit="mL" />
            <NumField label="Matraz para el KIO₃" value={Vm.raw} onChange={Vm.setRaw} unit="mL" />
            <NumField label="Pipeta (alícuota de KIO₃)" value={Vp.raw} onChange={Vp.setRaw} unit="mL" />
            <NumField label="I₂ en la muestra (aprox.)" value={I2pv.raw} onChange={I2pv.setRaw} unit="% p-v" />
          </>
        }
        outputs={
          okD && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Na₂S₂O₃·5H₂O a pesar" value={`${n4(mTio)} g`} sub={`para ${Vprep.raw} mL`} />
                <Stat label="KIO₃ para gastar 8 mL" value={`${n4(mKIO3)} g`} />
                <Stat label="Toma de solución de I₂" value={`${fmtSig(VI2, 3)} mL`} sub={`${I2pv.raw} % p-v = ${n4(CI2)} M`} />
              </div>
              <MassAdvice m={mKIO3} stock={P.aliquotSuggestion(mKIO3, Vm.value!, Vp.value!)} />
            </>
          )
        }
        steps={[{ tex: ['m_{KIO_3} = \\frac{G\\cdot C_{S_2O_3}}{6\\cdot 1000}\\cdot MM_{KIO_3}', 'V_{I_2} = \\frac{G\\cdot C_{S_2O_3}}{2\\cdot C_{I_2}}'] }]}
      />
      <ReplicateBlock
        title="1. Estandarización del Na₂S₂O₃"
        columns={[
          { key: 'm', label: 'm KIO₃ (g)' },
          { key: 'Vm', label: 'V20 matraz (mL)' },
          { key: 'Vp', label: 'V20 pipeta (mL)' },
          { key: 'G', label: 'G corregido (mL)' },
        ]}
        example={['7,98', '8,00', '7,99', '8,03', '7,97'].map((G) => ({ m: '0,1430', Vm: '100,04', Vp: '10,006', G }))}
        results={[{ key: 'C', label: 'C Na₂S₂O₃', unit: 'M', compute: (r) => (ok(r.m, r.G, r.Vp, r.Vm) ? P.cTiosulfato(r.m!, r.G!, 100, r.Vp!, r.Vm!) : null), criterion: { kind: 'cv', maxCV: 1, minN: 3 } }]}
        formula={[{ tex: 'C_{S_2O_3^{2-}} = \\frac{6\\cdot m_{KIO_3}\\cdot(\\text{Assay}/100)\\cdot\\frac{V_p}{V_m}\\cdot 1000}{MM_{KIO_3}\\cdot G}' }]}
      />
      <ReplicateBlock
        title="2. Valoración de la solución problema de I₂"
        note={<NumField label="C Na₂S₂O₃ (valorado)" value={CSin.raw} onChange={CSin.setRaw} unit="M" className="max-w-xs" />}
        columns={[
          { key: 'V', label: 'V20 pipeta toma (mL)' },
          { key: 'G', label: 'G corregido (mL)' },
        ]}
        example={['7,85', '7,88', '7,86', '7,90'].map((G) => ({ V: '5,002', G }))}
        results={[
          { key: 'C', label: 'C I₂', unit: 'M', compute: (r) => (ok(r.V, r.G, CSin.value) ? P.cI2(CSin.value!, r.G!, r.V!) : null), criterion: { kind: 'cv', maxCV: 1, minN: 3 } },
          {
            key: 'pv',
            label: 'I₂',
            unit: '% p-v',
            compute: (r) => (ok(r.V, r.G, CSin.value) ? (P.cI2(CSin.value!, r.G!, r.V!) * P.MM.I2) / 10 : null),
            criterion: { kind: 'cv', maxCV: 1, minN: 3 },
            spec: I2pv.value ? { min: 0.85 * I2pv.value, max: 1.2 * I2pv.value, text: `USP (yodopovidona solución tópica): 85,0–120,0 % del yodo declarado (${I2pv.raw} % p-v) — verificar con la edición vigente` } : undefined,
          },
        ]}
        formula={[{ tex: ['C_{I_2} = \\frac{C_{S_2O_3^{2-}}\\cdot G}{2\\cdot V_{toma}}', '\\%\\,p\\text{-}v = C_{I_2}\\cdot\\frac{253{,}8}{10}'] }]}
      />
    </div>
  );
}

/* ============ Práctico 9: Volhard (KBr) ============ */
export function P9() {
  const CAg = useNum('0,1');
  const CSCN = useNum('0,12500');
  const CBr = useNum('0,15');
  const GB = useNum('8');
  const GR = useNum('2');
  const okD = ok(CAg.value, CSCN.value, CBr.value, GB.value, GR.value) && GB.value! > GR.value!;
  const VAg = okD ? P.volumeForGasto(GB.value!, CSCN.value!, 1, CAg.value!) : NaN;
  const Vtoma = okD ? P.volumeForGasto(GB.value! - GR.value!, CSCN.value!, 1, CBr.value!) : NaN;
  const Vin = useNum('5,002');
  return (
    <div className="space-y-4">
      <PracticeHeader
        n={9}
        title="Valoración argentométrica de KBr aprox. 0,15 M (método de Volhard)"
        objetivos={['Determinar bromuro por retrovaloración: exceso de AgNO₃ y titulación del sobrante con KSCN valorado (Fe³⁺ como indicador).']}
        reacciones={['Br⁻ + Ag⁺ (exceso) → AgBr(s)', 'Ag⁺ (sobrante) + SCN⁻ → AgSCN(s)', 'Punto final: Fe³⁺ + SCN⁻ → FeSCN²⁺ (rojo)']}
      >
        <Alert kind="info">Para Br⁻ no hace falta filtrar: AgBr (Kps 5,0 × 10⁻¹³) es menos soluble que AgSCN (1,1 × 10⁻¹²). Con Cl⁻ sí, porque AgCl es más soluble y reaccionaría con el SCN⁻. Ver también la pestaña "EDTA y precipitación".</Alert>
      </PracticeHeader>
      <Diagram
        inputs={
          <>
            <NumField label="C AgNO₃" value={CAg.raw} onChange={CAg.setRaw} unit="M" />
            <NumField label="C KSCN (valorado)" value={CSCN.raw} onChange={CSCN.setRaw} unit="M" />
            <NumField label="C Br⁻ aproximada" value={CBr.raw} onChange={CBr.setRaw} unit="M" />
            <NumField label="Gasto de KSCN en el blanco" value={GB.raw} onChange={GB.setRaw} unit="mL" />
            <NumField label="Gasto de KSCN en la retrovaloración" value={GR.raw} onChange={GR.setRaw} unit="mL" />
          </>
        }
        outputs={
          okD && (
            <div className="grid grid-cols-2 gap-2">
              <Stat label="AgNO₃ a agregar (blanco y muestras)" value={`${fmtSig(VAg, 4)} mL`} />
              <Stat label="Toma de solución problema" value={`${fmtSig(Vtoma, 4)} mL`} />
            </div>
          )
        }
        steps={[{ tex: ['V_{AgNO_3} = \\frac{G_B\\cdot C_{SCN}}{C_{Ag}}', 'V_{KBr} = \\frac{(G_B - G_R)\\cdot C_{SCN}}{C_{Br}}'] }]}
      />
      <ReplicateBlock
        title="Datos experimentales y concentración de KBr"
        note={<NumField label="V20 pipeta de toma de KBr" value={Vin.raw} onChange={Vin.setRaw} unit="mL" className="max-w-xs" />}
        columns={[
          { key: 'GB', label: 'G blanco corr. (mL)' },
          { key: 'GR', label: 'G retro corr. (mL)' },
        ]}
        example={[
          ['8,02', '1,98'],
          ['7,99', '2,02'],
          ['8,01', '2,00'],
          ['8,00', '1,95'],
          ['8,03', '2,01'],
          ['7,98', '2,03'],
        ].map(([GB, GR]) => ({ GB, GR }))}
        results={[{ key: 'C', label: 'C KBr', unit: 'M', compute: (r) => (ok(r.GB, r.GR, CSCN.value, Vin.value) ? P.cBromuro(CSCN.value!, r.GB!, r.GR!, Vin.value!) : null), criterion: { kind: 'dixon' } }]}
        formula={[{ tex: 'C_{Br^-} = \\frac{C_{SCN^-}\\cdot (G_B - G_R)}{V_{toma}}' }]}
      />
    </div>
  );
}

/* ============ Práctico 10: humedad de yerba mate ============ */
export function P10() {
  const Hmax = useNum('11');
  const dm = useNum('0,1');
  const okD = ok(Hmax.value, dm.value);
  const m = okD ? dm.value! / (Hmax.value! / 100) : NaN;
  return (
    <div className="space-y-4">
      <PracticeHeader n={10} title="Determinación del porcentaje de humedad de yerba mate" objetivos={['Gravimetría de volatilización indirecta: pérdida por secado a 105 °C hasta masa constante.', 'Comparar con el Reglamento Bromatológico Nacional (máx. 11 % m-m de humedad).']} />
      <Diagram
        inputs={
          <>
            <NumField label="Humedad máxima (RBN)" value={Hmax.raw} onChange={Hmax.setRaw} unit="%" />
            <NumField label="Pérdida de masa mínima deseada" value={dm.raw} onChange={dm.setRaw} unit="g" />
          </>
        }
        outputs={okD && <Stat label="Masa mínima de yerba a pesar" value={`${fmtSig(m, 3)} g`} sub="así la pérdida de agua es ≥ la deseada aun con la humedad máxima" />}
        steps={[{ tex: `m_{muestra} \\ge \\frac{\\Delta m}{\\%H/100} = ${texNum(m, 3)}\\ \\mathrm g` }]}
      />
      <ReplicateBlock
        title="Datos experimentales (por triplicado)"
        columns={[
          { key: 'm0', label: 'Cápsula vacía (g)' },
          { key: 'mSH', label: 'Cápsula + húmeda (g)' },
          { key: 'mSS', label: 'Cápsula + seca, masa constante (g)' },
        ]}
        example={[
          ['35,2432', '38,5421', '38,2023'],
          ['33,9871', '37,1105', '36,7891'],
          ['36,4410', '39,8012', '39,4563'],
        ].map(([m0, mSH, mSS]) => ({ m0, mSH, mSS }))}
        results={[
          {
            key: 'H',
            label: '% humedad',
            unit: '%',
            compute: (r) => (ok(r.m0, r.mSH, r.mSS) ? P.pctHumedad(r.m0!, r.mSH!, r.mSS!) : null),
            criterion: { kind: 'cv', maxCV: 5, minN: 3 },
            spec: Hmax.value ? { max: Hmax.value, text: `Reglamento Bromatológico Nacional: humedad ≤ ${Hmax.raw} %` } : undefined,
          },
        ]}
        formula={[{ tex: '\\%\\,H = \\frac{m_{SH} - m_{SS}}{m_{SH}}\\cdot 100 \\quad (m_{SH} = m_{cáps+SH} - m_{cáps})' }]}
      />
    </div>
  );
}

/* ============ Práctico 11: H3PO4 en gaseosa (potenciometría) ============ */
function simulatedCola(): SheetRow[] {
  // ejemplo generado con el motor exacto: 1,1 × 10⁻⁴ mol de H3PO4 en ≈ 50 mL (≈ 510 mg/kg), NaOH 0,01 M
  const s = { analyte: [{ kind: 'weak' as const, C: 0.0022, system: getSystem('fosforico')!, hAdded: 3 }], Va: 50, titrant: { kind: 'strong-base' as const, C: 0.01, n: 1 } };
  const vols: number[] = [];
  for (let v = 0; v < 7; v += 1) vols.push(v);
  for (let v = 7; v <= 15.0001; v += 0.2) vols.push(Number(v.toFixed(1)));
  for (let v = 16; v <= 24; v += 1) vols.push(v);
  return vols.map((V) => ({ V: fmtFixed(V, 2), pH: fmtFixed(pHAt(s, V), 2) }));
}

export function P11() {
  const th = useChartTheme();
  const C1 = useNum('0,1');
  const Vdil = useNum('250');
  const C2 = useNum('0,01');
  const Gox = useNum('20');
  const ppm = useNum('600');
  const G1 = useNum('13');
  const okD = ok(C1.value, Vdil.value, C2.value, Gox.value, ppm.value, G1.value);
  const Vmadre = okD ? (C2.value! * Vdil.value!) / C1.value! : NaN;
  const mOx = okD ? P.massForGasto(Gox.value!, C2.value!, 1 / 2, P.MM.H2C2O4_2H2O) : NaN;
  const mCola = okD ? (C2.value! * G1.value! * P.MM.H3PO4 * 1000) / ppm.value! : NaN;

  const [rows, setRows] = useState<SheetRow[]>(simulatedCola);
  const CN = useNum('0,01003');
  const uC = useNum('0,00005');
  const mS = useNum('21,2345');
  const parsed = rows.map(parseRow).filter((r) => r.V != null && r.pH != null) as { V: number; pH: number }[];
  const table = useMemo(() => derivativeTable(parsed.map((r) => r.V), parsed.map((r) => r.pH)), [JSON.stringify(parsed)]);
  const eps = useMemo(() => findEndpoints(table), [table]);
  const G = eps[0]?.V;
  const res = G != null && ok(CN.value, mS.value) ? P.ppmH3PO4(CN.value!, G, mS.value!) : null;
  const urel = res != null && ok(uC.value) ? Math.sqrt((uC.value! / CN.value!) ** 2 + (0.1 / G!) ** 2 + (0.00042 / P.MM.H3PO4) ** 2 + (0.0002 / mS.value!) ** 2) : null;
  return (
    <div className="space-y-4">
      <PracticeHeader n={11} title="Valoración potenciométrica de H₃PO₄ en gaseosa" objetivos={['Cuantificar el H₃PO₄ (INS 338) de una bebida cola por valoración potenciométrica con NaOH 0,01 M.', 'Comparar con el RBN (máx. 600 mg/kg).']}>
        <Alert kind="info">Se valora hasta el 1er punto equivalente (H₃PO₄ → H₂PO₄⁻, relación 1:1). Antes se hierve la muestra para eliminar el CO₂.</Alert>
      </PracticeHeader>
      <Diagram
        inputs={
          <>
            <NumField label="NaOH madre" value={C1.raw} onChange={C1.setRaw} unit="M" />
            <NumField label="Volumen de la dilución" value={Vdil.raw} onChange={Vdil.setRaw} unit="mL" />
            <NumField label="NaOH diluido" value={C2.raw} onChange={C2.setRaw} unit="M" />
            <NumField label="Gasto para estandarizar (bureta 25 mL)" value={Gox.raw} onChange={Gox.setRaw} unit="mL" />
            <NumField label="H₃PO₄ máximo (RBN)" value={ppm.raw} onChange={ppm.setRaw} unit="mg/kg" />
            <NumField label="Gasto deseado al 1er PE" value={G1.raw} onChange={G1.setRaw} unit="mL" />
          </>
        }
        outputs={
          okD && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="NaOH madre a diluir" value={`${fmtSig(Vmadre, 3)} mL`} sub={`→ ${Vdil.raw} mL`} />
                <Stat label="H₂C₂O₄·2H₂O para estandarizar" value={`${n4(mOx)} g`} />
                <Stat label="Toma de bebida cola" value={`${fmtSig(mCola, 3)} g`} />
              </div>
              <MassAdvice m={mOx} stock={P.aliquotSuggestion(mOx, 100, 10)} />
            </>
          )
        }
        steps={[{ tex: ['m_{cola} = \\frac{C_{NaOH}\\cdot G\\cdot MM_{H_3PO_4}\\cdot 1000}{\\text{ppm}}'] }]}
      />
      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="card-title mb-0">📋 Curva potenciométrica: V (mL) y pH</h3>
          <div className="flex gap-2">
            <button className="btn" onClick={() => setRows(simulatedCola())}>Datos de ejemplo</button>
            <button className="btn" onClick={() => setRows(Array.from({ length: 5 }, () => ({ V: '', pH: '' })))}>Vaciar</button>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">De a 1,0 mL lejos del punto final y de a 0,2 mL cerca (4 mL antes y después). Podés pegar las dos columnas desde Excel.</p>
        <div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_1fr]">
          <div className="max-h-[32rem] overflow-y-auto">
            <SheetGrid columns={[{ key: 'V', label: 'V NaOH (mL)' }, { key: 'pH', label: 'pH' }]} rows={rows} onChange={setRows} />
          </div>
          <div className="min-w-0">
            <ResponsiveContainer width="100%" height={th.height}>
              <ComposedChart data={table} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid stroke={th.grid} />
                <XAxis dataKey="V" type="number" domain={['auto', 'auto']} tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} />
                <YAxis yAxisId="pH" tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} />
                <YAxis yAxisId="d" orientation="right" tickFormatter={fmtTick} tick={{ fontSize: th.fontSize, fill: th.axis }} stroke={th.axis} />
                {eps.map((e, i) => <ReferenceLine key={i} yAxisId="pH" x={e.V} stroke={th.accent} strokeDasharray="6 4" label={{ value: `PE${i + 1}`, position: 'top', fontSize: th.fontSize - 2, fill: th.accent }} />)}
                <Line yAxisId="pH" dataKey="pH" name="pH" stroke={th.main} strokeWidth={th.strokeWidth} dot={{ r: 2 }} isAnimationActive={false} />
                <Line yAxisId="d" data={table.filter((r) => r.d1 != null).map((r) => ({ V: r.Vbar, d1: r.d1 }))} dataKey="d1" name="ΔpH/ΔV (sobre V̄)" stroke="#10cf9b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Tooltip formatter={(v: number) => fmtSig(v, 4)} labelFormatter={(v: number) => `V = ${fmtFixed(v, 2)} mL`} contentStyle={{ background: th.bg, borderColor: th.grid, color: th.text, fontSize: th.fontSize }} />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: th.fontSize }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        {eps.length === 0 ? (
          <Alert kind="warn">No se encontró un punto final (la 2ª derivada no cambia de signo). Cargá más puntos cerca del salto.</Alert>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {eps.slice(0, 2).map((e, i) => (
              <Stat key={i} label={`PE${i + 1}: cruce de cero de la 2ª derivada`} value={`${fmtFixed(e.V, 3)} mL`} sub={`máx. 1ª derivada en V̄ = ${fmtFixed(e.Vmax1, 2)} mL`} />
            ))}
          </div>
        )}
        <details className="rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-800">
          <summary className="cursor-pointer font-semibold">Tabla de derivadas</summary>
          <div className="mt-2 max-h-96 overflow-auto">
            <table className="table-basic">
              <thead><tr><th>G (mL)</th><th>pH</th><th>V̄</th><th>ΔpH/ΔV</th><th>V̿</th><th>Δ(ΔpH/ΔV)/ΔV̄</th></tr></thead>
              <tbody>
                {table.map((r, i) => (
                  <tr key={i}>
                    <td className="font-mono">{fmtFixed(r.V, 2)}</td><td className="font-mono">{fmtFixed(r.pH, 2)}</td>
                    <td className="font-mono">{r.Vbar != null ? fmtFixed(r.Vbar, 2) : '—'}</td><td className="font-mono">{r.d1 != null ? fmtSig(r.d1, 3) : '—'}</td>
                    <td className="font-mono">{r.Vbb != null ? fmtFixed(r.Vbb, 2) : '—'}</td><td className="font-mono">{r.d2 != null ? fmtSig(r.d2, 3) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <h4 className="font-semibold">Resultado</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumField label="C NaOH (valorado)" value={CN.raw} onChange={CN.setRaw} unit="M" />
          <NumField label="u de C NaOH (t·s/√n)" value={uC.raw} onChange={uC.setRaw} unit="M" />
          <NumField label="Masa de muestra" value={mS.raw} onChange={mS.setRaw} unit="g" />
        </div>
        {res != null && urel != null && (
          <>
            <div className="rounded-lg bg-brand-700 px-4 py-2 text-center font-mono text-lg text-white">H₃PO₄: ({formatWithUncertainty(res, res * urel).text}) mg/kg</div>
            <Alert kind={res <= (ppm.value ?? 600) ? 'ok' : 'error'}>RBN: máximo {ppm.raw} mg/kg → {res <= (ppm.value ?? 600) ? 'CUMPLE' : 'NO CUMPLE'}.</Alert>
          </>
        )}
        <Procedure
          steps={[
            { title: 'Derivadas', tex: ['\\bar V_i = \\frac{V_i + V_{i-1}}{2};\\quad D_1 = \\frac{\\Delta pH}{\\Delta V}', '\\bar{\\bar V}_i = \\frac{\\bar V_i + \\bar V_{i-1}}{2};\\quad D_2 = \\frac{\\Delta D_1}{\\Delta \\bar V}', '\\text{Punto final: } D_2 = 0 \\text{ (interpolación lineal entre el último } D_2>0 \\text{ y el primero } D_2<0)'] },
            { title: 'Concentración', tex: '\\mathrm{ppm\\ (mg/kg)} = \\frac{C_{NaOH}\\cdot G\\,(\\mathrm{mL})\\cdot MM_{H_3PO_4}\\cdot 1000}{m_{muestra}\\,(\\mathrm g)}' },
            { title: 'Incertidumbre (u_G = 0,1 mL; u_MM = 0,00042 g/mol; u_m = 0,0002 g)', tex: 'u = c\\sqrt{\\left(\\frac{u_C}{C}\\right)^2 + \\left(\\frac{u_G}{G}\\right)^2 + \\left(\\frac{u_{MM}}{MM}\\right)^2 + \\left(\\frac{u_m}{m}\\right)^2}' },
          ]}
        />
      </section>
    </div>
  );
}

/* ============ Práctico 12: paracetamol en jarabe ============ */
export function P12() {
  const decl = useNum('120');
  const d = useNum('1,15');
  const target = useNum('5');
  const Vf1 = useNum('50');
  const Va = useNum('1');
  const Vf2 = useNum('100');
  const okD = ok(decl.value, d.value, target.value, Vf1.value, Va.value, Vf2.value);
  const mgPerMl = okD ? decl.value! / 5 : NaN;
  const mSample = okD ? (target.value! * (Vf2.value! / Va.value!) * (Vf1.value! / 1000)) / (mgPerMl / d.value!) : NaN;
  return (
    <div className="space-y-4">
      <PracticeHeader n={12} title="Dosificación espectrofotométrica de paracetamol en jarabe" objetivos={['Curva de calibración (0–10 mg/L, 6 niveles) a partir de paracetamol patrón en HCl 0,1 M.', 'Elegir el modelo de mejor ajuste y dosificar el jarabe; USP: 90–110 % de lo declarado.']}>
        <Alert kind="info">Patrones sugeridos: stock ≈ 50 mg en 50,00 mL (≈ 1000 mg/L) → intermedia de 100 mg/L (5,00 mL a 50,00 mL) → alícuotas de 1, 2, 3, 4 y 5 mL a 50,00 mL = 2, 4, 6, 8 y 10 mg/L.</Alert>
      </PracticeHeader>
      <Diagram
        title="Diagramación de la muestra"
        inputs={
          <>
            <NumField label="Declarado" value={decl.raw} onChange={decl.setRaw} unit="mg / 5 mL" />
            <NumField label="Densidad del jarabe" value={d.raw} onChange={d.setRaw} unit="g/mL" />
            <NumField label="Concentración final buscada" value={target.raw} onChange={target.setRaw} unit="mg/L" hint="Cerca del punto medio de la curva" />
            <NumField label="1er matraz (disolución de la masa)" value={Vf1.raw} onChange={Vf1.setRaw} unit="mL" />
            <NumField label="Alícuota" value={Va.raw} onChange={Va.setRaw} unit="mL" />
            <NumField label="2º matraz" value={Vf2.raw} onChange={Vf2.setRaw} unit="mL" />
          </>
        }
        outputs={okD && <Stat label="Masa de jarabe a pesar" value={`${fmtSig(mSample, 4)} g`} sub={`${fmtSig(mgPerMl, 3)} mg/mL de paracetamol`} />}
        steps={[{ tex: 'm = \\frac{C_{final}\\cdot\\frac{V_{f2}}{V_a}\\cdot V_{f1}}{(\\text{mg/mL})/d}' }]}
      />
      <CalibrationPractice
        xLabel="C (mg/L)"
        example={[
          ['0', '0,002', '0,003'],
          ['2', '0,134', '0,136'],
          ['4', '0,268', '0,266'],
          ['6', '0,395', '0,399'],
          ['8', '0,527', '0,525'],
          ['10', '0,652', '0,656'],
        ].map(([C, A1, A2]) => ({ C, A1, A2 }))}
        sampleTitle="Muestra (triplicado): paracetamol en el jarabe"
        sampleColumns={[
          { key: 'm', label: 'm jarabe (g)' },
          { key: 'A1', label: 'A₁' },
          { key: 'A2', label: 'A₂' },
        ]}
        sampleExample={[
          ['1,2012', '0,331', '0,332'],
          ['1,1987', '0,329', '0,330'],
          ['1,2035', '0,333', '0,332'],
        ].map(([m, A1, A2]) => ({ m, A1, A2 }))}
        sampleResult={{
          key: 'mg5',
          label: 'Paracetamol',
          unit: 'mg/5 mL',
          sig: 4,
          criterion: { kind: 'cv', maxCV: 10, minN: 3 },
          spec: decl.value ? { min: 0.9 * decl.value, max: 1.1 * decl.value, text: `USP: 90–110 % de lo declarado (${decl.raw} mg/5 mL)` } : undefined,
          fromConc: (c, r) => (ok(r.m, d.value, Vf1.value, Va.value, Vf2.value) ? ((c * (Vf2.value! / Va.value!) * (Vf1.value! / 1000)) / (r.m! / d.value!)) * 5 : null),
        }}
      />
    </div>
  );
}

/* ============ Práctico 13: Fe(II) con 1,10-fenantrolina ============ */
export function P13() {
  const eps = useNum('11100');
  const Amin = useNum('0,020');
  const Amax = useNum('0,700');
  const Cstock = useNum('20');
  const decl = useNum('125');
  const okD = ok(eps.value, Amin.value, Amax.value, Cstock.value, decl.value);
  const r = okD ? P.beerRange(Amin.value!, Amax.value!, eps.value!) : null;
  const ppmMin = r ? r.Cmin * P.MM.Fe * 1000 : NaN;
  const ppmMax = r ? r.Cmax * P.MM.Fe * 1000 : NaN;
  const levels = r ? [1, 2, 3, 4, 5].map((k) => ppmMin + ((ppmMax - ppmMin) * (k - 0.5)) / 5) : [];
  const nice = levels.map((c) => Number(c.toPrecision(2)));
  const feSample = okD ? (decl.value! * P.MM.Fe) / P.MM.FeSO4_7H2O * 1000 : NaN; // mg Fe / L (= ppm)
  const mid = (ppmMin + ppmMax) / 2;
  const schemes = useMemo(() => {
    if (!okD) return [];
    const pip = [1, 2, 3, 5, 10];
    const fl = [25, 50, 100];
    const out: { steps: [number, number][]; final: number }[] = [];
    for (const p1 of pip) for (const f1 of fl) for (const p2 of pip) for (const f2 of fl) for (const p3 of pip) {
      if (p1 >= f1 || p2 >= f2) continue;
      const final = feSample * (p1 / f1) * (p2 / f2) * (p3 / 50);
      out.push({ steps: [[p1, f1], [p2, f2], [p3, 50]], final });
    }
    return out.sort((a, b) => Math.abs(Math.log(a.final / mid)) - Math.abs(Math.log(b.final / mid))).slice(0, 3);
  }, [okD, feSample, mid]);
  const p1 = useNum('1');
  const f1 = useNum('100');
  const p2 = useNum('10');
  const f2 = useNum('100');
  const p3 = useNum('3');
  const fd = ok(p1.value, f1.value, p2.value, f2.value, p3.value) ? (f1.value! / p1.value!) * (f2.value! / p2.value!) * (50 / p3.value!) : NaN;
  return (
    <div className="space-y-4">
      <PracticeHeader n={13} title="Dosificación espectrofotométrica de Fe(II) por desarrollo de color" objetivos={['Cuantificar Fe²⁺ en un antianémico (≈ 125 mg/mL de FeSO₄·7H₂O) con 1,10-fenantrolina a 510 nm.', 'USP: 94,0–106,0 % de lo declarado.']} reacciones={['Fe²⁺ + 3 fen → Fe(fen)₃²⁺ (rojo-naranja, ε₅₁₀ = 11 100 L mol⁻¹ cm⁻¹)']} />
      <Diagram
        inputs={
          <>
            <NumField label="ε del complejo" value={eps.raw} onChange={eps.setRaw} unit="L mol⁻¹ cm⁻¹" />
            <NumField label="A mínima" value={Amin.raw} onChange={Amin.setRaw} />
            <NumField label="A máxima" value={Amax.raw} onChange={Amax.setRaw} hint="0,700 (práctico) o 0,900 (ejercicio)" />
            <NumField label="Stock de Fe para los patrones" value={Cstock.raw} onChange={Cstock.setRaw} unit="ppm" />
            <NumField label="Declarado" value={decl.raw} onChange={decl.setRaw} unit="mg FeSO₄·7H₂O/mL" />
          </>
        }
        outputs={
          r && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="C Fe mínima" value={`${fmtSig(r.Cmin, 3)} M`} sub={`${fmtSig(ppmMin, 3)} ppm`} />
                <Stat label="C Fe máxima" value={`${fmtSig(r.Cmax, 3)} M`} sub={`${fmtSig(ppmMax, 3)} ppm`} />
              </div>
              <div className="text-sm">
                <div className="label">5 patrones en matraces de 50,00 mL (stock de {Cstock.raw} ppm):</div>
                <table className="table-basic">
                  <thead><tr><th>Patrón</th><th>ppm Fe</th><th>Alícuota de stock (mL)</th></tr></thead>
                  <tbody>{nice.map((c, i) => <tr key={i}><td>P{i + 1}</td><td className="font-mono">{fmtSig(c, 2)}</td><td className="font-mono">{fmtSig((c * 50) / Cstock.value!, 3)}</td></tr>)}</tbody>
                </table>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Sal de Mohr para 100,00 mL de stock de 200 ppm: {fmtSig((0.2 * 0.1 * P.MM.sal_Mohr) / P.MM.Fe, 4)} g; luego 10,00 → 100,00 mL da 20 ppm. Alícuotas no enteras: con bureta de 10,00 mL.</p>
              </div>
              <div className="text-sm">
                <div className="label">Muestra: {fmtSig(feSample, 4)} ppm de Fe. Esquemas de dilución hacia ≈ {fmtSig(mid, 2)} ppm (último matraz de 50,00 mL con los reactivos):</div>
                <ul className="list-disc pl-5">
                  {schemes.map((s, i) => (
                    <li key={i}>{s.steps.map(([p, f]) => `${p} → ${f} mL`).join(' ; ')} ⇒ {fmtSig(s.final, 3)} ppm</li>
                  ))}
                </ul>
              </div>
            </>
          )
        }
        steps={[{ tex: ['C_{min} = \\frac{A_{min}}{\\varepsilon\\, b};\\quad C_{max} = \\frac{A_{max}}{\\varepsilon\\, b}', '\\mathrm{ppm\\ Fe} = C\\,(\\mathrm{mol/L})\\cdot 55{,}845\\cdot 1000'] }]}
      />
      <CalibrationPractice
        xLabel="C (ppm Fe)"
        example={[
          ['0', '0,004', '0,005'],
          ['0,5', '0,103', '0,102'],
          ['1,0', '0,203', '0,204'],
          ['1,5', '0,302', '0,300'],
          ['2,0', '0,401', '0,403'],
          ['3,0', '0,598', '0,601'],
        ].map(([C, A1, A2]) => ({ C, A1, A2 }))}
        extra={({ model }) =>
          model && (model.id === 'lin' || model.id === 'lin0') ? (
            <Alert kind="info">
              Absortividad molar experimental: ε = pendiente × 55 845 = <strong>{fmtSig(model.b * 55845, 4)}</strong> L mol⁻¹ cm⁻¹ (teórica: {eps.raw}; diferencia {fmtSig(((model.b * 55845) / (eps.value ?? 11100) - 1) * 100, 2)} %). {modelEquation(model)}
            </Alert>
          ) : null
        }
        sampleTitle="Muestra (triplicado): Fe en el antianémico"
        sampleColumns={[
          { key: 'A1', label: 'A₁' },
          { key: 'A2', label: 'A₂' },
        ]}
        sampleExample={[
          ['0,309', '0,310'],
          ['0,306', '0,307'],
          ['0,311', '0,309'],
        ].map(([A1, A2]) => ({ A1, A2 }))}
        sampleResult={{
          key: 'fe',
          label: 'FeSO₄·7H₂O',
          unit: 'mg/mL',
          sig: 4,
          criterion: { kind: 'cv', maxCV: 10, minN: 3 },
          spec: decl.value ? { min: 0.94 * decl.value, max: 1.06 * decl.value, text: `USP: 94,0–106,0 % de lo declarado (${decl.raw} mg/mL)` } : undefined,
          fromConc: (c) => (Number.isFinite(fd) ? ((c * fd) / 1000) * (P.MM.FeSO4_7H2O / P.MM.Fe) : null),
        }}
      />
      <section className="card space-y-2">
        <h3 className="card-title">Esquema de dilución usado para la muestra</h3>
        <div className="grid gap-3 sm:grid-cols-5">
          <NumField label="Pipeta 1" value={p1.raw} onChange={p1.setRaw} unit="mL" />
          <NumField label="Matraz 1" value={f1.raw} onChange={f1.setRaw} unit="mL" />
          <NumField label="Pipeta 2" value={p2.raw} onChange={p2.setRaw} unit="mL" />
          <NumField label="Matraz 2" value={f2.raw} onChange={f2.setRaw} unit="mL" />
          <NumField label="Pipeta 3 (→ 50,00 mL)" value={p3.raw} onChange={p3.setRaw} unit="mL" />
        </div>
        <p className="text-sm">Factor de dilución total: <strong className="font-mono">{Number.isFinite(fd) ? fmtSig(fd, 5) : '—'}</strong>. Se usa en el cálculo de la muestra (arriba).</p>
      </section>
    </div>
  );
}
