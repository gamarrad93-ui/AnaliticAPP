/**
 * Veredicto con los criterios oficiales de cada Revisión Práctica.
 *  1ª RP: agente valorante → σR (Ir = 2,8·σR, CAI = 1,96·σR/√n); analito → ausencia de anómalos
 *         (Dixon o Grubbs) y CV < límite de la tabla.
 *  2ª RP: estandarización → 3 valores, CV < 0,5 % (ideal) / 1 % (aceptable);
 *         analito → sin anómalos (Dixon) y CV < 1 % (ideal) / 2 % (aceptable);
 *         espectrofotometría → CV < 10 %.
 */
import { mean, sd } from '../stats/descriptive';
import { tCritTwoSided } from '../stats/distributions';
import { dixonQ, grubbs } from '../stats/outliers';
import { largestConcordantSubset, largestSubsetUnderCV } from '../lab/promediables';
import { CRITERIOS_RP2, type CriteriosRP1, type CriteriosRP2 } from '../../data/revision-practica';

export type Estado = 'ideal' | 'aceptable' | 'cumple' | 'no-cumple' | 'sin-criterio' | 'faltan-datos';

export interface Bloque {
  titulo: string;
  valores: number[];
  incluidos: boolean[];
  n: number;
  media: number;
  s: number;
  cv: number;
  /** semiamplitud del intervalo (CAI) */
  cai: number;
  factor: number;
  estado: Estado;
  explicacion: string[];
}

function stats(v: number[]) {
  const n = v.length;
  const m = n ? mean(v) : NaN;
  const s = n >= 2 ? sd(v) : NaN;
  return { n, m, s, cv: (s / Math.abs(m)) * 100 };
}

const f = (x: number, d = 4) => (Number.isFinite(x) ? Number(x.toPrecision(d)).toString().replace('.', ',') : '—');

function bloque(titulo: string, valores: number[], idx: number[], estado: Estado, explicacion: string[], sigma?: number): Bloque {
  const sel = idx.map((i) => valores[i]);
  const st = stats(sel);
  const factor = sigma != null ? 1.96 : st.n >= 2 ? tCritTwoSided(0.95, st.n - 1) : NaN;
  const cai = sigma != null ? (1.96 * sigma) / Math.sqrt(st.n) : (factor * st.s) / Math.sqrt(st.n);
  return { titulo, valores, incluidos: valores.map((_, i) => idx.includes(i)), n: st.n, media: st.m, s: st.s, cv: st.cv, cai, factor, estado, explicacion };
}

/** Quita un valor anómalo según el test elegido (una sola vez, α = 0,05). */
export function quitarAnomalo(v: number[], test: 'dixon' | 'grubbs'): { idx: number[]; texto: string } {
  const idx = v.map((_, i) => i);
  if (v.length < 3) return { idx, texto: 'Con menos de 3 valores no se puede aplicar el test de anómalos.' };
  if (test === 'dixon') {
    if (v.length > 10) return { idx, texto: 'El test Q de Dixon se aplica a 3–10 valores.' };
    const r = dixonQ(v, 95);
    const t = `Dixon: valor sospechoso ${f(r.suspect, 6)}, Q = ${f(r.Q, 3)} ${r.reject ? '>' : '≤'} Q crítico (95 %, n = ${v.length}) = ${f(r.Qcrit, 3)} → ${r.reject ? 'es anómalo y se descarta' : 'no es anómalo'}.`;
    return { idx: r.reject ? idx.filter((i) => i !== v.indexOf(r.suspect)) : idx, texto: t };
  }
  const r = grubbs(v);
  const t = `Grubbs: valor sospechoso ${f(r.suspect, 6)}, G = ${f(r.G, 3)} ${r.reject ? '>' : '≤'} G crítico (α = 0,05, n = ${v.length}) = ${f(r.Gcrit, 3)} → ${r.reject ? 'es anómalo y se descarta' : 'no es anómalo'}.`;
  return { idx: r.reject ? idx.filter((i) => i !== v.indexOf(r.suspect)) : idx, texto: t };
}

export function veredictoRP1(c: CriteriosRP1, titulante: number[], analito: number[], test: 'dixon' | 'grubbs' = 'dixon'): { titulante: Bloque; analito: Bloque } {
  // agente valorante
  let tb: Bloque;
  if (titulante.length < 3) tb = bloque('Agente valorante', titulante, titulante.map((_, i) => i), 'faltan-datos', ['Hacen falta al menos 3 valores.']);
  else if (c.sigmaR == null) tb = bloque('Agente valorante', titulante, titulante.map((_, i) => i), 'sin-criterio', ['La tabla de la letra no indica σR para este problema: solo se informan los estadísticos.']);
  else {
    const Ir = 2.8 * c.sigmaR;
    const idx = largestConcordantSubset(titulante, Ir);
    const ok = idx.length >= 3;
    tb = bloque('Agente valorante', titulante, idx, ok ? 'cumple' : 'no-cumple', [
      `σR = ${f(c.sigmaR, 3)} mol/L → Ir = 2,8·σR = ${f(Ir, 3)} mol/L.`,
      ok ? `Hay ${idx.length} valores cuya diferencia es ≤ Ir: se promedian.` : `No hay 3 valores cuya diferencia sea ≤ Ir: hay que hacer más determinaciones.`,
      'Incertidumbre: CAI = 1,96·σR/√n.',
    ], c.sigmaR);
  }
  // analito
  let ab: Bloque;
  if (analito.length < 3) ab = bloque('Analito', analito, analito.map((_, i) => i), 'faltan-datos', ['Hacen falta al menos 3 valores.']);
  else {
    const q = quitarAnomalo(analito, test);
    const st = stats(q.idx.map((i) => analito[i]));
    const ok = st.n >= 3 && st.cv < c.cvMax;
    ab = bloque('Analito', analito, q.idx, ok ? 'cumple' : 'no-cumple', [
      `Criterio de la letra: ${c.textoAnalito}.`,
      q.texto,
      `CV de los valores restantes = ${f(st.cv, 3)} % ${st.cv < c.cvMax ? '<' : '≥'} ${f(c.cvMax, 2)} %${st.n < 3 ? ' (quedan menos de 3 valores)' : ''}.`,
      'Resultado: x̄ ± t·s/√n (95 %).',
    ]);
  }
  return { titulante: tb, analito: ab };
}

export function veredictoRP2(c: CriteriosRP2, titulante: number[], analito: number[]): { titulante: Bloque | null; analito: Bloque } {
  let tb: Bloque | null = null;
  if (c.medida !== 'espectrofotometrica') {
    const { cvIdeal, cvAceptable } = CRITERIOS_RP2.estandarizacion;
    if (titulante.length < 3) tb = bloque('Estandarización', titulante, titulante.map((_, i) => i), 'faltan-datos', ['Se realizan 3 valoraciones.']);
    else {
      const idx = largestSubsetUnderCV(titulante, cvAceptable, 3);
      const sel = idx.length ? idx : titulante.map((_, i) => i);
      const st = stats(sel.map((i) => titulante[i]));
      const estado: Estado = idx.length >= 3 ? (st.cv < cvIdeal ? 'ideal' : 'aceptable') : 'no-cumple';
      tb = bloque('Estandarización', titulante, sel, estado, [
        `Se promedian los resultados cuyo CV sea menor a ${f(cvIdeal, 2)} % (ideal) o ${f(cvAceptable, 2)} % (aceptable).`,
        `CV = ${f(st.cv, 3)} % → ${estado === 'ideal' ? 'ideal' : estado === 'aceptable' ? 'aceptable' : 'no cumple'}.`,
      ]);
    }
  }
  let ab: Bloque;
  if (analito.length < 3) ab = bloque('Analito', analito, analito.map((_, i) => i), 'faltan-datos', ['Hacen falta al menos 3 valores (triplicado genuino en espectrofotometría).']);
  else if (c.medida === 'espectrofotometrica') {
    const st = stats(analito);
    const ok = st.cv < CRITERIOS_RP2.espectrofotometria.cvMax;
    ab = bloque('Analito', analito, analito.map((_, i) => i), ok ? 'cumple' : 'no-cumple', [`Criterio de promediabilidad en espectrofotometría: CV < ${CRITERIOS_RP2.espectrofotometria.cvMax} %.`, `CV = ${f(st.cv, 3)} %.`]);
  } else {
    const { cvIdeal, cvAceptable } = CRITERIOS_RP2.analito;
    const q = quitarAnomalo(analito, 'dixon');
    const vals = q.idx.map((i) => analito[i]);
    const sub = largestSubsetUnderCV(vals, cvAceptable, 3).map((k) => q.idx[k]);
    const sel = sub.length ? sub : q.idx;
    const st = stats(sel.map((i) => analito[i]));
    const estado: Estado = sub.length >= 3 ? (st.cv < cvIdeal ? 'ideal' : 'aceptable') : 'no-cumple';
    ab = bloque('Analito', analito, sel, estado, [
      `Se promedian los valores que no superen un CV de ${f(cvIdeal, 2)} % (ideal) o ${f(cvAceptable, 2)} % (aceptable), y/o que no presenten valores anómalos.`,
      q.texto,
      `CV = ${f(st.cv, 3)} % → ${estado === 'ideal' ? 'ideal' : estado === 'aceptable' ? 'aceptable' : 'no cumple'}.`,
      ...(c.medida === 'potenciometrica' ? ['La incertidumbre de la concentración se calcula por propagación (pestaña Potenciometría).'] : []),
    ]);
  }
  return { titulante: tb, analito: ab };
}
