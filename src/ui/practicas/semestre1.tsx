/**
 * Prácticos de laboratorio del 1er semestre (Cuaderneta QA I 2026): 1 a 7.
 * Todas las cuentas salen de src/chem/lab (probadas en src/chem/__tests__/lab.test.ts).
 */
import { useMemo, useState } from 'react';
import * as P from '../../chem/lab/practicas';
import { zFactor, conformity, TOLERANCES } from '../../chem/lab/volumetric';
import { fmtFixed, fmtSig, texNum } from '../../chem/numeric/format';
import { getCompound, getSystem } from '../../chem/data/acids';
import { equivalencePoints } from '../../chem/acidbase/titration';
import { evaluateIndicator } from '../../chem/acidbase/indicatorCheck';
import { INDICATORS } from '../../chem/data/indicators';
import { compoundToComponent } from '../../chem/acidbase/fromLibrary';
import { Alert, NumField, SelectField, Stat } from '../components/fields';
import { checkNum, useNum } from '../hooks';
import { CurveLink, Diagram, MassAdvice, PracticeHeader, ReplicateBlock } from './common';

const v = (x: number | null | undefined) => (x == null || !Number.isFinite(x) ? NaN : x);
const ok = (...xs: (number | null)[]) => xs.every((x) => x != null && Number.isFinite(x));
const n4 = (x: number) => fmtSig(x, 4);

/* ============ Práctico 1: verificación de material volumétrico ============ */
export function P1() {
  const [pip, setPip] = useState('pip5');
  const [bur, setBur] = useState('bur10');
  const Tp = TOLERANCES.find((t) => t.id === pip)!;
  const Tb = TOLERANCES.find((t) => t.id === bur)!;
  const block = (kind: 'pipeta' | 'bureta') => {
    const T = kind === 'pipeta' ? Tp : Tb;
    const maxMg = kind === 'pipeta' ? 5.0 : 10.0;
    const example =
      kind === 'pipeta'
        ? [
            ['45,1023', '50,0869', '21,0'],
            ['50,0869', '55,0720', '21,0'],
            ['55,0720', '60,0559', '21,0'],
            ['60,0559', '65,0461', '21,0'],
            ['65,0461', '70,0310', '21,0'],
          ]
        : [
            ['52,3310', '60,3089', '21,0'],
            ['60,3089', '68,2890', '21,0'],
            ['68,2890', '76,2642', '21,0'],
            ['76,2642', '84,2432', '21,0'],
          ];
    return (
      <ReplicateBlock
        key={kind}
        title={`Verificación de ${kind === 'pipeta' ? 'pipeta aforada' : 'bureta (tramo)'}`}
        columns={[
          { key: 'mi', label: 'Masa inicial (g)' },
          { key: 'mf', label: 'Masa final (g)' },
          { key: 'T', label: 'T (°C)' },
        ]}
        example={example.map(([mi, mf, T]) => ({ mi, mf, T }))}
        results={[
          {
            key: 'V20',
            label: 'V20',
            unit: 'mL',
            sig: 6,
            compute: (r) => (ok(r.mi, r.mf, r.T) ? (r.mf! - r.mi!) * zFactor(r.T!) : null),
            // 5,0 mg (pipeta) / 10,0 mg (bureta) de concordancia en masa ≈ el mismo valor en µL
            criterion: { kind: 'concordancia', maxRange: (maxMg / 1000) * 1.003, unit: `mL (≈ ${fmtFixed(maxMg, 1)} mg)` },
          },
        ]}
        after={([r]) => {
          if (!r || r.n < 2 || !Number.isFinite(r.s)) return null;
          const c = conformity(r.mean, r.s, r.n, T.nominal, T.tol, r.factor);
          return (
            <div className="grid gap-2 md:grid-cols-2">
              <Alert kind={c.capacityOk ? 'ok' : 'error'}>
                <strong>1) Capacidad de las medidas:</strong> s/√n = {fmtSig(c.capacityValue, 2)} mL {c.capacityOk ? '≤' : '>'} tolerancia/3 = {fmtSig(T.tol / 3, 2)} mL → {c.capacityOk ? 'CUMPLE' : 'NO CUMPLE'}
              </Alert>
              <Alert kind={c.accuracyOk ? 'ok' : 'error'}>
                <strong>2) Control de exactitud:</strong> |V20 − Vnom| + t·s/√n = {fmtSig(c.accuracyValue, 2)} mL {c.accuracyOk ? '≤' : '>'} tolerancia = {fmtSig(T.tol, 2)} mL → {c.accuracyOk ? 'CONFORME' : 'NO CONFORME'}
              </Alert>
            </div>
          );
        }}
        formula={[
          {
            title: 'Volumen de verificación a 20 °C',
            text: 'Z incluye la densidad del agua a la temperatura de trabajo, el empuje del aire (0,0012 g/mL; pesas de 8,0 g/mL) y la dilatación del vidrio borosilicato (γ = 1,0 × 10⁻⁵ °C⁻¹).',
            tex: ['V_{20} = m_{agua,aire,T}\\cdot Z(T)', 'Z = \\frac{1}{\\rho_{agua}(T)-\\rho_{aire}}\\left(1-\\frac{\\rho_{aire}}{\\rho_{pesas}}\\right)\\left[1-\\gamma(T-20)\\right]', `Z(20\\,°C) = ${texNum(zFactor(20), 5)};\\ Z(25\\,°C) = ${texNum(zFactor(25), 5)}\\ \\mathrm{mL/g}`],
          },
          { title: 'Criterios de conformidad', tex: ['\\frac{s}{\\sqrt n}\\le \\frac{\\text{tolerancia}}{3}', '|\\bar V_{20}-V_{nom}| + t_{95\\%}\\frac{s}{\\sqrt n}\\le \\text{tolerancia}'] },
        ]}
      />
    );
  };
  return (
    <div className="space-y-4">
      <PracticeHeader n={1} title="Verificación de la calibración de material volumétrico" objetivos={['Verificar la calibración de una pipeta de 5,00 mL.', 'Verificar el tramo 0–8 mL de una bureta de 10,00 mL.']}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Pipeta (volumen nominal y tolerancia)" value={pip} onChange={setPip} options={TOLERANCES.filter((t) => t.id.startsWith('pip')).map((t) => ({ value: t.id, label: `${t.label} (±${fmtFixed(t.tol, 3)} mL)` }))} />
          <SelectField label="Bureta (tramo y tolerancia)" value={bur} onChange={setBur} options={TOLERANCES.filter((t) => t.id.startsWith('bur')).map((t) => ({ value: t.id, label: `${t.label} (±${fmtFixed(t.tol, 3)} mL)` }))} />
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">Tolerancias típicas de material clase A; verificá las de tu material en el certificado del fabricante.</p>
      </PracticeHeader>
      {block('pipeta')}
      {block('bureta')}
    </div>
  );
}

/* ============ Práctico 2: HCl vs Na2CO3 ============ */
export function P2() {
  const C = useNum('0,250');
  const G = useNum('8');
  const A = useNum('100');
  const pur = useNum('37');
  const d = useNum('1,18');
  const Vp = useNum('1000');
  const okD = ok(C.value, G.value, A.value, pur.value, d.value, Vp.value);
  const m = okD ? P.massForGasto(G.value!, C.value!, 1 / 2, P.MM.Na2CO3, A.value!) : NaN;
  const Vc = okD ? P.concentratedVolume(C.value!, Vp.value!, P.MM.HCl, pur.value!, d.value!) : NaN;
  const Ca = m / P.MM.Na2CO3 / 0.02;
  return (
    <div className="space-y-4">
      <PracticeHeader n={2} title="Preparación y estandarización de HCl aprox. 0,250 M" objetivos={['Preparar HCl ≈ 0,250 M a partir de HCl concentrado.', 'Estandarizarlo contra Na₂CO₃ patrón primario (heliantina, hasta el 2º punto equivalente).']} reacciones={['Na₂CO₃ + 2 HCl → H₂CO₃ + 2 NaCl']} />
      <Diagram
        inputs={
          <>
            <NumField label="Concentración aproximada de HCl" value={C.raw} onChange={C.setRaw} unit="M" error={checkNum(C.value, C.raw, { positive: true })} />
            <NumField label="Gasto deseado (bureta de 10,00 mL)" value={G.raw} onChange={G.setRaw} unit="mL" error={checkNum(G.value, G.raw, { positive: true, max: 10 })} />
            <NumField label="Assay del Na₂CO₃" value={A.raw} onChange={A.setRaw} unit="%" error={checkNum(A.value, A.raw, { positive: true, max: 100 })} />
            <NumField label="HCl concentrado: % m/m" value={pur.raw} onChange={pur.setRaw} unit="%" error={checkNum(pur.value, pur.raw, { positive: true, max: 100 })} hint="Ver la etiqueta: 36–38 %" />
            <NumField label="HCl concentrado: densidad" value={d.raw} onChange={d.setRaw} unit="g/mL" error={checkNum(d.value, d.raw, { positive: true })} hint="1,16–1,18 g/mL" />
            <NumField label="Volumen a preparar" value={Vp.raw} onChange={Vp.setRaw} unit="mL" error={checkNum(Vp.value, Vp.raw, { positive: true })} />
          </>
        }
        outputs={
          okD && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Toma de HCl concentrado" value={`${fmtSig(Vc, 3)} mL`} sub={`para ${Vp.raw} mL (usar probeta o pipeta graduada, en campana)`} />
                <Stat label="Masa de Na₂CO₃" value={`${n4(m)} g`} sub={`para gastar ${G.raw} mL`} />
              </div>
              <MassAdvice m={m} />
              <CurveLink params={{ a: 'Na2CO3', ca: Number(Ca.toPrecision(4)), va: 20, t: 'HCl', ct: C.value!, ind: 'naranja-metilo', pe: 2 }} />
            </>
          )
        }
        steps={[
          { title: 'Estequiometría', tex: `n_{Na_2CO_3} = \\tfrac{1}{2}\\,n_{HCl} \\Rightarrow m = \\frac{G\\cdot C_{HCl}}{2\\cdot 1000}\\cdot\\frac{MM}{\\text{Assay}/100} = ${texNum(m, 4)}\\ \\mathrm{g}` },
          { title: 'Dilución del ácido concentrado', tex: `V_{conc} = \\frac{C\\cdot V\\cdot MM_{HCl}}{(\\%/100)\\cdot d} = ${texNum(Vc, 4)}\\ \\mathrm{mL}` },
        ]}
      />
      <ReplicateBlock
        title="Datos experimentales y concentración de HCl"
        columns={[
          { key: 'm', label: 'm Na₂CO₃ (g)' },
          { key: 'G', label: 'G corregido (mL)' },
        ]}
        example={[
          { m: '0,1061', G: '7,968' },
          { m: '0,1048', G: '7,872' },
          { m: '0,1072', G: '8,049' },
          { m: '0,1055', G: '7,890' },
          { m: '0,1066', G: '8,004' },
        ]}
        results={[{ key: 'C', label: 'C HCl', unit: 'M', compute: (r) => (ok(r.m, r.G) ? P.cHClvsNa2CO3(r.m!, r.G!, v(A.value)) : null), criterion: { kind: 'sigma', sigmaR: 0.0003 } }]}
        formula={[{ tex: 'C_{HCl}\\,(\\mathrm{mol/L}) = \\frac{2\\cdot m_{Na_2CO_3}\\,(\\mathrm g)\\cdot(\\text{Assay}/100)\\cdot 1000}{MM_{Na_2CO_3}\\cdot G\\,(\\mathrm{mL})}' }]}
      />
    </div>
  );
}

/** Columnas comunes para "toma en volumen" de un patrón (m en matraz, alícuota con pipeta). */
const volCols = (solid: string) => [
  { key: 'm', label: `m ${solid} (g)` },
  { key: 'Vm', label: 'V20 matraz (mL)' },
  { key: 'Vp', label: 'V20 pipeta (mL)' },
  { key: 'G', label: 'G corregido (mL)' },
];

/* ============ Práctico 3: NaOH vs H2C2O4·2H2O ============ */
export function P3() {
  const C = useNum('0,1');
  const G = useNum('8');
  const A = useNum('100');
  const Vm = useNum('100');
  const Vp = useNum('10');
  const okD = ok(C.value, G.value, A.value, Vm.value, Vp.value);
  const m = okD ? P.massForGasto(G.value!, C.value!, 1 / 2, P.MM.H2C2O4_2H2O, A.value!) : NaN;
  const stock = okD ? P.aliquotSuggestion(m, Vm.value!, Vp.value!) : undefined;
  const Ca = m / P.MM.H2C2O4_2H2O / 0.02;
  return (
    <div className="space-y-4">
      <PracticeHeader n={3} title="Estandarización de NaOH aprox. 0,1 M" objetivos={['Estandarizar NaOH ≈ 0,1 M contra H₂C₂O₄·2H₂O patrón primario (fenolftaleína, 2º punto equivalente).']} reacciones={['2 NaOH + H₂C₂O₄ → Na₂C₂O₄ + 2 H₂O']} />
      <Diagram
        inputs={
          <>
            <NumField label="Concentración aproximada de NaOH" value={C.raw} onChange={C.setRaw} unit="M" error={checkNum(C.value, C.raw, { positive: true })} />
            <NumField label="Gasto deseado" value={G.raw} onChange={G.setRaw} unit="mL" error={checkNum(G.value, G.raw, { positive: true, max: 10 })} />
            <NumField label="Assay del H₂C₂O₄·2H₂O" value={A.raw} onChange={A.setRaw} unit="%" error={checkNum(A.value, A.raw, { positive: true, max: 100 })} />
            <NumField label="Matraz aforado (toma en volumen)" value={Vm.raw} onChange={Vm.setRaw} unit="mL" error={checkNum(Vm.value, Vm.raw, { positive: true })} />
            <NumField label="Pipeta aforada (alícuota)" value={Vp.raw} onChange={Vp.setRaw} unit="mL" error={checkNum(Vp.value, Vp.raw, { positive: true })} />
          </>
        }
        outputs={
          okD && (
            <>
              <Stat label="H₂C₂O₄·2H₂O necesario en el matraz de valoración" value={`${n4(m)} g`} sub={`para gastar ${G.raw} mL`} />
              <MassAdvice m={m} stock={stock} />
              <CurveLink params={{ a: 'H2C2O4', ca: Number(Ca.toPrecision(4)), va: 20, t: 'NaOH', ct: C.value!, ind: 'fenolftaleina', pe: 2 }} />
            </>
          )
        }
        steps={[{ tex: `n_{H_2C_2O_4} = \\tfrac{1}{2}\\,n_{NaOH} \\Rightarrow m = \\frac{G\\cdot C}{2\\cdot 1000}\\cdot\\frac{${fmtFixed(P.MM.H2C2O4_2H2O, 2).replace(',', '{,}')}}{\\text{Assay}/100} = ${texNum(m, 4)}\\ \\mathrm g` }]}
      />
      <ReplicateBlock
        title="Datos experimentales y concentración de NaOH"
        columns={volCols('H₂C₂O₄·2H₂O')}
        note={<p className="text-sm text-slate-600 dark:text-slate-400">Si la toma fue directa en masa, poné el mismo valor en V20 matraz y V20 pipeta (por ejemplo 1 y 1).</p>}
        example={['8,02', '7,99', '8,05', '8,00', '8,11'].map((G) => ({ m: '0,5051', Vm: '100,04', Vp: '10,006', G }))}
        results={[{ key: 'C', label: 'C NaOH', unit: 'M', compute: (r) => (ok(r.m, r.G, r.Vp, r.Vm) ? P.cNaOHvsOxalico(r.m!, r.G!, v(A.value), r.Vp!, r.Vm!) : null), criterion: { kind: 'sigma', sigmaR: 0.0003 } }]}
        formula={[{ tex: 'C_{NaOH} = \\frac{2\\cdot m\\cdot(\\text{Assay}/100)\\cdot\\frac{V_{pipeta}}{V_{matraz}}\\cdot 1000}{MM\\cdot G}' }]}
      />
    </div>
  );
}

/* ============ Práctico 4: % m-m de ácido cítrico ============ */
export function P4() {
  const C = useNum('0,1');
  const G = useNum('8');
  const Assay = useNum('99,5');
  const Vm = useNum('100');
  const Vp = useNum('10');
  const okD = ok(C.value, G.value, Vm.value, Vp.value);
  const m = okD ? P.massForGasto(G.value!, C.value!, 1 / 3, P.MM.citrico_H2O) : NaN;
  const stock = okD ? P.aliquotSuggestion(m, Vm.value!, Vp.value!) : undefined;
  const Ca = m / P.MM.citrico_H2O / 0.02;
  // indicador sugerido por el motor exacto
  const indic = useMemo(() => {
    if (!okD) return null;
    const s = { analyte: [compoundToComponent(getCompound('H3Cit')!, Ca)], Va: 20, titrant: compoundToComponent(getCompound('NaOH')!, C.value!) };
    const eq = equivalencePoints(s).eq;
    const last = eq[eq.length - 1];
    const res = INDICATORS.map((i) => evaluateIndicator(s, i, [last], last.V * 1.5)).filter((r) => r.errorPct != null).sort((a, b) => Math.abs(a.errorPct!) - Math.abs(b.errorPct!));
    return { pHeq: last.pH, best: res[0] };
  }, [okD, Ca, C.value]);
  const sys = getSystem('citrico')!;
  return (
    <div className="space-y-4">
      <PracticeHeader n={4} title="Determinación del % m-m de una muestra de ácido cítrico monohidrato" objetivos={['Determinar el % m-m de C₆H₈O₇·H₂O con NaOH 0,1 M valorado.', 'Comparar con el Assay declarado y evaluar la veracidad (sesgo).']} reacciones={['H₃Cit + 3 NaOH → Na₃Cit + 3 H₂O']}>
        <Alert kind="info">
          pKa usados por la app: {sys.pKa.map((p) => fmtFixed(p, 2)).join('; ')}. El tercero varía bastante entre tablas (5,40 a 6,40): conviene confirmarlo con el docente. Con cualquiera de los dos los tres protones se valoran juntos y se detecta un solo punto final.
        </Alert>
      </PracticeHeader>
      <Diagram
        inputs={
          <>
            <NumField label="Concentración de NaOH (valorada)" value={C.raw} onChange={C.setRaw} unit="M" error={checkNum(C.value, C.raw, { positive: true })} />
            <NumField label="Gasto deseado" value={G.raw} onChange={G.setRaw} unit="mL" error={checkNum(G.value, G.raw, { positive: true, max: 10 })} />
            <NumField label="Matraz aforado" value={Vm.raw} onChange={Vm.setRaw} unit="mL" />
            <NumField label="Pipeta aforada" value={Vp.raw} onChange={Vp.setRaw} unit="mL" />
            <NumField label="Assay declarado (CoA)" value={Assay.raw} onChange={Assay.setRaw} unit="%" />
          </>
        }
        outputs={
          okD && (
            <>
              <Stat label="Ácido cítrico·H₂O (si fuera 100 %)" value={`${n4(m)} g`} sub={`para gastar ${G.raw} mL (3er punto equivalente)`} />
              <MassAdvice m={m} stock={stock} />
              {indic?.best && (
                <Alert kind="info">
                  pH en el punto equivalente (cálculo exacto): <strong>{fmtFixed(indic.pHeq, 2)}</strong>. Indicador con menor error: <strong>{indic.best.indicator.name}</strong> ({indic.best.errorPct! >= 0 ? '+' : ''}{fmtSig(indic.best.errorPct!, 2)} %).
                </Alert>
              )}
              <CurveLink params={{ a: 'H3Cit', ca: Number(Ca.toPrecision(4)), va: 20, t: 'NaOH', ct: C.value!, ind: 'fenolftaleina', pe: 3 }} />
            </>
          )
        }
        steps={[{ tex: `n_{cítrico} = \\tfrac{1}{3}\\,n_{NaOH};\\quad \\%\\,m\\text{-}m = \\frac{C\\cdot G\\cdot MM\\cdot (V_m/V_p)}{3\\cdot 1000\\cdot m}\\cdot 100` }]}
      />
      <ReplicateBlock
        title="Datos experimentales y % m-m"
        columns={volCols('muestra')}
        example={['7,98', '8,01', '7,96', '8,03', '7,99', '8,25'].map((G) => ({ m: '0,5610', Vm: '100,02', Vp: '10,003', G }))}
        results={[
          {
            key: 'pct',
            label: '% m-m ácido cítrico·H₂O',
            unit: '%',
            compute: (r) => (ok(r.m, r.G, r.Vp, r.Vm, C.value) ? P.pctCitrico(C.value!, r.G!, r.m!, r.Vp!, r.Vm!) : null),
            criterion: { kind: 'dixon' },
            reference: Assay.value != null ? { value: Assay.value, label: 'Assay declarado' } : undefined,
          },
        ]}
      />
    </div>
  );
}

/* ============ Práctico 5: alcalinidad (Na2CO3 + NaHCO3) ============ */
export function P5() {
  const Cco3 = useNum('0,075');
  const Chco3 = useNum('0,050');
  const Chcl = useNum('0,125');
  const G1 = useNum('3');
  const okD = ok(Cco3.value, Chco3.value, Chcl.value, G1.value);
  const VT = okD ? P.volumeForGasto(G1.value!, Chcl.value!, 1, Cco3.value!) : NaN;
  const G2 = okD ? ((2 * Cco3.value! + Chco3.value!) * VT) / Chcl.value! : NaN;
  const VTin = useNum('5,00');
  return (
    <div className="space-y-4">
      <PracticeHeader
        n={5}
        title="Determinación de la alcalinidad de una mezcla de sales básicas"
        objetivos={['Determinar las concentraciones de Na₂CO₃ y NaHCO₃ por valoración con HCl 0,125 M y dos indicadores.']}
        reacciones={['Hasta fenolftaleína (G1): Na₂CO₃ + HCl → NaHCO₃ + NaCl', 'Hasta heliantina (G2, total): Na₂CO₃ + 2 HCl → H₂CO₃ + 2 NaCl;  NaHCO₃ + HCl → H₂CO₃ + NaCl']}
      />
      <Diagram
        inputs={
          <>
            <NumField label="[CO₃²⁻] aproximada" value={Cco3.raw} onChange={Cco3.setRaw} unit="M" />
            <NumField label="[HCO₃⁻] aproximada" value={Chco3.raw} onChange={Chco3.setRaw} unit="M" />
            <NumField label="C HCl" value={Chcl.raw} onChange={Chcl.setRaw} unit="M" />
            <NumField label="Gasto deseado hasta fenolftaleína (G1)" value={G1.raw} onChange={G1.setRaw} unit="mL" />
          </>
        }
        outputs={
          okD && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Volumen de solución problema (V_T)" value={`${fmtSig(VT, 3)} mL`} sub="completar con agua hasta 20 mL" />
                <Stat label="Gasto total esperado hasta heliantina (G2)" value={`${fmtSig(G2, 3)} mL`} />
              </div>
              <CurveLink
                params={{ a: 'Na2CO3', ca: Number(((Cco3.value! * VT) / 20).toPrecision(4)), a2: 'NaHCO3', ca2: Number(((Chco3.value! * VT) / 20).toPrecision(4)), va: 20, t: 'HCl', ct: Chcl.value!, ind: 'fenolftaleina', pe: 1 }}
              />
            </>
          )
        }
        steps={[{ tex: ['V_T = \\frac{G_1\\cdot C_{HCl}}{[CO_3^{2-}]}', 'G_2 = \\frac{(2[CO_3^{2-}] + [HCO_3^-])\\cdot V_T}{C_{HCl}}'] }]}
      />
      <ReplicateBlock
        title="Datos experimentales"
        note={
          <div className="grid gap-3 sm:grid-cols-2">
            <NumField label="V20 pipeta de toma (V_T)" value={VTin.raw} onChange={VTin.setRaw} unit="mL" />
            <p className="text-sm text-slate-600 dark:text-slate-400">G2 es el gasto acumulado desde el inicio hasta el viraje de la heliantina. Se usa la C del HCl de la diagramación ({Chcl.raw} M).</p>
          </div>
        }
        columns={[
          { key: 'G1', label: 'G1 corregido (mL)' },
          { key: 'G2', label: 'G2 corregido (mL)' },
        ]}
        example={[
          ['3,02', '8,01'],
          ['2,99', '7,98'],
          ['3,01', '8,03'],
          ['3,04', '8,06'],
          ['3,00', '8,00'],
          ['2,98', '7,97'],
        ].map(([G1, G2]) => ({ G1, G2 }))}
        results={[
          { key: 'co3', label: 'C Na₂CO₃', unit: 'M', compute: (r) => (ok(r.G1, r.G2, Chcl.value, VTin.value) ? P.alcalinidad(Chcl.value!, r.G1!, r.G2!, VTin.value!).Na2CO3 : null), criterion: { kind: 'dixon' } },
          { key: 'hco3', label: 'C NaHCO₃', unit: 'M', compute: (r) => (ok(r.G1, r.G2, Chcl.value, VTin.value) ? P.alcalinidad(Chcl.value!, r.G1!, r.G2!, VTin.value!).NaHCO3 : null), criterion: { kind: 'dixon' } },
        ]}
        formula={[{ tex: ['C_{Na_2CO_3} = \\frac{C_{HCl}\\cdot G_1}{V_T}', 'C_{NaHCO_3} = \\frac{C_{HCl}\\cdot (G_2 - 2G_1)}{V_T}'] }]}
      />
    </div>
  );
}

/* ============ Práctico 6: NiSO4·6H2O por retrovaloración con EDTA / Mg ============ */
export function P6() {
  const mNi = useNum('0,1000');
  const GB = useNum('8,00');
  const GR = useNum('2,00');
  const VE = useNum('10,00');
  const nDet = useNum('6');
  const VMg = useNum('100');
  const VEd = useNum('250');
  const Assay = useNum('99');
  const okD = ok(mNi.value, GB.value, GR.value, VE.value, nDet.value, VMg.value, VEd.value) && GB.value! > GR.value!;
  const CMg = okD ? mNi.value! / P.MM.NiSO4_6H2O / ((GB.value! - GR.value!) / 1000) : NaN;
  const CEd = okD ? (CMg * GB.value!) / VE.value! : NaN;
  const needMg = okD ? nDet.value! * (GB.value! + GR.value!) : NaN;
  const needEd = okD ? 2 * nDet.value! * VE.value! : NaN;
  const mMg = (CMg * VMg.value!) / 1000 * P.MM.MgSO4_7H2O;
  const mEd = (CEd * VEd.value!) / 1000 * P.MM.EDTA_Na2_2H2O;
  const CMgIn = useNum('0,06352');
  return (
    <div className="space-y-4">
      <PracticeHeader n={6} title="Determinación complejométrica del % m-m de NiSO₄·6H₂O" objetivos={['Retrovaloración: exceso conocido de EDTA y valoración del sobrante con MgSO₄·7H₂O (NET, pH 10).', 'Comparar con el Assay declarado.']} reacciones={['Ni²⁺ + H₂Y²⁻ → NiY²⁻ + 2H⁺ (exceso de EDTA)', 'Mg²⁺ + H₂Y²⁻ (sobrante) → MgY²⁻ + 2H⁺', 'Punto final: primer exceso de Mg²⁺ → Mg-NET (rojo)']} />
      <Diagram
        inputs={
          <>
            <NumField label="Toma de sal de Ni²⁺" value={mNi.raw} onChange={mNi.setRaw} unit="g" />
            <NumField label="Gasto en el blanco (Mg)" value={GB.raw} onChange={GB.setRaw} unit="mL" />
            <NumField label="Gasto en la retrovaloración (Mg)" value={GR.raw} onChange={GR.setRaw} unit="mL" />
            <NumField label="Toma de EDTA (pipeta)" value={VE.raw} onChange={VE.setRaw} unit="mL" />
            <NumField label="Determinaciones (blancos y retros)" value={nDet.raw} onChange={nDet.setRaw} />
            <NumField label="Volumen a preparar de MgSO₄" value={VMg.raw} onChange={VMg.setRaw} unit="mL" />
            <NumField label="Volumen a preparar de EDTA" value={VEd.raw} onChange={VEd.setRaw} unit="mL" />
          </>
        }
        outputs={
          okD && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="C MgSO₄·7H₂O" value={`${n4(CMg)} M`} sub={`masa para ${VMg.raw} mL: ${n4(mMg)} g`} />
                <Stat label="C EDTA" value={`${n4(CEd)} M`} sub={`Na₂H₂Y·2H₂O para ${VEd.raw} mL: ${n4(mEd)} g`} />
                <Stat label="Mg²⁺ necesario" value={`${fmtSig(needMg, 3)} mL`} sub={`${nDet.raw} blancos + ${nDet.raw} retros`} />
                <Stat label="EDTA necesario" value={`${fmtSig(needEd, 3)} mL`} />
              </div>
              {(needMg > VMg.value! || needEd > VEd.value!) && <Alert kind="warn">El volumen a preparar no alcanza para todas las determinaciones (más el enjuague de la bureta).</Alert>}
            </>
          )
        }
        steps={[
          { tex: ['n_{Ni} = C_{Mg}\\,(G_B - G_R) \\Rightarrow C_{Mg} = \\frac{m_{Ni}/MM}{(G_B-G_R)/1000}', 'C_{EDTA}\\cdot V_{EDTA} = C_{Mg}\\cdot G_B'] },
        ]}
      />
      <ReplicateBlock
        title="Datos experimentales y % m-m de NiSO₄·6H₂O"
        note={<NumField label="C MgSO₄·7H₂O (patrón primario preparado)" value={CMgIn.raw} onChange={CMgIn.setRaw} unit="M" className="max-w-xs" />}
        columns={[
          { key: 'm0', label: 'm₀ NiSO₄·6H₂O (g)' },
          { key: 'GB', label: 'G blanco corr. (mL)' },
          { key: 'GR', label: 'G retro corr. (mL)' },
        ]}
        example={[
          ['0,1003', '8,01', '1,99'],
          ['0,0998', '7,99', '2,03'],
          ['0,1011', '8,02', '1,95'],
          ['0,0995', '8,00', '2,05'],
          ['0,1006', '8,01', '1,97'],
          ['0,1001', '7,98', '2,02'],
        ].map(([m0, GB, GR]) => ({ m0, GB, GR }))}
        results={[
          {
            key: 'pct',
            label: '% m-m NiSO₄·6H₂O',
            unit: '%',
            compute: (r) => (ok(r.m0, r.GB, r.GR, CMgIn.value) ? P.pctNiquel(CMgIn.value!, r.GB!, r.GR!, r.m0!) : null),
            criterion: { kind: 'dixon' },
            reference: Assay.value != null ? { value: Assay.value, label: 'Assay declarado' } : undefined,
          },
        ]}
        after={() => <NumField label="Assay declarado (CoA)" value={Assay.raw} onChange={Assay.setRaw} unit="%" className="max-w-xs" />}
        formula={[{ tex: ['m_{NiSO_4\\cdot 6H_2O} = MM\\cdot C_{Mg}\\cdot (G_B - G_R)\\ \\ (G\\ \\text{en L})', '\\%\\,m\\text{-}m = \\frac{m_{NiSO_4\\cdot 6H_2O}}{m_0}\\cdot 100'] }]}
      />
    </div>
  );
}

/* ============ Práctico 7: KMnO4 y H2O2 ============ */
export function P7() {
  const CK = useNum('0,02');
  const G = useNum('8');
  const Vm = useNum('100');
  const Vp = useNum('10');
  const vol = useNum('10');
  const okD = ok(CK.value, G.value, Vm.value, Vp.value, vol.value);
  const m = okD ? P.massForGasto(G.value!, CK.value!, 5 / 2, P.MM.H2C2O4_2H2O) : NaN;
  const stock = okD ? P.aliquotSuggestion(m, Vm.value!, Vp.value!) : undefined;
  const Vreq = okD ? P.volumeForGasto(G.value!, CK.value!, 5 / 2, vol.value! / 11.2) : NaN;
  // esquemas: tomar p mL de muestra → matraz f → alícuota a
  const schemes = useMemo(() => {
    if (!Number.isFinite(Vreq)) return [];
    const pip = [1, 2, 5, 10];
    const fl = [50, 100];
    const out: { p: number; f: number; a: number; Veq: number; G: number }[] = [];
    for (const p of pip) for (const f of fl) for (const a of pip) {
      const Veq = (p * a) / f;
      out.push({ p, f, a, Veq, G: (Veq / Vreq) * G.value! });
    }
    return out.filter((s) => s.G >= 5 && s.G <= 9.5).sort((x, y) => Math.abs(x.G - G.value!) - Math.abs(y.G - G.value!)).slice(0, 4);
  }, [Vreq, G.value]);
  const CKin = useNum('0,02008');
  const Vorig = useNum('5,00');
  const minVol = (2.5 * 10) / P.MM.H2O2 * 11.2;
  const maxVol = (3.5 * 10) / P.MM.H2O2 * 11.2;
  return (
    <div className="space-y-4">
      <PracticeHeader
        n={7}
        title="Valoración de una solución de H₂O₂ con KMnO₄ previamente estandarizado"
        objetivos={['Estandarizar KMnO₄ ≈ 0,02 M con H₂C₂O₄·2H₂O (en caliente).', 'Determinar el H₂O₂ de uso tópico (≈ 10 vol) y verificar la especificación USP.']}
        reacciones={['5 H₂C₂O₄ + 2 KMnO₄ + 3 H₂SO₄ → 10 CO₂ + 2 MnSO₄ + K₂SO₄ + 8 H₂O', '5 H₂O₂ + 2 KMnO₄ + 3 H₂SO₄ → 5 O₂ + 2 MnSO₄ + K₂SO₄ + 8 H₂O']}
      />
      <Diagram
        inputs={
          <>
            <NumField label="C KMnO₄ aproximada" value={CK.raw} onChange={CK.setRaw} unit="M" />
            <NumField label="Gasto deseado" value={G.raw} onChange={G.setRaw} unit="mL" />
            <NumField label="Matraz para el patrón" value={Vm.raw} onChange={Vm.setRaw} unit="mL" />
            <NumField label="Pipeta (alícuota del patrón)" value={Vp.raw} onChange={Vp.setRaw} unit="mL" />
            <NumField label="H₂O₂ declarado" value={vol.raw} onChange={vol.setRaw} unit="vol" />
          </>
        }
        outputs={
          okD && (
            <>
              <Stat label="H₂C₂O₄·2H₂O para estandarizar" value={`${n4(m)} g`} sub={`para gastar ${G.raw} mL`} />
              <MassAdvice m={m} stock={stock} />
              <Stat label="H₂O₂ original equivalente a ese gasto" value={`${fmtSig(Vreq, 3)} mL`} sub={`${vol.raw} vol = ${fmtSig(vol.value! / 11.2, 3)} M`} />
              {schemes.length > 0 && (
                <div className="text-sm">
                  <div className="label">Esquemas de dilución posibles (muestra → matraz → alícuota):</div>
                  <ul className="list-disc pl-5">
                    {schemes.map((s, i) => (
                      <li key={i}>
                        {s.p},00 mL de muestra → matraz de {s.f},00 mL → alícuota de {s.a},00 mL ⇒ gasto ≈ <strong>{fmtSig(s.G, 3)} mL</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )
        }
        steps={[{ tex: ['n_{ox} = \\tfrac52\\,n_{MnO_4^-};\\quad n_{H_2O_2} = \\tfrac52\\,n_{MnO_4^-}', '1\\ \\text{vol} \\equiv 1\\ \\mathrm L\\ O_2\\ (CNPT)\\ \\text{por L} \\Rightarrow C(\\mathrm{vol}) = C(\\mathrm M)\\cdot 11{,}2'] }]}
      />
      <ReplicateBlock
        title="1. Estandarización del KMnO₄"
        columns={volCols('H₂C₂O₄·2H₂O')}
        example={['8,02', '8,00', '7,97', '8,01', '8,04'].map((G) => ({ m: '0,5060', Vm: '100,04', Vp: '10,006', G }))}
        results={[{ key: 'C', label: 'C KMnO₄', unit: 'M', compute: (r) => (ok(r.m, r.G, r.Vp, r.Vm) ? P.cKMnO4(r.m!, r.G!, 100, r.Vp!, r.Vm!) : null), criterion: { kind: 'sigma', sigmaR: 5.1e-5 } }]}
        formula={[{ tex: 'C_{KMnO_4} = \\frac{2}{5}\\cdot\\frac{m\\cdot(\\text{Assay}/100)\\cdot\\frac{V_p}{V_m}\\cdot 1000}{MM_{ox}\\cdot G}' }]}
      />
      <ReplicateBlock
        title="2. Valoración de la muestra de H₂O₂"
        note={
          <div className="grid gap-3 sm:grid-cols-2">
            <NumField label="C KMnO₄ (valorada)" value={CKin.raw} onChange={CKin.setRaw} unit="M" />
            <NumField label="V20 pipeta de toma de muestra original" value={Vorig.raw} onChange={Vorig.setRaw} unit="mL" />
          </div>
        }
        columns={[
          { key: 'Vmat', label: 'V20 matraz dilución (mL)' },
          { key: 'Val', label: 'V20 pipeta alícuota (mL)' },
          { key: 'G', label: 'G KMnO₄ corr. (mL)' },
        ]}
        example={['8,91', '8,95', '8,93', '8,97', '8,92'].map((G) => ({ Vmat: '100,04', Val: '10,006', G }))}
        results={[
          {
            key: 'vol',
            label: 'C H₂O₂',
            unit: 'vol',
            compute: (r) => (ok(r.Vmat, r.Val, r.G, CKin.value, Vorig.value) ? P.volH2O2(CKin.value!, r.G!, Vorig.value!, r.Vmat!, r.Val!) : null),
            criterion: { kind: 'sigma', sigmaR: 0.025 },
            spec: { min: minVol, max: maxVol, text: `USP: 2,5–3,5 g de H₂O₂ por 100 mL (≡ ${fmtSig(minVol, 3)}–${fmtSig(maxVol, 3)} vol)` },
          },
        ]}
        formula={[{ tex: ['C_{H_2O_2}(\\mathrm{vol}) = \\frac52\\cdot\\frac{C_{KMnO_4}\\cdot G}{V_{orig}\\cdot V_{alic}/V_{matraz}}\\cdot 11{,}2', '\\mathrm{g/100\\,mL} = \\frac{\\text{vol}}{11{,}2}\\cdot\\frac{34{,}02}{10}'] }]}
      />
    </div>
  );
}
