document.addEventListener('DOMContentLoaded', () => {
    const databaseFile = '../Database.csv';
    let allPlayersData = [];

    const searchPlayerInput = document.getElementById('search-player-analysis');
    const playerDetailsDiv = document.getElementById('player-details');
    const noPlayerFoundMessage = document.getElementById('no-player-found');
    const playerInfoDiv = document.getElementById('player-info');
    const playerStatsTableDiv = document.getElementById('player-stats-table');
    const additionalDataDiv = document.getElementById('additional-data');
    const quoteChartCanvas = document.getElementById('player-quote-chart');
    const goalsChartCanvas = document.getElementById('player-goals-chart');
    const fmChartCanvas = document.getElementById('player-fm-chart');
    let quoteChart = null;
    let goalsChart = null;
    let fmChart = null;

    // Funzione per caricare il database
    function loadDatabase() {
        Papa.parse(databaseFile, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                allPlayersData = results.data;
                console.log('Database caricato per l\'analisi.');
                // Rendi l'input di ricerca disponibile
                searchPlayerInput.disabled = false;
            },
            error: (error) => {
                console.error('Errore nel caricamento del database:', error);
            }
        });
    }

    // Funzione per mostrare i dati di un giocatore
    function displayPlayer(player) {
        // Nascondi il messaggio di "nessun giocatore trovato"
        noPlayerFoundMessage.style.display = 'none';
        // Mostra il container dei dettagli
        playerDetailsDiv.style.display = 'block';

        // Calcola il fattore fantahack e prepara le icone
        const fantahackFactor = parseFloat(player['Fattore_Fantahack_AI']) * 100;
        const unicornoIcon = player['Unicorno_AI'] == '1' ? ' <span class="unicorn-emoji" title="Unicorno">🦄</span>' : '';
        const topPlayerIcon = player['Top_Player_AI'] == '1' ? ' <span class="top-player-emoji" title="Top Player">⭐</span>' : '';
        const fantahackDisplay = isNaN(fantahackFactor) ? 'N/D' : `${fantahackFactor.toFixed(2)}%`;

        // Mostra le informazioni base e il fattore Fantahack
        playerInfoDiv.innerHTML = `
            <h2>${player.Nome}${unicornoIcon}${topPlayerIcon}</h2>
            <p><strong>Squadra:</strong> ${player['Squadra_2025_26']}</p>
            <p><strong>Ruolo:</strong> ${player['R_2025_26']}</p>
            <p><strong>Fattore Fantahack:</strong> ${fantahackDisplay}</p>
        `;

        // Determina l'intestazione della colonna e la chiave dati in base al ruolo
        const playerRole = player['R_2025_26'];
        const goalHeader = playerRole === 'P' ? 'Gol Subiti' : 'Gol Fatti';
        const goalKey = playerRole === 'P' ? 'Gs' : 'Gf';
        const goalChartLabel = playerRole === 'P' ? 'Gol Subiti per Stagione' : 'Gol Fatti per Stagione';

        // Genera la tabella delle statistiche storiche
        let statsTableHtml = `
            <table>
                <thead>
                    <tr>
                        <th>Stagione</th>
                        <th>MV</th>
                        <th>FM</th>
                        <th>${goalHeader}</th>
                        <th>Assist</th>
                    </tr>
                </thead>
                <tbody>
        `;
        const seasons = [...new Set(Object.keys(player).filter(key => key.includes('_20')).map(key => key.split('_').slice(-2).join('_')))];
        seasons.sort();

        seasons.forEach(season => {
            const mv = (parseFloat(player[`Mv_${season}`]) === 666) ? '0' : player[`Mv_${season}`] || 'N/D';
            const fm = (parseFloat(player[`Fm_${season}`]) === 666) ? '0' : player[`Fm_${season}`] || 'N/D';
            const goals = (parseFloat(player[`${goalKey}_${season}`]) === 666) ? '0' : player[`${goalKey}_${season}`] || 'N/D';
            const ass = (parseFloat(player[`Ass_${season}`]) === 666) ? '0' : player[`Ass_${season}`] || 'N/D';

            // Determina la classe CSS per la FantaMedia
            let fmClass = '';
            const fmValue = parseFloat(fm);
            if (!isNaN(fmValue)) {
                if (fmValue >= 6.5) {
                    fmClass = 'fm-green'; // Colore per voti ottimi (>= 6.5)
                } else if (fmValue >= 6.0) {
                    fmClass = 'fm-yellow'; // Colore per voti nella media (>= 6.0 e < 6.5)
                } else {
                    fmClass = 'fm-red'; // Colore per voti sotto la media (< 6.0)
                }
            }

            statsTableHtml += `
                <tr>
                    <td>${season.replace('_', '/')}</td>
                    <td>${mv}</td>
                    <td class="${fmClass}">${fm}</td>
                    <td>${goals}</td>
                    <td>${ass}</td>
                </tr>
            `;
        });
        statsTableHtml += '</tbody></table>';
        playerStatsTableDiv.innerHTML = statsTableHtml;

        // Funzione per generare un grafico
        const createChart = (canvasId, label, data, color, seasonsLabels) => {
            const chartCanvas = document.getElementById(canvasId);
            if (!chartCanvas) return null;
            
            const chartInstance = Chart.getChart(chartCanvas);
            if (chartInstance) {
                chartInstance.destroy();
            }

            const chartData = {
                labels: seasonsLabels.map(s => s.replace('_', '/')),
                datasets: [{
                    label: label,
                    backgroundColor: color,
                    borderColor: color,
                    data: data,
                    fill: false,
                    tension: 0.2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    borderWidth: 2
                }]
            };

            const config = {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            };

            return new Chart(chartCanvas, config);
        };

        // Genera i tre grafici
        const quotesData = seasons.map(s => (parseFloat(player[`Qt.A_${s}`]) === 666 ? 0 : parseFloat(player[`Qt.A_${s}`]) || 0));
        createChart('player-quote-chart', 'Quotazione Attuale per Stagione', quotesData, 'rgb(64, 142, 94)', seasons);

        const goalsData = seasons.map(s => (parseFloat(player[`${goalKey}_${s}`]) === 666 ? 0 : parseFloat(player[`${goalKey}_${s}`]) || 0));
        createChart('player-goals-chart', goalChartLabel, goalsData, 'rgb(52, 152, 219)', seasons);

        let fmData = seasons.map(s => (parseFloat(player[`Fm_${s}`]) === 666 ? 0 : parseFloat(player[`Fm_${s}`]) || 0));
        let fmSeasons = [...seasons];

        if (fmData.length > 0 && fmData[fmData.length - 1] === 0) {
            fmData.pop();
            fmSeasons.pop();
        }
        
        createChart('player-fm-chart', 'FantaMedia per Stagione', fmData, 'rgb(231, 76, 60)', fmSeasons);
    }

    // Listener per la ricerca
    searchPlayerInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (searchTerm.length > 2) {
            const foundPlayer = allPlayersData.find(p => p.Nome.toLowerCase().includes(searchTerm));
            if (foundPlayer) {
                displayPlayer(foundPlayer);
            } else {
                playerDetailsDiv.style.display = 'none';
                noPlayerFoundMessage.innerHTML = 'Nessun giocatore trovato con questo nome.';
                noPlayerFoundMessage.style.display = 'block';
            }
        } else {
            playerDetailsDiv.style.display = 'none';
            noPlayerFoundMessage.innerHTML = 'Nessun giocatore selezionato. Inizia a cercare sopra.';
            noPlayerFoundMessage.style.display = 'block';
        }
    });

    // Avvia il caricamento del database
    loadDatabase();
});