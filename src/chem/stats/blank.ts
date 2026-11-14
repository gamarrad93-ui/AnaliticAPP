/**
 * Corrección por blanco en curvas de calibración.
 * Se promedian las señales de los puntos con x = 0 (blancos), ese promedio se resta a todas las
 * señales y los blancos quedan representados por un único punto (0; 0) de la curva.
 */
export interface BlankCorrected {
  x: number[];
  y: number[];
  /** señal promedio del blanco (null si no hay puntos con x = 0) */
  blank: number | null;
  nBlank: number;
}

export function blankCorrect(x: number[], y: number[]): BlankCorrected {
  const idx = x.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  if (idx.length === 0) return { x: [...x], y: [...y], blank: null, nBlank: 0 };
  const blank = idx.reduce((s, i) => s + y[i], 0) / idx.length;
  const xs: number[] = [0];
  const ys: number[] = [0];
  x.forEach((v, i) => {
    if (v !== 0) {
      xs.push(v);
      ys.push(y[i] - blank);
    }
  });
  return { x: xs, y: ys, blank, nBlank: idx.length };
}
