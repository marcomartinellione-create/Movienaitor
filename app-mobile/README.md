# Movienaitor — APK mobile

App Android minimale: **entra → scegli profilo → cerca su TMDB → aggiungi/togli film**
alla tua lista. Legge e scrive i JSON di una **cartella locale del telefono** tenuta
sincronizzata con la cartella Google Drive del gruppo (via un'app di sync, es. Autosync
o FolderSync). Scrive **solo** il tuo `profili/<slug>.json`, la tua `recensioni/<slug>/`
e il tuo `segnalazioni/<slug>.json` (regola anti-conflitto).

Tre sezioni: **🎬 Sala**, **🔖 Lista**, **📝 Recensioni**, più il pulsante **🐞 Segnala**.

- **Sala** (v1.2.0) — stessa logica del desktop: si toccano i nomi di chi c'è stasera,
  filtri della serata (durata / regista / genere), il film in cartellone col suo rango e
  punteggio, gli altri in classifica e la **lista completa** in ordine di pertinenza (un
  tocco porta in cartellone anche un film fuori dalla Top 5). **Niente Play**: registrare
  la visione resta al PC della serata, perché `storico.json` lo scrive solo l'host.
- **🐞 Segnala** (v1.2.0) — bug / suggerimenti / idee: finiscono in
  `segnalazioni/<slug>.json`, l'host li gestisce dal PC. Ognuno rivede lo stato delle
  proprie e può ritirarle.

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

## Aggiornamenti dell'APK (firma stabile)
Perché installando un APK nuovo sopra a uno già presente Android non dia "app non
installata", tutte le build firmano con **lo stesso** keystore di debug, versionato in
`app-mobile/keystore/debug.keystore` (chiave di debug standard, password `android` — non
è un segreto, vale solo per il sideload personale). `scripts/patch-android.js` lo copia in
`android/app/mvn-debug.keystore` e configura `signingConfigs.debug` in `build.gradle` per
puntarci: così la firma è deterministica **a prescindere** da dove il runner cerca il
keystore di default. Il `versionCode` è i minuti dall'epoch (sempre crescente), così ogni
build è "più recente". Il keystore si rigenera solo col workflow `make-keystore` (una
tantum) — NON serve rifarlo.

## Note tecniche
- **Storage**: usa il **Storage Access Framework** (`ACTION_OPEN_DOCUMENT_TREE`). L'utente
  sceglie la cartella col selettore di sistema; l'app prende un permesso persistente e
  legge/scrive via `DocumentFile`/`ContentResolver`. Nessun permesso globale di storage,
  nessuna dipendenza dalla versione di Android.
- **Plugin**: oltre a `pickFolder/loadFolder/read/write` e ai metodi delle recensioni, dal
  v1.2.0 ci sono i generici `leggiPercorso`/`scriviPercorso`/`elencaJson` (percorso
  relativo alla cartella scelta, sottocartelle create al volo) — li usano le segnalazioni.
  Lato JS gli helper sono `fsLeggiPercorso` / `fsScriviPercorso` / `fsElencaJson`, che
  degradano a vuoto se l'APK installato ha un plugin più vecchio.
- **Locandine**: non vengono scaricate da mobile (restano gli URL remoti); ci pensa il PC.
- **Chiavi TMDB/OMDb**: lette da `config.json` nella cartella (si impostano dal PC).
