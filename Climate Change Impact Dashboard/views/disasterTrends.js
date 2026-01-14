let disasterSvg, disasterXScale, disasterYScale, lineGenerator;

function initDisasterTrends() {
  const svg = d3.select("#view-c svg");
  const svgWidth = +svg.attr("width");
  const svgHeight = +svg.attr("height");
  const margin = { top: 20, right: 20, bottom: 60, left: 100 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  disasterSvg = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  disasterSvg.chartWidth = chartWidth;
  disasterSvg.chartHeight = chartHeight;
  disasterSvg.margin = margin;

  disasterXScale = d3.scaleLinear();
  disasterYScale = d3.scaleLinear();

  // tooltip for per-year points
  d3.select("body").selectAll(".disaster-tooltip")
    .data([null])
    .join("div")
    .attr("class", "disaster-tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("z-index", "10")
    .style("background", "#fff")
    .style("color", "#111")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("padding", "6px 8px")
    .style("font", "11px sans-serif")
    .style("box-shadow", "0 6px 16px rgba(0,0,0,0.18)")
    .style("opacity", 0);

  // Container for small multiples
  disasterSvg.append("g").attr("class", "small-multiples");

  // Headers and axis for context
  disasterSvg.append("g").attr("class", "mini-headers");
  disasterSvg.append("g").attr("class", "country-axis y-axis");
  disasterSvg.append("g").attr("class", "timeline-axis");
  
  // axis labels
  disasterSvg.append("text").attr("class", "x-label")
    .attr("text-anchor", "middle")
    .text("Year");

  updateDisasterTrends();
}

function updateDisasterTrends() {
  let selectedData;
  if (selectedCountries.size === 0) {
    // Show all countries sorted by average impact (people affected per disaster) 2015-2024
    selectedData = Array.from(countryData.values())
      .filter(d => d.disasters.length > 0)
      .map(d => {
        const disastersInRange = d.disasters.filter(x => x.year >= 2015 && x.year <= 2024);
        const avgImpact = disastersInRange.length > 0
          ? disastersInRange.reduce((sum, x) => sum + x.count, 0) / disastersInRange.length
          : 0;
        return { ...d, avgImpact };
      })
        .filter(d => d.avgImpact > 0)
      .sort((a, b) => b.avgImpact - a.avgImpact);
  } else {
    selectedData = Array.from(selectedCountries)
      .map(iso => countryData.get(iso))
      .filter(d => d && d.disasters.length > 0)
      .map(d => {
        const disastersInRange = d.disasters.filter(x => x.year >= 2015 && x.year <= 2024);
        const avgImpact = disastersInRange.length > 0
          ? disastersInRange.reduce((sum, x) => sum + x.count, 0) / disastersInRange.length
          : 0;
        return { ...d, avgImpact };
      })
      .sort((a, b) => b.avgImpact - a.avgImpact);
  }

  // Filter disasters to 2015-2024 for plotting
  selectedData = selectedData.map(d => ({
    ...d,
    disasters: d.disasters.filter(x => x.year >= 2015 && x.year <= 2024)
  })).filter(d => d.disasters.length > 0);

  // Global color domain based on all countries (so selection keeps consistent colors)
  const allImpactAverages = Array.from(countryData.values())
    .map(d => {
      const disastersInRange = d.disasters.filter(x => x.year >= 2015 && x.year <= 2024);
      if (disastersInRange.length === 0) return null;
      return disastersInRange.reduce((sum, x) => sum + x.count, 0) / disastersInRange.length;
    })
    .filter(v => v !== null && !isNaN(v) && v > 0);

  const globalMinAvg = allImpactAverages.length ? Math.min(...allImpactAverages) : 0;
  const globalMaxAvg = allImpactAverages.length ? Math.max(...allImpactAverages) : 1;
  const sortedGlobal = allImpactAverages.slice().sort(d3.ascending);
  const p10Global = sortedGlobal.length ? d3.quantile(sortedGlobal, 0.10) : globalMinAvg;
  const p90Global = sortedGlobal.length ? d3.quantile(sortedGlobal, 0.90) : globalMaxAvg;
  const colorMin = p10Global === null ? globalMinAvg : p10Global;
  const colorMax = p90Global === null ? globalMaxAvg : p90Global;

  // If nothing, clear
  if (selectedData.length === 0) {
    disasterSvg.select(".small-multiples").selectAll("*").remove();
    return;
  }

  const chartWidth = disasterSvg.chartWidth;

  // Keep consistent row size - don't inflate when filtering
  const rowHeight = 18; // match View A bar height for consistent spacing
  const margin = disasterSvg.margin;
  
  // Adjust min/max heights based on current filter mode
  let minHeight, maxHeight;
  if (currentFilterMode === 'critical') {
    minHeight = 300; // Smaller for critical countries (few items)
    maxHeight = 500;
  } else if (currentFilterMode === 'highImpact' || currentFilterMode === 'highRiskLowSpend') {
    minHeight = 550; // Medium size for filtered subsets
    maxHeight = 800;
  } else if (currentFilterMode === 'all') {
    // For all countries, let SVG grow to full content height; wrapper will scroll
    minHeight = 550;
    maxHeight = Number.POSITIVE_INFINITY;
  }
  
  const calculatedHeight = selectedData.length * rowHeight + margin.top + margin.bottom;
  let svgHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
  if (currentFilterMode === 'all') {
    svgHeight = calculatedHeight; // ensure full content height for scrolling
  }
  
  const svg = d3.select("#view-c svg");
  svg.attr("height", svgHeight);
  
  const newChartHeight = svgHeight - margin.top - margin.bottom;
  disasterSvg.chartHeight = newChartHeight;

  const chartHeight = newChartHeight;

  // Layout calculations
  const sparklineWidth = chartWidth; // use full chart width
  const sparklineHeight = 12;

  // Y scale for row positioning
  // When many countries are shown, add more band padding 
  const bandPadding = selectedData.length > 40 ? 0.5 : 0.18;
  const yScale = d3.scaleBand()
    .domain(selectedData.map(d => d.country))
    .range([0, chartHeight])
    .padding(bandPadding);

  // Update x scale to 2015-2024 for rising trend analysis
  disasterXScale.domain([2015, 2024]).range([0, sparklineWidth]);

  // Bind data
  const rows = disasterSvg.select(".small-multiples").selectAll(".country-row")
    .data(selectedData, d => d.iso);

  // Enter
  const rowEnter = rows.enter()
    .append("g")
    .attr("class", "country-row")
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      event.stopPropagation();
      toggleCountrySelection(d.iso);
    });

  // Country label
  rowEnter.append("text")
    .attr("class", "country-label")
    .attr("x", -8)
    .attr("y", sparklineHeight / 2)
    .attr("text-anchor", "end")
    .attr("alignment-baseline", "middle")
    .attr("font-size", "11px")
    .attr("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif")
    .attr("fill", "#333");

  // Sparkline
  rowEnter.append("path")
    .attr("class", "sparkline")
    .attr("fill", "none")
    .attr("stroke-width", 1)
    .attr("opacity", 0.8);

  // Invisible thick sparkline for easier hover detection
  rowEnter.append("path")
    .attr("class", "sparkline-hover")
    .attr("fill", "none")
    .attr("stroke-width", 8)
    .attr("stroke", "transparent")
    .attr("pointer-events", "stroke");

  // Update + Enter (merged)
  const rowsAll = rowEnter.merge(rows);

  // Calculate color scale based on global distribution so selection retains same palette
  console.log(`Avg disaster impact (global) - min: ${globalMinAvg.toFixed(0)}, max: ${globalMaxAvg.toFixed(0)}, colorDomain: [${colorMin.toFixed(0)}, ${colorMax.toFixed(0)}]`);
  console.log(`Top 5 countries by avg impact per disaster:`, selectedData.slice(0, 5).map(d => {
    const total = d.disasters.reduce((sum, x) => sum + x.count, 0);
    const avg = total / d.disasters.length;
    return `${d.country}: ${d3.format(".2s")(avg)}`;
  }));
  
  const disasterColorScale = d3.scaleSequential()
    .domain([colorMin, colorMax])
    .interpolator(d3.interpolateRdYlGn)
    .clamp(true);

  const bandHeight = yScale.bandwidth();
  const rowOffset = Math.max(0, (bandHeight - sparklineHeight) / 2);

  rowsAll
    .transition()
    .duration(500)
    .attr("transform", d => `translate(0, ${yScale(d.country) + rowOffset})`);

  rowsAll.select(".country-label")
    .text("")
    .attr("font-weight", d => selectedCountries.has(d.iso) ? "600" : "400");

  // Update Y-axis for countries with truncated labels to keep layout centered
  const truncateName = name => name.length > 14 ? `${name.slice(0, 12)}…` : name;
  const countryAxis = d3.axisLeft(yScale).tickFormat(truncateName);
  const axisGroup = disasterSvg.select(".country-axis").call(countryAxis);
  axisGroup.selectAll("text")
    .attr("font-size", "11px")
    .attr("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif")
    .append("title")
    .text(d => d);

  rowsAll.select(".sparkline")
    .attr("stroke", d => {
      const total = d.disasters.reduce((sum, x) => sum + x.count, 0);
      const avgCount = total / d.disasters.length;
      // Reverse the color scale so red=high, green=low; clamp using the clipped domain
      const clamped = Math.max(colorMin, Math.min(colorMax, avgCount));
      return d3.interpolateRdYlGn(1 - (clamped - colorMin) / (colorMax - colorMin));
    })
    .attr("stroke-width", d => selectedCountries.has(d.iso) ? 1.5 : 1)
    .transition()
    .duration(500)
    .attrTween("d", function(d) {
      const maxCount = Math.max(...d.disasters.map(x => x.count), 1);
      const yScale = d3.scaleLinear().domain([0, maxCount]).range([sparklineHeight, 0]);
      const line = d3.line()
        .x(v => disasterXScale(v.year))
        .y(v => yScale(v.count))
        .curve(d3.curveMonotoneX);
      
      return () => line(d.disasters);
    });

  rowsAll.select(".sparkline-hover")
    .transition()
    .duration(500)
    .attrTween("d", function(d) {
      const maxCount = Math.max(...d.disasters.map(x => x.count), 1);
      const yScale = d3.scaleLinear().domain([0, maxCount]).range([sparklineHeight, 0]);
      const line = d3.line()
        .x(v => disasterXScale(v.year))
        .y(v => yScale(v.count))
        .curve(d3.curveMonotoneX);
      
      return () => line(d.disasters);
    });
  rowsAll.selectAll(".sparkline-dot").remove();
  rowsAll.selectAll(".sparkline-dot")
    .data(d => d.disasters.map(disaster => ({ ...disaster, country: d.country })))
    .enter()
    .append("circle")
    .attr("class", "sparkline-dot")
    .attr("cx", d => disasterXScale(d.year))
    .attr("cy", function() {
      const parentData = d3.select(this.parentNode).datum();
      const maxCount = Math.max(...parentData.disasters.map(x => x.count), 1);
      const yScale = d3.scaleLinear().domain([0, maxCount]).range([sparklineHeight, 0]);
      const thisYear = +d3.select(this).datum().year;
      const yearData = parentData.disasters.find(x => x.year === thisYear);
      return yScale(yearData ? yearData.count : 0);
    })
    .attr("r", 2.5)
    .attr("fill", "#fff")
    .attr("stroke", function() {
      const parentData = d3.select(this.parentNode).datum();
      const total = parentData.disasters.reduce((sum, x) => sum + x.count, 0);
      const avgCount = total / parentData.disasters.length;
      const clamped = Math.max(colorMin, Math.min(colorMax, avgCount));
      return d3.interpolateRdYlGn(1 - (clamped - colorMin) / (colorMax - colorMin));
    })
    .attr("stroke-width", 1.3)
    .attr("opacity", 0.6)
    .attr("pointer-events", "auto")
    .on("mousemove", function(event, d) {
      const tooltip = d3.select(".disaster-tooltip");
      tooltip
        .style("opacity", 1)
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 12}px`)
        .html(`${d.year}: Avg impact ${d3.format(".2s")(d.count)} people/disaster`);
    })
    .on("mouseout", function() {
      d3.select(".disaster-tooltip").style("opacity", 0);
    });

  // Update X-axis at bottom 
  const usedHeight = yScale.range()[1];

  disasterSvg.select(".timeline-axis")
    .attr("transform", `translate(0,${usedHeight})`)
    .call(d3.axisBottom(disasterXScale).ticks(5).tickFormat(d3.format("d")));

  // Reposition axis labels after dynamic height changes 
  disasterSvg.select(".x-label")
    .attr("x", sparklineWidth / 2)
    .attr("y", usedHeight + 40);
  
  disasterSvg.select(".y-label")
    .attr("x", -usedHeight / 2);

  // Hover effects
  rowsAll
    .on("mouseover", function(event, d) {
      d3.select(this).select(".sparkline")
        .attr("stroke-width", 2.5)
        .attr("opacity", 1);
      // Enhance data points on hover
      d3.select(this).selectAll(".sparkline-dot")
        .attr("opacity", 1)
        .attr("r", 3.5);
      const tooltip = d3.select(".disaster-tooltip");
      const [mx, my] = d3.pointer(event);
      const total = d.disasters.reduce((sum, x) => sum + x.count, 0);
      const avg = total / d.disasters.length;
      d3.select(this).select(".country-label")
        .attr("font-weight", "700");
      tooltip
        .style("opacity", 1)
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 12}px`)
        .html(`<strong>${d.country}</strong><br/>Avg impact (2015-2024): ${d3.format(".2s")(avg)} people/disaster`);
    })
    .on("mouseout", function(event, d) {
      d3.select(this).select(".sparkline")
        .attr("stroke-width", selectedCountries.has(d.iso) ? 1.5 : 1)
        .attr("opacity", 0.8);
      // Restore data points to default visibility
      d3.select(this).selectAll(".sparkline-dot")
        .attr("opacity", 0.6)
        .attr("r", 2.5);
      d3.select(this).select(".country-label")
        .attr("font-weight", selectedCountries.has(d.iso) ? "600" : "400");
      d3.select(".disaster-tooltip")
        .style("opacity", 0);
    });
    
  rows.exit().remove();
}
