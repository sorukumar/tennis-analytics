// D3.js Timeline Chart for Years on Tour Before First Grand Slam
document.addEventListener('DOMContentLoaded', function () {
    // Listen for state updates
    window.addEventListener('gsStateUpdate', function (e) {
        createTimelineChart();
    });

    // Add resize listener
    window.addEventListener('resize', debounce(createTimelineChart, 250));
});

function createTimelineChart() {
    let data = [...window.gsState.filteredData];
    if (!data || data.length === 0) return;

    // Filter to top 15 grinders/extremes for clarity
    data.sort((a, b) => b.Years_On_Tour_Before_GS - a.Years_On_Tour_Before_GS);
    const topGrinders = data.slice(0, 15);

    d3.select("#timeline-chart svg").remove();
    const chartContainer = document.getElementById('timeline-chart');
    const width = chartContainer.clientWidth - 250;
    const height = (chartContainer.clientHeight || 500) - 100;

    const svg = d3.select("#timeline-chart")
        .append("svg")
        .attr("width", width + 250)
        .attr("height", height + 100)
        .append("g")
        .attr("transform", `translate(180,40)`);

    const xScale = d3.scaleLinear().domain([0, 15]).range([0, width]);
    const yScale = d3.scaleBand().domain(topGrinders.map(d => d.Player_Name)).range([0, height]).padding(1);

    // Lollipop lines
    svg.selectAll(".lollipop-line")
        .data(topGrinders)
        .enter()
        .append("line")
        .attr("class", "lollipop-line")
        .attr("x1", 0)
        .attr("x2", d => xScale(d.Years_On_Tour_Before_GS))
        .attr("y1", d => yScale(d.Player_Name))
        .attr("y2", d => yScale(d.Player_Name));

    // Lollipop dots
    svg.selectAll(".lollipop-dot")
        .data(topGrinders)
        .enter()
        .append("circle")
        .attr("class", "lollipop-dot")
        .attr("cx", d => xScale(d.Years_On_Tour_Before_GS))
        .attr("cy", d => yScale(d.Player_Name))
        .attr("r", 6)
        .style("fill", d => d.Age_First_GS >= 27 ? "var(--accent-color)" : "var(--primary-color)")
        .on("mouseover", (event, d) => {
            window.gsState.setHighlight(d.Player_Name);
        })
        .on("mouseout", () => {
            window.gsState.setHighlight(null);
        });

    // Axes
    svg.append("g").call(d3.axisLeft(yScale));
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale));

    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + 45)
        .text("Years on Tour Before First Grand Slam Win");
}


function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}