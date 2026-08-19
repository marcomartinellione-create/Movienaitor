# Concept — Serie TV come seconda modalità

> **Stato: implementato e pubblicato su desktop e mobile (v1.7.2, 2026-08-19).** Dopo la
> prima release (v1.7.1) sono arrivati ritocchi dalla prova sul campo: animazione della
> TV rifatta due volte (l'immagine collassa invece di sparire sotto un nero, poi curva
> lineare), filtri legati alla modalità, e i tasti «visto» / «rimuovi dai visti».
> Misure prese sul codice reale (`Movienaitor.html` 3.717 righe,
> `app-mobile/www/index.html` 2.120).
>
> **Deciso con Marco:** unità = **segnalibro a episodio** (§5c) · dati = **cartella
> `serie/` separata** (§4B) · salotto = **solo tre cambi** (§8) · **prima il desktop**,
> il mobile dopo · **due contabilità separate** per l'indice di soddisfazione · l'accento
> **resta l'oro** anche in salotto (provate entrambe, scelta a video).
> Tutto deve essere **reversibile** (§13).

## 1. L'idea in una riga

Una **seconda modalità** dell'app — non una seconda app: si preme una casella in basso a
destra, si sceglie **🎬 Film** o **📺 Serie TV**, e la stessa identica app cambia dati,
colori (toni di blu) e scenografia della Sala (un **salotto** invece di un cinema).
Funzioni, sezioni, formule e gesti: gli stessi, sovrapponibili uno a uno.

---

## 2. Perché sta in piedi (misurato, non a occhio)

Prima di dire «si può fare» ho contato le cose che dovrebbero cambiare:

| Cosa | Quanto | Conseguenza |
|---|---|---|
| **Endpoint TMDB** usati in tutta l'app | **7** (desktop), 6 (mobile) | ognuno ha il gemello `/tv`: `search/movie→search/tv`, `movie/{id}→tv/{id}`, `discover/movie→discover/tv`, `…/watch/providers`, `…/recommendations`. `search/keyword` e `search/person` sono già comuni |
| **Colori** dichiarati come token in `:root` | **20 token** | la palette blu è un blocco `[data-modo="serie"]` che ridichiara ~14 token: **~30 righe di CSS** |
| **Colori hex sparsi** fuori dai token | **4** (`#241610`, `#4a2228`, `#1c1013`, più le tinte utente) | vanno tokenizzati; stanno quasi tutti nella Sala, che comunque si ridisegna |
| Punti che leggono `.lista` di un profilo | **15** desktop, 14 mobile | diventano una funzione `listaDi(profilo)` |
| Punti che compongono un percorso di file | **~20** | diventano un prefisso deciso dalla modalità |
| Formule della Sala (`D×B×W×M`), saghe, filtri, consigli, recensioni, archivio, segnalazioni | **0 modifiche** | se i dati arrivano già filtrati per modalità, la logica non sa nemmeno che esiste una seconda modalità |

**È questo il punto che rende l'idea buona:** la parte grande dell'app — le formule, la
classifica, l'indice di soddisfazione, i consigli — non va toccata. Cambia il *rubinetto*
dei dati, non l'impianto.

---

## 3. Architettura: una modalità, non una seconda app

`S.modo = 'film' | 'serie'`, deciso all'avvio e ricordato per dispositivo (come «sono
l'host»: config di sistema in Electron, `localStorage` nel browser, `LS` sul mobile).

La modalità governa tre cose, e solo quelle:

1. **Da dove si leggono e si scrivono i dati** (§4);
2. **Quale endpoint TMDB** si interroga (§6);
3. **Quale vestito** indossa l'app — token colore + scenografia della Sala (§8).

Cambiare modalità = rileggere i JSON della modalità + ridisegnare. Nessuna finestra nuova,
nessun secondo file HTML. **Scartata** l'idea di un `Serienaitor.html` separato: il
progetto ha già due copie a mano da tenere allineate (desktop e mobile), una terza e una
quarta sarebbero ingestibili.

---

## 4. Dove vivono i dati — la prima decisione

### Opzione A — stessi file, campo `tipo` in ogni voce

Una sola `lista`, ogni voce con `tipo:'film'|'serie'`; stesso `storico.json` con `tipo`.

**Il problema che la affossa:** su TMDB gli id dei film e quelli delle serie sono
**sequenze indipendenti** — l'id 1399 è un film *e* una serie diversa. Tutto ciò che oggi
è indicizzato per `tmdbId` andrebbe convertito a chiave composta: `entryAttiva`, l'elenco
dei visti, `archivioPronti` (un Set di id), `archivioDove`, `providersCache`,
`S.cgScartati`, e soprattutto il nome del file di una recensione
(`recensioni/<slug>/<tmdbId>.json` — due recensioni diverse si sovrascriverebbero).
Meccanico, ma tocca decine di punti: l'opposto del «cambiamento minimale».

### Opzione B — spazi separati (**consigliata**)

Ogni modalità ha i suoi file, con gli stessi nomi e la stessa forma:

```
storico.json            archivio.json            recensioni/<slug>/<id>.json
consigli/<slug>.json    ← modalità FILM (esattamente com'è oggi)

serie/storico.json      serie/archivio.json      serie/recensioni/<slug>/<id>.json
serie/consigli/<slug>.json                       ← modalità SERIE TV
```

I **profili restano un unico file** per persona (`profili/<slug>.json`): nome, colore
della poltrona, password, servizi streaming sono gli stessi in tutte e due le modalità e
non devono poter divergere. Dentro, due liste affiancate:

```jsonc
{ "nome":"Marco", "slug":"marco", "colore":"#c9a45c",
  "lista":[ …film… ],                 // com'è oggi
  "listaSerie":[ …serie… ],           // nuova
  "generiPositivi":[…], "generiNegativi":[…],
  "generiPositiviSerie":[…], "generiNegativiSerie":[…] }
```

I generi vanno sdoppiati perché **TMDB usa due tassonomie diverse**: i film hanno
*Azione*, *Fantascienza*, *Avventura*; le serie hanno *Action & Adventure*,
*Sci-Fi & Fantasy*, *Kids*, *Reality*, *Soap*. Le liste ✓/✗ non sono trasferibili.

**Perché questa opzione è più minimale della A, nonostante i file in più:**

- nessuna chiave composta: `tmdbId` resta la chiave, e **tutta la logica esistente
  continua a funzionare parola per parola** — basta che il caricamento riempia `S` con i
  dati della modalità attiva;
- **compatibilità all'indietro perfetta**: una versione vecchia dell'app legge `lista` e
  ignora `listaSerie`, non vede la cartella `serie/` e non si accorge di niente. Conta
  davvero, perché il desktop si aggiorna da solo ma l'APK no: per un po' convivranno
  versioni diverse sulla stessa cartella Drive;
- la **regola anti-conflitto** (§3.2 SPECIFICA) si estende identica: ognuno scrive solo il
  proprio profilo e le proprie recensioni, l'host scrive gli `storico`/`archivio` di
  entrambe le modalità.

Costo: la funzione `listaDi(profilo)` al posto di `p.lista` (15 punti desktop, 14 mobile)
e un prefisso di percorso deciso dalla modalità (~20 punti). Tutto qui.

---

## 5. Il nodo vero: **qual è l'unità di una serie?**

È l'unica cosa che *non* può essere identica ai film, e va decisa prima di scrivere
qualsiasi riga. Un film si vede una sera e finisce. Una serie no.

### (a) Serie atomica — «identico ai film»

La serie si comporta come un film: la Sala propone *Severance*, Play registra
«visto *Severance*».

**Non funziona.** Play spegnerebbe la voce dopo la prima sera: la serie sparirebbe dalla
lista dopo due episodi, e finirebbe fra i «già visti» pur essendo appena cominciata.
È il caso d'uso principale, e si romperebbe subito.

### (b) La stagione come unità — riuso della logica saghe

Le stagioni si comportano come gli episodi di una saga (§8.5): la Sala propone la **prima
stagione non ancora vista**, Play la registra, quando finiscono le stagioni la voce si
spegne. Riusa una macchina già scritta e collaudata.

**Attenua il problema ma non lo risolve:** una stagione non si esaurisce in una serata.
Play marcherebbe come vista tutta una stagione dopo due episodi.

### (c) Segnalibro a episodio, **ricavato dallo storico** (consigliata)

La voce in lista è la **serie**; a che punto si è arrivati **non si salva**: si ricalcola
dallo storico, esattamente come oggi si ricalcola lo stato «visto» e l'indice di
soddisfazione. È lo stesso principio dell'app, applicato uno strato più in basso.

```jsonc
// serie/storico.json — una riga per serata, come per i film
{"visioni":[{"id":"20260818-2215-marco","data":"2026-08-18","ts":"…",
  "tmdbId":95396,"titolo":"Severance","stagione":2,"episodi":[3,4],
  "partecipanti":["marco","elena"],"proponenti":["marco"]}]}
```

Da lì si deriva tutto:

- **segnalibro** = l'episodio più avanti raggiunto → la Sala mostra *«Severance —
  prossimo: S2 E5»*;
- **voce attiva** = il segnalibro non è arrivato in fondo all'ultima stagione uscita
  (TMDB dà `number_of_seasons`, `number_of_episodes`, `status`);
- **già vista** = serie finita — e la sezione «già visti» mostra le serie completate
  esattamente come i film, con la stessa regola «recensire = averla vista» (2026-08-18);
- **indice di soddisfazione**: funziona **parola per parola**, perché conta le serate, non
  i film.

Play cambia in un punto solo: invece di «l'abbiamo visto» chiede **«dove siamo
arrivati?»** — un selettore stagione/episodi già compilato su *segnalibro + 1*, si
conferma o si corregge. Una modale in più, il resto identico.

**Costo reale:** `registraVisione` e `entryAttiva` imparano il caso serie (~60 righe),
più il selettore. Nient'altro nella logica.

> **Da decidere: (a), (b) o (c).** La mia proposta è **(c)**: è l'unica che descrive
> come si guarda davvero una serie, e resta dentro la filosofia dell'app («lo stato non si
> salva, si ricalcola dallo storico»). (b) è il ripiego se si vuole spendere meno.

---

## 6. La mappatura dei campi TMDB

Una serie riempie la stessa scheda di un film, con questi travasi:

| Campo della voce | Film (oggi) | Serie |
|---|---|---|
| `titolo` | `title` | `name` |
| `anno` | `release_date` | `first_air_date` |
| `durata` | `runtime` | `episode_run_time` — **la durata di un episodio** |
| `regista` | crew → *Director* | `created_by` → **creatore/showrunner** |
| `generi` | tassonomia film | tassonomia serie (diversa, §4) |
| `voto` | OMDb via `imdb_id`, ripiego TMDB | identico: `external_ids` dà l'`imdb_id` anche per le serie |
| `collezione` | `belongs_to_collection` | *(non esiste)* → il suo posto lo prendono le **stagioni** |
| — | — | `stagioni`, `episodiTotali`, `stato` (in corso / conclusa) |

Due dettagli che costerebbero un pomeriggio se scoperti scrivendo:

- le **keyword** arrivano in `keywords.results` per le serie e in `keywords.keywords` per i
  film (stessa `append_to_response`, chiave diversa);
- il filtro **«durata massima»** della serata diventa naturalmente *durata dell'episodio*
  — che per un salotto è perfino più utile: «stasera niente da più di 45 minuti».

---

## 7. Sezione per sezione: cosa cambia davvero

| Sezione | Cosa cambia |
|---|---|
| **Sala** | scenografia (§8) e Play (§5c). Filtri, rosa 2-5, lista completa, punteggio: **identici** |
| **Watch List** | nulla, se non le parole («serie» invece di «film») e i generi della tassonomia serie |
| **Recensioni** | nulla: stesso editor a sezioni, stesso voto Letterboxd, stessi export. File sotto `serie/recensioni/` |
| **✨ Per te** | nulla nelle formule: `discover/tv` + `tv/{id}/recommendations` al posto dei gemelli film. Il profilo del gusto si costruisce dalle recensioni **di quella modalità** ⇒ gusto per le serie e gusto per i film restano separati, gratis |
| **Pronti alla visione** (host) | identica, sul suo `serie/archivio.json` |
| **🐞 Segnalazioni** | **una sola**, condivisa: i bug sono dell'app, non della modalità. Il campo `contesto` registrerà anche la modalità |
| **⚙ Impostazioni** | chiavi API e costanti sono comuni; i servizi streaming del profilo sono comuni; le liste generi ✓/✗ si sdoppiano |

---

## 8. L'aspetto: blu e salotto

### La palette

Un blocco `:root[data-modo="serie"]` che ridichiara i token. Proposta di partenza (da
correggere sul vivo — è il tipo di cosa che si giudica a video, non su carta):

| Token | Film (oggi) | Serie TV (proposta) |
|---|---|---|
| `--bg` / `--bg2` | `#191014` / `#221419` | `#101722` / `#16202e` — notte fredda |
| `--velluto` / `--velluto2` / `--velluto3` | rossi `#3a2026` … | `#1e2b3d` / `#182333` / `#2a3b52` — tessuto del divano |
| `--rosso` / `--rosso2` | `#8a3d3d` / `#a85454` | `#3f6d93` / `#5a8cb5` — azzurri |
| `--oro` / `--oro2` | `#c9a45c` / `#e0c07d` | **da decidere** (§12) |
| `--crema` / `--dim` | invariati o appena raffreddati | — |

La domanda aperta è l'**oro**: è l'accento dell'app e la sua identità. Due strade:
tenerlo (la lampada calda accesa in un salotto blu — contrasto bello e riconoscibile),
oppure virarlo a un **ottone freddo/argento** perché «toni di blu» sia davvero tale.
Ti faccio vedere le due varianti prima di scegliere.

### Il salotto — **esattamente tre cambi** (deciso 2026-08-18)

Il layout resta quello che è: stessa griglia del palco, stesse proporzioni, stessa
posizione di tutto. Cambiano solo tre cose, tutte già isolate in funzioni loro:

| # | Cinema (oggi) | Salotto |
|---|---|---|
| 1 | platea: poltrone **singole** in due file sfalsate (`poltronaSVG`) | un **divano**: i posti sono cuscini affiancati sotto un unico schienale. Stessa identica interazione — clic per occupare, colore della persona, nuvoletta col nome |
| 2 | schermo del **proiettore** con cornice dorata | una **TV**: stessa cornice-contenitore e **stesso aspect ratio** (21/8.4, non si tocca), cambia la resa — cornice sottile scura, riflesso del vetro, piedino |
| 3 | **sipario** di velluto che si apre e si chiude (`.tenda sx/dx`) | la classica **accensione/spegnimento della TV**: la riga di luce che si allarga e la scia che collassa al centro quando si spegne. Stesso aggancio (`schermo.classList` `aperto`/chiuso), animazione diversa |

Tutto il resto della Sala — filtri STASERA, rosa 2-5, lista completa, riga di stato,
posizioni, dimensioni — **non cambia di un pixel**.

`disegnaPlatea` resta strutturalmente uguale: cambia la funzione che disegna il singolo
posto (`poltronaSVG` → una sorella `postoDivanoSVG` con la stessa firma), più il
raggruppamento visivo dei cuscini in un divano unico.

---

## 9. L'interruttore

Casella fissa **in basso a destra**, speculare al 🐞 di sinistra (che oggi è
`position:fixed; left:18px; bottom:18px` — la gemella è la stessa regola con `right`).
Mostra la modalità attiva (**🎬 Film** / **📺 Serie TV**); premendola si apre un pannellino
con le due modalità come schede, pronto ad accoglierne una terza domani.

Il cambio di modalità: rilettura dei dati + ridisegno, con la stessa dissolvenza già usata
dal Play. La modalità si ricorda per dispositivo, così chi guarda solo film non incontra
mai le serie.

---

## 10. Mobile

Tutto quanto sopra va **rifatto a mano** nel file mobile: è una copia parallela, non
condivide codice (già oggi `classifica`, `profiloGusto` e compagnia sono duplicate).
In pratica il lavoro si fa due volte, ed è la voce di costo più grande di tutta l'idea.
Sul mobile l'interruttore sta bene come voce nella barra in basso o come pulsante
flottante speculare al 🐞, da decidere quando ci si mette mano.

---

## 11. Cosa costa, e dove si può sbagliare

**Ordine di grandezza** (desktop + mobile, indicativo):

| Pezzo | Peso |
|---|---|
| Strato dati (percorsi per modalità, `listaDi`, migrazione dei profili) | medio, meccanico |
| Strato TMDB (`cercaFilm`/`dettagliFilm` con il ramo serie) | piccolo, ~40 righe per file |
| Play + segnalibro (§5c) | medio |
| Palette blu | piccolo |
| **Salotto (TV, divano, accensione)** | **il pezzo grosso**: è disegno, si fa e si rifà |
| Interruttore + persistenza | piccolo |
| Demo con qualche serie finta, documentazione | piccolo |

**I rischi veri, in ordine:**

1. **Il file cresce.** Oggi 3.717 righe; la modalità non lo raddoppia (si aggiungono rami,
   non copie) ma lo porta forse a +15-20%. È il punto in cui la SPECIFICA §2 aveva previsto
   la decomposizione in `src/` + `tools/build.js` come la TMS. Non è un blocco adesso: è
   una cosa da tenere d'occhio.
2. **Versioni diverse sulla stessa cartella Drive.** Risolto scegliendo l'opzione B (§4):
   le versioni vecchie non vedono la cartella `serie/` e non si fanno male.
3. **Le parole.** «Film» compare ovunque nell'interfaccia: vanno rese neutre o
   dipendenti dalla modalità, altrimenti la modalità serie dice «film» dappertutto.
   Noioso ma banale.
4. **La demo**: i dati di prova sono 16 film; ne servono alcuni finti anche per le serie,
   altrimenti la modalità nuova si può provare solo con la cartella vera.

---

## 12. Le decisioni

1. **Unità della serie** — ✅ **(c) segnalibro a episodio ricavato dallo storico**.
2. **Dati** — ✅ **(B) cartella `serie/` separata**.
3. **Equità fra le due modalità** — ✅ **due contabilità separate**, una per modalità (è anche
   ciò che viene gratis con §4B). Per capirsi, la domanda era questa. L'indice di soddisfazione (§8.1
   SPECIFICA) è il meccanismo che risponde a «di chi è il turno?»: sale per chi c'era e
   non ha visto vincere niente di suo, scende per chi ha appena scelto.
   - **Due contabilità** (è ciò che viene gratis con §4B): il tuo numero «film» si muove
     solo nelle serate film, quello «serie» solo nelle serate serie.
   - **Una sola** (costa una lettura di file in più): i due storici si fondono in ordine
     di data e ogni persona ha un numero solo, valido in entrambe le modalità.

   Il caso che le distingue: Elena propone **solo** serie. Su sei serate, quattro sono
   film e vincono le proposte di altri. Con due contabilità quelle quattro sere non le
   contano niente — è stata lì a guardare le scelte altrui e il suo turno non avanza di un
   millimetro. Con una sola contabilità quelle sere la spingono su, e quando arriva la
   serata serie ha la precedenza. Specularmente: se lunedì vince un film di Marco, con la
   contabilità unica venerdì (serie) Marco è «appagato» e lascia spazio agli altri; con
   due contabilità lunedì non conta e Marco arriva a venerdì a peso pieno.
   **Proposta: una sola contabilità** — la domanda «chi non sceglie da un po'?» riguarda
   le serate passate insieme, non il formato di ciò che si è guardato.
4. **L'oro** — ✅ **resta l'oro** anche in salotto (scelto a video il 2026-08-18): in una stanza
   blu legge come la lampada accesa e tiene l'identità dell'app. La variante fredda è stata
   provata e scartata; il selettore provvisorio è stato tolto.
5. **Il salotto** — ✅ **tre cambi soli** (§8): divano, TV al posto del proiettore a
   **parità di aspect ratio**, accensione/spegnimento TV al posto del sipario.
6. **Ordine di lavoro** — ✅ **prima tutto il desktop**, il mobile dopo.

---

## 13. Reversibilità (richiesta esplicita di Marco)

Tre strati indipendenti, così tornare indietro è sempre possibile e non costa niente:

1. **Codice** — il lavoro sta sul ramo **`serie-tv`**; `master` resta fermo dov'è, e c'è
   il tag **`pre-serie`** sullo stato di adesso. Se la modalità non convince: si resta su
   `master` e il ramo si cancella. Niente da disfare a mano.
2. **Dati** — la scelta §4B rende la cosa additiva per costruzione: i file dei film non
   vengono **mai** toccati, le serie vivono in `serie/` (cartella cancellabile in blocco) e
   l'unica aggiunta ai file esistenti è `listaSerie` dentro i profili, che le versioni
   vecchie ignorano. Nessuna migrazione, nessuna riscrittura.
3. **A video** — finché non si preme la casella in basso a destra l'app si comporta
   **esattamente** come oggi. In più la casella si può nascondere da ⚙ Impostazioni: con
   quella spenta l'app è indistinguibile dalla versione attuale.

E finché non arriva un «pubblica» esplicito (regola d'oro #1) tutto resta in commit
locali: gli altri del gruppo non vedono niente.
