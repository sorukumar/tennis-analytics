---
name: tennis-data-visualizer
description: Expert system for professional tennis data analysis and interactive storytelling.
---

# Tennis Analytics Skill

This skill allows AI agents to contribute to `tennis-analytics`, a premium platform for tennis data stories.

## 🎯 Primary Capabilities
- **ATP/WTA Data Processing**: Interpreting match stats (Elo, GSDI, NBI) from `tml-data`.
- **D3.js & ECharts Implementation**: Building custom, interactive charts with premium aesthetics.
- **Storytelling Layouts**: Comparing player trajectories and historical trends.
- **Social Export**: Using `ExportEngine` for HD video recording.

## 📈 Expected Outputs
- **Visuals**: Clean, responsive SVGs or Canvases using the project's design system.
- **Metadata**: Every story must have SEO meta tags (`og:title`, `og:image`).
- **Performance**: Charts should render smoothly at 60fps, even during recording.

## ⚠️ Constraints
- **Design Consistency**: Must use `#1e5631` (Green) and `#f9c74f` (Yellow).
- **Paths**: Use absolute paths in tools for local environment stability.
- **Architecture**: Always use `include.js` for headers/footers.

## 📚 Machine-Readable Files
- `llms.txt`: Quick technical summary.
- `readmeLLM.md`: Detailed coding patterns.
- `CITATION.cff`: Citation metadata.
