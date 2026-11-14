/**
 * Pestaña "Entregas": planillas de laboratorio digitalizadas (versión de demostración).
 * Alumno: completa la planilla y sus resultados. Profesor: corrige con el motor de cálculo.
 */
import { lazy, Suspense, useRef, useState } from 'react';
import { entregaP3Aleatoria, generarEjemplos, rng } from '../../chem/practicos/ejemplos';
import type { Entrega } from '../../chem/practicos/tipos';
import { Alert, Segmented } from '../components/fields';
import { descargarTexto, useEntregas, validarImportacion } from '../entregas/almacen';

const AlumnoForm = lazy(() => import('../entregas/AlumnoForm'));
const ProfesorView = lazy(() => import('../entregas/ProfesorView'));

export default function EntregasTab() {
  const { entregas, setEntregas, ajustes, setAjustes } = useEntregas();
  const [vista, setVista] = useState<'alumno' | 'profesor'>('alumno');
  // planilla con la que arranca la vista Alumno (al cargar ejemplos: una de P3 ya completada)
  const [inicialAlumno, setInicialAlumno] = useState<{ e?: Entrega; n: number }>({ n: 0 });
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cargarEjemplos = () => {
    // P3 se sortea de nuevo cada vez (datos al azar pero coherentes)
    const ej = generarEjemplos(ajustes, Math.floor(Math.random() * 1e9));
    setEntregas([...entregas.filter((e) => !e.ejemplo), ...ej]);
    const pl = entregaP3Aleatoria(ajustes, rng(Math.floor(Math.random() * 1e9)), 'Alumno de prueba');
    setInicialAlumno((x) => ({ e: { ...pl, id: '', creada: '', ejemplo: undefined, alumno: { ...pl.alumno, fecha: new Date().toISOString().slice(0, 10) } }, n: x.n + 1 }));
    setMsg({
      kind: 'ok',
      text: `Se cargaron ${ej.length} entregas de ejemplo (miralas en Profesor). En Alumno quedó una planilla de P3 ya completada, lista para enviar.`,
    });
  };

  const importar = async (f: File) => {
    try {
      const nuevas = validarImportacion(JSON.parse(await f.text()));
      const porId = new Map<string, Entrega>(entregas.map((e) => [e.id, e]));
      for (const e of nuevas) porId.set(e.id, e);
      setEntregas([...porId.values()]);
      setMsg({ kind: 'ok', text: `Se importaron ${nuevas.length} entregas.` });
    } catch (err) {
      setMsg({ kind: 'error', text: `No se pudo importar: ${(err as Error).message}` });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100" role="note">
        🧪 Versión de demostración: los datos se guardan solo en este navegador.
      </div>

      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-titulo text-2xl text-brand-700 dark:text-brand-300">Entregas de prácticos</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Planillas de laboratorio de Química Analítica I 2026 · {entregas.length} entregas guardadas</p>
        </div>
        <Segmented
          ariaLabel="Vista"
          value={vista}
          onChange={setVista}
          options={[
            { value: 'alumno', label: '🎓 Alumno' },
            { value: 'profesor', label: '👩‍🏫 Profesor' },
          ]}
        />
        <div className="flex w-full flex-wrap gap-2">
          <button className="btn" onClick={cargarEjemplos}>
            ✨ Cargar datos de ejemplo
          </button>
          <button className="btn" disabled={!entregas.length} onClick={() => descargarTexto(JSON.stringify({ version: 1, entregas }, null, 2), `entregas_${new Date().toISOString().slice(0, 10)}.json`)}>
            ⬇️ Exportar entregas (JSON)
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            ⬆️ Importar entregas (JSON)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              if (f) importar(f);
              ev.target.value = '';
            }}
          />
          {entregas.length > 0 && (
            <button
              className="btn text-red-700 dark:text-red-300"
              onClick={() => {
                if (window.confirm('¿Borrar TODAS las entregas guardadas en este navegador?')) setEntregas([]);
              }}
            >
              🗑️ Borrar todo
            </button>
          )}
        </div>
        {msg && (
          <div className="w-full">
            <Alert kind={msg.kind}>{msg.text}</Alert>
          </div>
        )}
      </section>

      <Suspense fallback={<p className="p-8 text-center text-slate-500">Cargando…</p>}>
        {vista === 'alumno' ? (
          <AlumnoForm key={inicialAlumno.n} inicial={inicialAlumno.e} entregas={entregas} ajustes={ajustes} onEnviar={(e) => setEntregas([...entregas, e])} />
        ) : (
          <ProfesorView entregas={entregas} ajustes={ajustes} setEntregas={setEntregas} setAjustes={setAjustes} />
        )}
      </Suspense>
    </div>
  );
}
