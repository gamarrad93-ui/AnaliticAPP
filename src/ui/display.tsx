/**
 * Preferencias de visualización: modo proyector y tema oscuro.
 * Se guardan en el navegador (si se puede) para la próxima visita.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface Display {
  projector: boolean;
  dark: boolean;
  setProjector: (v: boolean) => void;
  setDark: (v: boolean) => void;
}

const Ctx = createContext<Display>({ projector: false, dark: false, setProjector: () => {}, setDark: () => {} });

function load(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}
function save(key: string, v: boolean) {
  try {
    localStorage.setItem(key, v ? '1' : '0');
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

export function DisplayProvider({ children }: { children: ReactNode }) {
  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const [projector, setProjector] = useState(() => load('aa-proyector', false));
  const [dark, setDark] = useState(() => load('aa-oscuro', !!prefersDark));
  useEffect(() => {
    document.documentElement.classList.toggle('proyector', projector);
    save('aa-proyector', projector);
  }, [projector]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    save('aa-oscuro', dark);
  }, [dark]);
  return <Ctx.Provider value={{ projector, dark, setProjector, setDark }}>{children}</Ctx.Provider>;
}

export const useDisplay = () => useContext(Ctx);

/** Colores y tamaños de los gráficos según el modo. */
export function useChartTheme() {
  const { projector, dark } = useDisplay();
  return {
    fontSize: projector ? 18 : 13,
    strokeWidth: projector ? 3.5 : 2.25,
    axis: dark ? '#cbd5e1' : '#334155',
    grid: dark ? '#334155' : '#e2e8f0',
    text: dark ? '#f1f5f9' : '#0f172a',
    bg: dark ? '#0f172a' : '#ffffff',
    main: dark ? '#5eead4' : '#0f766e',
    accent: dark ? '#fca5a5' : '#b91c1c',
    muted: dark ? '#94a3b8' : '#64748b',
    height: projector ? 520 : 380,
    dark,
    projector,
  };
}

/**
 * Paleta categórica accesible (Okabe-Ito, segura para daltonismo).
 * Se usa para las especies del diagrama de distribución.
 */
export const SERIES_COLORS_LIGHT = ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#000000'];
export const SERIES_COLORS_DARK = ['#56B4E9', '#FF8C42', '#2EC4A0', '#E39BC5', '#F2B33D', '#9ED8F7', '#FFFFFF'];
export function useSeriesColors() {
  const { dark } = useDisplay();
  return dark ? SERIES_COLORS_DARK : SERIES_COLORS_LIGHT;
}
