# 🎬 Movienaitor

**Scegliere insieme cosa guardare, giocare o leggere — e tenere memoria di com'è andata.**

Ognuno tiene la propria lista con quanto desidera ogni titolo e con chi sì / con chi no.
La sera si toccano le poltrone di chi c'è e l'app calcola la classifica della serata: chi
non sceglie da un po' pesa di più, così a turno tocca a tutti senza doverci pensare.
**▶ Play** elegge il titolo e lo registra per tutti i presenti.

Quattro categorie indipendenti, ciascuna con la sua stanza:

| | Categoria | Stanza | Libreria |
|---|---|---|---|
| 🎬 | **Film** | la sala col sipario | TMDB |
| 📺 | **Serie TV** | il salotto, con il segnalibro degli episodi | TMDB |
| 🎮 | **Videogiochi** | la postazione, con la percentuale di completamento | RAWG |
| 📚 | **Libri** | la biblioteca, col libro che si apre sullo scaffale | Open Library |

Oltre alla Sala: **elenco personale**, **recensioni** con voto e sezioni (e riferimenti
incrociati fra una recensione e l'altra), **suggerimenti** calcolati sul proprio gusto.

Filosofia: **un solo file HTML**, nessun server. I dati vivono come JSON in una
**cartella condivisa su Google Drive** sincronizzata in locale — è quella la vostra
"rete". Il codice è pubblico; i vostri dati (chi c'è, cosa guardate) restano privati
nella vostra cartella, non in questo repo.

## Tre modi per usarla

**App desktop (consigliata)** — installa `Movienaitor-Setup.exe`, all'avvio scegli la
cartella condivisa col dialogo di sistema. Niente permessi del browser, locandine in
cache per l'uso offline, e **si aggiorna da sola**.

**Nel browser** — apri `Movienaitor.html` (che sta nella cartella Drive) con **Chrome o
Edge** e collega la cartella (File System Access API). È lo stesso identico programma.

**App mobile (Android)** — scarica l'APK dall'ultima [Release](https://github.com/marcomartinellione-create/Movienaitor/releases),
installalo (va concesso il permesso "installa da fonti sconosciute" al gestore file
usato) e collega la cartella condivisa del tuo gruppo. Da lì in poi gli aggiornamenti
l'app li controlla e li propone da sola, senza bisogno di tornare su GitHub a mano —
vedi «Aggiornamenti» più sotto.

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
  - **TMDB** — film e serie TV: locandine, trama, cast, dove vederlo. Gratuita su themoviedb.org → *Settings → API* (serve la chiave "API Key (v3 auth)").
  - **RAWG** — videogiochi: copertine, durata, obiettivi. Gratuita su rawg.io/apidocs, 20.000 richieste al mese.
  - I **libri** usano Open Library, che non richiede nessuna chiave.

  Ogni profilo può anche mettere le **proprie** chiavi personali, che prevalgono su
  quelle condivise: utile per non esaurire la quota di uno solo.

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
├── Manuale.html        ← (opzionale) il manuale, si apre col doppio clic
├── config.json         ← chiavi API + costanti della formula
├── storico.json        ← le serate di FILM (fonte di verità dei "visti")
├── posters/            ← locandine e sfondi in cache
├── profili/
│   ├── mario.json      ← un file per persona: liste di tutte le categorie
│   └── …
├── recensioni/<nome>/  ← una recensione per file
├── segnalazioni/       ← bug e idee (solo nella cartella di chi sviluppa)
├── serie/              ← le altre tre categorie hanno lo stesso impianto
├── giochi/                (storico, recensioni, consigli), ciascuna
└── libri/                 nella propria sottocartella
```

**Regola d'oro (niente conflitti su Drive):** ogni dispositivo scrive **solo** i propri
file — il proprio profilo, le proprie recensioni. Lo storico è l'unico a più mani: prima
di scriverlo viene riletto e fuso per identificativo di sessione, così due dispositivi
che registrano insieme non si sovrascrivono. Drive non crea mai "copie in conflitto".

## Uso di tutti i giorni

1. Scegli il tuo nome (resta ricordato sul tuo dispositivo).
2. **Watch List** → cerca i titoli, imposta *quanto* vuoi vederli (1–5) e con chi sì / con chi no.
3. **Sala** → clicca le poltrone dei presenti, imposta i filtri della serata (durata,
   genere, regista) e **▶ Play** sul titolo in cima. Viene registrato per tutti i presenti.
4. **Recensioni** → voto e testo in sezioni; per i videogiochi anche la percentuale di
   completamento, presa dagli obiettivi quando la libreria li espone.
5. **Per te** → suggerimenti costruiti sulle proprie recensioni (ne servono almeno tre).

La categoria si cambia col comando in basso a destra, e ognuno può disattivare le
categorie che non lo interessano: sparisce dalla propria app e dalla Sala degli altri.

Guida completa all'uso — funzionamento, configurazione, risoluzione dei problemi — in
[GUIDA.md](GUIDA.md) o, nella stessa cartella del progetto, la versione impaginata
[Manuale.html](Manuale.html) (si apre con un doppio clic, nessuna installazione). Le
formule sono in [SPECIFICA.md](SPECIFICA.md); il layout della Sala segue `Stile home.dxf`.

## Aggiornamenti

- **App desktop:** si aggiorna **da sola**. Essendo il repo pubblico, all'avvio controlla
  le [Release](https://github.com/marcomartinellione-create/Movienaitor/releases), scarica
  la versione nuova e propone il riavvio. Nessuna configurazione.
- **Versione browser:** sostituisci `Movienaitor.html` nella cartella Drive; alla prossima
  apertura tutti hanno la versione nuova.
- **App mobile:** stessa fonte, le [Release](https://github.com/marcomartinellione-create/Movienaitor/releases).
  L'app controlla da sola l'ultima release a ogni apertura; se trova una versione più
  recente la scarica e la installa — vale per chiunque l'abbia installata, non serve
  essere nella stessa cartella condivisa di nessuno.

Pubblicare una nuova versione (per chi sviluppa):

1. Bump del numero di versione in **sette** file — le copie dentro le build
   (`electron/renderer/`, `app-mobile/www/Manuale.html`) si rifanno da sole:

   | File | Dove |
   |---|---|
   | `electron/package.json` | `"version"` |
   | `app-mobile/package.json` | `"version"` — da qui il `versionName` dell'APK |
   | `Movienaitor.html` | `APP_VERSION` |
   | `app-mobile/www/index.html` | `APP_VERSION` |
   | `GUIDA.md` | riga di chiusura «Manuale riferito alla versione …» |
   | `Manuale.html` | stessa riga, dentro il blob JSON |
   | `docs/manuale.html` | rigenerato al passo 2, non si tocca a mano |

   I due `package-lock.json` portano anch'essi un numero di versione, ma si allinea
   da sé al prossimo `npm install`: non vanno toccati a mano.

2. Manuale allineato alle modifiche (`GUIDA.md` e `Manuale.html`, stesso testo), poi
   `node strumenti/pagina.js` per rifare `docs/manuale.html`: è quello che GitHub Pages
   pubblica, e senza questo passo la pagina resta indietro.
3. `cd electron && npm run dist` → `dist/Movienaitor-Setup-<v>.exe`, il suo `.blockmap`
   e `latest.yml`.
4. APK, due strade equivalenti:
   - **in locale:** `cd app-mobile && .\build-apk.ps1` → `Desktop\Movienaitor-APK\Movienaitor.apk`.
     Lancialo nudo: con `2>&1` o una pipe i warning di npm diventano errori terminanti;
   - **in cloud:** l'azione **Build APK** (`.github/workflows/build-apk.yml`) parte da sé
     a ogni push che tocca `app-mobile/`; a fine corsa
     `gh run download <run-id> -n movienaitor-apk -D dist`.

   In entrambi i casi rinominalo `Movienaitor-<v>.apk`.
5. Commit, poi **tag e push del tag**: `git tag -a v<v> -m "…" && git push origin v<v>`.
   L'app mobile legge `tag_name` dalla release, quindi senza tag non vede niente.
6. `gh release create v<v> --title "v<v>" --notes-file note.md "…-Setup-<v>.exe" "…-Setup-<v>.exe.blockmap" "latest.yml" "Movienaitor-<v>.apk"`

   Tutti e quattro gli allegati servono: `latest.yml` e il `.blockmap` sono
   l'aggiornamento automatico del PC, l'APK quello del telefono. La **prima riga** delle
   note diventa il testo che l'app mobile mostra come novità.

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

- Film e serie TV: [TMDB](https://www.themoviedb.org). *This product uses the TMDB API
  but is not endorsed or certified by TMDB.*
- Videogiochi: [RAWG](https://rawg.io).
- Libri: [Open Library](https://openlibrary.org) e [Wikidata](https://www.wikidata.org)
  (quest'ultimo per ritrovare copertina e numero di pagine dall'edizione in altra lingua
  della stessa opera).
