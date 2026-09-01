# Concept — Videogiochi come terza modalità

> **Stato: deciso, in costruzione (desktop per primo).** Misure prese sul codice reale del 2026-09-01
> (`Movienaitor.html` 3.846 righe, `app-mobile/www/index.html` 2.483).
> Ricalca `CONCEPT-serie.md`: quella modalità è già in piedi e ha lasciato la strada
> spianata — l'elenco `MODI` esiste, i percorsi sono già per categoria, i rimandi fra
> recensioni già attraversano le categorie.
>
> **Deciso con Marco (2026-09-01):** unità = **atomica con lo stato «in corso»** (§5) ·
> posti = **sedie da gaming** (§8) · libreria = **RAWG**, chiave presa da Marco (§6) ·
> **prima il desktop**, il mobile dopo.

## 1. L'idea in una riga

Una **terza modalità**: si preme la casella in basso a destra e accanto a 🎬 Film e
📺 Serie TV compare 🎮 Videogiochi. Stessa app, stessi gesti, stesse formule — cambiano
dati, colori e scenografia della Sala, che da salotto diventa **postazione**.

---

## 2. Perché costa molto meno della volta scorsa

La modalità serie ha pagato una volta sola conti che ora sono già in cassa:

| Cosa | Serie TV (allora) | Videogiochi (adesso) |
|---|---|---|
| Percorsi dei file per categoria | da inventare (~20 punti) | **fatto**: `MODI` + `P()`/`PM()`/`PS()`, una riga in più |
| `listaDi(profilo)` al posto di `p.lista` | da fare (15+14 punti) | **fatto**, basta aggiungere `listaGiochi` |
| Parole dipendenti dalla modalità | da inventare | **fatto**: `data-film`/`data-serie` → si aggiunge `data-giochi` (9 punti) |
| Casella e pannellino della scelta | da fare | **fatto**: legge da `MODI`, la terza scheda compare da sola |
| Palette per modalità | da inventare | **fatto**: `:root[data-modo="…"]`, ~30 righe nuove |
| Due contabilità separate, consigli per modalità, recensioni per modalità | da fare | **fatto**, viene gratis dalla cartella separata |

Restano **tre** cose vere da fare: la **libreria online** (§6), l'**unità del gioco** (§5)
e la **postazione** (§8) — cioè disegno. Più il solito lavoro doppio sul mobile.

---

## 3. Dove vivono i dati

Come per le serie, **spazio separato** (`CONCEPT-serie.md` §4B, opzione vinta):

```
storico.json  archivio.json  recensioni/<slug>/  consigli/<slug>.json   ← FILM
serie/…                                                                 ← SERIE TV
giochi/…                                                                ← VIDEOGIOCHI
```

Nel profilo, che resta **un file per persona**, si affianca una terza lista:

```jsonc
{ "nome":"Marco", "slug":"marco", "colore":"#c9a45c",
  "lista":[…], "listaSerie":[…], "listaGiochi":[…],
  "generiPositivi":[…], "generiPositiviSerie":[…], "generiPositiviGiochi":[…],
  "serviziStreaming":[…],        // Netflix, NOW… (film e serie)
  "serviziGiochi":[…] }          // Game Pass, PS Plus, Steam… (nuovo)
```

Gli id di RAWG sono una sequenza tutta sua, ma non importa: come per le serie, ogni
categoria ha i suoi file e `tmdbId` (che qui contiene un id RAWG) resta la chiave.
Compatibilità all'indietro perfetta: le versioni vecchie non vedono `giochi/`.

Le **piattaforme** sono nuove perché non sono le stesse dei film: chi ha Netflix non ha
per forza il Game Pass. Campo a parte nello stesso profilo.

---

## 4. Il vero cambiamento concettuale

Film e serie si **guardano**; un videogioco si **gioca**, e questo sposta due cose:

1. **Non finisce in una sera** — come una serie. Ma una serie ha gli episodi numerati e
   quindi un segnalibro derivabile; un gioco no. È il nodo del §5.
2. **Alcuni giochi non finiscono mai.** Mario Kart, Smash, FIFA non si «completano»: si
   rigiocano all'infinito, e devono restare per sempre proponibili. Nella logica dei film
   sarebbe un titolo che non passa mai fra i «già visti».

Tutto il resto — chi c'è stasera, chi lo desidera quanto, di chi è il turno, l'indice di
soddisfazione, la classifica `D×B×W×M` — funziona **parola per parola**, perché conta le
serate passate insieme, non il formato.

---

## 5. Il nodo: **quando un gioco è finito?**

### (a) Gioco atomico — «identico ai film»

Play registra «giocato», la voce si spegne. **Non funziona**, per lo stesso motivo per cui
non funzionava per le serie: un gioco da 30 ore sparirebbe dalla lista dopo la prima sera.

### (b) ✅ **Atomico, con uno stato in più: «in corso»** (scelta di Marco)

Non si contano le ore e non si tiene un segnalibro. Play chiede una cosa sola — **a che
punto siamo** — e le risposte sono due:

```jsonc
// giochi/storico.json — una riga per serata, come sempre
{"visioni":[{"id":"20260901-2130-marco","data":"2026-09-01","ts":"…",
  "tmdbId":22511,"titolo":"It Takes Two","stato":"corso",
  "partecipanti":["marco","elena"],"proponenti":["marco"]}]}
```

Come sempre, lo stato non si salva: si **ricalcola dallo storico**.

- **▶ in corso** — ci si sta giocando. La voce **resta in lista e resta proponibile**: è
  proprio quello che si vuole, essere richiamati a continuarlo.
- **✓ finito** — esce dalla lista attiva e passa fra i **già giocati**, esattamente come un
  film visto.
- **In tutti e due i casi il gioco compare fra i recensibili**, nel riquadro «non ancora
  recensiti» della pagina Recensioni: di un gioco si può benissimo scrivere mentre lo si
  sta ancora giocando. È la differenza vera rispetto a film e serie, dove si recensisce
  dopo.
- **I giochi che non finiscono mai** (Mario Kart, FIFA) non hanno bisogno di nessun
  concetto in più: restano «in corso» per sempre. Il caso limite si risolve da sé.

Play cambia in un punto solo, come per le serie: invece di «l'abbiamo visto» chiede
**«a che punto siamo?»** con due tasti, *in corso* e *finito*. La scorciatoia «l'abbiamo
vista tutta» diventa **«l'abbiamo finito»**.

### (c) Segnalibro a ore

Sommare le ore giocate e confrontarle con le ore stimate da RAWG (*«≈7h su ~13h»*).
Più ricco, ma chiede di misurare ogni sera una cosa che nessuno misura.
**Scartata:** lo stato «in corso» dice già ciò che serve sapere.

### (d) Natura dichiarata: «campagna» / «da tavolo»

Ogni voce dichiara se ha una fine. Un concetto nuovo da spiegare e mantenere, e la (b)
ottiene lo stesso risultato senza. **Scartata.**

---

## 6. La libreria online — **RAWG**

È la sola cosa davvero nuova, ed è il punto su cui Marco ha chiesto aiuto. Ho controllato
i candidati sul campo, non sulla carta:

| Candidato | Verdetto |
|---|---|
| **IGDB** (Twitch/Amazon) | i dati migliori e **copertine verticali vere**, ma: OAuth con client secret **e nessun CORS** — dal browser `api.igdb.com` è bloccato (verificato). Per un'app senza server è fuori |
| **Giant Bomb**, **MobyGames** | chiave sì, ma richiedono chiamate da server |
| **Steam store API** | niente CORS, e copre solo PC |
| **Wikidata** | CORS aperto, ma ricerca e copertine inadatte |
| **RAWG.io** | ✅ chiave gratuita, ~500.000 giochi, **CORS aperto** (`access-control-allow-origin: *`, verificato sul preflight), stesso identico giro di TMDB e OMDb |

**RAWG**, quindi: si registra una chiave gratuita su `rawg.io/apidocs` (20.000 richieste al
mese, più che sufficienti) e si mette in ⚙ Impostazioni accanto a quelle TMDB e OMDb.
Due endpoint, gli stessi due di oggi:

- ricerca: `GET /api/games?key=…&search=…&page_size=8`
- scheda: `GET /api/games/{id}?key=…`

### La mappatura dei campi

| Campo della voce | Film (oggi) | Videogioco (RAWG) |
|---|---|---|
| `titolo` | `title` | `name` |
| `anno` | `release_date` | `released` |
| `durata` | `runtime` (minuti) | `playtime` — **ore per finirlo** (si tiene comunque: alimenta il filtro «impegno massimo», non il segnalibro) |
| `regista` | crew → *Director* | `developers[0]` → **sviluppatore** |
| `generi` | tassonomia film | tassonomia RAWG (Action, RPG, Shooter, Strategy, Indie…) |
| `voto` | IMDb via OMDb | `metacritic` (0-100 → /10), ripiego `rating` (0-5 → ×2) |
| `cast` | attori | *(non esiste)* → **publisher e piattaforme** |
| `keywords` | `keywords` | `tags` (in inglese, come già le keyword) |
| `collezione` (saghe) | `belongs_to_collection` | `/games/{id}/game-series` — **rimandata**: costa una chiamata in più, si aggiunge dopo se serve |
| — | — | `piattaforme`, `stores` (Steam, Epic, PS, Xbox, eShop…) |

**Il filtro «Durata massima» diventa «Impegno massimo»**, in ore: *«stasera niente da più
di 15 ore»*. Per scegliere un gioco è perfino più utile che per un film.

### L'unico attrito: le immagini

RAWG dà `background_image`, che è **orizzontale** (key art 16:9), non una copertina
verticale. Conseguenze:

- sullo **schermo grande della Sala** (21/8.4) è perfetta, meglio di una locandina;
- nelle **caselle verticali** (rosa 2-5, catalogo, recensioni) va ritagliata al centro.
  Le key art sopravvivono quasi sempre a un ritaglio centrale, ma non è un poster.

Se un domani darà fastidio, la copertina verticale vera si può pescare da Steam
(`library_600x900` dall'appid che RAWG dà dentro `stores`) per i giochi PC. Non in v1.

---

## 7. Sezione per sezione

| Sezione | Cosa cambia |
|---|---|
| **Sala** | scenografia (§8) e Play (§5b). Filtri, rosa 2-5, lista completa, punteggio: **identici** |
| **Watch List** → «Da giocare» | solo le parole e i generi della tassonomia RAWG |
| **Recensioni** | nulla. File sotto `giochi/recensioni/`. I rimandi `[[…]]` fra categorie funzionano già: un gioco può citare un film |
| **✨ Per te** | le formule non si toccano. Cambia da dove arrivano i candidati: RAWG `/games` con filtri di genere invece di `discover` |
| **Pronti alla visione** → «Pronti a giocare» | identica, sul suo `giochi/archivio.json`. «Dove vederlo» diventa «Dove ce l'hai» |
| **🐞 Segnalazioni** | una sola, condivisa, come già oggi |
| **⚙ Impostazioni** | una chiave in più (RAWG); le piattaforme di gioco del profilo; le liste generi ✓/✗ si triplicano |

---

## 8. La postazione — **tre cambi**, come per il salotto

Stessa regola della volta scorsa: il layout non si muove di un pixel, cambiano solo le tre
cose già isolate in funzioni loro.

| # | Cinema | Salotto | Postazione |
|---|---|---|---|
| 1 | poltrone singole | cuscini di un divano | ✅ **sedie da gaming**: schienale alto, alette laterali, poggiatesta, del colore della persona. Stessa interazione, stessa nuvoletta col nome |
| 2 | schermo del proiettore | TV | **monitor**: stessa cornice, **stesso aspect ratio (non si tocca)**, cornice sottile scura, piedistallo centrale e alone di luce dietro (bias light) |
| 3 | sipario di velluto | accensione/spegnimento TV | **caricamento**: accendendosi una barra si riempie da sinistra e l'immagine appare; spegnendosi l'immagine si ritira nella barra che si svuota. Stesso aggancio (`schermo.classList` `aperto`/chiuso) e stesse durate dell'animazione TV |

Scartata la variante **controller** (ogni posto un gamepad del colore della persona):
riconoscibile a colpo d'occhio, ma stacca troppo dalle altre due modalità.

### La palette

Terzo blocco `:root[data-modo="giochi"]`. Proposta di partenza (da correggere a video):

| Token | Film | Serie TV | Videogiochi (proposta) |
|---|---|---|---|
| `--bg` / `--bg2` | `#191014` / `#221419` | `#0f1620` / `#151f2c` | `#120d1c` / `#191227` — notte viola |
| `--velluto` / `2` / `3` | rossi | blu | `#2c1f47` / `#221a38` / `#3d2c63` |
| `--rosso` / `--rosso2` | `#8a3d3d` / `#a85454` | azzurri | `#6d4bd6` / `#8b6ff0` — viola acceso |
| `--oro` / `--oro2` | invariati | invariati | **invariati** — l'oro resta, come deciso per il salotto |

---

## 9. Cosa costa

| Pezzo | Peso |
|---|---|
| Riga in `MODI`, `listaGiochi`, generi, parole `data-giochi` | piccolo, meccanico |
| **Adattatore RAWG** (`cercaFilm`/`dettagliFilm`, terzo ramo) | medio, ~70 righe per file — è codice nuovo, non un gemello |
| Play + ore + «finito» (§5b) | medio |
| Palette viola | piccolo |
| **Postazione (controller, monitor, caricamento)** | **il pezzo grosso**: è disegno, si fa e si rifà |
| Demo con qualche gioco finto, documentazione | piccolo |
| Mobile: tutto quanto sopra, di nuovo | **raddoppia** |

**I rischi, in ordine:**

1. **Le immagini orizzontali** (§6): è l'unica cosa che si vedrà subito e che non ha una
   risposta perfetta. Da guardare a video prima di dire che va bene.
2. **La chiave RAWG**: senza, la modalità non cerca niente. Serve prima di provarla sul
   serio (la demo con giochi finti funziona lo stesso).
3. **Il file cresce ancora.** 3.846 righe oggi; la terza modalità aggiunge rami, non
   copie, ma è il momento in cui la decomposizione in `src/` prevista dalla SPECIFICA §2
   smette di essere teorica.
4. **Le parole**: «visto» diventa «giocato», «Watch List» diventa «Da giocare». Noioso e
   banale, ma sparso.

---

## 10. Reversibilità

Identica alla volta scorsa, e per costruzione:

1. **Codice** — ramo dedicato, `master` fermo; se non convince si cancella il ramo.
2. **Dati** — i file di film e serie non vengono **mai** toccati; i giochi vivono in
   `giochi/`, cancellabile in blocco. L'unica aggiunta ai profili è `listaGiochi` (più i
   generi e le piattaforme), che le versioni vecchie ignorano.
3. **A video** — finché non si sceglie 🎮 l'app si comporta esattamente come adesso, e la
   casella delle modalità si spegne da ⚙ Impostazioni.

E finché non arriva un «pubblica» esplicito, tutto resta in commit locali.
