/**
 * Cuestionario de autocontrol de cada práctico: el estudiante escribe su respuesta,
 * ve la respuesta modelo y se autoevalúa. Progreso guardado en el navegador.
 */
import { useEffect, useMemo, useState } from 'react';
import { PUNTAJE_PREGUNTAS_PREVIAS, getAutocontrol, type PreguntaAutocontrol } from '../../data/autocontrol';
import { Alert, Segmented } from '../components/fields';

type Nota = 'bien' | 'medias' | 'mal';
interface Estado {
  notas: Record<string, Nota>;
  respuestas: Record<string, string>;
}

const key = (n: number) => `analiticapp.autocontrol.p${n}.v1`;
function cargar(n: number): Estado {
  try {
    const s = JSON.parse(localStorage.getItem(key(n)) ?? 'null');
    if (s && typeof s === 'object') return { notas: s.notas ?? {}, respuestas: s.respuestas ?? {} };
  } catch {
    /* sin almacenamiento */
  }
  return { notas: {}, respuestas: {} };
}
function guardar(n: number, e: Estado) {
  try {
    localStorage.setItem(key(n), JSON.stringify(e));
  } catch {
    /* ignorar */
  }
}

const PUNTOS: Record<Nota, number> = { bien: 1, medias: 0.5, mal: 0 };

function mezclar<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function Autocontrol({ practico }: { practico: number }) {
  const data = getAutocontrol(practico);
  const [st, setSt] = useState<Estado>(() => cargar(practico));
  const [modo, setModo] = useState<'todas' | 'falladas'>('todas');
  const [orden, setOrden] = useState<PreguntaAutocontrol[]>(() => data?.preguntas ?? []);
  const [i, setI] = useState(0);
  const [visto, setVisto] = useState(false);
  useEffect(() => guardar(practico, st), [practico, st]);

  const lista = useMemo(() => (modo === 'falladas' ? orden.filter((p) => st.notas[p.id] === 'mal' || st.notas[p.id] === 'medias') : orden), [modo, orden, st.notas]);
  const actual = lista[Math.min(i, Math.max(0, lista.length - 1))];
  useEffect(() => setVisto(false), [actual?.id]);

  if (!data) {
    return (
      <section className="card space-y-2">
        <h3 className="card-title">❓ Preguntas de autocontrol</h3>
        <Alert kind="info">La cuaderneta no trae preguntas de autocontrol para este práctico.</Alert>
      </section>
    );
  }

  const total = data.preguntas.length;
  const respondidas = data.preguntas.filter((p) => st.notas[p.id]).length;
  const puntaje = data.preguntas.reduce((s, p) => s + (st.notas[p.id] ? PUNTOS[st.notas[p.id]] : 0), 0);
  const nFalladas = data.preguntas.filter((p) => st.notas[p.id] === 'mal' || st.notas[p.id] === 'medias').length;
  const texto = actual ? st.respuestas[actual.id] ?? '' : '';
  const calificar = (n: Nota) => {
    setSt((s) => ({ ...s, notas: { ...s.notas, [actual.id]: n } }));
    if (modo === 'todas') setI((k) => Math.min(k + 1, lista.length - 1));
    else setVisto(false);
  };

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="card-title mb-0">❓ Preguntas de autocontrol</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={modo} onChange={(m) => { setModo(m); setI(0); }} options={[{ value: 'todas', label: 'Todas' }, { value: 'falladas', label: `Repasar las que fallé (${nFalladas})` }]} ariaLabel="Qué preguntas mostrar" />
          <button className="btn" onClick={() => { setOrden(mezclar(data.preguntas)); setI(0); }}>🔀 Mezclar</button>
        </div>
      </div>
      <Alert kind="info">
        Las <strong>Preguntas Previas</strong> valen {PUNTAJE_PREGUNTAS_PREVIAS.individual} de los {PUNTAJE_PREGUNTAS_PREVIAS.total} puntos de cada práctica individual
        y {PUNTAJE_PREGUNTAS_PREVIAS.grupal} de {PUNTAJE_PREGUNTAS_PREVIAS.total} en las grupales. Las preguntas de autocontrol son la mejor manera de prepararlas.
      </Alert>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="h-2 min-w-[8rem] flex-1 overflow-hidden rounded bg-slate-200 dark:bg-slate-800"><div className="h-full bg-aguamarina" style={{ width: `${(respondidas / total) * 100}%` }} /></div>
        <span>{respondidas}/{total} respondidas · puntaje {respondidas ? `${Math.round((puntaje / respondidas) * 100)} %` : '—'}</span>
        <button className="btn px-2 py-1 text-xs" onClick={() => { if (window.confirm('¿Borrar el progreso de este práctico?')) { setSt({ notas: {}, respuestas: {} }); setI(0); } }}>Reiniciar</button>
      </div>

      {lista.length === 0 ? (
        <Alert kind="ok">{modo === 'falladas' ? 'No tenés preguntas para repasar. 🎉' : 'Sin preguntas.'}</Alert>
      ) : (
        <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Pregunta {Math.min(i, lista.length - 1) + 1} de {lista.length} · ({actual.letra})</span>
            {st.notas[actual.id] && <span className="chip">{{ bien: '✓ La tenía bien', medias: '≈ A medias', mal: '✗ Mal' }[st.notas[actual.id]]}</span>}
          </div>
          <p className="font-semibold">{actual.pregunta}</p>
          {actual.figura && <img src={`./${actual.figura}`} alt={`Figura de la cuaderneta para la pregunta ${actual.letra}`} className="max-h-96 w-full max-w-2xl rounded-lg border border-slate-200 bg-white object-contain dark:border-slate-700" loading="lazy" />}
          {actual.legible === false && <p className="text-xs text-amber-700 dark:text-amber-300">Esta pregunta incluye una ecuación o figura de la cuaderneta que no se reproduce acá: consultala en el original.</p>}
          <div>
            <label className="label" htmlFor={`resp-${actual.id}`}>Tu respuesta</label>
            <textarea id={`resp-${actual.id}`} className="input" rows={4} value={texto} onChange={(e) => setSt((s) => ({ ...s, respuestas: { ...s.respuestas, [actual.id]: e.target.value } }))} placeholder="Escribí tu respuesta antes de ver la del modelo…" />
          </div>
          {!visto ? (
            <button className="btn btn-primary" disabled={texto.trim().length < 3} onClick={() => setVisto(true)}>Ver respuesta modelo</button>
          ) : (
            <div className="space-y-2">
              <div className="rounded-lg bg-emerald-50 p-3 text-sm dark:bg-emerald-950/40">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Respuesta modelo{actual.validada ? '' : ' · borrador a validar por el docente'}</div>
                {actual.borrador}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="self-center text-sm">¿Cómo te fue?</span>
                <button className="btn" onClick={() => calificar('bien')}>✓ La tenía bien</button>
                <button className="btn" onClick={() => calificar('medias')}>≈ A medias</button>
                <button className="btn" onClick={() => calificar('mal')}>✗ Mal</button>
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <button className="btn" disabled={i <= 0} onClick={() => setI((k) => Math.max(0, k - 1))}>← Anterior</button>
            <button className="btn" disabled={i >= lista.length - 1} onClick={() => setI((k) => Math.min(lista.length - 1, k + 1))}>Siguiente →</button>
          </div>
        </div>
      )}
    </section>
  );
}
