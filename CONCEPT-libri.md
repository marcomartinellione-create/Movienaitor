# Concept — Libri come quarta modalità

> **Stato: deciso, in costruzione (desktop per primo).**
> Ricalca `CONCEPT-giochi.md`, che a sua volta ricalcava `CONCEPT-serie.md`. A questo giro
> l'impianto è tutto in piedi: `MODI`, `CHIAVI_MODO`, `PAROLE`, i percorsi per categoria,
> i rimandi `[[…]]` che attraversano le categorie, lo stato «in corso / finito».
>
> **Deciso con Marco (2026-09-02):** senso = **club del libro, ma la lista serve anche da
> soli** (§1) · unità = **in corso / finito**, come i videogiochi (§4) · sala = **vetrina
> con copertina e risvolto** (§6) · libreria = **Open Library, nessuna chiave** (§3).

## 1. A cosa serve

Un libro si legge da soli, e questo è l'unico punto in cui i libri non somigliano alle
altre tre categorie: la Sala decide cosa fare **insieme**. La risposta scelta è che la
Sala serve a **scegliere insieme il prossimo libro** — un club del libro — mentre la
Watch List e le Recensioni restano utili anche a chi legge per conto suo.

Conseguenza pratica: **le scritte parlano meno di «stasera»**. La macchina sotto non
cambia di una riga — chi c'è, quanto lo desidera, di chi è il turno, l'indice di
soddisfazione: tutto continua a contare le **scelte fatte insieme**, che è ciò che
misurava anche prima.

## 2. Cosa costa (quasi niente d'impianto)

| Cosa | Serie (allora) | Giochi (ieri) | Libri (oggi) |
|---|---|---|---|
| Percorsi per categoria | da inventare | fatto | **una riga in `MODI`** |
| Liste e generi nel profilo | da fare | fatto | **una riga in `CHIAVI_MODO`** |
| Parole | da inventare | fatto | **una riga in `PAROLE`** + gli attributi `data-libri` |
| Stato «in corso / finito» | — | scritto per i giochi | **da generalizzare** (§4) |
| Libreria | TMDB | RAWG | **Open Library** (§3) |

Restano da fare per davvero: l'**adattatore Open Library**, la **generalizzazione dello
stato**, la **vetrina** (disegno) e la palette. Più il solito lavoro doppio sul mobile.

## 3. La libreria — **Open Library**, senza chiave

Verificato sul campo, non sulla carta:

| Candidato | Verdetto |
|---|---|
| **Google Books** | metadati ottimi e CORS aperto, ma **senza chiave è a quota per indirizzo IP** (dai test è tornato 429 ripetutamente). Vorrebbe l'ennesima chiave |
| **Open Library** | ✅ CORS `*`, **nessuna chiave**, e dà tutto quello che serve |

Su *Il nome della rosa*, in una chiamata sola:

```
title  Il nome della rosa      number_of_pages_median  533
author Umberto Eco             ratings_average         4.15  (122 voti)
year   1980                    cover_i                 8598263
```

E la **copertina è verticale vera** — 338×500, rapporto 0.68, praticamente identico al 2:3
delle locandine dei film. Dopo il ritaglio delle key art dei videogiochi (§6
CONCEPT-giochi), qui le copertine entrano nelle caselle senza torcere un pixel.

- ricerca: `GET /search.json?q=…&limit=10&fields=…`
- copertina: `https://covers.openlibrary.org/b/id/{cover_i}-L.jpg`
- scheda: `GET /works/{id}.json` per la trama

### La mappatura dei campi

| Campo della voce | Film | Libro (Open Library) |
|---|---|---|
| `titolo` | `title` | `title` |
| `anno` | `release_date` | `first_publish_year` |
| `durata` | `runtime` (minuti) | `number_of_pages_median` — **pagine** |
| `regista` | regista | `author_name` → **autore** |
| `voto` | IMDb | `ratings_average` (0-5 → ×2) |
| `generi` | tassonomia TMDB | `subject`, filtrati (vedi sotto) |
| `paese` | paesi | `publisher` → editore |

**Il punto debole sono i generi.** `subject` è un campo libero, multilingua e rumoroso
(*«Novela de misterio», «Monasticismo y vida religiosa», «History»*). Non si può darlo in
pasto ai filtri così com'è. Soluzione, la stessa dei videogiochi: un **elenco curato di
generi letterari** (`GENERI_LIBRI`) e si tiene solo ciò che combacia, scartando il resto.

Il filtro della serata diventa **«lunghezza massima»** in pagine.

## 4. L'unità — **in corso / finito**, generalizzata

Stessa scelta dei videogiochi: Play chiede **«a che punto siete»**, il libro resta in lista
finché non lo si segna finito, e in tutti e due i casi compare fra i titoli da recensire —
di un libro si scrive benissimo mentre lo si sta ancora leggendo.

**Ma non si scrive `if (inGiochi() || inLibri())`.** Lo stato diventa una **proprietà della
categoria**, dichiarata in `MODI`:

```js
{id:'libri', ic:'📚', nome:'Libri', radice:['libri'], libreria:'OpenLibrary', stato:true}
```

`entryAttiva`, il Play e le scorciatoie guardano quel campo, non l'identità della
categoria. È la lezione dell'ultimo giro scritta in positivo: ogni volta che si ragiona
«questa categoria sì e quell'altra no» si prepara un difetto per la categoria successiva.
Anche `LIBRERIA()` diventa un campo, invece di un ternario.

Scartato il **segnalibro a pagina** (Play che chiede «a che pagina siete», Sala che scrive
*«pag. 210 di 533»*): più ricco, ma chiede di annotare ogni volta una cosa che nessuno
annota. Resta un'idea per dopo, i dati per farlo ci sono già.

## 5. Dove vivono i dati

Come sempre, spazio separato:

```
storico.json …          ← FILM        giochi/…   ← VIDEOGIOCHI
serie/…      ← SERIE TV               libri/…    ← LIBRI
```

Nel profilo: `listaLibri`, `generiPositiviLibri`, `generiNegativiLibri`. Le versioni
vecchie dell'app non vedono la cartella `libri/` e non se ne accorgono.

## 6. La sala — **la vetrina**

Tre cambi, come le altre due volte. Il layout non si muove di un pixel.

| # | Cinema | Salotto | Postazione | Biblioteca |
|---|---|---|---|---|
| 1 | poltrone | cuscini del divano | sedie da gaming | **poltrone da lettura**: schienale alto e avvolgente, braccioli imbottiti |
| 2 | schermo del proiettore | TV | monitor | **vetrina**: il riquadro tiene le sue proporzioni, ma dentro c'è la **copertina verticale vera** a sinistra e il testo a destra, come il risvolto di sovraccoperta. Sullo sfondo la copertina stessa, sfocata |
| 3 | sipario | accensione TV | barra di caricamento | **la lampada da lettura che si accende**: la luce calda si apre dall'alto e scende sulla pagina; spegnendosi si richiude |

È l'unica categoria in cui il riquadro non è uno schermo, e il motivo per cui la vetrina
funziona: la copertina di un libro **è** verticale, quindi invece di ritagliarla la si
mostra intera e le si costruisce intorno il risvolto.

### La palette

Rosso velluto (film), notte blu (serie), notte viola (giochi) → **verde biblioteca** per i
libri: verde bottiglia, legno scuro, carta. L'oro resta l'accento, come nelle altre tre.

## 7. Reversibilità

Come sempre: i file delle altre categorie non si toccano, i libri vivono in `libri/`
(cancellabile in blocco), l'unica aggiunta ai profili è `listaLibri` che le versioni
vecchie ignorano, e finché non si sceglie 📚 l'app si comporta esattamente come adesso.
