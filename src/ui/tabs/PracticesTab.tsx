/**
 * Pestaña: Prácticos de laboratorio (Cuaderneta de Laboratorio QA I 2026).
 * Cada práctico: diagramación (tomas para gastar ≈ 8 mL en bureta de 10,00 mL),
 * planilla de determinaciones y tratamiento estadístico con el criterio de la cuaderneta.
 */
import { useEffect, useState, type ComponentType } from 'react';
import { P1, P2, P3, P4, P5, P6, P7 } from '../practicas/semestre1';
import { P8, P9, P10, P11, P12, P13 } from '../practicas/semestre2';

const LIST: { n: number; sem: 1 | 2; title: string; C: ComponentType }[] = [
  { n: 1, sem: 1, title: 'Verificación de material volumétrico', C: P1 },
  { n: 2, sem: 1, title: 'Estandarización de HCl con Na₂CO₃', C: P2 },
  { n: 3, sem: 1, title: 'Estandarización de NaOH con ácido oxálico', C: P3 },
  { n: 4, sem: 1, title: '% m-m de ácido cítrico', C: P4 },
  { n: 5, sem: 1, title: 'Alcalinidad (Na₂CO₃ + NaHCO₃)', C: P5 },
  { n: 6, sem: 1, title: 'NiSO₄·6H₂O por complejometría', C: P6 },
  { n: 7, sem: 1, title: 'H₂O₂ por permanganimetría', C: P7 },
  { n: 8, sem: 2, title: 'Yodo (yodopovidona) por yodometría', C: P8 },
  { n: 9, sem: 2, title: 'Bromuro por Volhard', C: P9 },
  { n: 10, sem: 2, title: 'Humedad de yerba mate', C: P10 },
  { n: 11, sem: 2, title: 'H₃PO₄ en cola (potenciometría)', C: P11 },
  { n: 12, sem: 2, title: 'Paracetamol en jarabe (UV)', C: P12 },
  { n: 13, sem: 2, title: 'Fe(II) con fenantrolina (visible)', C: P13 },
];

function readPractice(): number {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const n = Number(q.get('p'));
  return LIST.some((x) => x.n === n) ? n : 2;
}

export default function PracticesTab() {
  const [n, setN] = useState(readPractice);
  // si cambia el link (#practicos?p=7) con la pestaña abierta, mostrar ese práctico
  useEffect(() => {
    const on = () => setN(readPractice());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    const base = window.location.hash.split('?')[0] || '#practicos';
    window.history.replaceState(null, '', `${base}?p=${n}`);
  }, [n]);
  const cur = LIST.find((x) => x.n === n)!;
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <nav aria-label="Prácticos" className="space-y-3 lg:sticky lg:top-28 lg:self-start">
        <label className="label lg:hidden" htmlFor="psel">Práctico</label>
        <select id="psel" className="input lg:hidden" value={n} onChange={(e) => setN(Number(e.target.value))}>
          {LIST.map((x) => (
            <option key={x.n} value={x.n}>{x.n}. {x.title}</option>
          ))}
        </select>
        <div className="hidden space-y-3 lg:block">
          {[1, 2].map((sem) => (
            <div key={sem}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{sem === 1 ? "1er" : "2º"} semestre</div>
              <ul className="space-y-0.5">
                {LIST.filter((x) => x.sem === sem).map((x) => (
                  <li key={x.n}>
                    <button
                      onClick={() => setN(x.n)}
                      aria-current={x.n === n ? 'page' : undefined}
                      className={`w-full rounded-lg px-2 py-1.5 text-left text-sm ${x.n === n ? 'bg-brand-700 font-semibold text-white' : 'hover:bg-brand-50 dark:hover:bg-brand-950'}`}
                    >
                      <span className="mr-1 font-mono">{x.n}.</span> {x.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="hidden text-xs text-slate-500 lg:block">Gasto de referencia: 8 mL en bureta de 10,00 mL.</p>
      </nav>
      <div className="min-w-0">
        <cur.C key={n} />
      </div>
    </div>
  );
}
