# Movienaitor — Specifica funzionale

> **v0.1** (2026-07-21) — approvata e **implementata** in `Movienaitor.html` v0.1.0.
> App per scegliere con gli amici quale film guardare. Stessa linea tecnica della TMS
> (Training Monitor System): file HTML singolo, dati JSON in cartella condivisa, niente server.

## 1. Visione

Una "sala cinema" virtuale: ognuno tiene nel proprio **Catalogo** la lista dei film che
vuole vedere (con quanto li vuole vedere e con chi sì/no); la sera, nella **Home**, si
selezionano i presenti sulle poltrone, si impostano i vincoli della serata (durata, ed
eventualmente regista/genere) e l'app propone i **5 film più "gettonati"** calcolati su
desiderio, equità nel tempo e vincoli di compagnia. Il primo classificato campeggia sul
proiettore; **Play** lo elegge film della serata e lo registra come visto per tutti i
presenti.

## 2. Linea tecnica (eredità TMS)

| Aspetto | Scelta |
|---|---|
| App | **File HTML singolo** `Movienaitor.html` (HTML+CSS+JS inline, zero dipendenze runtime) |
| Distribuzione | L'HTML vive **dentro la cartella condivisa su Drive**: aggiornare l'app = sovrascrivere il file, Drive lo porta a tutti |
| Accesso dati | Cartella collegata via **File System Access API** (Chrome/Edge), handle persistito in IndexedDB — identico alla modalità browser della TMS |
| Server | Nessuno. La "rete" è la cartella Google Drive sincronizzata in locale da ciascuno |
| Internet | Serve **solo nel Catalogo** per cercare film (API TMDB); la Home funziona interamente offline sui JSON e sulle locandine in cache |
| Sorgente | Si parte a file singolo; se cresce si decompone in `src/` + `tools/build.js` come la TMS |
| Wrapper Electron | **Sì** (`electron/`): app desktop che carica lo STESSO `Movienaitor.html`. In Electron niente FSA: la cartella Drive si sceglie col picker nativo e l'I/O passa dal ponte `window.mvnFS` (preload+IPC verso `fs`). Installer NSIS auto-aggiornante, icona propria |
| Repo GitHub | **Pubblico** (`marcomartinellione-create/Movienaitor`): sorgente + canale di rilascio. Pubblico ⇒ l'auto-update dell'app desktop funziona senza token. I dati del gruppo NON stanno qui: vivono solo nella cartella Drive |
| Modalità demo | Dall'ingresso: dati finti in memoria (6 profili, storico), nessun salvataggio — per provare l'app senza cartella né chiavi API |

## 3. Dati e sincronizzazione

### 3.1 Struttura della cartella condivisa

```
Movienaitor/                  ← cartella condivisa su Google Drive
├── Movienaitor.html          ← l'app
├── config.json               ← chiavi API + costanti della formula (condiviso)
├── storico.json              ← registro delle visioni (fonte di verità dei "visti")
├── posters/
│   └── <tmdbId>.jpg          ← locandine in cache (~50 KB l'una, TMDB w500)
└── profili/
    ├── marco.json            ← un file per persona
    ├── elena.json
    └── ...
```

### 3.2 Regola d'oro anti-conflitto: **un solo scrittore per file**

Google Drive non fonde le modifiche: se due dispositivi scrivono lo stesso file crea
"copie in conflitto". Quindi:

- ogni dispositivo scrive **solo il proprio** `profili/<slug>.json`;
- `storico.json` lo scrive **solo il dispositivo che preme Play** (il "proiezionista"
  della serata — in pratica uno solo, il PC collegato alla TV);
- `posters/` è idempotente (stesso nome ⇒ stesso contenuto, sovrascrivere è innocuo);
- "salvato come visto nei profili di tutti" si ottiene **senza** scrivere nei file altrui:
  lo storico è la fonte di verità e ogni app deriva i "visti" di una persona filtrando lo
  storico per il suo nome. (Facoltativo: al proprio avvio ciascuna app può ricopiarli nel
  proprio JSON — sempre e solo scrittura del proprio file.)
- Le voci dello storico hanno un `id` univoco (timestamp+autore): se mai comparisse una
  copia in conflitto, la fusione è l'unione delle voci per `id`.

### 3.3 Schema `profili/<slug>.json`

```json
{
  "nome": "Marco",
  "slug": "marco",
  "creato": "2026-07-21",
  "colore": "#c9a45c",
  "lista": [
    {
      "tmdbId": 438631,
      "titolo": "Dune",
      "anno": 2021,
      "durata": 155,
      "regista": "Denis Villeneuve",
      "generi": ["Fantascienza", "Avventura"],
      "voto": 8.0,
      "locandina": "posters/438631.jpg",
      "desiderio": 5,
      "conChi": [],
      "nonCon": ["cristina"],
      "aggiunto": "2026-07-21"
    }
  ]
}
```

- `voto` = media voti IMDb (vedi §5.1).
- `conChi` (white list) e `nonCon` (black list): slug scelti tra i profili **già registrati**
  nella cartella (escluso se stesso). Vedi §7.
- I metadati del film (durata, regista, generi, voto, locandina) si salvano **al momento
  dell'aggiunta**: la Home non deve mai chiamare internet.
- Lo **stato** di una voce non si salva: è derivato. Una voce è **da vedere** se lo
  storico non registra una visione di quel film con quella persona in data-ora pari o
  successiva ad `aggiunto`; altrimenti è **vista** (spenta). Riaggiungere il film (C6)
  rinnova `aggiunto` e la riaccende (rewatch).
- `aggiunto` (e il campo `ts` dello storico) sono **data-ora complete**, non solo date:
  altrimenti «rimettilo in lista» la sera stessa della visione non funzionerebbe
  (la visione delle 22 spegnerebbe la voce riaggiunta alle 22:30).

### 3.4 Schema `storico.json`

```json
{
  "visioni": [
    {
      "id": "20260721-2215-marco",
      "data": "2026-07-21",
      "ts": "2026-07-21T22:15:00.000Z",
      "tmdbId": 438631,
      "titolo": "Dune",
      "partecipanti": ["marco", "elena", "simone"],
      "proponenti": ["marco", "elena"]
    }
  ]
}
```

`proponenti` = chi aveva il film in lista tra i presenti: serve al timer di equità (§8).

### 3.5 Schema `config.json`

Chiavi API (TMDB, OMDb) e costanti della formula (§8.4), così si tarano senza toccare
l'app. Limite accettato: i JSON nella cartella condivisa sono leggibili da tutti gli
amici; la UI però **non mostra mai** le white/black list altrui (§7).

## 4. Utenti e primo avvio

1. Primo avvio: l'app chiede di **collegare la cartella** (FSA, come TMS) e poi il
   **nome ID** — si sceglie un profilo esistente oppure se ne crea uno nuovo.
2. Nome e handle della cartella restano salvati sul dispositivo (localStorage +
   IndexedDB): dagli avvii successivi si entra diretti.
3. Nuovo nome ⇒ nuovo `profili/<slug>.json` ⇒ nuova poltrona in sala per tutti.

Nessun profilo è cablato nell'app: gli utenti sono **esattamente** i file presenti in
`profili/` (nella cartella Drive). Un profilo si crea vuoto (nome + colore + poltrona,
`lista: []`) al primo avvio dall'app, oppure lasciando cadere un `<slug>.json` nella
cartella — formato in [`esempio-profilo.json`](esempio-profilo.json).
I profili reali del gruppo **non stanno nel repo pubblico** (scelta 2026-07-22): restano
solo nella cartella Drive condivisa. Il repo contiene un solo profilo d'esempio.

## 5. Catalogo (lista personale)

### 5.1 Fonte dati film

La "lista pubblica" esiste: **TMDB** (The Movie Database) — API gratuita (basta
registrare una chiave), ricerca in italiano, e fornisce titolo, anno, locandina,
durata, generi, regista. Per la **media voti IMDb** vera si aggiunge **OMDb API**
(chiave gratuita, 1.000 richieste/giorno): TMDB dà l'`imdb_id`, OMDb restituisce
`imdbRating`. Se OMDb non risponde, ripiego automatico sul voto TMDB.

- Ricerca: `TMDB /search/movie` (lingua it-IT) mentre si digita.
- Dettagli all'aggiunta: `TMDB /movie/{id}` + `credits` (regista) + `imdb_id` → OMDb (voto).
- Locandina: scaricata una volta in `posters/<tmdbId>.jpg` (w500) ⇒ da lì in poi offline.

### 5.2 Funzioni

| # | Funzione | Dettaglio |
|---|---|---|
| C1 | Cerca film | barra di ricerca con risultati live (locandina, titolo, anno) |
| C2 | Aggiungi film | imposta: **desiderio 1–5** (stelle), **conChi** (chip ✓), **nonCon** (chip ✗) |
| C3 | Modifica | cambia desiderio/conChi/nonCon di un film già in lista |
| C4 | Rimuovi | togli dalla lista (i visti restano nello storico) |
| C5 | I miei visti | sezione derivata dallo storico: film, data, con chi |
| C6 | Riaggiungi un visto | un film già visto può tornare in lista (rewatch consapevole) |

Doppioni: lo stesso film in liste di persone diverse è normale (si fondono in Home);
nella **stessa** lista il film è unico per `tmdbId`.

## 6. Home — la Sala

Layout ispirato al CAD di Marco (`Stile home.dxf`, recepito il 2026-07-21).
**I CAD sono rappresentazioni d'idea, non geometrie da copiare** (indicazione di Marco,
2026-07-22): dal disegno si prendono composizione, vista ed elementi; la resa finale è
libera, nello stile velluto dell'app.

- **filtri** della serata in colonna in alto a sinistra (Genere, Durata, Regista);
- **schermo cinemascope** centrale con cornice e tende laterali: mostra il film n°1
  (sfondo/locandina, titolo, metadati, punteggio) col numero di rango e il tasto **Play**;
- **posti 2°–5°** in griglia 2×2 a destra dello schermo (locandine cliccabili);
- **platea a due file sfalsate (9 + 10 poltrone)** sotto lo schermo: ogni utente
  registrato ha la sua poltrona col nome; quando è presente compaiono la sagoma della
  testa e la **nuvoletta col nome** sopra lo schienale, come nel CAD (poltrone in più
  restano decorative).

### 6.1 Funzioni

| # | Funzione | Dettaglio |
|---|---|---|
| H1 | Presenze | click sulle poltrone: ogni poltrona = un utente (nome + colore); doppio click/click di nuovo per svuotarla |
| H2 | Vincoli serata | **durata max** (slider 60'–240' + "∞"), **regista** (testo, opzionale, con suggerimenti presi dalle liste), **genere** (scelta multipla, opzionale) |
| H3 | Top 5 | classifica calcolata come da §8; il 1° va sul proiettore, 2°–5° come locandine cliccabili |
| H4 | Scheda film | click su una locandina: trama, voto, durata, generi, regista, e *quante* persone lo propongono (mai chi vieta chi) |
| H5 | Cambio proiezione | click su una locandina 2°–5° la porta sul proiettore (si può scegliere anche il non-primo) |
| H6 | **Play** | conferma il film sul proiettore: scrive la voce nello storico coi presenti, la voce si spegne ("vista") per tutti i partecipanti, i timer di equità dei proponenti si azzerano; piccola animazione "si spengono le luci" |
| H7 | Ricarica | rilegge tutti i JSON (Drive può impiegare qualche secondo a sincronizzare); mostra data/ora dell'ultimo aggiornamento letto |

### 6.2 Regole di composizione della rosa

1. **Candidati** = unione delle voci **da vedere** dei presenti (dedup per `tmdbId`).
   Un film resta in gioco finché **almeno un presente lo ha ancora da vedere**: chi
   l'ha già visto non conta come proponente ma non lo blocca (se lo riguarda volentieri);
   solo quando tutti quelli che lo volevano l'hanno visto, il film si spegne da solo.
2. **Filtri duri** (eliminano, non penalizzano):
   - durata > durata max impostata → fuori;
   - regista impostato e diverso → fuori;
   - genere impostato e nessuna corrispondenza → fuori;
   - **vincoli di compagnia** violati (§7) → fuori.
3. I sopravvissuti vengono ordinati col punteggio §8; i primi 5 formano la rosa.
4. Se restano meno di 5 film si mostra ciò che c'è; se zero, messaggio con i conteggi
   degli esclusi per motivo ("3 troppo lunghi, 2 per vincoli di compagnia")
   — senza mai rivelare le liste di chi.

## 7. Vincoli di compagnia (white / black list)

Ogni film in lista porta i vincoli **del suo proponente**:

- **Black list** (`nonCon`): "non voglio vederlo con X". Se un proponente è presente e
  un suo X è presente ⇒ **film escluso del tutto** (anche se altri lo propongono senza
  vincoli: altrimenti il proponente si "brucerebbe" il film proprio con X).
- **White list** (`conChi`): "voglio vederlo con X". Il film è proponibile **solo se
  tutti** gli X del proponente presente sono in sala. Stessa logica di esclusione
  totale della black list, per simmetria: se il proponente è presente ma manca un suo X,
  il film non esce (non deve bruciarselo senza X).
- Regola unica equivalente: *per ogni proponente presente, `conChi` ⊆ presenti e
  `nonCon` ∩ presenti = ∅; una violazione qualsiasi esclude il film*.
- I vincoli di proponenti **assenti** non contano (il loro film non è in gioco).
- **Bonus coppia**: se i presenti sono esattamente il proponente + la sua white list
  (es. solo io e quella persona), il film prende il moltiplicatore ×1,15 (§8).
- Riservatezza: i vincoli non compaiono mai in Home; le esclusioni sono motivate solo
  in forma aggregata ("vincoli di compagnia").

## 8. Algoritmo di classifica

Per ogni film candidato `f` sopravvissuto ai filtri:

### 8.1 Ingredienti

- `Prop(f)` = proponenti presenti (chi ce l'ha **da vedere** in lista, tra i presenti).
- **Desiderio** `D(f)` = media dei desideri (1–5) dei `Prop(f)`, divisa per 5 → 0,2–1,0.
  La media (e non la somma) evita che i film "di massa" schiaccino sempre gli altri;
  la coralità è premiata a parte, in modo limitato:
- **Coralità** `B(f)` = `1 + 0,10 × (|Prop(f)| − 1)`, massimo 1,30.
  (+10% per ogni proponente oltre il primo, fino a +30%.)
- **Equità (attesa)** — "più tempo passa da quando non viene preso un film di una
  persona, più i suoi film salgono":
  - per ogni persona `p`: `t(p)` = giorni dall'ultima voce di storico in cui `p` è tra i
    **proponenti** (partecipare ai film degli altri non azzera il timer). Se non è mai
    successo: giorni dalla creazione del profilo.
  - `A(p) = min(t(p), 60) / 60` → 0–1 (saturazione a 60 giorni: l'attesa spinge fino a
    un tetto, non all'infinito).
  - `A(f) = max A(p) per p ∈ Prop(f)` — basta un proponente "a digiuno" per far salire
    il film: è esattamente l'equità voluta.
  - `W(f) = 1 + 0,5 × A(f)` → 1,0–1,5 (fino a +50%).
- **Bonus coppia** `M(f)` = 1,15 se presenti = {proponente} ∪ sua `conChi` (non vuota);
  altrimenti 1,00.

### 8.2 Punteggio

```
S(f) = D(f) × B(f) × W(f) × M(f)          → scala ~0,2 … 2,2
```

Ordinamento: `S` decrescente; a pari merito vince il voto IMDb più alto, poi il titolo.
Il modello moltiplicativo si legge come "desiderio di base + spinte percentuali", e
nessuna spinta da sola può ribaltare un desiderio basso (tetti: +30%, +50%, +15%).

### 8.3 Esempio numerico

Presenti: marco, elena, simone.

| Film | Proponenti (desiderio) | D | B | Attesa | W | M | **S** |
|---|---|---|---|---|---|---|---|
| Dune | marco (5), elena (4) | 0,90 | 1,10 | elena: 50 gg → 0,83 | 1,42 | 1,00 | **1,40** |
| Amélie | simone (5) | 1,00 | 1,00 | simone: scelto ieri → 0,02 | 1,01 | 1,00 | **1,01** |

Vince Dune: desiderio corale e soprattutto elena che "aspetta" da 50 giorni.

### 8.4 Costanti (in `config.json`, tarabili senza toccare l'app)

| Costante | Default | Significato |
|---|---|---|
| `bonusCoralita` | 0,10 | spinta per proponente extra |
| `capCoralita` | 0,30 | tetto coralità |
| `pesoAttesa` | 0,50 | spinta massima dell'attesa |
| `orizzonteAttesa` | 60 | giorni per saturare l'attesa |
| `bonusCoppia` | 1,15 | moltiplicatore white list al completo |

## 9. Tema visivo

- **Palette cinema/teatro, poco satura, riposante** (fondo scuro):
  - fondo sala `#1c1114`, velluto `#3a1f24`, rosso sipario `#8a3d3d`,
    oro `#c9a45c`, oro chiaro `#e0c07d`, testo crema `#f2e7d5`.
- Poltrona vuota = sagoma scura; occupata = si "accende" col colore e il nome dell'utente.
- Proiettore/schermo con cornice dorata, locandina del 1° a tutto schermo; 2°–5° su una
  "mensola" di locandine più piccole.
- Play = grande bottone dorato; alla pressione dissolvenza "luci in sala".
- Pensata per stare bene anche **proiettata sulla TV** durante la scelta (testi grandi,
  contrasto AA, niente colori squillanti).
- Il layout preciso (posizione poltrone, schermo, mensola) seguirà il **CAD** appena
  consegnato.

## 10. Casi limite e robustezza

| Caso | Comportamento |
|---|---|
| Nessuna poltrona selezionata | invito a selezionare i presenti, niente classifica |
| Una sola persona presente | funziona (serata in solitaria): niente coralità né bonus coppia |
| Rosa vuota | messaggio coi conteggi degli esclusi per motivo (§6.2.4) |
| Internet assente | Catalogo: ricerca disabilitata con avviso; Home: pienamente funzionante |
| Drive non ancora sincronizzato | tasto Ricarica (H7) + ora dell'ultima lettura per capire se i dati sono freschi |
| Copia in conflitto di `storico.json` | fusione automatica per unione degli `id` |
| File profilo malformato | il profilo viene ignorato con avviso, l'app non si blocca |
| Due Play nella stessa serata | ammessi: seconda voce nello storico (doppio spettacolo) |

## 11. Fuori perimetro v1

- Nessun server, nessun account/password (l'identità è il nome, tra amici ci si fida).
- Nessuna app mobile (l'HTML resta usabile da portatile collegato alla TV).
- Serie TV: solo film in v1 (TMDB le supporterebbe: estensione futura naturale).
- Statistiche di gruppo (chi propone di più, generi più visti…): idea per v1.x.

## 11b. App desktop (Electron) — dettagli

- `electron/main.js` sceglie la cartella condivisa col picker nativo e serve il renderer
  da `app://mvn`. In `userData/mvn-config.json` persistono **cartella collegata** e
  **ultimo profilo scelto** ("chi sei"): su `app://mvn` il `localStorage` NON sopravvive
  ai riavvii, perciò dalla v0.1.1 il profilo sta nel config (bridge `getMe`/`setMe`), non
  più in `localStorage`. I/O fs con scrittura atomica (temp+rename).
- `electron/preload.js` espone `window.mvnFS` (readJSON/writeJSON/writeBlob/list/fileURL/
  scaricaImmagine) e `window.mvnUpdate`. Le locandine in Electron si scaricano lato main
  (niente CORS) → cache offline affidabile.
- **Aggiornamenti** (scelta 2026-07-22, aggiornata a repo pubblico): installer NSIS +
  `electron-updater` che legge le Release del repo **pubblico** `Movienaitor`. Repo
  pubblico ⇒ **nessun token**: l'app controlla e scarica gli update da sola. Fallback:
  bottone "Pagina rilasci" + sostituzione di `Movienaitor.html` nella cartella Drive per
  la versione browser. Pubblicare = bump versione → `npm run dist` → `gh release create`.
  Nota privacy: i profili reali del gruppo non stanno nel repo (solo un esempio); la
  cronologia git è stata ripulita prima di rendere pubblico, così i nomi degli amici non
  vi compaiono. Procedura completa nel README.
- Sorgente unico: `electron/copia-html.js` (prestart/predist) copia `Movienaitor.html` in
  `electron/renderer/index.html` — mai modificare l'artefatto a mano.

## 12. Decisioni prese (2026-07-21)

- **Voto film**: media IMDb vera via OMDb, con ripiego sul voto TMDB se OMDb non risponde.
- **White list multipla**: tutte le persone indicate devono essere presenti.
- **Visti**: un film si propone finché almeno un presente lo ha "da vedere"; si spegne
  solo quando tutti quelli che lo volevano l'hanno visto (§6.2). Chi l'ha già visto non
  lo blocca per gli altri.

## 13. Punti aperti

1. Conferma sul campo della palette §9 e delle costanti §8.4 (tarabili da ⚙ Impostazioni).
2. Prima prova reale: cartella su Drive, chiave TMDB (+ OMDb) da incollare in Impostazioni.
3. v1.x possibili: statistiche di gruppo, serie TV, decomposizione `src/` se il file cresce.
