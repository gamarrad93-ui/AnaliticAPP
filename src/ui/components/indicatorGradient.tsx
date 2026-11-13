/**
 * Fondo del gráfico pH vs V coloreado según el indicador seleccionado.
 *
 * Se dibuja un rectángulo (ReferenceArea) que cubre exactamente el dominio del eje de pH
 * [yMin, yMax] y se rellena con un linearGradient SVG vertical. Con gradientUnits =
 * "objectBoundingBox" las posiciones (offsets) son fracciones del alto de ese rectángulo,
 * es decir, del eje de pH: el gradiente queda alineado con el eje aunque cambie el tamaño
 * del gráfico, la escala o el modo proyector.
 *
 *   pH < low          → color ácido (sólido)
 *   low ≤ pH ≤ high   → degradé lineal del color ácido al básico
 *   pH > high         → color básico (sólido)
 */
import type { Indicator } from '../../chem/data/indicators';

export interface GradientStop {
  offset: number; // 0 = arriba (pH = yMax), 1 = abajo (pH = yMin)
  color: string;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Paradas del degradé, de arriba (pH alto) hacia abajo (pH bajo). */
export function indicatorGradientStops(low: number, high: number, acidHex: string, baseHex: string, yMin = 0, yMax = 14): GradientStop[] {
  const span = yMax - yMin;
  const oHigh = clamp01((yMax - high) / span);
  const oLow = clamp01((yMax - low) / span);
  return [
    { offset: 0, color: baseHex },
    { offset: oHigh, color: baseHex },
    { offset: oLow, color: acidHex },
    { offset: 1, color: acidHex },
  ];
}

/** "incoloro" se muestra como blanco/gris muy claro para que el viraje se vea igual. */
export function displayColor(hex: string, name: string): string {
  return /incoloro/i.test(name) ? '#f1f5f9' : hex;
}

/**
 * Rango de color genérico sobre el eje vertical (pH o potencial): por debajo de `low` el color
 * `lowHex` (sólido), entre `low` y `high` un degradé, y por encima `highHex` (sólido).
 * Lo usan los indicadores ácido-base (pH) y los redox (E).
 */
export interface ColorRange {
  name: string;
  low: number;
  high: number;
  lowHex: string;
  highHex: string;
  lowLabel: string; // ej. "rojo" o "rojo (forma reducida)"
  highLabel: string;
}

/**
 * <defs> con el linearGradient; usar fill={`url(#${id})`} en un ReferenceArea que cubra exactamente
 * el dominio del eje [yMin, yMax].
 * OJO: se llama como función ({colorBackgroundDefs(...)}), no como <Componente/>: Recharts sólo dibuja
 * elementos SVG literales (como <defs>) dentro del gráfico y descarta componentes propios.
 */
export function colorBackgroundDefs(props: { id: string; range: ColorRange; opacity: number; yMin: number; yMax: number }) {
  const r = props.range;
  const stops = indicatorGradientStops(r.low, r.high, r.lowHex, r.highHex, props.yMin, props.yMax);
  return (
    <defs>
      <linearGradient id={props.id} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
        {stops.map((s, i) => (
          <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={props.opacity} />
        ))}
      </linearGradient>
    </defs>
  );
}

/** Opacidad del fondo: moderada, un poco menor en tema oscuro. */
export const backgroundOpacity = (dark: boolean) => (dark ? 0.32 : 0.38);

/** Rango de color de un indicador ácido-base (color ácido abajo, básico arriba). */
export function acidBaseRange(ind: Indicator): ColorRange {
  return {
    name: ind.name,
    low: ind.low,
    high: ind.high,
    lowHex: displayColor(ind.acidHex, ind.acidColor),
    highHex: displayColor(ind.baseHex, ind.baseColor),
    lowLabel: ind.acidColor,
    highLabel: ind.baseColor,
  };
}

/** Compatibilidad: fondo de un indicador ácido-base en eje de pH. */
export function indicatorGradientDefs(props: { id: string; ind: Indicator; opacity: number; yMin?: number; yMax?: number }) {
  return colorBackgroundDefs({ id: props.id, range: acidBaseRange(props.ind), opacity: props.opacity, yMin: props.yMin ?? 0, yMax: props.yMax ?? 14 });
}

/** Leyenda genérica: color bajo → degradé (intervalo) → color alto. */
export function ColorRangeLegend({ range, fmt, axis, unit = '' }: { range: ColorRange; fmt: (x: number) => string; axis: string; unit?: string }) {
  const a = range.lowHex;
  const b = range.highHex;
  const u = unit ? ` ${unit}` : '';
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm" aria-label={`Leyenda del indicador ${range.name}`}>
      <strong>{range.name}</strong>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="inline-block h-4 w-6 rounded border border-slate-300 dark:border-slate-600" style={{ background: a }} />
        {range.lowLabel} ({axis} &lt; {fmt(range.low)}{u})
      </span>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="inline-block h-4 w-16 rounded border border-slate-300 dark:border-slate-600" style={{ background: `linear-gradient(to right, ${a}, ${b})` }} />
        viraje {fmt(range.low)}–{fmt(range.high)}{u}
      </span>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="inline-block h-4 w-6 rounded border border-slate-300 dark:border-slate-600" style={{ background: b }} />
        {range.highLabel} ({axis} &gt; {fmt(range.high)}{u})
      </span>
    </div>
  );
}

/** Leyenda de un indicador ácido-base. */
export function IndicatorLegend({ ind, fmt }: { ind: Indicator; fmt: (x: number) => string }) {
  return <ColorRangeLegend range={acidBaseRange(ind)} fmt={fmt} axis="pH" />;
}
