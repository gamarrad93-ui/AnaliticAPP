/**
 * Pestaña "Profesor": entregas por práctico, valor del alumno vs. recalculado (✓/✗),
 * diagnóstico del error, procedimiento, resumen del grupo y exportación a Excel/CSV.
 */
import { useMemo, useState } from 'react';
import { corregir, resumenGrupo, type CampoCorregido, type Correccion } from '../../chem/practicos/correccion';
import { tablaExportacion } from '../../chem/practicos/exportar';
import { buscarMaterial } from '../../chem/practicos/material';
import { nombrePractica, PRACTICAS } from '../../chem/practicos/practicas';
import type { PracticaDef } from '../../chem/practicos/motor';
import type { Ajustes, Entrega, PracticaId } from '../../chem/practicos/tipos';
import { exportCsv } from '../components/exporters';
import { Alert } from '../components/fields';
import AjustesPanel from './AjustesPanel';
import { fmtValor, NOMBRE_CRITERIO, PasosView } from './comunes';

function Marca({ ok }: { ok: boolean | null }) {
  if (ok == null) return <span className="chip bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">sin dato</span>;
  return ok ? (
    <span className="chip bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" aria-label="correcto">
      ✓
    </span>
  ) : (
    <span className="chip bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" aria-label="incorrecto">
      ✗
    </span>
  );
}

function TablaCampos({ campos, titulo }: { campos: CampoCorregido[]; titulo: string }) {
  if (!campos.length) return null;
  return (
    <div className="overflow-x-auto">
      <h4 className="mb-1 mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{titulo}</h4>
      <table className="table-basic">
        <thead>
          <tr>
            {campos.some((c) => c.fila != null) && <th>#</th>}
            <th>Campo</th>
            <th>Alumno</th>
            <th>Motor</th>
            <th />
            <th>Diagnóstico probable</th>
          </tr>
        </thead>
        <tbody>
          {campos.map((c, i) => (
            <tr key={i} className={c.ok === false ? 'bg-red-50/60 dark:bg-red-950/30' : ''}>
              {campos.some((x) => x.fila != null) && <td>{c.fila != null ? c.fila + 1 : ''}</td>}
              <td>
                {c.etiqueta} {c.unidad && <span className="text-slate-500">({c.unidad})</span>}
              </td>
              <td className="font-mono">{c.tipo === 'cumple' ? (c.alumno === 'si' ? 'Cumple' : c.alumno === 'no' ? 'No cumple' : c.alumno) : c.alumno || '—'}</td>
              <td className="font-mono">{c.tipo === 'entero' && typeof c.correcto === 'number' ? String(c.correcto) : fmtValor(c.correcto, c.tipo === 'dispersion' ? 3 : 5)}</td>
              <td>
                <Marca ok={c.ok} />
              </td>
              <td className="text-xs">{c.diagnosticos.join(' · ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Detalle({ p, e, cr, aj, onBorrar }: { p: PracticaDef; e: Entrega; cr: Correccion; aj: Ajustes; onBorrar: () => void }) {
  const c = cr.calculo;
  return (
    <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-800">
      <div className="grid gap-3 text-sm md:grid-cols-2">
        <div>
          <div className="font-semibold">Materiales</div>
          <ul className="list-disc pl-5">
            {p.materiales.map((s) => {
              const m = e.materiales[s.clave];
              const ref = m ? buscarMaterial(aj.materiales, m.codigo) : undefined;
              return (
                <li key={s.clave}>
                  {s.rol}: <span className="font-mono">{m?.codigo || '—'}</span> · tol. ± {m?.tolerancia || '—'} mL ·{' '}
                  {ref?.tramos ? `tramos ${ref.tramos.map((v) => v.toFixed(2).replace('.', ',')).join(' / ')}` : `V20 ${ref?.v20 ?? m?.v20 ?? '—'} mL`}
                  {!ref && <span className="text-amber-700 dark:text-amber-300"> (no está en la tabla Lab QA)</span>}
                </li>
              );
            })}
          </ul>
          {p.reactivos.length > 0 && (
            <>
              <div className="mt-2 font-semibold">Reactivos</div>
              <ul className="list-disc pl-5">
                {p.reactivos.map((r) => {
                  const x = e.reactivos[r.clave];
                  return (
                    <li key={r.clave}>
                      {r.nombre}: lote {x?.lote || '—'}
                      {r.conAssay && <> · assay {x?.assay || '—'} %</>} · prep. {x?.fechaPreparacion || '—'} · venc. {x?.fechaVencimiento || '—'}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
        <div>
          <div>
            <span className="font-semibold">Muestra:</span> {e.muestra || '—'}
          </div>
          {p.datos.map((d) =>
            e.datos[d.clave] ? (
              <div key={d.clave}>
                <span className="font-semibold">{d.etiqueta}:</span> <span className="font-mono">{e.datos[d.clave]}</span> {d.unidad}
              </div>
            ) : null,
          )}
          <div>
            <span className="font-semibold">Criterio declarado:</span> {NOMBRE_CRITERIO[e.criterio.tipo]}
            {e.criterio.tipo === 'otro' && <span className="italic"> — «{e.criterio.texto}»</span>}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">{cr.calculo.pasosCriterio.map((x) => x.texto).join(' ')}</div>
          {e.observaciones && (
            <div className="mt-1">
              <span className="font-semibold">Observaciones:</span> {e.observaciones}
            </div>
          )}
        </div>
      </div>

      {c.errores.length > 0 && <Alert kind="error">El motor no pudo calcular todo: {c.errores.join(' ')}</Alert>}
      {c.avisos.length > 0 && <Alert kind="warn">{c.avisos.join(' ')}</Alert>}

      <TablaCampos titulo="Por determinación" campos={cr.campos.filter((x) => x.seccion === 'fila')} />
      <TablaCampos titulo="Intermedios" campos={cr.campos.filter((x) => x.seccion === 'intermedio')} />
      <TablaCampos titulo="Promediables y resultado final" campos={cr.campos.filter((x) => x.seccion === 'promediables' || x.seccion === 'resumen')} />

      <PasosView pasos={c.pasos} />
      <div className="flex justify-end">
        <button className="btn text-red-700 dark:text-red-300" onClick={onBorrar}>
          🗑️ Borrar esta entrega
        </button>
      </div>
    </div>
  );
}

export default function ProfesorView(props: { entregas: Entrega[]; ajustes: Ajustes; setEntregas: (l: Entrega[]) => void; setAjustes: (a: Ajustes) => void }) {
  const [pid, setPid] = useState<PracticaId>('p2');
  const [abierta, setAbierta] = useState<string | null>(null);
  const [verAjustes, setVerAjustes] = useState(false);
  const p = PRACTICAS.find((x) => x.id === pid)!;
  const lista = useMemo(() => props.entregas.filter((e) => e.practica === pid), [props.entregas, pid]);
  const correcciones = useMemo(() => lista.map((e) => corregir(p, e, props.ajustes)), [lista, p, props.ajustes]);
  const grupo = useMemo(() => resumenGrupo(p, correcciones), [p, correcciones]);
  const cuenta = (id: PracticaId) => props.entregas.filter((e) => e.practica === id).length;

  const exportar = async (tipo: 'csv' | 'xlsx') => {
    const t = tablaExportacion(p, lista, correcciones, props.ajustes);
    const nombre = `entregas_P${p.numero}${p.parte ? `_${p.parte.replace(/\s+/g, '')}` : ''}`;
    if (tipo === 'csv') {
      exportCsv([t.cabecera, ...t.filas.map((r) => r.map((v) => (v == null ? '' : typeof v === 'boolean' ? (v ? 'Sí' : 'No') : v)))], `${nombre}.csv`);
      return;
    }
    const { default: writeXlsxFile } = await import('write-excel-file/browser');
    const data = [
      t.cabecera.map((h) => ({ value: h, fontWeight: 'bold' as const, wrap: true })),
      ...t.filas.map((r) =>
        r.map((v) => {
          if (typeof v === 'number') return { value: v, type: Number };
          if (v === '✓') return { value: v, color: '#047857' };
          if (v === '✗') return { value: v, color: '#b91c1c' };
          return { value: v == null ? '' : String(v), type: String };
        }),
      ),
    ];
    await writeXlsxFile(data as never, { columns: t.cabecera.map((_, i) => ({ width: i === 0 ? 26 : 14 })), stickyRowsCount: 1 } as never).toFile(`${nombre}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <label className="label" htmlFor="pr-pr">
              Práctico
            </label>
            <select id="pr-pr" className="input" value={pid} onChange={(ev) => setPid(ev.target.value as PracticaId)}>
              {PRACTICAS.map((x) => (
                <option key={x.id} value={x.id}>
                  {nombrePractica(x)} ({cuenta(x.id)})
                </option>
              ))}
            </select>
          </div>
          <button className="btn" disabled={!lista.length} onClick={() => exportar('xlsx')}>
            📊 Exportar Excel (.xlsx)
          </button>
          <button className="btn" disabled={!lista.length} onClick={() => exportar('csv')}>
            📄 Exportar CSV
          </button>
          <button className={`btn ${verAjustes ? 'btn-primary' : ''}`} onClick={() => setVerAjustes(!verAjustes)} aria-pressed={verAjustes}>
            ⚙️ Ajustes
          </button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Tolerancia de corrección: valores{' '}
          {props.ajustes.tolValores.modo === 'relativa' ? `± ${props.ajustes.tolValores.valor} %` : props.ajustes.tolValores.modo === 'absoluta' ? `± ${props.ajustes.tolValores.valor}` : `${props.ajustes.tolValores.valor} cifras significativas`}
          ; s, CV e incertidumbre{' '}
          {props.ajustes.tolDispersion.modo === 'relativa' ? `± ${props.ajustes.tolDispersion.valor} %` : props.ajustes.tolDispersion.modo === 'absoluta' ? `± ${props.ajustes.tolDispersion.valor}` : `${props.ajustes.tolDispersion.valor} cifras significativas`}
          .
        </p>
      </section>

      {verAjustes && <AjustesPanel ajustes={props.ajustes} setAjustes={props.setAjustes} />}

      {lista.length === 0 ? (
        <Alert kind="info">Todavía no hay entregas de este práctico. Usá «Cargar datos de ejemplo» o enviá una desde la pestaña Alumno.</Alert>
      ) : (
        <>
          <section className="card space-y-3">
            <h3 className="card-title">👥 Resumen del grupo ({lista.length} entregas)</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="overflow-x-auto">
                <table className="table-basic">
                  <thead>
                    <tr>
                      <th>Campo</th>
                      <th className="w-1/2">% correcto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.campos.map((c) => (
                      <tr key={c.etiqueta}>
                        <td>{c.etiqueta}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded bg-slate-200 dark:bg-slate-700">
                              <div className={`h-2 rounded ${c.pct >= 75 ? 'bg-emerald-500' : c.pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${c.pct}%` }} />
                            </div>
                            <span className="w-12 text-right font-mono text-xs">{Math.round(c.pct)} %</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div className="mb-1 text-sm font-semibold">Errores más comunes</div>
                {grupo.errores.length ? (
                  <ol className="list-decimal space-y-1 pl-5 text-sm">
                    {grupo.errores.map((x) => (
                      <li key={x.etiqueta}>
                        {x.etiqueta} — <strong>{x.alumnos}</strong> alumno{x.alumnos === 1 ? '' : 's'}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-slate-600">No se detectaron errores típicos.</p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-2">
            {lista.map((e, k) => {
              const cr = correcciones[k];
              const open = abierta === e.id;
              const pct = cr.total ? Math.round((100 * cr.aciertos) / cr.total) : 0;
              return (
                <article key={e.id} className="card">
                  <button className="flex w-full flex-wrap items-center justify-between gap-2 text-left" onClick={() => setAbierta(open ? null : e.id)} aria-expanded={open}>
                    <div>
                      <div className="font-semibold">
                        {e.alumno.nombre} {e.ejemplo && <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">ejemplo</span>}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {e.alumno.grupo && `Grupo ${e.alumno.grupo} · `}
                        {e.alumno.fecha} · Criterio: {NOMBRE_CRITERIO[e.criterio.tipo]}
                      </div>
                      {cr.diagnosticos.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {cr.diagnosticos.slice(0, 2).map((d) => (
                            <span key={d.etiqueta} className="chip bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                              {d.etiqueta}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-lg font-semibold ${pct === 100 ? 'text-emerald-700 dark:text-emerald-300' : pct >= 60 ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300'}`}>
                        {cr.aciertos}/{cr.total}
                      </span>
                      <span aria-hidden>{open ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {open && (
                    <Detalle
                      p={p}
                      e={e}
                      cr={cr}
                      aj={props.ajustes}
                      onBorrar={() => {
                        if (window.confirm(`¿Borrar la entrega de ${e.alumno.nombre}?`)) props.setEntregas(props.entregas.filter((x) => x.id !== e.id));
                      }}
                    />
                  )}
                </article>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
