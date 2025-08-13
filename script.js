document.addEventListener('DOMContentLoaded', () => {
    const databaseFile = 'Database.csv';
    let allPlayersData = [];
    let currentFilteredData = [];
    let selectedPlayers = new Map(); // Map<playerId, playerObject>

    // Seleziona tutti gli elementi del DOM con controlli di sicurezza
    const tableBody = document.querySelector('#players-table tbody');
    const tableHeaderRow = document.querySelector('#players-table thead tr');
    const yearSelect = document.getElementById('year-select');
    const roleSelect = document.getElementById('role-select');
    const teamSelect = document.getElementById('team-select');
    const searchPlayerInput = document.getElementById('search-player');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const selectedPlayersCountSpan = document.getElementById('selected-players-count');
    const estimatedCostSpan = document.getElementById('estimated-cost');
    const clearSelectionBtn = document.getElementById('clear-selection');

    const showWithoutTeamCheckbox = document.getElementById('show-without-team');
    const hidePackinariCheckbox = document.getElementById('hide-pachinari');
    const gameModeSwitchToggle = document.getElementById('game-mode-switch-toggle');

    const disclaimerMessage = document.getElementById('disclaimer-message');

    const objectivesTableBody = document.querySelector('#objectives-table tbody');
    const objectivesTableHeaderRow = document.querySelector('#objectives-table thead tr');
    const clearObjectivesBtn = document.getElementById('clear-objectives');
    const fantamilioniInput = document.getElementById('fantamilioni-input');
    const fantamilioniInputDisplay = document.getElementById('fantamilioni-input-display');
    const businessPlanValueSpan = document.getElementById('business-plan-value');
    const totalSpentValueSpan = document.getElementById('total-spent-value');
    const noObjectivesMessage = document.getElementById('no-objectives-message');

    // **QUI GLI ELEMENTI PER LO SPOILER CON CONTROLLI:**
    const playersTableSpoilerHeader = document.getElementById('players-table-spoiler-header');
    const playersTableSpoilerContainer = document.querySelector('.table-spoiler');

    const rosterSettingSelect = document.getElementById('roster-setting-select');
    const departmentSummaryDiv = document.getElementById('department-summary');

    // Cookie Banner Elements
    const cookieBanner = document.getElementById('cookie-banner');
    const acceptCookiesBtn = document.getElementById('accept-cookies');
    const rejectCookiesBtn = document.getElementById('decline-cookies');
    const closeCookieBtn = document.getElementById('close-banner');

    // CONTROLLO CRITICO: Verifica che gli elementi essenziali esistano
    const essentialElements = {
        tableBody,
        tableHeaderRow,
        yearSelect,
        roleSelect,
        searchPlayerInput,
        applyFiltersBtn,
        resetFiltersBtn,
        fantamilioniInput
    };

    const missingElements = [];
    for (const [name, element] of Object.entries(essentialElements)) {
        if (!element) {
            missingElements.push(name);
        }
    }

    if (missingElements.length > 0) {
        console.error('Elementi mancanti nel DOM:', missingElements);
        console.error('Assicurati che tutti gli elementi HTML necessari siano presenti nella pagina');
        return; // Interrompe l'esecuzione se mancano elementi critici
    }

    const years = ['2025_26', '2024_25', '2023_24', '2022_23'];

    let currentMainTableSortColumn = null;
    let currentMainTableSortDirection = 'asc';

    let currentObjectivesTableSortColumn = null;
    let currentObjectivesTableSortDirection = 'asc';

    let currentGameMode = 'classic';
    let currentFantamilioni = 500;

    // Nuove configurazioni percentuali per reparto
    const ROSTER_SETTINGS = {
        'balanced': {
            name: 'Bilanciato',
            description: 'Consigliato per la maggior parte delle leghe.',
            P: 0.08,
            D: 0.20,
            C: 0.30,
            A: 0.42
        },
        'offensive': {
            name: 'Offensivo',
            description: 'Se vuoi puntare forte sui bonus degli attaccanti.',
            P: 0.05,
            D: 0.15,
            C: 0.30,
            A: 0.50
        },
        'prudent': {
            name: 'Prudente',
            description: 'Se preferisci solidità e pochi rischi.',
            P: 0.10,
            D: 0.25,
            C: 0.35,
            A: 0.30
        }
    };
    let currentRosterSetting = ROSTER_SETTINGS.balanced; // Impostazione di default

    async function loadCSV() {
        return new Promise((resolve, reject) => {
            Papa.parse(databaseFile, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    if (results.errors.length) {
                        console.error("Error parsing CSV:", results.errors);
                        reject(results.errors);
                    } else {
                        resolve(results.data);
                    }
                },
                error: function(err) {
                    console.error("Error fetching CSV:", err);
                    reject(err);
                }
            });
        });
    }

    function populateTeamSelect(year) {
        if (!teamSelect) return;
        
        // Pulisci le opzioni esistenti
        teamSelect.innerHTML = '<option value="TUTTI">Tutte</option>';
        
        // Ottieni tutte le squadre uniche per l'anno selezionato
        const teamColumn = `Squadra_${year}`;
        const teams = new Set();
        
        allPlayersData.forEach(player => {
            const team = player[teamColumn];
            if (team && team !== null && team !== 'N.D.') {
                teams.add(team);
            }
        });
        
        // Ordina le squadre alfabeticamente e aggiungile al select
        Array.from(teams).sort().forEach(team => {
            const option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            teamSelect.appendChild(option);
        });
    }

    async function init() {
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year.replace('_', '/');
            yearSelect.appendChild(option);
        });
        yearSelect.value = years[0];

        // Popola il selettore delle impostazioni rosa solo se esiste
        if (rosterSettingSelect) {
            for (const key in ROSTER_SETTINGS) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = ROSTER_SETTINGS[key].name;
                rosterSettingSelect.appendChild(option);
            }
            rosterSettingSelect.value = 'balanced'; // Imposta il default
        }

        if (gameModeSwitchToggle) {
            gameModeSwitchToggle.dataset.mode = currentGameMode;
            const activeElement = gameModeSwitchToggle.querySelector(`[data-mode="${currentGameMode}"]`);
            if (activeElement) {
                activeElement.classList.add('active');
            }
        }

        if (fantamilioniInput) {
            fantamilioniInput.value = currentFantamilioni;
        }

        if (fantamilioniInputDisplay) {
            fantamilioniInputDisplay.textContent = currentFantamilioni;
        }

        if (hidePackinariCheckbox) {
            hidePackinariCheckbox.checked = false;
        }

        try {
            const loadingRow = tableBody.querySelector('.loading-message');
            if (loadingRow) loadingRow.textContent = "Caricamento dati. Attendere...";

            allPlayersData = await loadCSV();
            console.log("Dati caricati:", allPlayersData.length, "giocatori.");

            allPlayersData.forEach(player => {
                for (const key in player) {
                    if (player.hasOwnProperty(key)) {
                        let value = parseFloat(player[key]);
                        if (!isNaN(value) && value !== 666) {
                            player[key] = value;
                        } else if (value === 666) {
                            player[key] = null;
                        } else if (player[key] === 'N.D.' || player[key] === 'ND') {
                             player[key] = null;
                        }
                    }
                }
                player.Unicorno = parseInt(player.Unicorno) === 1;
                player.Top_Player = parseInt(player.Top_Player) === 1;
                player.Fattore_Fantahack = parseFloat(player.Fattore_Fantahack) || 0;
            });

            // Popola il selettore squadre dopo aver caricato i dati
            populateTeamSelect(yearSelect.value);
            
            applyFilters();
            updateObjectivesTable();

        } catch (error) {
            tableBody.innerHTML = '<tr><td colspan="99" style="color: red;">Errore nel caricamento dei dati. Controlla il file Database.csv.</td></tr>';
            console.error("Errore fatale nell'inizializzazione:", error);
        }
    }

    function applyFilters() {
        const selectedYear = yearSelect.value;
        const selectedRole = roleSelect.value;
        const selectedTeam = teamSelect ? teamSelect.value : 'TUTTI';
        const searchText = searchPlayerInput.value.toLowerCase().trim();
        const showWithoutTeam = showWithoutTeamCheckbox ? showWithoutTeamCheckbox.checked : false;
        const hidePackinari = hidePackinariCheckbox ? hidePackinariCheckbox.checked : true;

        currentFilteredData = allPlayersData.filter(player => {
            const roleCol = `R_${selectedYear}`;
            const teamCol = `Squadra_${selectedYear}`;
            const pvCol = `Pv_${selectedYear}`;

            if (selectedRole !== 'TUTTI' && player[roleCol] !== selectedRole) {
                return false;
            }

            if (selectedTeam !== 'TUTTI' && player[teamCol] !== selectedTeam) {
                return false;
            }

            if (searchText && player.Nome && !player.Nome.toLowerCase().includes(searchText)) {
                return false;
            }

            const playerHasNoTeam = player[teamCol] === null;

            if (showWithoutTeam && !playerHasNoTeam) {
                return false;
            }
            if (!showWithoutTeam && playerHasNoTeam) {
                return false;
            }

            // Filtro "nascondi pachinari": se attivo, nasconde giocatori con <= 20 partite
            if (hidePackinari) {
                const partiteGiocate = player[pvCol];
                if (partiteGiocate !== null && partiteGiocate <= 20) {
                    return false;
                }
            }

            return true;
        });

        if (currentMainTableSortColumn) {
            sortMainTableData(currentMainTableSortColumn, currentMainTableSortDirection, false);
        } else {
            renderTable(currentFilteredData, selectedYear);
        }
        updateAuctionSummary();
    }

    function getStatValueWithFallback(player, statKey, year) {
        let value = player[`${statKey}_${year}`];
        let displayYear = year;

        if (year === '2025_26' && (value === null || value === 0)) {
            const prevYearKey = statKey === 'Fm' ? 'Fm_2024_25' :
                                statKey === 'FVM M' ? 'FVM M_2024_25' :
                                statKey === 'Pv' ? 'Pv_2024_25' :
                                statKey === 'Gf' ? 'Gf_2024_25' :
                                statKey === 'Gs' ? 'Gs_2024_25' :
                                statKey === 'Ass' ? 'Ass_2024_25' :
                                statKey === 'Amm' ? 'Amm_2024_25' :
                                statKey === 'Esp' ? 'Esp_2024_25' :
                                statKey === 'Au' ? 'Au_2024_25' : null;

            if (prevYearKey && player[prevYearKey] !== null) {
                value = player[prevYearKey];
                displayYear = '2024/25';
            }
        }
        return { value, displayYear };
    }

    function getFmColorClass(fmValue) {
        if (fmValue === null || isNaN(fmValue)) {
            return '';
        }
        if (fmValue >= 5.9) {
            return 'fm-green';
        } else if (fmValue >= 5.7 && fmValue < 5.9) {
            return 'fm-yellow';
        } else {
            return 'fm-red';
        }
    }

    function renderTable(data, year) {
        tableBody.innerHTML = '';

        let showDisclaimer = false;
        if (year === '2025_26') {
            const statsToCheck = ['Pv', 'Fm', 'FVM M', 'Gf', 'Gs', 'Ass', 'Amm', 'Esp', 'Au'];
            showDisclaimer = data.some(player => {
                return statsToCheck.some(stat => {
                    const currentYearValue = player[`${stat}_${year}`];
                    const prevYearValue = player[`${stat}_2024_25`];
                    return (currentYearValue === null || currentYearValue === 0) && prevYearValue !== null && prevYearValue !== 0;
                });
            });
        }
        if (disclaimerMessage) {
            if (showDisclaimer) {
                disclaimerMessage.classList.add('active');
            } else {
                disclaimerMessage.classList.remove('active');
            }
        }

        let headerHtml = `
            <th class="add-column"></th>
            <th data-column-name="Nome">Nome</th>
            <th data-column-name="R_${year}">Ruolo</th>
            <th data-column-name="Squadra_${year}">Squadra</th>
        `;

        if (currentGameMode === 'classic') {
            headerHtml += `<th data-column-name="Qt.A_${year}">Quotazione</th>`;
            const fmHeaderRef = (year === '2025_26' && data.some(p => (p[`Fm_${year}`] === null || p[`Fm_${year}`] === 0) && p['Fm_2024_25'] !== null)) ? `Fm_2024_25` : `Fm_${year}`;
            headerHtml += `<th data-column-name="${fmHeaderRef}">FantaMedia</th>`;
        } else {
            headerHtml += `<th data-column-name="Qt.A M_${year}">Quotazione Mantra</th>`;
            const fvmMHeaderRef = (year === '2025_26' && data.some(p => (p[`FVM M_${year}`] === null || p[`FVM M_${year}`] === 0) && p['FVM M_2024_25'] !== null)) ? `FVM M_2024_25` : `FVM M_${year}`;
            headerHtml += `<th data-column-name="${fvmMHeaderRef}">Fantamedia Mantra</th>`;
        }

        const pvColumnRef = (year === '2025_26' && data.some(p => (p[`Pv_${year}`] === null || p[`Pv_${year}`] === 0) && p['Pv_2024_25'] !== null)) ? `Pv_2024_25` : `Pv_${year}`;
        headerHtml += `<th data-column-name="${pvColumnRef}">Partite Giocate</th>`;

        headerHtml += `<th data-column-name="${currentGameMode === 'classic' ? `Qt.A_${year}` : `Qt.A M_${year}`}">Budget</th>`;

        headerHtml += `
            <th data-column-name="Fattore_Fantahack">Fattore Fantahack <i class="fas fa-magic" title="Indica i migliori acquisti qualità/prezzo"></i></th>
            <th data-column-name="Unicorno">Unicorno <i class="fas fa-horse-head" title="Giocatori low-cost con performance eccellenti"></i></th>
            <th data-column-name="Top_Player">Top Player <i class="fas fa-crown" title="Giocatore con alta quotazione e alta performance"></i></th>
        `;
        tableHeaderRow.innerHTML = headerHtml;

        const yearSpecificColumnsMapping = [
            {
                original: `Gf_${year}`,
                fallback: `Gf_2024_25`,
                display: 'Gol Fatti',
                title: `Gol Fatti`,
                key: 'Gf'
            },
            {
                original: `Gs_${year}`,
                fallback: `Gs_2024_25`,
                display: 'Gol Subiti',
                title: `Gol Subiti`,
                key: 'Gs'
            },
            { original: `Ass_${year}`, fallback: `Ass_2024_25`, display: 'Assist', title: `Assist`, key: 'Ass' },
            { original: `Amm_${year}`, fallback: `Amm_2024_25`, display: 'Ammonizioni', title: `Ammonizioni`, key: 'Amm' },
            { original: `Esp_${year}`, fallback: `Esp_2024_25`, display: 'Espulsioni', title: `Espulsioni`, key: 'Esp' },
            { original: `Au_${year}`, fallback: `Au_2024_25`, display: 'Autogol', title: `Autogol`, key: 'Au' }
        ];

        yearSpecificColumnsMapping.forEach(colInfo => {
            const th = document.createElement('th');
            let headerColumnName = colInfo.original;
            let headerTitle = colInfo.title;

            if (year === '2025_26' && data.some(p => (p[colInfo.original] === null || p[colInfo.original] === 0) && p[colInfo.fallback] !== null)) {
                headerColumnName = colInfo.fallback;
                headerTitle = `${colInfo.title} (Rif. 2024/25)`;
            }
            th.textContent = colInfo.display;
            th.title = headerTitle;
            th.dataset.columnName = headerColumnName;
            tableHeaderRow.appendChild(th);
        });

        tableHeaderRow.querySelectorAll('th[data-column-name]').forEach(th => {
            th.addEventListener('click', () => {
                const columnName = th.dataset.columnName;
                if (columnName) {
                    const newDirection = (currentMainTableSortColumn === columnName && currentMainTableSortDirection === 'asc') ? 'desc' : 'asc';
                    sortMainTableData(columnName, newDirection);
                }
            });
        });

        tableHeaderRow.querySelectorAll('th').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
            if (th.dataset.columnName === currentMainTableSortColumn) {
                th.classList.add(`sorted-${currentMainTableSortDirection}`);
            }
        });

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="99">Nessun giocatore trovato con i filtri selezionati.</td></tr>';
            return;
        }

        data.forEach(player => {
            const row = tableBody.insertRow();
            row.dataset.playerId = player.Id;

            if (selectedPlayers.has(player.Id)) {
                row.classList.add('selected-for-auction');
            }

            // Colonna per il pulsante +
            const addButtonCell = row.insertCell();
            addButtonCell.classList.add('add-button-cell');
            const addButton = document.createElement('button');
            addButton.classList.add('add-player-btn');
            addButton.innerHTML = '<i class="fas fa-plus"></i>';
            addButton.title = 'Aggiungi agli obiettivi';
            addButton.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePlayerSelection(player.Id, player);
            });
            addButtonCell.appendChild(addButton);

            // Mantieni anche il click sulla riga per la selezione
            row.addEventListener('click', () => togglePlayerSelection(player.Id, player));

            const columnsToDisplay = [
                { key: 'Nome', format: val => val },
                { key: `R_${year}`, format: val => val || 'N.D.', classIfNull: 'not-available' },
                { key: `Squadra_${year}`, format: val => val || 'N.D.', classIfNull: 'not-available' },
            ];

            const qtKey = (currentGameMode === 'classic') ? `Qt.A_${year}` : `Qt.A M_${year}`;
            const playerBudget = player[qtKey] !== null ? player[qtKey] : 'N.D.';

            if (currentGameMode === 'classic') {
                columnsToDisplay.push({ key: `Qt.A_${year}`, format: val => val !== null ? val : 'N.D.', classIfNull: 'not-available' });

                const { value: fmValue, displayYear: fmDisplayYear } = getStatValueWithFallback(player, 'Fm', year);
                const fmClass = getFmColorClass(fmValue);
                columnsToDisplay.push({
                    key: `Fm_${year}`,
                    format: val => fmValue !== null ? fmValue.toFixed(2) : 'N.D.',
                    classIfNull: 'not-available',
                    title: `FantaMedia (Rif. ${fmDisplayYear.replace('_', '/')})`,
                    dynamicClass: fmClass
                });
            } else {
                columnsToDisplay.push({ key: `Qt.A M_${year}`, format: val => val !== null ? val : 'N.D.', classIfNull: 'not-available' });

                const { value: fvmMValue, displayYear: fvmMDisplayYear } = getStatValueWithFallback(player, 'FVM M', year);
                const fvmMClass = getFmColorClass(fvmMValue);
                columnsToDisplay.push({
                    key: `FVM M_${year}`,
                    format: val => fvmMValue !== null ? fvmMValue.toFixed(2) : 'N.D.',
                    classIfNull: 'not-available',
                    title: `Fantamedia Mantra (Rif. ${fvmMDisplayYear.replace('_', '/')})`,
                    dynamicClass: fvmMClass
                });
            }

            const { value: pvValue, displayYear: pvDisplayYear } = getStatValueWithFallback(player, 'Pv', year);
            columnsToDisplay.push({
                key: `Pv_${year}`,
                format: val => pvValue !== null ? pvValue : 'N.D.',
                classIfNull: 'not-available',
                title: `Partite Giocate (Rif. ${pvDisplayYear.replace('_', '/')})`
            });

            columnsToDisplay.push({
                key: 'Budget',
                format: val => playerBudget,
                classIfNull: (playerBudget === 'N.D.' ? 'not-available' : '')
            });

            columnsToDisplay.push(
                { key: 'Fattore_Fantahack', format: val => val !== 0 ? (val * 100).toFixed(1) + '%' : 'N.D.', classIfNull: 'not-available', classIfValue: 'fantahack-value' },
                { key: 'Unicorno', format: val => val ? '<span class="unicorn-emoji" title="Unicorno! Basso costo, alta performance!">🦄</span>' : '<span class="not-unicorn-emoji" title="Non un unicorno 😢">☁️</span>' },
                { key: 'Top_Player', format: val => val ? '<span class="top-player-emoji" title="Top Player! Alta quotazione, alta performance!">🌟</span>' : '<span class="not-top-player-emoji" title="Non un Top Player">⚪</span>' }
            );

            columnsToDisplay.forEach(colDef => {
                const cell = row.insertCell();
                if (colDef.key === 'Budget') {
                    cell.textContent = playerBudget;
                } else {
                    cell.innerHTML = colDef.format(player[colDef.key]);
                }

                if (player[colDef.key] === null && colDef.classIfNull) {
                    cell.classList.add(colDef.classIfNull);
                }
                if (colDef.classIfValue && player[colDef.key] !== null) {
                    cell.classList.add(colDef.classIfValue);
                }
                if (colDef.dynamicClass) {
                    cell.classList.add(colDef.dynamicClass);
                }
                if (colDef.title) {
                    cell.setAttribute('title', colDef.title);
                }
            });

            yearSpecificColumnsMapping.forEach(colInfo => {
                const cell = row.insertCell();
                const { value, displayYear } = getStatValueWithFallback(player, colInfo.key, year);

                if (value === null) {
                    cell.textContent = 'N.D.';
                    cell.classList.add('not-available');
                } else if (typeof value === 'number' && !isNaN(value)) {
                    if (value % 1 !== 0) {
                        cell.textContent = value.toFixed(2);
                    } else {
                        cell.textContent = value;
                    }
                } else {
                    cell.textContent = value;
                }
                cell.setAttribute('title', `${colInfo.title} (Rif. ${displayYear.replace('_', '/')})`);
            });
        });
    }

    function sortMainTableData(columnName, direction, toggle = true) {
        if (toggle && currentMainTableSortColumn === columnName) {
            currentMainTableSortDirection = (currentMainTableSortDirection === 'asc') ? 'desc' : 'asc';
        } else {
            currentMainTableSortDirection = direction;
        }
        currentMainTableSortColumn = columnName;

        currentFilteredData.sort((a, b) => {
            let valA = a[columnName];
            let valB = b[columnName];

            const selectedYear = yearSelect.value;

            const statsForFallbackSorting = ['Pv', 'Fm', 'FVM M', 'Gf', 'Gs', 'Ass', 'Amm', 'Esp', 'Au'];
            const columnBaseName = columnName.split('_')[0];

            if (selectedYear === '2025_26' && statsForFallbackSorting.includes(columnBaseName)) {
                if ((valA === null || valA === 0) && (valB === null || valB === 0)) {
                    const prevYearColumnName = `${columnBaseName}_2024_25`;
                    valA = a[prevYearColumnName];
                    valB = b[prevYearColumnName];
                }
            }

            if (valA === null && valB === null) return 0;
            if (valA === null) return 1;
            if (valB === null) return -1;

            if (columnName === 'Unicorno' || columnName === 'Top_Player') {
                return currentMainTableSortDirection === 'asc' ? (valA === valB ? 0 : valA ? -1 : 1) : (valA === valB ? 0 : valA ? 1 : -1);
            }

            const numA = parseFloat(valA);
            const numB = parseFloat(valB);

            if (!isNaN(numA) && !isNaN(numB)) {
                return currentMainTableSortDirection === 'asc' ? numA - numB : numB - numA;
            } else {
                const strA = String(valA).toLowerCase();
                const strB = String(valB).toLowerCase();
                return currentMainTableSortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
            }
        });

        renderTable(currentFilteredData, yearSelect.value);
    }

    function togglePlayerSelection(playerId, playerObject) {
        const tablePlayerRow = document.querySelector(`#players-table tr[data-player-id="${playerId}"]`);

        if (selectedPlayers.has(playerId)) {
            selectedPlayers.delete(playerId);
            if (tablePlayerRow) tablePlayerRow.classList.remove('selected-for-auction');
        } else {
            const selectedYear = yearSelect.value;
            const qtKey = (currentGameMode === 'classic') ? `Qt.A_${selectedYear}` : `Qt.A M_${selectedYear}`;
            playerObject.customBudget = playerObject[qtKey] !== null ? playerObject[qtKey] : 0;
            playerObject.actualSpent = 0; // Nuovo campo: spesa effettiva, inizializzata a 0

            selectedPlayers.set(playerId, playerObject);
            if (tablePlayerRow) tablePlayerRow.classList.add('selected-for-auction');
        }
        updateAuctionSummary();
        updateObjectivesTable();
    }

    function updateAuctionSummary() {
        if (selectedPlayersCountSpan) {
            selectedPlayersCountSpan.textContent = selectedPlayers.size;
        }
        
        let estimatedCost = 0; // Costo basato sui budget personalizzati
        let totalActualSpent = 0; // Spesa totale basata sul campo 'actualSpent'

        // Spesa per reparto
        const spentByDepartment = { P: 0, D: 0, C: 0, A: 0 };
        const selectedYear = yearSelect.value;

        selectedPlayers.forEach(player => {
            if (player.customBudget !== null && !isNaN(player.customBudget)) {
                estimatedCost += player.customBudget;
            }
            if (player.actualSpent !== null && !isNaN(player.actualSpent)) {
                totalActualSpent += player.actualSpent;
            }

            // Aggiorna la spesa per reparto
            const playerRole = player[`R_${selectedYear}`];
            if (playerRole && spentByDepartment.hasOwnProperty(playerRole)) {
                spentByDepartment[playerRole] += player.actualSpent;
            }
        });

        if (estimatedCostSpan) {
            estimatedCostSpan.textContent = estimatedCost;
        }
        if (totalSpentValueSpan) {
            totalSpentValueSpan.textContent = totalActualSpent;
        }

        const businessPlan = currentFantamilioni - totalActualSpent;
        if (businessPlanValueSpan) {
            businessPlanValueSpan.textContent = businessPlan;
            businessPlanValueSpan.classList.remove('positive', 'negative');
            if (businessPlan >= 0) {
                businessPlanValueSpan.classList.add('positive');
            } else {
                businessPlanValueSpan.classList.add('negative');
            }
        }

        // Aggiorna il riepilogo delle percentuali per reparto
        updateDepartmentSummary(spentByDepartment);
    }

    function updateDepartmentSummary(spentByDepartment) {
        if (!departmentSummaryDiv) return;
        
        departmentSummaryDiv.innerHTML = ''; // Pulisci il contenuto precedente

        const totalAvailableBudget = currentFantamilioni;
        const roles = ['P', 'D', 'C', 'A'];

        roles.forEach(role => {
            const desiredPercentage = currentRosterSetting[role];
            const desiredBudgetForRole = totalAvailableBudget * desiredPercentage;
            const actualSpentForRole = spentByDepartment[role] || 0;

            const itemDiv = document.createElement('div');
            itemDiv.classList.add('department-item');

            let statusClass = '';
            if (actualSpentForRole <= desiredBudgetForRole) {
                statusClass = 'status-ok';
            } else {
                statusClass = 'status-warning';
            }
            itemDiv.classList.add(statusClass);

            itemDiv.innerHTML = `
                <span>${role}: ${(desiredPercentage * 100).toFixed(0)}%</span>
                <span>(Speso: ${actualSpentForRole} / Budget: ${desiredBudgetForRole.toFixed(0)})</span>
            `;
            departmentSummaryDiv.appendChild(itemDiv);
        });
    }

    function updateObjectivesTable() {
        if (!objectivesTableBody) return;
        
        objectivesTableBody.innerHTML = '';
        const selectedYear = yearSelect.value;

        if (selectedPlayers.size === 0) {
            if (noObjectivesMessage) {
                noObjectivesMessage.classList.add('active');
            }
        } else {
            if (noObjectivesMessage) {
                noObjectivesMessage.classList.remove('active');
            }
        }

        let playersForObjectivesTable = Array.from(selectedPlayers.values());

        if (currentObjectivesTableSortColumn) {
            sortObjectivesTableData(currentObjectivesTableSortColumn, currentObjectivesTableSortDirection, playersForObjectivesTable);
        }

        playersForObjectivesTable.forEach(player => {
            const row = objectivesTableBody.insertRow();
            row.dataset.playerId = player.Id;

            row.insertCell().textContent = player.Nome;
            row.insertCell().textContent = player[`R_${selectedYear}`] || 'N.D.';
            row.insertCell().textContent = player[`Squadra_${selectedYear}`] || 'N.D.';

            const budgetCell = row.insertCell();
            budgetCell.classList.add('budget-cell');

            const displayBudget = player.customBudget !== null ? player.customBudget : 'N.D.';
            budgetCell.textContent = displayBudget;

            if (displayBudget === 'N.D.') {
                budgetCell.classList.add('not-available');
            }

            const editIcon = document.createElement('i');
            editIcon.classList.add('fas', 'fa-pencil-alt', 'edit-icon');
            budgetCell.appendChild(editIcon);

            budgetCell.addEventListener('click', (event) => {
                if (budgetCell.querySelector('input')) {
                    return;
                }

                const input = document.createElement('input');
                input.type = 'number';
                input.value = player.customBudget !== null ? player.customBudget : '';
                input.min = "0";
                input.step = "any";

                budgetCell.textContent = '';
                budgetCell.appendChild(input);
                input.focus();

                const saveBudget = () => {
                    let newBudget = parseFloat(input.value);
                    if (isNaN(newBudget) || newBudget < 0) {
                        newBudget = 0;
                    }
                    player.customBudget = newBudget;
                    budgetCell.textContent = newBudget;
                    budgetCell.appendChild(editIcon);
                    updateAuctionSummary();
                    updateObjectivesTable();
                };

                input.addEventListener('blur', saveBudget);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        saveBudget();
                    }
                });
            });

            // Colonna Consiglio AI
            const aiAdviceCell = row.insertCell();
            const playerRole = player[`R_${selectedYear}`];
            if (playerRole && currentRosterSetting[playerRole]) {
                const totalBudgetForRole = currentFantamilioni * currentRosterSetting[playerRole];
                let spentForRole = 0;
                selectedPlayers.forEach(p => {
                    if (p[`R_${selectedYear}`] === playerRole && p.Id !== player.Id) {
                        spentForRole += p.actualSpent || 0;
                    }
                });

                const remainingBudgetForRole = totalBudgetForRole - spentForRole;
                const adviceBudget = Math.max(0, Math.min(player.customBudget || 0, remainingBudgetForRole));

                aiAdviceCell.innerHTML = `<i class="fas fa-star" title="Basato su quotazione iniziale e budget per ruolo"></i> ${adviceBudget.toFixed(0)}`;
                aiAdviceCell.style.fontWeight = 'bold';
                aiAdviceCell.style.color = '#27ae60';
            } else {
                aiAdviceCell.textContent = 'N.D.';
                aiAdviceCell.classList.add('not-available');
            }

            // Colonna Spesa
            const spentCell = row.insertCell();
            spentCell.classList.add('spent-cell');

            const displaySpent = player.actualSpent !== null ? player.actualSpent : 'N.D.';
            spentCell.textContent = displaySpent;

            if (displaySpent === 'N.D.') {
                spentCell.classList.add('not-available');
            }

            const spentEditIcon = document.createElement('i');
            spentEditIcon.classList.add('fas', 'fa-pencil-alt', 'edit-icon');
            spentCell.appendChild(spentEditIcon);

            spentCell.addEventListener('click', (event) => {
                if (spentCell.querySelector('input')) {
                    return;
                }

                const input = document.createElement('input');
                input.type = 'number';
                input.value = player.actualSpent !== null ? player.actualSpent : '';
                input.min = "0";
                input.step = "any";

                spentCell.textContent = '';
                spentCell.appendChild(input);
                input.focus();

                const saveSpent = () => {
                    let newSpent = parseFloat(input.value);
                    if (isNaN(newSpent) || newSpent < 0) {
                        newSpent = 0;
                    }
                    player.actualSpent = newSpent;
                    spentCell.textContent = newSpent;
                    spentCell.appendChild(spentEditIcon);
                    updateAuctionSummary();
                    updateObjectivesTable();
                };

                input.addEventListener('blur', saveSpent);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        saveSpent();
                    }
                });
            });

            const statsColumnsToDisplay = [
                { key: 'Fm', type: 'classic', format: (val) => val !== null ? val.toFixed(2) : 'N.D.' },
                { key: 'FVM M', type: 'mantra', format: (val) => val !== null ? val.toFixed(2) : 'N.D.' },
                { key: 'Pv', format: (val) => val !== null ? val : 'N.D.' },
                { key: 'Gf', format: (val) => val !== null ? val : 'N.D.' },
                { key: 'Gs', format: (val) => val !== null ? val : 'N.D.' },
                { key: 'Ass', format: (val) => val !== null ? val : 'N.D.' },
                { key: 'Amm', format: (val) => val !== null ? val : 'N.D.' },
                { key: 'Esp', format: (val) => val !== null ? val : 'N.D.' },
                { key: 'Au', format: (val) => val !== null ? val : 'N.D.' },
            ];

            statsColumnsToDisplay.forEach(statCol => {
                if (statCol.type === 'classic' && currentGameMode !== 'classic') return;
                if (statCol.type === 'mantra' && currentGameMode !== 'mantra') return;

                const cell = row.insertCell();
                const { value, displayYear } = getStatValueWithFallback(player, statCol.key, selectedYear);

                cell.textContent = statCol.format(value);

                if (value === null) {
                    cell.classList.add('not-available');
                }

                if (statCol.key === 'Fm' || statCol.key === 'FVM M') {
                    const fmClass = getFmColorClass(value);
                    if (fmClass) cell.classList.add(fmClass);
                }

                let titleText = statCol.key;
                if (statCol.key === 'Fm') titleText = 'FantaMedia';
                else if (statCol.key === 'FVM M') titleText = 'Fantamedia Mantra';
                else if (statCol.key === 'Pv') titleText = 'Partite Giocate';
                else if (statCol.key === 'Gf') titleText = 'Gol Fatti';
                else if (statCol.key === 'Gs') titleText = 'Gol Subiti';
                else if (statCol.key === 'Ass') titleText = 'Assist';
                else if (statCol.key === 'Amm') titleText = 'Ammonizioni';
                else if (statCol.key === 'Esp') titleText = 'Espulsioni';
                else if (statCol.key === 'Au') titleText = 'Autogol';

                cell.setAttribute('title', `${titleText} (Rif. ${displayYear.replace('_', '/')})`);
            });

            const actionCell = row.insertCell();
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '<i class="fas fa-minus"></i>';
            removeBtn.classList.add('remove-player-btn-mini');
            removeBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                togglePlayerSelection(player.Id, player);
            });
            actionCell.appendChild(removeBtn);
        });

        updateObjectivesTableHeader(selectedYear);
    }

    function sortObjectivesTableData(columnName, direction, playersArray) {
        currentObjectivesTableSortColumn = columnName;
        currentObjectivesTableSortDirection = direction;

        playersArray.sort((a, b) => {
            let valA, valB;

            const selectedYear = yearSelect.value;

            if (columnName === 'Nome') {
                valA = a.Nome;
                valB = b.Nome;
            } else if (columnName === 'Ruolo') {
                valA = a[`R_${selectedYear}`];
                valB = b[`R_${selectedYear}`];
            } else if (columnName === 'Squadra') {
                valA = a[`Squadra_${selectedYear}`];
                valB = b[`Squadra_${selectedYear}`];
            } else if (columnName === 'Budget') {
                valA = a.customBudget;
                valB = b.customBudget;
            } else if (columnName === 'Spesa') {
                valA = a.actualSpent;
                valB = b.actualSpent;
            } else if (columnName === 'FantaMedia' || columnName === 'Fantamedia Mantra') {
                const statKey = currentGameMode === 'classic' ? 'Fm' : 'FVM M';
                const { value: fmValueA } = getStatValueWithFallback(a, statKey, selectedYear);
                const { value: fmValueB } = getStatValueWithFallback(b, statKey, selectedYear);
                valA = fmValueA;
                valB = fmValueB;
            } else if (columnName === 'Partite Giocate') {
                const { value: pvValueA } = getStatValueWithFallback(a, 'Pv', selectedYear);
                const { value: pvValueB } = getStatValueWithFallback(b, 'Pv', selectedYear);
                valA = pvValueA;
                valB = pvValueB;
            } else if (columnName === 'Gol Fatti') {
                const { value: gfValueA } = getStatValueWithFallback(a, 'Gf', selectedYear);
                const { value: gfValueB } = getStatValueWithFallback(b, 'Gf', selectedYear);
                valA = gfValueA;
                valB = gfValueB;
            } else if (columnName === 'Gol Subiti') {
                const { value: gsValueA } = getStatValueWithFallback(a, 'Gs', selectedYear);
                const { value: gsValueB } = getStatValueWithFallback(b, 'Gs', selectedYear);
                valA = gsValueA;
                valB = gsValueB;
            } else if (columnName === 'Assist') {
                const { value: assValueA } = getStatValueWithFallback(a, 'Ass', selectedYear);
                const { value: assValueB } = getStatValueWithFallback(b, 'Ass', selectedYear);
                valA = assValueA;
                valB = assValueB;
            } else if (columnName === 'Ammonizioni') {
                const { value: ammValueA } = getStatValueWithFallback(a, 'Amm', selectedYear);
                const { value: ammValueB } = getStatValueWithFallback(b, 'Amm', selectedYear);
                valA = ammValueA;
                valB = ammValueB;
            } else if (columnName === 'Espulsioni') {
                const { value: espValueA } = getStatValueWithFallback(a, 'Esp', selectedYear);
                const { value: espValueB } = getStatValueWithFallback(b, 'Esp', selectedYear);
                valA = espValueA;
                valB = espValueB;
            } else if (columnName === 'Autogol') {
                const { value: auValueA } = getStatValueWithFallback(a, 'Au', selectedYear);
                const { value: auValueB } = getStatValueWithFallback(b, 'Au', selectedYear);
                valA = auValueA;
                valB = auValueB;
            } else if (columnName === 'Consiglio AI') {
                const playerRoleA = a[`R_${selectedYear}`];
                const playerRoleB = b[`R_${selectedYear}`];
                const totalBudgetForRoleA = currentFantamilioni * (currentRosterSetting[playerRoleA] || 0);
                const totalBudgetForRoleB = currentFantamilioni * (currentRosterSetting[playerRoleB] || 0);

                let spentForRoleA = 0;
                selectedPlayers.forEach(p => {
                    if (p[`R_${selectedYear}`] === playerRoleA && p.Id !== a.Id) {
                        spentForRoleA += p.actualSpent || 0;
                    }
                });
                let spentForRoleB = 0;
                selectedPlayers.forEach(p => {
                    if (p[`R_${selectedYear}`] === playerRoleB && p.Id !== b.Id) {
                        spentForRoleB += p.actualSpent || 0;
                    }
                });

                const remainingBudgetForRoleA = totalBudgetForRoleA - spentForRoleA;
                const remainingBudgetForRoleB = totalBudgetForRoleB - spentForRoleB;

                valA = Math.max(0, Math.min(a.customBudget || 0, remainingBudgetForRoleA));
                valB = Math.max(0, Math.min(b.customBudget || 0, remainingBudgetForRoleB));
            }

            if (valA === null && valB === null) return 0;
            if (valA === null) return 1;
            if (valB === null) return -1;

            const numA = parseFloat(valA);
            const numB = parseFloat(valB);

            if (!isNaN(numA) && !isNaN(numB)) {
                return direction === 'asc' ? numA - numB : numB - numA;
            } else {
                const strA = String(valA).toLowerCase();
                const strB = String(valB).toLowerCase();
                return direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
            }
        });

        selectedPlayers.clear();
        playersArray.forEach(player => selectedPlayers.set(player.Id, player));
    }

    function updateObjectivesTableHeader(year) {
        if (!objectivesTableHeaderRow) return;
        
        objectivesTableHeaderRow.innerHTML = `
            <th data-column-name="Nome">Nome</th>
            <th data-column-name="Ruolo">Ruolo</th>
            <th data-column-name="Squadra">Squadra</th>
            <th data-column-name="Budget">Budget</th>
            <th data-column-name="Consiglio AI">Consiglio AI <i class="fas fa-brain"></i></th>
            <th data-column-name="Spesa">Spesa</th>
        `;

        const headersToAdd = [];
        if (currentGameMode === 'classic') {
            headersToAdd.push({ original: `Fm_${year}`, display: 'FantaMedia', key: 'Fm', colNameForSort: 'FantaMedia' });
        } else {
            headersToAdd.push({ original: `FVM M_${year}`, display: 'Fantamedia Mantra', key: 'FVM M', colNameForSort: 'Fantamedia Mantra' });
        }
        headersToAdd.push(
            { original: `Pv_${year}`, display: 'Partite Giocate', key: 'Pv', colNameForSort: 'Partite Giocate' },
            { original: `Gf_${year}`, display: 'Gol Fatti', key: 'Gf', colNameForSort: 'Gol Fatti' },
            { original: `Gs_${year}`, display: 'Gol Subiti', key: 'Gs', colNameForSort: 'Gol Subiti' },
            { original: `Ass_${year}`, display: 'Assist', key: 'Ass', colNameForSort: 'Assist' },
            { original: `Amm_${year}`, display: 'Ammonizioni', key: 'Amm', colNameForSort: 'Ammonizioni' },
            { original: `Esp_${year}`, display: 'Espulsioni', key: 'Esp', colNameForSort: 'Espulsioni' },
            { original: `Au_${year}`, display: 'Autogol', key: 'Au', colNameForSort: 'Autogol' }
        );

        headersToAdd.forEach(colInfo => {
            const th = document.createElement('th');
            th.textContent = colInfo.display;
            th.dataset.columnName = colInfo.colNameForSort;

            let headerTitle = colInfo.display;
            if (year === '2025_26' && allPlayersData.some(p => (p[`${colInfo.key}_${year}`] === null || p[`${colInfo.key}_${year}`] === 0) && p[`${colInfo.key}_2024_25`] !== null)) {
                headerTitle = `${colInfo.display} (Rif. 2024/25)`;
            }
            th.title = headerTitle;
            objectivesTableHeaderRow.appendChild(th);
        });

        const actionTh = document.createElement('th');
        actionTh.textContent = 'Azione';
        objectivesTableHeaderRow.appendChild(actionTh);

        objectivesTableHeaderRow.querySelectorAll('th').forEach(th => {
            if (th.textContent !== 'Azione') {
                th.addEventListener('click', () => {
                    const columnName = th.dataset.columnName;
                    const newDirection = (currentObjectivesTableSortColumn === columnName && currentObjectivesTableSortDirection === 'asc') ? 'desc' : 'asc';
                    sortObjectivesTableData(columnName, newDirection, Array.from(selectedPlayers.values()));
                    updateObjectivesTable();
                });
            }
        });

        objectivesTableHeaderRow.querySelectorAll('th').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
            if (th.dataset.columnName === currentObjectivesTableSortColumn) {
                th.classList.add(`sorted-${currentObjectivesTableSortDirection}`);
            }
        });
    }

    // EVENT LISTENERS con controlli di sicurezza
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }

    if (yearSelect) {
        yearSelect.addEventListener('change', () => {
            populateTeamSelect(yearSelect.value);
            applyFilters();
            updateObjectivesTable();
        });
    }

    if (roleSelect) {
        roleSelect.addEventListener('change', applyFilters);
    }

    if (teamSelect) {
        teamSelect.addEventListener('change', applyFilters);
    }

    if (searchPlayerInput) {
        searchPlayerInput.addEventListener('input', applyFilters);
    }

    if (fantamilioniInput) {
        fantamilioniInput.addEventListener('input', () => {
            currentFantamilioni = parseFloat(fantamilioniInput.value) || 0;
            if (fantamilioniInputDisplay) {
                fantamilioniInputDisplay.textContent = currentFantamilioni;
            }
            updateAuctionSummary();
            updateObjectivesTable();
        });
    }

    if (rosterSettingSelect) {
        rosterSettingSelect.addEventListener('change', () => {
            currentRosterSetting = ROSTER_SETTINGS[rosterSettingSelect.value];
            updateAuctionSummary();
            updateObjectivesTable();
        });
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            yearSelect.value = years[0];
            roleSelect.value = 'TUTTI';
            if (teamSelect) {
                teamSelect.value = 'TUTTI';
            }
            searchPlayerInput.value = '';
            if (showWithoutTeamCheckbox) {
                showWithoutTeamCheckbox.checked = false;
            }
            if (hidePackinariCheckbox) {
                hidePackinariCheckbox.checked = false;
            }

            currentGameMode = 'classic';
            if (gameModeSwitchToggle) {
                gameModeSwitchToggle.dataset.mode = 'classic';
                gameModeSwitchToggle.querySelectorAll('.switch-option').forEach(opt => opt.classList.remove('active'));
                const classicOption = gameModeSwitchToggle.querySelector('[data-mode="classic"]');
                if (classicOption) {
                    classicOption.classList.add('active');
                }
            }

            if (fantamilioniInput) {
                fantamilioniInput.value = 500;
            }
            currentFantamilioni = 500;
            if (fantamilioniInputDisplay) {
                fantamilioniInputDisplay.textContent = 500;
            }
            
            if (rosterSettingSelect) {
                rosterSettingSelect.value = 'balanced';
            }
            currentRosterSetting = ROSTER_SETTINGS.balanced;

            currentMainTableSortColumn = null;
            currentMainTableSortDirection = 'asc';
            currentObjectivesTableSortColumn = null;
            currentObjectivesTableSortDirection = 'asc';

            selectedPlayers.clear();
            populateTeamSelect(yearSelect.value);
            updateObjectivesTable();
            applyFilters();
        });
    }

    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', () => {
            document.querySelectorAll('#players-table tbody tr').forEach(row => {
                row.classList.remove('selected-for-auction');
            });
        });
    }

    if (clearObjectivesBtn) {
        clearObjectivesBtn.addEventListener('click', () => {
            selectedPlayers.clear();
            updateObjectivesTable();
            document.querySelectorAll('#players-table tbody tr').forEach(row => {
                row.classList.remove('selected-for-auction');
            });
            updateAuctionSummary();
        });
    }

    if (showWithoutTeamCheckbox) {
        showWithoutTeamCheckbox.addEventListener('change', applyFilters);
    }

    if (hidePackinariCheckbox) {
        hidePackinariCheckbox.addEventListener('change', applyFilters);
    }

    if (gameModeSwitchToggle) {
        gameModeSwitchToggle.addEventListener('click', (event) => {
            const clickedOption = event.target.closest('.switch-option');
            if (clickedOption) {
                const newMode = clickedOption.dataset.mode;
                if (newMode !== currentGameMode) {
                    currentGameMode = newMode;
                    gameModeSwitchToggle.dataset.mode = newMode;
                    gameModeSwitchToggle.querySelectorAll('.switch-option').forEach(opt => opt.classList.remove('active'));
                    clickedOption.classList.add('active');
                    applyFilters();
                    updateObjectivesTable();
                }
            }
        });
    }

    // Initialize spoiler functionality
    if (playersTableSpoilerHeader && playersTableSpoilerContainer) {
        playersTableSpoilerHeader.addEventListener('click', () => {
            playersTableSpoilerContainer.classList.toggle('collapsed');
        });
        // Initially collapsed
        playersTableSpoilerContainer.classList.add('collapsed');
        console.log('Spoiler initialized successfully');
    } else {
        console.warn('Spoiler elements not found in DOM:', {
            header: !!playersTableSpoilerHeader,
            container: !!playersTableSpoilerContainer
        });
    }

    function hideCookieBanner() {
        if (cookieBanner) {
            cookieBanner.style.display = 'none';
        }
    }

    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function checkCookieConsent() {
        const consent = getCookie('cookie_consent');

        if (consent === 'accepted') {
            hideCookieBanner();
            initializeGoogleAnalytics();
            console.log('Cookie accettati. GA caricato.');
        } else if (consent === 'rejected') {
            hideCookieBanner();
            console.log('Cookie rifiutati. Nessun script di tracciamento caricato.');
        } else {
            showCookieBanner();
            console.log('Nessun consenso cookie, banner mostrato.');
        }
    }

    // Event listeners per il cookie banner
    if (acceptCookiesBtn) {
        acceptCookiesBtn.addEventListener('click', () => {
            setCookie('cookie_consent', 'accepted', 365);
            hideCookieBanner();
            initializeGoogleAnalytics();
        });
    }

    if (rejectCookiesBtn) {
        rejectCookiesBtn.addEventListener('click', () => {
            setCookie('cookie_consent', 'rejected', 365);
            hideCookieBanner();
        });
    }

    if (closeCookieBtn) {
        closeCookieBtn.addEventListener('click', () => {
            hideCookieBanner();
        });
    }

    // --- Inizializzazione ---
    checkCookieConsent();

    // Initialize the application with a small delay to ensure DOM elements are loaded
    setTimeout(() => {
        init();
    }, 100);

    // Hide Budget column
    document.querySelectorAll('#players-table th').forEach((th, index) => {
        if (th.textContent.includes('Budget')) {
            const budgetColumnIndex = index;
            document.querySelectorAll('#players-table tr').forEach(row => {
                const cells = row.cells;
                if (cells[budgetColumnIndex]) {
                    cells[budgetColumnIndex].style.display = 'none';
                }
            });
            th.style.display = 'none';
        }
    });

    // Help Modal functionality
    document.getElementById('help-btn').onclick = (e) => {
        e.preventDefault();
        fetch('HELP.md')
            .then(response => response.text())
            .then(text => {
                const converter = new showdown.Converter({
                    literalMidWordUnderscores: true,
                    simpleLineBreaks: true
                });
                const html = converter.makeHtml(text);
                showModal(helpModal, html);
                // Riprocessa le formule matematiche dopo aver caricato il contenuto
                MathJax.Hub.Queue(["Typeset", MathJax.Hub, helpModal]);
            })
            .catch(error => {
                console.error('Error loading help file:', error);
                showModal(helpModal, '<p>Errore nel caricamento della guida.</p>');
            });
    };

    // Help Modal functionality
    document.getElementById('readme-btn').onclick = (e) => {
        e.preventDefault();
        fetch('README.md')
            .then(response => response.text())
            .then(text => {
                const converter = new showdown.Converter();
                const html = converter.makeHtml(text);
                showModal(readmeModal, html);
            })
            .catch(error => {
                console.error('Error loading help file:', error);
                showModal(readmeModal, '<p>Errore nel caricamento della guida.</p>');
            });
    };

    // Download functionality
    document.getElementById('download-db').addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = 'Database.csv';
        link.download = 'Database_FantaHack.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    document.getElementById('download-objectives').addEventListener('click', () => {
        if (selectedPlayers.size === 0) {
            alert('Nessun obiettivo da esportare!');
            return;
        }

        const currentYear = yearSelect.value;
        const headers = [
            'Nome',
            'Ruolo',
            'Squadra',
            'Quotazione Iniziale',
            'Budget Previsto',
            'Spesa Effettiva',
            'Media Voto',
            'Partite Giocate',
            'Gol',
            'Assist',
            'Ammonizioni',
            'Espulsioni',
            'Rigori Segnati',
            'Rigori Sbagliati',
            'Fattore FantaHack',
            'Note'
        ];

        const csvRows = [headers.join(',')];

        selectedPlayers.forEach(player => {
            const row = [
                player.Nome,
                player[`R_${currentYear}`],
                player[`Squadra_${currentYear}`],
                player[`Qt.A_${currentYear}`],
                player.customBudget,
                player.actualSpent,
                player[`Mv_${currentYear}`],
                player[`Pv_${currentYear}`],
                player[`Gf_${currentYear}`],
                player[`Ass_${currentYear}`],
                player[`Amm_${currentYear}`],
                player[`Esp_${currentYear}`],
                player[`Rp_${currentYear}`],
                player[`Rc_${currentYear}`],
                player[`FantaHackFactor_${currentYear}`],
                player[`Note_${currentYear}`] || ''
            ].map(value => {
                // Handle null, undefined, and strings with commas
                if (value === null || value === undefined) return '""';
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Obiettivi_FantaHack.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Modal handlers
    function showModal(modal, content) {
        if (content) {
            modal.querySelector('.modal-content > div').innerHTML = content;
            // Riprocessa le formule matematiche ogni volta che viene mostrato il modale
            if (typeof MathJax !== 'undefined') {
                MathJax.Hub.Queue(["Typeset", MathJax.Hub, modal]);
            }
        }
        modal.style.display = 'block';
    }

    function closeModal(modal) {
        modal.style.display = 'none';
    }

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = function() {
            closeModal(this.closest('.modal'));
        }
    });

    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target);
        }
    }

    const saveRosterBtn = document.getElementById('save-roster-btn');
    const loadRosterBtn = document.getElementById('load-roster-btn');
    const loadRosterInput = document.getElementById('load-roster-input');

    function saveRoster() {
        if (selectedPlayers.size === 0) {
            alert('Nessun giocatore selezionato da salvare!');
            return;
        }

        const rosterData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            gameMode: currentGameMode,
            fantamilioni: currentFantamilioni,
            rosterSetting: rosterSettingSelect.value,
            players: Array.from(selectedPlayers.values()).map(player => ({
                id: player.Id,
                customBudget: player.customBudget,
                actualSpent: player.actualSpent
            }))
        };

        const blob = new Blob([JSON.stringify(rosterData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'fantahackalcio.fhdb';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async function loadRoster(file) {
        try {
            const content = await file.text();
            let rosterData;

            try {
                rosterData = JSON.parse(content);
            } catch (e) {
                throw new Error('File non valido. Il formato deve essere JSON.');
            }

            // Validate file structure
            if (!rosterData.version || !rosterData.players || !Array.isArray(rosterData.players)) {
                throw new Error('Struttura del file non valida.');
            }

            // Clear current selection
            selectedPlayers.clear();

            // Set game mode
            if (rosterData.gameMode && (rosterData.gameMode === 'classic' || rosterData.gameMode === 'mantra')) {
                currentGameMode = rosterData.gameMode;
                if (gameModeSwitchToggle) {
                    gameModeSwitchToggle.dataset.mode = rosterData.gameMode;
                    gameModeSwitchToggle.querySelectorAll('.switch-option').forEach(opt => {
                        opt.classList.toggle('active', opt.dataset.mode === rosterData.gameMode);
                    });
                }
            }

            // Set fantamilioni
            if (rosterData.fantamilioni && !isNaN(rosterData.fantamilioni)) {
                currentFantamilioni = rosterData.fantamilioni;
                if (fantamilioniInput) {
                    fantamilioniInput.value = currentFantamilioni;
                }
                if (fantamilioniInputDisplay) {
                    fantamilioniInputDisplay.textContent = currentFantamilioni;
                }
            }

            // Set roster setting
            if (rosterData.rosterSetting && ROSTER_SETTINGS[rosterData.rosterSetting]) {
                if (rosterSettingSelect) {
                    rosterSettingSelect.value = rosterData.rosterSetting;
                }
                currentRosterSetting = ROSTER_SETTINGS[rosterData.rosterSetting];
            }

            // Load players
            let loadedCount = 0;
            let errorCount = 0;

            rosterData.players.forEach(savedPlayer => {
                const player = allPlayersData.find(p => p.Id === savedPlayer.id);
                if (player) {
                    player.customBudget = savedPlayer.customBudget;
                    player.actualSpent = savedPlayer.actualSpent;
                    selectedPlayers.set(player.Id, player);
                    loadedCount++;
                } else {
                    errorCount++;
                }
            });

            // Update UI
            applyFilters();
            updateObjectivesTable();
            updateAuctionSummary();

            // Show result
            const message = `Caricamento completato:\n${loadedCount} giocatori caricati`;
            if (errorCount > 0) {
                alert(message + `\n${errorCount} giocatori non trovati nel database attuale.`);
            } else {
                alert(message);
            }

        } catch (error) {
            console.error('Errore nel caricamento del file:', error);
            alert(`Errore nel caricamento del file: ${error.message}`);
        }
    }

    // Add event listeners
    if (saveRosterBtn) {
        saveRosterBtn.addEventListener('click', saveRoster);
    }

    if (loadRosterBtn) {
        loadRosterBtn.addEventListener('click', () => {
            loadRosterInput.click();
        });
    }

    if (loadRosterInput) {
        loadRosterInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.name.endsWith('.fhdb')) {
                alert('Per favore, seleziona un file .fhdb valido');
                e.target.value = '';
                return;
            }

            loadRoster(file);
            e.target.value = ''; // Reset input
        });
    }
}); // Closing the main function scope