/**
 * Guardado local (demo): las entregas y los ajustes viven en localStorage de ESTE navegador.
 * Todo acceso va en try/catch: en modo privado o con el almacenamiento bloqueado la app sigue
 * funcionando (los datos sólo duran mientras la página esté abierta).
 */
import { useCallback, useEffect, useState } from 'react';
import { ajustesPorDefecto } from '../../chem/practicos/datos';
import type { Ajustes, Entrega } from '../../chem/practicos/tipos';

const K_ENTREGAS = 'analiticapp.entregas.v1';
const K_AJUSTES = 'analiticapp.entregas.ajustes.v1';
const EVENTO = 'analiticapp-entregas';

function leer<T>(k: string, def: T): T {
  try {
    const s = window.localStorage.getItem(k);
    return s ? (JSON.parse(s) as T) : def;
  } catch {
    return def;
  }
}

function escribir(k: string, v: unknown): boolean {
  try {
    window.localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}

// copia en memoria por si localStorage no funciona
let memEntregas: Entrega[] | null = null;
let memAjustes: Ajustes | null = null;

export function cargarEntregas(): Entrega[] {
  if (memEntregas) return memEntregas;
  const v = leer<Entrega[]>(K_ENTREGAS, []);
  memEntregas = Array.isArray(v) ? v : [];
  return memEntregas;
}

export function guardarEntregas(lista: Entrega[]) {
  memEntregas = lista;
  escribir(K_ENTREGAS, lista);
  window.dispatchEvent(new Event(EVENTO));
}

export function cargarAjustes(): Ajustes {
  if (memAjustes) return memAjustes;
  const def = ajustesPorDefecto();
  const v = leer<Partial<Ajustes>>(K_AJUSTES, {});
  memAjustes = { ...def, ...v, masasMolares: { ...def.masasMolares, ...(v.masasMolares ?? {}) } };
  return memAjustes;
}

export function guardarAjustes(a: Ajustes) {
  memAjustes = a;
  escribir(K_AJUSTES, a);
  window.dispatchEvent(new Event(EVENTO));
}

/** Estado compartido entre las pestañas Alumno y Profesor. */
export function useEntregas() {
  const [entregas, setEntregas] = useState<Entrega[]>(cargarEntregas);
  const [ajustes, setAjustes] = useState<Ajustes>(cargarAjustes);
  useEffect(() => {
    const on = () => {
      setEntregas(cargarEntregas());
      setAjustes(cargarAjustes());
    };
    window.addEventListener(EVENTO, on);
    return () => window.removeEventListener(EVENTO, on);
  }, []);
  const set = useCallback((l: Entrega[]) => guardarEntregas(l), []);
  const setAj = useCallback((a: Ajustes) => guardarAjustes(a), []);
  return { entregas, setEntregas: set, ajustes, setAjustes: setAj };
}

/** Valida (por encima) un archivo JSON importado. */
export function validarImportacion(data: unknown): Entrega[] {
  const lista = Array.isArray(data) ? data : (data as { entregas?: unknown })?.entregas;
  if (!Array.isArray(lista)) throw new Error('El archivo no contiene una lista de entregas.');
  return lista.filter(
    (e): e is Entrega =>
      e && typeof e === 'object' && typeof e.id === 'string' && typeof e.practica === 'string' && Array.isArray(e.filas) && e.alumno && typeof e.alumno === 'object',
  );
}

export function descargarTexto(texto: string, nombre: string, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function nuevoId(): string {
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
