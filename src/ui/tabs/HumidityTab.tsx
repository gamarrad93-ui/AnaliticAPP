/**
 * Pestaña: Humedad y base seca (determinación con peso constante y réplicas, convertidores, lote, ejemplo mixto).
 */
import { useMemo, useState } from 'react';
import { changeMoisture, dryToWet, hDryToWet, hWetToDry, moisture, wetToDry } from '../../chem/gravimetria/humedad';
import { gravimetricFactor, gravimetricResult } from '../../chem/gravimetria/factor';
import { EJEMPLO_HUMEDAD, EJEMPLO_PESADAS, EJEMPLO_SULFATO } from '../../chem/gravimetria/ejemplo';
import { summarize } from '../../chem/stats/descriptive';
import { fmtFixed, fmtSig, parseNumber, texNum } from '../../chem/numeric/format';
import { Alert, NumField, Segmented, SelectField, Stat } from '../components/fields';
import { Procedure } from '../components/Procedure';
import { SheetGrid, emptyRow, parseRow, type SheetColumn, type SheetRow } from '../components/SheetGrid';
import { exportCsv } from '../components/exporters';
import { checkNum, useNum } from '../hooks';
import { ConstantWeightCard, ReplicateSummary } from '../gravimetria/shared';

const COLS: SheetColumn[] = [
  { key: 'tara', label: 'Pesafiltro vacío (g)' },
  { key: 'humeda', label: 'Pesafiltro + muestra húmeda (g)' },
  { key: 'seca', label: 'Pesafiltro + muestra seca (g)' },
];

function moistureRow(row: SheetRow) {
  const v = parseRow(row);
  if (v.tara == null || v.humeda == null || v.seca == null) return null;
  const mh = v.humeda - v.tara;
  const ms = v.seca - v.tara;
  try {
    return { mh, ms, ...moisture(mh, ms) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

type Dir = 'bh2bs' | 'bs2bh';
type Batch = 'bh2bs' | 'bs2bh' | 'h1h2';

export default function HumidityTab() {
  // ---- determinación ----
  const [rows, setRows] = useState<SheetRow[]>(() => [emptyRow(COLS), emptyRow(COLS), emptyRow(COLS)]);
  const [pesadas, setPesadas] = useState<string | undefined>(undefined);
  const [useRow, setUseRow] = useState('0');
  const [showExample, setShowExample] = useState(false);
  const res = rows.map(moistureRow);
  const ok = res.flatMap((r) => (r && 'hBH' in r ? [r] : []));
  const Hmean = ok.length ? summarize(ok.map((r) => r.hBH)).mean : null;

  // ---- convertidores ----
  const [dir, setDir] = useState<Dir>('bh2bs');
  const cx = useNum('5,00');
  const cH = useNum('20');
  const [hdir, setHdir] = useState<Dir>('bh2bs');
  const hh = useNum('20');
  const x1 = useNum('10');
  const H1 = useNum('8');
  const H2 = useNum('12');
  const e = {
    cx: checkNum(cx.value, cx.raw, { min: 0 }),
    cH: checkNum(cH.value, cH.raw, { min: 0, max: 99.999 }),
    hh: checkNum(hh.value, hh.raw, { min: 0, max: hdir === 'bh2bs' ? 99.999 : 1e6 }),
    x1: checkNum(x1.value, x1.raw, { min: 0 }),
    H1: checkNum(H1.value, H1.raw, { min: 0, max: 99.999 }),
    H2: checkNum(H2.value, H2.raw, { min: 0, max: 99.999 }),
  };
  const conv = !e.cx && !e.cH ? (dir === 'bh2bs' ? wetToDry(cx.value!, cH.value!) : dryToWet(cx.value!, cH.value!)) : null;
  const hconv = !e.hh ? (hdir === 'bh2bs' ? hWetToDry(hh.value!) : hDryToWet(hh.value!)) : null;
  const x2 = !e.x1 && !e.H1 && !e.H2 ? changeMoisture(x1.value!, H1.value!, H2.value!) : null;

  // ---- lote ----
  const [batch, setBatch] = useState<Batch>('bh2bs');
  const [batchText, setBatchText] = useState('5,00\n4,87\n5,12');
  const bH = useNum('20');
  const bH2 = useNum('12');
  const bErr = {
    H: checkNum(bH.value, bH.raw, { min: 0, max: 99.999 }),
    H2: batch === 'h1h2' ? checkNum(bH2.value, bH2.raw, { min: 0, max: 99.999 }) : null,
  };
  const batchRows = useMemo(() => {
    const lines = batchText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return lines.map((l) => {
      const cells = l.split(/\t|;/);
      const label = cells.length > 1 ? cells[0].trim() : '';
      const raw = cells[cells.length - 1].trim();
      const v = parseNumber(raw);
      let out: number | null = null;
      if (v != null && !bErr.H && !bErr.H2) out = batch === 'bh2bs' ? wetToDry(v, bH.value!) : batch === 'bs2bh' ? dryToWet(v, bH.value!) : changeMoisture(v, bH.value!, bH2.value!);
      return { label, raw, v, out };
    });
  }, [batchText, batch, bH.value, bH2.value, bErr.H, bErr.H2]);
  const batchHead = batch === 'bh2bs' ? ['Resultado b.h.', 'Resultado b.s.'] : batch === 'bs2bh' ? ['Resultado b.s.', 'Resultado b.h.'] : [`Resultado con H = ${bH.raw} %`, `Resultado con H = ${bH2.raw} %`];
  const batchCsv = () =>
    exportCsv(
      [
        ['Conversión', batch === 'bh2bs' ? 'base húmeda → base seca' : batch === 'bs2bh' ? 'base seca → base húmeda' : 'de una humedad a otra', 'H (%)', bH.value ?? '', ...(batch === 'h1h2' ? ['H2 (%)', bH2.value ?? ''] : [])],
        [],
        ['Muestra', ...batchHead],
        ...batchRows.map((r, i) => [r.label || String(i + 1), r.v ?? r.raw, r.out ?? '']),
      ],
      'conversion-base-seca.csv',
    );

  // ---- ejemplo mixto ----
  const loadExample = () => {
    setRows(EJEMPLO_HUMEDAD.map((r) => ({ ...r })));
    setPesadas(EJEMPLO_PESADAS);
    setUseRow('0');
    setShowExample(true);
  };
  const F = gravimetricFactor('BaSO4', 'SO3').F;
  const sulf = EJEMPLO_SULFATO.map((r) => {
    const v = parseRow(r);
    const ppt = v.lleno! - v.crisol!;
    return { ppt, muestra: v.muestra!, ...gravimetricResult({ precipitate: ppt, sample: v.muestra!, F }) };
  });
  const sulfMean = summarize(sulf.map((s) => s.pct)).mean;

  return (
    <div className="space-y-4">
      <section className="card flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          Humedad por secado a peso constante y conversión de resultados entre base húmeda (tal cual) y base seca.
        </p>
        <button className="btn" onClick={loadExample}>Cargar ejemplo: humedad + sulfato (% SO₃ b.s.)</button>
      </section>

      {/* ---------- determinación ---------- */}
      <section className="card min-w-0 space-y-3">
        <h2 className="card-title">1. Determinación de humedad</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          En "pesafiltro + muestra seca" va la última pesada, ya a peso constante (podés verificarlo abajo). Enter pasa a la celda siguiente; podés pegar desde Excel.
        </p>
        <SheetGrid
          columns={COLS}
          rows={rows}
          onChange={setRows}
          computed={[
            { label: 'm húmeda (g)', render: (i) => (res[i] && 'mh' in res[i]! ? fmtFixed((res[i] as { mh: number }).mh, 4) : '') },
            { label: 'm seca (g)', render: (i) => (res[i] && 'ms' in res[i]! ? fmtFixed((res[i] as { ms: number }).ms, 4) : '') },
            { label: '% H b.h.', render: (i) => (res[i] && 'hBH' in res[i]! ? fmtFixed((res[i] as { hBH: number }).hBH, 2) : res[i] && 'error' in res[i]! ? '⚠' : '') },
            { label: '% H b.s.', render: (i) => (res[i] && 'hBS' in res[i]! ? fmtFixed((res[i] as { hBS: number }).hBS, 2) : '') },
            { label: '% materia seca', render: (i) => (res[i] && 'dry' in res[i]! ? fmtFixed((res[i] as { dry: number }).dry, 2) : '') },
          ]}
        />
        {res.some((r) => r && 'error' in r) && <Alert kind="error">Hay réplicas con la masa seca mayor que la húmeda: revisá las pesadas.</Alert>}
        <ReplicateSummary values={ok.map((r) => r.hBH)} label="% humedad (base húmeda)" />
        {ok.length > 0 && (
          <>
            <ReplicateSummary values={ok.map((r) => r.hBS)} label="% humedad (base seca)" />
            <ReplicateSummary values={ok.map((r) => r.dry)} label="% materia seca" />
            <Procedure
              steps={[
                { title: 'Réplica 1: masas', tex: [`m_h = ${texNum(ok[0].mh, 4)}\\ \\mathrm{g}`, `m_s = ${texNum(ok[0].ms, 4)}\\ \\mathrm{g}`] },
                { title: 'Humedad en base húmeda', tex: `\\%H_{bh} = \\frac{m_h - m_s}{m_h}\\times 100 = \\frac{${texNum(ok[0].water, 4)}}{${texNum(ok[0].mh, 5)}}\\times 100 = ${texNum(ok[0].hBH, 4)}\\ \\%` },
                { title: 'Humedad en base seca', tex: `\\%H_{bs} = \\frac{m_h - m_s}{m_s}\\times 100 = ${texNum(ok[0].hBS, 4)}\\ \\%` },
                { title: 'Materia seca', tex: `\\%MS = 100 - \\%H_{bh} = ${texNum(ok[0].dry, 4)}\\ \\%` },
              ]}
            />
          </>
        )}
      </section>

      <ConstantWeightCard
        title="2. Peso constante del pesafiltro con la muestra seca"
        initial={pesadas}
        onUse={(m) => setRows(rows.map((r, i) => (String(i) === useRow ? { ...r, seca: fmtFixed(m, 4) } : r)))}
        useLabel={`Usar en la réplica ${Number(useRow) + 1}`}
        extra={
          <SelectField label="Réplica donde se usa la última pesada" value={useRow} onChange={setUseRow} options={rows.map((_, i) => ({ value: String(i), label: `Réplica ${i + 1}` }))} className="max-w-xs" />
        }
      />

      {/* ---------- convertidores ---------- */}
      <section className="card min-w-0 space-y-3">
        <h2 className="card-title">3. Convertidores</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="text-sm font-semibold">Resultado: base húmeda ↔ base seca</div>
            <Segmented value={dir} onChange={setDir} options={[{ value: 'bh2bs', label: 'b.h. → b.s.' }, { value: 'bs2bh', label: 'b.s. → b.h.' }]} />
            <NumField label={`Resultado en ${dir === 'bh2bs' ? 'base húmeda' : 'base seca'}`} value={cx.raw} onChange={cx.setRaw} error={e.cx} hint="% m/m, mg/kg, etc. (misma unidad a la salida)" />
            <NumField label="Humedad de la muestra (b.h.)" value={cH.raw} onChange={cH.setRaw} unit="%" error={e.cH} />
            {conv != null && <Stat label={`Resultado en ${dir === 'bh2bs' ? 'base seca' : 'base húmeda'}`} value={fmtSig(conv, 4)} />}
            {conv != null && (
              <Procedure steps={[{ tex: dir === 'bh2bs' ? `X_{bs} = \\frac{X_{bh}}{1 - H_{bh}/100} = \\frac{${texNum(cx.value!, 4)}}{1 - ${texNum(cH.value!, 4)}/100} = ${texNum(conv, 4)}` : `X_{bh} = X_{bs}\\,(1 - H_{bh}/100) = ${texNum(cx.value!, 4)}\\times(1 - ${texNum(cH.value!, 4)}/100) = ${texNum(conv, 4)}` }]} />
            )}
          </div>
          <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="text-sm font-semibold">Humedad: base húmeda ↔ base seca</div>
            <Segmented value={hdir} onChange={setHdir} options={[{ value: 'bh2bs', label: 'H b.h. → H b.s.' }, { value: 'bs2bh', label: 'H b.s. → H b.h.' }]} />
            <NumField label={`Humedad en ${hdir === 'bh2bs' ? 'base húmeda' : 'base seca'}`} value={hh.raw} onChange={hh.setRaw} unit="%" error={e.hh} />
            {hconv != null && <Stat label={`Humedad en ${hdir === 'bh2bs' ? 'base seca' : 'base húmeda'}`} value={`${fmtSig(hconv, 4)} %`} />}
            {hconv != null && (
              <Procedure steps={[{ tex: hdir === 'bh2bs' ? `H_{bs} = \\frac{H_{bh}}{100 - H_{bh}}\\times 100 = ${texNum(hconv, 4)}\\ \\%` : `H_{bh} = \\frac{H_{bs}}{100 + H_{bs}}\\times 100 = ${texNum(hconv, 4)}\\ \\%` }]} />
            )}
          </div>
          <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="text-sm font-semibold">Resultado de una humedad a otra</div>
            <NumField label="Resultado X₁" value={x1.raw} onChange={x1.setRaw} error={e.x1} />
            <div className="grid grid-cols-2 gap-2">
              <NumField label="Humedad H₁" value={H1.raw} onChange={H1.setRaw} unit="%" error={e.H1} hint="la de la muestra analizada" />
              <NumField label="Humedad H₂" value={H2.raw} onChange={H2.setRaw} unit="%" error={e.H2} hint="a la que se informa (0 = base seca)" />
            </div>
            {x2 != null && <Stat label="Resultado X₂" value={fmtSig(x2, 4)} />}
            {x2 != null && <Procedure steps={[{ tex: `X_2 = X_1\\,\\frac{100 - H_2}{100 - H_1} = ${texNum(x1.value!, 4)}\\times\\frac{100 - ${texNum(H2.value!, 4)}}{100 - ${texNum(H1.value!, 4)}} = ${texNum(x2, 4)}` }]} />}
          </div>
        </div>
      </section>

      {/* ---------- lote ---------- */}
      <section className="card min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="card-title mb-0">4. Convertir muchos resultados juntos</h2>
          <Segmented value={batch} onChange={setBatch} options={[{ value: 'bh2bs', label: 'b.h. → b.s.' }, { value: 'bs2bh', label: 'b.s. → b.h.' }, { value: 'h1h2', label: 'H₁ → H₂' }]} />
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
          <div>
            <label className="label" htmlFor="batch">Pegá una columna de resultados (o dos columnas: muestra y resultado)</label>
            <textarea id="batch" className="input h-40 font-mono" value={batchText} onChange={(ev) => setBatchText(ev.target.value)} />
          </div>
          <div className="space-y-2">
            <NumField label={batch === 'h1h2' ? 'Humedad H₁' : 'Humedad (b.h.)'} value={bH.raw} onChange={bH.setRaw} unit="%" error={bErr.H} />
            {batch === 'h1h2' && <NumField label="Humedad H₂" value={bH2.raw} onChange={bH2.setRaw} unit="%" error={bErr.H2} />}
            <button className="btn w-full" onClick={batchCsv}>⬇ Exportar CSV</button>
          </div>
        </div>
        {batchRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table-basic">
              <thead><tr><th>Muestra</th><th>{batchHead[0]}</th><th>{batchHead[1]}</th></tr></thead>
              <tbody>
                {batchRows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.label || i + 1}</td>
                    <td className="font-mono">{r.v != null ? r.raw : <span className="text-red-700 dark:text-red-400">⚠ {r.raw}</span>}</td>
                    <td className="font-mono">{r.out != null ? fmtSig(r.out, 4) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- ejemplo mixto ---------- */}
      {showExample && Hmean != null && (
        <section className="card min-w-0 space-y-3">
          <h2 className="card-title">5. Ejemplo: sulfato como BaSO₄ → % SO₃ en base seca</h2>
          <p className="text-sm">
            Se determinó la humedad de la muestra (arriba) y, en otras porciones de la misma muestra tal cual, el sulfato precipitado como BaSO₄.
            El factor BaSO₄ → SO₃ es F = M(SO₃)/M(BaSO₄) = {fmtSig(F, 5)}.
          </p>
          <div className="overflow-x-auto">
            <table className="table-basic">
              <thead><tr><th>Réplica</th><th>Muestra (g)</th><th>BaSO₄ (g)</th><th>% SO₃ b.h.</th><th>% SO₃ b.s.</th></tr></thead>
              <tbody>
                {sulf.map((s, i) => (
                  <tr key={i}><td>{i + 1}</td><td className="font-mono">{fmtFixed(s.muestra, 4)}</td><td className="font-mono">{fmtFixed(s.ppt, 4)}</td><td className="font-mono">{fmtFixed(s.pct, 2)}</td><td className="font-mono">{fmtFixed(wetToDry(s.pct, Hmean), 2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Humedad media (b.h.)" value={`${fmtFixed(Hmean, 2)} %`} />
            <Stat label="% SO₃ base húmeda" value={`${fmtFixed(sulfMean, 2)} %`} />
            <Stat label="% SO₃ base seca" value={`${fmtFixed(wetToDry(sulfMean, Hmean), 2)} %`} />
          </div>
          <Procedure
            steps={[
              { title: 'Humedad media', tex: `\\bar H_{bh} = ${texNum(Hmean, 4)}\\ \\%` },
              { title: 'Sulfato, réplica 1', tex: `\\%SO_3 = \\frac{${texNum(sulf[0].ppt, 4)}\\times ${texNum(F, 5)}}{${texNum(sulf[0].muestra, 4)}}\\times 100 = ${texNum(sulf[0].pct, 4)}\\ \\%` },
              { title: 'Promedio en base seca', tex: `\\%SO_{3,bs} = \\frac{${texNum(sulfMean, 4)}}{1 - ${texNum(Hmean, 4)}/100} = ${texNum(wetToDry(sulfMean, Hmean), 4)}\\ \\%` },
            ]}
          />
          <a className="btn btn-primary" href={`#gravimetria?ej=sulfato&t=BaSO4&q=SO3&h=${fmtFixed(Hmean, 3)}`}>⚖️ Abrir este caso en Gravimetría</a>
        </section>
      )}
    </div>
  );
}
