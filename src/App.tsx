import { lazy, Suspense, useEffect, useState } from 'react';
import { APP_NAME, AUTHOR, COURSE, PROFESSOR } from './config';
import { useDisplay } from './ui/display';

// Cada pestaña se carga sólo cuando se abre (la app inicia más rápido en el celular)
const TitrationTab = lazy(() => import('./ui/tabs/TitrationTab'));
const SpeciesTab = lazy(() => import('./ui/tabs/SpeciesTab'));
const CalibrationTab = lazy(() => import('./ui/tabs/CalibrationTab'));
const StatsTab = lazy(() => import('./ui/tabs/StatsTab'));
const AboutTab = lazy(() => import('./ui/tabs/AboutTab'));

const TABS = [
  { id: 'titulaciones', label: 'Titulaciones', icon: '🧪', C: TitrationTab },
  { id: 'especies', label: 'Especies y buffers', icon: '📊', C: SpeciesTab },
  { id: 'calibracion', label: 'Calibración', icon: '📈', C: CalibrationTab },
  { id: 'estadistica', label: 'Estadística', icon: '🎯', C: StatsTab },
  { id: 'acerca', label: 'Acerca de', icon: 'ℹ️', C: AboutTab },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** La pestaña activa queda en la URL (#calibracion) para poder compartir el link directo. */
function tabFromHash(): TabId {
  const h = window.location.hash.replace('#', '');
  return (TABS.find((t) => t.id === h)?.id ?? 'titulaciones') as TabId;
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <div>
            <h1 className="text-xl font-bold text-teal-800 dark:text-teal-300">⚗️ {APP_NAME}</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">{COURSE}</p>
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
        <nav className="mx-auto max-w-7xl overflow-x-auto px-2" aria-label="Secciones">
          <ul className="flex gap-1 whitespace-nowrap">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => go(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={`border-b-4 px-3 py-2 text-sm font-semibold transition-colors ${tab === t.id ? 'border-teal-700 text-teal-800 dark:border-teal-400 dark:text-teal-300' : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
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
