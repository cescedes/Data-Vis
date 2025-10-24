// dimensions and margins
const margin = { top: 30, right: 80, bottom: 100, left: 70 },
      width = 900 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom,
      contextHeight = 100;

// main SVG
const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height  + margin.top + margin.bottom + contextHeight);

const mainChart = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const contextChart = svg.append("g")
  .attr("transform", `translate(${margin.left},${height + margin.top + 50})`);

//load data
d3.csv("world_fertility_rate_1960_2020.csv").then(data => {
  
  // get years after "Country Name" and "Country Code"
  const years = data.columns.slice(2).map(d => +d);

  const countries = data.map(d => ({
    country: d["Country Name"],
    values: years.map(year => ({ year: year, value: +d[year] }))
  }));

  // scales
  const x = d3.scaleLinear()
    .domain(d3.extent(years))
    .range([0, width]);
  
  const y = d3.scaleLinear()
    .domain([0, d3.max(countries, c => d3.max(c.values, v => v.value))])
    .nice()
    .range([height, 0]);

  const xContext = d3.scaleLinear()
    .domain(x.domain())
    .range([0, width]);
  
  const yContext = d3.scaleLinear()
    .domain(y.domain())
    .range([contextHeight, 0]);
  
  // axes
  const xAxis = d3.axisBottom(x).tickFormat(d3.format("d"));
  const yAxis = d3.axisLeft(y);
  const xAxisContext = d3.axisBottom(xContext).tickFormat(d3.format("d"));

  // line generator
  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value));

  const lineContext = d3.line()
    .x(d => xContext(d.year))
    .y(d => yContext(d.value));
  
  // color scale 
  const color = d3.scaleOrdinal(d3.schemeSet2)
    .domain(countries.map(d => d.country));
  // draw lines with reduced initial opacity for dense data
  const lines = mainChart.selectAll(".line")
    .data(countries)
    .join("path")
    .attr("class", "line")
    .attr("d", d => line(d.values))
    .attr("fill", "none")
    .attr("stroke", d => color(d.country))
    .attr("stroke-width", 1.5)
    .style("opacity", 0.8)
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .on("mouseover", function(event, d) {
      if (!d.permanent) {
        // Fade all other lines and bring this one to front *
        d3.selectAll(".line").style("opacity", 0.1);
        d3.select(this)
          .style("opacity", 1)
          .style("stroke-width", "3px")
          .classed("highlighted", true)
          .raise(); // Bring to front
        showLabel(d);
      }
    })
    .on("mouseout", function(event, d) {
      if (!d.permanent) {
        // reset
        d3.selectAll(".line").style("opacity", l => l.permanent ? 1 : 0.2);
        d3.select(this)
          .style("stroke-width", "1.5px")
          .classed("highlighted", false);
        hideLabel();
      }
    })
    .on("click", function(event, d) {
      d.permanent = !d.permanent;
      d3.selectAll(".line").style("opacity", l => l.permanent ? 1 : 0.2);
      d3.select(this).classed("highlighted", d.permanent);
      if (d.permanent) {
        showLabel(d);
      } else {
        // Hide this specific label when unselecting
        labels.filter(l => l.country === d.country).style("display", "none");
      }
    });

  
  // Add grid lines
  mainChart.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x)
      .tickSize(-height)
      .tickFormat("")
    )
    .style("stroke-dasharray", "2,2")
    .style("opacity", 0.3);

  mainChart.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y)
      .tickSize(-width)
      .tickFormat("")
    )
    .style("stroke-dasharray", "2,2")
    .style("opacity", 0.3);

// axes rendering
  mainChart.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .append("text")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("fill", "#333")
    .attr("class", "axis-label")
    .text("Year");

  mainChart.append("g")
    .attr("class", "y-axis")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("fill", "#333")
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Fertility Rate (births per woman)");

  // country labels
  const labels = mainChart.selectAll(".country-label")
  .data(countries)
  .join("text")
  .attr("class", "country-label")
  .attr("x", d => x(d.values[d.values.length - 1].year) + 5)
  .attr("y", d => y(d.values[d.values.length - 1].value))
  .text(d => d.country)
  .style("display", "none");

  
  function showLabel(d) {
    labels.filter(l => l.country === d.country).style("display", "block");
  }
  function hideLabel() {
    // Only hide labels for countries that are not permanently selected
    labels.filter(l => !l.permanent).style("display", "none");
  }

  // context chart
  contextChart.selectAll(".context-line")
    .data(countries)
    .join("path")
    .attr("class", "context-line")
    .attr("fill", "none")
    .attr("stroke", "#999")
    .attr("stroke-width", 1)
    .attr("opacity", 0.4)
    .attr("d", d => lineContext(d.values));

  // brush
  const brush = d3.brushX()
    .extent([[0, 0], [width, contextHeight]])
    .on("brush end", brushed);

  contextChart.append("g")
    .attr("class", "x brush")
    .call(brush)
    .call(brush.move, xContext.range());

  contextChart.append("g")
    .attr("class", "x-axis-context")
    .attr("transform", `translate(0,${contextHeight})`)
    .call(xAxisContext);

  function brushed(event) {
    const selection = event.selection;

    if (selection) {
      const [x0, x1] = selection.map(xContext.invert);
      x.domain([x0, x1]);
    } else {
      // Reset to full view when brush is cleared
      x.domain(xContext.domain());
    }

    // Update lines and axis
    mainChart.selectAll(".line")
      .attr("d", d => line(d.values));
    mainChart.select(".x-axis")
      .call(xAxis);
      
    // Update country labels positions
    labels
      .attr("x", d => x(d.values[d.values.length - 1].year) + 5)
      .attr("y", d => y(d.values[d.values.length - 1].value));
  }

});