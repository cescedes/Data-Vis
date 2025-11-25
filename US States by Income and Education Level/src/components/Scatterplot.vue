<template>
  <div class="vis-component" ref="chart">
    <h4>Educational Attainment vs. Average Personal Income</h4>
    <div class="instructions">
      <small>Drag to brush select states • Click empty area to clear selection • Hover for details</small>
    </div>
    <svg class="main-svg" :width="svgWidth" :height="svgHeight" ref="svgRef">
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useStore } from '@/stores/store.js';
import * as d3 from 'd3';

// Access the Pinia store
const store = useStore();

// Define reactive properties for SVG dimensions
const svgWidth = ref(600);
const svgHeight = ref(500);
const svgPadding = {
  top: 40,
  right: 40,
  bottom: 80,
  left: 80,
};

// SVG reference
const svgRef = ref(null);

// Computed properties to get data from Pinia store
const data = computed(() => store.currentYearData);
const bivariateColors = computed(() => store.bivariateColorScale);
const selectedYear = computed(() => store.selectedYear);
const brushedStates = computed(() => store.brushedStates);
const highlightedState = computed(() => store.highlightedState);

// Reactive variables for scales and brush
let xScale, yScale, brush, svg, g, tooltip;

// Define exposed methods for parent components
defineExpose({
  highlightState: (stateName) => {
    store.setHighlightedState(stateName);
  },
  clearHighlighting: () => {
    store.clearHighlight();
  }
});

function initializeChart() {
  if (!svgRef.value || !data.value.length) return;

  // Clear prev content
  d3.select(svgRef.value).selectAll("*").remove();

  svg = d3.select(svgRef.value);
  
  // Create main group with margins
  g = svg.append("g")
    .attr("transform", `translate(${svgPadding.left},${svgPadding.top})`);

  const width = svgWidth.value - svgPadding.left - svgPadding.right;
  const height = svgHeight.value - svgPadding.top - svgPadding.bottom;

  // Create scales
  const incomeExtent = d3.extent(data.value, d => d.income);
  const educationExtent = d3.extent(data.value, d => d.education);

  xScale = d3.scaleLinear()
    .domain(educationExtent)
    .range([0, width])
    .nice();

  yScale = d3.scaleLinear()
    .domain(incomeExtent)
    .range([height, 0])
    .nice();

  // the background color grid (3x3 bivariate color scheme)
  const incomeThresholds = [
    d3.quantile(data.value.map(d => d.income).sort(d3.ascending), 0.33),
    d3.quantile(data.value.map(d => d.income).sort(d3.ascending), 0.67)
  ];
  
  const educationThresholds = [
    d3.quantile(data.value.map(d => d.education).sort(d3.ascending), 0.33),
    d3.quantile(data.value.map(d => d.education).sort(d3.ascending), 0.67)
  ];

  // Draw background rectangles
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const xStart = j === 0 ? 0 : xScale(educationThresholds[j - 1]);
      const xEnd = j === 2 ? width : xScale(educationThresholds[j]);
      const yStart = i === 0 ? height : yScale(incomeThresholds[2 - i]);
      const yEnd = i === 2 ? 0 : yScale(incomeThresholds[2 - i - 1]);

      g.append("rect")
        .attr("x", xStart)
        .attr("y", yEnd)
        .attr("width", xEnd - xStart)
        .attr("height", yStart - yEnd)
        .attr("fill", bivariateColors.value[i][j])
        .attr("opacity", 0.3);
    }
  }

  // Create axes
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d => d + "%"));

  g.append("g")
    .call(d3.axisLeft(yScale).tickFormat(d => "$" + d3.format(",.0f")(d)));

  // Add axis labels
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - svgPadding.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Average Yearly Personal Income (in $)");

  g.append("text")
    .attr("transform", `translate(${width / 2}, ${height + svgPadding.bottom - 10})`)
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Educational Attainment: Bachelor's Degree or Higher (%)");

  // Create tooltip
  tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none");

  // initialize brush
  brush = d3.brush()
    .extent([[0, 0], [width, height]])
    .on("start brush end", handleBrush);

  const brushGroup = g.append("g")
    .attr("class", "brush")
    .call(brush);

  // clear brush when clicking on empty area
  svg.on("click", function(event) {
    const [x, y] = d3.pointer(event);
    const isInPlotArea = x >= svgPadding.left && x <= svgWidth.value - svgPadding.right &&
                         y >= svgPadding.top && y <= svgHeight.value - svgPadding.bottom;
    
    if (isInPlotArea && !event.target.closest('.brush')) {
      brush.clear(brushGroup);
      store.setBrushedStates([]);
    }
  });

  updatePoints();
}

function handleBrush(event) {
  const selection = event.selection;
  if (selection) {
    const [[x0, y0], [x1, y1]] = selection;
    const brushedData = data.value.filter(d => {
      const x = xScale(d.education);
      const y = yScale(d.income);
      return x >= x0 && x <= x1 && y >= y0 && y <= y1;
    });
    store.setBrushedStates(brushedData.map(d => d.state));
  } else {
    store.setBrushedStates([]);
  }
}

function updatePoints() {
  if (!g || !data.value.length) return;

  const circles = g.selectAll(".data-point")
    .data(data.value, d => d.state);

  circles.exit().remove();

  const circlesEnter = circles.enter()
    .append("circle")
    .attr("class", "data-point");

  const circlesMerge = circlesEnter.merge(circles);

  circlesMerge
    .attr("cx", d => xScale(d.education))
    .attr("cy", d => yScale(d.income))
    .attr("r", 4)
    .attr("fill", "steelblue")
    .attr("stroke", d => highlightedState.value === d.state ? "#ff0000" : "#fff")
    .attr("stroke-width", d => highlightedState.value === d.state ? 3 : 1)
    .attr("opacity", d => {
      if (brushedStates.value.length === 0) return 1;
      return brushedStates.value.includes(d.state) ? 1 : 0.3;
    })
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(`<strong>${d.state}</strong><br/>
                    Education: ${d.education.toFixed(1)}%<br/>
                    Income: $${d3.format(",.0f")(d.income)}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });
}

// watching data changes
watch([data, selectedYear], () => {
  nextTick(() => {
    initializeChart();
  });
}, { deep: true });

watch([brushedStates, highlightedState], () => {
  updatePoints();
}, { deep: true });

onMounted(() => {
  nextTick(() => {
    initializeChart();
  });
});
</script>

<style scoped>
.vis-component {
  padding: 20px;
}

.instructions {
  text-align: center;
  margin-bottom: 10px;
  color: #666;
  font-style: italic;
}

:deep(.brush .overlay) {
  fill: rgba(0, 0, 0, 0.1);
}

:deep(.brush .selection) {
  fill: rgba(100, 149, 237, 0.3);
  stroke: #4682b4;
  stroke-width: 2px;
}
</style>
