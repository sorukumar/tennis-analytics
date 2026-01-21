// D3.js Age Distribution Chart for First Grand Slam Wins
document.addEventListener('DOMContentLoaded', function () {
    // Listen for state updates
    window.addEventListener('gsStateUpdate', function (e) {
        createAgeDistributionChart();
    });

    // Add resize listener
    window.addEventListener('resize', debounce(createAgeDistributionChart, 250));
});

function createAgeDistributionChart() {
    const data = window.gsState.filteredData;
    if (!data || data.length === 0) return;

    d3.select("#age-distribution-chart svg").remove();
    const chartContainer = document.getElementById('age-distribution-chart');
    const width = chartContainer.clientWidth - 90;
    const height = (chartContainer.clientHeight || 500) - 120;

    const svg = d3.select("#age-distribution-chart")
        .append("svg")
        .attr("width", width + 90)
        .attr("height", height + 120)
        .append("g")
        .attr("transform", `translate(60,60)`);

    const xScale = d3.scaleLinear().domain([15, 35]).range([0, width]);
    const yScale = d3.scaleLinear().range([height, 0]);

    // Zones
    const zones = [
        { name: "Peak", start: 15, end: 24.5, class: "zone-peak" },
        { name: "Closing", start: 24.5, end: 27.5, class: "zone-closing" },
        { name: "Rare", start: 27.5, end: 35, class: "zone-rare" }
    ];

    svg.selectAll(".zone-bg").data(zones).enter().append("rect")
        .attr("class", d => d.class).attr("x", d => xScale(d.start))
        .attr("y", 0).attr("width", d => xScale(d.end) - xScale(d.start)).attr("height", height);

    // Optimized KDE
    function kernelDensityEstimator(kernel, X) {
        return function (V) {
            return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
        };
    }
    function kernelEpanechnikov(k) {
        return v => Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    }

    const kde = kernelDensityEstimator(kernelEpanechnikov(1.8), xScale.ticks(60));
    const density = kde(data.map(d => d.Age_First_GS));
    yScale.domain([0, d3.max(density, d => d[1]) * 1.1]);

    // Area curve
    const area = d3.area()
        .curve(d3.curveBasis)
        .x(d => xScale(d[0]))
        .y0(height)
        .y1(d => yScale(d[1]));

    svg.append("path")
        .datum(density)
        .attr("class", "kde-area")
        .attr("d", area);

    // Legends - Expanded List
    const keyLegends = [
        "Michael Chang", // Youngest
        "Boris Becker", "Mats Wilander", "Bjorn Borg", // Prodigies
        "Rafael Nadal", "Carlos Alcaraz", // Modern Prodigies
        "Roger Federer", "Novak Djokovic", "Pete Sampras", // Greats
        "Andre Agassi", "Ivan Lendl", // Legends
        "Goran Ivanisevic", "Stan Wawrinka", "Andres Gomez" // Late Bloomers
    ];

    // Add Ken Rosewall if present (Open Era only dataset might miss pre-1968 starts, but let's try)
    if (data.find(d => d.Player_Name.includes("Rosewall"))) keyLegends.push("Ken Rosewall");
    if (data.find(d => d.Player_Name.includes("Ashe"))) keyLegends.push("Arthur Ashe");
    if (data.find(d => d.Player_Name.includes("Sinner"))) keyLegends.push("Jannik Sinner");

    const legendData = data.filter(d => keyLegends.some(k => d.Player_Name.includes(k)));

    // Simulation for "Jiggle" (Collision Avoidance)
    // We want them to stay near their Age (x) and on the curve (y) but not overlap

    const nodes = legendData.map(d => {
        const point = density.find(p => p[0] >= d.Age_First_GS) || [d.Age_First_GS, 0];
        return {
            ...d,
            targetX: xScale(d.Age_First_GS),
            targetY: yScale(point[1]),
            x: xScale(d.Age_First_GS),
            y: yScale(point[1])
        };
    });

    const simulation = d3.forceSimulation(nodes)
        .force("x", d3.forceX(d => d.targetX).strength(1)) // Strong pull to correct Age
        .force("y", d3.forceY(d => d.targetY).strength(0.1)) // Weak pull to curve (allow vertical float)
        .force("collide", d3.forceCollide(8)) // Radius + padding
        .stop();

    // Run simulation to settle
    for (let i = 0; i < 120; ++i) simulation.tick();

    // Draw Points
    const points = svg.selectAll(".player-point")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("class", "player-point")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 5)
        .style("fill", "var(--primary-color)")
        .style("stroke", "white")
        .on("mouseover", (event, d) => {
            window.gsState.setHighlight(d.Player_Name);
        })
        .on("mouseout", () => {
            window.gsState.setHighlight(null);
        });

    // Draw Labels
    const labels = svg.selectAll(".point-label")
        .data(nodes)
        .enter()
        .append("text")
        .attr("x", d => d.x)
        .attr("y", d => d.y - 8)
        .attr("text-anchor", "middle")
        .style("font-size", "9px")
        .style("font-weight", "600")
        .style("pointer-events", "none") // Let hover pass to circle
        .text(d => d.Player_Name.split(" ").pop()); // Last name only

    // Add Y-Axis with Percentage
    const yAxis = d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d3.format(".0%")); // Format as percentage

    svg.append("g")
        .call(yAxis);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale));

    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + 45)
        .text("Age at First Grand Slam Win");
}

function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}