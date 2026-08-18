@echo off
rem === Avvio Movienaitor (versione PC) ===
rem Doppio click su questo file per aprire l'app.
cd /d "%~dp0electron"

rem Se le dipendenze non ci sono ancora, le installa la prima volta.
if not exist "node_modules\electron\dist\electron.exe" (
  echo Prima installazione: scarico Electron, ci vuole qualche minuto...
  call npm install
)

rem Porta nel renderer l'ultima versione di Movienaitor.html (la fonte di verita').
rem Senza questo passaggio partirebbe la copia vecchia.
node copia-html.js

rem Avvia Electron senza lasciare aperta la finestra della console.
rem Nota: "%~dp0electron\." col punto finale perche' %~dp0 finisce con backslash,
rem che tra virgolette romperebbe l'argomento.
start "" "%~dp0electron\node_modules\electron\dist\electron.exe" "%~dp0electron\."
