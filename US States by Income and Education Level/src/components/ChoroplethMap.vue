<template>
  <div class="vis-component" ref="chart">
    <h4>US States by Income and Education Level</h4>
    <div class="instructions">
      <small>Click states to highlight in scatter plot • Click empty area to clear highlight</small>
    </div>
    <svg class="main-svg" :width="svgWidth" :height="svgHeight" ref="svgRef"></svg>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useStore } from '@/stores/store.js';
import mapStatesUSA from '@/assets/us-states-geo.json';
import * as d3 from 'd3';

// Define emits for parent component
const emit = defineEmits(['state-clicked', 'map-clicked']);

// Access the Pinia store
const store = useStore();

// Reactive data properties
const svgWidth = ref(700);
const svgHeight = ref(500);
const svgRef = ref(null);

// Computed properties to get data from the Pinia store
const data = computed(() => store.currentYearData);
const bivariateColors = computed(() => store.bivariateColorScale);
const selectedYear = computed(() => store.selectedYear);
const brushedStates = computed(() => store.brushedStates);
const highlightedState = computed(() => store.highlightedState);

let svg, g, projection, path;

function getBivariateColor(income, education, allData) {
  if (!allData || allData.length === 0) return '#e8e8e8';
  
  // Calculate thresholds for each dimension (tertiles)
  const incomes = allData.map(d => d.income).sort(d3.ascending);
  const educations = allData.map(d => d.education).sort(d3.ascending);
  
  const incomeThresholds = [
    d3.quantile(incomes, 0.33),
    d3.quantile(incomes, 0.67)
  ];
  
  const educationThresholds = [
    d3.quantile(educations, 0.33),
    d3.quantile(educations, 0.67)
  ];

  // Determine which category each value falls into
  let incomeCategory, educationCategory;
  
  if (income <= incomeThresholds[0]) incomeCategory = 0; // Low
  else if (income <= incomeThresholds[1]) incomeCategory = 1; // Medium
  else incomeCategory = 2; // High
  
  if (education <= educationThresholds[0]) educationCategory = 0; // Low
  else if (education <= educationThresholds[1]) educationCategory = 1; // Medium
  else educationCategory = 2; // High

  return bivariateColors.value[incomeCategory][educationCategory];
}

function initializeMap() {
  if (!svgRef.value || !data.value.length) return;

  // Clear prev content
  d3.select(svgRef.value).selectAll("*").remove();

  svg = d3.select(svgRef.value);
  
  // the AlbersUSA projection
  projection = d3.geoAlbersUsa()
    .scale(800)
    .translate([svgWidth.value / 2, svgHeight.value / 2]);

  path = d3.geoPath().projection(projection); // path generator

  g = svg.append("g");

  // Create a map of state names to data for quick lookup
  const dataMap = new Map();
  data.value.forEach(d => {
    dataMap.set(d.state, d);
  });

  // Draw states
  const states = g.selectAll(".state")
    .data(mapStatesUSA.features)
    .enter()
    .append("path")
    .attr("class", "state")
    .attr("d", path)
    .attr("fill", d => {
      const stateData = dataMap.get(d.properties.name);
      if (stateData) {
        return getBivariateColor(stateData.income, stateData.education, data.value);
      }
      return '#e8e8e8'; // Default color for missing data
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 1)
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      event.stopPropagation();
      emit('state-clicked', d.properties.name);
    });

  // click on empty area
  svg.on("click", function(event) {
    if (event.target === svgRef.value) {
      emit('map-clicked');
    }
  });

  updateMapColors();
}

function updateMapColors() {
  if (!g || !data.value.length) return;

  const dataMap = new Map();
  data.value.forEach(d => {
    dataMap.set(d.state, d);
  });

  g.selectAll(".state")
    .attr("fill", d => {
      const stateData = dataMap.get(d.properties.name);
      if (stateData) {
        // Apply brushing filter
        if (brushedStates.value.length > 0 && !brushedStates.value.includes(d.properties.name)) {
          return '#cccccc'; // Gray out non-brushed states
        }
        return getBivariateColor(stateData.income, stateData.education, data.value);
      }
      return '#e8e8e8';
    })
    .attr("stroke", d => {
      return highlightedState.value === d.properties.name ? "#ff0000" : "#fff";
    })
    .attr("stroke-width", d => {
      return highlightedState.value === d.properties.name ? 3 : 1;
    })
    .attr("opacity", d => {
      if (brushedStates.value.length === 0) return 1;
      return brushedStates.value.includes(d.properties.name) ? 1 : 0.5;
    });
}

// watching data changes
watch([data, selectedYear], () => {
  nextTick(() => {
    initializeMap();
  });
}, { deep: true });

watch([brushedStates, highlightedState], () => {
  updateMapColors();
}, { deep: true });

onMounted(() => {
  nextTick(() => {
    initializeMap();
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

.state {
  transition: stroke 0.2s, stroke-width 0.2s, opacity 0.2s;
}

.state:hover {
  stroke: #333;
  stroke-width: 2px;
}
</style>
