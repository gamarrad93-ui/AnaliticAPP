/**
 * Material volumétrico: búsqueda por código Lab QA, corrección de bureta por tramo
 * y factor Z interpolado.
 */
import { SUFIJO_CODIGO } from './datos';
import type { MaterialRef, TablaZ } from './tipos';

/** "pa501-26", " PA501 " → "PA501" */
export function normalizarCodigo(c: string): string {
  return c.trim().toUpperCase().replace(/\s+/g, '').replace(/-26$/, '');
}

export function codigoCompleto(c: string): string {
  return normalizarCodigo(c) + SUFIJO_CODIGO;
}

export function buscarMaterial(tabla: MaterialRef[], codigo: string): MaterialRef | undefined {
  const c = normalizarCodigo(codigo);
  if (!c) return undefined;
  return tabla.find((m) => m.codigo === c);
}

export const TRAMOS_NOMINALES = [2, 4, 6, 8, 10];

export interface CorreccionBureta {
  lectura: number;
  /** índice del tramo usado (0 → 0-2 mL … 4 → 0-10 mL) */
  tramo: number;
  nominalTramo: number;
  v20Tramo: number;
  correccion: number;
  corregido: number;
}

/**
 * Tramo MÁS CERCANO a la lectura G (criterio confirmado por el docente).
 * En un empate exacto (G = 3, 5, 7 o 9 mL) se usa el tramo mayor.
 */
export function tramoMasCercano(G: number, nominales = TRAMOS_NOMINALES): number {
  let best = 0;
  for (let i = 1; i < nominales.length; i++) {
    if (Math.abs(nominales[i] - G) <= Math.abs(nominales[best] - G) + 1e-12) best = i;
  }
  return best;
}

/** G corregido = G + (V20(tramo) − nominal(tramo)). Se puede forzar un tramo (para diagnósticos). */
export function corregirBureta(G: number, tramosV20: number[], tramoForzado?: number): CorreccionBureta {
  const i = tramoForzado ?? tramoMasCercano(G);
  const nominalTramo = TRAMOS_NOMINALES[i];
  const v20Tramo = tramosV20[i];
  const correccion = v20Tramo - nominalTramo;
  return { lectura: G, tramo: i, nominalTramo, v20Tramo, correccion, corregido: G + correccion };
}

export function nombreTramo(i: number): string {
  return `0–${TRAMOS_NOMINALES[i]} mL`;
}

/** Interpolación bilineal en la tabla Z (fuera de rango se toma el borde y se avisa). */
export function interpolarZ(tabla: TablaZ, T: number, P: number): { Z: number; fueraDeRango: boolean } {
  const pos = (arr: number[], x: number) => {
    if (x <= arr[0]) return { i: 0, f: 0, out: x < arr[0] };
    const n = arr.length - 1;
    if (x >= arr[n]) return { i: n - 1, f: 1, out: x > arr[n] };
    let i = 0;
    while (x > arr[i + 1]) i++;
    return { i, f: (x - arr[i]) / (arr[i + 1] - arr[i]), out: false };
  };
  const a = pos(tabla.T, T);
  const b = pos(tabla.P, P);
  const z = (i: number, j: number) => tabla.Z[i][j];
  const j1 = Math.min(b.i + 1, tabla.P.length - 1);
  const i1 = Math.min(a.i + 1, tabla.T.length - 1);
  const z0 = z(a.i, b.i) * (1 - b.f) + z(a.i, j1) * b.f;
  const z1 = z(i1, b.i) * (1 - b.f) + z(i1, j1) * b.f;
  return { Z: z0 * (1 - a.f) + z1 * a.f, fueraDeRango: a.out || b.out };
}
