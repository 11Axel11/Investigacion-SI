import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';

/**
 * Convierte los errores de `multer` en respuestas del cliente (4xx) en lugar de un 500.
 *
 * Por qué existe: `@nestjs/platform-express` 10 traduce los errores de multer comparando el TEXTO del mensaje
 * ("Unexpected field"), y multer 2.x cambió varios textos ("Unexpected file field", "Field name nesting too
 * deep", ...). Los que no coinciden llegaban como 500 aunque el culpable es el cliente. Aquí se decide por el
 * CÓDIGO del error, que es el contrato estable de multer.
 *
 * Los casos que Nest sí traduce (por ejemplo `LIMIT_FILE_SIZE` → 413) no llegan aquí. El mensaje es el de
 * multer (no incluye nombres de archivo ni contenido).
 */
@Catch(MulterError)
export class MulterErrorFilter implements ExceptionFilter {
  catch(error: MulterError, host: ArgumentsHost) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.BAD_REQUEST;
    host.switchToHttp().getResponse<Response>().status(status).json({
      statusCode: status,
      message: error.message,
      error: status === HttpStatus.PAYLOAD_TOO_LARGE ? 'Payload Too Large' : 'Bad Request',
    });
  }
}
