/** Ejemplo mixto: humedad de la muestra + sulfato pesado como BaSO4 → % SO3 en base húmeda y en base seca. */
export const EJEMPLO_HUMEDAD = [
  { tara: '24,8312', humeda: '26,8318', seca: '26,6513' },
  { tara: '25,1027', humeda: '27,1041', seca: '26,9238' },
  { tara: '24,9563', humeda: '26,9549', seca: '26,7748' },
];

export const EJEMPLO_SULFATO = [
  { crisol: '18,2345', lleno: '18,6668', muestra: '0,5012', alic: '' },
  { crisol: '19,0123', lleno: '19,4421', muestra: '0,4995', alic: '' },
  { crisol: '18,7781', lleno: '19,2126', muestra: '0,5021', alic: '' },
];

/** Pesadas sucesivas del pesafiltro (réplica 1) hasta peso constante. */
export const EJEMPLO_PESADAS = '26,6551\n26,6516\n26,6513';

/** Pesadas sucesivas del crisol con BaSO4 calcinado (réplica 1). */
export const EJEMPLO_PESADAS_CRISOL = '18,6702\n18,6671\n18,6668';
