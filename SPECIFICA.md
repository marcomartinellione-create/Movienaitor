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
├── archivio.json             ← "pronti alla visione" + dove trovarli (scrive l'host)
├── segnalazioni-stato.json   ← stato/priorità/eliminate delle segnalazioni (scrive l'host)
├── posters/
│   └── <tmdbId>.jpg          ← locandine in cache (~50 KB l'una, TMDB w500)
├── recensioni/
│   └── <slug>/<tmdbId>.json  ← una cartella per utente, un file per film
├── segnalazioni/
│   ├── marco.json            ← bug e idee inviati da quella persona
│   └── ...
└── profili/
    ├── marco.json            ← un file per persona
    ├── elena.json
    └── ...
```

> Dalla v1.1.2 le locandine **non** vengono più messe in cache in `posters/`: si caricano
> sempre dagli URL TMDB (`posterUrl`/`sfondoUrl` salvati nella voce film).

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
  "password": "",
  "lista": [
    {
      "tmdbId": 438631,
      "titolo": "Dune",
      "anno": 2021,
      "durata": 155,
      "regista": "Denis Villeneuve",
      "generi": ["Fantascienza", "Avventura"],
      "voto": 8.0,
      "uscita": "2021-09-15",
      "collezione": 726871,
      "collezioneNome": "Dune - Collezione",
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
- `password` (profilo, facoltativa, in chiaro): solo anti-errore, vedi §4.
- `serviziStreaming` (profilo, facoltativo, v1.2.1): array di piattaforme che la persona ha
  in abbonamento (es. `["Netflix","Prime Video"]`, da `DOVE_STREAMING`). L'unione tra i
  profili è "ciò che il gruppo ha": i film disponibili su uno di quei servizi vengono
  evidenziati in verde nella scheda e in Pronti alla visione (§5.3).
- `collezione`/`collezioneNome`/`uscita` (film): id saga TMDB + nome + data d'uscita, per
  la logica saghe (§8.5). Assenti se il film non fa parte di una collezione.
- `conChi` (white list) e `nonCon` (black list): slug scelti tra i profili **già registrati**
  nella cartella (escluso se stesso). Vedi §7.
- I metadati del film (durata, regista, generi, voto, locandina) si salvano **al momento
  dell'aggiunta**: la Home non deve mai chiamare internet.
- Lo **stato** di una voce non si salva: è derivato. Una voce è **da vedere** se nessuna
  delle due fonti registra una visione di quel film, con quella persona, in data-ora pari
  o successiva ad `aggiunto`; altrimenti è **vista** (spenta). Le fonti sono due:
  1. lo **storico** (una serata confermata col Play);
  2. una **recensione** di quella persona su quel film — chi recensisce un film l'ha
     visto (2026-08-18). La data è `ultimaVisione` e, se manca, il giorno in cui la
     recensione è stata scritta (`creato`). Vale solo per il suo autore.

  Riaggiungere il film (C6) rinnova `aggiunto` e la riaccende (rewatch): la stessa regola
  sulla data vale per entrambe le fonti, così una recensione vecchia non spegne un film
  rimesso in lista adesso per rivederlo.
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
Il **colore della poltrona** si sceglie con un selettore dedicato (`apriColorPicker`):
tavolozza in stile CAD (griglia tinta × luminosità + grigi) e scheda "Crea il tuo" con
quadrato saturazione/valore, barra tinta e codice hex.

**Password profilo** (facoltativa, 2026-07-22): un profilo può avere una `password` nel
suo JSON — **in chiaro**, non è protezione: serve solo a non entrare per sbaglio nel
profilo di un altro. Alla selezione di un profilo con password l'app la chiede (lucchetto
🔒 accanto al nome). Si imposta/rimuove in ⚙ Impostazioni.

**Modalità host** (2026-07-22): al login una casella "Sono l'host" (ricordata per
dispositivo, in `mvn-config.json`/localStorage; anche toggle in Impostazioni). Se attiva,
compare una terza tab **Archivio** che elenca **tutti** i film ancora da vedere di tutti
(dedup, senza preferenze né liste — solo i titoli), così il PC del cinema può procurarsi
in anticipo i film che potrebbero essere estratti. Le tre tab sono separate da una linea
verticale. L'Archivio è una **lista compatta a icone piccole**; ogni film ha una
bandierina **"pronto alla visione"** (l'host segna quelli già procurati), una **ricerca
per titolo** (v1.2.0, cerca anche nel nome della saga) col contatore "N di M", un filtro
**Tutti / Da preparare** e l'ordinamento alfabetico o per priorità di prossima
apparizione. Lo stato "pronto" è condiviso in `archivio.json` (scritto dall'host).
In cima una **box "Chi"** (v1.2.1): chip **Tutti** + un chip per persona, a **selezione
multipla**. Scegliendo una o più persone la scorta si filtra ai film voluti da almeno una
di loro; ogni riga mostra **chi lo vuole** (i selezionati in evidenza), lo **stato pronto**
(segnabile) e la **disponibilità streaming** (§5.3). "Tutti" azzera la selezione.
Con la modalità host compare anche la tab **🐞 Segnalazioni** (§11c). **Cambia utente** apre il gate come overlay con un tasto **Indietro** che
torna alla sessione corrente senza cambiare profilo.

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
| C4 | Rimuovi | togli dalla lista, **con conferma** (i visti restano nello storico) |
| C5 | I miei visti | sezione derivata: le serate dello storico (film, data, con chi) **e** i film che si sono recensiti (data della recensione, segno «✍ recensito»). Se un film ha entrambi vince la data più recente. Comprende anche i film mai passati dalla watch list: titolo e locandina si prendono dalla recensione |
| C6 | Riaggiungi un visto | un film già visto può tornare in lista (rewatch consapevole) |
| C7 | Generi | in cima al Catalogo, barre percentuali della distribuzione dei generi nella lista "da vedere" (un film può avere più generi) |

Doppioni: lo stesso film in liste di persone diverse è normale (si fondono in Home);
nella **stessa** lista il film è unico per `tmdbId`.

### 5.3 Disponibilità streaming (v1.2.1 desktop; recensioni v1.5.2 desktop+mobile)

Ogni profilo dichiara i propri **servizi streaming** (Impostazioni → `serviziStreaming`).
L'app interroga il **database TMDB `movie/{id}/watch/providers`** (dati JustWatch, regione
**IT**, tipo *flatrate* = abbonamento; risultati in cache di sessione, nomi normalizzati
alle etichette `DOVE_STREAMING`) e mostra dove il film è in streaming:

- nella **scheda film** e nelle righe di **Pronti alla visione**, come badge; quelli
  disponibili su un servizio che **qualcuno del gruppo ha** sono evidenziati in verde (col
  nome di chi ce l'ha nel tooltip);
- in **Pronti alla visione → «dove vederlo»**, il tasto **🔄 rileva da TMDB** pre-compila i
  chip streaming del film, così l'host non cerca a mano;
- nell'**editor recensione** (desktop **e mobile**, v1.5.2): aprendo una recensione di un
  film TMDB i servizi streaming si **spuntano da soli** (una volta, solo se il campo è
  ancora vuoto — le scelte manuali non si toccano); un tasto **🔄 rileva** accanto a
  «Streaming» li ri-cerca a mano, aggiungendo senza rimuovere.

In demo i provider sono finti/deterministici (nessuna rete). Senza chiave TMDB, niente
badge né rilevamento (sul mobile serve la chiave in `config.json`, impostata dal PC).

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
| H5 | Cambio proiezione | la mensola mostra gli **altri 4** film in classifica (tutti tranne quello sul proiettore), col rango reale: un clic ne porta un altro sul proiettore; il 1° resta sempre nella mensola (con ↩), così ci si può tornare |
| H6 | **Play** | conferma il film sul proiettore: scrive la voce nello storico coi presenti, la voce si spegne ("vista") per tutti i partecipanti, i timer di equità dei proponenti si azzerano; piccola animazione "si spengono le luci" |
| H7 | Ricarica | rilegge tutti i JSON (Drive può impiegare qualche secondo a sincronizzare); mostra data/ora dell'ultimo aggiornamento letto |
| H8 | **Lista completa** (v1.2.0) | pulsante sotto la mensola: apre **tutti** i film sopravvissuti ai filtri della serata, nello stesso ordine di pertinenza della Top 5 (rango, locandina, punteggio, n° proponenti) con filtro per titolo/regista. Un clic porta il film sul proiettore **anche se sta fuori dalla Top 5**: la mensola continua a mostrare la Top 5 meno quello in onda |

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
- **Indice di Soddisfazione** `W(f)` — sostituisce la vecchia "attesa" (scelta di Marco
  2026-07-25). Moltiplicatore per persona nell'intervallo **0,5 … 1,5**, neutro **1,0**.
  Si **ricalcola dallo storico** (nessuno stato salvato, come tutto il resto). Per ogni
  serata (Play) in cui la persona `p` era **presente** (in `partecipanti`):
  - se un suo film ha vinto (`p` in `proponenti`): l'insoddisfazione accumulata si azzera
    (se l'indice era > 1 torna a 1), poi scende di un **passo** verso 0,5 (più soddisfatta);
  - se non ha vinto niente: l'indice sale di un **passo** verso 1,5 (più insoddisfatta).
  - Le serate da **assente non contano** (nessuna variazione).
  - `W(f) = max W(p) per p ∈ Prop(f)` — basta un proponente insoddisfatto per far salire il film.
  - Incremento/decremento **graduali** (nessun salto): `passoSoddisfazione` (default 0,15).
- **Bonus coppia** `M(f)` = 1,15 se presenti = {proponente} ∪ sua `conChi` (non vuota);
  altrimenti 1,00.
- **Bonus Genere** (2026-07-25) — **solo criterio di spareggio**, NON entra nel punteggio.
  Ogni persona marca i generi che preferisce come **positivi** o **negativi**,
  indipendentemente (non un unico modo): può avere generi che ama e generi che evita
  insieme. `bonusGeneri(p, f) = (n° generi di f tra i positivi di p) − (n° tra i negativi)`.
  `G(f) = Σ (per p ∈ Prop(f)) bonusGeneri(p, f)`. A parità di priorità (vedi ordinamento),
  spinge su i film coi generi amati e giù quelli coi generi evitati.

### 8.2 Punteggio

```
S(f) = D(f) × B(f) × W(f) × M(f)          → scala ~0,1 … 3,4  (W ∈ [0,5; 1,5])
```

Ordinamento: la **priorità principale** è `S` a **bande** — due film il cui `S` cade entro
`sogliaSpareggio` (default 2%) del punteggio massimo sono considerati **stessa priorità**.
A parità di banda: spareggio **Bonus Genere** `G` (decrescente), poi voto IMDb, poi titolo.
Il Bonus Genere non modifica mai `S`.

### 8.3 Esempio numerico

Presenti: marco, elena, simone.

| Film | Proponenti (desiderio) | D | B | Soddisfazione | W | M | **S** |
|---|---|---|---|---|---|---|---|
| Dune | marco (5), elena (4) | 0,90 | 1,10 | elena insoddisfatta (3 serate senza un suo film, passo 0,15) | 1,45 | 1,00 | **1,44** |
| Amélie | simone (5) | 1,00 | 1,00 | simone ha appena vinto → 0,85 | 0,85 | 1,00 | **0,85** |

Vince Dune: desiderio corale e soprattutto elena, insoddisfatta da qualche serata.

### 8.4 Costanti (in `config.json`, tarabili senza toccare l'app)

| Costante | Default | Significato |
|---|---|---|
| `bonusCoralita` | 0,10 | spinta per proponente extra |
| `capCoralita` | 0,30 | tetto coralità |
| `passoSoddisfazione` | 0,15 | passo graduale dell'Indice di Soddisfazione (0,5–1,5) |
| `bonusCoppia` | 1,15 | moltiplicatore white list al completo |
| `sogliaSpareggio` | 0,02 | ampiezza banda "stessa priorità" per lo spareggio Bonus Genere (2% del max) |

Nota: nel **profilo** compaiono anche `generiPositivi[]` e `generiNegativi[]` (generi amati/evitati; sostituiscono i vecchi `bonusGenere`+`generiPreferiti`, migrati in automatico).

### 8.5 Saghe (2026-07-22)

Se più film di una stessa **collezione** TMDB (es. la saga di Dune) sono candidati, la
Sala ne propone **uno solo**: il primo per ordine di uscita ancora "da vedere" per il
gruppo. Gli episodi successivi sono nascosti finché il precedente non è stato visto.
Così una saga esce sempre in ordine, mai a caso. Interazione coi "visti": un episodio è
il "prossimo" se **almeno un presente** lo ha ancora da vedere; se tutti i presenti che
lo volevano l'hanno visto, si passa da sé all'episodio dopo (chi l'ha già visto non
blocca gli altri). La collezione si cattura da TMDB all'aggiunta (`belongs_to_collection`);
l'**Archivio** dell'host mostra invece tutti gli episodi (serve la scorta completa).

## 9. Tema visivo

- **Palette cinema/teatro, poco satura, riposante** (fondo scuro):
  - fondo sala `#1c1114`, velluto `#3a1f24`, rosso sipario `#8a3d3d`,
    oro `#c9a45c`, oro chiaro `#e0c07d`, testo crema `#f2e7d5`.
- Poltrona vuota = sagoma scura; occupata = si "accende" col colore e il nome dell'utente.
- Proiettore/schermo cinemascope (aspect-ratio 21/8.4) con cornice dorata e tende di
  velluto ai lati; locandina/backdrop del 1° a tutto schermo, 2°–5° in una "mensola" 2×2
  di locandine più piccole a destra. Colonne palco 225 / 1fr / 235.
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

## 11d. Consigli «Per te» (v1.7.0, desktop)

Sezione **✨ Per te**: film **mai visti** proposti in base alle proprie recensioni.

- **Profilo del gusto**, ricalcolato a ogni generazione (non è un preset da configurare):
  per genere, keyword, regista, cast ed epoca si calcola una media **pesata per età**
  (dimezzamento a 18 mesi: le recensioni recenti contano di più), con **smoothing
  bayesiano** dei tratti rari e normalizzazione su **media e deviazione standard
  personali ricalcolate ogni volta** — così il profilo segue il gusto quando cambia e
  resta confrontabile fra persone che votano con scale diverse.
- **Indice di compatibilità** `C = 50 + 50·Σ(wᵢaᵢ)/Σwᵢ`, dove i pesi si **ridistribuiscono
  sui soli tratti conosciuti**: un tratto assente non diluisce il punteggio. Il voto
  pubblico pesa in proporzione a quanto quella persona è **d'accordo con la critica**.
- **Fasce** (non percentuali): *Molto in linea* / *Da provare* / *Forse*, assegnate per
  posizione relativa nel lotto **più** una soglia minima assoluta.
- Ogni consiglio mostra **il perché** in italiano; «non mi interessa» viene ricordato in
  `consigli/<slug>.json` col titolo (scrive solo il proprietario, §3.2) e si gestisce da
  ⚙ Impostazioni → **Gestisci esclusi**, dove si rimettono in gioco uno per uno o tutti.
- **Tutto si aggiorna da sé, nessun tasto**: ogni modifica ai filtri rifiltra subito i
  candidati già scaricati (nessuna attesa) e, dopo una pausa di ~1s, lancia una ricerca
  nuova su TMDB — rigenerare a ogni battuta costerebbe decine di chiamate. La sezione
  cerca da sola alla prima apertura e ogni volta che **le recensioni sono cambiate**
  (confronto di una firma: numero, voti e date di modifica), così i consigli seguono il
  gusto senza doverli chiedere.
- Filtri: genere, regista/attore, anno, durata, voto minimo, **solo dove posso vederlo**
  (incrocia i servizi del profilo coi provider TMDB), escludi i generi ✗.
- Servono almeno **3 recensioni**; le keyword delle recensioni già scritte si recuperano
  una tantum dal tasto nella sezione.

## 11c. Segnalazioni — bug e idee (v1.2.0)

Ispirata al pulsante "Segnala" della SustEner App, ma con lo stile della sala.

- **Pulsante 🐞 Segnala** fisso in basso a sinistra, per **tutti**: tipo (Bug ⚠ /
  Suggerimento ✦ / Idea ◌), titolo, descrizione e — solo per i bug — quanto pesa
  (blocca l'uso / dà fastidio / dettaglio minore). L'app registra da sola sezione in cui
  ti trovavi, versione e autore. Nello stesso pannello ognuno rivede **le proprie**
  segnalazioni con lo stato, e può **ritirarle**.
- **Sezione 🐞 Segnalazioni** (solo host, accanto a "Pronti alla visione"): elenco in
  ordine di importanza — priorità decisa dall'host, poi tipo, poi gravità dichiarata;
  le chiuse finiscono in fondo. Per ciascuna: **priorità** (alta/media/bassa), **stato**
  (nuova / in lavorazione / fatta / scartata), scorciatoia **✓ Fatta** e **elimina**
  (sparisce per tutti). Filtro Aperte/Tutte + ricerca testuale. La tab porta il conteggio
  delle aperte.
- **Anti-conflitto** (§3.2): chi segnala scrive **solo** `segnalazioni/<slug>.json`;
  stato, priorità ed eliminazioni le scrive **solo l'host** in `segnalazioni-stato.json`
  — stessa divisione di `archivio.json`. Eliminare non tocca il file altrui: l'id finisce
  in `eliminate[]` e la segnalazione sparisce dalla vista di tutti.

```jsonc
// segnalazioni/<slug>.json — lo scrive solo quella persona
{"segnalazioni":[{"id":"lz3k1-marco","tipo":"bug|suggerimento|idea","titolo":"…",
  "descrizione":"…","gravita":"blocca|rallenta|minore|null","contesto":"sala",
  "versione":"1.2.0","creato":"2026-08-02T20:10:00.000Z"}]}
// segnalazioni-stato.json — lo scrive solo l'host
{"stato":{"lz3k1-marco":{"stato":"in_corso","priorita":"alta","aggiornato":"…"}},
 "eliminate":["…"]}
```

## 11b. App desktop (Electron) — dettagli

- `electron/main.js` sceglie la cartella condivisa col picker nativo e serve il renderer
  da `app://mvn`. In `userData/mvn-config.json` persistono **cartella collegata**,
  **ultimo profilo scelto** ("chi sei") e **stato finestra** (dimensioni + schermo
  intero/finestra/massimizzata, dalla v0.1.3; F11 per il fullscreen): su `app://mvn` il
  `localStorage` NON sopravvive ai riavvii, perciò questi stati stanno nel config (bridge
  `getMe`/`setMe`, salvataggio finestra sincrono alla chiusura), non in `localStorage`.
  I/O fs con scrittura atomica (temp+rename).
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

## 14. Modalità Serie TV (2026-08-18, desktop)

Seconda modalità dell'app — non una seconda app. Si preme la casella in basso a destra
(speculare al 🐞), si sceglie **🎬 Film** o **📺 Serie TV**, e la stessa identica app cambia
tre cose e solo quelle: **da dove legge i dati**, **quale endpoint TMDB** interroga e
**che vestito** indossa. Formule della Sala, classifica, indice di soddisfazione, consigli
e recensioni non cambiano di una riga. Concept e decisioni: `CONCEPT-serie.md`.

### 14.1 Dati — spazi separati

I file dei film restano dove sono sempre stati; le serie vivono sotto `serie/`:

```
storico.json  archivio.json  recensioni/<slug>/  consigli/<slug>.json     ← film
serie/storico.json  serie/archivio.json  serie/recensioni/<slug>/
serie/consigli/<slug>.json                                                ← serie TV
```

Il **profilo resta un file solo** per persona (nome, colore, password e servizi streaming
sono comuni): dentro convivono `lista` e `listaSerie`, e `generiPositivi/Negativi` più
`generiPositiviSerie/NegativiSerie` — le due tassonomie TMDB sono diverse (*Fantascienza*
contro *Sci-Fi & Fantasy*) e non sono trasferibili.

Perché separati e non un campo `tipo`: su TMDB gli id di film e serie sono **sequenze
indipendenti** (l'id 1399 è un film *e* una serie diversa), quindi con file condivisi ogni
struttura indicizzata per `tmdbId` andrebbe convertita a chiave composta — comprese le
recensioni, che si sovrascriverebbero. Così invece `tmdbId` resta la chiave e tutta la
logica funziona parola per parola. In più è **additivo**: le versioni vecchie dell'app non
vedono `serie/`, e cancellare quella cartella cancella ogni traccia.

### 14.2 L'unità di una serie: il segnalibro

Un film si vede una sera e finisce; una serie no. Perciò **Play non consuma una serie**:
sposta il segnalibro. Dove siete arrivati **non si salva** — si ricalcola dallo storico,
come lo stato «visto» dei film e l'indice di soddisfazione:

```jsonc
// serie/storico.json — una riga per serata
{"visioni":[{"id":"…","data":"2026-08-18","ts":"…","tmdbId":95396,"titolo":"Severance",
  "stagione":2,"episodi":[3,4],"partecipanti":["marco","elena"],"proponenti":["marco"]}]}
```

- **segnalibro** = il punto più avanti raggiunto da quella persona, contando solo le serate
  successive ad `aggiunto` (così «rimettila in lista» riparte da capo);
- **voce attiva** finché il segnalibro non arriva in fondo all'ultima stagione uscita. Se
  le stagioni non si conoscono, la serie non si considera mai finita;
- in Sala si riprende dal punto **più indietro fra i presenti**, così nessuno si perde un
  episodio; Play chiede «dove siete arrivati», già compilato lì;
- una **recensione** vale come «l'ho finita», come per i film vale «l'ho visto» (§3.3).

### 14.3 Campi TMDB

`name`, `first_air_date`, `created_by` (al posto del regista: per le serie `crew.Director`
è vuoto), `episode_run_time` con ripiego su `last_episode_to_air.runtime` — spesso è vuoto
— e le stagioni da `seasons`, scartando gli speciali (S0) e quelle annunciate a 0 episodi.
Le **keyword stanno in `keywords.results`** e non in `keywords.keywords` come per i film.
Il filtro «durata massima» della serata diventa la **durata di un episodio**.

### 14.4 L'aspetto

Tutto per token: `:root[data-modo="serie"]` ridichiara la palette (blu), e la scenografia
cambia in **tre punti soli** — i posti diventano un **divano** (cuscini affiancati sotto un
unico schienale, braccioli solo ai capi), lo schermo diventa una **TV** a parità di aspect
ratio, e al posto del sipario c'è l'**accensione/spegnimento della TV**. Layout, griglia e
posizioni restano quelli del cinema. L'accento ha due varianti (**caldo**, l'oro dell'app,
e **freddo**, acciaio) commutabili da ⚙ Impostazioni finché non si sceglie.

### 14.5 Reversibilità

La casella si può **nascondere** da ⚙ Impostazioni: spenta, si torna ai film e l'app è
indistinguibile da quella di prima. I dati dei film non vengono mai toccati.
