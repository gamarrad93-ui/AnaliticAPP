/**
 * Corrección de una entrega: compara cada resultado del alumno con el recalculado por el motor
 * (tolerancia configurable) y diagnostica el error típico más probable recalculando
 * con las variantes de error y viendo cuál reproduce el número del alumno.
 */
import { parseNumber } from '../numeric/format';
import { OPCIONES_CORRECTAS, type Calculo, type Opciones, type PracticaDef, type ResultadoDef } from './motor';
import type { Ajustes, Entrega, Tolerancia } from './tipos';

/** ¿El valor del alumno coincide con el correcto según la tolerancia? */
export function coincide(alumno: number, correcto: number, tol: Tolerancia): boolean {
  if (!Number.isFinite(alumno) || !Number.isFinite(correcto)) return false;
  const d = Math.abs(alumno - correcto);
  if (tol.modo === 'absoluta') return d <= tol.valor + 1e-12;
  if (tol.modo === 'relativa') {
    if (correcto === 0) return d <= 1e-12;
    return (d / Math.abs(correcto)) * 100 <= tol.valor + 1e-9;
  }
  // cifras significativas: se acepta hasta 1 unidad en la última cifra significativa del valor correcto
  if (correcto === 0) return d <= 1e-12;
  const unidad = Math.pow(10, Math.floor(Math.log10(Math.abs(correcto))) - tol.valor + 1);
  return d <= unidad * (1 + 1e-9);
}

export interface Variante {
  id: string;
  etiqueta: string;
  op: Partial<Opciones>;
  aplica: (p: PracticaDef, e: Entrega) => boolean;
}

const siempre = () => true;

export const VARIANTES: Variante[] = [
  { id: 'nominal', etiqueta: 'Usó el volumen nominal en lugar del V20 del material', op: { volumen: 'nominal' }, aplica: (p) => p.rasgos.volumenes },
  { id: 'buretaSin', etiqueta: 'No corrigió la lectura de la bureta', op: { bureta: 'sin' }, aplica: (p) => p.rasgos.bureta },
  { id: 'buretaSup', etiqueta: 'Corrección de bureta con el tramo equivocado (usó el tramo siguiente, mayor)', op: { bureta: 'superior' }, aplica: (p) => p.rasgos.bureta },
  { id: 'buretaInf', etiqueta: 'Corrección de bureta con el tramo equivocado (usó el tramo anterior, menor)', op: { bureta: 'inferior' }, aplica: (p) => p.rasgos.bureta },
  { id: 'buretaSigno', etiqueta: 'Restó la corrección de bureta en lugar de sumarla', op: { bureta: 'signo' }, aplica: (p) => p.rasgos.bureta },
  { id: 'relUno', etiqueta: 'Relación estequiométrica equivocada (usó 1:1)', op: { relacion: 'uno' }, aplica: (p) => p.rasgos.relacion },
  { id: 'relInv', etiqueta: 'Relación estequiométrica invertida', op: { relacion: 'invertida' }, aplica: (p) => p.rasgos.relacion },
  { id: 'aliSin', etiqueta: 'Omitió el factor de alícuota (Vpipeta/Vmatraz)', op: { alicuota: 'sin' }, aplica: (p) => p.rasgos.alicuota },
  { id: 'aliInv', etiqueta: 'Invirtió el factor de alícuota', op: { alicuota: 'invertida' }, aplica: (p) => p.rasgos.alicuota },
  {
    id: 'assay',
    etiqueta: 'No aplicó el assay (pureza) del reactivo',
    op: { assay: 'sin' },
    aplica: (p, e) => !!p.rasgos.assay && parseNumber(e.reactivos[p.rasgos.assay]?.assay ?? '') !== 100,
  },
  { id: 'promTodos', etiqueta: 'Incluyó un valor no promediable (promedió todas las determinaciones)', op: { promediables: 'todos' }, aplica: siempre },
  { id: 'promAlumno', etiqueta: 'Promedió los valores que marcó (*), que no coinciden con el criterio declarado', op: { promediables: 'alumno' }, aplica: (_p, e) => e.criterio.tipo !== 'otro' && e.filas.some((f) => !f.promediable) },
  { id: 'tN', etiqueta: 'Valor de t equivocado: usó n grados de libertad en lugar de n − 1', op: { t: 'n' }, aplica: siempre },
  { id: 'tZ', etiqueta: 'Valor de t equivocado: usó z = 1,96 en lugar de t de Student', op: { t: 'z' }, aplica: siempre },
  { id: 'tSinRaiz', etiqueta: 'Usó t·s (o s) en lugar de t·s/√n (o s/√n)', op: { t: 'sinRaiz' }, aplica: siempre },
  { id: 'z20', etiqueta: 'Usó el factor Z a 20 °C en lugar del Z a la temperatura medida', op: { z: '20' }, aplica: (p) => !!p.rasgos.p1 },
  { id: 'zAgua', etiqueta: 'Usó Z = 1/ρ(agua) sin la corrección por empuje del aire', op: { z: 'agua' }, aplica: (p) => !!p.rasgos.p1 },
  { id: 'vrefNom', etiqueta: 'Comparó con el volumen nominal en lugar del V20 de la tabla Lab QA', op: { vref: 'nominal' }, aplica: (p) => !!p.rasgos.p1 },
];

export type Seccion = 'fila' | 'intermedio' | 'resumen' | 'promediables';

export interface CampoCorregido {
  seccion: Seccion;
  fila?: number;
  clave: string;
  etiqueta: string;
  unidad?: string;
  tipo: ResultadoDef['tipo'] | 'promediables';
  /** lo que escribió el alumno (texto) */
  alumno: string;
  correcto: number | boolean | string;
  /** null = el alumno no lo completó */
  ok: boolean | null;
  diagnosticos: string[];
}

export interface Correccion {
  calculo: Calculo;
  campos: CampoCorregido[];
  /** errores típicos detectados en la entrega (sin repetir), con cuántos campos explican */
  diagnosticos: { etiqueta: string; campos: number }[];
  aciertos: number;
  total: number;
}

function valorCalculado(c: Calculo, seccion: Seccion, clave: string, fila?: number): number | boolean | undefined {
  if (seccion === 'fila') return c.filas[fila!]?.[clave];
  if (seccion === 'intermedio') return c.intermedios[clave];
  if (seccion === 'resumen') return c.resumen[clave];
  return undefined;
}

function leerCumple(s: string): boolean | null {
  const t = s.trim().toLowerCase();
  if (t === 'si' || t === 'sí' || t === 'cumple') return true;
  if (t === 'no' || t === 'no cumple') return false;
  return null;
}

function compararCampo(def: ResultadoDef, alumno: string, correcto: number | boolean | undefined, aj: Ajustes): boolean | null {
  if (alumno == null || alumno.trim() === '') return null;
  if (def.tipo === 'cumple') {
    const a = leerCumple(alumno);
    return a == null ? false : a === correcto;
  }
  const v = parseNumber(alumno);
  if (v == null || typeof correcto !== 'number') return false;
  if (def.tipo === 'entero') return Math.round(v) === correcto;
  return coincide(v, correcto, def.tipo === 'dispersion' ? aj.tolDispersion : aj.tolValores);
}

export function corregir(p: PracticaDef, e: Entrega, aj: Ajustes): Correccion {
  const calculo = p.calcular(e, aj);
  const campos: CampoCorregido[] = [];
  const add = (seccion: Seccion, def: ResultadoDef, alumno: string, fila?: number) => {
    const correcto = valorCalculado(calculo, seccion, def.clave, fila);
    campos.push({
      seccion,
      fila,
      clave: def.clave,
      etiqueta: def.etiqueta,
      unidad: def.unidad,
      tipo: def.tipo,
      alumno: alumno ?? '',
      correcto: correcto ?? NaN,
      ok: compararCampo(def, alumno ?? '', correcto, aj),
      diagnosticos: [],
    });
  };
  e.filas.forEach((f, i) => p.resultadosFila.forEach((d) => add('fila', d, f.resultados[d.clave], i)));
  p.resultadosIntermedios.forEach((d) => add('intermedio', d, e.resultados[d.clave]));
  p.resultadosResumen.forEach((d) => add('resumen', d, e.resultados[d.clave]));

  // promediables marcados vs. criterio declarado
  if (calculo.mascaraCriterio) {
    const marc = e.filas.map((f) => f.promediable);
    const ok = marc.every((m, i) => m === calculo.mascaraCriterio![i]);
    const lista = (mk: boolean[]) => mk.map((m, i) => (m ? i + 1 : null)).filter((x) => x != null).join(', ') || '—';
    campos.push({
      seccion: 'promediables',
      clave: 'promediables',
      etiqueta: `Promediables (*) según ${e.criterio.tipo === 'dixon' ? 'Q de Dixon' : 'Grubbs'}`,
      tipo: 'promediables',
      alumno: lista(marc),
      correcto: lista(calculo.mascaraCriterio),
      ok,
      diagnosticos: ok
        ? []
        : marc.some((m, i) => m && !calculo.mascaraCriterio![i])
          ? ['Marcó como promediable un valor que el criterio declarado descarta']
          : ['Descartó un valor que el criterio declarado conserva'],
    });
  }

  // diagnóstico: recalcular con cada variante de error y ver cuál reproduce el valor del alumno
  const malos = campos.filter((c) => c.ok === false && c.seccion !== 'promediables');
  if (malos.length) {
    const variantes = VARIANTES.filter((v) => v.aplica(p, e)).map((v) => {
      let calc: Calculo | null = null;
      try {
        calc = p.calcular(e, aj, { ...OPCIONES_CORRECTAS, ...v.op });
      } catch {
        calc = null;
      }
      return { v, calc };
    });
    for (const c of malos) {
      const def = [...p.resultadosFila, ...p.resultadosIntermedios, ...p.resultadosResumen].find((d) => d.clave === c.clave)!;
      const correcto = c.correcto;
      for (const { v, calc } of variantes) {
        if (!calc) continue;
        const alt = valorCalculado(calc, c.seccion, c.clave, c.fila);
        if (alt == null) continue;
        // la variante tiene que cambiar el valor y reproducir el del alumno
        if (typeof alt === 'number' && typeof correcto === 'number' && Math.abs(alt - correcto) <= Math.abs(correcto) * 1e-9) continue;
        if (typeof alt === 'boolean' && alt === correcto) continue;
        if (compararCampo(def, c.alumno, alt, aj)) c.diagnosticos.push(v.etiqueta);
      }
    }
  }

  // Se quedan los diagnósticos que explican muchos campos (≥ la mitad que el principal);
  // las coincidencias numéricas aisladas se descartan para no confundir.
  const cuenta = new Map<string, number>();
  for (const c of campos) if (c.seccion !== 'promediables') for (const d of c.diagnosticos) cuenta.set(d, (cuenta.get(d) ?? 0) + 1);
  const max = Math.max(0, ...cuenta.values());
  const fuertes = new Set([...cuenta.entries()].filter(([, n]) => n >= max / 2).map(([d]) => d));
  for (const c of campos) {
    if (c.seccion === 'promediables') continue;
    const k = c.diagnosticos.filter((d) => fuertes.has(d));
    if (k.length) c.diagnosticos = k;
  }
  const diagnosticos = [...cuenta.entries()]
    .filter(([d]) => fuertes.has(d))
    .sort((a, b) => b[1] - a[1])
    .map(([etiqueta, n]) => ({ etiqueta, campos: n }));
  const prom = campos.find((c) => c.seccion === 'promediables' && c.ok === false);
  if (prom) diagnosticos.push({ etiqueta: prom.diagnosticos[0], campos: 1 });
  const respondidos = campos.filter((c) => c.ok !== null);
  return { calculo, campos, diagnosticos, aciertos: respondidos.filter((c) => c.ok).length, total: campos.length };
}

/** Resumen del grupo: % de aciertos por campo y errores más comunes. */
export function resumenGrupo(p: PracticaDef, correcciones: Correccion[]) {
  const porCampo = new Map<string, { etiqueta: string; ok: number; total: number }>();
  for (const cr of correcciones) {
    for (const c of cr.campos) {
      const k = c.seccion === 'fila' ? `fila:${c.clave}` : `${c.seccion}:${c.clave}`;
      const et = c.seccion === 'fila' ? `${c.etiqueta} (por determinación)` : c.etiqueta;
      const r = porCampo.get(k) ?? { etiqueta: et, ok: 0, total: 0 };
      r.total++;
      if (c.ok) r.ok++;
      porCampo.set(k, r);
    }
  }
  const errores = new Map<string, number>();
  for (const cr of correcciones) for (const d of cr.diagnosticos) errores.set(d.etiqueta, (errores.get(d.etiqueta) ?? 0) + 1);
  return {
    campos: [...porCampo.values()].map((r) => ({ ...r, pct: r.total ? (100 * r.ok) / r.total : 0 })),
    errores: [...errores.entries()].sort((a, b) => b[1] - a[1]).map(([etiqueta, alumnos]) => ({ etiqueta, alumnos })),
    practica: p.id,
  };
}
