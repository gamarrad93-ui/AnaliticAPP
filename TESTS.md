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

### Cálculo inverso: "¿cuánto analito tomo para gastar X mL en la bureta?"
Como los volúmenes de equivalencia son proporcionales al volumen de analito, Vₐ = V_gasto / (V_PE por mL de analito).
- Acético 0,1 M con NaOH 0,1 M: gastar 8 mL → tomar 8 mL.
- HCl 0,05 M con NaOH 0,1 M: gastar 8 mL → tomar 16 mL.
- H₃PO₄ 0,1 M con NaOH 0,1 M: 8 mL en el PE1 → 8 mL; 8 mL en el PE2 → 4 mL; el PE4 no existe → aviso.
- Mezcla HCl + acético: con el Vₐ calculado, el PE2 cae exactamente en el gasto pedido (ida y vuelta).
- Titulante que no reacciona → aviso, sin error.

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

> Nota: el LOD/LOQ y la concentración de la muestra desconocida están programados y probados en el motor (`src/chem/stats/regression.ts`), pero por ahora **no se muestran** en la pestaña de calibración.

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

### Indicadores redox (fondo de color y "¿Qué indicador sirve?")
Intervalo de viraje: E°′ ± 0,0592/n V (vs ENH). Valores usados y verificación:

| Indicador | E°′ usado (V) | n | Forma oxidada | Forma reducida | Medio | Comparación con tablas |
|---|---|---|---|---|---|---|
| Nitroferroína | 1,25 | 1 | celeste pálido | rojo-violeta | H₂SO₄ 1 M | 1,25 en Skoog y en tablas generales |
| Ferroína | 1,11 | 1 | celeste pálido | rojo | H₂SO₄ 1 M | Skoog 1,11 (H₂SO₄ 1 M); E° estándar 1,06; Harris 1,147. Se usa el formal en H₂SO₄ 1 M |
| 5,6-Dimetilferroína | 0,97 | 1 | celeste pálido | rojo | H₂SO₄ 1 M | Harris 0,97 |
| 2,2′-Bipiridina Fe(II) | 0,97 | 1 | celeste pálido | rojo | ácido diluido | tablas generales 0,97 (corregido: antes figuraba "incoloro" como forma oxidada) |
| Ácido difenilaminosulfónico | 0,85 | 2 | rojo-violeta | incoloro | ácido diluido | Skoog 0,85; Harris 0,84 |
| Difenilamina | 0,76 | 2 | violeta | incoloro | ácido diluido | Skoog 0,76 (corregido el medio) |
| Azul de metileno | 0,53 | 2 | azul | incoloro | ácido 1 M (pH 0) | 0,53 a pH 0 (0,01 a pH 7) |
| Índigo tetrasulfonato | 0,36 | 2 | azul | incoloro | ácido 1 M (pH 0) | Skoog 0,36; otras tablas 0,37 |

Casos especiales (no son indicadores redox clásicos): **almidón** (complejo azul con I₃⁻, específico para yodo) y **KMnO₄ autoindicador** (punto final con un exceso visible de MnO₄⁻ ≈ 2 × 10⁻⁶ M).

Pruebas:
- Intervalo de viraje = E°′ ± 0,0592/n.
- Fe²⁺/Ce⁴⁺: ferroína y nitroferroína viran dentro del salto (±1 % de V_eq); difenilamina y azul de metileno no.
- Salto de potencial al 99 % y 101 % = 0,68 + 0,05916·log 99 y 1,44 − 0,05916·log 100.
- KMnO₄: el volumen de punto final deja exactamente 2 × 10⁻⁶ M de MnO₄⁻ en exceso (error +0,02 %).
- Fondo de color: las paradas del degradé caen exactamente en el inicio y el fin del viraje sobre el eje (mismo cálculo que en ácido-base).

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

## 3 bis. Calibración: cuatro modelos (`src/chem/__tests__/fourModels.test.ts`)

Datos: ejemplo de fluorescencia de Miller & Miller (x = 0, 2, …, 12; verificado a mano). Referencias: `numpy.polyfit` y `statsmodels` (OLS y WLS).

| Modelo | Parámetros | R² | R² ajustado | s_y/x |
|---|---|---|---|---|
| a) Lineal y = mx + b | m = 1,93036; b = 1,51786 | 0,997760 | 0,997312 | 0,43285 |
| b) Por el origen y = mx | m = 2,10549 | 0,985897 (centrado) | 0,985897 | 0,99155 |
| c) Cuadrático | a = 0,013988; b = 1,76250; c = 1,79762 | 0,998389 | 0,997584 | 0,41043 |
| d) Ponderado 1/x² (sin x = 0) | m = 1,98673; b = 1,02079 | 0,999240 (ponderado, = statsmodels WLS) | 0,999049 | 0,15450 (pesos normalizados) |

Coinciden con 11–12 decimales. Además:
- Para comparar los modelos se usa una base común: R² y R² ajustado con los residuos sin ponderar de todos los estándares (en los tres no ponderados coincide con su R²).
- Concentración de una señal con cada modelo: ida y vuelta exacta.
- Patrón de residuos: una forma de U se detecta; residuos al azar no.
- Mejor modelo: con datos curvos se elige el cuadrático; con los datos lineales de libro se elige el lineal (el cuadrático mejora el R² ajustado en menos de 0,0005, y ante esa diferencia se prefiere el modelo más simple).

## 4. Prácticos de laboratorio (`src/chem/__tests__/lab.test.ts`)

Fórmulas y criterios tomados de la **Cuaderneta de Ejercicios de Laboratorio 2026** (UTU – UdelaR – UTEC).

### Criterios de promediabilidad
- Concordancia (ej. 5,0 mg en V20): se elige el grupo más grande de valores dentro del límite.
- σr conocido (HCl/NaOH σr = 0,00030 M; KMnO₄ 5,1 × 10⁻⁵ M; H₂O₂ 0,025 vol): Ir = 2,8·σr; CAI = 1,96·σr/√n.
- Q de Dixon (α = 0,05) y CAI = t(95 %, n−1)·s/√n.
- CV máximo (1 %, 5 % o 10 % según el práctico), con mínimo de valores.

### Diagramaciones verificadas a mano
| Práctico | Caso | Resultado |
|---|---|---|
| 2 | Na₂CO₃ para 8 mL de HCl 0,250 M | 0,1060 g |
| 2 | HCl conc. (37 %, 1,18 g/mL) para 1000 mL 0,250 M | 20,9 mL |
| 3 | H₂C₂O₄·2H₂O para 8 mL de NaOH 0,1 M | 0,0504 g → conviene alícuota |
| 4 | ácido cítrico·H₂O puro con 8,00 mL de NaOH 0,1 M | 100 % |
| 5 | V_T para G1 = 3 mL (0,075 M CO₃²⁻; HCl 0,125 M) | 5,0 mL; G2 = 8 mL |
| 6 | 0,1000 g Ni, blanco 8 mL, retro 2 mL | C(Mg) = 0,0634 M |
| 7 | H₂O₂ 10 vol, KMnO₄ 0,02 M, 8 mL | 0,448 mL de muestra |
| 8 | KIO₃ para 8 mL de tiosulfato 0,05 M; I₂ 1 % p-v | 0,01427 g; 5,08 mL |
| 9 | Volhard: blanco y toma | 10,00 mL AgNO₃; 5,00 mL KBr |
| 10 | Ejemplo de la cuaderneta (3,2989 g → 2,7690 g) | 16,1 % humedad |
| 11 | Cola con 600 ppm para 13 mL de NaOH 0,01 M | 21,23 g |
| 13 | Rango de Beer (A 0,020–0,700; ε 11 100) | 0,10–3,52 ppm Fe |

### Otras herramientas
- **Factor Z (V20)**: densidad del agua de Tanaka (2001), empuje del aire y dilatación del vidrio; coincide con la tabla de Harris (1,0020 a 15 °C; 1,0029 a 20 °C; 1,0040 a 25 °C).
- **Criterios de conformidad** del material volumétrico: s/√n ≤ tol/3 y |V20 − Vnom| + t·s/√n ≤ tol.
- **Derivadas de la valoración potenciométrica**: tabla V̄, ΔpH/ΔV, V̿, Δ²; el punto final se encuentra en una curva de H₃PO₄ simulada con el motor exacto (±0,15 mL).
- **4 modelos de calibración** (lineal y cuadrático, con y sin ordenada) con los datos del ejercicio de Cr de la cuaderneta: coeficientes, R² y s de residuos iguales a `numpy.linalg.lstsq` (12 decimales).

---

## Cómo agregar una prueba
Abrí `src/chem/__tests__/*.test.ts`, copiá un bloque `it('…', () => { … })`, cambiá los valores y corré `npm test`.
