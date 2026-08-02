@echo off
setlocal
rem === Compila l'APK di Movienaitor e lo pubblica nella cartella del gruppo ===
cd /d "%~dp0"

rem --- versione attuale (letta da package.json) ---
for /f "delims=" %%v in ('node -p "require('./package.json').version"') do set "CUR=%%v"

set "VER=%~1"
if not "%VER%"=="" goto build

echo.
echo ===================================================
echo    PUBBLICA L'APK DI MOVIENAITOR
echo    Versione attuale:  %CUR%
echo ===================================================
echo.
echo    - INVIO           = ripubblica la %CUR%
echo    - una versione    = es.  1.3.0   (la imposta)
echo    - +               = alza di uno l'ultimo numero
echo.
set /p "VER=Che versione vuoi pubblicare? "

echo.
echo    Nota per chi aggiorna (facoltativa): una riga su cosa cambia.
set /p "NOTE=   Nota (INVIO per saltare): "

:build
echo.
if "%NOTE%"=="" (
  node "tools\pubblica-apk.js" %VER%
) else (
  node "tools\pubblica-apk.js" %VER% --note "%NOTE%"
)

echo.
pause
endlocal
