let scatterSvg, expenditureXScale, expenditureYScale;
let scatterZoomXDomain = null;
let scatterZoomYDomain = null;

function adjustExpenditureDimensions(svg) {
  // Keep View D at its default size regardless of mode
  const defaultWidth = +svg.attr("width") || 680;
  const defaultHeight = +svg.attr("height") || 320;
  const width = defaultWidth;
  const height = defaultHeight;

  svg
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
}

function initExpenditureRisk() {
  const svg = d3.select("#view-d svg");
  adjustExpenditureDimensions(svg);
  const svgWidth = +svg.attr("width");
  const svgHeight = +svg.attr("height");
  const margin = { top: -10, right: 90, bottom: 100, left: 90 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  scatterSvg = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  scatterSvg.chartWidth = chartWidth;
  scatterSvg.chartHeight = chartHeight;
  scatterSvg.margin = margin;

  expenditureXScale = d3.scaleLinear();
  expenditureYScale = d3.scaleLinear();

  scatterSvg.append("g").attr("class", "x-axis");
  scatterSvg.append("g").attr("class", "y-axis");
  scatterSvg.append("text").attr("class", "x-label")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + 55)
    .attr("text-anchor", "middle")
    .text("Avg. Expenditure (% of GDP)");
  scatterSvg.append("text").attr("class", "y-label")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 50)
    .attr("x", -chartHeight / 2)
    .attr("text-anchor", "middle")
    .text("Risk Score");

  // Brush for zoom-in filtering on main scatter
  scatterSvg.brush = d3.brush()
    .extent([[0, 0], [chartWidth, chartHeight]])
    .on("brush end", brushed);

  scatterSvg.append("g")
    .attr("class", "brush")
    .call(scatterSvg.brush);

  // Add reference lines group
  scatterSvg.append("g").attr("class", "reference-lines");
  
  // Add annotation group for priority countries
  scatterSvg.append("g").attr("class", "annotations");

  updateExpenditureRisk();
}

function getAverageExpenditure(country) {
  if (!country.expenditures || !country.expenditures.length) return null;
  
  // Consider years 2015-2022 inclusive
  const filtered = country.expenditures.filter(e => e.year >= 2015 && e.year <= 2022);
  
  if (filtered.length === 0) return null;
  const sum = filtered.reduce((acc, d) => acc + d.value, 0);
  return sum / filtered.length;
}
function updateExpenditureRisk() {

  const svg = d3.select("#view-d svg");
  adjustExpenditureDimensions(svg);
  const svgWidth = +svg.attr("width");
  const svgHeight = +svg.attr("height");
  const margin = { top: 0, right: 90, bottom: 100, left: 90 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;
  
  // Update the stored dimensions
  if (!scatterSvg.margin) scatterSvg.margin = margin;
  scatterSvg.chartWidth = chartWidth;
  scatterSvg.chartHeight = chartHeight;

  let base = Array.from(countryData.values());
  if (selectedCountries.size > 0) {
    base = base.filter(d => selectedCountries.has(d.iso));
  }

  const data = base
    .map(d => ({
      iso: d.iso,
      country: d.country,
      risk: d.risk,
      expenditure: getAverageExpenditure(d)
    }))
    .filter(d => d.expenditure !== null && !isNaN(d.risk));

  // If no data with expenditures, show empty chart
  if (data.length === 0) {
    scatterSvg.selectAll(".point").remove();
    expenditureXScale.domain([0, 1]).range([0, chartWidth]);
    expenditureYScale.domain([0, 10]).range([chartHeight, 0]);
    scatterSvg.select(".x-axis").call(d3.axisBottom(expenditureXScale));
    scatterSvg.select(".y-axis").call(d3.axisLeft(expenditureYScale));
    return;
  }

  // Scales
  const expenditureExtent = d3.extent(data, d => d.expenditure);
  const riskExtent = d3.extent(data, d => d.risk);

  // Full (unzoomed) domains
  const fullXDomain = [expenditureExtent[0] * 0.9, expenditureExtent[1] * 1.1];
  const fullYDomain = [riskExtent[0] - 0.5, riskExtent[1] + 0.5];

  let filteredData = data;

  // Use zoomed domain if present, otherwise full domain
  const xDomain = scatterZoomXDomain || fullXDomain;
  const yDomain = scatterZoomYDomain || fullYDomain;

  expenditureXScale
    .domain(xDomain)
    .range([0, chartWidth]);

  expenditureYScale
    .domain(yDomain)
    .range([chartHeight, 0]);

  // Axes
  scatterSvg.select(".x-axis")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(expenditureXScale).ticks(6).tickFormat(d => `${d.toFixed(1)}%`))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("transform", "rotate(-45)")
    .attr("dx", "-8px")
    .attr("dy", "0px");

  scatterSvg.select(".y-axis")
    .call(d3.axisLeft(expenditureYScale).ticks(6).tickFormat(d3.format(".1f")));

  // Update axis labels with new positions
  scatterSvg.selectAll(".x-label")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + 55);

  scatterSvg.selectAll(".y-label")
    .attr("x", -chartHeight / 2)
    .attr("y", -margin.left + 50);

  // Update brush extent to current size
  if (scatterSvg.brush) {
    scatterSvg.brush.extent([[0, 0], [chartWidth, chartHeight]]);
    scatterSvg.select(".brush").call(scatterSvg.brush);
  }

  // Cache data and full domains for brush/zoom handler
  scatterSvg.currentData = filteredData;
  scatterSvg.fullXDomain = fullXDomain;
  scatterSvg.fullYDomain = fullYDomain;

  // Add reference lines for median values (based on filtered data)
  const medianRisk = d3.median(filteredData, d => d.risk);
  const medianExpenditure = d3.median(filteredData, d => d.expenditure);

  const refLines = scatterSvg.select(".reference-lines");
  refLines.selectAll("*").remove();

  // Vertical line at median expenditure
  refLines.append("line")
    .attr("x1", expenditureXScale(medianExpenditure))
    .attr("x2", expenditureXScale(medianExpenditure))
    .attr("y1", 0)
    .attr("y2", chartHeight)
    .attr("stroke", "#999")
    .attr("stroke-dasharray", "4,4")
    .attr("stroke-width", 1);

  // Horizontal line at median risk
  refLines.append("line")
    .attr("x1", 0)
    .attr("x2", chartWidth)
    .attr("y1", expenditureYScale(medianRisk))
    .attr("y2", expenditureYScale(medianRisk))
    .attr("stroke", "#999")
    .attr("stroke-dasharray", "4,4")
    .attr("stroke-width", 1);

  // Add quadrant shading for high risk + low expenditure
  refLines.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", expenditureXScale(medianExpenditure))
    .attr("height", expenditureYScale(medianRisk))
    .attr("fill", "#ffcccc")
    .attr("opacity", 0.15)
    .attr("pointer-events", "none");

  // Determine priority countries using GLOBAL percentiles (all countries, not just filtered)
  const allData = Array.from(countryData.values())
    .map(d => ({
      iso: d.iso,
      risk: d.risk,
      expenditure: getAverageExpenditure(d)
    }))
    .filter(d => d.expenditure !== null && !isNaN(d.risk));
  
  const globalRiskP75 = d3.quantile(allData.map(d => d.risk).sort(d3.ascending), 0.75);
  const globalExpP25 = d3.quantile(allData.map(d => d.expenditure).sort(d3.ascending), 0.25);
  const isPriority = d => d.risk >= globalRiskP75 && d.expenditure <= globalExpP25;
  
  const priorityCount = filteredData.filter(isPriority).length;

  // Draw scatter points with priority detection
  drawScatterPoints(filteredData, isPriority, priorityCount);
}

function drawScatterPoints(data, isPriorityFn, priorityCount) {
  const points = scatterSvg.selectAll(".point")
    .data(data, d => d.iso);

  // Update annotations with priority count (show on default/all modes only)
  const annotations = scatterSvg.select(".annotations");
  annotations.selectAll("*").remove();
  
  if (priorityCount > 0 && (currentFilterMode === 'all' || currentFilterMode === 'highImpact')) {
    annotations.append("text")
      .attr("x", 10)
      .attr("y", -10)
      .attr("font-size", "13px")
      .attr("font-weight", "600")
      .attr("fill", "#d62728")
      .text(`⚠️ ${priorityCount} priority gap ${priorityCount === 1 ? 'country' : 'countries'} identified`);
  }

  // EXIT
  points.exit().remove();

  // UPDATE
  points
    .attr("cx", d => expenditureXScale(d.expenditure))
    .attr("cy", d => expenditureYScale(d.risk))
    .attr("r", d => isPriorityFn(d) ? 7 : 5)
    .attr("fill", d => {
      if (isPriorityFn(d)) return "#d62728";
      if (selectedCountries.size === 0 || selectedCountries.has(d.iso)) {
        return riskColorScale(d.risk);
      }
      return mutedColor;
    })
    .attr("stroke", d => isPriorityFn(d) ? "#8b0000" : "white")
    .attr("stroke-width", d => isPriorityFn(d) ? 2 : 1.5)
    .attr("opacity", d =>
      selectedCountries.size === 0 || selectedCountries.has(d.iso) ? 0.85 : 0.25
    )
    .select("title")
    .text(d => {
      const priority = isPriorityFn(d) ? "\n⚠️ PRIORITY GAP COUNTRY" : "";
      return `${d.country}\nRisk: ${d.risk.toFixed(2)}\nAvg. Expenditure: ${d.expenditure.toFixed(2)}% of GDP${priority}`;
    });

  // ENTER
  points.enter()
    .append("circle")
    .attr("class", "point")
    .attr("r", d => isPriorityFn(d) ? 7 : 5)
    .attr("cx", d => expenditureXScale(d.expenditure))
    .attr("cy", d => expenditureYScale(d.risk))
    .attr("fill", d => {
      if (isPriorityFn(d)) return "#d62728";
      return riskColorScale(d.risk);
    })
    .attr("stroke", d => isPriorityFn(d) ? "#8b0000" : "white")
    .attr("stroke-width", d => isPriorityFn(d) ? 2 : 1.5)
    .attr("opacity", 0.85)
    .on("click", (event, d) => toggleCountrySelection(d.iso))
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("r", isPriorityFn(d) ? 9 : 7)
        .attr("opacity", 1);
    })
    .on("mouseout", function(event, d) {
      d3.select(this)
        .attr("r", isPriorityFn(d) ? 7 : 5)
        .attr("opacity", selectedCountries.size === 0 || selectedCountries.has(d.iso) ? 0.85 : 0.25);
    })
    .append("title")
    .text(d => {
      const priority = isPriorityFn(d) ? "\n⚠️ PRIORITY GAP COUNTRY" : "";
      return `${d.country}\nRisk: ${d.risk.toFixed(2)}\nAvg. Expenditure: ${d.expenditure.toFixed(2)}% of GDP${priority}`;
    });
}

function brushed(event) {
  // Only handle the 'end' event to avoid intermediate updates
  if (event.type !== 'end') return;
  
  // Ignore programmatic brush moves
  if (!event.sourceEvent) return;
  
  const selection = event.selection;
  if (!selection) {
    // Brush cleared – restore to full domain
    if (scatterSvg.fullXDomain && scatterSvg.fullYDomain) {
      scatterZoomXDomain = null;
      scatterZoomYDomain = null;
      selectedCountries.clear();
      updateExpenditureRisk();
      updateAllViews();
    }
    return;
  }

  const [[x0, y0], [x1, y1]] = selection;

  // Convert brushed pixels to data domain
  const xDomain = [expenditureXScale.invert(x0), expenditureXScale.invert(x1)].sort((a, b) => a - b);
  const yDomain = [expenditureYScale.invert(y1), expenditureYScale.invert(y0)].sort((a, b) => a - b);

  scatterZoomXDomain = xDomain;
  scatterZoomYDomain = yDomain;

  // Determine which points are inside selection for cross-filtering
  const brushedIsos = scatterSvg.currentData
    .filter(d => {
      return xDomain[0] <= d.expenditure && d.expenditure <= xDomain[1]
        && yDomain[0] <= d.risk && d.risk <= yDomain[1];
    })
    .map(d => d.iso);

  selectedCountries = new Set(brushedIsos);

  // Clear the brush rectangle after zooming
  scatterSvg.select(".brush").call(scatterSvg.brush.move, null);

  // Redraw with new zoom and selection
  updateExpenditureRisk();

  // Propagate selection to other views
  updateAllViews();
}


