# 🎬 Movienaitor

La sala dei film tra amici: ognuno tiene la propria lista di film da vedere (con quanto
li desidera e con chi sì/no), la sera si selezionano i presenti sulle poltrone e l'app
propone i 5 film più adatti. **Play** elegge il film della serata e lo registra per tutti.

Filosofia: **un solo file HTML**, nessun server. I dati vivono come JSON in una
**cartella condivisa su Google Drive** sincronizzata in locale — è quella la vostra
"rete". Il codice è pubblico; i vostri dati (chi c'è, cosa guardate) restano privati
nella vostra cartella, non in questo repo.

## Due modi per usarla

**App desktop (consigliata)** — installa `Movienaitor-Setup.exe`, all'avvio scegli la
cartella condivisa col dialogo di sistema. Niente permessi del browser, locandine in
cache per l'uso offline, e **si aggiorna da sola**.

**Nel browser** — apri `Movienaitor.html` (che sta nella cartella Drive) con **Chrome o
Edge** e collega la cartella (File System Access API). È lo stesso identico programma.

Senza cartella si può provare la **demo** (dati finti, nessun salvataggio).

## Setup: la cartella condivisa e gli utenti

Movienaitor non ha un server: il gruppo si tiene in sincrono con **una cartella Google
Drive condivisa**. Si prepara una volta sola.

### 1. Creare e condividere la cartella

1. Su Google Drive crea una cartella, es. **`Movienaitor`**.
2. **Condividila** con i Google account dei tuoi amici, dando permesso di **Modifica**
   (Editor). In alternativa una *Drive condiviso* (Shared Drive) va benissimo.
3. Ognuno installa **Google Drive per desktop** e attiva la sincronizzazione, così la
   cartella compare come una normale cartella locale sul PC di ciascuno.

### 2. Primo avvio

- Apri l'app desktop (o `Movienaitor.html` nel browser) e **scegli quella cartella**.
- L'app crea da sola `config.json` e `storico.json`.
- In **⚙ Impostazioni** incolla le **chiavi API** (una volta sola, valgono per tutti,
  finiscono in `config.json`):
  - **TMDB** — ricerca film, locandine, metadati: gratuita su themoviedb.org → *Settings → API* (serve la chiave "API Key (v3 auth)").
  - **OMDb** — media voti IMDb, facoltativa: gratuita su omdbapi.com.

### 3. Gli utenti (profili)

Non c'è nessuna lista di utenti "cablata": **gli utenti sono i file dentro `profili/`**.
Un profilo è un file `profili/<nome>.json` con nome, colore della poltrona e lista film.
Ci sono due modi per crearli:

- **Dall'app (semplice):** al primo avvio ognuno scrive il proprio nome → l'app crea il
  suo `profili/<nome>.json` e la sua poltrona compare per tutti. Ogni nuovo amico che
  arriva fa lo stesso: nuovo file, nuova poltrona.
- **A mano (per preparare il gruppo in anticipo):** lascia cadere nella sottocartella
  `profili/` un file per persona, con questo formato (vedi [`esempio-profilo.json`](esempio-profilo.json)):

  ```json
  {
    "nome": "Mario",
    "slug": "mario",
    "creato": "2026-07-22",
    "colore": "#c9a45c",
    "lista": []
  }
  ```

  `slug` = il nome tutto minuscolo senza spazi (è anche il nome del file). `colore` è
  esadecimale. `lista` parte vuota: si riempie dal Catalogo.

### 4. Struttura finale della cartella

```
Movienaitor/            ← la cartella condivisa su Drive
├── Movienaitor.html    ← (opzionale) per aprirla dal browser
├── config.json         ← chiavi API + costanti della formula
├── storico.json        ← registro delle serate (fonte di verità dei "visti")
├── posters/            ← locandine e sfondi in cache
└── profili/
    ├── mario.json
    └── … un file per persona
```

**Regola d'oro (niente conflitti su Drive):** ogni dispositivo scrive **solo** il proprio
`profili/<slug>.json`; `storico.json` lo scrive solo chi preme **Play** (in pratica il PC
collegato alla TV). Così Drive non crea mai "copie in conflitto".

## Uso di tutti i giorni

1. Scegli il tuo nome (resta ricordato sul tuo dispositivo).
2. **Catalogo** → cerca i film, imposta *quanto* vuoi vederli (1–5) e con chi sì / con chi no.
3. **Sala** → clicca le poltrone dei presenti, imposta durata/regista/genere della serata,
   e **▶ Play** sul film in cima. Viene registrato come visto per tutti i presenti.

Regole e formule complete in [SPECIFICA.md](SPECIFICA.md); il layout della Sala segue
`Stile home.dxf`.

## Aggiornamenti

- **App desktop:** si aggiorna **da sola**. Essendo il repo pubblico, all'avvio controlla
  le [Release](https://github.com/marcomartinellione-create/Movienaitor/releases), scarica
  la versione nuova e propone il riavvio. Nessuna configurazione.
- **Versione browser:** sostituisci `Movienaitor.html` nella cartella Drive; alla prossima
  apertura tutti hanno la versione nuova.

Pubblicare una nuova versione (per chi sviluppa):

1. Bump `version` in `electron/package.json` e `APP_VERSION` in `Movienaitor.html`.
2. `cd electron && npm run dist` → `dist/Movienaitor-Setup-<v>.exe` + `latest.yml`.
3. `gh release create v<v> "dist/Movienaitor-Setup-<v>.exe" "dist/latest.yml" -t "v<v>" -n "note"`
   (oppure `npm run publish`).

## Sviluppo

Il codice è tutto in `Movienaitor.html` (fonte unica). Anteprima nel browser:
`node .claude/serve.js` → http://localhost:8137 (la demo permette di provare senza
cartella né chiavi).

**App desktop** in `electron/` — carica lo stesso `Movienaitor.html`:

```
cd electron
npm install        # prima volta (electron + electron-builder)
npm start          # sviluppo (copia l'HTML nel renderer e lancia)
npm run dist       # crea dist/Movienaitor-Setup-<versione>.exe + latest.yml
```

`copia-html.js` (prestart/predist) tiene `electron/renderer/index.html` allineato al
sorgente: non modificarlo a mano. La versione desktop rileva il ponte `window.mvnFS`;
il browser usa la File System Access API.

## Crediti

- Dati e immagini dei film: [TMDB](https://www.themoviedb.org). *This product uses the
  TMDB API but is not endorsed or certified by TMDB.*
- Media voti IMDb via [OMDb API](https://www.omdbapi.com).
