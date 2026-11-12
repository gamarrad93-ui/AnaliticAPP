import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { APP_NAME, AUTHOR, COURSE, PROFESSOR } from './config';
import { useDisplay } from './ui/display';

// Cada pestaña se carga sólo cuando se abre (la app inicia más rápido en el celular)
const PracticesTab = lazy(() => import('./ui/tabs/PracticesTab'));
const TitrationTab = lazy(() => import('./ui/tabs/TitrationTab'));
const SpeciesTab = lazy(() => import('./ui/tabs/SpeciesTab'));
const CalibrationTab = lazy(() => import('./ui/tabs/CalibrationTab'));
const StatsTab = lazy(() => import('./ui/tabs/StatsTab'));
const RedoxTab = lazy(() => import('./ui/tabs/RedoxTab'));
const ComplexTab = lazy(() => import('./ui/tabs/ComplexTab'));
const SolubilityTab = lazy(() => import('./ui/tabs/SolubilityTab'));
const AboutTab = lazy(() => import('./ui/tabs/AboutTab'));

const TABS = [
  { id: 'practicos', label: 'Prácticos', icon: '🧫', C: PracticesTab },
  { id: 'titulaciones', label: 'Titulaciones', icon: '🧪', C: TitrationTab },
  { id: 'especies', label: 'Especies y buffers', icon: '📊', C: SpeciesTab },
  { id: 'calibracion', label: 'Calibración', icon: '📈', C: CalibrationTab },
  { id: 'estadistica', label: 'Estadística', icon: '🎯', C: StatsTab },
  { id: 'redox', label: 'Redox', icon: '⚡', C: RedoxTab },
  { id: 'complejos', label: 'EDTA y precipitación', icon: '🔗', C: ComplexTab },
  { id: 'solubilidad', label: 'Solubilidad', icon: '🧂', C: SolubilityTab },
  { id: 'acerca', label: 'Acerca de', icon: 'ℹ️', C: AboutTab },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** La pestaña activa queda en la URL (#calibracion) para poder compartir el link directo. */
function tabFromHash(): TabId {
  const h = window.location.hash.replace('#', '').split('?')[0];
  return (TABS.find((t) => t.id === h)?.id ?? 'practicos') as TabId;
}

export default function App() {
  const { projector, setProjector, dark, setDark } = useDisplay();
  const [tab, setTab] = useState<TabId>(tabFromHash);
  useEffect(() => {
    const on = () => setTab(tabFromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (id: TabId) => {
    window.location.hash = id;
    setTab(id);
  };
  const Current = TABS.find((t) => t.id === tab)!.C;
  // en el celular, que la pestaña activa quede visible en la barra deslizable
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [tab]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative z-20 overflow-hidden border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:sticky lg:top-0">
        <div className="h-1 bg-gradient-to-r from-brand-700 via-celeste to-turquesa" aria-hidden />
        <div className="relative">
        {/* Bandas diagonales en azules, como la plantilla de los teóricos del curso */}
        <svg aria-hidden className="pointer-events-none absolute right-0 top-0 hidden h-full w-96 opacity-90 sm:block" viewBox="0 0 400 100" preserveAspectRatio="none">
          <polygon points="250,0 400,0 400,100 190,100" fill="#b0d1f1" opacity="0.55" />
          <polygon points="300,0 400,0 400,100 250,100" fill="#4a92d4" opacity="0.7" />
          <polygon points="340,0 400,0 400,100 300,100" fill="#0f6fc6" />
          <polygon points="372,0 400,0 400,100 352,100" fill="#009dd9" />
          <line x1="215" y1="0" x2="160" y2="100" stroke="#0f6fc6" strokeWidth="1" opacity="0.5" />
        </svg>
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <div>
            <h1 className="font-titulo text-2xl text-brand-700 dark:text-brand-300">⚗️ {APP_NAME}</h1>
            <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">{COURSE}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className={`btn ${projector ? 'btn-primary' : ''}`} onClick={() => setProjector(!projector)} aria-pressed={projector} title="Letra grande y líneas gruesas para proyectar en clase">
              📽️ Modo proyector
            </button>
            <button className="btn" onClick={() => setDark(!dark)} aria-pressed={dark} title="Cambiar tema claro/oscuro">
              {dark ? '☀️ Claro' : '🌙 Oscuro'}
            </button>
          </div>
        </div>
        </div>
        <nav ref={navRef} className="relative mx-auto max-w-7xl overflow-x-auto px-2" aria-label="Secciones">
          <ul className="flex gap-1 whitespace-nowrap">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => go(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={`border-b-4 px-3 py-2 text-sm font-semibold transition-colors ${tab === t.id ? 'border-brand-700 text-brand-800 dark:border-brand-400 dark:text-brand-300' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  <span aria-hidden>{t.icon}</span> {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4">
        <Suspense fallback={<p className="p-8 text-center text-slate-500">Cargando…</p>}>
          <Current />
        </Suspense>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Hecho con IA (Claude) por {AUTHOR} · Validado con: {PROFESSOR}
      </footer>
    </div>
  );
}
