/** Exportar gráficos a PNG y datos a CSV, sin librerías externas. */

function download(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Toma el primer <svg> (el gráfico principal) dentro de `container` y lo guarda como PNG (2×). */
export async function exportPng(container: HTMLElement | null, filename: string, background: string, textColor: string) {
  const svg = container?.querySelector('svg.recharts-surface') as SVGSVGElement | null;
  if (!svg) return;
  const { width, height } = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.style.color = textColor;
  clone.style.fontFamily = 'system-ui, sans-serif';
  // "currentColor" no se resuelve fuera del documento: reemplazar
  clone.querySelectorAll('*').forEach((el) => {
    for (const attr of ['fill', 'stroke']) {
      if (el.getAttribute(attr) === 'currentColor') el.setAttribute(attr, textColor);
    }
  });
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('No se pudo generar la imagen'));
    img.src = url;
  });
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(url);
  download(canvas.toDataURL('image/png'), filename);
}

/**
 * Descarga un CSV. Usa ";" como separador y coma decimal para que Excel en español
 * lo abra directamente en columnas.
 */
export function exportCsv(rows: (string | number)[][], filename: string) {
  const esc = (v: string | number) => {
    const s = typeof v === 'number' ? (Number.isFinite(v) ? String(v).replace('.', ',') : '') : v;
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  download(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
