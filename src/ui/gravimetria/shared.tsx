/** Piezas de Gravimetría: biblioteca de fórmulas guardada en el navegador y fórmulas en TeX. */
import { useEffect, useMemo, useState } from 'react';
import { BUILTIN_LIBRARY, type LibEntry } from '../../chem/gravimetria/biblioteca';

const KEY = 'analiticapp.gravimetria.biblioteca.v1';

interface Stored {
  custom: LibEntry[];
  overrides: Record<string, string>;
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Stored;
      return { custom: Array.isArray(s.custom) ? s.custom : [], overrides: s.overrides ?? {} };
    }
  } catch {
    /* sin almacenamiento: se usa la biblioteca de fábrica */
  }
  return { custom: [], overrides: {} };
}

/** Biblioteca editable: las de fábrica (con fórmula corregible) + las agregadas por el usuario. */
export function useLibrary() {
  const [st, setSt] = useState<Stored>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch {
      /* ignorar */
    }
  }, [st]);
  const entries = useMemo<(LibEntry & { edited: boolean; custom: boolean })[]>(
    () => [
      ...BUILTIN_LIBRARY.map((e) => ({ ...e, formula: st.overrides[e.id] ?? e.formula, edited: e.id in st.overrides, custom: false })),
      ...st.custom.map((e) => ({ ...e, edited: false, custom: true })),
    ],
    [st],
  );
  return {
    entries,
    add: (name: string, formula: string) =>
      setSt((s) => ({ ...s, custom: [...s.custom, { id: `c:${Date.now()}`, name, formula, group: 'Agregadas por mí' }] })),
    remove: (id: string) => setSt((s) => ({ ...s, custom: s.custom.filter((e) => e.id !== id) })),
    setFormula: (id: string, formula: string) =>
      setSt((s) =>
        id.startsWith('c:')
          ? { ...s, custom: s.custom.map((e) => (e.id === id ? { ...e, formula } : e)) }
          : { ...s, overrides: { ...s.overrides, [id]: formula } },
      ),
    restore: (id: string) =>
      setSt((s) => {
        const o = { ...s.overrides };
        delete o[id];
        return { ...s, overrides: o };
      }),
  };
}

/** Fórmula química a TeX (subíndices, punto de hidratación, carga). */
export function texFormula(f: string): string {
  let t = f.trim();
  let charge = '';
  const m = /^(.*?)(?:\s+|\^)\(?(\d*)([+-])\)?$/.exec(t) ?? /^(.*?[A-Za-z)\]])([+-])$/.exec(t);
  if (m) {
    if (m.length === 4) {
      t = m[1];
      charge = `^{${m[2]}${m[3]}}`;
    } else {
      t = m[1];
      charge = `^{${m[2]}}`;
    }
  }
  t = t.replace(/[·.*•]/g, '\\cdot ').replace(/([A-Za-z)\]])(\d+)/g, '$1_{$2}');
  return `\\mathrm{${t}}${charge}`;
}
