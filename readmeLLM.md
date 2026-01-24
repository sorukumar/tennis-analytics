# tennis-analytics Project Guide for LLMs

## Project Context
`tennis-analytics` is an open-source platform hosting interactive data visualizations or "data stories" about professional tennis. It leverages Python for data processing (often in a sister repo `tml-data`) and D3.js/ECharts for frontend storytelling.

## Project Overview
This project focuses on creating interactive visualizations for tennis data analysis. The primary goal is to create engaging visual representations of tennis statistics and patterns with enhanced user experience and social sharing capabilities.

## Project Structure
The project follows a visualization-centric organizational pattern with modern web components:

### Main Folders and Their Purposes
- `viz/`: Primary visualization output folder
  - Contains standalone HTML visualizations
  - Naming pattern: [Tournament]_[Year].html for tournament-specific views
  - viz.css provides consistent styling across visualizations

- Player/Topic Specific Folders (e.g. `bigthree/`, `stantheman/`, `nbi/`):
  - Standard structure for topic-focused visualizations:
    - index.html: Entry point and visualization container
    - data/: CSV files specific to the analysis
    - js/: Visualization scripts
    - Custom CSS for topic-specific styling

- `components/`: Reusable website components
  - header.html, footer.html: Common page elements
  - include.js: Handles component inclusion and path management
  - social-share.js: Custom web component for social media sharing

### New Features and Components

1. **Social Sharing System**:
   - Custom `<social-share>` web component providing floating action button (FAB)
   - Supports Twitter/X, LinkedIn, Facebook, and Reddit sharing
   - Automatically extracts Open Graph and Twitter meta tags for rich sharing
   - Responsive design with mobile-optimized positioning
   - Consistent styling across all pages

2. **Enhanced Meta Tag Support**:
   - All pages now include comprehensive Open Graph meta tags
   - Twitter Card meta tags for rich social media previews
   - Page-specific titles and descriptions for better SEO
   - Consistent social media image (claytennis.jpeg)

3. **Improved Navigation and UX**:
   - Sticky navigation with active page highlighting
   - Responsive design optimizations
   - Enhanced footer with social links
   - Tennis-themed cursor and click animations
   - Floating action button for social sharing

### Visualization Types and Patterns

1. Network Visualizations (see viz/tennis_network_200Match.html):
   - Player relationship networks
   - Interactive tooltips with match statistics
   - Color coding for performance metrics
   - Uses Pyvis for network generation

2. Statistical Visualizations (see stantheman/js/):
   - Timeline charts (gs_timeline_chart.js)
   - Distribution analysis (gs_age_distribution_chart.js)
   - Breakthrough analysis (gs_breakthrough_chart.js)
   - Built with D3.js for custom interactivity

3. Tournament Analysis (see viz/Grand_Slam_Finals_*.html):
   - Tournament-specific visualizations
   - Match outcome networks
   - Historical progression views

4. **Advanced Analytics** (new):
   - Nail-Biting Index (NBI) for match drama quantification
   - Data tables with interactive filtering and tooltips
   - Professional tennis career analysis visualizations

### Adding New Visualizations

1. For a New Topic/Player Analysis:
   ```
   new_analysis/
   ├── index.html          # Main visualization page
   ├── analysis.css        # Topic-specific styles
   ├── data/              # Topic data files
   │   └── statistics.csv
   └── js/               # Visualization scripts
       └── charts.js
   ```

2. For Tournament/Match Analysis:
   - Add visualization HTML directly to viz/ folder
   - Follow existing naming patterns
   - Use viz.css for styling

### Enhanced Code Patterns

1. **Social Sharing Component**:
   ```javascript
   // Include in any page for social sharing
   <script src="../components/social-share.js"></script>
   // Add component to page
   <social-share></social-share>
   ```

2. **Meta Tags Template**:
   ```html
   <!-- Open Graph meta tags -->
   <meta property="og:title" content="Page Title">
   <meta property="og:description" content="Page description">
   <meta property="og:type" content="article">
   <meta property="og:url" content="https://sorukumar.github.io/tennis-analytics/page/">
   <meta property="og:image" content="https://sorukumar.github.io/tennis-analytics/image/claytennis.jpeg">
   
   <!-- Twitter meta tags -->
   <meta name="twitter:card" content="summary_large_image">
   <meta name="twitter:title" content="Page Title">
   <meta name="twitter:description" content="Page description">
   <meta name="twitter:image" content="https://sorukumar.github.io/tennis-analytics/image/claytennis.jpeg">
   ```

3. D3.js Charts:
   ```javascript
   function createChart() {
       // Set dimensions and margins
       const margin = {top: 20, right: 20, bottom: 30, left: 40};
       const width = 960 - margin.left - margin.right;
       const height = 500 - margin.top - margin.bottom;

       // Create SVG container
       const svg = d3.select("#chart")
           .append("svg")
           .attr("width", width + margin.left + margin.right)
           .attr("height", height + margin.top + margin.bottom);

       // Add visualization elements
       // Add interactivity
   }
   ```

4. Tooltip Pattern:
   ```javascript
   // Standard tooltip configuration
   const tooltip = d3.select("#shared-tooltip");
   
   element.on("mouseover", function(event, d) {
       tooltip.transition()
           .duration(200)
           .style("opacity", .9);
       tooltip.html(/* tooltip content */)
           .style("left", (event.pageX + 10) + "px")
           .style("top", (event.pageY - 28) + "px");
   });
   ```

### Styling Guidelines
- Primary color: #1e5631 (tennis court green)
- Accent color: #f9c74f (tennis ball yellow)
- Chart container styling from viz.css:
  ```css
  .chart-container {
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 30px;
    box-shadow: var(--shadow-soft);
  }
  ```
- Fonts: Playfair Display (headings), Montserrat (body)
- Responsive design breakpoints in CSS
- Social share FAB positioned fixed bottom-right

### Component Integration
- All pages use include.js for consistent header/footer
- Social sharing component integrated across all major pages
- Responsive navigation with active state management
- Tennis-themed animations and cursors for enhanced UX

## Recent Improvements

1. **Social Media Integration**: Complete social sharing system with custom web component
2. **SEO Enhancement**: Comprehensive meta tag implementation for better social media sharing
3. **User Experience**: Tennis-themed interactions, improved navigation, and responsive design
4. **Analytics Features**: Advanced match analysis tools like the Nail-Biting Index
5. **Component Architecture**: Reusable web components for consistent functionality

## Adding New Analysis
1. Create new folder following structure above
2. Copy existing visualization patterns from similar analyses
3. Include social sharing component and proper meta tags
4. Ensure responsive design and consistent styling
5. Link from index.html if main navigation item

## Common Modifications
1. New Visualizations:
   - Create new JS files in appropriate js/ folder
   - Add HTML container in index.html
   - Apply standard styling patterns
   - Include social sharing component

2. Updating Visualizations:
   - Modify relevant JS files in visualization folder
   - Update HTML if changing layout/structure
   - Maintain consistent styling and social sharing

3. Styling Updates:
   - Global changes in tennis_analytics.css
   - Topic-specific in local CSS files
   - Social share styles in main CSS

## Dependencies
- D3.js for custom visualizations
- Pyvis for network visualizations
- Custom CSS for styling
- Font Awesome for icons
- Bootstrap (for some components like tooltips)
- Custom web components (social-share)

## Social Sharing
- Automatic extraction of page metadata
- Support for major social platforms
- Mobile-optimized floating action button
- Consistent branding across shared content

Note: Data processing and analysis code in the code/ folder is for reference only - new visualizations should work with pre-processed data provided in data/ folders.