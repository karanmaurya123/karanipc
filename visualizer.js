
export class Visualizer {
    constructor(svgId, canvasId) {
        this.svg = document.getElementById(svgId);
        this.ctx = document.getElementById(canvasId).getContext('2d');
        this.width = this.svg.parentElement.clientWidth;
        this.height = this.svg.parentElement.clientHeight;

        // Initialize layers
        // Ensure we have definitions for filters/gradients
        this.ensureDefs();

        // Create groups for layering: Links first (background), then Nodes (foreground)
        this.linksGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.svg.appendChild(this.linksGroup);
        this.svg.appendChild(this.nodesGroup);

        // Cache for DOM elements to prevent rebuilding every frame
        // Map<string, SVGGElement>
        this.nodeCache = new Map();
    }

    ensureDefs() {
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        defs.innerHTML = `
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/>
            </filter>
            <linearGradient id="grad-running" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#66bb6a;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#43a047;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="grad-default" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#78909c;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#546e7a;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="grad-channel" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#26a69a;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#00897b;stop-opacity:1" />
            </linearGradient>
        `;
        this.svg.insertBefore(defs, this.svg.firstChild);
    }

    render(processes, channels) {
        this.drawGraph(processes, channels);
        this.drawTimeline(processes);
    }

    drawGraph(processes, channels) {
        // Clear links every frame (cheap, non-interactive)
        this.linksGroup.innerHTML = '';

        const seenIds = new Set();
        const baseProcX = 100;
        const baseChanX = 400;

        // --- Channels ---
        channels.forEach((ch, index) => {
            const id = `chan-${ch.id}`;
            const x = baseChanX;
            const y = 50 + index * 100;
            seenIds.add(id);

            // Update or Create Node
            this.updateNode(id, x, y, `Channel: ${ch.id}`, 'channel', ch);

            // Draw Links (Connect processes to channels)
            processes.forEach((p, pIndex) => {
                const px = baseProcX;
                const py = 50 + pIndex * 80;
                // Mock connection logic for visual line
                // In real app, check p.connections.includes(ch.id)
                this.drawLink(px + 100, py + 25, x, y + 25);
            });
        });

        // --- Processes ---
        processes.forEach((p, index) => {
            const id = `proc-${p.pid}`;
            const x = baseProcX;
            const y = 50 + index * 80;
            const colorType = p.state === 'RUNNING' ? 'running' : 'default';
            seenIds.add(id);

            this.updateNode(id, x, y, `PID ${p.pid} (${p.state})`, colorType, p);
        });

        // --- Cleanup ---
        // Remove nodes that no longer exist
        for (const [id, el] of this.nodeCache) {
            if (!seenIds.has(id)) {
                el.remove();
                this.nodeCache.delete(id);
            }
        }

        // Resize SVG container dynamically
        const contentHeight = Math.max(
            50 + processes.length * 80 + 50,
            50 + channels.length * 100 + 50
        );
        this.svg.style.height = `${Math.max(contentHeight, this.svg.parentElement.clientHeight)}px`;
    }

    // Upsert method for nodes
    updateNode(id, x, y, label, colorType, dataObj) {
        let g = this.nodeCache.get(id);

        // Dynamic width calculation
        const baseWidth = 160;
        const charWidth = 9;
        const width = Math.max(baseWidth, label.length * charWidth);
        const height = 60;

        if (!g) {
            // CREATE NEW
            g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("class", "node-group");
            g.style.cursor = "pointer";

            // Rect
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("rx", 8);
            rect.setAttribute("filter", "url(#shadow)");
            rect.setAttribute("stroke", "rgba(255,255,255,0.2)");
            rect.setAttribute("stroke-width", "1");

            // Text
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("fill", "#fff");
            text.style.pointerEvents = "none"; // Let clicks pass to rect/g

            g.appendChild(rect);
            g.appendChild(text);

            // Attach Click Listener ONCE
            g.addEventListener('click', (e) => {
                e.stopPropagation();
                // Store current data ref in the element or closure?
                // Using closure here is risky if dataObj ref changes but usually it's fine for ID-based lookup if we passed ID.
                // Better: dispatch event with the objects that were passed to this specific instance 'g'
                // But wait, 'dataObj' in this closure is the ONE from creation time.
                // We need the LATEST data.
                // Solution: Attach data to the DOM element
                const currentData = g._dataRef;
                const finalType = id.startsWith('proc') ? 'process' : 'channel';
                window.dispatchEvent(new CustomEvent('inspect-entity', { detail: { type: finalType, data: currentData } }));
            });

            this.nodesGroup.appendChild(g);
            this.nodeCache.set(id, g);
        }

        // UPDATE (Running every frame)
        // Update data reference for the click handler
        g._dataRef = dataObj;

        const rect = g.querySelector('rect');
        const text = g.querySelector('text');

        // Check if values changed to minimize DOM thrashing (optional but good)
        // For now, just set attributes, it's fast enough compared to creating elements
        rect.setAttribute("x", x);
        rect.setAttribute("y", y);
        rect.setAttribute("width", width);
        rect.setAttribute("height", height);

        // Color update
        let fill = "url(#grad-default)";
        if (colorType === 'running') fill = "url(#grad-running)";
        if (colorType === 'channel') fill = "url(#grad-channel)";
        rect.setAttribute("fill", fill);

        text.setAttribute("x", x + 15);
        text.setAttribute("y", y + 35);
        if (text.textContent !== label) {
            text.textContent = label;
        }
    }

    drawLink(x1, y1, x2, y2) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "#555");
        line.setAttribute("stroke-width", "2");
        this.linksGroup.appendChild(line);
    }

    drawTimeline(processes) {
        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, w, h);

        // Simple scrolling timeline placeholder
        // TODO: Implement actual historical data buffer
    }
}
