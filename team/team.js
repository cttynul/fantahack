document.addEventListener('DOMContentLoaded', () => {
    const databaseFile = '../Database.csv';
    let allPlayersData = [];
    let setPiecesData = {};
    let goalkeepersData = {};

    const teamSelect = document.getElementById('team-select');
    const teamDetailsDiv = document.getElementById('team-details');
    const noTeamFoundMessage = document.getElementById('no-team-found');
    const teamSummaryDiv = document.getElementById('team-summary');
    const playersTableBody = document.getElementById('players-table-body');
    const topPlayerChartContainer = document.getElementById('top-player-chart-container');
    const unicornChartContainer = document.getElementById('unicorn-chart-container');
    const setPiecesDiv = document.getElementById('set-pieces-data');
    const goalkeeperDiv = document.getElementById('goalkeeper-data');
    const flexContainer = document.getElementById('set-pieces-goalkeeper-container');

    // Funzione per caricare il database dei giocatori
    function loadDatabase() {
        return new Promise((resolve, reject) => {
            Papa.parse(databaseFile, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    allPlayersData = results.data;
                    console.log('Database giocatori caricato.');
                    populateTeamSelect(allPlayersData);
                    resolve();
                },
                error: (error) => {
                    console.error('Errore nel caricamento del database:', error);
                    reject(error);
                }
            });
        });
    }

    // Funzione per caricare i file Markdown
    async function loadMarkdownFiles() {
        try {
            const rigoristiResponse = await fetch('../RIGORISTI.md');
            const rigoristiText = await rigoristiResponse.text();
            setPiecesData = parseMarkdownFile(rigoristiText);

            const portieriResponse = await fetch('../PORTIERI.md');
            const portieriText = await portieriResponse.text();
            goalkeepersData = parseGoalkeepersMarkdown(portieriText);

            console.log('File Markdown caricati.');
        } catch (error) {
            console.error('Errore nel caricamento dei file Markdown:', error);
        }
    }

    // Funzione per analizzare il file RIGORISTI.md
    function parseMarkdownFile(text) {
        const teamsData = {};
        const teamSections = text.split('---').map(section => section.trim()).filter(section => section.startsWith('##'));
        teamSections.forEach(section => {
            const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            const teamName = lines[0].replace('## **', '').replace('**', '');
            const rigoriIndex = lines.findIndex(line => line.startsWith('**Rigori**'));
            const calciPiazzatiIndex = lines.findIndex(line => line.startsWith('**Calci piazzati**'));

            const rigori = [];
            const calciPiazzati = [];

            if (rigoriIndex !== -1) {
                for (let i = rigoriIndex + 1; i < (calciPiazzatiIndex !== -1 ? calciPiazzatiIndex : lines.length); i++) {
                    rigori.push(lines[i].replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));
                }
            }
            if (calciPiazzatiIndex !== -1) {
                for (let i = calciPiazzatiIndex + 1; i < lines.length; i++) {
                    calciPiazzati.push(lines[i].replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));
                }
            }

            teamsData[teamName] = {
                rigori: rigori,
                calciPiazzati: calciPiazzati
            };
        });
        return teamsData;
    }

    // Funzione per analizzare il file PORTIERI.md
    function parseGoalkeepersMarkdown(text) {
        const data = {
            best: [],
            worst: []
        };
        const lines = text.split('\n').map(line => line.trim());
        const bestIndex = lines.findIndex(line => line.includes('I migliori abbinamenti'));
        const worstIndex = lines.findIndex(line => line.includes('Le peggiori combinazioni'));

        if (bestIndex !== -1) {
            for (let i = bestIndex + 1; i < (worstIndex !== -1 ? worstIndex : lines.length); i++) {
                if (lines[i].match(/^\d+\./)) {
                    data.best.push(lines[i].replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));
                }
            }
        }

        if (worstIndex !== -1) {
            for (let i = worstIndex + 1; i < lines.length; i++) {
                if (lines[i].match(/^\d+\./)) {
                    data.worst.push(lines[i].replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));
                }
            }
        }
        return data;
    }

    // Funzione per popolare il menu a tendina
    function populateTeamSelect(data) {
        const teams = [...new Set(data.map(p => p['Squadra_2025_26']).filter(team => team && team !== 'N.D.'))].sort();
        teamSelect.innerHTML = '<option value="">Seleziona una squadra</option>';
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            teamSelect.appendChild(option);
        });
        teamSelect.disabled = false;
        noTeamFoundMessage.textContent = 'Nessuna squadra selezionata. Inizia a selezionare sopra.';
        noTeamFoundMessage.style.display = 'block';
    }

    // Funzione per visualizzare i dettagli della squadra selezionata
    function displayTeam(team) {
        noTeamFoundMessage.style.display = 'none';
        teamDetailsDiv.style.display = 'block';

        const teamPlayers = allPlayersData.filter(p => p['Squadra_2025_26'] === team);

        // Riepilogo generale
        const roleCounts = teamPlayers.reduce((acc, p) => {
            const role = p['R_2025_26'];
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {});

        teamSummaryDiv.innerHTML = `
            <h2>${team}</h2>
            <div class="summary">
                <div>Portieri: ${roleCounts['P'] || 0}</div>
                <div>Difensori: ${roleCounts['D'] || 0}</div>
                <div>Centrocampisti: ${roleCounts['C'] || 0}</div>
                <div>Attaccanti: ${roleCounts['A'] || 0}</div>
            </div>
        `;

        // Tabella giocatori (dati stagione precedente)
        playersTableBody.innerHTML = '';
        teamPlayers.forEach(player => {
            const row = document.createElement('tr');
            const mv_24_25 = (parseFloat(player['Mv_2024_25']) === 666) ? '0' : player['Mv_2024_25'] || 'N/D';
            const fm_24_25 = (parseFloat(player['Fm_2024_25']) === 666) ? '0' : player['Fm_2024_25'] || 'N/D';
            const goals_24_25 = (player['R_2025_26'] === 'P' ? (parseFloat(player['Gs_2024_25']) === 666 ? '0' : player['Gs_2024_25'] || 'N/D') : (parseFloat(player['Gf_2024_25']) === 666 ? '0' : player['Gf_2024_25'] || 'N/D'));
            const quote_24_25 = (parseFloat(player['Qt.A_2024_25']) === 666) ? '0' : player['Qt.A_2024_25'] || 'N/D';
            const fantahackFactor = parseFloat(player['Fattore_Fantahack']) * 100;
            const fantahackDisplay = isNaN(fantahackFactor) ? 'N/D' : `${fantahackFactor.toFixed(2)}%`;

            row.innerHTML = `
                <td>${player.Nome}</td>
                <td>${player['R_2025_26']}</td>
                <td>${mv_24_25}</td>
                <td>${fm_24_25}</td>
                <td>${goals_24_25}</td>
                <td>${quote_24_25}</td>
                <td>${fantahackDisplay}</td>
            `;
            playersTableBody.appendChild(row);
        });

        // Funzione per creare un grafico
        const createChart = (canvasId, type, label, data, labels) => {
            const chartCanvas = document.getElementById(canvasId);
            const chartInstance = Chart.getChart(chartCanvas);
            if (chartInstance) chartInstance.destroy();

            return new Chart(chartCanvas, {
                type: type,
                data: {
                    labels: labels,
                    datasets: [{
                        label: label,
                        data: data,
                        backgroundColor: 'rgba(64, 142, 94, 0.8)',
                        borderColor: 'rgb(64, 142, 94)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        };

        // Top Player (FantaMedia '24/'25) - Istogramma
        const topPlayers_24_25 = teamPlayers
            .filter(p => p['Fm_2024_25'] && parseFloat(p['Fm_2024_25']) !== 666)
            .sort((a, b) => parseFloat(b['Fm_2024_25']) - parseFloat(a['Fm_2024_25']))
            .slice(0, 5);

        const topPlayerLabels = topPlayers_24_25.map(p => p.Nome);
        const topPlayerData = topPlayers_24_25.map(p => parseFloat(p['Fm_2024_25']));
        createChart('top-player-chart', 'bar', 'FantaMedia \'24/\'25', topPlayerData, topPlayerLabels);

        // Grafico Unicorni (Fattore Fantahack)
        const topUnicorns = teamPlayers
            .filter(p => p['Unicorno'] === '1' && parseFloat(p['Fattore_Fantahack']) > 0)
            .sort((a, b) => parseFloat(b['Fattore_Fantahack']) - parseFloat(a['Fattore_Fantahack']))
            .slice(0, 5);

        if (topUnicorns.length > 0) {
            unicornChartContainer.style.display = 'block';
            const unicornLabels = topUnicorns.map(p => p.Nome);
            const unicornData = topUnicorns.map(p => parseFloat(p['Fattore_Fantahack']));
            createChart('unicorn-chart', 'bar', 'Fattore Fantahack', unicornData, unicornLabels);
        } else {
            unicornChartContainer.style.display = 'none';
        }

        // Rigoristi e Calci piazzati
        const setPieces = setPiecesData[team];
        if (setPieces) {
            setPiecesDiv.innerHTML = `
                <h4>Rigoristi:</h4>
                <ul>${setPieces.rigori.map(p => `<li>${p}</li>`).join('')}</ul>
                <h4>Calci piazzati:</h4>
                <ul>${setPieces.calciPiazzati.map(p => `<li>${p}</li>`).join('')}</ul>
            `;
        } else {
            setPiecesDiv.innerHTML = '<p>Dati non disponibili per questa squadra.</p>';
        }

        // Abbinamento portieri
        const goalkeepers = goalkeepersData;
        const bestMatches = goalkeepers.best.filter(match => match.includes(team));
        const worstMatches = goalkeepers.worst.filter(match => match.includes(team));

        goalkeeperDiv.innerHTML = `
            <h4>Migliori combinazioni:</h4>
            <ul>${bestMatches.length > 0 ? bestMatches.map(m => `<li>${m}</li>`).join('') : '<li>N/D</li>'}</ul>
            <h4>Peggiori combinazioni:</h4>
            <ul>${worstMatches.length > 0 ? worstMatches.map(m => `<li>${m}</li>`).join('') : '<li>N/D</li>'}</ul>
        `;
    }

    // Listener per la selezione della squadra
    teamSelect.addEventListener('change', (e) => {
        const selectedTeam = e.target.value;
        if (selectedTeam) {
            displayTeam(selectedTeam);
        } else {
            teamDetailsDiv.style.display = 'none';
            noTeamFoundMessage.textContent = 'Nessuna squadra selezionata. Inizia a selezionare sopra.';
            noTeamFoundMessage.style.display = 'block';
        }
    });

    // Avvia il caricamento dei dati
    Promise.all([loadDatabase(), loadMarkdownFiles()]);

    // Funzionalità spoiler per la tabella dei giocatori
    const spoilerHeader = document.querySelector('#team-players-table .spoiler-header');
    if (spoilerHeader) {
        spoilerHeader.addEventListener('click', () => {
            document.getElementById('team-players-table').classList.toggle('collapsed');
        });
    }
});