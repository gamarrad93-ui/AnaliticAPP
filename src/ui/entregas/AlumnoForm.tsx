/**
 * Pestaña "Alumno": planilla del práctico. Sólo valida formato y rangos;
 * al enviar muestra "Entrega recibida" (nunca los valores correctos ni ✓/✗).
 */
import { useMemo, useState } from 'react';
import { parseNumber } from '../../chem/numeric/format';
import { buscarMaterial, codigoCompleto, nombreTramo } from '../../chem/practicos/material';
import { nombrePractica, practica, PRACTICAS } from '../../chem/practicos/practicas';
import type { PracticaDef } from '../../chem/practicos/motor';
import type { Ajustes, Entrega, MaterialEntregado, PracticaId } from '../../chem/practicos/tipos';
import { Alert } from '../components/fields';
import { nuevoId } from './almacen';
import { entregaP3Aleatoria, rng } from '../../chem/practicos/ejemplos';
import { Celda, NOMBRE_CRITERIO } from './comunes';

const vacioMat = (): MaterialEntregado => ({ codigo: '', vNominal: '', tolerancia: '', v20: '', tramos: ['', '', '', '', ''] });
const hoy = () => new Date().toISOString().slice(0, 10);

function borrador(p: PracticaDef, previo?: Entrega): Entrega {
  const filas = Array.from({ length: p.filas.defecto }, () => ({ datos: {}, promediable: true, resultados: {} }));
  return {
    id: '',
    practica: p.id,
    creada: '',
    alumno: previo ? { ...previo.alumno } : { nombre: '', grupo: '', fecha: hoy() },
    materiales: Object.fromEntries(p.materiales.map((m) => [m.clave, vacioMat()])),
    reactivos: Object.fromEntries(p.reactivos.map((r) => [r.clave, { lote: '', assay: '', fechaPreparacion: '', fechaVencimiento: '' }])),
    muestra: '',
    datos: {},
    filas,
    criterio: { tipo: 'dixon', texto: '' },
    resultados: {},
    observaciones: '',
  };
}

/** Validación de formato y rango. Devuelve claves con error → mensaje. */
function validar(p: PracticaDef, e: Entrega): Map<string, string> {
  const err = new Map<string, string>();
  const numero = (k: string, v: string | undefined, nombre: string, min?: number, max?: number, requerido = true) => {
    const s = (v ?? '').trim();
    if (!s) {
      if (requerido) err.set(k, `${nombre}: falta completar.`);
      return;
    }
    const x = parseNumber(s);
    if (x == null) err.set(k, `${nombre}: no es un número válido (usá coma o punto decimal).`);
    else if ((min != null && x < min) || (max != null && x > max)) err.set(k, `${nombre}: fuera de rango (${min ?? '−∞'} a ${max ?? '∞'}).`);
  };
  if (!e.alumno.nombre.trim()) err.set('nombre', 'Escribí tu nombre.');
  if (!e.alumno.fecha) err.set('fecha', 'Indicá la fecha.');
  for (const s of p.materiales) {
    const m = e.materiales[s.clave];
    if (!m.codigo.trim()) err.set(`mat:${s.clave}:codigo`, `${s.rol}: falta el código.`);
    numero(`mat:${s.clave}:tol`, m.tolerancia, `${s.rol}: tolerancia`, 0, 5);
    const esBureta = /^B/i.test(m.codigo.trim()) || (s.tipos.length === 1 && s.tipos[0] === 'bureta');
    if (esBureta) m.tramos.forEach((t, i) => numero(`mat:${s.clave}:tramo${i}`, t, `${s.rol}: V20 ${nombreTramo(i)}`, 0, 12));
    else numero(`mat:${s.clave}:v20`, m.v20, `${s.rol}: V20`, 0, 2000);
  }
  for (const r of p.reactivos) if (r.conAssay) numero(`rea:${r.clave}:assay`, e.reactivos[r.clave]?.assay, `${r.nombre}: assay`, 50, 101);
  for (const d of p.datos) {
    if (d.opciones) {
      if (p.id === 'p1' && d.clave === 'tramo' && !/^B/i.test(e.materiales.material?.codigo.trim() ?? '')) continue;
      if (!e.datos[d.clave]) err.set(`dato:${d.clave}`, `${d.etiqueta}: elegí una opción.`);
    } else numero(`dato:${d.clave}`, e.datos[d.clave], d.etiqueta, d.min, d.max);
  }
  if (e.filas.length < p.filas.min) err.set('filas', `Se necesitan al menos ${p.filas.min} determinaciones.`);
  e.filas.forEach((f, i) => {
    for (const c of p.columnas) numero(`fila:${i}:${c.clave}`, f.datos[c.clave], `Determinación ${i + 1}: ${c.etiqueta}`, c.min, c.max);
    for (const r of p.resultadosFila) numero(`res:${i}:${r.clave}`, f.resultados[r.clave], `Determinación ${i + 1}: ${r.etiqueta}`);
  });
  if (!e.filas.some((f) => f.promediable)) err.set('prom', 'Marcá con (*) los valores promediables.');
  if (e.criterio.tipo === 'otro' && !e.criterio.texto.trim()) err.set('criterio', 'Describí el criterio de promediabilidad.');
  for (const r of [...p.resultadosIntermedios, ...p.resultadosResumen]) {
    if (r.tipo === 'cumple') {
      if (!e.resultados[r.clave]) err.set(`res:${r.clave}`, `${r.etiqueta}: indicá si cumple.`);
    } else numero(`res:${r.clave}`, e.resultados[r.clave], r.etiqueta, r.tipo === 'entero' ? 1 : undefined);
  }
  return err;
}

export default function AlumnoForm(props: { entregas: Entrega[]; ajustes: Ajustes; onEnviar: (e: Entrega) => void }) {
  const [pid, setPid] = useState<PracticaId>('p2');
  const p = practica(pid)!;
  const [e, setE] = useState<Entrega>(() => borrador(p));
  const [errores, setErrores] = useState<Map<string, string> | null>(null);
  const [enviada, setEnviada] = useState(false);

  const cambiarPractica = (id: PracticaId) => {
    setPid(id);
    setE(borrador(practica(id)!, e));
    setErrores(null);
    setEnviada(false);
  };
  const upd = (f: (x: Entrega) => void) =>
    setE((prev) => {
      const x = structuredClone(prev);
      f(x);
      return x;
    });
  const er = (k: string) => !!errores?.has(k);

  const codigos = useMemo(() => {
    const by = (t: string) => props.ajustes.materiales.filter((m) => m.tipo === t).map((m) => codigoCompleto(m.codigo));
    return { pipeta: by('pipeta'), matraz: by('matraz'), bureta: by('bureta') };
  }, [props.ajustes.materiales]);

  const setCodigo = (slot: string, codigo: string) =>
    upd((x) => {
      const m = x.materiales[slot];
      m.codigo = codigo;
      const ref = buscarMaterial(props.ajustes.materiales, codigo);
      if (ref) {
        m.vNominal = String(ref.nominal).replace('.', ',');
        if (ref.v20 != null) m.v20 = ref.v20.toFixed(2).replace('.', ',');
        if (ref.tramos) m.tramos = ref.tramos.map((v) => v.toFixed(2).replace('.', ','));
        // P1: n = 10 para pipetas, 6 para buretas (si la tabla está vacía)
        if (x.practica === 'p1' && x.filas.every((f) => Object.values(f.datos).every((v) => !v))) {
          const n = ref.tipo === 'bureta' ? 6 : 10;
          x.filas = Array.from({ length: n }, () => ({ datos: {}, promediable: true, resultados: {} }));
        }
      }
    });

  // dato encadenado: resultados previos del mismo alumno
  const previos = useMemo(() => {
    if (!p.encadenado) return [];
    const nom = e.alumno.nombre.trim().toLowerCase();
    return props.entregas.filter((x) => x.practica === p.encadenado!.desde && (!nom || x.alumno.nombre.trim().toLowerCase() === nom));
  }, [p, props.entregas, e.alumno.nombre]);

  const enviar = () => {
    const err = validar(p, e);
    setErrores(err);
    if (err.size) return;
    props.onEnviar({ ...structuredClone(e), id: nuevoId(), creada: new Date().toISOString() });
    setEnviada(true);
  };

  if (enviada)
    return (
      <section className="card space-y-3 text-center">
        <div className="text-5xl" aria-hidden>
          📨
        </div>
        <h2 className="font-titulo text-2xl text-brand-700 dark:text-brand-300">Entrega recibida</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{nombrePractica(p)}</p>
        <div className="flex justify-center gap-2">
          <button
            className="btn btn-primary"
            onClick={() => {
              setE(borrador(p, e));
              setErrores(null);
              setEnviada(false);
            }}
          >
            Nueva entrega
          </button>
        </div>
      </section>
    );

  const esBuretaP1 = /^B/i.test(e.materiales.material?.codigo.trim() ?? '');

  return (
    <div className="space-y-4">
      <datalist id="dl-pipeta">{codigos.pipeta.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="dl-matraz">{codigos.matraz.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="dl-bureta">{codigos.bureta.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="dl-p1">{[...codigos.pipeta, ...codigos.bureta].map((c) => <option key={c} value={c} />)}</datalist>

      <section className="card space-y-3">
        <label className="label" htmlFor="al-pr">
          Práctico
        </label>
        <select id="al-pr" className="input" value={pid} onChange={(ev) => cambiarPractica(ev.target.value as PracticaId)}>
          {PRACTICAS.map((x) => (
            <option key={x.id} value={x.id}>
              {nombrePractica(x)}
            </option>
          ))}
        </select>
        {pid === 'p3' && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm dark:bg-brand-950/40">
            <button
              className="btn"
              onClick={() => {
                const x = entregaP3Aleatoria(props.ajustes, rng(Math.floor(Math.random() * 1e9)), e.alumno.nombre.trim() || 'Alumno de prueba');
                setE({ ...x, id: '', creada: '', ejemplo: undefined, alumno: { ...x.alumno, fecha: e.alumno.fecha || hoy() } });
                setErrores(null);
              }}
            >
              🎲 Llenar con datos de prueba
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-400">Completa la planilla con datos al azar pero coherentes (para la demostración).</span>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Nombre</label>
            <Celda numerico={false} label="Nombre" value={e.alumno.nombre} error={er('nombre')} onChange={(v) => upd((x) => (x.alumno.nombre = v))} />
          </div>
          <div>
            <label className="label">Grupo</label>
            <Celda numerico={false} label="Grupo" value={e.alumno.grupo} onChange={(v) => upd((x) => (x.alumno.grupo = v))} />
          </div>
          <div>
            <label className="label">Fecha</label>
            <input type="date" className={`input px-2 py-1 text-sm ${er('fecha') ? 'input-error' : ''}`} value={e.alumno.fecha} onChange={(ev) => upd((x) => (x.alumno.fecha = ev.target.value))} />
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h3 className="card-title">🧪 Materiales</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Escribí el código Lab QA (ej. PA1005-26): el V20 se completa solo. La tolerancia la copiás de la etiqueta del material.
        </p>
        {p.materiales.map((s) => {
          const m = e.materiales[s.clave];
          const bur = /^B/i.test(m.codigo.trim()) || (s.tipos.length === 1 && s.tipos[0] === 'bureta');
          const lista = p.id === 'p1' ? 'dl-p1' : `dl-${s.tipos[0]}`;
          return (
            <div key={s.clave} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="mb-2 font-semibold">{s.rol}</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <label className="label text-xs">Código Lab QA</label>
                  <Celda numerico={false} list={lista} label={`${s.rol}: código`} value={m.codigo} error={er(`mat:${s.clave}:codigo`)} onChange={(v) => setCodigo(s.clave, v)} />
                </div>
                <div>
                  <label className="label text-xs">V nominal (mL)</label>
                  <Celda label={`${s.rol}: V nominal`} value={m.vNominal} onChange={(v) => upd((x) => (x.materiales[s.clave].vNominal = v))} />
                </div>
                <div>
                  <label className="label text-xs">Tolerancia (± mL)</label>
                  <Celda label={`${s.rol}: tolerancia`} value={m.tolerancia} error={er(`mat:${s.clave}:tol`)} onChange={(v) => upd((x) => (x.materiales[s.clave].tolerancia = v))} />
                </div>
                {!bur && (
                  <div>
                    <label className="label text-xs">V20 (mL)</label>
                    <Celda label={`${s.rol}: V20`} value={m.v20} error={er(`mat:${s.clave}:v20`)} onChange={(v) => upd((x) => (x.materiales[s.clave].v20 = v))} />
                  </div>
                )}
              </div>
              {bur && (
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {m.tramos.map((t, i) => (
                    <div key={i}>
                      <label className="label text-xs">V20 {nombreTramo(i)}</label>
                      <Celda
                        label={`V20 ${nombreTramo(i)}`}
                        value={t}
                        error={er(`mat:${s.clave}:tramo${i}`)}
                        onChange={(v) => upd((x) => (x.materiales[s.clave].tramos[i] = v))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {p.reactivos.length > 0 && (
        <section className="card space-y-3">
          <h3 className="card-title">⚗️ Reactivos</h3>
          {p.reactivos.map((r) => {
            const x = e.reactivos[r.clave];
            return (
              <div key={r.clave} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <div className="col-span-2 self-end pb-2 font-semibold sm:col-span-1">{r.nombre}</div>
                <div>
                  <label className="label text-xs">Lote</label>
                  <Celda numerico={false} label={`${r.nombre}: lote`} value={x.lote} onChange={(v) => upd((y) => (y.reactivos[r.clave].lote = v))} />
                </div>
                {r.conAssay ? (
                  <div>
                    <label className="label text-xs">Assay (%)</label>
                    <Celda label={`${r.nombre}: assay`} value={x.assay} error={er(`rea:${r.clave}:assay`)} onChange={(v) => upd((y) => (y.reactivos[r.clave].assay = v))} />
                  </div>
                ) : (
                  <div />
                )}
                <div>
                  <label className="label text-xs">Fecha de preparación</label>
                  <input type="date" className="input px-2 py-1 text-sm" value={x.fechaPreparacion} onChange={(ev) => upd((y) => (y.reactivos[r.clave].fechaPreparacion = ev.target.value))} />
                </div>
                <div>
                  <label className="label text-xs">Fecha de vencimiento</label>
                  <input type="date" className="input px-2 py-1 text-sm" value={x.fechaVencimiento} onChange={(ev) => upd((y) => (y.reactivos[r.clave].fechaVencimiento = ev.target.value))} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="card space-y-3">
        <h3 className="card-title">📋 Muestra y datos</h3>
        <div>
          <label className="label">Muestra problema</label>
          <Celda numerico={false} label="Muestra problema" value={e.muestra} onChange={(v) => upd((x) => (x.muestra = v))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {p.datos.map((d) => {
            if (p.id === 'p1' && d.clave === 'tramo' && !esBuretaP1) return null;
            const chain = p.encadenado?.dato === d.clave;
            return (
              <div key={d.clave}>
                <label className="label">
                  {d.etiqueta} {d.unidad && <span className="text-slate-500">({d.unidad})</span>}
                </label>
                {d.opciones ? (
                  <select className={`input px-2 py-1 text-sm ${er(`dato:${d.clave}`) ? 'input-error' : ''}`} value={e.datos[d.clave] ?? ''} onChange={(ev) => upd((x) => (x.datos[d.clave] = ev.target.value))}>
                    <option value="">—</option>
                    {d.opciones.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Celda label={d.etiqueta} value={e.datos[d.clave] ?? ''} error={er(`dato:${d.clave}`)} onChange={(v) => upd((x) => (x.datos[d.clave] = v))} />
                )}
                {chain && (
                  <div className="mt-1">
                    <select
                      className="input px-2 py-1 text-xs"
                      value={e.origenEncadenado ?? ''}
                      onChange={(ev) => {
                        const src = previos.find((x) => x.id === ev.target.value);
                        upd((x) => {
                          x.origenEncadenado = src?.id;
                          if (src) x.datos[d.clave] = src.resultados[p.encadenado!.resultado] ?? '';
                        });
                      }}
                    >
                      <option value="">{previos.length ? `Usar mi resultado de ${p.encadenado!.etiqueta}…` : `(no hay entregas tuyas de ${p.encadenado!.etiqueta}: escribilo)`}</option>
                      {previos.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.alumno.nombre} · {x.alumno.fecha} · {x.resultados[p.encadenado!.resultado]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card space-y-3">
        <h3 className="card-title">🔬 Datos experimentales y resultados por determinación</h3>
        <div className="overflow-x-auto">
          <table className="table-basic">
            <thead>
              <tr>
                <th>#</th>
                {p.columnas.map((c) => (
                  <th key={c.clave}>
                    {c.etiqueta} {c.unidad && <span className="font-normal text-slate-500">({c.unidad})</span>}
                  </th>
                ))}
                {p.resultadosFila.map((r) => (
                  <th key={r.clave} className="bg-brand-50 dark:bg-brand-950/40">
                    {r.etiqueta} {r.unidad && <span className="font-normal text-slate-500">({r.unidad})</span>}
                  </th>
                ))}
                <th title="Promediable">(*)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {e.filas.map((f, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  {p.columnas.map((c) => (
                    <td key={c.clave}>
                      <Celda ancho="w-24" label={`${c.etiqueta} ${i + 1}`} value={f.datos[c.clave] ?? ''} error={er(`fila:${i}:${c.clave}`)} onChange={(v) => upd((x) => (x.filas[i].datos[c.clave] = v))} />
                    </td>
                  ))}
                  {p.resultadosFila.map((r) => (
                    <td key={r.clave} className="bg-brand-50 dark:bg-brand-950/40">
                      <Celda ancho="w-28" label={`${r.etiqueta} ${i + 1}`} value={f.resultados[r.clave] ?? ''} error={er(`res:${i}:${r.clave}`)} onChange={(v) => upd((x) => (x.filas[i].resultados[r.clave] = v))} />
                    </td>
                  ))}
                  <td>
                    <input type="checkbox" className="h-4 w-4 accent-brand-700" aria-label={`Determinación ${i + 1} promediable`} checked={f.promediable} onChange={(ev) => upd((x) => (x.filas[i].promediable = ev.target.checked))} />
                  </td>
                  <td>
                    {e.filas.length > p.filas.min && (
                      <button className="btn px-2 py-0.5 text-xs" aria-label={`Quitar determinación ${i + 1}`} onClick={() => upd((x) => x.filas.splice(i, 1))}>
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {e.filas.length < p.filas.max && (
          <button className="btn" onClick={() => upd((x) => x.filas.push({ datos: {}, promediable: true, resultados: {} }))}>
            + Agregar determinación
          </button>
        )}
        <p className="text-xs text-slate-600 dark:text-slate-400">Marcá con (*) las determinaciones promediables según tu criterio.</p>
      </section>

      <section className="card space-y-3">
        <h3 className="card-title">📏 Criterio de promediabilidad</h3>
        <div className="flex flex-wrap gap-4">
          {(['dixon', 'grubbs', 'otro'] as const).map((t) => (
            <label key={t} className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="criterio" className="accent-brand-700" checked={e.criterio.tipo === t} onChange={() => upd((x) => (x.criterio.tipo = t))} />
              {NOMBRE_CRITERIO[t]}
            </label>
          ))}
        </div>
        {e.criterio.tipo === 'otro' && (
          <textarea
            className={`input text-sm ${er('criterio') ? 'input-error' : ''}`}
            rows={2}
            placeholder="Describí el criterio que usaste"
            value={e.criterio.texto}
            onChange={(ev) => upd((x) => (x.criterio.texto = ev.target.value))}
          />
        )}
      </section>

      <section className="card space-y-3">
        <h3 className="card-title">🧮 Mis resultados</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...p.resultadosIntermedios, ...p.resultadosResumen].map((r) => (
            <div key={r.clave}>
              <label className="label">
                {r.etiqueta} {r.unidad && <span className="text-slate-500">({r.unidad})</span>}
              </label>
              {r.tipo === 'cumple' ? (
                <select className={`input px-2 py-1 text-sm ${er(`res:${r.clave}`) ? 'input-error' : ''}`} value={e.resultados[r.clave] ?? ''} onChange={(ev) => upd((x) => (x.resultados[r.clave] = ev.target.value))}>
                  <option value="">—</option>
                  <option value="si">Cumple</option>
                  <option value="no">No cumple</option>
                </select>
              ) : (
                <Celda label={r.etiqueta} value={e.resultados[r.clave] ?? ''} error={er(`res:${r.clave}`)} onChange={(v) => upd((x) => (x.resultados[r.clave] = v))} />
              )}
            </div>
          ))}
        </div>
        <div>
          <label className="label">Observaciones</label>
          <textarea className="input text-sm" rows={3} value={e.observaciones} onChange={(ev) => upd((x) => (x.observaciones = ev.target.value))} />
        </div>
      </section>

      {errores && errores.size > 0 && (
        <Alert kind="error">
          <strong>Revisá estos campos antes de enviar:</strong>
          <ul className="mt-1 list-disc pl-5">
            {[...errores.values()].slice(0, 12).map((m) => (
              <li key={m}>{m}</li>
            ))}
            {errores.size > 12 && <li>… y {errores.size - 12} más.</li>}
          </ul>
        </Alert>
      )}
      <div className="flex justify-end">
        <button className="btn btn-primary px-6 py-2 text-base" onClick={enviar}>
          📨 Enviar entrega
        </button>
      </div>
    </div>
  );
}
