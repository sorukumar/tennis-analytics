// D3.js Bubble Chart for Grand Slam Breakthrough Comparison (Scrollytelling Version)
class BreakthroughChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.svg = null;
        this.data = [];
        this.width = 0;
        this.height = 0;
        this.margin = { top: 50, right: 100, bottom: 70, left: 60 };
        this.xScale = null;
        this.yScale = null;
        this.sizeScale = null;
        this.colorScale = null;
        this.currentStep = 1;

        // Initial setup
        this.init();

        // Bind resize
        window.addEventListener('resize', () => this.resize());

        // Force Simulation for "Jiggle"
        this.simulation = d3.forceSimulation()
            .force("x", d3.forceX().strength(0.2))
            .force("y", d3.forceY().strength(0.2))
            .force("collide", d3.forceCollide().radius(d => d.r + 2))
            .stop();
    }

    init() {
        if (!this.container) return;

        // Remove existing
        d3.select(`#${this.containerId} svg`).remove();

        this.width = this.container.clientWidth - this.margin.left - this.margin.right;
        // Subtract title height (~40px) to keep everything inside the white card
        this.height = (this.container.clientHeight || 600) - this.margin.top - this.margin.bottom - 40;

        this.svg = d3.select(`#${this.containerId}`)
            .append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Initialize Scales
        this.xScale = d3.scaleLinear().range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height, 0]);
        this.sizeScale = d3.scaleSqrt().domain([1, 24]).range([5, 25]); // 24 is roughly max titles
        this.colorScale = d3.scaleThreshold()
            .domain([23, 27])
            .range(["var(--primary-color)", "#f9c74f", "#e63946"]); // Updated colors

        // Add Axes groups
        this.svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${this.height})`);
        this.svg.append("g").attr("class", "y-axis");

        // Add Axis Labels
        this.svg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("x", this.width / 2)
            .attr("y", this.height + 40)
            .text("Age at First Grand Slam Win");

        this.svg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -45)
            .attr("x", -this.height / 2)
            .text("Matches Played Before First GS");

        // Tooltip ref
        this.tooltip = d3.select("#shared-tooltip");
    }

    updateData(data) {
        this.data = data;
        this.render();
    }

    render() {
        if (!this.data || this.data.length === 0) return;

        // Default Domains
        this.xScale.domain([16, 31]); // Focus on relevant age range initially
        this.yScale.domain([0, 900]);

        // Draw Axes
        this.svg.select(".x-axis").call(d3.axisBottom(this.xScale));
        this.svg.select(".y-axis").call(d3.axisLeft(this.yScale));

        // Draw Blobs/Backgrounds for Context (Optional, can add later)

        // Bind Data
        const bubbles = this.svg.selectAll(".bubble")
            .data(this.data, d => d.Player_Name);

        bubbles.enter()
            .append("circle")
            .attr("class", "bubble")
            .attr("cx", d => this.xScale(d.Age_First_GS))
            .attr("cy", d => this.yScale(d.Matches_Before_First_GS))
            .attr("r", d => 6) // Start uniform
            .style("fill", d => this.colorScale(d.Age_First_GS))
            .on("mouseover", (event, d) => this.showTooltip(event, d))
            .on("mouseout", () => this.hideTooltip());

        bubbles.exit().remove();

        // Labels
        this.renderLabels();

        // Trigger specific view for current step
        this.updateStep(this.currentStep);
    }

    renderLabels() {
        this.svg.selectAll(".player-label").remove();

        // We only show labels for significant players to avoid clutter
        const famousPlayers = ["Roger Federer", "Rafael Nadal", "Novak Djokovic", "Stan Wawrinka", "Goran Ivanisevic", "Boris Becker", "Carlos Alcaraz", "Jannik Sinner"];

        const labels = this.svg.selectAll(".player-label")
            .data(this.data.filter(d => famousPlayers.includes(d.Player_Name) || d.Total_GS_Titles >= 3));

        labels.enter()
            .append("text")
            .attr("class", "player-label")
            .attr("x", d => this.xScale(d.Age_First_GS))
            .attr("y", d => this.yScale(d.Matches_Before_First_GS) - 15)
            .text(d => d.Player_Name.split(" ").pop()) // Last name only for brevity
            .attr("opacity", 0); // Start hidden
    }

    updateStep(step) {
        if (!this.data.length) return;
        this.currentStep = step;

        const t = this.svg.transition().duration(1000).ease(d3.easeCubicOut);

        let targetXDomain = [15, 35]; // FIXED range for consistency
        let targetYDomain = [0, 1000];
        let highlightCondition = d => true;
        let sizingFunc = d => 6;
        let opacityFunc = d => 0.2; // Default dimmed
        let labelFilter = d => false;

        switch (step) {
            case 1: // Prodigies (<23, <200)
                // targetXDomain = [16, 24]; // REMOVED to keep axis stable
                targetYDomain = [0, 250];
                highlightCondition = d => d.Age_First_GS < 23 && d.Matches_Before_First_GS < 200;
                opacityFunc = d => highlightCondition(d) ? 0.9 : 0.1;
                labelFilter = d => highlightCondition(d) && (d.Total_GS_Titles > 2 || ["Wilander", "Becker", "Chang", "Nadal"].some(n => d.Player_Name.includes(n)));
                break;

            case 2: // The Norm (23-26, < 400 matches roughly)
                // targetXDomain = [16, 31]; // REMOVED
                targetYDomain = [0, 600]; // Zoom vertically a bit
                highlightCondition = d => d.Age_First_GS >= 20 && d.Age_First_GS <= 26 && d.Matches_Before_First_GS < 400;
                opacityFunc = d => highlightCondition(d) ? 0.9 : 0.2;
                labelFilter = d => ["Federer", "Djokovic", "Sampras"].some(n => d.Player_Name.includes(n));
                break;

            case 3: // Grinders (>400 matches or Age > 26)
                // targetXDomain = [16, 31]; // REMOVED
                targetYDomain = [300, 1000]; // Focus on top
                highlightCondition = d => d.Matches_Before_First_GS > 400 || d.Age_First_GS > 27;
                opacityFunc = d => highlightCondition(d) ? 0.9 : 0.1;
                labelFilter = d => ["Wawrinka", "Ivanisevic", "Gomez", "Murray"].some(n => d.Player_Name.includes(n));
                break;

            case 4: // Legends (Diff sizes)
                // targetXDomain = [16, 32]; // REMOVED
                targetYDomain = [0, 1000];
                highlightCondition = d => true; // All visible
                sizingFunc = d => this.sizeScale(d.Total_GS_Titles);
                opacityFunc = d => 0.8;
                labelFilter = d => d.Total_GS_Titles >= 3;
                break;

            case 5: // Explore (Full interactive)
                // targetXDomain = [15, 35]; // Already default
                targetYDomain = [0, 1200];
                highlightCondition = d => true;
                sizingFunc = d => this.sizeScale(d.Total_GS_Titles);
                opacityFunc = d => 0.8;
                labelFilter = d => d.Total_GS_Titles >= 3;

                // Show controls
                document.getElementById('sticky-controls').style.opacity = 1;
                document.getElementById('sticky-controls').style.pointerEvents = 'all';
                break;
        }

        // Hide controls if not step 5
        if (step !== 5) {
            document.getElementById('sticky-controls').style.opacity = 0;
            document.getElementById('sticky-controls').style.pointerEvents = 'none';
        }

        // Apply Domains
        this.xScale.domain(targetXDomain);
        this.yScale.domain(targetYDomain);

        this.svg.select(".x-axis").transition(t).call(d3.axisBottom(this.xScale));
        this.svg.select(".y-axis").transition(t).call(d3.axisLeft(this.yScale));

        // 1. Prepare data for simulation
        const nodes = this.data.map(d => {
            const r = sizingFunc(d);
            return {
                ...d,
                r: r,
                x: this.xScale(d.Age_First_GS),
                y: this.yScale(d.Matches_Before_First_GS),
                targetX: this.xScale(d.Age_First_GS),
                targetY: this.yScale(d.Matches_Before_First_GS)
            };
        });

        // 2. Run simulation to resolve overlaps
        this.simulation.nodes(nodes);
        this.simulation.force("x").x(d => d.targetX);
        this.simulation.force("y").y(d => d.targetY);
        this.simulation.force("collide").radius(d => d.r + 2);

        for (let i = 0; i < 120; ++i) this.simulation.tick();

        // 3. Move Bubbles to settled positions
        this.svg.selectAll(".bubble")
            .data(nodes, d => d.Player_Name)
            .transition(t)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", d => d.r)
            .style("opacity", opacityFunc)
            .style("fill", d => this.colorScale(d.Age_First_GS));

        // 4. Move Labels based on settled bubble positions
        const labels = this.svg.selectAll(".player-label")
            .data(nodes, d => d.Player_Name);

        labels
            .transition(t)
            .attr("x", d => d.x)
            .attr("y", d => d.y - d.r - 5)
            .style("opacity", d => labelFilter(d) ? 1 : 0);
    }

    showTooltip(event, d) {
        if (this.currentStep !== 5 && this.currentStep !== 4) return; // Only allow tooltip in later steps? Or maybe always good

        this.tooltip.html(`
            <strong>${d.Player_Name}</strong><br/>
            <span style="font-size:0.8rem; color:#666">Turned Pro: ${d.Year_Turned_Pro}</span><br>
            <div style="margin-top:5px; border-top:1px solid #eee; padding-top:5px;">
                Age: <strong>${d.Age_First_GS}</strong><br/>
                Matches: <strong>${d.Matches_Before_First_GS}</strong><br/>
                Titles: <strong>${d.Total_GS_Titles}</strong>
            </div>
        `)
            .style("opacity", 1)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px");

        d3.select(event.target).style("stroke", "#333").style("stroke-width", 2);
    }

    hideTooltip() {
        this.tooltip.style("opacity", 0);
        this.svg.selectAll(".bubble").style("stroke", "white").style("stroke-width", 1);
    }

    resize() {
        this.init();
        this.render();
    }
}

// Initialization and State Wiring
document.addEventListener('DOMContentLoaded', function () {
    const chart = new BreakthroughChart("bubble-chart");

    // Listen for data
    window.addEventListener('gsStateUpdate', function (e) {
        chart.updateData(window.gsState.filteredData);
    });

    // Initialize Scrolly
    // We assume scrolly.js is loaded
    if (typeof Scrolly !== 'undefined') {
        new Scrolly('#scrolly', '.step', (index) => {
            chart.updateStep(index);
        });
    }

    // Wire up search and filters in the sticky control panel
    // These events are usually handled by gs_common.js, which updates window.gsState
    // We just need to make sure the UI elements in the sticky panel trigger those changes.
    // The IDs in the new HTML (player-search, etc) match the old ones, so gs_common.js *might* just work
    // IF it binds to IDs. Let's verify gs_common.js behavior effectively.
    // gs_common.js typically binds on DOMContentLoaded. Since we replaced the HTML, 
    // the event listeners in gs_common.js likely attached to the *old* elements if it ran before this replacements (unlikely, as this is static HTML replacement).
    // Actually, gs_common.js is already imported in index.html.
});