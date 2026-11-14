/** Panel de ajustes del docente: tolerancia de corrección, masas molares, tabla Z y tabla V20. */
import { useState } from 'react';
import { ajustesPorDefecto, NOMBRES_MM } from '../../chem/practicos/datos';
import { nombreTramo } from '../../chem/practicos/material';
import type { Ajustes, Tolerancia } from '../../chem/practicos/tipos';
import { Toggle } from '../components/fields';
import { NumEditable } from './comunes';

function TolEditor({ label, value, onChange }: { label: string; value: Tolerancia; onChange: (t: Tolerancia) => void }) {
  return (
    <div className="space-y-1">
      <div className="label">{label}</div>
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto px-2 py-1 text-sm" value={value.modo} onChange={(e) => onChange({ ...value, modo: e.target.value as Tolerancia['modo'] })}>
          <option value="relativa">Relativa (%)</option>
          <option value="absoluta">Absoluta</option>
          <option value="cifras">Cifras significativas</option>
        </select>
        <NumEditable label={label} value={value.valor} onCommit={(v) => onChange({ ...value, valor: v })} />
      </div>
    </div>
  );
}

export default function AjustesPanel({ ajustes, setAjustes }: { ajustes: Ajustes; setAjustes: (a: Ajustes) => void }) {
  const [sec, setSec] = useState<'general' | 'z' | 'v20'>('general');
  const upd = (f: (a: Ajustes) => void) => {
    const a = structuredClone(ajustes);
    f(a);
    setAjustes(a);
  };
  const [filtro, setFiltro] = useState('');
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="card-title mb-0">⚙️ Ajustes</h3>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['general', 'Tolerancia y masas molares'],
              ['z', 'Tabla Z'],
              ['v20', 'Material V20'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} className={`btn ${sec === k ? 'btn-primary' : ''}`} onClick={() => setSec(k)}>
              {l}
            </button>
          ))}
          <button
            className="btn"
            onClick={() => {
              if (window.confirm('¿Volver a los valores por defecto?')) setAjustes(ajustesPorDefecto());
            }}
          >
            ↺ Valores por defecto
          </button>
        </div>
      </div>

      {sec === 'general' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <TolEditor label="Tolerancia para valores (resultados, V20, G corregido, x̄…)" value={ajustes.tolValores} onChange={(t) => upd((a) => (a.tolValores = t))} />
            <TolEditor label="Tolerancia para s, CV, t·s/√n e incertidumbre" value={ajustes.tolDispersion} onChange={(t) => upd((a) => (a.tolDispersion = t))} />
            <p className="text-xs text-slate-600 dark:text-slate-400">
              «Cifras significativas: N» acepta hasta una unidad de diferencia en la N-ésima cifra significativa del valor correcto.
            </p>
            <Toggle label="Aplicar Dixon/Grubbs de nuevo después de descartar un valor (iterativo)" checked={ajustes.criterioIterativo} onChange={(v) => upd((a) => (a.criterioIterativo = v))} />
          </div>
          <div>
            <div className="label">Masas molares (g/mol)</div>
            <table className="table-basic">
              <tbody>
                {Object.keys(ajustes.masasMolares).map((k) => (
                  <tr key={k}>
                    <td>{NOMBRES_MM[k] ?? k}</td>
                    <td>
                      <NumEditable label={`M ${k}`} value={ajustes.masasMolares[k]} onCommit={(v) => upd((a) => (a.masasMolares[k] = v))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sec === 'z' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Z (mL/g) para vidrio borosilicato 3.3 y pesas de acero (ISO 4787). Filas: temperatura del agua (°C); columnas: presión (hPa). Se interpola entre valores.
          </p>
          <div className="overflow-x-auto">
            <table className="table-basic">
              <thead>
                <tr>
                  <th>T (°C) \ P (hPa)</th>
                  {ajustes.tablaZ.P.map((p) => (
                    <th key={p}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ajustes.tablaZ.T.map((t, i) => (
                  <tr key={t}>
                    <td className="font-semibold">{t}</td>
                    {ajustes.tablaZ.P.map((p, j) => (
                      <td key={p}>
                        <NumEditable ancho="w-24" label={`Z ${t} °C ${p} hPa`} value={ajustes.tablaZ.Z[i][j]} onCommit={(v) => upd((a) => (a.tablaZ.Z[i][j] = v))} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sec === 'v20' && (
        <div className="space-y-2">
          <input className="input max-w-xs px-2 py-1 text-sm" placeholder="Filtrar por código (ej. PA10, B10)" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
          <div className="max-h-[28rem] overflow-auto">
            <table className="table-basic">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th>Nominal (mL)</th>
                  <th>V20 (mL)</th>
                </tr>
              </thead>
              <tbody>
                {ajustes.materiales.map((m, i) =>
                  m.codigo.includes(filtro.trim().toUpperCase()) ? (
                    <tr key={m.codigo}>
                      <td className="font-mono">{m.codigo}-26</td>
                      <td>{m.tipo}</td>
                      <td>{m.nominal}</td>
                      <td>
                        {m.tramos ? (
                          <div className="flex flex-wrap gap-1">
                            {m.tramos.map((v, j) => (
                              <NumEditable key={j} ancho="w-20" label={`${m.codigo} ${nombreTramo(j)}`} value={v} onCommit={(x) => upd((a) => (a.materiales[i].tramos![j] = x))} />
                            ))}
                          </div>
                        ) : (
                          <NumEditable label={`${m.codigo} V20`} value={m.v20!} onCommit={(x) => upd((a) => (a.materiales[i].v20 = x))} />
                        )}
                      </td>
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Buretas: V20 de los tramos 0–2 / 0–4 / 0–6 / 0–8 / 0–10 mL.</p>
        </div>
      )}
    </section>
  );
}
