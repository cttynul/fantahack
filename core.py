import os, re
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

def merge_and_process_yearly_datasets(data_folder='.'):
    all_dfs = []
    fixed_columns = ['Id', 'Nome']
    historical_text_columns = ['R', 'RM', 'Squadra']

    season_years = ['2025_26', '2024_25', '2023_24', '2022_23']
    weights_per_year = {
        '2025_26': 1.0,
        '2024_25': 1.2,
        '2023_24': 0.6,
        '2022_23': 0.2
    }
    MAX_SEASON_MATCHES = 38 # Numero massimo di partite in una stagione di Serie A

    for file_name in os.listdir(data_folder):
        if file_name.startswith('Dataset_') and file_name.endswith('.fhcsv'):
            match = re.match(r'Dataset_(\d{4})_(\d{2})\.fhcsv', file_name)
            if match:
                full_start_year = match.group(1)
                short_end_year = match.group(2)
                season_year_suffix = f"{full_start_year}_{short_end_year}"

                file_path = os.path.join(data_folder, file_name)
                print(f"Sto leggendo il file: {file_path}")

                try:
                    df = pd.read_csv(file_path)
                    df.columns = df.columns.str.strip()

                    new_columns = {}
                    for column in df.columns:
                        if column in fixed_columns:
                            new_columns[column] = column
                        else:
                            new_columns[column] = f"{column}_{season_year_suffix}"

                    renamed_df = df.rename(columns=new_columns)
                    all_dfs.append(renamed_df)
                    print(f"File {file_name} letto e colonne rinominate.")

                except Exception as e:
                    print(f"Errore durante la lettura o elaborazione del file {file_name}: {e}. Salto questo file.")

    if not all_dfs:
        print("Nessun file 'Dataset_YYYY_YY.fhcsv' trovato o elaborato.")
        return pd.DataFrame()

    final_df = all_dfs[0]
    if len(all_dfs) > 1:
        for i in range(1, len(all_dfs)):
            final_df = pd.merge(final_df, all_dfs[i], on=['Id', 'Nome'], how='outer')

    print("\nUnione di tutti i dataset completata!")

    # Riempimento dei valori NaN con 666 o 'N.D.'
    numerical_prefixes = ['Qt.A', 'Qt.I', 'Diff.', 'Qt.A M', 'Qt.I M', 'Diff.M', 'FVM', 'FVM M',
                        'Rm', 'Pv', 'Mv', 'Fm', 'Gf', 'Gs', 'Rp', 'Rc', 'R+', 'R-', 'Ass', 'Amm', 'Esp', 'Au']

    years_range_for_suffix = range(2022, 2026)

    for start_year in years_range_for_suffix:
        short_end_year = str(start_year + 1)[-2:]
        year_suffix = f"_{start_year}_{short_end_year}"

        for prefix in numerical_prefixes:
            numerical_column = f"{prefix}{year_suffix}"
            if numerical_column in final_df.columns:
                final_df[numerical_column] = pd.to_numeric(final_df[numerical_column], errors='coerce')
                final_df[numerical_column].fillna(666, inplace=True)
                # Conversione a int solo se tutti i valori sono interi
                if pd.api.types.is_float_dtype(final_df[numerical_column]) and \
                   all(final_df[numerical_column].dropna().apply(lambda x: x == int(x))):
                    final_df[numerical_column] = final_df[numerical_column].astype(int)

        for col_text in historical_text_columns:
            text_column = f"{col_text}{year_suffix}"
            if text_column in final_df.columns:
                final_df[text_column].fillna('N.D.', inplace=True)

    print("Valori NaN nelle colonne numeriche riempiti con 666 e nelle colonne testuali con 'N.D.'.")

    print("\nCalcolo del 'Fattore_Fantahack'...")

    final_df['Punteggio_Performance_Ponderato'] = 0.0

    for year_str, weight in weights_per_year.items():
        fm_col = f"Fm_{year_str}"
        pv_col = f"Pv_{year_str}"

        if fm_col in final_df.columns and pv_col in final_df.columns:
            # Sostituisci 666 con NaN per escluderli dal calcolo, poi riempi con 0 la performance
            temp_fm = final_df[fm_col].replace(666, np.nan)
            temp_pv = final_df[pv_col].replace(666, np.nan)

            # Calcola la performance solo se sia Fm che Pv sono disponibili
            performance_year = np.where(temp_fm.notna() & temp_pv.notna(), temp_fm * (temp_pv / MAX_SEASON_MATCHES), 0)
            final_df['Punteggio_Performance_Ponderato'] += performance_year * weight
        else:
            print(f"Attenzione: Colonne '{fm_col}' o '{pv_col}' non trovate per il calcolo del Fattore_Fantahack.")

    max_ppp = final_df['Punteggio_Performance_Ponderato'].max()
    if max_ppp > 0:
        final_df['Punteggio_Performance_Ponderato_Normalizzato'] = final_df['Punteggio_Performance_Ponderato'] / max_ppp
    else:
        final_df['Punteggio_Performance_Ponderato_Normalizzato'] = 0.0

    qt_a_2025_26_col = 'Qt.A_2025_26'
    if qt_a_2025_26_col in final_df.columns:
        # Sostituisci 666 con NaN per il calcolo, poi rimetti 666 alla fine se necessario
        current_quotations_temp = final_df[qt_a_2025_26_col].replace(666, np.nan)

        # Calcola Fattore_Fantahack solo per valori di quotazione validi (> 0)
        final_df['Fattore_Fantahack'] = np.where(
            current_quotations_temp.notna() & (current_quotations_temp > 0),
            final_df['Punteggio_Performance_Ponderato_Normalizzato'] / np.log(current_quotations_temp + 1),
            0.0 # Se la quotazione non è valida, Fattore_Fantahack è 0
        )
    else:
        print(f"Attenzione: Colonna '{qt_a_2025_26_col}' non trovata per il calcolo del Fattore_Fantahack.")
        final_df['Fattore_Fantahack'] = 0.0

    final_df.drop(columns=['Punteggio_Performance_Ponderato', 'Punteggio_Performance_Ponderato_Normalizzato'], inplace=True)
    print("'Fattore_Fantahack' calcolato.")

    print("\nCalcolo del campo 'Top_Player'...")
    final_df['Media_Fantamedia_Ponderata'] = 0.0
    final_df['Media_Partite_Giocate_Ponderata'] = 0.0
    total_fantamedia_weights = 0.0
    total_matches_weights = 0.0

    for year_str, weight in weights_per_year.items():
        fm_col = f"Fm_{year_str}"
        pv_col = f"Pv_{year_str}"

        if fm_col in final_df.columns:
            temp_fm = final_df[fm_col].replace(666, np.nan)
            final_df['Media_Fantamedia_Ponderata'] = np.where(
                temp_fm.notna(),
                final_df['Media_Fantamedia_Ponderata'] + temp_fm * weight,
                final_df['Media_Fantamedia_Ponderata']
            )
            total_fantamedia_weights += weight

        if pv_col in final_df.columns:
            temp_pv = final_df[pv_col].replace(666, np.nan)
            final_df['Media_Partite_Giocate_Ponderata'] = np.where(
                temp_pv.notna(),
                final_df['Media_Partite_Giocate_Ponderata'] + temp_pv * weight,
                final_df['Media_Partite_Giocate_Ponderata']
            )
            total_matches_weights += weight

    if total_fantamedia_weights > 0: final_df['Media_Fantamedia_Ponderata'] /= total_fantamedia_weights
    else: final_df['Media_Fantamedia_Ponderata'] = 0.0 

    if total_matches_weights > 0: final_df['Media_Partite_Giocate_Ponderata'] /= total_matches_weights
    else: final_df['Media_Partite_Giocate_Ponderata'] = 0.0

    # Definisci le soglie per Top_Player
    valid_fm = final_df['Media_Fantamedia_Ponderata'][final_df['Media_Fantamedia_Ponderata'] > 0]
    valid_pv = final_df['Media_Partite_Giocate_Ponderata'][final_df['Media_Partite_Giocate_Ponderata'] > 0]

    high_fantamedia_threshold = valid_fm.quantile(0.75) if not valid_fm.empty else 6.5
    high_matches_threshold = valid_pv.quantile(0.75) if not valid_pv.empty else 20

    print(f"Soglia Fantamedia Ponderata alta: > {high_fantamedia_threshold:.2f}")
    print(f"Soglia Partite Giocate Ponderate alte: > {high_matches_threshold:.2f}")

    final_df['Top_Player'] = 0
    top_player_condition = (final_df['Media_Fantamedia_Ponderata'] >= high_fantamedia_threshold) & \
                            (final_df['Media_Partite_Giocate_Ponderata'] >= high_matches_threshold) & \
                            (final_df['Media_Fantamedia_Ponderata'].notna()) & \
                            (final_df['Media_Partite_Giocate_Ponderata'].notna())

    final_df.loc[top_player_condition, 'Top_Player'] = 1

    # Rimuovi la riga che elimina le colonne.
    # final_df.drop(columns=['Media_Fantamedia_Ponderata', 'Media_Partite_Giocate_Ponderata'], inplace=True)
    print("'Top_Player' calcolato.")

    print("Calcolo del campo 'Unicorno'...")
    unicorn_col = 'Unicorno'
    final_df[unicorn_col] = 0

    if qt_a_2025_26_col in final_df.columns:
        # Sostituisci 666 con NaN per il calcolo di unicorno
        current_quotations = final_df[qt_a_2025_26_col].replace(666, np.nan)
        low_price_threshold = current_quotations.quantile(0.50) if not current_quotations.dropna().empty else 10 
        
        valid_fantahack_factor = final_df['Fattore_Fantahack'][final_df['Fattore_Fantahack'] > 0]
        high_performance_threshold = valid_fantahack_factor.quantile(0.75) if not valid_fantahack_factor.empty else 0.1

        print(f"Soglia prezzo basso (Qt.A_2025_26): < {low_price_threshold:.2f}")
        print(f"Soglia performance alta (Fattore_Fantahack): > {high_performance_threshold:.2f}")

        price_condition = (current_quotations <= low_price_threshold) & (current_quotations.notna()) & (current_quotations > 0)
        performance_condition = (final_df['Fattore_Fantahack'] >= high_performance_threshold) & (final_df['Fattore_Fantahack'].notna())

        final_df.loc[price_condition & performance_condition, unicorn_col] = 1

    print("'Unicorno' calcolato.")

    return final_df

# --- Funzioni Random Forest ---

def train_top_player_model(df):
    """
    Addestra un modello Random Forest per prevedere i "Top Player" e restituisce il modello
    e l'importanza delle feature.

    Args:
        df (pd.DataFrame): Il DataFrame contenente i dati dei giocatori.

    Returns:
        tuple: Il modello addestrato, un DataFrame con l'importanza delle feature, 
               il DataFrame pulito e la lista delle colonne delle feature usate.
    """
    print("\n--- Inizio l'addestramento del modello Random Forest per i Top Player ---")
    
    # Creiamo una copia del dataframe per non modificare l'originale
    df_temp = df.copy()

    # Definiamo la variabile target e le feature
    target_column = 'Top_Player'
    
    # Selezioniamo le feature. Escludiamo le colonne che non servono o che sono la target stessa.
    feature_columns = [
        col for col in df_temp.columns 
        if col not in ['Id', 'Nome', 'R_2025_26', 'Squadra_2025_26', target_column, 'Unicorno', 'Punteggio_Performance_Ponderato', 'Punteggio_Performance_Ponderato_Normalizzato', 'Media_Fantamedia_Ponderata', 'Media_Partite_Giocate_Ponderata'] 
        and df_temp[col].dtype in ['int64', 'float64']
    ]
    
    # Rimuoviamo le righe dove la variabile target è mancante
    cleaned_df = df_temp.dropna(subset=[target_column] + feature_columns)

    if cleaned_df.empty:
        print("Il dataset è vuoto dopo la pulizia. Impossibile addestrare il modello.")
        return None, None, None, None

    # Assegnamo le feature (X) e la variabile target (y)
    X = cleaned_df[feature_columns]
    y = cleaned_df[target_column]

    # Controlliamo la distribuzione della variabile target
    if y.nunique() < 2:
        print(f"La variabile target '{target_column}' ha meno di due classi ({y.nunique()}). Impossibile addestrare un classificatore.")
        return None, None, None, None

    # Suddividiamo i dati in set di addestramento e di test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print(f"Dimensioni del set di addestramento: {X_train.shape[0]} righe")
    print(f"Dimensioni del set di test: {X_test.shape[0]} righe")
    print(f"Distribuzione del target nel set di addestramento:\n{y_train.value_counts(normalize=True)}")

    # Creazione del modello Random Forest
    model = RandomForestClassifier(n_estimators=200, class_weight='balanced', random_state=42)
    print("Modello Random Forest creato. Avvio l'addestramento...")

    # Addestramento del modello
    model.fit(X_train, y_train)

    print("Addestramento completato!")

    # Valutazione del modello sul set di test
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred)

    print(f"\nAccuratezza del modello: {accuracy:.2f}")
    print("\nReport di classificazione:")
    print(report)

    # Mostra l'importanza delle feature
    feature_importances = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nImportanza delle feature:")
    print(feature_importances.head(15).to_string(index=False))

    return model, feature_importances, cleaned_df, feature_columns

def classify_players_with_ai(df, model, feature_columns):
    """
    Usa il modello addestrato per classificare e ordinare i giocatori, aggiungendo
    le nuove colonne AI al DataFrame.

    Args:
        df (pd.DataFrame): Il DataFrame dei giocatori.
        model: Il modello Random Forest addestrato.
        feature_columns (list): Le colonne delle feature usate per l'addestramento.

    Returns:
        pd.DataFrame: Un DataFrame con le nuove colonne AI aggiunte.
    """
    print("\n--- Classificazione dei giocatori per probabilità di essere 'Top Player' ---")

    # Creiamo una copia del DataFrame per non alterare l'originale
    df_processed = df.copy()
    
    # Rimuoviamo le colonne non numeriche dal set di feature per la previsione
    numeric_feature_columns = [col for col in feature_columns if df_processed[col].dtype in ['int64', 'float64']]
    
    # Gestione dei valori mancanti nelle feature
    df_to_classify = df_processed.dropna(subset=numeric_feature_columns)

    if df_to_classify.empty:
        print("Nessun giocatore con dati completi per la classificazione.")
        return df_processed
    
    # Assicuriamo l'ordine corretto delle colonne per la previsione
    X_predict = df_to_classify[numeric_feature_columns]

    # Calcola le probabilità di essere un Top Player
    probabilities = model.predict_proba(X_predict)[:, 1]
    
    # Aggiungi le nuove colonne AI al DataFrame temporaneo
    df_to_classify['Probabilità_Top_Player'] = probabilities
    df_to_classify['Top_Player_AI'] = (probabilities > 0.5).astype(int)
    
    # Il Fattore Fantahack AI si basa sempre sul prodotto tra il vecchio fattore e la probabilità del modello
    df_to_classify['Fattore_Fantahack_AI'] = df_to_classify['Fattore_Fantahack'] * probabilities
    
    # Un unicorno è un giocatore a basso costo con un alto fattore Fantahack AI.
    low_price_threshold = df_to_classify['Qt.A_2025_26'].quantile(0.50) if not df_to_classify['Qt.A_2025_26'].dropna().empty else 10
    
    valid_fantahack_factor_ai = df_to_classify['Fattore_Fantahack_AI'][df_to_classify['Fattore_Fantahack_AI'] > 0]
    high_performance_threshold_ai = valid_fantahack_factor_ai.quantile(0.75) if not valid_fantahack_factor_ai.empty else 0.1

    print(f"Soglia prezzo basso (Qt.A_2025_26): <= {low_price_threshold:.2f}")
    print(f"Soglia performance alta (Fattore_Fantahack_AI): >= {high_performance_threshold_ai:.2f}")

    df_to_classify['Unicorno_AI'] = 0
    unicorn_condition = (df_to_classify['Qt.A_2025_26'].notna()) & (df_to_classify['Qt.A_2025_26'] <= low_price_threshold) & (df_to_classify['Qt.A_2025_26'] > 0) & \
                        (df_to_classify['Fattore_Fantahack_AI'] >= high_performance_threshold_ai) & (df_to_classify['Fattore_Fantahack_AI'].notna())

    df_to_classify.loc[unicorn_condition, 'Unicorno_AI'] = 1

    # Unisci i risultati al DataFrame originale
    df_processed = df_processed.set_index('Id')
    df_to_classify = df_to_classify.set_index('Id')
    
    # Devi includere 'Probabilità_Top_Player' qui
    df_processed['Probabilità_Top_Player'] = df_to_classify['Probabilità_Top_Player']
    df_processed['Top_Player_AI'] = df_to_classify['Top_Player_AI']
    df_processed['Fattore_Fantahack_AI'] = df_to_classify['Fattore_Fantahack_AI']
    df_processed['Unicorno_AI'] = df_to_classify['Unicorno_AI']
    
    # Riempi i valori mancanti con 0
    df_processed[['Probabilità_Top_Player', 'Top_Player_AI', 'Fattore_Fantahack_AI', 'Unicorno_AI']] = df_processed[['Probabilità_Top_Player', 'Top_Player_AI', 'Fattore_Fantahack_AI', 'Unicorno_AI']].fillna(0)

    return df_processed.reset_index()

def build_ai_teams(df, num_teams=3):
    """
    Crea N squadre basate sulla probabilità di essere un Top Player,
    con una logica migliorata per la selezione dei portieri.

    Args:
        df (pd.DataFrame): Il DataFrame dei giocatori con le probabilità AI.
        num_teams (int): Il numero di squadre da generare.

    Returns:
        pd.DataFrame: Il DataFrame dei giocatori con la colonna 'Squadra_AI' aggiunta.
    """
    print(f"\n--- Creazione di {num_teams} squadre AI ideali ---")
    
    # Assicuriamo che la posizione 'R_2025_26' esista
    if 'R_2025_26' not in df.columns:
        print("Attenzione: la colonna 'R_2025_26' non è presente. Impossibile creare le squadre per ruolo.")
        return df, {}
    
    teams = {f'Squadra_{i+1}_AI': [] for i in range(num_teams)}
    ruoli_count = {'P': 3, 'D': 8, 'C': 8, 'A': 6}
    
    df_disponibili = df.copy()

    # --- NUOVA LOGICA PER I PORTIERI ---
    print("Inizio la selezione dei portieri con la nuova logica...")
    
    portieri_df = df_disponibili[df_disponibili['R_2025_26'] == 'P'].sort_values('Probabilità_Top_Player', ascending=False)
    
    # Definisci la soglia per i portieri titolari. Usiamo la media ponderata delle partite giocate.
    # Calcoliamo la soglia come il 50 percentile (mediana) tra i portieri disponibili.
    pv_col = 'Media_Partite_Giocate_Ponderata'
    if pv_col not in portieri_df.columns or portieri_df[pv_col].dropna().empty:
        # Fallback se la colonna non esiste o è vuota
        print(f"Attenzione: la colonna '{pv_col}' non è valida. Uso una soglia fissa di 19 partite.")
        pv_threshold = 19
    else:
        pv_threshold = portieri_df[pv_col].quantile(0.50)
        print(f"Soglia Partite Giocate Ponderate per portieri: > {pv_threshold:.2f}")

    portieri_titolari = portieri_df[portieri_df[pv_col] >= pv_threshold].sort_values('Probabilità_Top_Player', ascending=False)
    portieri_riserve = portieri_df[portieri_df[pv_col] < pv_threshold].sort_values('Probabilità_Top_Player', ascending=False)
    
    # Assegna un portiere titolare a ogni squadra
    titolari_assegnati_id = []
    for team_id in teams:
        if not portieri_titolari.empty:
            portiere_scelto = portieri_titolari.iloc[0]
            teams[team_id].append(portiere_scelto['Id'])
            titolari_assegnati_id.append(portiere_scelto['Id'])
            # Rimuovi il portiere scelto dall'elenco dei disponibili
            portieri_titolari = portieri_titolari.drop(portiere_scelto.name)
        else:
            print(f"Attenzione: non ci sono abbastanza portieri 'titolari' da assegnare a tutte le squadre. Passaggio a logica di riserva.")
            break
            
    # Combina i portieri rimanenti per l'assegnazione successiva
    portieri_rimanenti = pd.concat([portieri_titolari, portieri_riserve]).sort_values('Probabilità_Top_Player', ascending=False)
    
    # Assegna i restanti 2 portieri per ogni squadra
    for team_id in teams:
        num_portieri_attuali = len(teams[team_id])
        while num_portieri_attuali < ruoli_count['P']:
            if not portieri_rimanenti.empty:
                portiere_scelto = portieri_rimanenti.iloc[0]
                teams[team_id].append(portiere_scelto['Id'])
                # Rimuovi il portiere scelto dall'elenco dei disponibili
                portieri_rimanenti = portieri_rimanenti.drop(portiere_scelto.name)
                num_portieri_attuali += 1
            else:
                print("Attenzione: non ci sono più portieri disponibili per completare le squadre.")
                break

    # Rimuovi i portieri selezionati dal DataFrame generale dei disponibili
    all_selected_p_ids = [pid for p_list in teams.values() for pid in p_list]
    df_disponibili = df_disponibili[~df_disponibili['Id'].isin(all_selected_p_ids)]
    
    print("Selezione dei portieri completata. Procedo con gli altri ruoli.")
    
    # --- FINE NUOVA LOGICA PER I PORTIERI ---
    
    # Selezioniamo gli altri ruoli (la logica rimane la stessa)
    for ruolo, count in ruoli_count.items():
        if ruolo == 'P': continue
        
        giocatori_disponibili_ruolo = df_disponibili[
            (df_disponibili['R_2025_26'] == ruolo)
        ].sort_values('Probabilità_Top_Player', ascending=False)
        
        if not giocatori_disponibili_ruolo.empty:
            for i in range(count * num_teams):
                idx = i % len(giocatori_disponibili_ruolo)
                team_idx = i % num_teams
                
                player_id = giocatori_disponibili_ruolo.iloc[idx]['Id']
                
                teams[f'Squadra_{team_idx+1}_AI'].append(player_id)
                df_disponibili = df_disponibili.drop(giocatori_disponibili_ruolo.iloc[idx].name, errors='ignore')

    # Aggiungi la colonna Squadra_AI al DataFrame
    df['Squadra_AI'] = 'N.D.'
    for team_id, player_ids in teams.items():
        df.loc[df['Id'].isin(player_ids), 'Squadra_AI'] = team_id

    return df, teams

# --- Sezione principale del codice ---

unified_dataset = merge_and_process_yearly_datasets()

if not unified_dataset.empty:
    
    # 1. Addestramento del modello Random Forest per i Top Player
    top_player_model, feature_importances, model_df, model_feature_columns = train_top_player_model(unified_dataset)

    if top_player_model is not None:
        # 2. Classificazione dei giocatori con le nuove colonne AI
        unified_dataset = classify_players_with_ai(
            df=unified_dataset, 
            model=top_player_model, 
            feature_columns=model_feature_columns
        )
        
        # 3. Costruzione delle squadre AI
        unified_dataset, ai_teams = build_ai_teams(unified_dataset, num_teams=3)

        final_output_file = "Database.csv"
        unified_dataset.to_csv(final_output_file, index=False)
        print(f"\nIl dataset unificato, inclusi i calcoli AI, è stato salvato in '{final_output_file}'")
        print(f"Dimensioni del dataset finale: {unified_dataset.shape[0]} righe, {unified_dataset.shape[1]} colonne.")

        # Stampa dei risultati
        print("\n=== I 3 migliori giocatori scelti dal modello (indipendentemente dalla squadra) ===")
        display_columns_ai = ['Nome', 'R_2025_26', 'Squadra_2025_26', 'Qt.A_2025_26', 'Fattore_Fantahack_AI', 'Top_Player_AI', 'Unicorno_AI']
        top_players_ai = unified_dataset.sort_values(by='Fattore_Fantahack_AI', ascending=False)
        print(top_players_ai[display_columns_ai].head(10).to_string(index=False))

        print("\n=== Dettagli delle squadre AI generate ===")
        for team_name, player_ids in ai_teams.items():
            team_df = unified_dataset[unified_dataset['Id'].isin(player_ids)].sort_values(by=['R_2025_26', 'Qt.A_2025_26'])
            print(f"\nSquadra: {team_name}")
            print(team_df[['Nome', 'R_2025_26', 'Squadra_2025_26', 'Qt.A_2025_26']].to_string(index=False))

    else:
        print("Impossibile procedere con la classificazione e la creazione delle squadre.")

    # Ripristino e stampa delle logiche originali per confronto
    print("\n--- Confronto con le logiche originali (precedenti) ---")

    print("\n=== Giocatori Fattore Fantahack Top (basato su regole fisse) ===")
    old_display_columns = ['Nome', 'R_2025_26', 'Squadra_2025_26', 'Qt.A_2025_26', 'Fm_2025_26', 'Pv_2025_26', 'Fattore_Fantahack', 'Top_Player', 'Unicorno']
    df_sorted_fantahack = unified_dataset[unified_dataset['Fattore_Fantahack'] > 0].sort_values(by='Fattore_Fantahack', ascending=False)
    print(df_sorted_fantahack[old_display_columns].head(10).to_string(index=False))

    print("\n=== Giocatori Top Player (basato su regole fisse) ===")
    df_top_players = unified_dataset[unified_dataset['Top_Player'] == 1]
    if not df_top_players.empty:
        df_top_players_sorted = df_top_players.sort_values(by='Fm_2025_26', ascending=False)
        print(df_top_players_sorted[old_display_columns].head(10).to_string(index=False))
    else:
        print("Nessun giocatore identificato come 'Top Player' in base ai criteri attuali.")

    print("\n=== Giocatori Unicorno (basato su regole fisse) ===")
    df_unicorns = unified_dataset[unified_dataset['Unicorno'] == 1]
    if not df_unicorns.empty:
        df_unicorns_sorted = df_unicorns.sort_values(by='Fattore_Fantahack', ascending=False)
        print(df_unicorns_sorted[old_display_columns].head(10).to_string(index=False))
    else:
        print("Nessun giocatore identificato come 'Unicorno' in base ai criteri attuali.")

else:
    print("Nessun dataset finale da salvare.")