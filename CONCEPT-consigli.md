# Concept — Consigli personalizzati («Per te»)

> **Stato: idea, non implementata.** Documento di lavoro per decidere se e come farla.
> Le formule qui sono tarate sui dati reali della cartella del gruppo (agosto 2026).

## 1. L'idea in una riga

Dalle recensioni di una persona si ricava un **profilo del gusto**; lo si confronta col
catalogo TMDB e si propongono film nuovi con un **indice di compatibilità 0–100**,
sempre accompagnato dal **perché**.

---

## 2. Su cosa possiamo contare davvero

Verificato sui dati veri, non sulla carta:

| Dato | Stato |
|---|---|
| Recensioni di Marco | **75** con voto, **100%** complete di generi, regista, cast, anno, durata e voto pubblico |
| Recensioni di Simone / Stefano | **2 ciascuno** |
| Altri 3 profili | **0 recensioni** |
| Storico visioni | 7 serate |
| Watch list | desideri 1–5, generi positivi/negativi già dichiarati nel profilo |
| TMDB | `discover`, `recommendations`, `similar`, `keywords`, `watch/providers` — tutti gratis con la chiave che avete già |

**Conseguenza di progetto:** la funzione nasce già utile per un utente e inutilizzabile
per quattro. Il fallback per chi ha poche recensioni non è un dettaglio da rimandare:
è metà del lavoro (§8).

---

## 3. La scoperta che cambia il design: frequenza ≠ preferenza

Calcolando le medie dei voti di Marco per genere viene fuori questo:

| Genere | Film visti | Voto medio | Scarto dalla sua media (7,80) |
|---|---|---|---|
| Animazione | 6 | 9,00 | **+0,80** |
| Dramma | 13 | 8,62 | **+0,66** |
| Fantasy | 11 | 8,36 | **+0,44** |
| Fantascienza | 29 | 7,79 | −0,01 |
| Azione | 32 | 7,63 | −0,16 |
| Avventura | 28 | 7,50 | −0,27 |
| Horror | 22 | 7,36 | **−0,38** |

I generi **più guardati sono tra i meno amati**. Azione, Avventura e Horror sommano il
grosso della collezione ma stanno tutti sotto la media personale; Animazione e Dramma,
pochi film, stanno nettamente sopra.

Un sistema ingenuo («guardi tanto Horror → altro Horror») consiglierebbe esattamente la
roba sbagliata. **L'indice deve pesare il voto, mai il conteggio.**

Stesso quadro sui registi (≥2 film): Villeneuve +0,77 e Tarantino +0,60 in cima,
Kevin Greutert −0,73 e Bryan Singer −0,57 in fondo.

---

## 4. Il profilo del gusto

Per ogni **tratto** (genere, regista, attore, decennio, durata, paese) si calcola
un'affinità, con due accortezze obbligatorie.

**(a) Media bayesiana**, per non farsi ingannare dai tratti rari:

```
A(t) = ( somma_voti(t) + k · M ) / ( n(t) + k )        k ≈ 3, M = media personale
```

Serve perché su **59 registi distinti solo 10 hanno ≥2 film**: senza smoothing, un
singolo film votato 10 farebbe di quel regista un idolo. Con k=3, un 10 isolato su una
media di 7,80 diventa 8,35 — un segnale, non una sentenza.

**(b) Normalizzazione sulla dispersione personale**, non su un valore fisso:

```
a(t) = ( A(t) − M ) / (2 · σ)      σ = deviazione standard dei voti personali
```

Marco ha σ = 1,32 e vota tra 4 e 10 con media 7,80: è un votante «compresso in alto».
Chi usa tutta la scala avrebbe σ molto diverso. Dividere per σ rende l'indice
confrontabile tra persone diverse invece che premiare i generosi.

Risultato: `a(t)` in circa **[−1, +1]**, dove 0 = «come al solito».

**(c) Allineamento con la critica**, un numero solo per persona:

```
allineamento = 1 − |scarto medio tra voto personale e voto pubblico| / 4
```

Marco ha uno scarto medio di **+0,43** → allineamento ≈ 0,89: per lui il voto pubblico
è un buon indizio e può pesare. Per chi vota sistematicamente contro la critica, lo
stesso numero abbassa da solo il peso del voto pubblico. Niente da configurare a mano.

---

## 5. L'indice di compatibilità

Nello spirito della formula della Sala (`D × B × W × M`): **trasparente, tarabile,
spiegabile**. Costanti in `config.json` accanto alle altre.

```
C = 50 + 50 · ( wg·a_generi + wr·a_regista + wc·a_cast + we·a_epoca
                + wp·allineamento·q_pubblico + wd·bonusGeneriDichiarati )
```

- `a_generi` — media delle affinità dei generi del film
- `a_regista` — affinità del regista, **0 se sconosciuto** (neutro, non penalizzante)
- `a_cast` — media sui primi 3 attori conosciuti
- `a_epoca` — affinità del decennio d'uscita
- `q_pubblico` — voto TMDB/IMDb riportato in [−1, +1], **moltiplicato per l'allineamento**
- `bonusGeneriDichiarati` — i generi ✓/✗ già impostati nel profilo (dato che esiste già)
- pesi `w*` a somma 1, di default qualcosa come 0,30 / 0,20 / 0,10 / 0,10 / 0,20 / 0,10

**Onestà sui numeri:** gli scarti reali vanno da +0,80 a −0,38, dentro una σ di 1,32. Il
segnale è vero ma sottile. Quindi:

- niente decimali finti: mostrare fasce («Molto in linea» ≥ 75, «Da provare» 60–74) o
  percentuali arrotondate a 5;
- **pochi consigli molto motivati** meglio di una lista lunga;
- un film senza tratti riconoscibili resta a ~50 e non va mostrato come «consigliato».

**Il perché, sempre.** Si prendono i 2–3 contributi più forti e si scrive in chiaro:

> **88% — Molto in linea**
> Ami Villeneuve (3 film, media 8,6) · Dramma è il tuo genere forte (+0,7) ·
> voto pubblico alto e di solito sei d'accordo con la critica

---

## 6. Da dove arrivano i film da proporre

Un imbuto, per non scaricare mezzo TMDB:

1. **`/discover/movie`** con i filtri attivi + i tratti forti dell'utente
   (`with_genres` dei generi più amati, `with_crew` dei registi amati, `vote_count.gte`
   per escludere le nicchie con 4 voti).
2. **`/movie/{id}/recommendations`** partendo dai suoi 5 film col voto più alto.
3. Unione e **dedup**, poi si scartano: già visti (storico), già in watch list,
   già recensiti.
4. Solo per i **primi ~40** si chiede la scheda completa: `discover` **non restituisce il
   regista**, che serve al calcolo — è la parte più costosa.
5. Calcolo di `C`, ordinamento, si mostrano i primi 15–20.

---

## 7. I filtri (la parte richiesta)

Barra come quella della Watch List, tutti opzionali e combinabili:

- **Genere** (multiplo, ✓ includi / ✗ escludi)
- **Regista / attore** (ricerca persona TMDB)
- **Anno** da–a · **Durata massima** · **Voto pubblico minimo**
- **Lingua / paese**
- **Solo dove posso vederlo** — incrocia `serviziStreaming` del profilo con
  `watch/providers`: qui la funzione diventa immediatamente pratica
- **Escludi i miei generi ✗**, attivo di default

I filtri agiscono **prima** (su `discover`) e non solo come setaccio a valle: così i 40
candidati costosi sono già quelli giusti.

---

## 8. Chi ha poche recensioni (il caso di 4 profili su 6)

Tre livelli, decisi dal numero di recensioni:

| Recensioni | Cosa fa |
|---|---|
| **≥ 8** | Profilo pieno, indice con percentuale |
| **3–7** | Solo generi + voto pubblico + generi dichiarati; niente percentuale, si dice «potrebbe piacerti» |
| **0–2** | Nessun indice personale. Si parte dai **generi ✓ dichiarati** e dai **desideri della watch list**, oppure — più interessante — dal **gusto di chi somiglia**: con 6 profili è un vicinato piccolo ma vero |

Con 0 recensioni la schermata non deve essere vuota: propone di recensire 3 film già
visti («bastano tre voti per iniziare»), agganciandosi alla lista *film visti non ancora
recensiti* che esiste già.

---

## 9. Costi e cache

- Una generazione completa ≈ **40–60 chiamate** TMDB (grosse solo le schede dei candidati).
- I risultati vanno salvati in **`consigli/<slug>.json`** con la data, così l'app non
  ricalcola a ogni apertura: si rigenera a comando o quando cambiano le recensioni.
- Rispetta la regola anti-conflitto: **ognuno scrive solo il proprio file**.
- In demo, provider e candidati finti come già si fa per lo streaming.

---

## 10. Dove sta nell'app

Nuova sezione **«✨ Per te»** accanto a Recensioni (a tutti, non solo host).

- Griglia di locandine come l'Archivio recensioni, con **anello/badge oro della
  percentuale** in alto a sinistra.
- Clic → scheda film con **il perché**, i badge streaming (già esistono) e due tasti:
  **🎬 Aggiungi alla mia lista** (riusa `modaleAggiungi`) e **non mi interessa**.
- «Non mi interessa» va ricordato in `consigli/<slug>.json`: senza, la stessa proposta
  rifiutata torna ogni volta ed è la cosa che fa abbandonare queste funzioni.

**Estensione naturale (molto Movienaitor):** modalità **gruppo** — compatibilità calcolata
sui presenti in Sala, mostrando il **minimo** e non la media, così si evita il film che
entusiasma uno e annoia tutti gli altri. Diventa «cosa piacerebbe a *tutti* stasera»,
che è poi il problema che l'app risolve.

---

## 11. Da decidere prima di partire

1. **Fasce o percentuale?** Vista la sottigliezza del segnale, le fasce sono più oneste.
2. **Le keyword TMDB** (`/keywords`: «distopia», «viaggio nel tempo») sono molto più
   specifiche dei generi e spiegherebbero meglio i consigli — ma sono +1 chiamata per
   film. Da valutare in una v2.
3. **Peso del cast**: con 75 recensioni gli attori ricorrenti sono pochi; forse per ora
   vale zero e si aggiunge dopo.
4. **Solo film, o anche «rivedi questo»?** Lo storico dice cosa è già passato in Sala.
5. Il **testo** delle recensioni oggi non viene usato: servirebbe un'analisi del
   linguaggio che va oltre lo spirito «formula trasparente» dell'app. Lasciare fuori.
