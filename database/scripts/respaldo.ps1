<#
.SYNOPSIS
  Respaldo de la base de datos de SIGER con pg_dump (RNF-05, T-03-04).

.DESCRIPTION
  Ejecuta pg_dump dentro del contenedor de PostgreSQL de docker-compose.yml, copia el archivo a
  database/respaldos/ (ignorado por Git), comprueba que se puede leer con pg_restore y borra los
  respaldos más viejos que excedan -Conservar.
  Formato personalizado (-Fc): comprimido y restaurable con restaurar.ps1 o pg_restore.

.EXAMPLE
  .\database\scripts\respaldo.ps1
  .\database\scripts\respaldo.ps1 -Conservar 14
#>
param(
    [string]$Contenedor = "siger-postgres",
    [string]$Base = "siger",
    [string]$Usuario = "siger",
    [string]$Destino = (Join-Path $PSScriptRoot "..\respaldos"),
    [int]$Conservar = 7
)
# Los avisos que PostgreSQL escribe en stderr (NOTICE) no son errores; se revisa $LASTEXITCODE de cada paso.
$ErrorActionPreference = "Continue"

$estado = docker inspect -f "{{.State.Running}}" $Contenedor 2>$null
if ($estado -ne "true") { throw "El contenedor '$Contenedor' no está en ejecución. Inicia los servicios con: docker compose up -d" }

New-Item -ItemType Directory -Force -Path $Destino | Out-Null
$nombre = "{0}_{1}.dump" -f $Base, (Get-Date -Format "yyyyMMdd_HHmmss")
$tmp = "/tmp/$nombre"

docker exec $Contenedor pg_dump -U $Usuario -d $Base -Fc --no-owner -f $tmp
if ($LASTEXITCODE -ne 0) { throw "pg_dump falló (código $LASTEXITCODE)." }
# docker cp mantiene el archivo binario intacto (redirigir la salida en PowerShell lo corrompería).
docker cp "${Contenedor}:$tmp" (Join-Path $Destino $nombre) | Out-Null
if ($LASTEXITCODE -ne 0) { throw "No se pudo copiar el respaldo desde el contenedor." }
docker exec $Contenedor pg_restore --list $tmp | Out-Null
$valido = $LASTEXITCODE -eq 0
docker exec $Contenedor rm -f $tmp | Out-Null
if (-not $valido) { throw "El respaldo $nombre no se pudo leer con pg_restore." }

$archivo = Get-Item (Join-Path $Destino $nombre)
"Respaldo creado: {0} ({1:N0} KB)" -f $archivo.FullName, ($archivo.Length / 1KB)

$viejos = Get-ChildItem $Destino -Filter "${Base}_*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -Skip $Conservar
foreach ($v in $viejos) { Remove-Item $v.FullName; "Respaldo antiguo eliminado: $($v.Name)" }
