import { useSyncExternalStore } from 'react';

/**
 * Modo operador (Q-02). La clave de administración vive solo en la memoria de esta pestaña:
 * no se guarda en `localStorage`, `sessionStorage`, cookies, la URL ni en una variable
 * `NEXT_PUBLIC_*`. Al recargar la página se pierde y hay que volver a ingresarla.
 *
 * Ocultar o deshabilitar los botones no sustituye la validación del backend (T-01): el backend
 * rechaza con 401 toda escritura sin una clave válida.
 */
export const ADMIN_KEY_HEADER = 'X-Admin-Key';

let adminKey: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function setAdminKey(value: string) {
  adminKey = value.trim() === '' ? null : value.trim();
  emit();
}

export function clearAdminKey() {
  adminKey = null;
  emit();
}

export function hasAdminKey() {
  return adminKey !== null;
}

export class OperatorKeyRequiredError extends Error {
  constructor() {
    super('Esta acción requiere el modo operador. Ingresa la clave de administración.');
  }
}

/** Cabecera para una petición de escritura. Falla antes de salir a la red si no hay clave. */
export function adminHeaders(): Record<string, string> {
  if (adminKey === null) throw new OperatorKeyRequiredError();
  return { [ADMIN_KEY_HEADER]: adminKey };
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** `true` mientras haya una clave en memoria. En el servidor (prerender) siempre es `false`. */
export function useOperatorMode() {
  return useSyncExternalStore(subscribe, hasAdminKey, () => false);
}
