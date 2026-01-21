// D3.js Timeline Chart for Years on Tour Before First Grand Slam
document.addEventListener('DOMContentLoaded', function() {
    createTimelineChart();
    
    // Add resize listener
    window.addEventListener('resize', debounce(createTimelineChart, 250));
});

function createTimelineChart() {
    // Clear existing chart
    d3.select("#timeline-chart svg").remove();
    
    // Get container dimensions
    const chartContainer = document.getElementById('timeline-chart');
    const containerWidth = chartContainer.clientWidth;
    const containerHeight = chartContainer.clientHeight || 600;
    
    // Chart dimensions and margins - increased bottom margin for x-axis label
    const margin = {top: 50, right: 150, bottom: 120, left: 200};
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3.select("#timeline-chart")
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
    d.Years_On_Tour_Before_GS = +d.Years_On_Tour_Before_GS;
    d.Age_First_GS = +d.Age_First_GS;
    d.Total_GS_Titles = +d.Total_GS_Titles;
    d.Matches_Before_First_GS = +d.Matches_Before_First_GS;
    d.Peak_Ranking_Before_GS = +d.Peak_Ranking_Before_GS;
    });

    // Sort data by years on tour before first GS (descending)
    data.sort((a, b) => b.Years_On_Tour_Before_GS - a.Years_On_Tour_Before_GS);

    // Define scales
    const xScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Years_On_Tour_Before_GS) + 1])
    .range([0, width]);

    const yScale = d3.scaleBand()
    .domain(data.map(d => d.Player_Name))
    .range([0, height])
    .padding(0.3);

    // Color scale based on age at first GS win - simplified to 3 groups
    const colorScale = d3.scaleThreshold()
    .domain([23, 27]) // Age groups: under 23, 23-27, 27+
    .range(["#4daf4a", "#377eb8", "#e41a1c"]);

    // Bubble size scale based on total GS titles
    const sizeScale = d3.scaleSqrt()
    .domain([1, d3.max(data, d => d.Total_GS_Titles)])
    .range([5, 15]);

    // Add X axis
    svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(Math.min(13, width/80))) // Adjust ticks based on width
    .selectAll("text")
    .style("text-anchor", "middle");

    // Add Y axis
    svg.append("g")
    .call(d3.axisLeft(yScale));

    // X axis label
    svg.append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 30)
    .text("Years on Tour Before First Grand Slam Win");

    // Add horizontal bars
    svg.selectAll(".timeline-bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "timeline-bar")
    .attr("x", 0)
    .attr("y", d => yScale(d.Player_Name))
    .attr("width", d => xScale(d.Years_On_Tour_Before_GS))
    .attr("height", yScale.bandwidth())
    .style("fill", d => colorScale(d.Age_First_GS))
    .style("opacity", 0.8)
    .style("stroke", "#333")
    .style("stroke-width", 0.5)
    .on("mouseover", function(event, d) {
    d3.select(this)
    .transition()
    .duration(200)
    .style("opacity", 1);

    tooltip.transition()
    .duration(200)
    .style("opacity", .9);

    tooltip.html(
    `<strong>${d.Player_Name}</strong><br/>
    Years on Tour Before First GS: ${d.Years_On_Tour_Before_GS}<br/>
    Matches Before First GS: ${d.Matches_Before_First_GS}<br/>
    Peak Ranking Before GS: ${d.Peak_Ranking_Before_GS}<br/>
    Total GS Titles: ${d.Total_GS_Titles}`
    )
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
    d3.select(this)
    .transition()
    .duration(500)
    .style("opacity", 0.8);

    tooltip.transition()
    .duration(500)
    .style("opacity", 0);
    });

    // Add circles at the end of each bar to represent total GS titles
    svg.selectAll(".gs-bubble")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "gs-bubble")
    .attr("cx", d => xScale(d.Years_On_Tour_Before_GS))
    .attr("cy", d => yScale(d.Player_Name) + yScale.bandwidth() / 2)
    .attr("r", d => sizeScale(d.Total_GS_Titles))
    .style("fill", d => colorScale(d.Age_First_GS))
    .style("stroke", "#000")
    .style("stroke-width", 1)
    .style("opacity", 0.9)
    .on("mouseover", function(event, d) {
    d3.select(this)
    .transition()
    .duration(200)
    .style("opacity", 1);

    tooltip.transition()
    .duration(200)
    .style("opacity", .9);

    tooltip.html(
    `<strong>${d.Player_Name}</strong><br/>
    Years on Tour Before First GS: ${d.Years_On_Tour_Before_GS}<br/>
    Matches Before First GS: ${d.Matches_Before_First_GS}<br/>
    Peak Ranking Before GS: ${d.Peak_Ranking_Before_GS}<br/>
    Total GS Titles: ${d.Total_GS_Titles}`
    )
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
    d3.select(this)
    .transition()
    .duration(500)
    .style("opacity", 0.9);

    tooltip.transition()
    .duration(500)
    .style("opacity", 0);
    });

    // Add legend for age groups - only if there's enough space
    if (width > 400) {
        const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 20}, 20)`);

        const ageGroups = [
        {label: "Under 23", color: "#4daf4a"},
        {label: "23-27", color: "#377eb8"},
        {label: "Over 27", color: "#e41a1c"}
        ];

        ageGroups.forEach((group, i) => {
        const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 25})`);

        legendRow.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", group.color);

        legendRow.append("text")
        .attr("x", 25)
        .attr("y", 12.5)
        .attr("text-anchor", "start")
        .style("font-size", "12px")
        .text(group.label);
        });

        // Add legend for bubble size
        const sizeLegend = legend.append("g")
        .attr("transform", `translate(0, ${ageGroups.length * 25 + 20})`);

        sizeLegend.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("text-anchor", "start")
        .style("font-size", "12px")
        .text("Total GS Titles:");

        const legendSizes = [1, 5, 10, 20];

        legendSizes.forEach((size, i) => {
        const yPos = 25 + i * 25;

        sizeLegend.append("circle")
        .attr("cx", 10)
        .attr("cy", yPos)
        .attr("r", sizeScale(size))
        .style("fill", "#777")
        .style("stroke", "#000");

        sizeLegend.append("text")
        .attr("x", 25)
        .attr("y", yPos + 5)
        .attr("text-anchor", "start")
        .style("font-size", "12px")
        .text(size);
        });
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