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

Qui di seguito viene illustrato come vengono derivati gli indicatori **Fattore FantaHack**, **Unicorno** e **Top Player**, se proprio siete curiosi come i matti (anche troppo).

### 1. Calcolo del Fattore FantaHack

Il **Fattore FantaHack** è una metrica proprietaria chiave. Ecco come viene derivato:

* **Punteggio Performance Ponderato ($PpP$)**:
    * Per ogni giocatore, viene calcolato un punteggio di performance per ogni stagione utilizzando `Fm` (FantaMedia) e `Pv` (Partite Giocate).
    * La formula utilizzata è:
        $$Fm \times \frac{Pv}{38}$$
        dove 38 è il numero di `Max Partite Stagione`.
    * Questi punteggi di performance stagionali vengono poi ponderati dai `pesi per anno` (ad esempio, 2025-26 ha un peso di 1.0, 2024-25 ha 1.2, 2023-24 ha 0.6 e 2022 -3 ha 0.2).
    * La somma di questi punteggi di performance ponderati fornisce il `Punteggio Performance Ponderato`. I valori `Fm` o `Pv` mancanti vengono trattati come `NaN` ed esclusi da questo calcolo.
* **Punteggio Performance Ponderato Normalizzato ($PppN$)**:
    * Questo punteggio si ottiene dividendo il `Punteggio Performance Ponderato` per il `Punteggio Performance Ponderato` massimo tra tutti i giocatori, normalizzandolo in un intervallo tra 0 e 1.
* **Fattore FantaHack Finale ($Fattore Fantahack$)**:
    * Questo è calcolato dividendo il `Punteggio Performance Ponderato Normalizzato` per il logaritmo naturale della quotazione della stagione corrente (`Qt.A_2025-26`) più uno.
    * La formula è:
        $$\frac{PppN}{\log(QtA + 1)}$$
    * I giocatori con quotazioni attuali non valide o pari a zero avranno un `Fattore FantaHack` di 0.

### 2. Calcolo dei Top Player

Per identificare i **Top Player**, vengono calcolate due medie ponderate:

* **Media Fantamedia Ponderata ($MFmP$)**:
    * Questa è la media di `Fm` attraverso le stagioni specificate, ponderata dai `pesi per anno`.
* **Media Partite Giocate Ponderata ($Media Partite Giocate Ponderata$)**:
    * Questa è la media di `Pv` attraverso le stagioni specificate, ponderata dai `pesi per anno`.
* **Assegnazione Top Player**:
    * Un giocatore è classificato come **Top Player** (assegnato un valore di 1) se la sua `Media Fantamedia Ponderata` e la sua `Media Partite Giocate Ponderata` sono entrambe al di sopra del 75° percentile di tutti i valori validi dei giocatori per queste metriche.
    * Le soglie predefinite sono **6.5** per la FantaMedia e **20** per le partite giocate, se i dati sono insufficienti per calcolare i percentili.

### 3. Calcolo degli Unicorni

Gli **Unicorni** sono giocatori con alto potenziale a basso costo:

* **Assegnazione Unicorno**:
    * Un giocatore è classificato come **Unicorno** (assegnato un valore di 1) se:
        * La sua quotazione della stagione corrente (`Quotazione_2025_26`) è inferiore o uguale al 50° percentile di tutte le quotazioni valide dei giocatori. Viene utilizzata una soglia predefinita di **10** se non sono disponibili quotazioni valide.
        * Il suo `Fattore FantaHack` è maggiore o uguale al 75° percentile di tutti i valori validi del `Fattore FantaHack`. Viene utilizzata una soglia predefinita di **0.1** se non sono disponibili fattori validi.

Questi calcoli combinano la performance storica con il valore di mercato attuale per fornire intuizioni utili per la tua asta del Fantacalcio.

---

Ideato, sviluppato e regalato a voi con il ❤️ da [cttynul](https://github.com/cttynul)