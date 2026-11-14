/**
 * Tipos de las entregas de prácticos (planillas de laboratorio digitalizadas).
 * TypeScript puro: se puede reutilizar tal cual en una versión con servidor.
 *
 * Los valores numéricos se guardan como TEXTO tal cual los escribió el alumno
 * ("0,1023" o "0.1023"); el motor los interpreta con parseNumber.
 */

export type PracticaId = 'p1' | 'p2' | 'p3' | 'p4' | 'p6' | 'p7a' | 'p7b' | 'p8a' | 'p8b' | 'p9';

export type TipoMaterial = 'pipeta' | 'matraz' | 'bureta';

/** Criterio de promediabilidad declarado por el alumno. */
export interface CriterioDeclarado {
  tipo: 'dixon' | 'grubbs' | 'otro';
  /** texto libre cuando tipo = 'otro' */
  texto: string;
}

export interface MaterialEntregado {
  codigo: string;
  vNominal: string;
  /** tolerancia leída de la etiqueta del material (la escribe el alumno) */
  tolerancia: string;
  /** V20 (pipetas y matraces) */
  v20: string;
  /** V20 de los tramos 0-2 / 0-4 / 0-6 / 0-8 / 0-10 (buretas) */
  tramos: string[];
}

export interface ReactivoEntregado {
  lote: string;
  assay: string;
  fechaPreparacion: string;
  fechaVencimiento: string;
}

export interface FilaEntregada {
  /** datos experimentales crudos, por clave de columna */
  datos: Record<string, string>;
  /** el alumno marcó la determinación como promediable (*) */
  promediable: boolean;
  /** resultados calculados por el alumno para esta fila */
  resultados: Record<string, string>;
}

export interface Entrega {
  id: string;
  practica: PracticaId;
  creada: string; // ISO
  alumno: { nombre: string; grupo: string; fecha: string };
  materiales: Record<string, MaterialEntregado>;
  reactivos: Record<string, ReactivoEntregado>;
  muestra: string;
  /** datos únicos (no repetidos por fila): temperatura, masa de patrón, G blanco… */
  datos: Record<string, string>;
  filas: FilaEntregada[];
  criterio: CriterioDeclarado;
  /** resultados del alumno que no son por fila (media, s, CV, intermedios…) */
  resultados: Record<string, string>;
  /** si un dato viene de una entrega anterior del mismo alumno (P4, P7.2, P8.2) */
  origenEncadenado?: string;
  observaciones: string;
  ejemplo?: boolean;
}

/** Forma de comparar el valor del alumno con el recalculado. */
export type Tolerancia =
  | { modo: 'relativa'; valor: number } // %
  | { modo: 'absoluta'; valor: number }
  | { modo: 'cifras'; valor: number }; // cifras significativas

export interface MaterialRef {
  codigo: string; // sin el sufijo -26
  tipo: TipoMaterial;
  nominal: number;
  /** V20 (pipetas, matraces) */
  v20?: number;
  /** V20 de los tramos 2/4/6/8/10 mL (buretas) */
  tramos?: number[];
}

/** Tabla Z(T, P) en mL/g: Z[i][j] para T[i] (°C) y P[j] (hPa). */
export interface TablaZ {
  T: number[];
  P: number[];
  Z: number[][];
}

export interface Ajustes {
  tolValores: Tolerancia;
  /** para s, CV, componente aleatorio e incertidumbre (se informan con pocas cifras) */
  tolDispersion: Tolerancia;
  masasMolares: Record<string, number>;
  tablaZ: TablaZ;
  materiales: MaterialRef[];
  /** aplicar Dixon/Grubbs de nuevo tras descartar un valor */
  criterioIterativo: boolean;
}
