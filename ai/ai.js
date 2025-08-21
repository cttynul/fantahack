document.addEventListener('DOMContentLoaded', () => {
    const teamsContainer = document.getElementById('teams-container');
    const loadingOverlay = document.getElementById('loading-overlay');

    function createPlayerCardContent(player) {
        let content = '';
        if (player['Unicorno'] === '1') {
            content += `<span class="player-icon">🦄</span>`;
        }
        if (player['Top_Player'] === '1') {
            content += `<span class="player-icon">⭐</span>`;
        }
        content += `<h4>${player.name}</h4>`;
        return content;
    }

    function createTeamCard(teamName, players) {
        // Formazione Titolare richiesta: 1 P, 3 D, 4 C, 3 A
        const startingGoalkeeperCount = 1;
        const startingDefenderCount = 3;
        const startingMidfielderCount = 4;
        const startingAttackerCount = 3;

        // Ordina i giocatori per ruolo per una selezione coerente
        const goalkeepers = players.filter(p => p.role === 'P').sort((a, b) => a.name.localeCompare(b.name));
        const defenders = players.filter(p => p.role === 'D').sort((a, b) => a.name.localeCompare(b.name));
        const midfielders = players.filter(p => p.role === 'C').sort((a, b) => a.name.localeCompare(b.name));
        const attackers = players.filter(p => p.role === 'A').sort((a, b) => a.name.localeCompare(b.name));

        // Seleziona i titolari e i panchinari
        const starters = {
            goalkeepers: goalkeepers.slice(0, startingGoalkeeperCount),
            defenders: defenders.slice(0, startingDefenderCount),
            midfielders: midfielders.slice(0, startingMidfielderCount),
            attackers: attackers.slice(0, startingAttackerCount)
        };

        const benchPlayers = [
            ...goalkeepers.slice(startingGoalkeeperCount),
            ...defenders.slice(startingDefenderCount),
            ...midfielders.slice(startingMidfielderCount),
            ...attackers.slice(startingAttackerCount)
        ].sort((a, b) => a.name.localeCompare(b.name));

        const teamDiv = document.createElement('div');
        teamDiv.className = 'team-section';
        teamDiv.innerHTML = `<h2>${teamName}</h2>`;

        const playerField = document.createElement('div');
        playerField.className = 'player-field field-lines';
        
        const createPlayerRow = (playerArray, rowClass) => {
            const row = document.createElement('div');
            row.className = `player-row ${rowClass}`;
            playerArray.forEach(player => {
                const card = document.createElement('div');
                card.className = 'player-card';
                card.innerHTML = createPlayerCardContent(player);
                row.appendChild(card);
            });
            return row;
        };

        playerField.appendChild(createPlayerRow(starters.goalkeepers, 'goalkeeper-row'));
        playerField.appendChild(createPlayerRow(starters.defenders, 'defender-row'));
        playerField.appendChild(createPlayerRow(starters.midfielders, 'midfielder-row'));
        playerField.appendChild(createPlayerRow(starters.attackers, 'attacker-row'));
        
        teamDiv.appendChild(playerField);

        const benchDiv = document.createElement('div');
        benchDiv.className = 'bench-section';
        benchDiv.innerHTML = '<h3>Panchinari</h3>';
        
        const benchPlayersList = document.createElement('div');
        benchPlayersList.className = 'bench-players-list';

        benchPlayers.forEach(player => {
            const benchCard = document.createElement('div');
            benchCard.className = 'bench-player-card';
            benchCard.innerHTML = `<h4>${player.name}</h4><p>${player.role}</p>`;
            benchPlayersList.appendChild(benchCard);
        });

        benchDiv.appendChild(benchPlayersList);
        teamDiv.appendChild(benchDiv);

        return teamDiv;
    }

    function processData(data) {
        const teams = {};

        data.forEach(player => {
            const teamName = player['Squadra_AI'];
            const playerName = player['Nome'];
            const playerRole = player['R_2025_26'];
            const isUnicorno = player['Unicorno_AI'];
            const isTopPlayer = player['Top_Player_AI'];
            
            if (teamName && teamName !== 'N.D.' && playerName && playerRole && playerRole !== 'N.D.') {
                if (!teams[teamName]) {
                    teams[teamName] = [];
                }
                teams[teamName].push({
                    name: playerName,
                    role: playerRole,
                    Unicorno: isUnicorno,
                    Top_Player: isTopPlayer
                });
            }
        });

        const sortedTeamNames = Object.keys(teams).sort();

        sortedTeamNames.forEach(teamName => {
            const formattedTeamName = teamName.replace(/_/g, ' ');
            
            const teamPlayers = teams[teamName];
            const teamCard = createTeamCard(formattedTeamName, teamPlayers);
            teamsContainer.appendChild(teamCard);
        });

        loadingOverlay.style.display = 'none';
    }

    async function loadDatabase() {
        return new Promise((resolve, reject) => {
            const cachedData = localStorage.getItem('fantahack_csv_data');
            const cachedTimestamp = localStorage.getItem('fantahack_csv_timestamp');
            
            if (cachedData && cachedTimestamp) {
                const age = Date.now() - parseInt(cachedTimestamp);
                if (age < 24 * 60 * 60 * 1000) { // 24 ore in millisecondi
                    console.log('Database caricato dalla cache.');
                    resolve(JSON.parse(cachedData));
                    return;
                }
            }
            
            // Se non ci sono dati in cache validi, reindirizza alla home
            window.location.href = '/';
            reject(new Error('Database non trovato. Torna alla home.'));
        });
    }

    async function init() {
        try {
            const data = await loadDatabase();
            console.log('Database giocatori caricato.');
            processData(data);
        } catch (error) {
            console.error('Errore nel caricamento del database:', error);
            loadingOverlay.innerHTML = `<div class="loading-text" style="color: var(--accent-color);">
                Errore nel caricamento del file. Torna alla home per caricare il Database.csv.
            </div>`;
        }
    }

    // Avvia l'inizializzazione
    init();
});