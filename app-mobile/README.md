# Movienaitor — APK mobile

App Android minimale: **entra → scegli profilo → cerca su TMDB → aggiungi/togli film**
alla tua lista. Legge e scrive i JSON di una **cartella locale del telefono** tenuta
sincronizzata con la cartella Google Drive del gruppo (via un'app di sync, es. Autosync
o FolderSync). Scrive **solo** il tuo `profili/<slug>.json`, la tua `recensioni/<slug>/`
il tuo `segnalazioni/<slug>.json` e il tuo `consigli/<slug>.json` (regola anti-conflitto).

Quattro sezioni: **🎬 Sala**, **🔖 Lista**, **📝 Recensioni**, **✨ Per te**, più il pulsante **🐞 Segnala**.

Da ⚙ Impostazioni si fa tutto il resto, come sul desktop: chiavi delle librerie
(del gruppo e personali), profilo, coefficienti della formula e **modalità host** — con
«Pronti alla visione» e la gestione delle segnalazioni, che si aprono a schermo intero.

- **Sala** — stessa logica del desktop: uno **schermo cinema** (proporzione 16/9 come il
  desktop) con il **sipario animato** che si apre sul film, il rango e il punteggio; sotto,
  le **poltrone in velluto** (una per profilo + posti liberi per utenti futuri, tocca per
  chi c'è stasera); filtri della serata (durata / regista / genere) e la **lista completa**
  in ordine di pertinenza — un tocco porta sullo schermo anche un film in fondo alla
  classifica. C'è anche il **tasto ▶ Play** (come sul desktop): elegge il film e lo
  registra come visto per chi è in sala. Scrive `storico.json` rileggendolo fresco e
  fondendo le voci per `id` (§ anti-conflitto), così anche se PC e telefono registrano
  non si perde nulla; alla serata, comunque, lo preme un dispositivo solo.
- **Lista** — divisa in due sotto-menù **Da vedere** / **Già visti** (col conteggio): i
  film visti in sala restano consultabili e da lì si possono **rimettere in lista** per
  rivederli. Ricerca e filtri agiscono sulla sezione attiva.
- **📝 Recensioni** — nell'editor, «dove vederlo» rileva i **servizi streaming** da TMDB
  (Italia): all'apertura si spuntano da soli se il campo è vuoto, o col tasto **🔄 rileva**.
  Serve la chiave TMDB, che ora si mette anche dal telefono (⚙ Impostazioni).
- **✨ Per te** — consigli dai tuoi voti: profilo del gusto ricalcolato ogni volta dalle
  recensioni (le recenti pesano di più), indice di compatibilità con le fasce «Molto in
  linea / Da provare / Forse» e il perché. Filtri nel pannello ≡ (genere, anno, durata,
  voto, «solo dove posso vederlo»), aggiornamento automatico. Gli esclusi si gestiscono da
  ⚙ → «Gestisci». Serve la chiave TMDB e almeno 3 recensioni. Vedi CONCEPT-consigli.md.
- **🐞 Segnala** — bug / suggerimenti / idee. Ognuno rivede lo stato delle proprie e può
  ritirarle; chi è host le gestisce da ⚙ Impostazioni, anche dal telefono.

Al riavvio **si rientra nell'ultimo profilo senza richiedere la password**: si richiede
solo quando si **cambia** utente (col 👤). La password è comunque solo anti-errore (in
chiaro nel JSON), quindi ricordare lo sblocco è accettabile.

Wrapper **Capacitor**; il web sta in `www/` (riusa la UI della versione PWA).

## Pubblicare un aggiornamento (il modo normale)

Un'unica fonte, per chiunque abbia l'app: l'ultima **GitHub Release** — la stessa da cui
si scarica l'exe desktop.

1. Bump versione in `package.json` e `APP_VERSION` di `www/index.html`.
2. Commit + push di `app-mobile/`: parte da sola la build in cloud
   (`.github/workflows/build-apk.yml`).
3. A build finita, scarica l'artifact `movienaitor-apk` (`gh run download <run-id> -n
   movienaitor-apk`) e allegalo con `gh release create v<versione> "…apk" "…exe"
   "…latest.yml"` insieme agli asset desktop.

L'app controlla da sola l'ultima Release a ogni apertura (e quando torna in primo
piano): se trova una versione più alta la propone, e installandola la scarica
direttamente da GitHub e la passa all'installer di sistema. (La prima volta va concesso
«Installa app sconosciute» per Movienaitor: l'app apre da sola l'impostazione.) C'è anche
**⚙ → Cerca aggiornamenti** per controllare a mano.

> Perché l'aggiornamento sopra funzioni la firma deve restare la stessa: ci pensa il
> keystore fisso in `keystore/debug.keystore` (vedi sotto). Il `versionCode` cresce da
> solo a ogni build.

## Come si ottiene l'APK a mano

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
  scripts/copia-manuale.js porta Manuale.html (radice del progetto) dentro www/
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
- **Aggiornamento in-app**: l'app interroga `api.github.com/repos/…/releases/latest`; se
  il tag è più alto della versione installata mostra il banner. Installando, il plugin
  scarica l'APK dall'asset della release direttamente nella cache e lo passa
  all'installer di sistema via **FileProvider** (`installaApkDaUrl`). `patch-android.js`
  aggiunge il permesso `REQUEST_INSTALL_PACKAGES` e i `file_paths` con la cache. Vale per
  chiunque abbia installato l'app, non serve una cartella condivisa.
- **Manuale in-app**: il tasto **📖 Guida**, in cima al modulo 🐞 Segnala, apre
  `Manuale.html` a schermo intero dentro un `<iframe>` — non un div: il manuale è una
  pagina con un suo `:root` e un suo `body`, riversata nel documento ridipingerebbe
  l'app. Il file NON è versionato in `www/`: `scripts/copia-manuale.js` lo copia dalla
  radice del progetto a ogni build (passo del workflow prima di `cap sync`), così l'APK
  ha sempre il manuale della versione che sta compilando. Sul desktop fa lo stesso
  `electron/copia-html.js`.
- **Locandine**: non vengono scaricate da mobile (restano gli URL remoti); ci pensa il PC.
- **Chiavi**: da ⚙ Impostazioni come sul desktop — quelle del gruppo in `config.json`, quelle personali nel proprio profilo (prevalgono). Sceglie `chiaveAPI()`.
