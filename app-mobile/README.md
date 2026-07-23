# Movienaitor — APK mobile

App Android minimale: **entra → scegli profilo → cerca su TMDB → aggiungi/togli film**
alla tua lista. Legge e scrive i JSON di una **cartella locale del telefono** tenuta
sincronizzata con la cartella Google Drive del gruppo (via un'app di sync, es. Autosync
o FolderSync). Scrive **solo** il tuo `profili/<slug>.json` (regola anti-conflitto).

Wrapper **Capacitor**; il web sta in `www/` (riusa la UI della versione PWA).

## Come si ottiene l'APK

### A) Build in cloud — niente da installare (consigliata)
1. **GitHub → Actions → "Build APK (Movienaitor mobile)"**.
2. **Run workflow** (parte da sola anche a ogni push su `app-mobile/`).
3. Finita la build, in fondo alla pagina del run scarica l'artifact **movienaitor-apk**
   (contiene `app-debug.apk`).
4. Copia l'APK sul telefono e installalo (consenti "origini sconosciute"). È di *debug*,
   non firmato per lo store: normale per uso personale.

### B) Build in locale sul PC — con gli script
Serve la toolchain Android (~1,5-2 GB), da installare **una volta sola**.

```powershell
cd "D:\4 - Programmi\Movienaitor\app-mobile"
.\setup-android.ps1      # UNA VOLTA: JDK 17 + Android SDK + ANDROID_HOME
# (chiudi e riapri PowerShell)
.\build-apk.ps1          # ogni volta che vuoi un APK aggiornato
```

`setup-android.ps1` installa Temurin JDK 17 (via winget) e i *command-line tools*
dell'Android SDK, poi scarica `platform-tools`, `platforms;android-34`,
`build-tools;34.0.0` e imposta `ANDROID_HOME`. Ti chiederà di accettare le licenze SDK.

`build-apk.ps1` fa gli stessi passi della CI (npm install → `cap add android` →
plugin nativo → icone → `cap sync` → `gradlew assembleDebug`) e ti copia il risultato in
**Desktop\Movienaitor-APK\Movienaitor.apk**. La prima esecuzione è lenta (Gradle scarica
le sue dipendenze), le successive molto più rapide.

## Sul telefono (una tantum)
- Un'app di sync mantiene la cartella del gruppo in una posizione della memoria
  visibile dal selettore di sistema (es. `Memoria interna/Movienaitor`).
- Al primo avvio, tocca **📁 Scegli cartella**: si apre il selettore di sistema,
  navighi tra i file del telefono e selezioni la cartella del gruppo. L'app ottiene un
  **permesso persistente** e ricorda la scelta (i lanci dopo la riaprono da sole).

## Struttura
```
app-mobile/
  package.json            dipendenze Capacitor (@capacitor/core, android, cli)
  capacitor.config.json   appId com.movienaitor.app, webDir=www
  www/index.html          l'app (UI + strato dati via plugin nativo SAF)
  native/
    MvnSafPlugin.java      plugin: selettore cartella (SAF) + read/write dei JSON
    MainActivity.java      registra il plugin
  scripts/patch-android.js copia i sorgenti nativi nel progetto + dipendenza documentfile
  android/                GENERATO in CI da `cap add android` (non versionato)
```
Workflow di build: `.github/workflows/build-apk.yml` (nella radice del repo).

## Note tecniche
- **Storage**: usa il **Storage Access Framework** (`ACTION_OPEN_DOCUMENT_TREE`). L'utente
  sceglie la cartella col selettore di sistema; l'app prende un permesso persistente e
  legge/scrive via `DocumentFile`/`ContentResolver`. Nessun permesso globale di storage,
  nessuna dipendenza dalla versione di Android.
- **Locandine**: non vengono scaricate da mobile (restano gli URL remoti); ci pensa il PC.
- **Chiavi TMDB/OMDb**: lette da `config.json` nella cartella (si impostano dal PC).
