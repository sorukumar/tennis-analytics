/**
 * Young Guns Comparison Visualizations
 */

const CONFIG = {
    colors: {
        "Carlos Alcaraz": "#E11D48", 
        "Jannik Sinner": "#F97316",  
        "Joao Fonseca": "#1E40AF",   
        "Jakub Mensik": "#065F46",   
        "Learner Tien": "#CA8A04",   
        "Rafael Jodar": "#8B5CF6"    
    },
    countries: {
        "Carlos Alcaraz": "es",
        "Jannik Sinner": "it",
        "Joao Fonseca": "br",
        "Jakub Mensik": "cz",
        "Learner Tien": "us",
        "Rafael Jodar": "es"
    },
    benchmarks: ["Carlos Alcaraz", "Jannik Sinner"],
    primaryBenchmark: "Carlos Alcaraz",
    getImagePath: (name) => {
        const map = {
            "Carlos Alcaraz": "alcaraz.png",
            "Jannik Sinner": "sinner.png",
            "Joao Fonseca": "fonseca.png",
            "Jakub Mensik": "mensik.png",
            "Learner Tien": "tien.png",
            "Rafael Jodar": "jodar.png"
        };
        return `../assets/players/${map[name] || "generic.png"}`;
    }
};

let STATE = {
    data: null,
    tooltip: null,
    currentAge: 18.5,
    minAge: 16.0,
    maxAge: 21.0,
    mode: "age", // 'age' or 'present'
    charts: []
};

document.addEventListener("DOMContentLoaded", async () => {
    try {
        STATE.tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip")
            .style("opacity", 0);

        await loadData();
        initControls();
        initCharts();
        updateUI();
    } catch (e) {
        console.error("Initialization Failed:", e);
    }
});

async function loadData() {
    const url = "../../tml-data/data/greatness/young_guns_race.json";
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        STATE.data = await response.json();
    } catch (error) {
        const githubUrl = "https://raw.githubusercontent.com/sorukumar/tml-data/main/data/greatness/young_guns_race.json";
        try {
            const response = await fetch(githubUrl);
            STATE.data = await response.json();
        } catch (githubError) {}
    }
}

function initControls() {
    const slider = document.getElementById("global-age-slider");
    const display = document.getElementById("current-age-display");
    const sliderHeader = document.getElementById("slider-header");

    slider.addEventListener("input", (e) => {
        if (STATE.mode === "present") return; // disabled essentially
        STATE.currentAge = parseFloat(e.target.value);
        display.innerText = STATE.currentAge.toFixed(1);
        updateUI();
    });

    // Sub Mode Toggle
    document.querySelectorAll(".mode-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            STATE.mode = e.target.dataset.mode;
            
            if (STATE.mode === "present") {
                slider.disabled = true;
                sliderHeader.style.opacity = "0.4";
            } else {
                slider.disabled = false;
                sliderHeader.style.opacity = "1";
            }
            updateUI();
        });
    });

    // Tab Navigation
    document.querySelectorAll(".chart-tab").forEach(tab => {
        tab.addEventListener("click", (e) => {
            document.querySelectorAll(".chart-tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".chart-pane").forEach(p => p.classList.remove("active"));
            
            e.target.classList.add("active");
            const targetId = e.target.dataset.target;
            document.getElementById(targetId).classList.add("active");
        });
    });
}

function initCharts() {
    if (!STATE.data || !STATE.data.players) return;

    initTrajectoryChart("wins-trajectory-chart", "atp_main_wins", "Cumulative ATP Wins", 50);
    initTrajectoryChart("top50-trajectory-chart", "top50_wins", "Top 50 Opponent Wins", 20);
    initTrajectoryChart("top10-trajectory-chart", "top10_wins", "Top 10 Opponent Wins", 10);
    initTrajectoryChart("rank-trajectory-chart", "rank", "ATP Ranking", 1000, true);
}

function initTrajectoryChart(containerId, metric, yLabel, fixedYMax = null, isLogScale = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Use viewBox for perfect responsiveness
    const width = 1000;
    const height = 450;
    const margin = { top: 20, right: 100, bottom: 40, left: 60 };

    const svg = d3.select(`#${containerId}`).append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([STATE.minAge, STATE.maxAge])
        .range([0, width - margin.left - margin.right]);

    let y;
    if (isLogScale) {
        y = d3.scaleLog().domain([1000, 1]).range([height - margin.top - margin.bottom, 0]).base(10);
    } else {
        y = d3.scaleLinear().domain([0, fixedYMax || 100]).range([height - margin.top - margin.bottom, 0]);
    }

    const xAxis = d3.axisBottom(x).ticks(8).tickFormat(d => d + "y");
    const yAxis = isLogScale 
        ? d3.axisLeft(y).tickValues([1, 10, 50, 100, 500, 1000]).tickFormat(d3.format("d"))
        : d3.axisLeft(y).ticks(6);

    g.append("g").attr("transform", `translate(0,${height - margin.top - margin.bottom})`).call(xAxis)
        .selectAll("text").style("font-size", "14px").style("color", "#64748b");
        
    g.append("g").call(yAxis)
        .selectAll("text").style("font-size", "14px").style("color", "#64748b");

    // Grid lines
    g.append("g").attr("class", "grid")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(8).tickSize(-(height - margin.top - margin.bottom)).tickFormat(""))
        .style("stroke-opacity", 0.1);
        
    g.append("g").attr("class", "grid")
        .call(yAxis.tickSize(-(width - margin.left - margin.right)).tickFormat(""))
        .style("stroke-opacity", 0.1);

    const line = d3.line().x(d => x(d.age)).y(d => y(Math.max(1, d[metric] || 1))).curve(d3.curveMonotoneX);

    const syncLine = g.append("line")
        .attr("class", "sync-line")
        .attr("y1", 0)
        .attr("y2", height - margin.top - margin.bottom)
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");

    if (svg.select("defs").empty()) svg.append("defs");
    const defs = svg.select("defs");

    Object.keys(STATE.data.players).forEach(name => {
        const player = STATE.data.players[name];
        const color = CONFIG.colors[name] || "#cbd5e1";
        const isBenchmark = CONFIG.benchmarks.includes(name);
        const data = player.trajectory.filter(d => d.age <= STATE.maxAge);
        const safeName = name.replace(/\s/g, '-');

        if (defs.select(`#clip-${safeName}`).empty()) {
            defs.append("clipPath").attr("id", `clip-${safeName}`)
                .append("circle").attr("r", 14).attr("cx", 0).attr("cy", 0);
        }

        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", isBenchmark ? 1.5 : 4)
            .attr("stroke-dasharray", isBenchmark ? "4,4" : "none")
            .attr("opacity", isBenchmark ? 0.5 : 1)
            .attr("d", line);

        // Invisible Hover Path
        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "transparent")
            .attr("stroke-width", 20)
            .attr("d", line)
            .style("cursor", "crosshair")
            .on("mouseover", () => STATE.tooltip.transition().duration(200).style("opacity", 1))
            .on("mousemove", (event, d) => {
                const ptr = d3.pointer(event);
                const x0 = x.invert(ptr[0]);
                const bisect = d3.bisector(d => d.age).left;
                const i = bisect(d, x0, 1);
                const d0 = d[i - 1], d1 = d[i];
                let dp = d0;
                if (d1) dp = x0 - d0.age > d1.age - x0 ? d1 : d0;
                
                const val = (dp[metric] % 1 !== 0) ? parseFloat(dp[metric]).toFixed(1) : dp[metric];

                STATE.tooltip.html(`
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px; border-bottom:1px solid #eee; padding-bottom:5px;">
                        <img src="${CONFIG.getImagePath(name)}" style="width:24px; height:24px; border-radius:50%; border:2px solid ${color};">
                        <strong style="color:${color};">${name}</strong>
                    </div>
                    <div style="font-size:0.85rem;">
                        <div>Age: <span style="font-weight:bold">${dp.age}y</span></div>
                        <div>${yLabel}: <span style="font-weight:bold">${val}</span></div>
                    </div>
                `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => STATE.tooltip.transition().duration(500).style("opacity", 0));

        const markerGroup = g.append("g").attr("class", `marker-${safeName}`);

        const radius = isBenchmark ? 12 : 16;
        markerGroup.append("circle")
            .attr("r", radius)
            .attr("fill", "#fff")
            .attr("stroke", color)
            .attr("stroke-width", 2);

        markerGroup.append("image")
            .attr("xlink:href", CONFIG.getImagePath(name))
            .attr("x", -radius + 2).attr("y", -radius + 2)
            .attr("width", (radius - 2) * 2).attr("height", (radius - 2) * 2)
            .attr("clip-path", `url(#clip-${safeName})`)
            .on("error", function() { d3.select(this).style("display", "none"); });

        // Add Country Flag overlapping visually
        const flagUrl = `https://flagcdn.com/w40/${CONFIG.countries[name]}.png`;
        markerGroup.append("image")
            .attr("xlink:href", flagUrl)
            .attr("x", radius - 10)
            .attr("y", radius - 10)
            .attr("width", 16)
            .attr("height", 11)
            .attr("preserveAspectRatio", "none")
            .style("outline", "1px solid white") // nice outline separator
            .on("error", function() { d3.select(this).style("display", "none"); });

        if (!isBenchmark) {
            markerGroup.append("text")
                .attr("x", 24)
                .attr("y", 5)
                .attr("font-size", "14px")
                .attr("font-weight", "bold")
                .attr("fill", color)
                .text(name.split(' ').pop());
        }

        STATE.charts.push({ containerId, name, x, y, metric, marker: markerGroup, syncLine, data });
    });
}

function updateUI() {
    STATE.charts.forEach(c => {
        let targetAge = STATE.currentAge;
        
        if (STATE.mode === "present") {
            const maxTrackedAge = c.data[c.data.length - 1].age;
            targetAge = maxTrackedAge;
        }

        const bisect = d3.bisector(d => d.age).left;
        const idx = bisect(c.data, targetAge);
        const d = c.data[idx] || c.data[c.data.length - 1];

        if (d) {
            // Smooth transitions
            c.marker.transition().duration(400).attr("transform", `translate(${c.x(targetAge)}, ${c.y(Math.max(1, d[c.metric] || 1))})`);
        }

        if (STATE.mode === "present") {
            c.syncLine.style("opacity", 0); // Hide sync line in present mode
        } else {
            c.syncLine.style("opacity", 1).transition().duration(400)
                .attr("x1", c.x(STATE.currentAge)).attr("x2", c.x(STATE.currentAge));
        }
    });

    updateScoutingReports();
}

function updateScoutingReports() {
    const container = document.getElementById("scouting-reports-container");
    if (!container) return;

    const alcaraz = STATE.data.players[CONFIG.primaryBenchmark];
    const bisect = d3.bisector(d => d.age).left;
    
    let aTargetAge = STATE.mode === 'present' ? alcaraz.trajectory[alcaraz.trajectory.length - 1].age : STATE.currentAge;
    const aIdx = bisect(alcaraz.trajectory, aTargetAge);
    const aData = alcaraz.trajectory[aIdx] || alcaraz.trajectory[alcaraz.trajectory.length - 1];

    let html = "";
    Object.keys(STATE.data.players).forEach(name => {
        const player = STATE.data.players[name];
        const color = CONFIG.colors[name] || "#cbd5e1";
        const isBenchmark = CONFIG.benchmarks.includes(name);

        let targetAge = STATE.mode === 'present' ? player.trajectory[player.trajectory.length - 1].age : STATE.currentAge;
        const idx = bisect(player.trajectory, targetAge);
        const d = player.trajectory[idx] || player.trajectory[player.trajectory.length - 1];

        if (!d) return;

        const winDiff = d.atp_main_wins - aData.atp_main_wins;

        html += `
            <div class="scouting-card ${isBenchmark ? 'benchmark' : ''}">
                <div class="card-header">
                    <div style="position:relative;">
                        <img src="${CONFIG.getImagePath(name)}" class="player-img-mini" alt="${name}">
                        <img src="https://flagcdn.com/w20/${CONFIG.countries[name]}.png" style="position:absolute; bottom:-2px; right:-2px; border:2px solid white; border-radius:2px; width:18px;">
                    </div>
                    <div class="player-info">
                        <h4>${name}</h4>
                        <span class="rank-badge">RANK #${d.rank} | Age: ${d.age}y</span>
                    </div>
                </div>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">ATP Wins</span>
                        <span class="stat-value">${d.atp_main_wins}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Top 10 Wins</span>
                        <span class="stat-value">${d.top10_wins || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Clutch Win %</span>
                        <span class="stat-value">${d.clutch_win_pct}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Titles</span>
                        <span class="stat-value">${d.titles}</span>
                    </div>
                </div>
                <div class="dna-ribbon">
                    <div class="stat-label">Surface Specialization</div>
                    <div class="surface-stats">
                        <div class="surface-dot" style="background: #3b82f6; width: ${(d.hard_wins / (d.wins || 1) * 100)}%" title="Hard"></div>
                        <div class="surface-dot" style="background: #ef4444; width: ${(d.clay_wins / (d.wins || 1) * 100)}%" title="Clay"></div>
                        <div class="surface-dot" style="background: #22c55e; width: ${(d.grass_wins / (d.wins || 1) * 100)}%" title="Grass"></div>
                    </div>
                    ${!isBenchmark ? `
                        <div class="comparison-tag ${winDiff >= 0 ? 'ahead' : 'behind'}">
                            ${winDiff >= 0 ? '+' : ''}${winDiff} Wins vs Alcaraz (${STATE.mode === 'present' ? 'Present' : 'Matched'})
                        </div>
                    ` : '<div class="comparison-tag" style="background: #f1f5f9; color: #64748b;">GOLD STANDARD</div>'}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}
