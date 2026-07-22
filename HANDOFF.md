# HANDOFF — Movienaitor

> Manuale operativo per continuare a lavorare sul progetto. Contesto rapido +
> convenzioni + workflow. Per le regole di prodotto e le formule vedi **SPECIFICA.md**.
> **Stato: v0.1.7** (pubblicata). Cartella progetto: `D:\4 - Programmi\Movienaitor`.

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
SPECIFICA.md              regole di prodotto, formule, decisioni
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
archivio.json             {pronti:[tmdbId,...]}  stato "pronto alla visione" (scrive l'host)
posters/<id>.jpg          locandine in cache (e <id>_b.jpg per gli sfondi)
profili/<slug>.json       un file per persona
```

**Regola anti-conflitto (un solo scrittore per file):** ogni dispositivo scrive **solo**
il proprio `profili/<slug>.json`; `storico.json` e `archivio.json` li scrive solo il PC
"host" (chi preme Play / prepara). Così Drive non crea copie in conflitto.

**Profilo** `{nome, slug, creato, colore, password?, lista:[voce]}`.
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
- **Logica**: `entryAttiva` (da vedere?), `visioniDaUltimaScelta` (attesa a numero di
  serate), `classifica()` (candidati → collasso saghe → filtri → punteggio
  D×B×W×M → Top 5). Vedi SPECIFICA §6–8.
- **Render**: `disegnaSala` (schermo+sipario, rosa 2-5, platea, adatta poltrone),
  `disegnaCatalogo` + `disegnaGeneriCatalogo` (barre generi), `disegnaArchivio`
  (host, lista compatta + flag pronto + filtro), `disegnaImpostazioni`, `disegnaFiltri`,
  `poltronaSVG`.
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
   bump `APP_VERSION` in `Movienaitor.html` + `version` in `electron/package.json`
   (stessa cifra), build, push, release.

## Build & release

```bash
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

## Punti aperti / idee

- Attesa: oggi conta **tutte** le serate dall'ultima "vittoria" (anche assenti) — Marco
  può volerla ristretta alle sole serate presenti.
- Possibili v1.x: statistiche di gruppo, serie TV, decomposizione `src/` se il file cresce.
- Prima prova reale col gruppo: cartella Drive condivisa + chiave TMDB (+ OMDb) in Impostazioni.
