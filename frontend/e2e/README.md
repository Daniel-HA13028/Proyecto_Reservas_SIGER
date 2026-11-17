# Pruebas E2E (T-10-03)

Flujo principal con [Playwright](https://playwright.dev):

1. Registrarse.
2. Verificar el correo con el enlace que llega a Mailpit.
3. Reservar con pago simulado.
4. El organizador valida el comprobante con el código escrito en la pantalla de escaneo.
5. El reporte del evento muestra la asistencia.

## Requisitos

El entorno de desarrollo levantado, con los datos de demostración:

- `docker compose up`.
- Backend con el perfil `dev` en el puerto 8080.
- `npm run dev` en el puerto 5173.

Se usa el Microsoft Edge instalado en el equipo. Para usar Chrome: `E2E_NAVEGADOR=chrome`.

## Ejecutar

```bash
npm run e2e
```

El informe HTML queda en `e2e-informe/`.

Variables opcionales:

| Variable | Uso |
|---|---|
| `E2E_BASE_URL` | Dirección del frontend |
| `E2E_MAILPIT` | Dirección de Mailpit |
| `E2E_EVENTO` | Evento publicado con precio del organizador |
| `E2E_ORGANIZADOR` | Correo del organizador |
| `E2E_CONTRASENA_ORGANIZADOR` | Contraseña del organizador |

La lectura con la cámara no se automatiza. La prueba usa el campo de código escrito de la misma pantalla, que recorre la misma validación del backend (`metodo = Digital_Code`).
