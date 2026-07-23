# Movienaitor — APK mobile

App Android minimale: **entra → scegli profilo → cerca su TMDB → aggiungi/togli film**
alla tua lista. Legge e scrive i JSON di una **cartella locale del telefono** tenuta
sincronizzata con la cartella Google Drive del gruppo (via un'app di sync, es. Autosync
o FolderSync). Scrive **solo** il tuo `profili/<slug>.json` (regola anti-conflitto).

Wrapper **Capacitor**; il web sta in `www/` (riusa la UI della versione PWA).

## Come si ottiene l'APK (build in cloud, niente toolchain sul PC)
1. Il codice è nel repo. Vai su **GitHub → Actions → "Build APK (Movienaitor mobile)"**.
2. **Run workflow** (o parte da solo a ogni push su `app-mobile/`).
3. Finita la build, in fondo alla pagina del run scarica l'artifact **movienaitor-apk**
   (contiene `app-debug.apk`).
4. Copia l'APK sul telefono e installalo (consenti "origini sconosciute"). È di *debug*,
   non firmato per lo store: normale per uso personale.

## Sul telefono (una tantum)
- Un'app di sync mantiene la cartella del gruppo in una posizione **normale** della
  memoria interna, es. `Memoria interna/Movienaitor` (NON in una cartella privata di app).
- Al primo avvio, nell'app scrivi il **percorso** di quella cartella (es. `Movienaitor`
  oppure `Download/Movienaitor`) e premi **Collega**. La scelta viene ricordata.

## Struttura
```
app-mobile/
  package.json            dipendenze Capacitor (@capacitor/core, android, cli, filesystem)
  capacitor.config.json   appId com.movienaitor.app, webDir=www
  www/index.html          l'app (UI + strato file locale via Capacitor Filesystem)
  scripts/patch-android.js  targetSdk 29 + requestLegacyExternalStorage + permessi storage
  android/                GENERATO in CI da `cap add android` (non versionato)
```
Workflow di build: `.github/workflows/build-apk.yml` (nella radice del repo).

## Note tecniche
- **Storage**: usa `Directory.ExternalStorage` (radice memoria condivisa). Per accedere a
  una cartella arbitraria senza SAF, il progetto imposta **targetSdk 29** +
  `requestLegacyExternalStorage`. Se un domani un telefono lo bloccasse, si passa a SAF.
- **Locandine**: non vengono scaricate da mobile (restano gli URL remoti); ci pensa il PC.
- **Chiavi TMDB/OMDb**: lette da `config.json` nella cartella (si impostano dal PC).
