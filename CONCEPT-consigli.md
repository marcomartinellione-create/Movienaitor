# Concept — Consigli personalizzati («Per te»)

> **Stato: implementato sul desktop** (v1.7.0) — sezione «✨ Per te».
> Mobile ancora da portare. Questo resta il documento di riferimento delle scelte.
> Formule tarate sui dati reali della cartella del gruppo (agosto 2026).
> Decisioni prese con Marco già recepite (§0).

## 0-bis. Tarature emerse dall'implementazione

Due cose sono venute fuori solo provando, e sono finite nel codice:

- **Il voto pubblico va compresso**: normalizzato come gli altri tratti arrivava a ±1
  mentre generi e registi stanno in ±0,3, e schiacciava tutto — i consigli diventavano
  la classifica IMDb. Ora è `(voto − 7)/4`, in scala con il resto.
- **Le soglie 60 / 52 sono giuste**, verificate simulando sui 75 voti reali:
  film ideale **70,3** · buono **67,7** · neutro **53,4** · scarso **37,8**.

Nota: le keyword TMDB restano **in inglese** anche chiedendo `language=it-IT` (TMDB non le
traduce). Vanno benissimo per il confronto; si vedono in inglese nella scheda.

## 0. Decisioni prese

| Punto | Scelta |
|---|---|
| Come si mostra l'affinità | **Fasce**, non percentuali al decimale |
| Keyword TMDB | **Dentro** — sono il segnale più specifico che abbiamo |
| Cast | **Dentro**, con pesi che si ridistribuiscono (§5) |
| Cosa si propone | **Solo film mai visti** dall'utente |
| Testo delle recensioni | Fuori per ora — concept a parte in **appendice A** |
| Utenti senza recensioni | Non è una priorità: il profilo si forma da sé appena recensiscono |
| Memoria del telefono | **Niente** viene scaricato: né locandine né altro (§8) |

---

## 1. L'idea in una riga

Dalle recensioni di una persona si ricava un **profilo del gusto vivo**; lo si confronta
col catalogo TMDB e si propongono film mai visti, ordinati per affinità e sempre
accompagnati dal **perché**.

---

## 2. Su cosa possiamo contare davvero

Verificato sui dati veri:

| Dato | Stato |
|---|---|
| Recensioni di Marco | **75** con voto, **100%** complete di generi, regista, cast, anno, durata, voto pubblico |
| Media personale | **7,80** · deviazione standard **1,32** · voti da 4 a 10 |
| Registi distinti | 59, di cui **solo 10 con ≥2 film** |
| Keyword TMDB | **Non ancora salvate** nelle recensioni → serve un arricchimento una tantum (§4) |
| TMDB | `discover`, `recommendations`, `keywords`, `watch/providers`: gratis con la chiave che avete |
| **Limiti TMDB** | Rate limit legacy **rimosso** dal 16/12/2019. Resta solo ~**40 richieste al secondo**, **nessun limite giornaliero** (verificato sulla doc ufficiale) |
| Limiti OMDb | 1.000/giorno — ma i consigli **non** lo usano |

**Sui costi:** 40–60 chiamate a generazione non sfiorano nessuna soglia. Il vincolo è la
velocità, non la quantità: basta procedere in serie o a gruppi di 5–10.

---

## 3. La scoperta che governa tutto: frequenza ≠ preferenza

Medie dei voti di Marco per genere:

| Genere | Film | Voto medio | Scarto da 7,80 |
|---|---|---|---|
| Animazione | 6 | 9,00 | **+0,80** |
| Dramma | 13 | 8,62 | **+0,66** |
| Fantasy | 11 | 8,36 | **+0,44** |
| Fantascienza | 29 | 7,79 | −0,01 |
| Azione | 32 | 7,63 | −0,16 |
| Avventura | 28 | 7,50 | −0,27 |
| Horror | 22 | 7,36 | **−0,38** |

I generi **più guardati sono tra i meno amati**. Un sistema che ragionasse sui conteggi
proporrebbe altro Horror e altra Azione — esattamente il contrario del giusto.
**L'indice pesa il voto, mai la frequenza.**

Stesso quadro sui registi (≥2 film): Villeneuve +0,77 e Tarantino +0,60 in cima,
Kevin Greutert −0,73 e Bryan Singer −0,57 in fondo.

---

## 4. Il profilo del gusto — **si costruisce da solo, e resta vivo**

Non è un preset da scrivere né da mantenere: è un **calcolo rifatto da zero a ogni
generazione**, leggendo le recensioni presenti in quel momento. Un utente nuovo non deve
configurare nulla — il suo profilo esiste appena pubblica le prime recensioni.

Per ogni **tratto** (genere, **keyword**, regista, attore, decennio, paese, durata) si
calcola un'affinità, con quattro accortezze.

### (a) Le recensioni recenti pesano di più

Risponde al problema vero: *se cambio stile di critica, le recensioni vecchie mi
trascinano indietro*.

```
peso(r) = 0,5 ^ ( età_in_mesi / 18 )        ← dimezzamento ogni 18 mesi, tarabile
```

Una recensione di ieri conta 1, una di 18 mesi fa conta 0,5, una di 3 anni fa 0,25. Il
profilo **segue** il gusto mentre cambia, senza reset manuali.

### (b) Media bayesiana, contro i tratti rari

```
A(t) = ( Σ peso·voto + k · M ) / ( Σ peso + k )        k ≈ 3
```

Serve perché su **59 registi solo 10 hanno ≥2 film**: senza smoothing un singolo 10
farebbe di quel regista un idolo. Con k=3 un 10 isolato su media 7,80 diventa 8,35 — un
segnale, non una sentenza.

### (c) Normalizzazione sulla **tua** scala, ricalcolata di continuo

```
a(t) = ( A(t) − M ) / (2 · σ)
```

dove **M e σ sono calcolati con gli stessi pesi temporali**. Se prima davi tutto 7–8 e
ora usi tutta la scala, media e dispersione cambiano insieme a te: l'indice resta
calibrato sul votante che sei *adesso*. È questo che rende il sistema auto-correggente,
e rende confrontabili persone che votano in modo diverso.

### (d) Le keyword — il segnale più specifico

Le keyword TMDB («distopia», «viaggio nel tempo», «tratto da un romanzo») dicono molto
più dei generi: separano *Interstellar* da *Fast & Furious* che sono entrambi «Azione».

**Costo: zero chiamate in più.** `append_to_response` accetta fino a 20 endpoint, quindi
basta cambiare la chiamata che l'app già fa:

```
/movie/{id}?append_to_response=credits,external_ids          ← oggi
/movie/{id}?append_to_response=credits,external_ids,keywords ← domani
```

**Unico lavoro una tantum:** le 75 recensioni esistenti non hanno le keyword salvate in
`meta`. Serve un passaggio di arricchimento (75 chiamate, una volta sola, con barra di
avanzamento) che le aggiunge alle recensioni già scritte. Da lì in poi ogni nuova
recensione le salva da sé.

### (e) Allineamento con la critica

```
allineamento = 1 − |scarto medio tra voto personale e voto pubblico| / 4
```

Marco ha scarto **+0,43** → allineamento ≈ **0,89**: per lui il voto pubblico è un buon
indizio e può pesare. Per chi vota sistematicamente contro la critica lo stesso numero
abbassa da solo quel peso, senza configurare niente.

---

## 5. L'indice di compatibilità

Nello spirito della formula della Sala (`D × B × W × M`): trasparente, tarabile da
`config.json`, spiegabile.

```
C = 50 + 50 · ( Σ wᵢ·aᵢ ) / ( Σ wᵢ sui soli tratti noti )
```

| Tratto | Peso indicativo |
|---|---|
| Keyword | 0,25 |
| Generi | 0,25 |
| Regista | 0,15 |
| Voto pubblico × allineamento | 0,15 |
| Cast (primi 3 noti) | 0,08 |
| Epoca / durata | 0,07 |
| Generi ✓/✗ dichiarati nel profilo | 0,05 |

**I pesi si ridistribuiscono.** È il punto che risolve il dubbio sul cast: se di un film
non conosco né regista né attori, il loro peso **torna** a keyword e generi invece di
trascinare il punteggio verso il neutro. Un tratto conta quando ha qualcosa da dire e
sparisce quando no — non diluisce mai gli altri.

### Le fasce (invece delle percentuali)

Con i dati reali gli scarti stanno fra +0,80 e −0,38 dentro una σ di 1,32: il segnale è
vero ma **compresso**, e i punteggi si addenserebbero fra 40 e 70. Una percentuale
secca sarebbe una precisione finta. Quindi:

- le fasce si assegnano **per posizione relativa** dentro il lotto di candidati valutati
  (autocalibrante: non dipende da quanto è compressa la scala di quella persona);
- con una **soglia minima assoluta**, così non si spaccia per ottimo il meno peggio di
  un lotto scarso.

| Fascia | Regola |
|---|---|
| **Molto in linea** | top ~15% dei candidati **e** C ≥ 60 |
| **Da provare** | successivo ~35% **e** C ≥ 52 |
| **Forse** | resto sopra la neutralità |
| *(non mostrato)* | sotto 50, o senza tratti riconoscibili |

Le keyword dovrebbero allargare parecchio la forbice: è il motivo principale per cui
vale la pena metterle.

### Il perché, sempre

Si prendono i 2–3 contributi più forti e si scrive in chiaro:

> **Molto in linea**
> «distopia» e «viaggio nel tempo» sono ricorrenti nei film che voti alto ·
> ami Villeneuve (3 film, media 8,6) · Dramma è il tuo genere forte (+0,7)

---

## 6. Da dove arrivano i film da proporre

1. **`/discover/movie`** coi filtri attivi + i tratti forti (`with_keywords` dei temi
   amati, `with_genres`, `with_crew` dei registi amati, `vote_count.gte` per scartare le
   nicchie con quattro voti).
2. **`/movie/{id}/recommendations`** dai 5 film col voto personale più alto.
3. Unione, dedup, e si scartano: **già visti** (storico), già in watch list, già
   recensiti. → *solo film nuovi*, come deciso.
4. Per i primi ~40 si chiede la scheda completa con `credits` **e** `keywords` in una
   sola chiamata (`discover` non restituisce il regista, che serve al calcolo).
5. Calcolo di `C`, fasce, si mostrano i primi 15–20.

---

## 7. I filtri

Barra come quella della Watch List, tutti opzionali e combinabili:

- **Genere** (multiplo, ✓ includi / ✗ escludi) · **Keyword/tema**
- **Regista / attore** (ricerca persona TMDB)
- **Anno** da–a · **Durata massima** · **Voto pubblico minimo** · **Lingua/paese**
- **Solo dove posso vederlo** — incrocia i `serviziStreaming` del profilo con
  `watch/providers`: è ciò che rende la funzione immediatamente pratica
- **Escludi i miei generi ✗**, attivo di default

I filtri agiscono **a monte**, su `discover`, non come setaccio finale: così i 40
candidati costosi sono già quelli giusti.

---

## 8. Vincolo: niente sulla memoria del telefono

Confermato e già rispettato oggi (verificato nel codice):

- le **locandine non vengono mai scaricate**: `salvaImmagini()` è vuota dalla v1.1.2 e
  `urlImmagine()` restituisce l'URL remoto — le immagini si vedono in streaming;
- l'app mobile scrive **solo JSON**, e solo dentro la cartella condivisa scelta
  dall'utente;
- unica eccezione, per onestà: l'**APK di aggiornamento** viene copiato nella *cache*
  dell'app perché Android lo pretende per installare. È cache di sistema, cancellabile.

**Per i consigli vale la stessa regola:** `consigli/<slug>.json` va **nella cartella
condivisa** come tutto il resto, e contiene solo id dei film, punteggi, data di
generazione e i «non mi interessa». **Nessuna immagine, nessun file fuori.**
Ognuno scrive solo il proprio file (regola anti-conflitto).

---

## 9. Dove sta nell'app

Nuova sezione **«✨ Per te»** accanto a Recensioni, per tutti.

- Griglia di locandine come l'Archivio recensioni, con la **fascia** come nastro in alto
  a sinistra (oro per «Molto in linea», più sobria per le altre).
- Clic → scheda con **il perché**, i badge streaming (già esistono) e due tasti:
  **🎬 Aggiungi alla mia lista** (riusa `modaleAggiungi`) e **non mi interessa**.
- Il rifiuto va ricordato: senza, la stessa proposta scartata torna ogni volta — è la
  cosa che fa abbandonare queste funzioni.
- In cima, una riga di trasparenza: *«costruito su 75 recensioni, le più recenti pesano
  di più»*, con un link per rigenerare.

**Estensione naturale — modalità gruppo.** Compatibilità calcolata sui presenti in Sala
mostrando il **minimo** e non la media, così si evita il film che entusiasma uno e
annoia gli altri quattro. Diventa «cosa piacerebbe a *tutti* stasera», che è poi il
problema che Movienaitor risolve.

---

## Appendice A — Usare il testo delle recensioni (idea per dopo)

Oggi le sezioni scritte (*Introduzione, Che ne penso, Momento preferito, Messaggio,
A chi lo consiglio*) non vengono usate. Sono la parte più ricca e più difficile.

**Cosa ci sarebbe dentro**

- *A chi lo consiglio* è già, letteralmente, un campo di raccomandazione scritto a mano:
  è il pezzo di testo più prezioso e il più strutturato nell'intenzione.
- Il resto contiene il **vocabolario personale** del giudizio: le parole che uno usa
  quando un film gli piace non sono quelle che usa quando lo stronca.

**Strada consigliata: lessico personale, tutto in locale**

Senza server, senza chiavi in più, senza mandare fuori i testi:

1. Si dividono le recensioni in **amate** (voto ≥ media + σ) e **deludenti** (≤ media − σ).
2. Si contano le parole nei due gruppi e si tengono quelle **sproporzionate** da una
   parte o dall'altra (una TF-IDF povera, poche righe di JS, nessuna dipendenza).
   Ne esce qualcosa come: «atmosfera», «fotografia», «ritmo» fra le amate; «lento»,
   «prevedibile», «confuso» fra le deludenti.
3. Quelle parole si confrontano con **trama e keyword** dei film candidati, come un
   tratto in più nella formula (peso basso, 0,05–0,10).

Vantaggi: resta nello spirito dell'app — formula trasparente, ispezionabile, nessun
dato che esce. Si può anche **mostrare il lessico** all'utente («le parole che usi quando
un film ti piace»), che da solo è una funzione simpatica.

Limiti da mettere in conto: serve un minimo di 20–30 recensioni perché le frequenze
dicano qualcosa; l'italiano ha bisogno di una lista di parole vuote (*articoli,
preposizioni*) e di un minimo di normalizzazione; la negazione («**non** mi è piaciuto
il ritmo») sfugge a un conteggio di parole.

**Strada alternativa: un modello linguistico.** Riassumerebbe il gusto in una frase e
capirebbe le negazioni, ma richiede una chiave a pagamento, manda i testi personali a
terzi e rompe il patto dell'app («nessun server, dati solo nella vostra cartella»).
**Sconsigliata** finché il lessico locale non si dimostra insufficiente.
