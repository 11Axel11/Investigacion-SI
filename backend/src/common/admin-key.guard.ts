import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';

/** Cabecera que lleva la clave de administración (Q-01). */
export const ADMIN_KEY_HEADER = 'x-admin-key';
/** Longitud mínima de la clave configurada (Q-01: al menos 32 caracteres). */
export const ADMIN_KEY_MIN_LENGTH = 32;

const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();

/**
 * Protege los endpoints de escritura (`POST /osm/sync`, `POST /oij/sync`, `POST /tse/import`).
 *
 * Reglas de Q-01 / T-01:
 * - La clave esperada viene de `ADMIN_API_KEY`.
 * - Falla cerrada: si la variable falta, está vacía o tiene menos de 32 caracteres (sin contar espacios
 *   al inicio o al final), se rechaza todo.
 * - Sin cabecera, o con una clave incorrecta, se responde 401 y no se ejecuta el controlador.
 * - La comparación es en tiempo constante: se comparan los SHA-256 de ambas claves, que tienen
 *   siempre la misma longitud, así `timingSafeEqual` no lanza ni revela la longitud de la clave.
 *
 * Nunca registra ni devuelve el valor de la clave, ni el configurado ni el recibido. El mensaje de
 * error es el mismo en todos los casos de rechazo para no revelar si el servidor está mal configurado.
 */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Se recorta la clave configurada: un espacio o salto de línea accidental en `.env` no debe dejar
    // al operador sin acceso (R-02). La clave recibida NO se recorta: debe coincidir exacta.
    const expected = process.env.ADMIN_API_KEY?.trim();
    const header = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>()
      .headers[ADMIN_KEY_HEADER];

    const configured = typeof expected === 'string' && expected.length >= ADMIN_KEY_MIN_LENGTH;
    // Una cabecera repetida llega como arreglo: no se acepta.
    const received = typeof header === 'string' ? header : undefined;

    if (!configured || received === undefined || received.length === 0) {
      throw new UnauthorizedException('Se requiere una clave de administración válida.');
    }
    if (!timingSafeEqual(digest(expected), digest(received))) {
      throw new UnauthorizedException('Se requiere una clave de administración válida.');
    }
    return true;
  }
}
