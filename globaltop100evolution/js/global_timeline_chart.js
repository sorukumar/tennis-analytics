// Plotly.js Multi-Line Chart for Global Timeline (Countries Diversity)
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('global-timeline-chart');
    if (!container) return;

    // Remove any existing Plotly chart
    container.querySelectorAll('div.plotly-graph-div').forEach(el => el.remove());

    // Load data
    fetch('https://raw.githubusercontent.com/sorukumar/tml-data/main/data/globaltop100evolution/global_timeline_dataset.json')
        .then(response => response.json())
        .then(data => {
            const years = data.map(d => d.year);
            const top100 = data.map(d => d.num_countries_top100);
            const top10 = data.map(d => d.num_countries_top10);
            const withPlayers = data.map(d => d.num_countries_with_players);

            const traces = [
                {
                    x: years,
                    y: top100,
                    mode: 'lines+markers',
                    name: 'Top 100 Nations',
                    line: { color: '#4575b4', width: 3 },
                    marker: { color: '#4575b4', size: 6 },
                    hovertemplate: 'Top 100 Nations: %{y}<extra></extra>'
                },
                {
                    x: years,
                    y: top10,
                    mode: 'lines+markers',
                    name: 'Top 10 Nations',
                    line: { color: '#e4572e', width: 3, dash: 'dot' },
                    marker: { color: '#e4572e', size: 6 },
                    hovertemplate: 'Top 10 Nations: %{y}<extra></extra>'
                },
                {
                    x: years,
                    y: withPlayers,
                    mode: 'lines+markers',
                    name: 'Any ATP Nation',
                    line: { color: '#1a9850', width: 3, dash: 'dash' },
                    marker: { color: '#1a9850', size: 6 },
                    hovertemplate: 'Any ATP Nation: %{y}<extra></extra>'
                }
            ];

            const layout = {
                autosize: true,
                width: null,
                margin: { t: 40, r: 20, b: 50, l: 60 },
                height: 360,
                plot_bgcolor: 'white',
                paper_bgcolor: 'white',
                title: '',
                xaxis: {
                    title: 'Year',
                    tickmode: 'linear',
                    dtick: 5,
                    showgrid: true,
                    gridcolor: '#eee',
                    zeroline: false,
                },
                yaxis: {
                    title: 'Number of Countries',
                    showgrid: true,
                    gridcolor: '#eee',
                    zeroline: false,
                },
                legend: {
                    orientation: 'h',
                    x: 0.5,
                    xanchor: 'center',
                    y: 1.12,
                    font: { size: 13 }
                },
                hovermode: 'x unified',
                font: {
                    family: 'Montserrat, sans-serif',
                    size: 13,
                    color: '#333'
                }
            };

            Plotly.newPlot(container, traces, layout, {responsive: true, displayModeBar: false});
        });
});
