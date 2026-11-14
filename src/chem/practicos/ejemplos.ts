/**
 * Datos de ejemplo para la demostración: 3–4 alumnos ficticios por práctico,
 * algunos correctos y otros con errores típicos. Los "resultados del alumno" se generan
 * con el mismo motor pero con la variante de error correspondiente, redondeados como
 * los escribiría un estudiante.
 */
import { OPCIONES_CORRECTAS, type Opciones, type PracticaDef } from './motor';
import { practica } from './practicas';
import type { Ajustes, CriterioDeclarado, Entrega, FilaEntregada, MaterialEntregado, PracticaId } from './tipos';
import { buscarMaterial, codigoCompleto } from './material';

/** Generador pseudoaleatorio con semilla (siempre los mismos ejemplos). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const txt = (x: number, sig = 5) => (Number.isFinite(x) ? String(Number(x.toPrecision(sig))).replace('.', ',') : '');
const dec = (x: number, d: number) => x.toFixed(d).replace('.', ',');

function material(aj: Ajustes, codigo: string, tolerancia: string): MaterialEntregado {
  const ref = buscarMaterial(aj.materiales, codigo)!;
  return {
    codigo: codigoCompleto(codigo),
    vNominal: String(ref.nominal),
    tolerancia,
    v20: ref.v20 != null ? dec(ref.v20, 2) : '',
    tramos: ref.tramos ? ref.tramos.map((v) => dec(v, 2)) : [],
  };
}

const reactivo = (assay: string, lote: string) => ({ lote, assay, fechaPreparacion: '2026-03-10', fechaVencimiento: '2028-03-10' });

/** Escribe en la entrega los resultados que "calculó el alumno" (con la variante de error dada). */
export function rellenarResultados(p: PracticaDef, e: Entrega, aj: Ajustes, op: Partial<Opciones> = {}): Entrega {
  const c = p.calcular(e, aj, { ...OPCIONES_CORRECTAS, ...op });
  e.filas.forEach((f, i) => {
    for (const d of p.resultadosFila) {
      const v = c.filas[i]?.[d.clave];
      f.resultados[d.clave] = d.clave === 'Gc' ? dec(v, 2) : txt(v, 5);
    }
  });
  for (const d of [...p.resultadosIntermedios, ...p.resultadosResumen]) {
    const v = d.clave in c.intermedios ? c.intermedios[d.clave] : c.resumen[d.clave];
    if (typeof v === 'boolean') e.resultados[d.clave] = v ? 'si' : 'no';
    else if (d.tipo === 'entero') e.resultados[d.clave] = String(v);
    else e.resultados[d.clave] = txt(v as number, d.tipo === 'dispersion' ? 3 : d.clave === 'Z' ? 6 : 5);
  }
  return e;
}

function base(id: PracticaId, n: number, nombre: string, grupo: string): Entrega {
  return {
    id: `ej-${id}-${n}`,
    practica: id,
    creada: new Date(Date.UTC(2026, 3, 1 + n, 12)).toISOString(),
    alumno: { nombre, grupo, fecha: '2026-04-15' },
    materiales: {},
    reactivos: {},
    muestra: '',
    datos: {},
    filas: [],
    criterio: { tipo: 'dixon', texto: '' },
    resultados: {},
    observaciones: '',
    ejemplo: true,
  };
}

const NOMBRES = ['Ana Pérez (ejemplo)', 'Bruno Silva (ejemplo)', 'Carla Méndez (ejemplo)', 'Martín Suárez (ejemplo)'];
const fila = (datos: Record<string, string>, promediable = true): FilaEntregada => ({ datos, promediable, resultados: {} });

/* ---------------- P1 ---------------- */
function ejemplosP1(aj: Ajustes): Entrega[] {
  const p = practica('p1')!;
  const r = rng(11);
  const masas = (n: number, vol: number, sd: number, mi0: number) =>
    Array.from({ length: n }, (_, i) => {
      const mi = mi0 + i * 0.0213 + r() * 0.01;
      const m = vol / 1.0033 + (r() - 0.5) * 2 * sd;
      return fila({ mi: dec(mi, 4), mf: dec(mi + m, 4) });
    });
  const mk = (n: number, cod: string, tol: string, filas: FilaEntregada[], datos: Record<string, string>, crit: CriterioDeclarado, op: Partial<Opciones>, obs = '') => {
    const e = base('p1', n, NOMBRES[n - 1], 'G1');
    e.materiales.material = material(aj, cod, tol);
    e.datos = datos;
    e.filas = filas;
    e.criterio = crit;
    e.observaciones = obs;
    e.muestra = 'Agua destilada';
    return rellenarResultados(p, e, aj, op);
  };
  return [
    mk(1, 'PA1005', '0,02', masas(10, 10.02, 0.004, 48.3121), { T: '22,0', P: '1013', tramo: '' }, { tipo: 'grubbs', texto: '' }, {}),
    mk(2, 'PA507', '0,015', masas(10, 5.01, 0.003, 32.1187), { T: '26,0', P: '1009', tramo: '' }, { tipo: 'dixon', texto: '' }, { z: '20' }),
    mk(3, 'PA1013', '0,02', masas(10, 10.04, 0.004, 51.0042), { T: '21,0', P: '1016', tramo: '' }, { tipo: 'grubbs', texto: '' }, { vref: 'nominal' }),
    mk(4, 'B1003', '0,02', masas(6, 8.0, 0.004, 40.7712), { T: '23,0', P: '1011', tramo: '8' }, { tipo: 'otro', texto: 'Se usan todas las determinaciones (verificación de material)' }, {}),
  ];
}

/* ---------------- P2 ---------------- */
function ejemplosP2(aj: Ajustes): Entrega[] {
  const p = practica('p2')!;
  const mk = (n: number, bur: string, assay: string, datos: [string, string][], marcas: boolean[], op: Partial<Opciones>) => {
    const e = base('p2', n, NOMBRES[n - 1], n <= 2 ? 'G1' : 'G2');
    e.materiales.bureta = material(aj, bur, '0,02');
    e.reactivos.patron = reactivo(assay, 'NC-2025-118');
    e.reactivos.titulante = reactivo('', 'HCl-0326');
    e.muestra = 'HCl ≈ 0,1 mol/L';
    e.filas = datos.map(([m, G], i) => fila({ m, G }, marcas[i]));
    return rellenarResultados(p, e, aj, op);
  };
  return [
    // correcta, con un valor que el Q de Dixon descarta (fila 4)
    mk(1, 'B1001', '99,8', [['0,0425', '8,01'], ['0,0418', '7,88'], ['0,0431', '8,12'], ['0,0422', '8,21']], [true, true, true, false], {}),
    // no corrigió la bureta
    mk(2, 'B1002', '99,8', [['0,0412', '7,73'], ['0,0436', '8,19'], ['0,0428', '8,05'], ['0,0420', '7,90']], [true, true, true, true], { bureta: 'sin' }),
    // incluyó el valor no promediable
    mk(3, 'B1011', '99,8', [['0,0430', '8,05'], ['0,0419', '7,86'], ['0,0426', '7,97'], ['0,0415', '8,10']], [true, true, true, true], { promediables: 'todos' }),
    // relación 1:1
    mk(4, 'B1016', '99,8', [['0,0402', '7,52'], ['0,0447', '8,38'], ['0,0433', '8,11'], ['0,0421', '7,89']], [true, true, true, true], { relacion: 'uno' }),
  ];
}

/* ---------------- P3 ---------------- */
function ejemplosP3(aj: Ajustes): Entrega[] {
  const p = practica('p3')!;
  const mk = (n: number, bur: string, mat: string, pip: string, m: string, G: string[], marcas: boolean[], op: Partial<Opciones>) => {
    const e = base('p3', n, NOMBRES[n - 1], n <= 2 ? 'G1' : 'G2');
    e.materiales.bureta = material(aj, bur, '0,02');
    e.materiales.matraz = material(aj, mat, '0,10');
    e.materiales.pipeta = material(aj, pip, '0,02');
    e.reactivos.patron = reactivo('99,5', 'OX-2024-031');
    e.reactivos.titulante = reactivo('', 'NaOH-0326');
    e.muestra = 'NaOH ≈ 0,1 mol/L';
    e.datos.m = m;
    e.filas = G.map((g, i) => fila({ G: g }, marcas[i]));
    return rellenarResultados(p, e, aj, op);
  };
  return [
    mk(1, 'B1005', 'MA10005', 'PA1013', '0,5104', ['8,03', '8,05', '8,04', '8,02'], [true, true, true, true], {}),
    // V nominal de matraz y pipeta
    mk(2, 'B1003', 'MA10005', 'PA1006', '0,5087', ['7,98', '8,01', '7,99', '8,00'], [true, true, true, true], { volumen: 'nominal' }),
    // tramo de bureta equivocado
    mk(3, 'B1011', 'MA10013', 'PA1002', '0,5122', ['8,13', '8,10', '8,12', '8,40'], [true, true, true, false], { bureta: 'superior' }),
    // olvidó el factor de alícuota
    mk(4, 'B1020', 'MA10010', 'PA1010', '0,5066', ['7,97', '7,95', '7,99', '7,96'], [true, true, true, true], { alicuota: 'sin' }),
  ];
}

export function generarEjemplos(aj: Ajustes): Entrega[] {
  return [...ejemplosP1(aj), ...ejemplosP2(aj), ...ejemplosP3(aj)];
}
