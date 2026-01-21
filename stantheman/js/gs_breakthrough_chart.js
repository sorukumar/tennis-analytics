// D3.js Bubble Chart for Grand Slam Breakthrough Comparison
document.addEventListener('DOMContentLoaded', function() {
    // Create the chart once the DOM is loaded
    createBreakthroughChart();
    
    // Add resize listener
    window.addEventListener('resize', debounce(createBreakthroughChart, 250));
});

function createBreakthroughChart() {
    // Clear existing chart
    d3.select("#bubble-chart svg").remove();
    
    // Get container dimensions
    const chartContainer = document.getElementById('bubble-chart');
    const containerWidth = chartContainer.clientWidth;
    const containerHeight = chartContainer.clientHeight || 600;
    
    // Chart dimensions and margins - adjusted bottom margin for x-axis
    const margin = {top: 50, right: 50, bottom: 120, left: 70};
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3.select("#bubble-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

    // Use the shared tooltip
    const tooltip = d3.select("#shared-tooltip");

    // Load data
    d3.csv("https://raw.githubusercontent.com/sorukumar/tml-data/main/data/stantheman/gs_breakthrough_comparison.csv").then(function(data) {
        // Process data
        data.forEach(d => {
            d.Age_First_GS = +d.Age_First_GS;
            d.Matches_Before_First_GS = +d.Matches_Before_First_GS;
            d.Total_GS_Titles = +d.Total_GS_Titles;
            d.Year_First_GS = +d.Year_First_GS;
            d.Year_Turned_Pro = +d.Year_Turned_Pro;
            d.Win_Percentage = +d.Win_Percentage;
            d.Win_Percentage_Before_GS = +d.Win_Percentage_Before_GS;
            d.GS_Win_Ratio = +d.GS_Win_Ratio;
            d.Peak_Ranking = +d.Peak_Ranking;
            d.Peak_Ranking_Before_GS = +d.Peak_Ranking_Before_GS;
            d.Years_On_Tour_Before_GS = +d.Years_On_Tour_Before_GS;
        });

        // Sort data by Age_First_GS to identify top 5 oldest
        const sortedByAge = [...data].sort((a, b) => b.Age_First_GS - a.Age_First_GS);
        const top5Oldest = new Set(sortedByAge.slice(0, 5).map(d => d.Player_Name));

        // Define scales
        const xScale = d3.scaleLinear()
            .domain([15, d3.max(data, d => d.Age_First_GS) * 1.05])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.Matches_Before_First_GS) * 1.05])
            .range([height, 0]);

        // Bubble size scale
        const sizeScale = d3.scaleSqrt()
            .domain([1, d3.max(data, d => d.Total_GS_Titles)])
            .range([5, 25]);

        // Color scale based on age at first GS win
        const colorScale = d3.scaleThreshold()
            .domain([23, 27]) // Age groups: under 23, 23-27, 27+
            .range(["#4daf4a", "#377eb8", "#e41a1c"]);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");

        // Add Y axis
        svg.append("g")
            .call(d3.axisLeft(yScale));

        // X axis label
        svg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 30)
            .text("Age at First Grand Slam");

        // Y axis label
        svg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -height / 2)
            .text("Matches Played Before First GS");

        // Add bubbles
        svg.selectAll(".bubble")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "bubble")
            .attr("cx", d => xScale(d.Age_First_GS))
            .attr("cy", d => yScale(d.Matches_Before_First_GS))
            .attr("r", d => sizeScale(d.Total_GS_Titles))
            .style("fill", d => colorScale(d.Age_First_GS))
            .style("opacity", 0.7)
            .style("stroke", d => d.Player_Name === "Stan Wawrinka" ? "#000" : "none")
            .style("stroke-width", d => d.Player_Name === "Stan Wawrinka" ? 2 : 0)
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
                    Age at First GS: ${Math.round(d.Age_First_GS)}<br/>
                    Matches Before First GS: ${Math.round(d.Matches_Before_First_GS)}<br/>
                    Year Turned Pro: ${Math.round(d.Year_Turned_Pro)}<br/>
                    Year First GS: ${Math.round(d.Year_First_GS)}<br/>
                    Peak Ranking Before GS: ${Math.round(d.Peak_Ranking_Before_GS)}<br/>
                    Peak Ranking: ${Math.round(d.Peak_Ranking)}<br/>
                    Win % Before GS: ${Math.round(d.Win_Percentage_Before_GS)}%<br/>
                    Win %: ${Math.round(d.Win_Percentage)}%<br/>
                    Total GS Titles: ${Math.round(d.Total_GS_Titles)}`
                )
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(500)
                    .style("opacity", 0.7);

                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Define notable players
        const notablePlayers = [
            "Stan Wawrinka", 
            "Roger Federer", 
            "Rafael Nadal", 
            "Novak Djokovic", 
            "Andy Murray", 
            "Goran Ivanisevic",
            "Pete Sampras",
            "Andre Agassi",
            "Jannik Sinner",
            "Carlos Alcaraz"
        ];

        // Only add labels for notable players
        svg.selectAll(".player-label")
            .data(data.filter(d => notablePlayers.includes(d.Player_Name)))
            .enter()
            .append("text")
            .attr("class", "player-label")
            .attr("x", d => xScale(d.Age_First_GS))
            .attr("y", d => yScale(d.Matches_Before_First_GS) - 10)
            .text(d => d.Player_Name)
            .attr("text-anchor", "middle")
            .style("font-size", "9px")
            .style("font-weight", d => d.Player_Name === "Stan Wawrinka" ? "bold" : "normal");

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