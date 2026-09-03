# Movienaitor — Manuale

> Versione testuale del manuale impaginato: [Manuale.html](Manuale.html), nella stessa
> cartella — un file autonomo, apribile con un doppio clic, senza connessione né account.
> Le due copie vengono mantenute allineate.

- **Il progetto su GitHub** — codice, versioni da scaricare e novità di ogni aggiornamento:
  <https://github.com/marcomartinellione-create/Movienaitor>
- **Video tutorial** — una panoramica in video di come si usa: *non ancora pubblicato.*

## 1. Descrizione

**In sintesi.** Movienaitor è un'applicazione per la **selezione condivisa di un titolo** fra più partecipanti e per l'**archiviazione delle relative recensioni**. Nata per la scelta del film, gestisce oggi quattro categorie: film, serie TV, videogiochi e libri.

Ogni partecipante mantiene un elenco personale di titoli con un indice di preferenza; l'applicazione calcola una classifica in base ai presenti e registra la sessione in uno storico condiviso.

### Struttura
Le quattro categorie sono indipendenti: elenchi, storico, recensioni e suggerimenti di una categoria non interagiscono con quelli delle altre. La categoria attiva si seleziona dal comando in basso a destra.

Ogni categoria espone quattro sezioni, corrispondenti alle schede in alto:

<table><thead><tr><th>Sezione</th><th>Funzione</th></tr></thead><tbody><tr><td>🎬 Sala</td><td>Selezione dei partecipanti e calcolo della classifica della sessione.</td></tr><tr><td>🔖 Watch List</td><td>Elenco personale: titoli da fruire e titoli già fruiti.</td></tr><tr><td>📝 Recensioni</td><td>Voto e testo strutturato, propri e degli altri profili.</td></tr><tr><td>✨ Per te</td><td>Suggerimenti calcolati sulle recensioni del profilo.</td></tr></tbody></table>A queste si aggiungono le **impostazioni** (⚙), il comando di **segnalazione** (🐞) e, per i profili con modalità host attiva, due sezioni supplementari.

---

## 2. Archiviazione dei dati

**In sintesi.** L'applicazione è costituita da un **unico file** e non richiede alcun server. I dati risiedono in una **cartella locale** indicata al primo avvio: restano quindi sul dispositivo dell'utente e non dipendono da servizi esterni.

Collocando tale cartella in un servizio di sincronizzazione (Google Drive o equivalente) si ottengono due effetti: l'accesso da **più dispositivi** e la condivisione fra **più profili**. La sincronizzazione è facoltativa: senza, l'applicazione funziona in modalità mono-utente.

### Contenuto della cartella
Il formato è JSON, in chiaro e ispezionabile. Non è previsto alcun database.

<table><thead><tr><th>Percorso</th><th>Contenuto</th></tr></thead><tbody><tr><td>`profili/<nome>.json`</td><td>Un profilo: elenchi, generi preferiti, gruppi, chiavi personali.</td></tr><tr><td>`storico.json`</td><td>Sessioni registrate. Ogni categoria dispone del proprio file nella rispettiva sottocartella: `serie/`, `giochi/`, `libri/`.</td></tr><tr><td>`config.json`</td><td>Chiavi condivise e parametri della formula di classifica.</td></tr><tr><td>`recensioni/<nome>/`</td><td>Recensioni del profilo, un file per titolo.</td></tr></tbody></table>
### Prevenzione dei conflitti
Il modello adotta il criterio di **un solo scrittore per file**: ciascun profilo è scritto esclusivamente dal proprio titolare. Ne consegue che due dispositivi non possono produrre versioni divergenti dello stesso file, e non è necessario un arbitro centralizzato.

Lo storico è l'unica risorsa a scrittura multipla. Prima di ogni scrittura il file viene **riletto e fuso** per identificativo di sessione: registrazioni simultanee da dispositivi diversi non comportano perdita di dati.

Il comando **⟳** nella barra superiore forza la rilettura della cartella.

---

## 3. Categorie

**In sintesi.** Ogni categoria dispone di una propria interfaccia, di una libreria online di riferimento e di una specifica unità di misura della durata. La logica applicativa è comune.

<table><thead><tr><th>Categoria</th><th>Interfaccia</th><th>Libreria</th><th>Unità</th><th>Chiave</th></tr></thead><tbody><tr><td>🎬 Film</td><td>Sala cinematografica</td><td>TMDB</td><td>minuti</td><td>richiesta</td></tr><tr><td>📺 Serie TV</td><td>Salotto</td><td>TMDB</td><td>minuti per episodio</td><td>richiesta</td></tr><tr><td>🎮 Videogiochi</td><td>Postazione</td><td>RAWG</td><td>ore di completamento</td><td>richiesta</td></tr><tr><td>📚 Libri</td><td>Biblioteca</td><td>Open Library</td><td>pagine</td><td>non richiesta</td></tr></tbody></table>
### Comportamenti specifici

### Serie TV: segnalibro
Una serie non si esaurisce in una sessione. Alla conferma viene richiesto il punto raggiunto — stagione, episodio iniziale e finale — e la serie **permane nell'elenco**: viene aggiornato unicamente il segnalibro. La rimozione è automatica al raggiungimento dell'ultimo episodio dell'ultima stagione pubblicata.

Le recensioni possono essere articolate **per stagione** anziché unitarie, tramite l'apposita opzione nell'editor.

### Videogiochi e libri: stato di avanzamento
Queste categorie non prevedono una numerazione degli episodi e adottano due stati: **in corso** (il titolo permane nell'elenco e continua a essere proposto) e **completato** (il titolo transita fra quelli già fruiti). Lo stato viene richiesto alla conferma della sessione.

**Differenza rilevante.** Per film e serie la stesura di una recensione equivale alla fruizione e sposta il titolo fra i già visti. Per videogiochi e libri non produce tale effetto, poiché la recensione può essere redatta durante la fruizione: solo lo stato «completato» determina lo spostamento.

### Libri: reperimento delle copertine
Open Library presenta una copertura incompleta delle copertine, particolarmente marcata sulle edizioni italiane. Sono previsti due meccanismi:

- in fase di ricerca le schede riferite alla stessa opera vengono **aggregate** — la libreria ne registra una per ristampa — conservando la più completa;
- all'apertura di un titolo privo di copertina, questa viene ricercata **nell'edizione in altra lingua della stessa opera**, identificata tramite Wikidata. Dalla medesima edizione viene recuperato, se assente, il **numero di pagine**, dato necessario al filtro sulla lunghezza.

Nei casi residui viene mostrato un segnaposto con il titolo. La condizione dipende dalla base dati di origine e non costituisce un malfunzionamento.

---

## 4. Elenco personale

**In sintesi.** L'inserimento di un titolo richiede la ricerca nella libreria di categoria e l'assegnazione di un **indice di preferenza da 1 a 5**. Tale valore è sufficiente affinché il titolo concorra alla classifica.

### Vincoli di compagnia
A ciascuna voce possono essere associati due vincoli relativi ai presenti:

- **Con chi** — elenco di profili la cui presenza contestuale attiva un bonus sul punteggio.
- **Non con** — elenco di profili la cui presenza **esclude** il titolo dalla classifica.

Lo stesso titolo può comparire negli elenchi di più profili: in Sala le voci vengono unificate e i titolari assumono la qualifica di **proponenti**.

### Filtri di visualizzazione
I filtri agiscono esclusivamente sulla visualizzazione e non modificano i dati. Sono disponibili: ricerca testuale sul titolo; ordinamento per data di inserimento, titolo, anno, preferenza o voto, con inversione del verso; soglia minima di preferenza; soglia minima di voto; intervallo di anni. Il comando «azzera» ripristina la configurazione predefinita.

Nella parte superiore è riportata la **distribuzione dei generi** dell'elenco in forma di barre percentuali.

### Titoli già fruiti
La sezione inferiore raccoglie le sessioni confermate e i titoli recensiti. Da essa un titolo può essere **reinserito nell'elenco** per una nuova fruizione.

La scheda di un titolo espone inoltre due comandi:

- **Visto** — registra la fruizione individuale senza passare dalla Sala. La sessione risulta con il solo titolare fra i partecipanti e **non incide sull'indice di soddisfazione degli altri profili**, non avendo impegnato una sessione collettiva.
- **Rimuovi dai già visti** — rimuove il solo titolare dalle sessioni relative a quel titolo. Le sessioni con altri partecipanti permangono nei rispettivi storici.

---

## 5. Sala

**In sintesi.** Si selezionano i profili presenti agendo sulle rispettive poltrone. L'applicazione espone il primo classificato sullo schermo principale e i successivi quattro nelle caselle laterali, selezionabili. Il comando **▶** registra la sessione.

### Comandi disponibili

- **Lista completa** — apre la classifica integrale, non limitata alle prime cinque posizioni. Qualsiasi titolo può essere selezionato.
- **Filtri della sessione** — durata massima, genere, regista. Hanno validità temporanea e non modificano gli elenchi dei profili.
- **Riga di stato** — riporta il numero di titoli in classifica, i presenti e il conteggio delle **esclusioni con relativa motivazione**. Costituisce il primo elemento da verificare in caso di risultato inatteso.
- **Scheda del titolo** — accessibile dallo schermo: trama, cast, disponibilità e dettaglio del punteggio.

### Registrazione della sessione
Il comando ▶ richiede informazioni differenti secondo la categoria: conferma semplice per i film; punto raggiunto per le serie, con aggiornamento del segnalibro; stato di avanzamento per videogiochi e libri.

In tutti i casi la sessione viene scritta nello storico condiviso e per i proponenti viene azzerato il conteggio dell'attesa.

---

## 6. Algoritmo di classifica

**In sintesi.** Il punteggio di un titolo è il prodotto di quattro fattori: indice di preferenza, coralità, indice di soddisfazione e bonus di compagnia.

Nessun valore intermedio viene memorizzato: la classifica è **ricalcolata a ogni esecuzione** a partire dallo storico.

### Fattori
<table><thead><tr><th>Fattore</th><th>Definizione</th></tr></thead><tbody><tr><td>Preferenza</td><td>**Media** degli indici di preferenza dei proponenti presenti. L'uso della media in luogo della somma impedisce che i titoli con molti proponenti prevalgano sistematicamente.</td></tr><tr><td>Coralità</td><td>**+10%** per ogni proponente oltre il primo, con massimale a **+30%**.</td></tr><tr><td>Soddisfazione</td><td>Moltiplicatore per profilo nell'intervallo **0,5–1,5**. Si incrementa a ogni sessione in cui il profilo risulta presente senza titoli propri selezionati e si decrementa in caso contrario. Il titolo assume il valore del proponente con indice più elevato. Realizza la rotazione senza necessità di gestione manuale.</td></tr><tr><td>Bonus compagnia</td><td>**+15%** quando i presenti coincidono con l'insieme indicato nel vincolo «con chi».</td></tr><tr><td>Bonus genere</td><td>Criterio di **spareggio**, applicato ai soli titoli entro il 2% dal punteggio massimo. Non concorre al calcolo.</td></tr></tbody></table>Le sessioni con il profilo assente non modificano l'indice di soddisfazione. Le fruizioni individuali registrate con il comando «Visto» non incidono sull'indice degli altri profili.

### Gestione delle saghe
Quando più titoli appartenenti alla stessa collezione risultano candidati, viene mantenuto **un solo elemento**: il primo per ordine di pubblicazione non ancora fruito dal gruppo. I capitoli successivi rientrano in classifica al completamento del precedente.

I parametri numerici sono modificabili in ⚙ Impostazioni e risiedono in `config.json`: la modifica ha effetto su tutti i profili collegati alla stessa cartella.

---

## 7. Recensioni

**In sintesi.** Ogni recensione è composta da un **voto** e da un testo articolato in **sezioni** rinominabili, riordinabili ed eliminabili. Le recensioni sono in sola lettura per i profili diversi dall'autore.

### Composizione

- **Voto** — scala a mezze stelle; la frazione si ottiene selezionando la metà sinistra o destra della stella.
- **Sezioni predefinite** — *Introduzione, Che ne penso, Momento preferito, Messaggio, A chi lo consiglio*. Le sezioni prive di contenuto non vengono salvate.
- **Riferimenti incrociati** — la sequenza `[[` apre l'elenco delle recensioni esistenti e inserisce un collegamento. Il meccanismo opera **anche fra categorie diverse**. In calce è riportato l'elenco delle recensioni che citano quella corrente.
- **Stato «in corso»** — mantiene la recensione in testa all'elenco fino al completamento.
- **Disponibilità** — piattaforme di streaming, supporti fisici e percorso locale, con rilevamento automatico da TMDB. Disponibile per film e serie.
- **Esportazione** — singola recensione o esportazione integrale in formato Markdown.

### Percentuale di completamento (videogiochi)
La recensione di un videogioco include un indice di completamento, determinato secondo la disponibilità dei dati:

- quando RAWG espone gli **obiettivi** del titolo, questi sono elencati e selezionabili singolarmente; la percentuale è calcolata sul rapporto fra selezionati e totale. Il comando **Platino** li seleziona integralmente;
- in assenza di obiettivi la percentuale è impostata manualmente su scala 0–100.

L'indice è rappresentato da un indicatore circolare a riempimento progressivo, completo al 100%.

---

## 8. Suggerimenti

**In sintesi.** La sezione elabora un profilo di gusto a partire dalle **recensioni** del titolare e propone titoli affini. È richiesto un minimo di **tre recensioni**.

### Criteri
Le recensioni concorrono al profilo con peso decrescente nel tempo e crescente rispetto al voto assegnato. Sono esclusi dai suggerimenti i titoli già presenti nell'elenco, già fruiti o già recensiti.

Il comando **«non mi interessa»** esclude permanentemente un titolo; l'elenco delle esclusioni è consultabile e reversibile da ⚙ Impostazioni.

Ogni categoria utilizza la propria libreria come fonte. Per i libri, in assenza di una funzione di raccomandazione nativa, si impiega la ricerca per soggetto ordinata per valutazione.

---

## 9. Impostazioni

**In sintesi.** Il pannello ⚙ raccoglie la configurazione: chiavi di accesso alle librerie, parametri della formula, gruppi di visualizzazione, modalità host e categorie di partecipazione.

### Profilo
Nome, colore identificativo (utilizzato per la poltrona in Sala) e password facoltativa. La password previene l'accesso accidentale a un profilo diverso dal proprio; **non costituisce una misura di sicurezza**, essendo memorizzata in chiaro nel file di profilo.

### Chiavi di accesso
Le chiavi abilitano l'interrogazione delle librerie online da cui provengono titoli, copertine e metadati. **In loro assenza la ricerca non è operativa** nelle categorie che le richiedono.

Le chiavi inserite in questa sezione sono **condivise** e valide per tutti i profili collegati alla stessa cartella. Ciascun profilo può in alternativa configurare **chiavi personali**, memorizzate nel proprio file e prevalenti su quelle condivise: la funzione consente di ripartire il carico ed evitare l'esaurimento della quota condivisa.

<table><thead><tr><th>Categoria</th><th>Libreria</th><th>Chiave</th></tr></thead><tbody><tr><td>Film, Serie TV</td><td>TMDB</td><td>Gratuita — themoviedb.org → Impostazioni → API</td></tr><tr><td>Videogiochi</td><td>RAWG</td><td>Gratuita, 20.000 richieste mensili — rawg.io/apidocs</td></tr><tr><td>Libri</td><td>Open Library</td><td>Non richiesta</td></tr></tbody></table>
### Parametri della formula
Coefficienti impiegati nel calcolo del punteggio: peso della coralità, entità del bonus di compagnia, passo di variazione dell'indice di soddisfazione. La definizione dei singoli fattori è riportata nel capitolo «Algoritmo di classifica». I valori risiedono in `config.json` e sono comuni a tutti i profili.

### Gruppi di visualizzazione
Un gruppo costituisce un **filtro sui profili** applicato all'intera applicazione. Se ne possono definire fino a cinque; sono memorizzati nel profilo del titolare e non visibili agli altri.

Il gruppo attivo è una preferenza **locale al dispositivo**: è quindi possibile mantenere configurazioni differenti su PC e telefono. Il titolare è sempre incluso.

### Modalità host
L'attivazione rende disponibile la sezione **Pronti alla visione**: elenco deduplicato dei titoli richiesti da almeno un profilo, con indicazione dei richiedenti. Per ciascun titolo è possibile registrare lo stato di reperimento e la collocazione — servizio di streaming, supporto fisico o percorso locale.

La modalità host abilita inoltre, nella sola cartella dello sviluppatore (si veda «Segnalazioni» più sotto), la sezione **Segnalazioni**.

### Segnalazioni
Il comando 🐞, presente in ogni schermata, apre uno stesso modulo — tipo, titolo, descrizione, gravità — con una destinazione diversa a seconda della cartella.

In cima al modulo il comando **📖 Guida** apre questo manuale a schermo intero, senza uscire dall'applicazione: diversi comportamenti che sembrano anomalie sono previsti e documentati. È lo stesso file `Manuale.html`, incorporato nell'applicazione a ogni compilazione, quindi sempre allineato alla versione in uso.

Le due destinazioni:

- **Nella cartella dello sviluppatore** — quella in cui `config.json` dichiara `"sviluppo": true` — la segnalazione viene scritta su file. L'host la ritrova nella sezione **Segnalazioni**, ordinata per importanza, e la segna come fatta una volta risolta.
- **In ogni altra cartella** — il caso previsto per un gruppo diverso da quello dello sviluppatore, dove non esiste un destinatario locale — il modulo, allo stesso invio, **copia il testo negli appunti** e apre il profilo Instagram dello sviluppatore (link e QR, generato internamente, senza risorse esterne), a cui inoltrare il messaggio.

Il flag `sviluppo` si attiva con **Ctrl+Alt e clic sul numero di versione**, in ⚙ Impostazioni: un clic semplice non ha effetto, e la voce non compare fra le opzioni visibili. Vale per l'intera cartella condivisa, quindi anche per l'app mobile collegata alla stessa cartella.

### Categorie di partecipazione
Quattro selettori, uno per categoria, determinano a quali categorie il profilo partecipa. La disattivazione produce **due effetti simultanei**:

- la categoria non è più selezionabile dal profilo; con una sola categoria attiva il selettore viene nascosto;
- il profilo non compare in Sala nelle categorie disattivate e il suo elenco non concorre alla relativa classifica.

Deve rimanere attiva almeno una categoria.

### Bonus genere
Consente di marcare i generi preferiti e quelli da evitare. Il parametro **non modifica il punteggio**: interviene esclusivamente come criterio di spareggio fra titoli di punteggio equivalente.

---

## 10. Applicazione mobile

**In sintesi.** L'applicazione Android replica le funzioni della versione desktop: elenco, Sala, recensioni e suggerimenti. Al primo avvio è richiesta l'indicazione della **medesima cartella** sincronizzata sul dispositivo.

### Differenze rispetto alla versione desktop
Le due versioni espongono le **stesse funzioni**: chiavi di accesso, profilo, coefficienti della formula, modalità host con «Pronti alla visione» e gestione delle segnalazioni sono disponibili su entrambe. Sul telefono le due sezioni dell'host non stanno nella barra ma si aprono da ⚙ Impostazioni.

In orientamento orizzontale, e su tablet, la Sala adotta una **disposizione a due colonne**: schermo a sinistra, partecipanti e riga di stato a destra.

---

## 11. Risoluzione dei problemi

**In sintesi.** Le anomalie ricorrenti sono riconducibili a tre cause: **assenza di una chiave di accesso**, **sincronizzazione non ancora completata**, **indisponibilità del dato nella libreria di origine**. Quest'ultima non costituisce un malfunzionamento dell'applicazione.

### Casistica

#### Messaggio «Manca la chiave TMDB» all'avvio

**Causa.** La ricerca di film e serie richiede una chiave TMDB. L'avviso è mostrato unicamente nelle categorie che la richiedono.

**Soluzione.** Da desktop: ⚙ Impostazioni → Chiavi API → inserimento della chiave → Salva. La configurazione è valida per tutti i profili.

#### Messaggio «Ricerca non riuscita»

**Causa.** Assenza di connettività, chiave non valida, oppure indisponibilità temporanea del servizio.

**Soluzione.** Ripetere l'operazione. Se l'errore persiste, verificare la chiave: spazi iniziali o finali ne determinano il rifiuto.

#### Copertina di un libro assente

**Causa.** Il dato non è presente in Open Library. La condizione è frequente sulle edizioni italiane, registrate come schede distinte e meno complete rispetto a quelle in altre lingue.

**Soluzione.** Aprire la scheda del titolo: nell'elenco dei risultati la ricerca esterna non viene eseguita, per non moltiplicare le richieste a ogni carattere digitato, mentre all'apertura la copertina è recuperata dall'edizione in altra lingua. Nei casi residui il dato non è disponibile in alcuna fonte.

#### Titolo non più presente nei risultati di ricerca

**Causa.** Anomalia riscontrata e corretta nella versione 1.7.13: la ricerca scartava le schede con una sola edizione e priva di copertina, forma che caratterizza anche opere effettivamente esistenti.

**Soluzione.** Verificare di utilizzare almeno la versione 1.7.13. In caso di persistenza, includere nella ricerca il cognome dell'autore oltre al titolo.

#### Messaggio «Niente in cartellone»

**Causa.** Nessun titolo ha superato la selezione: elenchi vuoti nella categoria attiva, esclusione totale da parte dei filtri di sessione, oppure vincolo «non con» attivo.

**Soluzione.** Consultare la riga di stato sotto lo schermo, che riporta il numero di esclusioni e la relativa motivazione.

#### Profilo non visibile fra i partecipanti

**Causa.** Il profilo ha disattivato la categoria corrente, oppure è attivo un gruppo di visualizzazione che non lo include.

**Soluzione.** Verificare il gruppo attivo. In assenza di filtri, la condizione dipende dalla configurazione del profilo interessato.

#### Un titolo di una saga non compare in classifica

**Causa.** Comportamento previsto: di una collezione viene proposto un solo capitolo per volta, in ordine di pubblicazione.

**Soluzione.** Il capitolo successivo rientra automaticamente al completamento del precedente.

#### Modifiche non visibili agli altri profili

**Causa.** La scrittura è locale; la propagazione è demandata al servizio di sincronizzazione.

**Soluzione.** Attendere il completamento della sincronizzazione e utilizzare il comando ⟳ per forzare la rilettura. Verificare che la sincronizzazione non sia sospesa.

#### Avviso di sicurezza di Windows all'installazione

**Causa.** L'installatore non dispone di firma con certificato commerciale; SmartScreen segnala tutti gli eseguibili non firmati.

**Soluzione.** Selezionare «Ulteriori informazioni» → «Esegui comunque». L'avviso è mostrato solo al primo avvio.

#### Installazione dell'APK non completata

**Causa.** Alcune distribuzioni Android, in particolare MIUI, sottopongono a verifica online le applicazioni installate da fonti esterne agli store e ne bloccano l'installazione.

**Soluzione.** Attivare la modalità aereo, procedere con l'installazione e ripristinare la connettività. È inoltre necessaria l'autorizzazione all'installazione da fonti sconosciute per il gestore file utilizzato.

#### Cartella non più accessibile dal dispositivo mobile

**Causa.** Android revoca l'autorizzazione sulla cartella in caso di prolungato inutilizzo dell'applicazione o di spostamento della cartella stessa.

**Soluzione.** Ripetere la selezione della cartella dalla schermata iniziale. I dati non subiscono alterazioni, risiedendo su file.

---

## 12. Aggiornamenti

**In sintesi.** La versione desktop esegue l'**aggiornamento automatico** al riavvio. L'applicazione mobile controlla da sola l'ultima versione pubblicata e, se più recente di quella installata, propone l'installazione con un tocco.

### Numerazione
Lo schema è a tre cifre; le revisioni ordinarie incrementano l'ultima. Le due piattaforme condividono la numerazione ma non necessariamente la stessa revisione, potendo l'APK essere compilato successivamente.

È disponibile una **modalità dimostrativa**, accessibile dalla schermata iniziale, che avvia l'applicazione con dati fittizi e senza scritture su disco.

---

*Manuale riferito alla versione 1.7.21. Le specifiche di dettaglio — formule, formati dei file, motivazioni delle scelte progettuali — sono documentate in SPECIFICA.md all'interno del progetto.*