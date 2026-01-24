# tennis-analytics Project Guide for LLMs

## Project Context
`tennis-analytics` is a sophisticated open-source platform hosting interactive "data stories" about professional tennis. It transforms raw match data (processed in the sister repo `tml-data`) into high-end visual narratives.

## Project Overview
This repository serves as the frontend layer, utilizing **D3.js**, **ECharts**, and **Vanilla JavaScript** to build responsive, aesthetically premium visualizations. The goal is to provide insights into player greatness, match drama, and historical trends that are "social-media ready."

---

## 📂 Repository Structure & Key Insights

### Core Analysis Modules
| Module | Path | Key AI Insights |
| :--- | :--- | :--- |
| **Race to Greatness** | `/greatness/` | Nadal was a prodigy; Federer was a late starter compared to the other Big 3. Alcaraz/Sinner are currently on a record-breaking early pace. |
| **GS Breakthrough** | `/gs-breakthrough/` | 90% of legends win their first Slam before age 27. Most greats make their mark within 1-3 years on tour. |
| **Nail-Biter Index** | `/nbi/` | Identifies **2019 Wimbledon Final** as the most exciting match; highlights **Alcaraz-Sinner RG**. Metrics define drama through game-level clutch density. |
| **Slam Power Rankings** | `/gsdi/` | GSDI index shows who didn't just win, but statistically crushed their opponents. |
| **Big Three Analysis** | `/bigthree/` | Comparing the stylistic and statistical differences that defined the GOAT era. |
| **Talent Geography** | `/globaltop100/` | 50-year animated evolution showing the globalization of ATP talent. |
| **Rivalry Networks** | `/network/` | Visualizing player "gravity" through head-to-head frequency. |
| **Indian Tennis** | `/indianplayers/` | Tracking the rise and plateau of Indian pro tennis since the Open Era. |

### Shared Assets & Logic
- `components/`: Modular HTML/JS for `header.html`, `footer.html`, and `social-share.js`.
- `utils/`: Includes `export_engine.js`, the high-performance video recording utility.
- `assets/`: Player portraits, icons, and site branding assets.

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
}
```

### 2. Meta Tags (Essential for SEO/Discovery)
Every subpage `index.html` must include these tags for high-quality social previews:
```html
<meta property="og:title" content="The Race to Greatness | Tennis Analytics">
<meta property="og:description" content="Nadal was a prodigy; Federer was a late-starter. See the data.">
<meta property="og:url" content="https://sorukumar.github.io/tennis-analytics/greatness/">
<meta property="og:image" content="https://sorukumar.github.io/tennis-analytics/image/claytennis.jpeg">
```

---

## 🎨 Design System (Global Standards)
- **Palette**: Primary Green (`#1e5631`), Accent Yellow (`#f9c74f`).
- **Typography**: `Playfair Display` (Headings), `Montserrat` (Body).
- **Glassmorphism**: Standard for UI control panels to maintain a modern, premium feel.

---

## 🚀 Workflow for AI Agents
1. **Insight Extraction**: Before generating code, identify the core tennis insight (e.g., "The Age 27 Wall").
2. **Component Re-use**: Use `include.js` for layout. Do not rewrite headers/footers.
3. **Absolute Paths**: Always use absolute paths in tool calls for local environment stability.
4. **Validation**: Verify that charts explain the data narrative, not just show raw numbers.

---
*Note: This guide is optimized for LLMs to maintain the project's high aesthetic and technical bars.*