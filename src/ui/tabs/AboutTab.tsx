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
          (mismas entradas → mismo resultado), con pruebas automáticas que verifican los resultados. Cada pestaña tiene un panel <strong>"Ver procedimiento"</strong> con las ecuaciones y los valores intermedios.
        </p>
      </Sec>

      <Sec title="Prácticos de laboratorio">
        <p>
          La pestaña <strong>Prácticos</strong> cubre los 13 prácticos de laboratorio: para cada uno calcula la diagramación (las tomas para un gasto de ≈ 8 mL en bureta de 10,00 mL),
          el resultado de cada determinación con la ecuación del práctico y el tratamiento estadístico con el criterio de cada práctico (intervalo de repetibilidad Ir = 2,8·σr y CAI = 1,96·σr/√n cuando σr es conocido;
          test Q de Dixon o CV máximo y CAI = t·s/√n en los demás). También verifica especificaciones (USP, Reglamento Bromatológico Nacional).
        </p>
        <p>
          Los datos precargados son <strong>de ejemplo</strong>: cada estudiante reemplaza con sus masas, gastos corregidos y V20.
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
          los pKa de la biblioteca son termodinámicos. En soluciones reales el pH medido puede diferir algunas centésimas a décimas.
        </p>
      </Sec>

      <Sec title="Puntos de equivalencia e indicadores">
        <ul className="list-disc space-y-1 pl-5">
          <li>Los puntos de equivalencia se calculan por <strong>estequiometría</strong>: el titulante reacciona primero con el protón más ácido (o la base más fuerte).</li>
          <li>Se informa si cada punto es detectable mediante el <strong>salto de pH entre el 98 % y el 102 %</strong> del tramo: ≥ 1,5 nítido; 0,5–1,5 poco nítido; &lt; 0,5 no detectable con indicador visual.</li>
          <li>Indicadores: intervalos de viraje tabulados. El pH de punto final por defecto es el centro del intervalo (editable).</li>
          <li>Error de titulación = (V<sub>final</sub> − V<sub>eq</sub>)/V<sub>eq</sub> × 100. |error| ≤ 0,1 %: excelente; ≤ 0,5 %: aceptable.</li>
          <li>El fondo del gráfico toma el color del indicador elegido a cada pH (o a cada potencial en redox): color de una forma, degradé en el intervalo de viraje y color de la otra forma.</li>
          <li>Redox: el intervalo de viraje es E°′ ± 0,059/n V; un indicador sirve si todo ese intervalo cae en el salto de la curva (±1 % del volumen de equivalencia). Almidón y KMnO₄ son indicadores específicos.</li>
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
          <li>Regresión por <strong>mínimos cuadrados ordinarios</strong> (supone error sólo en y, varianza constante).</li>
          <li><strong>Cuatro modelos</strong> sobre los mismos datos: lineal, lineal por el origen, cuadrático y lineal ponderado (pesos 1/x², sin los x = 0). Se comparan con R², R² ajustado (penaliza parámetros extra) y el patrón de los residuos; ante R² ajustados prácticamente iguales se prefiere el modelo más simple. LOD = 3,3·s<sub>y/x</sub>/b y LOQ = 10·s<sub>y/x</sub>/b con el modelo lineal.</li>
          <li>Adición estándar por extrapolación a señal cero, con intervalo de confianza usando t con n − 2 grados de libertad.</li>
          <li>Valores críticos de t y F calculados con la función beta incompleta; G de Grubbs a partir de t. Tabla Q de Dixon tabulada para 3 ≤ n ≤ 10.</li>
          <li>Propagación de errores de primer orden con derivadas numéricas: sirve para cualquier fórmula que se escriba.</li>
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
          EDTA: α(Y⁴⁻) con los 6 pKa del H₆Y²⁺ (μ = 0,1 M); constante condicional K″ = Kf·α(Y⁴⁻)·α(M), donde α(M) incluye el NH₃ auxiliar con sus constantes acumuladas β.
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
          Los Ksp son valores típicos a 25 °C y se pueden editar.
        </p>
      </Sec>

      <Sec title="Código abierto">
        <p>
          Todo el cálculo está en la carpeta <code>src/chem</code> (TypeScript puro, separado de la interfaz) y se verifica con pruebas automáticas (<code>npm test</code>). El archivo <code>TESTS.md</code> lista qué se verifica y contra qué fuente.
        </p>
      </Sec>
    </div>
  );
}
