class FlowChart {
    constructor(containerId, config = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`FlowChart: Container with id '${containerId}' not found.`);
            return;
        }
        this.container.classList.add('flowchart-container');

        // Default Config
        this.config = Object.assign({
            theme: 'light', // 'light' or 'dark'
            interactive: true,
            layout: {
                nodeWidth: 140,
                nodeHeight: 50,
                levelSeparation: 100,
                siblingSeparation: 160
            }
        }, config);

        this.data = { nodes: {}, edges: [], direction: 'TD' };
        this.root = null;

        // Use config for dimensions
        this.nodeWidth = this.config.layout.nodeWidth;
        this.nodeHeight = this.config.layout.nodeHeight;
        this.levelSeparation = this.config.layout.levelSeparation;
        this.siblingSeparation = this.config.layout.siblingSeparation;

        this.svg = null;
        this.g = null;

        // Apply theme
        this.setTheme(this.config.theme);

        this.initSVG();
    }

    setTheme(theme) {
        this.config.theme = theme;
        this.container.setAttribute('data-theme', theme);
    }

    initSVG() {
        this.container.innerHTML = '';
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.g.classList.add('zoom-layer');
        this.svg.appendChild(this.g);
        this.container.appendChild(this.svg);

        // SVG Arrow Marker
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '5');
        marker.setAttribute('markerWidth', '6');
        marker.setAttribute('markerHeight', '6');
        marker.setAttribute('orient', 'auto');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        path.setAttribute('class', 'arrowhead-path'); // CSS handles fill

        marker.appendChild(path);
        defs.appendChild(marker);
        this.svg.appendChild(defs);

        // Add zoom controls
        if (this.config.interactive) {
            this.createZoomControls();
            this.setupInteractions();
        }
    }

    createZoomControls() {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'flowchart-zoom-controls';

        const zoomIn = document.createElement('button');
        zoomIn.className = 'flowchart-zoom-btn';
        zoomIn.innerHTML = '+';
        zoomIn.title = 'Zoom In';
        zoomIn.addEventListener('click', () => this.zoomIn());

        const zoomOut = document.createElement('button');
        zoomOut.className = 'flowchart-zoom-btn';
        zoomOut.innerHTML = '−';
        zoomOut.title = 'Zoom Out';
        zoomOut.addEventListener('click', () => this.zoomOut());

        const zoomReset = document.createElement('button');
        zoomReset.className = 'flowchart-zoom-btn';
        zoomReset.innerHTML = '⟲';
        zoomReset.title = 'Reset View';
        zoomReset.addEventListener('click', () => this.resetZoom());

        controlsContainer.appendChild(zoomIn);
        controlsContainer.appendChild(zoomOut);
        controlsContainer.appendChild(zoomReset);

        this.container.style.position = 'relative';
        this.container.appendChild(controlsContainer);
    }

    zoomIn() {
        if (this.transform) {
            this.transform.scale = Math.min(this.transform.scale * 1.2, 3);
            this.updateTransform(this.transform);
        }
    }

    zoomOut() {
        if (this.transform) {
            this.transform.scale = Math.max(this.transform.scale / 1.2, 0.3);
            this.updateTransform(this.transform);
        }
    }

    resetZoom() {
        if (this.transform) {
            this.transform.scale = 1;
            this.transform.x = this.container.clientWidth / 2;
            this.transform.y = 50;
            this.updateTransform(this.transform);
        }
    }

    setupInteractions() {
        let isPanning = false;
        let startX = 0, startY = 0;
        let transform = { x: 0, y: 0, scale: 1 };

        // Mouse events for desktop
        this.svg.addEventListener('mousedown', (e) => {
            if (e.target.closest('.node-group')) return;
            isPanning = true;
            startX = e.clientX - transform.x;
            startY = e.clientY - transform.y;
            this.svg.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            transform.x = e.clientX - startX;
            transform.y = e.clientY - startY;
            this.updateTransform(transform);
        });

        window.addEventListener('mouseup', () => {
            isPanning = false;
            this.svg.style.cursor = 'default';
        });

        // Touch events for mobile
        this.svg.addEventListener('touchstart', (e) => {
            if (e.target.closest('.node-group')) return;
            if (e.touches.length === 1) {
                isPanning = true;
                startX = e.touches[0].clientX - transform.x;
                startY = e.touches[0].clientY - transform.y;
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (!isPanning || e.touches.length !== 1) return;
            transform.x = e.touches[0].clientX - startX;
            transform.y = e.touches[0].clientY - startY;
            this.updateTransform(transform);
        }, { passive: true });

        window.addEventListener('touchend', () => {
            isPanning = false;
        });

        // Center initially
        transform.x = this.container.clientWidth / 2;
        transform.y = 50;
        this.updateTransform(transform);
        this.transform = transform;
    }

    updateTransform(t) {
        this.g.setAttribute('transform', `translate(${t.x}, ${t.y}) scale(${t.scale})`);
    }

    calculateDimensions() {
        let maxW = this.config.layout.nodeWidth;
        let maxH = this.config.layout.nodeHeight;

        const charWidth = 8;
        const lineHeight = 20;
        const padding = 20;
        const maxCharsPerLine = 20;

        Object.values(this.data.nodes).forEach(node => {
            const words = node.label.split(' ');
            let lines = [];
            let currentLine = words[0];

            for (let i = 1; i < words.length; i++) {
                if (currentLine.length + 1 + words[i].length <= maxCharsPerLine) {
                    currentLine += ' ' + words[i];
                } else {
                    lines.push(currentLine);
                    currentLine = words[i];
                }
            }
            lines.push(currentLine);
            node.lines = lines;

            const longestLineChars = Math.max(...lines.map(l => l.length));
            const w = longestLineChars * charWidth + padding * 2;
            const h = lines.length * lineHeight + padding * 2;

            if (w > maxW) maxW = w;
            if (h > maxH) maxH = h;
        });

        this.nodeWidth = maxW;
        this.nodeHeight = maxH;
        this.levelSeparation = this.nodeHeight + 60;
        this.siblingSeparation = this.nodeWidth + 40;
    }

    render(input) {
        const newData = this.parseGraph(input);
        Object.keys(newData.nodes).forEach(id => {
            if (this.data.nodes[id]) {
                newData.nodes[id].collapsed = this.data.nodes[id].collapsed;
            }
        });

        this.data = newData;
        this.calculateDimensions();
        this.computeLayout();
        this.draw();
    }

    parseGraph(input) {
        const nodes = {};
        const edges = [];
        let direction = 'TD';
        const lines = input.split('\n');

        lines.forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('%%')) return;

            if (line.match(/^(graph|flowchart)\s+(TD|TB|BT|LR|RL)/i)) {
                const match = line.match(/^(graph|flowchart)\s+(TD|TB|BT|LR|RL)/i);
                direction = match[2].toUpperCase();
                return;
            }

            const edgeRegex = /\s*(-{2,}>|-{3}|-\.-+>|={2,}>)\s*/;
            const parts = line.split(edgeRegex);

            if (parts.length >= 3) {
                let sourceNode = this.parseNodeString(parts[0]);
                if (!nodes[sourceNode.id]) nodes[sourceNode.id] = sourceNode;
                else this.mergeNodeInfo(nodes[sourceNode.id], sourceNode);

                for (let i = 1; i < parts.length; i += 2) {
                    const op = parts[i];
                    const targetStr = parts[i + 1];
                    let label = '';
                    let cleanTargetStr = targetStr;
                    const labelMatch = targetStr.match(/^\|(.+?)\|\s*(.*)/);
                    if (labelMatch) {
                        label = labelMatch[1];
                        cleanTargetStr = labelMatch[2];
                    }

                    const targetNode = this.parseNodeString(cleanTargetStr);
                    if (!nodes[targetNode.id]) nodes[targetNode.id] = targetNode;
                    else this.mergeNodeInfo(nodes[targetNode.id], targetNode);

                    let type = 'arrow';
                    if (op.includes('-.->')) type = 'dotted';
                    else if (op.includes('==>')) type = 'thick';
                    else if (op.includes('---')) type = 'open';

                    edges.push({ from: sourceNode.id, to: targetNode.id, type, label });

                    if (!nodes[sourceNode.id].children) nodes[sourceNode.id].children = [];
                    nodes[sourceNode.id].children.push(targetNode.id);

                    if (!nodes[targetNode.id].parents) nodes[targetNode.id].parents = [];
                    nodes[targetNode.id].parents.push(sourceNode.id);

                    sourceNode = targetNode;
                }
            } else {
                const node = this.parseNodeString(line);
                if (!nodes[node.id]) nodes[node.id] = node;
                else this.mergeNodeInfo(nodes[node.id], node);
            }
        });

        let roots = Object.values(nodes).filter(n => !n.parents || n.parents.length === 0);
        if (roots.length === 0 && Object.keys(nodes).length > 0) {
            roots = [Object.values(nodes)[0]];
        }
        this.root = roots.length > 0 ? roots[0] : null;

        return { nodes, edges, direction };
    }

    mergeNodeInfo(existing, parsed) {
        if (parsed.label && parsed.label !== parsed.id) existing.label = parsed.label;
        if (parsed.shape !== 'rect') existing.shape = parsed.shape;
    }

    parseNodeString(str) {
        str = str.trim();
        let id = str;
        let label = str;
        let shape = 'rect';

        const shapes = [
            { regex: /^([^\s\[]+)\[\[(.+)\]\]$/, type: 'subroutine' },
            { regex: /^([^\s\[]+)\[\((.+)\)\]$/, type: 'cylinder' },
            { regex: /^([^\s\[]+)\(\((.+)\)\)$/, type: 'circle' },
            { regex: /^([^\s\[]+)\(\[(.+)\]\)$/, type: 'stadium' },
            { regex: /^([^\s\[]+)\{\{(.+)\}\}$/, type: 'hexagon' },
            { regex: /^([^\s\[]+)\[\/(.+)\/\]$/, type: 'parallelogram' },
            { regex: /^([^\s\[]+)\[\\(.+)\\\]$/, type: 'parallelogram_alt' },
            { regex: /^([^\s\[]+)\[\/(.+)\\\]$/, type: 'trapezoid' },
            { regex: /^([^\s\[]+)\[\\(.+)\/\]$/, type: 'trapezoid_alt' },
            { regex: /^([^\s\[]+)\{(.+)\}$/, type: 'rhombus' },
            { regex: /^([^\s\[]+)\((.+)\)$/, type: 'round' },
            { regex: /^([^\s\[]+)\[(.+)\]$/, type: 'rect' }
        ];

        for (let s of shapes) {
            const match = str.match(s.regex);
            if (match) {
                id = match[1];
                label = match[2];
                shape = s.type;
                break;
            }
        }

        return {
            id, label, shape, collapsed: false, x: 0, y: 0, children: [], parents: [], visible: false
        };
    }

    computeLayout() {
        Object.values(this.data.nodes).forEach(n => n.visible = false);
        if (!this.root) return;

        const levels = {};
        const queue = [{ id: this.root.id, level: 0 }];
        const visited = new Set();

        while (queue.length > 0) {
            const { id, level } = queue.shift();
            if (visited.has(id)) continue;
            visited.add(id);

            const node = this.data.nodes[id];
            node.visible = true;

            if (!levels[level]) levels[level] = [];
            levels[level].push(id);

            if (!node.collapsed && node.children) {
                node.children.forEach(childId => {
                    queue.push({ id: childId, level: level + 1 });
                });
            }
        }

        const isHorizontal = this.data.direction === 'LR' || this.data.direction === 'RL';

        Object.keys(levels).forEach(level => {
            const levelNodes = levels[level];
            let levelSep, siblingSep;

            if (isHorizontal) {
                levelSep = this.nodeWidth + 80;
                siblingSep = this.nodeHeight + 40;
            } else {
                levelSep = this.nodeHeight + 80;
                siblingSep = this.nodeWidth + 40;
            }

            const levelCoord = level * levelSep;
            const totalSiblingsWidth = levelNodes.length * siblingSep;
            let startSiblingCoord = -(totalSiblingsWidth / 2) + (siblingSep / 2);

            levelNodes.forEach((nodeId, index) => {
                const node = this.data.nodes[nodeId];
                const siblingCoord = startSiblingCoord + (index * siblingSep);

                if (isHorizontal) {
                    node.x = levelCoord;
                    node.y = siblingCoord;
                } else {
                    node.x = siblingCoord;
                    node.y = levelCoord;
                }
            });
        });
    }

    draw() {
        const currentNodes = new Set();
        const currentEdges = new Set();

        this.data.edges.forEach(edge => {
            const source = this.data.nodes[edge.from];
            const target = this.data.nodes[edge.to];

            if (source.visible && target.visible) {
                const edgeId = `edge-${edge.from}-${edge.to}`;
                currentEdges.add(edgeId);
                this.drawEdge(edge, source, target, edgeId);
            }
        });

        Object.values(this.data.nodes).forEach(node => {
            if (node.visible) {
                const nodeId = `node-${node.id}`;
                currentNodes.add(nodeId);
                this.drawNode(node, nodeId);
            }
        });

        Array.from(this.g.children).forEach(child => {
            const id = child.getAttribute('data-id');
            if (id && id.startsWith('node-') && !currentNodes.has(id)) {
                this.animateExit(child);
            } else if (id && id.startsWith('edge-') && !currentEdges.has(id)) {
                this.animateExit(child);
            }
        });
    }

    animateExit(element) {
        element.style.opacity = '0';
        setTimeout(() => {
            if (element.parentNode) element.parentNode.removeChild(element);
        }, 300);
    }

    drawNode(node, id) {
        let group = this.g.querySelector(`g[data-id="${id}"]`);
        const isNew = !group;

        if (isNew) {
            group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('data-id', id);
            group.setAttribute('class', 'node-group');
            group.style.opacity = '0';
            group.setAttribute('transform', `translate(${node.x}, ${node.y})`);

            if (this.config.interactive) {
                group.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (node.children && node.children.length > 0) {
                        node.collapsed = !node.collapsed;
                        this.computeLayout();
                        this.draw();
                    }
                });
            }

            this.g.appendChild(group);
            requestAnimationFrame(() => group.style.opacity = '1');
        } else {
            group.style.transform = `translate(${node.x}px, ${node.y}px)`;
        }

        group.innerHTML = '';

        const shapePath = this.getShapePath(node.shape, this.nodeWidth, this.nodeHeight);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', shapePath);
        path.setAttribute('class', 'node-shape');
        group.appendChild(path);

        const isHorizontal = this.data.direction === 'LR' || this.data.direction === 'RL';
        const dotRadius = 3;
        const dots = [];
        if (isHorizontal) {
            if ((node.parents && node.parents.length > 0) || (node.id !== this.root?.id)) {
                dots.push({ x: -this.nodeWidth / 2, y: 0 });
            }
            if (node.children && node.children.length > 0) {
                dots.push({ x: this.nodeWidth / 2, y: 0 });
            }
        } else {
            if ((node.parents && node.parents.length > 0) || (node.id !== this.root?.id)) {
                dots.push({ x: 0, y: -this.nodeHeight / 2 });
            }
            if (node.children && node.children.length > 0) {
                dots.push({ x: 0, y: this.nodeHeight / 2 });
            }
        }

        dots.forEach(d => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', d.x);
            circle.setAttribute('cy', d.y);
            circle.setAttribute('r', dotRadius);
            circle.setAttribute('class', 'node-connector');
            group.appendChild(circle);
        });

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'node-text');

        const lines = node.lines || [node.label];
        if (lines.length === 1) {
            text.setAttribute('dominant-baseline', 'middle');
            text.textContent = lines[0];
        } else {
            const lineHeight = 1.2;
            const startY = -((lines.length - 1) * lineHeight) / 2;
            lines.forEach((line, index) => {
                const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                tspan.setAttribute('x', 0);
                tspan.setAttribute('dy', index === 0 ? startY + 'em' : lineHeight + 'em');
                tspan.textContent = line;
                text.appendChild(tspan);
            });
        }
        group.appendChild(text);

        if (node.children && node.children.length > 0) {
            const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            if (isHorizontal) {
                indicator.setAttribute('cx', this.nodeWidth / 2 + 6);
                indicator.setAttribute('cy', 0);
            } else {
                indicator.setAttribute('cx', 0);
                indicator.setAttribute('cy', this.nodeHeight / 2 + 8);
            }
            indicator.setAttribute('r', 5);
            indicator.setAttribute('class', 'node-indicator');
            indicator.style.fill = node.collapsed ? '#ff5555' : '#55ff55';
            group.appendChild(indicator);
        }
    }

    getShapePath(shape, w, h) {
        const hw = w / 2;
        const hh = h / 2;
        switch (shape) {
            case 'round':
                return `M ${-hw + 10} ${-hh} H ${hw - 10} Q ${hw} ${-hh} ${hw} ${-hh + 10} V ${hh - 10} Q ${hw} ${hh} ${hw - 10} ${hh} H ${-hw + 10} Q ${-hw} ${hh} ${-hw} ${hh - 10} V ${-hh + 10} Q ${-hw} ${-hh} ${-hw + 10} ${-hh} Z`;
            case 'stadium':
                return `M ${-hw + hh} ${-hh} H ${hw - hh} A ${hh} ${hh} 0 0 1 ${hw - hh} ${hh} H ${-hw + hh} A ${hh} ${hh} 0 0 1 ${-hw + hh} ${-hh} Z`;
            case 'subroutine':
                return `M ${-hw} ${-hh} H ${hw} V ${hh} H ${-hw} Z M ${-hw + 10} ${-hh} V ${hh} M ${hw - 10} ${-hh} V ${hh}`;
            case 'cylinder':
                return `M ${-hw} ${-hh + 10} A ${hw} 10 0 0 1 ${hw} ${-hh + 10} V ${hh - 10} A ${hw} 10 0 0 1 ${-hw} ${hh - 10} Z M ${-hw} ${-hh + 10} A ${hw} 10 0 0 1 ${hw} ${-hh + 10}`;
            case 'circle':
                const r = Math.min(w, h) / 2;
                return `M ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 Z`;
            case 'rhombus':
                return `M 0 ${-hh} L ${hw} 0 L 0 ${hh} L ${-hw} 0 Z`;
            case 'hexagon':
                return `M ${-hw + 15} ${-hh} H ${hw - 15} L ${hw} 0 L ${hw - 15} ${hh} H ${-hw + 15} L ${-hw} 0 Z`;
            case 'parallelogram':
                return `M ${-hw + 15} ${-hh} H ${hw} L ${hw - 15} ${hh} H ${-hw} Z`;
            case 'parallelogram_alt':
                return `M ${-hw} ${-hh} H ${hw - 15} L ${hw} ${hh} H ${-hw + 15} Z`;
            case 'trapezoid':
                return `M ${-hw + 15} ${-hh} H ${hw - 15} L ${hw} ${hh} H ${-hw} Z`;
            case 'trapezoid_alt':
                return `M ${-hw} ${-hh} H ${hw} L ${hw - 15} ${hh} H ${-hw + 15} Z`;
            case 'rect':
            default:
                const rad = Math.min(w, h) / 2;
                return `M ${-hw + rad} ${-hh} H ${hw - rad} A ${rad} ${rad} 0 0 1 ${hw} ${-hh + rad} V ${hh - rad} A ${rad} ${rad} 0 0 1 ${hw - rad} ${hh} H ${-hw + rad} A ${rad} ${rad} 0 0 1 ${-hw} ${hh - rad} V ${-hh + rad} A ${rad} ${rad} 0 0 1 ${-hw + rad} ${-hh} Z`;
        }
    }

    drawEdge(edge, source, target, id) {
        let group = this.g.querySelector(`g[data-id="${id}"]`);
        const isNew = !group;

        if (isNew) {
            group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('data-id', id);
            group.setAttribute('class', 'edge-group');
            group.style.opacity = '0';
            this.g.insertBefore(group, this.g.firstChild);
            requestAnimationFrame(() => group.style.opacity = '1');
        }

        group.innerHTML = '';
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        const isHorizontal = this.data.direction === 'LR' || this.data.direction === 'RL';
        let x1, y1, x2, y2;

        if (isHorizontal) {
            x1 = source.x + this.nodeWidth / 2;
            y1 = source.y;
            x2 = target.x - this.nodeWidth / 2;
            y2 = target.y;
        } else {
            x1 = source.x;
            y1 = source.y + this.nodeHeight / 2;
            x2 = target.x;
            y2 = target.y - this.nodeHeight / 2;
        }

        let d;
        if (isHorizontal) {
            const c1x = x1 + (x2 - x1) / 2;
            const c1y = y1;
            const c2x = x2 - (x2 - x1) / 2;
            const c2y = y2;
            d = `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
        } else {
            const c1x = x1;
            const c1y = y1 + (y2 - y1) / 2;
            const c2x = x2;
            const c2y = y2 - (y2 - y1) / 2;
            d = `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
        }

        path.setAttribute('d', d);
        path.setAttribute('class', 'edge-path');

        if (edge.type === 'dotted') path.setAttribute('stroke-dasharray', '5,5');
        if (edge.type === 'thick') path.setAttribute('stroke-width', '4');
        if (edge.type !== 'open') path.setAttribute('marker-end', 'url(#arrowhead)');

        group.appendChild(path);

        if (edge.label) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;

            text.setAttribute('x', mx);
            text.setAttribute('y', my);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.textContent = edge.label;
            text.setAttribute('class', 'edge-text');

            const bbox = { width: edge.label.length * 8, height: 16 };
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', mx - bbox.width / 2 - 2);
            rect.setAttribute('y', my - bbox.height / 2);
            rect.setAttribute('width', bbox.width + 4);
            rect.setAttribute('height', bbox.height);
            rect.setAttribute('class', 'edge-label-bg');

            group.appendChild(rect);
            group.appendChild(text);
        }
    }

    getStyledSVGClone() {
        // Get computed styles from the container to resolve CSS variables
        const containerStyles = getComputedStyle(this.container);
        const resolvedBg = containerStyles.getPropertyValue('--bg-color').trim() || '#ffffff';
        const resolvedNodeFill = containerStyles.getPropertyValue('--node-fill').trim() || '#EFECE6';
        const resolvedNodeStroke = containerStyles.getPropertyValue('--node-stroke').trim() || '#EFECE6';
        const resolvedNodeText = containerStyles.getPropertyValue('--node-text').trim() || '#111111';
        const resolvedEdgeStroke = containerStyles.getPropertyValue('--edge-stroke').trim() || '#000000';
        const resolvedEdgeText = containerStyles.getPropertyValue('--edge-text').trim() || '#000';
        const resolvedConnectorFill = containerStyles.getPropertyValue('--connector-fill').trim() || '#333';
        const resolvedLabelBg = containerStyles.getPropertyValue('--bg-color').trim() || '#ffffff';
        const resolvedBorderColor = containerStyles.getPropertyValue('--border-color').trim() || '#eee';

        // Get the bounding box of the content
        const bbox = this.g.getBBox();
        const padding = 60;
        const width = bbox.width + padding * 2;
        const height = bbox.height + padding * 2;

        // Create a new SVG element for export (not a clone - build it fresh)
        const svgExport = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgExport.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgExport.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        svgExport.setAttribute('width', width);
        svgExport.setAttribute('height', height);
        svgExport.setAttribute('viewBox', `0 0 ${width} ${height}`);

        // Add background rect
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('width', '100%');
        bgRect.setAttribute('height', '100%');
        bgRect.setAttribute('fill', resolvedBg);
        svgExport.appendChild(bgRect);

        // Add arrow marker definition
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead-export');
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '5');
        marker.setAttribute('markerWidth', '6');
        marker.setAttribute('markerHeight', '6');
        marker.setAttribute('orient', 'auto');
        const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowPath.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        arrowPath.setAttribute('fill', resolvedEdgeStroke);
        marker.appendChild(arrowPath);
        defs.appendChild(marker);
        svgExport.appendChild(defs);

        // Create a group for the content, translated to center it
        const contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const translateX = padding - bbox.x;
        const translateY = padding - bbox.y;
        contentGroup.setAttribute('transform', `translate(${translateX}, ${translateY})`);

        // Draw all visible edges first
        this.data.edges.forEach(edge => {
            const source = this.data.nodes[edge.from];
            const target = this.data.nodes[edge.to];
            if (!source.visible || !target.visible) return;

            const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

            const isHorizontal = this.data.direction === 'LR' || this.data.direction === 'RL';
            let x1, y1, x2, y2;

            if (isHorizontal) {
                x1 = source.x + this.nodeWidth / 2;
                y1 = source.y;
                x2 = target.x - this.nodeWidth / 2;
                y2 = target.y;
            } else {
                x1 = source.x;
                y1 = source.y + this.nodeHeight / 2;
                x2 = target.x;
                y2 = target.y - this.nodeHeight / 2;
            }

            let d;
            if (isHorizontal) {
                const c1x = x1 + (x2 - x1) / 2;
                const c1y = y1;
                const c2x = x2 - (x2 - x1) / 2;
                const c2y = y2;
                d = `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
            } else {
                const c1x = x1;
                const c1y = y1 + (y2 - y1) / 2;
                const c2x = x2;
                const c2y = y2 - (y2 - y1) / 2;
                d = `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
            }

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', resolvedEdgeStroke);
            path.setAttribute('stroke-width', edge.type === 'thick' ? '4' : '2');
            if (edge.type === 'dotted') path.setAttribute('stroke-dasharray', '5,5');
            if (edge.type !== 'open') path.setAttribute('marker-end', 'url(#arrowhead-export)');

            edgeGroup.appendChild(path);

            // Edge label
            if (edge.label) {
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                const labelWidth = edge.label.length * 8 + 8;
                const labelHeight = 18;

                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', mx - labelWidth / 2);
                rect.setAttribute('y', my - labelHeight / 2);
                rect.setAttribute('width', labelWidth);
                rect.setAttribute('height', labelHeight);
                rect.setAttribute('fill', resolvedLabelBg);
                rect.setAttribute('stroke', resolvedBorderColor);
                rect.setAttribute('stroke-width', '1');
                edgeGroup.appendChild(rect);

                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', mx);
                text.setAttribute('y', my);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'middle');
                text.setAttribute('fill', resolvedEdgeText);
                text.setAttribute('font-size', '12px');
                text.setAttribute('font-family', 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif');
                text.textContent = edge.label;
                edgeGroup.appendChild(text);
            }

            contentGroup.appendChild(edgeGroup);
        });

        // Draw all visible nodes
        Object.values(this.data.nodes).forEach(node => {
            if (!node.visible) return;

            const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            nodeGroup.setAttribute('transform', `translate(${node.x}, ${node.y})`);

            // Node shape
            const shapePath = this.getShapePath(node.shape, this.nodeWidth, this.nodeHeight);
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', shapePath);
            path.setAttribute('fill', resolvedNodeFill);
            path.setAttribute('stroke', resolvedNodeStroke);
            path.setAttribute('stroke-width', '0');
            nodeGroup.appendChild(path);

            // Connector dots
            const isHorizontal = this.data.direction === 'LR' || this.data.direction === 'RL';
            const dotRadius = 3;
            const dots = [];
            if (isHorizontal) {
                if ((node.parents && node.parents.length > 0) || (node.id !== this.root?.id)) {
                    dots.push({ x: -this.nodeWidth / 2, y: 0 });
                }
                if (node.children && node.children.length > 0) {
                    dots.push({ x: this.nodeWidth / 2, y: 0 });
                }
            } else {
                if ((node.parents && node.parents.length > 0) || (node.id !== this.root?.id)) {
                    dots.push({ x: 0, y: -this.nodeHeight / 2 });
                }
                if (node.children && node.children.length > 0) {
                    dots.push({ x: 0, y: this.nodeHeight / 2 });
                }
            }

            dots.forEach(d => {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', d.x);
                circle.setAttribute('cy', d.y);
                circle.setAttribute('r', dotRadius);
                circle.setAttribute('fill', resolvedConnectorFill);
                nodeGroup.appendChild(circle);
            });

            // Node text
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', resolvedNodeText);
            text.setAttribute('font-size', '14px');
            text.setAttribute('font-family', 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif');

            const lines = node.lines || [node.label];
            if (lines.length === 1) {
                text.setAttribute('dominant-baseline', 'middle');
                text.textContent = lines[0];
            } else {
                const lineHeight = 1.2;
                const startY = -((lines.length - 1) * lineHeight) / 2;
                lines.forEach((line, index) => {
                    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                    tspan.setAttribute('x', 0);
                    tspan.setAttribute('dy', index === 0 ? startY + 'em' : lineHeight + 'em');
                    tspan.textContent = line;
                    text.appendChild(tspan);
                });
            }
            nodeGroup.appendChild(text);

            // Collapse indicator
            if (node.children && node.children.length > 0) {
                const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                if (isHorizontal) {
                    indicator.setAttribute('cx', this.nodeWidth / 2 + 6);
                    indicator.setAttribute('cy', 0);
                } else {
                    indicator.setAttribute('cx', 0);
                    indicator.setAttribute('cy', this.nodeHeight / 2 + 8);
                }
                indicator.setAttribute('r', 5);
                indicator.setAttribute('fill', node.collapsed ? '#ff5555' : '#55ff55');
                indicator.setAttribute('stroke', resolvedBg === '#111111' ? '#111' : '#fff');
                indicator.setAttribute('stroke-width', '1');
                nodeGroup.appendChild(indicator);
            }

            contentGroup.appendChild(nodeGroup);
        });

        svgExport.appendChild(contentGroup);

        return { svgClone: svgExport, width, height, resolvedBg };
    }

    exportSVG() {
        const { svgClone } = this.getStyledSVGClone();
        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svgClone);

        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'flowchart.svg';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
    }

    exportImage() {
        const { svgClone, width, height, resolvedBg } = this.getStyledSVGClone();

        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svgClone);

        const img = new Image();
        const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // Paint background
            ctx.fillStyle = resolvedBg;
            ctx.fillRect(0, 0, width, height);

            // Draw
            ctx.drawImage(img, 0, 0, width, height);

            try {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const blobUrl = URL.createObjectURL(blob);
                        const downloadLink = document.createElement('a');
                        downloadLink.href = blobUrl;
                        downloadLink.download = 'flowchart.png';
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                        URL.revokeObjectURL(blobUrl);
                    }
                }, 'image/png');
                URL.revokeObjectURL(url);
            } catch (e) {
                console.error("Export failed", e);
                window.open(canvas.toDataURL('image/png'), '_blank');
            }
        };

        img.onerror = () => {
            console.error("Failed to load SVG for export");
            URL.revokeObjectURL(url);
        };

        img.src = url;
    }
}
