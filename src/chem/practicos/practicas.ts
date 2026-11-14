/**
 * Definición y motor de cálculo de cada práctico (planillas Química Analítica I 2026).
 * Convención: G en mL, C en mol/L, masas en g, assay en %.
 */
import { waterDensity } from '../lab/volumetric';
import { buscarMaterial, interpolarZ, TRAMOS_NOMINALES } from './material';
import {
  Ctx,
  nuevoCalculo,
  num,
  OPCIONES_CORRECTAS,
  resumenComun,
  T,
  textoTramo,
  type Calculo,
  type Opciones,
  type PracticaDef,
  type ResultadoDef,
} from './motor';
import type { Ajustes, Entrega, PracticaId } from './tipos';

const fmt = (x: number, d = 4) => (Number.isFinite(x) ? x.toFixed(d).replace('.', ',') : '—');

/* ============================ P1 ============================ */

const P1: PracticaDef = {
  id: 'p1',
  numero: 1,
  titulo: 'Verificación de material volumétrico',
  materiales: [{ clave: 'material', rol: 'Material a verificar', tipos: ['pipeta', 'bureta'] }],
  reactivos: [],
  datos: [
    { clave: 'T', etiqueta: 'Temperatura del agua', unidad: '°C', min: 10, max: 35 },
    { clave: 'P', etiqueta: 'Presión atmosférica', unidad: 'hPa', min: 700, max: 1100 },
    {
      clave: 'tramo',
      etiqueta: 'Tramo verificado (sólo buretas)',
      opciones: TRAMOS_NOMINALES.map((v) => ({ value: String(v), label: `0–${v} mL` })),
    },
  ],
  columnas: [
    { clave: 'mi', etiqueta: 'm inicial', unidad: 'g', min: 0, max: 1000 },
    { clave: 'mf', etiqueta: 'm final', unidad: 'g', min: 0, max: 1000 },
  ],
  filas: { min: 3, defecto: 10, max: 12 },
  resultadosFila: [
    { clave: 'm', etiqueta: 'm dispensada', unidad: 'g', tipo: 'valor' },
    { clave: 'V20', etiqueta: 'V20', unidad: 'mL', tipo: 'valor' },
  ],
  resultadosIntermedios: [{ clave: 'Z', etiqueta: 'Factor Z utilizado', unidad: 'mL/g', tipo: 'valor' }],
  resultadosResumen: [
    ...resumenComun('mL').slice(0, 4),
    { clave: 'sem', etiqueta: 's/√n', unidad: 'mL', tipo: 'dispersion' },
    ...resumenComun('mL').slice(4),
    { clave: 'vref', etiqueta: 'Vref (V20 tabla Lab QA)', unidad: 'mL', tipo: 'valor' },
    { clave: 'crit1Limite', etiqueta: 'Criterio 1: Tol/3', unidad: 'mL', tipo: 'valor' },
    { clave: 'crit1Cumple', etiqueta: 'Criterio 1: s/√n ≤ Tol/3', tipo: 'cumple' },
    { clave: 'crit2Valor', etiqueta: 'Criterio 2: |V20 − Vref| + t·s/√n', unidad: 'mL', tipo: 'dispersion' },
    { clave: 'crit2Cumple', etiqueta: 'Criterio 2: |V20 − Vref| + t·s/√n ≤ Tol', tipo: 'cumple' },
  ],
  valorFila: 'V20',
  unidadResultado: 'mL',
  rasgos: { bureta: false, volumenes: false, relacion: false, alicuota: false, p1: true },
  calcular(e, aj, op = OPCIONES_CORRECTAS) {
    const c = new Ctx(e, aj, op);
    const Tw = c.dato('T', 'temperatura');
    const P = c.dato('P', 'presión atmosférica');
    const mat = e.materiales.material;
    const ref = mat ? buscarMaterial(aj.materiales, mat.codigo) : undefined;
    const esBureta = ref ? ref.tipo === 'bureta' : /^B/i.test(mat?.codigo ?? '');
    // Z
    let Z: number;
    let zTexto: string;
    if (op.z === 'agua') {
      Z = 1 / waterDensity(Tw);
      zTexto = `Z = 1/ρ(agua, ${Tw} °C)`;
    } else {
      const r = interpolarZ(aj.tablaZ, op.z === '20' ? 20 : Tw, P);
      Z = r.Z;
      zTexto = `Z(${op.z === '20' ? 20 : Tw} °C; ${P} hPa) interpolado en la tabla ISO 4787`;
      if (r.fueraDeRango) c.avisos.push('T o P fuera del rango de la tabla Z: se usó el valor del borde.');
    }
    c.pasos.push({ titulo: 'Factor Z', texto: zTexto, tex: [`Z = ${T(Z, 6)}\\ \\text{mL/g}`] });
    // filas
    const filas = e.filas.map((f) => {
      const m = num(f.datos.mf) - num(f.datos.mi);
      return { m, V20: m * Z };
    });
    c.pasos.push({
      titulo: 'Volumen dispensado a 20 °C',
      tex: ['m = m_{final} - m_{inicial}\\qquad V_{20} = m\\cdot Z'],
      tabla: {
        cabecera: ['#', 'm inicial (g)', 'm final (g)', 'm (g)', 'V20 (mL)'],
        filas: e.filas.map((f, i) => [String(i + 1), f.datos.mi ?? '', f.datos.mf ?? '', fmt(filas[i].m), fmt(filas[i].V20)]),
      },
    });
    const est = c.estadistica(filas.map((f) => f.V20), 'mL');
    // Vref
    let vref = NaN;
    let nominal = num(mat?.vNominal);
    if (esBureta) {
      const tramo = num(e.datos.tramo);
      const i = TRAMOS_NOMINALES.indexOf(tramo);
      if (i < 0) c.errores.push('Indicá el tramo de bureta verificado.');
      const tr = c.tramosBureta('material');
      nominal = tramo;
      vref = op.vref === 'nominal' ? tramo : tr[i];
    } else {
      if (ref) nominal = ref.nominal;
      vref = op.vref === 'nominal' ? nominal : ref?.v20 ?? num(mat?.v20);
    }
    const tol = num(mat?.tolerancia);
    if (!Number.isFinite(tol)) c.errores.push('Falta la tolerancia del material (de la etiqueta).');
    const { tr } = est;
    const sem = op.t === 'sinRaiz' ? tr.s : tr.sem;
    const crit2 = Math.abs(tr.media - vref) + tr.compAleatorio;
    c.pasos.push({
      titulo: 'Criterios de conformidad',
      texto: `Tolerancia escrita por el alumno: ${fmt(tol, 3)} mL. Vref = ${fmt(vref, 2)} mL (${op.vref === 'nominal' ? 'nominal' : 'V20 de la tabla Lab QA'}).`,
      tex: [
        `(1)\\ \\frac{s}{\\sqrt{n}} = ${T(sem, 3)} \\ ${sem <= tol / 3 ? '\\le' : '>'}\\ \\frac{Tol}{3} = ${T(tol / 3, 3)} \\Rightarrow \\text{${sem <= tol / 3 ? 'Cumple' : 'No cumple'}}`,
        `(2)\\ |\\bar{V}_{20} - V_{ref}| + \\frac{t\\,s}{\\sqrt{n}} = |${T(tr.media, 6)} - ${T(vref, 4)}| + ${T(tr.compAleatorio, 3)} = ${T(crit2, 3)}\\ ${crit2 <= tol ? '\\le' : '>'}\\ Tol = ${T(tol, 3)} \\Rightarrow \\text{${crit2 <= tol ? 'Cumple' : 'No cumple'}}`,
      ],
    });
    return nuevoCalculo(c, {
      filas,
      intermedios: { Z },
      resumen: {
        ...est.resumen,
        sem,
        vref,
        crit1Limite: tol / 3,
        crit1Cumple: sem <= tol / 3,
        crit2Valor: crit2,
        crit2Cumple: crit2 <= tol,
      },
      mascara: est.mascara,
      mascaraCriterio: est.mascaraCriterio,
      pasosCriterio: est.pasosCriterio,
    });
  },
};

/* ============================ P2 ============================ */

/** relación molar titulante:patrón, con las variantes de error */
function relacion(r: number, op: Opciones): number {
  if (op.relacion === 'uno') return 1;
  if (op.relacion === 'invertida') return 1 / r;
  return r;
}

const resFilaBureta = (clave: string, etiqueta: string, unidad: string): ResultadoDef[] => [
  { clave: 'Gc', etiqueta: 'G corregido', unidad: 'mL', tipo: 'valor' },
  { clave, etiqueta, unidad, tipo: 'valor' },
];

const BURETA = { clave: 'bureta', rol: 'Bureta', tipos: ['bureta' as const] };

const P2: PracticaDef = {
  id: 'p2',
  numero: 2,
  titulo: 'Estandarización de HCl con Na₂CO₃',
  materiales: [BURETA],
  reactivos: [
    { clave: 'patron', nombre: 'Na₂CO₃ (patrón primario)', conAssay: true },
    { clave: 'titulante', nombre: 'HCl', conAssay: false },
  ],
  datos: [],
  columnas: [
    { clave: 'm', etiqueta: 'm Na₂CO₃', unidad: 'g', min: 0.001, max: 5 },
    { clave: 'G', etiqueta: 'G (lectura bureta)', unidad: 'mL', min: 0, max: 10.5 },
  ],
  filas: { min: 2, defecto: 4, max: 8 },
  resultadosFila: resFilaBureta('C', 'C HCl', 'mol/L'),
  resultadosIntermedios: [],
  resultadosResumen: resumenComun('mol/L'),
  valorFila: 'C',
  unidadResultado: 'mol/L',
  rasgos: { bureta: true, volumenes: false, relacion: true, alicuota: false, assay: 'patron' },
  calcular(e, aj, op = OPCIONES_CORRECTAS) {
    const c = new Ctx(e, aj, op);
    const M = aj.masasMolares.Na2CO3;
    const a = c.assay('patron');
    const r = relacion(2, op);
    const tramos = c.tramosBureta();
    const filas = e.filas.map((f) => {
      const m = num(f.datos.m);
      const b = c.bureta(num(f.datos.G), tramos);
      return { m, b, Gc: b.corregido, C: (r * m * (a / 100) * 1000) / (M * b.corregido) };
    });
    c.pasos.push({
      titulo: 'Concentración de HCl en cada determinación',
      texto: `2 HCl + Na₂CO₃ → 2 NaCl + CO₂ + H₂O. M(Na₂CO₃) = ${M} g/mol; assay = ${a} %. Corrección de bureta: tramo más cercano a la lectura.`,
      tex: [`C_{HCl} = \\frac{${r === 2 ? '2' : T(r, 3)}\\cdot m\\cdot \\frac{Assay}{100}\\cdot 1000}{M_{Na_2CO_3}\\cdot G_{corr}}\\qquad G_{corr} = G + (V_{20,tramo} - V_{nom,tramo})`],
      tabla: {
        cabecera: ['#', 'm (g)', 'G (mL)', 'Tramo', 'Corrección', 'G corr. (mL)', 'C (mol/L)'],
        filas: filas.map((x, i) => [String(i + 1), fmt(x.m), fmt(x.b.lectura, 2), textoTramo(x.b), fmt(x.b.correccion, 2), fmt(x.Gc, 2), fmt(x.C, 5)]),
      },
    });
    const est = c.estadistica(filas.map((f) => f.C), 'mol/L');
    return nuevoCalculo(c, {
      filas: filas.map((f) => ({ Gc: f.Gc, C: f.C })),
      resumen: est.resumen,
      mascara: est.mascara,
      mascaraCriterio: est.mascaraCriterio,
      pasosCriterio: est.pasosCriterio,
    });
  },
};

/* ============ Estandarización con patrón en matraz + alícuota (P3, P7.1, P8.1) ============ */

function estandarizacionAlicuota(cfg: {
  id: PracticaId;
  numero: number;
  parte?: string;
  titulo: string;
  patron: string;
  mm: string;
  titulante: string;
  /** mol de titulante por mol de patrón */
  r: number;
  rTex: string;
  reaccion: string;
}): PracticaDef {
  return {
    id: cfg.id,
    numero: cfg.numero,
    parte: cfg.parte,
    titulo: cfg.titulo,
    materiales: [
      BURETA,
      { clave: 'matraz', rol: 'Matraz aforado (patrón)', tipos: ['matraz'] },
      { clave: 'pipeta', rol: 'Pipeta (alícuota)', tipos: ['pipeta'] },
    ],
    reactivos: [
      { clave: 'patron', nombre: `${cfg.patron} (patrón primario)`, conAssay: true },
      { clave: 'titulante', nombre: cfg.titulante, conAssay: false },
    ],
    datos: [{ clave: 'm', etiqueta: `m ${cfg.patron} (pesada en el matraz)`, unidad: 'g', min: 0.001, max: 20 }],
    columnas: [{ clave: 'G', etiqueta: 'G (lectura bureta)', unidad: 'mL', min: 0, max: 10.5 }],
    filas: { min: 2, defecto: 4, max: 8 },
    resultadosFila: resFilaBureta('C', `C ${cfg.titulante}`, 'mol/L'),
    resultadosIntermedios: [],
    resultadosResumen: resumenComun('mol/L'),
    valorFila: 'C',
    unidadResultado: 'mol/L',
    rasgos: { bureta: true, volumenes: true, relacion: true, alicuota: true, assay: 'patron' },
    calcular(e: Entrega, aj: Ajustes, op = OPCIONES_CORRECTAS): Calculo {
      const c = new Ctx(e, aj, op);
      const M = aj.masasMolares[cfg.mm];
      const a = c.assay('patron');
      const r = relacion(cfg.r, op);
      const m = c.dato('m', `masa de ${cfg.patron}`);
      const vm = c.volumen('matraz', 'Matraz');
      const vp = c.volumen('pipeta', 'Pipeta');
      let f = vp.v / vm.v;
      if (op.alicuota === 'sin') f = 1;
      if (op.alicuota === 'invertida') f = vm.v / vp.v;
      const tramos = c.tramosBureta();
      const filas = e.filas.map((x) => {
        const b = c.bureta(num(x.datos.G), tramos);
        return { b, Gc: b.corregido, C: (r * m * (a / 100) * f * 1000) / (M * b.corregido) };
      });
      c.pasos.push({
        titulo: `Concentración de ${cfg.titulante} en cada determinación`,
        texto: `${cfg.reaccion} M(${cfg.patron}) = ${M} g/mol; assay = ${a} %. ${vm.texto}. ${vp.texto}. Corrección de bureta: tramo más cercano a la lectura.`,
        tex: [
          `C = \\frac{${cfg.rTex}\\cdot m\\cdot \\frac{Assay}{100}\\cdot \\frac{V_{pip}}{V_{matraz}}\\cdot 1000}{M\\cdot G_{corr}}`,
          `\\frac{V_{pip}}{V_{matraz}} = \\frac{${T(vp.v, 4)}}{${T(vm.v, 4)}} = ${T(f, 5)}`,
        ],
        tabla: {
          cabecera: ['#', 'G (mL)', 'Tramo', 'Corrección', 'G corr. (mL)', 'C (mol/L)'],
          filas: filas.map((x, i) => [String(i + 1), fmt(x.b.lectura, 2), textoTramo(x.b), fmt(x.b.correccion, 2), fmt(x.Gc, 2), fmt(x.C, 5)]),
        },
      });
      const est = c.estadistica(filas.map((x) => x.C), 'mol/L');
      return nuevoCalculo(c, {
        filas: filas.map((x) => ({ Gc: x.Gc, C: x.C })),
        resumen: est.resumen,
        mascara: est.mascara,
        mascaraCriterio: est.mascaraCriterio,
        pasosCriterio: est.pasosCriterio,
      });
    },
  };
}

const P3 = estandarizacionAlicuota({
  id: 'p3',
  numero: 3,
  titulo: 'Estandarización de NaOH con ácido oxálico',
  patron: 'H₂C₂O₄·2H₂O',
  mm: 'H2C2O4_2H2O',
  titulante: 'NaOH',
  r: 2,
  rTex: '2',
  reaccion: 'H₂C₂O₄ + 2 NaOH → Na₂C₂O₄ + 2 H₂O.',
});

/* ============================ Registro ============================ */

export const PRACTICAS: PracticaDef[] = [P1, P2, P3];

export function practica(id: PracticaId): PracticaDef | undefined {
  return PRACTICAS.find((p) => p.id === id);
}

export function nombrePractica(p: PracticaDef): string {
  return `P${p.numero}${p.parte ? ` (${p.parte})` : ''} · ${p.titulo}`;
}

export { estandarizacionAlicuota, relacion };
