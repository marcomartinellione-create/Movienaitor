# HANDOFF — Movienaitor

> Manuale operativo per continuare a lavorare sul progetto. Contesto rapido +
> convenzioni + workflow. Per le regole di prodotto e le formule vedi **SPECIFICA.md**.
> **Stato: v1.7.0** (pubblicata su desktop e mobile). Cartella progetto: `D:\4 - Programmi\Movienaitor`.

## Cos'è

App per scegliere con gli amici quale film guardare. Due parti: **Catalogo** (ognuno
tiene la sua lista di film da vedere, con desiderio 1–5 e con-chi/non-con) e **Sala**
(si scelgono i presenti sulle poltrone, l'app propone la Top 5, **Play** elegge il film
e lo registra come visto). Stessa filosofia della TMS: **un file HTML singolo**, nessun
server, dati come JSON in una **cartella Google Drive condivisa**.

## ⚠️ Regole d'oro (non derogabili)

1. **NON pubblicare mai** (push su repo pubblico, `gh release create`, bump di versione)
   **senza un ok esplicito di Marco.** Le modifiche si accumulano in **commit locali**
   finché non dice "pubblica". (Regola dal 2026-07-22, dopo una release fatta di testa mia.)
2. **I CAD di Marco (`*.dxf`) sono rappresentazioni di STILE/idea, non geometrie da copiare.**
   Prendine composizione e vista, poi disegna con lo stile velluto dell'app e licenza
   artistica. (La replica letterale delle sedie era stata bocciata.)
3. **Proporre prima, implementare dopo** per scelte di prodotto non ovvie. Se una richiesta
   è ambigua (es. "simmetria verticale") **chiedi** invece di indovinare: sul layout Sala
   ho sprecato giri per non averlo fatto.
4. **Versioning: solo la terza cifra.** Ai bump incremento solo la patch (1.6.9 → 1.6.10),
   mai il minor/major — quello lo decide Marco e lo dice esplicitamente. (Regola dal
   2026-08-18, dopo aver alzato 1.6.0 → 1.7.0 di testa mia per i consigli «Per te».)

## Architettura

| Aspetto | Scelta |
|---|---|
| App | **`Movienaitor.html`** — HTML+CSS+JS inline, zero dipendenze runtime. È la fonte di verità del codice. |
| Dati | JSON in una cartella condivisa su Google Drive (niente server). "Rete" = Drive sincronizzato in locale da ciascuno. |
| Accesso file (browser) | File System Access API (Chrome/Edge), handle in IndexedDB. |
| Accesso file (desktop) | Wrapper **Electron** in `electron/`: picker nativo + bridge `window.mvnFS` (preload+IPC → `fs`). Renderer servito da `app://mvn`. |
| Repo | **Pubblico**: `github.com/marcomartinellione-create/Movienaitor`. Pubblico ⇒ auto-update senza token. I dati del gruppo NON stanno nel repo. |
| Aggiornamenti | Installer NSIS (electron-builder) + `electron-updater`. L'app installata si aggiorna da sola dalle Release. Versione browser: si sostituisce `Movienaitor.html` nella cartella Drive. |

## Struttura del progetto

```
Movienaitor.html          l'app (fonte unica)
Movienaitor.bat           avvio rapido dell'app PC (doppio clic): copia l'HTML nel
                          renderer e lancia Electron, installa le dipendenze la prima volta
SPECIFICA.md              regole di prodotto, formule, decisioni
CONCEPT-consigli.md       concept + tarature dei consigli «Per te» (§8.4-bis SPECIFICA)
HANDOFF.md                questo file
esempio-profilo.json      modello di un profilo (il roster reale NON è nel repo)
Stile home.dxf            CAD di stile della Sala (idea, non geometria)
Stile sedie.dxf           CAD di stile delle poltrone (idea, non geometria)
profili/                  roster reale del gruppo — GITIGNORATO (solo locale, va nel Drive)
.claude/serve.js          mini server statico per l'anteprima browser (porta 8137)
.claude/launch.json       config preview ("movienaitor")
electron/
  main.js                 processo main: picker cartella, bridge fs IPC, app://mvn, updater, stato finestra
  preload.js              espone window.mvnFS e window.mvnUpdate (contextIsolation+sandbox)
  copia-html.js           copia ../Movienaitor.html in renderer/index.html (prestart/predist)
  package.json            build electron-builder (NSIS), publish GitHub, version
  build/icon.ico|png      icona (ciak rosso/oro)
  renderer/index.html     GENERATO da copia-html — gitignorato, non toccare a mano
  dist/                   installer — gitignorato
```

## Modello dati (nella cartella condivisa su Drive)

```
config.json               chiavi API (TMDB/OMDb) + costanti formula (§8.4 SPECIFICA)
storico.json              {visioni:[{id,data,ts,tmdbId,titolo,partecipanti,proponenti}]}
archivio.json             {pronti:[tmdbId,...], dove:{}}  stato "pronto alla visione" (scrive l'host)
segnalazioni/<slug>.json  {segnalazioni:[{id,tipo,titolo,descrizione,gravita,contesto,versione,creato}]}
segnalazioni-stato.json   {stato:{id:{stato,priorita,aggiornato}}, eliminate:[id]}  (scrive l'host)
posters/<id>.jpg          locandine in cache (e <id>_b.jpg per gli sfondi)
profili/<slug>.json       un file per persona
recensioni/<slug>/<tmdbId>.json   recensioni personali (una cartella per utente, un file per film)
consigli/<slug>.json      {scartati:[{tmdbId,titolo}], aggiornato}  «non mi interessa» dei consigli (scrive solo il proprietario)
```

**Recensione** `{tmdbId, autore, creato, modificato, ultimaVisione?, inCorso?, votoPersonale(1–10, mezze stelle),
tags[], meta:{titolo,anno,generi,regista,durata,paese,cast,voto,votoFonte,locandina}, sezioni:[{titolo,testo}], link[]}`.
Le **sezioni sono flessibili** (aggiungi/rinomina/riordina/rimuovi). Voto mostrato stile Letterboxd
(5 stelle con mezze); export Markdown nel formato Obsidian di Marco. **`ultimaVisione`** di una
nuova recensione si pre-compila dalla data reale dello storico (`ultimaVisioneDi`/`ultimaVisioneMia`),
non da oggi. **`inCorso`** (v1.2.1): la recensione resta **sempre in cima** all'elenco (qualunque
ordinamento) con bordo oro + badge, finché non la si completa. Ordinamento di **default: per voto**
(desktop e mobile). Sezione UI: **Archivio** (tutti
gli utenti, ognuno la sua, sfogli le altrui in sola lettura). Rinomini v0.2.4: Catalogo→**Watch List**,
vecchio Archivio host→**Pronti alla visione**, il nome **Archivio** ora è le recensioni.

**Regola anti-conflitto (un solo scrittore per file):** ogni dispositivo scrive **solo**
il proprio `profili/<slug>.json`, la propria `recensioni/<slug>/` e il proprio
`segnalazioni/<slug>.json`; `storico.json`, `archivio.json` e `segnalazioni-stato.json`
li scrive solo il PC "host" (chi preme Play / prepara). Così Drive non crea copie in conflitto.

**Profilo** `{nome, slug, creato, colore, password?, generiPositivi?[], generiNegativi?[], lista:[voce]}`.
**Voce film** `{tmdbId, titolo, anno, uscita, durata, regista, generi, voto, votoFonte,
collezione?, collezioneNome?, locandina, desiderio(1–5), conChi[], nonCon[], aggiunto}`.
Stato "da vedere/visto" e i valori derivati NON si salvano: si ricalcolano dallo storico.

## Punti chiave nel codice (`Movienaitor.html`, tutto inline)

- **Stato**: oggetto `S` (demo, host, me, profili, storico, config, presenti, filtri,
  proiettato, archivioPronti/Filtro, …). `mioProfilo()`, `profiloDi()`, `coloreDi()`.
- **File system astratto**: `fsa` (browser FSA), `demoFS` (in-memoria), `electronFS`
  (bridge). `FS` punta a quello attivo. `inElectron = !!window.mvnFS`.
- **Persistenza "chi sei"/host**: `leggiMe/ricordaMe`, `leggiHost/ricordaHost` — in
  Electron via config di sistema (il localStorage su `app://mvn` NON persiste!), nel
  browser via localStorage.
- **API film**: `cercaFilm` (TMDB search), `dettagliFilm` (TMDB /movie + credits +
  external_ids → OMDb per voto IMDb; cattura `collezione`/`uscita`). `salvaImmagini`.
- **Logica**: `entryAttiva` (da vedere?) — spegne la voce sia per una serata dello
  storico sia per una **recensione** dell'utente (`visioneRecensione`: `ultimaVisione`,
  o `creato` se manca), con la stessa regola sulla data, così «rimettilo in lista»
  continua a funzionare; `visioniDaUltimaScelta` (attesa a numero di
  serate), `classifica()` (candidati → collasso saghe → filtri → punteggio
  D×B×W×M → Top 5). Vedi SPECIFICA §6–8.
- **Render**: `disegnaSala` (schermo+sipario, rosa 2-5, platea, adatta poltrone),
  `disegnaCatalogo` + `disegnaGeneriCatalogo` (barre generi), `disegnaArchivio`
  (host: scorta aggregata con flag pronto/ricerca/filtro, **oppure** `disegnaArchivioUtente`
  — la watch list di un utente in sola lettura, scelto dai chip `disegnaChiArchivio`;
  stato `S.archivioChi`), `disegnaSegnalazioni` (host), `disegnaImpostazioni`,
  `disegnaFiltri`, `poltronaSVG`.
- **Consigli «Per te»** (v1.7.0, desktop **e** mobile): `profiloGusto(slug)` costruisce il
  profilo dalle recensioni (peso per età `pesoRecensione`, media bayesiana `cgK`,
  normalizzazione su media e σ **ricalcolate ogni volta** → segue il gusto che cambia);
  `compatibilita()` dà l'indice coi pesi che si **ridistribuiscono** sui soli tratti noti;
  `fasciaConsiglio()` assegna le fasce per posizione + soglia; `generaConsigli()` pesca da
  `discover` + `recommendations` e riempie `S.cgPool` (candidati valutati, non filtrati).
  Scartati in `consigli/<slug>.json` (solo il proprio file), col **titolo** oltre all'id.
  **Attenzione**: `caricaConsigli()` va chiamata in `avviaApp()` e non in `caricaTutto()`,
  perché lì `S.me` non è ancora noto. Costanti in `CONFIG_DEFAULT.cgPesi`, non in
  Impostazioni (affollerebbero il pannello della Sala). Vedi CONCEPT-consigli.md.
  - **Niente tasto "Aggiorna"**: la sezione si rigenera da sé alla prima apertura e ogni
    volta che le recensioni sono cambiate da quando i consigli sono stati calcolati.
    Confronto tramite `firmaRecensioni()` (numero + voti + date di modifica) vs `S.cgFirma`.
  - **Filtri in tempo reale**: `consigliFiltrati()` rifiltra **all'istante** `S.cgPool`
    (nessuna rete) a ogni modifica; una ricerca TMDB vera parte dopo ~900ms di pausa
    (`cgTocca`/`cgTimer` desktop, `programmaConsigli` mobile) — rigenerare a ogni tasto
    costerebbe decine di chiamate per battuta.
  - **Gestione esclusi**: ⚙ Impostazioni → «Gestisci esclusi» (`modaleScartati` desktop,
    `modaleScartatiM` mobile) elenca `S.cgScartati` (Map id→titolo) con ripristino
    singolo o svuotamento. `salvaConsigli()` rilegge il file e fonde prima di scrivere
    (due sessioni aperte insieme non si cancellano i rifiuti a vicenda), ma **non
    rimette dentro** ciò che è stato tolto a mano nella sessione corrente — tracciato in
    `S.cgRipristinati`, altrimenti la fusione lo riproporrebbe (bug trovato testando).
- **Keyword TMDB**: arrivano gratis con `append_to_response=credits,external_ids,keywords`
  e vengono salvate in `meta.keywords` delle recensioni. Le recensioni vecchie si
  arricchiscono col tasto in «Per te» (`arricchisciKeyword`). Restano in inglese.
- **Modale protetto** (v1.2.1): `modaleProtetta()` = il modale ha classe `editor-grande`
  (solo l'editor recensioni). Clic sul backdrop ed Esc **non** lo chiudono (si perderebbe
  il lavoro): si chiude solo con Salva/Chiudi. Gli altri modali si chiudono normalmente.
- **Streaming** (v1.2.1, §5.3 SPECIFICA): `providersFilm(tmdbId)` (TMDB watch/providers, IT,
  flatrate, cache in `S.providersCache`), `serviziGruppo`/`chiHaServizio`/`badgeStreaming`;
  `serviziStreaming` nel profilo (`disegnaServizi`). Badge nella scheda e in Pronti; tasto
  «rileva da TMDB» in «dove vederlo». `PROVIDER_ALIAS` normalizza i nomi TMDB→`DOVE_STREAMING`.
- **Pronti alla visione**: `S.archivioChi` è un **Set** (multi-utente); `disegnaArchivio`
  filtra la scorta ai film voluti dai selezionati, mostra chi li vuole + pronto + streaming.
- **Lista completa** (v1.2.0): `classifica()` torna anche `tutti` (rosa intera);
  `modaleListaCompleta` la mostra e `S.proiettato` può puntare a QUALSIASI film di
  `S.tutti`, non solo alla Top 5. `aggiornaListaCompleta(n)` aggiorna il pulsante.
- **Segnalazioni** (v1.2.0): `caricaSegnalazioni`, `salvaMieSegnalazioni` (solo il mio
  file), `salvaStatoSegnalazioni` (solo host), `modaleSegnala` (pulsante 🐞 in basso a
  sinistra, per tutti), `disegnaSegnalazioni` (tab host). Vedi SPECIFICA §11c.
- **Locandine**: `mostraLocandina(box, film)` — l'unico modo giusto di mostrarle in un
  contenitore `<img hidden> + .segnaposto`: **va rimosso il segnaposto**, che nel DOM sta
  dopo l'img e altrimenti la copre (era il bug della scheda film, corretto in v1.2.0).
  `urlImmagine` ripesca da TMDB gli URL mancanti nelle voci vecchie.
- **Gate**: `gateBenvenuto/Riconnetti/NonSupportato/BenvenutoElectron`, `gateNome(conIndietro)`
  (scelta profilo + host + password + tasto Indietro), `entra`, `avviaApp`, `applicaHost`.
- **Modali**: `apriModale/chiudiModale`, `confermaModale`, `promptPassword`,
  `apriColorPicker` (tavolozza CAD + HSV), `modaleAggiungi/Scheda/Play`.
- **Sipario**: `#schermo` contiene `#schermo-inner` (contenuto, rifatto ad ogni render) +
  due `.tenda` persistenti; `disegnaSala` commuta `schermo.classList` `aperto` (film) /
  chiuso (vuoto). Le tende hanno una transizione CSS.
- **Init**: `init()` sceglie il ramo (Electron / browser FSA / non supportato).

## Electron (`electron/`)

- `main.js`: cartella scelta col picker, persistita in `userData/mvn-config.json`
  (con anche `lastProfile`, `host`, `finestra`). Bridge IPC `mvn:*` (readJSON/writeJSON/
  writeBlob/list/fileURL/scarica/getMe/setMe/getHost/setHost). Renderer da `app://mvn`
  (origine stabile). **Stato finestra** (fullscreen/maximized/bounds) ripristinato
  all'avvio, F11 per il fullscreen. **Updater** guardato (solo se `app.isPackaged`).
  C'è un **hook diagnostico** attivo solo con env `MVN_DIAG` (vedi Test).
- `preload.js`: espone `window.mvnFS` e `window.mvnUpdate`.

## Ciclo di lavoro

1. Modifica **`Movienaitor.html`** (fonte unica). Se tocchi il renderer per Electron non
   serve altro: `copia-html.js` lo rigenera a `npm start`/`npm run dist`.
2. **Testa in demo** nel browser (vedi sotto). Verifica sempre in prima persona.
3. **Commit locale** con messaggio descrittivo. Aggiorna SPECIFICA.md se cambiano regole/funzioni.
4. **Pubblica SOLO su comando esplicito di Marco** (vedi Regole d'oro). Al comando:
   bump della **sola patch** in `APP_VERSION` (`Movienaitor.html`) + `version`
   (`electron/package.json`), stessa cifra fra i due file; build, push, release.
   Minor/major solo se Marco lo dice esplicitamente (regola d'oro #4).

## Build & release

```bash
# avvio rapido dell'app PC: doppio clic su Movienaitor.bat nella radice
# (copia l'HTML nel renderer e lancia Electron, installa le dipendenze la prima volta)

# anteprima browser (demo, senza cartella né chiavi)
node .claude/serve.js            # → http://localhost:8137

# app desktop
cd electron
npm install                      # prima volta (electron + electron-builder)
npm start                        # dev (copia l'HTML nel renderer e lancia)
npm run dist                     # → dist/Movienaitor-Setup-<v>.exe + latest.yml
```

**Pubblicare una release (dopo l'ok di Marco):**
```bash
# 1) bump versione in Movienaitor.html (APP_VERSION) e electron/package.json (version)
# 2) build
cd electron && npm run dist
# 3) commit + push + release (gh è autenticato con permessi di scrittura)
git add -A && git commit -m "vX.Y.Z: ..." && git push
gh release create vX.Y.Z "dist/Movienaitor-Setup-X.Y.Z.exe" "dist/latest.yml" \
  -R marcomartinellione-create/Movienaitor -t "Movienaitor vX.Y.Z" -n "note"
```
`latest.yml` **deve** essere allegato (senza, niente auto-update). L'app installata degli
utenti scarica la nuova versione al prossimo avvio.

## Test

- **Demo**: bottone "Dai un'occhiata con i dati di prova" → dati finti in memoria
  (6 profili, storico, saga Dune I/II per testare le collezioni). Nessun salvataggio.
- **Anteprima browser** (`.claude/serve.js`, porta 8137) + strumenti browser MCP:
  `read_console_messages` (errori), `javascript_tool` (guida lo stato/verifica logica).
  ⚠️ Se il pannello browser non è a video, `getBoundingClientRect` torna **0** e gli
  screenshot vanno in timeout: misura da `window.innerHeight`/`getComputedStyle`, e per
  gli screenshot usa **Chrome headless** (`--screenshot`) su `http://localhost:8137`.
  Per catturare una vista interna serve interazione: si aggiunge un aggancio temporaneo
  in `init()` su un hash (es. `#demo`) e lo si **rimuove** dopo lo screenshot.
- **Electron end-to-end**: `main.js` ha `diagnostica()` attiva con env `MVN_DIAG=1`
  (opz. `MVN_DIAG_DIR`=<cartella> per testare il bridge fs, `MVN_DIAG_SETME`=<slug>).
  Lancia da `electron/`: `electron . --user-data-dir=<temp>` per isolare la config.
  Serve a verificare persistenza profilo/finestra e roundtrip fs senza toccare i dati reali.

## Convenzioni di stile (dalla revisione estetica)

- **Colori solo da token** in `:root`. Oltre a quelli storici: `--bordo` (pannelli e schede)
  e `--bordo2` (righe compatte) — prima erano hex quasi identici sparsi (`#4a2c33`,
  `#3a2229`); `--stella-off` (stella non assegnata, era diversa tra catalogo ed editor);
  `--velo-badge` (fondo dei badge sulle locandine); `--rapida`/`--media` per le transizioni.
  Sul mobile ci sono gli equivalenti `--su-oro`, `--sel`, `--velo-badge`, `--rapida`.
- **Niente `style=` inline che duplica il CSS**: se serve una regola, va nel foglio
  (es. `.arch-filtro input[type=search]`, `.sezione-titolo.prima`, `.griglia .vuoto-msg`).
- **`.aiuto`** è il testo di servizio piccolo e smorzato; **`.etich`** l'etichetta di gruppo
  nei modali (`.etich.sotto` per le sotto-etichette). Entrambe hanno una regola globale:
  prima `.aiuto` funzionava solo dentro `.campo` e `.etich` non esisteva affatto.
- **`.testo-link`** vira all'oro; il rosso è riservato a `.testo-link.pericolo`
  (rimuovi / elimina / ritira), non a «modifica» o «rileva».
- **Locandine**: l'immagine sta sopra il segnaposto con `z-index`, mai mandando il
  segnaposto dietro con `z-index:-1` (sparirebbe dentro il fondo del contenitore).
- **Caselle di spunta** ridisegnate in tinta col velluto; attenzione che una regola
  `input{width:100%}` non le stiri (serve `:not([type=checkbox])`).

## Gotcha

- **localStorage NON persiste su `app://mvn`** (Electron): profilo/host/stato finestra
  vanno nel config di sistema, non in localStorage.
- **PowerShell qui è 5.1**: niente heredoc `<<`, niente `&&`. Per messaggi di commit
  multilinea usa un file con `git commit -F`, oppure `-m` multipli. `Set-Content -Encoding utf8`
  aggiunge un **BOM** che rompe `JSON.parse`: per scrivere JSON che l'app rilegge usa Node.
- **Riscritture di cronologia git** (orphan/force-push) sono bloccate dal classificatore
  auto: servono solo con ok esplicito, e vanno spiegate.
- **Immagini TMDB in Electron**: scaricate lato main (niente CORS). Nel browser è best-effort.
- **exe non firmato** → SmartScreen al primo avvio ("Esegui comunque"): normale.
- La cartella `profili/` con i nomi reali è **gitignorata**: mai committarla nel repo pubblico.
  Se serve rigenerare il roster, vedi `esempio-profilo.json`.

## Cosa c'è (sintesi funzioni)

Sala con schermo alto + **sipario** animato, rosa 2-5 (clic per proiettare, si torna al 1º),
platea poltrone dall'alto in stile velluto, filtri STASERA (genere/durata/regista);
Catalogo con ricerca TMDB, stelle desiderio, chip compagnia, **barre percentuali dei generi**,
conferma alla rimozione; **Archivio** (solo host) a icone piccole con flag "pronto" e filtro;
selettore **colore poltrona** (tavolozza CAD + HSV); **password** profilo (anti-errore);
**saghe** (propone il 1º episodio non visto); **attesa** a numero di serate; cambio utente
con Indietro; app desktop con auto-update, memoria profilo e stato finestra.
Dalla **v1.2.0**: **Lista completa** in Sala (tutti i film filtrati, in ordine di
pertinenza, proiettabili anche fuori Top 5), **ricerca per titolo** in Pronti alla
visione, **🐞 Segnalazioni** (bug/idee da tutti, gestione dell'host).

**Recensire = visto** (2026-08-18): una recensione vale come visione per il suo autore, su
desktop e mobile. Il film sparisce da «da vedere», compare fra i «già visti» con la data
della recensione (`ultimaVisione`, o il giorno in cui è stata scritta) e il segno
«✍ recensito», e **non entra più nella rosa della Sala** per quella persona (resta in
gioco per gli altri, §6.2). Fra i visti finiscono anche i film recensiti che non sono mai
passati dalla watch list. Vedi SPECIFICA §3.3 e §5.2 C5.

## App mobile (`app-mobile/`)

APK Capacitor, web in `www/index.html` (file unico, come il desktop), plugin nativo SAF in
`native/MvnSafPlugin.java`. Build in cloud: GitHub Actions → "Build APK". Cinque sezioni:

- **Sala** (dalla v1.2.0): stessa `classifica()` del desktop, schermo 16/9 col sipario
  animato, poltrone in velluto `poltronaSVG`/`disegnaPlateaM`; niente mensola 2-5, solo lo
  schermo + "lista completa"; **tasto ▶ Play** = `modalePlayM`/`registraVisioneM`, che
  rilegge `storico.json` fresco e fonde per `id` (più dispositivi possono registrare senza
  perdere voci).
- **Lista** divisa in *Da vedere*/*Già visti* via `entryAttiva` ("rimetti in lista" azzera
  `aggiunto`). Fra i visti ci sono anche i film **recensiti** e mai messi in lista: la
  scheda si costruisce da `meta` della recensione, non è cliccabile (non c'è una voce da
  modificare) e prende `aggiunto` dalla data di visione, altrimenti l'ordinamento
  predefinito (per aggiunta) la manderebbe in fondo. `ultimaVisioneStorico` separa la
  data della serata da quella della recensione: serve al segno «✍ recensito».
- **Recensioni** con lo stesso editor a sezioni del desktop; rileva i servizi streaming da
  TMDB (§5.3 SPECIFICA).
- **✨ Per te** (v1.7.0): stessa logica dei consigli del desktop, riscritta per questo file
  (`profiloGusto`/`compatibilita`/`fasciaConsiglio`/`perche` duplicate qui, `S.me` è un
  oggetto non uno slug). Pannello filtri a bottom sheet (`apriFiltriConsigli`), esclusi
  gestiti da ⚙ → «Gestisci» (`modaleScartatiM`). Stessa auto-rigenerazione del desktop
  (`firmaRecensioni` + `S.cgFirma`), stesso `S.cgRipristinati` per non vanificare i
  ripristini alla fusione di `salvaConsigliM()`.
- **🐞 Segnala**.

Login: **ricorda l'ultimo profilo sbloccato** (`LS 'sbloccato'`; password richiesta solo
al cambio utente). Per file arbitrari nella cartella il plugin espone
`leggiPercorso`/`scriviPercorso`/`elencaJson` (JS: `fsLeggiPercorso`/`fsScriviPercorso`/
`fsElencaJson`). Per provare la UI nel browser serve un finto `window.Capacitor.Plugins.MvnSaf`
(niente SAF fuori dall'APK): si stubba, si chiama `caricaCartella('fake')` e `entra(slug)`.

**Pubblicare l'APK** (come la Compila.bat della SustEner): `app-mobile\Pubblica APK.bat`
→ chiede la versione → `tools/pubblica-apk.js` scrive la versione in `package.json` +
`APP_VERSION`, committa e pusha `app-mobile/`, lancia il workflow in cloud, aspetta,
scarica l'artifact e copia `Movienaitor-<v>.apk` + `versione.json` nella cartella di
`pubblica.txt` (`G:\My Drive\4 - Movienaitor\Latest APK`). L'app legge quel
`versione.json`, mostra il banner e installa via FileProvider (`installaApk`).
`--prova` fa un giro a vuoto, `--locale` compila sul PC. **Attenzione: lo script pusha**
— si lancia solo quando Marco vuole pubblicare (regola d'oro #1).

## Punti aperti / idee

- Attesa: oggi conta **tutte** le serate dall'ultima "vittoria" (anche assenti) — Marco
  può volerla ristretta alle sole serate presenti.
- Possibili v1.x: statistiche di gruppo, serie TV, decomposizione `src/` se il file cresce.
- **Consigli «Per te», appendice A** (CONCEPT-consigli.md): usare il testo delle
  recensioni (lessico personale calcolato in locale) come tratto in più nell'indice di
  compatibilità — idea rimandata, non implementata.
- Prima prova reale col gruppo: cartella Drive condivisa + chiave TMDB (+ OMDb) in Impostazioni.
