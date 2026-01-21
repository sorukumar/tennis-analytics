/**
 * Network Graph Core
 * Handles data loading, transformation, and vis.js rendering
 */

class TennisNetworkGraph {
    constructor(containerId, config) {
        this.containerId = containerId;
        this.config = config;
        this.network = null;
        this.nodes = null;
        this.edges = null;
        this.rawData = null;
        this.allNodes = {};
        this.allEdges = {};
    }

    /**
     * Load data from URL and render the network
     */
    async load() {
        try {
            this.showLoading();
            const response = await fetch(this.config.dataUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.rawData = await response.json();
            this.transformData();
            this.render();
            this.hideLoading();
            return this;
        } catch (error) {
            this.showError(error.message);
            throw error;
        }
    }

    /**
     * Transform JSON data to vis.js format
     */
    transformData() {
        const { nodeConfig, edgeConfig } = this.config;

        // Calculate size scale
        const sizeValues = this.rawData.nodes.map(n => n[nodeConfig.sizeField] || 1);
        const minSize = Math.min(...sizeValues);
        const maxSize = Math.max(...sizeValues);
        const sizeScale = (val) => {
            if (maxSize === minSize) return (nodeConfig.sizeRange[0] + nodeConfig.sizeRange[1]) / 2;
            const normalized = (val - minSize) / (maxSize - minSize);
            return nodeConfig.sizeRange[0] + normalized * (nodeConfig.sizeRange[1] - nodeConfig.sizeRange[0]);
        };

        // Calculate edge width scale
        const widthValues = this.rawData.edges.map(e => e[edgeConfig.widthField] || 1);
        const minWidth = Math.min(...widthValues);
        const maxWidth = Math.max(...widthValues);
        const widthScale = (val) => {
            if (maxWidth === minWidth) return (edgeConfig.widthRange[0] + edgeConfig.widthRange[1]) / 2;
            const normalized = (val - minWidth) / (maxWidth - minWidth);
            return edgeConfig.widthRange[0] + normalized * (edgeConfig.widthRange[1] - edgeConfig.widthRange[0]);
        };

        // Player Image Mapping
        const PLAYER_IMAGES = {
            "Roger Federer": "../assets/players/federer.png",
            "Rafael Nadal": "../assets/players/nadal.png",
            "Novak Djokovic": "../assets/players/djokovic.png",
            "Carlos Alcaraz": "../assets/players/alcaraz.png",
            "Jannik Sinner": "../assets/players/sinner.png",
            "Pete Sampras": "../assets/players/sampras.png",
            "Andre Agassi": "../assets/players/agassi.png",
            "Bjorn Borg": "../assets/players/borg.png",
            "Andy Murray": "../assets/players/murray.png",
            "Stan Wawrinka": "../assets/players/wawrinka.png",
            "Goran Ivanisevic": "../assets/players/ivanisevic.png",
            "John McEnroe": "../assets/players/mcenroe.png",
            "Boris Becker": "../assets/players/becker.png",
            "Stefan Edberg": "../assets/players/edberg.png",
            "Ivan Lendl": "../assets/players/lendl.png",
            "Jimmy Connors": "../assets/players/connors.png",
            "Daniil Medvedev": "../assets/players/medvedev.png",
            "Lleyton Hewitt": "../assets/players/hewitt.png",
            "Marat Safin": "../assets/players/safin.png",
            "Gustavo Kuerten": "../assets/players/kuerten.png",
            "Jim Courier": "../assets/players/courier.png",
            "Mats Wilander": "../assets/players/wilander.png",
            "Michael Chang": "../assets/players/chang.png",
            "Ken Rosewall": "../assets/players/rosewall.png",
            "Rod Laver": "../assets/players/laver.png",
            "John Newcombe": "../assets/players/newcombe.png",
            "Arthur Ashe": "../assets/players/ashe.png",
            "Ilie Nastase": "../assets/players/nastase.png",
            "Guillermo Vilas": "../assets/players/vilas.png",
            "Juan Martin del Potro": "../assets/players/delpotro.png"
        };

        // Transform nodes
        const visNodes = this.rawData.nodes.map(node => {
            const hasImage = PLAYER_IMAGES[node.name];
            const baseSize = sizeScale(node[nodeConfig.sizeField] || 1);

            return {
                id: node.name,
                label: node[nodeConfig.labelField],
                size: hasImage ? baseSize * 1.5 : baseSize,
                shape: hasImage ? 'circularImage' : 'dot',
                image: hasImage ? PLAYER_IMAGES[node.name] : undefined,
                color: {
                    background: nodeConfig.colorPalette[node[nodeConfig.colorField]] || '#6b7280',
                    border: this.darkenColor(nodeConfig.colorPalette[node[nodeConfig.colorField]] || '#6b7280', 20),
                    highlight: {
                        background: '#f59e0b',
                        border: '#d97706'
                    },
                    hover: {
                        background: this.lightenColor(nodeConfig.colorPalette[node[nodeConfig.colorField]] || '#6b7280', 15),
                        border: nodeConfig.colorPalette[node[nodeConfig.colorField]] || '#6b7280'
                    }
                },
                font: {
                    color: '#1e293b',
                    size: hasImage ? 14 : 12,
                    face: 'Inter, system-ui, sans-serif',
                    strokeWidth: 3,
                    strokeColor: '#ffffff',
                    vadjust: hasImage ? 5 : 0 // Push label down a bit for images
                },
                borderWidth: hasImage ? 3 : 2,
                borderWidthSelected: 4,
                // Store original data for tooltips
                originalData: node
            };
        });

        // Transform edges
        const visEdges = this.rawData.edges.map((edge, idx) => ({
            id: `edge_${idx}`,
            from: edge.player1,
            to: edge.player2,
            width: widthScale(edge[edgeConfig.widthField] || 1),
            color: {
                color: edgeConfig.color,
                highlight: edgeConfig.hoverColor,
                hover: edgeConfig.hoverColor,
                opacity: 0.6
            },
            smooth: {
                type: 'continuous',
                roundness: 0.5
            },
            hoverWidth: 1.5,
            // Store original data for tooltips
            originalData: edge
        }));

        this.nodes = new vis.DataSet(visNodes);
        this.edges = new vis.DataSet(visEdges);

        // Store for filtering
        this.allNodes = this.nodes.get({ returnType: 'Object' });
        this.allEdges = this.edges.get({ returnType: 'Object' });
    }

    /**
     * Render the network graph
     */
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) throw new Error(`Container #${this.containerId} not found`);

        const data = { nodes: this.nodes, edges: this.edges };

        const options = {
            nodes: {
                scaling: {
                    min: this.config.nodeConfig.sizeRange[0],
                    max: this.config.nodeConfig.sizeRange[1]
                }
            },
            edges: {
                smooth: {
                    type: 'continuous'
                },
                color: {
                    inherit: false
                },
                selectionWidth: 10,
                hoverWidth: 2
            },
            physics: {
                enabled: true,
                barnesHut: {
                    gravitationalConstant: this.config.physics.gravitationalConstant,
                    centralGravity: this.config.physics.centralGravity,
                    springLength: this.config.physics.springLength,
                    springConstant: this.config.physics.springConstant,
                    damping: this.config.physics.damping,
                    avoidOverlap: this.config.physics.avoidOverlap
                },
                stabilization: {
                    enabled: true,
                    iterations: 200,
                    updateInterval: 25
                },
                minVelocity: 0.75
            },
            interaction: {
                hover: true,
                tooltipDelay: 100,
                hideEdgesOnDrag: true,
                hideEdgesOnZoom: true
            }
        };

        this.network = new vis.Network(container, data, options);
        this.setupEventHandlers();
    }

    /**
     * Setup hover and click event handlers
     */
    setupEventHandlers() {
        // Node hover - show tooltip
        this.network.on('hoverNode', (params) => {
            const nodeId = params.node;
            const node = this.nodes.get(nodeId);
            if (node && node.originalData) {
                this.showNodeTooltip(node.originalData, params.event);
            }
        });

        this.network.on('blurNode', () => {
            this.hideTooltip();
        });

        // Edge hover - show tooltip
        this.network.on('hoverEdge', (params) => {
            const edgeId = params.edge;
            const edge = this.edges.get(edgeId);
            if (edge && edge.originalData) {
                this.showEdgeTooltip(edge.originalData, params.event);
            }
        });

        this.network.on('blurEdge', () => {
            this.hideTooltip();
        });

        // Click to focus
        this.network.on('click', (params) => {
            if (params.nodes.length > 0) {
                this.focusOnNode(params.nodes[0]);
            } else {
                this.resetFocus();
            }
        });

        // Stabilization progress
        this.network.on('stabilizationProgress', (params) => {
            const progress = Math.round((params.iterations / params.total) * 100);
            this.updateLoadingProgress(progress);
        });

        this.network.on('stabilizationIterationsDone', () => {
            this.hideLoading();
        });
    }

    /**
     * Show node tooltip with player info
     */
    showNodeTooltip(data, event) {
        const tooltip = this.getOrCreateTooltip();

        if (this.isGrandSlamFinals()) {
            this.showGrandSlamFinalsNodeTooltip(data, event);
            return;
        } else if (this.isWimbledon()) {
            this.showWimbledonNodeTooltip(data, event);
            return;
        } else if (this.isAustralianOpen()) {
            this.showAustralianOpenNodeTooltip(data, event);
            return;
        } else if (this.isRolandGarros()) {
            this.showRolandGarrosNodeTooltip(data, event);
            return;
        } else if (this.isUSOpen()) {
            this.showUSOpenNodeTooltip(data, event);
            return;
        }

        // Original tooltip for other networks

        // Build surface breakdown
        let surfaceInfo = '';
        if (data.surface_win_pcts && Object.keys(data.surface_win_pcts).length > 0) {
            const surfaces = Object.entries(data.surface_win_pcts)
                .map(([s, pct]) => `<span class="surface-tag surface-${s.toLowerCase()}">${s}: ${pct.toFixed(0)}%</span>`)
                .join(' ');
            surfaceInfo = `<div class="tooltip-row">${surfaces}</div>`;
        }

        tooltip.innerHTML = `
            <div class="tooltip-header">
                <div class="player-identity">
                    <span class="player-name">${data.name}</span>
                    <span class="active-span">${data.active_span || ''}</span>
                </div>
                <span class="player-country">${data.country}</span>
            </div>
            <div class="tooltip-body">
                <div class="tooltip-row">
                    <span class="tooltip-label">Record:</span> 
                    <span class="tooltip-value">${data.matches_won}-${data.matches_played - data.matches_won} (${data.win_pct?.toFixed(1)}%)</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">GS Titles:</span> 
                    <span class="tooltip-value gs-titles">${data.gs_titles || 0}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Peak Ranking:</span> 
                    <span class="tooltip-value">#${data.peak_ranking || 'N/A'}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Career Matches:</span> 
                    <span class="tooltip-value">${data.career_total_matches?.toLocaleString() || 'N/A'}</span>
                </div>
                ${surfaceInfo}
            </div>
        `;

        this.positionTooltip(tooltip, event);
        tooltip.classList.add('visible');
    }

    /**
     * Show enhanced node tooltip for Grand Slam Finals network
     */
    showGrandSlamFinalsNodeTooltip(data, event) {
        const tooltip = this.getOrCreateTooltip();

        // GS Career Overview - GS win % vs Career win %
        const gsWinPct = data.win_pct?.toFixed(1) || 'N/A';
        const careerWinPct = data.career_win_pct?.toFixed(1) || 'N/A';
        const gsCareerComparison = careerWinPct !== 'N/A' ?
            `<div class="tooltip-row"><span class="tooltip-label">GS vs Career:</span> <span class="tooltip-value">${gsWinPct}% | ${careerWinPct}%</span></div>` : '';

        // GS Titles by Slam breakdown
        let gsTitlesBreakdown = '';
        if (data.tourney_wins && Object.keys(data.tourney_wins).length > 0) {
            const slamTitles = [];
            const slamOrder = ['Australian Open', 'Roland Garros', 'Wimbledon', 'US Open'];
            slamOrder.forEach(slam => {
                if (data.tourney_wins[slam]) {
                    slamTitles.push(`${slam.split(' ')[0]}: ${data.tourney_wins[slam]}`);
                }
            });
            if (slamTitles.length > 0) {
                gsTitlesBreakdown = `<div class="tooltip-row"><span class="tooltip-label">GS Titles:</span> <span class="tooltip-value">${slamTitles.join(', ')}</span></div>`;
            }
        }

        // Elite Competition - Top 5 performance
        let eliteCompetition = '';
        if (data.top_5_matches && data.top_5_matches > 0) {
            const top5Record = `${data.top_5_wins}-${data.top_5_matches - data.top_5_wins}`;
            const top5Pct = data.top_5_win_pct?.toFixed(0) || 0;
            eliteCompetition = `<div class="tooltip-row"><span class="tooltip-label">vs Top 5:</span> <span class="tooltip-value">${top5Record} (${top5Pct}%)</span></div>`;
        }

        // Cross-Surface GS Performance
        let surfaceGS = '';
        if (data.surface_matches && Object.keys(data.surface_matches).length > 0) {
            const surfaces = Object.entries(data.surface_matches)
                .filter(([surface, matches]) => matches > 0)
                .map(([surface, matches]) => {
                    const wins = data.surface_wins?.[surface] || 0;
                    const pct = matches > 0 ? ((wins / matches) * 100).toFixed(0) : 0;
                    return `<span class="surface-tag surface-${surface.toLowerCase()}">${surface}: ${wins}-${matches - wins} (${pct}%)</span>`;
                });
            if (surfaces.length > 0) {
                surfaceGS = `<div class="tooltip-row">${surfaces.join(' ')}</div>`;
            }
        }

        // Unique opponents faced
        const uniqueOpponents = data.unique_opponents ?
            `<div class="tooltip-row"><span class="tooltip-label">Unique Opponents:</span> <span class="tooltip-value">${data.unique_opponents}</span></div>` : '';

        tooltip.innerHTML = `
            <div class="tooltip-header">
                <div class="player-identity">
                    <span class="player-name">${data.name}</span>
                    <span class="active-span">${data.active_span || ''}</span>
                </div>
                <span class="player-country">${data.country}</span>
            </div>
            <div class="tooltip-body">
                <div class="tooltip-row">
                    <span class="tooltip-label">GS Finals Record:</span> 
                    <span class="tooltip-value">${data.matches_won}-${data.matches_played - data.matches_won} (${gsWinPct}%)</span>
                </div>
                ${gsCareerComparison}
                ${gsTitlesBreakdown}
                <div class="tooltip-row">
                    <span class="tooltip-label">Peak Ranking:</span> 
                    <span class="tooltip-value">#${data.peak_ranking || 'N/A'}</span>
                </div>
                ${eliteCompetition}
                ${uniqueOpponents}
                ${surfaceGS}
            </div>
        `;

        this.positionTooltip(tooltip, event);
        tooltip.classList.add('visible');
    }

    /**
     * Show enhanced node tooltip for Wimbledon network
     */
    showWimbledonNodeTooltip(data, event) {
        const slamConfig = this.getSlamConfig('wimbledon');
        this.showSlamNodeTooltip(data, event, slamConfig);
    }

    /**
     * Show enhanced edge tooltip for Wimbledon network
     */
    showWimbledonEdgeTooltip(data, event) {
        const slamConfig = this.getSlamConfig('wimbledon');
        this.showSlamEdgeTooltip(data, event, slamConfig);
    }

    /**
     * Show edge tooltip with H2H info
     */
    showEdgeTooltip(data, event) {
        const tooltip = this.getOrCreateTooltip();

        if (this.isGrandSlamFinals()) {
            this.showGrandSlamFinalsEdgeTooltip(data, event);
            return;
        } else if (this.isWimbledon()) {
            this.showWimbledonEdgeTooltip(data, event);
            return;
        } else if (this.isAustralianOpen()) {
            this.showAustralianOpenEdgeTooltip(data, event);
            return;
        } else if (this.isRolandGarros()) {
            this.showRolandGarrosEdgeTooltip(data, event);
            return;
        } else if (this.isUSOpen()) {
            this.showUSOpenEdgeTooltip(data, event);
            return;
        } else if (this.isTennisRivalries()) {
            this.showTennisRivalriesEdgeTooltip(data, event);
            return;
        }

        // Original tooltip for other networks
        // Surface breakdown
        let surfaceBreakdown = '';
        if (data.surface_breakdown && Object.keys(data.surface_breakdown).length > 0) {
            surfaceBreakdown = Object.entries(data.surface_breakdown)
                .map(([surface, count]) => `<span class="surface-tag surface-${surface.toLowerCase()}">${surface}: ${count}</span>`)
                .join(' ');
        }

        // Tournament breakdown (top 3)
        let tourneyBreakdown = '';
        if (data.tourney_breakdown && Object.keys(data.tourney_breakdown).length > 0) {
            tourneyBreakdown = Object.entries(data.tourney_breakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([t, c]) => `${t}: ${c}`)
                .join(', ');
        }

        tooltip.innerHTML = `
            <div class="tooltip-header edge-header">
                <span class="player-name">${data.player1}</span>
                <span class="vs">vs</span>
                <span class="player-name">${data.player2}</span>
            </div>
            <div class="tooltip-body">
                <div class="tooltip-row h2h-record">
                    <span class="h2h-score">${data.player1_wins}</span>
                    <span class="h2h-separator">-</span>
                    <span class="h2h-score">${data.player2_wins}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Total Matches:</span>
                    <span class="tooltip-value">${data.total_matches}</span>
                </div>
                ${surfaceBreakdown ? `<div class="tooltip-row">${surfaceBreakdown}</div>` : ''}
                ${tourneyBreakdown ? `<div class="tooltip-row"><span class="tooltip-label">Tournaments:</span> ${tourneyBreakdown}</div>` : ''}
            </div>
        `;

        this.positionTooltip(tooltip, event);
        tooltip.classList.add('visible');
    }

    /**
     * Show enhanced edge tooltip for Grand Slam Finals network
     */
    showGrandSlamFinalsEdgeTooltip(data, event) {
        const tooltip = this.getOrCreateTooltip();

        // Total GS Meetings across all slams
        const totalGSMeetings = data.total_matches || 0;

        // Slam-by-slam H2H breakdown
        let slamBreakdown = '';
        if (data.tourney_breakdown && Object.keys(data.tourney_breakdown).length > 0) {
            const slamOrder = ['Australian Open', 'Roland Garros', 'Wimbledon', 'US Open'];
            const slamResults = slamOrder
                .filter(slam => data.tourney_breakdown[slam])
                .map(slam => {
                    const matches = data.tourney_breakdown[slam];
                    // For simplicity, assume player1 wins are tracked, but we may need to calculate
                    // This might need adjustment based on actual data structure
                    return `${slam.split(' ')[0]}: ${matches}`;
                });
            if (slamResults.length > 0) {
                slamBreakdown = `<div class="tooltip-row"><span class="tooltip-label">By Slam:</span> <span class="tooltip-value">${slamResults.join(', ')}</span></div>`;
            }
        }

        // Surface breakdown in GS context
        let surfaceBreakdown = '';
        if (data.surface_breakdown && Object.keys(data.surface_breakdown).length > 0) {
            const surfaces = Object.entries(data.surface_breakdown)
                .map(([surface, count]) => `<span class="surface-tag surface-${surface.toLowerCase()}">${surface}: ${count}</span>`)
                .join(' ');
            surfaceBreakdown = `<div class="tooltip-row">${surfaces}</div>`;
        }

        // Era context - when they met most
        let eraContext = '';
        // This would require additional data processing to determine peak rivalry periods
        // For now, we'll show total meetings

        tooltip.innerHTML = `
            <div class="tooltip-header edge-header">
                <span class="player-name">${data.player1}</span>
                <span class="vs">vs</span>
                <span class="player-name">${data.player2}</span>
            </div>
            <div class="tooltip-body">
                <div class="tooltip-row h2h-record">
                    <span class="h2h-score">${data.player1_wins}</span>
                    <span class="h2h-separator">-</span>
                    <span class="h2h-score">${data.player2_wins}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">GS Meetings:</span>
                    <span class="tooltip-value">${totalGSMeetings} across all slams</span>
                </div>
                ${slamBreakdown}
                ${surfaceBreakdown}
            </div>
        `;

        this.positionTooltip(tooltip, event);
        tooltip.classList.add('visible');
    }

    /**
     * Show enhanced node tooltip for Australian Open network
     */
    showAustralianOpenNodeTooltip(data, event) {
        const slamConfig = this.getSlamConfig('australian_open');
        this.showSlamNodeTooltip(data, event, slamConfig);
    }

    /**
     * Show enhanced edge tooltip for Australian Open network
     */
    showAustralianOpenEdgeTooltip(data, event) {
        const slamConfig = this.getSlamConfig('australian_open');
        this.showSlamEdgeTooltip(data, event, slamConfig);
    }

    /**
     * Show enhanced node tooltip for Roland Garros network
     */
    showRolandGarrosNodeTooltip(data, event) {
        const slamConfig = this.getSlamConfig('roland_garros');
        this.showSlamNodeTooltip(data, event, slamConfig);
    }

    /**
     * Show enhanced edge tooltip for Roland Garros network
     */
    showRolandGarrosEdgeTooltip(data, event) {
        const slamConfig = this.getSlamConfig('roland_garros');
        this.showSlamEdgeTooltip(data, event, slamConfig);
    }

    /**
     * Show enhanced node tooltip for US Open network
     */
    showUSOpenNodeTooltip(data, event) {
        const slamConfig = this.getSlamConfig('us_open');
        this.showSlamNodeTooltip(data, event, slamConfig);
    }

    /**
     * Show enhanced edge tooltip for US Open network
     */
    showUSOpenEdgeTooltip(data, event) {
        const slamConfig = this.getSlamConfig('us_open');
        this.showSlamEdgeTooltip(data, event, slamConfig);
    }

    /**
     * Show enhanced edge tooltip for Tennis Rivalries network
     */
    showTennisRivalriesEdgeTooltip(data, event) {
        const tooltip = this.getOrCreateTooltip();

        // Calculate rivalry intensity score
        const rivalryIntensity = this.calculateRivalryScore(data);

        // Get surface matchups details
        const surfaceDetails = this.getSurfaceMatchupDetails(data);

        // Get era context
        const eraContext = this.getEraContext(data);

        // Determine rivalry narrative
        const rivalryNarrative = this.getRivalryNarrative(data);

        // Surface breakdown with win percentages
        let surfaceBreakdown = '';
        if (data.surface_breakdown && Object.keys(data.surface_breakdown).length > 0) {
            const surfaces = Object.entries(data.surface_breakdown)
                .map(([surface, count]) => `<span class="surface-tag surface-${surface.toLowerCase()}">${surface}: ${count}</span>`)
                .join(' ');
            surfaceBreakdown = `<div class="tooltip-row">${surfaces}</div>`;
        }

        // Tournament breakdown (top 3)
        let tourneyBreakdown = '';
        if (data.tourney_breakdown && Object.keys(data.tourney_breakdown).length > 0) {
            const topTourneys = Object.entries(data.tourney_breakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([t, c]) => `${t}: ${c}`)
                .join(', ');
            tourneyBreakdown = `<div class="tooltip-row"><span class="tooltip-label">Key Tournaments:</span> <span class="tooltip-value">${topTourneys}</span></div>`;
        }

        tooltip.innerHTML = `
            <div class="tooltip-header edge-header">
                <span class="player-name">${data.player1}</span>
                <span class="vs">vs</span>
                <span class="player-name">${data.player2}</span>
            </div>
            <div class="tooltip-body">
                <div class="tooltip-row h2h-record">
                    <span class="h2h-score">${data.player1_wins}</span>
                    <span class="h2h-separator">-</span>
                    <span class="h2h-score">${data.player2_wins}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Total Matches:</span>
                    <span class="tooltip-value">${data.total_matches}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Rivalry Intensity:</span>
                    <span class="tooltip-value rivalry-intensity rivalry-${rivalryIntensity.level}">${rivalryIntensity.label}</span>
                </div>
                ${surfaceBreakdown}
                ${surfaceDetails}
                ${tourneyBreakdown}
                ${eraContext}
                ${rivalryNarrative}
            </div>
        `;

        this.positionTooltip(tooltip, event);
        tooltip.classList.add('visible');
    }

    /**
     * Get or create tooltip element
     */
    getOrCreateTooltip() {
        let tooltip = document.getElementById('network-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'network-tooltip';
            tooltip.className = 'network-tooltip';
            document.body.appendChild(tooltip);
        }
        return tooltip;
    }

    /**
     * Position tooltip near cursor
     */
    positionTooltip(tooltip, event) {
        const padding = 15;
        const rect = tooltip.getBoundingClientRect();

        let x = event.pageX + padding;
        let y = event.pageY + padding;

        // Keep tooltip in viewport
        if (x + rect.width > window.innerWidth) {
            x = event.pageX - rect.width - padding;
        }
        if (y + rect.height > window.innerHeight) {
            y = event.pageY - rect.height - padding;
        }

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById('network-tooltip');
        if (tooltip) {
            tooltip.classList.remove('visible');
        }
    }

    /**
     * Focus on a specific node, dimming others
     */
    focusOnNode(nodeId) {
        const connectedNodes = this.network.getConnectedNodes(nodeId);
        const connectedEdges = this.network.getConnectedEdges(nodeId);

        // Dim all nodes except selected and connected
        const nodeUpdates = [];
        const edgeUpdates = [];

        Object.keys(this.allNodes).forEach(id => {
            if (id === nodeId || connectedNodes.includes(id)) {
                nodeUpdates.push({ id, opacity: 1, font: { color: '#1e293b' } });
            } else {
                nodeUpdates.push({ id, opacity: 0.15, font: { color: '#94a3b8' } });
            }
        });

        Object.keys(this.allEdges).forEach(id => {
            if (connectedEdges.includes(id)) {
                edgeUpdates.push({ id, color: { opacity: 0.8 } });
            } else {
                edgeUpdates.push({ id, color: { opacity: 0.05 } });
            }
        });

        this.nodes.update(nodeUpdates);
        this.edges.update(edgeUpdates);

        // Dispatch event for external listeners
        document.dispatchEvent(new CustomEvent('network:nodeSelected', {
            detail: { nodeId, connectedNodes, data: this.allNodes[nodeId]?.originalData }
        }));
    }

    /**
     * Reset focus to show all nodes
     */
    resetFocus() {
        const nodeUpdates = Object.keys(this.allNodes).map(id => ({
            id,
            opacity: 1,
            font: { color: '#1e293b' }
        }));

        const edgeUpdates = Object.keys(this.allEdges).map(id => ({
            id,
            color: { opacity: 0.6 }
        }));

        this.nodes.update(nodeUpdates);
        this.edges.update(edgeUpdates);

        document.dispatchEvent(new CustomEvent('network:nodeDeselected'));
    }

    /**
     * Get list of connected players and their match counts
     */
    getConnectedRivals(nodeId) {
        const connectedEdges = this.network.getConnectedEdges(nodeId);
        const rivals = [];

        connectedEdges.forEach(edgeId => {
            const edge = this.allEdges[edgeId];
            if (!edge) return;

            const rivalId = edge.from === nodeId ? edge.to : edge.from;
            rivals.push({
                id: rivalId,
                edgeId: edgeId,
                name: this.allNodes[rivalId]?.label || rivalId,
                matches: edge.originalData?.total_matches || 0
            });
        });

        // Sort by match count descending
        return rivals.sort((a, b) => b.matches - a.matches);
    }

    /**
     * Search and highlight a player
     */
    searchPlayer(query) {
        if (!query || query.length < 2) {
            this.resetFocus();
            return [];
        }

        const lowerQuery = query.toLowerCase();
        const matches = [];

        Object.keys(this.allNodes).forEach(id => {
            if (id.toLowerCase().includes(lowerQuery)) {
                matches.push(id);
            }
        });

        if (matches.length === 1) {
            this.focusOnNode(matches[0]);
            this.network.focus(matches[0], { scale: 1.2, animation: true });
        } else if (matches.length > 1) {
            // Highlight all matches
            const nodeUpdates = Object.keys(this.allNodes).map(id => ({
                id,
                opacity: matches.includes(id) ? 1 : 0.2,
                font: { color: matches.includes(id) ? '#1e293b' : '#94a3b8' }
            }));
            this.nodes.update(nodeUpdates);
        }

        return matches;
    }

    /**
     * Filter by Era/Decade using the source-provided 'decade' field
     */
    filterByEra(eras) {
        // Handle both single string and array input
        const eraList = Array.isArray(eras) ? eras : [eras];

        if (eraList.includes('all')) {
            const nodeUpdates = Object.keys(this.allNodes).map(id => ({ id, hidden: false }));
            const edgeUpdates = Object.keys(this.allEdges).map(id => ({ id, hidden: false }));
            this.nodes.update(nodeUpdates);
            this.edges.update(edgeUpdates);
            return;
        }

        const nodeUpdates = [];
        const visibleNodeIds = new Set();
        const eraValues = eraList.map(e => parseInt(e));

        Object.values(this.allNodes).forEach(node => {
            const nodeDecade = node.originalData.decade;
            const isMatch = eraValues.some(val =>
                nodeDecade === val || (val === 2010 && nodeDecade >= 2010)
            );

            nodeUpdates.push({ id: node.id, hidden: !isMatch });
            if (isMatch) visibleNodeIds.add(node.id);
        });

        const edgeUpdates = Object.values(this.allEdges).map(edge => ({
            id: edge.id,
            hidden: !(visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to))
        }));

        this.nodes.update(nodeUpdates);
        this.edges.update(edgeUpdates);
    }

    /**
     * Focus on a specific edge (rivalry)
     */
    focusOnEdge(edgeId) {
        const edge = this.allEdges[edgeId];
        if (!edge) return;

        // Select the nodes and the edge
        this.network.setSelection({
            nodes: [edge.from, edge.to],
            edges: [edgeId]
        }, { unselectOthers: true });

        // Dispatch matchup event
        document.dispatchEvent(new CustomEvent('network:matchupSelected', {
            detail: { edgeId, data: edge.originalData }
        }));
    }

    /**
     * Utility: Darken a hex color
     */
    darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max((num >> 16) - amt, 0);
        const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
        const B = Math.max((num & 0x0000FF) - amt, 0);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }

    /**
     * Utility: Lighten a hex color
     */
    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min((num >> 16) + amt, 255);
        const G = Math.min((num >> 8 & 0x00FF) + amt, 255);
        const B = Math.min((num & 0x0000FF) + amt, 255);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }

    /**
     * Show loading state
     */
    showLoading() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        let loader = container.querySelector('.network-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'network-loader';
            loader.innerHTML = `
                <div class="loader-content">
                    <div class="loader-spinner"></div>
                    <div class="loader-text">Loading network...</div>
                    <div class="loader-progress">0%</div>
                </div>
            `;
            container.appendChild(loader);
        }
        loader.style.display = 'flex';
    }

    /**
     * Update loading progress
     */
    updateLoadingProgress(percent) {
        const progress = document.querySelector('.loader-progress');
        if (progress) {
            progress.textContent = `Stabilizing: ${percent}%`;
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loader = document.querySelector('.network-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    /**
     * Show error state
     */
    showError(message) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="network-error">
                <div class="error-icon">⚠️</div>
                <div class="error-message">Failed to load network</div>
                <div class="error-details">${message}</div>
                <button class="error-retry" onclick="location.reload()">Retry</button>
            </div>
        `;
    }

    /**
     * Get network statistics
     */
    getStats() {
        return {
            nodes: this.rawData?.nodes?.length || 0,
            edges: this.rawData?.edges?.length || 0,
            totalMatches: this.rawData?.metadata?.total_matches || 0,
            ...this.rawData?.metadata
        };
    }

    /**
     * Check if this is the Grand Slam Finals network
     */
    isGrandSlamFinals() {
        return this.config.id === 'gs_finals' || this.config.dataUrl.includes('grand_slam_finals');
    }

    /**
     * Check if this is the Australian Open network
     */
    isAustralianOpen() {
        return this.config.id === 'australian_open' || this.config.dataUrl.includes('australian_open');
    }

    /**
     * Check if this is the Roland Garros network
     */
    isRolandGarros() {
        return this.config.id === 'roland_garros' || this.config.dataUrl.includes('roland_garros');
    }

    /**
     * Check if this is the Wimbledon network
     */
    isWimbledon() {
        return this.config.id === 'wimbledon' || this.config.dataUrl.includes('wimbledon');
    }

    /**
     * Check if this is the US Open network
     */
    isUSOpen() {
        return this.config.id === 'us_open' || this.config.dataUrl.includes('us_open');
    }

    /**
     * Check if this is the Tennis Rivalries network
     */
    isTennisRivalries() {
        return this.config.id === 'tennis_rivalries' || this.config.dataUrl.includes('tennis_rivalries');
    }

    /**
     * Destroy the network and cleanup
     */
    destroy() {
        if (this.network) {
            this.network.destroy();
            this.network = null;
        }
        this.hideTooltip();
    }

    /**
     * Slam configuration for tooltip customization
     */
    getSlamConfig(slamType) {
        const configs = {
            'wimbledon': {
                name: 'Wimbledon',
                surface: 'Grass',
                legacyThresholds: { legend: 3, goat: 5 },
                legacyLabels: { legend: 'Grass Court Legend', goat: 'Wimbledon GOAT Contender' }
            },
            'australian_open': {
                name: 'Australian Open',
                surface: 'Hard',
                legacyThresholds: { legend: 3, goat: 4 },
                legacyLabels: { legend: 'Hard Court Legend', goat: 'Australian GOAT Contender' }
            },
            'roland_garros': {
                name: 'Roland Garros',
                surface: 'Clay',
                legacyThresholds: { legend: 3, goat: 4 },
                legacyLabels: { legend: 'Clay Court Legend', goat: 'French GOAT Contender' }
            },
            'us_open': {
                name: 'US Open',
                surface: 'Hard',
                legacyThresholds: { legend: 3, goat: 4 },
                legacyLabels: { legend: 'Hard Court Legend', goat: 'American GOAT Contender' }
            }
        };
        return configs[slamType];
    }

    /**
     * Generic slam node tooltip method
     */
    showSlamNodeTooltip(data, event, slamConfig) {
        const tooltip = this.getOrCreateTooltip();

        const slamWinPct = data.win_pct?.toFixed(1) || 'N/A';

        // Slam vs Other GS Finals comparison
        let gsComparison = '';
        if (data.career_win_pct && data.win_pct) {
            const estimatedOtherGSWinPct = data.career_win_pct;
            const comparison = `${slamWinPct}% vs ${estimatedOtherGSWinPct.toFixed(1)}%`;
            gsComparison = `<div class="tooltip-row"><span class="tooltip-label">${slamConfig.name} vs Other GS:</span> <span class="tooltip-value">${comparison}</span></div>`;
        }

        // Slam Titles
        const slamTitles = data.tourney_wins?.[slamConfig.name] || 0;
        const slamTitlesDisplay = `<div class="tooltip-row"><span class="tooltip-label">${slamConfig.name} Titles:</span> <span class="tooltip-value ${slamConfig.name.toLowerCase().replace(' ', '-')}-titles">${slamTitles}</span></div>`;

        // Slam Era and Legacy Context
        let legacyContext = '';
        if (slamTitles > 0) {
            if (slamTitles >= slamConfig.legacyThresholds.goat) {
                legacyContext = slamConfig.legacyLabels.goat;
            } else if (slamTitles >= slamConfig.legacyThresholds.legend) {
                legacyContext = slamConfig.legacyLabels.legend;
            } else if (slamTitles === 2) {
                legacyContext = 'Two-Time Champion';
            } else {
                legacyContext = `${slamConfig.name} Champion`;
            }
            legacyContext = `<div class="tooltip-row"><span class="tooltip-label">Legacy:</span> <span class="tooltip-value">${legacyContext}</span></div>`;
        }

        // Career Context
        const careerGSTitles = data.gs_titles || 0;
        const careerContext = `<div class="tooltip-row"><span class="tooltip-label">Career GS Titles:</span> <span class="tooltip-value">${careerGSTitles}</span></div>`;

        tooltip.innerHTML = `
            <div class="tooltip-header">
                <div class="player-identity">
                    <span class="player-name">${data.name}</span>
                    <span class="active-span">${data.active_span || ''}</span>
                </div>
                <span class="player-country">${data.country}</span>
            </div>
            <div class="tooltip-body">
                <div class="tooltip-row">
                    <span class="tooltip-label">${slamConfig.name} Finals:</span> 
                    <span class="tooltip-value">${data.matches_won}-${data.matches_played - data.matches_won} (${slamWinPct}%)</span>
                </div>
                ${gsComparison}
                ${slamTitlesDisplay}
                ${legacyContext}
                <div class="tooltip-row">
                    <span class="tooltip-label">Peak Ranking:</span> 
                    <span class="tooltip-value">#${data.peak_ranking || 'N/A'}</span>
                </div>
                ${careerContext}
            </div>
        `;

        this.positionTooltip(tooltip, event);
        tooltip.classList.add('visible');
    }

    /**
     * Generic slam edge tooltip method
     */
    showSlamEdgeTooltip(data, event, slamConfig) {
        const tooltip = this.getOrCreateTooltip();

        const slamMatches = data.tourney_breakdown?.[slamConfig.name] || 0;

        // Surface-specific rivalry
        let surfaceRivalry = '';
        if (data.surface_breakdown?.[slamConfig.surface]) {
            surfaceRivalry = `<div class="tooltip-row"><span class="tooltip-label">${slamConfig.surface} Court Meetings:</span> <span class="tooltip-value">${data.surface_breakdown[slamConfig.surface]}</span></div>`;
        }

        // Rivalry Intensity
        let rivalryContext = '';
        if (slamMatches > 1) {
            rivalryContext = `<div class="tooltip-row"><span class="tooltip-label">${slamConfig.name} Rivalry:</span> <span class="tooltip-value">${slamMatches > 3 ? 'Intense' : slamMatches > 1 ? 'Frequent' : 'Occasional'}</span></div>`;
        }

        tooltip.innerHTML = `
            <div class="tooltip-header edge-header">
                <span class="player-name">${data.player1}</span>
                <span class="vs">vs</span>
                <span class="player-name">${data.player2}</span>
            </div>
            <div class="tooltip-body">
                <div class="tooltip-row h2h-record">
                    <span class="h2h-score">${data.player1_wins}</span>
                    <span class="h2h-separator">-</span>
                    <span class="h2h-score">${data.player2_wins}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">${slamConfig.name} Finals:</span>
                    <span class="tooltip-value">${slamMatches} meetings</span>
                </div>
                ${surfaceRivalry}
                ${rivalryContext}
            </div>
        `;

        this.positionTooltip(tooltip, event);
        tooltip.classList.add('visible');
    }

    /**
     * Calculate rivalry intensity score
     */
    calculateRivalryScore(data) {
        const totalMatches = data.total_matches || 0;

        if (totalMatches >= 50) return { level: 'legendary', label: 'Legendary Rivalry' };
        if (totalMatches >= 30) return { level: 'intense', label: 'Intense Rivalry' };
        if (totalMatches >= 15) return { level: 'frequent', label: 'Frequent Rivals' };
        if (totalMatches >= 5) return { level: 'regular', label: 'Regular Opponents' };
        return { level: 'occasional', label: 'Occasional Meetings' };
    }

    /**
     * Get surface matchup details with win percentages
     */
    getSurfaceMatchupDetails(data) {
        if (!data.surface_breakdown || !data.surface_wins_breakdown) return '';

        const surfaces = Object.keys(data.surface_breakdown).filter(surface => data.surface_breakdown[surface] > 0);
        if (surfaces.length === 0) return '';

        const surfaceDetails = surfaces.map(surface => {
            const matches = data.surface_breakdown[surface];
            const wins = data.surface_wins_breakdown?.[surface] || 0;
            const losses = matches - wins;
            const winPct = matches > 0 ? ((wins / matches) * 100).toFixed(0) : 0;
            return `<span class="surface-tag surface-${surface.toLowerCase()}">${surface}: ${wins}-${losses} (${winPct}%)</span>`;
        }).join(' ');

        return `<div class="tooltip-row">${surfaceDetails}</div>`;
    }

    /**
     * Get era context for the rivalry
     */
    getEraContext(data) {
        // This would require era data in the dataset
        // For now, return empty or basic context
        if (data.peak_rivalry_years) {
            const years = data.peak_rivalry_years;
            return `<div class="tooltip-row"><span class="tooltip-label">Peak Years:</span> <span class="tooltip-value">${years.start}-${years.end}</span></div>`;
        }
        return '';
    }

    /**
     * Get rivalry narrative based on famous matchups
     */
    getRivalryNarrative(data) {
        const totalMatches = data.total_matches || 0;
        const player1Wins = data.player1_wins || 0;
        const player2Wins = data.player2_wins || 0;

        // Famous rivalries recognition
        const famousRivalries = {
            'Roger Federer_vs_Rafael Nadal': 'Federer-Nadal: The GOAT Debate',
            'Rafael Nadal_vs_Roger Federer': 'Nadal-Federer: The GOAT Debate',
            'Roger Federer_vs_Novak Djokovic': 'Federer-Djokovic: Big 3 Era',
            'Novak Djokovic_vs_Roger Federer': 'Djokovic-Federer: Big 3 Era',
            'Rafael Nadal_vs_Novak Djokovic': 'Nadal-Djokovic: Clay vs All-Court',
            'Novak Djokovic_vs_Rafael Nadal': 'Djokovic-Nadal: Clay vs All-Court',
            'Borg_vs_McEnroe': 'Borg-McEnroe: Ice Man vs Superbrat',
            'McEnroe_vs_Borg': 'McEnroe-Borg: Ice Man vs Superbrat',
            'Sampras_vs_Agassi': 'Sampras-Agassi: Power vs Athleticism',
            'Agassi_vs_Sampras': 'Agassi-Sampras: Power vs Athleticism'
        };

        const rivalryKey = `${data.player1}_vs_${data.player2}`;
        if (famousRivalries[rivalryKey]) {
            return `<div class="tooltip-row"><span class="tooltip-label">Notable Rivalry:</span> <span class="tooltip-value rivalry-famous">${famousRivalries[rivalryKey]}</span></div>`;
        }

        // One-sided rivalries
        const winDiff = Math.abs(player1Wins - player2Wins);
        if (totalMatches >= 10 && winDiff >= totalMatches * 0.7) {
            const dominant = player1Wins > player2Wins ? data.player1 : data.player2;
            const underdog = player1Wins > player2Wins ? data.player2 : data.player1;
            return `<div class="tooltip-row"><span class="tooltip-label">Rivalry Dynamic:</span> <span class="tooltip-value">${dominant} dominated ${underdog}</span></div>`;
        }

        // Balanced rivalries
        if (totalMatches >= 10 && winDiff <= 2) {
            return `<div class="tooltip-row"><span class="tooltip-label">Rivalry Dynamic:</span> <span class="tooltip-value">Highly competitive</span></div>`;
        }

        return '';
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TennisNetworkGraph;
}
