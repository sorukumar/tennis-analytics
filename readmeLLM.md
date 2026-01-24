# tennis-analytics Project Guide for LLMs

## Project Context
`tennis-analytics` is a sophisticated open-source platform hosting interactive "data stories" about professional tennis. It transforms raw match data (processed in the sister repo `tml-data`) into high-end visual narratives.

## Project Overview
This repository serves as the frontend layer, utilizing **D3.js**, **ECharts**, and **Vanilla JavaScript** to build responsive, aesthetically premium visualizations. The goal is to provide insights into player greatness, match drama, and historical trends that are "social-media ready."

---

## 📂 Repository Structure

### Core Analysis Modules
| Module | Path | Description |
| :--- | :--- | :--- |
| **Race to Greatness** | `/greatness/` | Trajectory comparison of Alcaraz/Sinner vs. Big 3. |
| **Slam Power Rankings** | `/gsdi/` | Dominance index (GSDI) for major title runs. |
| **Nail-Biter Index** | `/nbi/` | Ranking the most dramatic 5-set matches in history. |
| **Big Three Analysis** | `/bigthree/` | Deep dive into the stats of Federer, Nadal, and Djokovic. |
| **GS Breakthrough** | `/gs-breakthrough/` | Age and experience metrics for first-time champions. |
| **Talent Geography** | `/globaltop100/` | 50-year animated evolution of ATP talent origins. |
| **Rivalry Networks** | `/network/` | Web of connections based on match frequency and finals. |
| **Indian Tennis** | `/indianplayers/` | 1968–Present evolution of Indian professional tennis. |
| **Brutal Tennis** | `/viz/` | Standalone analysis on the difficulty of turning pro. |
| **Education** | `/summercamp/` | Portal for the Tennis & Coding summer camp. |

### Shared Assets & Logic
- `components/`: Modular HTML/JS for `header.html`, `footer.html`, and `social-share.js`.
- `utils/`: Includes `export_engine.js`, the high-performance video recording utility.
- `assets/`: Player portraits, icons, and site branding assets.
- `code/`: Reference Python scripts used for initial data formatting.

---

## 🛠 Technical Reference Patterns

### 1. D3.js Chart Boilerplate
Use this standard pattern for consistent responsiveness and styling:
```javascript
function initChart(data) {
    const margin = {top: 40, right: 60, bottom: 60, left: 80};
    const width = document.querySelector('#chart-id').clientWidth - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select("#chart-id")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add interactivity (tooltips, zoom, etc.)
}
```

### 2. Shared Tooltip Implementation
Always use the `#shared-tooltip` div for hover states to maintain global styling:
```javascript
const tooltip = d3.select("#shared-tooltip");

selection.on("mouseover", (event, d) => {
    tooltip.transition().duration(200).style("opacity", 0.95);
    tooltip.html(`
        <div class="tooltip-title">${d.name}</div>
        <div class="tooltip-body">Value: <strong>${d.value}</strong></div>
    `)
    .style("left", (event.pageX + 15) + "px")
    .style("top", (event.pageY - 28) + "px");
});

selection.on("mouseout", () => tooltip.style("opacity", 0));
```

### 3. Meta Tags (Essential for SEO/Discovery)
Every subpage `index.html` must include these tags for high-quality social previews:
```html
<meta property="og:title" content="The Race to Greatness | Tennis Analytics">
<meta property="og:description" content="A data-driven comparison of Sinner/Alcaraz vs. Legends.">
<meta property="og:url" content="https://sorukumar.github.io/tennis-analytics/greatness/">
<meta property="og:image" content="https://sorukumar.github.io/tennis-analytics/image/claytennis.jpeg">
<meta name="twitter:card" content="summary_large_image">
```

---

## 🎨 Design System (Global Standards)

- **Palette**:
  - Primary Green: `#1e5631` (Use for branding and success states)
  - Accent Yellow: `#f9c74f` (Use for highlight data points/CTA)
  - Dark Slate: `#1a202c` (Typography)
- **Typography**:
  - Headings: `Playfair Display`, serif.
  - Body: `Montserrat`, sans-serif.
- **Components**:
  - Use `tennis_analytics.css` for global class definitions like `.card`, `.btn-primary`, and `.container-body`.
  - Glassmorphism: `background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px);` for UI overlays.

---

## 🎥 Recording & Export Workflow
The `ExportEngine` in `utils/` is a key project feature. It enables users to record animations for social media.

**Integration Pattern**:
```javascript
// 1. Initialize
ExportEngine.init({ siteUrl: 'https://sorukumar.github.io/tennis-analytics/' });

// 2. Add Trigger
d3.select('#btn-record').on('click', () => {
    // For D3 visuals, use recordDeterministic to avoid frame skips
    ExportEngine.recordDeterministic(svgElement, controller, 'my-viz-name');
});
```

---

## 🚀 Workflow for AI Agents

1. **Triggering**: Activate this workflow when a user requests a new data story or a major visualization refactor.
2. **Data Sourcing**: Identify if the JSON is coming from `tml-data` or a local CSV.
3. **Component Re-use**: Use `include.js` for layout. Do not rewrite headers/footers.
4. **Absolute Paths**: When executing tool calls (grep, read, write), use absolute paths to maintain consistency.
5. **Validation**: Always verify chart responsiveness on a simulated mobile viewport.

---

## 📦 Dependencies
- **D3.js v7**: Data-driven DOM manipulation.
- **ECharts**: High-performance canvas charting.
- **Font Awesome**: Iconography.
- **Google Fonts**: `Montserrat` & `Playfair Display`.

---
*Note: This guide is optimized for LLMs to maintain the project's high aesthetic and technical bars.*