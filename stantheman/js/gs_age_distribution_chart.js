// D3.js Age Distribution Chart for First Grand Slam Wins
document.addEventListener('DOMContentLoaded', function() {
    // Check if the age-distribution-chart container exists
    if (!document.getElementById('age-distribution-chart')) {
        // Create the container if it doesn't exist
        const container = document.createElement('div');
        container.className = 'chart-container';
        container.id = 'age-distribution-chart';

        const title = document.createElement('div');
        title.className = 'chart-title';
        title.textContent = 'Age Distribution of First Grand Slam Wins';

        container.appendChild(title);

        // Insert after the timeline chart
        const timelineChart = document.getElementById('timeline-chart');
        if (timelineChart) {
            timelineChart.parentNode.insertBefore(container, timelineChart.nextSibling);
        } else {
            // If timeline chart doesn't exist, insert after bubble chart
            const bubbleChart = document.getElementById('bubble-chart');
            bubbleChart.parentNode.insertBefore(container, bubbleChart.nextSibling);
        }
    }
    
    createAgeDistributionChart();
    
    // Add resize listener
    window.addEventListener('resize', debounce(createAgeDistributionChart, 250));
});

function createAgeDistributionChart() {
    // Clear existing chart
    d3.select("#age-distribution-chart svg").remove();
    
    // Get container dimensions
    const chartContainer = document.getElementById('age-distribution-chart');
    const containerWidth = chartContainer.clientWidth;
    const containerHeight = chartContainer.clientHeight || 600; // Fallback if height not set by CSS
    
    // Chart dimensions and margins
    const margin = {top: 50, right: 50, bottom: 100, left: 70};
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3.select("#age-distribution-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

    // Use the shared tooltip instead of creating a new one
    const tooltip = d3.select("#shared-tooltip");

    // Load data
    d3.csv("https://raw.githubusercontent.com/sorukumar/tml-data/main/data/stantheman/gs_breakthrough_comparison.csv").then(function(data) {
    // Process data
    data.forEach(d => {
    d.Age_First_GS = +d.Age_First_GS;
    d.Total_GS_Titles = +d.Total_GS_Titles;
    d.Matches_Before_First_GS = +d.Matches_Before_First_GS;
    d.Peak_Ranking_Before_GS = +d.Peak_Ranking_Before_GS;
    });

    // Define age bins
    const binWidth = 2; // 2-year bins
    const minAge = Math.floor(d3.min(data, d => d.Age_First_GS));
    const maxAge = Math.ceil(d3.max(data, d => d.Age_First_GS));

    // Create bins
    const bins = [];
    for (let i = minAge; i <= maxAge; i += binWidth) {
    bins.push({
    x0: i,
    x1: i + binWidth,
    count: 0,
    players: []
    });
    }

    // Fill bins with players
    data.forEach(player => {
    const binIndex = Math.floor((player.Age_First_GS - minAge) / binWidth);
    if (binIndex >= 0 && binIndex < bins.length) {
    bins[binIndex].count++;
    bins[binIndex].players.push(player);
    }
    });

    // Define scales
    const xScale = d3.scaleLinear()
    .domain([minAge, maxAge])
    .range([0, width]);

    const yScale = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.count) * 1.1])
    .range([height, 0]);

    // Add X axis
    svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(Math.min(10, width/80))) // Adjust ticks based on width
    .selectAll("text")
    .style("text-anchor", "middle");

    // Add Y axis
    svg.append("g")
    .call(d3.axisLeft(yScale).ticks(5));

    // X axis label
    svg.append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 20)
    .text("Age at First Grand Slam Win");

    // Y axis label
    svg.append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 20)
    .attr("x", -height / 2)
    .text("Number of Players");

    // Add histogram bars
    svg.selectAll(".histogram-bar")
    .data(bins)
    .enter()
    .append("rect")
    .attr("class", "histogram-bar")
    .attr("x", d => xScale(d.x0))
    .attr("y", d => yScale(d.count))
    .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
    .attr("height", d => height - yScale(d.count))
    .style("fill", "#69b3a2")
    .style("opacity", 0.6)
    .on("mouseover", function(event, d) {
    d3.select(this)
    .transition()
    .duration(200)
    .style("opacity", 0.8);

    tooltip.transition()
    .duration(200)
    .style("opacity", .9);

    tooltip.html(
    `<strong>Age Range: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}</strong><br/>
    Number of Players: ${d.count}`
    )
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
    d3.select(this)
    .transition()
    .duration(500)
    .style("opacity", 0.6);

    tooltip.transition()
    .duration(500)
    .style("opacity", 0);
    });

    // Add jittered points for each player
    bins.forEach(bin => {
    const binWidth = xScale(bin.x1) - xScale(bin.x0);

    bin.players.forEach((player, i) => {
    // Calculate jittered position
    const jitterWidth = binWidth * 0.8;
    const jitterAmount = (Math.random() - 0.5) * jitterWidth;
    const xPos = xScale(bin.x0) + (binWidth / 2) + jitterAmount;

    // Calculate vertical position based on index within bin
    const yPos = yScale(0) - 10 - (i % 3) * 10;

    // Determine if player is a late bloomer
    const isLateBlocker = player.Age_First_GS >= 27;

    // Add point
    svg.append("circle")
    .attr("class", "player-point")
    .attr("cx", xPos)
    .attr("cy", yScale(bin.count) - 5)
    .attr("r", player.Total_GS_Titles > 5 ? 6 : 4)
    .style("fill", isLateBlocker ? "#e41a1c" : "#1f77b4")
    .style("stroke", "#000")
    .style("stroke-width", 0.5)
    .style("opacity", 0.8)
    .on("mouseover", function(event) {
    d3.select(this)
    .transition()
    .duration(200)
    .attr("r", player.Total_GS_Titles > 5 ? 8 : 6)
    .style("opacity", 1);

    tooltip.transition()
    .duration(200)
    .style("opacity", .9);

    tooltip.html(
    `<strong>${player.Player_Name}</strong><br/>
    Age at First GS: ${player.Age_First_GS.toFixed(1)}<br/>
    Matches Before First GS: ${player.Matches_Before_First_GS}<br/>
    Peak Ranking Before GS: ${player.Peak_Ranking_Before_GS}<br/>
    Total GS Titles: ${player.Total_GS_Titles}`
    )
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
    d3.select(this)
    .transition()
    .duration(500)
    .attr("r", player.Total_GS_Titles > 5 ? 6 : 4)
    .style("opacity", 0.8);

    tooltip.transition()
    .duration(500)
    .style("opacity", 0);
    });
    });
    });

    // Add mean age line
    const meanAge = d3.mean(data, d => d.Age_First_GS);

    svg.append("line")
    .attr("class", "mean-line")
    .attr("x1", xScale(meanAge))
    .attr("x2", xScale(meanAge))
    .attr("y1", 0)
    .attr("y2", height)
    .style("stroke", "#000")
    .style("stroke-width", 2)
    .style("stroke-dasharray", "5,5");

    svg.append("text")
    .attr("class", "mean-label")
    .attr("x", xScale(meanAge) + 5)
    .attr("y", 20)
    .attr("text-anchor", "start")
    .style("font-size", "12px")
    .text(`Mean Age: ${meanAge.toFixed(1)}`);

    // Add legend - only if there's enough space
    if (width > 400) {
        const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 150}, 20)`);

        // Legend for regular players
        const legendRegular = legend.append("g")
        .attr("transform", "translate(0, 0)");

        legendRegular.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 4)
        .style("fill", "#1f77b4")
        .style("stroke", "#000")
        .style("stroke-width", 0.5);

        legendRegular.append("text")
        .attr("x", 10)
        .attr("y", 4)
        .text("Under 27")
        .style("font-size", "12px");

        // Legend for late bloomers
        const legendLate = legend.append("g")
        .attr("transform", "translate(0, 20)");

        legendLate.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 4)
        .style("fill", "#e41a1c")
        .style("stroke", "#000")
        .style("stroke-width", 0.5);

        legendLate.append("text")
        .attr("x", 10)
        .attr("y", 4)
        .text("27 and older")
        .style("font-size", "12px");

        // Legend for multi-GS winners
        const legendMulti = legend.append("g")
        .attr("transform", "translate(0, 40)");

        legendMulti.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 6)
        .style("fill", "#1f77b4")
        .style("stroke", "#000")
        .style("stroke-width", 0.5);

        legendMulti.append("text")
        .attr("x", 10)
        .attr("y", 4)
        .text("5+ Grand Slam Titles")
        .style("font-size", "12px");
    }

    }).catch(function(error) {
    console.log("Error loading the data: " + error);
    });
}

// Debounce function to prevent excessive redraws
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}