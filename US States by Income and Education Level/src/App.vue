<template>
  <div id="app">
    <div class="container-fluid">
      <div class="row">
        <div class="col-md-8">
          <YearSlider/>
        </div>
        <div class="col-md-4">
          <BivariateLegend/>
        </div>
      </div>
      <div class="row">
        <div class="col-md-6">
          <ScatterPlot ref="scatterplotRef" />
        </div>
        <div class="col-md-6">
          <ChoroplethMap ref="choroplethRef" @state-clicked="handleStateClick" @map-clicked="handleMapClick"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useStore } from '@/stores/store.js';

// Initialize store
const store = useStore();

// Component refs
const scatterplotRef = ref(null);
const choroplethRef = ref(null);

// Handle state click from map
function handleStateClick(stateName) {
  store.setHighlightedState(stateName);
}

// Handle empty area click on map
function handleMapClick() {
  store.clearHighlight();
}

// Import components
import ScatterPlot from '@/components/Scatterplot.vue';
import YearSlider from '@/components/YearSlider.vue';
import ChoroplethMap from '@/components/ChoroplethMap.vue';
import BivariateLegend from '@/components/BivariateLegend.vue';

// Load data when component is mounted
onMounted(() => {
  store.loadData();
});
</script>

<style>
#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #ffffff;
  min-height: 100vh;
  padding: 20px;
}

.container-fluid {
  max-width: 1400px;
  margin: 0 auto;
}

.row {
  margin-bottom: 20px;
}

h4 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
  font-weight: 600;
}

/* Tooltip styles */
:deep(.tooltip) {
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
}
</style>
