# Pendientes (datos que faltan en los documentos del curso)

Lo que sigue no se completó en la app porque no está, o no se lee, en los documentos fuente. Se resuelve cuando el docente lo confirme.

## Práctico 11 (potenciometría de H₃PO₄ en bebida cola)
- **Ecuaciones verificadas (15/11/2026)** contra el PDF de la cuaderneta 2026, pág. 39. La app ya usaba las mismas:
  - Concentración: c (mg/kg) = c(NaOH) (mol/L)·Gb (L)·MM(H₃PO₄) (g/mol) / m muestra (g) · 10⁶. Es la de la app (c(NaOH)·G·M·1000/m) con el gasto en mL.
  - Incertidumbre: u(c) = c·√[(u_cNaOH/cNaOH)² + (u_Gb/Gb)² + (u_MM/MM)² + (u_m/m)²], con Gb ±0,1 mL, MM 97,9956 ±0,00042 g/mol, m ±0,0002 g y u(c NaOH) = t·s/√n de la estandarización.
- **Factor de cobertura, resuelto (15/11/2026):** el documento no trae un ejemplo numérico y pide informar "(c ± u) ppm". Se decidió dejar k = 2 por defecto en la pestaña Potenciometría (editable).
- **Datos precargados:** el valor de u(c NaOH) y los datos del ejemplo son ilustrativos.

## Calibración del pH-metro
- El criterio "cumple si la pendiente ≥ 95 %" no aparece en los documentos: lo indicó Diego. Es editable.

## 1ª Revisión Práctica
- **Resuelto (15/11/2026, indicado por el docente vía Diego):** la tabla de la letra deja vacía la celda de σR del agente valorante para ZnSO₄·7H₂O y para la dureza total (las dos valoraciones con EDTA). Para el EDTA se usa el mismo criterio que para el analito: ausencia de anómalos según test de Dixon o Grubbs y CV < 2 %. La app lo muestra como "indicado por el docente" porque no está en la letra.

## 2ª Revisión Práctica
- Solo hay sugerencias de diagramación para los problemas 1, 2 y 4: no se agregaron sugerencias para los demás.
- Problema 7: el contenido aproximado figura como "125 mg de FeSO₄·7H₂O / mL". Se usa tal cual.
- **Resuelto (15/11/2026):** el documento no nombra el test de valores anómalos. En caso de ser necesario se hace alguno: en Resolver se elige Dixon (por defecto) o Grubbs.

## Preguntas de autocontrol
- La cuaderneta trae solo las preguntas, sin respuestas. Las respuestas modelo de la app son **borradores a validar por el docente**.
- El Teórico 1 indica 5 puntos de Preguntas Previas en prácticas individuales y 7 en grupales, pero no dice qué prácticas son grupales.
- El **Práctico 10** (humedad de yerba mate) no tiene preguntas de autocontrol en la cuaderneta.
- **Ecuaciones y figuras que no se leían: resueltas (15/11/2026)** con el PDF de la cuaderneta. Ya no hay preguntas marcadas `legible: false`:
  - Práctico 2, a) (pág. 11): C(HCl) = 2·m·(Assay/100)/(MM·G), con G en litros.
  - Práctico 3, a) (pág. 14): se agregó la figura de la curva (`public/autocontrol/p3-curva.png`) y la respuesta borrador asigna cada letra A a F.
  - Práctico 3, d) (pág. 15): C(NaOH) = 2·m(PP)·(Assay/100)·(V toma/V sol,PP)/(Gb·MM(PP)). La reconstrucción anterior no tenía el factor de la toma.
  - Práctico 11, i) (pág. 40): notación de la celda copiada del original.
- Para validar una respuesta, el docente edita `src/data/autocontrol.ts` y pone `validada: true`; la app deja de mostrar "borrador".
