/** Tarjeta contenedora de un gráfico con botón para descargar PNG. */
import { useRef, type ReactNode } from 'react';
import { exportPng } from './exporters';
import { useChartTheme } from '../display';

export function ChartCard(props: { title: ReactNode; filename: string; children: ReactNode; actions?: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const th = useChartTheme();
  return (
    <section className="card">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{props.title}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {props.actions}
          <button className="btn" onClick={() => exportPng(ref.current, props.filename, th.bg, th.text)} title="Descargar el gráfico como imagen PNG">
            ⬇ PNG
          </button>
        </div>
      </div>
      <div ref={ref}>{props.children}</div>
      {props.footer}
    </section>
  );
}
