import pandas as pd
import os

def unisci_dati_fantacalcio(anno_inizio):
    anno_fine_completo = anno_inizio + 1
    anno_fine_breve = str(anno_fine_completo)[-2:]

    quotazioni_file = f"Quotazioni_Fantacalcio_Stagione_{anno_inizio}_{anno_fine_breve}.xlsx"
    statistiche_file = f"Statistiche_Fantacalcio_Stagione_{anno_inizio}_{anno_fine_breve}.xlsx"
    output_file = f"Dataset_{anno_inizio}_{anno_fine_breve}.fhcsv"

    print(f"\n--- Elaborazione stagione: {anno_inizio}-{anno_fine_breve} ---")
    print(f"Sto cercando i file: {quotazioni_file} e {statistiche_file}")

    if not os.path.exists(quotazioni_file):
        print(f"Errore: Il file '{quotazioni_file}' non è stato trovato nella directory corrente. Salto questa stagione.")
        return
    if not os.path.exists(statistiche_file):
        print(f"Errore: Il file '{statistiche_file}' non è stato trovato nella directory corrente. Salto questa stagione.")
        return

    try:
        df_quotazioni = pd.read_excel(quotazioni_file, engine='openpyxl', header=1)
        df_statistiche = pd.read_excel(statistiche_file, engine='openpyxl', header=1)

        print("File letti con successo, ignorando la prima riga e usando la seconda come header!")

        colonne_da_rimuovere = ['R', 'Nome', 'Squadra']
        df_statistiche_pulito = df_statistiche.copy()

        for col in colonne_da_rimuovere:
            if col in df_statistiche_pulito.columns:
                df_statistiche_pulito = df_statistiche_pulito.drop(columns=[col])
                print(f"Colonna '{col}' rimossa dal DataFrame delle statistiche.")
            else:
                print(f"Attenzione: Colonna '{col}' non trovata nel DataFrame delle statistiche. Potrebbe essere già assente o avere un nome diverso.")

        df_unito = pd.merge(df_quotazioni, df_statistiche_pulito, on='Id', how='inner')

        print("Dati uniti con successo!")

        df_unito.to_csv(output_file, index=False)

        print(f"Dati esportati con successo in '{output_file}'")

    except KeyError as ke:
        print(f"Errore: La colonna chiave per l'unione ('ID') o una delle colonne da rimuovere non è stata trovata in uno o entrambi i file per la stagione {anno_inizio}-{anno_fine_breve}. Dettagli: {ke}")
        print("Assicurati che la colonna 'ID' e le colonne 'R', 'Nome', 'Squadra' (se presenti) siano nella seconda riga dei tuoi file Excel e che i loro nomi siano esattamente come specificato.")
    except Exception as e:
        print(f"Si è verificato un errore inatteso durante l'elaborazione dei file per la stagione {anno_inizio}-{anno_fine_breve}: {e}")

for anno_inizio in range(2022, 2026): # Il range include 2022, 2023, 2024, 2025
    unisci_dati_fantacalcio(anno_inizio)

print("\nElaborazione completata per tutte le stagioni specificate!")