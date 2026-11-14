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
import { promediablesPorCriterio } from './estadistica';

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

/* ---------------- P3 (datos al azar pero coherentes) ---------------- */

/**
 * Arma una entrega de P3 con datos aleatorios coherentes:
 * C(NaOH) real entre 0,095 y 0,105 mol/L, m de oxálico 0,48–0,53 g, alícuota 10/100 mL,
 * gastos ≈ 8 mL con ruido de lectura (±0,02 mL) y, a veces, un valor alejado.
 * Los resultados del alumno se calculan con la variante de error `op` (vacía = correcto)
 * y los promediables se marcan según el criterio (o todos, si el error es incluirlos).
 */
export function entregaP3Aleatoria(aj: Ajustes, r: () => number, nombre: string, op: Partial<Opciones> = {}, n = 1): Entrega {
  const p = practica('p3')!;
  const elegir = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const mats = (t: string, nom: number) => aj.materiales.filter((m) => m.tipo === t && m.nominal === nom);
  let bureta = elegir(mats('bureta', 10));
  let matraz = elegir(mats('matraz', 100));
  let pipeta = elegir(mats('pipeta', 10));
  // que el error elegido se note (si no, el diagnóstico no lo puede distinguir del redondeo)
  if (op.bureta === 'superior') bureta = elegir(aj.materiales.filter((m) => m.tramos && Math.abs(m.tramos[3] - 8 - (m.tramos[4] - 10)) >= 0.02));
  if (op.volumen === 'nominal')
    for (let k = 0; k < 50 && Math.abs((pipeta.v20! / matraz.v20!) / 0.1 - 1) < 0.004; k++) {
      matraz = elegir(mats('matraz', 100));
      pipeta = elegir(mats('pipeta', 10));
    }
  const assay = 99.5 + Math.round(r() * 4) / 10; // 99,5–99,9 %
  const Creal = 0.095 + r() * 0.01;
  const m = Math.round((0.48 + r() * 0.05) * 1e4) / 1e4;
  const Gc = (2 * m * (assay / 100) * (pipeta.v20! / matraz.v20!) * 1000) / (aj.masasMolares.H2C2O4_2H2O * Creal);
  const corr = (G: number) => bureta.tramos![Math.round(Math.min(10, Math.max(2, G)) / 2) - 1] - 2 * (Math.round(Math.min(10, Math.max(2, G)) / 2));
  if (op.bureta === 'sin' || op.bureta === 'superior')
    for (let k = 0; k < 50 && Math.abs(corr(Gc)) < 0.02; k++) {
      const cands = aj.materiales.filter((m) => m.tramos && Math.abs(m.tramos[3] - 8) >= 0.02 && (op.bureta !== 'superior' || Math.abs(m.tramos[3] - 8 - (m.tramos[4] - 10)) >= 0.02));
      bureta = elegir(cands);
    }
  const nFilas = 4;
  const criterio: 'dixon' | 'grubbs' = op.promediables === 'todos' || r() < 0.7 ? 'dixon' : 'grubbs';
  // con "incluyó un valor no promediable" tiene que haber uno que el criterio descarte
  const atipico = op.promediables === 'todos' || r() < 0.4 ? Math.floor(r() * nFilas) : -1;
  // lecturas con ruido (±0,03 mL), redondeadas a 0,01 mL; se repite hasta que el criterio
  // descarte justo el valor alejado (o ninguno) y haya dispersión entre los demás
  let G: number[] = [];
  for (let intento = 0; intento < 200; intento++) {
    G = Array.from({ length: nFilas }, (_, i) => {
      let g = Gc - corr(Gc) + (r() - 0.5) * 0.06;
      if (i === atipico) g += (r() < 0.5 ? -1 : 1) * (0.3 + r() * 0.15);
      return Math.round(g * 100) / 100;
    });
    const mk = promediablesPorCriterio(G, criterio).mascara;
    const esperado = G.map((_, i) => i !== atipico);
    const resto = G.filter((_, i) => i !== atipico);
    if (mk.every((v, i) => v === esperado[i]) && new Set(resto).size >= 3) break;
  }
  const e = base('p3', n, nombre, r() < 0.5 ? 'G1' : 'G2');
  e.id = `ej-p3-${n}-${Math.floor(r() * 1e9).toString(36)}`;
  e.materiales.bureta = material(aj, bureta.codigo, '0,02');
  e.materiales.matraz = material(aj, matraz.codigo, '0,10');
  e.materiales.pipeta = material(aj, pipeta.codigo, '0,02');
  e.reactivos.patron = reactivo(dec(assay, 1), `OX-2025-${100 + Math.floor(r() * 900)}`);
  e.reactivos.titulante = reactivo('', `NaOH-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}26`);
  e.muestra = 'NaOH ≈ 0,1 mol/L';
  e.datos.m = dec(m, 4);
  e.criterio = { tipo: criterio, texto: '' };
  e.filas = G.map((g) => fila({ G: dec(g, 2) }));
  // marcar promediables según el criterio declarado (con los valores bien calculados)
  const c = p.calcular(e, aj);
  e.filas.forEach((f, i) => (f.promediable = op.promediables === 'todos' ? true : c.mascaraCriterio ? c.mascaraCriterio[i] : true));
  return rellenarResultados(p, e, aj, op);
}

function ejemplosP3(aj: Ajustes, seed: number): Entrega[] {
  const r = rng(seed);
  const errores: Partial<Opciones>[] = [{ volumen: 'nominal' }, { bureta: 'superior' }, { alicuota: 'sin' }, { relacion: 'uno' }, { promediables: 'todos' }, { t: 'z' }, { bureta: 'sin' }];
  // 1 correcto + 3 con errores distintos elegidos al azar
  const elegidos: Partial<Opciones>[] = [];
  while (elegidos.length < 3) {
    const x = errores[Math.floor(r() * errores.length)];
    if (!elegidos.includes(x)) elegidos.push(x);
  }
  return [{}, ...elegidos].map((op, i) => entregaP3Aleatoria(aj, r, NOMBRES[i], op, i + 1));
}

/** `semilla` fija = siempre los mismos ejemplos (pruebas); la interfaz pasa una al azar para P3. */
export { rng };

export function generarEjemplos(aj: Ajustes, semilla = 7): Entrega[] {
  return [...ejemplosP1(aj), ...ejemplosP2(aj), ...ejemplosP3(aj, semilla)];
}
