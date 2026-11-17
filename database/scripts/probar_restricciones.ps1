<#
.SYNOPSIS
  Prueba las restricciones de la base de datos de SIGER directamente en SQL (T-03-05).

.DESCRIPTION
  Crea una base temporal en el contenedor de PostgreSQL, le aplica las migraciones de Flyway
  (backend/siger/src/main/resources/db/migration, en orden de versión), ejecuta pruebas_restricciones.sql
  y borra la base. No toca la base de desarrollo. Termina con código 1 si alguna prueba falla.
  Las pruebas incluyen, entre otras: reserva duplicada, cupo negativo y asistencia doble (deben fallar).

.EXAMPLE
  .\database\scripts\probar_restricciones.ps1
#>
param(
    [string]$Contenedor = "siger-postgres",
    [string]$Usuario = "siger"
)
# Los avisos que PostgreSQL escribe en stderr (NOTICE) no son errores; se revisa $LASTEXITCODE de cada paso.
$ErrorActionPreference = "Continue"
$base = "siger_pruebas_restricciones"
$migraciones = Join-Path $PSScriptRoot "..\..\backend\siger\src\main\resources\db\migration"

$estado = docker inspect -f "{{.State.Running}}" $Contenedor 2>$null
if ($estado -ne "true") { throw "El contenedor '$Contenedor' no está en ejecución. Inicia los servicios con: docker compose up -d" }

docker exec $Contenedor sh -c "dropdb -U $Usuario --if-exists $base 2>/dev/null"
docker exec $Contenedor createdb -U $Usuario $base
if ($LASTEXITCODE -ne 0) { throw "No se pudo crear la base temporal $base." }

try {
    # Orden numérico de versión (V2 antes que V10), como lo hace Flyway.
    $archivos = Get-ChildItem $migraciones -Filter "V*__*.sql" |
        Sort-Object { [int]($_.Name -replace '^V(\d+)__.*$', '$1') }
    foreach ($a in $archivos + (Get-Item (Join-Path $PSScriptRoot "pruebas_restricciones.sql"))) {
        docker cp $a.FullName "${Contenedor}:/tmp/$($a.Name)" | Out-Null
    }
    foreach ($a in $archivos) {
        docker exec $Contenedor psql -U $Usuario -d $base -q -v ON_ERROR_STOP=1 -f "/tmp/$($a.Name)" | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "La migración $($a.Name) falló." }
        "Migración aplicada: $($a.Name)"
    }
    docker exec $Contenedor psql -U $Usuario -d $base -f /tmp/pruebas_restricciones.sql
    $codigo = $LASTEXITCODE
}
finally {
    docker exec $Contenedor sh -c "rm -f /tmp/V*__*.sql /tmp/pruebas_restricciones.sql" | Out-Null
    docker exec $Contenedor sh -c "dropdb -U $Usuario --if-exists $base 2>/dev/null" | Out-Null
}

if ($codigo -ne 0) { Write-Error "Hay pruebas de restricciones con FALLA (código $codigo)."; exit 1 }
"Todas las pruebas de restricciones pasaron. Base temporal $base eliminada."
