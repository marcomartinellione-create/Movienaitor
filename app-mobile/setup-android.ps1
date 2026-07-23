# Installa UNA VOLTA SOLA la toolchain per compilare l'APK, senza Android Studio.
# Cosa fa: JDK 17 (Temurin, via winget) + Android SDK command-line tools + i pacchetti
# necessari (platform-tools, platforms;android-34, build-tools;34.0.0) e imposta ANDROID_HOME.
# Uso:  cd "D:\4 - Programmi\Movienaitor\app-mobile" ; .\setup-android.ps1
# Spazio su disco: ~1,5-2 GB. Poi usa .\build-apk.ps1

$ErrorActionPreference = 'Stop'
function Passo($t){ Write-Host "`n=== $t ===" -ForegroundColor Cyan }

Passo "JDK 17"
if (Get-Command java -ErrorAction SilentlyContinue) {
  Write-Host "java gia' presente: $((Get-Command java).Source)"
} else {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "winget non disponibile. Installa a mano Temurin JDK 17 da adoptium.net, poi rilancia."
  }
  winget install --id EclipseAdoptium.Temurin.17.JDK -e --accept-package-agreements --accept-source-agreements
  Write-Host "JDK installato. Se 'java' non e' ancora nel PATH, riapri PowerShell e rilancia questo script."
}

$sdk     = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$cmdline = Join-Path $sdk 'cmdline-tools\latest'
$sdkmgr  = Join-Path $cmdline 'bin\sdkmanager.bat'

Passo "Android SDK command-line tools"
if (Test-Path $sdkmgr) {
  Write-Host "gia' presenti in $cmdline"
} else {
  # Se questo link dovesse dare 404, prendi l'ultimo zip "Command line tools only" da
  # https://developer.android.com/studio#command-line-tools-only e aggiorna $url.
  $url = 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip'
  $zip = Join-Path $env:TEMP 'android-cmdline-tools.zip'
  $tmp = Join-Path $env:TEMP 'android-cmdline-tools'
  Write-Host "scarico: $url"
  Invoke-WebRequest -Uri $url -OutFile $zip
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $tmp -Force
  New-Item -ItemType Directory -Path $cmdline -Force | Out-Null
  Copy-Item (Join-Path $tmp 'cmdline-tools\*') $cmdline -Recurse -Force
  Remove-Item $zip -Force
  Remove-Item $tmp -Recurse -Force
  Write-Host "installati in $cmdline"
}

Passo "Variabile ANDROID_HOME"
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdk, 'User')
$env:ANDROID_HOME = $sdk
Write-Host "ANDROID_HOME = $sdk  (impostata per l'utente)"

Passo "Pacchetti SDK"
& $sdkmgr "--sdk_root=$sdk" "platform-tools" "platforms;android-34" "build-tools;34.0.0"
if ($LASTEXITCODE -ne 0) { throw "installazione pacchetti SDK fallita" }

Passo "Licenze SDK"
Write-Host "Ti verra' chiesto di accettare le licenze Android SDK: rispondi 'y' a ciascuna." -ForegroundColor Yellow
& $sdkmgr "--sdk_root=$sdk" --licenses

Write-Host "`nFATTO." -ForegroundColor Green
Write-Host "Chiudi e riapri PowerShell, poi:  cd '$PSScriptRoot' ; .\build-apk.ps1" -ForegroundColor Green
