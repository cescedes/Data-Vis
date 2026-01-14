let riskSvg, riskXScale, riskYScale;

function initRiskRanking() {
  const svg = d3.select("#view-a svg");
  const svgWidth = +svg.attr("width");
  const svgHeight = +svg.attr("height");
  const margin = { top: 20, right: 20, bottom: 60, left: 100 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  riskSvg = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  riskSvg.chartWidth = chartWidth;
  riskSvg.chartHeight = chartHeight;
  riskSvg.margin = margin;

  riskXScale = d3.scaleLinear();
  riskYScale = d3.scaleBand().padding(0.1);

  riskSvg.append("g").attr("class", "x-axis");
  riskSvg.append("g").attr("class", "y-axis");
  riskSvg.append("text").attr("class", "x-label")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + 40)
    .attr("text-anchor", "middle")
    .text("Risk Score");

  // Reference line group
  riskSvg.append("g").attr("class", "reference-lines");

  // Callout group
  riskSvg.append("g").attr("class", "callouts");

  updateRiskRanking();
}

function updateRiskRanking() {
  let data;
  if (selectedCountries.size > 0) {
    data = Array.from(selectedCountries)
      .map(iso => countryData.get(iso))
      .filter(d => d && !isNaN(d.risk) && d.risk > 0)
      .sort((a, b) => d3.descending(a.risk, b.risk));
  } else {
    data = Array.from(countryData.values())
      .filter(d => !isNaN(d.risk) && d.risk > 0)
      .sort((a, b) => d3.descending(a.risk, b.risk));
  }

  if (data.length === 0) {
    console.warn("No risk data available");
    return;
  }

  // Keep consistent bar size - don't inflate when filtering
  const barHeight = 18;
  
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
  
  const calculatedHeight = data.length * barHeight + riskSvg.margin.top + riskSvg.margin.bottom;
  let svgHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
  if (currentFilterMode === 'all') {
    svgHeight = calculatedHeight; // ensure full content height for scrolling
  }
  
  const svg = d3.select("#view-a svg");
  svg.attr("height", svgHeight);
  
  const newChartHeight = svgHeight - riskSvg.margin.top - riskSvg.margin.bottom;
  riskSvg.chartHeight = newChartHeight;

  const chartWidth = riskSvg.chartWidth;
  const chartHeight = newChartHeight;

  riskXScale
    .domain([0, d3.max(data, d => d.risk)])
    .range([0, chartWidth]);

  riskYScale
    .domain(data.map(d => d.country))
    .range([0, chartHeight]);

  // Update axes
  riskSvg.select(".x-axis")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(riskXScale).ticks(6).tickFormat(d3.format(".1f")));

  // Reposition X label after dynamic height changes
  riskSvg.select(".x-label")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + 40);

  riskSvg.select(".y-axis")
    .call(d3.axisLeft(riskYScale));

  // DATA JOIN
  const bars = riskSvg.selectAll(".bar")
    .data(data, d => d.iso);

  // EXIT
  bars.exit().remove();

  // UPDATE
  bars
    .attr("x", 0)
    .attr("y", d => riskYScale(d.country))
    .attr("height", riskYScale.bandwidth())
    .attr("width", d => riskXScale(d.risk))
    .attr("fill", d =>
      selectedCountries.size === 0 || selectedCountries.has(d.iso)
        ? riskColorScale(d.risk)
        : mutedColor
    )
    .attr("opacity", d =>
      selectedCountries.size === 0 || selectedCountries.has(d.iso) ? 0.9 : 0.3
    )
    .select("title")
    .text(d => `${d.country}: ${d.risk.toFixed(2)}`);

  // ENTER
  bars.enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", d => riskYScale(d.country))
    .attr("height", riskYScale.bandwidth())
    .attr("width", d => riskXScale(d.risk))
    .attr("fill", d => riskColorScale(d.risk))
    .attr("opacity", 0.9)
    .on("click", (event, d) => toggleCountrySelection(d.iso))
    .on("mouseover", function() {
      d3.select(this).attr("opacity", 1);
    })
    .on("mouseout", function(event, d) {
      d3.select(this).attr("opacity", selectedCountries.size === 0 || selectedCountries.has(d.iso) ? 0.9 : 0.3);
    })
    .append("title")
    .text(d => `${d.country}: ${d.risk.toFixed(2)}`);
}
