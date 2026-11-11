# Pruebas automáticas — qué se verifica y contra qué

Todas las cuentas de la app están en `src/chem` y se prueban con **Vitest**.
Para correrlas: `npm test`. Si una sola falla, la app **no se publica** (ver `.github/workflows/deploy.yml`).

Abreviaturas: *exacto* = resultado del motor sin aproximaciones; *ref.* = valor de referencia.

---

## 1. Equilibrio ácido-base (`src/chem/__tests__/acidbase.test.ts`)

### pH de soluciones simples
| Caso | Esperado | Fuente de la referencia |
|---|---|---|
| HCl 0,1 M | pH 1,00 | Definición (ácido fuerte) |
| NaOH 0,01 M | pH 12,00 | Definición |
| HCl 1,0 × 10⁻⁸ M | pH 6,98 (¡no 8!) | Balance de carga con autoionización del agua (Harris, cap. 8) |
| Agua pura | pH 7,00 | Kw = 1,0 × 10⁻¹⁴ |
| Ácido acético 0,1 M (pKa 4,76) | pH ≈ 2,88 | Coincide (6 decimales) con la ecuación cuadrática exacta |
| Acetato de sodio 0,05 M | pH 8,7295 ≈ 8,72–8,73 | pOH = ½(pKb − log C). *Nota:* con pKa 4,76 el valor exacto es 8,73; los libros que dan 8,72 usan pKa 4,74 o redondean |
| NH₃ 0,1 M (pKa NH₄⁺ 9,25) | pH 11,12 | Harris / Skoog |
| NaH₂PO₄ 0,1 M (anfótero) | ≈ (pKa1 + pKa2)/2 = 4,68 (±0,1) | Aproximación clásica; el exacto da algo menos |
| Buffer acético/acetato 0,1/0,1 M | pH = pKa = 4,76 | Henderson-Hasselbalch (válido en este caso) |
| HCl 10 M, NaOH 5 M, ácido 10⁻¹² M | No se rompe; valores coherentes | Robustez |

### Fracciones de especies (α)
- **Suman 1 a todo pH** (de −1 a 15, cada 0,1) para **todos** los sistemas de la biblioteca (error < 10⁻¹²).
- En pH = pKa, α(HA) = α(A⁻) = 0,5.
- H₃PO₄ a pH 7,20: α(H₂PO₄⁻) ≈ α(HPO₄²⁻).

### Titulación: 25 mL de ácido acético 0,1 M con NaOH 0,1 M (caso pedido)
| Verificación | Esperado | Resultado |
|---|---|---|
| Volumen de equivalencia | 25,00 mL | 25,00 mL (estequiometría) |
| pH en la equivalencia | ≈ 8,72 | 8,7295 (ver nota del acetato) |
| Semiequivalencia (12,5 mL) | pH = pKa = 4,76 | 4,7604 (la diferencia de 0,0004 es real: el cálculo exacto no supone [A⁻]/[HA] = 1 exactamente) |
| pH inicial | ≈ 2,88 | 2,883 |
| Punto final | Nítido | Salto de 4,55 unidades de pH entre 98 % y 102 % |
| Fórmula inversa V(pH) | Coincide con pH(V) | Diferencia < 10⁻⁶ mL en 9 volúmenes |
| Curva | Monótona creciente; máximo de dpH/dV en 25 mL | Sí (±0,05 mL) |
| Fenolftaleína | Error < 0,1 %, "excelente" | +0,024 % |
| Naranja de metilo | "No recomendado" | Sí |

### Otras titulaciones
- **HCl 0,1 M (50 mL) con NaOH 0,1 M:** equivalencia en 50 mL a pH 7,00; a 49,9 mL pH 4,00 y a 50,1 mL pH 10,00 (valores de libro, Skoog).
- **NH₃ 0,1 M con HCl 0,1 M:** equivalencia en 25 mL a pH ≈ 5,28; semiequivalencia pH = 9,25.
- **H₃PO₄ 0,1 M con NaOH:** equivalencias en 25, 50 y 75 mL; la 1ª y la 2ª son detectables, la 3ª no (pKa3 = 12,35). pH en PE1 ≈ 4,7 y en PE2 ≈ 9,7 (Harris).
- **Mezcla HCl + ácido acético:** primero se titula el HCl (10 mL) y después el acético (20 mL).

### Diseñador de buffers
- Acetato a pH 4,76: mezcla ~50/50.
- **El buffer diseñado da exactamente el pH buscado**: se vuelve a calcular el pH de la mezcla propuesta con el motor general y coincide con 8 decimales (fosfato pH 7,0; 7,4; 6,5).
- Fosfato pH 7,2 elige automáticamente el pKa2.
- Capacidad buffer en pH = pKa: β = 2,303·(C/4 + [H⁺] + [OH⁻]).

---

## 2. Estadística y calibración (`src/chem/__tests__/stats.test.ts`)

Los valores de referencia se calcularon con **numpy 2 / scipy** (`scipy.stats.linregress`, `t.ppf`, `f.ppf`, `ttest_1samp`, `ttest_ind`, `ttest_rel`) y con ejemplos resueltos de **Miller & Miller**, *Statistics and Chemometrics for Analytical Chemistry*.

### Regresión (ejemplo de fluorescencia de Miller & Miller: x = 0, 2, …, 12 pg/mL)
| Parámetro | scipy | Libro |
|---|---|---|
| Pendiente b | 1,930357142857 | 1,93 |
| Ordenada a | 1,517857142857 | 1,52 |
| s_b | 0,040900264457 | 0,0409 |
| s_a | 0,294936001360 | 0,2950 |
| r | 0,998879565349 | 0,9989 |
| s_y/x | 0,432847713240 | 0,4329 |

Coincidencia con 12 decimales. Además, los residuos suman 0.

**Concentración de desconocidos** (m = 1): y₀ = 2,9 → x₀ = 0,716 (s = 0,265); y₀ = 13,5 → 6,207 (s = 0,240); y₀ = 23,0 → 11,129 (s = 0,263). Coincide con el libro (0,72 ± 0,26; 6,21 ± 0,24; 11,13 ± 0,26).

**LOD = 3,3·s_y/x/b; LOQ = 10·s_y/x/b** (criterio ICH Q2(R1)).

### Adición estándar (ejemplo de Ag por absorción atómica, Miller & Miller)
x_E = 17,26 ng/mL; s = 0,748; IC 95 % = ±1,92. Coincide con scipy y con el libro (17,3 ± 1,9).

### Valores críticos
- **t de Student** (90/95/99 %, bilateral, gl = 1–30): coincide con `scipy.stats.t.ppf` con 7–8 decimales.
- **F** (0,95 y 0,975; varias combinaciones de gl): coincide con `scipy.stats.f.ppf` con 7 decimales.
- **G de Grubbs** (bilateral, α = 0,05, n = 3–20): calculado con la fórmula exacta a partir de t. Coincide con scipy y con la tabla ASTM E178 (1,155; 1,481; 1,715; 1,887; 2,020; 2,126; 2,215; 2,290 …).
- **Q de Dixon** (n = 3–10; 90/95/99 %): tabla de Rorabacher, *Anal. Chem.* **63** (1991) 139. Verificación:
  1. Los valores para n = 3 y n = 4 se compararon con reproducciones publicadas de la tabla (Harvey, *Analytical Chemistry 2.1*, LibreTexts; Wikipedia).
  2. **Toda la tabla** se verificó además con una **simulación Monte Carlo** (2 millones de muestras normales por cada n, estadístico Q del extremo más alejado). Diferencia máxima: 0,006, en la cola del 99 % para n = 4, que es la zona con más ruido estadístico.
  > Sugerencia para el profesor: comparar la tabla de la pestaña *Estadística → Tablas* con la del libro usado en el curso.

### Pruebas de significación (datos A = 10,2 10,5 10,3 10,6 10,4; B = 10,8 10,9 10,6 11,0 10,7)
| Prueba | t | p | Fuente |
|---|---|---|---|
| Una muestra (A vs 10,0) | 5,6569 | 0,004813 | scipy `ttest_1samp` |
| Dos muestras, varianzas iguales | 4,000 | 0,003950 | scipy `ttest_ind` |
| Welch | 4,000 (gl = 8) | 0,003950 | scipy `ttest_ind(equal_var=False)` |
| Apareada | 7,3030 | 0,001870 | scipy `ttest_rel` |
| F (varianzas iguales) | F = 1 | no significativo | — |

Intervalo de confianza de la media: x̄ ± t·s/√n verificado a mano.

### Valores atípicos
- Q de Dixon: 0,1014; 0,1013; 0,1015; 0,1040 → Q = 0,926 > 0,829 → se descarta 0,1040.
- Grubbs: detecta 11,5 en {10,1; 10,2; 10,0; 10,1; 10,2; 11,5}.

### Propagación de errores
- Suma: s = √(s_a² + s_b²).
- Cociente m/(M·V): incertidumbre relativa = √(Σ relativas²).
- pH = −log h: s_pH = 0,4343·s_h/h.
- x³: s_rel = 3·s_x/x.

### Cifras significativas y formato
- Conteo: 0,00250 → 3; 1,020 → 4; 6,02e23 → 3; "1500" ambiguo; "1500," → 4.
- Resultado ± incertidumbre: 0,10234 ± 0,00056 → "0,1023 ± 0,0006"; 12,3456 ± 0,0123 → "12,346 ± 0,012".
- Lectura de números: "0,1", "0.1", "1,5e-3", "1,5×10^-3", "1.234,5" → valores correctos; texto inválido → error amigable.
- Pegado desde Excel/Sheets: tabulaciones, punto y coma, espacios, encabezados y líneas inválidas.

---

## 3. Fase 2: redox, EDTA, precipitación y solubilidad (`src/chem/__tests__/phase2.test.ts`)

### Redox
| Caso | Esperado | Referencia |
|---|---|---|
| 50,00 mL Fe²⁺ 0,0500 M con Ce⁴⁺ 0,1000 M (H₂SO₄ 1 M) | V_eq = 25,00 mL | Skoog |
| … a 5,00 mL | E = 0,68 − 0,05916·log 4 = 0,644 V | Nernst del Fe |
| … en la equivalencia | E = (0,68 + 1,44)/2 = 1,06 V | Skoog |
| … a 25,10 mL | E = 1,44 − 0,05916·log 250 = 1,298 V | Nernst del Ce |
| Fe²⁺ con MnO₄⁻, [H⁺] = 1 M | E_eq = (0,68 + 5·1,51)/6 = 1,372 V; a pH 1 baja 8·0,05916/6 V | Fórmula de libro |
| Fe²⁺ con Cr₂O₇²⁻ | Después del PE, Nernst con [Cr³⁺]² | Cálculo a mano |
| I₃⁻ con S₂O₃²⁻ ([I⁻] = 0,1 M) | V_eq = 12,5 mL; E antes del PE = Nernst del yodo | Cálculo a mano |
| Curvas | Monótonas | — |

### EDTA
- α(Y⁴⁻) = 0,30 (pH 10), 0,81 (pH 11), 0,98 (pH 12), 3,8 × 10⁻⁴ (pH 7): **coincide con la tabla de Harris**.
- 50,0 mL Ca²⁺ 0,0400 M con EDTA 0,0800 M a pH 10: V_eq = 25 mL; pCa a 5 mL = 1,536; en el PE = 5,85 (√(C/K′)); a 26 mL = log(K′·[Y′]/[CaY]). Todos verificados a mano.
- α(M) para Zn²⁺/NH₃ = 1/(1 + Σβₙ[NH₃]ⁿ).
- pH mínimo para Ca²⁺ (log K′ ≥ 8): entre 7,3 y 8,2.

### Argentometría (Skoog: 50,00 mL Cl⁻ 0,0500 M con AgNO₃ 0,1000 M)
- V_eq = 25 mL; pAg_eq = ½ pKsp = 4,87; pAg a 10 mL = 8,14; a 26 mL = 2,88.
- Mohr con [CrO₄²⁻] = 0,005 M: pAg final = 4,81.
- Mezcla I⁻ + Cl⁻: precipita primero AgI (equivalencias en 25 y 50 mL).

### Solubilidad
- AgCl: s = √Ksp. CaF₂: s = (Ksp/4)^(1/3) = 2,14 × 10⁻⁴ M.
- AgCl en NaCl 0,1 M: s(0,1 + s) = Ksp exactamente.
- CaF₂ más soluble a pH ácido; a pH 10 coincide con el agua pura.
- Mg(OH)₂ a pH 10: s = Ksp/[OH⁻]² = 7,1 × 10⁻⁴ M.
- "¿Precipita?": AgNO₃ 10⁻⁴ + NaCl 10⁻⁴ (volúmenes iguales) → Q = 2,5 × 10⁻⁹ > Ksp: sí. Con 10⁻⁶: no. Fe(OH)₃ (precipitación casi total): Q final = Ksp con 6 cifras.

---

## Cómo agregar una prueba
Abrí `src/chem/__tests__/*.test.ts`, copiá un bloque `it('…', () => { … })`, cambiá los valores y corré `npm test`.
