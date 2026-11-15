/**
 * Motor de la Revisión Práctica: solución de referencia (diagramación) de cada problema,
 * sorteo con valores realistas y veredicto con los criterios oficiales de cada RP.
 * Todo es determinístico: con la misma semilla se obtiene el mismo problema.
 */
import { parseFormula } from '../gravimetria/formula';
import { pHAt } from '../acidbase/titration';
import { getSystem } from '../data/acids';
import { suggestDilutions } from '../lab/practicas';
import { getProblema, type ProblemaRP } from '../../data/revision-practica';
import { rng, normal, uniform } from './azar';

export const M = (f: string) => parseFormula(f).M;
const MIN_MASA = 0.1;

export interface Calculo {
  etapa: string;
  label: string;
  valor: number;
  unidad: string;
  dec: number;
}

export interface Solucion {
  problema: ProblemaRP;
  objetivo: string;
  reacciones: { etapa: string; ecuacion: string; relacion: string }[];
  calculos: Calculo[];
  gastos: { etapa: string; G: number; label?: string }[];
  formulas: { etapa: string; texto: string }[];
  deteccion: { etapa: string; texto: string }[];
  pasos: string[];
  criticos: string[];
  residuos: string[];
  avisos: string[];
  /** pH en el punto equivalente (ácido-base), calculado con el motor exacto */
  pHeq?: { etapa: string; pH: number; Vdis: number }[];
  /** parámetros de simulación usados (editables) */
  params: Record<string, number>;
}

/* ---------------- piezas de cálculo ---------------- */

/** Masa a pesar: si es < 0,1 g, se propone pesar más, llevar a un matraz y tomar alícuotas. */
export function masaOAlicuota(m: number): { directa: boolean; m: number; matraz?: number; alicuota?: number; mStock?: number } {
  if (m >= MIN_MASA) return { directa: true, m };
  for (const [F, a] of [[100, 10], [250, 10], [250, 5], [500, 10], [500, 5]] as const) {
    const mStock = (m * F) / a;
    if (mStock >= MIN_MASA) return { directa: false, m, matraz: F, alicuota: a, mStock };
  }
  return { directa: false, m, matraz: 500, alicuota: 5, mStock: (m * 500) / 5 };
}

export interface TomaVolumen {
  directa: boolean;
  /** pipeta de dilución y matraz (si hay dilución) */
  pipeta?: number;
  matraz?: number;
  /** alícuota que se valora */
  alicuota: number;
  G: number;
}

/**
 * Toma de una solución de concentración C (mol/L) para un gasto cercano a Gobj:
 * directa con una pipeta aforada, o con una dilución previa (pipeta → matraz) y alícuota.
 * `molPorMolTit` = mol de analito por mol de titulante.
 */
export function tomaVolumen(C: number, Ct: number, molPorMolTit: number, Gobj: number): TomaVolumen {
  const pip = [5, 10, 20, 25];
  const pipDil = [1, 2, 5, 10, 20, 25];
  const fl = [50, 100, 250, 500];
  const cands: TomaVolumen[] = [];
  for (const a of pip) cands.push({ directa: true, alicuota: a, G: (C * a) / molPorMolTit / Ct });
  for (const p of pipDil) for (const F of fl) if (p < F) for (const a of pip) cands.push({ directa: false, pipeta: p, matraz: F, alicuota: a, G: (((C * p) / F) * a) / molPorMolTit / Ct });
  const score = (t: TomaVolumen) => Math.abs(t.G - Gobj) / Gobj + (t.directa ? 0 : 0.05);
  return cands.filter((t) => t.G <= 24).sort((x, y) => score(x) - score(y))[0];
}

/** pH en el punto equivalente con el motor ácido-base (muestra disuelta en Vdis mL). */
function pHenPE(systemId: string, hAdded: number, nAnalito: number, Vdis: number, titrant: 'HCl' | 'NaOH', Ct: number, Geq: number): number {
  const sys = getSystem(systemId)!;
  return pHAt({ analyte: [{ kind: 'weak', C: nAnalito / (Vdis / 1000), system: sys, hAdded }], Va: Vdis, titrant: titrant === 'HCl' ? { kind: 'strong-acid', C: Ct, n: 1 } : { kind: 'strong-base', C: Ct, n: 1 } }, Geq);
}

/* ---------------- estandarizaciones ---------------- */

type Std = 'Na2CO3/HCl' | 'oxalico/NaOH' | 'oxalico/KMnO4' | 'MgSO4/EDTA' | 'KIO3/S2O3' | 'NaCl/AgNO3';

const STD: Record<Std, { patron: string; formula: string; titulante: string; molPatronPorMolTit: number; reaccion: string; relacion: string; pf: string; formulaC: string; residuo: string }> = {
  'Na2CO3/HCl': { patron: 'Na2CO3 anhidro', formula: 'Na2CO3', titulante: 'HCl', molPatronPorMolTit: 1 / 2, reaccion: 'Na2CO3 + 2 HCl → 2 NaCl + CO2 + H2O', relacion: 'n(HCl) = 2·n(Na2CO3)', pf: 'Heliantina (viraje de amarillo a naranja/rojo): el 2º punto equivalente queda en zona ácida (H2CO3/CO2).', formulaC: 'C(HCl) = 2·m(Na2CO3)·1000 / (M(Na2CO3)·G)', residuo: 'Soluciones ácidas/neutras: controlar el pH (neutralizar si hace falta) y descartar en la pileta con abundante agua.' },
  'oxalico/NaOH': { patron: 'H2C2O4·2H2O', formula: 'H2C2O4·2H2O', titulante: 'NaOH', molPatronPorMolTit: 1 / 2, reaccion: 'H2C2O4 + 2 NaOH → Na2C2O4 + 2 H2O', relacion: 'n(NaOH) = 2·n(H2C2O4)', pf: 'Fenolftaleína (incoloro → rosado): el punto equivalente (C2O4²⁻) está en zona básica.', formulaC: 'C(NaOH) = 2·m(H2C2O4·2H2O)·1000 / (M·G)', residuo: 'Neutralizar (controlar el pH) y descartar en la pileta con abundante agua.' },
  'oxalico/KMnO4': { patron: 'H2C2O4·2H2O', formula: 'H2C2O4·2H2O', titulante: 'KMnO4', molPatronPorMolTit: 5 / 2, reaccion: '2 MnO4⁻ + 5 H2C2O4 + 6 H⁺ → 2 Mn²⁺ + 10 CO2 + 8 H2O', relacion: 'n(MnO4⁻) = (2/5)·n(H2C2O4)', pf: 'El propio KMnO4 (autoindicador): primer rosado persistente. Medio H2SO4 1:4, en caliente.', formulaC: 'C(KMnO4) = (2/5)·m(H2C2O4·2H2O)·1000 / (M·G)', residuo: 'Reducir el MnO4⁻ remanente antes de descartar; luego neutralizar y descartar con abundante agua.' },
  'MgSO4/EDTA': { patron: 'MgSO4·7H2O', formula: 'MgSO4·7H2O', titulante: 'EDTA', molPatronPorMolTit: 1, reaccion: 'Mg²⁺ + Y⁴⁻ → MgY²⁻', relacion: 'n(EDTA) = n(Mg²⁺)', pf: 'NET en buffer pH = 10 (rojo vino → azul).', formulaC: 'C(EDTA) = m(MgSO4·7H2O)·1000 / (M·G)', residuo: 'Controlar el pH (buffer amoniacal) antes de descartar con abundante agua.' },
  'KIO3/S2O3': { patron: 'KIO3', formula: 'KIO3', titulante: 'Na2S2O3', molPatronPorMolTit: 1 / 6, reaccion: 'IO3⁻ + 5 I⁻ + 6 H⁺ → 3 I2 + 3 H2O ; I2 + 2 S2O3²⁻ → 2 I⁻ + S4O6²⁻', relacion: 'n(S2O3²⁻) = 6·n(IO3⁻)', pf: 'Almidón, agregado cerca del punto final (azul → incoloro).', formulaC: 'C(Na2S2O3) = 6·m(KIO3)·1000 / (M(KIO3)·G)', residuo: 'Soluciones con yodo/yoduro: reducir el I2 remanente con tiosulfato y descartar con abundante agua.' },
  'NaCl/AgNO3': { patron: 'NaCl', formula: 'NaCl', titulante: 'AgNO3', molPatronPorMolTit: 1, reaccion: 'Ag⁺ + Cl⁻ → AgCl(s)', relacion: 'n(AgNO3) = n(NaCl)', pf: 'Método de Fajans: diclorofluoresceína (el precipitado pasa de blanco-amarillento a rosado).', formulaC: 'C(AgNO3) = m(NaCl)·1000 / (M(NaCl)·G)', residuo: 'Los residuos de plata no se descartan en la pileta: se guardan en el bidón de residuos de plata (consultar al docente).' },
};

function bloqueEstandarizacion(std: Std, Ct: number, G: number, out: Solucion, etapa = 'Estandarización') {
  const s = STD[std];
  const Mp = M(s.formula);
  const m = (Ct * G * s.molPatronPorMolTit * Mp) / 1000;
  const toma = masaOAlicuota(m);
  out.reacciones.push({ etapa, ecuacion: s.reaccion, relacion: s.relacion });
  out.calculos.push({ etapa, label: `Masa de ${s.patron} por valoración (para G = ${fmt(G, 2)} mL)`, valor: m, unidad: 'g', dec: 4 });
  if (!toma.directa) {
    out.calculos.push({ etapa, label: `Masa de ${s.patron} a pesar para ${toma.matraz} mL (alícuotas de ${toma.alicuota} mL)`, valor: toma.mStock!, unidad: 'g', dec: 4 });
    out.avisos.push(`${etapa}: la masa por valoración (${fmt(m, 4)} g) es menor a ${fmt(MIN_MASA, 1)} g; conviene preparar una solución del patrón en matraz de ${toma.matraz} mL y valorar alícuotas de ${toma.alicuota} mL.`);
  }
  out.gastos.push({ etapa, G });
  out.formulas.push({ etapa, texto: toma.directa ? s.formulaC : `${s.formulaC} × (V alícuota / V matraz)` });
  out.deteccion.push({ etapa, texto: s.pf });
  out.residuos.push(s.residuo);
  return { m, toma };
}

const fmt = (x: number, d: number) => x.toFixed(d).replace('.', ',');

function base(p: ProblemaRP, params: Record<string, number>, objetivo: string): Solucion {
  return { problema: p, objetivo, reacciones: [], calculos: [], gastos: [], formulas: [], deteccion: [], pasos: [], criticos: [], residuos: [], avisos: [], params };
}

/* ---------------- 1ª RP ---------------- */

interface SpecAB {
  tipo: 'solido' | 'solucion' | 'agua';
  titulante: 'HCl' | 'NaOH' | 'KMnO4' | 'EDTA';
  std: Std;
  analito: string; // fórmula para M
  nombre: string;
  /** mol de analito por mol de titulante */
  ratio: number;
  /** pureza esperada (%) o concentración (mol/L) o mg CaCO3/L */
  contenido: number;
  reaccion: string;
  relacion: string;
  pf: string;
  residuo: string;
  ab?: { systemId: string; hAdded: number };
  extraPasos?: string[];
  criticos?: string[];
  resultado: string;
}

const SPEC_RP1: Record<number, SpecAB> = {
  1: { tipo: 'solido', titulante: 'HCl', std: 'Na2CO3/HCl', analito: 'NaHCO3', nombre: 'NaHCO3', ratio: 1, contenido: 95, reaccion: 'NaHCO3 + HCl → NaCl + CO2 + H2O', relacion: 'n(NaHCO3) = n(HCl)', pf: 'Heliantina: el punto equivalente (H2CO3/CO2) está en zona ácida.', residuo: 'Controlar el pH y descartar con abundante agua.', ab: { systemId: 'carbonico', hAdded: 1 }, resultado: '%m-m NaHCO3 = C(HCl)·G·M(NaHCO3)/(1000·m)·100' },
  2: { tipo: 'solucion', titulante: 'HCl', std: 'Na2CO3/HCl', analito: 'NH3', nombre: 'NH3', ratio: 1, contenido: 1.0, reaccion: 'NH3 + HCl → NH4Cl', relacion: 'n(NH3) = n(HCl)', pf: 'Rojo de metilo: el punto equivalente (NH4⁺) está en zona ácida.', residuo: 'Controlar el pH y descartar con abundante agua.', ab: { systemId: 'amonio', hAdded: 0 }, criticos: ['El NH3 es volátil: pipetear sin demora y mantener los recipientes tapados.'], resultado: 'C(NH3) = C(HCl)·G / V alícuota (× factor de dilución)' },
  3: { tipo: 'solucion', titulante: 'NaOH', std: 'oxalico/NaOH', analito: 'H3PO4', nombre: 'H3PO4', ratio: 1 / 2, contenido: 0.5, reaccion: 'H3PO4 + 2 NaOH → Na2HPO4 + 2 H2O (hasta el 2º punto equivalente)', relacion: 'n(H3PO4) = n(NaOH)/2', pf: 'Timolftaleína: el 2º punto equivalente (HPO4²⁻) está cerca de pH 9,7. (El 1er PE, a pH ≈ 4,7, se detecta con verde de bromocresol.)', residuo: 'Neutralizar y descartar con abundante agua.', ab: { systemId: 'fosforico', hAdded: 3 }, resultado: 'C(H3PO4) = C(NaOH)·G / (2·V alícuota) (× factor de dilución)' },
  4: { tipo: 'solido', titulante: 'NaOH', std: 'oxalico/NaOH', analito: 'NaH2PO4·H2O', nombre: 'NaH2PO4·H2O', ratio: 1, contenido: 100, reaccion: 'H2PO4⁻ + OH⁻ → HPO4²⁻ + H2O', relacion: 'n(NaH2PO4) = n(NaOH)', pf: 'Timolftaleína: el punto equivalente (HPO4²⁻) está cerca de pH 9,7.', residuo: 'Neutralizar y descartar con abundante agua.', ab: { systemId: 'fosforico', hAdded: 2 }, resultado: '%m-m = C(NaOH)·G·M(NaH2PO4·H2O)/(1000·m)·100' },
  5: { tipo: 'solido', titulante: 'HCl', std: 'Na2CO3/HCl', analito: 'Na2HPO4·12H2O', nombre: 'Na2HPO4·12H2O', ratio: 1, contenido: 100, reaccion: 'HPO4²⁻ + H⁺ → H2PO4⁻', relacion: 'n(Na2HPO4) = n(HCl)', pf: 'Verde de bromocresol: el punto equivalente (H2PO4⁻) está cerca de pH 4,7.', residuo: 'Controlar el pH y descartar con abundante agua.', ab: { systemId: 'fosforico', hAdded: 1 }, resultado: '%m-m = C(HCl)·G·M(Na2HPO4·12H2O)/(1000·m)·100' },
  6: { tipo: 'solido', titulante: 'EDTA', std: 'MgSO4/EDTA', analito: 'ZnSO4·7H2O', nombre: 'ZnSO4·7H2O', ratio: 1, contenido: 100, reaccion: 'Zn²⁺ + Y⁴⁻ → ZnY²⁻', relacion: 'n(Zn²⁺) = n(EDTA)', pf: 'NET en buffer pH = 10 (rojo vino → azul).', residuo: 'Controlar el pH antes de descartar con abundante agua.', resultado: '%m-m = C(EDTA)·G·M(ZnSO4·7H2O)/(1000·m)·100' },
  7: { tipo: 'agua', titulante: 'EDTA', std: 'MgSO4/EDTA', analito: 'CaCO3', nombre: 'CaCO3', ratio: 1, contenido: 1060, reaccion: 'Ca²⁺ + Y⁴⁻ → CaY²⁻ ; Mg²⁺ + Y⁴⁻ → MgY²⁻', relacion: 'n(Ca²⁺ + Mg²⁺) = n(EDTA), expresado como CaCO3', pf: 'NET en buffer pH = 10 (rojo vino → azul).', residuo: 'Controlar el pH antes de descartar con abundante agua.', resultado: 'Dureza (mg CaCO3/L) = C(EDTA)·G·M(CaCO3)·1000 / V muestra' },
  8: { tipo: 'solido', titulante: 'KMnO4', std: 'oxalico/KMnO4', analito: 'Na2C2O4', nombre: 'Na2C2O4', ratio: 5 / 2, contenido: 95, reaccion: '2 MnO4⁻ + 5 C2O4²⁻ + 16 H⁺ → 2 Mn²⁺ + 10 CO2 + 8 H2O', relacion: 'n(C2O4²⁻) = (5/2)·n(MnO4⁻)', pf: 'Autoindicador (KMnO4): primer rosado persistente. Medio H2SO4 1:4, en caliente.', residuo: 'Reducir el MnO4⁻ remanente antes de descartar.', criticos: ['Calentar (≈ 60–70 °C) para que la reacción con oxalato sea rápida.'], resultado: '%m-m = (5/2)·C(KMnO4)·G·M(Na2C2O4)/(1000·m)·100' },
  9: { tipo: 'solido', titulante: 'KMnO4', std: 'oxalico/KMnO4', analito: 'Fe(NH4)2(SO4)2·6H2O', nombre: 'sal de Mohr', ratio: 5, contenido: 95, reaccion: 'MnO4⁻ + 5 Fe²⁺ + 8 H⁺ → Mn²⁺ + 5 Fe³⁺ + 4 H2O', relacion: 'n(Fe²⁺) = 5·n(MnO4⁻)', pf: 'Autoindicador (KMnO4): primer rosado persistente. Medio H2SO4 1:4, en frío.', residuo: 'Reducir el MnO4⁻ remanente antes de descartar.', resultado: '%m-m = 5·C(KMnO4)·G·M(sal de Mohr)/(1000·m)·100' },
  10: { tipo: 'solido', titulante: 'NaOH', std: 'oxalico/NaOH', analito: 'C4H6O6', nombre: 'ácido tartárico', ratio: 1 / 2, contenido: 95, reaccion: 'H2C4H4O6 + 2 NaOH → Na2C4H4O6 + 2 H2O', relacion: 'n(ácido) = n(NaOH)/2', pf: 'Fenolftaleína: se valoran los dos protones y el punto equivalente está en zona básica.', residuo: 'Neutralizar y descartar con abundante agua.', ab: { systemId: 'tartarico', hAdded: 2 }, resultado: '%m-m = C(NaOH)·G·M/(2·1000·m)·100' },
  11: { tipo: 'solido', titulante: 'NaOH', std: 'oxalico/NaOH', analito: 'C7H6O2', nombre: 'ácido benzoico', ratio: 1, contenido: 98, reaccion: 'C6H5COOH + NaOH → C6H5COONa + H2O', relacion: 'n(ácido) = n(NaOH)', pf: 'Fenolftaleína: el punto equivalente (benzoato) está en zona básica.', residuo: 'Neutralizar y descartar con abundante agua.', ab: { systemId: 'benzoico', hAdded: 1 }, extraPasos: ['Disolver la muestra en etanol absoluto (el ácido benzoico es poco soluble en agua) y luego agregar agua.'], resultado: '%m-m = C(NaOH)·G·M/(1000·m)·100' },
  12: { tipo: 'solido', titulante: 'NaOH', std: 'oxalico/NaOH', analito: 'C4H4O4', nombre: 'ácido maleico', ratio: 1 / 2, contenido: 98, reaccion: 'H2C4H2O4 + 2 NaOH → Na2C4H2O4 + 2 H2O', relacion: 'n(ácido) = n(NaOH)/2', pf: 'Fenolftaleína: se valoran los dos protones y el punto equivalente está en zona básica.', residuo: 'Neutralizar y descartar con abundante agua.', ab: { systemId: 'maleico', hAdded: 2 }, resultado: '%m-m = C(NaOH)·G·M/(2·1000·m)·100' },
  13: { tipo: 'solido', titulante: 'NaOH', std: 'oxalico/NaOH', analito: 'C3H4O4', nombre: 'ácido malónico', ratio: 1 / 2, contenido: 98, reaccion: 'H2C3H2O4 + 2 NaOH → Na2C3H2O4 + 2 H2O', relacion: 'n(ácido) = n(NaOH)/2', pf: 'Fenolftaleína: se valoran los dos protones y el punto equivalente está en zona básica.', residuo: 'Neutralizar y descartar con abundante agua.', ab: { systemId: 'malonico', hAdded: 2 }, resultado: '%m-m = C(NaOH)·G·M/(2·1000·m)·100' },
  14: { tipo: 'solido', titulante: 'NaOH', std: 'oxalico/NaOH', analito: 'C4H6O4', nombre: 'ácido succínico', ratio: 1 / 2, contenido: 98, reaccion: 'H2C4H4O4 + 2 NaOH → Na2C4H4O4 + 2 H2O', relacion: 'n(ácido) = n(NaOH)/2', pf: 'Fenolftaleína: se valoran los dos protones y el punto equivalente está en zona básica.', residuo: 'Neutralizar y descartar con abundante agua.', ab: { systemId: 'succinico', hAdded: 2 }, resultado: '%m-m = C(NaOH)·G·M/(2·1000·m)·100' },
};

/** Concentraciones nominales de los valorantes de la 1ª RP (letra). */
export const C_NOMINAL = { HCl: 0.25, NaOH: 0.1, KMnO4: 0.02, EDTA: 0.02 } as const;

export function parametrosPorDefecto(p: ProblemaRP): Record<string, number> {
  if (p.rp === 1) {
    const s = SPEC_RP1[p.numero];
    return { G: 8, Ct: C_NOMINAL[s.titulante], contenido: s.contenido, Vdis: 25 };
  }
  switch (p.numero) {
    case 1: return { CI2: 0.1, VI2: 10, Gblanco: 8, Gretro: 2, contenido: 100 };
    case 2: return { gL: 40, Vm: 1, G: 8 };
    case 3: return { CAg: 0.1, Gstd: 8, G: 8, contenido: 98 };
    case 4: return { CAg: 0.1, CSCN: 0.125, Gstd: 8, G: 8 };
    case 5: return { Ccit: 0.1, CNaOH: 0.01, z: 3, Valic: 1, Gstd: 10 };
    case 6: return { masa: 1, Vmatraz: 250, Cobj: 10 };
    default: return { mgmL: 125, Cobj: 2 };
  }
}

function solucionRP1(p: ProblemaRP, prm: Record<string, number>): Solucion {
  const s = SPEC_RP1[p.numero];
  const { G, Ct, contenido, Vdis } = prm;
  const out = base(p, prm, `${p.titulo} (contenido aproximado: ${p.contenido}).`);
  bloqueEstandarizacion(s.std, Ct, G, out, `Estandarización del ${s.titulante}`);
  const etapa = 'Determinación del analito';
  out.reacciones.push({ etapa, ecuacion: s.reaccion, relacion: s.relacion });
  const nTit = (Ct * G) / 1000;
  const nAn = nTit * s.ratio;
  const Ma = M(s.analito);
  let Geq = G;
  if (s.tipo === 'solido') {
    const m = (nAn * Ma) / (contenido / 100);
    const toma = masaOAlicuota(m);
    out.calculos.push({ etapa, label: `Masa de muestra por valoración (pureza ${fmt(contenido, 0)} %, G = ${fmt(G, 2)} mL)`, valor: m, unidad: 'g', dec: 4 });
    if (!toma.directa) {
      out.calculos.push({ etapa, label: `Masa de muestra a pesar para ${toma.matraz} mL (alícuotas de ${toma.alicuota} mL)`, valor: toma.mStock!, unidad: 'g', dec: 4 });
      out.avisos.push(`La masa por valoración (${fmt(m, 4)} g) es menor a 0,1 g: conviene preparar una solución de la muestra y valorar alícuotas.`);
    }
    out.formulas.push({ etapa, texto: s.resultado });
  } else {
    // solución (mol/L) o agua (mg CaCO3/L)
    const C = s.tipo === 'agua' ? contenido / 1000 / Ma : contenido;
    const t = tomaVolumen(C, Ct, s.ratio, G);
    Geq = t.G;
    if (t.directa) out.calculos.push({ etapa, label: 'Alícuota de muestra (pipeta aforada)', valor: t.alicuota, unidad: 'mL', dec: 2 });
    else {
      out.calculos.push({ etapa, label: `Dilución: ${t.pipeta} mL de muestra llevados a ${t.matraz} mL`, valor: t.matraz! / t.pipeta!, unidad: '(factor)', dec: 1 });
      out.calculos.push({ etapa, label: 'Alícuota de la dilución (pipeta aforada)', valor: t.alicuota, unidad: 'mL', dec: 2 });
    }
    out.calculos.push({ etapa, label: 'Volumen exacto de muestra para G objetivo (sin redondear a pipeta)', valor: (nAn / C) * 1000, unidad: 'mL', dec: 2 });
    out.formulas.push({ etapa, texto: s.resultado });
  }
  out.gastos.push({ etapa, G: Geq });
  out.deteccion.push({ etapa, texto: s.pf });
  out.residuos.push(s.residuo);
  if (s.ab) {
    const nEq = (Ct * Geq) / 1000 * s.ratio;
    const pH = pHenPE(s.ab.systemId, s.ab.hAdded, nEq, Vdis, s.titulante as 'HCl' | 'NaOH', Ct, Geq);
    out.pHeq = [{ etapa, pH, Vdis }];
  }
  out.pasos.push(
    `Estandarizar el ${s.titulante} con ${STD[s.std].patron} (al menos 3 valores concordantes).`,
    ...(s.tipo === 'solido' ? [`Pesar la muestra en balanza analítica (por diferencia) y disolverla en agua destilada.`] : [`Tomar la muestra con pipeta aforada${s.tipo === 'solucion' ? ' (con dilución previa si corresponde)' : ''}.`]),
    ...(s.extraPasos ?? []),
    ...(s.titulante === 'EDTA' ? ['Agregar buffer pH = 10 y NET.'] : s.titulante === 'KMnO4' ? ['Acidificar con H2SO4 1:4.'] : ['Agregar 2–3 gotas del indicador.']),
    `Valorar con ${s.titulante} hasta el viraje; repetir hasta tener al menos 3 valores concordantes.`,
  );
  out.criticos.push('Enjuagar la bureta con el titulante y eliminar burbujas de la punta.', 'Leer el menisco a la altura de los ojos.', ...(s.criticos ?? []));
  return out;
}

/* ---------------- 2ª RP ---------------- */

function solucionRP2(p: ProblemaRP, prm: Record<string, number>): Solucion {
  const out = base(p, prm, `${p.titulo} (contenido aproximado: ${p.contenido}).`);
  switch (p.numero) {
    case 1: {
      const { CI2, VI2, Gblanco, Gretro, contenido } = prm;
      const nI2 = (CI2 * VI2) / 1000;
      const CS = (2 * nI2 * 1000) / Gblanco;
      out.calculos.push({ etapa: 'Diagramación', label: `Concentración de Na2S2O3 para G = ${fmt(Gblanco, 2)} mL en el blanco`, valor: CS, unidad: 'mol/L', dec: 4 });
      const std = bloqueEstandarizacion('KIO3/S2O3', CS, Gblanco, out, 'Estandarización del Na2S2O3');
      const nKI = 5 * (std.m / M('KIO3')) * 1.5;
      out.calculos.push({ etapa: 'Estandarización del Na2S2O3', label: 'Masa de KI por valoración (50 % de exceso)', valor: nKI * M('KI'), unidad: 'g', dec: 4 });
      const nAA = (CS * (Gblanco - Gretro)) / 2 / 1000;
      const mAA = (nAA * M('C6H8O6')) / (contenido / 100);
      const etapa = 'Blanco y retrovaloración';
      out.reacciones.push({ etapa, ecuacion: 'C6H8O6 + I2 → C6H6O6 + 2 I⁻ + 2 H⁺ ; I2 (exceso) + 2 S2O3²⁻ → 2 I⁻ + S4O6²⁻', relacion: 'n(ác. ascórbico) = n(I2 total) − n(I2 que sobra) = C(S2O3²⁻)·(G blanco − G retro)/2' });
      out.calculos.push({ etapa, label: `Toma de I2 ${fmt(CI2, 2)} M`, valor: VI2, unidad: 'mL', dec: 2 });
      out.calculos.push({ etapa, label: `Masa de ácido ascórbico para G retro = ${fmt(Gretro, 2)} mL`, valor: mAA, unidad: 'g', dec: 4 });
      out.calculos.push({ etapa, label: 'Volumen de Na2S2O3 a preparar (3 estandarizaciones + 3 blancos + 3 retro, 25 % extra)', valor: (3 * Gblanco + 3 * Gblanco + 3 * Gretro) * 1.25, unidad: 'mL', dec: 0 });
      out.gastos.push({ etapa, G: Gblanco, label: 'Gasto teórico en el blanco' }, { etapa, G: Gretro, label: 'Gasto teórico en la retro' });
      out.formulas.push({ etapa, texto: '%m-m ác. ascórbico = C(Na2S2O3)·(G blanco − G retro)·M(C6H8O6) / (2·1000·m)·100' });
      out.deteccion.push({ etapa, texto: 'Almidón agregado cerca del punto final (azul → incoloro).' });
      out.residuos.push('Reducir el I2 remanente con tiosulfato y descartar con abundante agua.');
      out.pasos.push('Estandarizar el Na2S2O3 con KIO3 (KI en exceso, H2SO4 1:4, almidón al final).', 'Blanco: tomar la alícuota de I2 y valorar con Na2S2O3.', 'Retro: disolver la muestra, agregar la misma alícuota de I2 y valorar el exceso con Na2S2O3.', 'Repetir hasta 3 blancos y 3 retro concordantes.');
      out.criticos.push('El I2 es volátil: mantener tapado y valorar sin demora.', 'El almidón se agrega cerca del punto final (color amarillo pálido).');
      break;
    }
    case 2: {
      const { gL, Vm, G } = prm;
      const MCl2 = M('Cl2');
      const nCl2 = (gL / MCl2) * (Vm / 1000);
      const CS = (2 * nCl2 * 1000) / G;
      out.calculos.push({ etapa: 'Diagramación', label: `Concentración de Na2S2O3 para G = ${fmt(G, 2)} mL`, valor: CS, unidad: 'mol/L', dec: 4 });
      const std = bloqueEstandarizacion('KIO3/S2O3', CS, G, out, 'Estandarización del Na2S2O3');
      out.calculos.push({ etapa: 'Estandarización del Na2S2O3', label: 'Masa de KI por valoración (50 % de exceso)', valor: 5 * (std.m / M('KIO3')) * 1.5 * M('KI'), unidad: 'g', dec: 4 });
      const etapa = 'Determinación del cloro';
      out.reacciones.push({ etapa, ecuacion: 'Cl2 + H2O ⇋ ClO⁻ + Cl⁻ + 2 H⁺ ; ClO⁻ + 2 I⁻ + 2 H⁺ → I2 + Cl⁻ + H2O ; I2 + 2 S2O3²⁻ → 2 I⁻ + S4O6²⁻', relacion: 'n(Cl2) = n(ClO⁻) = n(I2) = n(S2O3²⁻)/2' });
      out.calculos.push({ etapa, label: 'Toma de muestra', valor: Vm, unidad: 'mL', dec: 2 });
      out.calculos.push({ etapa, label: 'Masa de KI (1,5 veces en exceso)', valor: 2 * nCl2 * 1.5 * M('KI'), unidad: 'g', dec: 4 });
      out.calculos.push({ etapa, label: 'Volumen de H2SO4 1:4 (3,6 M), 1,5 veces en exceso', valor: ((nCl2 * 2) / 2 / 3.6) * 1.5 * 1000, unidad: 'mL', dec: 3 });
      out.gastos.push({ etapa, G });
      out.formulas.push({ etapa, texto: 'g Cl2/L = C(Na2S2O3)·G·M(Cl2) / (2·V muestra) ; % m/v = g Cl2/L ÷ 10' });
      out.deteccion.push({ etapa, texto: 'Almidón agregado cerca del punto final (azul → incoloro).' });
      out.residuos.push('Reducir el I2 remanente con tiosulfato; controlar el pH y descartar con abundante agua.');
      out.pasos.push('Estandarizar el Na2S2O3 con KIO3.', 'Tomar 1,00 mL de muestra, agregar KI en exceso y H2SO4 1:4.', 'Valorar el I2 liberado con Na2S2O3, agregando almidón cerca del final.');
      out.criticos.push('Agregar el KI antes que el ácido, para no perder cloro.', 'Valorar enseguida: el I2 es volátil.');
      break;
    }
    case 3: {
      const { CAg, Gstd, G, contenido } = prm;
      bloqueEstandarizacion('NaCl/AgNO3', CAg, Gstd, out, 'Estandarización del AgNO3');
      const etapa = 'Determinación del MgCl2·6H2O';
      const m = (((CAg * G) / 1000) * 0.5 * M('MgCl2·6H2O')) / (contenido / 100);
      out.reacciones.push({ etapa, ecuacion: 'MgCl2 → Mg²⁺ + 2 Cl⁻ ; Ag⁺ + Cl⁻ → AgCl(s)', relacion: 'n(MgCl2·6H2O) = n(AgNO3)/2 (2 Cl⁻ por fórmula)' });
      out.calculos.push({ etapa, label: `Masa de muestra por valoración (pureza ${fmt(contenido, 0)} %)`, valor: m, unidad: 'g', dec: 4 });
      const t = masaOAlicuota(m);
      if (!t.directa) out.calculos.push({ etapa, label: `Masa a pesar para ${t.matraz} mL (alícuotas de ${t.alicuota} mL)`, valor: t.mStock!, unidad: 'g', dec: 4 });
      out.gastos.push({ etapa, G });
      out.formulas.push({ etapa, texto: '%m-m MgCl2·6H2O = C(AgNO3)·G·M(MgCl2·6H2O) / (2·1000·m)·100' });
      out.deteccion.push({ etapa, texto: 'Fajans: diclorofluoresceína.' });
      out.residuos.push(STD['NaCl/AgNO3'].residuo);
      out.pasos.push('Estandarizar el AgNO3 con NaCl (Fajans).', 'Pesar la muestra, disolver y agregar diclorofluoresceína.', 'Valorar con AgNO3 agitando constantemente hasta el viraje del precipitado.');
      out.criticos.push('Proteger de la luz (AgCl y el indicador).', 'Agitar bien: el viraje ocurre sobre la superficie del precipitado.');
      break;
    }
    case 4: {
      const { CAg, CSCN, Gstd, G } = prm;
      bloqueEstandarizacion('NaCl/AgNO3', CAg, Gstd, out, 'Estandarización del AgNO3');
      const etapa = 'Valoración del KSCN (Volhard directo)';
      const V = (CAg * G) / CSCN;
      out.reacciones.push({ etapa, ecuacion: 'Ag⁺ + SCN⁻ → AgSCN(s) ; Fe³⁺ + SCN⁻ ⇋ FeSCN²⁺ (rojo)', relacion: 'n(KSCN) = n(AgNO3)' });
      out.calculos.push({ etapa, label: `Alícuota de KSCN para G(AgNO3) = ${fmt(G, 2)} mL`, valor: V, unidad: 'mL', dec: 2 });
      out.gastos.push({ etapa, G });
      out.formulas.push({ etapa, texto: 'C(KSCN) = C(AgNO3)·G / V alícuota' });
      out.deteccion.push({ etapa, texto: 'Fe³⁺ (Fe(NO3)3) en medio HNO3: cambio de color del complejo FeSCN²⁺ en el punto final.' });
      out.residuos.push(STD['NaCl/AgNO3'].residuo);
      out.pasos.push('Estandarizar el AgNO3 con NaCl (Fajans).', 'Medir la alícuota de KSCN (con bureta de 10,00 mL si no es un volumen de pipeta), acidificar con HNO3 1:2 y agregar Fe(NO3)3.', 'Valorar con AgNO3 hasta el punto final.');
      out.criticos.push('Medio ácido (HNO3) para que el Fe³⁺ no hidrolice.');
      if (Math.abs(V - Math.round(V)) > 0.01) out.avisos.push(`La alícuota (${fmt(V, 2)} mL) no es un volumen de pipeta aforada: medirla con bureta.`);
      break;
    }
    case 5: {
      const { Ccit, CNaOH, z, Valic, Gstd } = prm;
      bloqueEstandarizacion('oxalico/NaOH', CNaOH, Gstd, out, 'Estandarización del NaOH');
      const etapa = 'Valoración potenciométrica del ácido cítrico';
      const G = (Ccit * Valic * z) / CNaOH;
      out.reacciones.push({ etapa, ecuacion: 'H3Cit + 3 NaOH → Na3Cit + 3 H2O', relacion: `n(ác. cítrico) = n(NaOH)/${z}` });
      out.calculos.push({ etapa, label: 'Alícuota de ácido cítrico', valor: Valic, unidad: 'mL', dec: 2 });
      out.gastos.push({ etapa, G });
      if (G > 25) out.avisos.push(`El gasto esperado (${fmt(G, 2)} mL) supera una bureta de 25 mL.`);
      out.formulas.push({ etapa, texto: `C(ác. cítrico) = C(NaOH)·G(PE) / (${z}·V alícuota)` });
      out.deteccion.push({ etapa, texto: 'Potenciométrica: curva pH vs G, PE por 1ª y 2ª derivada y método gráfico (pestaña Potenciometría). Incertidumbre por propagación.' });
      out.residuos.push('Neutralizar y descartar con abundante agua.');
      out.pasos.push('Calibrar el pH-metro con los buffers.', 'Estandarizar el NaOH 0,01 M con H2C2O4·2H2O.', 'Valorar la alícuota de ácido cítrico registrando el pH después de cada agregado (incrementos menores cerca del PE).');
      out.criticos.push('Esperar a que la lectura se estabilice.', 'No dejar gotas pendientes en la punta de la bureta.');
      break;
    }
    case 6: {
      const { masa, Vmatraz, Cobj } = prm;
      const C0 = (masa * 1000 * 1000) / Vmatraz; // mg/L
      const f = C0 / Cobj;
      const dil = suggestDilutions(C0, Cobj, [1, 2, 5, 10, 20, 25], [50, 100, 250, 500], 2, 1)[0];
      const etapa = 'Diagramación';
      out.calculos.push({ etapa, label: 'Concentración aproximada de la solución problema', valor: C0, unidad: 'mg/L', dec: 0 });
      out.calculos.push({ etapa, label: 'Concentración objetivo en la cubeta', valor: Cobj, unidad: 'mg/L', dec: 1 });
      out.calculos.push({ etapa, label: 'Factor de dilución total', valor: f, unidad: '', dec: 0 });
      if (dil) out.calculos.push({ etapa, label: `Diluciones: ${dil.steps.map((s) => `${s.pipette} mL → ${s.flask} mL`).join(' y luego ')}`, valor: dil.finalConc, unidad: 'mg/L (final)', dec: 2 });
      out.formulas.push({ etapa: 'Resultado', texto: 'C (problema) = C (curva) × factor de dilución; curva de calibración A = f(C) con patrón de paracetamol' });
      out.deteccion.push({ etapa: 'Medida', texto: 'Espectrofotometría UV con curva de calibración (1 solución de patrón por nivel). Triplicado genuino de la muestra; promediable si CV < 10 %.' });
      out.residuos.push('Controlar el pH y descartar con abundante agua.');
      out.pasos.push('Preparar la solución madre del patrón y los niveles de la curva.', 'Diluir la muestra (triplicado genuino).', 'Medir las absorbancias y calcular con la curva (pestaña Calibración).');
      out.criticos.push('Usar cubetas de cuarzo en el UV.', 'Medir el blanco de reactivos.');
      break;
    }
    default: {
      const { mgmL, Cobj } = prm;
      const CFe = (mgmL * 1000 * M('Fe')) / M('FeSO4·7H2O'); // mg Fe/L
      const f = CFe / Cobj;
      const dil = suggestDilutions(CFe, Cobj, [1, 2, 5, 10, 20, 25], [50, 100, 250, 500], 2, 1)[0];
      const etapa = 'Diagramación';
      out.reacciones.push({ etapa: 'Desarrollo de color', ecuacion: 'Fe³⁺ + hidroxilamina → Fe²⁺ ; Fe²⁺ + 3 fen → Fe(fen)3²⁺', relacion: 'complejo rojo-naranja, máximo a 510 nm (ε = 11.100 L·mol⁻¹·cm⁻¹)' });
      out.calculos.push({ etapa, label: 'Concentración aproximada de Fe en la solución problema', valor: CFe, unidad: 'mg/L', dec: 0 });
      out.calculos.push({ etapa, label: 'Concentración objetivo de Fe en la cubeta', valor: Cobj, unidad: 'mg/L', dec: 1 });
      out.calculos.push({ etapa, label: 'Factor de dilución total', valor: f, unidad: '', dec: 0 });
      if (dil) out.calculos.push({ etapa, label: `Diluciones: ${dil.steps.map((s) => `${s.pipette} mL → ${s.flask} mL`).join(' y luego ')}`, valor: dil.finalConc, unidad: 'mg/L (final)', dec: 2 });
      out.formulas.push({ etapa: 'Resultado', texto: 'C (problema) = C (curva) × factor de dilución; curva A = f(C Fe) con sal de Mohr como patrón' });
      out.deteccion.push({ etapa: 'Medida', texto: 'Absorbancia a 510 nm, tras reducir con hidroxilamina·HCl, agregar 1,10-fenantrolina y buffer acetato pH 4, y esperar el desarrollo de color. Triplicado genuino; promediable si CV < 10 %.' });
      out.residuos.push('Controlar el pH y descartar con abundante agua.');
      out.pasos.push('Preparar la solución madre de sal de Mohr y los niveles de la curva.', 'Diluir la muestra (triplicado genuino).', 'Agregar hidroxilamina, fenantrolina y buffer, enrasar y esperar el desarrollo de color.', 'Medir a 510 nm y calcular con la curva (pestaña Calibración).');
      out.criticos.push('Respetar el tiempo de desarrollo de color.', 'Blanco de reactivos.');
      if (f > 1000) out.avisos.push(`El factor de dilución es muy grande (${Math.round(f)}): hacen falta varias diluciones sucesivas.`);
    }
  }
  return out;
}

export function solucion(p: ProblemaRP, params?: Partial<Record<string, number>>): Solucion {
  const prm = { ...parametrosPorDefecto(p), ...(params ?? {}) } as Record<string, number>;
  return p.rp === 1 ? solucionRP1(p, prm) : solucionRP2(p, prm);
}

/* ---------------- sorteo con valores realistas ---------------- */

/** Valor declarado del analito (unidad en que se informa) y si es una pureza mínima. */
export function valorDeclarado(p: ProblemaRP, prm: Record<string, number>): { valor: number; unidad: string; minimo: boolean } {
  const minimo = p.contenido.trim().startsWith('>');
  if (p.rp === 1) {
    if (p.numero === 2 || p.numero === 3) return { valor: prm.contenido, unidad: 'mol/L', minimo: false };
    if (p.numero === 7) return { valor: prm.contenido, unidad: 'mg CaCO3/L', minimo: false };
    return { valor: prm.contenido, unidad: '% m-m', minimo };
  }
  switch (p.numero) {
    case 1: return { valor: 95, unidad: '% m-m', minimo: true };
    case 2: return { valor: prm.gL, unidad: 'g Cl2/L', minimo: false };
    case 3: return { valor: 98, unidad: '% m-m', minimo: true };
    case 4: return { valor: prm.CSCN, unidad: 'mol/L', minimo: false };
    case 5: return { valor: prm.Ccit, unidad: 'mol/L', minimo: false };
    case 6: return { valor: (prm.masa * 1e6) / prm.Vmatraz, unidad: 'mg/L', minimo: false };
    default: return { valor: (prm.mgmL * 1000 * M('Fe')) / M('FeSO4·7H2O'), unidad: 'mg Fe/L', minimo: false };
  }
}

/** Concentración nominal del agente valorante que se estandariza (null si no hay estandarización volumétrica). */
export function titulanteNominal(p: ProblemaRP, prm: Record<string, number>): { nombre: string; C: number } | null {
  if (p.rp === 1) return { nombre: SPEC_RP1[p.numero].titulante, C: prm.Ct };
  switch (p.numero) {
    case 1: return { nombre: 'Na2S2O3', C: (2 * prm.CI2 * prm.VI2) / prm.Gblanco };
    case 2: return { nombre: 'Na2S2O3', C: (2 * (prm.gL / M('Cl2')) * prm.Vm) / prm.G };
    case 3:
    case 4: return { nombre: 'AgNO3', C: prm.CAg };
    case 5: return { nombre: 'NaOH', C: prm.CNaOH };
    default: return null;
  }
}

export interface Sorteo {
  problemaId: string;
  seed: number;
  /** parámetros con los que se diagrama */
  params: Record<string, number>;
  /** valores "reales" del simulacro */
  real: { Ct: number | null; analito: number };
  declarado: { valor: number; unidad: string; minimo: boolean };
  titulante: { nombre: string; C: number } | null;
  /** resultados simulados de las réplicas (para practicar el modo Resolver) */
  replicasEstandarizacion: number[];
  replicasAnalito: number[];
}

const sig = (x: number, n: number) => Number(x.toPrecision(n));

export function sortear(problemaId: string, seed: number): Sorteo {
  const p = getProblema(problemaId)!;
  const r = rng(Math.imul(seed, 2654435761) ^ problemaId.charCodeAt(0) * 97 ^ Number(problemaId.slice(2)));
  const params = parametrosPorDefecto(p);
  if (p.rp === 2 && p.numero === 1 && r() < 0.5) {
    // la letra admite I2 0,05 M con 20,00 mL
    params.CI2 = 0.05;
    params.VI2 = 20;
  }
  const tit = titulanteNominal(p, params);
  const Ct = tit ? tit.C * (1 + uniform(r, -0.04, 0.04)) : null;
  const dec = valorDeclarado(p, params);
  const real = dec.minimo ? uniform(r, dec.valor + 0.3, Math.min(100.8, dec.valor + 4.5)) : dec.valor * (1 + uniform(r, -0.03, 0.03));
  const espectro = p.rp === 2 && p.numero >= 6;
  const noise = (x: number, cv: number) => x * (1 + (cv / 100) * normal(r));
  const nAn = 3 + Math.floor(r() * 2);
  const replicasEstandarizacion = Ct == null ? [] : Array.from({ length: 3 }, () => sig(noise(Ct, 0.3), 4));
  const replicasAnalito = Array.from({ length: nAn }, () => sig(noise(real, espectro ? 3 : 0.6), 5));
  if (!espectro && r() < 0.35) {
    // a veces una réplica alejada, para practicar los tests de anómalos
    const k = Math.floor(r() * nAn);
    replicasAnalito[k] = sig(replicasAnalito[k] * (1 + (r() < 0.5 ? -1 : 1) * uniform(r, 0.025, 0.045)), 5);
  }
  return { problemaId, seed, params, real: { Ct, analito: real }, declarado: dec, titulante: tit, replicasEstandarizacion, replicasAnalito };
}
