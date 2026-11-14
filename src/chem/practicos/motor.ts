/**
 * Piezas comunes del motor de cálculo de las entregas.
 * Cada práctico (practicas.ts) recalcula todo a partir de los DATOS CRUDOS del alumno;
 * las "opciones" permiten recalcular con errores típicos para diagnosticar.
 */
import { parseNumber, texNum } from '../numeric/format';
import { buscarMaterial, corregirBureta, nombreTramo, type CorreccionBureta } from './material';
import { mascaraCorrecta, tratamiento, type ModoT, type PasoCriterio } from './estadistica';
import type { Ajustes, CriterioDeclarado, Entrega, PracticaId, TipoMaterial } from './tipos';

export interface Opciones {
  volumen: 'v20' | 'nominal';
  bureta: 'cercano' | 'sin' | 'superior' | 'inferior' | 'signo';
  relacion: 'ok' | 'uno' | 'invertida';
  alicuota: 'ok' | 'sin' | 'invertida';
  assay: 'ok' | 'sin';
  promediables: 'motor' | 'todos' | 'alumno';
  t: ModoT;
  /** P1 */
  z: 'ok' | '20' | 'agua';
  vref: 'v20' | 'nominal';
}

export const OPCIONES_CORRECTAS: Opciones = {
  volumen: 'v20',
  bureta: 'cercano',
  relacion: 'ok',
  alicuota: 'ok',
  assay: 'ok',
  promediables: 'motor',
  t: 'correcto',
  z: 'ok',
  vref: 'v20',
};

/** Paso de "Ver procedimiento" (sin React: lo dibuja la interfaz). */
export interface Paso {
  titulo: string;
  texto?: string;
  tex?: string[];
  tabla?: { cabecera: string[]; filas: string[][] };
}

export type TipoResultado = 'valor' | 'dispersion' | 'entero' | 'cumple';

export interface CampoDef {
  clave: string;
  etiqueta: string;
  unidad?: string;
  min?: number;
  max?: number;
  /** campo de opciones (se guarda el value) */
  opciones?: { value: string; label: string }[];
  ayuda?: string;
}

export interface ResultadoDef {
  clave: string;
  etiqueta: string;
  unidad?: string;
  tipo: TipoResultado;
}

export interface SlotMaterial {
  clave: string;
  rol: string;
  tipos: TipoMaterial[];
}

export interface ReactivoDef {
  clave: string;
  nombre: string;
  conAssay: boolean;
}

export interface Calculo {
  errores: string[];
  avisos: string[];
  filas: Record<string, number>[];
  intermedios: Record<string, number>;
  resumen: Record<string, number | boolean>;
  /** promediables que usó el motor */
  mascara: boolean[];
  /** promediables según el criterio declarado (null si el criterio es "Otro") */
  mascaraCriterio: boolean[] | null;
  pasosCriterio: PasoCriterio[];
  pasos: Paso[];
}

export interface PracticaDef {
  id: PracticaId;
  numero: number;
  parte?: string;
  titulo: string;
  materiales: SlotMaterial[];
  reactivos: ReactivoDef[];
  datos: CampoDef[];
  columnas: CampoDef[];
  filas: { min: number; defecto: number; max: number };
  resultadosFila: ResultadoDef[];
  resultadosIntermedios: ResultadoDef[];
  resultadosResumen: ResultadoDef[];
  /** clave del resultado por fila al que se aplica la estadística */
  valorFila: string;
  unidadResultado: string;
  /** dato que viene de otra práctica del mismo alumno */
  encadenado?: { desde: PracticaId; dato: string; resultado: string; etiqueta: string };
  /** para saber qué errores típicos tiene sentido probar */
  rasgos: { bureta: boolean; volumenes: boolean; relacion: boolean; alicuota: boolean; assay?: string; p1?: boolean };
  calcular(e: Entrega, aj: Ajustes, op?: Opciones): Calculo;
}

/* ------------------------------------------------------------------ */

export const num = (s: string | undefined): number => {
  const v = parseNumber(s ?? '');
  return v == null ? NaN : v;
};

export const T = (x: number, sig = 5) => texNum(x, sig);

/** Contexto de cálculo con acumulación de errores (dato faltante, código desconocido…). */
export class Ctx {
  errores: string[] = [];
  avisos: string[] = [];
  pasos: Paso[] = [];
  constructor(public e: Entrega, public aj: Ajustes, public op: Opciones) {}

  dato(clave: string, etiqueta: string): number {
    const v = num(this.e.datos[clave]);
    if (!Number.isFinite(v)) this.errores.push(`Falta o no es válido: ${etiqueta}.`);
    return v;
  }

  assay(clave: string): number {
    if (this.op.assay === 'sin') return 100;
    const v = num(this.e.reactivos[clave]?.assay);
    if (!Number.isFinite(v)) {
      this.errores.push('Falta el assay del patrón.');
      return NaN;
    }
    return v;
  }

  /** V20 de una pipeta o matraz: de la tabla Lab QA si el código existe; si no, el que escribió el alumno. */
  volumen(slot: string, rol: string): { v: number; texto: string } {
    const m = this.e.materiales[slot];
    const ref = m ? buscarMaterial(this.aj.materiales, m.codigo) : undefined;
    if (this.op.volumen === 'nominal') {
      const v = ref ? ref.nominal : num(m?.vNominal);
      return { v, texto: `${rol}: V nominal = ${v} mL` };
    }
    if (ref?.v20 != null) return { v: ref.v20, texto: `${rol} ${ref.codigo}-26: V20 = ${ref.v20} mL (tabla Lab QA)` };
    const v = num(m?.v20);
    if (!Number.isFinite(v)) this.errores.push(`Falta el V20 de: ${rol}.`);
    else this.avisos.push(`${rol}: el código «${m?.codigo ?? ''}» no está en la tabla Lab QA; se usó el V20 escrito por el alumno.`);
    return { v, texto: `${rol}: V20 = ${v} mL (escrito por el alumno)` };
  }

  tramosBureta(slot = 'bureta'): number[] {
    const m = this.e.materiales[slot];
    const ref = m ? buscarMaterial(this.aj.materiales, m.codigo) : undefined;
    if (ref?.tramos) return ref.tramos;
    const t = (m?.tramos ?? []).map(num);
    if (t.length !== 5 || t.some((x) => !Number.isFinite(x))) {
      this.errores.push('Faltan los V20 de los tramos de la bureta.');
      return [2, 4, 6, 8, 10];
    }
    this.avisos.push(`Bureta «${m?.codigo ?? ''}» no está en la tabla Lab QA; se usaron los V20 escritos por el alumno.`);
    return t;
  }

  /** Corrige una lectura de bureta según la opción (correcto: tramo más cercano). */
  bureta(G: number, tramos: number[]): CorreccionBureta {
    const c = corregirBureta(G, tramos);
    switch (this.op.bureta) {
      case 'sin':
        return { ...c, correccion: 0, corregido: G };
      case 'superior':
        return corregirBureta(G, tramos, Math.min(4, c.tramo + 1));
      case 'inferior':
        return corregirBureta(G, tramos, Math.max(0, c.tramo - 1));
      case 'signo':
        return { ...c, corregido: G - c.correccion };
      default:
        return c;
    }
  }

  /** Marca de promediables y tratamiento estadístico común. */
  estadistica(valores: number[], unidad: string, sig = 5) {
    const marcadas = this.e.filas.map((f) => f.promediable);
    const crit = criterioSeguro(this.e.criterio);
    const porCriterio = mascaraCorrecta(valores, crit, marcadas, this.aj.criterioIterativo);
    let mascara = porCriterio.mascara;
    if (this.op.promediables === 'todos') mascara = valores.map((v) => Number.isFinite(v));
    if (this.op.promediables === 'alumno') mascara = marcadas.map((m, i) => m && Number.isFinite(valores[i]));
    const usados = valores.filter((_, i) => mascara[i]);
    const tr = tratamiento(usados, this.op.t);
    if (usados.length < 2) this.errores.push('Se necesitan al menos 2 valores promediables.');
    this.pasos.push({
      titulo: 'Criterio de promediabilidad',
      texto: porCriterio.pasos.map((p) => p.texto).join(' '),
    });
    this.pasos.push({
      titulo: 'Tratamiento estadístico de los valores promediables',
      tex: [
        `n = ${tr.n}\\qquad \\bar{x} = ${T(tr.media, sig + 1)}\\ \\text{${unidad}}`,
        `s = ${T(tr.s, 3)}\\qquad CV = \\frac{s}{\\bar{x}}\\cdot 100 = ${T(tr.cv, 3)}\\,\\%`,
        `t_{(95\\%,\\,${tr.n - 1})} = ${T(tr.t, 4)}\\qquad \\frac{t\\,s}{\\sqrt{n}} = ${T(tr.compAleatorio, 3)}\\ \\text{${unidad}}`,
        `\\text{Resultado} = \\bar{x} \\pm \\frac{t\\,s}{\\sqrt{n}} = ${T(tr.media, sig)} \\pm ${T(tr.compAleatorio, 2)}\\ \\text{${unidad}}`,
      ],
    });
    return {
      tr,
      mascara,
      mascaraCriterio: crit.tipo === 'otro' ? null : porCriterio.mascara,
      pasosCriterio: porCriterio.pasos,
      resumen: {
        media: tr.media,
        n: tr.n,
        s: tr.s,
        cv: tr.cv,
        compAleatorio: tr.compAleatorio,
        resultado: tr.media,
        incertidumbre: tr.compAleatorio,
      } as Record<string, number | boolean>,
    };
  }
}

function criterioSeguro(c: CriterioDeclarado | undefined): CriterioDeclarado {
  return c && ['dixon', 'grubbs', 'otro'].includes(c.tipo) ? c : { tipo: 'dixon', texto: '' };
}

export function filasValidas(e: Entrega, claves: string[]): number[][] {
  return e.filas.map((f) => claves.map((k) => num(f.datos[k])));
}

export function textoTramo(c: CorreccionBureta): string {
  return `${nombreTramo(c.tramo)} (V20 ${c.v20Tramo.toFixed(2).replace('.', ',')})`;
}

/** Resultados comunes del resumen (todas las prácticas). */
export function resumenComun(unidad: string): ResultadoDef[] {
  return [
    { clave: 'media', etiqueta: 'x̄ (media de promediables)', unidad, tipo: 'valor' },
    { clave: 'n', etiqueta: 'n', tipo: 'entero' },
    { clave: 's', etiqueta: 's', unidad, tipo: 'dispersion' },
    { clave: 'cv', etiqueta: 'CV', unidad: '%', tipo: 'dispersion' },
    { clave: 'compAleatorio', etiqueta: 'Componente aleatorio t·s/√n', unidad, tipo: 'dispersion' },
    { clave: 'resultado', etiqueta: 'Resultado final', unidad, tipo: 'valor' },
    { clave: 'incertidumbre', etiqueta: '± Incertidumbre', unidad, tipo: 'dispersion' },
  ];
}

export function nuevoCalculo(ctx: Ctx, partial: Partial<Calculo>): Calculo {
  return {
    errores: ctx.errores,
    avisos: ctx.avisos,
    filas: [],
    intermedios: {},
    resumen: {},
    mascara: [],
    mascaraCriterio: null,
    pasosCriterio: [],
    pasos: ctx.pasos,
    ...partial,
  };
}
