# SIGER · Sistema Inteligente de Gestión de Eventos y Reservaciones

[![CI](https://github.com/Daniel-HA13028/SIGER/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/Daniel-HA13028/SIGER/actions/workflows/ci.yml)

Aplicación web para publicar eventos, reservar cupos con comprobante QR, registrar asistencia y generar reportes. Proyecto de Análisis y Diseño de Software II (UES).

| Parte | Tecnología | Carpeta |
|---|---|---|
| Frontend | React 19 + Vite 8 + Tailwind CSS 3.4 | `frontend/` |
| Backend (API REST) | Java 21 + Spring Boot 3.5 (Maven) | `backend/siger/` |
| Base de datos | PostgreSQL 18 con migraciones Flyway | `database/` y `backend/siger/src/main/resources/db/` |
| Servicios de desarrollo | Docker Compose: PostgreSQL, pgAdmin y Mailpit | `docker-compose.yml` |

## 1. Requisitos

Instala lo siguiente y comprueba las versiones en PowerShell:

| Programa | Versión | Comprobar |
|---|---|---|
| Git | cualquiera reciente | `git --version` |
| Docker Desktop | 4.x o superior, **abierto** mientras trabajas | `docker compose version` |
| JDK | **21** (por ejemplo Eclipse Temurin 21) | `java -version` |
| Node.js | **22 LTS** o superior (Vite 8 pide 20.19 o más) | `node -v` |

Maven no hace falta: el proyecto trae su propio `mvnw`. Un IDE es opcional (IntelliJ IDEA para el backend, VS Code para el frontend).

> Si tienes varias versiones de Java, indica la 21 en la terminal antes de usar `mvnw`:
> `$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21..."` (la carpeta donde se instaló).

## 2. Primera vez

Todos los comandos son de PowerShell y parten de la carpeta del repositorio.

### 2.1 Clonar

```powershell
git clone <url-del-repositorio> SIGER
cd SIGER
```

Activa una sola vez el hook que evita subir cambios directo a `main` o `develop` (ver [CONTRIBUTING.md](CONTRIBUTING.md)):

```powershell
git config core.hooksPath .githooks
```

### 2.2 Servicios (base de datos, pgAdmin y correo)

```powershell
Copy-Item .env.example .env      # opcional: solo si quieres cambiar contraseñas o puertos
docker compose up -d
docker compose ps                # postgres y mailpit deben quedar "healthy"
```

La primera vez descarga las imágenes (unos minutos). pgAdmin tarda un poco más en su primer arranque.

### 2.3 Backend

```powershell
cd backend\siger
.\mvnw spring-boot:run
```

La primera vez descarga las dependencias. Arranca con el perfil `dev`, se conecta a la base de Docker y crea el esquema con Flyway. Comprueba en otra terminal:

```powershell
Invoke-RestMethod http://localhost:8080/actuator/health   # debe mostrar status UP
```

También puedes abrir esa dirección en el navegador.

Para ejecutarlo desde IntelliJ: abre `backend/siger` como proyecto Maven, elige el JDK 21 y ejecuta `SigerApplication`.

### 2.4 Frontend

En otra terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Abre http://localhost:5173. Las llamadas a `/api` las reenvía Vite al backend en el puerto 8080.

## 3. Direcciones

| Qué | Dirección | Acceso |
|---|---|---|
| Aplicación (frontend) | http://localhost:5173 | — |
| API REST | http://localhost:8080/api/v1 | — |
| Documentación de la API (Swagger) | http://localhost:8080/swagger-ui.html | — |
| Estado del backend | http://localhost:8080/actuator/health | — |
| pgAdmin | http://localhost:5050 | servidor «SIGER (Docker)», contraseña `siger_dev` |
| Correos enviados (Mailpit) | http://localhost:8025 | — |
| PostgreSQL desde el equipo | `localhost:5433`, base `siger` | usuario `postgres`, contraseña `siger_dev` |

Usuarios de la aplicación en desarrollo (los crean las migraciones y el arranque del backend; ver `database/README.md`):

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@siger.test` | `Admin#2026` |
| Organizador | `organizador.ana@siger.test`, `organizador.carlos@siger.test` | `Demo#2026` |
| Participante | `participante01@siger.test` … `participante10@siger.test` (el 10 está inactivo) | `Demo#2026` |

## 4. Día a día

```powershell
docker compose up -d                       # 1. servicios
cd backend\siger; .\mvnw spring-boot:run   # 2. backend (terminal 1)
cd frontend; npm run dev                   # 3. frontend (terminal 2)
```

Para detener: `Ctrl + C` en cada terminal y `docker compose stop`. Para borrar **todos** los datos de la base, pgAdmin y Mailpit: `docker compose down -v`.

## 5. Pruebas y revisión

```powershell
cd backend\siger; .\mvnw test     # pruebas del backend; necesita Docker Desktop abierto (Testcontainers)
cd frontend; npm run lint         # revisión del código del frontend (oxlint)
cd frontend; npm run build        # compilación de producción en frontend/dist
```

Las pruebas del backend crean su propia base PostgreSQL 18 temporal; no tocan los datos de desarrollo.

## 6. Perfiles del backend

| Perfil | Cuándo | Configuración |
|---|---|---|
| `dev` | por defecto | `application-dev.yml`: base `localhost:5433`, correo a Mailpit, datos demo, CORS para `localhost:5173` |
| `test` | pruebas automáticas | `src/test/resources/application-test.yml` y Testcontainers |
| `prod` | servidor (`$env:SPRING_PROFILES_ACTIVE = "prod"`) | `application-prod.yml`: todo desde variables de entorno (`DB_URL`, `DB_USUARIO`, `DB_CONTRASENA`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USUARIO`, `MAIL_CONTRASENA`, `SIGER_CORS_ORIGENES`); Swagger desactivado |
| `gmail` | junto con otro: `dev,gmail` o `prod,gmail` | `application-gmail.yml`: todos los correos (notificaciones a usuarios y soporte) salen por el SMTP de Gmail en lugar de Mailpit |

### 6.1 Enviar los correos con Gmail

Con el perfil `gmail`, una cuenta de Gmail envía **todos** los correos de `templates/correo`: verificación, bienvenida, recuperación de contraseña, aprobación o rechazo de organizadores, confirmación y cancelación de reservaciones (con el QR), cambios y cancelaciones de eventos, recordatorios y soporte. Esa misma cuenta (o la que indique `SIGER_SOPORTE_CORREO`) recibe cada solicitud de soporte; al responder ese correo, la respuesta llega a quien la reportó. El administrador también puede contestar desde **Soporte → Responder**: escribe el mensaje y SIGER lo envía con la plantilla `soporte_respuesta.html`, firmada por el «Equipo Soporte SIGER», y deja la solicitud en proceso o cerrada.

1. En la cuenta de Gmail activa la **verificación en dos pasos** y crea una **contraseña de aplicación** en https://myaccount.google.com/apppasswords (16 caracteres). La contraseña normal no funciona.
2. En `backend\siger`, copia `gmail.env.example` como `gmail.env` y completa `GMAIL_USUARIO` y `GMAIL_CONTRASENA`. `gmail.env` está en `.gitignore`: no se sube al repositorio.
3. Inicia el backend con `.\iniciar-gmail.ps1` en lugar de `.\mvnw spring-boot:run`.

En el servidor, define las mismas variables de entorno y `SPRING_PROFILES_ACTIVE=prod,gmail` (en ese caso no hacen falta `MAIL_HOST`, `MAIL_USUARIO` ni `MAIL_CONTRASENA`). Gmail permite unos 500 correos al día por cuenta.

## 7. Estructura

```
SIGER/
├── docker-compose.yml       PostgreSQL 18, pgAdmin y Mailpit
├── .env.example             variables de docker compose
├── docker/pgadmin/          conexión precargada de pgAdmin
├── database/                ERD, diccionario de datos y scripts de respaldo
├── backend/siger/           API REST (platform.siger: config, controller, dto, model, repository, service, exception)
└── frontend/                SPA en React (components, context, pages por rol, routes, services, utils)
```

## 8. Cómo colaborar

Ramas, mensajes de commit y Pull Requests: ver [CONTRIBUTING.md](CONTRIBUTING.md).

## 9. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `docker compose up` dice que el puerto 5433, 5050, 1025 u 8025 está ocupado | Cambia el puerto en `.env` (por ejemplo `POSTGRES_PORT=5434`) y, si es el de PostgreSQL, indícalo al backend con `$env:DB_URL = "jdbc:postgresql://localhost:5434/siger"`. |
| El backend no arranca: `Connection to localhost:5432 refused` | Docker Desktop no está abierto o no se levantaron los servicios: `docker compose up -d`. |
| `.\mvnw` dice que la versión de Java no es válida | `java -version` debe mostrar 21 o superior; ajusta `$env:JAVA_HOME` (sección 1). |
| `.\mvnw test` falla con `Could not find a valid Docker environment` o se agota el tiempo | Abre Docker Desktop y espera a que diga *Engine running*. En equipos con poca memoria, cierra otros programas: la base de pruebas tiene hasta 3 minutos para arrancar. |
| `npm` dice que la ejecución de scripts está deshabilitada | Usa `npm.cmd install` y `npm.cmd run dev`, o permite scripts locales para tu usuario con `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| `npm run dev` dice `Port 5173 is already in use` | Cierra la otra ventana de Vite. El puerto es fijo porque el backend solo acepta CORS desde él. |
| Los íconos aparecen como texto (por ejemplo «home») | La fuente de íconos todavía se está descargando; recarga la página. |
