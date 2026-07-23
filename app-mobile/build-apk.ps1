# Costruisce l'APK di Movienaitor in locale.
# Prerequisito (una volta sola): .\setup-android.ps1
# Uso:  cd "D:\4 - Programmi\Movienaitor\app-mobile" ; .\build-apk.ps1

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Passo($t){ Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Assicura($exitCode, $msg){ if ($exitCode -ne 0) { throw $msg } }

Passo "Controlli"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Manca Node.js. Installalo da nodejs.org" }
if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw "Manca Java. Esegui prima: .\setup-android.ps1" }
if (-not $env:ANDROID_HOME) {
  $sdkDefault = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
  if (Test-Path $sdkDefault) { $env:ANDROID_HOME = $sdkDefault }
  else { throw "ANDROID_HOME non impostato. Esegui prima: .\setup-android.ps1 (e riapri PowerShell)" }
}
Write-Host "node        : $((Get-Command node).Source)"
Write-Host "java        : $((Get-Command java).Source)"
Write-Host "ANDROID_HOME: $env:ANDROID_HOME"

Passo "Dipendenze npm"
npm install
Assicura $LASTEXITCODE "npm install fallito"

Passo "Piattaforma Android"
if (Test-Path 'android') {
  Write-Host "cartella android/ gia' presente, la riuso"
} else {
  npx cap add android
  Assicura $LASTEXITCODE "cap add android fallito"
}

Passo "Plugin nativo SAF (selettore cartella)"
node scripts/patch-android.js
Assicura $LASTEXITCODE "patch-android.js fallito"

Passo "Icone e splash"
node scripts/make-icon.js
Assicura $LASTEXITCODE "make-icon.js fallito"
npx @capacitor/assets generate --android
Assicura $LASTEXITCODE "generazione icone fallita"

Passo "Sync (web + plugin nel progetto Android)"
npx cap sync android
Assicura $LASTEXITCODE "cap sync fallito"

Passo "Build APK di debug (Gradle)"
Push-Location android
.\gradlew.bat --no-daemon assembleDebug
$codice = $LASTEXITCODE
Pop-Location
Assicura $codice "build Gradle fallita"

$apk = 'android\app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path $apk)) { throw "APK non trovato in $apk" }

$dest = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Movienaitor-APK'
if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest | Out-Null }
$finale = Join-Path $dest 'Movienaitor.apk'
Copy-Item $apk $finale -Force

Write-Host "`nFATTO." -ForegroundColor Green
Write-Host "APK pronto: $finale" -ForegroundColor Green
Write-Host "Passalo al telefono e installalo (consenti origini sconosciute)."
