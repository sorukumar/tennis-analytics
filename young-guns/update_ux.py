import os
import re

# ------------- UPDATE HTML -------------
index_path = '/Users/saurabhkumar/Desktop/Work/github/tennis-analytics/young-guns/index.html'
with open(index_path, 'r') as f:
    html = f.read()

# CSS insertions
css_rules = """
        .chart-tabs { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
        .chart-tab { padding: 10px 20px; font-weight: 700; color: #64748b; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; transition: all 0.2s; font-size: 1.05rem; }
        .chart-tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }
        .chart-tab:hover { color: #1e293b; }
        .chart-pane { display: none; }
        .chart-pane.active { display: block; animation: fadeIn 0.4s ease-out; }
        .chart-container-large { height: 500px; width: 100%; position: relative; background: white; border-radius: 12px; padding: 15px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border: 1px solid #f1f5f9; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        
        .mode-toggle { display: inline-flex; background: #f1f5f9; border-radius: 8px; padding: 4px; margin-bottom: 20px; }
        .mode-btn { background: transparent; border: none; padding: 8px 20px; border-radius: 6px; font-weight: 700; font-size: 0.95rem; cursor: pointer; color: #64748b; transition: all 0.2s; }
        .mode-btn.active { background: white; color: #0f172a; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
        .modern-slider:disabled { opacity: 0.5; cursor: not-allowed; }
"""

html = re.sub(r'(\.chart-container-large\s*\{[^}]+\})', r'\1' + css_rules, html)
# Remove old trajectory-grid CSS
html = re.sub(r'\.trajectory-grid\s*\{[^}]+\}', '', html)

# Replace trajectory grid HTML with TABS
new_charts_html = """
                <div class="chart-tabs-container">
                    <div class="chart-tabs" id="chart-tabs">
                        <button class="chart-tab active" data-target="pane-wins-trajectory-chart">📈 Match Wins</button>
                        <button class="chart-tab" data-target="pane-top50-trajectory-chart">🎯 Quality (Top 50)</button>
                        <button class="chart-tab" data-target="pane-top10-trajectory-chart">🔥 Elite (Top 10)</button>
                        <button class="chart-tab" data-target="pane-rank-trajectory-chart">🏆 ATP Ranking</button>
                    </div>
                    
                    <div class="chart-pane active" id="pane-wins-trajectory-chart">
                        <h3>Match-Win Velocity</h3>
                        <p class="chart-sub">Main Draw ATP Wins compared by age. Shows raw consistency and tour experience.</p>
                        <div id="wins-trajectory-chart" class="chart-container-large"></div>
                    </div>
                    <div class="chart-pane" id="pane-top50-trajectory-chart">
                        <h3>Quality of Wins: Top 50 Opponents</h3>
                        <p class="chart-sub">Weeding out lower-level events. Can they beat established tour players regularly?</p>
                        <div id="top50-trajectory-chart" class="chart-container-large"></div>
                    </div>
                    <div class="chart-pane" id="pane-top10-trajectory-chart">
                        <h3>Elite Quality: Top 10 Opponents</h3>
                        <p class="chart-sub">The ultimate proving ground. Beating the absolute best in the world.</p>
                        <div id="top10-trajectory-chart" class="chart-container-large"></div>
                    </div>
                    <div class="chart-pane" id="pane-rank-trajectory-chart">
                        <h3>The Ranking Climb</h3>
                        <p class="chart-sub">ATP Ranking Ascent against age. Displayed on a Logarithmic scale.</p>
                        <div id="rank-trajectory-chart" class="chart-container-large"></div>
                    </div>
                </div>
"""

old_charts_regex = r'<div class="trajectory-grid">.*?</div>\s+(?=<section class="global-controls)'
html = re.sub(old_charts_regex, new_charts_html, html, flags=re.DOTALL)

# Replace Slider container
new_slider_html = """
                <div class="slider-container">
                    <div class="mode-toggle" id="mode-toggle">
                        <button class="mode-btn active" data-mode="age">⚖️ Age-Matched</button>
                        <button class="mode-btn" data-mode="present">📅 Present Day</button>
                    </div>
                    <div class="slider-header" id="slider-header" style="transition: opacity 0.3s;">
                        <span class="slider-label">COMPARE AT CAREER AGE: <strong id="current-age-display">18.5</strong>y</span>
                    </div>
                    <input type="range" id="global-age-slider" min="16" max="21" step="0.1" value="18.5" class="modern-slider">
                </div>
"""
old_slider_regex = r'<div class="slider-container">.*?</div>\s+(?=</section>)'
html = re.sub(old_slider_regex, new_slider_html, html, flags=re.DOTALL)

with open(index_path, 'w') as f:
    f.write(html)
print("Updated HTML.")

