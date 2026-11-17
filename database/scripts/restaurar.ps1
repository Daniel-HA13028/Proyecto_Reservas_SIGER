<#
.SYNOPSIS
  Restaura un respaldo de SIGER creado con respaldo.ps1 (T-03-04).

.DESCRIPTION
  Reemplaza el contenido de la base indicada por el del respaldo. Detén el backend antes de restaurar.
  Si la base destino no existe, se crea. Pide confirmación salvo que se use -Forzar.

.EXAMPLE
  .\database\scripts\restaurar.ps1 -Archivo .\database\respaldos\siger_20261004_210000.dump
  .\database\scripts\restaurar.ps1 -Archivo ...\siger_20261004_210000.dump -Base siger_copia -Forzar
#>
param(
    [Parameter(Mandatory = $true)][string]$Archivo,
    [string]$Contenedor = "siger-postgres",
    [string]$Base = "siger",
    [string]$Usuario = "siger",
    [switch]$Forzar
)
# Los avisos que PostgreSQL escribe en stderr (NOTICE) no son errores; se revisa $LASTEXITCODE de cada paso.
$ErrorActionPreference = "Continue"

if (-not (Test-Path $Archivo)) { throw "No existe el archivo $Archivo" }
$estado = docker inspect -f "{{.State.Running}}" $Contenedor 2>$null
if ($estado -ne "true") { throw "El contenedor '$Contenedor' no está en ejecución. Inicia los servicios con: docker compose up -d" }

if (-not $Forzar) {
    $r = Read-Host "Se reemplazará TODO el contenido de la base '$Base' con $(Split-Path $Archivo -Leaf). Escribe SI para continuar"
    if ($r -ne "SI") { "Cancelado."; return }
}

$existe = docker exec $Contenedor psql -U $Usuario -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = '$Base'"
if ($existe -ne "1") {
    docker exec $Contenedor createdb -U $Usuario $Base
    if ($LASTEXITCODE -ne 0) { throw "No se pudo crear la base $Base." }
}

$tmp = "/tmp/" + (Split-Path $Archivo -Leaf)
docker cp (Resolve-Path $Archivo).Path "${Contenedor}:$tmp" | Out-Null
docker exec $Contenedor pg_restore -U $Usuario -d $Base --clean --if-exists --no-owner --single-transaction $tmp
$codigo = $LASTEXITCODE
docker exec $Contenedor rm -f $tmp | Out-Null
if ($codigo -ne 0) { throw "pg_restore falló (código $codigo); la base quedó como estaba porque se usa una sola transacción." }
"Base '$Base' restaurada desde $(Split-Path $Archivo -Leaf)."
