# database

Material de apoyo de la base de datos de SIGER (PostgreSQL 18). El esquema lo crean las migraciones Flyway de `backend/siger/src/main/resources/db/` al arrancar el backend; esta carpeta no se ejecuta sola.

| Carpeta / archivo | Contenido |
|---|---|
| `diagramas/` | ERD físico (T-01-01): `SIGER_ERD.png`, `.svg`, el modelo `SIGER_ERD.dbml` (dbdiagram.io) y su fuente PlantUML `SIGER_ERD.wsd`. |
| `scripts/` | Respaldo, restauración y pruebas de restricciones (abajo). |
| `respaldos/` | Respaldos creados por `respaldo.ps1`. Git los ignora. |
| `diccionario_v2.xlsx` | Diccionario de datos v2 aprobado; fuente del ERD y de las migraciones. |

## Migraciones (backend/siger/src/main/resources/db/)

| Archivo | Contenido | Se aplica en |
|---|---|---|
| `migration/V1__esquema_inicial.sql` | Extensión `pg_trgm`, 9 tablas con sus `CHECK` y `UNIQUE`, 12 llaves foráneas y comentarios | dev, test y prod |
| `migration/V2__indices.sql` | 20 índices, entre ellos los únicos parciales de reservaciones y asistencias | dev, test y prod |
| `migration/V3__categorias.sql` | 6 categorías iniciales | dev, test y prod |
| `demo/V100__datos_demo.sql` | 2 organizadores, 10 participantes, 8 eventos, reservaciones, asistencias, notificaciones y soporte (contraseña `Demo#2026`) | solo dev |

Una migración aplicada **no se edita**: los cambios van en una nueva (`V4__…`). Para empezar de cero en desarrollo: `docker compose down -v` y `docker compose up -d`. El administrador inicial lo crea el backend al arrancar (`admin@siger.test` / `Admin#2026` en dev).

## Scripts (PowerShell, desde la carpeta del repositorio)

```powershell
.\database\scripts\respaldo.ps1                    # respaldo en database\respaldos (conserva los últimos 7)
.\database\scripts\restaurar.ps1 -Archivo .\database\respaldos\siger_AAAAMMDD_HHMMSS.dump   # pide confirmación
.\database\scripts\probar_restricciones.ps1        # 42 pruebas SQL de restricciones en una base temporal
```

- `respaldo.ps1` / `restaurar.ps1`: `pg_dump` y `pg_restore` dentro del contenedor `siger-postgres`, en formato comprimido. Detén el backend antes de restaurar.
- `respaldo.sh`: el mismo respaldo para el servidor Linux, pensado para cron una vez al día (RNF-05); conserva 14 días.
- `probar_restricciones.ps1` + `pruebas_restricciones.sql`: aplican las migraciones a una base temporal, comprueban que la base rechaza lo que las reglas prohíben (reserva duplicada, cupo negativo, asistencia doble, fechas incoherentes…) y la borran.

Si cambia el diccionario, se vuelven a generar el ERD y el script con `avances/fase_1/ERD/herramientas/generar_erd.js` y los cambios se llevan a una migración nueva.
