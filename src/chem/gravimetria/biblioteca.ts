/** Biblioteca de sustancias para gravimetría (editable desde la pestaña; las propias se guardan en el navegador). */
export type LibGroup = 'Formas pesadas' | 'Sustancias buscadas' | 'Agregadas por mí';

export interface LibEntry {
  id: string;
  name: string;
  formula: string;
  group: LibGroup;
}

const W = (formula: string, name: string): LibEntry => ({ id: `w:${formula}`, name, formula, group: 'Formas pesadas' });
const S = (formula: string, name: string): LibEntry => ({ id: `s:${formula}`, name, formula, group: 'Sustancias buscadas' });

export const WEIGHED_FORMS: LibEntry[] = [
  W('BaSO4', 'Sulfato de bario'),
  W('AgCl', 'Cloruro de plata'),
  W('AgBr', 'Bromuro de plata'),
  W('AgI', 'Yoduro de plata'),
  W('Fe2O3', 'Óxido de hierro(III)'),
  W('Fe3O4', 'Óxido ferroso-férrico (magnetita)'),
  W('Al2O3', 'Óxido de aluminio'),
  W('CaO', 'Óxido de calcio'),
  W('CaCO3', 'Carbonato de calcio'),
  W('CaC2O4·H2O', 'Oxalato de calcio monohidratado'),
  W('CaSO4', 'Sulfato de calcio'),
  W('MgO', 'Óxido de magnesio'),
  W('Mg2P2O7', 'Pirofosfato de magnesio'),
  W('MgNH4PO4·6H2O', 'Fosfato amónico magnésico hexahidratado'),
  W('Ni(C4H7N2O2)2', 'Dimetilglioximato de níquel'),
  W('PbSO4', 'Sulfato de plomo(II)'),
  W('PbCrO4', 'Cromato de plomo(II)'),
  W('BaCrO4', 'Cromato de bario'),
  W('K2PtCl6', 'Hexacloroplatinato de potasio'),
  W('KClO4', 'Perclorato de potasio'),
  W('SiO2', 'Dióxido de silicio (sílice)'),
  W('ZnO', 'Óxido de cinc'),
  W('CuO', 'Óxido de cobre(II)'),
  W('SnO2', 'Óxido de estaño(IV)'),
  W('Bi2O3', 'Óxido de bismuto(III)'),
  W('(NH4)3PO4·12MoO3', 'Fosfomolibdato de amonio'),
];

export const SOUGHT: LibEntry[] = [
  S('S', 'Azufre'),
  S('SO3', 'Trióxido de azufre'),
  S('SO4 2-', 'Sulfato'),
  S('SO2', 'Dióxido de azufre'),
  S('Cl', 'Cloro'),
  S('Cl-', 'Cloruro'),
  S('Br', 'Bromo'),
  S('I', 'Yodo'),
  S('Ag', 'Plata'),
  S('Fe', 'Hierro'),
  S('FeO', 'Óxido de hierro(II)'),
  S('FeSO4·7H2O', 'Sulfato ferroso heptahidratado'),
  S('Al', 'Aluminio'),
  S('Ca', 'Calcio'),
  S('CaO', 'Óxido de calcio'),
  S('CaCO3', 'Carbonato de calcio'),
  S('Mg', 'Magnesio'),
  S('MgO', 'Óxido de magnesio'),
  S('MgSO4·7H2O', 'Sulfato de magnesio heptahidratado'),
  S('P', 'Fósforo'),
  S('P2O5', 'Pentóxido de fósforo'),
  S('PO4 3-', 'Fosfato'),
  S('Ni', 'Níquel'),
  S('NiSO4·6H2O', 'Sulfato de níquel hexahidratado'),
  S('Pb', 'Plomo'),
  S('Cr', 'Cromo'),
  S('Cr2O3', 'Óxido de cromo(III)'),
  S('K', 'Potasio'),
  S('K2O', 'Óxido de potasio'),
  S('Na2O', 'Óxido de sodio'),
  S('Ba', 'Bario'),
  S('Si', 'Silicio'),
  S('Zn', 'Cinc'),
  S('Cu', 'Cobre'),
  S('Sn', 'Estaño'),
  S('Bi', 'Bismuto'),
];

export const BUILTIN_LIBRARY: LibEntry[] = [...WEIGHED_FORMS, ...SOUGHT];

/** Factores clásicos (pesada → buscada) para la tabla de referencia. */
export const CLASSIC_FACTORS: [string, string][] = [
  ['BaSO4', 'S'], ['BaSO4', 'SO3'], ['BaSO4', 'SO4 2-'],
  ['AgCl', 'Cl'], ['AgCl', 'Ag'], ['AgBr', 'Br'], ['AgI', 'I'],
  ['Fe2O3', 'Fe'], ['Fe2O3', 'FeO'], ['Fe3O4', 'Fe'], ['Fe2O3', 'FeSO4·7H2O'],
  ['Al2O3', 'Al'], ['CaO', 'Ca'], ['CaCO3', 'CaO'], ['CaC2O4·H2O', 'Ca'],
  ['Mg2P2O7', 'Mg'], ['Mg2P2O7', 'MgO'], ['Mg2P2O7', 'P'], ['Mg2P2O7', 'P2O5'],
  ['Ni(C4H7N2O2)2', 'Ni'], ['PbSO4', 'Pb'], ['PbCrO4', 'Cr'], ['BaCrO4', 'Cr2O3'],
  ['K2PtCl6', 'K'], ['K2PtCl6', 'K2O'], ['KClO4', 'K2O'],
  ['SiO2', 'Si'], ['ZnO', 'Zn'], ['CuO', 'Cu'], ['SnO2', 'Sn'], ['Bi2O3', 'Bi'],
  ['(NH4)3PO4·12MoO3', 'P'], ['(NH4)3PO4·12MoO3', 'P2O5'],
];
