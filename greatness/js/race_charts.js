
/**
 * Race to Greatness Visualizations
 * Built with D3.js
 */

// Configuration
const CONFIG = {
    colors: {
        "Novak Djokovic": "#1E40AF", // Royal Blue
        "Roger Federer": "#065F46",  // Forest Green
        "Rafael Nadal": "#B45309",   // Terracotta/Clay
        "Carlos Alcaraz": "#E11D48", // Rose Red
        "Jannik Sinner": "#F97316",  // Carrot Orange
        "Bjorn Borg": "#CA8A04",     // Vintage Gold (Legendary status)
        "Pete Sampras": "#64748B",   // Slate 500
        "John McEnroe": "#94A3B8",
        "Ivan Lendl": "#94A3B8",
        "Andre Agassi": "#94A3B8"
    },
    defaultColor: "#CBD5E1",
    heroPlayers: ["Carlos Alcaraz", "Jannik Sinner"],
    benchmarkPlayers: ["Novak Djokovic", "Roger Federer", "Rafael Nadal"],
    highlightOpacity: 1,
    dimmedOpacity: 0.1,
    animationDuration: 10000,
    fps: 30,
    getImagePath: (name) => {
        const map = {
            "Novak Djokovic": "djokovic.png",
            "Roger Federer": "federer.png",
            "Rafael Nadal": "nadal.png",
            "Carlos Alcaraz": "alcaraz.png",
            "Jannik Sinner": "sinner.png",
            "Bjorn Borg": "borg.png",
            "Pete Sampras": "sampras.png",
            "John McEnroe": "mcenroe.png",
            "Ivan Lendl": "lendl.png",
            "Andre Agassi": "agassi.png"
        };
        return `../assets/players/${map[name] || name.split(" ").pop().toLowerCase() + ".png"}`;
    }
};

function createPlayerPatterns(svg, players, idPrefix) {
    const defs = svg.append("defs");
    players.forEach(name => {
        const id = `${idPrefix}-${name.replace(/\s/g, '-')}`;
        const pattern = defs.append("pattern")
            .attr("id", id)
            .attr("width", 1)
            .attr("height", 1)
            .attr("patternContentUnits", "objectBoundingBox");

        pattern.append("image")
            .attr("href", CONFIG.getImagePath(name))
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 1)
            .attr("height", 1)
            .attr("preserveAspectRatio", "xMidYMid slice");
    });
}

const FILTERED_PLAYERS = [
    "Novak Djokovic",
    "Roger Federer",
    "Rafael Nadal",
    "Carlos Alcaraz",
    "Jannik Sinner"
];

// Global State
let STATE = {
    data: null,
    isPlaying: false,
    isRecording: false, // For deterministic recording (disables D3 transitions)
    currentAge: 16.0,
    minAge: 16.0,
    maxAge: 40.0,
    raceMetric: 'big_titles', // 'big_titles' or 'gs'
    timer: null,
    tooltip: null,
    storyPoints: [], // Array of ages to stop at (e.g., Alcaraz's age, Sinner's age)
    storyIndex: 0
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
    // Primary source: tml-data repository
    const prodURL = "https://raw.githubusercontent.com/sorukumar/tml-data/main/data/greatness/race_to_greatness.json";

    // For local dev, we might be serving from a common root, or we might need the remote data
    // If you have a local copy in greatness/data, it will still try that first for legacy reasons
    const localPaths = [
        "data/race_to_greatness.json",
        "../../tml-data/data/greatness/race_to_greatness.json"
    ];

    console.log(`Loading data...`);

    // Try local paths first if local
    if (isLocal) {
        for (const path of localPaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    STATE.data = await response.json();
                    console.log(`Loaded from local: ${path}`);
                    return;
                }
            } catch (e) { /* continue */ }
        }
    }

    // Fallback to Production (Github)
    try {
        const response = await fetch(prodURL);
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        STATE.data = await response.json();
        console.log(`Loaded from Production (Github)`);
    } catch (error) {
        console.error("All data loads failed:", error);
    }
}

function initCharts() {
    if (!STATE.data || !STATE.data.players) return;

    // Detect min/max age from data to set slider
    const startAges = [];
    const endAges = [];
    Object.values(STATE.data.players).forEach(p => {
        if (p.trajectory.length) {
            startAges.push(p.trajectory[0].age);
            endAges.push(p.trajectory[p.trajectory.length - 1].age);
        }
    });
    STATE.minAge = 17.0; // Optimized start: Captures first breakthroughs (Borg) without empty years
    STATE.maxAge = Math.ceil(Math.max(...endAges));
    STATE.currentAge = STATE.minAge;

    // Identify individual milestones for hero players
    STATE.storyPoints = Object.keys(STATE.data.players)
        .filter(name => CONFIG.heroPlayers.includes(name))
        .map(name => {
            const traj = STATE.data.players[name].trajectory;
            return {
                name: name.split(" ").pop(), // "Alcaraz" or "Sinner"
                age: traj.length ? traj[traj.length - 1].age : 0
            };
        })
        .filter(p => p.age > 0)
        .sort((a, b) => a.age - b.age);

    const slider = document.getElementById("race-age-slider");
    if (slider) {
        slider.min = STATE.minAge;
        slider.max = STATE.maxAge;
        slider.value = STATE.minAge;
    }
    const ageDisplay = document.getElementById("race-age-display");
    if (ageDisplay) ageDisplay.textContent = STATE.minAge.toFixed(1);

    initTrajectoryChart();
    initGSChaseChart();
    initBigTitlesChart();

    // Set initial state
    updateCharts(STATE.currentAge);
    // Snapshot chart removed
}

function setupControls() {
    const playBtn = document.getElementById("race-play-button");
    const slider = document.getElementById("race-age-slider");
    const ageDisplay = document.getElementById("race-age-display");

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

        // Stop recording if active
        if (typeof ExportEngine !== 'undefined') ExportEngine.stop();

        let label = "Run the Race";
        const currentPoint = STATE.storyPoints[STATE.storyIndex - 1]; // The point we just hit

        if (currentPoint && Math.abs(STATE.currentAge - currentPoint.age) < 0.2) {
            // We just hit a story point
            if (STATE.storyIndex < STATE.storyPoints.length) {
                const nextName = STATE.storyPoints[STATE.storyIndex].name;
                label = `Next: ${nextName}'s Pace`;
            } else {
                label = "The Legends' Path";
            }
        } else if (STATE.currentAge >= STATE.maxAge - 0.1) {
            label = "Restart";
        }

        playBtn.innerHTML = `<i class="fas fa-${label === 'Restart' ? 'redo' : (label.includes('Next') || label === 'The Legends\' Path' ? 'forward' : 'play')}"></i> ${label}`;
        if (STATE.timer) clearInterval(STATE.timer);
    }

    function startAnimation() {
        if (STATE.currentAge >= STATE.maxAge - 0.5) {
            STATE.currentAge = STATE.minAge;
            STATE.storyIndex = 0;
        }

        STATE.isPlaying = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';

        const step = 0.1;
        const interval = 50;

        STATE.timer = setInterval(() => {
            STATE.currentAge += step;

            // Story Punctuation Stop
            const nextPoint = STATE.storyPoints[STATE.storyIndex];
            if (nextPoint && STATE.currentAge >= nextPoint.age) {
                STATE.currentAge = nextPoint.age;
                STATE.storyIndex++;
                pauseAnimation();
            }

            if (STATE.currentAge >= STATE.maxAge) {
                STATE.currentAge = STATE.maxAge;
                pauseAnimation();
            }

            slider.value = STATE.currentAge;
            ageDisplay.textContent = STATE.currentAge.toFixed(1);
            updateCharts(STATE.currentAge);
        }, interval);
    }

    // Record Button
    const recordBtn = document.getElementById("btn-record-race");
    if (recordBtn) {
        recordBtn.addEventListener("click", () => {
            if (typeof ExportEngine === 'undefined') {
                console.error("ExportEngine not loaded");
                return;
            }

            const svgElement = document.querySelector("#big-titles-chart svg");
            if (!svgElement) {
                console.error("SVG element not found");
                return;
            }

            // Animation controller for deterministic recording
            const step = 0.1;
            const startAge = STATE.minAge;
            const endAge = STATE.maxAge;
            const totalFrames = Math.ceil((endAge - startAge) / step);

            const animationController = {
                getDuration: () => totalFrames,

                renderFrame: (frameIndex) => {
                    const age = startAge + (frameIndex * step);
                    STATE.currentAge = Math.min(age, endAge);

                    // Update UI
                    const slider = document.getElementById("race-age-slider");
                    const ageDisplay = document.getElementById("race-age-display");
                    if (slider) slider.value = STATE.currentAge;
                    if (ageDisplay) ageDisplay.textContent = STATE.currentAge.toFixed(1);

                    // Render chart (instant update, no D3 transitions during recording)
                    updateBigTitlesChart(STATE.currentAge);
                },

                reset: () => {
                    STATE.currentAge = startAge;
                    STATE.storyIndex = 0;
                    STATE.isRecording = true; // Enable instant updates
                    updateCharts(STATE.currentAge);
                },

                onComplete: () => {
                    STATE.isRecording = false; // Re-enable transitions
                }
            };

            // Use deterministic recording
            ExportEngine.recordDeterministic(svgElement, animationController, 'race_to_greatness', { fps: 30 })
                .then(() => {
                    if (animationController.onComplete) animationController.onComplete();
                });
        });
    }

    // Metric Toggle logic
    const metricBtns = document.querySelectorAll(".metric-btn");
    metricBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const metric = btn.getAttribute("data-metric");
            if (STATE.raceMetric === metric) return;

            // Update UI
            metricBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Update state
            STATE.raceMetric = metric;

            // Switch domain based on metric
            if (raceChart.x) {
                const maxVal = metric === 'gs' ? 25 : 75;
                raceChart.x.domain([0, maxVal]);
                // Transition the axis
                raceChart.g.select(".x-axis")
                    .transition().duration(500)
                    .call(d3.axisBottom(raceChart.x).ticks(5));
            }

            updateCharts(STATE.currentAge);
        });
    });
}

function updateCharts(age) {
    try {
        updateBigTitlesChart(age); // Bar Race update
    } catch (e) { console.error("Big Titles update error:", e); }
}



// =============================================================================
// CHART 1: TRAJECTORY
// =============================================================================

let trajChart = {};

function initTrajectoryChart() {
    const container = document.getElementById("trajectory-chart");
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const margin = { top: 40, right: 100, bottom: 50, left: 100 };

    const svg = d3.select("#trajectory-chart").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`);

    createPlayerPatterns(svg, Object.keys(STATE.data.players).filter(name => FILTERED_PLAYERS.includes(name)), "traj");

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Piecewise Linear Scale: Gives 75% of space to the "Breakthrough Era" (17-26) where lines overlap most
    const x = d3.scaleLinear()
        .domain([STATE.minAge, 26, STATE.maxAge])
        .range([0, (width - margin.left - margin.right) * 0.75, width - margin.left - margin.right]);

    // Domain for Big Titles (Djokovic has > 70)
    const y = d3.scaleLinear().domain([0, 75]).range([height - margin.top - margin.bottom, 0]);

    // Custom ticks for the split axis
    let tickValues = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 30, 35, 40].filter(d => d >= STATE.minAge && d <= STATE.maxAge);
    if (!tickValues.includes(STATE.minAge)) tickValues.unshift(STATE.minAge);

    // Grid lines
    g.append("g").attr("class", "grid")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).tickValues(tickValues).tickSize(-(height - margin.top - margin.bottom)).tickFormat(""));
    g.append("g").attr("class", "grid")
        .call(d3.axisLeft(y).ticks(10).tickSize(-(width - margin.left - margin.right)).tickFormat(""));

    // Axes
    g.append("g")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).tickValues(tickValues).tickFormat(d => d + "y"))
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
        .text("Cumulative Big Titles (GS + Masters + Finals)");

    const line = d3.line()
        .x(d => x(d.age))
        .y(d => {
            const val = (d.big_titles !== undefined) ? d.big_titles : ((d.gs || 0) + (d.masters || 0) + (d.finals || 0));
            return y(val);
        })
        .curve(d3.curveMonotoneX);

    trajChart = { svg, g, x, y, line, paths: {}, dots: {}, labels: {}, milestones: {} };

    Object.keys(STATE.data.players).filter(name => FILTERED_PLAYERS.includes(name)).forEach(name => {
        const player = STATE.data.players[name];
        const color = CONFIG.colors[name] || CONFIG.defaultColor;

        // Active path
        trajChart.paths[name] = g.append("path")
            .datum(player.trajectory)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", (name === "Carlos Alcaraz" || name === "Jannik Sinner") ? 4 : 2)
            .attr("stroke-dasharray", CONFIG.benchmarkPlayers.includes(name) ? "4,4" : "none")
            .attr("stroke-linecap", "round")
            .attr("opacity", 1)
            .attr("class", `traj-path traj-path-${name.replace(/\s/g, '-')}`)
            .attr("d", line);

        // Milestone markers (Breadcrumbs)
        player.milestones.forEach(m => {
            const isMajor = m.type === "First Grand Slam" || m.type === "World No. 1 Reach";

            // Find the trajectory point at this age to get the Y value
            const trajPoint = player.trajectory.find(p => Math.abs(p.age - m.age) < 0.2) ||
                player.trajectory.reduce((prev, curr) => Math.abs(curr.age - m.age) < Math.abs(prev.age - m.age) ? curr : prev);

            const bigTitlesAtAge = (trajPoint.big_titles !== undefined) ? trajPoint.big_titles : (trajPoint.gs + trajPoint.masters + (trajPoint.finals || 0));

            g.append("circle")
                .attr("cx", x(m.age))
                .attr("cy", y(bigTitlesAtAge))
                .attr("r", isMajor ? 5 : 3)
                .attr("fill", isMajor ? color : "#fff")
                .attr("stroke", color)
                .attr("stroke-width", 1.5)
                .attr("class", `milestone-dot milestone-${name.replace(/\s/g, '-')}`)
                .style("opacity", 0.6) // Made slightly more subtle to avoid clutter
                .style("pointer-events", "none"); // Let the scrub overlay handle interactions
        });
    });

    // Focus Elements for Scrubbing (OUTSIDE loop)
    const focusLine = g.append("line")
        .attr("class", "focus-line")
        .attr("y1", 0)
        .attr("y2", height - margin.top - margin.bottom)
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4")
        .style("opacity", 0);

    const focusPoint = g.append("circle")
        .attr("r", 6)
        .attr("fill", "#fff")
        .attr("stroke-width", 3)
        .style("opacity", 0)
        .style("filter", "drop-shadow(0 0 4px rgba(0,0,0,0.2))");

    // Interaction Overlay
    const bisectAge = d3.bisector(d => d.age).left;

    g.append("rect")
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", "transparent")
        .style("cursor", "crosshair")
        .on("mousemove", function (event) {
            const mouseX = d3.pointer(event)[0];
            const mouseY = d3.pointer(event)[1];
            const ageAtMouse = x.invert(mouseX);

            let closest = { distance: Infinity, player: null, point: null };

            Object.keys(STATE.data.players).filter(name => FILTERED_PLAYERS.includes(name)).forEach(name => {
                const player = STATE.data.players[name];
                const idx = bisectAge(player.trajectory, ageAtMouse);
                const d0 = player.trajectory[idx - 1];
                const d1 = player.trajectory[idx];
                const d = (d0 && d1) ? (ageAtMouse - d0.age > d1.age - ageAtMouse ? d1 : d0) : (d0 || d1);

                if (d) {
                    const py = y((d.big_titles !== undefined) ? d.big_titles : (d.gs + d.masters + (d.finals || 0)));
                    const dist = Math.abs(mouseY - py);
                    if (dist < closest.distance) {
                        closest = { distance: dist, player: name, point: d };
                    }
                }
            });

            if (closest.player && closest.distance < 100) {
                const d = closest.point;
                const name = closest.player;
                const color = CONFIG.colors[name] || CONFIG.defaultColor;

                focusLine.attr("x1", x(d.age)).attr("x2", x(d.age)).style("opacity", 1);
                focusPoint.attr("cx", x(d.age)).attr("cy", y(d.big_titles || 0))
                    .attr("stroke", color).style("opacity", 1);

                g.selectAll(".traj-path").attr("opacity", 0.1).attr("stroke-width", 1);
                g.select(`.traj-path-${name.replace(/\s/g, '-')}`).attr("opacity", 1).attr("stroke-width", 4);

                const playerMilestones = STATE.data.players[name].milestones;
                const milestone = playerMilestones.find(m => Math.abs(m.age - d.age) < 0.2);

                STATE.tooltip.transition().duration(50).style("opacity", .98);
                STATE.tooltip.html(`
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; border-bottom: 2px solid ${color}; padding-bottom: 8px;">
                        <img src="${CONFIG.getImagePath(name)}" style="width: 45px; height: 45px; border-radius: 50%; border: 2px solid ${color}">
                        <div>
                            <div style="font-weight:bold; color:#1a202c; font-size: 1.2rem;">${name}</div>
                            <div style="font-size: 0.8rem; background: ${color}22; color: ${color}; padding: 2px 6px; border-radius: 4px; display: inline-block;">Age ${d.age.toFixed(1)}y</div>
                        </div>
                    </div>
                    ${milestone ? `
                        <div style="background: ${color}11; border: 1px dashed ${color}; padding: 8px; border-radius: 6px; margin-bottom: 10px;">
                            <div style="font-size: 0.7rem; color: ${color}; text-transform: uppercase; font-weight: 800;">Milestone Hit</div>
                            <div style="font-weight: 700; color: #1a202c;">${milestone.name}</div>
                            <div style="font-size: 0.75rem; color: #666;">${milestone.type}</div>
                        </div>
                    ` : ''}
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div style="background: #f8fafc; padding: 6px 10px; border-radius: 6px; border-left: 3px solid ${color}">
                            <div style="color: #64748b; font-size: 0.65rem; text-transform: uppercase;">Big Titles</div>
                            <div style="font-weight: 900; color: #1e293b; font-size: 1.3rem;">${d.big_titles}</div>
                        </div>
                        <div style="background: #f8fafc; padding: 6px 10px; border-radius: 6px;">
                            <div style="color: #64748b; font-size: 0.65rem; text-transform: uppercase;">GS</div>
                            <div style="font-weight: 700; color: #334155;">${d.gs}</div>
                        </div>
                        <div style="background: #f8fafc; padding: 6px 10px; border-radius: 6px;">
                            <div style="color: #64748b; font-size: 0.65rem; text-transform: uppercase;">Masters</div>
                            <div style="font-weight: 700; color: #334155;">${d.masters}</div>
                        </div>
                        <div style="background: #f8fafc; padding: 6px 10px; border-radius: 6px;">
                            <div style="color: #64748b; font-size: 0.65rem; text-transform: uppercase;">Finals</div>
                            <div style="font-weight: 700; color: #334155;">${d.finals || 0}</div>
                        </div>
                    </div>
                `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY + 15) + "px");
            }
        })
        .on("mouseout", function () {
            focusLine.style("opacity", 0);
            focusPoint.style("opacity", 0);
            STATE.tooltip.style("opacity", 0);
            g.selectAll(".traj-path").attr("opacity", 1).attr("stroke-width", d => {
                const n = d && d[0] ? (d[0].player_name || "") : "";
                return (n === "Carlos Alcaraz" || n === "Jannik Sinner") ? 4 : 2;
            });
            Object.keys(trajChart.paths).forEach(name => {
                trajChart.paths[name].attr("opacity", 1).attr("stroke-width", (name === "Carlos Alcaraz" || name === "Jannik Sinner") ? 4 : 2);
            });
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
    const margin = { top: 40, right: 100, bottom: 50, left: 100 };

    const svg = d3.select("#gs-chase-chart").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`);

    createPlayerPatterns(svg, Object.keys(STATE.data.players), "gs");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Piecewise Linear Scale: Gives 75% of space to the "Breakthrough Era" (17-26)
    const x = d3.scaleLinear()
        .domain([STATE.minAge, 26, STATE.maxAge])
        .range([0, (width - margin.left - margin.right) * 0.75, width - margin.left - margin.right]);

    const y = d3.scaleLinear().domain([0, 25]).range([height - margin.top - margin.bottom, 0]);

    // Custom ticks for the split axis
    let tickValues = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 30, 35, 40].filter(d => d >= STATE.minAge && d <= STATE.maxAge);
    if (!tickValues.includes(STATE.minAge)) tickValues.unshift(STATE.minAge);

    g.append("g").attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).tickValues(tickValues).tickFormat(d => d + "y"));
    g.append("g").call(d3.axisLeft(y).ticks(5));

    const line = d3.line().x(d => x(d.age)).y(d => y(d.gs)).curve(d3.curveStepAfter);

    Object.keys(STATE.data.players).forEach(name => {
        const player = STATE.data.players[name];
        if (!player.trajectory.length) return;

        const isHero = CONFIG.heroPlayers.includes(name);
        const isBenchmark = CONFIG.benchmarkPlayers.includes(name);
        const isLegend = name === "Bjorn Borg";
        const isProminent = isHero || isBenchmark || isLegend;
        const color = CONFIG.colors[name] || CONFIG.defaultColor;

        const path = g.append("path")
            .datum(player.trajectory)
            .attr("class", `gs-path gs-path-${name.replace(/\s/g, '-')}`)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", isHero ? 3.5 : (isProminent ? 2 : 1))
            .attr("stroke-dasharray", isBenchmark ? "4,2" : "none")
            .attr("d", line)
            .attr("opacity", isHero ? 1 : (isProminent ? 0.7 : 0.15))
            .style("transition", "opacity 0.3s, stroke-width 0.3s");

        // Interaction logic
        const interactionPath = g.append("path")
            .datum(player.trajectory)
            .attr("fill", "none")
            .attr("stroke", "transparent")
            .attr("stroke-width", 15)
            .attr("d", line)
            .style("cursor", "pointer")
            .on("mouseover", function (event) {
                // Dim all
                g.selectAll(".gs-path").attr("opacity", 0.05);
                g.selectAll(".gs-label").attr("opacity", 0.1);

                // Highlight this one
                path.attr("opacity", 1).attr("stroke-width", isHero ? 4.5 : 3);
                label.attr("opacity", 1).style("font-weight", "800");

                STATE.tooltip.transition().duration(200).style("opacity", .95);
                STATE.tooltip.html(`
                    <div style="font-weight:bold; color:${color}">${name}</div>
                    <div style="font-size:1.1rem; margin-top:4px">Slams: <strong>${player.current_stats.gs}</strong></div>
                    <div style="font-size:0.75rem; color:#666; margin-top:4px">Status: ${isHero ? 'Rising Star' : (isBenchmark ? 'Legend' : 'History')}</div>
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                // Reset opacities
                g.selectAll(".gs-path").each(function () {
                    const d = d3.select(this).datum();
                    const n = d[0].player_name || ""; // Need to ensure player name is accessible or use a class
                });

                // Simpler: just reset based on categories
                Object.keys(STATE.data.players).forEach(n => {
                    const h = CONFIG.heroPlayers.includes(n);
                    const b = CONFIG.benchmarkPlayers.includes(n);
                    const l = n === "Bjorn Borg";
                    const p = h || b || l;
                    const sel = g.select(`.gs-path-${n.replace(/\s/g, '-')}`);
                    sel.attr("opacity", h ? 1 : (p ? 0.7 : 0.15))
                        .attr("stroke-width", h ? 3.5 : (p ? 2 : 1));

                    g.select(`.gs-label-${n.replace(/\s/g, '-')}`)
                        .attr("opacity", p ? 1 : 0);
                });

                STATE.tooltip.transition().duration(500).style("opacity", 0);
            });

        const last = player.trajectory[player.trajectory.length - 1];

        const label = g.append("text")
            .attr("class", `gs-label gs-label-${name.replace(/\s/g, '-')}`)
            .attr("x", x(last.age) + (isProminent ? 25 : 8))
            .attr("y", y(last.gs) + 4)
            .text(`${name.split(" ").pop()} (${last.gs})`)
            .attr("font-size", isHero ? "12px" : "10px")
            .style("font-weight", isHero ? "700" : "500")
            .attr("fill", color)
            .attr("opacity", isProminent ? 1 : 0)
            .style("pointer-events", "none");

        if (isProminent) {
            g.append("circle")
                .attr("cx", x(last.age))
                .attr("cy", y(last.gs))
                .attr("r", 12)
                .attr("fill", `url(#gs-${name.replace(/\s/g, '-')})`)
                .attr("stroke", color)
                .attr("stroke-width", 1.5)
                .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.2))");
        }
    });
}

// =============================================================================
// CHART 3: BIG TITLES
// =============================================================================

// =============================================================================
// CHART 3: DYNAMIC BAR RACE (Previously Big Titles Static)
// =============================================================================

let raceChart = {};

function initBigTitlesChart() {
    const container = document.getElementById("big-titles-chart");
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 40, right: 100, bottom: 50, left: 120 }; // Kept left at 120 for long player names in bars

    const svg = d3.select("#big-titles-chart").append("svg")
        .attr("width", "100%").attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`);

    createPlayerPatterns(svg, Object.keys(STATE.data.players).filter(name => FILTERED_PLAYERS.includes(name)), "race");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Add Age Watermark (UX polish)
    raceChart.watermark = g.append("text")
        .attr("class", "age-watermark")
        .attr("x", width - margin.left - margin.right)
        .attr("y", height - margin.top - margin.bottom - 40)
        .attr("text-anchor", "end")
        .style("font-size", "140px")
        .style("font-weight", "900")
        .style("fill", "#94a3b8") // Slightly darker slate for better visibility
        .style("opacity", 0.25)    // Increased from 0.15
        .style("pointer-events", "none");

    const x = d3.scaleLinear().domain([0, 75]).range([0, width - margin.left - margin.right]);
    const y = d3.scaleBand().range([0, height - margin.top - margin.bottom]).padding(0.2);

    g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(5));

    raceChart = { ...raceChart, svg, g, x, y, width, height, margin };

    // Initial render
    updateBigTitlesChart(STATE.currentAge);
}

function updateBigTitlesChart(age) {
    if (!raceChart.g) return;
    const { g, x, y, height } = raceChart;

    // Get stats at current age
    let data = Object.keys(STATE.data.players).filter(name => FILTERED_PLAYERS.includes(name)).map(name => {
        const player = STATE.data.players[name];
        const lastTrajPoint = player.trajectory[player.trajectory.length - 1];
        const maxRealAge = lastTrajPoint ? lastTrajPoint.age : 0;

        let stat = { name, big_titles: 0, gs: 0, masters: 0, finals: 0, isPastMax: age > maxRealAge + 0.1 };

        for (let i = player.trajectory.length - 1; i >= 0; i--) {
            if (player.trajectory[i].age <= age) {
                const p = player.trajectory[i];
                const val = (p.big_titles !== undefined) ? p.big_titles : (p.gs + p.masters + p.finals);
                stat = { ...stat, big_titles: val, gs: p.gs, masters: p.masters, finals: p.finals, maxRealAge };
                break;
            }
        }
        return stat;
    });

    data.sort((a, d) => (d[STATE.raceMetric] || 0) - (a[STATE.raceMetric] || 0));
    y.domain(data.map(d => d.name));

    // Update Watermark
    if (raceChart.watermark) raceChart.watermark.text(age.toFixed(1) + "y");

    const bars = g.selectAll(".bar").data(data, d => d.name);
    const labels = g.selectAll(".label").data(data, d => d.name);
    const valueLabels = g.selectAll(".val-label").data(data, d => d.name);
    const avatars = g.selectAll(".bar-avatar").data(data, d => d.name);

    const avatarRadius = y.bandwidth() / 2 + 4;
    // Instant updates during recording, smooth transitions during playback
    const animDuration = STATE.isRecording ? 0 : 50;

    // --- BARS ---
    bars.enter().append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("rx", 4)
        .attr("fill", d => CONFIG.colors[d.name] || CONFIG.defaultColor)
        .attr("y", d => y(d.name)) // Place at correct initial rank
        .attr("height", y.bandwidth())
        .attr("width", 0)
        .merge(bars)
        .transition().duration(animDuration).ease(d3.easeLinear)
        .attr("y", d => y(d.name))
        .attr("width", d => x(d[STATE.raceMetric] || 0))
        .attr("height", y.bandwidth())
        .attr("opacity", d => d.isPastMax ? 0.5 : 1); // Spotlight effect: Focus on moving bars

    bars.exit().remove();

    // --- AVATARS ---
    avatars.enter().append("circle")
        .attr("class", "bar-avatar")
        .attr("r", avatarRadius)
        .attr("fill", d => `url(#race-${d.name.replace(/\s/g, '-')})`)
        .attr("stroke", d => CONFIG.colors[d.name] || CONFIG.defaultColor)
        .attr("stroke-width", 2)
        .attr("cx", 0)
        .attr("cy", d => y(d.name) + y.bandwidth() / 2)
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.2))")
        .merge(avatars)
        .transition().duration(animDuration).ease(d3.easeLinear)
        .attr("cx", d => x(d[STATE.raceMetric] || 0))
        .attr("cy", d => y(d.name) + y.bandwidth() / 2)
        .attr("opacity", d => d.isPastMax ? 0.6 : 1);

    avatars.exit().remove();

    // --- NAMES ---
    labels.enter().append("text")
        .attr("class", "label")
        .attr("text-anchor", "end")
        .attr("x", -15)
        .attr("y", d => y(d.name) + y.bandwidth() / 2 + 4)
        .style("font-size", "13px")
        .style("font-weight", "800")
        .text(d => {
            const isHero = CONFIG.heroPlayers.includes(d.name);
            return d.name.split(" ").pop() + (d.isPastMax && isHero ? ` (${d.maxRealAge.toFixed(1)}y)` : "");
        })
        .merge(labels)
        .transition().duration(animDuration)
        .attr("y", d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr("opacity", d => d.isPastMax ? 0.7 : 1);

    labels.exit().remove();

    // --- VALUES ---
    valueLabels.enter().append("text")
        .attr("class", "val-label")
        .attr("x", d => x(d[STATE.raceMetric] || 0) + avatarRadius + 10)
        .attr("y", d => y(d.name) + y.bandwidth() / 2 + 5)
        .style("font-size", "16px")
        .style("font-weight", "900")
        .attr("fill", d => CONFIG.colors[d.name] || CONFIG.defaultColor)
        .text(0)
        .merge(valueLabels)
        .transition().duration(animDuration).ease(d3.easeLinear)
        .attr("x", d => x(d[STATE.raceMetric] || 0) + avatarRadius + 10)
        .attr("y", d => y(d.name) + y.bandwidth() / 2 + 5)
        .tween("text", function (d) {
            const current = parseInt(this.textContent) || 0;
            const i = d3.interpolateRound(current, d[STATE.raceMetric] || 0);
            return t => {
                const val = i(t);
                const isHero = CONFIG.heroPlayers.includes(d.name);
                this.textContent = (val > 0 ? val : "") + (d.isPastMax && isHero ? ` (${d.maxRealAge.toFixed(1)}y)` : "");
            };
        });

    valueLabels.exit().remove();
}
