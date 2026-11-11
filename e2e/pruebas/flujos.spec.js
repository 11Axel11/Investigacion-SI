// E2E de los tres flujos críticos (ítem 4.4): éxito y al menos un rechazo esperado por flujo, con el criterio de
// flujos.md que cada caso verifica. Se maneja la interfaz real (Chromium) contra el backend real y la BD de pruebas;
// Overpass y el OIJ se simulan. Datos 100 % ficticios. Un caso omitido o que no corrió es INCOMPLETO, no aprobado.
const { test, expect } = require('@playwright/test');
const { makeZip } = require('../../backend/scripts/pruebas/zip.cjs');
const { limpiar } = require('../soporte/preparar.cjs');

const CLAVE = 'clave-ficticia-de-prueba-0123456789';
const CEDULA = '900000001';
const NOMBRE = 'PERSONA FICTICIA UNO';
const zipFicticio = () => makeZip({
  'DISTELEC.TXT': ['101001,SAN JOSÉ,SAN JOSÉ,CARMEN', '101002,SAN JOSÉ,SAN JOSÉ,MERCED', '201001,ALAJUELA,ALAJUELA,ALAJUELA'].join('\r\n'),
  'PADRON_COMPLETO.txt': [`${CEDULA},101001,1,20991231,0001,${NOMBRE},APELLIDO`, '900000002,101001,1,20300101,0001,PERSONA,APELLIDO',
    '900000003,101001,1,20300101,0002,PERSONA,APELLIDO', '900000004,101002,1,20300101,0003,PERSONA,APELLIDO', '900000005,201001,1,20300101,0004,PERSONA,APELLIDO'].join('\r\n'),
});
// Next agrega su propio role="alert" (anunciador de rutas): se filtra por la alerta de la interfaz.
const alerta = (page) => page.locator('[data-slot="alert"]');
const MENSAJE_401 = /La clave de administración no es válida/;

test.beforeEach(() => limpiar());

/** El modo operador vive solo en la memoria de la pestaña: se activa después de cada carga de página. */
async function activarOperador(page, clave = CLAVE) {
  await page.getByRole('button', { name: 'Modo operador' }).click();
  await page.getByLabel('Clave de administración').fill(clave);
  await page.getByRole('button', { name: 'Activar' }).click();
  await expect(page.getByText('Modo operador activo')).toBeVisible();
}

// ------------------------------------------------------------------ F-01
test.describe('F-01 importar el padrón del TSE', () => {
  test('F01-AC1/AC2: el operador importa un ZIP ficticio, ve los conteos y ningún dato personal', async ({ page }) => {
    await page.goto('/electoral');
    await activarOperador(page);
    await page.getByRole('tab', { name: 'Importar' }).click();
    await page.locator('#tse-zip').setInputFiles({ name: 'padron-ficticio.zip', mimeType: 'application/zip', buffer: zipFicticio() });
    await page.getByRole('button', { name: 'Procesar y agregar' }).click();
    await expect(page.getByText('5 electores · 3 distritos')).toBeVisible();
    await page.getByRole('tab', { name: 'Resumen' }).click();
    await expect(page.getByText('SAN JOSÉ', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Distritos' }).click();
    await expect(page.getByText('CARMEN')).toBeVisible();
    const contenido = await page.content();
    for (const secreto of [CEDULA, NOMBRE, '20991231']) expect(contenido, 'ninguna pantalla muestra datos personales').not.toContain(secreto);
  });

  test('F01-AC7 (rechazo): sin modo operador el botón de importar está deshabilitado', async ({ page }) => {
    await page.goto('/electoral');
    await page.getByRole('tab', { name: 'Importar' }).click();
    await page.locator('#tse-zip').setInputFiles({ name: 'padron-ficticio.zip', mimeType: 'application/zip', buffer: zipFicticio() });
    await expect(page.getByRole('button', { name: 'Procesar y agregar' })).toBeDisabled();
    await expect(page.getByText('Importar el padrón es una acción del operador')).toBeVisible();
  });

  test('F01-AC7 (rechazo): con una clave incorrecta el backend responde 401, la interfaz lo explica y no se importa nada', async ({ page }) => {
    await page.goto('/electoral');
    await activarOperador(page, 'clave-incorrecta-de-prueba-9876543210');
    await page.getByRole('tab', { name: 'Importar' }).click();
    await page.locator('#tse-zip').setInputFiles({ name: 'padron-ficticio.zip', mimeType: 'application/zip', buffer: zipFicticio() });
    await page.getByRole('button', { name: 'Procesar y agregar' }).click();
    await expect(alerta(page)).toContainText(MENSAJE_401);
    await expect(page.getByText('Modo operador activo')).toBeHidden(); // la clave inválida se descarta
    await page.getByRole('tab', { name: 'Resumen' }).click();
    await expect(page.getByText('Sin datos.')).toBeVisible();
  });

  test('F01-AC3 (rechazo): un archivo que no es un ZIP se rechaza con un mensaje y no cambia los datos', async ({ page }) => {
    await page.goto('/electoral');
    await activarOperador(page);
    await page.getByRole('tab', { name: 'Importar' }).click();
    await page.locator('#tse-zip').setInputFiles({ name: 'falso.zip', mimeType: 'application/zip', buffer: Buffer.from('esto no es un zip') });
    await page.getByRole('button', { name: 'Procesar y agregar' }).click();
    await expect(alerta(page)).toContainText('ZIP válido');
    await page.getByRole('tab', { name: 'Resumen' }).click();
    await expect(page.getByText('Sin datos.')).toBeVisible();
  });
});

// ------------------------------------------------------------------ F-02
test.describe('F-02 sincronizar el OIJ', () => {
  test('F02-AC1/AC2: el operador sincroniza el año, ve los registros y la segunda vez usa la copia reciente', async ({ page }) => {
    await page.goto('/oij');
    await activarOperador(page);
    await page.getByRole('button', { name: 'Sincronizar con OIJ' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'registros procesados' })).toContainText('3 registros procesados');
    await expect(page.getByText('Datos actualizados desde la fuente oficial')).toBeVisible();
    await page.getByRole('button', { name: 'Sincronizar con OIJ' }).click();
    await expect(page.getByText('Se utilizó la copia reciente')).toBeVisible();
  });

  test('F02-AC5 (rechazo): sin modo operador no se puede sincronizar', async ({ page }) => {
    await page.goto('/oij');
    await expect(page.getByRole('button', { name: 'Sincronizar con OIJ' })).toBeDisabled();
    await expect(page.getByText('Este año todavía no tiene datos importados')).toBeVisible();
  });

  test('F02-AC5 (rechazo): con una clave incorrecta responde 401, se explica y no se guardan datos', async ({ page }) => {
    await page.goto('/oij');
    await activarOperador(page, 'clave-incorrecta-de-prueba-9876543210');
    await page.getByRole('button', { name: 'Sincronizar con OIJ' }).click();
    await expect(alerta(page)).toContainText(MENSAJE_401);
    await expect(page.getByText('Este año todavía no tiene datos importados')).toBeVisible();
  });
});

// ------------------------------------------------------------------ F-03
test.describe('F-03 sincronizar y consultar OpenStreetMap', () => {
  test('F03-AC1/AC2/AC6: el operador sincroniza, la segunda vez usa la caché y un visitante ve los lugares sin clave', async ({ page }) => {
    await page.goto('/mapa');
    await activarOperador(page);
    await page.getByRole('button', { name: 'Consultar y guardar' }).click();
    await expect(page.getByText('2 lugares')).toBeVisible();
    await page.getByRole('button', { name: 'Consultar y guardar' }).click();
    await expect(page.getByText('2 lugares · caché')).toBeVisible();

    await page.goto('/mapa'); // recarga: se pierde la clave, queda un visitante
    await expect(page.getByRole('button', { name: 'Consultar', exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Lugares' }).click();
    await expect(page.getByText('Hospital Ficticio A')).toBeVisible();
    await expect(page.getByText('Hospital Ficticio B')).toBeVisible();
  });

  test('F03-AC7 (rechazo): con una clave incorrecta responde 401 y no se guarda ningún lugar', async ({ page }) => {
    await page.goto('/mapa');
    await activarOperador(page, 'clave-incorrecta-de-prueba-9876543210');
    await page.getByRole('button', { name: 'Consultar y guardar' }).click();
    await expect(alerta(page)).toContainText(MENSAJE_401);
    await page.getByRole('tab', { name: 'Lugares' }).click();
    await expect(page.getByText('Hospital Ficticio A')).toBeHidden();
  });
});
