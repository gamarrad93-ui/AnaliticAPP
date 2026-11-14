/**
 * Estadística de las determinaciones: criterio de promediabilidad (Q de Dixon 95 %, Grubbs 95 %)
 * y tratamiento de los valores promediables (x̄, n, s, CV, t·s/√n).
 */
import { mean, sd } from '../stats/descriptive';
import { tCritTwoSided } from '../stats/distributions';
import { dixonQ, grubbs } from '../stats/outliers';
import type { CriterioDeclarado } from './tipos';
import { fmtSig } from '../numeric/format';

const f = (x: number, sig = 5) => fmtSig(x, sig);
const f3 = (x: number) => x.toFixed(3).replace('.', ',');

export interface Tratamiento {
  n: number;
  media: number;
  s: number;
  cv: number; // %
  sem: number; // s/√n
  t: number; // t(95 %, n−1)
  compAleatorio: number; // t·s/√n
}

/** Variante del t usada (para diagnosticar errores típicos). */
export type ModoT = 'correcto' | 'n' | 'z' | 'sinRaiz';

export function tratamiento(valores: number[], modoT: ModoT = 'correcto'): Tratamiento {
  const n = valores.length;
  const m = n ? mean(valores) : NaN;
  const s = n >= 2 ? sd(valores) : NaN;
  const sem = s / Math.sqrt(n);
  let t = n >= 2 ? tCritTwoSided(0.95, n - 1) : NaN;
  if (modoT === 'n') t = tCritTwoSided(0.95, n);
  if (modoT === 'z') t = 1.959964;
  const comp = modoT === 'sinRaiz' ? t * s : t * sem;
  return { n, media: m, s, cv: (s / Math.abs(m)) * 100, sem, t, compAleatorio: comp };
}

export interface PasoCriterio {
  texto: string;
  descartado?: number;
}

/**
 * Aplica el criterio declarado a TODAS las determinaciones y devuelve qué valores son promediables.
 * Dixon: 3 ≤ n ≤ 10; Grubbs: n ≥ 3. Con menos datos se promedian todos.
 * `iterativo`: si se descarta un valor, se vuelve a aplicar el test a los restantes.
 */
export function promediablesPorCriterio(
  valores: number[],
  tipo: 'dixon' | 'grubbs',
  iterativo = false,
): { mascara: boolean[]; pasos: PasoCriterio[] } {
  const mascara = valores.map((v) => Number.isFinite(v));
  const pasos: PasoCriterio[] = [];
  for (;;) {
    const idx = mascara.map((ok, i) => (ok ? i : -1)).filter((i) => i >= 0);
    const x = idx.map((i) => valores[i]);
    const n = x.length;
    if (n < 3 || (tipo === 'dixon' && n > 10)) {
      pasos.push({ texto: `n = ${n}: el test ${tipo === 'dixon' ? 'Q de Dixon' : 'de Grubbs'} no se aplica; se promedian todos.` });
      break;
    }
    let descartar: number | null = null;
    if (tipo === 'dixon') {
      const r = dixonQ(x, 95);
      pasos.push({
        texto: `Q de Dixon (n = ${n}): valor sospechoso ${f(r.suspect)}; Q = brecha/rango = ${f(r.gap, 3)}/${f(r.range, 3)} = ${f3(r.Q)}; Q crítico (95 %) = ${f3(r.Qcrit)} → ${r.reject ? 'se DESCARTA' : 'se conserva'}.`,
        descartado: r.reject ? r.suspect : undefined,
      });
      if (r.reject) descartar = r.suspect;
    } else {
      const r = grubbs(x, 0.05);
      pasos.push({
        texto: `Grubbs (n = ${n}): valor sospechoso ${f(r.suspect)}; G = |x − x̄|/s = ${f3(r.G)}; G crítico (95 %, bilateral) = ${f3(r.Gcrit)} → ${r.reject ? 'se DESCARTA' : 'se conserva'}.`,
        descartado: r.reject ? r.suspect : undefined,
      });
      if (r.reject) descartar = r.suspect;
    }
    if (descartar == null) break;
    const k = idx.find((i) => valores[i] === descartar)!;
    mascara[k] = false;
    if (!iterativo) break;
  }
  return { mascara, pasos };
}

/**
 * Máscara de promediables que usa el motor: la del criterio si es Dixon/Grubbs;
 * la marcada por el alumno si el criterio es "Otro".
 */
export function mascaraCorrecta(
  valores: number[],
  criterio: CriterioDeclarado,
  marcadas: boolean[],
  iterativo: boolean,
): { mascara: boolean[]; pasos: PasoCriterio[] } {
  if (criterio.tipo === 'otro') {
    return {
      mascara: marcadas.map((m, i) => m && Number.isFinite(valores[i])),
      pasos: [{ texto: `Criterio "Otro" declarado por el alumno: «${criterio.texto || '(sin texto)'}». Se usan los valores que marcó (*).` }],
    };
  }
  return promediablesPorCriterio(valores, criterio.tipo, iterativo);
}
