/**
 * Shared utilities and state management for GS Breakthrough module
 */

window.gsState = {
    data: [],
    filteredData: [],
    eraStart: 1968,
    eraEnd: 2024,
    highlightedPlayer: null,
    searchQuery: "",

    // Dispatch events to charts
    broadcastUpdate: function (reason) {
        console.log(`Broadcasting update: ${reason}`);
        const event = new CustomEvent('gsStateUpdate', { detail: { reason: reason } });
        window.dispatchEvent(event);
    },

    // Filter data based on current state
    applyFilters: function () {
        this.filteredData = this.data.filter(d =>
            d.Year_First_GS >= this.eraStart &&
            d.Year_First_GS <= this.eraEnd
        );
        this.broadcastUpdate('filter');
    },

    setHighlight: function (playerName) {
        this.highlightedPlayer = playerName;
        this.broadcastUpdate('highlight');
    }
};

// Initialize Controls immediately
document.addEventListener('DOMContentLoaded', async function () {
    // 1. Initialize UI Controls first so they exist
    initSlider();
    initSearch();
    initPresets();

    // 2. Load Data
    try {
        // Attempt to fetch data and overrides in parallel
        const [csvData, overrides] = await Promise.all([
            d3.csv("https://raw.githubusercontent.com/sorukumar/tml-data/main/data/gs-breakthrough/gs_breakthrough_comparison.csv"),
            d3.json("https://raw.githubusercontent.com/sorukumar/tml-data/main/data/gs-breakthrough/legacy_overrides.json").catch(err => {
                console.warn("Could not load legacy overrides (might not be pushed yet):", err);
                return []; // Fallback to empty if missing
            })
        ]);

        // Process data
        window.gsState.data = csvData.map(d => {
            // Basic parsing
            const parsed = {
                ...d,
                Age_First_GS: +d.Age_First_GS,
                Matches_Before_First_GS: +d.Matches_Before_First_GS,
                Total_GS_Titles: +d.Total_GS_Titles,
                Year_First_GS: +d.Year_First_GS,
                Year_Turned_Pro: +d.Year_Turned_Pro,
                Win_Percentage: +d.Win_Percentage,
                Win_Percentage_Before_GS: +d.Win_Percentage_Before_GS,
                GS_Win_Ratio: +d.GS_Win_Ratio,
                Peak_Ranking: +d.Peak_Ranking,
                Peak_Ranking_Before_GS: +d.Peak_Ranking_Before_GS,
                Years_On_Tour_Before_GS: +d.Years_On_Tour_Before_GS
            };

            // Apply Override if exists
            const override = overrides.find(o => o.Player_Name === parsed.Player_Name);
            if (override) {
                console.log(`Applying legacy override for ${parsed.Player_Name}`, override);
                parsed.Age_First_GS = override.Age_First_GS;
                parsed.Year_First_GS = override.Year_First_GS;
                if (override.Matches_Before_First_GS !== undefined) {
                    parsed.Matches_Before_First_GS = override.Matches_Before_First_GS;
                }
            }
            return parsed;
        });

        window.gsState.filteredData = [...window.gsState.data];

        // 3. Broadcast initial update
        console.log("Data loaded successfully, filtering and broadcasting...");
        window.gsState.applyFilters(); // This calls broadcastUpdate('filter')
        window.gsState.broadcastUpdate('initial');

    } catch (error) {
        console.error("Error loading GS Breakthrough data:", error);
    }
});

function initSlider() {
    const startInput = document.getElementById('era-start');
    const endInput = document.getElementById('era-end');
    const label = document.getElementById('era-label');
    const track = document.getElementById('era-slider-track');

    function updateSlider() {
        let val1 = parseInt(startInput.value);
        let val2 = parseInt(endInput.value);

        if (val1 > val2) {
            [val1, val2] = [val2, val1];
        }

        window.gsState.eraStart = val1;
        window.gsState.eraEnd = val2;
        label.textContent = `${val1} - ${val2}`;

        // Update track highlight
        const min = parseInt(startInput.min);
        const max = parseInt(startInput.max);
        const left = ((val1 - min) / (max - min)) * 100;
        const right = ((val2 - min) / (max - min)) * 100;

        track.style.background = `linear-gradient(to right, #e0e0e0 ${left}%, var(--primary-color) ${left}%, var(--primary-color) ${right}%, #e0e0e0 ${right}%)`;

        window.gsState.applyFilters();
    }

    startInput.addEventListener('input', updateSlider);
    endInput.addEventListener('input', updateSlider);
    updateSlider();
}

function initSearch() {
    const searchInput = document.getElementById('player-search');
    const resultsDiv = document.getElementById('search-results');

    searchInput.addEventListener('input', function () {
        const query = this.value.toLowerCase();
        if (query.length < 2) {
            resultsDiv.style.display = 'none';
            window.gsState.setHighlight(null);
            return;
        }

        const matches = window.gsState.data.filter(d =>
            d.Player_Name.toLowerCase().includes(query)
        ).slice(0, 5);

        if (matches.length > 0) {
            resultsDiv.innerHTML = matches.map(m => `
                <div class="search-result-item" data-name="${m.Player_Name}">
                    ${m.Player_Name} (${m.Year_First_GS})
                </div>
            `).join('');
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.style.display = 'none';
        }
    });

    resultsDiv.addEventListener('click', function (e) {
        const item = e.target.closest('.search-result-item');
        if (item) {
            const name = item.dataset.name;
            searchInput.value = name;
            resultsDiv.style.display = 'none';
            window.gsState.setHighlight(name);
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            resultsDiv.style.display = 'none';
        }
    });
}

function initPresets() {
    document.querySelectorAll('.era-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const start = parseInt(this.dataset.start);
            const end = parseInt(this.dataset.end);

            document.getElementById('era-start').value = start;
            document.getElementById('era-end').value = end;

            // Trigger input event to update slider visuals
            document.getElementById('era-start').dispatchEvent(new Event('input'));

            document.querySelectorAll('.era-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}
