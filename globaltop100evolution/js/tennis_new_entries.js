// Dot plot for new country entries into Top 100
// To be included as the 4th chart

document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('new-entries-chart');
    if (!container) return;

    fetch('https://raw.githubusercontent.com/sorukumar/tml-data/main/data/globaltop100evolution/top_tennis_players_timeline.json')
        .then(response => response.json())
        .then(tennisData => {
            fetch('https://raw.githubusercontent.com/sorukumar/tml-data/main/data/globaltop100evolution/country_code_mapping.json')
                .then(resp => resp.json())
                .then(codeMap => {
                    const codeToName = codeMap.code_to_name || {};
                    // 1. Find all countries present in 1975
                    const baseYear = 1975;
                    const baseCountries = new Set(Object.keys(
                        tennisData.find(d => d.year === baseYear)?.countries || {}
                    ).filter(c => (tennisData.find(d => d.year === baseYear).countries[c]?.ever_in_top100 || 0) > 0));

                    // 2. For each subsequent year, find new entries
                    const countryFirstEntry = {};
                    for (const d of tennisData) {
                        if (d.year === baseYear) continue;
                        for (const [country, val] of Object.entries(d.countries)) {
                            if ((val.ever_in_top100 || 0) > 0 &&
                                !baseCountries.has(country) &&
                                !(country in countryFirstEntry)) {
                                countryFirstEntry[country] = d.year;
                            }
                        }
                    }

                    // 3. Prepare data for dot plot with jitter and player info
                    // Group by year to apply jitter
                    const yearToEntries = {};
                    Object.entries(countryFirstEntry).forEach(([country, year]) => {
                        if (!yearToEntries[year]) yearToEntries[year] = [];
                        yearToEntries[year].push(country);
                    });

                    // For each entry, get player info and apply jitter
                    const entries = [];
                    const playerByYearCountry = {};
                    tennisData.forEach(d => {
                        Object.entries(d.countries).forEach(([country, val]) => {
                            playerByYearCountry[`${d.year}_${country}`] = val.top_player || '';
                        });
                    });

                    Object.entries(countryFirstEntry).forEach(([country, year]) => {
                        const name = codeToName[country] || country;
                        const player = playerByYearCountry[`${year}_${country}`] || '';
                        // Jitter: spread countries in same year vertically
                        const siblings = yearToEntries[year];
                        const idx = siblings.indexOf(country);
                        const jitter = (siblings.length > 1) ? (idx - (siblings.length-1)/2) * 0.5 : 0;
                        entries.push({country, year, name, player, jitter});
                    });

                    // Sort by year, then name
                    entries.sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));

                    const yCountries = entries.map(e => e.name + (e.jitter ? ` (jitter)` : ''));
                    const yNumeric = entries.map((e, i) => i + e.jitter); // Use index + jitter for y
                    const xYears = entries.map(e => e.year);
                    const codes = entries.map(e => e.country);
                    const players = entries.map(e => e.player);

                    const trace = {
                        x: xYears,
                        y: yNumeric,
                        mode: 'markers',
                        type: 'scatter',
                        marker: {
                            size: 14,
                            color: '#C62F47',
                            line: {width: 2, color: '#333'}
                        },
                        text: codes,
                        customdata: entries.map(e => [e.name, e.country, e.player]),
                        hovertemplate: '%{customdata[0]} (%{customdata[1]})<br>First entry: %{x}<br>First top 100 player: %{customdata[2]}<extra></extra>'
                    };

                    const layout = {
                        title: 'New Country Entries into Top 100',
                        xaxis: {
                            title: 'Year',
                            tickmode: 'linear',
                            dtick: 5,
                            showgrid: true,
                            gridcolor: '#eee',
                        },
                        yaxis: {
                            title: 'Country',
                            tickvals: yNumeric,
                            ticktext: entries.map(e => e.name),
                            showgrid: false,
                            autorange: 'reversed'
                        },
                        margin: { t: 40, r: 20, b: 50, l: 120 },
                        height: Math.max(1000, entries.length * 15), // Make chart even longer for more countries
                        plot_bgcolor: 'white',
                        paper_bgcolor: 'white',
                        font: {
                            family: 'Montserrat, sans-serif',
                            size: 13,
                            color: '#333'
                        }
                    };

                    Plotly.newPlot(container, [trace], layout, {responsive: true, displayModeBar: false});
                });
        });
});
