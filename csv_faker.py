import pandas as pd
from faker import Faker
import numpy as np

# Inizializza Faker
fake = Faker('it_IT')

# Definisci il nome del file di input e output
input_file = 'Database-Real.csv'
output_file = 'Database.csv'

try:
    # Carica il file CSV originale in un DataFrame
    df = pd.read_csv(input_file)

    # Elenca le colonne numeriche da "fakizzare"
    # A seconda della struttura del tuo file, potresti dover modificare questa lista
    colonne_numeriche = [
        'Qt.A_2025_26', 'Qt.I_2025_26', 'Diff._2025_26', 'FVM_2025_26',
        'Pv_2025_26', 'Mv_2025_26', 'Gf_2025_26', 'Gs_2025_26',
        'Ass_2025_26', 'Amm_2025_26', 'Esp_2025_26', 'Au_2025_26',
    ]

    # "Fakizza" la colonna dei nomi con cognomi fittizi
    # Assumiamo che la colonna dei nomi sia 'Nome'
    df['Nome'] = [fake.last_name() for _ in range(len(df))]

    # Itera sulle colonne numeriche e "fakizza" i valori
    for colonna in colonne_numeriche:
        if colonna in df.columns:
            # Pulisci i dati non numerici e converti in float
            valori_puliti = pd.to_numeric(df[colonna], errors='coerce').dropna()

            if not valori_puliti.empty:
                # Calcola il valore minimo e massimo per la colonna
                min_val = valori_puliti.min()
                max_val = valori_puliti.max()

                # Genera nuovi valori casuali nell'intervallo
                if pd.api.types.is_float_dtype(valori_puliti):
                    # Se la colonna è di tipo float, genera float
                    nuovi_valori = np.random.uniform(min_val, max_val, len(df))
                else:
                    # Se la colonna è di tipo intero, genera interi
                    nuovi_valori = np.random.randint(min_val, max_val + 1, len(df))

                # Sostituisci la colonna con i nuovi valori fittizi
                df[colonna] = nuovi_valori.round(2) if pd.api.types.is_float_dtype(valori_puliti) else nuovi_valori.astype(int)

    # Salva il nuovo DataFrame "fakizzato" in un file CSV
    df.to_csv(output_file, index=False)
    print(f"File '{output_file}' creato con successo, mantenendo la struttura originale.")
    print("I nomi dei giocatori sono stati sostituiti con cognomi fittizi e i dati numerici 'fakizzati' in modo coerente.")

except FileNotFoundError:
    print(f"Errore: Il file '{input_file}' non è stato trovato. Assicurati che si trovi nella stessa cartella dello script.")
except Exception as e:
    print(f"Si è verificato un errore: {e}")