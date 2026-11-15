/**
 * Pestaña: Revisión práctica — pool de problemas de la 1ª y 2ª RP con tres modos:
 * Sorteo (con simulador de diagramación cronometrado), Resolver (criterios oficiales) y Docente.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { INFO_RP, PROBLEMAS, getProblema, type ProblemaRP, type RP } from '../../data/revision-practica';
import { parametrosPorDefecto, solucion, sortear, type Solucion } from '../../chem/revision/motor';
import { codigoSorteo, leerCodigo } from '../../chem/revision/azar';
import { veredictoRP1, veredictoRP2, type Bloque } from '../../chem/revision/veredicto';
import { parseList } from '../../chem/numeric/table';
import { fmtFixed, fmtSig, parseNumber } from '../../chem/numeric/format';
import { Alert, NumField, Segmented, SelectField, Stat, matchesSearch } from '../components/fields';
import { Procedure } from '../components/Procedure';

type Modo = 'sorteo' | 'resolver' | 'docente';

const PARAM_LABEL: Record<string, [string, string]> = {
  G: ['Gasto objetivo', 'mL'], Ct: ['Concentración nominal del valorante', 'mol/L'], contenido: ['Contenido declarado', ''], Vdis: ['Volumen de disolución de la muestra (para el pH en el PE)', 'mL'],
  CI2: ['Concentración de I2', 'mol/L'], VI2: ['Toma de I2', 'mL'], Gblanco: ['Gasto en el blanco', 'mL'], Gretro: ['Gasto en la retro', 'mL'],
  gL: ['Cloro declarado', 'g Cl2/L'], Vm: ['Toma de muestra', 'mL'], CAg: ['AgNO3', 'mol/L'], Gstd: ['Gasto en la estandarización', 'mL'], CSCN: ['KSCN nominal', 'mol/L'],
  Ccit: ['Ácido cítrico nominal', 'mol/L'], CNaOH: ['NaOH nominal', 'mol/L'], z: ['Protones valorados (z)', ''], Valic: ['Alícuota de ácido cítrico', 'mL'],
  masa: ['Masa de paracetamol en el matraz problema', 'g'], Vmatraz: ['Volumen del matraz problema', 'mL'], Cobj: ['Concentración objetivo en la cubeta', 'mg/L'], mgmL: ['FeSO4·7H2O declarado', 'mg/mL'],
};

const TECNICAS = [...new Set(PROBLEMAS.map((p) => p.tecnica))];

function readHash() {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  return { code: q.get('code') };
}

function fmtV(v: number, dec: number) {
  return Math.abs(v) >= 1e4 ? Math.round(v).toLocaleString('es-UY') : fmtFixed(v, dec);
}

/* ---------------- piezas ---------------- */

function Enunciado({ p, extra }: { p: ProblemaRP; extra?: React.ReactNode }) {
  const info = INFO_RP[p.rp];
  return (
    <section className="card min-w-0 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{info.nombre} · Problema {p.numero} · {p.tecnica}</div>
      <h2 className="font-titulo text-2xl text-brand-700 dark:text-brand-300">{p.titulo}</h2>
      <p className="text-sm"><strong>Contenido aproximado de analito:</strong> {p.contenido}</p>
      {extra}
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold">Reactivos disponibles y qué debe contener la diagramación</summary>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <div><div className="font-semibold">Reactivos y sustancias disponibles</div><ul className="list-disc pl-5">{info.reactivos.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
          <div><div className="font-semibold">La diagramación debe contener</div><ul className="list-disc pl-5">{info.diagramacionDebeContener.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
        </div>
      </details>
      {p.sugerencias && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">Sugerencias de diagramación de la letra</summary>
          <ul className="mt-1 list-disc pl-5">{p.sugerencias.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </details>
      )}
      <Criterios p={p} />
      <p className="text-xs text-slate-600 dark:text-slate-400">Puntaje: diagramación {info.evaluacion.diagramacion} · trabajo experimental {info.evaluacion.experimental} · informe {info.evaluacion.informe} · total {info.evaluacion.total} puntos.</p>
    </section>
  );
}

function Criterios({ p }: { p: ProblemaRP }) {
  const c = p.criterios;
  if (c.tipo === 'rp1') {
    return (
      <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm dark:bg-brand-950/40">
        <div className="font-semibold">Criterios estadísticos (tabla de la letra)</div>
        <div>Agente valorante: {c.sigmaR != null ? `σR = ${String(c.sigmaR).replace('.', ',')} mol L-1` : 'σR no indicado en la tabla'}</div>
        <div>Analito: {c.textoAnalito}</div>
        <div>Mínimo tres valores concordantes en cada etapa.</div>
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm dark:bg-brand-950/40">
      <div className="font-semibold">Tratamiento estadístico de datos (letra)</div>
      <ul className="list-disc pl-5">{INFO_RP[2].tratamientoDatos.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}

function SolucionView({ s, editable, onParam }: { s: Solucion; editable?: boolean; onParam?: (k: string, v: number) => void }) {
  const etapas = [...new Set([...s.calculos.map((c) => c.etapa), ...s.reacciones.map((r) => r.etapa), ...s.gastos.map((g) => g.etapa), ...s.formulas.map((f) => f.etapa), ...s.deteccion.map((d) => d.etapa)])];
  return (
    <div className="space-y-3 text-sm">
      {editable && (
        <details>
          <summary className="cursor-pointer font-semibold">Parámetros de la simulación (editables)</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(s.params).map(([k, v]) => (
              <ParamField key={k} k={k} v={v} onChange={(x) => onParam?.(k, x)} />
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">Valores por defecto del simulador (no son sugerencias de la letra salvo donde la letra los indica).</p>
        </details>
      )}
      <div><strong>Objetivo:</strong> {s.objetivo}</div>
      {etapas.map((e) => (
        <div key={e} className="space-y-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <div className="font-semibold text-brand-800 dark:text-brand-200">{e}</div>
          {s.reacciones.filter((r) => r.etapa === e).map((r, i) => (
            <div key={i}><div className="font-mono">{r.ecuacion}</div><div className="text-slate-600 dark:text-slate-400">{r.relacion}</div></div>
          ))}
          {s.calculos.filter((c) => c.etapa === e).map((c, i) => (
            <div key={i} className="flex flex-wrap justify-between gap-2"><span>{c.label}</span><span className="font-mono font-semibold">{fmtV(c.valor, c.dec)} {c.unidad}</span></div>
          ))}
          {s.gastos.filter((g) => g.etapa === e).map((g, i) => (
            <div key={i} className="flex flex-wrap justify-between gap-2"><span>{g.label ?? 'Gasto teórico'}</span><span className="font-mono font-semibold">{fmtFixed(g.G, 2)} mL</span></div>
          ))}
          {s.pHeq?.filter((x) => x.etapa === e).map((x, i) => (
            <div key={i} className="text-slate-600 dark:text-slate-400">pH en el punto equivalente ≈ {fmtFixed(x.pH, 2)} (muestra disuelta en ~{x.Vdis} mL; motor ácido-base exacto).</div>
          ))}
          {s.formulas.filter((f) => f.etapa === e).map((f, i) => <div key={i} className="font-mono text-xs">{f.texto}</div>)}
          {s.deteccion.filter((d) => d.etapa === e).map((d, i) => <div key={i}><strong>Punto final:</strong> {d.texto}</div>)}
        </div>
      ))}
      {s.gastos.filter((g) => !etapas.includes(g.etapa)).map((g, i) => <div key={i}>Gasto teórico ({g.etapa}): <span className="font-mono">{fmtFixed(g.G, 2)} mL</span></div>)}
      {s.avisos.map((a, i) => <Alert key={i} kind="warn">{a}</Alert>)}
      <div className="grid gap-3 md:grid-cols-3">
        <div><div className="font-semibold">Procedimiento</div><ol className="list-decimal pl-5">{s.pasos.map((x, i) => <li key={i}>{x}</li>)}</ol></div>
        <div><div className="font-semibold">Puntos críticos</div><ul className="list-disc pl-5">{s.criticos.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
        <div><div className="font-semibold">Gestión de residuos</div><ul className="list-disc pl-5">{[...new Set(s.residuos)].map((x, i) => <li key={i}>{x}</li>)}</ul></div>
      </div>
    </div>
  );
}

function ParamField({ k, v, onChange }: { k: string; v: number; onChange: (v: number) => void }) {
  const [raw, setRaw] = useState(String(v).replace('.', ','));
  useEffect(() => setRaw(String(v).replace('.', ',')), [v]);
  const [label, unit] = PARAM_LABEL[k] ?? [k, ''];
  return (
    <NumField label={label} value={raw} unit={unit} onChange={(x) => { setRaw(x); const n = parseNumber(x); if (n != null && n > 0) onChange(n); }} error={parseNumber(raw) == null || parseNumber(raw)! <= 0 ? 'Número mayor que cero.' : null} />
  );
}

/* ---------------- simulador de diagramación ---------------- */

const CAMPOS: { key: string; label: string; rows: number }[] = [
  { key: 'objetivo', label: 'Objetivo', rows: 2 },
  { key: 'reacciones', label: 'Reacción(es) y estequiometría', rows: 3 },
  { key: 'calculos', label: 'Cálculos previos: masas y volúmenes a medir', rows: 4 },
  { key: 'gasto', label: 'Gasto teórico esperado', rows: 1 },
  { key: 'pf', label: 'Detección del punto final / condiciones de medida', rows: 2 },
  { key: 'pasos', label: 'Pasos del procedimiento', rows: 4 },
  { key: 'formula', label: 'Fórmula de cálculo del resultado', rows: 2 },
  { key: 'criticos', label: 'Puntos críticos', rows: 2 },
  { key: 'residuos', label: 'Gestión de residuos', rows: 2 },
];

const store = {
  get(k: string): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(k) ?? '{}');
    } catch {
      return {};
    }
  },
  set(k: string, v: Record<string, string>) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* sin almacenamiento */
    }
  },
};

const mmss = (s: number) => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

function Simulador({ code, minutos, onTerminar }: { code: string; minutos: number; onTerminar: (segundosUsados: number) => void }) {
  const total = minutos * 60;
  const [practica, setPractica] = useState(true);
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const [txt, setTxt] = useState<Record<string, string>>(() => store.get(`analiticapp.diagramacion.${code}`));
  const tick = useRef<number | null>(null);
  useEffect(() => {
    setLeft(total);
    setRunning(false);
    setTxt(store.get(`analiticapp.diagramacion.${code}`));
  }, [code, total]);
  useEffect(() => {
    if (!running) return;
    tick.current = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => {
      if (tick.current) window.clearInterval(tick.current);
    };
  }, [running]);
  useEffect(() => {
    if (left <= 0 && running) setRunning(false);
  }, [left, running]);
  useEffect(() => store.set(`analiticapp.diagramacion.${code}`, txt), [code, txt]);
  const started = left < total;
  const pct = (left / total) * 100;
  return (
    <section className="card min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="card-title mb-0">⏱ Simulador de diagramación ({minutos} min)</h3>
        <Segmented value={practica ? 'p' : 'e'} onChange={(v) => setPractica(v === 'p')} options={[{ value: 'p', label: 'Modo práctica' }, { value: 'e', label: 'Modo examen' }]} ariaLabel="Modo del simulador" />
      </div>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-xl bg-white/95 py-2 dark:bg-slate-900/95">
        <div className={`font-mono text-4xl font-bold tabular-nums ${left <= 0 ? 'text-red-600' : left <= 300 ? 'text-amber-600' : 'text-brand-700 dark:text-brand-300'}`} aria-live="polite">{mmss(left)}</div>
        <div className="h-2 min-w-[8rem] flex-1 overflow-hidden rounded bg-slate-200 dark:bg-slate-800"><div className={`h-full ${left <= 300 ? 'bg-amber-500' : 'bg-brand-600'}`} style={{ width: `${pct}%` }} /></div>
        {!running && left > 0 && <button className="btn btn-primary" onClick={() => setRunning(true)}>{started ? 'Continuar' : 'Empezar'}</button>}
        {running && practica && <button className="btn" onClick={() => setRunning(false)}>Pausar</button>}
        {practica && <button className="btn" onClick={() => { setLeft(total); setRunning(false); }}>Reiniciar reloj</button>}
        <button className="btn" onClick={() => { setRunning(false); onTerminar(total - Math.max(0, left)); }}>Terminar y ver la solución</button>
      </div>
      {!practica && <p className="text-xs text-slate-600 dark:text-slate-400">En modo examen el reloj no se puede pausar ni reiniciar.</p>}
      {left <= 300 && left > 0 && <Alert kind="warn">Quedan 5 minutos o menos.</Alert>}
      {left <= 0 && <Alert kind="error">¡Se terminó el tiempo! Tocá "Terminar y ver la solución" para compararla con la tuya.</Alert>}
      <div className="grid gap-3 md:grid-cols-2">
        {CAMPOS.map((c) => (
          <div key={c.key} className={c.rows >= 4 ? 'md:col-span-2' : ''}>
            <label className="label" htmlFor={`d-${c.key}`}>{c.label}</label>
            <textarea id={`d-${c.key}`} className="input" rows={c.rows} value={txt[c.key] ?? ''} onChange={(e) => setTxt({ ...txt, [c.key]: e.target.value })} />
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">Lo que escribís queda guardado en este navegador para este código de sorteo.</p>
    </section>
  );
}

/* ---------------- resolver ---------------- */

function BloqueView({ b, unidad }: { b: Bloque; unidad: string }) {
  const kind = b.estado === 'ideal' || b.estado === 'cumple' ? 'ok' : b.estado === 'aceptable' ? 'info' : b.estado === 'sin-criterio' || b.estado === 'faltan-datos' ? 'warn' : 'error';
  const label = { ideal: '✓ Ideal', aceptable: '✓ Aceptable', cumple: '✓ Cumple', 'no-cumple': '✗ No cumple', 'sin-criterio': 'Sin criterio en la letra', 'faltan-datos': 'Faltan datos' }[b.estado];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{b.titulo}</h4><span className="chip">{label}</span></div>
      <div className="flex flex-wrap gap-1">
        {b.valores.map((v, i) => <span key={i} className={`rounded px-2 py-0.5 font-mono text-sm ${b.incluidos[i] ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 line-through dark:bg-red-900/50'}`}>{String(v).replace('.', ',')}</span>)}
      </div>
      {b.n >= 2 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Promedio" value={fmtSig(b.media, 5)} sub={`n = ${b.n}`} />
          <Stat label="s" value={fmtSig(b.s, 2)} />
          <Stat label="CV" value={`${fmtSig(b.cv, 2)} %`} />
          <Stat label={b.factor === 1.96 ? 'x̄ ± 1,96·σR/√n' : 'x̄ ± t·s/√n (95 %)'} value={`${fmtSig(b.media, 5)} ± ${fmtSig(b.cai, 2)}`} sub={unidad} />
        </div>
      )}
      <Alert kind={kind}><ul className="list-disc pl-4">{b.explicacion.map((e, i) => <li key={i}>{e}</li>)}</ul></Alert>
    </div>
  );
}

function Resolver({ p, inicial }: { p: ProblemaRP; inicial?: { std: number[]; an: number[] } }) {
  const [std, setStd] = useState(inicial?.std.map((x) => String(x).replace('.', ',')).join('\n') ?? '');
  const [an, setAn] = useState(inicial?.an.map((x) => String(x).replace('.', ',')).join('\n') ?? '');
  const [test, setTest] = useState<'dixon' | 'grubbs'>('dixon');
  useEffect(() => {
    if (inicial) {
      setStd(inicial.std.map((x) => String(x).replace('.', ',')).join('\n'));
      setAn(inicial.an.map((x) => String(x).replace('.', ',')).join('\n'));
    }
  }, [inicial]);
  const s = parseList(std);
  const a = parseList(an);
  const espectro = p.criterios.tipo === 'rp2' && p.criterios.medida === 'espectrofotometrica';
  const v = p.criterios.tipo === 'rp1' ? veredictoRP1(p.criterios, s.values, a.values, test) : veredictoRP2(p.criterios, s.values, a.values);
  return (
    <section className="card min-w-0 space-y-3">
      <h3 className="card-title">Resolver: tus réplicas con los criterios oficiales</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {!espectro && (
          <div>
            <label className="label" htmlFor="r-std">Concentraciones del agente valorante (mol/L), una por línea</label>
            <textarea id="r-std" className="input h-28 font-mono" value={std} onChange={(e) => setStd(e.target.value)} />
            {s.bad.length > 0 && <p className="text-sm text-red-700">No entiendo: {s.bad.join(', ')}</p>}
          </div>
        )}
        <div>
          <label className="label" htmlFor="r-an">Resultados del analito, uno por línea</label>
          <textarea id="r-an" className="input h-28 font-mono" value={an} onChange={(e) => setAn(e.target.value)} />
          {a.bad.length > 0 && <p className="text-sm text-red-700">No entiendo: {a.bad.join(', ')}</p>}
        </div>
      </div>
      {p.criterios.tipo === 'rp1' && <Segmented value={test} onChange={setTest} options={[{ value: 'dixon', label: 'Test de Dixon' }, { value: 'grubbs', label: 'Test de Grubbs' }]} ariaLabel="Test de anómalos" />}
      {v.titulante && <BloqueView b={v.titulante} unidad="mol/L" />}
      <BloqueView b={v.analito} unidad="" />
      <Procedure
        steps={[
          ...(p.criterios.tipo === 'rp1'
            ? [
                { title: 'Agente valorante', text: 'Con σR conocido: Ir = 2,8·σR. Se promedian los valores cuya diferencia sea ≤ Ir (mínimo 3). CAI = 1,96·σR/√n.' },
                { title: 'Analito', text: 'Se descarta un valor anómalo si el test (Dixon: Q = brecha/rango; Grubbs: G = |x − x̄|/s, α = 0,05) lo indica. Con los restantes se verifica CV < límite y se informa x̄ ± t·s/√n (95 %, n − 1 g.l.).' },
              ]
            : [
                { title: 'Estandarización', text: 'CV = s/x̄·100 de las 3 valoraciones: ideal < 0,5 %, aceptable < 1 %.' },
                { title: 'Analito', text: espectro ? 'Triplicado genuino: promediable si CV < 10 %.' : 'Se descarta un valor anómalo (Dixon, 95 %) y se promedian los valores con CV ideal < 1 % o aceptable < 2 %. Resultado x̄ ± t·s/√n.' },
              ]),
        ]}
      />
    </section>
  );
}

/* ---------------- pestaña ---------------- */

export default function RevisionTab() {
  const initCode = useMemo(() => readHash().code, []);
  const [modo, setModo] = useState<Modo>('sorteo');
  const [rpFiltro, setRpFiltro] = useState<'todas' | '1' | '2'>('todas');
  const [tecnica, setTecnica] = useState('todas');
  const [buscar, setBuscar] = useState('');
  const filtrados = PROBLEMAS.filter((p) => (rpFiltro === 'todas' || String(p.rp) === rpFiltro) && (tecnica === 'todas' || p.tecnica === tecnica) && matchesSearch(`${p.titulo} ${p.tema} ${p.tecnica}`, buscar));

  // sorteo
  const parsed = initCode ? leerCodigo(initCode) : null;
  const [code, setCode] = useState<string | null>(parsed && getProblema(parsed.problemaId) ? codigoSorteo(parsed.problemaId, parsed.seed) : null);
  const [codeInput, setCodeInput] = useState('');
  const [terminado, setTerminado] = useState<number | null>(null);
  const sorteo = useMemo(() => {
    const c = code ? leerCodigo(code) : null;
    return c ? sortear(c.problemaId, c.seed) : null;
  }, [code]);
  const pSorteo = sorteo ? getProblema(sorteo.problemaId)! : null;
  const sortearNuevo = () => {
    const pool = filtrados.length ? filtrados : PROBLEMAS;
    const p = pool[Math.floor(Math.random() * pool.length)];
    const seed = 1 + Math.floor(Math.random() * 99999);
    const c = codigoSorteo(p.id, seed);
    setCode(c);
    setTerminado(null);
    window.history.replaceState(null, '', `#revision?code=${c}`);
  };
  const usarCodigo = () => {
    const c = leerCodigo(codeInput);
    if (c && getProblema(c.problemaId)) {
      const cc = codigoSorteo(c.problemaId, c.seed);
      setCode(cc);
      setTerminado(null);
      window.history.replaceState(null, '', `#revision?code=${cc}`);
    }
  };
  const codeErr = codeInput.trim() !== '' && !(leerCodigo(codeInput) && getProblema(leerCodigo(codeInput)!.problemaId)) ? 'Código inválido (ej. 1-07-4821).' : null;

  // resolver
  const [resId, setResId] = useState(PROBLEMAS[0].id);
  const [resInicial, setResInicial] = useState<{ std: number[]; an: number[] } | undefined>(undefined);
  const resP = getProblema(resId)!;

  // docente
  const [docParams, setDocParams] = useState<Record<string, Record<string, number>>>({});

  return (
    <div className="space-y-4">
      <section className="card min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="card-title mb-0">Revisión práctica: pool de problemas</h2>
          <Segmented value={modo} onChange={setModo} options={[{ value: 'sorteo', label: '🎲 Sorteo' }, { value: 'resolver', label: '✅ Resolver' }, { value: 'docente', label: '👩‍🏫 Docente' }]} ariaLabel="Modo" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField label="Revisión" value={rpFiltro} onChange={setRpFiltro} options={[{ value: 'todas', label: 'Las dos' }, { value: '1', label: '1ª Revisión Práctica' }, { value: '2', label: '2ª Revisión Práctica' }]} />
          <SelectField label="Técnica" value={tecnica} onChange={setTecnica} options={[{ value: 'todas', label: 'Todas' }, ...TECNICAS.map((t) => ({ value: t, label: t }))]} />
          <div>
            <label className="label" htmlFor="rp-buscar">Tema o analito</label>
            <input id="rp-buscar" type="search" className="input" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="ej. fosfato, EDTA, Fajans…" />
          </div>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">{filtrados.length} de {PROBLEMAS.length} problemas con estos filtros.</p>
      </section>

      {modo === 'sorteo' && (
        <>
          <section className="card min-w-0 flex flex-wrap items-end gap-3">
            <button className="btn btn-primary" onClick={sortearNuevo}>🎲 Sortear problema</button>
            <div className="min-w-[12rem]"><NumField label="Repetir un sorteo con su código" value={codeInput} onChange={setCodeInput} placeholder="1-07-4821" error={codeErr} /></div>
            <button className="btn" onClick={usarCodigo} disabled={!!codeErr || !codeInput.trim()}>Cargar código</button>
            {code && <div className="text-sm">Código de este sorteo: <span className="chip font-mono">{code}</span> <button className="btn ml-1 px-2 py-1 text-xs" onClick={() => { try { navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}#revision?code=${code}`); } catch { /* ignorar */ } }}>Copiar link</button></div>}
          </section>
          {sorteo && pSorteo && (
            <>
              <Enunciado p={pSorteo} />
              <Simulador code={code!} minutos={INFO_RP[pSorteo.rp].minutosDiagramacion} onTerminar={(s) => setTerminado(s)} />
              {terminado != null && (
                <section className="card min-w-0 space-y-3">
                  <h3 className="card-title">Solución de referencia</h3>
                  <Alert kind="info">Tiempo usado: <strong>{mmss(terminado)}</strong> de {INFO_RP[pSorteo.rp].minutosDiagramacion}:00. Compará cada parte con lo que escribiste.</Alert>
                  <SolucionView s={solucion(pSorteo, sorteo.params)} />
                  <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm dark:border-slate-700">
                    <div className="font-semibold">Resultados simulados de este sorteo</div>
                    {sorteo.replicasEstandarizacion.length > 0 && <div>Agente valorante ({sorteo.titulante?.nombre}): <span className="font-mono">{sorteo.replicasEstandarizacion.map((x) => String(x).replace('.', ',')).join(' · ')}</span> mol/L</div>}
                    <div>Analito ({sorteo.declarado.unidad}): <span className="font-mono">{sorteo.replicasAnalito.map((x) => String(x).replace('.', ',')).join(' · ')}</span></div>
                    <button className="btn mt-2" onClick={() => { setResId(pSorteo.id); setResInicial({ std: sorteo.replicasEstandarizacion, an: sorteo.replicasAnalito }); setModo('resolver'); }}>✅ Resolver con estos datos</button>
                  </div>
                </section>
              )}
            </>
          )}
          {!sorteo && <Alert kind="info">Tocá "Sortear problema" para empezar. Los filtros de arriba limitan el pool del sorteo.</Alert>}
        </>
      )}

      {modo === 'resolver' && (
        <>
          <section className="card min-w-0">
            <SelectField label="Problema" value={resId} onChange={(v) => { setResId(v); setResInicial(undefined); }} searchable searchPlaceholder="Buscar problema…"
              options={(filtrados.length ? filtrados : PROBLEMAS).map((p) => ({ value: p.id, label: `${p.rp}ª RP · ${p.numero}. ${p.titulo}`, group: INFO_RP[p.rp as RP].nombre }))} />
          </section>
          <Enunciado p={resP} />
          <Resolver key={resId} p={resP} inicial={resInicial} />
        </>
      )}

      {modo === 'docente' && (
        <div className="space-y-3">
          {filtrados.map((p) => {
            const prm = docParams[p.id] ?? parametrosPorDefecto(p);
            return (
              <details key={p.id} className="card min-w-0">
                <summary className="cursor-pointer font-semibold">{p.rp}ª RP · {p.numero}. {p.titulo} <span className="ml-1 text-xs font-normal text-slate-500">({p.tecnica})</span></summary>
                <div className="mt-3 space-y-3">
                  <Criterios p={p} />
                  {p.sugerencias && <div className="text-sm"><div className="font-semibold">Sugerencias de la letra</div><ul className="list-disc pl-5">{p.sugerencias.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
                  <SolucionView s={solucion(p, prm)} editable onParam={(k, v) => setDocParams((d) => ({ ...d, [p.id]: { ...prm, [k]: v } }))} />
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
