import re

file_path = '/Users/saurabhkumar/Desktop/Work/github/tennis-analytics/young-guns/js/young_guns_charts.js'
with open(file_path, 'r') as f:
    js = f.read()

# Replace the HTML block inside updateScoutingReports
old_html = """                <div class="dna-ribbon">
                    <div class="stat-label">Surface Specialization</div>
                    <div class="surface-stats">
                        <div class="surface-dot" style="background: #3b82f6; width: ${(d.hard_wins / (d.wins || 1) * 100)}%" title="Hard"></div>
                        <div class="surface-dot" style="background: #ef4444; width: ${(d.clay_wins / (d.wins || 1) * 100)}%" title="Clay"></div>
                        <div class="surface-dot" style="background: #22c55e; width: ${(d.grass_wins / (d.wins || 1) * 100)}%" title="Grass"></div>
                    </div>"""

new_html = """                <div class="dna-ribbon" style="display:flex; justify-content:space-between; align-items:flex-end;">
                    <div>
                        <div class="stat-label">Surface Radar</div>
                        <div id="radar-${name.replace(/\s/g, '-')}" style="width: 100px; height: 100px; margin-top: 10px;"></div>
                    </div>"""

js = js.replace(old_html, new_html)

# Add drawRadarCharts call at the end of updateScoutingReports
old_end = """    container.innerHTML = html;
}"""

new_end = """    container.innerHTML = html;
    
    // Draw Radar Charts for each player
    Object.keys(STATE.data.players).forEach(name => {
        const player = STATE.data.players[name];
        let targetAge = STATE.mode === 'present' ? player.trajectory[player.trajectory.length - 1].age : STATE.currentAge;
        const bisect = d3.bisector(d => d.age).left;
        const idx = bisect(player.trajectory, targetAge);
        const d = player.trajectory[idx] || player.trajectory[player.trajectory.length - 1];
        if (d) drawRadarChart(`radar-${name.replace(/\s/g, '-')}`, d, CONFIG.colors[name] || "#3b82f6");
    });
}

function drawRadarChart(containerId, d, color) {
    const container = d3.select(`#${containerId}`);
    if (container.empty()) return;
    container.html(""); // Clear old

    const width = 100, height = 100;
    const margin = 15;
    const radius = Math.min(width, height) / 2 - margin;
    
    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

    const features = ["Hard", "Clay", "Grass"];
    // Win distribution % mapped to 0-1
    const total = d.wins || 1;
    const data = [
        (d.hard_wins / total),
        (d.clay_wins / total),
        (d.grass_wins / total)
    ];
    
    // Max scale up to 1.0 (100% wins on one surface)
    const rScale = d3.scaleLinear().range([0, radius]).domain([0, 1]);

    const ticks = [0.5, 1.0];
    ticks.forEach(t => {
        svg.append("circle")
            .attr("cx", 0).attr("cy", 0)
            .attr("r", rScale(t))
            .style("fill", "none")
            .style("stroke", "#e2e8f0")
            .style("stroke-dasharray", "2,2");
    });

    const angleSlice = Math.PI * 2 / features.length;

    // Draw axes
    features.forEach((f, i) => {
        const x = rScale(1.0) * Math.cos(angleSlice * i - Math.PI/2);
        const y = rScale(1.0) * Math.sin(angleSlice * i - Math.PI/2);
        
        svg.append("line")
            .attr("x1", 0).attr("y1", 0)
            .attr("x2", x).attr("y2", y)
            .style("stroke", "#e2e8f0")
            .style("stroke-width", "1px");
            
        // Label
        const labelFactor = 1.35;
        svg.append("text")
            .attr("x", rScale(1) * labelFactor * Math.cos(angleSlice * i - Math.PI/2))
            .attr("y", rScale(1) * labelFactor * Math.sin(angleSlice * i - Math.PI/2))
            .text(f)
            .style("text-anchor", "middle")
            .style("alignment-baseline", "middle")
            .style("font-size", "9px")
            .style("fill", "#64748b")
            .style("font-weight", "bold");
    });

    // Draw polygon
    const line = d3.lineRadial()
        .angle((d, i) => i * angleSlice)
        .radius(d => rScale(d))
        .curve(d3.curveLinearClosed);

    svg.append("path")
        .datum(data)
        .attr("d", line)
        .style("fill", color)
        .style("fill-opacity", 0.4)
        .style("stroke", color)
        .style("stroke-width", 2);
}
"""

js = js.replace(old_end, new_end)

with open(file_path, 'w') as f:
    f.write(js)
print("Added radar chart.")
