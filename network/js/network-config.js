/**
 * Network Graph Configuration
 * Config-driven architecture - add new networks by adding config entries
 */

const DATA_BASE_URL = 'https://raw.githubusercontent.com/sorukumar/tml-data/main/data/network';

// Color palettes for win percentage categories
const WIN_PCT_COLORS = {
    'Above 70%': '#FFD700',      // Gold - Champions
    '61% - 70%': '#33a02c',      // Green - Strong winners
    '51% - 60%': '#1f78b4',      // Blue - Competitive
    '41% - 50%': '#ff7f00',      // Orange - Even
    '40% or below': '#e31a1c'    // Red - Losing record
};

// Surface colors
const SURFACE_COLORS = {
    'Hard': '#3498db',
    'Clay': '#e67e22',
    'Grass': '#27ae60',
    'Carpet': '#9b59b6'
};

// Network dataset configurations
const NETWORK_CONFIGS = {
    gs_finals: {
        id: 'gs_finals',
        title: 'Grand Slam Finals Network',
        subtitle: 'Every GS finalist since 1968 and their connections',
        dataUrl: `${DATA_BASE_URL}/grand_slam_finals_1968.json`,
        description: 'Players who reached Grand Slam finals since 1968. Node size = matches played, color = win percentage.',
        nodeConfig: {
            sizeField: 'matches_played',
            sizeRange: [15, 50],
            colorField: 'win_pct_category',
            colorPalette: WIN_PCT_COLORS,
            labelField: 'name'
        },
        edgeConfig: {
            widthField: 'total_matches',
            widthRange: [1, 10],
            color: '#94a3b8',
            hoverColor: '#f59e0b'
        },
        physics: {
            gravitationalConstant: -3000,
            centralGravity: 0.5,
            springLength: 200,
            springConstant: 0.05,
            damping: 0.15,
            avoidOverlap: 0.5
        },
        defaultView: true
    },
    
    tennis_rivalries: {
        id: 'tennis_rivalries',
        title: 'Tennis Rivalries Network',
        subtitle: 'High-volume players (100+ matches) since 1968',
        dataUrl: `${DATA_BASE_URL}/tennis_legends_rivalries_1968.json`,
        description: 'Players with 100+ ATP matches since 1968. Explore the web of professional tennis rivalries.',
        nodeConfig: {
            sizeField: 'matches_played',
            sizeRange: [8, 40],
            colorField: 'win_pct_category',
            colorPalette: WIN_PCT_COLORS,
            labelField: 'name'
        },
        edgeConfig: {
            widthField: 'total_matches',
            widthRange: [0.5, 8],
            color: '#cbd5e1',
            hoverColor: '#f59e0b'
        },
        physics: {
            gravitationalConstant: -8000,
            centralGravity: 0.3,
            springLength: 250,
            springConstant: 0.02,
            damping: 0.2,
            avoidOverlap: 0.3
        },
        defaultView: false
    },

    // Individual Grand Slams
    australian_open: {
        id: 'australian_open',
        title: 'Australian Open Finals',
        subtitle: 'Melbourne champions and finalists since 1968',
        dataUrl: `${DATA_BASE_URL}/australian_open_finals_1968.json`,
        description: 'Australian Open finalists network.',
        nodeConfig: {
            sizeField: 'matches_played',
            sizeRange: [12, 45],
            colorField: 'win_pct_category',
            colorPalette: WIN_PCT_COLORS,
            labelField: 'name'
        },
        edgeConfig: {
            widthField: 'total_matches',
            widthRange: [1, 8],
            color: '#60a5fa',
            hoverColor: '#f59e0b'
        },
        physics: {
            gravitationalConstant: -2500,
            centralGravity: 0.6,
            springLength: 180,
            springConstant: 0.04,
            damping: 0.15,
            avoidOverlap: 0.4
        }
    },

    roland_garros: {
        id: 'roland_garros',
        title: 'Roland Garros Finals',
        subtitle: 'Paris champions and finalists since 1968',
        dataUrl: `${DATA_BASE_URL}/roland_garros_finals_1968.json`,
        description: 'Roland Garros finalists network.',
        nodeConfig: {
            sizeField: 'matches_played',
            sizeRange: [12, 45],
            colorField: 'win_pct_category',
            colorPalette: WIN_PCT_COLORS,
            labelField: 'name'
        },
        edgeConfig: {
            widthField: 'total_matches',
            widthRange: [1, 8],
            color: '#c2410c',
            hoverColor: '#fbbf24'
        },
        physics: {
            gravitationalConstant: -2500,
            centralGravity: 0.6,
            springLength: 180,
            springConstant: 0.04,
            damping: 0.15,
            avoidOverlap: 0.4
        }
    },

    wimbledon: {
        id: 'wimbledon',
        title: 'Wimbledon Finals',
        subtitle: 'All England Club champions and finalists since 1968',
        dataUrl: `${DATA_BASE_URL}/wimbledon_finals_1968.json`,
        description: 'Wimbledon finalists network.',
        nodeConfig: {
            sizeField: 'matches_played',
            sizeRange: [12, 45],
            colorField: 'win_pct_category',
            colorPalette: WIN_PCT_COLORS,
            labelField: 'name'
        },
        edgeConfig: {
            widthField: 'total_matches',
            widthRange: [1, 8],
            color: '#15803d',
            hoverColor: '#fbbf24'
        },
        physics: {
            gravitationalConstant: -2500,
            centralGravity: 0.6,
            springLength: 180,
            springConstant: 0.04,
            damping: 0.15,
            avoidOverlap: 0.4
        }
    },

    us_open: {
        id: 'us_open',
        title: 'US Open Finals',
        subtitle: 'Flushing Meadows champions and finalists since 1968',
        dataUrl: `${DATA_BASE_URL}/us_open_finals_1968.json`,
        description: 'US Open finalists network.',
        nodeConfig: {
            sizeField: 'matches_played',
            sizeRange: [12, 45],
            colorField: 'win_pct_category',
            colorPalette: WIN_PCT_COLORS,
            labelField: 'name'
        },
        edgeConfig: {
            widthField: 'total_matches',
            widthRange: [1, 8],
            color: '#1d4ed8',
            hoverColor: '#fbbf24'
        },
        physics: {
            gravitationalConstant: -2500,
            centralGravity: 0.6,
            springLength: 180,
            springConstant: 0.04,
            damping: 0.15,
            avoidOverlap: 0.4
        }
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NETWORK_CONFIGS, WIN_PCT_COLORS, SURFACE_COLORS, DATA_BASE_URL };
}
