import pandas as pd
import os
import re
import numpy as np

def unisci_dataset_annuali_e_rinomina_e_riempi(cartella_dati='.'):
    tutti_i_df = []
    colonne_fisse = ['Id', 'Nome']
    colonne_testuali_storicizzate = ['R', 'RM', 'Squadra']

    anni_stagioni = ['2025_26', '2024_25', '2023_24', '2022_23']
    pesi_per_anno = {
        '2025_26': 1.0,
        '2024_25': 1.2,
        '2023_24': 0.6,
        '2022_23': 0.2
    }
    MAX_PARTITE_STAGIONE = 38 # Numero massimo di partite in una stagione di Serie A

    for nome_file in os.listdir(cartella_dati):
        if nome_file.startswith('Dataset_') and nome_file.endswith('.fhcsv'):
            match = re.match(r'Dataset_(\d{4})_(\d{2})\.fhcsv', nome_file)
            if match:
                anno_inizio_completo = match.group(1)
                anno_fine_breve = match.group(2)
                anno_stagione_suffisso = f"{anno_inizio_completo}_{anno_fine_breve}"

                percorso_file = os.path.join(cartella_dati, nome_file)
                print(f"Sto leggendo il file: {percorso_file}")

                try:
                    df = pd.read_csv(percorso_file)
                    df.columns = df.columns.str.strip()

                    nuove_colonne = {}
                    for colonna in df.columns:
                        if colonna in colonne_fisse:
                            nuove_colonne[colonna] = colonna
                        else:
                            nuove_colonne[colonna] = f"{colonna}_{anno_stagione_suffisso}"

                    df_rinominato = df.rename(columns=nuove_colonne)
                    tutti_i_df.append(df_rinominato)
                    print(f"File {nome_file} letto e colonne rinominate.")

                except Exception as e:
                    print(f"Errore durante la lettura o elaborazione del file {nome_file}: {e}. Salto questo file.")

    if not tutti_i_df:
        print("Nessun file 'Dataset_YYYY_YY.fhcsv' trovato o elaborato.")
        return pd.DataFrame()

    df_finale = tutti_i_df[0]
    if len(tutti_i_df) > 1:
        for i in range(1, len(tutti_i_df)):
            df_finale = pd.merge(df_finale, tutti_i_df[i], on=['Id', 'Nome'], how='outer')

    print("\nUnione di tutti i dataset completata!")

    # Riempimento dei valori NaN con 666 o 'N.D.'
    prefissi_numerici = ['Qt.A', 'Qt.I', 'Diff.', 'Qt.A M', 'Qt.I M', 'Diff.M', 'FVM', 'FVM M',
                        'Rm', 'Pv', 'Mv', 'Fm', 'Gf', 'Gs', 'Rp', 'Rc', 'R+', 'R-', 'Ass', 'Amm', 'Esp', 'Au']

    anni_range_per_suffix = range(2022, 2026)

    for anno_start in anni_range_per_suffix:
        anno_end_breve = str(anno_start + 1)[-2:]
        suffisso_anno = f"_{anno_start}_{anno_end_breve}"

        for prefisso in prefissi_numerici:
            colonna_numerica = f"{prefisso}{suffisso_anno}"
            if colonna_numerica in df_finale.columns:
                df_finale[colonna_numerica] = pd.to_numeric(df_finale[colonna_numerica], errors='coerce')
                df_finale[colonna_numerica].fillna(666, inplace=True)
                # Conversione a int solo se tutti i valori sono interi
                if pd.api.types.is_float_dtype(df_finale[colonna_numerica]) and \
                   all(df_finale[colonna_numerica].dropna().apply(lambda x: x == int(x))):
                    df_finale[colonna_numerica] = df_finale[colonna_numerica].astype(int)

        for col_text in colonne_testuali_storicizzate:
            colonna_testuale = f"{col_text}{suffisso_anno}"
            if colonna_testuale in df_finale.columns:
                df_finale[colonna_testuale].fillna('N.D.', inplace=True)

    print("Valori NaN nelle colonne numeriche riempiti con 666 e nelle colonne testuali con 'N.D.'.")

    print("\nCalcolo del 'Fattore_Fantahack'...")

    df_finale['Punteggio_Performance_Ponderato'] = 0.0

    for anno_str, peso in pesi_per_anno.items():
        fm_col = f"Fm_{anno_str}"
        pv_col = f"Pv_{anno_str}"

        if fm_col in df_finale.columns and pv_col in df_finale.columns:
            # Sostituisci 666 con NaN per escluderli dal calcolo, poi riempi con 0 la performance
            temp_fm = df_finale[fm_col].replace(666, np.nan)
            temp_pv = df_finale[pv_col].replace(666, np.nan)

            # Calcola la performance solo se sia Fm che Pv sono disponibili
            performance_anno = np.where(temp_fm.notna() & temp_pv.notna(), temp_fm * (temp_pv / MAX_PARTITE_STAGIONE), 0)
            df_finale['Punteggio_Performance_Ponderato'] += performance_anno * peso
        else:
            print(f"Attenzione: Colonne '{fm_col}' o '{pv_col}' non trovate per il calcolo del Fattore_Fantahack.")

    max_ppp = df_finale['Punteggio_Performance_Ponderato'].max()
    if max_ppp > 0:
        df_finale['Punteggio_Performance_Ponderato_Normalizzato'] = df_finale['Punteggio_Performance_Ponderato'] / max_ppp
    else:
        df_finale['Punteggio_Performance_Ponderato_Normalizzato'] = 0.0

    qt_a_2025_26_col = 'Qt.A_2025_26'
    if qt_a_2025_26_col in df_finale.columns:
        # Sostituisci 666 con NaN per il calcolo, poi rimetti 666 alla fine se necessario
        quotazioni_attuali_temp = df_finale[qt_a_2025_26_col].replace(666, np.nan)

        # Calcola Fattore_Fantahack solo per valori di quotazione validi (> 0)
        df_finale['Fattore_Fantahack'] = np.where(
            quotazioni_attuali_temp.notna() & (quotazioni_attuali_temp > 0),
            df_finale['Punteggio_Performance_Ponderato_Normalizzato'] / np.log(quotazioni_attuali_temp + 1),
            0.0 # Se la quotazione non è valida, Fattore_Fantahack è 0
        )
    else:
        print(f"Attenzione: Colonna '{qt_a_2025_26_col}' non trovata per il calcolo del Fattore_Fantahack.")
        df_finale['Fattore_Fantahack'] = 0.0

    df_finale.drop(columns=['Punteggio_Performance_Ponderato', 'Punteggio_Performance_Ponderato_Normalizzato'], inplace=True)
    print("'Fattore_Fantahack' calcolato.")

    print("\nCalcolo del campo 'Top_Player'...")
    df_finale['Media_Fantamedia_Ponderata'] = 0.0
    df_finale['Media_Partite_Giocate_Ponderata'] = 0.0
    totale_pesi_fantamedia = 0.0
    totale_pesi_partite = 0.0

    for anno_str, peso in pesi_per_anno.items():
        fm_col = f"Fm_{anno_str}"
        pv_col = f"Pv_{anno_str}"

        if fm_col in df_finale.columns:
            temp_fm = df_finale[fm_col].replace(666, np.nan)
            df_finale['Media_Fantamedia_Ponderata'] = np.where(
                temp_fm.notna(),
                df_finale['Media_Fantamedia_Ponderata'] + temp_fm * peso,
                df_finale['Media_Fantamedia_Ponderata']
            )
            totale_pesi_fantamedia += peso

        if pv_col in df_finale.columns:
            temp_pv = df_finale[pv_col].replace(666, np.nan)
            df_finale['Media_Partite_Giocate_Ponderata'] = np.where(
                temp_pv.notna(),
                df_finale['Media_Partite_Giocate_Ponderata'] + temp_pv * peso,
                df_finale['Media_Partite_Giocate_Ponderata']
            )
            totale_pesi_partite += peso

    if totale_pesi_fantamedia > 0: df_finale['Media_Fantamedia_Ponderata'] /= totale_pesi_fantamedia
    else: df_finale['Media_Fantamedia_Ponderata'] = 0.0 

    if totale_pesi_partite > 0: df_finale['Media_Partite_Giocate_Ponderata'] /= totale_pesi_partite
    else: df_finale['Media_Partite_Giocate_Ponderata'] = 0.0

    # Definisci le soglie per Top_Player
    valid_fm = df_finale['Media_Fantamedia_Ponderata'][df_finale['Media_Fantamedia_Ponderata'] > 0]
    valid_pv = df_finale['Media_Partite_Giocate_Ponderata'][df_finale['Media_Partite_Giocate_Ponderata'] > 0]

    soglia_fantamedia_alta = valid_fm.quantile(0.75) if not valid_fm.empty else 6.5
    soglia_partite_alte = valid_pv.quantile(0.75) if not valid_pv.empty else 20

    print(f"Soglia Fantamedia Ponderata alta: > {soglia_fantamedia_alta:.2f}")
    print(f"Soglia Partite Giocate Ponderate alte: > {soglia_partite_alte:.2f}")

    df_finale['Top_Player'] = 0
    condizione_top_player = (df_finale['Media_Fantamedia_Ponderata'] >= soglia_fantamedia_alta) & \
                            (df_finale['Media_Partite_Giocate_Ponderata'] >= soglia_partite_alte) & \
                            (df_finale['Media_Fantamedia_Ponderata'].notna()) & \
                            (df_finale['Media_Partite_Giocate_Ponderata'].notna())

    df_finale.loc[condizione_top_player, 'Top_Player'] = 1

    df_finale.drop(columns=['Media_Fantamedia_Ponderata', 'Media_Partite_Giocate_Ponderata'], inplace=True)
    print("'Top_Player' calcolato.")

    print("Calcolo del campo 'Unicorno'...")
    unicorno_col = 'Unicorno'
    df_finale[unicorno_col] = 0

    if qt_a_2025_26_col in df_finale.columns:
        # Sostituisci 666 con NaN per il calcolo di unicorno
        quotazioni_attuali = df_finale[qt_a_2025_26_col].replace(666, np.nan)
        soglia_prezzo_basso = quotazioni_attuali.quantile(0.50) if not quotazioni_attuali.dropna().empty else 10 
        
        fattore_fantahack_validi = df_finale['Fattore_Fantahack'][df_finale['Fattore_Fantahack'] > 0]
        soglia_performance_alta = fattore_fantahack_validi.quantile(0.75) if not fattore_fantahack_validi.empty else 0.1

        print(f"Soglia prezzo basso (Qt.A_2025_26): < {soglia_prezzo_basso:.2f}")
        print(f"Soglia performance alta (Fattore_Fantahack): > {soglia_performance_alta:.2f}")

        condizione_prezzo = (quotazioni_attuali <= soglia_prezzo_basso) & (quotazioni_attuali.notna()) & (quotazioni_attuali > 0)
        condizione_performance = (df_finale['Fattore_Fantahack'] >= soglia_performance_alta) & (df_finale['Fattore_Fantahack'].notna())

        df_finale.loc[condizione_prezzo & condizione_performance, unicorno_col] = 1

    print("'Unicorno' calcolato.")

    return df_finale

dataset_unificato = unisci_dataset_annuali_e_rinomina_e_riempi()

if not dataset_unificato.empty:
    output_file_finale = "Database.csv"
    
    colonne = dataset_unificato.columns.tolist()
    if 'Top_Player' in colonne and 'Unicorno' in colonne:
        idx_top_player = colonne.index('Top_Player')
        idx_unicorno = colonne.index('Unicorno')

        if idx_top_player > idx_unicorno:
            colonne.insert(idx_unicorno, colonne.pop(idx_top_player))
            dataset_unificato = dataset_unificato[colonne]

    dataset_unificato.to_csv(output_file_finale, index=False)
    print(f"\nIl dataset unificato è stato salvato in '{output_file_finale}'")
    print(f"Dimensioni del dataset finale: {dataset_unificato.shape[0]} righe, {dataset_unificato.shape[1]} colonne.")

    colonne_visualizzazione = ['Nome', 'R_2025_26', 'Squadra_2025_26', 'Qt.A_2025_26', 'Fm_2025_26', 'Pv_2025_26', 'Fattore_Fantahack', 'Top_Player', 'Unicorno']

    print("\n=== Giocatori Fattore Fantahack Top ===")
    df_sorted_fantahack = dataset_unificato[dataset_unificato['Fattore_Fantahack'] > 0].sort_values(by='Fattore_Fantahack', ascending=False)
    print(df_sorted_fantahack[colonne_visualizzazione].head(10).to_string(index=False))

    print("\n=== Giocatori Top Player ===")
    df_top_players = dataset_unificato[dataset_unificato['Top_Player'] == 1]
    if not df_top_players.empty:
        df_top_players_sorted = df_top_players.sort_values(by='Fm_2025_26', ascending=False)
        print(df_top_players_sorted[colonne_visualizzazione].head(10).to_string(index=False))
    else:
        print("Nessun giocatore identificato come 'Top Player' in base ai criteri attuali.")


    print("\n=== Giocatori Unicorno ===")
    df_unicorns = dataset_unificato[dataset_unificato['Unicorno'] == 1]
    if not df_unicorns.empty:
        df_unicorns_sorted = df_unicorns.sort_values(by='Fattore_Fantahack', ascending=False)
        print(df_unicorns_sorted[colonne_visualizzazione].head(10).to_string(index=False))
    else:
        print("Nessun giocatore identificato come 'Unicorno' in base ai criteri attuali.")

else:
    print("Nessun dataset finale da salvare.")