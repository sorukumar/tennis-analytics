// Plotly.js Animated Choropleth Map for Tennis Top 100 Evolution

document.addEventListener('DOMContentLoaded', function() {
    const mapContainer = document.getElementById('world-map');
    if (!mapContainer) return;

    // Remove any existing Plotly chart
    mapContainer.querySelectorAll('div.plotly-graph-div').forEach(el => el.remove());

  
    // Major tennis nations for labels
    const MAJOR_TENNIS_NATIONS = ['USA', 'ESP', 'FRA', 'AUS', 'ITA', 'SWE', 'ARG', 'GER', 'RUS'];

    // Corrected centroids for major tennis nations (lon, lat for Natural Earth projection)
    const COUNTRY_CENTROIDS = {
        USA: [-98.58, 45.83],
        ESP: [-3.75, 40.43],
        FRA: [2.35, 48.86],
        AUS: [133.78, -20.27],
        ITA: [12.48, 41.90],
        SWE: [18.64, 60.13],
        ARG: [-65.90, -30.60],
        GER: [10.45, 51.17],
        RUS: [37.62, 60.75]
    };

    // Define a colorscale constant to be used for all choropleth traces and frames
      const colorscale = [
        [0, '#ffffcc'],   // light yellow for low values
        [0.5, '#a1d99b'], // yellow-green for mid values
        [1, '#006837']    // dark green for high values
      ];

    // Load tennis data
    fetch('https://raw.githubusercontent.com/sorukumar/tml-data/main/data/globaltop100evolution/top_tennis_players_timeline.json')
        .then(r => r.json())
        .then(tennisData => {
            const years = tennisData.map(d => d.year);

            // Use the same colorbar config as in frames for the initial trace
            const colorbarConfig = {
                title: 'Players in Top 100',
                thickness: 14,
                len: 0.25, // 50% of plot height
                x: 1.02, // right side
                y: 0.5,
                xanchor: 'left',
                yanchor: 'middle',
                orientation: 'v',
                outlinewidth: 0,
                tickfont: {family: 'Montserrat, sans-serif', size: 10}
            };

            const frames = tennisData.map((yearData, i) => {
                const year = yearData.year;
                const locations = Object.keys(yearData.countries);
                const z = locations.map(code => yearData.countries[code].ever_in_top100);
                const text = locations.map(code => {
                    const d = yearData.countries[code];
                    return `<b>${code}</b><br>Players in Top 100: ${d.ever_in_top100}<br>Players in Top 10: ${d.ever_in_top10}<br>` +
                        (d.top_player ? `Top Player: ${d.top_player}<br>Highest Ranking: #${d.top_rank}` : '');
                });

                return {
                    name: year.toString(),
                    data: [{
                        type: 'choropleth',
                        locationmode: 'ISO-3',
                        locations: locations,
                        z: z,
                        text: text,
                        colorscale: colorscale,
                        zmin: 0,
                        zmax: 50,
                        colorbar: colorbarConfig,
                        hovertemplate: '%{text}<extra></extra>',
                        marker: {line: {color: 'white', width: 0.5}}
                    }]
                };
            });

            const initial = {
                type: 'choropleth',
                locationmode: 'ISO-3',
                locations: Object.keys(tennisData[0].countries),
                z: Object.keys(tennisData[0].countries).map(code => tennisData[0].countries[code].ever_in_top100),
                text: Object.keys(tennisData[0].countries).map(code => {
                    const d = tennisData[0].countries[code];
                    return `<b>${code}</b><br>Players in Top 100: ${d.ever_in_top100}<br>Players in Top 10: ${d.ever_in_top10}<br>` +
                        (d.top_player ? `Top Player: ${d.top_player}<br>Highest Ranking: #${d.top_rank}` : '');
                }),
                colorscale: colorscale,
                zmin: 0,
                zmax: 50,
                colorbar: colorbarConfig,
                hovertemplate: '%{text}<extra></extra>',
                marker: {line: {color: 'white', width: 0.5}}
            };

            const data = [initial];

            // Country labels for major nations
            const labelAnnotations = MAJOR_TENNIS_NATIONS.map(code => {
                const [lon, lat] = COUNTRY_CENTROIDS[code] || [0, 0];
                return {
                    x: lon,
                    y: lat,
                    xref: 'geo',
                    yref: 'geo',
                    text: code,
                    showarrow: false,
                    yanchor: 'bottom',
                    font: {color: '#222', size: 10, family: 'Montserrat, sans-serif', weight: 'bold'},
                    bgcolor: 'rgba(255,255,255,0.7)',
                    bordercolor: '#333',
                    borderpad: 2
                };
            });

            // Layout with controls in top margin, map takes most space
            const layout = {
                margin: {t: 10, r: 10, b: 10, l: 10}, // reduced top margin to move map up
                geo: {
                    projection: {type: 'natural earth'},
                    showland: true,
                    landcolor: '#f7f7f7',
                    showcountries: true,
                    countrycolor: '#aaa',
                    showframe: false,
                    lonaxis: {range: [-180, 180]},
                    lataxis: {range: [-60, 85]},
                    domain: {x: [0, 1], y: [0, 1]}, // maximize map area
                },
                annotations: labelAnnotations,
                font: {family: 'Montserrat, sans-serif', size: 13, color: '#333'},
                updatemenus: [{
                    type: 'buttons',
                    showactive: false,
                    x: 0.01,
                    y: 1.08, // move buttons up
                    xanchor: 'left',
                    yanchor: 'top',
                    direction: 'left',
                    buttons: [
                        {
                            label: '▶ Play',
                            method: 'animate',
                            args: [null, {
                                mode: 'immediate',
                                fromcurrent: true,
                                frame: {duration: 1200, redraw: true},
                                transition: {duration: 400}
                            }]
                        },
                        {
                            label: '⏸ Pause',
                            method: 'animate',
                            args: [[null], {
                                mode: 'immediate',
                                frame: {duration: 0, redraw: false},
                                transition: {duration: 0}
                            }]
                        }
                    ]
                }],
                sliders: [{
                    active: 0,
                    x: 0.3, // move slider right to make space for buttons
                    y: 1.12, // move slider up
                    len: 0.7, // reduced length for compactness
                    thickness: 10,
                    pad: {t: 0, b: 0},
                    currentvalue: {
                        visible: true,
                        prefix: 'Year: ',
                        font: {size: 14, color: '#1a9850', family: 'Montserrat, sans-serif'}
                    },
                    steps: years.map((year, i) => ({
                        label: year.toString(),
                        method: 'animate',
                        args: [[year.toString()], {
                            mode: 'immediate',
                            frame: {duration: 0, redraw: true},
                            transition: {duration: 0}
                        }]
                    }))
                }]
            };

            const config = {
                responsive: true, 
                displayModeBar: false, 
                scrollZoom: false, 
                staticPlot: false, 
                showTips: true, 
                locale: 'en'
            };

            Plotly.newPlot(mapContainer, data, layout, config)
                .then(function() {
                    return Plotly.addFrames(mapContainer, frames);
                })
                .catch(function(err) {
                    console.error('Error creating animation:', err);
                });
        }).catch(function(err) {
            console.error('Error loading data:', err);
            if (mapContainer) {
                mapContainer.innerHTML = '<div class="error-message">Failed to load map data.</div>';
            }
        });
});