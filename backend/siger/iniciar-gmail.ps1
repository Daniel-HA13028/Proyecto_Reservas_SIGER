# Inicia el backend en desarrollo enviando los correos por Gmail (perfiles dev,gmail).
# Uso, desde backend\siger:  .\iniciar-gmail.ps1
# Lee las credenciales de gmail.env (copia de gmail.env.example) y no las guarda en ningún otro lugar.
$ErrorActionPreference = 'Stop'
$archivo = Join-Path $PSScriptRoot 'gmail.env'
if (-not (Test-Path $archivo)) {
    Write-Host 'Falta gmail.env. Copia gmail.env.example como gmail.env y completa la cuenta y la contraseña de aplicación.' -ForegroundColor Yellow
    exit 1
}
foreach ($linea in Get-Content $archivo -Encoding UTF8) {
    $linea = $linea.Trim()
    if ($linea -eq '' -or $linea.StartsWith('#') -or -not $linea.Contains('=')) { continue }
    $nombre, $valor = $linea.Split('=', 2)
    $valor = $valor.Trim()
    if ($valor -ne '') { Set-Item -Path "Env:$($nombre.Trim())" -Value $valor }
}
if (-not $env:GMAIL_USUARIO -or -not $env:GMAIL_CONTRASENA) {
    Write-Host 'gmail.env debe tener GMAIL_USUARIO y GMAIL_CONTRASENA.' -ForegroundColor Yellow
    exit 1
}
$env:GMAIL_CONTRASENA = $env:GMAIL_CONTRASENA -replace '\s', ''   # Google la muestra en grupos de 4 con espacios
Write-Host "Correos por Gmail con la cuenta $env:GMAIL_USUARIO" -ForegroundColor Cyan
Set-Location $PSScriptRoot
& .\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=dev,gmail'
