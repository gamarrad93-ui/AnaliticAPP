/**
 * Tabla de exportación por práctico (una fila por alumno): datos crudos, resultados del alumno,
 * resultados correctos y ✓/✗. La usan el CSV y el Excel.
 */
import { buscarMaterial } from './material';
import type { Correccion } from './correccion';
import type { PracticaDef } from './motor';
import type { Ajustes, Entrega } from './tipos';

export type Celda = string | number | boolean | null;

const CRIT: Record<string, string> = { dixon: 'Q de Dixon 95 %', grubbs: 'Test de Grubbs 95 %', otro: 'Otro' };
const marca = (ok: boolean | null) => (ok == null ? 'sin dato' : ok ? '✓' : '✗');
const correctoCelda = (v: number | boolean | string): Celda =>
  typeof v === 'boolean' ? (v ? 'Cumple' : 'No cumple') : typeof v === 'number' ? (Number.isFinite(v) ? v : null) : v;

export function tablaExportacion(p: PracticaDef, entregas: Entrega[], correcciones: Correccion[], aj: Ajustes) {
  const nFilas = Math.max(0, ...entregas.map((e) => e.filas.length));
  const cab: string[] = ['Alumno', 'Grupo', 'Fecha', 'Criterio', 'Criterio (texto)'];
  for (const s of p.materiales) cab.push(`${s.rol}: código`, `${s.rol}: tolerancia`);
  for (const r of p.reactivos.filter((x) => x.conAssay)) cab.push(`${r.nombre}: assay (%)`);
  for (const d of p.datos) cab.push(`${d.etiqueta}${d.unidad ? ` (${d.unidad})` : ''}`);
  for (let i = 0; i < nFilas; i++) {
    for (const c of p.columnas) cab.push(`#${i + 1} ${c.etiqueta}${c.unidad ? ` (${c.unidad})` : ''}`);
    cab.push(`#${i + 1} promediable (*)`);
  }
  // resultados: alumno / correcto / ✓✗
  const claveCampo = (c: { seccion: string; clave: string; fila?: number }) => `${c.seccion}:${c.clave}:${c.fila ?? ''}`;
  const plantilla = new Map<string, { etiqueta: string; unidad?: string }>();
  for (const cr of correcciones)
    for (const c of cr.campos)
      if (!plantilla.has(claveCampo(c)))
        plantilla.set(claveCampo(c), { etiqueta: c.fila != null ? `#${c.fila + 1} ${c.etiqueta}` : c.etiqueta, unidad: c.unidad });
  for (const [, t] of plantilla) {
    const u = t.unidad ? ` (${t.unidad})` : '';
    cab.push(`${t.etiqueta}${u} — alumno`, `${t.etiqueta}${u} — correcto`, `${t.etiqueta} — ✓/✗`);
  }
  cab.push('Aciertos', 'Total campos', 'Errores típicos detectados', 'Observaciones');

  const filas: Celda[][] = entregas.map((e, k) => {
    const cr = correcciones[k];
    const row: Celda[] = [e.alumno.nombre, e.alumno.grupo, e.alumno.fecha, CRIT[e.criterio.tipo] ?? '', e.criterio.texto];
    for (const s of p.materiales) {
      const m = e.materiales[s.clave];
      const ref = m ? buscarMaterial(aj.materiales, m.codigo) : undefined;
      row.push(ref ? `${ref.codigo}-26` : m?.codigo ?? '', m?.tolerancia ?? '');
    }
    for (const r of p.reactivos.filter((x) => x.conAssay)) row.push(e.reactivos[r.clave]?.assay ?? '');
    for (const d of p.datos) row.push(e.datos[d.clave] ?? '');
    for (let i = 0; i < nFilas; i++) {
      const f = e.filas[i];
      for (const c of p.columnas) row.push(f?.datos[c.clave] ?? '');
      row.push(f ? (f.promediable ? '*' : '') : '');
    }
    const porClave = new Map(cr.campos.map((c) => [claveCampo(c), c]));
    for (const [k2] of plantilla) {
      const c = porClave.get(k2);
      row.push(c?.alumno ?? '', c ? correctoCelda(c.correcto) : '', c ? marca(c.ok) : '');
    }
    row.push(cr.aciertos, cr.total, cr.diagnosticos.map((d) => d.etiqueta).join(' | '), e.observaciones);
    return row;
  });
  return { cabecera: cab, filas };
}
