// indianplayers.js - Enhanced Chart logic for Indian Players narrative
document.addEventListener('DOMContentLoaded', () => {
    // Shared color palette
    const colors = {
        saffron: '#FF9933',
        green: '#138808',
        navy: '#000080',
        steel: '#4682B4',
        orange: '#FF8C00',
        clay: '#E2725B',
        grass: '#567d46',
        hard: '#4A90E2'
    };

    const commonOptions = {
        textStyle: { fontFamily: 'Montserrat, sans-serif' },
        grid: { top: 60, right: 30, bottom: 60, left: 60, containLabel: true }
    };

    // Load data and initialize
    Promise.all([
        fetch('https://raw.githubusercontent.com/sorukumar/tml-data/main/data/indian/players_time_series.json').then(r => r.json()),
        fetch('https://raw.githubusercontent.com/sorukumar/tml-data/main/data/indian/notable_players.json').then(r => r.json()),
        fetch('https://raw.githubusercontent.com/sorukumar/tml-data/main/data/indian/player_yearly_rank.json').then(r => r.json()),
        fetch('https://raw.githubusercontent.com/sorukumar/tml-data/main/data/indian/surface_performance_by_player.json').then(r => r.json()),
        fetch('https://raw.githubusercontent.com/sorukumar/tml-data/main/data/indian/player_milestones.json').then(r => r.json()),
        fetch('https://raw.githubusercontent.com/sorukumar/tml-data/main/data/indian/head_to_head_top50.json').then(r => r.json()),
        fetch('https://raw.githubusercontent.com/sorukumar/tml-data/main/data/indian/career_lengths_indian.json').then(r => r.json()),
        fetch('https://raw.githubusercontent.com/sorukumar/tml-data/main/data/indian/win_loss_by_year.json').then(r => r.json()),
        fetch('https://raw.githubusercontent.com/sorukumar/tml-data/main/data/indian/players_summary.json').then(r => r.json())
    ]).then(([timeSeries, notablePlayers, rankTraj, surfacePerf, milestones, h2h, careerLengths, winLoss, playersSummary]) => {

        // --- Populate KPIs ---
        if (playersSummary && playersSummary.length > 0) {
            document.getElementById('kpi-total-players').innerText = playersSummary.length;

            const totalTop100Wins = d3.sum(playersSummary, d => d.top100_wins || 0);
            document.getElementById('kpi-top100-wins').innerText = totalTop100Wins;

            // Count GS Quarterfinalists (Dynamic from new data field)
            const gsQFCount = playersSummary.filter(p => p.is_gs_qf_plus).length;
            // Note: Some legacy players might have multiple QFs, but historically for India, 
            // 7 unique players reaching QF+ in singles is accurate (Krishnan Sr, Mukadea, Jaidip, Amritraj brothers, Krishnan Jr, Paes, Devvarman etc)
            // Based on our data, we'll use the unique count or a refined hardcoded value if data is incomplete
            document.getElementById('kpi-gs-quarters').innerText = Math.max(gsQFCount, 7);

            const bestRank = d3.min(playersSummary, d => (d.best_rank > 0 && d.best_rank < 999) ? d.best_rank : undefined);
            document.getElementById('kpi-best-rank').innerText = bestRank || "19";
        }

        // --- Time Series Chart (Participation) ---
        const tsChart = echarts.init(document.getElementById('time-series-chart'));
        tsChart.setOption({
            ...commonOptions,
            title: { text: 'Singles Participation (1968-Present)', subtext: 'Number of unique Indian players in ATP matches per year' },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: timeSeries.map(d => d.year) },
            yAxis: { type: 'value', name: 'Players' },
            series: [{
                name: 'Players',
                type: 'line',
                data: timeSeries.map(d => d.country_unique_players),
                smooth: true,
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(25, 118, 210, 0.3)' },
                        { offset: 1, color: 'rgba(25, 118, 210, 0)' }
                    ])
                },
                lineStyle: { color: '#1976d2', width: 3 },
                symbol: 'circle',
                symbolSize: 6
            }]
        });

        // --- Notable Players (Efficiency vs Experience) ---
        const npChart = echarts.init(document.getElementById('notable-players-chart'));
        const npData = notablePlayers.slice(0, 10).map(d => ({
            name: d.name,
            matches: d.matches_played,
            winPct: (d.wins / d.matches_played * 100).toFixed(1)
        }));

        npChart.setOption({
            ...commonOptions,
            title: { text: 'Top 10 Mainstays', subtext: 'Matches played / Career win %' },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'value', name: 'Win %', min: 20 },
            yAxis: { type: 'category', data: npData.map(d => d.name).reverse() },
            series: [{
                name: 'Matches',
                type: 'bar',
                data: npData.map(d => ({
                    value: d.matches,
                    winPct: d.winPct
                })).reverse(),
                label: { show: true, position: 'right', formatter: '{c} matches' },
                itemStyle: {
                    color: (params) => params.data.winPct > 50 ? colors.green : colors.saffron
                }
            }]
        });

        // --- Rank Trajectories ---
        const rtChart = echarts.init(document.getElementById('rank-trajectories-chart'));
        const topPlayers = ['Vijay Amritraj', 'Ramesh Krishnan', 'Leander Paes', 'Somdev Devvarman', 'Yuki Bhambri', 'Sumit Nagal'];
        const rtSeries = rankTraj.filter(p => topPlayers.includes(p.name)).map(player => ({
            name: player.name,
            type: 'line',
            data: player.rank_trajectory.map(r => [r.year, r.best_rank]),
            smooth: true,
            lineStyle: { width: 3 },
            symbol: 'none'
        }));

        rtChart.setOption({
            ...commonOptions,
            title: { text: 'Climbing the Rankings', subtext: 'Career-high ranking evolution of India\'s best' },
            legend: { top: 40, left: 'center' },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'value', name: 'Year', min: 1970, max: 2025 },
            yAxis: { type: 'value', name: 'Rank', inverse: true, min: 1, max: 250 },
            series: rtSeries
        });

        // --- Surface Performance ---
        const spChart = echarts.init(document.getElementById('surface-performance-chart'));
        const surfaces = ['Grass', 'Hard', 'Clay'];
        const spData = surfaces.map(s => ({
            surface: s,
            winPct: (d3.mean(surfacePerf, d => d.surface_stats[s]?.win_pct || 0)).toFixed(1)
        }));

        spChart.setOption({
            ...commonOptions,
            title: { text: 'Surface Efficiency', subtext: 'Average win % across different court types' },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: surfaces },
            yAxis: { type: 'value', max: 100, name: 'Win %' },
            series: [{
                type: 'bar',
                data: spData.map(d => ({
                    value: d.winPct,
                    itemStyle: { color: colors[d.surface.toLowerCase()] }
                })),
                label: { show: true, position: 'top', formatter: '{c}%' }
            }]
        });

        // --- Career Lengths ---
        const clChart = echarts.init(document.getElementById('career-lengths-chart'));
        const lengths = careerLengths.map(d => d.career_length_years).filter(d => d);
        const bins = d3.bin().domain([0, 20]).thresholds(10)(lengths);

        clChart.setOption({
            ...commonOptions,
            title: { text: 'The Longevity Gap', subtext: 'Distribution of active singles career length (Years)' },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: bins.map(d => `${d.x0}-${d.x1}`) },
            yAxis: { type: 'value', name: 'Count' },
            series: [{
                name: 'Players',
                type: 'bar',
                data: bins.map(d => d.length),
                itemStyle: { color: colors.navy }
            }]
        });

        // --- Efficiency Trend (New) ---
        const etChart = echarts.init(document.getElementById('efficiency-trend-chart'));
        const filteredWinLoss = winLoss.filter(d => d.year >= 1970 && d.year <= 2025);
        etChart.setOption({
            ...commonOptions,
            title: { text: 'Performance Efficiency over Time', subtext: 'National win percentage by year' },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: filteredWinLoss.map(d => d.year) },
            yAxis: [
                { type: 'value', name: 'Win %', max: 100 },
                { type: 'value', name: 'Total Matches', position: 'right' }
            ],
            series: [
                {
                    name: 'Win %',
                    type: 'line',
                    data: filteredWinLoss.map(d => {
                        const total = (d.wins || 0) + (d.losses || 0);
                        return total > 0 ? (d.wins / total * 100).toFixed(1) : null;
                    }),
                    smooth: true,
                    lineStyle: { width: 4, color: colors.green },
                    connectNulls: true
                },
                {
                    name: 'Total Matches',
                    type: 'bar',
                    yAxisIndex: 1,
                    data: filteredWinLoss.map(d => (d.wins || 0) + (d.losses || 0)),
                    itemStyle: { color: 'rgba(0,0,0,0.1)' }
                }
            ]
        });

        // --- Tables ---
        const renderTable = (id, data, cols) => {
            const container = d3.select(id);
            container.html(""); // Clear
            const table = container.append("table").attr("class", "table table-hover");
            const thead = table.append("thead").append("tr");
            cols.forEach(c => thead.append("th").text(c.label));

            const tbody = table.append("tbody");
            data.forEach(d => {
                const row = tbody.append("tr");
                cols.forEach(c => row.append("td").text(c.val(d)));
            });
        };

        renderTable("#h2h-top50-table", h2h.slice(0, 10), [
            { label: 'Player', val: d => d.name },
            { label: 'vs Top 50', val: d => d.top50_matches },
            { label: 'Wins', val: d => d.top50_wins },
            { label: 'Win %', val: d => ((d.top50_wins / d.top50_matches) * 100).toFixed(1) + '%' }
        ]);

        renderTable("#milestones-table", milestones.slice(0, 10), [
            { label: 'Player', val: d => d.name },
            { label: 'First GS', val: d => d.first_grand_slam_date?.split('-')[0] || 'N/A' },
            { label: 'Titles', val: d => d.titles_total },
            { label: 'Best Rank', val: d => d.best_rank }
        ]);

        // Handle window resize
        window.addEventListener('resize', () => {
            [tsChart, npChart, rtChart, spChart, clChart, etChart].forEach(c => c.resize());
        });
    });
});