# FlowchartJS

A lightweight, themeable, and interactive flowchart library for the modern web. Built with vanilla JS and CSS, designed to be dead simple to use.

![Usage Example](./docs/playground_preview.png)

## Features
- **Mermaid-compatible Syntax**: Define graphs using familiar text syntax.
- **Theming**: Built-in Light and Dark modes with high contract readability.
- **High Performance**: SVG-based rendering with smooth animations.
- **Interactive**: Collapsible branches and zoom/pan support.
- **Advanced Styling**: Rich support for link styles, node classes, and curve types.
- **Zero Dependencies**: Pure Vanilla JS and CSS.

## Installation

### CDN
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Mrithul-E/FlowchartJS/docs/dist/flowchart.css">
<script src="https://cdn.jsdelivr.net/gh/Mrithul-E/FlowchartJS/docs/dist/flowchart.js"></script>
```

### Local Manual Installation
Download the files from the `docs/dist/` folder and include them in your project:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Mrithul-E/FlowchartJS/docs/dist/flowchart.css">
<script src="https://cdn.jsdelivr.net/gh/Mrithul-E/FlowchartJS/docs/dist/flowchart.js"></script>
```

## Quick Start (Local)        

1. **Include the files**:
   ```html
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Mrithul-E/FlowchartJS/docs/dist/flowchart.css">
   <script src="https://cdn.jsdelivr.net/gh/Mrithul-E/FlowchartJS/docs/dist/flowchart.js"></script>
   ```

2. **Create a container**:
   ```html
   <div id="my-chart" style="width: 100%; height: 600px;"></div>
   ```

3. **Initialize the chart**:
   ```javascript
   const chart = new FlowChart('my-chart', {
       theme: 'light',      // 'light' or 'dark'
       interactive: true,   // Enable interactivity
       layout: {
           nodeWidth: 140,
           nodeHeight: 50
       }
   });

   // Render your graph
   chart.render(`
   graph TD
     Start[Start] --> Decision{Is it easy?}
     Decision -->|Yes| End[Done]
     Decision -->|No| Retry[Try Again]
     Retry --> Decision

     style Start fill:#f9f,stroke:#333,stroke-width:2px
     classDef action fill:#00bf7d,color:#fff,stroke:#004d32
     class End action
     linkStyle default stroke-width:2px,curve:bezier
   `);
   ```

## Configuration API

```javascript
new FlowChart(containerId, options)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `theme` | string | `'light'` | Theme of the chart ('light' / 'dark'). |
| `interactive` | boolean | `true` | Enable pan/zoom and collapsible nodes. |
| `layout.nodeWidth` | number | `140` | Default width of nodes. |
| `layout.nodeHeight` | number | `50` | Default height of nodes. |

## Methods

- `render(input: string)`: Renders the chart from the given text input.
- `setTheme(theme: string)`: Switches the theme dynamically ('light' or 'dark').
- `exportImage()`: Exports the current view as a PNG image.

## License
MIT
