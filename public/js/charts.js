/**
 * Veloxis Global CRM — Custom SVG Charts Utility
 */

const charts = {
  /**
   * Renders a premium gradient SVG line chart
   * @param {string} containerId - Element ID to render chart into
   * @param {Array<Object>} data - Timeline data [{ label: '12 Jun', value: 10 }, ...]
   */
  renderLineChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = ''; // Clear container

    if (!data || data.length === 0) {
      container.innerHTML = '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--text-muted);">No activity data recorded yet.</div>';
      return;
    }

    const padding = { top: 20, right: 30, bottom: 40, left: 45 };
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find min/max values
    const values = data.map(d => d.value);
    const labels = data.map(d => d.label);
    const maxVal = Math.max(...values, 5); // Default scale max to at least 5
    const minVal = 0;

    // Generate Points mapping
    const points = data.map((d, index) => {
      const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
      // Invert Y coordinate since SVG (0,0) is top-left
      const y = padding.top + chartHeight - ((d.value - minVal) / (maxVal - minVal)) * chartHeight;
      return { x, y, label: d.label, value: d.value };
    });

    // Create SVG Element
    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("class", "chart-svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    // Create Gradient Definition
    const defs = document.createElementNS(svgNamespace, "defs");
    
    // Stroke Gradient
    const strokeGrad = document.createElementNS(svgNamespace, "linearGradient");
    strokeGrad.setAttribute("id", "chartStrokeGrad");
    strokeGrad.setAttribute("x1", "0%");
    strokeGrad.setAttribute("y1", "0%");
    strokeGrad.setAttribute("x2", "100%");
    strokeGrad.setAttribute("y2", "0%");
    strokeGrad.innerHTML = `
      <stop offset="0%" stop-color="#6c63ff" />
      <stop offset="100%" stop-color="#00f2fe" />
    `;
    defs.appendChild(strokeGrad);

    // Area Fill Gradient
    const areaGrad = document.createElementNS(svgNamespace, "linearGradient");
    areaGrad.setAttribute("id", "chartAreaGrad");
    areaGrad.setAttribute("x1", "0%");
    areaGrad.setAttribute("y1", "0%");
    areaGrad.setAttribute("x2", "0%");
    areaGrad.setAttribute("y2", "100%");
    areaGrad.innerHTML = `
      <stop offset="0%" stop-color="#6c63ff" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#6c63ff" stop-opacity="0.0" />
    `;
    defs.appendChild(areaGrad);
    svg.appendChild(defs);

    // Render Gridlines & Y-Axis Labels
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const yVal = minVal + (maxVal - minVal) * (i / gridCount);
      const y = padding.top + chartHeight - (i / gridCount) * chartHeight;

      // Line
      const gridline = document.createElementNS(svgNamespace, "line");
      gridline.setAttribute("class", "chart-gridline");
      gridline.setAttribute("x1", padding.left);
      gridline.setAttribute("y1", y);
      gridline.setAttribute("x2", width - padding.right);
      gridline.setAttribute("y2", y);
      svg.appendChild(gridline);

      // Text Label
      const yLabel = document.createElementNS(svgNamespace, "text");
      yLabel.setAttribute("x", padding.left - 12);
      yLabel.setAttribute("y", y + 4);
      yLabel.setAttribute("text-anchor", "end");
      yLabel.setAttribute("fill", "var(--text-muted)");
      yLabel.setAttribute("font-size", "10");
      yLabel.textContent = Math.round(yVal);
      svg.appendChild(yLabel);
    }

    // Render X-Axis Labels (draw every 2nd or 3rd label if list is long)
    const labelStep = data.length > 10 ? Math.ceil(data.length / 5) : 1;
    points.forEach((p, idx) => {
      if (idx % labelStep === 0 || idx === data.length - 1) {
        const xLabel = document.createElementNS(svgNamespace, "text");
        xLabel.setAttribute("x", p.x);
        xLabel.setAttribute("y", height - padding.bottom + 20);
        xLabel.setAttribute("text-anchor", "middle");
        xLabel.setAttribute("fill", "var(--text-muted)");
        xLabel.setAttribute("font-size", "10");
        xLabel.textContent = p.label;
        svg.appendChild(xLabel);
      }
    });

    // Construct Line Path (using bezier curve smoothing)
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p = points[i];
      const cpX1 = p0.x + (p.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p.x - p0.x) / 2;
      const cpY2 = p.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
    }

    // Draw Fill Area below the line
    const areaPathD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;
    const areaPath = document.createElementNS(svgNamespace, "path");
    areaPath.setAttribute("d", areaPathD);
    areaPath.setAttribute("fill", "url(#chartAreaGrad)");
    svg.appendChild(areaPath);

    // Draw Main Stroke Line
    const strokeLine = document.createElementNS(svgNamespace, "path");
    strokeLine.setAttribute("class", "chart-line");
    strokeLine.setAttribute("d", pathD);
    strokeLine.setAttribute("stroke", "url(#chartStrokeGrad)");
    svg.appendChild(strokeLine);

    // Render Circles at points & setup Tooltip behaviors
    const tooltip = document.createElement("div");
    tooltip.setAttribute("class", "chart-tooltip");
    container.appendChild(tooltip);

    points.forEach((p) => {
      const circle = document.createElementNS(svgNamespace, "circle");
      circle.setAttribute("cx", p.x);
      circle.setAttribute("cy", p.y);
      circle.setAttribute("r", "4");
      circle.setAttribute("fill", "var(--cyan)");
      circle.setAttribute("stroke", "var(--bg-sidebar)");
      circle.setAttribute("stroke-width", "2");
      circle.style.cursor = "pointer";
      circle.style.transition = "r 0.15s ease";

      circle.addEventListener('mouseenter', () => {
        circle.setAttribute("r", "6");
        tooltip.innerHTML = `<strong>${p.label}</strong><br/>${p.value} Sends`;
        tooltip.style.display = 'block';
        tooltip.style.left = `${p.x - container.scrollLeft + 10}px`;
        tooltip.style.top = `${p.y - 40}px`;
      });

      circle.addEventListener('mouseleave', () => {
        circle.setAttribute("r", "4");
        tooltip.style.display = 'none';
      });

      svg.appendChild(circle);
    });

    container.appendChild(svg);
  }
};

window.charts = charts;
