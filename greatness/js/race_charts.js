
/**
 * Race to Greatness Visualizations
 * Built with D3.js
 */

// Configuration
const CONFIG = {
    colors: {
        "Novak Djokovic": "#3B82F6", // Blue
        "Roger Federer": "#10B981",  // Green
        "Rafael Nadal": "#F59E0B",   // Orange/Clay
        "Carlos Alcaraz": "#EF4444", // Red
        "Jannik Sinner": "#8B5CF6",  // Purple
        "Bjorn Borg": "#6B7280",     // Gray
        "Pete Sampras": "#111827",   // Black
        "John McEnroe": "#9CA3AF",
        "Ivan Lendl": "#4B5563",
        "Andre Agassi": "#D97706"
    },
    defaultColor: "#CBD5E1",
    highlightOpacity: 1,
    dimmedOpacity: 0.1,
    animationDuration: 10000, // 10 seconds for full playback
    fps: 30
};

// Global State
let STATE = {
    data: null,
    isPlaying: false,
    currentAge: 22.0,
    maxAge: 40.0,
    timer: null,
    tooltip: null
};

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Create tooltip element
        STATE.tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip")
            .style("opacity", 0);

        await loadData();
        initCharts();
        setupControls();
    } catch (e) {
        console.error("Initialization Failed:", e);
    }
});

async function loadData() {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const prodURL = "https://raw.githubusercontent.com/sorukumar/tml-data/main/data/greatness/race_to_greatness.json";
    const localURL = "data/race_to_greatness.json";
    const url = isLocal ? localURL : prodURL;

    console.log(`Loading data from: ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        STATE.data = await response.json();
    } catch (error) {
        console.warn("Primary load failed, trying fallback...");
        const fallbackURL = isLocal ? prodURL : localURL;
        try {
            const response = await fetch(fallbackURL);
            STATE.data = await response.json();
        } catch (e) {
            console.error("All data loads failed");
        }
    }
}

function initCharts() {
    if (!STATE.data || !STATE.data.players) return;

    // Detect max age from data to set slider
    const ages = [];
    Object.values(STATE.data.players).forEach(p => {
        if (p.trajectory.length) ages.push(p.trajectory[p.trajectory.length - 1].age);
    });
    STATE.maxAge = Math.ceil(Math.max(...ages));
    const slider = document.getElementById("age-slider");
    if (slider) slider.max = STATE.maxAge;

    initTrajectoryChart();
    renderLegend();
    initGSChaseChart();
    initBigTitlesChart();
    initSnapshotChart();
}

function setupControls() {
    const playBtn = document.getElementById("play-button");
    const slider = document.getElementById("age-slider");
    const ageDisplay = document.getElementById("age-display");

    if (!slider || !playBtn) return;

    slider.addEventListener("input", (e) => {
        STATE.currentAge = parseFloat(e.target.value);
        ageDisplay.textContent = STATE.currentAge.toFixed(1);
        updateCharts(STATE.currentAge);
        if (STATE.isPlaying) pauseAnimation();
    });

    playBtn.addEventListener("click", () => {
        if (STATE.isPlaying) pauseAnimation();
        else startAnimation();
    });

    function pauseAnimation() {
        STATE.isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i> Play Animation';
        if (STATE.timer) clearInterval(STATE.timer);
    }

    function startAnimation() {
        if (STATE.currentAge >= STATE.maxAge - 0.5) STATE.currentAge = 16.0;
        STATE.isPlaying = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';

        const step = 0.1;
        const interval = 50;

        STATE.timer = setInterval(() => {
            STATE.currentAge += step;
            if (STATE.currentAge >= STATE.maxAge) {
                STATE.currentAge = STATE.maxAge;
                pauseAnimation();
            }
            slider.value = STATE.currentAge;
            ageDisplay.textContent = STATE.currentAge.toFixed(1);
            updateCharts(STATE.currentAge);
        }, interval);
    }
}

function updateCharts(age) {
    updateTrajectoryChart(age);
    updateSnapshotChart(age);
}

// =============================================================================
// CHART 1: TRAJECTORY
// =============================================================================

let trajChart = {};

function initTrajectoryChart() {
    const container = document.getElementById("trajectory-chart");
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 40, right: 100, bottom: 50, left: 70 };

    const svg = d3.select("#trajectory-chart").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([16, STATE.maxAge]).range([0, width - margin.left - margin.right]);
    const y = d3.scaleLinear().domain([0, 1600]).range([height - margin.top - margin.bottom, 0]);

    // Grid lines
    g.append("g").attr("class", "grid")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(10).tickSize(-(height - margin.top - margin.bottom)).tickFormat(""));
    g.append("g").attr("class", "grid")
        .call(d3.axisLeft(y).ticks(10).tickSize(-(width - margin.left - margin.right)).tickFormat(""));

    // Axes
    g.append("g")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(10).tickFormat(d => d + "y"))
        .style("font-size", "12px");

    g.append("g")
        .call(d3.axisLeft(y))
        .style("font-size", "12px");

    // Labels
    g.append("text")
        .attr("x", (width - margin.left - margin.right) / 2)
        .attr("y", height - margin.top - 10)
        .style("text-anchor", "middle")
        .style("font-weight", "600")
        .text("Age (Years)");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -(height - margin.top - margin.bottom) / 2)
        .style("text-anchor", "middle")
        .style("font-weight", "600")
        .text("Cumulative Matches Played");

    const line = d3.line()
        .x(d => x(d.age))
        .y(d => y(d.match_count))
        .curve(d3.curveMonotoneX);

    trajChart = { svg, g, x, y, line, paths: {}, dots: {}, labels: {}, milestones: {} };

    Object.keys(STATE.data.players).forEach(name => {
        const player = STATE.data.players[name];
        const color = CONFIG.colors[name] || CONFIG.defaultColor;

        // Dimmed full path
        g.append("path")
            .datum(player.trajectory)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 1)
            .attr("d", line)
            .attr("opacity", 0.1);

        // Active path
        trajChart.paths[name] = g.append("path")
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", (name === "Carlos Alcaraz" || name === "Jannik Sinner") ? 4 : 2)
            .attr("stroke-linecap", "round")
            .attr("opacity", 0);

        // Milestone group
        trajChart.milestones[name] = g.append("g").attr("class", `milestones-${name.replace(/\s/g, '-')}`);

        player.milestones.forEach(m => {
            trajChart.milestones[name].append("circle")
                .attr("cx", x(m.age))
                .attr("cy", y(m.match_count))
                .attr("r", 4)
                .attr("fill", "#fff")
                .attr("stroke", color)
                .attr("stroke-width", 2)
                .attr("class", "milestone-point")
                .style("opacity", 0)
                .on("mouseover", (event) => {
                    STATE.tooltip.transition().duration(200).style("opacity", .95);
                    STATE.tooltip.html(`
                        <div style="font-weight:bold; color:${color}">${name}</div>
                        <div style="font-size:0.8rem">${m.type}: <strong>${m.name}</strong></div>
                        <div style="font-size:0.75rem; color:#666">Age: ${m.age.toFixed(1)} | Match: ${m.match_count}</div>
                    `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", () => {
                    STATE.tooltip.transition().duration(500).style("opacity", 0);
                });
        });

        // Current Position Dot
        trajChart.dots[name] = g.append("circle")
            .attr("r", 6)
            .attr("fill", color)
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .style("display", "none")
            .style("filter", "drop-shadow(0 2px 3px rgba(0,0,0,0.2))");

        // Label
        trajChart.labels[name] = g.append("text")
            .text(name.split(" ").pop())
            .attr("font-size", "11px")
            .attr("font-weight", "700")
            .attr("fill", color)
            .style("display", "none");
    });

    updateTrajectoryChart(STATE.currentAge);
}

function updateTrajectoryChart(currentAge) {
    if (!trajChart.g) return;

    Object.keys(STATE.data.players).forEach(name => {
        const player = STATE.data.players[name];
        const currentTraj = player.trajectory.filter(d => d.age <= currentAge);

        if (currentTraj.length > 0) {
            const currentPoint = currentTraj[currentTraj.length - 1];

            trajChart.paths[name]
                .datum(currentTraj)
                .attr("d", trajChart.line)
                .attr("opacity", 1);

            trajChart.dots[name]
                .attr("cx", trajChart.x(currentPoint.age))
                .attr("cy", trajChart.y(currentPoint.match_count))
                .style("display", "block");

            trajChart.labels[name]
                .attr("x", trajChart.x(currentPoint.age) + 10)
                .attr("y", trajChart.y(currentPoint.match_count) + 4)
                .style("display", "block");

            // Update milestones visibility correctly
            trajChart.milestones[name].selectAll("circle")
                .each(function (_, i) {
                    const m = player.milestones[i];
                    d3.select(this).style("opacity", m.age <= currentAge ? 1 : 0);
                });

        } else {
            trajChart.paths[name].attr("opacity", 0);
            trajChart.dots[name].style("display", "none");
            trajChart.labels[name].style("display", "none");
            trajChart.milestones[name].selectAll("circle").style("opacity", 0);
        }
    });
}

// =============================================================================
// CHART 2: GS CHASE
// =============================================================================

function initGSChaseChart() {
    const container = document.getElementById("gs-chase-chart");
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 20, right: 80, bottom: 40, left: 40 };

    const svg = d3.select("#gs-chase-chart").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain([16, STATE.maxAge]).range([0, width - margin.left - margin.right]);
    const y = d3.scaleLinear().domain([0, 25]).range([height - margin.top - margin.bottom, 0]);

    g.append("g").attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d => d + "y"));
    g.append("g").call(d3.axisLeft(y).ticks(5));

    const line = d3.line().x(d => x(d.age)).y(d => y(d.gs)).curve(d3.curveStepAfter);

    Object.keys(STATE.data.players).forEach(name => {
        const player = STATE.data.players[name];
        if (!player.trajectory.length) return;
        const color = CONFIG.colors[name] || CONFIG.defaultColor;

        g.append("path")
            .datum(player.trajectory)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", (name === "Carlos Alcaraz" || name === "Jannik Sinner") ? 3 : 1.5)
            .attr("d", line)
            .attr("opacity", 0.6)
            .on("mouseover", function (event) {
                d3.select(this).attr("stroke-width", 4).attr("opacity", 1);
                STATE.tooltip.transition().duration(200).style("opacity", .9);
                STATE.tooltip.html(`<div style="font-weight:bold">${name}</div><div>Slams: ${player.current_stats.gs}</div>`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                d3.select(this).attr("stroke-width", (name === "Carlos Alcaraz" || name === "Jannik Sinner") ? 3 : 1.5).attr("opacity", 0.6);
                STATE.tooltip.transition().duration(500).style("opacity", 0);
            });

        const last = player.trajectory[player.trajectory.length - 1];
        if (last.gs > 0) {
            g.append("text")
                .attr("x", x(last.age) + 5)
                .attr("y", y(last.gs) + 4)
                .text(`${name.split(" ").pop()} (${last.gs})`)
                .attr("font-size", "10px")
                .style("font-weight", "600")
                .attr("fill", color);
        }
    });
}

// =============================================================================
// CHART 3: BIG TITLES
// =============================================================================

function initBigTitlesChart() {
    const container = document.getElementById("big-titles-chart");
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 10, right: 40, bottom: 40, left: 100 };

    const data = Object.keys(STATE.data.players).map(name => {
        const p = STATE.data.players[name];
        const s = p.current_stats;
        // Big Titles = Slams + Masters + ATP Finals
        const bigTitles = (s.gs || 0) + (s.masters || 0) + (s.finals || 0);
        return { name, bigTitles, gs: s.gs, masters: s.masters, finals: s.finals };
    }).sort((a, b) => b.bigTitles - a.bigTitles);

    const svg = d3.select("#big-titles-chart").append("svg")
        .attr("width", "100%").attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(data, d => d.bigTitles) + 5]).range([0, width - margin.left - margin.right]);
    const y = d3.scaleBand().domain(data.map(d => d.name)).range([0, height - margin.top - margin.bottom]).padding(0.2);

    g.append("g").call(d3.axisLeft(y)).style("font-size", "11px");
    g.append("g").attr("transform", `translate(0,${height - margin.top - margin.bottom})`).call(d3.axisBottom(x).ticks(5));

    g.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("y", d => y(d.name))
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.bigTitles))
        .attr("fill", d => CONFIG.colors[d.name] || CONFIG.defaultColor)
        .attr("rx", 3)
        .on("mouseover", (event, d) => {
            STATE.tooltip.transition().duration(200).style("opacity", .9);
            STATE.tooltip.html(`
                <div style="font-weight:bold">${d.name}</div>
                <div>Total Big Titles: <strong>${d.bigTitles}</strong></div>
                <div style="font-size:0.8rem; margin-top:5px">
                    Slams: ${d.gs}<br>
                    Masters: ${d.masters}<br>
                    ATP Finals: ${d.finals || 0}
                </div>
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => STATE.tooltip.transition().duration(500).style("opacity", 0));

    g.selectAll(".label")
        .data(data)
        .enter().append("text")
        .attr("y", d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr("x", d => x(d.bigTitles) + 5)
        .text(d => d.bigTitles)
        .attr("font-size", "11px")
        .style("font-weight", "bold");
}

// =============================================================================
// CHART 4: DOMINANCE SNAPSHOT
// =============================================================================

let snapChart = {};

function initSnapshotChart() {
    const container = document.getElementById("snapshot-chart");
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 10, right: 60, bottom: 40, left: 100 };

    const svg = d3.select("#snapshot-chart").append("svg")
        .attr("width", "100%").attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    snapChart = {
        g, x: d3.scaleLinear().domain([0, 1300]).range([0, width - margin.left - margin.right]),
        y: d3.scaleBand().range([0, height - margin.top - margin.bottom]).padding(0.2),
        width, height, margin
    };

    updateSnapshotChart(STATE.currentAge);
}

function renderLegend() {
    const legendContainer = d3.select("#trajectory-legend");
    if (!legendContainer.node()) return;

    legendContainer.selectAll("*").remove();

    Object.keys(STATE.data.players).forEach(name => {
        const color = CONFIG.colors[name] || CONFIG.defaultColor;
        const item = legendContainer.append("div")
            .attr("class", "legend-item")
            .on("mouseover", () => highlightPlayer(name))
            .on("mouseout", resetHighlight);

        item.append("div")
            .attr("class", "legend-color")
            .style("background-color", color);

        item.append("span").text(name);
    });
}

function highlightPlayer(name) {
    Object.keys(trajChart.paths).forEach(p => {
        trajChart.paths[p].transition().duration(200).attr("opacity", p === name ? 1 : 0.05);
        trajChart.dots[p].transition().duration(200).style("opacity", p === name ? 1 : 0.05);
        trajChart.labels[p].transition().duration(200).style("opacity", p === name ? 1 : 0.05);
    });
}

function resetHighlight() {
    Object.keys(trajChart.paths).forEach(p => {
        trajChart.paths[p].transition().duration(200).attr("opacity", 1);
        trajChart.dots[p].transition().duration(200).style("opacity", 1);
        trajChart.labels[p].transition().duration(200).style("opacity", 1);
    });
}

function updateSnapshotChart(age) {
    if (!snapChart.g) return;
    const { g, x, y, height, margin } = snapChart;

    const data = Object.keys(STATE.data.players).map(name => {
        const p = STATE.data.players[name];
        let stats = { name, wins: 0, gs: 0, titles: 0 };
        for (let i = p.trajectory.length - 1; i >= 0; i--) {
            if (p.trajectory[i].age <= age) {
                stats = { name, wins: p.trajectory[i].wins, gs: p.trajectory[i].gs, titles: p.trajectory[i].titles };
                break;
            }
        }
        return stats;
    }).sort((a, b) => b.wins - a.wins);

    y.domain(data.map(d => d.name));

    const bars = g.selectAll(".bar").data(data, d => d.name);
    const labels = g.selectAll(".label").data(data, d => d.name);
    const axis = g.selectAll(".y-axis").data([null]);

    // Y Axis
    axis.enter().append("g").attr("class", "y-axis").merge(axis)
        .transition().duration(200).call(d3.axisLeft(y));

    // Bars
    bars.enter().append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("rx", 3)
        .merge(bars)
        .transition().duration(200)
        .attr("y", d => y(d.name))
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.wins))
        .attr("fill", d => CONFIG.colors[d.name] || CONFIG.defaultColor);

    bars.exit().remove();

    // Labels
    labels.enter().append("text")
        .attr("class", "label")
        .merge(labels)
        .transition().duration(200)
        .attr("y", d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr("x", d => x(d.wins) + 5)
        .text(d => `${d.wins} Wins | ${d.gs} Slams`)
        .attr("font-size", "10px")
        .style("font-weight", "600");

    labels.exit().remove();
}
