/** Pestaña: Acerca de — modelos, supuestos y fuentes. */

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-2">
      <h2 className="card-title">{title}</h2>
      <div className="space-y-2 text-[0.95rem] leading-relaxed">{children}</div>
    </section>
  );
}

export default function AboutTab() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Sec title="Regla de oro">
        <p>
          La IA ayudó a escribir el programa, pero <em>ningún número</em> lo genera una IA al usarla. Todos los resultados salen de código determinístico
          (mismas entradas → mismo resultado), con pruebas automáticas que lo comparan con valores de libro y con scipy. Cada pestaña tiene un panel <strong>"Ver procedimiento"</strong> con las ecuaciones y los valores intermedios.
        </p>
      </Sec>

      <Sec title="Prácticos de laboratorio">
        <p>
          La pestaña <strong>Prácticos</strong> sigue la Cuaderneta de Ejercicios de Laboratorio 2026: para cada práctico calcula la diagramación (las tomas para un gasto de ≈ 8 mL en bureta de 10,00 mL),
          el resultado de cada determinación con la ecuación del práctico y el tratamiento estadístico con el criterio que indica la cuaderneta (intervalo de repetibilidad Ir = 2,8·σr y CAI = 1,96·σr/√n cuando σr es conocido;
          test Q de Dixon o CV máximo y CAI = t·s/√n en los demás). También verifica especificaciones (USP, Reglamento Bromatológico Nacional).
        </p>
        <p>
          Los datos precargados son <strong>de ejemplo</strong>: cada estudiante reemplaza con sus masas, gastos corregidos y V20. Diferencia con la cuaderneta a consultar: el 3er pKa del ácido cítrico (cuaderneta 5,40; Harris 6,40).
        </p>
      </Sec>

      <Sec title="Equilibrio ácido-base: modelo exacto">
        <p>
          El pH se calcula resolviendo el <strong>balance de carga completo</strong> junto con los balances de masa de cada especie, <strong>sin aproximaciones</strong>
          (no se desprecia [OH⁻], ni la disociación del agua, ni la del ácido débil). Para cada sistema poliprótico se usan las fracciones α y el número medio de protones unidos:
        </p>
        <p className="rounded-lg bg-slate-100 p-3 font-mono text-sm dark:bg-slate-800">[H⁺] − Kw/[H⁺] + Σ Cᵢ·(n̄H,ᵢ − hᵢ) + C(cationes fuertes) − C(aniones fuertes) = 0</p>
        <p>
          La ecuación se resuelve en log[H⁺] con el <strong>método de Brent</strong> (bisección + interpolación), que siempre converge porque la función es monótona. Así la curva es correcta también cerca del punto de equivalencia,
          a concentraciones muy bajas (ej. HCl 10⁻⁸ M da pH 6,98, no 8) y con ácidos muy débiles.
        </p>
        <p>
          Para el volumen en que la curva alcanza un pH dado (punto final de un indicador) se usa la <strong>fórmula inversa exacta</strong> V = −Vₐ(h − Kw/h + Qₐ)/(h − Kw/h + Qₜ).
          La primera derivada se obtiene por diferencias centrales sobre una grilla densa.
        </p>
        <p>
          <strong>Supuestos:</strong> 25 °C; Kw = 1,0 × 10⁻¹⁴; comportamiento ideal (actividad = concentración, sin corrección por fuerza iónica); volúmenes aditivos;
          los pKa de la biblioteca son termodinámicos (Harris; Skoog). En soluciones reales el pH medido puede diferir algunas centésimas a décimas.
        </p>
      </Sec>

      <Sec title="Puntos de equivalencia e indicadores">
        <ul className="list-disc space-y-1 pl-5">
          <li>Los puntos de equivalencia se calculan por <strong>estequiometría</strong>: el titulante reacciona primero con el protón más ácido (o la base más fuerte).</li>
          <li>Se informa si cada punto es detectable mediante el <strong>salto de pH entre el 98 % y el 102 %</strong> del tramo: ≥ 1,5 nítido; 0,5–1,5 poco nítido; &lt; 0,5 no detectable con indicador visual.</li>
          <li>Indicadores: intervalos de viraje de Skoog et al. El pH de punto final por defecto es el centro del intervalo (editable).</li>
          <li>Error de titulación = (V<sub>final</sub> − V<sub>eq</sub>)/V<sub>eq</sub> × 100. |error| ≤ 0,1 %: excelente; ≤ 0,5 %: aceptable.</li>
        </ul>
      </Sec>

      <Sec title="Buffers">
        <p>
          La receta del buffer se calcula con el balance de carga exacto (no con Henderson-Hasselbalch, que se muestra sólo como comparación). La capacidad reguladora es la derivada exacta
          β = ln10·([H⁺] + [OH⁻] + Σ C·Var(protones unidos)).
        </p>
      </Sec>

      <Sec title="Calibración y estadística">
        <ul className="list-disc space-y-1 pl-5">
          <li>Regresión por <strong>mínimos cuadrados ordinarios</strong> (supone error sólo en y, varianza constante). Fórmulas de Miller &amp; Miller, cap. 5.</li>
          <li>Adición estándar por extrapolación a señal cero, con intervalo de confianza usando t con n − 2 grados de libertad.</li>
          <li>Valores críticos de t y F calculados con la función beta incompleta; G de Grubbs a partir de t (ISO 5725-2). Tabla Q de Dixon: Rorabacher, Anal. Chem. 1991, 63, 139.</li>
          <li>Propagación de errores de primer orden (GUM) con derivadas numéricas: sirve para cualquier fórmula que se escriba.</li>
        </ul>
      </Sec>

      <Sec title="Redox">
        <p>
          Cada cupla se describe con su potencial formal E°′ y la ecuación de Nernst (25 °C, 0,05916 V), incluyendo [H⁺]<sup>m</sup> (MnO₄⁻, Cr₂O₇²⁻) y la estequiometría del reducido (2 Cr³⁺, 2 S₂O₃²⁻).
          En cada volumen se busca el único potencial que cumple el <strong>balance de electrones</strong> (e⁻ cedidos por el reductor = e⁻ ganados por el oxidante), sin dividir la curva en zonas.
          Supuestos: [H⁺] constante (medio ácido en exceso), [I⁻] constante en yodometría (KI en exceso), potenciales formales del medio indicado.
        </p>
      </Sec>

      <Sec title="Complejometría y precipitación">
        <p>
          EDTA: α(Y⁴⁻) con los 6 pKa del H₆Y²⁺ (Harris, μ = 0,1 M); constante condicional K″ = Kf·α(Y⁴⁻)·α(M), donde α(M) incluye el NH₃ auxiliar con sus constantes acumuladas β.
          En cada punto se resuelve la cuadrática exacta de los balances de masa (sin dividir en "antes / en / después" de la equivalencia). Se supone pH constante (buffer) y estequiometría 1:1.
        </p>
        <p>
          Argentometría: se resuelve [Ag⁺] con el balance de plata y la condición [X⁻] = mín(C<sub>X</sub>, Ksp/[Ag⁺]), lo que permite mezclas de haluros (precipitación fraccionada). El punto final de Mohr se calcula con Ksp(Ag₂CrO₄), sin corrección por el blanco.
        </p>
      </Sec>

      <Sec title="Solubilidad">
        <p>
          Solubilidad molar a partir de Ksp para sales M<sub>a</sub>X<sub>b</sub>. Ion común: se resuelve Ksp = (C<sub>M</sub> + a·s)<sup>a</sup>(C<sub>X</sub> + b·s)<sup>b</sup> exactamente.
          Efecto del pH: K′sp = Ksp/α<sub>X</sub><sup>b</sup> (anión básico) o [OH⁻] directo para hidróxidos. No se incluyen la hidrólisis del catión, los complejos hidroxo ni la fuerza iónica: es el modelo del curso.
          Los Ksp son valores típicos de tabla (pueden diferir entre libros) y se pueden editar.
        </p>
      </Sec>

      <Sec title="Bibliografía">
        <ul className="list-disc space-y-1 pl-5">
          <li>D. C. Harris, <em>Quantitative Chemical Analysis</em> (Análisis Químico Cuantitativo), W. H. Freeman.</li>
          <li>D. A. Skoog, D. M. West, F. J. Holler, S. R. Crouch, <em>Fundamentos de Química Analítica</em>, Cengage.</li>
          <li>J. N. Miller, J. C. Miller, <em>Estadística y Quimiometría para Química Analítica</em>, Pearson.</li>
          <li>D. B. Rorabacher, Anal. Chem. 63 (1991) 139–146 (Q de Dixon).</li>
          <li>ICH Q2(R1), <em>Validation of Analytical Procedures</em>.</li>
          <li>NIST/SEMATECH e-Handbook of Statistical Methods (test de Grubbs).</li>
        </ul>
      </Sec>

      <Sec title="Código abierto">
        <p>
          Todo el cálculo está en la carpeta <code>src/chem</code> (TypeScript puro, separado de la interfaz) y se verifica con pruebas automáticas (<code>npm test</code>). El archivo <code>TESTS.md</code> lista qué se verifica y contra qué fuente.
        </p>
      </Sec>
    </div>
  );
}
