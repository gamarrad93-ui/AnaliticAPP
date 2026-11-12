/**
 * Indicadores ácido-base: intervalo de viraje y colores.
 * Intervalos según Skoog, West, Holler y Crouch, "Fundamentos de Química Analítica" (tabla de indicadores).
 */
export interface Indicator {
  id: string;
  name: string;
  low: number; // pH donde empieza el viraje
  high: number; // pH donde termina
  acidColor: string; // nombre del color en forma ácida
  baseColor: string; // nombre del color en forma básica
  acidHex: string;
  baseHex: string;
}

export const INDICATORS: Indicator[] = [
  { id: 'azul-timol-1', name: 'Azul de timol (1er viraje)', low: 1.2, high: 2.8, acidColor: 'rojo', baseColor: 'amarillo', acidHex: '#dc2626', baseHex: '#eab308' },
  { id: 'naranja-metilo', name: 'Naranja de metilo (heliantina)', low: 3.1, high: 4.4, acidColor: 'rojo', baseColor: 'amarillo-naranja', acidHex: '#dc2626', baseHex: '#f59e0b' },
  { id: 'verde-bromocresol', name: 'Verde de bromocresol', low: 3.8, high: 5.4, acidColor: 'amarillo', baseColor: 'azul', acidHex: '#eab308', baseHex: '#2563eb' },
  { id: 'rojo-metilo', name: 'Rojo de metilo', low: 4.2, high: 6.3, acidColor: 'rojo', baseColor: 'amarillo', acidHex: '#dc2626', baseHex: '#eab308' },
  { id: 'purpura-bromocresol', name: 'Púrpura de bromocresol', low: 5.2, high: 6.8, acidColor: 'amarillo', baseColor: 'púrpura', acidHex: '#eab308', baseHex: '#9333ea' },
  { id: 'azul-bromotimol', name: 'Azul de bromotimol', low: 6.2, high: 7.6, acidColor: 'amarillo', baseColor: 'azul', acidHex: '#eab308', baseHex: '#2563eb' },
  { id: 'rojo-fenol', name: 'Rojo de fenol', low: 6.8, high: 8.4, acidColor: 'amarillo', baseColor: 'rojo', acidHex: '#eab308', baseHex: '#dc2626' },
  { id: 'purpura-cresol', name: 'Púrpura de cresol', low: 7.6, high: 9.2, acidColor: 'amarillo', baseColor: 'púrpura', acidHex: '#eab308', baseHex: '#9333ea' },
  { id: 'azul-timol-2', name: 'Azul de timol (2º viraje)', low: 8.0, high: 9.6, acidColor: 'amarillo', baseColor: 'azul', acidHex: '#eab308', baseHex: '#2563eb' },
  { id: 'fenolftaleina', name: 'Fenolftaleína', low: 8.3, high: 10.0, acidColor: 'incoloro', baseColor: 'rosa-fucsia', acidHex: '#e5e7eb', baseHex: '#db2777' },
  { id: 'timolftaleina', name: 'Timolftaleína', low: 9.3, high: 10.5, acidColor: 'incoloro', baseColor: 'azul', acidHex: '#e5e7eb', baseHex: '#2563eb' },
  { id: 'amarillo-alizarina', name: 'Amarillo de alizarina R', low: 10.1, high: 12.0, acidColor: 'amarillo', baseColor: 'rojo-violeta', acidHex: '#eab308', baseHex: '#be123c' },
];

export function getIndicator(id: string): Indicator | undefined {
  return INDICATORS.find((i) => i.id === id);
}
