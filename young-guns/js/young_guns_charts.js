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
    },
    chartDefs: [
        { id: "wins-trajectory-chart", metric: "atp_main_wins", label: "ATP Main Draw Wins", isLog: false },
        { id: "top50-trajectory-chart", metric: "top50_wins", label: "Top 50 Wins", isLog: false },
        { id: "top10-trajectory-chart", metric: "top10_wins", label: "Top 10 Wins", isLog: false },
        { id: "rank-trajectory-chart", metric: "rank", label: "ATP Rank", isLog: true }
    ]
};

const STATE = {
    data: null,
    tooltip: null,
    currentAge: 18.5,
    minAge: 16.0,
    maxAge: 22.0,
    mode: "age", // age or present
    selectedPlayers: new Set([
        "Carlos Alcaraz",
        "Jannik Sinner",
        "Joao Fonseca",
        "Jakub Mensik",
        "Learner Tien",
        "Rafael Jodar"
    ])
};

document.addEventListener("DOMContentLoaded", async () => {
    try {
        STATE.tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip")
            .style("opacity", 0);

        await loadData();
        deriveAgeBounds();
        initControls();
        updateUI();
    } catch (e) {
        console.error("Initialization Failed:", e);
    }
});

async function loadData() {
    const localUrl = "../../tml-data/data/greatness/young_guns_race.json";
    const githubUrl = "https://raw.githubusercontent.com/sorukumar/tml-data/main/data/greatness/young_guns_race.json";

    try {
        const response = await fetch(localUrl);
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        STATE.data = await response.json();
        return;
    } catch (_) {
        // Fall back to GitHub raw.
    }

    const remoteResponse = await fetch(githubUrl);
    if (!remoteResponse.ok) throw new Error(`Could not load Young Guns data: ${remoteResponse.status}`);
    STATE.data = await remoteResponse.json();
}

function deriveAgeBounds() {
    const players = Object.values(STATE.data.players || {});
    const ages = players.flatMap(p => (p.trajectory || []).map(d => d.age)).filter(a => Number.isFinite(a));
    if (!ages.length) return;

    const minAge = Math.min(...ages);
    const maxAge = Math.max(...ages);

    STATE.minAge = Math.floor(minAge * 2) / 2;
    STATE.maxAge = Math.ceil(maxAge * 2) / 2;
    STATE.currentAge = Math.min(Math.max(STATE.currentAge, STATE.minAge), STATE.maxAge);
}

function initControls() {
    const slider = document.getElementById("global-age-slider");
    const display = document.getElementById("current-age-display");
    const sliderHeader = document.getElementById("slider-header");

    slider.min = STATE.minAge.toFixed(1);
    slider.max = STATE.maxAge.toFixed(1);
    slider.step = "0.1";
    slider.value = STATE.currentAge.toFixed(1);
    display.innerText = STATE.currentAge.toFixed(1);

    slider.addEventListener("input", (e) => {
        if (STATE.mode === "present") return;
        STATE.currentAge = parseFloat(e.target.value);
        display.innerText = STATE.currentAge.toFixed(1);
        updateUI();
    });

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

    wireCompareBuilder();
    wireTabs();
}

function wireTabs() {
    const tabs = document.querySelectorAll(".chart-tab");
    if (!tabs.length) return;

    tabs.forEach(tab => {
        tab.addEventListener("click", (e) => {
            document.querySelectorAll(".chart-tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".chart-pane").forEach(p => p.classList.remove("active"));

            e.target.classList.add("active");
            const targetId = e.target.dataset.target;
            const pane = document.getElementById(targetId);
            if (pane) pane.classList.add("active");
        });
    });
}

function wireCompareBuilder() {
    const btn = document.getElementById("compare-select-btn");
    const panel = document.getElementById("compare-select-panel");
    const playerOptions = document.getElementById("player-options");
    const status = document.getElementById("compare-status");

    if (!btn || !panel || !playerOptions || !status) return;

    btn.addEventListener("click", () => panel.classList.toggle("open"));

    document.addEventListener("click", (e) => {
        if (!panel.contains(e.target) && e.target !== btn) {
            panel.classList.remove("open");
        }
    });

    const allPlayers = Object.keys(STATE.data.players).sort();

    playerOptions.innerHTML = allPlayers.map(name => `
        <label class="player-option">
            <input type="checkbox" data-player="${name}" ${STATE.selectedPlayers.has(name) ? "checked" : ""}>
            <span>${name}</span>
        </label>
    `).join("");

    playerOptions.querySelectorAll("input[type='checkbox']").forEach(cb => {
        cb.addEventListener("change", (e) => {
            const player = e.target.dataset.player;
            if (e.target.checked) {
                STATE.selectedPlayers.add(player);
            } else {
                STATE.selectedPlayers.delete(player);
            }
            updateUI();
        });
    });

    updateCompareButtonLabel();
    updateCompareStatus();
}

function updateCompareButtonLabel() {
    const btn = document.getElementById("compare-select-btn");
    if (!btn || !STATE.data?.players) return;

    const totalPlayers = Object.keys(STATE.data.players).length;
    const selectedCount = getActivePlayers().length;
    btn.textContent = `Players ${selectedCount}/${totalPlayers} ▾`;
}

function getActivePlayers() {
    const names = [];
    Array.from(STATE.selectedPlayers).forEach(name => {
        if (STATE.data.players[name]) names.push(name);
    });
    return names;
}

function updateCompareStatus() {
    const status = document.getElementById("compare-status");
    if (!status) return;

    const activePlayers = getActivePlayers();
    const activeCount = activePlayers.length;
    const youngerCount = STATE.mode === "age"
        ? activePlayers.filter(name => {
            const player = STATE.data.players[name];
            const latest = player?.trajectory?.[player.trajectory.length - 1];
            return latest && latest.age < STATE.currentAge;
        }).length
        : 0;

    status.classList.remove("alert");
    if (STATE.mode === "age" && youngerCount > 0) {
        status.textContent = `${activeCount} active lines. ${youngerCount} player(s) are younger than ${STATE.currentAge.toFixed(1)}y and are pinned to latest age.`;
        return;
    }

    status.textContent = `${activeCount} active lines.`;
}

function updateUI() {
    renderAllCharts();
    renderBigStageReadiness();
    renderBigStageDepth();
    updateScoutingReports();
    updateCompareButtonLabel();
    updateCompareStatus();
}

function renderAllCharts() {
    const activePlayers = getActivePlayers();
    CONFIG.chartDefs.forEach(def => renderTrajectoryChart(def, activePlayers));
}

function renderTrajectoryChart(def, activePlayers) {
    const container = document.getElementById(def.id);
    if (!container) return;

    container.innerHTML = "";

    const width = 1000;
    const height = 450;
    const margin = { top: 20, right: 100, bottom: 40, left: 60 };

    const svg = d3.select(`#${def.id}`).append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear()
        .domain([STATE.minAge, STATE.maxAge])
        .range([0, innerWidth]);

    const metricValues = activePlayers.flatMap(name => {
        const p = STATE.data.players[name];
        if (!p) return [];
        return p.trajectory.map(d => d[def.metric]).filter(v => Number.isFinite(v));
    });

    let y;
    if (def.isLog) {
        const observedMax = Math.max(1000, ...metricValues.map(v => Math.max(1, v)));
        y = d3.scaleLog().domain([observedMax, 1]).range([innerHeight, 0]).base(10);
    } else {
        const observedMax = Math.max(1, ...metricValues);
        y = d3.scaleLinear().domain([0, observedMax * 1.1]).nice().range([innerHeight, 0]);
    }

    const xAxis = d3.axisBottom(x).ticks(8).tickFormat(d => `${d}y`);
    const yAxis = def.isLog
        ? d3.axisLeft(y)
            .tickValues([1, 10, 50, 100, 500, 1000].filter(v => v <= y.domain()[0]))
            .tickFormat(d3.format("d"))
        : d3.axisLeft(y).ticks(6);

    g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll("text").style("font-size", "14px").style("color", "#64748b");

    g.append("g")
        .call(yAxis)
        .selectAll("text").style("font-size", "14px").style("color", "#64748b");

    g.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(8).tickSize(-innerHeight).tickFormat(""))
        .style("stroke-opacity", 0.1);

    g.append("g")
        .attr("class", "grid")
        .call(yAxis.tickSize(-innerWidth).tickFormat(""))
        .style("stroke-opacity", 0.1);

    const syncLine = g.append("line")
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .style("opacity", STATE.mode === "age" ? 1 : 0)
        .attr("x1", x(STATE.currentAge))
        .attr("x2", x(STATE.currentAge));

    if (svg.select("defs").empty()) svg.append("defs");
    const defs = svg.select("defs");

    const line = d3.line()
        .x(d => x(d.age))
        .y(d => y(def.isLog ? Math.max(1, d[def.metric] || 1) : (d[def.metric] || 0)))
        .curve(d3.curveMonotoneX);

    activePlayers.forEach(name => {
        const player = STATE.data.players[name];
        if (!player || !player.trajectory?.length) return;

        const data = player.trajectory;
        const color = CONFIG.colors[name] || "#cbd5e1";
        const isBenchmark = CONFIG.benchmarks.includes(name);
        const safeName = name.replace(/\s/g, "-");

        if (defs.select(`#clip-${def.id}-${safeName}`).empty()) {
            defs.append("clipPath")
                .attr("id", `clip-${def.id}-${safeName}`)
                .append("circle")
                .attr("r", 14)
                .attr("cx", 0)
                .attr("cy", 0);
        }

        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", isBenchmark ? 2 : 4)
            .attr("stroke-dasharray", isBenchmark ? "4,4" : "none")
            .attr("opacity", isBenchmark ? 0.7 : 1)
            .attr("d", line);

        g.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "transparent")
            .attr("stroke-width", 20)
            .attr("d", line)
            .style("cursor", "crosshair")
            .on("mouseover", () => STATE.tooltip.transition().duration(200).style("opacity", 1))
            .on("mousemove", (event, d) => {
                const pointer = d3.pointer(event);
                const ageAtCursor = x.invert(pointer[0]);
                const point = getPointAtAge(d, ageAtCursor);
                const rawValue = point?.[def.metric] ?? 0;
                const value = rawValue % 1 !== 0 ? parseFloat(rawValue).toFixed(1) : rawValue;

                STATE.tooltip.html(`
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px; border-bottom:1px solid #eee; padding-bottom:5px;">
                        <img src="${CONFIG.getImagePath(name)}" style="width:24px; height:24px; border-radius:50%; border:2px solid ${color};">
                        <strong style="color:${color};">${name}</strong>
                    </div>
                    <div style="font-size:0.85rem;">
                        <div>Age: <span style="font-weight:bold">${point?.age ?? "-"}y</span></div>
                        <div>${def.label}: <span style="font-weight:bold">${value}</span></div>
                    </div>
                `)
                    .style("left", `${event.pageX + 15}px`)
                    .style("top", `${event.pageY - 28}px`);
            })
            .on("mouseout", () => STATE.tooltip.transition().duration(300).style("opacity", 0));

        const markerPoint = STATE.mode === "present"
            ? data[data.length - 1]
            : getPointAtAge(data, STATE.currentAge);
        const latestAge = data[data.length - 1]?.age;
        const isYoungerThanSelectedAge = STATE.mode === "age" && Number.isFinite(latestAge) && latestAge < STATE.currentAge;

        if (!markerPoint) return;

        const markerGroup = g.append("g").attr("class", `marker-${def.id}-${safeName}`);

        const radius = isBenchmark ? 12 : 16;
        markerGroup.append("circle")
            .attr("r", radius)
            .attr("fill", "#fff")
            .attr("stroke", color)
            .attr("stroke-width", 2);

        if (isYoungerThanSelectedAge) {
            markerGroup.append("circle")
                .attr("r", radius + 5)
                .attr("fill", "none")
                .attr("stroke", color)
                .attr("stroke-width", 1.5)
                .attr("stroke-dasharray", "3,3")
                .attr("opacity", 0.8);
        }

        markerGroup.append("image")
            .attr("xlink:href", CONFIG.getImagePath(name))
            .attr("x", -radius + 2)
            .attr("y", -radius + 2)
            .attr("width", (radius - 2) * 2)
            .attr("height", (radius - 2) * 2)
            .attr("clip-path", `url(#clip-${def.id}-${safeName})`)
            .on("error", function () { d3.select(this).style("display", "none"); });

        const flagUrl = `https://flagcdn.com/w40/${CONFIG.countries[name]}.png`;
        markerGroup.append("image")
            .attr("xlink:href", flagUrl)
            .attr("x", radius - 10)
            .attr("y", radius - 10)
            .attr("width", 16)
            .attr("height", 11)
            .attr("preserveAspectRatio", "none")
            .style("outline", "1px solid white")
            .on("error", function () { d3.select(this).style("display", "none"); });

        if (!isBenchmark) {
            markerGroup.append("text")
                .attr("x", 24)
                .attr("y", 5)
                .attr("font-size", "14px")
                .attr("font-weight", "bold")
                .attr("fill", color)
                .text(name.split(" ").pop());
        }

        markerGroup.attr("transform", `translate(${x(markerPoint.age)}, ${y(def.isLog ? Math.max(1, markerPoint[def.metric] || 1) : (markerPoint[def.metric] || 0))})`);
    });

    if (STATE.mode === "age") {
        syncLine
            .style("opacity", 1)
            .attr("x1", x(STATE.currentAge))
            .attr("x2", x(STATE.currentAge));
    }
}

function renderBigStageReadiness() {
    const container = document.getElementById("big-stage-readiness-chart");
    if (!container) return;

    const activePlayers = getActivePlayers();
    container.innerHTML = "";

    if (!activePlayers.length) {
        container.innerHTML = "<p style='padding:24px;color:#64748b;font-weight:700;'>No players selected. Use the selector above.</p>";
        return;
    }

    const alcarazSnapshot = getSnapshot("Carlos Alcaraz");

    const points = activePlayers.map(name => {
        const snapshot = getSnapshot(name);
        const player = STATE.data.players[name];
        const latestAge = player?.trajectory?.[player.trajectory.length - 1]?.age;

        if (!snapshot) return null;

        const total = (snapshot.gs || 0) + (snapshot.masters || 0);
        const benchmarkTotal = alcarazSnapshot
            ? (alcarazSnapshot.gs || 0) + (alcarazSnapshot.masters || 0)
            : 0;

        return {
            name,
            gs: snapshot.gs || 0,
            masters: snapshot.masters || 0,
            total,
            deltaVsAlcaraz: total - benchmarkTotal,
            color: CONFIG.colors[name] || "#94a3b8",
            isBenchmark: CONFIG.benchmarks.includes(name),
            pinnedAtLatestAge: STATE.mode === "age" && Number.isFinite(latestAge) && latestAge < STATE.currentAge
        };
    }).filter(Boolean).sort((a, b) => b.total - a.total);

    if (!points.length) return;

    const width = 1000;
    const height = 420;
    const margin = { top: 25, right: 120, bottom: 45, left: 190 };

    const svg = d3.select(container).append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const y = d3.scaleBand()
        .domain(points.map(d => d.name))
        .range([0, innerHeight])
        .padding(0.24);

    const xMax = Math.max(1, ...points.map(d => d.total));
    const x = d3.scaleLinear().domain([0, xMax + 1]).range([0, innerWidth]);

    g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")))
        .selectAll("text")
        .style("font-size", "13px");

    g.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "13px")
        .style("font-weight", "700");

    g.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(6).tickSize(-innerHeight).tickFormat(""))
        .style("stroke-opacity", 0.1);

    const groups = g.selectAll(".stage-row")
        .data(points)
        .enter()
        .append("g")
        .attr("class", "stage-row")
        .attr("transform", d => `translate(0,${y(d.name)})`);

    groups.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.gs))
        .attr("fill", d => d.color)
        .attr("opacity", d => d.isBenchmark ? 0.6 : 0.9);

    groups.append("rect")
        .attr("x", d => x(d.gs))
        .attr("y", 0)
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.masters) - x(0))
        .attr("fill", d => d3.color(d.color)?.brighter(0.8) || "#cbd5e1")
        .attr("opacity", d => d.isBenchmark ? 0.6 : 0.9);

    // Explicit cue for players pinned at latest age in age-matched mode.
    groups.filter(d => d.pinnedAtLatestAge).append("rect")
        .attr("x", 0)
        .attr("y", -2)
        .attr("height", y.bandwidth() + 4)
        .attr("width", d => x(d.total))
        .attr("fill", "none")
        .attr("stroke", d => d.color)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,3")
        .attr("opacity", 0.85);

    groups.on("mouseover", () => {
        STATE.tooltip.transition().duration(150).style("opacity", 1);
    }).on("mousemove", (event, d) => {
        const deltaLabel = d.deltaVsAlcaraz === 0
            ? "On Alcaraz pace"
            : `${d.deltaVsAlcaraz > 0 ? "+" : ""}${d.deltaVsAlcaraz} vs Alcaraz`;

        STATE.tooltip.html(`
            <div style="font-weight:800; margin-bottom:6px; color:${d.color};">${d.name}</div>
            <div style="font-size:0.84rem; line-height:1.45;">
                <div>GS Titles: <strong>${d.gs}</strong></div>
                <div>Masters Titles: <strong>${d.masters}</strong></div>
                <div>Total Big Titles: <strong>${d.total}</strong></div>
                <div style="margin-top:4px; color:#334155;"><strong>${deltaLabel}</strong></div>
            </div>
        `)
            .style("left", `${event.pageX + 15}px`)
            .style("top", `${event.pageY - 28}px`);
    }).on("mouseout", () => {
        STATE.tooltip.transition().duration(250).style("opacity", 0);
    });

    groups.append("text")
        .attr("x", d => x(d.total) + 8)
        .attr("y", y.bandwidth() / 2 + 4)
        .style("font-size", "12px")
        .style("font-weight", "800")
        .style("fill", "#0f172a")
        .text(d => `${d.total} total`);

    groups.filter(d => !d.isBenchmark).append("text")
        .attr("x", d => x(d.total) + 80)
        .attr("y", y.bandwidth() / 2 + 4)
        .style("font-size", "11px")
        .style("font-weight", "800")
        .style("fill", d => d.deltaVsAlcaraz >= 0 ? "#166534" : "#991b1b")
        .text(d => {
            if (d.deltaVsAlcaraz === 0) return "On pace";
            return `${d.deltaVsAlcaraz > 0 ? "+" : ""}${d.deltaVsAlcaraz} vs Alcaraz`;
        });

    groups.filter(d => d.pinnedAtLatestAge).append("text")
        .attr("x", d => x(d.total) + 8)
        .attr("y", y.bandwidth() - 4)
        .style("font-size", "10px")
        .style("font-weight", "700")
        .style("fill", d => d.color)
        .text("Pinned at latest age");

    const legend = svg.append("g").attr("transform", `translate(${margin.left},${height - 10})`);
    legend.append("rect").attr("x", 0).attr("y", -12).attr("width", 12).attr("height", 12).attr("fill", "#1d4ed8");
    legend.append("text").attr("x", 18).attr("y", -2).style("font-size", "12px").style("font-weight", "700").text("Grand Slam titles");
    legend.append("rect").attr("x", 155).attr("y", -12).attr("width", 12).attr("height", 12).attr("fill", "#60a5fa");
    legend.append("text").attr("x", 173).attr("y", -2).style("font-size", "12px").style("font-weight", "700").text("Masters titles");
}

function renderBigStageDepth() {
    const container = document.getElementById("big-stage-depth-chart");
    if (!container) return;

    const activePlayers = getActivePlayers();
    container.innerHTML = "";

    if (!activePlayers.length) {
        container.innerHTML = "<p style='padding:24px;color:#64748b;font-weight:700;'>No players selected. Use the selector above.</p>";
        return;
    }

    const stages = [
        { key: "big_r4", label: "R4" },
        { key: "big_qf", label: "QF" },
        { key: "big_sf", label: "SF" },
        { key: "big_f", label: "F" }
    ];

    const data = activePlayers.map(name => {
        const snapshot = getSnapshot(name);
        if (!snapshot) return null;

        const hasDirectDepthFields = ["big_r4", "big_qf", "big_sf", "big_f"]
            .some(key => Number.isFinite(snapshot[key]));

        const values = hasDirectDepthFields
            ? [
                { stage: "R4", count: snapshot.big_r4 || 0 },
                { stage: "QF", count: snapshot.big_qf || 0 },
                { stage: "SF", count: snapshot.big_sf || 0 },
                { stage: "F", count: snapshot.big_f || 0 }
            ]
            : [
                { stage: "R4", count: snapshot.top50_wins || 0 },
                { stage: "QF", count: snapshot.top20_wins || 0 },
                { stage: "SF", count: snapshot.top10_wins || 0 },
                { stage: "F", count: (snapshot.gs || 0) + (snapshot.masters || 0) }
            ];

        return {
            name,
            color: CONFIG.colors[name] || "#94a3b8",
            isBenchmark: CONFIG.benchmarks.includes(name),
            usedFallbackDepth: !hasDirectDepthFields,
            values
        };
    }).filter(Boolean);

    if (!data.length) return;

    const width = 1000;
    const height = 420;
    const margin = { top: 30, right: 140, bottom: 50, left: 70 };

    const svg = d3.select(container).append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scalePoint()
        .domain(stages.map(s => s.label))
        .range([0, innerWidth])
        .padding(0.6);

    const yMax = Math.max(1, ...data.flatMap(p => p.values.map(v => v.count)));
    const y = d3.scaleLinear().domain([0, yMax + 1]).range([innerHeight, 0]);

    g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "13px")
        .style("font-weight", "700");

    g.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("d")))
        .selectAll("text")
        .style("font-size", "13px");

    g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(""))
        .style("stroke-opacity", 0.1);

    const line = d3.line()
        .x(d => x(d.stage))
        .y(d => y(d.count))
        .curve(d3.curveMonotoneX);

    const groups = g.selectAll(".depth-line")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "depth-line");

    groups.append("path")
        .attr("fill", "none")
        .attr("stroke", d => d.color)
        .attr("stroke-width", d => d.isBenchmark ? 2 : 3)
        .attr("stroke-dasharray", d => d.isBenchmark ? "4,4" : "none")
        .attr("opacity", d => d.isBenchmark ? 0.75 : 0.95)
        .attr("d", d => line(d.values));

    const usedFallbackForAny = data.some(d => d.usedFallbackDepth);
    if (usedFallbackForAny) {
        svg.append("text")
            .attr("x", margin.left)
            .attr("y", height - 8)
            .style("font-size", "11px")
            .style("font-weight", "600")
            .style("fill", "#64748b")
            .text("Depth fallback active: R4/QF/SF/F approximated from Top50/Top20/Top10 wins and GS+Masters titles.");
    }

    groups.selectAll("circle")
        .data(d => d.values.map(v => ({ ...v, player: d.name, color: d.color, isBenchmark: d.isBenchmark })))
        .enter()
        .append("circle")
        .attr("cx", d => x(d.stage))
        .attr("cy", d => y(d.count))
        .attr("r", d => d.isBenchmark ? 4.5 : 5.5)
        .attr("fill", "#fff")
        .attr("stroke", d => d.color)
        .attr("stroke-width", 2)
        .on("mouseover", () => STATE.tooltip.transition().duration(150).style("opacity", 1))
        .on("mousemove", (event, d) => {
            STATE.tooltip.html(`
                <div style="font-weight:800; margin-bottom:6px; color:${d.color};">${d.player}</div>
                <div style="font-size:0.84rem; line-height:1.45;">
                    <div>Stage: <strong>${d.stage}</strong></div>
                    <div>Career Total in Big Events: <strong>${d.count}</strong></div>
                </div>
            `)
                .style("left", `${event.pageX + 15}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => STATE.tooltip.transition().duration(250).style("opacity", 0));

    groups.append("text")
        .datum(d => ({
            name: d.name,
            color: d.color,
            yVal: d.values[d.values.length - 1].count
        }))
        .attr("x", x("F") + 12)
        .attr("y", d => y(d.yVal) + 4)
        .style("font-size", "11px")
        .style("font-weight", "800")
        .style("fill", d => d.color)
        .text(d => d.name.split(" ").pop());
}

function getPointAtAge(trajectory, age) {
    if (!trajectory?.length) return null;

    const bisect = d3.bisector(d => d.age).left;
    const i = bisect(trajectory, age, 1);
    const d0 = trajectory[Math.max(i - 1, 0)];
    const d1 = trajectory[Math.min(i, trajectory.length - 1)];

    if (!d0) return d1 || null;
    if (!d1) return d0 || null;

    return (age - d0.age > d1.age - age) ? d1 : d0;
}

function getSnapshot(name) {
    const player = STATE.data.players[name];
    if (!player?.trajectory?.length) return null;
    return STATE.mode === "present"
        ? player.trajectory[player.trajectory.length - 1]
        : getPointAtAge(player.trajectory, STATE.currentAge);
}

function updateScoutingReports() {
    const container = document.getElementById("scouting-reports-container");
    if (!container || !STATE.data?.players) return;

    const activePlayers = getActivePlayers();
    if (!activePlayers.length) {
        container.innerHTML = "<p style='color:#64748b;font-weight:700;'>No players selected. Use the selector above.</p>";
        return;
    }

    const alcaraz = STATE.data.players["Carlos Alcaraz"];
    const alcarazReference = alcaraz
        ? (STATE.mode === "present" ? alcaraz.trajectory[alcaraz.trajectory.length - 1] : getPointAtAge(alcaraz.trajectory, STATE.currentAge))
        : null;

    let html = "";

    activePlayers.forEach(name => {
        const player = STATE.data.players[name];
        const color = CONFIG.colors[name] || "#cbd5e1";
        const isBenchmark = CONFIG.benchmarks.includes(name);

        const d = STATE.mode === "present"
            ? player.trajectory[player.trajectory.length - 1]
            : getPointAtAge(player.trajectory, STATE.currentAge);

        if (!d) return;

        const canCompareToAlcaraz = STATE.mode === "age" && alcarazReference;
        const winDiff = canCompareToAlcaraz ? (d.atp_main_wins - alcarazReference.atp_main_wins) : null;

        html += `
            <div class="scouting-card ${isBenchmark ? "benchmark" : ""}">
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
                        <span class="stat-label" title="Win rate in deciding sets: final set in best-of-3 or fifth set in best-of-5.">Clutch Win % (Deciding Set)</span>
                        <span class="stat-value">${d.clutch_win_pct}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Titles</span>
                        <span class="stat-value">${d.titles}</span>
                    </div>
                </div>
                <div class="dna-ribbon" style="display:flex; justify-content:space-between; align-items:flex-end;">
                    <div>
                        <div class="stat-label">Surface Radar</div>
                        <div id="radar-${name.replace(/\s/g, "-")}" style="width: 100px; height: 100px; margin-top: 10px;"></div>
                    </div>
                    ${isBenchmark
                        ? '<div class="comparison-tag" style="background: #f1f5f9; color: #64748b;">BENCHMARK</div>'
                        : (canCompareToAlcaraz
                            ? `<div class="comparison-tag ${winDiff >= 0 ? "ahead" : "behind"}">${winDiff >= 0 ? "+" : ""}${winDiff} Wins vs Alcaraz (Matched)</div>`
                            : '<div class="comparison-tag" style="background: #f1f5f9; color: #64748b;">Present-day snapshot</div>')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    activePlayers.forEach(name => {
        const player = STATE.data.players[name];
        const d = STATE.mode === "present"
            ? player.trajectory[player.trajectory.length - 1]
            : getPointAtAge(player.trajectory, STATE.currentAge);
        if (d) drawRadarChart(`radar-${name.replace(/\s/g, "-")}`, d, CONFIG.colors[name] || "#3b82f6");
    });
}

function drawRadarChart(containerId, d, color) {
    const container = d3.select(`#${containerId}`);
    if (container.empty()) return;
    container.html("");

    const width = 100;
    const height = 100;
    const margin = 15;
    const radius = Math.min(width, height) / 2 - margin;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    const features = ["Hard", "Clay", "Grass"];
    const total = d.wins || 1;
    const data = [
        d.hard_wins / total,
        d.clay_wins / total,
        d.grass_wins / total
    ];

    const rScale = d3.scaleLinear().range([0, radius]).domain([0, 1]);

    [0.5, 1.0].forEach(t => {
        svg.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", rScale(t))
            .style("fill", "none")
            .style("stroke", "#e2e8f0")
            .style("stroke-dasharray", "2,2");
    });

    const angleSlice = (Math.PI * 2) / features.length;

    features.forEach((f, i) => {
        const x = rScale(1.0) * Math.cos(angleSlice * i - Math.PI / 2);
        const y = rScale(1.0) * Math.sin(angleSlice * i - Math.PI / 2);

        svg.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", x)
            .attr("y2", y)
            .style("stroke", "#e2e8f0")
            .style("stroke-width", "1px");

        const labelFactor = 1.35;
        svg.append("text")
            .attr("x", rScale(1) * labelFactor * Math.cos(angleSlice * i - Math.PI / 2))
            .attr("y", rScale(1) * labelFactor * Math.sin(angleSlice * i - Math.PI / 2))
            .text(f)
            .style("text-anchor", "middle")
            .style("alignment-baseline", "middle")
            .style("font-size", "9px")
            .style("fill", "#64748b")
            .style("font-weight", "bold");
    });

    const line = d3.lineRadial()
        .angle((_, i) => i * angleSlice)
        .radius(val => rScale(val))
        .curve(d3.curveLinearClosed);

    svg.append("path")
        .datum(data)
        .attr("d", line)
        .style("fill", color)
        .style("fill-opacity", 0.4)
        .style("stroke", color)
        .style("stroke-width", 2);
}
