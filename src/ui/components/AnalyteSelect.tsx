/** Selector de sustancia (biblioteca + personalizado) con su concentración. */
import { COMPOUNDS, getSystem, type Compound } from '../../chem/data/acids';
import { SelectField } from './fields';

export const CUSTOM_ACID = '__custom_acid';
export const CUSTOM_BASE = '__custom_base';

function groupOf(c: Compound): string {
  if (c.kind === 'strong-acid') return 'Ácidos fuertes';
  if (c.kind === 'strong-base') return 'Bases fuertes';
  const sys = getSystem(c.systemId!)!;
  const charge = sys.zFull - (sys.pKa.length - c.hAdded!);
  if (c.hAdded === sys.pKa.length && sys.zFull === 0) return 'Ácidos débiles';
  if (c.hAdded === 0 && charge === 0) return 'Bases débiles';
  return 'Sales, anfóteros y otras formas';
}

export function compoundOptions(includeCustom = true) {
  const opts = COMPOUNDS.map((c) => {
    const sys = c.systemId ? getSystem(c.systemId) : undefined;
    const pk = sys ? ` · pKa ${sys.pKa.map((p) => p.toFixed(2).replace('.', ',')).join('; ')}` : '';
    return { value: c.id, label: `${c.name} (${c.formula})${pk}`, group: groupOf(c) };
  });
  const order = ['Ácidos fuertes', 'Ácidos débiles', 'Bases fuertes', 'Bases débiles', 'Sales, anfóteros y otras formas'];
  opts.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  if (includeCustom) {
    opts.push({ value: CUSTOM_ACID, label: 'Ácido débil personalizado (HₙA)', group: 'Personalizado' });
    opts.push({ value: CUSTOM_BASE, label: 'Base débil personalizada (B, pKa del ácido conjugado)', group: 'Personalizado' });
  }
  return opts;
}

export function AnalyteSelect(props: { label: string; value: string; onChange: (v: string) => void }) {
  return <SelectField label={props.label} value={props.value} onChange={props.onChange} options={compoundOptions()} />;
}
