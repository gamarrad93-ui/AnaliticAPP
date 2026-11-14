/**
 * Humedad y base seca.
 *  %H (b.h.) = (mh − ms)/mh·100     %H (b.s.) = (mh − ms)/ms·100     % materia seca = 100 − %H b.h.
 */
export function moisture(mWet: number, mDry: number) {
  if (!(mWet > 0) || !(mDry > 0)) throw new Error('Las masas tienen que ser positivas.');
  if (mDry > mWet) throw new Error('La masa seca no puede ser mayor que la húmeda.');
  const water = mWet - mDry;
  const hBH = (water / mWet) * 100;
  return { water, hBH, hBS: (water / mDry) * 100, dry: 100 - hBH };
}

const checkH = (H: number) => {
  if (!(H >= 0 && H < 100)) throw new Error('La humedad tiene que estar entre 0 y 100 %.');
};

/** Resultado en base húmeda → base seca: X_bs = X_bh / (1 − H/100). */
export function wetToDry(x: number, Hbh: number): number {
  checkH(Hbh);
  return x / (1 - Hbh / 100);
}
/** Resultado en base seca → base húmeda: X_bh = X_bs·(1 − H/100). */
export function dryToWet(x: number, Hbh: number): number {
  checkH(Hbh);
  return x * (1 - Hbh / 100);
}
/** Humedad b.h. → b.s.: H_bs = H_bh/(100 − H_bh)·100. */
export function hWetToDry(Hbh: number): number {
  checkH(Hbh);
  return (Hbh / (100 - Hbh)) * 100;
}
/** Humedad b.s. → b.h.: H_bh = H_bs/(100 + H_bs)·100. */
export function hDryToWet(Hbs: number): number {
  if (!(Hbs >= 0)) throw new Error('La humedad no puede ser negativa.');
  return (Hbs / (100 + Hbs)) * 100;
}
/** Resultado de una humedad a otra: X₂ = X₁·(100 − H₂)/(100 − H₁). */
export function changeMoisture(x1: number, H1: number, H2: number): number {
  checkH(H1);
  checkH(H2);
  return (x1 * (100 - H2)) / (100 - H1);
}
