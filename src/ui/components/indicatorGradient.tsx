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
 * <defs> con el linearGradient del indicador; usar fill={`url(#${id})`} en un ReferenceArea de yMin a yMax.
 * OJO: se llama como función ({indicatorGradientDefs(...)}), no como <Componente/>: Recharts sólo dibuja
 * elementos SVG literales (como <defs>) dentro del gráfico y descarta componentes propios.
 */
export function indicatorGradientDefs(props: { id: string; ind: Indicator; opacity: number; yMin?: number; yMax?: number }) {
  const { ind } = props;
  const stops = indicatorGradientStops(ind.low, ind.high, displayColor(ind.acidHex, ind.acidColor), displayColor(ind.baseHex, ind.baseColor), props.yMin, props.yMax);
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

/** Leyenda: color ácido → degradé → color básico, con el intervalo de viraje. */
export function IndicatorLegend({ ind, fmt }: { ind: Indicator; fmt: (x: number) => string }) {
  const a = displayColor(ind.acidHex, ind.acidColor);
  const b = displayColor(ind.baseHex, ind.baseColor);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm" aria-label={`Leyenda del indicador ${ind.name}`}>
      <strong>{ind.name}</strong>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="inline-block h-4 w-6 rounded border border-slate-300 dark:border-slate-600" style={{ background: a }} />
        {ind.acidColor} (pH &lt; {fmt(ind.low)})
      </span>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="inline-block h-4 w-16 rounded border border-slate-300 dark:border-slate-600" style={{ background: `linear-gradient(to right, ${a}, ${b})` }} />
        viraje {fmt(ind.low)}–{fmt(ind.high)}
      </span>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="inline-block h-4 w-6 rounded border border-slate-300 dark:border-slate-600" style={{ background: b }} />
        {ind.baseColor} (pH &gt; {fmt(ind.high)})
      </span>
    </div>
  );
}
