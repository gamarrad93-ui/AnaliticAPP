/**
 * Curvas de titulación ácido-base exactas.
 *
 * Analito: volumen Va (mL) de una mezcla de componentes con concentraciones iniciales.
 * Titulante: componente fuerte (NaOH, HCl, ...) de concentración Ct.
 * Al agregar Vt mL de titulante, cada concentración se diluye:
 *    C_analito·Va/(Va+Vt),   C_titulante·Vt/(Va+Vt)
 * y el pH se obtiene resolviendo el balance de carga completo (ver equilibrium.ts).
 *
 * Además, el volumen necesario para llegar a un pH dado se obtiene en forma EXACTA y cerrada
 * despejando Vt del balance de carga multiplicado por (Va+Vt):
 *    (h − Kw/h)(Va+Vt) + Va·Qa(h) + Vt·Qt(h) = 0
 *    ⇒ Vt = −Va·(h − Kw/h + Qa) / (h − Kw/h + Qt)
 * donde Qa y Qt son las cargas por litro del analito y del titulante SIN diluir.
 */
import { KW, componentCharge, solvePH, scaleComponent, type Component } from './equilibrium';
import { bisect } from '../numeric/solve';

export interface TitrationSetup {
  analyte: Component[];
  /** volumen de analito, mL */
  Va: number;
  titrant: Component;
}

export type Direction = 'base' | 'acid';

/** ¿El titulante es básico (sube el pH) o ácido? */
export function titrantDirection(t: Component): Direction {
  if (t.kind === 'strong-base') return 'base';
  if (t.kind === 'strong-acid') return 'acid';
  // débil: según su carga a pH 7 respecto a la forma agregada
  return componentCharge(t, -7) > 0 ? 'base' : 'acid';
}

/** Componentes presentes luego de agregar Vt mL de titulante. */
export function mixtureAt(s: TitrationSetup, Vt: number): Component[] {
  const Vtot = s.Va + Vt;
  const comps = s.analyte.map((c) => scaleComponent(c, s.Va / Vtot));
  if (Vt > 0) comps.push(scaleComponent(s.titrant, Vt / Vtot));
  return comps;
}

/** pH exacto luego de agregar Vt mL de titulante. */
export function pHAt(s: TitrationSetup, Vt: number): number {
  return solvePH(mixtureAt(s, Math.max(0, Vt)));
}

/** Volumen (mL) de titulante para alcanzar un pH dado. Devuelve null si no es alcanzable. */
export function volumeAtPH(s: TitrationSetup, pH: number): number | null {
  const logH = -pH;
  const h = Math.pow(10, logH);
  const D = h - KW / h;
  let Qa = 0;
  for (const c of s.analyte) Qa += componentCharge(c, logH);
  const Qt = componentCharge(s.titrant, logH);
  const den = D + Qt;
  if (den === 0) return null;
  const V = (-s.Va * (D + Qa)) / den;
  return Number.isFinite(V) && V >= 0 ? V : null;
}

/** Un "sitio" titulable: un protón (o una base) con su pKa asociado. */
interface Site {
  moles: number; // mmol (C en mol/L × V en mL)
  pKa: number; // −∞ ácido fuerte, +∞ base fuerte
  label: string;
}

/** Sitios que reacciona con el titulante, en el orden en que reaccionan. */
function titratableSites(s: TitrationSetup, dir: Direction, names?: string[][]): Site[] {
  const sites: Site[] = [];
  s.analyte.forEach((c, idx) => {
    const mmol = c.C * s.Va;
    if (dir === 'base') {
      if (c.kind === 'strong-acid') for (let i = 0; i < c.n; i++) sites.push({ moles: mmol, pKa: -Infinity, label: 'H⁺ fuerte' });
      if (c.kind === 'weak') {
        const n = c.system.pKa.length;
        for (let j = n - c.hAdded; j < n; j++) {
          sites.push({ moles: mmol, pKa: c.system.pKa[j], label: names?.[idx]?.[j] ? `${names[idx][j]} → ${names[idx][j + 1]}` : `pKa${j + 1}` });
        }
      }
    } else {
      if (c.kind === 'strong-base') for (let i = 0; i < c.n; i++) sites.push({ moles: mmol, pKa: Infinity, label: 'OH⁻ fuerte' });
      if (c.kind === 'weak') {
        const n = c.system.pKa.length;
        for (let j = n - c.hAdded - 1; j >= 0; j--) {
          sites.push({ moles: mmol, pKa: c.system.pKa[j], label: names?.[idx]?.[j] ? `${names[idx][j + 1]} → ${names[idx][j]}` : `pKa${j + 1}` });
        }
      }
    }
  });
  // la base reacciona primero con el ácido más fuerte (pKa menor); el ácido con la base más fuerte
  sites.sort((a, b) => (dir === 'base' ? a.pKa - b.pKa : b.pKa - a.pKa));
  return sites;
}

export type Sharpness = 'nitido' | 'poco-nitido' | 'no-detectable';

export interface EquivalencePoint {
  index: number; // 1, 2, 3...
  V: number; // mL
  pH: number;
  /** salto de pH entre 98 % y 102 % de ese tramo */
  jump: number;
  sharpness: Sharpness;
  /** pKa del sitio que se completa en este punto (±∞ para fuertes) */
  pKa: number;
  label: string;
}

export interface HalfPoint {
  index: number;
  V: number;
  pH: number;
  pKa: number;
}

export function classifyJump(jump: number): Sharpness {
  if (jump >= 1.5) return 'nitido';
  if (jump >= 0.5) return 'poco-nitido';
  return 'no-detectable';
}

/**
 * Puntos de equivalencia estequiométricos (moles de titulante = moles de sitios acumulados)
 * y puntos de semiequivalencia (mitad de cada tramo).
 */
export function equivalencePoints(
  s: TitrationSetup,
  names?: string[][],
): { eq: EquivalencePoint[]; half: HalfPoint[]; direction: Direction } {
  const dir = titrantDirection(s.titrant);
  const sites = titratableSites(s, dir, names);
  const tEq = s.titrant.kind === 'weak' ? 1 : s.titrant.n; // equivalentes por mol de titulante
  const eq: EquivalencePoint[] = [];
  const half: HalfPoint[] = [];
  let cum = 0;
  let Vprev = 0;
  sites.forEach((site, i) => {
    cum += site.moles;
    const V = cum / (s.titrant.C * tEq);
    const dV = V - Vprev;
    const jump = Math.abs(pHAt(s, V + 0.02 * dV) - pHAt(s, V - 0.02 * dV));
    eq.push({ index: i + 1, V, pH: pHAt(s, V), jump, sharpness: classifyJump(jump), pKa: site.pKa, label: site.label });
    const Vh = (Vprev + V) / 2;
    half.push({ index: i + 1, V: Vh, pH: pHAt(s, Vh), pKa: site.pKa });
    Vprev = V;
  });
  return { eq, half, direction: dir };
}

export interface CurvePoint {
  V: number;
  pH: number;
  /** primera derivada dpH/dV (mL⁻¹) */
  d1?: number;
}

/**
 * Curva completa pH vs V entre 0 y Vmax.
 * Combina una grilla uniforme en volumen (cálculo directo) con una grilla uniforme en pH
 * (cálculo inverso exacto), así la zona del salto queda bien resuelta.
 */
export function titrationCurve(s: TitrationSetup, Vmax: number, nUniform = 300): CurvePoint[] {
  const pts: CurvePoint[] = [];
  for (let i = 0; i <= nUniform; i++) {
    const V = (Vmax * i) / nUniform;
    pts.push({ V, pH: pHAt(s, V) });
  }
  const pH0 = pts[0].pH;
  const pH1 = pts[pts.length - 1].pH;
  const lo = Math.min(pH0, pH1);
  const hi = Math.max(pH0, pH1);
  const step = 0.02;
  for (let p = Math.ceil(lo / step) * step; p < hi; p += step) {
    const V = volumeAtPH(s, p);
    if (V != null && V > 0 && V < Vmax) pts.push({ V, pH: p });
  }
  pts.sort((a, b) => a.V - b.V);
  const out: CurvePoint[] = [];
  for (const p of pts) {
    if (out.length && p.V - out[out.length - 1].V < Vmax * 1e-7) continue;
    out.push(p);
  }
  // primera derivada por diferencias centrales en grilla no uniforme
  for (let i = 0; i < out.length; i++) {
    const a = out[Math.max(0, i - 1)];
    const b = out[Math.min(out.length - 1, i + 1)];
    out[i].d1 = b.V !== a.V ? (b.pH - a.pH) / (b.V - a.V) : 0;
  }
  return out;
}

/**
 * Volumen de punto final para un indicador que vira a pH = pHend.
 * Usa la solución exacta inversa; si no existe, busca por bisección en [0, Vmax].
 */
export function endpointVolume(s: TitrationSetup, pHend: number, Vmax: number): number | null {
  const V = volumeAtPH(s, pHend);
  if (V != null && V <= Vmax * 1.5) return V;
  const f = (v: number) => pHAt(s, v) - pHend;
  const f0 = f(0);
  const f1 = f(Vmax);
  if (f0 * f1 > 0) return null;
  return bisect(f, 0, Vmax, 1e-9);
}

/** Error de titulación (%) = (V_punto final − V_equivalencia) / V_equivalencia × 100 */
export function titrationError(Vend: number, Veq: number): number {
  return ((Vend - Veq) / Veq) * 100;
}
