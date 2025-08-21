# Guida a Fantahackalcio

# <p text-align="center"><img style="max-width:40%" src="./logo.png"></p>

## Panoramica
**Fantahackalcio** è uno strumento avanzato per l'analisi delle prestazioni dei giocatori nel Fantacalcio, progettato per **ottimizzare le tue scelte durante l'asta**.

---

## Funzionalità Principali

### Filtri e Ricerca
* **Anno**: Seleziona la stagione di riferimento.
* **Ruolo**: Filtra per **P** (Portieri), **D** (Difensori), **C** (Centrocampisti), **A** (Attaccanti).
* **Squadra**: Filtra per squadra di appartenenza.
* **Ricerca Giocatore**: Cerca un giocatore specifico per nome.
* **Fantamilioni**: Imposta il budget totale disponibile.
* **Impostazione Rosa**: Scegli tra diverse strategie di distribuzione del budget:
    * **Bilanciato**: distribuzione equa tra i reparti.
    * **Offensivo**: maggior focus sull'attacco.
    * **Prudente**: maggior focus sulla difesa.

### Modalità di Gioco
* **Classic**: Visualizza statistiche per il Fantacalcio classico.
* **Mantra**: Visualizza statistiche specifiche per la modalità Mantra.

### Opzioni Avanzate
* **Mostra Svincolati**: Include i giocatori senza squadra.
* **Nascondi Panchinari**: Nasconde i giocatori con statistiche non rilevanti.

### Gestione Obiettivi
* Aggiungi giocatori agli obiettivi con il pulsante "+".
* Rimuovi giocatori dagli obiettivi con il pulsante "-".
* Monitora in tempo reale:
    * Budget rimanente.
    * Spesa totale.
    * Business plan per reparto.
    * Distribuzione dei costi.

### Esportazione Dati
* **Download Database**: Scarica l'intero database in formato CSV.
* **Download Obiettivi**: Esporta la lista degli obiettivi con tutte le statistiche.

---

## Indicatori Statistici

* **Fattore FantaHack**: Indicatore proprietario che combina prestazioni e convenienza.
* **Unicorni**: Giocatori con alto potenziale e basso costo.
* **Top Player**: Giocatori con prestazioni costanti e affidabili.

---

## Note Importanti

* I dati della stagione corrente potrebbero essere provvisori.
* Le statistiche mancanti vengono integrate con quelle della stagione precedente.
* Il business plan è calcolato in base all'impostazione rosa selezionata.

---

## Come Vengono Calcolati gli Indicatori Statistici

Qui di seguito viene illustrato come vengono derivati gli indicatori **Fattore FantaHack**, **Unicorno** e **Top Player** nella modalità `AI`. A differenza del passato, il calcolo non si basa più su soglie fisse, ma sfrutta un modello di **apprendimento automatico** per analizzare le prestazioni dei giocatori.

### 1. Il Modello Random Forest

Il cuore del sistema è un modello di **Random Forest Classifier**, un tipo di algoritmo di machine learning. Questo modello viene addestrato su dati storici dei giocatori per imparare a riconoscere le caratteristiche che definiscono un "Top Player". Analizza una serie di statistiche come FantaMedia, Partite Giocate, Goal, Assist e altre metriche di rendimento per stabilire dei modelli predittivi.

### 2. Calcolo di Top Player AI

Il modello addestrato valuta ogni giocatore e gli assegna una **probabilità** di essere un "Top Player". Questo punteggio, chiamato `Probabilità_Top_Player`, è la base per tutti gli indicatori AI.

* **Assegnazione Top Player AI**: Un giocatore viene classificato come **Top Player AI** (`Top_Player_AI = 1`) se la sua `Probabilità_Top_Player` è **superiore a 0.5**. In caso contrario, viene assegnato un valore di 0.

### 3. Calcolo di Fattore FantaHack AI

Il **Fattore FantaHack AI** è una metrica che combina la performance storica del giocatore con la sua probabilità di essere un Top Player, calcolata dal modello.

* **Calcolo**: Il valore del `Fattore FantaHack` viene moltiplicato per la `Probabilità_Top_Player` del giocatore. Questo significa che un giocatore con un'alta probabilità di essere un Top Player vedrà il suo Fattore FantaHack originale amplificato.

$$Fattore\ FantaHack\ AI = Fattore\ FantaHack \times Probabilit\grave{a}\Top\Player$$

### 4. Calcolo di Unicorno AI

Gli **Unicorni AI** sono giocatori con un'alta convenienza e un grande potenziale, identificati dalla combinazione di due criteri:

* **Prezzo Basso**: La quotazione attuale del giocatore (`Qt.A_2025_26`) deve essere **inferiore o uguale al 50° percentile** di tutte le quotazioni valide. In pratica, è un giocatore che costa poco.
* **Top Player AI**: Il giocatore deve essere stato classificato come **Top Player AI** (`Top_Player_AI = 1`) dal modello.

Un giocatore che soddisfa entrambi questi criteri viene classificato come **Unicorno AI** (`Unicorno_AI = 1`)."

---

Ideato, sviluppato e regalato a voi con il ❤️ da [cttynul](https://github.com/cttynul)