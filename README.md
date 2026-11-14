# ⚗️ AnalíticApp — Química Analítica I

App web para el curso de **Química Analítica I** (Tecnólogo Químico, Uruguay).
Hecha con IA (Claude) por **Diego Gamarra** · Validada con: **Pablo Buccino**.

Funciona en la computadora, en el proyector (botón **📽️ Modo proyector**) y en el celular. No necesita servidor ni cuenta.

## ¿Qué incluye?

| Pestaña | Qué hace |
|---|---|
| 🧫 **Prácticos** | Los 13 prácticos de la Cuaderneta de Laboratorio 2026: diagramación (cuánto tomar para gastar ≈ 8 mL en bureta de 10,00 mL), planilla de determinaciones y tratamiento estadístico con el criterio de cada práctico (Ir = 2,8·σr, Q de Dixon, CV), especificaciones (USP, RBN), V20 con factor Z, derivadas de la valoración potenciométrica y los 4 modelos de calibración. |
| 📝 **Entregas** | *Demo* de planillas digitales: el alumno completa la hoja del práctico (P1, P2, P3) con sus resultados; el profesor ve cada valor contra el recalculado (✓/✗), el error probable, el procedimiento, el resumen del grupo y exporta a Excel/CSV. Los datos quedan sólo en el navegador (exportar/importar JSON). |
| 🧪 **Titulaciones** | Curvas ácido-base exactas (fuertes, débiles, polipróticos, mezclas). Puntos de equivalencia y semiequivalencia, 1ª derivada, pH a cualquier volumen, bandas de indicadores, "¿Qué indicador sirve?" y error de titulación. |
| 📊 **Especies y buffers** | Diagrama de distribución (α y log C vs pH) con pKa editables. Diseñador de buffers: par conjugado óptimo, gramos/mL a pesar, capacidad buffer. |
| 📈 **Calibración** | Cuatro modelos sobre los mismos datos (lineal, por el origen, cuadrático y cuadrático sin ordenada), corrección por blanco opcional con sus gráficos, tabla comparativa con el mejor modelo, residuos agrupados, LOD/LOQ, desconocida con intervalo de confianza y adición estándar. Tabla tipo planilla, pegar desde Excel, exportar a PNG y CSV. |
| ⚡ **Redox** | Curvas E vs V exactas (Fe²⁺/Ce⁴⁺, Fe²⁺/MnO₄⁻, Fe²⁺/Cr₂O₇²⁻, I₃⁻/S₂O₃²⁻ o cuplas a elección), potencial de equivalencia, indicadores redox con error, electrodo de referencia. |
| 🔗 **EDTA y precipitación** | Curvas pM con α(Y⁴⁻) y NH₃ auxiliar, log K′ vs pH (pH mínimo). Argentometría (pAg/pX, mezclas de haluros), Mohr, Volhard y Fajans. |
| 🧂 **Solubilidad** | Ksp, ion común (exacto), efecto del pH, "¿precipita?" al mezclar dos soluciones. |
| ⚖️ **Gravimetría** | Masa molar con composición % (fórmulas con paréntesis, hidratos y cargas), biblioteca editable de formas pesadas y sustancias buscadas, factor gravimétrico con a/b automáticos, cálculo del % m/m con réplicas (x̄, s, CV, t·s/√n), alícuota, base seca y peso constante. |
| 💧 **Humedad y base seca** | Humedad b.h./b.s. y materia seca con réplicas y peso constante; conversión de resultados entre base húmeda, base seca u otra humedad, también por lotes con CSV; ejemplo mixto con sulfato → % SO₃ en base seca. |
| 🎯 **Estadística** | Media e IC, Q de Dixon, Grubbs, pruebas t (una muestra, dos muestras, apareada), prueba F, propagación de errores con cualquier fórmula, cifras significativas y tablas de valores críticos. |
| ℹ️ **Acerca de** | Modelos, supuestos y bibliografía. |

**Regla de oro:** ningún número lo inventa una IA. Todo sale de código determinístico y probado (ver [TESTS.md](TESTS.md)). Cada pestaña tiene un panel **"Ver procedimiento"** con las ecuaciones y los valores intermedios.

---

## Estructura del proyecto

```
src/
  chem/          ← TODA la química y estadística (TypeScript puro, sin interfaz)
    numeric/     ← solver de Brent, lectura de números con coma, tablas pegadas
    acidbase/    ← balance de carga exacto, titulaciones, buffers, indicadores
    data/        ← biblioteca de ácidos/bases (pKa) e indicadores
    stats/       ← regresión, modelos de calibración, t, F, Q, Grubbs, propagación, cifras significativas
    lab/         ← fórmulas de la cuaderneta, criterios de promediabilidad, V20, derivadas
    practicos/   ← motor de corrección de las entregas (tabla Lab QA, bureta, Z, diagnóstico)
    redox/       ← Nernst + balance de electrones
    complex/     ← EDTA (α, constantes condicionales)
    solubility/  ← Ksp, ion común, pH, argentometría
    __tests__/   ← pruebas automáticas
  ui/
    components/  ← campos, gráficos, panel de procedimiento, exportar
    tabs/        ← una pestaña por archivo
    practicas/   ← los 13 prácticos de laboratorio
  config.ts      ← nombre del autor y del profesor (para cambiar fácil)
```

## Usarla en tu computadora (para seguir desarrollando)

1. Instalá **Node.js 20 o más nuevo** desde https://nodejs.org (versión LTS).
2. En una terminal, dentro de la carpeta del proyecto:

```bash
npm install      # instala las dependencias (sólo la primera vez)
npm run dev      # abre la app en http://localhost:5173
npm test         # corre todas las pruebas
npm run build    # genera la versión final en la carpeta dist/
```

## Publicarla en GitHub Pages (gratis)

El repositorio ya trae el archivo `.github/workflows/deploy.yml`. Cada vez que hay cambios en la rama **main**, GitHub corre las pruebas, arma la app y la publica sola.

**Una sola vez:**
1. En GitHub, entrá al repositorio → **Settings** → **Pages**.
2. En **Build and deployment → Source**, elegí **GitHub Actions**.
3. Llevá los cambios a la rama `main`: abrí un *Pull Request* desde la rama de trabajo hacia `main` y hacé **Merge**.
4. Entrá a la pestaña **Actions** y esperá el tilde verde ✅ (1–2 minutos).
5. La app queda en: `https://<tu-usuario>.github.io/<nombre-del-repo>/`

Para compartir una pestaña concreta, agregá el nombre al final del link, por ejemplo `…/#calibracion` o `…/#especies`.

## Cambiar el nombre del profesor o del autor
Editá `src/config.ts`.

## Licencia
Uso educativo.
