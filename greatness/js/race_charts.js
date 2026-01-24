
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
    maxAge: 40.0,
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

    // Detect max age from data to set slider
    const ages = [];
    Object.values(STATE.data.players).forEach(p => {
        if (p.trajectory.length) ages.push(p.trajectory[p.trajectory.length - 1].age);
    });
    STATE.maxAge = Math.ceil(Math.max(...ages));

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
    if (slider) slider.max = STATE.maxAge;

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
            STATE.currentAge = 16.0;
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
            const startAge = 16.0;
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
    const margin = { top: 40, right: 100, bottom: 50, left: 70 };

    const svg = d3.select("#trajectory-chart").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`);

    createPlayerPatterns(svg, Object.keys(STATE.data.players).filter(name => FILTERED_PLAYERS.includes(name)), "traj");

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([15, STATE.maxAge]).range([0, width - margin.left - margin.right]);
    // Domain for Big Titles (Djokovic has > 70)
    const y = d3.scaleLinear().domain([0, 75]).range([height - margin.top - margin.bottom, 0]);

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
            .attr("stroke-dasharray", CONFIG.benchmarkPlayers.includes(name) ? "4,4" : "none")
            .attr("stroke-linecap", "round")
            .attr("opacity", 0);

        // Milestone group
        trajChart.milestones[name] = g.append("g").attr("class", `milestones-${name.replace(/\s/g, '-')}`);

        player.milestones.forEach(m => {
            trajChart.milestones[name].append("circle")
                .attr("cx", x(m.age))
                .attr("cy", d => {
                    // Find closest trajectory point
                    const match = player.trajectory.reduce((prev, curr) =>
                        Math.abs(curr.age - m.age) < Math.abs(prev.age - m.age) ? curr : prev
                    );
                    return y(match.big_titles || 0);
                })
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
                        <div style="font-size:0.75rem; color:#666">
                            Age: ${m.age.toFixed(1)}<br>
                            Matches: ${m.match_count} (Efficiency Context)
                        </div>
                    `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", () => {
                    STATE.tooltip.transition().duration(500).style("opacity", 0);
                });
        });

        // Current Position Dot (Avatar)
        trajChart.dots[name] = g.append("circle")
            .attr("r", 15)
            .attr("fill", `url(#traj-${name.replace(/\s/g, '-')})`)
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .style("display", "none")
            .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))");

        // Label
        trajChart.labels[name] = g.append("text")
            .text(name.split(" ").pop())
            .attr("font-size", "12px")
            .attr("font-weight", "800")
            .attr("fill", color)
            .style("display", "none");
    });

    // Render full trajectory (static)
    Object.keys(STATE.data.players).filter(name => FILTERED_PLAYERS.includes(name)).forEach(name => {
        const player = STATE.data.players[name];
        const lastPoint = player.trajectory[player.trajectory.length - 1];
        const color = CONFIG.colors[name] || CONFIG.defaultColor;

        trajChart.paths[name]
            .datum(player.trajectory)
            .attr("d", line)
            .attr("opacity", 1);

        const val = (lastPoint.big_titles !== undefined) ? lastPoint.big_titles : ((lastPoint.gs || 0) + (lastPoint.masters || 0) + (lastPoint.finals || 0));

        trajChart.dots[name]
            .attr("cx", x(lastPoint.age))
            .attr("cy", y(val))
            .attr("opacity", 1)
            .style("display", "block");

        trajChart.labels[name]
            .attr("x", x(lastPoint.age) + 18)
            .attr("y", y(val) + 5)
            .attr("opacity", 1)
            .style("display", "block");

        // Show all milestones
        trajChart.milestones[name].selectAll("circle").style("opacity", 1);
    });

    // Add Tooltip Area for the whole SVG to show player stats on hover of the lines
    // Alternatively, rely on the milestone hover which is already there, but let's make it better.
    // Let's add hover interaction to the paths themselves for 'Rich Tooltip'
    Object.keys(STATE.data.players).filter(name => FILTERED_PLAYERS.includes(name)).forEach(name => {
        const player = STATE.data.players[name];
        const color = CONFIG.colors[name] || CONFIG.defaultColor;

        // Add an invisible wider stroke for better hover target
        g.append("path")
            .datum(player.trajectory)
            .attr("fill", "none")
            .attr("stroke", "transparent")
            .attr("stroke-width", 15)
            .attr("d", line)
            .style("cursor", "pointer")
            .on("mouseover", function (event) {
                const stats = player.current_stats;
                const lastPoint = player.trajectory[player.trajectory.length - 1];

                const bigTitles = (lastPoint.big_titles !== undefined) ? lastPoint.big_titles : ((stats.gs || 0) + (stats.masters || 0) + (stats.finals || 0));

                STATE.tooltip.transition().duration(200).style("opacity", .98);
                STATE.tooltip.html(`
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                        <img src="${CONFIG.getImagePath(name)}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${color}">
                        <div>
                            <div style="font-weight:bold; color:${color}; font-size: 1.1rem;">${name}</div>
                            <div style="font-size: 0.75rem; color: #666;">Age ${lastPoint.age.toFixed(1)}</div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 0.85rem;">
                        <div style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">
                            <div style="color: #64748b; font-size: 0.7rem; text-transform: uppercase;">Big Titles</div>
                            <div style="font-weight: 800; color: ${color}; font-size: 1.2rem;">${bigTitles}</div>
                        </div>
                        <div style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">
                            <div style="color: #64748b; font-size: 0.7rem; text-transform: uppercase;">Slams</div>
                            <div style="font-weight: 700;">${stats.gs}</div>
                        </div>
                        <div style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">
                            <div style="color: #64748b; font-size: 0.7rem; text-transform: uppercase;">Masters</div>
                            <div style="font-weight: 700;">${stats.masters}</div>
                        </div>
                        <div style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">
                            <div style="color: #64748b; font-size: 0.7rem; text-transform: uppercase;">Finals</div>
                            <div style="font-weight: 700;">${stats.finals || 0}</div>
                        </div>
                    </div>
                `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");

                // Highlight path
                trajChart.paths[name].attr("stroke-width", (name === "Carlos Alcaraz" || name === "Jannik Sinner") ? 6 : 4);
            })
            .on("mousemove", function (event) {
                STATE.tooltip.style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                STATE.tooltip.transition().duration(500).style("opacity", 0);
                trajChart.paths[name].attr("stroke-width", (name === "Carlos Alcaraz" || name === "Jannik Sinner") ? 4 : 2);
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
    const margin = { top: 20, right: 80, bottom: 40, left: 40 };

    const svg = d3.select("#gs-chase-chart").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`);

    createPlayerPatterns(svg, Object.keys(STATE.data.players), "gs");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    // Use Power Scale to stretch early years (Non-linear)
    const x = d3.scalePow().exponent(0.35).domain([16, STATE.maxAge]).range([0, width - margin.left - margin.right]);
    const y = d3.scaleLinear().domain([0, 25]).range([height - margin.top - margin.bottom, 0]);

    // Custom ticks for non-linear axis
    const tickValues = [16, 18, 20, 22, 24, 26, 30, 35, 40].filter(d => d <= STATE.maxAge);

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
    const margin = { top: 20, right: 40, bottom: 20, left: 120 };

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
        .style("fill", "#cbd5e1")
        .style("opacity", 0.15)
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
        let stat = { name, big_titles: 0, gs: 0, masters: 0, finals: 0 };

        for (let i = player.trajectory.length - 1; i >= 0; i--) {
            if (player.trajectory[i].age <= age) {
                const p = player.trajectory[i];
                const val = (p.big_titles !== undefined) ? p.big_titles : (p.gs + p.masters + p.finals);
                stat = { name, big_titles: val, gs: p.gs, masters: p.masters, finals: p.finals };
                break;
            }
        }
        return stat;
    });

    data.sort((a, b) => b.big_titles - a.big_titles);
    y.domain(data.map(d => d.name));

    // Update Watermark
    if (raceChart.watermark) raceChart.watermark.text(age.toFixed(1));

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
        .attr("width", d => x(d.big_titles))
        .attr("height", y.bandwidth());

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
        .attr("cx", d => x(d.big_titles))
        .attr("cy", d => y(d.name) + y.bandwidth() / 2);

    avatars.exit().remove();

    // --- NAMES ---
    labels.enter().append("text")
        .attr("class", "label")
        .attr("text-anchor", "end")
        .attr("x", -15)
        .attr("y", d => y(d.name) + y.bandwidth() / 2 + 4)
        .style("font-size", "13px")
        .style("font-weight", "800")
        .text(d => d.name.split(" ").pop())
        .merge(labels)
        .transition().duration(animDuration)
        .attr("y", d => y(d.name) + y.bandwidth() / 2 + 4);

    labels.exit().remove();

    // --- VALUES ---
    valueLabels.enter().append("text")
        .attr("class", "val-label")
        .attr("x", d => x(d.big_titles) + avatarRadius + 10)
        .attr("y", d => y(d.name) + y.bandwidth() / 2 + 5)
        .style("font-size", "16px")
        .style("font-weight", "900")
        .attr("fill", d => CONFIG.colors[d.name] || CONFIG.defaultColor)
        .text(0)
        .merge(valueLabels)
        .transition().duration(animDuration).ease(d3.easeLinear)
        .attr("x", d => x(d.big_titles) + avatarRadius + 10)
        .attr("y", d => y(d.name) + y.bandwidth() / 2 + 5)
        .tween("text", function (d) {
            const current = parseInt(this.textContent) || 0;
            const i = d3.interpolateRound(current, d.big_titles);
            return t => this.textContent = i(t) > 0 ? i(t) : "";
        });

    valueLabels.exit().remove();
}
