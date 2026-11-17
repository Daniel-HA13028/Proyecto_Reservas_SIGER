// Flujo principal de SIGER de punta a punta: 
// registrarse → verificar el correo → reservar con pago simulado
// → el organizador valida el comprobante en la entrada → el reporte del evento muestra la asistencia.
import { expect, test } from '@playwright/test';

const MAILPIT = process.env.E2E_MAILPIT || 'http://localhost:8025';
const EVENTO = process.env.E2E_EVENTO || '7';
const ORGANIZADOR = process.env.E2E_ORGANIZADOR || 'organizador.carlos@siger.test';
const CONTRASENA_ORGANIZADOR = process.env.E2E_CONTRASENA_ORGANIZADOR || 'Demo#2026';
const CONTRASENA = 'Prueba#2026';

/** Espera el correo de verificación en Mailpit y devuelve el token del enlace. */
async function tokenDeVerificacion(correo) {
  for (let i = 0; i < 30; i++) {
    const busqueda = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${correo}"`)}`)).json();
    if (busqueda.messages?.length) {
      const mensaje = await (await fetch(`${MAILPIT}/api/v1/message/${busqueda.messages[0].ID}`)).json();
      const token = /verificar-correo\?token=([\w-]+)/.exec(mensaje.HTML)?.[1];
      if (token) return token;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No llegó el correo de verificación a ${correo}`);
}

async function iniciarSesion(page, correo, contrasena) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(contrasena);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test('registrarse, reservar, validar el QR en la entrada y verlo en el reporte', async ({ page, browser }) => {
  const correo = `e2e.${Date.now()}@example.com`;

  await test.step('registrarse como participante', async () => {
    await page.goto('/registro');
    await page.getByLabel('Nombres').fill('Prueba');
    await page.getByLabel('Apellidos').fill('End To End');
    await page.getByLabel('Correo electrónico').fill(correo);
    await page.getByLabel('Fecha de nacimiento').fill('2000-01-15');
    await page.getByLabel('Contraseña', { exact: true }).fill(CONTRASENA);
    await page.getByLabel('Confirmar contraseña').fill(CONTRASENA);
    await page.getByLabel(/Acepto los Términos/).check();
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByText('¡Cuenta creada!')).toBeVisible();
  });

  await test.step('verificar el correo con el enlace recibido', async () => {
    await page.goto(`/verificar-correo?token=${await tokenDeVerificacion(correo)}`);
    await expect(page.getByText('¡Correo verificado!')).toBeVisible();
  });

  let codigo;
  await test.step('reservar con pago simulado', async () => {
    await iniciarSesion(page, correo, CONTRASENA);
    await expect(page).toHaveURL(/\/inicio/);
    await page.goto(`/eventos/${EVENTO}/reservar`);
    await page.getByRole('button', { name: 'Continuar al pago' }).click();
    await page.getByLabel(/Confirmo el pago simulado/).check();
    await page.getByRole('button', { name: 'Pagar y reservar' }).click();
    await expect(page.getByText('¡Reservación exitosa!')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Código QR de la reservación' })).toBeVisible();
    codigo = (await page.locator('p.font-mono').innerText()).trim();
    expect(codigo).toMatch(/^[\w-]{32}$/);
  });

  const organizador = await (await browser.newContext()).newPage();
  await test.step('el organizador valida el comprobante en la entrada', async () => {
    await iniciarSesion(organizador, ORGANIZADOR, CONTRASENA_ORGANIZADOR);
    await organizador.goto(`/organizador/eventos/${EVENTO}/escanear`);
    await organizador.getByLabel('Código del comprobante').fill(codigo);
    await organizador.getByRole('button', { name: 'Validar' }).click();
    await expect(organizador.getByText(/Acceso permitido/)).toBeVisible();
    await expect(organizador.getByText('Prueba End To End').first()).toBeVisible();
    // El mismo comprobante otra vez: «Asistencia ya registrada» (criterio de aceptación de la Fase 7).
    await organizador.getByLabel('Código del comprobante').fill(codigo);
    await organizador.getByRole('button', { name: 'Validar' }).click();
    await expect(organizador.getByText(/Acceso denegado/)).toBeVisible();
    await expect(organizador.getByText('Asistencia ya registrada', { exact: true })).toBeVisible();
  });

  await test.step('el reporte del evento incluye la asistencia', async () => {
    await organizador.goto('/reportes');
    await organizador.getByLabel('Alcance').selectOption('evento');
    await organizador.getByLabel('Evento').selectOption(EVENTO);
    const asistencias = organizador.getByText('Asistencias', { exact: true }).locator('xpath=following-sibling::p[1]');
    await expect(asistencias).not.toHaveText('0');
    await expect(organizador.getByText('Eventos con más asistencia')).toBeVisible();
  });
});
